import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Truck,
  CheckCircle2,
  Clock,
  ChevronRight,
  PlayCircle,
  AlertCircle,
  Activity as ActivityIcon,
  Boxes,
  Inbox,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getMortarStock } from "@/lib/data";
import { claimOrderAction } from "@/lib/actions/orders";
import {
  formatDate,
  formatNumber,
  formatBlockSizeName,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  mapsHref,
} from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import { OpenLocationButton } from "@/components/open-location-button";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session || !["STAFF", "STOCKER", "ADMIN"].includes(session.role)) redirect("/login");

  const { tab = "active", error } = await searchParams;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Strict role filter: staff sees their assigned orders
  const baseWhere = {
    assignedStaffId: session.id,
  };

  // Shared Yard Queue: Placed orders waiting for confirmation, and Confirmed orders waiting for staging/loading
  const queueWhere = {
    OR: [
      { status: OrderStatus.PENDING },
      { status: OrderStatus.CONFIRMED },
      { status: OrderStatus.ASSIGNED, assignedStaffId: null },
    ],
  };

  // Metrics and yard inventory calculation
  const [
    confirmedQueueCount,
    totalAssigned,
    pendingLoading,
    currentlyLoading,
    completedLoading,
    todayAssigned,
    products,
    mortarStock,
  ] = await Promise.all([
    prisma.order.count({ where: queueWhere }),
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
    prisma.product.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { widthMm: "asc" },
      select: {
        id: true,
        name: true,
        sizeLabel: true,
        dimensions: true,
        cbmPerBlock: true,
        blocksPerCbm: true,
        movements: { select: { quantityDelta: true } },
      },
    }),
    getMortarStock(),
  ]);

  // Tab filtering & query construction
  let queryWhere: any;
  if (tab === "queue") {
    queryWhere = queueWhere;
  } else if (tab === "all") {
    queryWhere = {
      ...baseWhere,
      status: {
        in: [
          OrderStatus.ASSIGNED,
          OrderStatus.LOADING,
          OrderStatus.LOADED,
          OrderStatus.DISPATCHED,
          OrderStatus.DELIVERED,
        ],
      },
    };
  } else if (tab === "pending") {
    queryWhere = { ...baseWhere, status: OrderStatus.ASSIGNED };
  } else if (tab === "loading") {
    queryWhere = { ...baseWhere, status: OrderStatus.LOADING };
  } else if (tab === "completed") {
    queryWhere = {
      ...baseWhere,
      status: {
        in: [
          OrderStatus.LOADED,
          OrderStatus.DISPATCHED,
          OrderStatus.DELIVERED,
        ],
      },
    };
  } else {
    // default: "active" tasks
    queryWhere = {
      ...baseWhere,
      status: { in: [OrderStatus.ASSIGNED, OrderStatus.LOADING] },
    };
  }

  // Fetch orders with STRICT ZERO-FINANCIAL projection
  const orders = await prisma.order.findMany({
    where: queryWhere,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNo: true,
      dcNumber: true,
      invoiceNo: true,
      quantity: true,
      loadedQuantity: true,
      loadedCbm: true,
      status: true,
      deliveryAddress: true,
      requestedDate: true,
      notes: true,
      totalCbm: true,
      adhesiveBags: true,
      assignedStaffId: true,
      assignedStaff: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      googlePlaceId: true,
      latitude: true,
      longitude: true,
      formattedAddress: true,
      customSiteName: true,
      villageArea: true,
      city: true,
      nearbyLandmark: true,
      locationSource: true,
      createdAt: true,
      confirmedAt: true,
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
      weighbridgeSlip: true,
      loadingRecord: true,
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
            <Truck className="h-3.5 w-3.5" /> Loading & Stock Staff Portal
          </span>
          <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight">Loading & Stock Staff Dashboard</h1>
          <p className="text-xs text-slate-300">
            Assigned loading tasks, weighbridge slips, vehicle staging, and factory yard inventory.
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

      {/* Live Yard Stock Overview for Combined Role */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-[#13789B]">
              <Boxes className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-navy">Factory Yard Stock Availability</h2>
              <p className="text-[11px] text-slate-500">Live physical stock for order loading verification</p>
            </div>
          </div>
          <Link
            href="/stocker/stock"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#13789B] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all self-start sm:self-auto"
          >
            <span>Record Stock Movement</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {products.map((p) => {
            const blockQty = p.movements?.reduce((sum, m) => sum + (m.quantityDelta || 0), 0) ?? 0;
            const cbmPerBlock = Number(p.cbmPerBlock) || 0.018;
            const cbmQty = Number((blockQty * cbmPerBlock).toFixed(3));
            return (
              <div key={p.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                  {formatBlockSizeName(p.sizeLabel)}
                </span>
                <div className="font-black text-navy text-sm font-mono truncate">
                  {cbmQty.toFixed(3)} CBM
                </div>
                <div className="text-[10px] text-slate-400 italic truncate">
                  ≈ {formatNumber(blockQty)} Blocks
                </div>
              </div>
            );
          })}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-2.5 space-y-1">
            <span className="text-[10px] font-bold text-[#13789B] uppercase block truncate">
              Mortar (40 KG Bags)
            </span>
            <div className="font-black text-navy text-sm font-mono truncate">
              {formatNumber(mortarStock?.stock ?? 0)} Bags
            </div>
            <div className="text-[10px] text-slate-500 italic truncate">
              Thin-Bed Jointing
            </div>
          </div>
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-5 min-w-0">
        <Link
          href="/staff/dashboard?tab=queue"
          className={`rounded-2xl border p-3 sm:p-4 transition-all min-w-0 flex flex-col justify-between ${
            tab === "queue"
              ? "border-amber-500 bg-amber-50 shadow-sm"
              : confirmedQueueCount > 0
              ? "border-amber-300 bg-amber-50/50 hover:border-amber-400"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Yard Queue</span>
            <Inbox className="h-4 w-4 shrink-0 ml-1" />
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-black text-navy truncate">{confirmedQueueCount}</p>
          <span className="text-[10px] sm:text-[11px] text-amber-800 font-semibold truncate">Placed & Confirmed</span>
        </Link>

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

      {/* Confirmed Orders Alert Banner if not on queue tab */}
      {confirmedQueueCount > 0 && tab !== "queue" && (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white font-black text-base shadow-sm">
              {confirmedQueueCount}
            </span>
            <div>
              <p className="text-sm font-black text-amber-950">
                {confirmedQueueCount} Confirmed {confirmedQueueCount === 1 ? "Order is" : "Orders are"} Ready for Staging & Loading
              </p>
              <p className="text-xs text-amber-800">
                Super Admin has confirmed orders waiting in the factory yard queue.
              </p>
            </div>
          </div>
          <Link
            href="/staff/dashboard?tab=queue"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-black text-white shadow-xs transition-colors self-start sm:self-auto shrink-0"
          >
            <span>Open Confirmed Queue</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "queue", label: `⚡ Yard Queue / Orders (${confirmedQueueCount})`, isQueue: true },
          { key: "active", label: `My Active Tasks (${pendingLoading + currentlyLoading})` },
          { key: "pending", label: `Pending Loading (${pendingLoading})` },
          { key: "loading", label: `In Progress (${currentlyLoading})` },
          { key: "completed", label: `Completed (${completedLoading})` },
          { key: "all", label: `All My Tasks (${totalAssigned})` },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/staff/dashboard?tab=${t.key}`}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              tab === t.key
                ? t.isQueue
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-navy text-white shadow-xs"
                : t.isQueue && confirmedQueueCount > 0
                ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-black"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Section Header */}
      {tab === "queue" ? (
        <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-black text-navy flex items-center gap-2">
              <Inbox className="h-4 w-4 text-amber-600" />
              Yard Queue / Placed & Confirmed Orders
            </h2>
            <p className="text-xs text-slate-600">
              Placed orders awaiting confirmation and confirmed orders ready for vehicle staging & loading.
            </p>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
            {confirmedQueueCount} Waiting in Yard
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-navy">
            {tab === "active" ? "My Assigned Orders" : "Order Tasks"}
          </h2>
          <span className="text-xs text-slate-400">{orders.length} orders shown</span>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((o) => {
          const isShortage = o.loadedQuantity > 0 && o.loadedQuantity < o.quantity;
          const isQueueItem = tab === "queue" || o.status === OrderStatus.CONFIRMED;
          return (
            <Link
              key={o.id}
              href={`/staff/orders/${o.id}`}
              className={`group block rounded-3xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                isQueueItem ? "border-amber-200 hover:border-amber-400" : "border-slate-200 hover:border-[#1E72A8]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
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
                    {o.assignedStaff ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        <UserCheck className="h-3 w-3" />
                        <span>{o.assignedStaff.id === session.id ? "Assigned to You" : o.assignedStaff.name}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                        ⚡ Unassigned Yard Queue
                      </span>
                    )}
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
                  <span className={`text-xs font-black ${isQueueItem ? "text-amber-700" : "text-[#1E72A8]"} group-hover:underline`}>
                    {isQueueItem ? "Stage Truck / Start Loading →" : "View & Action Task →"}
                  </span>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-2xl text-white transition-colors ${
                    isQueueItem ? "bg-amber-600 group-hover:bg-amber-700" : "bg-slate-100 text-navy group-hover:bg-[#1E72A8] group-hover:text-white"
                  }`}>
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
                      {o.items.map((it) => formatBlockSizeName(it.product.sizeLabel) || it.product.name).join(", ")}
                    </p>
                  ) : (
                    <>
                      <p className="mt-0.5 font-bold text-navy">{o.product?.sizeLabel ? formatBlockSizeName(o.product.sizeLabel) : "Standard"}</p>
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
                    Order Quantity & Mortar
                  </span>
                  <p className="mt-0.5 font-black text-navy font-mono text-base">
                    {o.totalCbm ? `${Number(o.totalCbm).toFixed(3)} CBM` : `${formatNumber(o.quantity)} blocks`}
                  </p>
                  <p className="text-[11px] text-slate-500 italic">
                    ≈ {formatNumber(o.quantity)} Blocks
                  </p>
                  <span className="text-[11px] font-bold text-sky-800 block mt-0.5">
                    Block Jointing Mortar: {o.adhesiveBags ?? 0} Bags (40 KG)
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 pt-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-600 truncate max-w-md">
                    📍 <strong>Site:</strong> {o.deliveryAddress}
                  </span>
                  <OpenLocationButton
                    address={o.deliveryAddress}
                    latitude={o.latitude ? Number(o.latitude) : null}
                    longitude={o.longitude ? Number(o.longitude) : null}
                    variant="badge"
                  />
                  {o.dcNumber && (
                    <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-800">
                      Challan: {o.dcNumber}
                    </span>
                  )}
                  {o.weighbridgeSlip && (
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      ⚖️ Slip RST #{o.weighbridgeSlip.rstNumber} ({Number(o.weighbridgeSlip.netWeightKg).toLocaleString()} KG)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
                  <span>Assigned: {formatDate(o.transport?.assignedAt || o.createdAt)}</span>
                </div>
              </div>
            </Link>
          );
        })}

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
            <p className="text-base font-bold text-navy">
              {tab === "queue" ? "Yard Queue is Clear" : "No loading tasks in this view"}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {tab === "queue"
                ? "No unassigned confirmed orders waiting in the factory yard queue. New confirmed orders will appear here automatically."
                : tab === "active"
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
