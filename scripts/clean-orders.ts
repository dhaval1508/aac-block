import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

/**
 * SAFE ORDER DATA CLEANUP SCRIPT (Section 11)
 *
 * Requirements:
 * - Verified backup must exist before execution
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

  // 1. Verify that backup archive exists
  const archiveDir = path.join(process.cwd(), "archive");
  if (!fs.existsSync(archiveDir)) {
    console.error("❌ ERROR: Archive directory does not exist! Aborting.");
    process.exit(1);
  }

  const backupFiles = fs.readdirSync(archiveDir).filter((f) => f.startsWith("orders-backup-"));
  if (backupFiles.length === 0) {
    console.error("❌ ERROR: No verified backup file found in /archive! Aborting.");
    process.exit(1);
  }

  console.log(`✓ Verified backup exists: ${backupFiles[backupFiles.length - 1]}`);

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

  await prisma.$transaction(async (tx) => {
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

    // 9. Orders
    await tx.order.deleteMany({});
    console.log("✓ Cleared Orders");

    // 10. Reset Delivery Challan Sequence to 0 so next sequence is SAB/DC/0001
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
