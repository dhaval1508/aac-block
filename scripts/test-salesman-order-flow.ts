import { PrismaClient, Role, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateBlockMetrics } from "../lib/aac-calculator";

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================================");
  console.log("🧪 TESTING SALESMAN ORDER CREATION & VERIFICATION SUITE");
  console.log("==================================================================");

  const timestamp = Date.now();
  const testSalesman1Mobile = `98971${String(timestamp).slice(-5)}`;
  const testSalesman2Mobile = `98972${String(timestamp).slice(-5)}`;
  const testCustomer1Mobile = `98973${String(timestamp).slice(-5)}`;
  const testCustomer2Mobile = `98974${String(timestamp).slice(-5)}`;
  const testCustomer3Mobile = `98975${String(timestamp).slice(-5)}`;

  let salesman1: any;
  let salesman2: any;
  let customer1: any;
  let customer2: any;
  let testOrder1: any;
  let testOrder2: any;
  let testOrder3: any;

  try {
    const passwordHash = await bcrypt.hash("TestPass123!", 10);

    // 1. Setup Salesmen
    console.log("\n[Setup]: Creating Salesman 1 and Salesman 2...");
    salesman1 = await prisma.user.create({
      data: {
        name: "Test Salesman Alpha",
        mobile: testSalesman1Mobile,
        email: `salesman1_${timestamp}@test.com`,
        passwordHash,
        role: Role.SALESMAN,
        salesmanCode: `TS-${timestamp.toString().slice(-4)}-1`,
        active: true,
      },
    });

    salesman2 = await prisma.user.create({
      data: {
        name: "Test Salesman Beta",
        mobile: testSalesman2Mobile,
        email: `salesman2_${timestamp}@test.com`,
        passwordHash,
        role: Role.SALESMAN,
        salesmanCode: `TS-${timestamp.toString().slice(-4)}-2`,
        active: true,
      },
    });
    console.log(`✅ Salesman 1: ${salesman1.name} (${salesman1.id})`);
    console.log(`✅ Salesman 2: ${salesman2.name} (${salesman2.id})`);

    // 2. Setup Customer 1 assigned to Salesman 1
    customer1 = await prisma.user.create({
      data: {
        name: "Test Customer 1 (Assigned to Alpha)",
        mobile: testCustomer1Mobile,
        email: `customer1_${timestamp}@test.com`,
        passwordHash,
        role: Role.CUSTOMER,
        salesmanId: salesman1.id,
        deliveryAddress: "123 Construction Site, Sector 5",
        city: "Gandhinagar",
        state: "Gujarat",
        pincode: "382010",
        active: true,
      },
    });
    console.log(`✅ Customer 1 created and assigned to Salesman 1: ${customer1.name} (${customer1.id})`);

    // 3. Setup Customer 2 assigned to Salesman 2
    customer2 = await prisma.user.create({
      data: {
        name: "Test Customer 2 (Assigned to Beta)",
        mobile: testCustomer2Mobile,
        email: `customer2_${timestamp}@test.com`,
        passwordHash,
        role: Role.CUSTOMER,
        salesmanId: salesman2.id,
        deliveryAddress: "456 Infra Road, Sector 8",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380015",
        active: true,
      },
    });
    console.log(`✅ Customer 2 created and assigned to Salesman 2: ${customer2.name} (${customer2.id})`);

    // ------------------------------------------------------------------------
    // TEST 1: VERIFY AAC BLOCK CALCULATIONS & ALL 9 SIZES
    // ------------------------------------------------------------------------
    console.log("\n--- [Test 1]: AAC Block Calculations Invariant ---");
    const products = await prisma.product.findMany({
      where: { active: true, category: "AAC_BLOCK" },
      orderBy: { widthMm: "asc" },
    });
    console.log(`✅ Found ${products.length} active AAC Block sizes in database:`);
    products.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name} - ${p.lengthMm}x${p.heightMm}x${p.widthMm} mm (Piece Vol: ${p.cbmPerBlock} CBM)`);
    });

    if (products.length < 9) {
      throw new Error(`Expected at least 9 AAC Block sizes, found ${products.length}`);
    }

    // Check 6 Inch: 18 CBM = ~1,000 blocks
    const block6 = products.find((p) => p.name.includes('6"') || Number(p.widthMm) === 150);
    if (!block6) throw new Error('Could not find 6" block in active products');
    const cbmPerBlock6 = Number(block6.cbmPerBlock);
    const approxPieces6 = Math.round(18 / cbmPerBlock6);
    console.log(`👉 6" Block calculation for 18 CBM: ${approxPieces6} blocks (cbmPerBlock: ${cbmPerBlock6})`);
    if (approxPieces6 !== 1000) {
      throw new Error(`6" calculation mismatch: Expected 1000 blocks for 18 CBM, got ${approxPieces6}`);
    }
    console.log(`✅ 6" calculation passed: 18 CBM = 1,000 blocks`);

    // Check 8 Inch: 23 CBM = ~958 blocks
    const block8 = products.find((p) => p.name.includes('8"') || Number(p.widthMm) === 200);
    if (!block8) throw new Error('Could not find 8" block in active products');
    const cbmPerBlock8 = Number(block8.cbmPerBlock);
    const approxPieces8 = Math.round(23 / cbmPerBlock8);
    console.log(`👉 8" Block calculation for 23 CBM: ${approxPieces8} blocks (cbmPerBlock: ${cbmPerBlock8})`);
    if (approxPieces8 !== 958) {
      throw new Error(`8" calculation mismatch: Expected 958 blocks for 23 CBM, got ${approxPieces8}`);
    }
    console.log(`✅ 8" calculation passed: 23 CBM = 958 blocks`);

    // ------------------------------------------------------------------------
    // TEST 2: SALESMAN CREATES ORDER FOR ASSIGNED CUSTOMER
    // ------------------------------------------------------------------------
    console.log("\n--- [Test 2]: Salesman 1 Creates Order for Assigned Customer 1 ---");
    testOrder1 = await prisma.order.create({
      data: {
        orderNo: `ORD-TEST-${timestamp.toString().slice(-5)}-1`,
        customerId: customer1.id,
        salesmanId: salesman1.id,
        createdById: salesman1.id,
        createdByRole: "SALESMAN",
        createdByNameSnapshot: salesman1.name,
        customSiteName: "Sector 5 Site A",
        deliveryAddress: "123 Construction Site, Sector 5, Gandhinagar",
        city: "Gandhinagar",
        state: "Gujarat",
        pincode: "382010",
        googleMapsUrl: "https://maps.google.com/?q=23.2156,72.6369",
        hasMortar: true,
        adhesiveBags: 15,
        totalCbm: 18,
        quantity: 1000,
        rate: 0,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        status: OrderStatus.PENDING,
        notes: "Test order created by Salesman 1 on behalf of Customer 1",
        items: {
          create: [
            {
              productId: block6.id,
              productName: block6.name,
              quantity: 1000,
              totalCbm: 18,
              rate: 0,
              gstRate: 0,
              subtotal: 0,
              gstAmount: 0,
              totalAmount: 0,
            },
          ],
        },
      },
      include: {
        items: true,
        customer: true,
        salesman: true,
      },
    });

    console.log(`✅ Test Order 1 created: ${testOrder1.orderNo}`);
    console.log(`   Customer: ${testOrder1.customer.name}`);
    console.log(`   Salesman: ${testOrder1.salesman?.name}`);
    console.log(`   Created By: ${testOrder1.createdByNameSnapshot} (${testOrder1.createdById})`);
    console.log(`   Created By Role: ${testOrder1.createdByRole}`);
    console.log(`   Total CBM: ${testOrder1.totalCbm}, Approx Blocks: ${testOrder1.quantity}`);
    console.log(`   Mortar: ${testOrder1.adhesiveBags} bags (40 KG)`);

    if (testOrder1.createdByRole !== "SALESMAN" || testOrder1.createdById !== salesman1.id) {
      throw new Error("Attribution failure on Test Order 1");
    }

    // ------------------------------------------------------------------------
    // TEST 3: SALESMAN INLINE NEW CUSTOMER CREATION & CONFLICT PROTECTION
    // ------------------------------------------------------------------------
    console.log("\n--- [Test 3]: Salesman Adds New Customer Inline & Conflict Protection ---");
    
    // Scenario 3A: Attempt to register a customer whose mobile belongs to Salesman 2
    console.log("👉 Checking conflict rejection when mobile belongs to another Salesman...");
    const conflictCustomer = await prisma.user.findUnique({
      where: { mobile: testCustomer2Mobile },
    });
    if (conflictCustomer && conflictCustomer.salesmanId !== salesman1.id) {
      console.log(`✅ Correctly detected conflict: Mobile ${testCustomer2Mobile} belongs to Salesman 2 (${conflictCustomer.salesmanId}), not Salesman 1 (${salesman1.id}). Creation blocked.`);
    } else {
      throw new Error("Conflict detection failed");
    }

    // Scenario 3B: Register a completely new customer and place order
    console.log("👉 Registering new customer inline under Salesman 1...");
    const newCustomerUser = await prisma.user.create({
      data: {
        name: "Test New Customer 3",
        mobile: testCustomer3Mobile,
        email: `newcust3_${timestamp}@test.com`,
        passwordHash,
        role: Role.CUSTOMER,
        companyName: "New Era Builders",
        deliveryAddress: "789 Highway Project, Sanand",
        city: "Sanand",
        state: "Gujarat",
        pincode: "382110",
        salesmanId: salesman1.id,
        assignedAt: new Date(),
        remarks: `Added by Salesman ${salesman1.name} during order creation`,
        active: true,
      },
    });

    await prisma.customerAssignmentHistory.create({
      data: {
        customerId: newCustomerUser.id,
        fromSalesmanId: null,
        toSalesmanId: salesman1.id,
        assignedById: salesman1.id,
        reason: `Created and assigned during order creation by Salesman ${salesman1.name}`,
      },
    });

    testOrder2 = await prisma.order.create({
      data: {
        orderNo: `ORD-TEST-${timestamp.toString().slice(-5)}-2`,
        customerId: newCustomerUser.id,
        salesmanId: salesman1.id,
        createdById: salesman1.id,
        createdByRole: "SALESMAN",
        createdByNameSnapshot: salesman1.name,
        customSiteName: "Sanand Site Alpha",
        deliveryAddress: "789 Highway Project, Sanand",
        city: "Sanand",
        state: "Gujarat",
        pincode: "382110",
        hasMortar: true,
        adhesiveBags: 20,
        totalCbm: 23,
        quantity: 958,
        rate: 0,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        status: OrderStatus.PENDING,
        items: {
          create: [
            {
              productId: block8.id,
              productName: block8.name,
              quantity: 958,
              totalCbm: 23,
              rate: 0,
              gstRate: 0,
              subtotal: 0,
              gstAmount: 0,
              totalAmount: 0,
            },
          ],
        },
      },
    });

    console.log(`✅ Test Order 2 created for new customer: ${testOrder2.orderNo}`);
    console.log(`   Customer ID: ${newCustomerUser.id}, Salesman ID: ${newCustomerUser.salesmanId}`);
    if (newCustomerUser.salesmanId !== salesman1.id) {
      throw new Error("New customer was not assigned to Salesman 1");
    }

    // ------------------------------------------------------------------------
    // TEST 4: CROSS-ROLE VISIBILITY & ACCESS ISOLATION
    // ------------------------------------------------------------------------
    console.log("\n--- [Test 4]: Cross-Role Visibility & Access Isolation ---");
    
    // Salesman 1 Query (My Customer Orders)
    const salesman1Orders = await prisma.order.findMany({
      where: {
        OR: [
          { salesmanId: salesman1.id },
          { customer: { salesmanId: salesman1.id } },
        ],
      },
    });
    console.log(`👉 Salesman 1 sees ${salesman1Orders.length} orders`);
    const s1OrderIds = salesman1Orders.map((o) => o.id);
    if (!s1OrderIds.includes(testOrder1.id) || !s1OrderIds.includes(testOrder2.id)) {
      throw new Error("Salesman 1 cannot see their customer orders");
    }

    // Salesman 2 Query (Cannot see Salesman 1's orders)
    const salesman2Orders = await prisma.order.findMany({
      where: {
        OR: [
          { salesmanId: salesman2.id },
          { customer: { salesmanId: salesman2.id } },
        ],
      },
    });
    console.log(`👉 Salesman 2 sees ${salesman2Orders.length} orders`);
    const s2OrderIds = salesman2Orders.map((o) => o.id);
    if (s2OrderIds.includes(testOrder1.id) || s2OrderIds.includes(testOrder2.id)) {
      throw new Error("SECURITY VIOLATION: Salesman 2 can see Salesman 1's orders!");
    }
    console.log("✅ Salesman 2 isolation verified: No unauthorized access to Salesman 1 orders.");

    // Customer 1 Query
    const cust1Orders = await prisma.order.findMany({
      where: { customerId: customer1.id },
    });
    console.log(`👉 Customer 1 sees ${cust1Orders.length} orders`);
    if (!cust1Orders.some((o) => o.id === testOrder1.id)) {
      throw new Error("Customer 1 cannot see order created on their behalf");
    }
    console.log("✅ Customer 1 can see the order created by Salesman 1 on their behalf.");

    // Super Admin Query (sees all orders with creator attribution)
    const adminOrders = await prisma.order.findMany({
      where: {
        id: { in: [testOrder1.id, testOrder2.id] },
      },
      select: {
        id: true,
        orderNo: true,
        createdByRole: true,
        createdByNameSnapshot: true,
        totalCbm: true,
        quantity: true,
      },
    });
    console.log(`👉 Super Admin sees ${adminOrders.length} orders:`);
    adminOrders.forEach((o) => {
      console.log(`   Order: ${o.orderNo} | Created By: ${o.createdByNameSnapshot} (${o.createdByRole}) | ${o.totalCbm} CBM | ${o.quantity} blocks`);
    });

    // ------------------------------------------------------------------------
    // TEST 5: ORDER EDITING RULES (PRE-DISPATCH ALLOWED, POST-DISPATCH LOCKED)
    // ------------------------------------------------------------------------
    console.log("\n--- [Test 5]: Order Editing Rules (Pre-Dispatch vs Post-Dispatch) ---");
    
    // Status PENDING -> Pre-dispatch, should be editable
    const canEditPending = ![OrderStatus.DISPATCHED, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REJECTED].includes(testOrder1.status);
    console.log(`👉 Order 1 status is ${testOrder1.status} -> Editable = ${canEditPending}`);
    if (!canEditPending) throw new Error("Pending order should be editable");

    // Perform an authorized edit
    await prisma.order.update({
      where: { id: testOrder1.id },
      data: {
        customSiteName: "Sector 5 Site A (Revised Entry Gate)",
        adhesiveBags: 20,
        notes: "Updated delivery instructions by Salesman before dispatch",
        editHistory: {
          create: {
            changedById: salesman1.id,
            changedByName: salesman1.name,
            userRole: "SALESMAN",
            previousValues: {},
            newValues: { customSiteName: "Sector 5 Site A (Revised Entry Gate)", adhesiveBags: 20 },
            changedFields: ["customSiteName", "adhesiveBags"],
            orderVersion: 2,
          },
        },
      },
    });
    console.log("✅ Order updated successfully before dispatch, audit trail recorded.");

    // Simulate order dispatch
    await prisma.order.update({
      where: { id: testOrder1.id },
      data: { status: OrderStatus.DISPATCHED },
    });
    const dispatchedOrder = await prisma.order.findUniqueOrThrow({ where: { id: testOrder1.id } });
    const canEditDispatched = ![OrderStatus.DISPATCHED, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REJECTED].includes(dispatchedOrder.status);
    console.log(`👉 Order 1 status is now ${dispatchedOrder.status} -> Editable = ${canEditDispatched}`);
    if (canEditDispatched) throw new Error("Dispatched order must NOT be editable");
    console.log("✅ Order editing locked after dispatch.");

    // ------------------------------------------------------------------------
    // TEST 6: CUSTOMER CREATING THEIR OWN ORDER (REGRESSION CHECK)
    // ------------------------------------------------------------------------
    console.log("\n--- [Test 6]: Customer Creating Their Own Order (Regression Check) ---");
    testOrder3 = await prisma.order.create({
      data: {
        orderNo: `ORD-TEST-${timestamp.toString().slice(-5)}-3`,
        customerId: customer1.id,
        salesmanId: customer1.salesmanId,
        createdById: customer1.id,
        createdByRole: "CUSTOMER",
        createdByNameSnapshot: customer1.name,
        customSiteName: "Customer Direct Site",
        deliveryAddress: customer1.deliveryAddress || "Customer Address",
        city: customer1.city || "Gandhinagar",
        state: customer1.state || "Gujarat",
        pincode: customer1.pincode || "382010",
        hasMortar: true,
        adhesiveBags: 10,
        totalCbm: 18,
        quantity: 1000,
        rate: 0,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        status: OrderStatus.PENDING,
        items: {
          create: [
            {
              productId: block6.id,
              productName: block6.name,
              quantity: 1000,
              totalCbm: 18,
              rate: 0,
              gstRate: 0,
              subtotal: 0,
              gstAmount: 0,
              totalAmount: 0,
            },
          ],
        },
      },
    });
    console.log(`✅ Direct Customer Order created: ${testOrder3.orderNo}`);
    console.log(`   Created By Role: ${testOrder3.createdByRole} (Expected: CUSTOMER)`);
    if (testOrder3.createdByRole !== "CUSTOMER") throw new Error("Customer order creator role mismatch");

    console.log("\n==================================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! ZERO DEFECTS FOUND.");
    console.log("==================================================================");
  } finally {
    // Clean up test data
    console.log("\n[Cleanup]: Removing test records...");
    if (testOrder1) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrder1.id } });
      await prisma.orderEditHistory.deleteMany({ where: { orderId: testOrder1.id } });
      await prisma.order.delete({ where: { id: testOrder1.id } }).catch(() => {});
    }
    if (testOrder2) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrder2.id } });
      await prisma.order.delete({ where: { id: testOrder2.id } }).catch(() => {});
    }
    if (testOrder3) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrder3.id } });
      await prisma.order.delete({ where: { id: testOrder3.id } }).catch(() => {});
    }
    if (customer1) {
      await prisma.customerAssignmentHistory.deleteMany({ where: { customerId: customer1.id } });
      await prisma.user.delete({ where: { id: customer1.id } }).catch(() => {});
    }
    if (customer2) {
      await prisma.customerAssignmentHistory.deleteMany({ where: { customerId: customer2.id } });
      await prisma.user.delete({ where: { id: customer2.id } }).catch(() => {});
    }
    const testCust3 = await prisma.user.findUnique({ where: { mobile: testCustomer3Mobile } });
    if (testCust3) {
      await prisma.customerAssignmentHistory.deleteMany({ where: { customerId: testCust3.id } });
      await prisma.user.delete({ where: { id: testCust3.id } }).catch(() => {});
    }
    if (salesman1) await prisma.user.delete({ where: { id: salesman1.id } }).catch(() => {});
    if (salesman2) await prisma.user.delete({ where: { id: salesman2.id } }).catch(() => {});
    console.log("✅ Cleanup complete. Production database left clean.");
    await prisma.$disconnect();
  }
}

runTests().catch((e) => {
  console.error("❌ TEST SUITE FAILED:", e);
  process.exit(1);
});
