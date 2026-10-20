import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronRight,
  PlusCircle,
  Search,
  Calendar,
  Filter,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Package,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatDate, formatNumber, formatBlockSizeName, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "@/lib/utils";
import { OrderStatus, Prisma } from "@prisma/client";
import { DateRangeFilter } from "@/components/date-range-filter";
import { resolveDateRange } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { key: "ALL", label: "All Orders" },
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "LOADING", label: "Loading" },
  { key: "DISPATCHED", label: "Dispatched" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "REJECTED", label: "Rejected" },
];

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    preset?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN"].includes(session.role)) redirect("/login");

  const { status = "ALL", q = "", from = "", to = "", preset } = await searchParams;
  const dateRange = resolveDateRange(preset, from, to);

  const where: Prisma.OrderWhereInput = {
    customerId: session.id,
  };

  if (status && status !== "ALL") {
    if (status === "CONFIRMED") {
      where.status = { in: [OrderStatus.CONFIRMED, OrderStatus.ASSIGNED] };
    } else if (status === "LOADING") {
      where.status = { in: [OrderStatus.LOADING, OrderStatus.LOADED] };
    } else {
      where.status = status as OrderStatus;
    }
  }

  if (q.trim()) {
    const query = q.trim();
    where.OR = [
      { orderNo: { contains: query, mode: "insensitive" } },
      { invoiceNo: { contains: query, mode: "insensitive" } },
      { deliveryAddress: { contains: query, mode: "insensitive" } },
      { product: { name: { contains: query, mode: "insensitive" } } },
      { product: { sizeLabel: { contains: query, mode: "insensitive" } } },
      { transport: { truckNumber: { contains: query, mode: "insensitive" } } },
      { transport: { driverName: { contains: query, mode: "insensitive" } } },
    ];
  }

  if (dateRange.startDate && dateRange.endDate) {
    where.createdAt = {
      gte: dateRange.startDate,
      lte: dateRange.endDate,
    };
  }

  const [orders, totalOrdersCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        transport: true,
      },
    }),
    prisma.order.count({ where: { customerId: session.id } }),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">My Orders</h1>
          <p className="text-sm text-slate-500">
            Real-time tracking from factory booking to truck delivery at site.
          </p>
        </div>
        <Link
          href="/customer/new-order"
          className="btn-primary inline-flex items-center justify-center gap-1.5 text-xs font-bold self-start sm:self-auto py-2.5 px-4 rounded-xl shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          Place New Order
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = (status || "ALL").toUpperCase() === tab.key;
            const queryParams = new URLSearchParams();
            if (tab.key !== "ALL") queryParams.set("status", tab.key);
            if (q) queryParams.set("q", q);
            if (preset) queryParams.set("preset", preset);
            if (from) queryParams.set("from", from);
            if (to) queryParams.set("to", to);
            const href = `/customer/orders${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

            return (
              <Link
                key={tab.key}
                href={href}
                className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#1e72a8] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-navy"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Search & Date Range Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <form method="GET" action="/customer/orders" className="relative flex-1">
            {status && status !== "ALL" ? <input type="hidden" name="status" value={status} /> : null}
            {preset ? <input type="hidden" name="preset" value={preset} /> : null}
            {from ? <input type="hidden" name="from" value={from} /> : null}
            {to ? <input type="hidden" name="to" value={to} /> : null}
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by order #, block size, truck, driver..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-[#13789B] focus:bg-white focus:outline-none shadow-2xs"
            />
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <DateRangeFilter />
            {(q || status !== "ALL" || (preset && preset !== "this_month") || from || to) ? (
              <Link
                href="/customer/orders"
                title="Reset Filters"
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/customer/orders/${o.id}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:bg-slate-50 hover:border-[#1e72a8]/50"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-navy text-base">{o.orderNo}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    ORDER_STATUS_CLASS[o.status]
                  }`}
                >
                  {ORDER_STATUS_LABEL[o.status]}
                </span>
                {o.invoiceNo ? (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                    {o.invoiceNo}
                  </span>
                ) : null}
              </div>

              <p className="text-xs font-semibold text-slate-700">
                {formatNumber(o.quantity)} blocks {o.product ? `· ${formatBlockSizeName(o.product.sizeLabel)} (${o.product.dimensions})` : o.totalCbm ? `· ${Number(o.totalCbm).toFixed(2)} m³` : ""} · {o.adhesiveBags ?? 0} Bags Block Jointing Morter (40 KG)
              </p>

              <p className="text-[11px] text-slate-400">
                Booked: {formatDate(o.createdAt)} • Delivery Site: {o.deliveryAddress}
              </p>

              {o.transport ? (
                <div className="mt-1 flex items-center gap-2 text-xs text-indigo-700 font-semibold bg-indigo-50/60 rounded-lg px-2.5 py-1 inline-flex">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Truck: {o.transport.truckNumber} • Driver: {o.transport.driverName} ({o.transport.driverMobile})
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="text-left sm:text-right">
                <p className="text-base font-black text-navy font-mono">{formatNumber(o.quantity)} blocks</p>
                <span className="inline-block rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-bold text-[#13789B] tracking-wide">
                  {o.product?.sizeLabel || (o.totalCbm ? `${Number(o.totalCbm).toFixed(2)} m³` : "Order")}
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
            </div>
          </Link>
        ))}

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-navy text-base">No Orders Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {q || status !== "ALL" || from || to
                ? "No orders matched your search criteria. Try resetting filters."
                : "You haven't placed any AAC block orders yet."}
            </p>
            {q || status !== "ALL" || from || to ? (
              <Link
                href="/customer/orders"
                className="inline-block rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Clear All Filters
              </Link>
            ) : (
              <Link
                href="/customer/new-order"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e72a8] px-4 py-2 text-xs font-bold text-white hover:bg-[#185e8a]"
              >
                <PlusCircle className="h-4 w-4" />
                Place Your First Order
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
