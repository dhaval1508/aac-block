import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, mobile: true, role: true, active: true },
    orderBy: { role: "asc" }
  });
  console.log("Total users:", users.length);
  const byRole = {};
  for (const u of users) {
    if (!byRole[u.role]) byRole[u.role] = [];
    byRole[u.role].push({ name: u.name, email: u.email, mobile: u.mobile, active: u.active });
  }
  for (const [role, list] of Object.entries(byRole)) {
    console.log(`\n=== Role: ${role} (${(list as any[]).length} total, ${(list as any[]).filter(x => x.active).length} active) ===`);
    console.log((list as any[]).slice(0, 5));
  }
}

main().finally(() => prisma.$disconnect());
