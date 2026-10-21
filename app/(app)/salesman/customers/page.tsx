import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SalesmanCustomersTable, SalesmanCustomerItem } from "@/components/salesman-customers-table";
import { UserPlus, Send, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SalesmanCustomersPage() {
  const session = await getSession();
  if (!session || (session.role !== Role.SALESMAN && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const customersData = await prisma.user.findMany({
    where: {
      salesmanId: session.id,
      role: Role.CUSTOMER,
    },
    include: {
      customerOrders: {
        select: {
          id: true,
          totalCbm: true,
          quantity: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const customerItems: SalesmanCustomerItem[] = customersData.map((c) => {
    const totalOrdersCount = c.customerOrders.length;
    const totalCbm = c.customerOrders.reduce(
      (acc, ord) => acc + (ord.totalCbm ? Number(ord.totalCbm) : 0),
      0
    );

    return {
      id: c.id,
      name: c.name,
      companyName: c.companyName,
      mobile: c.mobile,
      email: c.email,
      active: c.active,
      assignedAt: c.assignedAt,
      totalOrdersCount,
      totalCbm,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy">My Customers</h1>
          <p className="mt-1 text-xs text-slate-500">
            All registered customers exclusively assigned to your salesman account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/salesman/invitations"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition"
          >
            <Send className="h-4 w-4" />
            <span>Invite via WhatsApp</span>
          </Link>

          <Link
            href="/salesman/customers/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0f607d] px-4 py-2.5 text-xs font-bold text-white shadow-md transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Customer</span>
          </Link>
        </div>
      </div>

      <SalesmanCustomersTable customers={customerItems} />
    </div>
  );
}
