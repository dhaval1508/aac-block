import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      active: true,
      _count: {
        select: {
          customerOrders: true,
          assignedOrders: true,
          stockMovements: true,
          notifications: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("TOTAL USERS:", users.length);
  console.table(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      role: u.role,
      active: u.active,
      custOrders: u._count.customerOrders,
      assignedOrders: u._count.assignedOrders,
      stockMovs: u._count.stockMovements,
      notifs: u._count.notifications,
    }))
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
