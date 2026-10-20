import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PlusCircle,
  ShoppingCart,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  Layers,
  ArrowRight,
  Receipt,
  Boxes,
  Calculator,
  Package,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatDate, formatNumber, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "@/lib/utils";
import { BrochureDownloadButton } from "@/components/brochure-download-btn";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN"].includes(session.role)) redirect("/login");

  const [statusCounts, orders, customer, products] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      where: { customerId: session.id },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { customerId: session.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        product: true,
        items: { include: { product: true } },
        transport: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.id },
      include: {
        customerOrders: {
          select: { totalAmount: true, paidAmount: true, invoiceNo: true },
        },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { widthMm: "asc" },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const sc of statusCounts) {
    countMap[sc.status] = sc._count._all;
  }

  const totalOrders = Object.values(countMap).reduce((a, b) => a + b, 0);
  const pendingOrders = countMap["PENDING"] ?? 0;
  const confirmedOrders = (countMap["CONFIRMED"] ?? 0) + (countMap["ASSIGNED"] ?? 0);
  const loadingOrders = (countMap["LOADING"] ?? 0) + (countMap["LOADED"] ?? 0);
  const dispatchedOrders = countMap["DISPATCHED"] ?? 0;
  const deliveredOrders = countMap["DELIVERED"] ?? 0;

  const invoiceCount = customer?.customerOrders.filter((o) => o.invoiceNo).length ?? 0;

  const aacProducts = products.filter((p) => p.category === "AAC_BLOCK");
  const adhesiveProducts = products.filter((p) => p.category === "ADHESIVE");

  return (
    <div className="space-y-5 sm:space-y-6 p-3 sm:p-6 lg:p-8 min-w-0 max-w-full">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 rounded-3xl bg-[#111827] p-5 sm:p-7 text-white lg:flex-row lg:items-center lg:justify-between shadow-xs border border-slate-800 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#13789B]/20 border border-[#13789B]/40 px-3 py-1 text-xs font-bold text-sky-300">
              Customer Portal
            </span>
            <span className="text-xs text-slate-400">• Swarnim AAC Factory ERP</span>
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white truncate">
            Welcome, {customer?.companyName || session.name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            Real-time plant bookings, truck dispatches, and construction site delivery tracking.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
          <Link
            href="/customer/new-order"
            className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs sm:text-sm font-black text-navy shadow-md transition-all active:scale-[0.99]"
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span>Place New Order</span>
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Link
              href="/customer/orders"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all border border-white/10 text-center"
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span className="truncate">Orders ({totalOrders})</span>
            </Link>
            <Link
              href="/customer/invoices"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all border border-white/10 text-center"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">Challans ({invoiceCount})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Brochure Download Banner */}
      <BrochureDownloadButton variant="card" />

      {/* Operational Dispatch Pulse Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#13789B] border border-sky-100">
            <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-navy uppercase tracking-wider truncate">
              Live Factory Yard & Dispatch Status
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Factory yard dispatch bay is currently active with verified physical loading and GPS truck transit.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{dispatchedOrders} In Transit</span>
          </div>
          <Link
            href="/customer/orders?status=DISPATCHED"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#13789B] hover:text-[#0F627F] hover:underline"
          >
            <span>Track Vehicles</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 6 Clickable Status Metric Cards */}
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Order Status Breakdown</h2>
          <span className="text-[11px] text-slate-400 hidden sm:inline">Tap any card to filter bookings</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 min-w-0">
          <Link
            href="/customer/orders"
            className="group rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs hover:border-[#1e72a8] hover:shadow-md transition-all min-w-0 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-[#1e72a8]">
              <span className="text-[11px] sm:text-xs font-medium truncate">Total Orders</span>
              <ShoppingCart className="h-4 w-4 shrink-0 ml-1" />
            </div>
            <p className="mt-1.5 text-xl sm:text-2xl font-black text-navy truncate">{totalOrders}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">All bookings</p>
          </Link>

          <Link
            href="/customer/orders?status=PENDING"
            className="group rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs hover:border-amber-400 hover:shadow-md transition-all min-w-0 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-amber-500">
              <span className="text-[11px] sm:text-xs font-medium text-slate-600 truncate">Pending</span>
              <Clock className="h-4 w-4 shrink-0 ml-1" />
            </div>
            <p className="mt-1.5 text-xl sm:text-2xl font-black text-amber-600 truncate">{pendingOrders}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Awaiting admin</p>
          </Link>

          <Link
            href="/customer/orders?status=CONFIRMED"
            className="group rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs hover:border-blue-400 hover:shadow-md transition-all min-w-0 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-blue-500">
              <span className="text-[11px] sm:text-xs font-medium text-slate-600 truncate">Confirmed</span>
              <CheckCircle2 className="h-4 w-4 shrink-0 ml-1" />
            </div>
            <p className="mt-1.5 text-xl sm:text-2xl font-black text-blue-600 truncate">{confirmedOrders}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Approved & booked</p>
          </Link>

          <Link
            href="/customer/orders?status=LOADING"
            className="group rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs hover:border-purple-400 hover:shadow-md transition-all min-w-0 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-purple-500">
              <span className="text-[11px] sm:text-xs font-medium text-slate-600 truncate">Loading</span>
              <Boxes className="h-4 w-4 shrink-0 ml-1" />
            </div>
            <p className="mt-1.5 text-xl sm:text-2xl font-black text-purple-600 truncate">{loadingOrders}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">At factory bay</p>
          </Link>

          <Link
            href="/customer/orders?status=DISPATCHED"
            className="group rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all min-w-0 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-indigo-500">
              <span className="text-[11px] sm:text-xs font-medium text-slate-600 truncate">Dispatched</span>
              <Truck className="h-4 w-4 shrink-0 ml-1" />
            </div>
            <p className="mt-1.5 text-xl sm:text-2xl font-black text-indigo-600 truncate">{dispatchedOrders}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">On the road</p>
          </Link>

          <Link
            href="/customer/orders?status=DELIVERED"
            className="group rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all min-w-0 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-emerald-500">
              <span className="text-[11px] sm:text-xs font-medium text-slate-600 truncate">Delivered</span>
              <PackageCheck className="h-4 w-4 shrink-0 ml-1" />
            </div>
            <p className="mt-1.5 text-xl sm:text-2xl font-black text-emerald-600 truncate">{deliveredOrders}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Completed</p>
          </Link>
        </div>
      </div>


      {/* Recent Orders List */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-navy">Recent Orders</h2>
            <p className="text-xs text-slate-400">Latest orders placed by your account</p>
          </div>
          <Link
            href="/customer/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1e72a8] hover:underline"
          >
            View All ({totalOrders}) <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {orders.map((o) => {
            const displayCbm = o.totalCbm
              ? Number(o.totalCbm)
              : o.product
              ? Number(o.product.cbmPerBlock) * o.quantity
              : 0;

            return (
              <Link
                key={o.id}
                href={`/customer/orders/${o.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition-all hover:bg-slate-50 hover:border-slate-200"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-navy text-sm">{o.orderNo}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        ORDER_STATUS_CLASS[o.status]
                      }`}
                    >
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                    {o.invoiceNo ? (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {o.invoiceNo}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {formatNumber(o.quantity)} blocks · {o.product?.sizeLabel || "Consignment"} · {o.adhesiveBags ?? 0} Bags Morter · {formatDate(o.createdAt)}
                  </p>
                  {o.transport ? (
                    <p className="mt-0.5 text-xs text-indigo-700 font-semibold truncate">
                      Truck: {o.transport.truckNumber} ({o.transport.driverName})
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-slate-400 truncate">Site: {o.deliveryAddress}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-black text-navy text-sm font-mono">{formatNumber(o.quantity)} blocks</p>
                    <p className="text-[11px] text-[#13789B] font-black font-mono">
                      {displayCbm.toFixed(2)} CBM
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            );
          })}
          {orders.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">You haven&apos;t placed any orders yet.</p>
              <Link
                href="/customer/new-order"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#13789B] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F627F]"
              >
                <PlusCircle className="h-4 w-4" />
                Place Your First Order
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* Available Factory Products (AAC Blocks + Block Jointing Morter) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-navy flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#13789B]" />
              Swarnim Production Catalog
            </h2>
            <p className="text-xs text-slate-400">
              All 9 BIS certified AAC block sizes and Block Jointing Morter (40 KG Bags)
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-[#13789B]">
            BIS / ISI Quality Certified
          </span>
        </div>

        {/* 1. AAC Blocks Grid */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
            AAC Lightweight High-Strength Blocks (9 Sizes)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aacProducts.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 hover:border-[#13789B] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-navy text-sm">{p.sizeLabel} AAC Block</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{p.dimensions}</p>
                    </div>
                    <span className="text-xs font-black text-[#13789B] bg-sky-100/60 border border-sky-200/80 px-2 py-0.5 rounded-lg font-mono">
                      {Number(p.cbmPerBlock).toFixed(4)} m³
                    </span>
                  </div>
                  <div className="mt-3 text-[11px] text-slate-500 flex justify-between border-t border-slate-200/60 pt-2">
                    <span>{Number(p.cbmPerBlock).toFixed(4)} CBM/blk</span>
                    <span className="font-semibold text-slate-700">{Number(p.blocksPerCbm).toFixed(2)} blk/CBM</span>
                  </div>
                </div>
                <Link
                  href={`/customer/new-order?productId=${p.id}`}
                  className="mt-3 block text-center rounded-xl bg-white border border-slate-200 py-2 text-xs font-bold text-[#13789B] hover:bg-[#13789B] hover:text-white transition-all shadow-2xs"
                >
                  Order This Size →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Block Jointing Morter Section (Strictly 40 KG Bag Only, Zero Prices) */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
            Block Jointing Morter
          </h3>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-200 text-sky-900 text-[10px] font-black px-2.5 py-0.5 uppercase tracking-wide">
                  Packaging: 40 KG Bag Only
                </span>
                <span className="text-xs text-slate-400 font-semibold">• High Polymer Modified</span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-navy mt-1">
                Block Jointing Morter (40 KG)
              </h4>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Factory-certified thin-bed jointing mortar engineered for high-strength AAC block wall masonry. Standard Packaging: <strong>40 KG Bag</strong>.
              </p>
            </div>
            <Link
              href="/customer/new-order"
              className="inline-flex items-center justify-center rounded-xl bg-[#13789B] text-white px-5 py-2.5 text-xs font-bold hover:bg-[#0F627F] transition-all shadow-xs shrink-0"
            >
              Order With AAC Blocks →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
