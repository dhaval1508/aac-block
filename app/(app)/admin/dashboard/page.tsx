import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Boxes,
  ShoppingCart,
  Receipt,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Layers,
  Truck,
  CheckCircle2,
  Clock,
  Activity as ActivityIcon,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getStockBySize, getStockSummary } from "@/lib/data";
import {
  formatDate,
  formatNumber,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
} from "@/lib/utils";
import { OrderStatus, Role, StockType } from "@prisma/client";
import { resolveDateRange, buildPrismaDateFilter } from "@/lib/date-utils";
import { DateRangeFilter } from "@/components/date-range-filter";
import { DashboardCharts } from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const dateRange = resolveDateRange(params.preset, params.from, params.to);
  const orderDateFilter = buildPrismaDateFilter(dateRange);

  // Prisma date filters
  const orderWhere: any = orderDateFilter ? { createdAt: orderDateFilter } : {};
  const movementWhere: any = orderDateFilter ? { createdAt: orderDateFilter } : {};

  // Parallel database execution
  const [
    stockSummary,
    products,
    totalCustomers,
    totalStaff,
    totalProducts,
    allOrdersCount,
    periodOrders,
    periodStockIn,
    periodStockOut,
    // Recent records
    recentOrders,
    recentMovements,
    recentActivities,
  ] = await Promise.all([
    getStockSummary(),
    getStockBySize(),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.user.count({ where: { role: { in: [Role.STAFF, Role.STOCKER] } } }),
    prisma.product.count(),
    prisma.order.count(),
    // Period Orders
    prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    }),
    // Period Stock In
    prisma.stockMovement.aggregate({
      where: { ...movementWhere, type: StockType.IN },
      _sum: { quantityDelta: true },
    }),
    // Period Stock Out
    prisma.stockMovement.aggregate({
      where: { ...movementWhere, type: StockType.OUT },
      _sum: { quantityDelta: true },
    }),
    // Recent orders
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, companyName: true } },
        product: { select: { sizeLabel: true, dimensions: true, cbmPerBlock: true } },
        transport: { select: { truckNumber: true, driverName: true } },
      },
    }),
    // Recent movements
    prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { sizeLabel: true } },
        order: { select: { orderNo: true } },
        createdBy: { select: { name: true } },
      },
    }),
    // Recent audit events
    prisma.orderEvent.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { orderNo: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  // Period Orders by Status
  const statusCounts = {
    pending: periodOrders.filter((o) => o.status === OrderStatus.PENDING).length,
    confirmed: periodOrders.filter((o) => o.status === OrderStatus.CONFIRMED).length,
    assigned: periodOrders.filter((o) => o.status === OrderStatus.ASSIGNED).length,
    loading: periodOrders.filter((o) => o.status === OrderStatus.LOADING).length,
    loaded: periodOrders.filter((o) => o.status === OrderStatus.LOADED).length,
    dispatched: periodOrders.filter((o) => o.status === OrderStatus.DISPATCHED).length,
    delivered: periodOrders.filter((o) => o.status === OrderStatus.DELIVERED).length,
  };

  const isFiltered = dateRange.preset !== "all_time";
  const inboundTotal = Number(periodStockIn._sum.quantityDelta ?? 0);
  const outboundTotal = Number(periodStockOut._sum.quantityDelta ?? 0);

  // Low stock alert products (< 500 blocks)
  const lowStockProducts = products.filter((p) => p.currentStock < 500);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 min-w-0 max-w-full">
      {/* =========================================================================
          TOP COMMAND HEADER WITH GLOBAL ADVANCED DATE FILTER
      ========================================================================= */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
              Swarnim AAC Command Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manufacturing dispatch operations, live physical yard inventory, and vehicle staging.
          </p>
        </div>

        {/* Global Date Filter & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
          <DateRangeFilter />

          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 rounded-2xl bg-[#13789B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all shrink-0"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Manage Orders</span>
          </Link>

          <Link
            href="/admin/stock"
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all shrink-0"
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>Stock In / Out</span>
          </Link>
        </div>
      </div>

      {/* Filter Period Alert Banner if not default this_month */}
      {dateRange.preset !== "this_month" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-[#13789B]/20 bg-[#13789B]/5 px-3.5 sm:px-4 py-2.5 text-xs text-navy shadow-2xs min-w-0">
          <div className="flex items-center gap-2 font-medium min-w-0">
            <Calendar className="h-4 w-4 text-[#13789B] shrink-0" />
            <span className="truncate">
              Active Filter: Showing analytics for <strong className="font-bold text-[#13789B]">{dateRange.label}</strong>
            </span>
          </div>
          <Link
            href="/admin/dashboard?preset=this_month"
            className="font-bold text-[#13789B] hover:underline text-[11px] shrink-0"
          >
            Reset to This Month
          </Link>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: OPERATIONAL YARD & DISPATCH VELOCITY TILES
      ========================================================================= */}
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Truck className="h-4 w-4 text-[#13789B] shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
              Plant Dispatch Velocity & Yard Throughput
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0">
            {isFiltered ? `Period: ${dateRange.label}` : "All Time Operations"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 min-w-0">
          {/* 1. In Transit */}
          <div className="card rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs border-l-4 border-l-indigo-600 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Dispatched / On Road
              </span>
              <Truck className="h-4 w-4 text-indigo-600 shrink-0" />
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-black text-indigo-700 tracking-tight truncate">
              {statusCounts.dispatched} <span className="text-xs font-semibold text-slate-400">vehicles</span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 truncate">Active truck dispatches in transit</p>
          </div>

          {/* 2. Staging & Yard Loading */}
          <div className="card rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs border-l-4 border-l-purple-600 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Staged / Loading Queue
              </span>
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-black text-purple-700 tracking-tight truncate">
              {statusCounts.assigned + statusCounts.loading + statusCounts.loaded} <span className="text-xs font-semibold text-slate-400">orders</span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 truncate">Active yard loading assignments</p>
          </div>

          {/* 3. Pending Review */}
          <div className="card rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs border-l-4 border-l-amber-500 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Pending Verification
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-black text-amber-600 tracking-tight truncate">
              {statusCounts.pending} <span className="text-xs font-semibold text-slate-400">orders</span>
            </div>
            <p className="mt-0.5 text-[11px] text-amber-700 font-medium truncate">Awaiting plant admin review</p>
          </div>

          {/* 4. Live Available Stock */}
          <div className="card rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs border-l-4 border-l-emerald-600 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Physical Available Stock
              </span>
              <Boxes className="h-4 w-4 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-black text-navy tracking-tight truncate">
              {formatNumber(stockSummary.current)} <span className="text-xs font-semibold text-slate-400">blocks</span>
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-600 font-semibold truncate">Live physical blocks in yard</p>
          </div>

          {/* 5. Production Intake */}
          <div className="card rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs border-l-4 border-l-teal-600 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                {isFiltered ? "Period Inflow" : "Total Inflow"}
              </span>
              <TrendingUp className="h-4 w-4 text-teal-600 shrink-0" />
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-black text-teal-700 tracking-tight truncate">
              {inboundTotal > 0 ? `+${formatNumber(inboundTotal)}` : "0"} <span className="text-xs font-semibold text-slate-400">blocks</span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 truncate">Autoclave manufacturing intake</p>
          </div>

          {/* 6. Dispatches & Yard Outflows */}
          <div className="card rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs border-l-4 border-l-blue-600 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                {isFiltered ? "Period Outflow" : "Total Outflow"}
              </span>
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-black text-navy tracking-tight truncate">
              {outboundTotal > 0 ? `-${formatNumber(outboundTotal)}` : "0"} <span className="text-xs font-semibold text-slate-400">blocks</span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 truncate">Truck shipments & dispatches</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: OPERATIONS KPI TILES (Physical Yard & Manufacturing)
      ========================================================================= */}
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Boxes className="h-4 w-4 text-[#13789B] shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
              Yard Operations & Ecosystem Metrics
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
          <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-3.5 shadow-xs min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate block">Period Orders</span>
            <div className="mt-1 text-lg sm:text-xl font-black text-navy truncate">{periodOrders.length}</div>
            <span className="text-[10px] text-slate-400 truncate block">Total bookings</span>
          </div>

          <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-3.5 shadow-xs min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 truncate block">Pending Review</span>
            <div className="mt-1 text-lg sm:text-xl font-black text-amber-600 truncate">{statusCounts.pending}</div>
            <span className="text-[10px] text-slate-400 truncate block">Awaiting approval</span>
          </div>

          <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-3.5 shadow-xs min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 truncate block">Confirmed</span>
            <div className="mt-1 text-lg sm:text-xl font-black text-blue-600 truncate">{statusCounts.confirmed}</div>
            <span className="text-[10px] text-slate-400 truncate block">Plant verified</span>
          </div>

          <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-3.5 shadow-xs min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 truncate block">Staged / Loading</span>
            <div className="mt-1 text-lg sm:text-xl font-black text-purple-600 truncate">
              {statusCounts.assigned + statusCounts.loading + statusCounts.loaded}
            </div>
            <span className="text-[10px] text-slate-400 truncate block">Active yard tasks</span>
          </div>

          <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-3.5 shadow-xs min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 truncate block">Dispatched</span>
            <div className="mt-1 text-lg sm:text-xl font-black text-indigo-600 truncate">{statusCounts.dispatched}</div>
            <span className="text-[10px] text-slate-400 truncate block">In truck transit</span>
          </div>

          <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-3.5 shadow-xs min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 truncate block">Delivered</span>
            <div className="mt-1 text-lg sm:text-xl font-black text-emerald-600 truncate">{statusCounts.delivered}</div>
            <span className="text-[10px] text-slate-400 truncate block">Site confirmed</span>
          </div>

          <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-3.5 shadow-xs min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate block">Available Stock</span>
            <div className="mt-1 text-lg sm:text-xl font-black text-navy truncate">{formatNumber(stockSummary.current)}</div>
            <span className="text-[10px] text-emerald-600 font-bold truncate block">Physical blocks</span>
          </div>

          <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-3.5 shadow-xs min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate block">Active Clients</span>
            <div className="mt-1 text-lg sm:text-xl font-black text-navy truncate">{totalCustomers}</div>
            <span className="text-[10px] text-slate-400 truncate block">Builders registered</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: REAL-TIME INTERACTIVE ANALYTICS CHARTS
      ========================================================================= */}
      <DashboardCharts
        ordersByStatus={statusCounts}
        stockMovementTotals={{
          inboundTotal,
          outboundTotal,
        }}
        periodLabel={dateRange.label}
      />

      {/* =========================================================================
          SECTION 4: 7-STAGE ORDER EXECUTION PIPELINE STEPPER
      ========================================================================= */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 min-w-0">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-navy uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#13789B] shrink-0" />
              Order Execution Pipeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visual fulfillment stages from builder booking to site delivery.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-[#13789B] hover:underline shrink-0"
          >
            View All ({periodOrders.length}) →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5 min-w-0">
          {[
            { label: "Pending", count: statusCounts.pending, color: "border-amber-300 bg-amber-50/50 text-amber-700", status: "PENDING" },
            { label: "Confirmed", count: statusCounts.confirmed, color: "border-blue-300 bg-blue-50/50 text-blue-700", status: "CONFIRMED" },
            { label: "Assigned", count: statusCounts.assigned, color: "border-indigo-300 bg-indigo-50/50 text-indigo-700", status: "ASSIGNED" },
            { label: "Loading", count: statusCounts.loading, color: "border-purple-300 bg-purple-50/50 text-purple-700", status: "LOADING" },
            { label: "Loaded", count: statusCounts.loaded, color: "border-teal-300 bg-teal-50/50 text-teal-700", status: "LOADED" },
            { label: "Dispatched", count: statusCounts.dispatched, color: "border-slate-300 bg-slate-50 text-slate-700", status: "DISPATCHED" },
            { label: "Delivered", count: statusCounts.delivered, color: "border-emerald-300 bg-emerald-50/50 text-emerald-700", status: "DELIVERED" },
          ].map((stage, idx) => (
            <Link
              key={idx}
              href={`/admin/orders?status=${stage.status}`}
              className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 sm:p-3.5 text-center transition-all hover:scale-[1.02] shadow-2xs min-w-0 ${stage.color}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 truncate block w-full">
                {stage.label}
              </span>
              <span className="mt-1 text-xl sm:text-2xl font-black tracking-tight truncate">
                {stage.count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Low Stock Warning Alert if any */}
      {lowStockProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 sm:p-4 text-amber-900 shadow-2xs min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 truncate">
                Low Yard Stock Alert ({lowStockProducts.length} Specification{lowStockProducts.length > 1 ? "s" : ""})
              </p>
              <p className="text-xs text-amber-700 mt-0.5 truncate">
                {lowStockProducts.map((p) => `${p.sizeLabel} (${p.currentStock} blocks)`).join(", ")}
              </p>
            </div>
          </div>
          <Link
            href="/admin/stock"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-3 py-1.5 rounded-xl self-start sm:self-auto transition-colors shrink-0"
          >
            Add Stock Now <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: LIVE STOCK & DIMENSIONS BY BLOCK SIZE
      ========================================================================= */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-navy uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#13789B] shrink-0" />
              Live Yard Inventory & Dimension Specifications
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configured dimensions, automatic unit volume (CBM), and physical stack count per specification.
            </p>
          </div>
          <Link
            href="/admin/products"
            className="text-xs font-bold text-[#13789B] hover:underline shrink-0"
          >
            Manage Catalog ({totalProducts}) →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 min-w-0">
          {products.map((p) => {
            const isLow = p.currentStock < 500;
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-3.5 hover:border-[#13789B] transition-all flex flex-col justify-between min-w-0"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <span className="font-bold text-navy text-xs truncate block">{p.sizeLabel}</span>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{p.dimensions}</p>
                    </div>
                    <span className="text-xs font-black text-[#13789B] shrink-0">
                      {Number(p.cbmPerBlock).toFixed(4)} m³
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between gap-1">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block truncate">Available Stack</span>
                      <span className="text-base sm:text-lg font-black text-navy truncate block">
                        {formatNumber(p.currentStock)}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isLow ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isLow ? "Low Stock" : "In Stock"}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex justify-between text-[10px] text-slate-400">
                  <span>{Number(p.cbmPerBlock).toFixed(4)} CBM</span>
                  <span>{Number(p.blocksPerCbm).toFixed(1)} blk/CBM</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 6: RECENT FACTORY ORDERS & AUDIT FEEDS
      ========================================================================= */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 min-w-0">
        {/* Recent Factory Orders (2 columns on desktop) */}
        <div className="lg:col-span-2 card rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <h3 className="text-sm font-black text-navy uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[#13789B] shrink-0" />
                Recent Factory Orders
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest construction vehicle dispatches</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-[#13789B] hover:underline shrink-0"
            >
              View All ({allOrdersCount}) →
            </Link>
          </div>

          <div className="space-y-2.5 min-w-0">
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 p-3 sm:p-3.5 hover:bg-slate-50 hover:border-slate-200 transition-all group min-w-0"
              >
                <div className="min-w-0 pr-2 sm:pr-3 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="font-bold text-navy text-xs font-mono">{o.orderNo}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        ORDER_STATUS_CLASS[o.status]
                      }`}
                    >
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                    {o.invoiceNo && (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                        {o.invoiceNo}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-700 font-semibold truncate">
                    {o.customer.companyName || o.customer.name} · {formatNumber(o.quantity)} blocks ({o.product.sizeLabel})
                  </p>
                  {o.transport && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Truck: {o.transport.truckNumber} ({o.transport.driverName})
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className="text-right">
                    <span className="font-black text-navy text-xs block">
                      {formatNumber(o.quantity)} blk
                    </span>
                    <span className="text-[10px] text-[#13789B] font-bold">
                      {o.product.sizeLabel}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-navy transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Dual Feeds: Stock Movements & Milestones (1 column) */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5 min-w-0">
          {/* Stock Movements Feed */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-[#13789B]" />
                Stock Shifts
              </span>
              <Link href="/admin/stock" className="text-[11px] font-bold text-[#13789B] hover:underline">
                Yard Log →
              </Link>
            </div>
            <div className="space-y-2">
              {recentMovements.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-100 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy truncate max-w-[130px]">
                      {m.product.sizeLabel}
                    </span>
                    <span
                      className={`font-black text-xs ${
                        m.quantityDelta > 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {m.quantityDelta > 0 ? `+${formatNumber(m.quantityDelta)}` : formatNumber(m.quantityDelta)}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span className="truncate max-w-[120px]">{m.note || m.type}</span>
                    <span>{formatDate(m.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Events Feed */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5">
                <ActivityIcon className="h-3.5 w-3.5 text-purple-600" />
                Audit Trail
              </span>
              <Link href="/admin/activity" className="text-[11px] font-bold text-[#13789B] hover:underline">
                Full Feed →
              </Link>
            </div>
            <div className="space-y-2">
              {recentActivities.map((e) => (
                <div key={e.id} className="rounded-xl border border-slate-100 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy font-mono text-[11px]">
                      {e.order.orderNo}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">{e.title}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span className="truncate max-w-[140px]">{e.createdBy?.name || "System"}</span>
                    <span>{formatDate(e.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
