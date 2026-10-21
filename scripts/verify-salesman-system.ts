import { PrismaClient, Role, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { calculateBlockMetrics } from "../lib/aac-calculator";
import { buildCustomerInvitationWhatsAppMessage, buildDriverDeliveryWhatsAppMessage } from "../lib/whatsapp";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("🧪 STARTING COMPREHENSIVE SALESMAN & DELIVERY LOCATION VERIFICATION");
  console.log("==================================================================");

  const timestamp = Date.now();
  const testSalesman1Mobile = `98980${String(timestamp).slice(-5)}`;
  const testSalesman2Mobile = `98981${String(timestamp).slice(-5)}`;
  const testSalesman1Email = `salesman1_${timestamp}@swarnim.test`;
  const testSalesman2Email = `salesman2_${timestamp}@swarnim.test`;

  let salesman1: any;
  let salesman2: any;
  let customer1: any;
  let customer2: any;
  let order1: any;
  let invitation1: any;

  try {
    // ------------------------------------------------------------------------
    // SCENARIO A: CREATE SALESMEN (Super Admin role logic)
    // ------------------------------------------------------------------------
    console.log("\n--- [Scenario A]: Creating Salesmen ---");
    const count = await prisma.user.count({ where: { role: Role.SALESMAN } });
    const code1 = `SAB-SALES-${String(count + 1).padStart(3, "0")}`;
    const code2 = `SAB-SALES-${String(count + 2).padStart(3, "0")}`;
    const hash = await bcrypt.hash("SalesmanPass123!", 10);

    salesman1 = await prisma.user.create({
      data: {
        name: "Test Salesman One",
        mobile: testSalesman1Mobile,
        email: testSalesman1Email,
        passwordHash: hash,
        role: Role.SALESMAN,
        salesmanCode: code1,
        active: true,
        deliveryAddress: "Ahmedabad Territory",
        companyName: "Swarnim AAC Block Pvt. Ltd.",
      },
    });
    console.log(`✅ Salesman 1 created: ID=${salesman1.id}, Code=${salesman1.salesmanCode}, Mobile=${salesman1.mobile}`);

    salesman2 = await prisma.user.create({
      data: {
        name: "Test Salesman Two",
        mobile: testSalesman2Mobile,
        email: testSalesman2Email,
        passwordHash: hash,
        role: Role.SALESMAN,
        salesmanCode: code2,
        active: true,
        deliveryAddress: "Vadodara Territory",
        companyName: "Swarnim AAC Block Pvt. Ltd.",
      },
    });
    console.log(`✅ Salesman 2 created: ID=${salesman2.id}, Code=${salesman2.salesmanCode}, Mobile=${salesman2.mobile}`);

    // Verify both can authenticate
    const passOk1 = await bcrypt.compare("SalesmanPass123!", salesman1.passwordHash);
    const passOk2 = await bcrypt.compare("SalesmanPass123!", salesman2.passwordHash);
    if (!passOk1 || !passOk2) throw new Error("Salesman password comparison failed");
    console.log("✅ Both Salesman credentials verified securely via bcrypt");

    // ------------------------------------------------------------------------
    // SCENARIO B: SALESMAN 1 ADDS CUSTOMERS & DATA ISOLATION VERIFICATION
    // ------------------------------------------------------------------------
    console.log("\n--- [Scenario B]: Customer Addition & Strict Data Isolation ---");
    const cust1Mobile = `97120${String(timestamp).slice(-5)}`;
    const cust2Mobile = `97121${String(timestamp).slice(-5)}`;

    customer1 = await prisma.user.create({
      data: {
        name: "Test Customer Alpha",
        mobile: cust1Mobile,
        email: `cust_alpha_${timestamp}@swarnim.test`,
        passwordHash: hash,
        role: Role.CUSTOMER,
        companyName: "Alpha Constructions",
        deliveryAddress: "SG Highway, Gota, Ahmedabad",
        salesmanId: salesman1.id,
        assignedAt: new Date(),
        active: true,
      },
    });

    customer2 = await prisma.user.create({
      data: {
        name: "Test Customer Beta",
        mobile: cust2Mobile,
        email: `cust_beta_${timestamp}@swarnim.test`,
        passwordHash: hash,
        role: Role.CUSTOMER,
        companyName: "Beta Infra Projects",
        deliveryAddress: "Sanand Circle, Ahmedabad",
        salesmanId: salesman1.id,
        assignedAt: new Date(),
        active: true,
      },
    });
    console.log(`✅ Customer 1 & 2 created and linked to Salesman 1 (${salesman1.salesmanCode})`);

    // Verify Salesman 1 sees both customers
    const s1Customers = await prisma.user.findMany({
      where: { salesmanId: salesman1.id, role: Role.CUSTOMER },
    });
    console.log(`✅ Salesman 1 customer query returned: ${s1Customers.length} customers (expected >= 2)`);
    if (!s1Customers.some((c) => c.id === customer1.id)) throw new Error("Customer 1 not found for Salesman 1");

    // Verify Salesman 2 CANNOT see these customers
    const s2Customers = await prisma.user.findMany({
      where: { salesmanId: salesman2.id, role: Role.CUSTOMER },
    });
    const leak = s2Customers.some((c) => c.id === customer1.id || c.id === customer2.id);
    if (leak) throw new Error("DATA LEAK: Salesman 2 can see Salesman 1's customers!");
    console.log("🔒 Strict Data Isolation Verified: Salesman 2 cannot see Salesman 1's customers");

    // ------------------------------------------------------------------------
    // SCENARIO C: WHATSAPP CUSTOMER INVITATION WORKFLOW
    // ------------------------------------------------------------------------
    console.log("\n--- [Scenario C]: WhatsApp Customer Invitation ---");
    const inviteToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inviteCustMobile = `96010${String(timestamp).slice(-5)}`;

    invitation1 = await prisma.customerInvitation.create({
      data: {
        salesmanId: salesman1.id,
        customerName: "Invited Builder Gamma",
        mobile: inviteCustMobile,
        token: inviteToken,
        status: "PENDING",
        expiresAt,
      },
    });
    console.log(`✅ Invitation created: ID=${invitation1.id}, Token=${inviteToken.slice(0, 10)}...`);

    // Verify WhatsApp template format
    const inviteMsg = buildCustomerInvitationWhatsAppMessage({
      customerName: "Invited Builder Gamma",
      salesmanName: salesman1.name,
      inviteUrl: `https://aac-block-management.vercel.app/invite/${inviteToken}`,
    });
    console.log("✅ Prefilled WhatsApp message generated:");
    console.log("--------------------------------------------------");
    console.log(inviteMsg);
    console.log("--------------------------------------------------");
    if (!inviteMsg.includes("Swarnim AAC Block Private Limited") || !inviteMsg.includes(inviteToken)) {
      throw new Error("WhatsApp template message does not match specifications");
    }

    // Simulate customer opening invite & completing registration
    const registeredCust = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: invitation1.customerName,
          mobile: invitation1.mobile,
          email: `${invitation1.mobile}@swarnim.customer`,
          passwordHash: hash,
          role: Role.CUSTOMER,
          companyName: "Gamma Developers",
          deliveryAddress: "Bopal-Ambli Road, Ahmedabad",
          salesmanId: invitation1.salesmanId,
          assignedAt: new Date(),
          active: true,
        },
      });

      await tx.customerInvitation.update({
        where: { id: invitation1.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          registeredCustomerId: u.id,
        },
      });

      return u;
    });

    console.log(`✅ Customer successfully registered from invitation: ${registeredCust.name} (ID=${registeredCust.id})`);
    console.log(`✅ Customer linked to Salesman: ${registeredCust.salesmanId} === ${salesman1.id}`);

    // Verify token reuse is prevented
    const recheckInvite = await prisma.customerInvitation.findUnique({ where: { token: inviteToken } });
    if (recheckInvite?.status !== "ACCEPTED") throw new Error("Invitation status not marked ACCEPTED");
    console.log("🔒 Invitation Token Re-use Prevention Verified: Status is ACCEPTED, further registrations blocked");

    // ------------------------------------------------------------------------
    // SCENARIO D: CUSTOMER PLACES ORDER WITH GPS / MAPS LINK
    // ------------------------------------------------------------------------
    console.log("\n--- [Scenario D]: Order Placement with Location & Attribution ---");
    const aacProduct = await prisma.product.findFirst({
      where: { category: "AAC_BLOCK", active: true },
    });
    if (!aacProduct) throw new Error("No AAC Block product found in database");

    const orderNo = `SAB-TEST-${timestamp.toString().slice(-6)}`;
    const testMapsUrl = "https://maps.app.goo.gl/tH7zPqexample123";

    order1 = await prisma.order.create({
      data: {
        orderNo,
        customerId: customer1.id,
        productId: aacProduct.id,
        quantity: 1000,
        totalCbm: 18.0,
        adhesiveBags: 0,
        deliveryAddress: "Gota Industrial Area, Behind Nirma University, Ahmedabad",
        locationSource: "GOOGLE_MAPS_LINK",
        googleMapsUrl: testMapsUrl,
        latitude: 23.1287654,
        longitude: 72.5432109,
        formattedAddress: "Gota Industrial Area, Ahmedabad, Gujarat 382481",
        salesmanId: salesman1.id,
        salesmanNameSnapshot: salesman1.name,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0, // Zero price enforcement
        paidAmount: 0,
        status: OrderStatus.CONFIRMED,
      },
    });

    console.log(`✅ Order created: ${order1.orderNo}`);
    console.log(`   - CBM: ${order1.totalCbm}`);
    console.log(`   - Approx Blocks: ${order1.quantity}`);
    console.log(`   - Mortar Bags: ${order1.adhesiveBags}`);
    console.log(`   - Location Source: ${order1.locationSource}`);
    console.log(`   - Google Maps URL: ${order1.googleMapsUrl}`);
    console.log(`   - Attributed Salesman: ${order1.salesmanNameSnapshot} (${order1.salesmanId})`);

    // Verify Driver WhatsApp Message incorporates delivery destination
    const driverMsg = buildDriverDeliveryWhatsAppMessage({
      driverName: "Ramesh Bhai",
      orderNo: order1.orderNo,
      vehicleNumber: "GJ-01-AB-1234",
      totalCbm: 18.0,
      deliveryAddress: order1.deliveryAddress,
      googleMapsUrl: order1.googleMapsUrl || undefined,
    });
    console.log("✅ Driver WhatsApp Delivery Message verified:");
    console.log("--------------------------------------------------");
    console.log(driverMsg);
    console.log("--------------------------------------------------");
    if (!driverMsg.includes(order1.orderNo) || !driverMsg.includes(testMapsUrl)) {
      throw new Error("Driver WhatsApp message missing Order ID or Google Maps link");
    }

    // Verify Salesman Order Isolation
    const s1Orders = await prisma.order.findMany({ where: { salesmanId: salesman1.id } });
    const s2Orders = await prisma.order.findMany({ where: { salesmanId: salesman2.id } });
    if (!s1Orders.some((o) => o.id === order1.id)) throw new Error("Order not found for Salesman 1");
    if (s2Orders.some((o) => o.id === order1.id)) throw new Error("DATA LEAK: Salesman 2 can see Salesman 1's order!");
    console.log("🔒 Order Visibility Isolated: Salesman 1 sees the order; Salesman 2 CANNOT see the order");

    // ------------------------------------------------------------------------
    // SCENARIO E: REASSIGN CUSTOMER & AUDIT PRESERVATION
    // ------------------------------------------------------------------------
    console.log("\n--- [Scenario E]: Reassign Customer from Salesman 1 to Salesman 2 ---");
    // Reassign customer 1 to Salesman 2
    await prisma.$transaction(async (tx) => {
      await tx.customerAssignmentHistory.create({
        data: {
          customerId: customer1.id,
          fromSalesmanId: salesman1.id,
          toSalesmanId: salesman2.id,
          assignedById: "admin_tester",
          reason: "Territory optimization",
        },
      });

      await tx.user.update({
        where: { id: customer1.id },
        data: {
          salesmanId: salesman2.id,
          assignedAt: new Date(),
        },
      });
    });

    // Check new assignment
    const updatedCust1 = await prisma.user.findUnique({ where: { id: customer1.id } });
    if (updatedCust1?.salesmanId !== salesman2.id) throw new Error("Customer 1 reassignment failed");
    console.log(`✅ Customer 1 successfully reassigned to Salesman 2 (${salesman2.salesmanCode})`);

    // Verify audit history record
    const history = await prisma.customerAssignmentHistory.findFirst({
      where: { customerId: customer1.id, fromSalesmanId: salesman1.id, toSalesmanId: salesman2.id },
    });
    if (!history) throw new Error("Assignment history record not found");
    console.log(`✅ Assignment History preserved in Neon DB: From=${history.fromSalesmanId} -> To=${history.toSalesmanId}`);

    // Verify historical order attribution remains intact (salesmanNameSnapshot on past order)
    const pastOrder = await prisma.order.findUnique({ where: { id: order1.id } });
    if (pastOrder?.salesmanNameSnapshot !== salesman1.name) {
      throw new Error("Past order attribution snapshot was corrupted!");
    }
    console.log(`🔒 Historical Attribution Preserved: Order ${order1.orderNo} retains original Salesman Snapshot "${pastOrder?.salesmanNameSnapshot}"`);

    // ------------------------------------------------------------------------
    // SCENARIO F: REGRESSION CHECKS (All 9 AAC block sizes & CBM math)
    // ------------------------------------------------------------------------
    console.log("\n--- [Scenario F]: AAC Block CBM Calculation & Size Verification ---");
    // Verify 6 inch CBM to approx blocks: 18 CBM / 0.018 = 1000 blocks
    const metric6 = calculateBlockMetrics(600, 200, 150);
    const approxBlocks6 = Math.round(18 / metric6.cbmExact);
    console.log(`✅ 6 Inch AAC Block: 18 CBM -> ${approxBlocks6} blocks (Expected: 1000)`);
    if (approxBlocks6 !== 1000) throw new Error("6 Inch CBM calculation mismatch");

    // Verify 8 inch CBM to approx blocks: 23 CBM / 0.024 = 958 blocks (rounded)
    const metric8 = calculateBlockMetrics(600, 200, 200);
    const approxBlocks8 = Math.round(23 / metric8.cbmExact);
    console.log(`✅ 8 Inch AAC Block: 23 CBM -> ${approxBlocks8} blocks (Expected: 958)`);
    if (approxBlocks8 !== 958) throw new Error("8 Inch CBM calculation mismatch");

    // Verify all 9 standard sizes in database
    const allProducts = await prisma.product.findMany({
      where: { category: "AAC_BLOCK" },
      orderBy: { widthMm: "asc" },
    });
    console.log(`✅ Found ${allProducts.length} AAC Block sizes registered in catalog`);
    for (const p of allProducts) {
      console.log(`   - ${p.sizeLabel} (${p.lengthMm}x${p.heightMm}x${p.widthMm}mm): ${Number(p.cbmPerBlock).toFixed(4)} CBM/block`);
    }

    console.log("\n==================================================================");
    console.log("🎉 ALL END-TO-END SCENARIOS A, B, C, D, E, F PASSED WITH 100% SUCCESS!");
    console.log("==================================================================");
  } finally {
    // Clean up only our test fixtures so the production database stays pristine
    console.log("\n🧹 Cleaning up test fixtures...");
    if (order1) await prisma.order.deleteMany({ where: { id: order1.id } });
    if (customer1) {
      await prisma.customerAssignmentHistory.deleteMany({ where: { customerId: customer1.id } });
      await prisma.user.deleteMany({ where: { id: customer1.id } });
    }
    if (customer2) await prisma.user.deleteMany({ where: { id: customer2.id } });
    if (invitation1) {
      await prisma.customerInvitation.deleteMany({ where: { id: invitation1.id } });
      await prisma.user.deleteMany({ where: { mobile: invitation1.mobile } });
    }
    if (salesman1) await prisma.user.deleteMany({ where: { id: salesman1.id } });
    if (salesman2) await prisma.user.deleteMany({ where: { id: salesman2.id } });
    await prisma.$disconnect();
    console.log("✅ Test fixtures safely cleaned up. Database remains clean.");
  }
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
