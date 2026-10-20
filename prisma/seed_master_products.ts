import { PrismaClient, StockType } from "@prisma/client";

const prisma = new PrismaClient();

export const MASTER_AAC_SIZES = [
  { sizeLabel: '3"', lengthMm: 600, heightMm: 200, widthMm: 75, cbm: 0.0090, bpc: 111.11, defaultPrice: 50.0 },
  { sizeLabel: '4"', lengthMm: 600, heightMm: 200, widthMm: 100, cbm: 0.0120, bpc: 83.33, defaultPrice: 55.0 },
  { sizeLabel: '4+"', lengthMm: 600, heightMm: 200, widthMm: 115, cbm: 0.0138, bpc: 72.46, defaultPrice: 58.0 },
  { sizeLabel: '5"', lengthMm: 600, heightMm: 200, widthMm: 125, cbm: 0.0150, bpc: 66.67, defaultPrice: 62.0 },
  { sizeLabel: '6"', lengthMm: 600, heightMm: 200, widthMm: 150, cbm: 0.0180, bpc: 55.56, defaultPrice: 72.0 },
  { sizeLabel: '8"', lengthMm: 600, heightMm: 200, widthMm: 200, cbm: 0.0240, bpc: 41.67, defaultPrice: 92.0 },
  { sizeLabel: '9"', lengthMm: 600, heightMm: 200, widthMm: 225, cbm: 0.0270, bpc: 37.04, defaultPrice: 102.0 },
  { sizeLabel: '9+"', lengthMm: 600, heightMm: 200, widthMm: 230, cbm: 0.0276, bpc: 36.23, defaultPrice: 105.0 },
  { sizeLabel: '12"', lengthMm: 600, heightMm: 200, widthMm: 300, cbm: 0.0360, bpc: 27.78, defaultPrice: 138.0 },
];

async function seed() {
  console.log("Seeding master AAC block sizes and verified Mortar/Adhesive products...");

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
          price: s.defaultPrice,
          gstRate: 18.0,
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

  // 2. Verified Swarnim Block Jointing Mortar (40 Kg Bag) from brochure
  const existingMortar = await prisma.product.findFirst({
    where: { category: "MORTAR" },
  });

  if (!existingMortar) {
    console.log("Creating Swarnim Block Jointing Mortar (40 Kg Bag)...");
    const mortar = await prisma.product.create({
      data: {
        name: "Swarnim Block Jointing Mortar",
        brand: "Swarnim",
        category: "MORTAR",
        sizeLabel: "40 Kg Bag",
        dimensions: "40 Kg Bag (Grey)",
        lengthMm: 0,
        heightMm: 0,
        widthMm: 0,
        cbmPerBlock: 0,
        blocksPerCbm: 0,
        bagWeightKg: 40.0,
        consumptionRate: 35.0, // ~35 kg per CBM of AAC masonry at 3mm joint
        jointThicknessMm: 3.0,
        price: 380.0,
        gstRate: 18.0,
        active: true,
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId: mortar.id,
        type: StockType.IN,
        quantityDelta: 1000,
        referenceNo: "MASTER-INIT",
        note: "Master seed stock for Swarnim Block Jointing Mortar (40 Kg)",
      },
    });
  } else {
    console.log("Updating existing Mortar product...");
    await prisma.product.update({
      where: { id: existingMortar.id },
      data: {
        name: "Swarnim Block Jointing Mortar",
        brand: "Swarnim",
        category: "MORTAR",
        sizeLabel: "40 Kg Bag",
        dimensions: "40 Kg Bag (Grey)",
        bagWeightKg: 40.0,
        consumptionRate: 35.0,
        jointThicknessMm: 3.0,
        price: Number(existingMortar.price) > 0 ? existingMortar.price : 380.0,
        active: true,
      },
    });
  }

  // 3. Verified GOLD (G100) Tile & Stone Adhesive (20 Kg Bag) from brochure
  const existingAdhesive = await prisma.product.findFirst({
    where: { category: "ADHESIVE" },
  });

  if (!existingAdhesive) {
    console.log("Creating GOLD (G100) TILE & STONE ADHESIVE (20 Kg Bag)...");
    const adhesive = await prisma.product.create({
      data: {
        name: "GOLD (G100) TILE & STONE ADHESIVE",
        brand: "Swarnim",
        category: "ADHESIVE",
        sizeLabel: "20 Kg Bag",
        dimensions: "20 Kg Bag (Grey)",
        lengthMm: 0,
        heightMm: 0,
        widthMm: 0,
        cbmPerBlock: 0,
        blocksPerCbm: 0,
        bagWeightKg: 20.0,
        coverageSqft: 55.0, // 55-60 Sq.Ft. per 20 kg bag at 3 mm bed thickness
        price: 290.0,
        gstRate: 18.0,
        active: true,
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId: adhesive.id,
        type: StockType.IN,
        quantityDelta: 1000,
        referenceNo: "MASTER-INIT",
        note: "Master seed stock for GOLD (G100) Tile Adhesive (20 Kg)",
      },
    });
  } else {
    console.log("Updating existing Adhesive product...");
    await prisma.product.update({
      where: { id: existingAdhesive.id },
      data: {
        name: "GOLD (G100) TILE & STONE ADHESIVE",
        brand: "Swarnim",
        category: "ADHESIVE",
        sizeLabel: "20 Kg Bag",
        dimensions: "20 Kg Bag (Grey)",
        bagWeightKg: 20.0,
        coverageSqft: 55.0,
        price: Number(existingAdhesive.price) > 0 ? existingAdhesive.price : 290.0,
        active: true,
      },
    });
  }

  console.log("Master seed completed successfully!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
