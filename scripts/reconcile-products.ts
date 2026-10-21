import { prisma } from "../lib/prisma";

async function main() {
  console.log("Reconciling AAC Block products to ensure exactly 9 approved sizes are active...");

  // Approved 9 Product IDs:
  const approvedIds = [
    "cmv5g6h7y0004hmlc16y9js1p", // 3 Inch (75mm)
    "cmvhz8lvz0000l308k6bbrhn7", // FLYASH BLOCK 4" (100mm)
    "cmvgoy6xs0000hm4gmrgd79kg", // 4+ Inch (115mm)
    "cmvhzbdfy0004l308p33fz2gx", // SAND BLOCK 5" (125mm)
    "cmvhz7pw60000jm08xkdrqh06", // SAND BLOCK 6" (150mm)
    "cmv5g6h9k000jhmlcahn2xr8e", // FLYASH BLOCK 8" (200mm)
    "cmv5g6h9t000mhmlcixx57r61", // FLYASH BLOCK 9" (225mm)
    "cmv5g6ha8000shmlcb9srzvh3", // SAND BLOCK 9+" (230mm)
    "cmvduplje0001k408yb6l0nmj", // SAND BLOCK 12" (300mm)
  ];

  // 1. Activate approved 9 products and clear deletedAt
  for (const id of approvedIds) {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        active: true,
        deletedAt: null,
      },
      select: {
        id: true,
        sizeLabel: true,
        widthMm: true,
        cbmPerBlock: true,
        blocksPerCbm: true,
      },
    });
    console.log(`[ACTIVATED] ${updated.widthMm}mm - ${updated.sizeLabel} (ID: ${updated.id})`);
  }

  // 2. Deactivate any duplicate AAC block sizes so exactly 9 appear in active selection
  const duplicates = await prisma.product.findMany({
    where: {
      category: "AAC_BLOCK",
      id: { notIn: approvedIds },
      active: true,
    },
    select: { id: true, sizeLabel: true, widthMm: true },
  });

  for (const d of duplicates) {
    await prisma.product.update({
      where: { id: d.id },
      data: { active: false },
    });
    console.log(`[DEACTIVATED DUPLICATE] ${d.widthMm}mm - ${d.sizeLabel} (ID: ${d.id})`);
  }

  // 3. Verify exactly 9 active AAC Block sizes
  const activeAac = await prisma.product.findMany({
    where: {
      category: "AAC_BLOCK",
      active: true,
      deletedAt: null,
    },
    orderBy: { widthMm: "asc" },
  });

  console.log(`\nVerification: Exactly ${activeAac.length} active AAC Block products:`);
  console.table(
    activeAac.map((p) => ({
      id: p.id,
      size: p.sizeLabel,
      dimensions: p.dimensions,
      width: p.widthMm,
      cbm: Number(p.cbmPerBlock),
      bpc: Number(p.blocksPerCbm),
    }))
  );

  // 4. Verify Mortar is active
  const mortar = await prisma.product.findFirst({
    where: {
      category: "MORTAR",
      active: true,
      deletedAt: null,
    },
  });
  console.log(`\nMortar Active: ${mortar?.name} (${mortar?.dimensions})`);
}

main()
  .catch((e) => {
    console.error("Reconciliation error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
