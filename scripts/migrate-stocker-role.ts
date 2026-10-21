import { prisma } from "../lib/prisma";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=== DRY-RUN & BACKUP: MIGRATING STOCKER USERS TO COMBINED LOADING & STOCK STAFF ROLE ===");

  // 1. Find all users with role STOCKER or STAFF
  const operationalUsers = await prisma.user.findMany({
    where: {
      role: { in: ["STOCKER", "STAFF"] },
    },
    include: {
      _count: {
        select: {
          customerOrders: true,
          assignedOrders: true,
          stockMovements: true,
          notifications: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${operationalUsers.length} total operational users:`);
  console.table(
    operationalUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      currentRole: u.role,
      active: u.active,
      assignedOrders: u._count.assignedOrders,
      stockMovements: u._count.stockMovements,
      notifications: u._count.notifications,
    }))
  );

  const stockersToMigrate = operationalUsers.filter((u) => u.role === "STOCKER");
  console.log(`\nIdentified ${stockersToMigrate.length} users with role 'STOCKER' to migrate to 'STAFF' (Loading & Stock Staff):`);
  stockersToMigrate.forEach((u) => {
    console.log(` - ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Mobile: ${u.mobile} | Active: ${u.active}`);
  });

  // 2. Create local backup before applying changes
  const backupDir = path.join(__dirname, "..", "archive");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `users-migration-backup-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(operationalUsers, null, 2), "utf-8");
  console.log(`\n[BACKUP SAVED] Backup written to: ${backupFile}`);

  // 3. Perform Transactional Migration
  if (stockersToMigrate.length > 0) {
    console.log("\nExecuting safe transactional migration...");
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          role: "STOCKER",
        },
        data: {
          role: "STAFF",
        },
      });
      return updated;
    });

    console.log(`[SUCCESS] Migrated ${result.count} users from 'STOCKER' to 'STAFF'.`);
  } else {
    console.log("\n[INFO] No STOCKER users to migrate. All operational users already have canonical STAFF role.");
  }

  // 4. Verify post-migration state
  const postCheck = await prisma.user.findMany({
    where: {
      id: { in: operationalUsers.map((u) => u.id) },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      _count: {
        select: {
          assignedOrders: true,
          stockMovements: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n=== POST-MIGRATION VERIFICATION ===");
  console.table(postCheck);

  // Check remaining STOCKER users in whole DB
  const remainingStockers = await prisma.user.count({ where: { role: "STOCKER" } });
  const totalStaff = await prisma.user.count({ where: { role: "STAFF" } });
  console.log(`Remaining 'STOCKER' users: ${remainingStockers}`);
  console.log(`Total 'STAFF' (Loading & Stock Staff) users: ${totalStaff}`);
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
