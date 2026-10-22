import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { PlusCircle } from "lucide-react";
import { SalesmanOrdersView, SalesmanOrderItem } from "@/components/salesman-orders-view";

export const dynamic = "force-dynamic";

export default async function SalesmanOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== Role.SALESMAN && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const { customer } = await searchParams;

  const ordersData = await prisma.order.findMany({
    where: {
      salesmanId: session.id,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          companyName: true,
          mobile: true,
        },
      },
      product: {
        select: {
          sizeLabel: true,
          dimensions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const orderItems: SalesmanOrderItem[] = ordersData.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    customerId: o.customer.id,
    customerName: o.customer.companyName || o.customer.name,
    customerMobile: o.customer.mobile,
    sizeLabel: o.product?.sizeLabel ?? null,
    dimensions: o.product?.dimensions ?? null,
    quantity: o.quantity,
    totalCbm: o.totalCbm ? Number(o.totalCbm) : null,
    adhesiveBags: o.adhesiveBags,
    deliveryAddress: o.deliveryAddress,
    googleMapsUrl: o.googleMapsUrl ?? null,
    status: o.status,
    createdAt: o.createdAt,
    createdByRole: o.createdByRole ?? null,
    createdByNameSnapshot: o.createdByNameSnapshot ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy">Customer Orders</h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time fulfillment tracking for all orders placed by your assigned customers.
          </p>
        </div>

        <Link
          href="/salesman/orders/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0f607d] px-4 py-2.5 text-xs font-black text-white shadow-md transition self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>+ Create New Order</span>
        </Link>
      </div>

      <SalesmanOrdersView
        orders={orderItems}
        initialCustomerId={customer}
      />
    </div>
  );
}
