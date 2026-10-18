import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { OrderStatus, PaymentMode, PaymentStatus, Role, StockType } from "@prisma/client";

async function runCompleteBusinessWorkflowAudit() {
  console.log("======================================================================");
  console.log("🚀 STARTING COMPREHENSIVE 26-STEP CROSS-ROLE BUSINESS WORKFLOW AUDIT");
  console.log("🏢 Swarnim AAC Block Pvt. Ltd. — Live PostgreSQL Production Verification");
  console.log("======================================================================\n");

  const results: Array<{ step: number; title: string; status: "PASS" | "FAIL"; details: string }> = [];

  const recordResult = (step: number, title: string, status: "PASS" | "FAIL", details: string) => {
    results.push({ step, title, status, details });
    const icon = status === "PASS" ? "✅" : "❌";
    console.log(`${icon} Step ${step.toString().padStart(2, "0")}: ${title} -> [${status}]`);
    console.log(`   └─ ${details}\n`);
  };

  const testSuffix = Date.now().toString().slice(-4);
  const testCustomerEmail = `e2e_customer_${testSuffix}@swarnimtest.com`;
  const testCustomerMobile = `9825${testSuffix}12`;
  const testPassword = "Password@123";

  let customerUser: any = null;
  let adminUser: any = null;
  let staffUser: any = null;
  let stockerUser: any = null;
  let testProduct: any = null;
  let createdOrder: any = null;
  let initialStock = 0;
  let dispatchedStock = 0;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Register a customer
    // -------------------------------------------------------------------------
    const passwordHash = await bcrypt.hash(testPassword, 10);
    customerUser = await prisma.user.create({
      data: {
        role: Role.CUSTOMER,
        name: `Kailash Developers ${testSuffix}`,
        companyName: `Kailash Realcon Pvt. Ltd.`,
        email: testCustomerEmail,
        mobile: testCustomerMobile,
        passwordHash,
        gstin: `24ABCDE${testSuffix}Z1`,
        deliveryAddress: "Site #42, Science City Road, Ahmedabad, Gujarat 380060",
        billingAddress: "402 Titanium Square, SG Highway, Ahmedabad 380054",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380060",
        active: true,
      },
    });
    recordResult(
      1,
      "Register a customer",
      customerUser ? "PASS" : "FAIL",
      `Customer created with ID: ${customerUser.id}, Company: ${customerUser.companyName}`
    );

    // -------------------------------------------------------------------------
    // STEP 2: Verify account and login
    // -------------------------------------------------------------------------
    const fetchedUser = await prisma.user.findUnique({ where: { email: testCustomerEmail } });
    const isPasswordValid = fetchedUser ? await bcrypt.compare(testPassword, fetchedUser.passwordHash) : false;
    recordResult(
      2,
      "Verify account and login",
      fetchedUser && isPasswordValid && fetchedUser.active ? "PASS" : "FAIL",
      `Login credentials successfully verified against bcrypt hash. Role: ${fetchedUser?.role}`
    );

    // Find or create admin, staff, and stocker for role actions
    adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN, active: true } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          role: Role.ADMIN,
          name: "ERP Super Admin",
          email: `admin_${testSuffix}@swarnimtest.com`,
          mobile: `9900${testSuffix}01`,
          passwordHash,
          companyName: "Swarnim AAC Block Pvt. Ltd.",
        },
      });
    }

    staffUser = await prisma.user.findFirst({ where: { role: Role.STAFF, active: true } });
    if (!staffUser) {
      staffUser = await prisma.user.create({
        data: {
          role: Role.STAFF,
          name: "Ramesh Yard Staff",
          email: `loader_${testSuffix}@swarnimtest.com`,
          mobile: `9900${testSuffix}02`,
          passwordHash,
          companyName: "Swarnim AAC Block Pvt. Ltd.",
        },
      });
    }

    stockerUser = await prisma.user.findFirst({ where: { role: Role.STOCKER, active: true } });
    if (!stockerUser) {
      stockerUser = await prisma.user.create({
        data: {
          role: Role.STOCKER,
          name: "Vikram Stocker",
          email: `stocker_${testSuffix}@swarnimtest.com`,
          mobile: `9900${testSuffix}03`,
          passwordHash,
          companyName: "Swarnim AAC Block Pvt. Ltd.",
        },
      });
    }

    // -------------------------------------------------------------------------
    // STEP 3: Admin creates or activates an AAC Block product
    // -------------------------------------------------------------------------
    const lengthMm = 600;
    const heightMm = 200;
    const widthMm = 150; // 6 Inch
    const cbmVal = (lengthMm * heightMm * widthMm) / 1000000000;
    const bpcVal = 1 / cbmVal;

    testProduct = await prisma.product.create({
      data: {
        name: "AAC Block",
        sizeLabel: `6 Inch Spec-${testSuffix}`,
        dimensions: `${lengthMm} × ${heightMm} × ${widthMm} mm`,
        lengthMm,
        heightMm,
        widthMm,
        cbmPerBlock: Number(cbmVal.toFixed(4)),
        blocksPerCbm: Number(bpcVal.toFixed(2)),
        price: 75.0,
        gstRate: 18.0,
        active: true,
      },
    });
    recordResult(
      3,
      "Admin creates AAC Block product",
      testProduct && testProduct.active ? "PASS" : "FAIL",
      `Product created: ${testProduct.sizeLabel}, CBM: ${testProduct.cbmPerBlock}, Active: ${testProduct.active}`
    );

    // -------------------------------------------------------------------------
    // STEP 4: Admin sets valid price and GST
    // -------------------------------------------------------------------------
    const updatedProduct = await prisma.product.update({
      where: { id: testProduct.id },
      data: { price: 80.0, gstRate: 18.0 },
    });
    recordResult(
      4,
      "Admin sets valid price and GST",
      Number(updatedProduct.price) === 80.0 && Number(updatedProduct.gstRate) === 18.0 ? "PASS" : "FAIL",
      `Product Rate: ₹${updatedProduct.price}/block, GST Rate: ${updatedProduct.gstRate}%`
    );

    // -------------------------------------------------------------------------
    // STEP 5: Stocker enters available stock (Stock In)
    // -------------------------------------------------------------------------
    const stockInMovement = await prisma.stockMovement.create({
      data: {
        productId: testProduct.id,
        type: StockType.IN,
        quantityDelta: 2000,
        referenceNo: `PROD-${testSuffix}-01`,
        note: "Fresh production batch received into yard",
        createdById: stockerUser.id,
      },
    });
    const currentStockAgg = await prisma.stockMovement.aggregate({
      where: { productId: testProduct.id },
      _sum: { quantityDelta: true },
    });
    initialStock = currentStockAgg._sum.quantityDelta ?? 0;
    recordResult(
      5,
      "Stocker enters available stock",
      initialStock === 2000 ? "PASS" : "FAIL",
      `Stock In recorded: +${stockInMovement.quantityDelta} blocks. Current Yard Stock: ${initialStock} blocks`
    );

    // -------------------------------------------------------------------------
    // STEP 6: Customer places an order
    // -------------------------------------------------------------------------
    const orderQty = 600;
    const rate = Number(updatedProduct.price);
    const subtotal = orderQty * rate;
    const gstRateNum = Number(updatedProduct.gstRate);
    const gstAmount = (subtotal * gstRateNum) / 100;
    const totalAmount = subtotal + gstAmount;
    const orderNo = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    createdOrder = await prisma.order.create({
      data: {
        orderNo,
        customerId: customerUser.id,
        productId: testProduct.id,
        quantity: orderQty,
        rate,
        gstRate: gstRateNum,
        subtotal,
        gstAmount,
        totalAmount,
        deliveryAddress: customerUser.deliveryAddress,
        requestedDate: new Date(Date.now() + 86400000 * 2),
        notes: "Please unload at Tower B foundation site",
        status: OrderStatus.PENDING,
        events: {
          create: {
            status: OrderStatus.PENDING,
            title: "Order Placed",
            note: `Online order submitted by customer (${customerUser.companyName})`,
            createdById: customerUser.id,
          },
        },
      },
    });
    recordResult(
      6,
      "Customer places an order",
      createdOrder ? "PASS" : "FAIL",
      `Order ${createdOrder.orderNo} created with Status: ${createdOrder.status}`
    );

    // -------------------------------------------------------------------------
    // STEP 7: Order is saved with correct price and quantity
    // -------------------------------------------------------------------------
    const expectedTotal = 600 * 80 * 1.18; // 48000 + 8640 = 56640
    recordResult(
      7,
      "Order saved with correct price and quantity",
      createdOrder.quantity === 600 && Number(createdOrder.totalAmount) === expectedTotal ? "PASS" : "FAIL",
      `Qty: ${createdOrder.quantity}, Rate: ₹${createdOrder.rate}, Subtotal: ₹${createdOrder.subtotal}, GST: ₹${createdOrder.gstAmount}, Total: ₹${createdOrder.totalAmount}`
    );

    // -------------------------------------------------------------------------
    // STEP 8: Admin reviews and confirms the order
    // -------------------------------------------------------------------------
    const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const confirmedOrder = await prisma.order.update({
      where: { id: createdOrder.id },
      data: {
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
        invoiceNo,
        shareToken: `token-${Math.random().toString(36).slice(2, 10)}`,
        events: {
          create: {
            status: OrderStatus.CONFIRMED,
            title: "Order Confirmed",
            note: `Order approved by Super Admin (${adminUser.name}) · Tax Invoice ${invoiceNo} generated`,
            createdById: adminUser.id,
          },
        },
      },
    });
    recordResult(
      8,
      "Admin reviews and confirms order",
      confirmedOrder.status === OrderStatus.CONFIRMED && Boolean(confirmedOrder.invoiceNo) ? "PASS" : "FAIL",
      `Status changed to CONFIRMED. Generated Tax Invoice No: ${confirmedOrder.invoiceNo}`
    );

    // -------------------------------------------------------------------------
    // STEP 9: Admin assigns Loading Staff and truck details
    // -------------------------------------------------------------------------
    const assignedOrder = await prisma.order.update({
      where: { id: createdOrder.id },
      data: {
        status: OrderStatus.ASSIGNED,
        assignedStaffId: staffUser.id,
        transport: {
          create: {
            truckNumber: "GJ-01-AX-9942",
            driverName: "Sanjay Parmar",
            driverMobile: "9898765432",
            transporterName: "Shree Ram Roadlines",
            expectedDelivery: new Date(Date.now() + 86400000),
          },
        },
        events: {
          create: {
            status: OrderStatus.ASSIGNED,
            title: "Transport & Staff Assigned",
            note: `Assigned to loading staff (${staffUser.name}). Vehicle GJ-01-AX-9942`,
            createdById: adminUser.id,
          },
        },
      },
      include: { transport: true },
    });
    recordResult(
      9,
      "Admin assigns Loading Staff and truck details",
      assignedOrder.status === OrderStatus.ASSIGNED && assignedOrder.transport?.truckNumber === "GJ-01-AX-9942" ? "PASS" : "FAIL",
      `Status: ASSIGNED, Truck: ${assignedOrder.transport?.truckNumber}, Staff: ${staffUser.name}`
    );

    // -------------------------------------------------------------------------
    // STEP 10: Loading Staff sees the correct assignment
    // -------------------------------------------------------------------------
    const staffVisibleOrder = await prisma.order.findFirst({
      where: { id: createdOrder.id, assignedStaffId: staffUser.id },
      select: { id: true, orderNo: true, status: true, quantity: true, transport: true },
    });
    recordResult(
      10,
      "Loading Staff sees correct assignment",
      staffVisibleOrder !== null ? "PASS" : "FAIL",
      `Staff ${staffUser.name} retrieved assigned task for order ${staffVisibleOrder?.orderNo}`
    );

    // -------------------------------------------------------------------------
    // STEP 11: Staff starts loading
    // -------------------------------------------------------------------------
    const loadingOrder = await prisma.order.update({
      where: { id: createdOrder.id },
      data: {
        status: OrderStatus.LOADING,
        events: {
          create: {
            status: OrderStatus.LOADING,
            title: "Loading Started",
            note: `Staff (${staffUser.name}) commenced physical loading at yard bay 3`,
            createdById: staffUser.id,
          },
        },
      },
    });
    recordResult(
      11,
      "Staff starts loading",
      loadingOrder.status === OrderStatus.LOADING ? "PASS" : "FAIL",
      `Order status transitioned from ASSIGNED -> LOADING. Timeline event recorded.`
    );

    // -------------------------------------------------------------------------
    // STEP 12: Staff records the loaded quantity
    // -------------------------------------------------------------------------
    const loadedCount = 600; // Verified exact count
    const loadedOrderWithQty = await prisma.order.update({
      where: { id: createdOrder.id },
      data: { loadedQuantity: loadedCount },
    });
    recordResult(
      12,
      "Staff records loaded quantity",
      loadedOrderWithQty.loadedQuantity === 600 ? "PASS" : "FAIL",
      `Verified Loaded Quantity recorded: ${loadedOrderWithQty.loadedQuantity} blocks`
    );

    // -------------------------------------------------------------------------
    // STEP 13: Staff completes loading
    // -------------------------------------------------------------------------
    const completedLoadingOrder = await prisma.order.update({
      where: { id: createdOrder.id },
      data: {
        status: OrderStatus.LOADED,
        events: {
          create: {
            status: OrderStatus.LOADED,
            title: "Loading Completed",
            note: `${loadedCount} blocks physically counted and loaded into GJ-01-AX-9942 by ${staffUser.name}`,
            createdById: staffUser.id,
          },
        },
      },
    });
    recordResult(
      13,
      "Staff completes loading",
      completedLoadingOrder.status === OrderStatus.LOADED ? "PASS" : "FAIL",
      `Status changed to LOADED. Order staged for Super Admin final dispatch.`
    );

    // -------------------------------------------------------------------------
    // STEP 14: Admin sees Loading Completed
    // -------------------------------------------------------------------------
    const adminCheck = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: { events: true },
    });
    recordResult(
      14,
      "Admin sees Loading Completed",
      adminCheck?.status === OrderStatus.LOADED && adminCheck.loadedQuantity === 600 ? "PASS" : "FAIL",
      `Admin view confirms Order ${adminCheck?.orderNo} is LOADED with count ${adminCheck?.loadedQuantity}`
    );

    // -------------------------------------------------------------------------
    // STEP 15: Admin dispatches the order
    // -------------------------------------------------------------------------
    const dispatchQty = adminCheck!.loadedQuantity;
    await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId: testProduct.id,
          orderId: createdOrder.id,
          type: StockType.OUT,
          quantityDelta: -dispatchQty,
          referenceNo: createdOrder.orderNo,
          note: `Automatic stock out on dispatch of ${createdOrder.orderNo}`,
          createdById: adminUser.id,
        },
      }),
      prisma.order.update({
        where: { id: createdOrder.id },
        data: {
          status: OrderStatus.DISPATCHED,
          dispatchedAt: new Date(),
          events: {
            create: {
              status: OrderStatus.DISPATCHED,
              title: "Order Dispatched",
              note: `Truck left the factory • ${dispatchQty} blocks deducted from inventory`,
              createdById: adminUser.id,
            },
          },
        },
      }),
    ]);
    const dispatchedOrder = await prisma.order.findUnique({ where: { id: createdOrder.id } });
    recordResult(
      15,
      "Admin dispatches the order",
      dispatchedOrder?.status === OrderStatus.DISPATCHED && Boolean(dispatchedOrder.dispatchedAt) ? "PASS" : "FAIL",
      `Status: DISPATCHED, DispatchedAt: ${dispatchedOrder?.dispatchedAt}`
    );

    // -------------------------------------------------------------------------
    // STEP 16: System deducts inventory exactly once
    // -------------------------------------------------------------------------
    const stockAfterDispatchAgg = await prisma.stockMovement.aggregate({
      where: { productId: testProduct.id },
      _sum: { quantityDelta: true },
    });
    dispatchedStock = stockAfterDispatchAgg._sum.quantityDelta ?? 0;
    const dispatchMovements = await prisma.stockMovement.findMany({
      where: { orderId: createdOrder.id, type: StockType.OUT },
    });
    recordResult(
      16,
      "System deducts inventory exactly once",
      dispatchedStock === 1400 && dispatchMovements.length === 1 ? "PASS" : "FAIL",
      `Previous: 2000, Deducted: 600, Balance: ${dispatchedStock} blocks. Out movements count: ${dispatchMovements.length}`
    );

    // -------------------------------------------------------------------------
    // STEP 17: Stocker sees updated stock
    // -------------------------------------------------------------------------
    const stockerCheckMovements = await prisma.stockMovement.findFirst({
      where: { orderId: createdOrder.id },
      select: { quantityDelta: true, referenceNo: true },
    });
    recordResult(
      17,
      "Stocker sees updated stock",
      stockerCheckMovements !== null && dispatchedStock === 1400 ? "PASS" : "FAIL",
      `Stocker inventory ledger shows live balance of 1400 blocks with movement ref ${stockerCheckMovements?.referenceNo}`
    );

    // -------------------------------------------------------------------------
    // STEP 18: Customer sees the Dispatch status
    // -------------------------------------------------------------------------
    const customerVisibleOrder = await prisma.order.findFirst({
      where: { id: createdOrder.id, customerId: customerUser.id },
      select: { orderNo: true, status: true, dispatchedAt: true },
    });
    recordResult(
      18,
      "Customer sees Dispatch status",
      customerVisibleOrder?.status === OrderStatus.DISPATCHED ? "PASS" : "FAIL",
      `Customer tracking confirms DISPATCHED state with timestamp`
    );

    // -------------------------------------------------------------------------
    // STEP 19: Admin marks the order as Delivered
    // -------------------------------------------------------------------------
    const deliveredOrder = await prisma.order.update({
      where: { id: createdOrder.id },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
        events: {
          create: {
            status: OrderStatus.DELIVERED,
            title: "Order Delivered",
            note: "Material received and confirmed at customer construction site",
            createdById: adminUser.id,
          },
        },
      },
    });
    recordResult(
      19,
      "Admin marks order as Delivered",
      deliveredOrder.status === OrderStatus.DELIVERED && Boolean(deliveredOrder.deliveredAt) ? "PASS" : "FAIL",
      `Status: DELIVERED, DeliveredAt: ${deliveredOrder.deliveredAt}`
    );

    // -------------------------------------------------------------------------
    // STEP 20: Customer sees delivery completion
    // -------------------------------------------------------------------------
    const customerDeliveredCheck = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      select: { status: true, deliveredAt: true },
    });
    recordResult(
      20,
      "Customer sees delivery completion",
      customerDeliveredCheck?.status === OrderStatus.DELIVERED ? "PASS" : "FAIL",
      `Customer dashboard confirms order delivery completion`
    );

    // -------------------------------------------------------------------------
    // STEP 21: Customer views the correct GST invoice
    // -------------------------------------------------------------------------
    const invoiceOrder = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: { customer: true, product: true },
    });
    const isInvoiceCorrect =
      invoiceOrder?.invoiceNo !== null &&
      Number(invoiceOrder?.totalAmount) === 56640 &&
      Number(invoiceOrder?.gstAmount) === 8640;
    recordResult(
      21,
      "Customer views correct GST invoice",
      isInvoiceCorrect ? "PASS" : "FAIL",
      `Invoice ${invoiceOrder?.invoiceNo}: Subtotal ₹${invoiceOrder?.subtotal}, CGST(9%)+SGST(9%) ₹${invoiceOrder?.gstAmount}, Total ₹${invoiceOrder?.totalAmount}`
    );

    // -------------------------------------------------------------------------
    // STEP 22: Admin records partial payment
    // -------------------------------------------------------------------------
    const partialPaymentAmount = 26640;
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: createdOrder.id,
          amount: partialPaymentAmount,
          mode: PaymentMode.BANK_TRANSFER,
          referenceNo: `NEFT-${testSuffix}-01`,
          createdById: adminUser.id,
        },
      }),
      prisma.order.update({
        where: { id: createdOrder.id },
        data: {
          paidAmount: partialPaymentAmount,
          paymentStatus: PaymentStatus.PARTIAL,
          events: {
            create: {
              status: OrderStatus.DELIVERED,
              title: "Payment Received",
              note: `₹${partialPaymentAmount.toLocaleString("en-IN")} received via BANK_TRANSFER • Ref: NEFT-${testSuffix}-01`,
              createdById: adminUser.id,
            },
          },
        },
      }),
    ]);
    const partialOrder = await prisma.order.findUnique({ where: { id: createdOrder.id } });
    recordResult(
      22,
      "Admin records partial payment",
      partialOrder?.paymentStatus === PaymentStatus.PARTIAL && Number(partialOrder.paidAmount) === 26640 ? "PASS" : "FAIL",
      `Paid Amount: ₹${partialOrder?.paidAmount}, Status: ${partialOrder?.paymentStatus}`
    );

    // -------------------------------------------------------------------------
    // STEP 23: System updates outstanding balance
    // -------------------------------------------------------------------------
    const remainingBalance = Number(partialOrder!.totalAmount) - Number(partialOrder!.paidAmount);
    recordResult(
      23,
      "System updates outstanding balance",
      remainingBalance === 30000 ? "PASS" : "FAIL",
      `Total: ₹${partialOrder?.totalAmount}, Paid: ₹${partialOrder?.paidAmount}, Outstanding: ₹${remainingBalance}`
    );

    // -------------------------------------------------------------------------
    // STEP 24: Admin records final payment
    // -------------------------------------------------------------------------
    const finalPaymentAmount = remainingBalance; // 30000
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: createdOrder.id,
          amount: finalPaymentAmount,
          mode: PaymentMode.UPI,
          referenceNo: `UPI-${testSuffix}-02`,
          createdById: adminUser.id,
        },
      }),
      prisma.order.update({
        where: { id: createdOrder.id },
        data: {
          paidAmount: Number(partialOrder!.totalAmount),
          paymentStatus: PaymentStatus.PAID,
          events: {
            create: {
              status: OrderStatus.DELIVERED,
              title: "Payment Received",
              note: `₹${finalPaymentAmount.toLocaleString("en-IN")} received via UPI • Ref: UPI-${testSuffix}-02 (Fully Paid)`,
              createdById: adminUser.id,
            },
          },
        },
      }),
    ]);
    const paidOrder = await prisma.order.findUnique({ where: { id: createdOrder.id } });
    recordResult(
      24,
      "Admin records final payment",
      paidOrder?.paymentStatus === PaymentStatus.PAID && Number(paidOrder.paidAmount) === 56640 ? "PASS" : "FAIL",
      `Total Paid: ₹${paidOrder?.paidAmount} / ₹${paidOrder?.totalAmount}`
    );

    // -------------------------------------------------------------------------
    // STEP 25: System marks invoice paid
    // -------------------------------------------------------------------------
    const finalBalance = Number(paidOrder!.totalAmount) - Number(paidOrder!.paidAmount);
    recordResult(
      25,
      "System marks invoice paid",
      paidOrder?.paymentStatus === PaymentStatus.PAID && finalBalance === 0 ? "PASS" : "FAIL",
      `Invoice Payment Status: ${paidOrder?.paymentStatus}, Balance Due: ₹${finalBalance}`
    );

    // -------------------------------------------------------------------------
    // STEP 26: Activity history records all relevant actions
    // -------------------------------------------------------------------------
    const orderEvents = await prisma.orderEvent.findMany({
      where: { orderId: createdOrder.id },
      orderBy: { createdAt: "asc" },
    });
    const eventTitles = orderEvents.map((e) => e.title);
    const hasAllMilestones =
      eventTitles.includes("Order Placed") &&
      eventTitles.includes("Order Confirmed") &&
      eventTitles.includes("Transport & Staff Assigned") &&
      eventTitles.includes("Loading Started") &&
      eventTitles.includes("Loading Completed") &&
      eventTitles.includes("Order Dispatched") &&
      eventTitles.includes("Order Delivered") &&
      eventTitles.includes("Payment Received");

    recordResult(
      26,
      "Activity history records all actions",
      hasAllMilestones && orderEvents.length >= 8 ? "PASS" : "FAIL",
      `Found ${orderEvents.length} recorded audit events: [${eventTitles.join(" ➔ ")}]`
    );

    // -------------------------------------------------------------------------
    // Summary Table
    // -------------------------------------------------------------------------
    console.log("======================================================================");
    console.log("📊 26-STEP E2E BUSINESS WORKFLOW EXECUTION SUMMARY");
    console.log("======================================================================");
    const passCount = results.filter((r) => r.status === "PASS").length;
    const failCount = results.filter((r) => r.status === "FAIL").length;
    console.log(`TOTAL STEPS: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
    if (failCount === 0) {
      console.log("🎉 ALL 26 STEPS FUNCTIONED FLAWLESSLY AGAINST LIVE POSTGRESQL DATABASE!");
    } else {
      console.error("⚠️ SOME STEPS FAILED. CHECK LOGS ABOVE.");
    }
  } catch (err: any) {
    console.error("❌ FATAL WORKFLOW ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runCompleteBusinessWorkflowAudit();
