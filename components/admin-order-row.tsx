"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Building2,
  User,
  UserCheck,
  MapPin,
  ShieldCheck,
  FileText,
  Package,
  Truck,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Archive,
  Layers,
  AlertTriangle,
  X,
  CheckCircle2,
  Loader2,
  PackageCheck,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";
import {
  formatDate,
  formatNumber,
  formatBlockSizeName,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
} from "@/lib/utils";
import { OpenLocationButton } from "@/components/open-location-button";
import { deleteOrderAction, archiveOrderAction } from "@/lib/actions/orders";

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PENDING:
      return <Clock className="h-3 w-3 shrink-0 text-amber-500" />;
    case OrderStatus.CONFIRMED:
      return <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-500" />;
    case OrderStatus.ASSIGNED:
      return <UserCheck className="h-3 w-3 shrink-0 text-indigo-500" />;
    case OrderStatus.LOADING:
      return <Loader2 className="h-3 w-3 shrink-0 text-purple-500 animate-spin" />;
    case OrderStatus.LOADED:
      return <PackageCheck className="h-3 w-3 shrink-0 text-teal-500" />;
    case OrderStatus.DISPATCHED:
      return <Truck className="h-3 w-3 shrink-0 text-sky-500" />;
    case OrderStatus.DELIVERED:
      return <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-500" />;
    case OrderStatus.REJECTED:
      return <XCircle className="h-3 w-3 shrink-0 text-rose-500" />;
    case OrderStatus.CANCELLED:
      return <AlertCircle className="h-3 w-3 shrink-0 text-slate-500" />;
    default:
      return null;
  }
}

interface AdminOrderRowProps {
  order: {
    id: string;
    orderNo: string;
    createdAt: Date | string;
    status: OrderStatus;
    totalCbm?: any;
    quantity: number;
    adhesiveBags?: number | null;
    deliveryAddress: string;
    gstBillingSelected?: boolean | null;
    gstRegisteredName?: string | null;
    gstNumber?: string | null;
    createdByRole?: string | null;
    createdByNameSnapshot?: string | null;
    salesmanNameSnapshot?: string | null;
    invoiceNo?: string | null;
    dcNumber?: string | null;
    customer: {
      name: string;
      companyName?: string | null;
      mobile: string;
    };
    product?: {
      sizeLabel?: string | null;
      dimensions?: string | null;
      cbmPerBlock?: any;
    } | null;
    salesman?: {
      id: string;
      name: string;
    } | null;
    transport?: {
      truckNumber?: string | null;
      driverName?: string | null;
    } | null;
    items?: Array<{
      id: string;
      productName: string;
      sizeLabel?: string | null;
      dimensions?: string | null;
      productType?: string | null;
      quantity: number;
      totalCbm?: any;
      cbmPerUnit?: any;
      product?: {
        name: string;
        sizeLabel?: string | null;
        dimensions?: string | null;
      } | null;
    }>;
  };
}

export function AdminOrderRow({ order }: AdminOrderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [reason, setReason] = useState("");

  const items = order.items && order.items.length > 0 ? order.items : [];
  const hasMultipleItems = items.length > 1;

  // Cannot delete legal documents: if dispatched, delivered, or DC/Invoice issued
  const isFinalized =
    order.status === OrderStatus.DISPATCHED ||
    order.status === OrderStatus.DELIVERED ||
    !!order.invoiceNo ||
    !!order.dcNumber;

  return (
    <>
      <tr className="hover:bg-slate-50/80 transition-colors group">
        {/* 1. Order ID & Date */}
        <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
          <div className="flex flex-col gap-1">
            <Link
              href={`/admin/orders/${order.id}`}
              className="font-black text-sm text-[#13789B] group-hover:underline block font-mono tracking-tight"
            >
              {order.orderNo}
            </Link>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{formatDate(order.createdAt)}</span>
            </div>
            {order.gstBillingSelected === true ? (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 w-fit mt-0.5"
                title={`GST: ${order.gstRegisteredName || 'Verified'} | ${order.gstNumber || ''}`}
              >
                <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>GST Bill</span>
              </span>
            ) : order.gstBillingSelected === false ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 w-fit mt-0.5">
                <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                <span>Without GST</span>
              </span>
            ) : null}
          </div>
        </td>

        {/* 2. Customer, Creator & Destination */}
        <td className="py-3.5 px-3.5 align-top min-w-[200px]">
          <p
            className="font-extrabold text-navy text-sm truncate max-w-[210px]"
            title={order.customer.companyName || order.customer.name}
          >
            {order.customer.companyName || order.customer.name}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {order.createdByRole === "SALESMAN" ? (
              <span className="inline-flex items-center gap-1 rounded bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                <UserCheck className="h-2.5 w-2.5 text-purple-600 shrink-0" />
                <span className="truncate max-w-[140px]">Sales: {order.createdByNameSnapshot || order.salesman?.name || "Salesman"}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-teal-50 border border-teal-200 px-1.5 py-0.5 text-[10px] font-bold text-[#13789B]">
                <Building2 className="h-2.5 w-2.5 text-[#13789B] shrink-0" />
                <span>Direct Customer</span>
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
            <span className="truncate max-w-[130px]" title={order.deliveryAddress}>
              {order.deliveryAddress}
            </span>
            <OpenLocationButton address={order.deliveryAddress} variant="badge" />
          </div>
        </td>

        {/* 3. Block Specs & Materials */}
        <td className="py-3.5 px-3.5 align-top min-w-[180px]">
          {items.length > 0 ? (
            <div className="space-y-1">
              {hasMultipleItems ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Layers className="h-3 w-3 shrink-0" />
                    <span>{items.length} Material Items</span>
                    {isExpanded ? (
                      <ChevronUp className="h-2.5 w-2.5 shrink-0" />
                    ) : (
                      <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                    )}
                  </button>

                  <span className="text-[11px] text-slate-500 block mt-1 truncate max-w-[180px] font-mono">
                    {items.map((i) => i.productName || i.product?.name).join(" + ")}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-bold text-navy block text-xs">
                    {items[0].productName || items[0].product?.name || "AAC Block"}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                    {items[0].dimensions || items[0].product?.dimensions || "-"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <span className="font-bold text-navy block text-xs">
                {order.product?.sizeLabel
                  ? formatBlockSizeName(order.product.sizeLabel)
                  : "Standard AAC Block"}
              </span>
              <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                {order.product?.dimensions || "-"}
              </span>
            </div>
          )}
        </td>

        {/* 4. Total Volume & Mortar */}
        <td className="py-3.5 px-3.5 text-right align-top whitespace-nowrap min-w-[140px]">
          <p className="font-black text-sm text-navy">
            {order.totalCbm
              ? `${Number(order.totalCbm).toFixed(3)} CBM`
              : `${formatNumber(order.quantity)} units`}
          </p>
          <span className="text-[11px] text-slate-400 italic block mt-0.5">
            ≈ {formatNumber(order.quantity)} Blocks
          </span>
          {order.adhesiveBags && order.adhesiveBags > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-mono font-bold text-navy mt-1">
              <Package className="h-3 w-3 text-[#13789B] shrink-0" />
              <span>+{order.adhesiveBags} Bags Mortar</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 block mt-0.5">No Mortar</span>
          )}
        </td>

        {/* 5. Transport */}
        <td className="py-3.5 px-3.5 align-top whitespace-nowrap min-w-[130px]">
          {order.transport ? (
            <div>
              <span className="font-bold text-navy block font-mono text-xs flex items-center gap-1">
                <Truck className="h-3 w-3 text-[#13789B] shrink-0" />
                <span>{order.transport.truckNumber}</span>
              </span>
              <span className="text-[11px] text-slate-500 block truncate max-w-[120px] mt-0.5">
                {order.transport.driverName || "Driver"}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 italic text-[11px] bg-slate-50 rounded-lg px-2 py-0.5 border border-slate-200">
              <Clock className="h-3 w-3 text-slate-300 shrink-0" />
              <span>Unassigned</span>
            </span>
          )}
        </td>

        {/* 6. Status */}
        <td className="py-3.5 px-3.5 text-center align-top whitespace-nowrap min-w-[120px]">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border shadow-2xs ${
              ORDER_STATUS_CLASS[order.status]
            }`}
          >
            {getStatusIcon(order.status)}
            <span>{ORDER_STATUS_LABEL[order.status]}</span>
          </span>
        </td>

        {/* 7. Actions (Sticky right so it is NEVER cut off) */}
        <td className="py-3.5 px-3.5 text-right align-top whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur-xs group-hover:bg-slate-50/95 transition-colors shadow-[-6px_0_12px_rgba(0,0,0,0.03)] min-w-[110px]">
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={`/admin/orders/${order.id}`}
              className="inline-flex items-center gap-1 rounded-xl bg-[#13789B] hover:bg-[#0f607d] text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs group/btn cursor-pointer whitespace-nowrap"
            >
              <span>Manage</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
            </Link>

            {isFinalized ? (
              <button
                type="button"
                onClick={() => setShowArchiveModal(true)}
                title="Archive Order (Legal Retention Protected)"
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                title="Safe Delete Order"
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expandable Multi-Item Row Breakdown */}
      {isExpanded && items.length > 0 && (
        <tr className="bg-slate-50/90 border-b border-indigo-100">
          <td colSpan={7} className="px-6 py-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-navy">
                    Complete Material Breakdown ({order.orderNo})
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Total AAC Volume: <strong className="text-navy">{Number(order.totalCbm || 0).toFixed(3)} CBM</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <strong className="font-bold text-navy">{it.productName || it.product?.name}</strong>
                      <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                        {it.productType === "ADHESIVE" ? "Mortar" : "Block"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Dimensions: {it.dimensions || it.product?.dimensions || "Standard"}
                    </p>
                    <div className="pt-1 flex justify-between items-baseline border-t border-slate-200/60 font-mono">
                      <span className="text-slate-500">
                        {it.totalCbm ? `${Number(it.totalCbm).toFixed(3)} CBM` : `${it.quantity} Bags`}
                      </span>
                      {it.totalCbm ? (
                        <span className="text-slate-400 text-[11px] italic">
                          ≈ {formatNumber(it.quantity)} Blocks
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-black text-navy text-base">Delete Order {order.orderNo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete order <strong>{order.orderNo}</strong>? This action will remove all line items and staging history.
            </p>

            <form action={deleteOrderAction} className="space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reason for Deletion (Audit Trail)
                </label>
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="e.g. Duplicate booking, customer requested cancellation before confirmation"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-navy focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <Archive className="h-5 w-5" />
                <h3 className="font-black text-navy text-base">Archive Order {order.orderNo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Order <strong>{order.orderNo}</strong> is finalized or contains legal delivery documents. It cannot be permanently deleted due to legal retention policies. You can safely archive it.
            </p>

            <form action={archiveOrderAction} className="space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Archive Remarks
                </label>
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="e.g. Fulfilled and archived, dispute resolved"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-navy focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition cursor-pointer"
                >
                  Confirm Archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
