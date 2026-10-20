import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronRight,
  Search,
  Filter,
  X,
  ShoppingCart,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  PlusCircle,
  Calendar,
  CreditCard,
  ArrowUpDown,
  RotateCcw,
  FileDown,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  formatDate,
  formatNumber,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
} from "@/lib/utils";
import { resolveDateRange, buildPrismaDateFilter } from "@/lib/date-utils";
import { DateRangeFilter } from "@/components/date-range-filter";
import { OrdersFilterToolbar } from "@/components/orders-filter-toolbar";

export const dynamic = "force-dynamic";

const STATUS_TABS: Array<{ key: string; label: string; status?: OrderStatus }> = [
  { key: "all", label: "All Orders" },
  { key: "pending", label: "Pending", status: OrderStatus.PENDING },
  { key: "confirmed", label: "Confirmed", status: OrderStatus.CONFIRMED },
  { key: "assigned", label: "Assigned", status: OrderStatus.ASSIGNED },
  { key: "loading", label: "Loading", status: OrderStatus.LOADING },
  { key: "loaded", label: "Loaded", status: OrderStatus.LOADED },
  { key: "dispatched", label: "Dispatched", status: OrderStatus.DISPATCHED },
  { key: "delivered", label: "Delivered", status: OrderStatus.DELIVERED },
  { key: "rejected", label: "Rejected", status: OrderStatus.REJECTED },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    preset?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const {
    status = "all",
    q = "",
    preset,
    from,
    to,
    sort = "newest",
    page = "1",
  } = params;

  const dateRange = resolveDateRange(preset, from, to);
  const dateFilter = buildPrismaDateFilter(dateRange);

  const currentTab = STATUS_TABS.find((t) => t.key === status) ?? STATUS_TABS[0];

  const whereClause: any = {};
  if (currentTab.status) {
    whereClause.status = currentTab.status;
  }

  if (dateFilter) {
    whereClause.createdAt = dateFilter;
  }

  if (q.trim()) {
    const term = q.trim();
    whereClause.OR = [
      { orderNo: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { customer: { companyName: { contains: term, mode: "insensitive" } } },
      { transport: { truckNumber: { contains: term, mode: "insensitive" } } },
      { transport: { driverName: { contains: term, mode: "insensitive" } } },
    ];
  }

  const pageSize = 20;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const skip = (currentPage - 1) * pageSize;

  const orderBy = sort === "oldest" ? { createdAt: "asc" as const } : { createdAt: "desc" as const };

  const [orders, filteredTotalCount, statusGroups, allOrdersSummary] = await Promise.all([
    prisma.order.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: pageSize,
      include: {
        customer: { select: { name: true, companyName: true, mobile: true } },
        product: { select: { sizeLabel: true, dimensions: true, cbmPerBlock: true } },
        transport: true,
        assignedStaff: { select: { name: true } },
        items: { select: { id: true } },
      },
    }),
    prisma.order.count({ where: whereClause }),
    prisma.order.groupBy({
      by: ["status"],
      where: dateFilter ? { createdAt: dateFilter } : {},
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: dateFilter ? { createdAt: dateFilter } : {},
      _count: { id: true },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const c of statusGroups) {
    countMap[c.status] = c._count.id;
  }

  const pendingCount = countMap[OrderStatus.PENDING] ?? 0;
  const inProgressCount =
    (countMap[OrderStatus.CONFIRMED] ?? 0) +
    (countMap[OrderStatus.ASSIGNED] ?? 0) +
    (countMap[OrderStatus.LOADING] ?? 0) +
    (countMap[OrderStatus.LOADED] ?? 0);
  const dispatchedCount = countMap[OrderStatus.DISPATCHED] ?? 0;
  const deliveredCount = countMap[OrderStatus.DELIVERED] ?? 0;

  const totalPages = Math.ceil(filteredTotalCount / pageSize) || 1;
  const isFiltered =
    status !== "all" ||
    q.trim() !== "" ||
    dateRange.preset !== "all_time" ||
    sort !== "newest";

  // Helper to build URL with query params
  const makeFilterUrl = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status !== "all") p.set("status", status);
    if (preset && preset !== "all_time") p.set("preset", preset);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (sort !== "newest") p.set("sort", sort);
    if (currentPage > 1) p.set("page", String(currentPage));

    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "all") p.delete(k);
      else p.set(k, v);
    });

    const queryStr = p.toString();
    return queryStr ? `/admin/orders?${queryStr}` : "/admin/orders";
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 min-w-0 max-w-full">
      {/* =========================================================================
          PAGE HEADER & SUMMARY
      ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
              Factory Orders Management
            </h1>
            <span className="rounded-full bg-[#13789B]/10 px-2.5 py-0.5 text-xs font-bold text-[#13789B] shrink-0">
              {filteredTotalCount} Filtered / {allOrdersSummary._count.id} Total
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Approve construction orders, stage vehicles, assign loading staff, and monitor dispatch fulfillment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <DateRangeFilter />

          <a
            href={status !== "all" ? `/api/admin/orders/export?status=${status}` : "/api/admin/orders/export"}
            download
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 sm:px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <FileDown className="h-4 w-4 text-[#13789B]" />
            <span>Export CSV</span>
          </a>

          <Link
            href="/customer/new-order"
            className="flex items-center gap-1.5 rounded-2xl bg-[#13789B] px-3.5 sm:px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Order</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          TOP METRIC KPI CARDS (Real period-filtered aggregates)
      ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4 min-w-0">
        <Link
          href={makeFilterUrl({ status: "pending", page: undefined })}
          className={`card p-3 sm:p-4 border-l-4 border-l-amber-500 hover:border-slate-300 transition-all min-w-0 ${
            status === "pending" ? "ring-2 ring-amber-400 bg-amber-50/20" : ""
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 truncate block">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{pendingCount}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">Awaiting admin review</span>
        </Link>

        <Link
          href={makeFilterUrl({ status: "assigned", page: undefined })}
          className={`card p-3 sm:p-4 border-l-4 border-l-[#13789B] hover:border-slate-300 transition-all min-w-0 ${
            status === "assigned" || status === "loading" || status === "loaded" ? "ring-2 ring-[#13789B] bg-[#13789B]/5" : ""
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 truncate block">In Staging / Loading</span>
            <Truck className="h-4 w-4 text-[#13789B] shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{inProgressCount}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">Active yard tasks</span>
        </Link>

        <Link
          href={makeFilterUrl({ status: "dispatched", page: undefined })}
          className={`card p-3 sm:p-4 border-l-4 border-l-sky-500 hover:border-slate-300 transition-all min-w-0 ${
            status === "dispatched" ? "ring-2 ring-sky-400 bg-sky-50/20" : ""
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 truncate block">Dispatched / Transit</span>
            <Truck className="h-4 w-4 text-sky-500 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{dispatchedCount}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">On road to site</span>
        </Link>

        <Link
          href={makeFilterUrl({ status: "delivered", page: undefined })}
          className={`card p-3 sm:p-4 border-l-4 border-l-emerald-500 hover:border-slate-300 transition-all min-w-0 ${
            status === "delivered" ? "ring-2 ring-emerald-400 bg-emerald-50/20" : ""
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 truncate block">Delivered Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-700 truncate">{deliveredCount}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">Acknowledged by client</span>
        </Link>
      </div>

      {/* =========================================================================
          ADVANCED FILTER TOOLBAR (Search, Status tabs, Sort)
      ========================================================================= */}
      <OrdersFilterToolbar
        initialSearch={q}
        status={status}
        sort={sort}
        preset={preset}
        from={from}
        to={to}
        tabs={STATUS_TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
          count: tab.status ? countMap[tab.status] ?? 0 : allOrdersSummary._count.id,
        }))}
        isFiltered={isFiltered}
      />

      {/* =========================================================================
          ENTERPRISE ORDERS DATA TABLE & MOBILE CARDS
      ========================================================================= */}
      <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden min-w-0">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Order ID & Date</th>
                <th className="py-3.5 px-4">Customer Name & Site</th>
                <th className="py-3.5 px-4">Block Size</th>
                <th className="py-3.5 px-4 text-right">Block Quantity</th>
                <th className="py-3.5 px-4 text-right">Total CBM</th>
                <th className="py-3.5 px-4 text-center">Block Jointing Morter (40 KG Bags)</th>
                <th className="py-3.5 px-4">Transport</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-3.5 px-4">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-black text-[#13789B] group-hover:underline block font-mono"
                    >
                      {o.orderNo}
                    </Link>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {formatDate(o.createdAt)}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-bold text-navy truncate max-w-[180px]">
                      {o.customer.companyName || o.customer.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">
                      📍 {o.deliveryAddress}
                    </p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800">{o.product?.sizeLabel || (o.items && o.items.length > 0 ? `${o.items.length} sizes` : "Standard")}</span>
                    <span className="text-[11px] text-slate-400 block font-mono">{o.product?.dimensions || "-"}</span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <p className="font-black text-navy">{formatNumber(o.quantity)}</p>
                    <span className="text-[10px] text-slate-400">Blocks</span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <p className="font-black text-[#13789B] font-mono">
                      {o.totalCbm ? `${Number(o.totalCbm).toFixed(2)} m³` : "-"}
                    </p>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1 text-xs font-mono font-bold text-navy">
                      {o.adhesiveBags ?? 0} Bags
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {o.transport ? (
                      <div>
                        <span className="font-bold text-navy block font-mono">
                          {o.transport.truckNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[120px]">
                          {o.transport.driverName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        ORDER_STATUS_CLASS[o.status]
                      }`}
                    >
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-[#13789B] hover:bg-[#13789B] hover:text-white transition-all shadow-2xs"
                    >
                      <span>Manage</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Responsive Cards View */}
        <div className="lg:hidden divide-y divide-slate-100 min-w-0">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="block p-3.5 sm:p-4 hover:bg-slate-50 transition-colors min-w-0"
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="font-black text-sm text-[#13789B] font-mono">{o.orderNo}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        ORDER_STATUS_CLASS[o.status]
                      }`}
                    >
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <p className="mt-1 font-bold text-xs text-navy truncate">
                    {o.customer.companyName || o.customer.name}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-sm text-navy">
                    {formatNumber(o.quantity)} blocks
                  </p>
                  <span className="text-[10px] font-bold text-[#13789B]">
                    {o.totalCbm ? `${Number(o.totalCbm).toFixed(2)} m³` : o.product?.sizeLabel || "Standard"}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block truncate">Block Size</span>
                  <p className="font-bold text-navy truncate">{o.product?.sizeLabel || "AAC Blocks"}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block truncate">Block Jointing Morter (40 KG)</span>
                  <p className="font-bold text-navy truncate">{o.adhesiveBags ?? 0} Bags</p>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block truncate">Vehicle</span>
                  <p className="font-bold text-navy truncate">
                    {o.transport?.truckNumber || "Unassigned"}
                  </p>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block truncate">Order Date</span>
                  <p className="font-bold text-navy truncate">{formatDate(o.createdAt)}</p>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 gap-2 min-w-0">
                <span className="truncate flex-1">📍 {o.deliveryAddress}</span>
                <span className="font-bold text-[#13789B] flex items-center gap-0.5 shrink-0">
                  Manage →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="p-8 sm:p-12 text-center text-slate-400">
            <ShoppingCart className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-navy">No Orders Found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              No orders matched your selected status filter, date range, or search query.
            </p>
            {isFiltered && (
              <Link
                href="/admin/orders"
                className="btn-secondary mt-4 inline-flex items-center gap-1.5 text-xs font-bold"
              >
                <span>Clear All Filters</span>
              </Link>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 sm:px-4 py-3 bg-slate-50/50">
            <Link
              href={makeFilterUrl({ page: String(Math.max(1, currentPage - 1)) })}
              className={`rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-navy hover:bg-white transition-all ${
                currentPage <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              ← Previous
            </Link>
            <div className="text-xs font-semibold text-slate-500">
              Page <span className="font-bold text-navy">{currentPage}</span> of{" "}
              <span className="font-bold text-navy">{totalPages}</span> ({filteredTotalCount} orders)
            </div>
            <Link
              href={makeFilterUrl({ page: String(Math.min(totalPages, currentPage + 1)) })}
              className={`rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-navy hover:bg-white transition-all ${
                currentPage >= totalPages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Next →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
