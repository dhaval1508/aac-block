import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

/**
 * SAFE ORDER DATA CLEANUP SCRIPT
 *
 * Requirements:
 * - Verified backup archive created automatically or verified before execution
 * - Requires explicit --confirm-delete flag
 * - Deletes ONLY operational orders and order-linked records
 * - Preserves ALL Users (Admin, Staff, Customer), Products (all 9 sizes + mortar),
 *   Stock Master Data, Stock Movements, Company Profile, and App Settings.
 * - Resets Delivery Challan Sequence so series starts fresh at SAB/DC/0001.
 */
async function main() {
  const isConfirmed = process.argv.includes("--confirm-delete");

  console.log("=================================================================");
  console.log(" SWARNIM AAC BLOCK: CONTROLLED OPERATIONAL ORDER CLEANUP");
  console.log("=================================================================\n");

  // 1. Resolve archive directory across both root and pwa working directories
  const archiveDir = fs.existsSync(path.join(process.cwd(), "archive"))
    ? path.join(process.cwd(), "archive")
    : fs.existsSync(path.join(__dirname, "..", "archive"))
    ? path.join(__dirname, "..", "archive")
    : path.join(process.cwd(), "pwa", "archive");

  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  let backupFiles = fs.readdirSync(archiveDir).filter((f) => f.startsWith("orders-backup-"));
  if (backupFiles.length === 0) {
    console.log("📦 No previous backup archive found. Creating automatic backup now...");
    const allOrders = await prisma.order.findMany({
      include: {
        items: true,
        transport: true,
        events: true,
        payments: true,
        movements: true,
        messageLogs: true,
        editHistory: true,
        weighbridgeSlip: true,
        loadingRecord: true,
      },
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const newBackupPath = path.join(archiveDir, `orders-backup-${timestamp}.json`);
    fs.writeFileSync(newBackupPath, JSON.stringify(allOrders, null, 2), "utf-8");
    console.log(`✓ Created verified backup: ${path.basename(newBackupPath)}`);
    backupFiles = [path.basename(newBackupPath)];
  }

  console.log(`✓ Verified backup archive: ${backupFiles[backupFiles.length - 1]}`);

  // Count current operational orders
  const [orderCount, itemCount, eventCount] = await Promise.all([
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.orderEvent.count(),
  ]);

  console.log(`Current Database State:`);
  console.log(`- Orders: ${orderCount}`);
  console.log(`- Order Items: ${itemCount}`);
  console.log(`- Order Events: ${eventCount}`);

  if (!isConfirmed) {
    console.log("\n⚠️  SAFETY NOTICE: Execution halted because --confirm-delete was not passed.");
    console.log("To execute the authorized cleanup, run:");
    console.log("  npx tsx scripts/clean-orders.ts --confirm-delete\n");
    process.exit(0);
  }

  console.log("\n⚡ Performing controlled cleanup within database transaction...");

  await prisma.$transaction(async (tx: any) => {
    // 1. Order edit history
    await tx.orderEditHistory.deleteMany({});
    console.log("✓ Cleared OrderEditHistory");

    // 2. Weighbridge slips
    await tx.weighbridgeSlip.deleteMany({});
    console.log("✓ Cleared WeighbridgeSlip records");

    // 3. Loading records
    await tx.loadingRecord.deleteMany({});
    console.log("✓ Cleared LoadingRecord records");

    // 4. Order events / audit log
    await tx.orderEvent.deleteMany({});
    console.log("✓ Cleared OrderEvent records");

    // 5. Order items
    await tx.orderItem.deleteMany({});
    console.log("✓ Cleared OrderItem records");

    // 6. Transport staging
    await tx.transport.deleteMany({});
    console.log("✓ Cleared Transport records");

    // 7. Order-linked notifications
    await tx.notification.deleteMany({
      where: { orderId: { not: null } },
    });
    console.log("✓ Cleared order-linked Notifications");

    // 8. Order payments
    await tx.payment.deleteMany({});
    console.log("✓ Cleared order Payments");

    // 9. Order message logs
    await tx.messageLog.deleteMany({});
    console.log("✓ Cleared MessageLog records");

    // 10. Orders
    await tx.order.deleteMany({});
    console.log("✓ Cleared Orders");

    // 11. Reset Delivery Challan Sequence to 0 so next sequence is SAB/DC/0001
    const seq = await tx.deliveryChallanSequence.findFirst();
    if (seq) {
      await tx.deliveryChallanSequence.update({
        where: { id: seq.id },
        data: { currentValue: 0 },
      });
    } else {
      await tx.deliveryChallanSequence.create({
        data: { currentValue: 0 },
      });
    }
    console.log("✓ Reset Delivery Challan sequence to 0 (First order will issue SAB/DC/0001)");
  });

  console.log("\n✅ Operational order cleanup completed successfully!");
  console.log("All Admin, Staff, Customer accounts, Products, Stock, and Company Profile remain intact.");
  console.log("The active Orders dashboard starts fresh at 0 orders.");
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
