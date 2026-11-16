import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { roleHome } from "../lib/utils";

async function main() {
  console.log("=== Auditing Active Accounts for Each Role ===");
  const roles = ["ADMIN", "SALESMAN", "STAFF", "CUSTOMER"];
  
  for (const role of roles) {
    const users = await prisma.user.findMany({
      where: { role: role as any, active: true },
      take: 3,
      select: { id: true, name: true, email: true, mobile: true, role: true, passwordHash: true }
    });

    console.log(`\nRole: ${role} (found ${users.length} sample active users)`);
    for (const u of users) {
      const candidates = ["Password@123", "Admin@123", "Salesman@123", "Customer@123", "Staff@123", "123456", "password", "Swarnim@123"];
      let matched = "";
      for (const c of candidates) {
        if (await bcrypt.compare(c, u.passwordHash)) {
          matched = c;
          break;
        }
      }
      console.log(`- ${u.name} | ${u.email} | ${u.mobile} | Pass: ${matched || "Custom password"}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
