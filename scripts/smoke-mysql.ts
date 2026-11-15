import { prisma } from "../lib/prisma";

async function main() {
  const [users, products, orders, profile] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.companyProfile.findFirst({ select: { legalName: true } }),
  ]);

  console.log("MySQL smoke test OK:", { users, products, orders, company: profile?.legalName ?? null });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
