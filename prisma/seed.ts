import { PrismaClient, Role, OrderStatus, PaymentStatus, StockType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  await prisma.messageLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.transport.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating 4 demo accounts from accblock-Demo...");
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const loaderPassword = await bcrypt.hash("Loader@123", 10);
  const stockerPassword = await bcrypt.hash("Stocker@123", 10);
  const customerPassword = await bcrypt.hash("Customer@123", 10);

  const [admin, loader, stocker, customer] = await Promise.all([
    prisma.user.create({
      data: {
        role: Role.ADMIN,
        name: "Super Admin",
        mobile: "9999990001",
        email: "admin@swarnimdemo.com",
        passwordHash: adminPassword,
        companyName: "Swarnim AAC Block Pvt. Ltd.",
        gstin: "24AAACS0000A1Z5",
        billingAddress: "Swarnim AAC Block Yard, Near Highway, Ahmedabad",
        deliveryAddress: "Swarnim AAC Block Yard, Near Highway, Ahmedabad",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380015",
      },
    }),
    prisma.user.create({
      data: {
        role: Role.STAFF,
        name: "Mahesh Loader",
        mobile: "9999990002",
        email: "loader@swarnimdemo.com",
        passwordHash: loaderPassword,
        city: "Ahmedabad",
        state: "Gujarat",
      },
    }),
    prisma.user.create({
      data: {
        role: Role.STOCKER,
        name: "Stock Manager",
        mobile: "9999990003",
        email: "stocker@swarnimdemo.com",
        passwordHash: stockerPassword,
        companyName: "Swarnim AAC Block Pvt. Ltd.",
        city: "Ahmedabad",
        state: "Gujarat",
      },
    }),
    prisma.user.create({
      data: {
        role: Role.CUSTOMER,
        name: "Ramesh Patel",
        mobile: "9876543210",
        email: "customer@swarnimdemo.com",
        passwordHash: customerPassword,
        companyName: "Shree Buildcon Pvt Ltd",
        gstin: "24AABCS1234F1Z5",
        billingAddress: "86, Industrial Estate, Odhav, Ahmedabad",
        deliveryAddress: "Site No. 12, Shree Residency, Bopal, Ahmedabad",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380058",
      },
    }),
  ]);

  console.log("Creating 9 standard AAC block sizes...");
  const referenceProducts = [
    { sizeLabel: "3 Inch", l: 600, h: 200, w: 75, cbm: 0.009, bpc: 111.11, price: 50.0 },
    { sizeLabel: "4 Inch", l: 600, h: 200, w: 100, cbm: 0.012, bpc: 83.33, price: 55.0 },
    { sizeLabel: "5 Inch", l: 600, h: 200, w: 125, cbm: 0.015, bpc: 66.67, price: 62.0 },
    { sizeLabel: "6 Inch", l: 600, h: 200, w: 150, cbm: 0.018, bpc: 55.56, price: 72.0 },
    { sizeLabel: "7 Inch", l: 600, h: 200, w: 175, cbm: 0.021, bpc: 47.62, price: 82.0 },
    { sizeLabel: "8 Inch", l: 600, h: 200, w: 200, cbm: 0.024, bpc: 41.67, price: 92.0 },
    { sizeLabel: "9 Inch", l: 600, h: 200, w: 225, cbm: 0.027, bpc: 37.04, price: 102.0 },
    { sizeLabel: "9+ Inch", l: 600, h: 200, w: 230, cbm: 0.0276, bpc: 36.23, price: 105.0 },
    { sizeLabel: "12 Inch", l: 600, h: 200, w: 300, cbm: 0.036, bpc: 27.78, price: 138.0 },
  ];

  const createdProducts = [];
  for (const item of referenceProducts) {
    const p = await prisma.product.create({
      data: {
        name: "AAC Block",
        sizeLabel: item.sizeLabel,
        dimensions: `${item.l} × ${item.h} × ${item.w} mm`,
        lengthMm: item.l,
        heightMm: item.h,
        widthMm: item.w,
        cbmPerBlock: item.cbm,
        blocksPerCbm: item.bpc,
        price: item.price,
        gstRate: 18.0,
        active: true,
      },
    });
    createdProducts.push(p);

    // Opening stock (5,000 blocks for each size)
    await prisma.stockMovement.create({
      data: {
        productId: p.id,
        type: StockType.IN,
        quantityDelta: 5000,
        referenceNo: "OPENING-STOCK",
        note: `Opening stock for ${item.sizeLabel}`,
        createdById: admin.id,
      },
    });
  }

  console.log("Creating realistic demo orders...");
  // Order 1: Pending
  const prod4 = createdProducts[1]; // 4 Inch
  const sub1 = 2000 * Number(prod4.price);
  const gst1 = sub1 * 0.18;
  const tot1 = sub1 + gst1;
  const order1 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0845",
      customerId: customer.id,
      productId: prod4.id,
      quantity: 2000,
      rate: prod4.price,
      gstRate: 18.0,
      subtotal: sub1,
      gstAmount: gst1,
      totalAmount: tot1,
      deliveryAddress: customer.deliveryAddress!,
      status: OrderStatus.PENDING,
    },
  });
  await prisma.orderEvent.create({
    data: {
      orderId: order1.id,
      status: OrderStatus.PENDING,
      title: "Order Placed",
      note: "Waiting for admin confirmation",
      createdById: customer.id,
    },
  });

  // Order 2: Confirmed with Invoice
  const prod6 = createdProducts[3]; // 6 Inch
  const sub2 = 3000 * Number(prod6.price);
  const gst2 = sub2 * 0.18;
  const tot2 = sub2 + gst2;
  const order2 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0844",
      customerId: customer.id,
      productId: prod6.id,
      quantity: 3000,
      rate: prod6.price,
      gstRate: 18.0,
      subtotal: sub2,
      gstAmount: gst2,
      totalAmount: tot2,
      deliveryAddress: customer.deliveryAddress!,
      status: OrderStatus.CONFIRMED,
      invoiceNo: "INV-2026-0001",
      shareToken: "demo_token_inv_2026_0001",
      confirmedAt: new Date(),
    },
  });
  await prisma.orderEvent.create({
    data: {
      orderId: order2.id,
      status: OrderStatus.CONFIRMED,
      title: "Order Confirmed",
      note: "Order approved by Super Admin and GST invoice generated",
      createdById: admin.id,
    },
  });

  // Order 3: Loaded and Ready for Dispatch
  const prod8 = createdProducts[5]; // 8 Inch
  const sub3 = 1500 * Number(prod8.price);
  const gst3 = sub3 * 0.18;
  const tot3 = sub3 + gst3;
  const order3 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0843",
      customerId: customer.id,
      productId: prod8.id,
      quantity: 1500,
      loadedQuantity: 1500,
      rate: prod8.price,
      gstRate: 18.0,
      subtotal: sub3,
      gstAmount: gst3,
      totalAmount: tot3,
      deliveryAddress: customer.deliveryAddress!,
      status: OrderStatus.LOADED,
      invoiceNo: "INV-2026-0002",
      shareToken: "demo_token_inv_2026_0002",
      assignedStaffId: loader.id,
      confirmedAt: new Date(Date.now() - 3600000 * 4),
    },
  });
  await prisma.transport.create({
    data: {
      orderId: order3.id,
      transporterName: "Gujarat Roadways",
      truckNumber: "GJ-01-AB-1234",
      driverName: "Kishore Solanki",
      driverMobile: "9825098250",
      expectedDelivery: new Date(Date.now() + 3600000 * 5),
    },
  });
  await prisma.orderEvent.create({
    data: {
      orderId: order3.id,
      status: OrderStatus.LOADED,
      title: "Loading Completed",
      note: "1,500 blocks loaded onto truck GJ-01-AB-1234",
      createdById: loader.id,
    },
  });

  // Order 4: Dispatched
  const prod9 = createdProducts[7]; // 9+ Inch
  const sub4 = 2500 * Number(prod9.price);
  const gst4 = sub4 * 0.18;
  const tot4 = sub4 + gst4;
  const order4 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0842",
      customerId: customer.id,
      productId: prod9.id,
      quantity: 2500,
      loadedQuantity: 2500,
      rate: prod9.price,
      gstRate: 18.0,
      subtotal: sub4,
      gstAmount: gst4,
      totalAmount: tot4,
      deliveryAddress: customer.deliveryAddress!,
      status: OrderStatus.DISPATCHED,
      invoiceNo: "INV-2026-0003",
      shareToken: "demo_token_inv_2026_0003",
      assignedStaffId: loader.id,
      confirmedAt: new Date(Date.now() - 3600000 * 8),
      dispatchedAt: new Date(Date.now() - 3600000 * 2),
      paidAmount: tot4 / 2,
      paymentStatus: PaymentStatus.PARTIAL,
    },
  });
  await prisma.transport.create({
    data: {
      orderId: order4.id,
      transporterName: "Swarnim Logistics",
      truckNumber: "GJ-27-TT-9988",
      driverName: "Mukesh Vaghela",
      driverMobile: "9898098980",
      expectedDelivery: new Date(Date.now() + 3600000 * 3),
    },
  });
  await prisma.stockMovement.create({
    data: {
      productId: prod9.id,
      orderId: order4.id,
      type: StockType.OUT,
      quantityDelta: -2500,
      referenceNo: order4.orderNo,
      note: "Automatic stock out on dispatch",
      createdById: admin.id,
    },
  });
  await prisma.payment.create({
    data: {
      orderId: order4.id,
      amount: tot4 / 2,
      mode: "UPI",
      referenceNo: "UPI/2026/88392",
      paidAt: new Date(),
      createdById: admin.id,
    },
  });
  await prisma.orderEvent.create({
    data: {
      orderId: order4.id,
      status: OrderStatus.DISPATCHED,
      title: "Order Dispatched",
      note: "Truck left the yard • 2,500 blocks deducted from stock",
      createdById: admin.id,
    },
  });

  console.log("Seeding complete! 4 demo logins ready:");
  console.log("1. Customer: customer@swarnimdemo.com / Customer@123");
  console.log("2. Loading Staff: loader@swarnimdemo.com / Loader@123");
  console.log("3. Stocker: stocker@swarnimdemo.com / Stocker@123");
  console.log("4. Super Admin: admin@swarnimdemo.com / Admin@123");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
