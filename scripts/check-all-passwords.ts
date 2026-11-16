import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, mobile: true, role: true, passwordHash: true }
  });

  const passwords = [
    "Swarnim@2026", "Admin@123", "Password@123", "password", "123456", "Customer@123", "Loader@123", "Stocker@123"
  ];

  console.log(`Checking ${users.length} active users against common passwords...`);
  for (const u of users) {
    let matched = null;
    for (const p of passwords) {
      if (await bcrypt.compare(p, u.passwordHash)) {
        matched = p;
        break;
      }
    }
    if (matched) {
      console.log(`[PASS MATCH] ${u.role.padEnd(8)} | ${u.name.padEnd(20)} | ${u.email.padEnd(32)} | mobile: ${u.mobile} | pass: ${matched}`);
    } else {
      console.log(`[CUSTOM]     ${u.role.padEnd(8)} | ${u.name.padEnd(20)} | ${u.email.padEnd(32)} | mobile: ${u.mobile}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
