import { PrismaClient, StockType } from "@prisma/client";

const prisma = new PrismaClient();

export const MASTER_AAC_SIZES = [
  { sizeLabel: '3 Inch', lengthMm: 600, heightMm: 200, widthMm: 75, cbm: 0.0090, bpc: 111.11, defaultPrice: 0.0 },
  { sizeLabel: '4 Inch', lengthMm: 600, heightMm: 200, widthMm: 100, cbm: 0.0120, bpc: 83.33, defaultPrice: 0.0 },
  { sizeLabel: '4+ Inch', lengthMm: 600, heightMm: 200, widthMm: 115, cbm: 0.0138, bpc: 72.46, defaultPrice: 0.0 },
  { sizeLabel: '5 Inch', lengthMm: 600, heightMm: 200, widthMm: 125, cbm: 0.0150, bpc: 66.67, defaultPrice: 0.0 },
  { sizeLabel: '6 Inch', lengthMm: 600, heightMm: 200, widthMm: 150, cbm: 0.0180, bpc: 55.56, defaultPrice: 0.0 },
  { sizeLabel: '8 Inch', lengthMm: 600, heightMm: 200, widthMm: 200, cbm: 0.0240, bpc: 41.67, defaultPrice: 0.0 },
  { sizeLabel: '9 Inch', lengthMm: 600, heightMm: 200, widthMm: 225, cbm: 0.0270, bpc: 37.04, defaultPrice: 0.0 },
  { sizeLabel: '9+ Inch', lengthMm: 600, heightMm: 200, widthMm: 230, cbm: 0.0276, bpc: 36.23, defaultPrice: 0.0 },
  { sizeLabel: '12 Inch', lengthMm: 600, heightMm: 200, widthMm: 300, cbm: 0.0360, bpc: 27.78, defaultPrice: 0.0 },
];

async function seed() {
  console.log("Seeding master AAC block sizes with standardized Inch names and Block Jointing Morter 40 KG...");

  // 1. Seed or ensure the 9 standard AAC Block sizes
  for (const s of MASTER_AAC_SIZES) {
    const existing = await prisma.product.findFirst({
      where: {
        category: "AAC_BLOCK",
        widthMm: s.widthMm,
        lengthMm: s.lengthMm,
        heightMm: s.heightMm,
      },
    });

    if (existing) {
      console.log(`Updating existing size: ${s.sizeLabel} (${s.widthMm}mm)`);
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          sizeLabel: s.sizeLabel,
          dimensions: `${s.lengthMm} × ${s.heightMm} × ${s.widthMm} mm`,
          cbmPerBlock: s.cbm,
          blocksPerCbm: s.bpc,
          active: true,
          category: "AAC_BLOCK",
          brand: "Swarnim",
        },
      });
    } else {
      console.log(`Creating new size: ${s.sizeLabel} (${s.widthMm}mm)`);
      const p = await prisma.product.create({
        data: {
          name: "AAC Block",
          brand: "Swarnim",
          category: "AAC_BLOCK",
          sizeLabel: s.sizeLabel,
          dimensions: `${s.lengthMm} × ${s.heightMm} × ${s.widthMm} mm`,
          lengthMm: s.lengthMm,
          heightMm: s.heightMm,
          widthMm: s.widthMm,
          cbmPerBlock: s.cbm,
          blocksPerCbm: s.bpc,
          price: 0,
          gstRate: 0,
          active: true,
        },
      });

      // Opening stock
      await prisma.stockMovement.create({
        data: {
          productId: p.id,
          type: StockType.IN,
          quantityDelta: 5000,
          referenceNo: "MASTER-INIT",
          note: `Master seed stock for ${s.sizeLabel}`,
        },
      });
    }
  }

  // 2. Ensure exactly one active mortar product: "Block Jointing Morter" (40 KG Bag Only)
  // First, deactivate and soft-delete any old or duplicate mortar / adhesive products
  const allOldMortarOrAdhesives = await prisma.product.findMany({
    where: {
      category: { in: ["MORTAR", "ADHESIVE"] },
    },
  });

  let primaryMortarId: string | null = null;
  if (allOldMortarOrAdhesives.length > 0) {
    // Pick the first one to be the canonical "Block Jointing Morter"
    primaryMortarId = allOldMortarOrAdhesives[0].id;
    await prisma.product.update({
      where: { id: primaryMortarId },
      data: {
        name: "Block Jointing Morter",
        brand: "Swarnim",
        category: "MORTAR",
        sizeLabel: "40 KG Bag",
        dimensions: "40 KG Bag",
        lengthMm: 0,
        heightMm: 0,
        widthMm: 0,
        cbmPerBlock: 0,
        blocksPerCbm: 0,
        bagWeightKg: 40.0,
        price: 0,
        gstRate: 0,
        active: true,
        deletedAt: null,
      },
    });
    console.log(`Updated canonical mortar product ${primaryMortarId} to 'Block Jointing Morter' (40 KG Bag).`);

    // Deactivate/soft-delete any other duplicates
    for (let i = 1; i < allOldMortarOrAdhesives.length; i++) {
      const dup = allOldMortarOrAdhesives[i];
      await prisma.product.update({
        where: { id: dup.id },
        data: {
          active: false,
          deletedAt: new Date(),
        },
      });
      console.log(`Deactivated and soft-deleted duplicate mortar/adhesive product: ${dup.id} (${dup.name})`);
    }
  } else {
    console.log("Creating new Block Jointing Morter (40 KG Bag)...");
    const mortar = await prisma.product.create({
      data: {
        name: "Block Jointing Morter",
        brand: "Swarnim",
        category: "MORTAR",
        sizeLabel: "40 KG Bag",
        dimensions: "40 KG Bag",
        lengthMm: 0,
        heightMm: 0,
        widthMm: 0,
        cbmPerBlock: 0,
        blocksPerCbm: 0,
        bagWeightKg: 40.0,
        price: 0,
        gstRate: 0,
        active: true,
        deletedAt: null,
      },
    });
    primaryMortarId = mortar.id;

    await prisma.stockMovement.create({
      data: {
        productId: mortar.id,
        type: StockType.IN,
        quantityDelta: 1000,
        referenceNo: "MASTER-INIT",
        note: "Master seed stock for Block Jointing Morter (40 KG Bag)",
      },
    });
  }

  console.log("Master seed completed successfully! Only 9 AAC Block sizes and 1 Block Jointing Morter (40 KG Bag) active.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
