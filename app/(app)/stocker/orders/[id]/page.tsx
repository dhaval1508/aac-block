import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Phone, Truck, Package, Clock, MapPin, UserCheck, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  formatDate,
  formatNumber,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  telHref,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StockerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !["ADMIN", "STOCKER", "STAFF"].includes(session.role)) redirect("/login");

  const { id } = await params;

  // Strict projection: ZERO financial fields (no rate, price, subtotal, gstAmount, totalAmount, paidAmount, paymentStatus, invoiceNo)
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNo: true,
      quantity: true,
      loadedQuantity: true,
      totalCbm: true,
      loadedCbm: true,
      status: true,
      deliveryAddress: true,
      requestedDate: true,
      notes: true,
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
          id: true,
          name: true,
          sizeLabel: true,
          dimensions: true,
          cbmPerBlock: true,
          blocksPerCbm: true,
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
      assignedStaff: {
        select: {
          name: true,
          mobile: true,
        },
      },
      events: {
        where: {
          title: { not: "Payment Received" },
        },
        orderBy: { createdAt: "asc" },
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

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6 min-w-0 max-w-full">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <Link
          href="/stocker/orders"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-black text-navy">{order.orderNo}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                ORDER_STATUS_CLASS[order.status]
              }`}
            >
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            Customer: {order.customer.companyName || order.customer.name} · Ordered{" "}
            {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 min-w-0">
        {/* Logistics & Material Spec */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
          <h2 className="text-base font-bold text-navy flex items-center gap-2">
            <Package className="h-4 w-4 text-[#1E72A8]" />
            Material Specification
          </h2>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Block Size</span>
              <strong className="text-navy">{order.product?.sizeLabel || "Standard"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Dimensions</span>
              <strong className="text-navy">{order.product?.dimensions || "-"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CBM / Block</span>
              <strong className="text-navy">
                {order.product ? `${Number(order.product.cbmPerBlock).toFixed(4)} CBM` : "-"}
              </strong>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500">Ordered Volume</span>
              <div className="text-right">
                <strong className="text-navy text-sm font-black block">
                  {order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} CBM` : `${formatNumber(order.quantity)} units`}
                </strong>
                <span className="text-slate-400 italic text-xs">
                  ≈ {formatNumber(order.quantity)} Blocks
                </span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">
                Delivery Site Address
              </span>
              <p className="mt-0.5 font-medium text-navy text-xs">{order.deliveryAddress}</p>
            </div>
            {order.notes ? (
              <div className="border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Site Notes</span>
                <p className="mt-0.5 text-xs text-slate-600">{order.notes}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Transport & Loading Assignment */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
          <h2 className="text-base font-bold text-navy flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#1E72A8]" />
            Transport & Yard Assignment
          </h2>
          {order.transport ? (
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">Truck Registration</span>
                <strong className="text-navy text-sm sm:text-base">{order.transport.truckNumber}</strong>
              </div>
              {order.transport.transporterName ? (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500">Transporter</span>
                  <strong className="text-navy truncate">{order.transport.transporterName}</strong>
                </div>
              ) : null}
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">Driver</span>
                <strong className="text-navy truncate">{order.transport.driverName}</strong>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">Driver Mobile</span>
                <a
                  href={telHref(order.transport.driverMobile)}
                  className="font-bold text-[#1E72A8] hover:underline flex items-center gap-1"
                >
                  <Phone className="h-3 w-3" /> {order.transport.driverMobile}
                </a>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">Yard Loading Staff</span>
                <strong className="text-navy">{order.assignedStaff?.name || "Unassigned"}</strong>
              </div>
              {order.transport.expectedDelivery ? (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500">Expected Delivery</span>
                  <strong className="text-navy">
                    {formatDate(order.transport.expectedDelivery)}
                  </strong>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-400">
              Transport assignment pending from Super Admin.
            </div>
          )}
        </div>
      </div>

      {/* Order Operational Timeline */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-3 min-w-0">
        <h2 className="text-base font-bold text-navy flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#1E72A8]" />
          Operational Status Milestones
        </h2>
        <div className="space-y-4">
          {order.events.map((evt, idx) => {
            const isLatest = idx === order.events.length - 1;
            return (
              <div key={evt.id} className="flex gap-3 text-xs">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isLatest ? "bg-amber-500 ring-4 ring-amber-100" : "bg-slate-300"
                    }`}
                  />
                  {idx < order.events.length - 1 ? (
                    <div className="h-full w-0.5 bg-slate-200 my-1" />
                  ) : null}
                </div>
                <div className="pb-2">
                  <p className="font-bold text-navy text-sm">{evt.title}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(evt.createdAt)}</p>
                  {evt.note ? <p className="mt-0.5 text-slate-600">{evt.note}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
