import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SalesmanDetailView } from "@/components/salesman-detail-view";

export const dynamic = "force-dynamic";

export default async function AdminSalesmanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/login");
  }

  const { id } = await params;

  const salesman = await prisma.user.findFirst({
    where: { id, role: Role.SALESMAN },
    include: {
      assignedCustomers: {
        include: {
          customerOrders: {
            select: {
              id: true,
              totalCbm: true,
              quantity: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
      salesmanOrders: {
        include: {
          customer: { select: { name: true, mobile: true, companyName: true } },
          product: { select: { sizeLabel: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!salesman) {
    notFound();
  }

  // Fetch assignment history involving this salesman (either from or to)
  const historyRecords = await prisma.customerAssignmentHistory.findMany({
    where: {
      OR: [{ fromSalesmanId: id }, { toSalesmanId: id }],
    },
    include: {
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Resolve user IDs for history
  const userIdsToLookup = Array.from(
    new Set(
      historyRecords
        .flatMap((h) => [h.fromSalesmanId, h.toSalesmanId, h.assignedById])
        .filter((uid): uid is string => Boolean(uid))
    )
  );

  const userMap =
    userIdsToLookup.length > 0
      ? new Map(
          (
            await prisma.user.findMany({
              where: { id: { in: userIdsToLookup } },
              select: { id: true, name: true },
            })
          ).map((u) => [u.id, u.name])
        )
      : new Map<string, string>();

  // Fetch other salesmen for reassignment dropdown
  const otherSalesmen = await prisma.user.findMany({
    where: {
      role: Role.SALESMAN,
      id: { not: id },
      active: true,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const customerItems = salesman.assignedCustomers.map((c) => {
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
      assignedAt: c.assignedAt,
      active: c.active,
      totalOrdersCount,
      totalCbm,
    };
  });

  const orderItems = salesman.salesmanOrders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    customerName: o.customer.companyName || o.customer.name,
    customerMobile: o.customer.mobile,
    sizeLabel: o.product?.sizeLabel ?? null,
    totalCbm: o.totalCbm ? Number(o.totalCbm) : null,
    quantity: o.quantity,
    adhesiveBags: o.adhesiveBags,
    deliveryAddress: o.deliveryAddress,
    status: o.status,
    createdAt: o.createdAt,
  }));

  const historyItems = historyRecords.map((h) => ({
    id: h.id,
    customerName: h.customer?.name || "Customer",
    fromSalesmanName: h.fromSalesmanId ? userMap.get(h.fromSalesmanId) || h.fromSalesmanId : null,
    toSalesmanName: h.toSalesmanId ? userMap.get(h.toSalesmanId) || h.toSalesmanId : null,
    assignedByName: h.assignedById ? userMap.get(h.assignedById) || "Super Admin" : "Super Admin",
    reason: h.reason,
    createdAt: h.createdAt,
  }));

  return (
    <div className="space-y-6">
      <SalesmanDetailView
        salesman={{
          id: salesman.id,
          name: salesman.name,
          salesmanCode: salesman.salesmanCode,
          mobile: salesman.mobile,
          email: salesman.email,
          active: salesman.active,
          address: salesman.deliveryAddress || salesman.billingAddress || null,
          remarks: salesman.remarks,
          createdAt: salesman.createdAt,
        }}
        customers={customerItems}
        orders={orderItems}
        history={historyItems}
        otherSalesmen={otherSalesmen}
      />
    </div>
  );
}
