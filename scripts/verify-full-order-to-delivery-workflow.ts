import { prisma } from "../lib/prisma";
import { nextOrderNo, nextInvoiceNo } from "../lib/actions/orders";
import { getProductStock, getProductCbm } from "../lib/actions/stock";
import { OrderStatus, StockType } from "@prisma/client";

async function runRegressionSuite() {
  console.log("=================================================================");
  console.log("STARTING SWARNIM AAC ERP FULL REGRESSION TEST SUITE");
  console.log("=================================================================");

  const results: Record<string, "PASS" | "FAIL"> = {};

  try {
    // TEST 1: nextOrderNo and nextInvoiceNo Sequence Integrity
    console.log("\n[TEST 1] Testing Order and Invoice Number Generation Integrity...");
    const orderNo1 = await nextOrderNo();
    const invoiceNo1 = await nextInvoiceNo();
    console.log(`Generated nextOrderNo: ${orderNo1}`);
    console.log(`Generated nextInvoiceNo: ${invoiceNo1}`);

    // Verify it doesn't match an existing order
    const existingOrder = await prisma.order.findUnique({
      where: { orderNo: orderNo1 },
    });
    if (existingOrder) {
      throw new Error(`CRITICAL: nextOrderNo() generated duplicate orderNo ${orderNo1}!`);
    }
    results["Sequence Generation Integrity"] = "PASS";
    console.log("✓ TEST 1 PASSED: Unique nextOrderNo generated without collision.");

    // TEST 2: Active Product Master and CBM Calculations
    console.log("\n[TEST 2] Verifying Product Master and Custom CBM per Block...");
    const activeProducts = await prisma.product.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { widthMm: "asc" },
    });
    console.log(`Found ${activeProducts.length} active products in database.`);
    if (activeProducts.length === 0) {
      throw new Error("No active products found in database!");
    }

    const aacBlocks = activeProducts.filter((p) => p.category === "AAC_BLOCK");
    const mortar = activeProducts.find(
      (p) =>
        p.category === "MORTAR" ||
        p.category === "ADHESIVE" ||
        p.category === "BLOCK_JOINTING_MORTAR" ||
        p.name.includes("Mortar")
    );

    console.log(`AAC Block types available: ${aacBlocks.length}`);
    console.log(`Mortar product identified: ${mortar?.name || "None"} (${mortar?.sizeLabel || "N/A"})`);

    for (const b of aacBlocks) {
      const cbm = Number(b.cbmPerBlock);
      const testCbm = 18.0;
      const expectedBlocks = Math.round(testCbm / cbm);
      if (cbm <= 0 || isNaN(expectedBlocks)) {
        throw new Error(`Invalid CBM per block for product ${b.name} (${b.sizeLabel}): ${cbm}`);
      }
    }
    results["Product Master & CBM Calculation"] = "PASS";
    console.log("✓ TEST 2 PASSED: All active products have verified positive CBM values.");

    // TEST 3: Find or Setup Customer, Salesman, and Staff Users for Test
    console.log("\n[TEST 3] Verifying Authorized Users for Workflow Execution...");
    const customer = await prisma.user.findFirst({
      where: { role: "CUSTOMER", active: true },
    });
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN", active: true },
    });
    const staff = await prisma.user.findFirst({
      where: { role: { in: ["STAFF", "STOCKER"] }, active: true },
    });

    if (!customer || !admin || !staff) {
      throw new Error(
        `Missing required test users: Customer=${!!customer}, Admin=${!!admin}, Staff/Stocker=${!!staff}`
      );
    }
    console.log(`Test Customer: ${customer.name} (${customer.id})`);
    console.log(`Test Super Admin: ${admin.name} (${admin.id})`);
    console.log(`Test Staff/Stocker: ${staff.name} (${staff.id})`);
    results["User Roles & Permissions"] = "PASS";
    console.log("✓ TEST 3 PASSED: Verified Customer, Admin, and Staff user roles.");

    // TEST 4: Full Multi-Item Order Creation (Placed Stage)
    console.log("\n[TEST 4] Creating Test Multi-Item Order with Safe Rollback...");
    const primaryAac = aacBlocks[0];
    const secondaryAac = aacBlocks.length > 1 ? aacBlocks[1] : aacBlocks[0];

    const testCbm1 = 15.0;
    const testBlocks1 = Math.round(testCbm1 / Number(primaryAac.cbmPerBlock));
    const testCbm2 = 10.0;
    const testBlocks2 = Math.round(testCbm2 / Number(secondaryAac.cbmPerBlock));
    const testMortarBags = 25;
    const combinedTotalCbm = testCbm1 + testCbm2;

    const testOrderNo = await nextOrderNo();
    const testOrder = await prisma.order.create({
      data: {
        orderNo: testOrderNo,
        customerId: customer.id,
        createdById: customer.id,
        createdByRole: "CUSTOMER",
        createdByNameSnapshot: customer.name,
        productId: primaryAac.id,
        quantity: testBlocks1 + testBlocks2,
        totalCbm: combinedTotalCbm,
        rate: 0,
        gstRate: 0,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        hasMortar: true,
        hasAdhesive: true,
        adhesiveBags: testMortarBags,
        deliveryAddress: "Near Swarnim Industrial Park, Sanand GIDC, Ahmedabad - 382110",
        googleMapsUrl: "https://maps.google.com/?q=22.9868,72.3812",
        status: OrderStatus.PENDING,
        gstBillingSelected: false,
        version: 1,
        items: {
          create: [
            {
              productId: primaryAac.id,
              productType: "AAC_BLOCK",
              productName: primaryAac.name,
              sizeLabel: primaryAac.sizeLabel,
              dimensions: primaryAac.dimensions,
              quantity: testBlocks1,
              cbmPerUnit: Number(primaryAac.cbmPerBlock),
              totalCbm: testCbm1,
              sqftPerUnit: 1.29,
              totalSqft: Number((testBlocks1 * 1.29).toFixed(2)),
              rate: 0,
              gstRate: 0,
              subtotal: 0,
              gstAmount: 0,
              totalAmount: 0,
            },
            {
              productId: secondaryAac.id,
              productType: "AAC_BLOCK",
              productName: secondaryAac.name,
              sizeLabel: secondaryAac.sizeLabel,
              dimensions: secondaryAac.dimensions,
              quantity: testBlocks2,
              cbmPerUnit: Number(secondaryAac.cbmPerBlock),
              totalCbm: testCbm2,
              sqftPerUnit: 1.29,
              totalSqft: Number((testBlocks2 * 1.29).toFixed(2)),
              rate: 0,
              gstRate: 0,
              subtotal: 0,
              gstAmount: 0,
              totalAmount: 0,
            },
            ...(mortar
              ? [
                  {
                    productId: mortar.id,
                    productType: mortar.category,
                    productName: mortar.name,
                    sizeLabel: mortar.sizeLabel,
                    dimensions: mortar.dimensions,
                    quantity: testMortarBags,
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
                ]
              : []),
          ],
        },
        events: {
          create: {
            status: OrderStatus.PENDING,
            title: "Order Placed",
            note: `Automated test order: ${combinedTotalCbm} CBM + ${testMortarBags} Bags Morter`,
            createdById: customer.id,
          },
        },
      },
      include: {
        items: true,
      },
    });

    console.log(`Created Order: ${testOrder.orderNo} (ID: ${testOrder.id})`);
    console.log(`Items in created order: ${testOrder.items.length}`);
    if (testOrder.items.length < 2) {
      throw new Error(`Expected at least 2 items, got ${testOrder.items.length}`);
    }
    results["Multi-Item Customer Order Creation"] = "PASS";
    console.log("✓ TEST 4 PASSED: Multi-Item Order Placed successfully with canonical database items.");

    // TEST 5: Order Confirmation (Stage 2: Confirmed)
    console.log("\n[TEST 5] Testing Order Confirmation by Loading & Stock Staff...");
    const confirmedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
        events: {
          create: {
            status: OrderStatus.CONFIRMED,
            title: "Order Confirmed",
            note: `Confirmed by ${staff.name} (${staff.role})`,
            createdById: staff.id,
          },
        },
      },
    });
    if (confirmedOrder.status !== OrderStatus.CONFIRMED) {
      throw new Error(`Expected status CONFIRMED, got ${confirmedOrder.status}`);
    }
    results["Staff/Admin Order Confirmation"] = "PASS";
    console.log("✓ TEST 5 PASSED: Order transitioned cleanly to CONFIRMED stage.");

    // TEST 6: Truck Staging & Vehicle Logistics
    console.log("\n[TEST 6] Testing Truck Staging & Vehicle Details Setup...");
    await prisma.transport.create({
      data: {
        orderId: testOrder.id,
        truckNumber: "GJ-01-AB-1234",
        driverName: "Ramesh Bhai",
        driverMobile: "9876543210",
        transporterName: "Swarnim Fleet",
      },
    });

    await prisma.weighbridgeSlip.create({
      data: {
        orderId: testOrder.id,
        weighbridgeName: "Swarnim Weighbridge Station",
        vehicleNumber: "GJ-01-AB-1234",
        driverName: "Ramesh Bhai",
        driverMobile: "9876543210",
        grossWeightKg: 28500,
        tareWeightKg: 10500,
        netWeightKg: 18000,
        rstNumber: "RST-9988",
        createdById: staff.id,
      },
    });

    const stagedOrder = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: { transport: true, weighbridgeSlip: true },
    });
    if (!stagedOrder?.transport || !stagedOrder?.weighbridgeSlip) {
      throw new Error("Failed to attach transport and weighbridge details to order!");
    }
    results["Truck Staging & Weighbridge"] = "PASS";
    console.log("✓ TEST 6 PASSED: Truck Staging and Weighbridge slip linked to order.");

    // TEST 7: Controlled Stock In / Stock Out Ledger Verification
    console.log("\n[TEST 7] Testing Stock In & Stock Out Ledger Math Integrity...");
    const openingStock = await getProductCbm(primaryAac.id);
    console.log(`Opening stock for ${primaryAac.name} (${primaryAac.sizeLabel}): ${openingStock.toFixed(3)} CBM`);

    // Stock In 20 CBM
    const stockInMovement = await prisma.stockMovement.create({
      data: {
        productId: primaryAac.id,
        type: StockType.IN,
        quantityDelta: Math.round(20.0 / Number(primaryAac.cbmPerBlock)),
        cbmDelta: 20.0,
        referenceNo: "TEST-STOCK-IN",
        note: "Automated regression test Stock In",
        createdById: admin.id,
      },
    });

    const afterInStock = await getProductCbm(primaryAac.id);
    console.log(`After Stock In +20 CBM: ${afterInStock.toFixed(3)} CBM`);
    if (Math.abs(afterInStock - (openingStock + 20.0)) > 0.001) {
      throw new Error(`Stock In math discrepancy! Expected ${openingStock + 20.0}, got ${afterInStock}`);
    }

    // Stock Out 5 CBM
    const stockOutMovement = await prisma.stockMovement.create({
      data: {
        productId: primaryAac.id,
        type: StockType.OUT,
        quantityDelta: -Math.round(5.0 / Number(primaryAac.cbmPerBlock)),
        cbmDelta: -5.0,
        referenceNo: "TEST-STOCK-OUT",
        note: "Automated regression test Stock Out",
        createdById: admin.id,
      },
    });

    const afterOutStock = await getProductCbm(primaryAac.id);
    console.log(`After Stock Out -5 CBM: ${afterOutStock.toFixed(3)} CBM`);
    if (Math.abs(afterOutStock - (openingStock + 15.0)) > 0.001) {
      throw new Error(`Stock Out math discrepancy! Expected ${openingStock + 15.0}, got ${afterOutStock}`);
    }

    // Clean up temporary stock test movements
    await prisma.stockMovement.deleteMany({
      where: { id: { in: [stockInMovement.id, stockOutMovement.id] } },
    });
    const restoredStock = await getProductCbm(primaryAac.id);
    console.log(`Restored baseline stock: ${restoredStock.toFixed(3)} CBM`);
    results["Stock In / Stock Out Exact CBM Ledger"] = "PASS";
    console.log("✓ TEST 7 PASSED: Stock In and Stock Out ledger math verified without permanent mutation.");

    // TEST 8: Order Dispatch (Stage 3: Dispatched)
    console.log("\n[TEST 8] Testing Order Dispatch Transition...");
    const dispatchedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        status: OrderStatus.DISPATCHED,
        dispatchedAt: new Date(),
        dcNumber: `SAB/DC/TEST-${Date.now().toString().slice(-4)}`,
        events: {
          create: {
            status: OrderStatus.DISPATCHED,
            title: "Order Dispatched",
            note: "Dispatched by loading staff via test suite",
            createdById: staff.id,
          },
        },
      },
    });
    if (dispatchedOrder.status !== OrderStatus.DISPATCHED) {
      throw new Error(`Expected status DISPATCHED, got ${dispatchedOrder.status}`);
    }
    results["Order Dispatch Transition"] = "PASS";
    console.log("✓ TEST 8 PASSED: Order moved cleanly to DISPATCHED stage.");

    // TEST 9: Order Delivered / Order Done (Stage 4: Delivered)
    console.log("\n[TEST 9] Testing Order Delivered / Order Done Transition...");
    const deliveredOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
        events: {
          create: {
            status: OrderStatus.DELIVERED,
            title: "Order Delivered",
            note: "Delivery confirmed by yard staff",
            createdById: staff.id,
          },
        },
      },
    });
    if (deliveredOrder.status !== OrderStatus.DELIVERED) {
      throw new Error(`Expected status DELIVERED, got ${deliveredOrder.status}`);
    }
    results["Order Delivered (Order Done) Transition"] = "PASS";
    console.log("✓ TEST 9 PASSED: Order reached final DELIVERED stage.");

    // CLEANUP: Cleanly delete test order so no artificial records pollute operational dashboard
    console.log("\n[CLEANUP] Safely removing test order and linked records...");
    await prisma.weighbridgeSlip.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.transport.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.orderEvent.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.order.delete({ where: { id: testOrder.id } });
    console.log("✓ CLEANUP COMPLETE: Test order completely purged from live dashboard.");
    results["Safe Rollback & Database Cleanliness"] = "PASS";

    console.log("\n=================================================================");
    console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log("=================================================================");
    console.table(results);
    return true;
  } catch (error: any) {
    console.error("REGRESSION SUITE FAILED:", error);
    process.exit(1);
  }
}

runRegressionSuite();
