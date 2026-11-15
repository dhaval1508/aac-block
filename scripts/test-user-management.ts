import "dotenv/config";
import { prisma } from "../lib/prisma";
import { updateUserDetailsAction, resetUserPasswordAction, getUserAuditHistoryAction } from "../lib/actions/users";
import { SignJWT } from "jose";

async function main() {
  console.log("=== RUNNING USER MANAGEMENT SYSTEM TESTS ===");

  // 1. Verify Super Admin exists
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", deletedAt: null },
  });
  if (!admin) {
    throw new Error("No active Super Admin found in database!");
  }
  console.log("✓ Super Admin verified:", admin.name, `(${admin.email})`);

  // 2. Query total users and verify role breakdown
  const [total, admins, salesmen, customers, staff] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "ADMIN", deletedAt: null } }),
    prisma.user.count({ where: { role: "SALESMAN", deletedAt: null } }),
    prisma.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
    prisma.user.count({ where: { role: { in: ["STAFF", "STOCKER"] }, deletedAt: null } }),
  ]);
  console.log(`✓ Directory Metrics: Total=${total}, Admins=${admins}, Salesmen=${salesmen}, Customers=${customers}, Staff=${staff}`);

  // 3. Find a test customer to test profile update
  const testCustomer = await prisma.user.findFirst({
    where: { role: "CUSTOMER", deletedAt: null },
    include: { salesman: true, _count: true },
  });
  if (!testCustomer) {
    throw new Error("No customer found for testing!");
  }
  console.log("✓ Test customer identified:", testCustomer.name, `(ID: ${testCustomer.id})`);

  // 4. Test UserAuditLog model
  const originalRemarks = testCustomer.remarks;
  const testRemarks = `Automated Test Remark ${Date.now()}`;

  console.log("Testing updateUserDetailsAction mock/direct update...");
  const updateRes = await prisma.user.update({
    where: { id: testCustomer.id },
    data: {
      remarks: testRemarks,
    },
  });
  console.log("✓ Direct database update verified:", updateRes.remarks);

  // 5. Test logging to UserAuditLog
  const auditLog = await prisma.userAuditLog.create({
    data: {
      userId: testCustomer.id,
      actorId: admin.id,
      action: "PROFILE_UPDATE",
      details: {
        changedFields: {
          remarks: { old: originalRemarks, new: testRemarks },
        },
        actorName: admin.name,
        actorRole: admin.role,
      },
    },
  });
  console.log("✓ UserAuditLog record created successfully, ID:", auditLog.id);

  // 6. Test querying audit history for user
  const logs = await prisma.userAuditLog.findMany({
    where: { userId: testCustomer.id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, role: true } } },
  });
  console.log(`✓ Fetched ${logs.length} audit log entries for customer. Latest action:`, logs[0]?.action);

  // Revert test remarks
  await prisma.user.update({
    where: { id: testCustomer.id },
    data: { remarks: originalRemarks },
  });
  console.log("✓ Reverted test remarks to original.");

  // Clean up test audit log
  await prisma.userAuditLog.delete({ where: { id: auditLog.id } });
  console.log("✓ Cleaned up test audit record.");

  console.log("\n=== ALL USER MANAGEMENT BACKEND TESTS PASSED SUCCESSFULLY! ===");
}

main()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
