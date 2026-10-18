import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ActivityLogManager, UnifiedActivity } from "@/components/activity-log-manager";
import { resolveDateRange, buildPrismaDateFilter } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const dateRange = resolveDateRange(params.preset, params.from, params.to);
  const dateFilter = buildPrismaDateFilter(dateRange);

  const [movements, events, recentUsers] = await Promise.all([
    prisma.stockMovement.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      take: 120,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { sizeLabel: true } },
        order: { select: { id: true, orderNo: true } },
        createdBy: { select: { name: true, role: true } },
      },
    }),
    prisma.orderEvent.findMany({
      where: {
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        NOT: {
          title: { contains: "Payment", mode: "insensitive" },
        },
      },
      take: 120,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            customer: { select: { name: true, companyName: true } },
          },
        },
        createdBy: { select: { name: true, role: true } },
      },
    }),
    prisma.user.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      take: 60,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        mobile: true,
        companyName: true,
        gstin: true,
        createdAt: true,
      },
    }),
  ]);

  const unifiedList: UnifiedActivity[] = [
    // 1. Stock Movements
    ...movements.map((m): UnifiedActivity => ({
      id: `stock-${m.id}`,
      category: "STOCK",
      eventType: m.type === "IN" ? "Stock Inbound" : "Stock Dispatch",
      title: `${m.product.sizeLabel} (${m.type})`,
      description:
        m.note ||
        (m.order ? `Allocated for order ${m.order.orderNo}` : "Factory yard inventory balance adjustment"),
      recordRef: m.order?.orderNo || m.product.sizeLabel,
      recordHref: m.order ? `/admin/orders/${m.order.id}` : "/admin/stock",
      user: {
        name: m.createdBy?.name || "Yard System",
        role: m.createdBy?.role,
      },
      timestamp: m.createdAt.toISOString(),
      delta: {
        type: m.quantityDelta > 0 ? "positive" : "negative",
        value: m.quantityDelta > 0 ? `+${m.quantityDelta.toLocaleString()}` : m.quantityDelta.toLocaleString(),
      },
      details: {
        "Product Size": m.product.sizeLabel,
        "Quantity Delta": m.quantityDelta,
        "Reference No": m.referenceNo || undefined,
        "Order No": m.order?.orderNo || undefined,
      },
    })),

    // 2. Order Milestones
    ...events.map((e): UnifiedActivity => {
      const sanitizedNote = e.note
        ? e.note.replace(/[₹$]|(?:Rs\.?|INR)\s*[\d,]+(?:\.\d+)?/gi, "").trim()
        : null;

      return {
        id: `event-${e.id}`,
        category: "ORDER",
        eventType: e.title,
        title: `${e.order.orderNo} · ${e.status}`,
        description:
          sanitizedNote ||
          `Milestone transition to ${e.status} for ${e.order.customer.companyName || e.order.customer.name}`,
        recordRef: e.order.orderNo,
        recordHref: `/admin/orders/${e.order.id}`,
        user: {
          name: e.createdBy?.name || "System Dispatcher",
          role: e.createdBy?.role,
        },
        timestamp: e.createdAt.toISOString(),
        details: {
          "Order #": e.order.orderNo,
          "Status": e.status,
          "Client": e.order.customer.companyName || e.order.customer.name,
          "Event Note": sanitizedNote || undefined,
        },
      };
    }),


    // 4. User Accounts / Staff Provisioning
    ...recentUsers.map((u): UnifiedActivity => ({
      id: `user-${u.id}`,
      category: "USER",
      eventType: u.role === "CUSTOMER" ? "Customer Registered" : "Staff Provisioned",
      title: `${u.name} (${u.role})`,
      description: `${u.role === "CUSTOMER" ? "Client account registered" : "Team account provisioned"} with email ${u.email} and mobile ${u.mobile}`,
      recordRef: u.companyName || u.name,
      recordHref: "/admin/users",
      user: {
        name: u.name,
        role: u.role,
      },
      timestamp: u.createdAt.toISOString(),
      details: {
        "Name": u.name,
        "Role": u.role,
        "Email": u.email,
        "Mobile": u.mobile,
        "Company": u.companyName || undefined,
        "GSTIN": u.gstin || undefined,
      },
    })),
  ];

  // Sort descending by timestamp
  unifiedList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <ActivityLogManager
      items={unifiedList}
      periodLabel={dateRange.label}
    />
  );
}
