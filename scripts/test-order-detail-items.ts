import { prisma } from "../lib/prisma";

async function verifyOrderItems() {
  const orderId = "cmvv09mc50001l608dybk8ffl";
  console.log(`Verifying Order Items & Volume Breakdown for order ${orderId}...`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      product: true,
      items: { include: { product: true } },
    },
  });

  if (!order) {
    throw new Error("Order not found!");
  }

  // Exact filtering logic now used in admin/staff/stocker/salesman/customer order detail pages:
  const aacBlockItems = (order.items || []).filter(
    (it) =>
      it.productType === "AAC_BLOCK" ||
      it.product?.category === "AAC_BLOCK" ||
      (!["MORTAR"].includes(it.productType) &&
        it.product?.category !== "MORTAR" &&
        Number(it.cbmPerUnit || 0) > 0)
  );

  const mortarItems = (order.items || []).filter(
    (it) =>
      it.productType === "MORTAR" ||
      it.product?.category === "MORTAR" ||
      (!["AAC_BLOCK"].includes(it.productType) &&
        it.product?.category !== "AAC_BLOCK" &&
        (it.cbmPerUnit == null || Number(it.cbmPerUnit) === 0))
  );

  const totalMortarBags =
    order.adhesiveBags && order.adhesiveBags > 0
      ? order.adhesiveBags
      : mortarItems.reduce((sum, it) => sum + (it.quantity || 0), 0);

  const totalAacVolumeCbm =
    aacBlockItems.length > 0
      ? aacBlockItems.reduce((acc, it) => acc + Number(it.totalCbm || 0), 0)
      : order.totalCbm
      ? Number(order.totalCbm)
      : 0;

  const totalAacBlocksCount =
    aacBlockItems.length > 0
      ? aacBlockItems.reduce((acc, it) => acc + (it.quantity || 0), 0)
      : order.quantity;

  console.log("Raw items in DB:", order.items.length);
  for (const it of order.items) {
    console.log(` - ${it.productName} (type: ${it.productType}, cat: ${it.product?.category}): ${it.quantity} units, ${it.totalCbm} CBM`);
  }

  console.log("\nFiltered AAC Block Items in table:", aacBlockItems.length);
  for (const it of aacBlockItems) {
    console.log(` - ${it.productName}: ${it.quantity} blocks, ${it.totalCbm} CBM`);
  }

  console.log(`\nCombined Totals row in table: ${totalAacVolumeCbm.toFixed(3)} CBM (≈ ${totalAacBlocksCount} Blocks)`);
  console.log(`Dedicated Bottom Card: Block Jointing Morter -> ${totalMortarBags} Bags`);

  // Assertions:
  // 1. AAC Block Items must not contain mortar
  const hasMortarInTable = aacBlockItems.some(
    (it) => it.productType === "MORTAR" || it.product?.category === "MORTAR" || it.productName.toLowerCase().includes("mortar")
  );
  if (hasMortarInTable) {
    console.error("❌ FAILED: Mortar found in AAC block table!");
    process.exit(1);
  } else {
    console.log("✅ PASS: Mortar item successfully isolated from AAC block table!");
  }

  // 2. Mortar bags count must equal 10
  if (totalMortarBags !== 10) {
    console.error(`❌ FAILED: Mortar bags expected 10, got ${totalMortarBags}!`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: Bottom card displays exactly ${totalMortarBags} Bags!`);
  }

  // 3. Combined Totals volume must be 17.000 CBM (630 blocks)
  if (totalAacVolumeCbm !== 17 || totalAacBlocksCount !== 630) {
    console.error(`❌ FAILED: Unexpected volume or block count!`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: Combined totals volume is 17.000 CBM (630 blocks)!`);
  }

  console.log("\n=== ALL ITEM TABLE CHECKS PASSED SUCCESSFULLY! ===");
}

verifyOrderItems().catch((err) => {
  console.error(err);
  process.exit(1);
});
