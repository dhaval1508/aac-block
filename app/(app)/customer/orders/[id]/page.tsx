import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Phone, FileText, ArrowLeft, CheckCircle2, Layers, Package, Truck, Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  telHref,
} from "@/lib/utils";
import { DownloadOrderSummaryButton } from "@/components/download-order-summary-btn";

export const dynamic = "force-dynamic";

export default async function CustomerOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { success } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      product: true,
      items: { include: { product: true } },
      transport: true,
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });

  if (!order || (session.role === "CUSTOMER" && order.customerId !== session.id)) {
    notFound();
  }

  // Stepper logic
  const steps = [
    { key: "PENDING", label: "Placed", desc: "Awaiting approval" },
    { key: "CONFIRMED", label: "Confirmed", desc: "Approved by Admin" },
    { key: "ASSIGNED", label: "Assigned", desc: "Truck allocated" },
    { key: "LOADING", label: "Loading", desc: "At factory bay" },
    { key: "DISPATCHED", label: "Dispatched", desc: "In transit" },
    { key: "DELIVERED", label: "Delivered", desc: "Completed" },
  ];

  const statusOrder: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    ASSIGNED: 2,
    LOADING: 3,
    LOADED: 3,
    DISPATCHED: 4,
    DELIVERED: 5,
    REJECTED: -1,
  };

  const currentStepIdx = statusOrder[order.status] ?? 0;
  const isRejected = order.status === "REJECTED";

  const totalCbm = order.totalCbm
    ? Number(order.totalCbm)
    : order.product
    ? Number(order.product.cbmPerBlock) * order.quantity
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 max-w-4xl mx-auto min-w-0 max-w-full">
      {/* Newly Placed Success Confirmation Banner */}
      {success === "1" ? (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 shadow-sm animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-emerald-900 text-sm">Order Placed Successfully!</h4>
            <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
              Order reference <strong className="font-mono">{order.orderNo}</strong> has been saved permanently to the database. It is currently awaiting Super Admin review and truck assignment.
            </p>
          </div>
        </div>
      ) : null}

      {/* Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/customer/orders"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-navy">{order.orderNo}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold border ${
                  ORDER_STATUS_CLASS[order.status]
                }`}
              >
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>
            <p className="text-xs text-slate-500">Ordered on {formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        {/* Action Buttons: PDF Download + Challan */}
        <div className="flex items-center gap-2 flex-wrap">
          <DownloadOrderSummaryButton orderId={order.id} orderNo={order.orderNo} />
          {order.invoiceNo ? (
            <Link
              href={`/invoice/${order.id}`}
              className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-2xl bg-[#13789B] text-white hover:bg-[#0F627F] transition-all shadow-xs shrink-0 self-start sm:self-auto"
            >
              <FileText className="h-4 w-4" />
              <span>Challan ({order.invoiceNo})</span>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Visual Order Progress Stepper */}
      {!isRejected ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs overflow-x-auto min-w-0">
          <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mb-3 sm:mb-4">
            Live Order Status Progression
          </h2>
          <div className="relative min-w-[280px]">
            <div className="grid grid-cols-6 gap-0.5 sm:gap-2">
              {steps.map((st, i) => {
                const isPassed = currentStepIdx >= i;
                const isCurrent = currentStepIdx === i;

                return (
                  <div key={st.key} className="flex flex-col items-center text-center min-w-0">
                    <div
                      className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full text-[11px] sm:text-xs font-bold transition-all shrink-0 ${
                        isCurrent
                          ? "bg-[#13789B] text-white ring-4 ring-[#13789B]/20 shadow-md"
                          : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isPassed && !isCurrent ? (
                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <p
                      className={`mt-1.5 sm:mt-2 text-[9px] sm:text-xs font-bold leading-tight truncate max-w-full ${
                        isCurrent
                          ? "text-[#13789B]"
                          : isPassed
                          ? "text-navy"
                          : "text-slate-400"
                      }`}
                    >
                      {st.label}
                    </p>
                    <span className="hidden sm:block text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
                      {st.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-xs">
          <h3 className="font-bold text-sm">Order Status: Rejected</h3>
          <p className="text-xs text-rose-700 mt-1">
            This order was rejected by administration. Please contact the dispatch office for details.
          </p>
        </div>
      )}

      {/* Itemized Order Specifications */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-navy flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#13789B]" />
            <span>Ordered Items & Specifications</span>
          </h2>
          {totalCbm > 0 && (
            <span className="rounded-xl bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-black text-[#13789B] font-mono">
              Total Volume: {totalCbm.toFixed(2)} CBM
            </span>
          )}
        </div>

        {order.items && order.items.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {order.items.map((it) => (
              <div key={it.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy text-sm">{it.productName}</span>
                    {it.sizeLabel && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {it.sizeLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 font-mono mt-0.5">
                    {it.dimensions || it.productType}
                    {it.totalCbm ? ` • ${Number(it.totalCbm).toFixed(2)} CBM` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 sm:text-right">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Quantity</span>
                    <span className="font-mono font-bold text-navy text-sm">{formatNumber(it.quantity)} Units</span>
                  </div>
                  {it.totalCbm ? (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Volume</span>
                      <span className="font-mono font-bold text-[#13789B] text-sm">{Number(it.totalCbm).toFixed(2)} m³</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : order.product ? (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Product / Size:</span>
              <strong className="text-navy">{order.product.sizeLabel} ({order.product.dimensions})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unit CBM / Block:</span>
              <strong className="text-navy font-mono">{Number(order.product.cbmPerBlock).toFixed(4)} CBM</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ordered Quantity:</span>
              <strong className="text-navy font-mono">{formatNumber(order.quantity)} Blocks</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Calculated Volume:</span>
              <strong className="text-[#13789B] font-mono font-bold">{totalCbm.toFixed(2)} CBM</strong>
            </div>
          </div>
        ) : null}

        <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px]">Delivery Site Address</span>
            <p className="mt-0.5 font-medium text-navy">{order.deliveryAddress}</p>
          </div>
          {order.requestedDate && (
            <div className="sm:text-right">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Requested Date</span>
              <p className="mt-0.5 font-semibold text-navy">{formatDate(order.requestedDate)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logistics & Vehicle Details */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-black text-navy flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#13789B]" />
            <span>Transport & Logistics</span>
          </h2>
          {order.transport ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Truck Number</span>
                <strong className="text-navy text-base font-mono">{order.transport.truckNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Driver Name</span>
                <strong className="text-navy">{order.transport.driverName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Driver Mobile</span>
                <strong className="text-navy font-mono">{order.transport.driverMobile}</strong>
              </div>
              {order.transport.transporterName ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Transporter</span>
                  <strong className="text-navy">{order.transport.transporterName}</strong>
                </div>
              ) : null}
              {order.transport.expectedDelivery ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Delivery (ETA)</span>
                  <strong className="text-navy">
                    {formatDateTime(order.transport.expectedDelivery)}
                  </strong>
                </div>
              ) : null}
              <a
                href={telHref(order.transport.driverMobile)}
                className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-2.5 text-xs font-bold text-navy hover:bg-slate-200 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Call Driver
              </a>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">
              Transport will be assigned once the order is approved.
            </div>
          )}
        </div>

        {/* Consignment Specifications & Delivery Site (Zero Pricing) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-black text-navy flex items-center gap-2">
            <Boxes className="h-4 w-4 text-[#13789B]" />
            <span>Consignment Summary</span>
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total AAC Blocks:</span>
              <strong className="text-navy font-mono">{formatNumber(order.quantity)} Blocks</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Volume (CBM):</span>
              <strong className="text-[#13789B] font-mono">{totalCbm.toFixed(2)} m³</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Wall Area:</span>
              <strong className="text-navy font-mono">
                {order.totalSqft ? Number(order.totalSqft).toFixed(1) : (order.quantity * 1.29).toFixed(1)} Sq.Ft.
              </strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Block Jointing Morter (40 KG):</span>
              <strong className="text-navy font-mono">{order.adhesiveBags ?? 0} Bags</strong>
            </div>
            <div className="flex justify-between text-xs border-t border-slate-100 pt-2">
              <span className="text-slate-500">Order Status:</span>
              <span className="font-bold text-[#13789B] uppercase">{ORDER_STATUS_LABEL[order.status]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Order Timeline */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-navy mb-4">Order Progress Timeline</h2>
        <div className="space-y-4">
          {order.events.map((evt, idx) => {
            const isLatest = idx === order.events.length - 1;
            return (
              <div key={evt.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isLatest ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-300"
                    }`}
                  />
                  {idx < order.events.length - 1 ? (
                    <div className="h-full w-0.5 bg-slate-200 my-1" />
                  ) : null}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-bold text-navy">{evt.title}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(evt.createdAt)}</p>
                  {evt.note ? <p className="mt-0.5 text-xs text-slate-600">{evt.note}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
