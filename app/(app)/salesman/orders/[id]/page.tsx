import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Layers,
  ShoppingBag,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit2,
  FileText,
} from "lucide-react";
import {
  formatDate,
  formatNumber,
  formatBlockSizeName,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
} from "@/lib/utils";
import { DownloadOrderSummaryButton } from "@/components/download-order-summary-btn";

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

  const canEdit =
    order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED;

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
              {order.salesmanNameSnapshot && (
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                  Assigned Salesman: {order.salesmanNameSnapshot}
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

      {/* Grid: Order Specifications & Delivery Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Specifications */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layers className="h-4 w-4 text-[#13789B]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-navy">
              Order Specifications
            </h2>
          </div>

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

            {mapsUrl && (
              <div className="pt-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#13789B]/10 hover:bg-[#13789B]/20 text-[#13789B] border border-[#13789B]/30 py-2.5 px-4 font-bold transition shadow-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Delivery Location in Google Maps</span>
                </a>
              </div>
            )}
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
