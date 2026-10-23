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
  Layers,
  ShieldCheck,
  UserCheck,
  Send,
  Boxes,
  Check,
  ExternalLink,
  History,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getProductStock, getProductCbm } from "@/lib/actions/stock";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatBlockSizeName,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  telHref,
  whatsappHref,
  mapsHref,
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
import { OpenLocationButton } from "@/components/open-location-button";
import { StaffWeighbridgeVehiclePanel } from "@/components/staff-weighbridge-vehicle-panel";
import { TruckStagingForm } from "@/components/truck-staging-form";
import { DeliveryChallanPanel } from "@/components/delivery-challan-panel";
import { OrderLifecycleTracker } from "@/components/order-lifecycle-tracker";
import { LogisticsDispatchChecklist } from "@/components/logistics-dispatch-checklist";
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
        salesman: true,
        transport: true,
        assignedStaff: true,
        weighbridgeSlip: true,
        loadingRecord: true,
        editHistory: { orderBy: { createdAt: "desc" } },
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
      where: { role: { in: ["STAFF", "STOCKER"] }, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!order) notFound();

  const primaryProductId =
    order.productId ||
    order.items?.find((i) => i.productType === "AAC_BLOCK")?.productId ||
    order.items?.[0]?.productId;

  const currentStock = primaryProductId ? await getProductStock(primaryProductId) : 0;
  const currentCbm = primaryProductId ? await getProductCbm(primaryProductId) : 0;
  const orderCbm = Number(order.totalCbm ?? 0);
  const outCbm = Number(order.loadedCbm ?? 0) > 0 ? Number(order.loadedCbm) : orderCbm;
  const outQty = order.loadedQuantity > 0 ? order.loadedQuantity : order.quantity;
  const isAacBlock =
    order.product?.category === "AAC_BLOCK" ||
    (!order.product?.category && (order.totalCbm !== null || order.quantity > 0));
  const hasEnoughStock =
    isAacBlock && orderCbm > 0
      ? currentCbm >= outCbm - 0.0001
      : currentStock >= outQty;

  // WhatsApp Helpers
  const whatsappInfo = {
    orderNo: order.orderNo,
    customerName: order.customer?.companyName || order.customer?.name || "Customer",
    productName: order.product?.name || order.items?.[0]?.product?.name || "AAC Blocks",
    sizeLabel: order.product?.sizeLabel || order.items?.[0]?.product?.sizeLabel || "Standard",
    quantity: order.quantity,
    loadedQuantity: order.loadedQuantity,
    totalAmount: Number(order.totalAmount || 0),
    paidAmount: Number(order.paidAmount || 0),
    invoiceNo: order.invoiceNo,
    shareToken: order.shareToken,
    truckNumber: order.transport?.truckNumber,
    driverName: order.transport?.driverName,
    driverMobile: order.transport?.driverMobile,
    expectedDelivery: order.transport?.expectedDelivery,
  };

  const getWaLink = (type: Parameters<typeof buildWhatsAppMessage>[0]) =>
    whatsappHref(
      order.customer?.mobile || "",
      buildWhatsAppMessage(type, whatsappInfo, process.env.NEXT_PUBLIC_APP_URL || "")
    );

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
              {order.dcNumber && (
                <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-[11px] font-mono font-bold text-purple-800">
                  Challan: {order.dcNumber}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
              Client: <strong className="font-semibold text-navy">{order.customer?.companyName || order.customer?.name || "Customer"}</strong>
              {(order.salesman?.name || order.salesmanNameSnapshot) && (
                <span className="inline-block ml-2 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                  Salesman: {order.salesman?.name || order.salesmanNameSnapshot}
                </span>
              )}
              {order.createdByRole === "SALESMAN" ? (
                <span className="inline-block ml-2 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 border border-purple-300">
                  Created by Salesman: {order.createdByNameSnapshot || order.salesman?.name || "Salesman"}
                </span>
              ) : (
                <span className="inline-block ml-2 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-[#13789B] border border-teal-200">
                  Created by Customer
                </span>
              )}{" "}
              · Booked on {formatDateTime(order.createdAt)}
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
          ORDER LIFECYCLE 4-STAGE PIPELINE PROGRESS STEPPER
      ========================================================================= */}
      <OrderLifecycleTracker
        status={order.status}
        confirmedAt={order.confirmedAt}
        dispatchedAt={order.dispatchedAt}
        deliveredAt={order.deliveredAt}
        createdAt={order.createdAt}
      />

      {/* =========================================================================
          FOUR TOP KPI CARDS FOR THIS SPECIFIC ORDER
      ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 min-w-0">
        <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 shadow-xs border-l-4 border-l-[#13789B] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate block">Ordered Volume</span>
          <div className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">
            {order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} CBM` : `${formatNumber(order.quantity)} units`}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 italic truncate">
            ≈ {formatNumber(order.quantity)} Blocks
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
            {currentCbm.toFixed(3)} CBM
          </div>
          <p className="mt-0.5 text-xs text-slate-500 italic truncate">
            ≈ {formatNumber(currentStock)} Blocks
          </p>
          <p className="mt-1 text-xs truncate">
            {hasEnoughStock ? (
              <span className="text-emerald-600 font-bold">✓ Sufficient stock</span>
            ) : (
              <span className="text-rose-600 font-bold">⚠️ Insufficient ({(outCbm - currentCbm).toFixed(3)} CBM short)</span>
            )}
          </p>
        </div>
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN LAYOUT: ORDER DETAILS & OPERATIONAL WORKFLOWS
      ========================================================================= */}
      {/* =========================================================================
          100% FULL-WIDTH: ORDER ITEMS & MATERIAL BREAKDOWN
      ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 shadow-2xs">
              <Layers className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-navy">Order Items & Volume Breakdown</h2>
              <p className="text-[11px] text-slate-500">Official material manifest specifications and cubic meter volume</p>
            </div>
          </div>
          {order.totalCbm ? (
            <span className="rounded-xl bg-[#13789B]/10 border border-[#13789B]/30 px-3 py-1 text-xs font-black text-[#13789B] shrink-0 self-start sm:self-auto">
              Total Volume: {Number(order.totalCbm).toFixed(3)} m³ CBM (≈ {formatNumber(order.quantity)} Blocks)
            </span>
          ) : null}
        </div>

        {order.items && order.items.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Unit Specs</th>
                    <th className="p-3 text-right">Volume & Quantity</th>
                    <th className="p-3 text-right">Unit CBM</th>
                    <th className="p-3 text-right">Total CBM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <p className="font-bold text-navy text-sm">{item.product?.name || "Product"}</p>
                        <span className="text-[10px] text-slate-400 capitalize">{item.product?.category?.replace("_", " ") || "Material"}</span>
                      </td>
                      <td className="p-3 text-center">
                        {item.product?.sizeLabel ? (
                          <span className="font-mono text-slate-700 font-semibold">{formatBlockSizeName(item.product.sizeLabel)} ({item.product.dimensions})</span>
                        ) : item.product?.bagWeightKg ? (
                          <span className="text-slate-700 font-semibold">{Number(item.product.bagWeightKg)} kg Bag</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {item.totalCbm ? (
                          <>
                            <div className="font-black text-navy text-sm">{Number(item.totalCbm).toFixed(3)} CBM</div>
                            <div className="text-[11px] text-slate-400 italic">≈ {formatNumber(item.quantity)} Blocks</div>
                          </>
                        ) : (
                          <div className="font-black text-navy text-sm">{formatNumber(item.quantity)} Bags</div>
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-600 font-mono">
                        {item.cbmPerUnit ? `${Number(item.cbmPerUnit).toFixed(4)} CBM` : "-"}
                      </td>
                      <td className="p-3 text-right font-black text-[#13789B] font-mono text-sm">
                        {item.totalCbm ? `${Number(item.totalCbm).toFixed(3)} CBM` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold">
                    <td colSpan={2} className="p-3 text-slate-700 text-sm">Combined Totals:</td>
                    <td className="p-3 text-right">
                      <div className="font-black text-navy text-sm">{order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} CBM` : "-"}</div>
                      <div className="text-[11px] text-slate-400 italic">≈ {formatNumber(order.quantity)} Blocks</div>
                    </td>
                    <td></td>
                    <td className="p-3 text-right font-black text-[#13789B] font-mono text-sm">
                      {order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} CBM` : "-"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#13789B] text-sm">Block Jointing Morter</span>
                <span className="block text-[11px] text-slate-500">40 KG Bag Packaging Only</span>
              </div>
              <span className="font-mono font-black text-navy text-base">
                {order.adhesiveBags ?? 0} Bags
              </span>
            </div>
          </div>
        ) : order.product ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-xs min-w-0">
            <div className="min-w-0">
              <span className="text-slate-400 font-bold uppercase text-[10px] block truncate">Block Size</span>
              <p className="mt-1 font-black text-sm text-navy truncate">{formatBlockSizeName(order.product.sizeLabel)}</p>
              <p className="text-[11px] text-slate-500 truncate">{order.product.dimensions}</p>
            </div>

            <div className="min-w-0">
              <span className="text-slate-400 font-bold uppercase text-[10px] block truncate">Unit Volume</span>
              <p className="mt-1 font-black text-sm text-navy truncate">{Number(order.product.cbmPerBlock).toFixed(4)} m³</p>
              <p className="text-[11px] text-slate-500 truncate">Per block</p>
            </div>

            <div className="min-w-0">
              <span className="text-slate-400 font-bold uppercase text-[10px] block truncate">Stacking Ratio</span>
              <p className="mt-1 font-black text-sm text-[#13789B] truncate">{Number(order.product.blocksPerCbm).toFixed(1)} blk/m³</p>
              <p className="text-[11px] text-slate-500 truncate">Yard stacking</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN LAYOUT: CUSTOMER PROFILE & OPERATIONAL WORKFLOWS
      ========================================================================= */}
      <div className="grid gap-6 lg:grid-cols-2 min-w-0">
        {/* Left Column: Customer, GST Invoicing & Audit Timeline */}
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* Customer & Construction Site Details */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#13789B]">
                  <Building2 className="h-4 w-4" />
                </span>
                <h2 className="text-sm sm:text-base font-black text-navy truncate">Customer & Construction Site</h2>
              </div>
              {order.customer?.gstin && (
                <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 self-start sm:self-auto shrink-0">
                  GSTIN: {order.customer.gstin}
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 text-xs min-w-0">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-3.5 space-y-1 min-w-0">
                <span className="text-slate-400 uppercase font-bold text-[10px] block truncate">Client / Company Name</span>
                <p className="font-bold text-sm text-navy truncate">{order.customer?.companyName || order.customer?.name || "Customer"}</p>
                <p className="text-slate-500 truncate">Contact: {order.customer?.name || "-"}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-3.5 space-y-1 min-w-0">
                <span className="text-slate-400 uppercase font-bold text-[10px] block truncate">Phone & Communications</span>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <p className="font-bold text-sm text-navy truncate">{order.customer?.mobile || "-"}</p>
                  {order.customer?.mobile && (
                    <a
                      href={telHref(order.customer.mobile)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline shrink-0"
                    >
                      <Phone className="h-3 w-3" /> Call
                    </a>
                  )}
                </div>
                <p className="text-slate-500 truncate">{order.customer?.email || "-"}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-3.5 space-y-2 sm:col-span-2 min-w-0">
                <div className="flex items-center justify-between gap-1.5 text-slate-400 uppercase font-bold text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">Delivery Destination / Site</span>
                  </div>
                  {order.locationSource && (
                    <span className="rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                      Source: {order.locationSource === "GOOGLE_MAPS" ? "Google Maps" : "Custom Site Entry"}
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm text-navy">{order.deliveryAddress}</p>
                {order.formattedAddress && order.formattedAddress !== order.deliveryAddress && (
                  <p className="text-xs text-slate-500">
                    <strong className="text-slate-600">Full Mapped Address:</strong> {order.formattedAddress}
                  </p>
                )}
                {(order.customSiteName || order.nearbyLandmark || order.city) && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 bg-white/80 rounded-xl p-2 border border-slate-200/60">
                    {order.customSiteName && <span><strong>Site:</strong> {order.customSiteName}</span>}
                    {order.villageArea && <span><strong>Area:</strong> {order.villageArea}</span>}
                    {order.city && <span><strong>City:</strong> {order.city}</span>}
                    {order.nearbyLandmark && <span><strong>Landmark:</strong> {order.nearbyLandmark}</span>}
                    {order.pincode && <span><strong>PIN:</strong> {order.pincode}</span>}
                  </div>
                )}
                {order.notes && (
                  <p className="mt-1 text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs">
                    <strong>Site Note:</strong> {order.notes}
                  </p>
                )}
                <div className="pt-1">
                  <OpenLocationButton
                    address={order.deliveryAddress}
                    latitude={order.latitude ? Number(order.latitude) : null}
                    longitude={order.longitude ? Number(order.longitude) : null}
                    variant="button"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* GST Billing & Tax Invoicing Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  order.gstBillingSelected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
                }`}>
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-navy">GST Billing Details</h2>
                  <p className="text-[11px] text-slate-500">Official tax billing selection for this order</p>
                </div>
              </div>
              <div>
                {order.gstBillingSelected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>GST Bill Requested</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span>Without-GST Bill</span>
                  </span>
                )}
              </div>
            </div>

            {order.gstBillingSelected ? (
              <div className="grid gap-3 sm:grid-cols-2 text-xs bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3.5 sm:p-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">GST Registered Name</span>
                  <p className="font-extrabold text-sm text-navy mt-0.5">{order.gstRegisteredName || order.customer?.companyName || order.customer?.name || "Customer"}</p>
                  {order.gstTradeName && order.gstTradeName !== order.gstRegisteredName && (
                    <p className="text-[11px] text-slate-500 mt-0.5">Trade Name: {order.gstTradeName}</p>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">GST Number (GSTIN)</span>
                  <p className="font-black text-sm font-mono text-emerald-800 mt-0.5 tracking-wider">
                    {order.gstNumber || order.customer?.gstin || "—"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      ✓ Status: {order.gstStatus || "Active"}
                    </span>
                    {order.gstState && (
                      <span className="text-[11px] text-slate-500">State: {order.gstState}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-3.5 text-xs text-slate-600">
                <p className="font-medium">
                  <strong>Non-GST Order:</strong> Customer selected direct supply without a GST tax invoice. No GST input credit claim.
                </p>
              </div>
            )}
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
                  <label className="label">Approved Volume (CBM) *</label>
                  <input
                    name="cbm"
                    type="number"
                    step="0.001"
                    min="0.001"
                    defaultValue={order.totalCbm ? Number(order.totalCbm).toFixed(3) : undefined}
                    placeholder="Enter CBM quantity"
                    className="field text-sm font-black"
                  />
                  <input type="hidden" name="quantity" value={order.quantity} />
                  <p className="mt-1 text-[11px] text-slate-500 italic">
                    Current: <strong>{order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} CBM` : "-"}</strong> (≈ {formatNumber(order.quantity)} Blocks)
                  </p>
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

          {/* 2. SHARED TRUCK STAGING & LOADING DETAILS */}
          {order.status !== OrderStatus.PENDING && (
            <TruckStagingForm
              order={order as any}
              staffList={staffList}
              userRole="ADMIN"
              currentUserId={session.id}
              currentUserName={session.name}
            />
          )}

          {/* 3. LOGISTICS DISPATCH & DELIVERY CONTROLS */}
          {order.status !== OrderStatus.PENDING && (
            <LogisticsDispatchChecklist
              order={order as any}
              hasEnoughStock={hasEnoughStock}
              currentCbm={currentCbm}
              userRole="ADMIN"
            />
          )}

          {/* 4. DISPATCH DOCUMENTATION & DELIVERY CHALLAN */}
          <DeliveryChallanPanel order={order as any} userRole="ADMIN" />
        </div>
      </div>

      {/* =========================================================================
          100% FULL-WIDTH: WEIGHBRIDGE SLIP, VEHICLE DETAILS & DRIVER WHATSAPP
      ========================================================================= */}
      <StaffWeighbridgeVehiclePanel order={order} />

      {/* =========================================================================
          100% FULL-WIDTH: ORDER CHANGE HISTORY (AUDIT)
      ========================================================================= */}
      {order.editHistory && order.editHistory.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <History className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-navy">Order Change History (Audit)</h2>
              <p className="text-xs text-slate-500">Immutable record of modifications made before dispatch</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            {order.editHistory.map((hist) => (
              <div key={hist.id} className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 sm:p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-navy text-sm">
                    Version {hist.orderVersion} — Modified by {hist.changedByName || hist.userRole}
                  </span>
                  <span className="text-slate-400 text-xs font-mono">{formatDateTime(hist.createdAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">Modified Fields:</span>
                  {hist.changedFields.map((f) => (
                    <span key={f} className="rounded-md bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5">
                      {f}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="rounded-xl bg-white p-3 border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Previous Values</span>
                    <pre className="text-slate-600 font-mono text-[11px] whitespace-pre-wrap mt-1 leading-relaxed">
                      {JSON.stringify(hist.previousValues, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-200/60">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block tracking-wider">Updated Values</span>
                    <pre className="text-emerald-900 font-mono text-[11px] whitespace-pre-wrap mt-1 leading-relaxed">
                      {JSON.stringify(hist.newValues, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

