"use client";

import { useState, useTransition } from "react";
import { X, ShieldAlert, Loader2, Boxes, AlertTriangle } from "lucide-react";
import { deleteOrderAction } from "@/lib/actions/orders";
import { ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, formatNumber } from "@/lib/utils";

export interface DeleteOrderModalProps {
  order: {
    id: string;
    orderNo: string;
    status: string;
    totalCbm?: number | string | null;
    quantity: number;
    adhesiveBags?: number | null;
    customerName: string;
    companyName?: string | null;
    dcNumber?: string | null;
    invoiceNo?: string | null;
    hasDispatchedStock?: boolean;
    hasDelivered?: boolean;
    hasChallanOrInvoice?: boolean;
  };
  onClose: () => void;
  returnPath?: string;
}

export function DeleteOrderModal({
  order,
  onClose,
  returnPath = "/admin/orders",
}: DeleteOrderModalProps) {
  const [reason, setReason] = useState("Deleted / Cancelled by Super Admin");
  const [returnStock, setReturnStock] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDispatched = order.status === "DISPATCHED" || Boolean(order.hasDispatchedStock);
  const isDelivered = order.status === "DELIVERED" || Boolean(order.hasDelivered);
  const isUndispatched = !isDispatched && !isDelivered;

  const totalCbmNumber = Number(order.totalCbm ?? 0);
  const mortarBags = order.adhesiveBags ?? 0;

  // Real customer name resolution (never display email as primary name)
  const isEmail = (s?: string | null) => Boolean(s && s.includes("@"));
  const cleanCustomerName =
    order.customerName && !isEmail(order.customerName)
      ? order.customerName
      : order.companyName && !isEmail(order.companyName)
      ? order.companyName
      : order.customerName || "Customer";

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-rose-100 my-auto max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-navy truncate">
                Delete Order {order.orderNo}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Super Admin Authorized Deletion & Stock Reconcile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Question Prompt */}
        <div className="rounded-2xl bg-rose-50/80 border border-rose-200 p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-rose-950 text-sm">
              Are you sure you want to delete this order?
            </h4>
            <p className="text-xs text-rose-800/90 mt-0.5 leading-relaxed">
              This action will delete or archive order <strong>{order.orderNo}</strong> according to its real operational and document status.
            </p>
          </div>
        </div>

        {/* Order Details & Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Order ID</span>
              <p className="font-mono font-black text-navy text-xs sm:text-sm truncate">{order.orderNo}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer Name</span>
              <p className="font-bold text-navy text-xs truncate" title={cleanCustomerName}>{cleanCustomerName}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Order Status</span>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border mt-0.5 ${(ORDER_STATUS_CLASS as Record<string, string>)[order.status] || "bg-slate-100 text-slate-700"}`}>
                {(ORDER_STATUS_LABEL as Record<string, string>)[order.status] || order.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Volume & Blocks</span>
              <p className="font-black text-navy text-xs sm:text-sm">
                {totalCbmNumber > 0 ? `${totalCbmNumber.toFixed(3)} CBM` : `${formatNumber(order.quantity)} units`}
                <span className="text-slate-500 font-normal italic text-[11px] ml-1">
                  (≈ {formatNumber(order.quantity)} blks)
                </span>
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Block Jointing Morter</span>
              <p className="font-black text-sky-800 text-xs sm:text-sm">
                {mortarBags} Bags <span className="text-slate-500 font-normal text-[11px]">(40 KG)</span>
              </p>
            </div>
          </div>

          {/* Inventory Impact Box */}
          <div className={`rounded-xl p-3 text-xs space-y-1.5 border ${
            isDelivered
              ? "bg-purple-50/80 border-purple-200 text-purple-950"
              : isDispatched
              ? "bg-amber-50/80 border-amber-300 text-amber-950"
              : "bg-blue-50/80 border-blue-200 text-blue-950"
          }`}>
            <div className="flex items-center gap-1.5 font-black text-xs">
              <Boxes className="h-4 w-4 shrink-0" />
              <span>Inventory Impact:</span>
            </div>

            {isUndispatched && (
              <p className="text-[11px] leading-relaxed text-blue-900">
                <strong>Scenario A/B (Placed / Confirmed):</strong> No physical stock was deducted from factory inventory for this order. Deleting/cancelling will <strong>not</strong> add artificial stock, maintaining absolute yard balance integrity.
              </p>
            )}

            {isDispatched && (
              <div className="space-y-2">
                <p className="text-[11px] leading-relaxed text-amber-900">
                  <strong>Scenario C (Dispatched):</strong> Material was previously deducted on vehicle dispatch. If goods have <strong>physically returned</strong> to the factory yard, check the box below to restore the verified deducted quantities.
                </p>

                <label className="flex items-start gap-2.5 rounded-lg bg-white/90 p-2.5 border border-amber-300 cursor-pointer text-xs shadow-2xs">
                  <input
                    type="checkbox"
                    checked={returnStock}
                    onChange={(e) => setReturnStock(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-black text-amber-950 block">Goods have physically returned to the factory yard</span>
                    <span className="text-[11px] text-amber-800 block">
                      Restores +{totalCbmNumber.toFixed(3)} CBM & +{mortarBags} bags to live available inventory.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {isDelivered && (
              <div className="space-y-2">
                <p className="text-[11px] leading-relaxed text-purple-900">
                  <strong>Scenario D (Delivered / Legal Safeguard):</strong> Delivered orders with issued Delivery Challans/Invoices are protected for legal and tax compliance. This order will be safely archived with full audit records retained.
                </p>

                <label className="flex items-start gap-2.5 rounded-lg bg-white/90 p-2.5 border border-purple-200 cursor-pointer text-xs shadow-2xs">
                  <input
                    type="checkbox"
                    checked={returnStock}
                    onChange={(e) => setReturnStock(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-black text-purple-950 block">Goods have physically returned to factory yard</span>
                    <span className="text-[11px] text-purple-800 block">
                      Restores +{totalCbmNumber.toFixed(3)} CBM & +{mortarBags} bags to live available inventory.
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Deletion Form */}
        <form
          action={async (formData) => {
            startTransition(async () => {
              formData.set("orderId", order.id);
              formData.set("reason", reason.trim() || "Deleted by Super Admin");
              formData.set("returnStock", returnStock ? "true" : "false");
              formData.set("returnPath", returnPath);
              await deleteOrderAction(formData);
            });
          }}
          className="space-y-4"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="returnPath" value={returnPath} />

          {/* Reason input for audit trail */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Audit Reason / Remarks (Optional)
            </label>
            <input
              type="text"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer cancelled order, duplicate booking, site access issue"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
            />
          </div>

          {/* Action Buttons: Simple Yes / No Confirmation */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              No, Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 px-6 py-2.5 text-xs font-black text-white shadow-sm transition-all cursor-pointer active:scale-[0.98]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting Order...</span>
                </>
              ) : (
                <span>Yes, Delete Order</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
