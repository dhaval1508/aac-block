"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/session";
import { dispatchNotification } from "@/lib/push-dispatcher";

// ============================================================================
// 1. SUPER ADMIN: CREATE SALESMAN
// ============================================================================
export async function createSalesmanAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const remarks = String(formData.get("remarks") ?? "").trim() || null;
  const active = formData.get("active") === "false" ? false : true;

  if (!name || !mobile || !email) {
    redirect("/admin/salesmen?error=Name,%20mobile,%20and%20email%20are%20required");
  }

  if (password.length < 6) {
    redirect("/admin/salesmen?error=Password%20must%20be%20at%20least%206%20characters");
  }

  // Check uniqueness of mobile and email
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ mobile }, { email }],
    },
  });

  if (existing) {
    redirect("/admin/salesmen?error=A%20user%20with%20this%20mobile%20or%20email%20already%20exists");
  }

  // Auto-generate Salesman ID (SAB-SALES-001, SAB-SALES-002, ...)
  const count = await prisma.user.count({
    where: { role: Role.SALESMAN },
  });
  const salesmanCode = `SAB-SALES-${String(count + 1).padStart(3, "0")}`;

  const passwordHash = await bcrypt.hash(password, 10);

  const newSalesman = await prisma.user.create({
    data: {
      name,
      mobile,
      email,
      role: Role.SALESMAN,
      salesmanCode,
      passwordHash,
      active,
      deliveryAddress: address,
      billingAddress: address,
      remarks,
      companyName: "Swarnim AAC Block Pvt. Ltd.",
    },
  });

  await dispatchNotification({
    role: "ADMIN",
    title: "New Salesman Account Added",
    message: `Salesman ${name} (${salesmanCode}) was created. Status: ${active ? "Active" : "Deactivated"}.`,
    link: `/admin/salesmen/${newSalesman.id}`,
  });

  revalidatePath("/admin/salesmen");
  redirect(`/admin/salesmen?success=Salesman%20${encodeURIComponent(name)}%20created%20successfully`);
}

// ============================================================================
// 2. SUPER ADMIN: UPDATE SALESMAN DETAILS
// ============================================================================
export async function updateSalesmanAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/login");
  }

  const salesmanId = String(formData.get("salesmanId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const address = String(formData.get("address") ?? "").trim() || null;
  const remarks = String(formData.get("remarks") ?? "").trim() || null;
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  const active = formData.get("active") === "true";

  if (!salesmanId || !name || !mobile || !email) {
    redirect(`/admin/salesmen/${salesmanId}?error=Name,%20mobile,%20and%20email%20are%20required`);
  }

  // Check conflict with other users
  const conflict = await prisma.user.findFirst({
    where: {
      id: { not: salesmanId },
      OR: [{ mobile }, { email }],
    },
  });

  if (conflict) {
    redirect(`/admin/salesmen/${salesmanId}?error=Another%20user%20already%20uses%20this%20mobile%20or%20email`);
  }

  const dataToUpdate: any = {
    name,
    mobile,
    email,
    deliveryAddress: address,
    billingAddress: address,
    remarks,
    active,
  };

  if (newPassword && newPassword.length >= 6) {
    dataToUpdate.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await prisma.user.update({
    where: { id: salesmanId },
    data: dataToUpdate,
  });

  revalidatePath("/admin/salesmen");
  revalidatePath(`/admin/salesmen/${salesmanId}`);
  redirect(`/admin/salesmen/${salesmanId}?success=Salesman%20details%20updated`);
}

// ============================================================================
// 3. SUPER ADMIN: TOGGLE SALESMAN ACTIVE STATUS
// ============================================================================
export async function toggleSalesmanActiveAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/login");
  }

  const salesmanId = String(formData.get("salesmanId") ?? "").trim();
  const user = await prisma.user.findUnique({
    where: { id: salesmanId },
    select: { active: true, name: true },
  });

  if (!user) {
    redirect("/admin/salesmen?error=Salesman%20not%20found");
  }

  const newActive = !user.active;
  await prisma.user.update({
    where: { id: salesmanId },
    data: { active: newActive },
  });

  revalidatePath("/admin/salesmen");
  revalidatePath(`/admin/salesmen/${salesmanId}`);
  redirect(`/admin/salesmen?success=Salesman%20${encodeURIComponent(user.name)}%20is%20now%20${newActive ? "Active" : "Deactivated"}`);
}

// ============================================================================
// 4. SUPER ADMIN: SAFELY ARCHIVE / DEACTIVATE SALESMAN
// ============================================================================
export async function archiveSalesmanSafelyAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/login");
  }

  const salesmanId = String(formData.get("salesmanId") ?? "").trim();
  const unassignCustomers = formData.get("unassignCustomers") === "true";

  const salesman = await prisma.user.findUnique({
    where: { id: salesmanId },
    include: { assignedCustomers: true },
  });

  if (!salesman) {
    redirect("/admin/salesmen?error=Salesman%20not%20found");
  }

  if (unassignCustomers && salesman.assignedCustomers.length > 0) {
    // Record assignment history and unassign
    for (const cust of salesman.assignedCustomers) {
      await prisma.customerAssignmentHistory.create({
        data: {
          customerId: cust.id,
          fromSalesmanId: salesmanId,
          toSalesmanId: null,
          assignedById: session.id,
          reason: `Salesman ${salesman.name} account archived by Super Admin`,
        },
      });
      await prisma.user.update({
        where: { id: cust.id },
        data: { salesmanId: null, assignedAt: null },
      });
    }
  }

  // Safely deactivate without deleting historical order records or user account
  await prisma.user.update({
    where: { id: salesmanId },
    data: {
      active: false,
      remarks: `${salesman.remarks ? salesman.remarks + " | " : ""}Archived on ${new Date().toLocaleDateString()}`,
    },
  });

  revalidatePath("/admin/salesmen");
  revalidatePath(`/admin/salesmen/${salesmanId}`);
  redirect("/admin/salesmen?success=Salesman%20account%20safely%20archived");
}

// ============================================================================
// 5. SUPER ADMIN: REASSIGN CUSTOMER TO ANOTHER SALESMAN
// ============================================================================
export async function reassignCustomerAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/login");
  }

  const customerId = String(formData.get("customerId") ?? "").trim();
  const toSalesmanIdRaw = String(formData.get("toSalesmanId") ?? "").trim();
  const toSalesmanId = toSalesmanIdRaw ? toSalesmanIdRaw : null;
  const reason = String(formData.get("reason") ?? "").trim() || "Reassigned by Super Admin";

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    include: { salesman: true },
  });

  if (!customer) {
    redirect("/admin/salesmen?error=Customer%20not%20found");
  }

  const fromSalesmanId = customer.salesmanId;
  const fromSalesmanName = customer.salesman?.name || "Unassigned";

  let toSalesmanName = "Unassigned";
  if (toSalesmanId) {
    const targetSalesman = await prisma.user.findUnique({
      where: { id: toSalesmanId },
      select: { name: true },
    });
    if (targetSalesman) toSalesmanName = targetSalesman.name;
  }

  // Record audit history
  await prisma.customerAssignmentHistory.create({
    data: {
      customerId,
      fromSalesmanId,
      toSalesmanId,
      assignedById: session.id,
      reason,
    },
  });

  // Update customer assignment
  await prisma.user.update({
    where: { id: customerId },
    data: {
      salesmanId: toSalesmanId,
      assignedAt: toSalesmanId ? new Date() : null,
    },
  });

  // Notifications
  await dispatchNotification({
    role: "ADMIN",
    title: "Customer Assignment Updated",
    message: `Customer ${customer.name} reassigned: ${fromSalesmanName} → ${toSalesmanName}. Reason: ${reason}`,
    link: `/admin/salesmen`,
  });

  if (fromSalesmanId && fromSalesmanId !== toSalesmanId) {
    await dispatchNotification({
      userId: fromSalesmanId,
      title: "Customer Reassigned",
      message: `Customer ${customer.name} has been reassigned to another representative.`,
      link: `/salesman/customers`,
    });
  }

  if (toSalesmanId && toSalesmanId !== fromSalesmanId) {
    await dispatchNotification({
      userId: toSalesmanId,
      title: "New Customer Assigned",
      message: `Customer ${customer.name} (${customer.mobile}) has been assigned to you by Super Admin.`,
      link: `/salesman/customers`,
    });
  }

  revalidatePath("/admin/salesmen");
  if (fromSalesmanId) revalidatePath(`/admin/salesmen/${fromSalesmanId}`);
  if (toSalesmanId) revalidatePath(`/admin/salesmen/${toSalesmanId}`);
  revalidatePath("/salesman/customers");
  revalidatePath("/salesman/dashboard");

  redirect("/admin/salesmen?success=Customer%20assignment%20updated%20successfully");
}

// ============================================================================
// 6. SALESMAN: MANUALLY ADD CUSTOMER
// ============================================================================
export async function createCustomerBySalesmanAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["SALESMAN", "ADMIN"].includes(session.role)) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const companyName = String(formData.get("companyName") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || "Gujarat";
  const pincode = String(formData.get("pincode") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !mobile) {
    redirect("/salesman/customers/new?error=Customer%20name%20and%20mobile%20are%20required");
  }

  // Duplicate check: Verify against existing customers
  const existingCustomer = await prisma.user.findFirst({
    where: { mobile },
    select: { id: true, name: true, salesmanId: true },
  });

  if (existingCustomer) {
    // Strict requirement: Do not take over ownership automatically!
    redirect(
      "/salesman/customers/new?error=A%20customer%20account%20with%20this%20mobile%20number%20already%20exists%20in%20the%20system.%20To%20protect%20customer%20accounts,%20please%20contact%20Super%20Admin%20to%20resolve%20assignment."
    );
  }

  // Determine assigned salesman ID
  const assignedSalesmanId = session.role === Role.SALESMAN ? session.id : (formData.get("salesmanId") ? String(formData.get("salesmanId")) : null) || session.id;

  // Generate temporary random secure activation password
  const tempPassword = crypto.randomBytes(12).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const email = emailRaw || `${mobile}@swarnim.customer`;

  // Create customer linked to salesman
  const newCustomer = await prisma.user.create({
    data: {
      name,
      mobile,
      email,
      passwordHash,
      role: Role.CUSTOMER,
      companyName,
      deliveryAddress: address,
      billingAddress: address,
      city,
      state,
      pincode,
      salesmanId: assignedSalesmanId,
      assignedAt: new Date(),
      remarks: notes ? `Created by Salesman (${session.name}) - ${notes}` : `Created by Salesman (${session.name}) - Pending Activation`,
      active: true,
    },
  });

  // Record initial assignment history
  await prisma.customerAssignmentHistory.create({
    data: {
      customerId: newCustomer.id,
      fromSalesmanId: null,
      toSalesmanId: assignedSalesmanId,
      assignedById: session.id,
      reason: `Directly registered by Salesman ${session.name}`,
    },
  });

  // Also create a secure pending invitation token so salesman can share the activation link via WhatsApp
  const inviteToken = crypto.randomBytes(24).toString("hex");
  await prisma.customerInvitation.create({
    data: {
      salesmanId: assignedSalesmanId,
      customerName: name,
      mobile,
      token: inviteToken,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Notify Super Admin
  await dispatchNotification({
    role: "ADMIN",
    title: "New Customer Added by Salesman",
    message: `Salesman ${session.name} manually added customer ${name} (${mobile}).`,
    link: `/admin/salesmen`,
  });

  revalidatePath("/salesman/customers");
  revalidatePath("/salesman/dashboard");
  revalidatePath("/admin/salesmen");
  redirect("/salesman/customers?success=Customer%20added%20successfully");
}

// ============================================================================
// 7. SALESMAN: CREATE WHATSAPP INVITATION
// ============================================================================
export async function createCustomerInvitationAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["SALESMAN", "ADMIN"].includes(session.role)) {
    redirect("/login");
  }

  const customerName = String(formData.get("customerName") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();

  if (!customerName || !mobile) {
    redirect("/salesman/invitations?error=Customer%20name%20and%20mobile%20are%20required");
  }

  // Check if customer already has an active account
  const existingUser = await prisma.user.findFirst({
    where: { mobile },
    select: { id: true, name: true, salesmanId: true },
  });

  if (existingUser) {
    redirect(
      "/salesman/invitations?error=A%20customer%20with%20this%20mobile%20number%20is%20already%20registered%20in%20the%20system."
    );
  }

  // Revoke any previous pending invitation for this mobile and salesman to avoid clutter
  await prisma.customerInvitation.updateMany({
    where: {
      salesmanId: session.id,
      mobile,
      status: "PENDING",
    },
    data: {
      status: "REVOKED",
    },
  });

  // Cryptographically secure token
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.customerInvitation.create({
    data: {
      salesmanId: session.id,
      customerName,
      mobile,
      token,
      status: "PENDING",
      expiresAt,
    },
  });

  revalidatePath("/salesman/invitations");
  revalidatePath("/salesman/dashboard");
  redirect(`/salesman/invitations?token=${token}&success=Invitation%20link%20created%20successfully`);
}

// ============================================================================
// 8. SALESMAN: REVOKE INVITATION
// ============================================================================
export async function revokeInvitationAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["SALESMAN", "ADMIN"].includes(session.role)) {
    redirect("/login");
  }

  const invitationId = String(formData.get("invitationId") ?? "").trim();

  const invitation = await prisma.customerInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    redirect("/salesman/invitations?error=Invitation%20not%20found");
  }

  if (session.role === Role.SALESMAN && invitation.salesmanId !== session.id) {
    redirect("/salesman/invitations?error=Unauthorized%20access");
  }

  await prisma.customerInvitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  });

  revalidatePath("/salesman/invitations");
  redirect("/salesman/invitations?success=Invitation%20revoked");
}

// ============================================================================
// 9. PUBLIC: REGISTER CUSTOMER VIA INVITATION TOKEN
// ============================================================================
export async function registerCustomerFromInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || "Gujarat";
  const pincode = String(formData.get("pincode") ?? "").trim() || null;

  if (!token) {
    redirect("/login?error=Invalid%20invitation%20token");
  }

  const invitation = await prisma.customerInvitation.findUnique({
    where: { token },
    include: { salesman: true },
  });

  if (!invitation || invitation.status !== "PENDING") {
    redirect(`/invite/${token}?error=This%20invitation%20is%20invalid,%20already%20used,%20or%20revoked`);
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.customerInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    redirect(`/invite/${token}?error=This%20invitation%20has%20expired.%20Please%20request%20a%20new%20one`);
  }

  if (password.length < 6) {
    redirect(`/invite/${token}?error=Password%20must%20be%20at%20least%206%20characters`);
  }

  if (password !== confirmPassword) {
    redirect(`/invite/${token}?error=Passwords%20do%20not%20match`);
  }

  // Check if mobile already has an existing account
  const existingUser = await prisma.user.findFirst({
    where: { mobile: invitation.mobile },
  });

  if (existingUser) {
    redirect(
      `/invite/${token}?error=An%20account%20with%20mobile%20${invitation.mobile}%20already%20exists.%20Please%20log%20in.`
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const email = `${invitation.mobile}@swarnim.customer`;

  // Create customer, mark invitation accepted, and record history in a transaction
  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: invitation.customerName,
        mobile: invitation.mobile,
        email,
        passwordHash,
        role: Role.CUSTOMER,
        companyName,
        deliveryAddress: address,
        billingAddress: address,
        city,
        state,
        pincode,
        salesmanId: invitation.salesmanId,
        assignedAt: new Date(),
        active: true,
      },
    });

    await tx.customerInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        registeredCustomerId: user.id,
      },
    });

    await tx.customerAssignmentHistory.create({
      data: {
        customerId: user.id,
        fromSalesmanId: null,
        toSalesmanId: invitation.salesmanId,
        assignedById: invitation.salesmanId,
        reason: "Registered via WhatsApp Salesman Invitation link",
      },
    });

    return user;
  });

  // Notify Super Admin
  await dispatchNotification({
    role: "ADMIN",
    title: "New Customer Registered via Invitation",
    message: `Customer ${invitation.customerName} (${invitation.mobile}) registered via invitation from ${invitation.salesman.name}.`,
    link: `/admin/salesmen/${invitation.salesmanId}`,
  });

  // Notify Salesman
  await dispatchNotification({
    userId: invitation.salesmanId,
    title: "Customer Invitation Accepted!",
    message: `Your customer ${invitation.customerName} (${invitation.mobile}) has accepted your invitation and completed registration!`,
    link: `/salesman/customers`,
  });

  // Create user session and log them straight into the customer dashboard
  await createSession({
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    role: createdUser.role,
  });

  revalidatePath("/salesman/customers");
  revalidatePath("/salesman/dashboard");
  revalidatePath("/admin/salesmen");
  redirect("/customer/dashboard?welcome=1");
}
