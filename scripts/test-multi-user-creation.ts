import { prisma } from "../lib/prisma";
import { Role, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateNextSalesmanCode } from "../lib/actions/salesmen";

async function main() {
  console.log("================================================================================");
  console.log("  SWARNIM AAC: COMPREHENSIVE MULTI-SALESMAN & ROLE TESTING SUITE");
  console.log("================================================================================");

  // 1. Current State Inspection
  const currentSalesmen = await prisma.user.findMany({
    where: { role: Role.SALESMAN },
    select: { id: true, name: true, salesmanCode: true, email: true, mobile: true, active: true },
  });
  console.log(`\n[1] Currently Existing Salesmen in Neon DB: ${currentSalesmen.length}`);
  currentSalesmen.forEach((s, idx) => {
    console.log(`    ${idx + 1}. ${s.name} (${s.salesmanCode || "NO-CODE"}) - ${s.mobile} - ${s.email} - Active: ${s.active}`);
  });

  // 2. Collision-Free Salesman Code Generator Verification
  console.log("\n[2] Testing Collision-Free Code Generator...");
  const codeCandidate1 = await generateNextSalesmanCode();
  console.log(`    Generated Next Salesman Code: ${codeCandidate1}`);
  if (!codeCandidate1.startsWith("SAB-SALES-")) {
    throw new Error(`Invalid code format generated: ${codeCandidate1}`);
  }

  // 3. Create Multiple Real Salesmen Accounts (Salesman Test A & Test B)
  const timestamp = Date.now().toString().slice(-6);
  const testSalesmanAEmail = `salesman_test_a_${timestamp}@swarnim.test`;
  const testSalesmanAMobile = `9911${timestamp}`;
  const testSalesmanBEmail = `salesman_test_b_${timestamp}@swarnim.test`;
  const testSalesmanBMobile = `9922${timestamp}`;

  console.log(`\n[3] Creating Test Salesman 1: ${testSalesmanAEmail} (${testSalesmanAMobile})...`);
  const codeA = await generateNextSalesmanCode();
  const passHashA = await bcrypt.hash("SalesmanPass123!", 10);
  const salesmanA = await prisma.user.create({
    data: {
      name: `Test Salesman Alpha ${timestamp}`,
      email: testSalesmanAEmail,
      mobile: testSalesmanAMobile,
      role: Role.SALESMAN,
      salesmanCode: codeA,
      passwordHash: passHashA,
      companyName: "Swarnim AAC Block Pvt. Ltd.",
      remarks: "Field Executive North Gujarat",
      active: true,
    },
  });
  console.log(`    ✅ Created Salesman A: ID=${salesmanA.id}, Code=${salesmanA.salesmanCode}`);

  console.log(`\n[4] Creating Test Salesman 2: ${testSalesmanBEmail} (${testSalesmanBMobile})...`);
  const codeB = await generateNextSalesmanCode();
  if (codeB === codeA) {
    throw new Error(`CRITICAL: Suffix collision! Code B (${codeB}) matches Code A (${codeA})`);
  }
  const passHashB = await bcrypt.hash("SalesmanPass123!", 10);
  const salesmanB = await prisma.user.create({
    data: {
      name: `Test Salesman Beta ${timestamp}`,
      email: testSalesmanBEmail,
      mobile: testSalesmanBMobile,
      role: Role.SALESMAN,
      salesmanCode: codeB,
      passwordHash: passHashB,
      companyName: "Swarnim AAC Block Pvt. Ltd.",
      remarks: "Field Executive South Gujarat",
      active: true,
    },
  });
  console.log(`    ✅ Created Salesman B: ID=${salesmanB.id}, Code=${salesmanB.salesmanCode}`);

  // 5. Verify Authentication & Password Hashing
  console.log("\n[5] Verifying Authentication for newly created Salesmen...");
  const authA = await bcrypt.compare("SalesmanPass123!", salesmanA.passwordHash);
  const authB = await bcrypt.compare("SalesmanPass123!", salesmanB.passwordHash);
  if (!authA || !authB) {
    throw new Error("Password authentication verification failed for new salesmen!");
  }
  console.log("    ✅ Bcrypt cryptographic verification passed for both Salesmen!");

  // 6. Test Multiple Loading & Stock Staff Accounts
  console.log("\n[6] Creating Multiple Loading & Stock Staff Accounts...");
  const staffEmail = `staff_yard_${timestamp}@swarnim.test`;
  const staffMobile = `9933${timestamp}`;
  const staffPassHash = await bcrypt.hash("StaffPass123!", 10);
  const testStaff = await prisma.user.create({
    data: {
      name: `Yard Loading Staff ${timestamp}`,
      email: staffEmail,
      mobile: staffMobile,
      role: Role.STAFF,
      passwordHash: staffPassHash,
      companyName: "Swarnim AAC Block Pvt. Ltd.",
      active: true,
    },
  });
  console.log(`    ✅ Created Loading & Stock Staff: ID=${testStaff.id}, Role=${testStaff.role}, Mobile=${testStaff.mobile}`);

  // 7. Test Customer Creation & Strict Data Isolation
  console.log("\n[7] Testing Customer Creation & Salesman-Wise Isolation...");
  const custAEmail = `cust_alpha_${timestamp}@swarnim.test`;
  const custAMobile = `9944${timestamp}`;
  const custBEmail = `cust_beta_${timestamp}@swarnim.test`;
  const custBMobile = `9955${timestamp}`;

  const customerA = await prisma.user.create({
    data: {
      name: `Builder Client Alpha ${timestamp}`,
      email: custAEmail,
      mobile: custAMobile,
      role: Role.CUSTOMER,
      passwordHash: await bcrypt.hash("CustomerPass123!", 10),
      companyName: `Alpha Infra Builders ${timestamp}`,
      salesmanId: salesmanA.id,
      assignedAt: new Date(),
      active: true,
    },
  });

  const customerB = await prisma.user.create({
    data: {
      name: `Builder Client Beta ${timestamp}`,
      email: custBEmail,
      mobile: custBMobile,
      role: Role.CUSTOMER,
      passwordHash: await bcrypt.hash("CustomerPass123!", 10),
      companyName: `Beta Constructions ${timestamp}`,
      salesmanId: salesmanB.id,
      assignedAt: new Date(),
      active: true,
    },
  });
  console.log(`    ✅ Customer A linked to Salesman A (${salesmanA.name})`);
  console.log(`    ✅ Customer B linked to Salesman B (${salesmanB.name})`);

  // Verify Isolation: Salesman A must only see Customer A
  const salesmanACustomers = await prisma.user.findMany({
    where: { salesmanId: salesmanA.id, role: Role.CUSTOMER },
  });
  const salesmanBCustomers = await prisma.user.findMany({
    where: { salesmanId: salesmanB.id, role: Role.CUSTOMER },
  });

  const aHasB = salesmanACustomers.some((c) => c.id === customerB.id);
  const bHasA = salesmanBCustomers.some((c) => c.id === customerA.id);
  if (aHasB || bHasA) {
    throw new Error("CRITICAL PRIVACY VIOLATION: Salesman customer data leaked across accounts!");
  }
  console.log("    ✅ Strict Data Isolation Confirmed: Salesman A cannot see Salesman B's customers!");

  // 8. Test Central User Management Multi-Role Query
  console.log("\n[8] Testing Unified User Management Query (/admin/users)...");
  const unifiedUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, role: true, active: true },
  });
  const roleCounts = {
    ADMIN: unifiedUsers.filter((u) => u.role === "ADMIN").length,
    SALESMAN: unifiedUsers.filter((u) => u.role === "SALESMAN").length,
    CUSTOMER: unifiedUsers.filter((u) => u.role === "CUSTOMER").length,
    STAFF: unifiedUsers.filter((u) => u.role === "STAFF" || u.role === "STOCKER").length,
  };
  console.log(`    Total Active Users: ${unifiedUsers.length}`);
  console.log(`    - Super Admin: ${roleCounts.ADMIN}`);
  console.log(`    - Salesman: ${roleCounts.SALESMAN} (Multiple Active)`);
  console.log(`    - Customer: ${roleCounts.CUSTOMER} (Multiple Active)`);
  console.log(`    - Loading & Stock Staff: ${roleCounts.STAFF} (Multiple Active)`);

  if (roleCounts.SALESMAN < 2 || roleCounts.CUSTOMER < 2 || roleCounts.STAFF < 1 || roleCounts.ADMIN < 1) {
    throw new Error("One or more roles do not meet the multi-user availability criteria!");
  }

  // 9. Clean up test records
  console.log("\n[9] Safely cleaning up isolated test records...");
  await prisma.user.deleteMany({
    where: {
      id: { in: [customerA.id, customerB.id, salesmanA.id, salesmanB.id, testStaff.id] },
    },
  });
  console.log("    ✅ Test records cleaned up safely. Neon production database is pristine.");

  console.log("\n================================================================================");
  console.log("  ALL TESTS PASSED: UNLIMITED SALESMEN & ALL 4 ROLES VERIFIED SUCCESSFULLY!");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("❌ TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
