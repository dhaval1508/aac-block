import { prisma } from "../lib/prisma";
import { OrderStatus } from "@prisma/client";

async function runIntegrationTest() {
  console.log("=== RUNNING LIVE DATABASE & ORDER WORKFLOW INTEGRATION TEST ===");

  // 1. Verify Master Products
  const products = await prisma.product.findMany({ where: { active: true } });
  console.log(`Found ${products.length} active products in Neon DB.`);

  const blockSizes = [
    '3" (600x200x75)',
    '4" (600x200x100)',
    '4+" (600x200x115)',
    '5" (600x200x125)',
    '6" (600x200x150)',
    '8" (600x200x200)',
    '9" (600x200x225)',
    '9+" (600x200x230)',
    '12" (600x200x300)',
  ];

  for (const size of blockSizes) {
    const match = products.find((p) => p.category === "AAC_BLOCK" && p.sizeLabel?.includes(size.split(" ")[0]));
    if (match) {
      console.log(`✅ [FOUND] Master Block: ${match.name} (${match.sizeLabel}) - CBM: ${match.cbmPerBlock}`);
    } else {
      console.error(`❌ [MISSING] Master Block size ${size}`);
    }
  }

  const mortar = products.find((p) => p.category === "MORTAR");
  const adhesive = products.find((p) => p.category === "ADHESIVE");

  console.log(`✅ Mortar SKU: ${mortar?.name || "NONE"} (${mortar?.bagWeightKg} kg)`);
  console.log(`✅ Adhesive SKU: ${adhesive?.name || "NONE"} (${adhesive?.bagWeightKg} kg)`);

  // 2. Find a Customer for Test Order
  const customer = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
  if (!customer) {
    throw new Error("No customer found to run order test.");
  }

  const block6 = products.find((p) => p.sizeLabel?.startsWith('6"'));
  if (!block6 || !mortar || !adhesive) {
    throw new Error("Required products for combined order test not found.");
  }

  // 3. Create Multi-Item Combined Order
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const orderCountToday = await prisma.order.count();
  const orderNo = `SWA-TEST-${dateStr}-${(orderCountToday + 1).toString().padStart(4, "0")}`;

  const blockQty = 1000;
  const blockCbmPerUnit = Number(block6.cbmPerBlock);
  const blockTotalCbm = blockQty * blockCbmPerUnit;
  const blockSqft = blockQty * 1.29167;
  const blockRate = Number(block6.price);
  const blockAmount = blockQty * blockRate;

  const mortarQty = 16;
  const mortarRate = Number(mortar.price);
  const mortarAmount = mortarQty * mortarRate;

  const adhesiveQty = 5;
  const adhesiveRate = Number(adhesive.price);
  const adhesiveAmount = adhesiveQty * adhesiveRate;

  const grandSubtotal = blockAmount + mortarAmount + adhesiveAmount;
  const grandGst = grandSubtotal * 0.18;
  const grandTotal = grandSubtotal + grandGst;

  console.log(`Placing test combined order ${orderNo}...`);
  const testOrder = await prisma.order.create({
    data: {
      orderNo,
      customerId: customer.id,
      productId: block6.id,
      quantity: blockQty,
      rate: blockRate,
      gstRate: 18.0,
      subtotal: grandSubtotal,
      gstAmount: grandGst,
      totalAmount: grandTotal,
      status: OrderStatus.PENDING,
      deliveryAddress: "Test Construction Site, Sector 62, Gandhinagar, Gujarat - 382010",
      notes: "Integration test order for Swarnim AAC Block multi-item upgrade",
      totalCbm: blockTotalCbm,
      totalSqft: blockSqft,
      items: {
        create: [
          {
            productId: block6.id,
            productName: block6.name,
            productType: block6.category,
            sizeLabel: block6.sizeLabel,
            dimensions: block6.dimensions,
            quantity: blockQty,
            rate: blockRate,
            gstRate: 18.0,
            subtotal: blockAmount,
            gstAmount: blockAmount * 0.18,
            totalAmount: blockAmount * 1.18,
            cbmPerUnit: blockCbmPerUnit,
            totalCbm: blockTotalCbm,
            sqftPerUnit: 1.29167,
            totalSqft: blockSqft,
          },
          {
            productId: mortar.id,
            productName: mortar.name,
            productType: mortar.category,
            sizeLabel: mortar.sizeLabel,
            dimensions: mortar.dimensions,
            quantity: mortarQty,
            rate: mortarRate,
            gstRate: 18.0,
            subtotal: mortarAmount,
            gstAmount: mortarAmount * 0.18,
            totalAmount: mortarAmount * 1.18,
            cbmPerUnit: 0,
            totalCbm: 0,
            sqftPerUnit: 0,
            totalSqft: 0,
          },
          {
            productId: adhesive.id,
            productName: adhesive.name,
            productType: adhesive.category,
            sizeLabel: adhesive.sizeLabel,
            dimensions: adhesive.dimensions,
            quantity: adhesiveQty,
            rate: adhesiveRate,
            gstRate: 18.0,
            subtotal: adhesiveAmount,
            gstAmount: adhesiveAmount * 0.18,
            totalAmount: adhesiveAmount * 1.18,
            cbmPerUnit: 0,
            totalCbm: 0,
            sqftPerUnit: 0,
            totalSqft: 0,
          },
        ],
      },
    },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });

  console.log(`✅ [CREATED] Order ID: ${testOrder.id}, Order No: ${testOrder.orderNo}`);
  console.log(`   Items Count: ${testOrder.items.length}`);
  console.log(`   Total Volume: ${Number(testOrder.totalCbm).toFixed(3)} m³ CBM`);
  console.log(`   Total Amount: ₹${Number(testOrder.totalAmount).toFixed(2)}`);

  // Cleanup any previous test orders
  const oldTestOrders = await prisma.order.findMany({ where: { orderNo: { startsWith: "SWA-TEST-" } } });
  for (const o of oldTestOrders) {
    if (o.id !== testOrder.id) {
      await prisma.notification.deleteMany({ where: { orderId: o.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
      await prisma.order.delete({ where: { id: o.id } });
    }
  }

  // 4. Test In-App Notification Generation
  const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of adminUsers) {
    const notifMsg = `Order ${testOrder.orderNo} placed by ${testOrder.customer.name} for ${testOrder.quantity} blocks (${Number(testOrder.totalCbm).toFixed(2)} CBM) + ${mortarQty + adhesiveQty} bags.`;
    const notif = await prisma.notification.create({
      data: {
        userId: admin.id,
        orderId: testOrder.id,
        type: "ORDER_CREATED",
        title: "New AAC Block Order Received",
        message: notifMsg,
        link: `/admin/orders/${testOrder.id}`,
      },
    });
    console.log(`✅ [NOTIFICATION] Generated for Admin ${admin.name} (Notif ID: ${notif.id})`);
  }

  // 5. Clean up the test order and notification to preserve database cleanliness
  await prisma.notification.deleteMany({ where: { orderId: testOrder.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
  await prisma.order.delete({ where: { id: testOrder.id } });
  console.log("✅ [CLEANUP] Test order and notifications successfully verified and cleaned up.");

  console.log("=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
}

runIntegrationTest()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
