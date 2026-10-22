"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageUsers } from "@/lib/utils";
import { generateNextSalesmanCode } from "@/lib/actions/salesmen";

export async function createUserAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleInput = String(formData.get("role") ?? "STAFF").toUpperCase();
  const companyName = String(formData.get("companyName") ?? "").trim() || null;
  const gstin = String(formData.get("gstin") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || "Gujarat";
  const pincode = String(formData.get("pincode") ?? "").trim() || null;
  const remarks = String(formData.get("remarks") ?? "").trim() || null;
  const salesmanId = String(formData.get("salesmanId") ?? "").trim() || null;

  // Validate allowed roles
  const validRoles: Role[] = [Role.ADMIN, Role.STAFF, Role.SALESMAN, Role.CUSTOMER];
  const role: Role = validRoles.includes(roleInput as Role) ? (roleInput as Role) : Role.STAFF;

  if (!name || !mobile || !email || password.length < 6) {
    redirect("/admin/users?error=Name,%20mobile,%20email%20and%206+%20char%20password%20required");
  }

  // Check uniqueness of email and mobile
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { mobile }],
      deletedAt: null,
    },
  });
  if (existing) {
    redirect("/admin/users?error=Email%20or%20mobile%20already%20registered%20to%20an%20active%20user");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // If role is SALESMAN, auto-generate collision-proof salesmanCode
  let salesmanCode: string | null = null;
  if (role === Role.SALESMAN) {
    salesmanCode = await generateNextSalesmanCode();
  }

  try {
    const newUser = await prisma.user.create({
      data: {
        name,
        mobile,
        email,
        role,
        salesmanCode,
        passwordHash,
        companyName: role === Role.CUSTOMER ? companyName : "Swarnim AAC Block Pvt. Ltd.",
        gstin: role === Role.CUSTOMER ? gstin : null,
        deliveryAddress: address,
        billingAddress: address,
        city,
        state,
        pincode,
        remarks,
        salesmanId: role === Role.CUSTOMER && salesmanId ? salesmanId : null,
        assignedAt: role === Role.CUSTOMER && salesmanId ? new Date() : null,
        active: true,
      },
    });

    if (role === Role.CUSTOMER && salesmanId) {
      await prisma.customerAssignmentHistory.create({
        data: {
          customerId: newUser.id,
          fromSalesmanId: null,
          toSalesmanId: salesmanId,
          assignedById: session.id,
          reason: "Assigned by Super Admin during user account creation",
        },
      });
    }
  } catch (err: any) {
    redirect(`/admin/users?error=${encodeURIComponent(err?.message || "Failed to create user account")}`);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/salesmen");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");
  redirect("/admin/users?success=User%20account%20created%20successfully");
}

export async function toggleUserAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  if (id === session.id) {
    redirect("/admin/users?error=You%20cannot%20disable%20yourself");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/admin/users");

  const newActive = !user.active;
  await prisma.user.update({
    where: { id },
    data: { active: newActive },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/salesmen");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");
  redirect(`/admin/users?success=User%20${encodeURIComponent(user.name)}%20login%20is%20now%20${newActive ? "Active" : "Disabled"}`);
}

export async function deleteUserAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Super Admin access required." };
  }

  if (!id) {
    return { success: false, error: "Missing user ID." };
  }

  if (id === session.id) {
    return { success: false, error: "You cannot delete your own admin account." };
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { assignedCustomers: true },
  });
  if (!existing || existing.deletedAt) {
    return { success: false, error: "User already deleted or not found." };
  }

  // If deleting a salesman, safely unassign their active customers
  if (existing.role === Role.SALESMAN && existing.assignedCustomers.length > 0) {
    for (const cust of existing.assignedCustomers) {
      await prisma.customerAssignmentHistory.create({
        data: {
          customerId: cust.id,
          fromSalesmanId: existing.id,
          toSalesmanId: null,
          assignedById: session.id,
          reason: `Salesman ${existing.name} account archived by Super Admin`,
        },
      });
      await prisma.user.update({
        where: { id: cust.id },
        data: { salesmanId: null, assignedAt: null },
      });
    }
  }

  // Soft delete: sets deletedAt timestamp and active: false
  // Protects past orders, delivery dispatches, audit events, and payments
  await prisma.user.update({
    where: { id },
    data: {
      active: false,
      deletedAt: new Date(),
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/salesmen");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");

  return { success: true };
}
