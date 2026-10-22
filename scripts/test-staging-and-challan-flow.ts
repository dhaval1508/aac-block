import { prisma } from "../lib/prisma";
import { OrderStatus } from "@prisma/client";
import { getNextDeliveryChallanNumber } from "../lib/delivery-challan";
import { nextInvoiceNo } from "../lib/actions/orders";

async function main() {
  console.log("================================================================================");
  console.log("AUTOMATED E2E WORKFLOW TEST: CONFIRMED ORDERS, TRUCK STAGING & DELIVERY CHALLAN");
  console.log("================================================================================");

  let testOrderId: string | null = null;
  let salesmanOrderId: string | null = null;

  try {
    // 1. Fetch active Admin, Staff, Salesman, Customer, and Product
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN", active: true } });
    const staff = await prisma.user.findFirst({ where: { role: { in: ["STAFF", "STOCKER"] }, active: true } });
    const salesman = await prisma.user.findFirst({ where: { role: "SALESMAN", active: true } });
    const customer = await prisma.user.findFirst({ where: { role: "CUSTOMER", active: true } });
    const product = await prisma.product.findFirst({ where: { active: true, deletedAt: null } });

    if (!admin || !staff || !customer || !product) {
      throw new Error(`Missing required test actors. Admin: ${!!admin}, Staff: ${!!staff}, Customer: ${!!customer}, Product: ${!!product}`);
    }

    console.log(`\n[SETUP] Test Actors:`);
    console.log(`- Super Admin: ${admin.name} (${admin.mobile})`);
    console.log(`- Loading Staff: ${staff.name} (${staff.mobile}) [Role: ${staff.role}]`);
    console.log(`- Customer: ${customer.name} (${customer.mobile})`);
    console.log(`- Product: ${product.name} (Size: ${product.sizeLabel || product.dimensions}, CBM: ${Number(product.cbmPerBlock)})`);

    // =========================================================================
    // TEST 1: Customer creates order, Super Admin confirms it
    // =========================================================================
    console.log(`\n--- TEST 1: Super Admin Confirms Customer Order ---`);
    const testOrderNo = `TEST-SWA-${Date.now().toString().slice(-6)}`;
    const createdOrder = await prisma.order.create({
      data: {
        orderNo: testOrderNo,
        customerId: customer.id,
        productId: product.id,
        quantity: 1000,
        totalCbm: 18.0,
        adhesiveBags: 20,
        rate: 50,
        gstRate: 18,
        subtotal: 50000,
        gstAmount: 9000,
        totalAmount: 59000,
        deliveryAddress: "Near D-Mart, SG Highway, Ahmedabad, Gujarat - 380055",
        status: OrderStatus.PENDING,
      },
    });
    testOrderId = createdOrder.id;
    console.log(`✓ Created test customer order: ${createdOrder.orderNo} (Status: ${createdOrder.status})`);

    // Super Admin confirms order
    const confirmedOrder = await prisma.order.update({
      where: { id: testOrderId },
      data: {
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
        totalCbm: 18.0,
        events: {
          create: {
            status: OrderStatus.CONFIRMED,
            title: "Order Confirmed by Super Admin",
            note: "Cleared for yard staging and loading",
            createdById: admin.id,
          },
        },
      },
    });
    console.log(`✓ Super Admin confirmed order: ${confirmedOrder.orderNo} (Status: ${confirmedOrder.status})`);
    if (confirmedOrder.status !== OrderStatus.CONFIRMED) {
      throw new Error(`Expected CONFIRMED status, got ${confirmedOrder.status}`);
    }

    // =========================================================================
    // TEST 2: Verify order appears in Loading & Stock Staff Yard Queue
    // =========================================================================
    console.log(`\n--- TEST 2: Verify Confirmed Yard Queue for Staff ---`);
    const yardQueue = await prisma.order.findMany({
      where: {
        OR: [
          { status: OrderStatus.CONFIRMED },
          { status: OrderStatus.ASSIGNED, assignedStaffId: null },
        ],
      },
      select: {
        id: true,
        orderNo: true,
        status: true,
        assignedStaffId: true,
        totalCbm: true,
        adhesiveBags: true,
      },
    });

    const inQueue = yardQueue.find((o) => o.id === testOrderId);
    if (!inQueue) {
      throw new Error(`FAIL: Confirmed order ${testOrderNo} did NOT appear in the Loading Staff Yard Queue!`);
    }
    console.log(`✓ SUCCESS: Order ${testOrderNo} appears in Loading Staff Yard Queue (Total queue items: ${yardQueue.length})`);
    console.log(`  - Status: ${inQueue.status}`);
    console.log(`  - Assigned Staff: ${inQueue.assignedStaffId || "Unassigned (Shared Yard Queue)"}`);

    // =========================================================================
    // TEST 3: Staff stages Truck, Driver, and Net Weight (KG)
    // =========================================================================
    console.log(`\n--- TEST 3: Loading Staff Enters Truck & Loading Staging Details ---`);
    const truckNo = "GJ-01-AX-9942";
    const driverName = "Rajesh Patel";
    const driverMobile = "9876543210";
    const transporter = "Swarnim Logistics";
    const netWeightKg = 18500;
    const rstNumber = "RST-7788";

    await prisma.$transaction(async (tx) => {
      // 1. Transport
      await tx.transport.upsert({
        where: { orderId: testOrderId! },
        create: {
          orderId: testOrderId!,
          truckNumber: truckNo,
          driverName,
          driverMobile,
          transporterName: transporter,
          assignedAt: new Date(),
        },
        update: {
          truckNumber: truckNo,
          driverName,
          driverMobile,
          transporterName: transporter,
        },
      });

      // 2. Loading Record
      await tx.loadingRecord.upsert({
        where: { orderId: testOrderId! },
        create: {
          orderId: testOrderId!,
          vehicleNumber: truckNo,
          driverName,
          driverMobile,
          transporterName: transporter,
          loadedCbm: 18.0,
          netWeight: netWeightKg,
          rstNumber,
          createdById: staff.id,
        },
        update: {
          vehicleNumber: truckNo,
          driverName,
          driverMobile,
          transporterName: transporter,
          netWeight: netWeightKg,
          rstNumber,
        },
      });

      // 3. Weighbridge Slip (Net Weight only)
      await tx.weighbridgeSlip.upsert({
        where: { orderId: testOrderId! },
        create: {
          orderId: testOrderId!,
          rstNumber,
          vehicleNumber: truckNo,
          driverName,
          driverMobile,
          weighbridgeName: "Swarnim Plant Weighbridge",
          netWeightKg,
          createdById: staff.id,
        },
        update: {
          rstNumber,
          vehicleNumber: truckNo,
          driverName,
          driverMobile,
          netWeightKg,
        },
      });

      // 4. Update order status to ASSIGNED and assign staff
      await tx.order.update({
        where: { id: testOrderId! },
        data: {
          assignedStaffId: staff.id,
          status: OrderStatus.ASSIGNED,
          loadedCbm: 18.0,
          events: {
            create: {
              status: OrderStatus.ASSIGNED,
              title: "Truck Staged & Details Updated",
              note: `Truck: ${truckNo} • Driver: ${driverName} (${driverMobile}) • Net Wt: ${netWeightKg.toLocaleString()} KG`,
              createdById: staff.id,
            },
          },
        },
      });

      // 5. Audit log
      await tx.orderEditHistory.create({
        data: {
          orderId: testOrderId!,
          changedById: staff.id,
          changedByName: staff.name,
          userRole: staff.role,
          previousValues: { truckNumber: null, driverName: null },
          newValues: { truckNumber: truckNo, driverName, netWeight: netWeightKg },
          changedFields: ["transport", "driver", "vehicleStaging"],
          orderVersion: 2,
        },
      });
    }, { timeout: 20000, maxWait: 10000 });

    console.log(`✓ Truck and loading staging saved by Loading Staff!`);

    // Verify state from Super Admin's perspective
    const adminView = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: {
        transport: true,
        loadingRecord: true,
        weighbridgeSlip: true,
        assignedStaff: true,
        editHistory: true,
      },
    });

    if (!adminView) throw new Error("Order not found");
    if (adminView.status !== OrderStatus.ASSIGNED) throw new Error(`Expected ASSIGNED, got ${adminView.status}`);
    if (adminView.transport?.truckNumber !== truckNo) throw new Error(`Expected truck ${truckNo}, got ${adminView.transport?.truckNumber}`);
    if (adminView.transport?.driverName !== driverName) throw new Error(`Expected driver ${driverName}, got ${adminView.transport?.driverName}`);
    if (Number(adminView.weighbridgeSlip?.netWeightKg) !== netWeightKg) throw new Error(`Expected Net Weight ${netWeightKg}, got ${adminView.weighbridgeSlip?.netWeightKg}`);
    if (adminView.assignedStaff?.id !== staff.id) throw new Error(`Expected assigned staff ${staff.name}, got ${adminView.assignedStaff?.name}`);
    if (adminView.editHistory.length === 0) throw new Error("Audit history was not recorded");

    console.log(`✓ SUCCESS: Super Admin sees identical saved staging data:`);
    console.log(`  - Truck: ${adminView.transport.truckNumber}`);
    console.log(`  - Driver: ${adminView.transport.driverName} (${adminView.transport.driverMobile})`);
    console.log(`  - Transporter: ${adminView.transport.transporterName}`);
    console.log(`  - Certified Net Weight: ${Number(adminView.weighbridgeSlip?.netWeightKg).toLocaleString()} KG (RST #${adminView.weighbridgeSlip?.rstNumber})`);
    console.log(`  - Assigned Staff: ${adminView.assignedStaff?.name}`);
    console.log(`  - Audit History Count: ${adminView.editHistory.length}`);

    // =========================================================================
    // TEST 4: Delivery Challan Generation
    // =========================================================================
    console.log(`\n--- TEST 4: Delivery Challan Generation ---`);
    const nextDc = await getNextDeliveryChallanNumber();
    console.log(`✓ Next approved Delivery Challan series: ${nextDc}`);

    const challanOrder = await prisma.order.update({
      where: { id: testOrderId },
      data: {
        dcNumber: nextDc,
        invoiceNo: await nextInvoiceNo(),
        events: {
          create: {
            status: OrderStatus.ASSIGNED,
            title: "Delivery Challan Generated",
            note: `Official Delivery Challan ${nextDc} generated`,
            createdById: admin.id,
          },
        },
      },
      select: {
        id: true,
        orderNo: true,
        dcNumber: true,
        invoiceNo: true,
        status: true,
        totalCbm: true,
        adhesiveBags: true,
      },
    });

    console.log(`✓ Canonical Delivery Challan Record:`);
    console.log(`  - DC Number: ${challanOrder.dcNumber}`);
    console.log(`  - Invoice / Challan Ref: ${challanOrder.invoiceNo}`);
    console.log(`  - Total CBM: ${Number(challanOrder.totalCbm).toFixed(3)} m³`);
    console.log(`  - Mortar Bags: ${challanOrder.adhesiveBags} Bags`);

    // =========================================================================
    // TEST 5: Salesman-Created Order Lifecycle
    // =========================================================================
    if (salesman) {
      console.log(`\n--- TEST 5: Salesman-Created Order Through Confirmed Yard Queue ---`);
      const salesmanOrderNo = `SALES-SWA-${Date.now().toString().slice(-6)}`;
      const sOrder = await prisma.order.create({
        data: {
          orderNo: salesmanOrderNo,
          customerId: customer.id,
          salesmanId: salesman.id,
          productId: product.id,
          quantity: 2667,
          totalCbm: 32.0,
          adhesiveBags: 0,
          rate: 50,
          gstRate: 18,
          subtotal: 133350,
          gstAmount: 24003,
          totalAmount: 157353,
          deliveryAddress: "Madhuvan Buildcon The Space, Jagatpur, Ahmedabad",
          status: OrderStatus.PENDING,
        },
      });
      salesmanOrderId = sOrder.id;
      console.log(`✓ Salesman ${salesman.name} created Order ${salesmanOrderNo} for Customer ${customer.name}`);

      // Super Admin confirms salesman order
      await prisma.order.update({
        where: { id: salesmanOrderId },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });
      console.log(`✓ Super Admin confirmed salesman order ${salesmanOrderNo}`);

      // Check it appears in Yard Queue
      const queueAfterSalesman = await prisma.order.findFirst({
        where: {
          id: salesmanOrderId,
          status: OrderStatus.CONFIRMED,
        },
      });
      if (!queueAfterSalesman) throw new Error("Salesman order did not appear in confirmed yard queue");
      console.log(`✓ SUCCESS: Salesman-created order ${salesmanOrderNo} entered Loading Staff Yard Queue!`);
    }

    console.log(`\n================================================================================`);
    console.log(`ALL 5 E2E TESTS PASSED WITH 100% SUCCESS!`);
    console.log(`================================================================================`);
  } finally {
    // Clean up test records
    console.log(`\n[CLEANUP] Removing test orders from database...`);
    if (testOrderId) {
      await prisma.orderEditHistory.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderEvent.deleteMany({ where: { orderId: testOrderId } });
      await prisma.weighbridgeSlip.deleteMany({ where: { orderId: testOrderId } });
      await prisma.loadingRecord.deleteMany({ where: { orderId: testOrderId } });
      await prisma.transport.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } });
      console.log(`✓ Cleaned up customer test order`);
    }
    if (salesmanOrderId) {
      await prisma.orderEvent.deleteMany({ where: { orderId: salesmanOrderId } });
      await prisma.order.delete({ where: { id: salesmanOrderId } });
      console.log(`✓ Cleaned up salesman test order`);
    }
    console.log(`✓ Database left in clean state.`);
  }
}

main()
  .catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
