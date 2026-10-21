import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SalesmanOrdersView, SalesmanOrderItem } from "@/components/salesman-orders-view";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

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
      </div>

      <SalesmanOrdersView
        orders={orderItems}
        initialCustomerId={customer}
      />
    </div>
  );
}
