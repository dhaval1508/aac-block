import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Phone,
  Truck,
  Calendar,
  MapPin,
  Clock,
  FileText,
  AlertCircle,
  Package,
  Layers,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  formatDate,
  formatNumber,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  telHref,
} from "@/lib/utils";
import { StaffLoadingForm } from "@/components/staff-loading-form";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function StaffOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session || !["STAFF", "ADMIN"].includes(session.role)) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  // Strict projection: NO financial fields (no rate, price, gstAmount, subtotal, totalAmount, paidAmount, paymentStatus)
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNo: true,
      quantity: true,
      loadedQuantity: true,
      status: true,
      deliveryAddress: true,
      requestedDate: true,
      notes: true,
      assignedStaffId: true,
      totalCbm: true,
      adhesiveBags: true,
      createdAt: true,
      confirmedAt: true,
      dispatchedAt: true,
      deliveredAt: true,
      customer: {
        select: {
          name: true,
          companyName: true,
          mobile: true,
        },
      },
      product: {
        select: {
          name: true,
          sizeLabel: true,
          dimensions: true,
          cbmPerBlock: true,
        },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          cbmPerUnit: true,
          totalCbm: true,
          product: {
            select: {
              name: true,
              category: true,
              sizeLabel: true,
              dimensions: true,
              cbmPerBlock: true,
              bagWeightKg: true,
            },
          },
        },
      },
      transport: {
        select: {
          truckNumber: true,
          transporterName: true,
          driverName: true,
          driverMobile: true,
          expectedDelivery: true,
          assignedAt: true,
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          title: true,
          note: true,
          createdAt: true,
          createdBy: { select: { name: true, role: true } },
        },
      },
    },
  });

  if (!order) notFound();

  // Strict Role Guard: Staff can only access their assigned order
  if (session.role === "STAFF" && order.assignedStaffId !== session.id) {
    redirect(
      `/staff/dashboard?error=Access%20Denied.%20You%20are%20not%20assigned%20to%20order%20${order.orderNo}`
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-6 min-w-0 max-w-full">
      {/* Top Navigation & Status */}
      <div className="flex items-center gap-3">
        <Link
          href="/staff/dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-navy truncate">
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
            Customer: {order.customer.companyName || order.customer.name}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{decodeURIComponent(error)}</span>
        </div>
      ) : null}

      {/* Vehicle & Logistics Details */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-navy font-bold text-sm border-b border-slate-100 pb-3">
          <Truck className="h-4 w-4 text-[#1E72A8]" />
          Assigned Transport & Dispatch Details
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Truck Registration
            </span>
            <p className="mt-1 text-lg font-black text-navy">
              {order.transport?.truckNumber || "Pending"}
            </p>
            {order.transport?.transporterName ? (
              <span className="text-xs text-slate-500 block truncate">
                {order.transport.transporterName}
              </span>
            ) : null}
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Driver Name
            </span>
            <p className="mt-1 font-bold text-navy">
              {order.transport?.driverName || "Not assigned"}
            </p>
            {order.transport?.driverMobile ? (
              <a
                href={telHref(order.transport.driverMobile)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#1E72A8] hover:underline"
              >
                <Phone className="h-3 w-3" /> {order.transport.driverMobile}
              </a>
            ) : null}
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Assignment Time
            </span>
            <p className="mt-1 text-xs font-medium text-slate-700">
              {formatDate(order.transport?.assignedAt || order.createdAt)}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Required Delivery Date
            </span>
            <p className="mt-1 text-xs font-bold text-slate-800">
              {order.requestedDate
                ? formatDate(order.requestedDate)
                : order.transport?.expectedDelivery
                ? formatDate(order.transport.expectedDelivery)
                : "Immediate"}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 flex items-start gap-2 text-xs text-slate-600">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700">Site Delivery Address: </span>
            {order.deliveryAddress}
          </div>
        </div>

        {order.notes ? (
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/60 p-3 text-xs text-amber-900 flex items-start gap-2">
            <FileText className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold">Site Instructions: </span>
              {order.notes}
            </div>
          </div>
        ) : null}
      </div>

      {/* Material Specifications & Physical Quantity */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-navy font-bold text-sm">
            <Package className="h-4 w-4 text-[#1E72A8]" />
            Loading Manifest & Physical Items
          </div>
          {order.totalCbm ? (
            <span className="text-xs font-black text-[#1E72A8] bg-blue-50 px-2.5 py-1 rounded-lg">
              Total CBM: {Number(order.totalCbm).toFixed(3)} m³
            </span>
          ) : null}
        </div>

        {order.items && order.items.length > 0 ? (
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 gap-2"
              >
                <div>
                  <p className="font-bold text-sm text-navy">{item.product.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.product.sizeLabel
                      ? `Size: ${item.product.sizeLabel} (${item.product.dimensions})`
                      : item.product.bagWeightKg
                      ? `Bag Weight: ${item.product.bagWeightKg} kg`
                      : "Accessory"}
                  </p>
                  {item.totalCbm ? (
                    <span className="inline-block mt-1 text-[11px] font-semibold text-[#1E72A8] bg-blue-100/60 px-2 py-0.5 rounded">
                      Volume: {Number(item.totalCbm).toFixed(3)} m³
                    </span>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium uppercase">Quantity</span>
                  <span className="text-lg font-black text-navy font-mono">
                    {formatNumber(item.quantity)}{" "}
                    <span className="text-xs font-normal text-slate-600">
                      {item.product.category === "AAC_BLOCK" ? "Blocks" : "Bags"}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Block Size
              </span>
              <p className="mt-1 text-base font-bold text-navy">{order.product?.sizeLabel || "Standard"}</p>
              <span className="text-xs text-slate-500">{order.product?.dimensions || "-"}</span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Order Quantity
              </span>
              <p className="mt-1 text-xl font-black text-navy">
                {formatNumber(order.quantity)} <span className="text-xs font-normal">Blocks</span>
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-2xl bg-sky-50 border border-sky-200 p-3.5 flex items-center justify-between text-xs">
          <div>
            <strong className="text-navy text-sm block">Block Jointing Morter</strong>
            <span className="text-slate-500 text-[11px]">Factory Specification: 40 KG Bag Packaging Only</span>
          </div>
          <span className="font-mono font-black text-navy text-base">
            {order.adhesiveBags ?? 0} Bags
          </span>
        </div>
      </div>

      {/* Loading Action Area */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        {order.status === "ASSIGNED" || order.status === "LOADING" ? (
          <StaffLoadingForm
            orderId={order.id}
            orderedQuantity={order.quantity}
            status={order.status}
          />
        ) : null}

        {order.status === "LOADED" ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="text-base font-bold text-emerald-950">
              Loading Verified & Completed
            </h3>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              Physical count of{" "}
              <strong>{formatNumber(order.loadedQuantity || order.quantity)} blocks</strong> is
              locked. Vehicle <strong>{order.transport?.truckNumber}</strong> is staged for Super
              Admin dispatch.
            </p>
          </div>
        ) : null}

        {order.status === "DISPATCHED" ? (
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 text-center space-y-2">
            <Truck className="mx-auto h-10 w-10 text-blue-600" />
            <h3 className="text-base font-bold text-blue-950">Order In Transit (Dispatched)</h3>
            <p className="text-xs text-blue-800 max-w-md mx-auto">
              Vehicle {order.transport?.truckNumber} was approved and dispatched by Super Admin on{" "}
              {order.dispatchedAt ? formatDate(order.dispatchedAt) : "today"}.
            </p>
          </div>
        ) : null}

        {order.status === "DELIVERED" ? (
          <div className="rounded-2xl bg-purple-50 border border-purple-200 p-5 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-purple-600" />
            <h3 className="text-base font-bold text-purple-950">Order Delivered</h3>
            <p className="text-xs text-purple-800 max-w-md mx-auto">
              Delivery acknowledged at customer site on{" "}
              {order.deliveredAt ? formatDate(order.deliveredAt) : "today"}.
            </p>
          </div>
        ) : null}
      </div>

      {/* Loading Timeline & History */}
      {order.events.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-navy flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#1E72A8]" />
            Order Execution Timeline
          </h3>

          <div className="divide-y divide-slate-100">
            {order.events.map((evt) => (
              <div key={evt.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-navy">{evt.title}</span>
                  {evt.createdBy?.name ? (
                    <span className="text-[11px] text-slate-400 ml-1.5">
                      by {evt.createdBy.name} ({evt.createdBy.role})
                    </span>
                  ) : null}
                  {evt.note ? <p className="mt-0.5 text-slate-600">{evt.note}</p> : null}
                </div>
                <span className="shrink-0 text-slate-400 text-[11px]">
                  {formatDate(evt.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
