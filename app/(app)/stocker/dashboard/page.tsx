import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Boxes,
  PackagePlus,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  Truck,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  Calendar,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatNumber, formatDate, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "@/lib/utils";
import { OrderStatus, StockType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function StockerDashboardPage() {
  const session = await getSession();
  if (!session || !["STOCKER", "ADMIN"].includes(session.role)) redirect("/login");

  // Operational metrics query from real database (ZERO financial fields)
  const [
    stockAgg,
    stockInAgg,
    stockOutAgg,
    products,
    totalOrders,
    pendingOrders,
    confirmedOrders,
    loadingOrders,
    dispatchedOrders,
    deliveredOrders,
    recentMovements,
    recentOrders,
  ] = await Promise.all([
    prisma.stockMovement.aggregate({
      _sum: { quantityDelta: true },
    }),
    prisma.stockMovement.aggregate({
      where: { type: StockType.IN },
      _sum: { quantityDelta: true },
    }),
    prisma.stockMovement.aggregate({
      where: { type: StockType.OUT },
      _sum: { quantityDelta: true },
    }),
    prisma.product.findMany({
      orderBy: { widthMm: "asc" },
      select: {
        id: true,
        name: true,
        sizeLabel: true,
        dimensions: true,
        cbmPerBlock: true,
        blocksPerCbm: true,
        active: true,
        movements: { select: { quantityDelta: true } },
      },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
    prisma.order.count({
      where: {
        status: { in: [OrderStatus.ASSIGNED, OrderStatus.LOADING, OrderStatus.LOADED] },
      },
    }),
    prisma.order.count({ where: { status: OrderStatus.DISPATCHED } }),
    prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
    prisma.stockMovement.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        quantityDelta: true,
        referenceNo: true,
        note: true,
        createdAt: true,
        product: { select: { sizeLabel: true } },
        order: { select: { orderNo: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNo: true,
        quantity: true,
        loadedQuantity: true,
        status: true,
        deliveryAddress: true,
        createdAt: true,
        customer: { select: { name: true, companyName: true } },
        product: { select: { sizeLabel: true, dimensions: true } },
        transport: { select: { truckNumber: true, driverName: true, driverMobile: true } },
      },
    }),
  ]);

  const currentTotalStock = stockAgg._sum.quantityDelta ?? 0;
  const totalStockIn = stockInAgg._sum.quantityDelta ?? 0;
  const totalStockOut = Math.abs(stockOutAgg._sum.quantityDelta ?? 0);

  const productStockList = products.map((p) => {
    const currentStock = p.movements.reduce((acc, m) => acc + m.quantityDelta, 0);
    return {
      ...p,
      cbmPerBlock: Number(p.cbmPerBlock),
      blocksPerCbm: Number(p.blocksPerCbm),
      currentStock,
    };
  });

  const lowStockProducts = productStockList.filter((p) => p.currentStock < 500);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 min-w-0 max-w-full">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-3xl bg-navy p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8 shadow-lg min-w-0">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
            <Boxes className="h-3.5 w-3.5" /> Stock & Yard Operations
          </span>
          <h1 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
            Inventory & Logistics Portal
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            Live physical yard stock, size-wise inventory levels, and order fulfillment tracking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/stocker/stock"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-navy hover:bg-amber-400 shadow-sm transition-all"
          >
            <PackagePlus className="h-4 w-4" />
            Stock In / Out
          </Link>
          <Link
            href="/stocker/orders"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
            Orders Log
          </Link>
        </div>
      </div>

      {/* Top 4 Operational Stock Metrics */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 min-w-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm min-w-0 flex flex-col justify-between h-full">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate block">
            Total Current Stock
          </span>
          <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-black text-navy tracking-tight truncate">
            {formatNumber(currentTotalStock)}
          </p>
          <span className="text-[10px] sm:text-xs text-slate-500 truncate block mt-0.5">Live blocks in yard</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm min-w-0 flex flex-col justify-between h-full">
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider truncate block">
            Production Inflow
          </span>
          <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight truncate">
            +{formatNumber(totalStockIn)}
          </p>
          <span className="text-[10px] sm:text-xs text-slate-500 truncate block mt-0.5">Total verified stock-in</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm min-w-0 flex flex-col justify-between h-full">
          <span className="text-[10px] sm:text-[11px] font-bold text-rose-600 uppercase tracking-wider truncate block">
            Dispatches / Outflow
          </span>
          <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-black text-rose-600 tracking-tight truncate">
            -{formatNumber(totalStockOut)}
          </p>
          <span className="text-[10px] sm:text-xs text-slate-500 truncate block mt-0.5">Dispatches & manual out</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm min-w-0 flex flex-col justify-between h-full">
          <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 uppercase tracking-wider truncate block">
            Active Loading Tasks
          </span>
          <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-black text-amber-600 tracking-tight truncate">
            {loadingOrders}
          </p>
          <span className="text-[10px] sm:text-xs text-slate-500 truncate block mt-0.5">Assigned / In Progress</span>
        </div>
      </div>

      {/* Low Stock Warning */}
      {lowStockProducts.length > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs">
              <strong className="font-bold">Low Stock Warning:</strong>{" "}
              {lowStockProducts
                .map((p) => `${p.sizeLabel} (${formatNumber(p.currentStock)} blocks)`)
                .join(", ")}
            </div>
          </div>
          <Link
            href="/stocker/stock"
            className="self-end sm:self-auto shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
          >
            Record Stock In →
          </Link>
        </div>
      ) : null}

      {/* Operational Order Pipeline Metrics */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-navy flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-[#1E72A8]" />
            Order Logistics Pipeline
          </h2>
          <Link href="/stocker/orders" className="text-xs font-bold text-[#1E72A8] hover:underline">
            View All ({totalOrders}) →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 text-center min-w-0">
          <div className="rounded-2xl bg-slate-50 p-2.5 sm:p-3 border border-slate-100 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase truncate block">Pending</span>
            <p className="text-lg sm:text-xl font-black text-slate-700 mt-0.5 truncate">{pendingOrders}</p>
          </div>
          <div className="rounded-2xl bg-blue-50/70 p-2.5 sm:p-3 border border-blue-100 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-blue-600 uppercase truncate block">Confirmed</span>
            <p className="text-lg sm:text-xl font-black text-blue-800 mt-0.5 truncate">{confirmedOrders}</p>
          </div>
          <div className="rounded-2xl bg-amber-50/70 p-2.5 sm:p-3 border border-amber-100 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-amber-600 uppercase truncate block">Loading</span>
            <p className="text-lg sm:text-xl font-black text-amber-800 mt-0.5 truncate">{loadingOrders}</p>
          </div>
          <div className="rounded-2xl bg-indigo-50/70 p-2.5 sm:p-3 border border-indigo-100 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 uppercase truncate block">Dispatched</span>
            <p className="text-lg sm:text-xl font-black text-indigo-800 mt-0.5 truncate">{dispatchedOrders}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50/70 p-2.5 sm:p-3 border border-emerald-100 col-span-2 sm:col-span-1 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 uppercase truncate block">Delivered</span>
            <p className="text-lg sm:text-xl font-black text-emerald-800 mt-0.5 truncate">{deliveredOrders}</p>
          </div>
        </div>
      </div>

      {/* Live Stock by Size Grid */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-navy flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" />
              Live Stock by AAC Block Size
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Physical count and calculated cubic volume</p>
          </div>
          <Link
            href="/stocker/products"
            className="text-xs font-bold text-[#1E72A8] hover:underline"
          >
            Manage Sizes →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productStockList.map((p) => {
            const isLow = p.currentStock < 500;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isLow ? "border-amber-300 bg-amber-50/40" : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy">{p.sizeLabel}</span>
                  <span className="text-xs text-slate-400">{p.dimensions}</span>
                </div>
                <p className="mt-2 text-2xl font-black text-navy">{formatNumber(p.currentStock)}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{p.cbmPerBlock.toFixed(4)} CBM/block</span>
                  {isLow ? (
                    <span className="font-bold text-amber-700">Low Stock</span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">Available</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 2 Columns: Recent Stock Movements & Recent Order Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Stock Movements */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-navy flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              Recent Stock Movements
            </h3>
            <Link href="/stocker/activity" className="text-xs font-semibold text-[#1E72A8] hover:underline">
              All Activity →
            </Link>
          </div>

          <div className="space-y-2">
            {recentMovements.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-100 p-3 text-xs flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-navy">{m.product.sizeLabel}</span>
                    {m.order ? (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                        {m.order.orderNo}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-slate-500 truncate max-w-[200px]">
                    {m.note || (m.type === "IN" ? "Stock In" : "Stock Out")}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-black text-sm ${
                      m.quantityDelta > 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {m.quantityDelta > 0
                      ? `+${formatNumber(m.quantityDelta)}`
                      : formatNumber(m.quantityDelta)}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {formatDate(m.createdAt)}
                  </span>
                </div>
              </div>
            ))}

            {recentMovements.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No stock movements recorded yet</p>
            ) : null}
          </div>
        </div>

        {/* Recent Operational Order Activity */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-navy flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-600" />
              Recent Order Shipments
            </h3>
            <Link href="/stocker/orders" className="text-xs font-semibold text-[#1E72A8] hover:underline">
              All Orders →
            </Link>
          </div>

          <div className="space-y-2">
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/stocker/orders/${o.id}`}
                className="block rounded-2xl border border-slate-100 p-3 text-xs hover:border-[#1E72A8] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy">{o.orderNo}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      ORDER_STATUS_CLASS[o.status]
                    }`}
                  >
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-slate-600">
                  <span>
                    {o.customer.companyName || o.customer.name} · {formatNumber(o.quantity)} blocks {o.product ? `(${o.product.sizeLabel})` : ""}
                  </span>
                  <span className="text-[10px] text-slate-400">{formatDate(o.createdAt)}</span>
                </div>
                {o.transport ? (
                  <p className="mt-1 text-[11px] text-indigo-700 font-semibold truncate">
                    Truck: {o.transport.truckNumber} · Driver: {o.transport.driverName}
                  </p>
                ) : null}
              </Link>
            ))}

            {recentOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No recent orders found</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
