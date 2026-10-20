import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  AlertTriangle,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  UserCheck,
  Send,
  Boxes,
  Check,
  Copy,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getProductStock } from "@/lib/actions/stock";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatBlockSizeName,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  telHref,
  whatsappHref,
} from "@/lib/utils";
import { buildWhatsAppMessage } from "@/lib/whatsapp";
import {
  confirmOrderAction,
  rejectOrderAction,
  assignTransportAction,
  dispatchOrderAction,
  deliverOrderAction,
} from "@/lib/actions/orders";
import { DownloadOrderSummaryBtn } from "@/components/download-order-summary-btn";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const [order, staffList] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        transport: true,
        assignedStaff: true,
        items: {
          include: {
            product: true,
          },
        },
        events: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "desc" }, include: { createdBy: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "STAFF", active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!order) notFound();

  const currentStock = order.productId ? await getProductStock(order.productId) : 0;
  const outQty = order.loadedQuantity > 0 ? order.loadedQuantity : order.quantity;
  const hasEnoughStock = currentStock >= outQty;

  // WhatsApp Helpers
  const whatsappInfo = {
    orderNo: order.orderNo,
    customerName: order.customer.companyName || order.customer.name,
    productName: order.product?.name || order.items[0]?.product.name || "AAC Blocks",
    sizeLabel: order.product?.sizeLabel || order.items[0]?.product.sizeLabel || "Standard",
    quantity: order.quantity,
    loadedQuantity: order.loadedQuantity,
    totalAmount: Number(order.totalAmount),
    paidAmount: Number(order.paidAmount),
    invoiceNo: order.invoiceNo,
    shareToken: order.shareToken,
    truckNumber: order.transport?.truckNumber,
    driverName: order.transport?.driverName,
    driverMobile: order.transport?.driverMobile,
    expectedDelivery: order.transport?.expectedDelivery,
  };

  const getWaLink = (type: any) =>
    whatsappHref(
      order.customer.mobile,
      buildWhatsAppMessage(type, whatsappInfo, process.env.NEXT_PUBLIC_APP_URL || "")
    );

  // 7-Stage Order Lifecycle Pipeline
  const pipelineStages = [
    { key: OrderStatus.PENDING, label: "Placed / Review" },
    { key: OrderStatus.CONFIRMED, label: "Confirmed" },
    { key: OrderStatus.ASSIGNED, label: "Staff Assigned" },
    { key: OrderStatus.LOADING, label: "Loading" },
    { key: OrderStatus.LOADED, label: "Loaded & Staged" },
    { key: OrderStatus.DISPATCHED, label: "Dispatched" },
    { key: OrderStatus.DELIVERED, label: "Delivered" },
  ];

  const stageOrder = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.ASSIGNED,
    OrderStatus.LOADING,
    OrderStatus.LOADED,
    OrderStatus.DISPATCHED,
    OrderStatus.DELIVERED,
  ];

  const currentStageIndex = stageOrder.indexOf(order.status as any);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 min-w-0 max-w-full">
      {/* =========================================================================
          TOP COMMAND HEADER & ACTIONS
      ========================================================================= */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between min-w-0">
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/admin/orders"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 shadow-xs hover:bg-slate-50 hover:text-navy transition-all"
            aria-label="Back to Orders"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
              <span className="text-xs font-semibold text-slate-400">Operations</span>
              <span className="text-slate-300">/</span>
              <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">{order.orderNo}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                  ORDER_STATUS_CLASS[order.status]
                }`}
              >
                {ORDER_STATUS_LABEL[order.status]}
              </span>
              {order.invoiceNo && (
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-mono font-bold text-slate-700">
                  {order.invoiceNo}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
              Client: <strong className="font-semibold text-navy">{order.customer.companyName || order.customer.name}</strong> · Booked on {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <DownloadOrderSummaryBtn orderId={order.id} orderNo={order.orderNo} />
          {order.invoiceNo && (
            <>
              <Link
                href={`/invoice/${order.id}`}
                className="flex items-center gap-1.5 rounded-2xl bg-[#13789B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all"
              >
                <FileText className="h-4 w-4" />
                <span>View Delivery Challan</span>
              </Link>
              <a
                href={getWaLink("invoice")}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp Challan</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 sm:p-4 text-xs font-semibold text-rose-800 shadow-xs min-w-0">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* =========================================================================
          ORDER LIFECYCLE 7-STAGE PIPELINE PROGRESS STEPPER
      ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3 sm:mb-4 min-w-0">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Order Execution Pipeline</h2>
          <span className="text-xs font-bold text-navy truncate">
            Current Stage: <span className="text-[#13789B]">{ORDER_STATUS_LABEL[order.status]}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 min-w-0">
          {pipelineStages.map((stg, idx) => {
            const isCompleted = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;

            return (
              <div
                key={stg.key}
                className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all min-w-0 ${
                  isCurrent
                    ? "border-[#13789B] bg-[#13789B]/5 text-[#13789B] ring-2 ring-[#13789B]/20"
                    : isCompleted
                    ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
                    : "border-slate-100 bg-slate-50/50 text-slate-400"
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold mb-1 ${
                    isCurrent
                      ? "bg-[#13789B] text-white"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate block w-full">{stg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          FOUR TOP KPI CARDS FOR THIS SPECIFIC ORDER
      ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 min-w-0">
        <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 shadow-xs border-l-4 border-l-[#13789B] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate block">Ordered Quantity</span>
          <div className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{formatNumber(order.quantity)} <span className="text-xs font-semibold text-slate-400">blocks</span></div>
          <p className="mt-1 text-xs text-slate-500 truncate">
            {order.totalCbm ? `Total CBM: ${Number(order.totalCbm).toFixed(3)} m³` : "Standard manufactured blocks"}
          </p>
        </div>

        <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 shadow-xs border-l-4 border-l-emerald-600 min-w-0 flex flex-col justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Order Status</span>
            <div className="mt-1 text-base sm:text-lg lg:text-xl font-black text-emerald-700 leading-tight">
              {ORDER_STATUS_LABEL[order.status]}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">
            Booked: {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 shadow-xs border-l-4 border-l-indigo-600 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate block">Staged Transport</span>
          <div className="mt-1 text-lg sm:text-xl font-black text-navy truncate">
            {order.transport?.truckNumber || "Unassigned"}
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">
            Driver: {order.transport?.driverName || "Awaiting staging"}
          </p>
        </div>

        <div className={`card rounded-2xl bg-white border p-3 sm:p-4 shadow-xs border-l-4 min-w-0 ${
          hasEnoughStock ? "border-slate-200 border-l-emerald-600" : "border-rose-300 border-l-rose-600"
        }`}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate block">Factory Yard Stock</span>
          <div className={`mt-1 text-xl sm:text-2xl font-black truncate ${hasEnoughStock ? "text-navy" : "text-rose-600"}`}>
            {formatNumber(currentStock)} <span className="text-xs font-semibold text-slate-400">blocks</span>
          </div>
          <p className="mt-1 text-xs truncate">
            {hasEnoughStock ? (
              <span className="text-emerald-600 font-bold">✓ Sufficient stock</span>
            ) : (
              <span className="text-rose-600 font-bold">⚠️ Insufficient ({outQty - currentStock} short)</span>
            )}
          </p>
        </div>
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN LAYOUT: ORDER DETAILS & OPERATIONAL WORKFLOWS
      ========================================================================= */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 min-w-0">
        {/* Left Column: Customer, Product Spec & Audit Timeline */}
        <div className="space-y-4 sm:space-y-6 lg:col-span-2 min-w-0">
          {/* Customer & Construction Site Details */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#13789B]">
                  <Building2 className="h-4 w-4" />
                </span>
                <h2 className="text-sm sm:text-base font-black text-navy truncate">Customer & Construction Site</h2>
              </div>
              {order.customer.gstin && (
                <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 self-start sm:self-auto shrink-0">
                  GSTIN: {order.customer.gstin}
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 text-xs min-w-0">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-3.5 space-y-1 min-w-0">
                <span className="text-slate-400 uppercase font-bold text-[10px] block truncate">Client / Company Name</span>
                <p className="font-bold text-sm text-navy truncate">{order.customer.companyName || order.customer.name}</p>
                <p className="text-slate-500 truncate">Contact: {order.customer.name}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-3.5 space-y-1 min-w-0">
                <span className="text-slate-400 uppercase font-bold text-[10px] block truncate">Phone & Communications</span>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <p className="font-bold text-sm text-navy truncate">{order.customer.mobile}</p>
                  <a
                    href={telHref(order.customer.mobile)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline shrink-0"
                  >
                    <Phone className="h-3 w-3" /> Call
                  </a>
                </div>
                <p className="text-slate-500 truncate">{order.customer.email}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-3.5 space-y-1 sm:col-span-2 min-w-0">
                <div className="flex items-center gap-1.5 text-slate-400 uppercase font-bold text-[10px]">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">Delivery Destination / Site</span>
                </div>
                <p className="font-bold text-sm text-navy">{order.deliveryAddress}</p>
                {order.notes && (
                  <p className="mt-1 text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs">
                    <strong>Site Note:</strong> {order.notes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Product Specifications & CBM Calculations */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Layers className="h-4 w-4" />
                </span>
                <h2 className="text-sm sm:text-base font-black text-navy truncate">Order Items & Volume Breakdown</h2>
              </div>
              {order.totalCbm ? (
                <span className="rounded-xl bg-[#13789B]/10 border border-[#13789B]/30 px-3 py-1 text-xs font-black text-[#13789B]">
                  Total Volume: {Number(order.totalCbm).toFixed(3)} m³ CBM
                </span>
              ) : null}
            </div>

            {order.items && order.items.length > 0 ? (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">Unit Specs</th>
                        <th className="p-2.5 text-right">Quantity</th>
                        <th className="p-2.5 text-right">Unit CBM</th>
                        <th className="p-2.5 text-right">Total CBM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <p className="font-bold text-navy">{item.product.name}</p>
                            <span className="text-[10px] text-slate-400 capitalize">{item.product.category?.replace("_", " ") || "Material"}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            {item.product.sizeLabel ? (
                              <span className="font-mono text-slate-700">{formatBlockSizeName(item.product.sizeLabel)} ({item.product.dimensions})</span>
                            ) : item.product.bagWeightKg ? (
                              <span className="text-slate-700">{Number(item.product.bagWeightKg)} kg Bag</span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-2.5 text-right font-black text-navy">
                            {formatNumber(item.quantity)} {item.product.category === "AAC_BLOCK" ? "Blocks" : "Bags"}
                          </td>
                          <td className="p-2.5 text-right text-slate-600 font-mono">
                            {item.cbmPerUnit ? `${Number(item.cbmPerUnit).toFixed(4)} m³` : "-"}
                          </td>
                          <td className="p-2.5 text-right font-black text-[#13789B] font-mono">
                            {item.totalCbm ? `${Number(item.totalCbm).toFixed(3)} m³` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold">
                        <td colSpan={2} className="p-2.5 text-slate-700">Combined Totals:</td>
                        <td className="p-2.5 text-right font-black text-navy">
                          {formatNumber(order.quantity)} Blocks
                        </td>
                        <td></td>
                        <td className="p-2.5 text-right font-black text-[#13789B] font-mono">
                          {order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} m³` : "-"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#13789B]">Block Jointing Morter</span>
                    <span className="block text-[11px] text-slate-500">40 KG Bag Packaging Only</span>
                  </div>
                  <span className="font-mono font-black text-navy text-sm">
                    {order.adhesiveBags ?? 0} Bags
                  </span>
                </div>
              </div>
            ) : order.product ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 rounded-2xl bg-slate-50 p-3 sm:p-4 text-xs min-w-0">
                <div className="min-w-0">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block truncate">Block Size</span>
                  <p className="mt-1 font-black text-xs sm:text-sm text-navy truncate">{formatBlockSizeName(order.product.sizeLabel)}</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">{order.product.dimensions}</p>
                </div>

                <div className="min-w-0">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block truncate">Unit Volume</span>
                  <p className="mt-1 font-black text-xs sm:text-sm text-navy truncate">{Number(order.product.cbmPerBlock).toFixed(4)} m³</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Per block</p>
                </div>

                <div className="min-w-0">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block truncate">Stacking Ratio</span>
                  <p className="mt-1 font-black text-xs sm:text-sm text-[#13789B] truncate">{Number(order.product.blocksPerCbm).toFixed(1)} blk/m³</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Yard stacking</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Order Lifecycle Activity Audit Log */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#13789B]">
                <Clock className="h-4 w-4" />
              </span>
              <h2 className="text-base font-black text-navy">Audit Trail & Operational Log</h2>
            </div>

            <div className="space-y-4">
              {order.events.map((evt, idx) => {
                const isLatest = idx === order.events.length - 1;
                return (
                  <div key={evt.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-3.5 w-3.5 rounded-full ${
                          isLatest ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-300"
                        }`}
                      />
                      {idx < order.events.length - 1 && (
                        <div className="h-full w-0.5 bg-slate-200 my-1" />
                      )}
                    </div>
                    <div className="pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-navy">{evt.title}</p>
                        <span className="text-slate-400 text-[11px]">{formatDateTime(evt.createdAt)}</span>
                      </div>
                      {evt.note && <p className="mt-0.5 text-slate-600 bg-slate-50 rounded-lg p-1.5 border border-slate-100">{evt.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Workflow Actions, Dispatch & Payments */}
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* 1. APPROVE / REJECT FORM (If Pending) */}
          {order.status === OrderStatus.PENDING && (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4 border-l-4 border-l-amber-500 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <h3 className="text-sm sm:text-base font-black text-navy truncate">Super Admin Review & Approval</h3>
              </div>
              <p className="text-xs text-slate-500">
                Confirming enables truck staging, loading staff assignment, and material dispatch clearance.
              </p>

              <form action={confirmOrderAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="rate" value={Number(order.rate) || 50} />
                <div>
                  <label className="label">Final Approved Quantity (Blocks)</label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    defaultValue={order.quantity}
                    className="field text-sm font-black"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Order & Staging Clearance</span>
                </button>
              </form>

              <div className="border-t border-slate-100 pt-3">
                <form action={rejectOrderAction} className="space-y-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input
                    name="reason"
                    placeholder="Optional rejection reason"
                    className="field text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                  >
                    Reject Order
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 2. TRUCK / DRIVER / STAFF ASSIGNMENT (If Confirmed or Assigned) */}
          {(order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.ASSIGNED) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4 border-l-4 border-l-[#13789B] min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#13789B]">
                  <Truck className="h-4 w-4" />
                </span>
                <h3 className="text-sm sm:text-base font-black text-navy truncate">Loading Staff & Truck Staging</h3>
              </div>

              <form action={assignTransportAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <div>
                  <label className="label">Assign Loading Staff *</label>
                  <select
                    name="staffId"
                    required
                    defaultValue={order.assignedStaffId ?? ""}
                    className="field text-xs font-bold"
                  >
                    <option value="">Select staff member</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Truck Registration Number *</label>
                  <input
                    name="truckNumber"
                    required
                    defaultValue={order.transport?.truckNumber ?? ""}
                    placeholder="e.g. GJ-01-AX-9942"
                    className="field text-xs font-mono font-bold uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="label">Driver Name *</label>
                    <input
                      name="driverName"
                      required
                      defaultValue={order.transport?.driverName ?? ""}
                      placeholder="e.g. Sanjay Parmar"
                      className="field text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="label">Driver Mobile *</label>
                    <input
                      name="driverMobile"
                      required
                      defaultValue={order.transport?.driverMobile ?? ""}
                      placeholder="10-digit mobile"
                      className="field text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Transporter / Logistics Agency</label>
                  <input
                    name="transporterName"
                    defaultValue={order.transport?.transporterName ?? ""}
                    placeholder="e.g. Gujarat Express Freight"
                    className="field text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Stage Vehicle & Assign Staff</span>
                </button>
              </form>

              {order.status === OrderStatus.ASSIGNED && (
                <a
                  href={getWaLink("assigned")}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all w-full"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Send Truck & Driver Info on WhatsApp</span>
                </a>
              )}
            </div>
          )}

          {/* 3. LOGISTICS DISPATCH & DELIVERY CONTROLS */}
          {(order.status === OrderStatus.LOADING || order.status === OrderStatus.LOADED || order.status === OrderStatus.DISPATCHED || order.status === OrderStatus.DELIVERED) && (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4 border-l-4 border-l-indigo-600 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Boxes className="h-4 w-4" />
                </span>
                <h3 className="text-sm sm:text-base font-black text-navy truncate">Logistics & Dispatch Verification</h3>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 sm:p-3.5 space-y-2 text-xs border border-slate-100 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Assigned Loading Staff</span>
                  <strong className="font-bold text-navy truncate">{order.assignedStaff?.name || "—"}</strong>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Vehicle / Driver</span>
                  <strong className="font-bold text-navy truncate">
                    {order.transport?.truckNumber} ({order.transport?.driverName})
                  </strong>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Physically Loaded</span>
                  <strong className="font-black text-emerald-700">
                    {formatNumber(order.loadedQuantity || order.quantity)} / {formatNumber(order.quantity)} Blocks
                  </strong>
                </div>
              </div>

              {order.status === OrderStatus.LOADED && (
                <>
                  {!hasEnoughStock ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 sm:p-3.5 text-xs text-rose-800">
                      <strong>Cannot Dispatch:</strong> Current factory yard stock ({currentStock}) is lower than
                      loaded quantity ({outQty}). Please record production stock-in before dispatching.
                    </div>
                  ) : (
                    <form action={dispatchOrderAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
                      >
                        <Send className="h-4 w-4" />
                        <span>Authorize Dispatch & Deduct Stock</span>
                      </button>
                    </form>
                  )}

                  <a
                    href={getWaLink("loaded")}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all w-full"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp: Loading Completed</span>
                  </a>
                </>
              )}

              {order.status === OrderStatus.DISPATCHED && (
                <div className="space-y-2">
                  <a
                    href={getWaLink("dispatched")}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all w-full"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp: Truck Dispatched</span>
                  </a>
                  <form action={deliverOrderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm Material Delivered to Site</span>
                    </button>
                  </form>
                </div>
              )}

              {order.status === OrderStatus.DELIVERED && (
                <a
                  href={getWaLink("delivered")}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all w-full"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp: Delivery Confirmation</span>
                </a>
              )}
            </div>
          )}

          {/* 4. DISPATCH DOCUMENTATION & DELIVERY CHALLAN */}
          {order.invoiceNo && (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4 border-l-4 border-l-emerald-600 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FileText className="h-4 w-4" />
                </span>
                <h3 className="text-sm sm:text-base font-black text-navy truncate">Delivery Challan Documentation</h3>
              </div>

              <p className="text-xs text-slate-500">
                Official Material Delivery Challan & Dispatch Slip generated under Challan #{order.invoiceNo}.
              </p>

              <div className="rounded-2xl bg-slate-50 p-3 sm:p-3.5 space-y-2 text-xs border border-slate-100 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Challan / Slip</span>
                  <strong className="font-mono font-bold text-navy truncate">{order.invoiceNo}</strong>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Order Quantity</span>
                  <strong className="font-bold text-navy">{formatNumber(order.quantity)} blocks</strong>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">HSN Classification</span>
                  <strong className="font-mono text-slate-600">6810 (AAC Blocks)</strong>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Link
                  href={`/invoice/${order.id}`}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all"
                >
                  <FileText className="h-4 w-4" />
                  <span>View / Print Official Delivery Challan</span>
                </Link>

                <a
                  href={getWaLink("invoice")}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Send Challan Slip on WhatsApp</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
