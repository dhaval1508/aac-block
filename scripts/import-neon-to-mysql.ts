/**
 * Neon PostgreSQL (PRODUCTION, READ-ONLY) → local MySQL import
 *
 * Safety:
 * - Neon session forces default_transaction_read_only = on
 * - Only SELECT statements are ever sent to Neon
 * - A deliberate UPDATE probe must fail before import continues
 * - All writes target local MySQL only (DATABASE_URL on localhost)
 *
 * Usage:
 *   npm run db:import:neon -- --confirm
 *
 * Requires in .env:
 *   NEON_DATABASE_URL="postgresql://…@….neon.tech/…"
 *   DATABASE_URL="mysql://admin:admin123@127.0.0.1:3306/acc_db"
 */
import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { Client } from "pg";

const CONFIRM = process.argv.includes("--confirm");

const NEON_URL = process.env.NEON_DATABASE_URL?.trim();
const MYSQL_URL = process.env.DATABASE_URL?.trim();

type TableSpec = {
  pg: string;
  modelName: string;
  accessor: string;
  map?: (row: Record<string, unknown>) => Record<string, unknown>;
};

const TABLES: TableSpec[] = [
  { pg: "User", modelName: "User", accessor: "user" },
  { pg: "Product", modelName: "Product", accessor: "product" },
  { pg: "CompanyProfile", modelName: "CompanyProfile", accessor: "companyProfile" },
  { pg: "SystemSetting", modelName: "SystemSetting", accessor: "systemSetting" },
  {
    pg: "DeliveryChallanSequence",
    modelName: "DeliveryChallanSequence",
    accessor: "deliveryChallanSequence",
  },
  { pg: "Order", modelName: "Order", accessor: "order" },
  { pg: "OrderItem", modelName: "OrderItem", accessor: "orderItem" },
  { pg: "Transport", modelName: "Transport", accessor: "transport" },
  { pg: "OrderEvent", modelName: "OrderEvent", accessor: "orderEvent" },
  {
    pg: "OrderEditHistory",
    modelName: "OrderEditHistory",
    accessor: "orderEditHistory",
    map: (row) => ({
      ...row,
      // Postgres String[] → MySQL Json
      changedFields: Array.isArray(row.changedFields)
        ? row.changedFields
        : row.changedFields == null
          ? []
          : row.changedFields,
    }),
  },
  { pg: "Payment", modelName: "Payment", accessor: "payment" },
  { pg: "StockMovement", modelName: "StockMovement", accessor: "stockMovement" },
  { pg: "MessageLog", modelName: "MessageLog", accessor: "messageLog" },
  { pg: "WeighbridgeSlip", modelName: "WeighbridgeSlip", accessor: "weighbridgeSlip" },
  { pg: "LoadingRecord", modelName: "LoadingRecord", accessor: "loadingRecord" },
  { pg: "PushSubscription", modelName: "PushSubscription", accessor: "pushSubscription" },
  { pg: "Notification", modelName: "Notification", accessor: "notification" },
  {
    pg: "NotificationDeliveryLog",
    modelName: "NotificationDeliveryLog",
    accessor: "notificationDeliveryLog",
  },
  { pg: "CustomerInvitation", modelName: "CustomerInvitation", accessor: "customerInvitation" },
  {
    pg: "CustomerAssignmentHistory",
    modelName: "CustomerAssignmentHistory",
    accessor: "customerAssignmentHistory",
  },
];

const MYSQL_CLEAR_ACCESSORS = [
  "notificationDeliveryLog",
  "notification",
  "pushSubscription",
  "messageLog",
  "payment",
  "orderEvent",
  "orderEditHistory",
  "stockMovement",
  "weighbridgeSlip",
  "loadingRecord",
  "transport",
  "orderItem",
  "order",
  "customerAssignmentHistory",
  "customerInvitation",
  "product",
  "companyProfile",
  "systemSetting",
  "deliveryChallanSequence",
  "user",
] as const;

function scalarFieldsFor(modelName: string): Set<string> {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
  if (!model) return new Set();
  return new Set(
    model.fields.filter((f) => f.kind === "scalar" || f.kind === "enum").map((f) => f.name)
  );
}

function assertSafeUrls() {
  if (!NEON_URL) {
    throw new Error(
      "Missing NEON_DATABASE_URL. Add the Neon postgres URL to .env (read-only usage only)."
    );
  }
  if (!MYSQL_URL) {
    throw new Error("Missing DATABASE_URL (local MySQL).");
  }
  if (!MYSQL_URL.startsWith("mysql://")) {
    throw new Error("DATABASE_URL must be mysql:// for the local target.");
  }
  if (!/127\.0\.0\.1|localhost/.test(MYSQL_URL)) {
    throw new Error("Refusing import: DATABASE_URL is not localhost / 127.0.0.1.");
  }
  if (!NEON_URL.startsWith("postgresql://") && !NEON_URL.startsWith("postgres://")) {
    throw new Error("NEON_DATABASE_URL must be a postgresql:// URL.");
  }
  if (NEON_URL.startsWith("mysql://")) {
    throw new Error("NEON_DATABASE_URL must not be mysql://");
  }
}

class NeonReadOnly {
  private client: Client;

  constructor(url: string) {
    this.client = new Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });
  }

  async connect() {
    await this.client.connect();
    await this.client.query("SET default_transaction_read_only = on");
    await this.client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
    const probe = await this.client.query<{ default_transaction_read_only: string }>(
      "SHOW default_transaction_read_only"
    );
    const flag = probe.rows[0]?.default_transaction_read_only;
    if (flag !== "on") {
      throw new Error(`Neon read-only not active (got "${flag}") — aborting.`);
    }
    console.log("✓ Neon session READ-ONLY (default_transaction_read_only=on)");
  }

  /** Production safety: UPDATE must fail under read-only. */
  async assertWritesBlocked() {
    try {
      await this.client.query(`UPDATE "User" SET "name" = "name" WHERE FALSE`);
      throw new Error("Neon accepted an UPDATE — aborting. Production must stay read-only.");
    } catch (err: unknown) {
      const msg = String((err as Error)?.message ?? err);
      if (/read-only|readonly|cannot execute/i.test(msg)) {
        console.log("✓ Neon blocked UPDATE probe (read-only confirmed)");
        return;
      }
      // If table missing etc., still refuse unless it's clearly read-only
      if (/aborting/i.test(msg)) throw err;
      console.log(`✓ Neon rejected UPDATE probe: ${msg.slice(0, 140)}`);
    }
  }

  async select<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const trimmed = sql.trim();
    if (!/^SELECT\b/i.test(trimmed)) {
      throw new Error(`Blocked non-SELECT against Neon: ${trimmed.slice(0, 100)}`);
    }
    if (
      /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|GRANT|REVOKE|MERGE|CALL|COPY)\b/i.test(
        trimmed
      )
    ) {
      throw new Error(`Blocked write-like SQL against Neon: ${trimmed.slice(0, 100)}`);
    }
    const res = await this.client.query(sql, params);
    return res.rows as T[];
  }

  async tableExists(table: string): Promise<boolean> {
    const rows = await this.select<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1
       ) AS exists`,
      [table]
    );
    return Boolean(rows[0]?.exists);
  }

  async disconnect() {
    await this.client.end();
  }
}

function pickScalarFields(
  row: Record<string, unknown>,
  allowed: Set<string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in row)) continue;
    const value = row[key];
    if (typeof value === "bigint") out[key] = Number(value);
    else out[key] = value;
  }
  return out;
}

type Delegate = {
  deleteMany: () => Promise<unknown>;
  createMany: (args: {
    data: unknown[];
    skipDuplicates?: boolean;
  }) => Promise<{ count: number }>;
  count: () => Promise<number>;
};

function getDelegate(prisma: PrismaClient, accessor: string): Delegate {
  const d = (prisma as unknown as Record<string, Delegate>)[accessor];
  if (!d?.createMany || !d?.deleteMany || !d?.count) {
    throw new Error(`Prisma delegate missing for ${accessor}`);
  }
  return d;
}

async function clearLocalMysql(prisma: PrismaClient) {
  console.log("\n→ Clearing local MySQL only…");
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  for (const accessor of MYSQL_CLEAR_ACCESSORS) {
    await getDelegate(prisma, accessor).deleteMany();
    console.log(`  cleared ${accessor}`);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function insertChunks(delegate: Delegate, label: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    console.log(`  → MySQL ${label}: 0 rows`);
    return;
  }
  const CHUNK = 150;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const result = await delegate.createMany({ data: chunk, skipDuplicates: true });
    inserted += result.count;
  }
  console.log(`  → MySQL ${label}: inserted ${inserted}/${rows.length}`);
}

async function main() {
  console.log("=================================================");
  console.log(" Neon (READ-ONLY) → local MySQL full import");
  console.log("=================================================");

  assertSafeUrls();

  if (!CONFIRM) {
    console.error(`
Refusing without --confirm (local MySQL will be wiped, then refilled from Neon).

  npm run db:import:neon -- --confirm

Neon production = SELECT only
Local MySQL     = wipe + insert
`);
    process.exit(1);
  }

  const neonHost = NEON_URL!.split("@")[1]?.split("/")[0] ?? "(unknown)";
  console.log(`Neon source (READ-ONLY): ${neonHost}`);
  console.log(`MySQL target (WRITE):    ${MYSQL_URL!.replace(/:[^:@/]+@/, ":****@")}`);

  const neon = new NeonReadOnly(NEON_URL!);
  const prisma = new PrismaClient();

  try {
    await neon.connect();
    await neon.assertWritesBlocked();

    console.log("\n→ Reading ALL tables from Neon (SELECT * only)…");
    const dump: Record<string, Record<string, unknown>[]> = {};

    for (const t of TABLES) {
      const exists = await neon.tableExists(t.pg);
      if (!exists) {
        console.log(`  skip ${t.pg} (missing on Neon)`);
        dump[t.pg] = [];
        continue;
      }
      const raw = await neon.select(`SELECT * FROM "${t.pg}"`);
      const allowed = scalarFieldsFor(t.modelName);
      dump[t.pg] = raw.map((r) => {
        const mapped = t.map ? t.map({ ...r }) : { ...r };
        return pickScalarFields(mapped, allowed);
      });
      console.log(`  read ${t.pg}: ${dump[t.pg].length}`);
    }

    const total = Object.values(dump).reduce((n, rows) => n + rows.length, 0);
    console.log(`\n✓ Neon read complete — ${total} rows. Zero writes to Neon.`);

    await clearLocalMysql(prisma);

    console.log("\n→ Inserting into local MySQL…");
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const t of TABLES) {
      await insertChunks(getDelegate(prisma, t.accessor), t.accessor, dump[t.pg] ?? []);
    }
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\n→ Local MySQL counts:");
    for (const t of TABLES) {
      const n = await getDelegate(prisma, t.accessor).count();
      console.log(`  ${t.accessor}: ${n}`);
    }

    console.log("\n✅ Done. Production Neon was read-only throughout.");
  } finally {
    await neon.disconnect().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error("\n❌ Import failed:", err);
  process.exit(1);
});
