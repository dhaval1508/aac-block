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
        {/* Order ID & Date */}
        <td className="py-4 px-4 align-top">
          <div className="flex flex-col gap-1">
            <Link
              href={`/admin/orders/${order.id}`}
              className="font-black text-sm text-[#13789B] group-hover:underline block font-mono"
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
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>GST Bill</span>
              </span>
            ) : order.gstBillingSelected === false ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 w-fit mt-0.5">
                <FileText className="h-3 w-3 text-slate-400" />
                <span>Without GST</span>
              </span>
            ) : null}
          </div>
        </td>

        {/* Customer & Destination */}
        <td className="py-4 px-4 align-top">
          <p
            className="font-bold text-navy truncate max-w-[190px]"
            title={order.customer.companyName || order.customer.name}
          >
            {order.customer.companyName || order.customer.name}
          </p>
          {(order.salesman?.name || order.salesmanNameSnapshot) && (
            <span className="inline-flex items-center gap-1 mt-1 rounded bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
              <UserCheck className="h-2.5 w-2.5 text-purple-600" />
              <span>Sales: {order.salesman?.name || order.salesmanNameSnapshot}</span>
            </span>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="text-[11px] text-slate-500 truncate max-w-[140px] inline-flex items-center gap-1"
              title={order.deliveryAddress}
            >
              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
              <span className="truncate">{order.deliveryAddress}</span>
            </span>
            <OpenLocationButton address={order.deliveryAddress} variant="badge" />
          </div>
        </td>

        {/* Created By */}
        <td className="py-4 px-4 align-top">
          {order.createdByRole === "SALESMAN" ? (
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
                <User className="h-3 w-3 text-purple-600" />
                <span>Salesman</span>
              </span>
              <span className="block text-[11px] text-slate-700 font-semibold mt-1 truncate max-w-[130px]">
                {order.createdByNameSnapshot || order.salesman?.name || "Salesman"}
              </span>
            </div>
          ) : (
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[10px] font-bold text-[#13789B]">
                <Building2 className="h-3 w-3 text-[#13789B]" />
                <span>Customer</span>
              </span>
              <span className="block text-[11px] text-slate-500 mt-1 truncate max-w-[130px]">
                Direct Order
              </span>
            </div>
          )}
        </td>

        {/* All Ordered Items (With expandable multi-item breakdown) */}
        <td className="py-4 px-4 align-top">
          {items.length > 0 ? (
            <div className="space-y-1.5">
              {hasMultipleItems ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{items.length} Material Items</span>
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>

                  {/* Summary line */}
                  <span className="text-[11px] text-slate-500 block mt-1 truncate max-w-[200px]">
                    {items.map((i) => i.productName || i.product?.name).join(" + ")}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-bold text-slate-800 block text-xs">
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
              <span className="font-bold text-slate-800 block text-xs">
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

        {/* Total CBM & Approximate Blocks */}
        <td className="py-4 px-4 text-right align-top">
          <p className="font-black text-sm text-navy">
            {order.totalCbm
              ? `${Number(order.totalCbm).toFixed(3)} CBM`
              : `${formatNumber(order.quantity)} units`}
          </p>
          <span className="text-[11px] text-slate-400 italic block mt-0.5">
            ≈ {formatNumber(order.quantity)} Blocks
          </span>
        </td>

        {/* Morter Bags */}
        <td className="py-4 px-4 text-center align-top">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 border border-sky-200 px-2.5 py-1 text-xs font-mono font-bold text-navy shadow-2xs">
            <Package className="h-3.5 w-3.5 text-[#13789B]" />
            <span>{order.adhesiveBags ?? 0} Bags</span>
          </span>
        </td>

        {/* Transport */}
        <td className="py-4 px-4 align-top">
          {order.transport ? (
            <div>
              <span className="font-bold text-navy block font-mono text-xs flex items-center gap-1">
                <Truck className="h-3 w-3 text-slate-400" />
                {order.transport.truckNumber}
              </span>
              <span className="text-[11px] text-slate-500 block truncate max-w-[130px] mt-0.5">
                {order.transport.driverName}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 italic text-[11px]">
              <Clock className="h-3 w-3 text-slate-300" />
              <span>Unassigned</span>
            </span>
          )}
        </td>

        {/* Status */}
        <td className="py-4 px-4 text-center align-top">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border shadow-2xs ${
              ORDER_STATUS_CLASS[order.status]
            }`}
          >
            <span>{ORDER_STATUS_LABEL[order.status]}</span>
          </span>
        </td>

        {/* Actions */}
        <td className="py-4 px-4 text-right align-top">
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={`/admin/orders/${order.id}`}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-[#13789B] text-[#13789B] hover:text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs group/btn cursor-pointer"
            >
              <span>Manage</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>

            {isFinalized ? (
              <button
                type="button"
                onClick={() => setShowArchiveModal(true)}
                title="Archive Order (Legal Retention Protected)"
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                title="Safe Delete Order"
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expandable Multi-Item Row Breakdown */}
      {isExpanded && items.length > 0 && (
        <tr className="bg-slate-50/90 border-b border-indigo-100">
          <td colSpan={9} className="px-6 py-4">
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
