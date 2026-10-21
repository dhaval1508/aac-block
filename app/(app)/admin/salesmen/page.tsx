import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SalesmenManager, SalesmanListItem } from "@/components/salesmen-manager";

export const dynamic = "force-dynamic";

export default async function AdminSalesmenPage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/login");
  }

  const [salesmenUsers, totalCustomersCount, unassignedCustomersCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.SALESMAN },
      orderBy: { createdAt: "desc" },
      include: {
        assignedCustomers: {
          select: { id: true },
        },
        salesmanOrders: {
          select: {
            id: true,
            totalCbm: true,
            quantity: true,
          },
        },
      },
    }),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.user.count({ where: { role: Role.CUSTOMER, salesmanId: null } }),
  ]);

  const salesmenList: SalesmanListItem[] = salesmenUsers.map((s) => {
    const totalOrdersCount = s.salesmanOrders.length;
    const totalCbm = s.salesmanOrders.reduce(
      (acc, ord) => acc + (ord.totalCbm ? Number(ord.totalCbm) : 0),
      0
    );

    return {
      id: s.id,
      name: s.name,
      salesmanCode: s.salesmanCode,
      mobile: s.mobile,
      email: s.email,
      active: s.active,
      address: s.deliveryAddress || s.billingAddress || null,
      remarks: s.remarks,
      createdAt: s.createdAt,
      assignedCustomersCount: s.assignedCustomers.length,
      totalOrdersCount,
      totalCbm,
    };
  });

  return (
    <div className="space-y-6">
      <SalesmenManager
        salesmen={salesmenList}
        totalCustomersCount={totalCustomersCount}
        unassignedCustomersCount={unassignedCustomersCount}
      />
    </div>
  );
}
