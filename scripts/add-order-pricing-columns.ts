import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking and adding Order columns (MySQL)...");

  // MySQL 8.x does not support ADD COLUMN IF NOT EXISTS in all modes —
  // ignore duplicate-column errors so this script stays idempotent.
  const statements = [
    "ALTER TABLE `Order` ADD COLUMN `pricePerCbm` DECIMAL(12, 2) NULL",
    "ALTER TABLE `Order` ADD COLUMN `pricingRemarks` TEXT NULL",
    "ALTER TABLE `Order` ADD COLUMN `deletedAt` DATETIME(3) NULL",
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("Applied:", sql);
    } catch (err: any) {
      if (err?.code === "P2010" || String(err?.message ?? "").includes("Duplicate column")) {
        console.log("Already exists, skipped.");
        continue;
      }
      throw err;
    }
  }

  console.log("Columns successfully ensured on Order table in MySQL!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
