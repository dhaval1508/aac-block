import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Search, Truck, ShoppingCart, Filter, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatDate, formatNumber, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import { DateRangeFilter } from "@/components/date-range-filter";
import { resolveDateRange } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export default async function StockerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; preset?: string; from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session || !["STOCKER", "ADMIN"].includes(session.role)) redirect("/login");

  const { q = "", status, preset, from = "", to = "" } = await searchParams;
  const dateRange = resolveDateRange(preset, from, to);

  const whereClause: any = {};

  if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
    whereClause.status = status as OrderStatus;
  }

  if (q.trim()) {
    whereClause.OR = [
      { orderNo: { contains: q.trim(), mode: "insensitive" } },
      { customer: { name: { contains: q.trim(), mode: "insensitive" } } },
      { customer: { companyName: { contains: q.trim(), mode: "insensitive" } } },
      { transport: { truckNumber: { contains: q.trim(), mode: "insensitive" } } },
    ];
  }

  if (dateRange.startDate && dateRange.endDate) {
    whereClause.createdAt = {
      gte: dateRange.startDate,
      lte: dateRange.endDate,
    };
  }

  // Strict projection: ZERO financial fields (no rate, price, subtotal, gstAmount, totalAmount, paidAmount, paymentStatus)
  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNo: true,
      quantity: true,
      loadedQuantity: true,
      status: true,
      deliveryAddress: true,
      requestedDate: true,
      createdAt: true,
      customer: { select: { name: true, companyName: true } },
      product: { select: { sizeLabel: true, dimensions: true, cbmPerBlock: true } },
      transport: {
        select: {
          truckNumber: true,
          transporterName: true,
          driverName: true,
          driverMobile: true,
        },
      },
      assignedStaff: { select: { name: true } },
    },
  });

  const statusTabs = [
    { key: "", label: "All Orders" },
    { key: "PENDING", label: "Pending" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "ASSIGNED", label: "Assigned" },
    { key: "LOADING", label: "Loading" },
    { key: "LOADED", label: "Loaded" },
    { key: "DISPATCHED", label: "Dispatched" },
    { key: "DELIVERED", label: "Delivered" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-[#1E72A8]" />
            Orders Logistics & Shipment Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time yard fulfillment, truck staging, and operational milestones.
          </p>
        </div>
      </div>

      {/* Search Bar & Filter Toolbar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => {
            const active = (status || "") === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/stocker/orders?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(tab.key ? { status: tab.key } : {}),
                  ...(preset ? { preset } : {}),
                  ...(from ? { from } : {}),
                  ...(to ? { to } : {}),
                }).toString()}`}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? "bg-navy text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <form className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by Order #, Company, Customer, or Truck registration..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-[#1E72A8] focus:bg-white focus:outline-none shadow-2xs"
            />
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {preset ? <input type="hidden" name="preset" value={preset} /> : null}
            {from ? <input type="hidden" name="from" value={from} /> : null}
            {to ? <input type="hidden" name="to" value={to} /> : null}
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <DateRangeFilter />
            {(q || status || (preset && preset !== "this_month") || from || to) ? (
              <Link
                href="/stocker/orders"
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
            href={`/stocker/orders/${o.id}`}
            className="group block rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-[#1E72A8] hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-navy text-base group-hover:text-[#1E72A8] transition-colors">
                    {o.orderNo}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      ORDER_STATUS_CLASS[o.status]
                    }`}
                  >
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {o.customer.companyName || o.customer.name} · {formatNumber(o.quantity)} blocks (
                  {o.product.sizeLabel})
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs font-bold text-[#1E72A8] group-hover:underline">
                  View Logistics →
                </span>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#1E72A8] transition-colors" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold">Truck Number</span>
                <p className="font-bold text-navy">{o.transport?.truckNumber || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold">Driver</span>
                <p className="font-bold text-navy truncate">{o.transport?.driverName || "TBA"}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold">Loading Staff</span>
                <p className="font-bold text-navy">{o.assignedStaff?.name || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold">Block Size</span>
                <p className="font-bold text-navy font-mono">
                  {o.product.sizeLabel}
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 pt-1">
              <span className="truncate max-w-md">📍 {o.deliveryAddress}</span>
              <span>Ordered: {formatDate(o.createdAt)}</span>
            </div>
          </Link>
        ))}

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            <p className="text-base font-bold text-navy">No orders found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search criteria or status filter.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
