"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/utils";
import { placeCustomerOrderAction } from "@/lib/actions/orders";
import { ShieldCheck, Info, Loader2, Truck, Layers } from "lucide-react";

type Product = {
  id: string;
  sizeLabel: string;
  dimensions: string;
  cbmPerBlock: number | { toString(): string };
  blocksPerCbm: number | { toString(): string };
  price: number | { toString(): string };
  gstRate: number | { toString(): string };
};

export function CustomerOrderForm({
  products,
  defaultAddress,
  defaultProductId,
  error,
}: {
  products: Product[];
  defaultAddress: string;
  defaultProductId?: string;
  error?: string;
}) {
  const initialId =
    defaultProductId && products.some((p) => p.id === defaultProductId)
      ? defaultProductId
      : products[0]?.id ?? "";

  const [selectedId, setSelectedId] = useState(initialId);
  const [quantity, setQuantity] = useState<number | "">(2000);
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) ?? products[0],
    [products, selectedId]
  );

  const numQty = typeof quantity === "number" ? Math.max(0, quantity) : 0;
  const totalCbm = selectedProduct ? numQty * Number(selectedProduct.cbmPerBlock) : 0;
  const estimatedTrucks = Math.max(1, Math.ceil(numQty / 1200));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-xs min-w-0 max-w-full">
      {error ? (
        <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Admin Confirmation Notice */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-sky-50 border border-sky-200 p-4 text-xs text-sky-950 leading-relaxed">
        <Info className="h-4 w-4 text-[#13789B] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-[#13789B]">Plant Yard Staging & Dispatch:</strong> Submitted orders are saved with status <span className="font-bold underline">Pending Review</span>. Verified stock availability, vehicle staging, and loading staff will be allocated by Super Admin upon confirmation.
        </div>
      </div>

      <form
        action={placeCustomerOrderAction}
        onSubmit={() => setIsSubmitting(true)}
        className="space-y-5"
      >
        <div>
          <label className="label">Select AAC Block Size *</label>
          <select
            name="productId"
            required
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="field font-semibold text-navy text-sm sm:text-base cursor-pointer"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sizeLabel} — {p.dimensions} ({Number(p.cbmPerBlock).toFixed(4)} CBM/block)
              </option>
            ))}
          </select>
        </div>

        {selectedProduct ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-center text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Dimensions (L×H×W)</span>
              <p className="mt-0.5 font-bold text-navy font-mono">{selectedProduct.dimensions}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Unit Volume</span>
              <p className="mt-0.5 font-bold text-navy font-mono">
                {Number(selectedProduct.cbmPerBlock).toFixed(4)} m³
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Blocks / CBM</span>
              <p className="mt-0.5 font-bold text-navy font-mono">
                {Number(selectedProduct.blocksPerCbm).toFixed(2)}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Required Quantity (Blocks) *</label>
            <input
              name="quantity"
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 2000"
              className="field text-lg font-black text-navy font-mono"
            />
            {numQty > 0 ? (
              <p className="mt-1 text-[11px] text-slate-500">
                Total blocks: <strong className="text-navy">{formatNumber(numQty)}</strong>
              </p>
            ) : null}
          </div>

          <div>
            <label className="label">Required Delivery Date</label>
            <input
              name="requestedDate"
              type="date"
              min={new Date().toISOString().split("T")[0]}
              className="field cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="label">Site / Delivery Address *</label>
          <textarea
            name="deliveryAddress"
            required
            rows={2}
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Full delivery address with landmark, gate number and unloading site instructions"
            className="field"
          />
        </div>

        <div>
          <label className="label">Notes / Unloading Site Instructions (Optional)</label>
          <textarea
            name="notes"
            rows={2}
            placeholder="e.g. Tower 3 unloading zone, contact site engineer Mr. Sharma upon truck arrival"
            className="field"
          />
        </div>

        {/* Operational Volume & Logistics Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-navy text-sm border-b border-slate-200 pb-2">
            <Truck className="h-4 w-4 text-[#13789B]" />
            <span>Fulfillment & Vehicle Staging Overview</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Selected Specification</span>
            <strong className="text-navy font-mono">{selectedProduct?.sizeLabel} ({selectedProduct?.dimensions})</strong>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Total Units Requested</span>
            <strong className="text-navy font-mono">{formatNumber(numQty)} Blocks</strong>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Calculated Cubic Volume (CBM)</span>
            <strong className="text-[#13789B] font-mono text-sm">{totalCbm.toFixed(2)} m³</strong>
          </div>
          <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-slate-700">
            <span className="font-semibold">Estimated Transport Capacity</span>
            <span className="rounded-md bg-white border border-slate-200 px-2.5 py-0.5 font-bold text-slate-800">
              ~{estimatedTrucks} Standard Truckload(s)
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || numQty <= 0}
          className="w-full py-3.5 text-sm sm:text-base font-bold flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] text-white hover:bg-[#0F627F] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Submitting Order...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              <span>Confirm & Place Factory AAC Order</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
