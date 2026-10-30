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
  AlertCircle,
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
  Package,
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
import { confirmOrderAction, dispatchOrderAction, markOrderDoneAction } from "@/lib/actions/orders";
import { DownloadOrderSummaryButton } from "@/components/download-order-summary-btn";
import { OpenLocationButton } from "@/components/open-location-button";
import { StaffWeighbridgeVehiclePanel } from "@/components/staff-weighbridge-vehicle-panel";
import { TruckStagingForm } from "@/components/truck-staging-form";
import { DeliveryChallanPanel } from "@/components/delivery-challan-panel";
import { OrderLifecycleTracker } from "@/components/order-lifecycle-tracker";
import { StaffLoadingForm } from "@/components/staff-loading-form";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function StockerOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await getSession();
  if (!session || !["STOCKER", "STAFF", "ADMIN"].includes(session.role)) redirect("/login");

  const { id } = await params;
  const { error, success } = await searchParams;

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
        events: { orderBy: { createdAt: "asc" }, include: { createdBy: true } },
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

  // Isolate AAC Block items vs Mortar items
  const aacBlockItems = (order.items || []).filter(
    (it) =>
      it.productType === "AAC_BLOCK" ||
      it.product?.category === "AAC_BLOCK" ||
      (!["MORTAR"].includes(it.productType) &&
        it.product?.category !== "MORTAR" &&
        Number(it.cbmPerUnit || 0) > 0)
  );

  const mortarItems = (order.items || []).filter(
    (it) =>
      it.productType === "MORTAR" ||
      it.product?.category === "MORTAR" ||
      (!["AAC_BLOCK"].includes(it.productType) &&
        it.product?.category !== "AAC_BLOCK" &&
        (it.cbmPerUnit == null || Number(it.cbmPerUnit) === 0))
  );

  const totalMortarBags =
    order.adhesiveBags && order.adhesiveBags > 0
      ? order.adhesiveBags
      : mortarItems.reduce((sum, it) => sum + (it.quantity || 0), 0);

  const totalAacVolumeCbm =
    aacBlockItems.length > 0
      ? aacBlockItems.reduce((acc, it) => acc + Number(it.totalCbm || 0), 0)
      : order.totalCbm
      ? Number(order.totalCbm)
      : 0;

  const totalAacBlocksCount =
    aacBlockItems.length > 0
      ? aacBlockItems.reduce((acc, it) => acc + (it.quantity || 0), 0)
      : order.quantity;

  // WhatsApp Helpers
  const whatsappInfo = {
    orderNo: order.orderNo,
    customerName: order.customer?.companyName || order.customer?.name || "Customer",
    productName: order.product?.name || order.items?.[0]?.product?.name || "AAC Blocks",
    size: order.product?.sizeLabel
      ? formatBlockSizeName(order.product.sizeLabel)
      : order.items?.[0]?.product?.sizeLabel
      ? formatBlockSizeName(order.items[0].product.sizeLabel)
      : "Standard",
    quantity: order.quantity,
    totalCbm: order.totalCbm ? Number(order.totalCbm) : undefined,
    adhesiveBags: order.adhesiveBags ?? 0,
    deliveryAddress: order.formattedAddress || order.deliveryAddress,
    googleMapsUrl: mapsHref(order.latitude ? Number(order.latitude) : null, order.longitude ? Number(order.longitude) : null, order.formattedAddress || order.deliveryAddress),
    driverName: order.transport?.driverName,
    driverMobile: order.transport?.driverMobile,
    truckNumber: order.transport?.truckNumber,
    assignedStaffName: order.assignedStaff?.name,
  };

  const customerMsg = buildWhatsAppMessage("status", whatsappInfo, process.env.NEXT_PUBLIC_APP_URL || "");
  const backHref = session.role === "STAFF" ? "/staff/dashboard" : session.role === "ADMIN" ? "/admin/orders" : "/stocker/orders";

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 min-w-0">
      {/* =========================================================================
          TOP BREADCRUMB & HEADER SECTION
      ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href={backHref}
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            aria-label="Back to Orders"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black text-navy truncate">
                {order.orderNo}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                  ORDER_STATUS_CLASS[order.status]
                }`}
              >
                {ORDER_STATUS_LABEL[order.status]}
              </span>
              {order.totalCbm ? (
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-[#1E72A8]">
                  {Number(order.totalCbm).toFixed(3)} m³ CBM
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              Client: <strong className="text-navy">{order.customer?.companyName || order.customer?.name || "Customer"}</strong> · Booked {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Top Actions: WhatsApp & Downloads */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
          {order.customer?.mobile && (
            <a
              href={whatsappHref(order.customer.mobile, customerMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp Customer</span>
            </a>
          )}
          <DownloadOrderSummaryButton orderId={order.id} orderNo={order.orderNo} />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{decodeURIComponent(error)}</span>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{decodeURIComponent(success)}</span>
        </div>
      ) : null}

      {/* 4-STAGE ORDER PROGRESSION TRACKER */}
      <OrderLifecycleTracker
        orderId={order.id}
        orderNo={order.orderNo}
        status={order.status}
        confirmedAt={order.confirmedAt}
        dispatchedAt={order.dispatchedAt}
        deliveredAt={order.deliveredAt}
        createdAt={order.createdAt}
        userRole={session.role as any}
      />

      {/* =========================================================================
          4 STAT CARDS
      ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        <div className="card rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 shadow-xs border-l-4 border-l-[#1E72A8] min-w-0">
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
          <div className={`mt-1 text-xl sm:text-2xl font-black truncate whitespace-nowrap ${hasEnoughStock ? "text-navy" : "text-rose-600"}`}>
            {currentCbm.toFixed(1)} CBM
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
          {totalAacVolumeCbm > 0 || order.totalCbm ? (
            <span className="rounded-xl bg-[#13789B]/10 border border-[#13789B]/30 px-3 py-1 text-xs font-black text-[#13789B] shrink-0 self-start sm:self-auto">
              Total Volume: {(totalAacVolumeCbm > 0 ? totalAacVolumeCbm : Number(order.totalCbm || 0)).toFixed(3)} m³ CBM (≈ {formatNumber(totalAacBlocksCount)} Blocks)
            </span>
          ) : null}
        </div>

        {aacBlockItems.length > 0 ? (
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
                  {aacBlockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <p className="font-bold text-navy text-sm">{item.product?.name || item.productName || "AAC Block"}</p>
                        <span className="text-[10px] text-slate-400 capitalize">{item.product?.category?.replace("_", " ") || "AAC Block"}</span>
                      </td>
                      <td className="p-3 text-center">
                        {item.product?.sizeLabel ? (
                          <span className="font-mono text-slate-700 font-semibold">{formatBlockSizeName(item.product.sizeLabel)} ({item.product.dimensions})</span>
                        ) : item.dimensions ? (
                          <span className="font-mono text-slate-700 font-semibold">{item.dimensions}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-black text-navy text-sm">{Number(item.totalCbm || 0).toFixed(3)} CBM</div>
                        <div className="text-[11px] text-slate-400 italic">≈ {formatNumber(item.quantity)} Blocks</div>
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
                      <div className="font-black text-navy text-sm">{totalAacVolumeCbm.toFixed(3)} CBM</div>
                      <div className="text-[11px] text-slate-400 italic">≈ {formatNumber(totalAacBlocksCount)} Blocks</div>
                    </td>
                    <td></td>
                    <td className="p-3 text-right font-black text-[#13789B] font-mono text-sm">
                      {totalAacVolumeCbm.toFixed(3)} CBM
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#13789B] text-sm">Block Jointing Morter</span>
                <span className="block text-[11px] text-slate-500">Factory Specification: 40 KG Bag Packaging Only</span>
              </div>
              <span className="font-mono font-black text-navy text-base">
                {totalMortarBags} Bags
              </span>
            </div>
          </div>
        ) : order.product ? (
          <div className="space-y-3">
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
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#13789B] text-sm">Block Jointing Morter</span>
                <span className="block text-[11px] text-slate-500">Factory Specification: 40 KG Bag Packaging Only</span>
              </div>
              <span className="font-mono font-black text-navy text-base">
                {totalMortarBags} Bags
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#13789B] text-sm">Block Jointing Morter</span>
              <span className="block text-[11px] text-slate-500">Factory Specification: 40 KG Bag Packaging Only</span>
            </div>
            <span className="font-mono font-black text-navy text-base">
              {totalMortarBags} Bags
            </span>
          </div>
        )}
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN LAYOUT: CUSTOMER PROFILE & OPERATIONAL WORKFLOWS
      ========================================================================= */}
      <div className="grid gap-6 lg:grid-cols-2 min-w-0">
        {/* Left Column: Customer, Site Address, GST & Audit Timeline */}
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

          {/* GST Billing Details Card */}
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
                  <strong>Non-GST Order:</strong> Customer selected direct supply without a GST tax invoice.
                </p>
              </div>
            )}
          </div>

          {/* Execution Timeline & Audit Log */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#13789B]">
                <Clock className="h-4 w-4" />
              </span>
              <h2 className="text-base font-black text-navy">Order Execution Timeline & History</h2>
            </div>

            <div className="space-y-4">
              {order.events.map((evt, idx) => {
                const isLatest = idx === order.events.length - 1;
                return (
                  <div key={evt.id} className="flex gap-3 text-xs">
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
                    <div className="pb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-navy">{evt.title}</p>
                        <span className="text-slate-400 text-[11px]">{formatDateTime(evt.createdAt)}</span>
                      </div>
                      {evt.createdBy?.name && (
                        <span className="text-[11px] text-slate-400">
                          by {evt.createdBy.name} ({evt.createdBy.role})
                        </span>
                      )}
                      {evt.note && <p className="mt-0.5 text-slate-600 bg-slate-50 rounded-lg p-1.5 border border-slate-100">{evt.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Staging, Loading & Dispatch Controls */}
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* Order Confirmation (if PENDING) */}
          {order.status === OrderStatus.PENDING && (
            <div className="rounded-3xl border border-amber-300 bg-amber-50/60 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-black text-navy">Order Confirmation & Yard Clearance</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    This order is in <strong>Placed</strong> status. Confirming authorizes factory dispatch clearance and unlocks vehicle staging & loading.
                  </p>
                </div>
              </div>

              <form action={confirmOrderAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="quantity" value={order.quantity} />
                {order.totalCbm ? (
                  <input type="hidden" name="cbm" value={Number(order.totalCbm).toFixed(3)} />
                ) : null}

                <div className="rounded-2xl bg-white border border-amber-200/80 p-4 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Order Reference:</span>
                    <span className="font-black text-navy font-mono">{order.orderNo}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold text-navy">{order.customer?.companyName || order.customer?.name || "Customer"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Total Volume:</span>
                    <span className="font-black text-navy font-mono">
                      {order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} CBM` : `${formatNumber(order.quantity)} blocks`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Block Quantity:</span>
                    <span className="font-black text-navy font-mono">≈ {formatNumber(order.quantity)} Blocks</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-sm font-bold text-white shadow-xs transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Order & Clear for Staging</span>
                </button>
              </form>
            </div>
          )}

          {/* Shared Loading Staff & Truck Staging Form (Available after confirmation) */}
          {order.status !== OrderStatus.PENDING && (
            <TruckStagingForm
              order={order as any}
              staffList={staffList}
              userRole={session.role as any}
              currentUserId={session.id}
              currentUserName={session.name}
            />
          )}

          {/* Shared Delivery Challan Documentation (Available after confirmation) */}
          {order.status !== OrderStatus.PENDING && (
            <DeliveryChallanPanel
              order={order as any}
              userRole={session.role as any}
            />
          )}

          {/* Loading Action Area */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            {order.status === OrderStatus.PENDING ? (
              <div className="rounded-2xl bg-amber-50/50 border border-amber-200/80 p-5 text-center space-y-2">
                <Clock className="mx-auto h-8 w-8 text-amber-600" />
                <h3 className="text-base font-bold text-navy">Order Awaiting Confirmation</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Please click <strong>Confirm Order</strong> above to clear the order for factory loading and vehicle staging.
                </p>
              </div>
            ) : null}

            {order.status === OrderStatus.CONFIRMED ? (
              <div className="rounded-2xl bg-blue-50/60 border border-blue-200/80 p-5 text-center space-y-2">
                <Clock className="mx-auto h-8 w-8 text-[#1E72A8]" />
                <h3 className="text-base font-bold text-navy">Order Confirmed — Awaiting Vehicle Staging</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Order is cleared for dispatch. Please stage a truck and assign loading staff above to begin physical loading.
                </p>
              </div>
            ) : null}

            {order.status === "ASSIGNED" || order.status === "LOADING" ? (
              <StaffLoadingForm
                orderId={order.id}
                orderedQuantity={order.quantity}
                orderedCbm={order.totalCbm ? Number(order.totalCbm) : undefined}
                cbmPerBlock={order.product?.cbmPerBlock ? Number(order.product.cbmPerBlock) : 0.018}
                status={order.status}
              />
            ) : null}

            {order.status === "LOADED" ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-4">
                <div className="text-center space-y-2">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                  <h3 className="text-base font-bold text-emerald-950">
                    Loading Verified & Completed
                  </h3>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    Physical volume of{" "}
                    <strong>
                      {order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} CBM (≈ ${formatNumber(order.loadedQuantity || order.quantity)} blocks)` : `${formatNumber(order.loadedQuantity || order.quantity)} blocks`}
                    </strong>{" "}
                    is locked. Vehicle <strong>{order.transport?.truckNumber || "Staged"}</strong> is ready for dispatch.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-emerald-200/80">
                  <form action={dispatchOrderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button
                      type="submit"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 text-xs shadow-xs cursor-pointer transition-all"
                    >
                      <Truck className="h-4 w-4" />
                      <span>Dispatch Truck (In Transit)</span>
                    </button>
                  </form>

                  <form action={markOrderDoneAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button
                      type="submit"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 text-xs shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>MARK ORDER DONE (DELIVERED)</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            {order.status === "DISPATCHED" ? (
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 space-y-4">
                <div className="text-center space-y-2">
                  <Truck className="mx-auto h-10 w-10 text-blue-600" />
                  <h3 className="text-base font-bold text-blue-950">Order In Transit (Dispatched)</h3>
                  <p className="text-xs text-blue-800 max-w-md mx-auto">
                    Vehicle {order.transport?.truckNumber} was dispatched on{" "}
                    {order.dispatchedAt ? formatDate(order.dispatchedAt) : "today"}. Material is en route to customer site.
                  </p>
                </div>

                <div className="flex justify-center pt-2 border-t border-blue-200/80">
                  <form action={markOrderDoneAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 text-xs shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>MARK ORDER DONE (CONFIRM DELIVERY)</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            {order.status === "DELIVERED" ? (
              <div className="rounded-2xl bg-purple-50 border border-purple-200 p-5 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-10 w-10 text-purple-600" />
                <h3 className="text-base font-bold text-purple-950">Order Delivered & Completed</h3>
                <p className="text-xs text-purple-800 max-w-md mx-auto">
                  Delivery acknowledged and verified at customer site on{" "}
                  {order.deliveredAt ? formatDate(order.deliveredAt) : "today"}.
                </p>
              </div>
            ) : null}
          </div>
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
