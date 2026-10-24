import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Layers,
  Truck,
  ExternalLink,
  Edit,
  ShieldCheck,
  FileText,
} from "lucide-react";
import {
  formatDate,
  formatNumber,
  formatBlockSizeName,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  canViewOrderPricing,
} from "@/lib/utils";
import { DownloadOrderSummaryButton } from "@/components/download-order-summary-btn";
import { OpenLocationButton } from "@/components/open-location-button";
import { OrderLifecycleTracker } from "@/components/order-lifecycle-tracker";

export const dynamic = "force-dynamic";

export default async function SalesmanOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== Role.SALESMAN && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      product: true,
      items: { include: { product: true } },
      transport: true,
      weighbridgeSlip: true,
      events: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true } } },
      },
      editHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Strict role-based isolation: Salesmen can only access orders assigned to them!
  if (session.role === Role.SALESMAN && order.salesmanId !== session.id) {
    redirect("/salesman/orders?error=Unauthorized%20access%20to%20order");
  }

  // Price Privacy: Visible only to Super Admin and the exact creator of the order
  const canViewPricing = canViewOrderPricing(session, order);

  // Pre-dispatch orders can be edited by the assigned salesman
  const nonEditableStatuses: OrderStatus[] = [
    OrderStatus.DISPATCHED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED,
  ];
  const canEdit = !nonEditableStatuses.includes(order.status);

  const totalCbm = order.totalCbm ? Number(order.totalCbm) : 0;
  const aacItems = order.items.filter((it) => it.productType === "AAC_BLOCK");
  const blockSizesSummary =
    aacItems.map((it) => formatBlockSizeName(it.sizeLabel)).join(", ") ||
    (order.product?.sizeLabel ? formatBlockSizeName(order.product.sizeLabel) : "Standard AAC Block");

  const mapsUrl =
    order.googleMapsUrl ||
    (order.latitude && order.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`
      : null);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/salesman/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Customer Orders</span>
        </Link>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              href={`/salesman/orders/${order.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-3.5 transition shadow-xs cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Order</span>
            </Link>
          )}
          <DownloadOrderSummaryButton orderId={order.id} orderNo={order.orderNo} />
        </div>
      </div>

      {/* Main Order Header Card */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-black rounded-lg bg-sky-50 text-[#13789B] border border-sky-200 px-2.5 py-1">
                {order.orderNo}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  ORDER_STATUS_CLASS[order.status] || "bg-slate-100 text-slate-700"
                }`}
              >
                {ORDER_STATUS_LABEL[order.status] || order.status}
              </span>
              {order.createdByRole === "SALESMAN" ? (
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                  Created by Salesman: {order.createdByNameSnapshot || order.salesmanNameSnapshot || "Salesman"}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-[#13789B] border border-teal-200">
                  Created by Customer
                </span>
              )}
            </div>

            <h1 className="mt-2 text-xl font-black text-navy">
              Customer: {order.customer.companyName || order.customer.name}
            </h1>

            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Placed on {formatDate(order.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{order.customer.mobile}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-STAGE ORDER LIFECYCLE PROGRESSION */}
      <OrderLifecycleTracker
        orderId={order.id}
        orderNo={order.orderNo}
        status={order.status}
        confirmedAt={order.confirmedAt}
        dispatchedAt={order.dispatchedAt}
        deliveredAt={order.deliveredAt}
        createdAt={order.createdAt}
        userRole="SALESMAN"
        allowActions={false}
      />

      {/* GST Billing Details Card */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
              order.gstBillingSelected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
            }`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy">GST Billing Option</h3>
              <p className="text-xs text-slate-400">Order tax invoice and input credit status</p>
            </div>
          </div>
          <div>
            {order.gstBillingSelected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>GST Billing (Yes)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>Without-GST Bill (No)</span>
              </span>
            )}
          </div>
        </div>

        {order.gstBillingSelected && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">GST Registered Business Name</span>
              <p className="font-extrabold text-navy text-sm mt-0.5">{order.gstRegisteredName || order.customer.companyName || order.customer.name}</p>
            </div>
            <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">GST Number (GSTIN)</span>
              <p className="font-black font-mono text-emerald-800 text-sm mt-0.5 tracking-wider">{order.gstNumber || order.customer.gstin || "—"}</p>
              <span className="text-[10px] text-emerald-700 font-bold mt-1 inline-block">✓ Status: {order.gstStatus || "Active"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Private Pricing Breakdown (Visible ONLY to Super Admin and the exact creator) */}
      {canViewPricing && (
        <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#13789B] border border-teal-200">
                <span className="font-black text-sm">₹</span>
              </div>
              <div>
                <h3 className="text-base font-black text-navy">Order Price & Commercial Details</h3>
                <p className="text-xs text-slate-500">Private commercial data visible only to Super Admin and you (the order creator)</p>
              </div>
            </div>
            <span className="rounded-full px-3 py-1 text-[11px] font-bold border bg-teal-50 text-[#13789B] border-teal-200 self-start sm:self-auto">
              {order.pricePerCbm ? `Rate: ₹${Number(order.pricePerCbm).toLocaleString("en-IN")}/CBM` : "Price Not Added"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Price Per CBM</span>
              <div className="text-base sm:text-lg font-black font-mono text-navy mt-0.5">
                {order.pricePerCbm ? `₹${Number(order.pricePerCbm).toLocaleString("en-IN")}` : "Price Not Added"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Material Subtotal</span>
              <div className="text-base sm:text-lg font-black font-mono text-navy mt-0.5">
                {order.subtotal && Number(order.subtotal) > 0
                  ? `₹${Number(order.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  : order.pricePerCbm
                  ? `₹${(Number(order.pricePerCbm) * totalCbm).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  : "Price Not Added"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">GST Treatment</span>
              <div className="text-sm sm:text-base font-black font-mono text-emerald-800 mt-0.5">
                {order.gstBillingSelected
                  ? `18% (₹${Number(order.gstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })})`
                  : "Without-GST Bill"}
              </div>
            </div>

            <div className="rounded-2xl bg-teal-50/70 p-3.5 border border-teal-200">
              <span className="text-[10px] font-bold uppercase text-[#13789B] block">Final Order Amount</span>
              <div className="text-base sm:text-lg font-black font-mono text-[#13789B] mt-0.5">
                {order.totalAmount && Number(order.totalAmount) > 0
                  ? `₹${Number(order.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  : order.pricePerCbm
                  ? `₹${(Number(order.pricePerCbm) * totalCbm).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  : "Price Not Added"}
              </div>
            </div>
          </div>

          {order.pricingRemarks && (
            <div className="rounded-2xl bg-slate-50/70 p-3.5 border border-slate-200 text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Private Pricing Notes & Remarks</span>
              <p className="text-slate-700 italic">{order.pricingRemarks}</p>
            </div>
          )}
        </div>
      )}

      {/* Grid: Order Specifications & Delivery Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Specifications */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#13789B]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-navy">
                Order Specifications
              </h2>
            </div>
            {totalCbm > 0 && (
              <span className="text-xs font-black text-[#13789B] font-mono bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                {totalCbm.toFixed(3)} CBM
              </span>
            )}
          </div>

          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              <div className="divide-y divide-slate-100">
                {order.items.map((it) => (
                  <div key={it.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-navy text-sm">{it.productName}</p>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {it.dimensions || (it.sizeLabel ? formatBlockSizeName(it.sizeLabel) : it.productType)}
                      </span>
                    </div>
                    <div className="text-right">
                      {it.totalCbm ? (
                        <>
                          <div className="font-black text-navy font-mono text-sm">{Number(it.totalCbm).toFixed(3)} CBM</div>
                          <div className="text-[10px] text-slate-400 italic">≈ {formatNumber(it.quantity)} Blocks</div>
                        </>
                      ) : (
                        <div className="font-black text-navy font-mono text-sm">{formatNumber(it.quantity)} Bags</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Total AAC Volume:</span>
                <span className="font-black text-navy font-mono text-sm">{totalCbm.toFixed(3)} CBM</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-semibold">Block Size:</span>
                <span className="font-bold text-navy">{blockSizesSummary}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-semibold">Ordered Volume:</span>
                <span className="font-black text-navy text-sm font-mono">
                  {totalCbm > 0 ? `${totalCbm.toFixed(3)} CBM` : "-"}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-semibold">Approximate Blocks:</span>
                <span className="font-bold text-navy font-mono">
                  ≈ {formatNumber(order.quantity)} Blocks
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-semibold">Block Jointing Morter:</span>
                <span className="rounded-lg bg-sky-50 border border-sky-200 px-2 py-0.5 font-bold font-mono text-navy">
                  {order.adhesiveBags ?? 0} Bags (40 KG)
                </span>
              </div>
            </div>
          )}

            {order.loadedQuantity && (
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-semibold">Verified Loaded Count:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatNumber(order.loadedQuantity)} Blocks ({order.loadedCbm ? `${Number(order.loadedCbm).toFixed(3)} CBM` : ""})
                </span>
              </div>
            )}

            {order.notes && (
              <div className="pt-2">
                <span className="text-slate-500 font-semibold block mb-1">Customer Site Notes:</span>
                <p className="rounded-xl bg-slate-50 p-2.5 text-slate-700 italic">
                  {order.notes}
                </p>
              </div>
            )}
        </div>

        {/* Delivery Location Card */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="h-4 w-4 text-[#13789B]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-navy">
              Delivery Location
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block mb-1">Full Delivery Site Address:</span>
              <p className="font-semibold text-slate-800 bg-slate-50 rounded-xl p-3 leading-relaxed border border-slate-100">
                {order.deliveryAddress}
              </p>
            </div>

            {order.locationSource && (
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-semibold">Location Method:</span>
                <span className="font-bold text-slate-700 uppercase text-[11px]">
                  {order.locationSource.replace(/_/g, " ")}
                </span>
              </div>
            )}

            <div className="pt-2">
              <OpenLocationButton
                address={order.deliveryAddress}
                latitude={order.latitude ? Number(order.latitude) : null}
                longitude={order.longitude ? Number(order.longitude) : null}
                variant="button"
                className="w-full justify-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transport & Dispatch Details if available */}
      {order.transport && (
        <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Truck className="h-4 w-4 text-sky-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-navy">
              Transport & Dispatch Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block">Vehicle / Truck Number:</span>
              <p className="font-black text-navy font-mono text-sm mt-0.5">
                {order.transport.truckNumber || "Assigned on Gate Out"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Driver Name & Mobile:</span>
              <p className="font-bold text-navy mt-0.5">
                {order.transport.driverName || "-"} {order.transport.driverMobile ? `(${order.transport.driverMobile})` : ""}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Delivery Challan Number:</span>
              <p className="font-mono font-bold text-emerald-700 mt-0.5">
                {order.dcNumber || order.invoiceNo || "-"}
              </p>
            </div>
            {order.weighbridgeSlip?.netWeightKg && (
              <div>
                <span className="text-slate-400 font-semibold block">Certified Net Weight:</span>
                <p className="font-mono font-black text-emerald-700 mt-0.5">
                  {Number(order.weighbridgeSlip.netWeightKg).toLocaleString()} KG (RST #{order.weighbridgeSlip.rstNumber})
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Status Events Timeline */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Clock className="h-4 w-4 text-[#13789B]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-navy">
            Fulfillment Timeline
          </h2>
        </div>

        <div className="space-y-3">
          {order.events.map((ev, idx) => (
            <div key={ev.id} className="flex items-start gap-3 text-xs">
              <div className="mt-1 h-2 w-2 rounded-full bg-[#13789B] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-navy">{ev.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDate(ev.createdAt)}
                  </span>
                </div>
                {ev.note && <p className="text-slate-600 mt-0.5">{ev.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
