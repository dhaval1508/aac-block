import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Inspecting active database orders and related records...");
  
  const orders = await prisma.order.findMany({
    include: {
      items: true,
      transport: true,
      events: true,
      payments: true,
      movements: true,
      messageLogs: true,
      customer: {
        select: {
          id: true,
          name: true,
          mobile: true,
          companyName: true,
          email: true,
        },
      },
      assignedStaff: {
        select: {
          id: true,
          name: true,
          mobile: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`📦 Found ${orders.length} orders in active database.`);

  const archiveDir = path.join(process.cwd(), "archive");
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilePath = path.join(archiveDir, `orders-backup-${timestamp}.json`);

  fs.writeFileSync(backupFilePath, JSON.stringify(orders, null, 2), "utf-8");

  console.log(`✅ Backup successfully saved to: ${backupFilePath}`);
  console.log(`📊 Backup Summary:`);
  console.log(`   - Total Orders: ${orders.length}`);
  console.log(`   - Total Items: ${orders.reduce((sum, o) => sum + o.items.length, 0)}`);
  console.log(`   - Total Events: ${orders.reduce((sum, o) => sum + o.events.length, 0)}`);
  console.log(`   - Total Payments: ${orders.reduce((sum, o) => sum + o.payments.length, 0)}`);
  console.log(`   - File Size: ${(fs.statSync(backupFilePath).size / 1024).toFixed(2)} KB`);
}

main()
  .catch((e) => {
    console.error("❌ Backup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
