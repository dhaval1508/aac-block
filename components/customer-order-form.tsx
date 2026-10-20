"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/utils";
import { placeCustomerOrderAction } from "@/lib/actions/orders";
import {
  ShieldCheck,
  Info,
  Loader2,
  Truck,
  Layers,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  Calculator,
  Sparkles,
} from "lucide-react";

export type ProductItem = {
  id: string;
  name: string;
  category: string;
  brand: string;
  sizeLabel: string;
  dimensions: string;
  cbmPerBlock: number;
  blocksPerCbm: number;
  price: number;
  gstRate: number;
  bagWeightKg?: number | null;
  coverageSqft?: number | null;
};

export function CustomerOrderForm({
  aacProducts,
  mortarProduct,
  adhesiveProduct,
  defaultAddress,
  defaultProductId,
  defaultQuantity,
  defaultMortarBags,
  error,
}: {
  aacProducts: ProductItem[];
  mortarProduct?: ProductItem | null;
  adhesiveProduct?: ProductItem | null;
  defaultAddress: string;
  defaultProductId?: string;
  defaultQuantity?: number;
  defaultMortarBags?: number;
  error?: string;
}) {
  const initialAacId =
    defaultProductId && aacProducts.some((p) => p.id === defaultProductId)
      ? defaultProductId
      : aacProducts[4]?.id ?? aacProducts[0]?.id ?? ""; // Default to 6" if present

  // Main AAC block state
  const [selectedAacId, setSelectedAacId] = useState(initialAacId);
  const [quantity, setQuantity] = useState<number | "">(defaultQuantity || 1000);
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddress);
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Addon state: Do you also need adhesive or block joining mortar?
  const [wantsAddons, setWantsAddons] = useState<boolean>(
    Boolean(defaultMortarBags && defaultMortarBags > 0)
  );

  // Swarnim Mortar
  const [mortarEnabled, setMortarEnabled] = useState<boolean>(
    Boolean(defaultMortarBags && defaultMortarBags > 0)
  );
  const [mortarCalcMode, setMortarCalcMode] = useState<"auto" | "manual">("auto");
  const [manualMortarBags, setManualMortarBags] = useState<number>(defaultMortarBags || 15);

  // Gold G100 Adhesive
  const [adhesiveEnabled, setAdhesiveEnabled] = useState<boolean>(false);
  const [adhesiveBags, setAdhesiveBags] = useState<number>(5);

  const selectedAac = useMemo(
    () => aacProducts.find((p) => p.id === selectedAacId) ?? aacProducts[0],
    [aacProducts, selectedAacId]
  );

  const numQty = typeof quantity === "number" ? Math.max(0, quantity) : 0;
  const blockCbm = selectedAac ? Number((numQty * Number(selectedAac.cbmPerBlock)).toFixed(4)) : 0;
  const blockSqft = selectedAac ? Number((numQty * 1.29).toFixed(2)) : 0;
  const blockRate = selectedAac ? Number(selectedAac.price) : 72;
  const blockSubtotal = Number((numQty * blockRate).toFixed(2));
  const blockGst = Number((blockSubtotal * 0.18).toFixed(2));
  const blockTotal = Number((blockSubtotal + blockGst).toFixed(2));

  // Auto mortar calculation: ~35 kg per CBM at 3mm joint, 40 kg per bag
  const autoMortarBags = useMemo(() => {
    if (blockCbm <= 0) return 0;
    const kg = blockCbm * 35;
    return Math.ceil(kg / 40);
  }, [blockCbm]);

  const effectiveMortarBags = mortarEnabled
    ? mortarCalcMode === "auto"
      ? autoMortarBags
      : manualMortarBags
    : 0;

  const mortarRate = mortarProduct ? Number(mortarProduct.price) || 380 : 380;
  const mortarSubtotal = Number((effectiveMortarBags * mortarRate).toFixed(2));
  const mortarGst = Number((mortarSubtotal * 0.18).toFixed(2));
  const mortarTotal = Number((mortarSubtotal + mortarGst).toFixed(2));

  // Adhesive calculation
  const effectiveAdhesiveBags = adhesiveEnabled ? Math.max(0, adhesiveBags) : 0;
  const adhesiveRate = adhesiveProduct ? Number(adhesiveProduct.price) || 290 : 290;
  const adhesiveSubtotal = Number((effectiveAdhesiveBags * adhesiveRate).toFixed(2));
  const adhesiveGst = Number((adhesiveSubtotal * 0.18).toFixed(2));
  const adhesiveTotal = Number((adhesiveSubtotal + adhesiveGst).toFixed(2));

  // Grand totals
  const grandSubtotal = Number((blockSubtotal + mortarSubtotal + adhesiveSubtotal).toFixed(2));
  const grandGst = Number((blockGst + mortarGst + adhesiveGst).toFixed(2));
  const grandTotal = Number((grandSubtotal + grandGst).toFixed(2));
  const estimatedTrucks = Math.max(1, Math.ceil(numQty / 1200));

  // Construct itemsJson for submission
  const itemsJson = useMemo(() => {
    const items: Array<{ productId: string; quantity: number }> = [];
    if (selectedAac && numQty > 0) {
      items.push({ productId: selectedAac.id, quantity: numQty });
    }
    if (mortarProduct && effectiveMortarBags > 0) {
      items.push({ productId: mortarProduct.id, quantity: effectiveMortarBags });
    }
    if (adhesiveProduct && effectiveAdhesiveBags > 0) {
      items.push({ productId: adhesiveProduct.id, quantity: effectiveAdhesiveBags });
    }
    return JSON.stringify(items);
  }, [selectedAac, numQty, mortarProduct, effectiveMortarBags, adhesiveProduct, effectiveAdhesiveBags]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-xs min-w-0 max-w-full space-y-6">
      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Super Admin Notice */}
      <div className="flex items-start gap-3 rounded-2xl bg-sky-50 border border-sky-200 p-4 text-xs text-sky-950 leading-relaxed">
        <Info className="h-4 w-4 text-[#13789B] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-[#13789B]">Plant Direct Staging:</strong> Orders are confirmed by Super Admin with stock verification, vehicle staging, and dedicated loading bay allocation.
        </div>
      </div>

      <form
        action={placeCustomerOrderAction}
        onSubmit={() => setIsSubmitting(true)}
        className="space-y-6"
      >
        <input type="hidden" name="itemsJson" value={itemsJson} />
        {/* Legacy hidden inputs for backward compatibility */}
        <input type="hidden" name="productId" value={selectedAac?.id || ""} />
        <input type="hidden" name="quantity" value={numQty} />
        {mortarProduct && <input type="hidden" name="mortarProductId" value={mortarProduct.id} />}
        <input type="hidden" name="mortarQuantity" value={effectiveMortarBags} />
        {adhesiveProduct && <input type="hidden" name="adhesiveProductId" value={adhesiveProduct.id} />}
        <input type="hidden" name="adhesiveQuantity" value={effectiveAdhesiveBags} />

        {/* =========================================================================
            SECTION 1: AAC BLOCK PRODUCT SELECTION
        ========================================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
            <Layers className="h-5 w-5 text-[#13789B]" />
            <h3 className="text-sm font-black text-navy uppercase tracking-wider">
              1. AAC Block Selection & Dimensions
            </h3>
          </div>

          <div>
            <label className="label">Select Block Thickness / Size *</label>
            <select
              value={selectedAacId}
              onChange={(e) => setSelectedAacId(e.target.value)}
              className="field font-semibold text-navy text-sm sm:text-base cursor-pointer"
            >
              {aacProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sizeLabel} — {p.dimensions} ({Number(p.cbmPerBlock).toFixed(4)} CBM/block • {Number(p.blocksPerCbm).toFixed(2)} blk/m³)
                </option>
              ))}
            </select>
          </div>

          {selectedAac ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl bg-white border border-slate-200 p-3.5 text-center text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Dimensions</span>
                <p className="mt-0.5 font-bold text-navy font-mono">{selectedAac.dimensions}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">CBM / Block</span>
                <p className="mt-0.5 font-bold text-[#13789B] font-mono">
                  {Number(selectedAac.cbmPerBlock).toFixed(4)} m³
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Blocks / CBM</span>
                <p className="mt-0.5 font-bold text-navy font-mono">
                  {Number(selectedAac.blocksPerCbm).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Face Area</span>
                <p className="mt-0.5 font-bold text-slate-700 font-mono">1.29 Sq.Ft.</p>
              </div>
            </div>
          ) : null}

          <div>
            <label className="label">Required Block Quantity (Units) *</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 1000"
                className="field text-lg font-black text-navy font-mono flex-1"
              />
              <div className="flex gap-1.5 shrink-0">
                {[500, 1000, 1500, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AAC Volume & Price Breakdown */}
          {numQty > 0 && selectedAac && (
            <div className="rounded-xl bg-teal-50/70 border border-teal-200/70 p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
              <div>
                <span className="text-teal-900 font-bold block">
                  Cubic Volume: <strong className="text-sm font-black font-mono text-[#13789B]">{blockCbm.toFixed(2)} CBM (m³)</strong>
                </span>
                <span className="text-[11px] text-teal-700">
                  Approx. Wall Face Area: {blockSqft.toLocaleString()} Sq.Ft. • ~{estimatedTrucks} Truckload(s)
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] uppercase font-bold text-teal-800 block">Block Amount (₹{blockRate}/blk + 18% GST)</span>
                <span className="text-base font-black text-teal-950 font-mono">₹{blockTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 2: ADHESIVE & BLOCK JOINING MORTAR SELECTION
        ========================================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-navy uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                <span>Do you also need adhesive or block joining mortar?</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Swarnim Thin-Bed Mortar & Tile Adhesive direct factory staging.
              </p>
            </div>

            {/* Toggle options */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setWantsAddons(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  wantsAddons
                    ? "bg-[#13789B] text-white shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                Yes, Add Products
              </button>
              <button
                type="button"
                onClick={() => {
                  setWantsAddons(false);
                  setMortarEnabled(false);
                  setAdhesiveEnabled(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !wantsAddons
                    ? "bg-slate-300 text-slate-800 shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                No, Continue Without
              </button>
            </div>
          </div>

          {wantsAddons && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Product A: Swarnim Block Jointing Mortar */}
              {mortarProduct && (
                <div className={`rounded-2xl border p-4 transition-all ${
                  mortarEnabled ? "border-amber-300 bg-amber-50/40" : "border-slate-200 bg-slate-50/50"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mortarEnabled}
                        onChange={(e) => setMortarEnabled(e.target.checked)}
                        className="h-4 w-4 rounded-md border-slate-300 text-[#13789B] focus:ring-[#13789B] mt-1"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-navy uppercase">
                            Swarnim Block Jointing Mortar (40 Kg Bag)
                          </h4>
                          <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                            Verified Brochure SKU
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Thin-bed jointing mortar designed specifically for AAC masonry. 40 kg net weight bags.
                        </p>
                      </div>
                    </label>
                    <span className="text-xs font-black text-navy whitespace-nowrap">
                      ₹{mortarRate} / bag
                    </span>
                  </div>

                  {mortarEnabled && (
                    <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Mortar Estimation Mode:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setMortarCalcMode("auto")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              mortarCalcMode === "auto"
                                ? "bg-amber-600 text-white"
                                : "bg-white border text-slate-600"
                            }`}
                          >
                            Auto by CBM ({autoMortarBags} Bags)
                          </button>
                          <button
                            type="button"
                            onClick={() => setMortarCalcMode("manual")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              mortarCalcMode === "manual"
                                ? "bg-amber-600 text-white"
                                : "bg-white border text-slate-600"
                            }`}
                          >
                            Manual Bag Quantity
                          </button>
                        </div>
                      </div>

                      {mortarCalcMode === "manual" ? (
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-semibold text-slate-600 shrink-0">
                            Number of 40kg Bags:
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={manualMortarBags}
                            onChange={(e) => setManualMortarBags(Math.max(1, Number(e.target.value) || 0))}
                            className="field max-w-[140px] text-sm font-bold text-navy font-mono"
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-800 bg-amber-100/60 p-2.5 rounded-xl">
                          Calculated for {blockCbm.toFixed(2)} CBM of AAC blocks at standard 3mm bed thickness (~35 kg/CBM) = <strong>{autoMortarBags} Bags (40 Kg each)</strong>.
                        </p>
                      )}

                      <div className="flex justify-between items-center text-xs font-bold pt-1 text-amber-950">
                        <span>Mortar Subtotal ({effectiveMortarBags} Bags):</span>
                        <span className="font-mono text-sm">₹{mortarTotal.toLocaleString()} (Incl. 18% GST)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Product B: GOLD (G100) Tile & Stone Adhesive */}
              {adhesiveProduct && (
                <div className={`rounded-2xl border p-4 transition-all ${
                  adhesiveEnabled ? "border-sky-300 bg-sky-50/40" : "border-slate-200 bg-slate-50/50"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adhesiveEnabled}
                        onChange={(e) => setAdhesiveEnabled(e.target.checked)}
                        className="h-4 w-4 rounded-md border-slate-300 text-[#13789B] focus:ring-[#13789B] mt-1"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-navy uppercase">
                            GOLD (G100) TILE & STONE ADHESIVE (20 Kg Bag)
                          </h4>
                          <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5">
                            Tiling Solution
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Approx. tile coverage of <strong>55–60 Sq.Ft. per 20 kg bag</strong> at 3 mm bed thickness (for wall & floor tiles/stones).
                        </p>
                      </div>
                    </label>
                    <span className="text-xs font-black text-navy whitespace-nowrap">
                      ₹{adhesiveRate} / bag
                    </span>
                  </div>

                  {adhesiveEnabled && (
                    <div className="mt-4 pt-3 border-t border-sky-200/60 space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-slate-600 shrink-0">
                          Number of 20kg Bags:
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={adhesiveBags}
                          onChange={(e) => setAdhesiveBags(Math.max(1, Number(e.target.value) || 0))}
                          className="field max-w-[140px] text-sm font-bold text-navy font-mono"
                        />
                        <span className="text-xs text-slate-400">
                          (~{(effectiveAdhesiveBags * 57.5).toFixed(0)} Sq.Ft. tile coverage)
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold pt-1 text-sky-950">
                        <span>Adhesive Subtotal ({effectiveAdhesiveBags} Bags):</span>
                        <span className="font-mono text-sm">₹{adhesiveTotal.toLocaleString()} (Incl. 18% GST)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 3: DELIVERY & SITE INFORMATION
        ========================================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-black text-navy uppercase tracking-wider border-b border-slate-100 pb-2.5">
            3. Delivery & Construction Site Address
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Requested Delivery Date</label>
              <input
                name="requestedDate"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="field cursor-pointer"
              />
            </div>

            <div>
              <label className="label">Unloading Site Contact / Instructions (Optional)</label>
              <input
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Tower A gate, contact Mr. Patel"
                className="field"
              />
            </div>
          </div>

          <div>
            <label className="label">Full Site / Delivery Address *</label>
            <textarea
              name="deliveryAddress"
              required
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Detailed site address with landmark, gate number and unloading site instructions"
              className="field"
            />
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: ORDER SUMMARY & PRICING BREAKDOWN
        ========================================================================= */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-white via-teal-50/30 to-amber-50/20 p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-teal-100 pb-2.5">
            <h4 className="text-sm font-black text-navy uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#13789B]" />
              <span>Combined Consignment Summary</span>
            </h4>
            <span className="text-xs font-black text-[#13789B] font-mono">
              Total CBM: {blockCbm.toFixed(2)} m³
            </span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100">
            {/* Blocks Row */}
            <div className="flex justify-between items-center pt-1 text-slate-700">
              <span>
                <strong>{selectedAac?.sizeLabel} AAC Blocks</strong> ({formatNumber(numQty)} Units • {blockCbm.toFixed(2)} CBM)
              </span>
              <span className="font-mono font-bold text-navy">₹{blockTotal.toLocaleString()}</span>
            </div>

            {/* Mortar Row */}
            {effectiveMortarBags > 0 && (
              <div className="flex justify-between items-center pt-2 text-slate-700">
                <span>
                  <strong>Swarnim Jointing Mortar</strong> ({effectiveMortarBags} Bags of 40 Kg)
                </span>
                <span className="font-mono font-bold text-navy">₹{mortarTotal.toLocaleString()}</span>
              </div>
            )}

            {/* Adhesive Row */}
            {effectiveAdhesiveBags > 0 && (
              <div className="flex justify-between items-center pt-2 text-slate-700">
                <span>
                  <strong>GOLD (G100) Tile Adhesive</strong> ({effectiveAdhesiveBags} Bags of 20 Kg)
                </span>
                <span className="font-mono font-bold text-navy">₹{adhesiveTotal.toLocaleString()}</span>
              </div>
            )}

            {/* Tax Row */}
            <div className="flex justify-between items-center pt-2 text-slate-500">
              <span>Includes Applicable 18.0% GST (CGST 9% + SGST 9%)</span>
              <span className="font-mono">₹{grandGst.toLocaleString()}</span>
            </div>

            {/* Grand Total Row */}
            <div className="flex justify-between items-center pt-3 text-base">
              <span className="font-black text-navy">Grand Total Amount:</span>
              <span className="font-black text-xl text-[#13789B] font-mono">
                ₹{grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || numQty <= 0}
          className="w-full py-4 text-sm sm:text-base font-bold flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0F627F] text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Placing Order with Factory...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              <span>Confirm & Place Factory Consignment Order</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
