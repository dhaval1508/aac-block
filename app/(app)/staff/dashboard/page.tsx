import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Truck,
  CheckCircle2,
  Clock,
  ChevronRight,
  PlayCircle,
  AlertCircle,
  Calendar,
  Phone,
  UserCheck,
  Activity as ActivityIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  formatDate,
  formatNumber,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  telHref,
} from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session || !["STAFF", "ADMIN"].includes(session.role)) redirect("/login");

  const { tab = "active", error } = await searchParams;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Strict role filter: staff only sees their assigned orders
  const baseWhere = {
    assignedStaffId: session.id,
  };

  // Metrics calculation
  const [
    totalAssigned,
    pendingLoading,
    currentlyLoading,
    completedLoading,
    todayAssigned,
  ] = await Promise.all([
    prisma.order.count({ where: baseWhere }),
    prisma.order.count({
      where: { ...baseWhere, status: OrderStatus.ASSIGNED },
    }),
    prisma.order.count({
      where: { ...baseWhere, status: OrderStatus.LOADING },
    }),
    prisma.order.count({
      where: {
        ...baseWhere,
        status: { in: [OrderStatus.LOADED, OrderStatus.DISPATCHED, OrderStatus.DELIVERED] },
      },
    }),
    prisma.order.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfToday },
      },
    }),
  ]);

  // Tab filtering
  let statusFilter: OrderStatus[] = [OrderStatus.ASSIGNED, OrderStatus.LOADING];
  if (tab === "all") {
    statusFilter = [
      OrderStatus.ASSIGNED,
      OrderStatus.LOADING,
      OrderStatus.LOADED,
      OrderStatus.DISPATCHED,
      OrderStatus.DELIVERED,
    ];
  } else if (tab === "pending") {
    statusFilter = [OrderStatus.ASSIGNED];
  } else if (tab === "loading") {
    statusFilter = [OrderStatus.LOADING];
  } else if (tab === "completed") {
    statusFilter = [
      OrderStatus.LOADED,
      OrderStatus.DISPATCHED,
      OrderStatus.DELIVERED,
    ];
  }

  // Fetch orders with STRICT ZERO-FINANCIAL projection
  const orders = await prisma.order.findMany({
    where: {
      ...baseWhere,
      status: { in: statusFilter },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNo: true,
      quantity: true,
      loadedQuantity: true,
      status: true,
      deliveryAddress: true,
      requestedDate: true,
      notes: true,
      totalCbm: true,
      adhesiveBags: true,
      createdAt: true,
      customer: {
        select: {
          name: true,
          companyName: true,
        },
      },
      product: {
        select: {
          name: true,
          sizeLabel: true,
          dimensions: true,
          cbmPerBlock: true,
        },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          totalCbm: true,
          product: {
            select: {
              name: true,
              category: true,
              sizeLabel: true,
              bagWeightKg: true,
            },
          },
        },
      },
      transport: {
        select: {
          truckNumber: true,
          transporterName: true,
          driverName: true,
          driverMobile: true,
          expectedDelivery: true,
          assignedAt: true,
        },
      },
    },
  });

  // Recent loading activity events
  const recentEvents = await prisma.orderEvent.findMany({
    where: {
      order: { assignedStaffId: session.id },
      status: { in: [OrderStatus.LOADING, OrderStatus.LOADED] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      order: {
        select: {
          orderNo: true,
          product: { select: { sizeLabel: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 min-w-0 max-w-full">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 rounded-3xl bg-navy p-5 sm:p-6 text-white sm:flex-row sm:items-center sm:justify-between shadow-lg min-w-0">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200">
            <Truck className="h-3.5 w-3.5" /> Yard Loading Portal
          </span>
          <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight">Loading Staff Dashboard</h1>
          <p className="text-xs text-slate-300">
            Assigned truck tasks, real-time physical counts, and verified dispatch staging.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="rounded-2xl bg-white/10 px-3.5 py-2 text-center min-w-[90px]">
            <span className="text-[10px] text-slate-300 uppercase font-semibold">Today Assigned</span>
            <p className="text-lg sm:text-xl font-black text-amber-300">{todayAssigned}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3.5 py-2 text-center min-w-[90px]">
            <span className="text-[10px] text-slate-300 uppercase font-semibold">Total Tasks</span>
            <p className="text-lg sm:text-xl font-black text-white">{totalAssigned}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{decodeURIComponent(error)}</span>
        </div>
      ) : null}

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4 min-w-0">
        <Link
          href="/staff/dashboard?tab=pending"
          className={`rounded-2xl border p-3 sm:p-4 transition-all min-w-0 flex flex-col justify-between ${
            tab === "pending"
              ? "border-amber-400 bg-amber-50/50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Pending Loading</span>
            <Clock className="h-4 w-4 shrink-0 ml-1" />
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-black text-navy truncate">{pendingLoading}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate">Waiting to start</span>
        </Link>

        <Link
          href="/staff/dashboard?tab=loading"
          className={`rounded-2xl border p-3 sm:p-4 transition-all min-w-0 flex flex-col justify-between ${
            tab === "loading"
              ? "border-indigo-400 bg-indigo-50/50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Currently Loading</span>
            <PlayCircle className="h-4 w-4 shrink-0 ml-1" />
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-black text-navy truncate">{currentlyLoading}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate">In yard progress</span>
        </Link>

        <Link
          href="/staff/dashboard?tab=completed"
          className={`rounded-2xl border p-3 sm:p-4 transition-all min-w-0 flex flex-col justify-between ${
            tab === "completed"
              ? "border-emerald-400 bg-emerald-50/50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Completed</span>
            <CheckCircle2 className="h-4 w-4 shrink-0 ml-1" />
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-black text-navy truncate">{completedLoading}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate">Staged & dispatched</span>
        </Link>

        <Link
          href="/staff/dashboard?tab=all"
          className={`rounded-2xl border p-3 sm:p-4 transition-all min-w-0 flex flex-col justify-between ${
            tab === "all"
              ? "border-navy bg-slate-50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-navy">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">All History</span>
            <Truck className="h-4 w-4 shrink-0 ml-1" />
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-black text-navy truncate">{totalAssigned}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate">Lifetime assignments</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "active", label: `Active Tasks (${pendingLoading + currentlyLoading})` },
          { key: "pending", label: `Pending (${pendingLoading})` },
          { key: "loading", label: `In Progress (${currentlyLoading})` },
          { key: "completed", label: `Completed (${completedLoading})` },
          { key: "all", label: `All Orders (${totalAssigned})` },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/staff/dashboard?tab=${t.key}`}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              tab === t.key
                ? "bg-navy text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Assigned Orders List */}
      <div className="space-y-4">
        {orders.map((o) => {
          const isShortage = o.loadedQuantity > 0 && o.loadedQuantity < o.quantity;
          return (
            <Link
              key={o.id}
              href={`/staff/orders/${o.id}`}
              className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#1E72A8] hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-navy group-hover:text-[#1E72A8] transition-colors">
                      {o.orderNo}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                        ORDER_STATUS_CLASS[o.status]
                      }`}
                    >
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                    {isShortage ? (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        Partial Shortage
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Customer: {o.customer.companyName || o.customer.name}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs font-bold text-[#1E72A8] group-hover:underline">
                    View & Action Task →
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-navy group-hover:bg-[#1E72A8] group-hover:text-white transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Vehicle & Logistics Details Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5 sm:grid-cols-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    Truck Number
                  </span>
                  <p className="mt-0.5 font-black text-navy">
                    {o.transport?.truckNumber || "Pending Assignment"}
                  </p>
                  {o.transport?.transporterName ? (
                    <span className="text-[10px] text-slate-500 truncate block">
                      {o.transport.transporterName}
                    </span>
                  ) : null}
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    Driver Info
                  </span>
                  <p className="mt-0.5 font-bold text-navy truncate">
                    {o.transport?.driverName || "TBA"}
                  </p>
                  {o.transport?.driverMobile ? (
                    <span className="text-[11px] font-medium text-slate-500">
                      {o.transport.driverMobile}
                    </span>
                  ) : null}
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    {o.items && o.items.length > 1 ? "Order Items" : "Block Size"}
                  </span>
                  {o.items && o.items.length > 0 ? (
                    <p className="mt-0.5 font-bold text-navy text-xs">
                      {o.items.map((it) => it.product.sizeLabel || it.product.name).join(", ")}
                    </p>
                  ) : (
                    <>
                      <p className="mt-0.5 font-bold text-navy">{o.product?.sizeLabel || "Standard"}</p>
                      <span className="text-[10px] text-slate-500">{o.product?.dimensions || "-"}</span>
                    </>
                  )}
                  {o.totalCbm ? (
                    <span className="text-[11px] font-bold text-[#1E72A8] block mt-0.5">
                      {Number(o.totalCbm).toFixed(3)} m³ CBM
                    </span>
                  ) : null}
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    Order Quantity & Morter
                  </span>
                  <p className="mt-0.5 font-black text-navy font-mono">
                    {formatNumber(o.quantity)} blocks
                  </p>
                  <span className="text-[11px] font-bold text-sky-800 block mt-0.5">
                    Block Jointing Morter: {o.adhesiveBags ?? 0} Bags (40 KG)
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Physical Count
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                <span className="truncate max-w-md">
                  📍 Delivery Site: {o.deliveryAddress}
                </span>
                <span className="shrink-0 text-[11px] text-slate-400">
                  Assigned: {formatDate(o.transport?.assignedAt || o.createdAt)}
                </span>
              </div>
            </Link>
          );
        })}

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
            <p className="text-base font-bold text-navy">No loading tasks in this view</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {tab === "active"
                ? "All assigned loading tasks are up to date. New assigned trucks will appear here instantly."
                : "No orders match the selected filter."}
            </p>
          </div>
        ) : null}
      </div>

      {/* Recent Activity Log Section */}
      {recentEvents.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-[#1E72A8]" />
              Recent Loading Activity
            </h3>
            <span className="text-xs text-slate-400">Latest actions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {recentEvents.map((evt) => (
              <div key={evt.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy">{evt.order.orderNo}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        ORDER_STATUS_CLASS[evt.status]
                      }`}
                    >
                      {evt.title}
                    </span>
                  </div>
                  {evt.note ? <p className="mt-1 text-slate-600">{evt.note}</p> : null}
                </div>
                <span className="shrink-0 text-slate-400 text-[11px]">
                  {formatDate(evt.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
