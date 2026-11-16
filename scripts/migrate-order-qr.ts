import { Client } from "pg";

async function main() {
  const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Ur7ZtewdsN6v@ep-raspy-cell-a7rcz98g-pooler.ap-southeast-2.aws.neon.tech/acc_block_live?sslmode=require";
  const neon = new Client({
    connectionString: dbUrl,
  });
  await neon.connect();
  console.log("Connected to Neon. Applying Order QR Code migration...");

  // 1. Create QrStatus Enum
  await neon.query(`
    DO $$ BEGIN
      CREATE TYPE "QrStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("✓ QrStatus enum ready");

  // 2. Create OrderQrCode Table
  await neon.query(`
    CREATE TABLE IF NOT EXISTS "OrderQrCode" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "tokenHash" TEXT,
      "status" "QrStatus" NOT NULL DEFAULT 'ACTIVE',
      "accessPolicy" TEXT NOT NULL DEFAULT 'PUBLIC_READONLY',
      "passcode" TEXT,
      "expiresAt" TIMESTAMP(3),
      "revokedAt" TIMESTAMP(3),
      "revokedById" TEXT,
      "revokedReason" TEXT,
      "createdById" TEXT,
      "createdByName" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "OrderQrCode_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OrderQrCode_orderId_key" UNIQUE ("orderId"),
      CONSTRAINT "OrderQrCode_token_key" UNIQUE ("token"),
      CONSTRAINT "OrderQrCode_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log("✓ OrderQrCode table ready");

  // 3. Create OrderQrShareLog Table
  await neon.query(`
    CREATE TABLE IF NOT EXISTS "OrderQrShareLog" (
      "id" TEXT NOT NULL,
      "qrCodeId" TEXT NOT NULL,
      "channel" TEXT NOT NULL,
      "recipient" TEXT,
      "sentById" TEXT,
      "sentByName" TEXT,
      "status" TEXT NOT NULL DEFAULT 'SUCCESS',
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "OrderQrShareLog_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OrderQrShareLog_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "OrderQrCode"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log("✓ OrderQrShareLog table ready");

  // 4. Create OrderQrScanLog Table
  await neon.query(`
    CREATE TABLE IF NOT EXISTS "OrderQrScanLog" (
      "id" TEXT NOT NULL,
      "qrCodeId" TEXT NOT NULL,
      "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "result" TEXT NOT NULL DEFAULT 'SUCCESS',
      "ipAddress" TEXT,
      "userAgent" TEXT,

      CONSTRAINT "OrderQrScanLog_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OrderQrScanLog_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "OrderQrCode"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log("✓ OrderQrScanLog table ready");

  // 5. Create Performance Indexes
  await neon.query(`
    CREATE INDEX IF NOT EXISTS "OrderQrCode_orderId_idx" ON "OrderQrCode"("orderId");
    CREATE INDEX IF NOT EXISTS "OrderQrCode_token_idx" ON "OrderQrCode"("token");
    CREATE INDEX IF NOT EXISTS "OrderQrCode_status_idx" ON "OrderQrCode"("status");
    CREATE INDEX IF NOT EXISTS "OrderQrShareLog_qrCodeId_idx" ON "OrderQrShareLog"("qrCodeId");
    CREATE INDEX IF NOT EXISTS "OrderQrShareLog_createdAt_idx" ON "OrderQrShareLog"("createdAt");
    CREATE INDEX IF NOT EXISTS "OrderQrScanLog_qrCodeId_idx" ON "OrderQrScanLog"("qrCodeId");
    CREATE INDEX IF NOT EXISTS "OrderQrScanLog_scannedAt_idx" ON "OrderQrScanLog"("scannedAt");
  `);
  console.log("✓ Indexes created on QR tables");

  await neon.end();
  console.log("=== Order QR Code migration successfully executed on Neon! ===");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

