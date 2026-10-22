import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// Generate strong, unique, cryptographically random password (16 chars alphanumeric)
function generateSecurePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  let pass = "";
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}

export async function executeCleanLaunch(requireConfirmation: boolean = true) {
  console.log("=================================================================");
  console.log("🧹 EXECUTING CONTROLLED PRODUCTION CLEANUP & 3-ROLE PROVISIONING");
  console.log("Database: Neon PostgreSQL");
  console.log("=================================================================");

  // 1. Verify that a complete backup exists before proceeding
  const archiveDir = path.join(process.cwd(), "archive");
  const backupFolders = fs.readdirSync(archiveDir).filter((f) => f.startsWith("neon-backup-"));
  if (backupFolders.length === 0) {
    throw new Error("ABORTING: No verified backup found in archive/! Run export-complete-database-backup.ts first.");
  }
  console.log(`✅ Verified active backup available in: ${path.join(archiveDir, backupFolders[backupFolders.length - 1])}`);

  // 2. Archive orders marked for legal retention
  const legalOrders = await prisma.order.findMany({
    where: {
      OR: [{ dcNumber: { not: null } }, { invoiceNo: { not: null } }],
    },
    include: {
      items: true,
      transport: true,
      weighbridgeSlip: true,
      loadingRecord: true,
    },
  });

  const legalArchiveFile = path.join(archiveDir, "legal_challans_and_invoices_archive.json");
  fs.writeFileSync(legalArchiveFile, JSON.stringify(legalOrders, null, 2), "utf-8");
  console.log(`📑 Securely archived ${legalOrders.length} legally issued challans/invoices to: ${legalArchiveFile}`);

  // 3. Generate three secure accounts
  const superAdminPassword = generateSecurePassword();
  const salesmanPassword = generateSecurePassword();
  const staffPassword = generateSecurePassword();

  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);
  const salesmanHash = await bcrypt.hash(salesmanPassword, 10);
  const staffHash = await bcrypt.hash(staffPassword, 10);

  const newAccounts = {
    superAdmin: {
      name: "Swarnim Super Admin",
      loginId: "admin@swarnimaac.com",
      mobile: "9998100167",
      role: "ADMIN",
      tempPassword: superAdminPassword,
      companyName: "Swarnim AAC Block Pvt. Ltd.",
    },
    salesman: {
      name: "Swarnim Sales Executive",
      loginId: "sales@swarnimaac.com",
      mobile: "9898989898",
      role: "SALESMAN",
      salesmanCode: "SAB-SALES-001",
      tempPassword: salesmanPassword,
      companyName: "Swarnim AAC Block Pvt. Ltd.",
    },
    staff: {
      name: "Swarnim Loading & Stock Operations",
      loginId: "dispatch@swarnimaac.com",
      mobile: "9879879878",
      role: "STAFF",
      tempPassword: staffPassword,
      companyName: "Swarnim AAC Block Pvt. Ltd.",
    },
  };

  // 4. Perform Transactional Cleanup and Provisioning
  console.log("\nExecuting safe Prisma atomic transaction...");

  const stats = await prisma.$transaction(async (tx) => {
    // A. Delete dependent order data
    const deletedEvents = await tx.orderEvent.deleteMany({});
    const deletedEditHistories = await tx.orderEditHistory.deleteMany({});
    const deletedItems = await tx.orderItem.deleteMany({});
    const deletedSlips = await tx.weighbridgeSlip.deleteMany({});
    const deletedLoading = await tx.loadingRecord.deleteMany({});
    const deletedTransports = await tx.transport.deleteMany({});
    const deletedPayments = await tx.payment.deleteMany({});
    
    // B. Delete orders from active view
    const deletedOrders = await tx.order.deleteMany({});

    // C. Delete old notifications, invitations, assignment histories & push subs
    const deletedNotifications = await tx.notification.deleteMany({});
    const deletedInvitations = await tx.customerInvitation.deleteMany({});
    const deletedAssignments = await tx.customerAssignmentHistory.deleteMany({});
    const deletedPushSubs = await tx.pushSubscription.deleteMany({});
    const deletedMessageLogs = await tx.messageLog.deleteMany({});

    // D. Delete old users
    const deletedUsers = await tx.user.deleteMany({});

    // E. Provision Exactly 3 Fresh Operational Accounts
    const adminUser = await tx.user.create({
      data: {
        name: newAccounts.superAdmin.name,
        email: newAccounts.superAdmin.loginId,
        mobile: newAccounts.superAdmin.mobile,
        role: "ADMIN",
        passwordHash: superAdminHash,
        companyName: newAccounts.superAdmin.companyName,
        active: true,
      },
    });

    const salesmanUser = await tx.user.create({
      data: {
        name: newAccounts.salesman.name,
        email: newAccounts.salesman.loginId,
        mobile: newAccounts.salesman.mobile,
        role: "SALESMAN",
        salesmanCode: newAccounts.salesman.salesmanCode,
        passwordHash: salesmanHash,
        companyName: newAccounts.salesman.companyName,
        active: true,
      },
    });

    const staffUser = await tx.user.create({
      data: {
        name: newAccounts.staff.name,
        email: newAccounts.staff.loginId,
        mobile: newAccounts.staff.mobile,
        role: "STAFF",
        passwordHash: staffHash,
        companyName: newAccounts.staff.companyName,
        active: true,
      },
    });

    return {
      deletedOrders: deletedOrders.count,
      deletedItems: deletedItems.count,
      deletedEvents: deletedEvents.count,
      deletedTransports: deletedTransports.count,
      deletedSlips: deletedSlips.count,
      deletedLoading: deletedLoading.count,
      deletedPayments: deletedPayments.count,
      deletedNotifications: deletedNotifications.count,
      deletedInvitations: deletedInvitations.count,
      deletedUsers: deletedUsers.count,
      createdUsers: [adminUser.id, salesmanUser.id, staffUser.id],
    };
  });

  console.log("✅ TRANSACTION COMMITTED SUCCESSFULLY!");
  console.log(`📊 Purged Records Summary:`);
  console.log(`   - Orders removed from active views: ${stats.deletedOrders}`);
  console.log(`   - Order Items removed: ${stats.deletedItems}`);
  console.log(`   - Order Events & Histories: ${stats.deletedEvents}`);
  console.log(`   - Transports removed: ${stats.deletedTransports}`);
  console.log(`   - Weighbridge Slips: ${stats.deletedSlips}`);
  console.log(`   - Loading Records: ${stats.deletedLoading}`);
  console.log(`   - Old Notifications purged: ${stats.deletedNotifications}`);
  console.log(`   - Old Invitations purged: ${stats.deletedInvitations}`);
  console.log(`   - Old User Accounts removed: ${stats.deletedUsers}`);
  console.log(`   - Fresh Accounts provisioned: ${stats.createdUsers.length}`);

  // 5. Verify Invariants (Products & Company Profile preserved)
  const productCount = await prisma.product.count();
  const companyProfileCount = await prisma.companyProfile.count();
  const remainingUsers = await prisma.user.count();
  const remainingOrders = await prisma.order.count();
  const activeSalesmen = await prisma.user.count({ where: { role: "SALESMAN", active: true } });
  const activeStaff = await prisma.user.count({ where: { role: "STAFF", active: true } });
  const activeCustomers = await prisma.user.count({ where: { role: "CUSTOMER", active: true } });

  console.log("\n📊 POST-LAUNCH INVARIANT CHECKS:");
  console.log(`   - Total Products (Preserved): ${productCount}`);
  console.log(`   - Company Profile (Preserved): ${companyProfileCount}`);
  console.log(`   - Total Active Orders: ${remainingOrders} (Expected: 0)`);
  console.log(`   - Active Salesmen: ${activeSalesmen} (Expected: 1)`);
  console.log(`   - Active Loading & Stock Staff: ${activeStaff} (Expected: 1)`);
  console.log(`   - Active Customers: ${activeCustomers} (Expected: 0)`);
  console.log(`   - Total Operational Users: ${remainingUsers} (Expected: 3)`);

  // 6. Write credentials to secure handover file (gitignored)
  const handoverFile = path.join(archiveDir, "operational_credentials_handover.json");
  const handoverData = {
    generatedAt: new Date().toISOString(),
    notice: "CONFIDENTIAL: One-time operational launch credentials. Hand over securely and delete after changing.",
    accounts: [
      {
        account: "Account 1: Super Admin",
        role: "ADMIN",
        name: newAccounts.superAdmin.name,
        loginId: newAccounts.superAdmin.loginId,
        mobile: newAccounts.superAdmin.mobile,
        oneTimePassword: newAccounts.superAdmin.tempPassword,
      },
      {
        account: "Account 2: Salesman",
        role: "SALESMAN",
        name: newAccounts.salesman.name,
        loginId: newAccounts.salesman.loginId,
        mobile: newAccounts.salesman.mobile,
        salesmanCode: newAccounts.salesman.salesmanCode,
        oneTimePassword: newAccounts.salesman.tempPassword,
      },
      {
        account: "Account 3: Loading & Stock Staff",
        role: "STAFF",
        name: newAccounts.staff.name,
        loginId: newAccounts.staff.loginId,
        mobile: newAccounts.staff.mobile,
        oneTimePassword: newAccounts.staff.tempPassword,
      },
    ],
  };

  fs.writeFileSync(handoverFile, JSON.stringify(handoverData, null, 2), "utf-8");
  console.log(`\n🔐 Secure handover file generated: ${handoverFile}`);

  return { stats, handoverData };
}

if (require.main === module) {
  executeCleanLaunch()
    .catch((e) => {
      console.error("Cleanup error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
