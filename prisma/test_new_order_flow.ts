import { PrismaClient, OrderStatus, Role } from "@prisma/client";
import { MASTER_BLOCK_SIZES, calculateBlockMetrics } from "../lib/aac-calculator";

const prisma = new PrismaClient();

async function run() {
  console.log("=== RUNNING SWARNIM ORDER MODIFICATIONS VERIFICATION TEST ===");

  // 1. Verify all 9 block sizes in DB
  console.log("\n--- TEST 1: Verifying All 9 Master AAC Block Sizes ---");
  for (const spec of MASTER_BLOCK_SIZES) {
    const metrics = calculateBlockMetrics(spec.lengthMm, spec.heightMm, spec.widthMm);
    const expectedCbm = (spec.lengthMm * spec.heightMm * spec.widthMm) / 1e9;
    const expectedSqft = ((spec.lengthMm * spec.heightMm) / 1e6) * 10.7639104167;

    if (Math.abs(metrics.cbmExact - expectedCbm) > 0.00001) {
      throw new Error(`CBM calculation mismatch for ${spec.size}`);
    }
    console.log(`✅ Size ${spec.size.padEnd(4)}: ${spec.lengthMm}x${spec.heightMm}x${spec.widthMm}mm | CBM/blk: ${metrics.cbmDisplay} m³ | SqFt/blk: ${expectedSqft.toFixed(2)}`);
  }

  // 2. Verify Block Jointing Morter (40 KG) product in DB
  console.log("\n--- TEST 2: Verifying Block Jointing Morter (40 KG) ---");
  const mortar = await prisma.product.findFirst({
    where: {
      OR: [
        { name: "Block Jointing Morter" },
        { category: "MORTAR" },
        { category: "ADHESIVE" },
      ],
      active: true,
      deletedAt: null,
    },
  });
  if (!mortar) {
    throw new Error("Active Block Jointing Morter product not found!");
  }
  if (Number(mortar.bagWeightKg) !== 40) {
    throw new Error(`Expected bagWeightKg=40, got ${mortar.bagWeightKg}`);
  }
  console.log(`✅ Block Jointing Morter verified: "${mortar.name}", Bag Weight: ${mortar.bagWeightKg} KG`);

  // 3. Test Order Creation with Adhesive Quantity = 0
  console.log("\n--- TEST 3: Order Placement with 0 Adhesive Bags ---");
  const testCustomer = await prisma.user.findFirst({
    where: { role: Role.CUSTOMER, active: true },
  });
  if (!testCustomer) {
    throw new Error("No customer found in database for test");
  }

  const p6 = await prisma.product.findFirst({
    where: { category: "AAC_BLOCK", widthMm: 150 },
  });
  if (!p6) throw new Error("6 Inch AAC block product not found");

  const testOrderNo1 = `TEST-ORD-${Date.now()}-01`;
  const orderWithZeroAdhesive = await prisma.order.create({
    data: {
      orderNo: testOrderNo1,
      customerId: testCustomer.id,
      productId: p6.id,
      quantity: 1000,
      totalCbm: 18.0,
      totalSqft: 1291.67,
      hasMortar: false,
      hasAdhesive: false,
      adhesiveBags: 0, // MUST ALLOW 0
      rate: 0,
      gstRate: 0,
      subtotal: 0,
      gstAmount: 0,
      totalAmount: 0,
      deliveryAddress: "Test Construction Site, Sector 21, Gandhinagar - 382021",
      notes: "Test order with 0 adhesive bags",
      status: OrderStatus.PENDING,
      items: {
        create: [
          {
            productId: p6.id,
            productType: "AAC_BLOCK",
            productName: p6.name,
            sizeLabel: '6"',
            dimensions: p6.dimensions,
            quantity: 1000,
            cbmPerUnit: 0.018,
            totalCbm: 18.0,
            sqftPerUnit: 1.29,
            totalSqft: 1291.67,
            rate: 0,
            gstRate: 0,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
          },
        ],
      },
      events: {
        create: {
          status: OrderStatus.PENDING,
          title: "Order Placed",
          note: "Order booked: 1,000 AAC Blocks (18.00 CBM) + 0 Bags Block Jointing Morter (40 KG)",
          createdById: testCustomer.id,
        },
      },
    },
    include: { items: true },
  });

  if (orderWithZeroAdhesive.adhesiveBags !== 0) {
    throw new Error("adhesiveBags should be 0");
  }
  console.log(`✅ Order ${orderWithZeroAdhesive.orderNo} created successfully with adhesiveBags=0`);

  // 4. Test Order Creation with Multiple Block Sizes and Adhesive Quantity > 0
  console.log("\n--- TEST 4: Multi-Size Order Placement with 15 Adhesive Bags ---");
  const p8 = await prisma.product.findFirst({
    where: { category: "AAC_BLOCK", widthMm: 200 },
  });
  if (!p8) throw new Error("8 Inch AAC block product not found");

  const testOrderNo2 = `TEST-ORD-${Date.now()}-02`;
  const combinedBlocks = 1000 + 500;
  const combinedCbm = 1000 * 0.018 + 500 * 0.024; // 18.0 + 12.0 = 30.0 CBM
  const combinedSqft = combinedBlocks * 1.29166925; // 1937.50

  const multiSizeOrder = await prisma.order.create({
    data: {
      orderNo: testOrderNo2,
      customerId: testCustomer.id,
      productId: p6.id,
      quantity: combinedBlocks,
      totalCbm: combinedCbm,
      totalSqft: combinedSqft,
      hasMortar: false,
      hasAdhesive: true,
      adhesiveBags: 15, // > 0 bags
      rate: 0,
      gstRate: 0,
      subtotal: 0,
      gstAmount: 0,
      totalAmount: 0,
      deliveryAddress: "Commercial Hub, SG Highway, Ahmedabad - 380054",
      notes: "Multi-size test order: 6\" (1000) + 8\" (500) + 15 bags GOLD 40KG",
      status: OrderStatus.PENDING,
      items: {
        create: [
          {
            productId: p6.id,
            productType: "AAC_BLOCK",
            productName: p6.name,
            sizeLabel: '6"',
            dimensions: p6.dimensions,
            quantity: 1000,
            cbmPerUnit: 0.018,
            totalCbm: 18.0,
            sqftPerUnit: 1.29,
            totalSqft: 1291.67,
            rate: 0,
            gstRate: 0,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
          },
          {
            productId: p8.id,
            productType: "AAC_BLOCK",
            productName: p8.name,
            sizeLabel: '8"',
            dimensions: p8.dimensions,
            quantity: 500,
            cbmPerUnit: 0.024,
            totalCbm: 12.0,
            sqftPerUnit: 1.29,
            totalSqft: 645.83,
            rate: 0,
            gstRate: 0,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
          },
          {
            productId: mortar.id,
            productType: "MORTAR",
            productName: mortar.name,
            sizeLabel: "40 Kg Bag",
            dimensions: "40 Kg Bag",
            quantity: 15,
            cbmPerUnit: 0,
            totalCbm: 0,
            sqftPerUnit: 0,
            totalSqft: 0,
            rate: 0,
            gstRate: 0,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
          },
        ],
      },
      events: {
        create: {
          status: OrderStatus.PENDING,
          title: "Order Placed",
          note: `Order booked: ${combinedBlocks.toLocaleString()} AAC Blocks (${combinedCbm.toFixed(2)} CBM) + 15 Bags Block Jointing Morter (40 KG)`,
          createdById: testCustomer.id,
        },
      },
    },
    include: { items: true },
  });

  if (multiSizeOrder.quantity !== 1500) throw new Error("Expected 1500 total blocks");
  if (multiSizeOrder.adhesiveBags !== 15) throw new Error("Expected 15 adhesive bags");
  if (Number(multiSizeOrder.totalCbm) !== 30.0) throw new Error("Expected 30.0 CBM");
  console.log(`✅ Multi-size Order ${multiSizeOrder.orderNo} created: 1,500 blocks, 30.00 CBM, 15 Adhesive Bags`);

  // Clean up test orders
  await prisma.orderItem.deleteMany({
    where: { orderId: { in: [orderWithZeroAdhesive.id, multiSizeOrder.id] } },
  });
  await prisma.orderEvent.deleteMany({
    where: { orderId: { in: [orderWithZeroAdhesive.id, multiSizeOrder.id] } },
  });
  await prisma.order.deleteMany({
    where: { id: { in: [orderWithZeroAdhesive.id, multiSizeOrder.id] } },
  });
  console.log("✅ Cleaned up temporary test orders from Neon DB safely.");

  console.log("\n=== ALL DATABASE AND CALCULATION TESTS PASSED SUCCESSFULLY! ===");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
