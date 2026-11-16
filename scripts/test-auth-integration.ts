import { loginAction } from "../lib/actions/auth";
import { prisma } from "../lib/prisma";

async function testScenario(name: string, identifier: string, pass: string, next?: string) {
  const fd = new FormData();
  fd.append("email", identifier);
  fd.append("password", pass);
  if (next) fd.append("next", next);

  try {
    await loginAction(fd);
    console.log(`? [${name}] Expected redirect but function returned`);
    return { ok: false };
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      const parts = err.digest.split(";");
      const redirectUrl = parts[2] || err.digest;
      console.log(`? [PASS] ${name.padEnd(30)} -> Redirected to: ${redirectUrl}`);
      return { ok: true, url: redirectUrl };
    } else {
      console.log(`? [FAIL] ${name.padEnd(30)} -> Error:`, err);
      return { ok: false, error: err };
    }
  }
}

async function main() {
  console.log("=== Testing Authentication & Login Action Scenarios ===");
  await testScenario("Admin Email Login", "admin@swarnimdemo.com", "Swarnim@2026");
  await testScenario("Admin Mobile Login", "9999990001", "Swarnim@2026");
  await testScenario("Salesman Email Login", "jitendrasales@gmail.com", "Swarnim@2026");
  await testScenario("Salesman Mobile Login", "8320572014", "Swarnim@2026");
  await testScenario("Staff Email Login", "vaibhav@gmail.com", "Swarnim@2026");
  await testScenario("Staff Mobile Login (+91 match)", "9580742625", "Swarnim@2026");
  await testScenario("Customer Email Login", "dhaval@gmail.com", "Admin@123");
  await testScenario("Customer Mobile Login", "9724920011", "Admin@123");
  await testScenario("Invalid Password", "admin@swarnimdemo.com", "WrongPassword999");
  await testScenario("Non-existent User", "nobody@test.com", "Password@123");
  await testScenario("Safe Next Deep Link", "admin@swarnimdemo.com", "Swarnim@2026", "/admin/orders/qr-center");
  await testScenario("Prevent Loop on next=/login", "admin@swarnimdemo.com", "Swarnim@2026", "/login");
}

main().finally(() => prisma.$disconnect());
