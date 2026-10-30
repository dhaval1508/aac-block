import { prisma } from "../lib/prisma";

async function verifyOrderChallan() {
  console.log("=== VERIFYING DELIVERY CHALLAN DATA & LOGIC ===");

  const order = await prisma.order.findFirst({
    where: { invoiceNo: "INV-2026-0036" },
    include: {
      customer: true,
      items: { include: { product: true } },
      transport: true,
      weighbridgeSlip: true,
    },
  });

  if (!order) {
    throw new Error("Order INV-2026-0036 not found!");
  }

  console.log(`Order Number: ${order.orderNo}`);
  console.log(`Challan Number: ${order.invoiceNo}`);
  console.log(`Client/Consignee: ${order.customer?.companyName || order.customer?.name}`);
  console.log(`Client Address: ${order.customer?.billingAddress}`);
  console.log(`Order Delivery Address: ${order.deliveryAddress}`);
  console.log(`Order Custom Site Name: ${order.customSiteName}`);
  console.log(`Order City: ${order.city}`);
  console.log(`Items count: ${order.items.length}`);
  for (const it of order.items) {
    console.log(`  - ${it.productName} (${it.sizeLabel || it.dimensions}): ${it.quantity} blocks, ${it.totalCbm} CBM`);
  }
  console.log(`Mortar bags: ${order.adhesiveBags} Bags`);
  console.log(`Truck: ${order.transport?.truckNumber}`);
  console.log(`Driver: ${order.transport?.driverName} (${order.transport?.driverMobile})`);
  console.log(`Transporter: ${order.transport?.transporterName}`);

  // Test checks
  const containsAhmedabad =
    order.deliveryAddress.toLowerCase().includes("ahmedabad") ||
    (order.city && order.city.toLowerCase().includes("ahmedabad"));

  if (containsAhmedabad) {
    console.error("FAIL: Ahmedabad is still present in order data!");
    process.exit(1);
  } else {
    console.log("PASS: Destination Site is free from incorrect Ahmedabad location!");
  }

  console.log("=== ALL CHECKS PASSED ===");
}

verifyOrderChallan()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
