import { Client } from "pg";

async function main() {
  const neon = new Client({
    connectionString: "postgresql://neondb_owner:npg_Ur7ZtewdsN6v@ep-raspy-cell-a7rcz98g-pooler.ap-southeast-2.aws.neon.tech/acc_block_live?sslmode=require",
  });
  await neon.connect();
  console.log("Connected to Neon. Adding columns & UserAuditLog table...");

  await neon.query(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
  `);
  console.log("✓ Added lastLoginAt and avatarUrl columns to User table");

  await neon.query(`
    CREATE TABLE IF NOT EXISTS "UserAuditLog" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "actorId" TEXT,
      "action" TEXT NOT NULL,
      "details" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "UserAuditLog_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log("✓ Created UserAuditLog table");

  await neon.query(`
    CREATE INDEX IF NOT EXISTS "UserAuditLog_userId_idx" ON "UserAuditLog"("userId");
    CREATE INDEX IF NOT EXISTS "UserAuditLog_actorId_idx" ON "UserAuditLog"("actorId");
    CREATE INDEX IF NOT EXISTS "UserAuditLog_action_idx" ON "UserAuditLog"("action");
    CREATE INDEX IF NOT EXISTS "UserAuditLog_createdAt_idx" ON "UserAuditLog"("createdAt");
  `);
  console.log("✓ Created indexes on UserAuditLog");

  await neon.end();
  console.log("=== Migration successfully applied to Neon! ===");
}

main().catch(console.error);

