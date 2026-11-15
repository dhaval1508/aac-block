import { prisma } from "../lib/prisma";
import { serializeForClient } from "../lib/utils";

async function main() {
  const order = await prisma.order.findFirst({
    include: { product: true, items: true },
  });
  if (!order) {
    console.log("No orders");
    return;
  }

  const raw = order.totalCbm as unknown;
  console.log("raw totalCbm:", {
    type: typeof raw,
    ctor: raw?.constructor?.name,
    keys: raw && typeof raw === "object" ? Object.getOwnPropertyNames(raw) : null,
    hasToNumber: raw != null && typeof (raw as { toNumber?: unknown }).toNumber === "function",
    hasToFixed: raw != null && typeof (raw as { toFixed?: unknown }).toFixed === "function",
    d: raw != null && typeof raw === "object" ? (raw as { d?: unknown }).d : undefined,
    s: raw != null && typeof raw === "object" ? (raw as { s?: unknown }).s : undefined,
    e: raw != null && typeof raw === "object" ? (raw as { e?: unknown }).e : undefined,
    toJSON: raw != null && typeof (raw as { toJSON?: unknown }).toJSON === "function"
      ? (raw as { toJSON: () => unknown }).toJSON()
      : undefined,
    string: String(raw),
  });

  const plain = serializeForClient(order);
  console.log("plain totalCbm:", plain.totalCbm, typeof plain.totalCbm);
  console.log("plain rate:", plain.rate, typeof plain.rate);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
