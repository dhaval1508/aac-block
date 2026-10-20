"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/utils";
import { placeCustomerOrderAction } from "@/lib/actions/orders";
import {
  Layers,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  Truck,
  Loader2,
  Sparkles,
  Info,
  ShieldCheck,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { calculateBlockMetrics } from "@/lib/aac-calculator";

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

export interface CustomerDefaults {
  name: string;
  mobile: string;
  email: string;
  deliveryAddress: string;
  city: string;
  pincode: string;
}

interface BlockOrderItem {
  id: string;
  productId: string;
  quantity: number | "";
}

export function CustomerOrderForm({
  aacProducts,
  adhesiveProduct,
  customerDefaults,
  defaultProductId,
  defaultQuantity,
  defaultAdhesiveBags = 0,
  error,
}: {
  aacProducts: ProductItem[];
  adhesiveProduct?: ProductItem | null;
  customerDefaults: CustomerDefaults;
  defaultProductId?: string;
  defaultQuantity?: number;
  defaultAdhesiveBags?: number;
  error?: string;
}) {
  const initialAacId =
    defaultProductId && aacProducts.some((p) => p.id === defaultProductId)
      ? defaultProductId
      : aacProducts.find((p) => p.sizeLabel.includes("6"))?.id || aacProducts[0]?.id || "";

  // Section A: Multiple AAC block sizes
  const [blockItems, setBlockItems] = useState<BlockOrderItem[]>([
    {
      id: "initial-1",
      productId: initialAacId,
      quantity: defaultQuantity || 1000,
    },
  ]);

  // Section B: Block Jointing Morter (40 KG Bag only, default 0, compulsory field)
  const [adhesiveBags, setAdhesiveBags] = useState<number | "">(defaultAdhesiveBags);

  // Section C: Customer Details
  const [customerName, setCustomerName] = useState(customerDefaults.name);
  const [customerMobile, setCustomerMobile] = useState(customerDefaults.mobile);
  const [customerEmail, setCustomerEmail] = useState(customerDefaults.email);
  const [deliveryAddress, setDeliveryAddress] = useState(customerDefaults.deliveryAddress);
  const [city, setCity] = useState(customerDefaults.city || "Ahmedabad");
  const [pincode, setPincode] = useState(customerDefaults.pincode || "");
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add another block size row
  const addBlockSizeRow = () => {
    // Pick an unused block size if available, or first
    const usedIds = new Set(blockItems.map((b) => b.productId));
    const nextProduct = aacProducts.find((p) => !usedIds.has(p.id)) || aacProducts[0];
    setBlockItems((prev) => [
      ...prev,
      {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: nextProduct?.id || "",
        quantity: 500,
      },
    ]);
  };

  const removeBlockSizeRow = (id: string) => {
    if (blockItems.length <= 1) return;
    setBlockItems((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBlockSizeRow = (id: string, updates: Partial<BlockOrderItem>) => {
    setBlockItems((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  // Calculations for Section A
  const rowCalculations = useMemo(() => {
    return blockItems.map((item) => {
      const prod = aacProducts.find((p) => p.id === item.productId);
      const qty = typeof item.quantity === "number" ? Math.max(0, item.quantity) : 0;
      const cbmPerBlock = prod ? Number(prod.cbmPerBlock) : 0.018;
      const totalCbm = qty * cbmPerBlock;
      // Formula: Blocks * (Length * Height / 1,000,000) * 10.7639104167 = Qty * 1.29166925 sq.ft.
      const totalSqft = qty * 1.29166925;

      return {
        ...item,
        product: prod,
        numericQty: qty,
        cbmPerBlock,
        totalCbm,
        totalSqft,
      };
    });
  }, [blockItems, aacProducts]);

  const totalBlocks = useMemo(
    () => rowCalculations.reduce((sum, r) => sum + r.numericQty, 0),
    [rowCalculations]
  );

  const combinedCbm = useMemo(
    () => rowCalculations.reduce((sum, r) => sum + r.totalCbm, 0),
    [rowCalculations]
  );

  const combinedSqft = useMemo(
    () => rowCalculations.reduce((sum, r) => sum + r.totalSqft, 0),
    [rowCalculations]
  );

  const numAdhesiveBags =
    typeof adhesiveBags === "number" ? Math.max(0, Math.floor(adhesiveBags)) : 0;

  // JSON Items for submission
  const itemsJson = useMemo(() => {
    const list: Array<{ productId: string; quantity: number }> = [];
    for (const r of rowCalculations) {
      if (r.productId && r.numericQty > 0) {
        list.push({ productId: r.productId, quantity: r.numericQty });
      }
    }
    if (adhesiveProduct && numAdhesiveBags > 0) {
      list.push({ productId: adhesiveProduct.id, quantity: numAdhesiveBags });
    }
    return JSON.stringify(list);
  }, [rowCalculations, adhesiveProduct, numAdhesiveBags]);

  return (
    <form
      action={placeCustomerOrderAction}
      onSubmit={() => setIsSubmitting(true)}
      className="space-y-6 min-w-0 max-w-full"
    >
      {/* Hidden Fields for Action Processing */}
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <input type="hidden" name="adhesiveBags" value={numAdhesiveBags} />
      <input type="hidden" name="customerName" value={customerName} />
      <input type="hidden" name="customerMobile" value={customerMobile} />
      <input type="hidden" name="customerEmail" value={customerEmail} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="pincode" value={pincode} />

      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* =========================================================================
          SECTION A: AAC BLOCK DETAILS
      ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
                A
              </span>
              <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
                AAC Block Details
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select one or multiple standard AAC block sizes and specify required block quantities.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-[11px] font-bold text-[#13789B]">
            All 9 Master BIS Sizes Available
          </span>
        </div>

        {/* Dynamic Block Size Rows */}
        <div className="space-y-3.5">
          {blockItems.map((item, index) => {
            const rowCalc = rowCalculations[index];
            const currentProduct = aacProducts.find((p) => p.id === item.productId);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-5 space-y-3 transition-colors hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Block Size #{index + 1}
                  </span>
                  {blockItems.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeBlockSizeRow(item.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                  {/* Select Block Size */}
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Block Size
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) =>
                        updateBlockSizeRow(item.id, { productId: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                    >
                      {aacProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sizeLabel} Block ({p.dimensions}) • {Number(p.cbmPerBlock).toFixed(4)} CBM/block
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Enter Number of Blocks */}
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Number of Blocks
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          updateBlockSizeRow(item.id, {
                            quantity:
                              e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        placeholder="e.g. 1000"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-16 text-xs sm:text-sm font-mono font-bold text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="pointer-events-none absolute right-3 text-xs font-bold text-slate-400 select-none">
                        Blocks
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto Calculated Row Metrics */}
                {rowCalc && rowCalc.numericQty > 0 ? (
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-white border border-slate-200/80 p-2.5 text-center">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">
                        CBM / Block
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-700">
                        {rowCalc.cbmPerBlock.toFixed(4)} m³
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-teal-800 uppercase">
                        Size CBM
                      </span>
                      <span className="text-xs font-black font-mono text-[#13789B]">
                        {rowCalc.totalCbm.toFixed(2)} m³
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">
                        Wall Area
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-700">
                        {rowCalc.totalSqft.toFixed(1)} Sq.Ft.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Add Another Block Size Button */}
        <button
          type="button"
          onClick={addBlockSizeRow}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#13789B] bg-teal-50/50 hover:bg-teal-50 px-4 py-2.5 text-xs font-bold text-[#13789B] transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Another Block Size</span>
        </button>

        {/* Section A Combined Summary Bar */}
        <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-[#13789B] p-4 sm:p-5 text-white shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-teal-300">
              Total AAC Block Calculation
            </span>
            <span className="text-[11px] text-slate-300">
              {blockItems.length} Size{blockItems.length > 1 ? "s" : ""} Selected
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold text-slate-300 uppercase">
                Total Blocks
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-white">
                {formatNumber(totalBlocks)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold text-teal-300 uppercase">
                Total CBM
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-teal-300">
                {combinedCbm.toFixed(2)} m³
              </span>
            </div>
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold text-slate-300 uppercase">
                Total Sq.Ft.
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-white">
                {combinedSqft.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION B: BLOCK JOINTING MORTER (40 KG BAG ONLY)
      ========================================================================= */}
      <div className="rounded-3xl border border-sky-200 bg-sky-50/40 p-4 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
                B
              </span>
              <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
                Block Jointing Morter
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              High-adhesion thin bed mortar for AAC blocks. Packaging: 40 KG Bag only.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-sky-100 border border-sky-300 px-3 py-1 text-[11px] font-black text-sky-900">
            Bag Size: 40 KG
          </span>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#13789B]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-navy">
                Block Jointing Morter (40 KG)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Specially formulated pre-mixed thin-bed jointing mortar designed for high-strength AAC block wall masonry. Packaging: <strong>40 KG Bag</strong>.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 grid gap-4 sm:grid-cols-2 items-center">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-navy">
                How many bags do you require?
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={adhesiveBags}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setAdhesiveBags("");
                    } else {
                      const parsed = parseInt(val, 10);
                      setAdhesiveBags(isNaN(parsed) || parsed < 0 ? 0 : parsed);
                    }
                  }}
                  className="w-32 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-mono font-black text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs font-bold text-slate-600">
                  Bags (40 KG each)
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="h-3.5 w-3.5 text-[#13789B]" />
                <span>Quantity 0 is completely valid</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                If you already have mortar or only require AAC blocks for this consignment, leave quantity as 0.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION C: CUSTOMER & DELIVERY DETAILS
      ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
            C
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
              Customer Details
            </h2>
            <p className="text-xs text-slate-500">
              Site contact and physical unloading location for vehicle logistics.
            </p>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          {/* Customer Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Customer Name / Company *</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Full name or company entity"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>Mobile Number *</span>
            </label>
            <input
              type="tel"
              required
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">City / District *</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ahmedabad, Kheda, Surat"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* Delivery Address */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>Delivery Site Address *</span>
            </label>
            <textarea
              name="deliveryAddress"
              required
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Exact project site address, plot/road name, landmark..."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs sm:text-sm text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 resize-none"
            />
          </div>

          {/* Pincode */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Pincode *</label>
            <input
              type="text"
              required
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="6-digit pincode"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>Additional Notes / Unloading Instructions</span>
            </label>
            <input
              type="text"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Crane required / Evening delivery / Gate 2"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION D: ORDER SUMMARY & SUBMISSION
      ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
            D
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
              Order Summary
            </h2>
            <p className="text-xs text-slate-500">
              Review your consignment specifications before submitting order placement.
            </p>
          </div>
        </div>

        {/* Breakdown Items List */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              AAC Block Consignment
            </span>
            {rowCalculations.map((r, idx) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-0"
              >
                <div>
                  <strong className="text-navy">
                    {r.product?.sizeLabel || `Size #${idx + 1}`} AAC Block
                  </strong>
                  <span className="text-slate-500 text-[11px] block font-mono">
                    {r.product?.dimensions} • {r.cbmPerBlock.toFixed(4)} CBM/block
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-navy text-sm block">
                    {formatNumber(r.numericQty)} Blocks
                  </span>
                  <span className="text-[11px] font-mono text-[#13789B] font-bold">
                    {r.totalCbm.toFixed(2)} m³ ({r.totalSqft.toFixed(1)} Sq.Ft.)
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-xs">
            <div>
              <strong className="text-navy">
                Block Jointing Morter
              </strong>
              <span className="text-slate-500 text-[11px] block">
                Packaging: 40 KG Bag Only
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-navy text-sm block">
                {numAdhesiveBags} Bags
              </span>
              <span className="text-[11px] text-slate-500">
                {numAdhesiveBags > 0 ? `${numAdhesiveBags * 40} KG Total` : "0 Bags"}
              </span>
            </div>
          </div>

          {/* Delivery Details In Summary */}
          <div className="border-t border-slate-200 pt-2 text-xs text-slate-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Delivery Destination
            </span>
            <p className="font-semibold text-navy mt-0.5">
              {customerName ? `${customerName} • ` : ""}
              {deliveryAddress || "Address provided"}
              {city ? `, ${city}` : ""}
              {pincode ? ` - ${pincode}` : ""}
            </p>
          </div>
        </div>

        {/* Verification Alert */}
        <div className="flex items-start gap-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 p-3.5 text-xs text-teal-950">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#13789B] mt-0.5" />
          <p className="leading-relaxed">
            <strong>Order Placement Only:</strong> No online payment or price transaction occurs on this website. Upon placement, your order is instantly registered into the Swarnim plant ERP and assigned for transport logistics.
          </p>
        </div>

        {/* Final Button: PLACE ORDER */}
        <button
          type="submit"
          disabled={isSubmitting || totalBlocks <= 0 || !deliveryAddress.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0F627F] disabled:bg-slate-300 py-4 px-6 text-sm sm:text-base font-black text-white shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>SUBMITTING ORDER TO FACTORY...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span>PLACE ORDER</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
