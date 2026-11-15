"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageUsers, serializeForClient } from "@/lib/utils";
import { generateNextSalesmanCode } from "@/lib/actions/salesmen";

export type UpdateUserInput = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  active: boolean;
  companyName?: string | null;
  gstin?: string | null;
  billingAddress?: string | null;
  deliveryAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  remarks?: string | null;
  salesmanId?: string | null;
  salesmanCode?: string | null;
  avatarUrl?: string | null;
};

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
  const validRoles: Role[] = [Role.ADMIN, Role.STAFF, Role.STOCKER, Role.SALESMAN, Role.CUSTOMER];
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

    // Log account creation
    await prisma.userAuditLog.create({
      data: {
        userId: newUser.id,
        actorId: session.id,
        action: "ACCOUNT_CREATED",
        details: {
          role,
          name,
          email,
          mobile,
          actorName: session.name,
          actorRole: session.role,
        },
      },
    });
  } catch (err: any) {
    redirect(`/admin/users?error=${encodeURIComponent(err?.message || "Failed to create user account")}`);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/salesmen");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");
  redirect("/admin/users?success=User%20account%20created%20successfully");
}

export async function updateUserDetailsAction(input: UpdateUserInput) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Super Admin access required." };
  }

  const { id, name, email, mobile, role, active } = input;

  if (!id || !name?.trim() || !email?.trim() || !mobile?.trim()) {
    return { success: false, error: "Name, email, and mobile number are required." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanMobile = mobile.trim().replace(/\D/g, "");

  if (cleanMobile.length < 10) {
    return { success: false, error: "Please enter a valid 10-digit mobile number." };
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { assignedCustomers: true },
  });

  if (!existing || existing.deletedAt) {
    return { success: false, error: "User not found or has been deleted." };
  }

  // Self-demotion and self-disable safety checks
  if (id === session.id) {
    if (role !== "ADMIN") {
      const activeAdminsCount = await prisma.user.count({
        where: { role: "ADMIN", active: true, deletedAt: null, id: { not: session.id } },
      });
      if (activeAdminsCount === 0) {
        return { success: false, error: "Cannot demote the only remaining active Super Admin." };
      }
    }
    if (!active) {
      return { success: false, error: "You cannot disable your own active Super Admin account." };
    }
  }

  // Email uniqueness check (excluding self)
  const duplicateEmail = await prisma.user.findFirst({
    where: {
      email: cleanEmail,
      id: { not: id },
      deletedAt: null,
    },
  });
  if (duplicateEmail) {
    return { success: false, error: `Email "${cleanEmail}" is already registered to another user (${duplicateEmail.name}).` };
  }

  // Mobile uniqueness check (excluding self)
  const duplicateMobile = await prisma.user.findFirst({
    where: {
      mobile: { contains: cleanMobile },
      id: { not: id },
      deletedAt: null,
    },
  });
  if (duplicateMobile) {
    return { success: false, error: `Mobile "${cleanMobile}" is already registered to another user (${duplicateMobile.name}).` };
  }

  // Salesman code resolution
  let finalSalesmanCode = existing.salesmanCode;
  if (role === Role.SALESMAN && !finalSalesmanCode) {
    finalSalesmanCode = await generateNextSalesmanCode();
  }

  // If role changed from SALESMAN to something else, safely unassign their customers
  if (existing.role === Role.SALESMAN && role !== Role.SALESMAN && existing.assignedCustomers.length > 0) {
    for (const cust of existing.assignedCustomers) {
      await prisma.customerAssignmentHistory.create({
        data: {
          customerId: cust.id,
          fromSalesmanId: existing.id,
          toSalesmanId: null,
          assignedById: session.id,
          reason: `Salesman ${existing.name} role changed to ${role} by Super Admin`,
        },
      });
      await prisma.user.update({
        where: { id: cust.id },
        data: { salesmanId: null, assignedAt: null },
      });
    }
  }

  // Customer-to-Salesman assignment check
  const newSalesmanId = role === Role.CUSTOMER ? (input.salesmanId || null) : null;
  if (role === Role.CUSTOMER && newSalesmanId !== existing.salesmanId) {
    await prisma.customerAssignmentHistory.create({
      data: {
        customerId: id,
        fromSalesmanId: existing.salesmanId,
        toSalesmanId: newSalesmanId,
        assignedById: session.id,
        reason: "Salesman assignment modified by Super Admin",
      },
    });
  }

  // Build diff for audit log
  const changedFields: Record<string, { old: any; new: any }> = {};
  if (existing.name !== name.trim()) changedFields.name = { old: existing.name, new: name.trim() };
  if (existing.email !== cleanEmail) changedFields.email = { old: existing.email, new: cleanEmail };
  if (existing.mobile !== cleanMobile) changedFields.mobile = { old: existing.mobile, new: cleanMobile };
  if (existing.role !== role) changedFields.role = { old: existing.role, new: role };
  if (existing.active !== active) changedFields.active = { old: existing.active, new: active };
  if ((existing.companyName ?? "") !== (input.companyName?.trim() ?? "")) changedFields.companyName = { old: existing.companyName, new: input.companyName?.trim() ?? null };
  if ((existing.gstin ?? "") !== (input.gstin?.trim() ?? "")) changedFields.gstin = { old: existing.gstin, new: input.gstin?.trim() ?? null };
  if ((existing.billingAddress ?? "") !== (input.billingAddress?.trim() ?? "")) changedFields.billingAddress = { old: existing.billingAddress, new: input.billingAddress?.trim() ?? null };
  if ((existing.deliveryAddress ?? "") !== (input.deliveryAddress?.trim() ?? "")) changedFields.deliveryAddress = { old: existing.deliveryAddress, new: input.deliveryAddress?.trim() ?? null };
  if ((existing.city ?? "") !== (input.city?.trim() ?? "")) changedFields.city = { old: existing.city, new: input.city?.trim() ?? null };
  if ((existing.state ?? "") !== (input.state?.trim() ?? "Gujarat")) changedFields.state = { old: existing.state, new: input.state?.trim() ?? "Gujarat" };
  if ((existing.pincode ?? "") !== (input.pincode?.trim() ?? "")) changedFields.pincode = { old: existing.pincode, new: input.pincode?.trim() ?? null };
  if ((existing.remarks ?? "") !== (input.remarks?.trim() ?? "")) changedFields.remarks = { old: existing.remarks, new: input.remarks?.trim() ?? null };
  if ((existing.salesmanId ?? "") !== (newSalesmanId ?? "")) changedFields.salesmanId = { old: existing.salesmanId, new: newSalesmanId };

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        role,
        active,
        companyName: role === Role.CUSTOMER ? (input.companyName?.trim() || null) : (existing.companyName || "Swarnim AAC Block Pvt. Ltd."),
        gstin: role === Role.CUSTOMER ? (input.gstin?.trim()?.toUpperCase() || null) : null,
        billingAddress: input.billingAddress?.trim() || null,
        deliveryAddress: input.deliveryAddress?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || "Gujarat",
        pincode: input.pincode?.trim() || null,
        remarks: input.remarks?.trim() || null,
        salesmanId: newSalesmanId,
        assignedAt: newSalesmanId && newSalesmanId !== existing.salesmanId ? new Date() : existing.assignedAt,
        salesmanCode: finalSalesmanCode,
        avatarUrl: input.avatarUrl?.trim() || null,
      },
      include: {
        salesman: { select: { id: true, name: true, salesmanCode: true } },
        _count: {
          select: {
            customerOrders: true,
            salesmanOrders: true,
            assignedCustomers: true,
            assignedOrders: true,
          },
        },
      },
    });

    // Record audit log
    if (Object.keys(changedFields).length > 0) {
      let actionType = "PROFILE_UPDATE";
      if (changedFields.role) actionType = "ROLE_CHANGE";
      else if (changedFields.active !== undefined) actionType = "STATUS_CHANGE";

      await prisma.userAuditLog.create({
        data: {
          userId: id,
          actorId: session.id,
          action: actionType,
          details: {
            changedFields,
            actorName: session.name,
            actorRole: session.role,
          },
        },
      });
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/salesmen");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/activity");

    return {
      success: true,
      user: serializeForClient(updated),
    };
  } catch (err: any) {
    console.error("Error updating user:", err);
    return { success: false, error: err?.message || "Failed to save profile changes." };
  }
}

export async function resetUserPasswordAction(userId: string, newPassword: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Super Admin access required." };
  }

  if (!userId || !newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    return { success: false, error: "User not found or deleted." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await prisma.userAuditLog.create({
    data: {
      userId,
      actorId: session.id,
      action: "PASSWORD_RESET",
      details: {
        actorName: session.name,
        actorRole: session.role,
        message: "Password reset by Super Admin",
      },
    },
  });

  return { success: true };
}

export async function getUserAuditHistoryAction(userId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  const logs = await prisma.userAuditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actor: { select: { id: true, name: true, role: true } },
    },
  });

  return { success: true, logs: serializeForClient(logs) };
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

  // Log status change
  await prisma.userAuditLog.create({
    data: {
      userId: id,
      actorId: session.id,
      action: "STATUS_CHANGE",
      details: {
        from: user.active ? "Active" : "Disabled",
        to: newActive ? "Active" : "Disabled",
        actorName: session.name,
        actorRole: session.role,
      },
    },
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
  await prisma.user.update({
    where: { id },
    data: {
      active: false,
      deletedAt: new Date(),
    },
  });

  // Log deletion in audit table
  await prisma.userAuditLog.create({
    data: {
      userId: id,
      actorId: session.id,
      action: "USER_DELETED",
      details: {
        actorName: session.name,
        actorRole: session.role,
        userName: existing.name,
        userRole: existing.role,
      },
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/salesmen");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");

  return { success: true };
}

export async function restoreUserAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Super Admin access required." };
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "User not found." };
  }

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: null,
      active: true,
    },
  });

  await prisma.userAuditLog.create({
    data: {
      userId: id,
      actorId: session.id,
      action: "USER_RESTORED",
      details: {
        actorName: session.name,
        actorRole: session.role,
      },
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/salesmen");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
