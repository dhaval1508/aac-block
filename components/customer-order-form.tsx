"use client";

import { useMemo, useState } from "react";
import { formatNumber, formatBlockSizeName } from "@/lib/utils";
import { placeCustomerOrderAction, editCustomerOrderAction } from "@/lib/actions/orders";
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Sparkles,
  Info,
  ShieldCheck,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  X,
  ArrowLeft,
  Boxes,
  ExternalLink,
} from "lucide-react";
import {
  DeliveryLocationPicker,
  DeliveryLocationData,
} from "@/components/delivery-location-picker";

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

export interface BlockOrderItem {
  id: string;
  productId: string;
  cbm: number | "";
  quantity: number | "";
}

export function CustomerOrderForm({
  aacProducts,
  adhesiveProduct,
  customerDefaults,
  defaultProductId,
  defaultQuantity,
  defaultAdhesiveBags = 0,
  isEditing = false,
  orderId,
  orderNo,
  initialBlockItems,
  initialDeliveryLocation,
  initialNotes = "",
  error,
}: {
  aacProducts: ProductItem[];
  adhesiveProduct?: ProductItem | null;
  customerDefaults: CustomerDefaults;
  defaultProductId?: string;
  defaultQuantity?: number;
  defaultAdhesiveBags?: number;
  isEditing?: boolean;
  orderId?: string;
  orderNo?: string;
  initialBlockItems?: BlockOrderItem[];
  initialDeliveryLocation?: DeliveryLocationData;
  initialNotes?: string;
  error?: string;
}) {
  const initialAacId =
    defaultProductId && aacProducts.some((p) => p.id === defaultProductId)
      ? defaultProductId
      : aacProducts.find((p) => p.sizeLabel.includes("6"))?.id || aacProducts[0]?.id || "";
  const initialProd = aacProducts.find((p) => p.id === initialAacId) || aacProducts[0];
  const initialRate = initialProd ? Number(initialProd.cbmPerBlock) : 0.018;
  const initialQty = defaultQuantity || 1000;
  const initialCbm = Number((initialQty * initialRate).toFixed(3));

  // Section A: Multiple AAC block sizes (CBM is primary)
  const [blockItems, setBlockItems] = useState<BlockOrderItem[]>(
    initialBlockItems && initialBlockItems.length > 0
      ? initialBlockItems
      : [
          {
            id: "initial-1",
            productId: initialAacId,
            cbm: initialCbm,
            quantity: initialQty,
          },
        ]
  );

  // Section B: Block Jointing Morter (40 KG Bag only, default 0, compulsory field)
  const [adhesiveBags, setAdhesiveBags] = useState<number | "">(defaultAdhesiveBags);

  // Section C: Customer Details
  const [customerName, setCustomerName] = useState(customerDefaults.name);
  const [customerMobile, setCustomerMobile] = useState(customerDefaults.mobile);
  const [customerEmail, setCustomerEmail] = useState(customerDefaults.email);
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialDeliveryLocation?.address || customerDefaults.deliveryAddress
  );
  const [city, setCity] = useState(initialDeliveryLocation?.city || customerDefaults.city || "Ahmedabad");
  const [pincode, setPincode] = useState(initialDeliveryLocation?.pincode || customerDefaults.pincode || "");
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState(initialNotes);

  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocationData>(
    initialDeliveryLocation || {
      address: customerDefaults.deliveryAddress || "",
      locationSource: "MANUAL",
      city: customerDefaults.city || "Ahmedabad",
      pincode: customerDefaults.pincode || "",
      state: "Gujarat",
    }
  );

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add another block size row
  const addBlockSizeRow = () => {
    // Pick an unused block size if available, or first
    const usedIds = new Set(blockItems.map((b) => b.productId));
    const nextProduct = aacProducts.find((p) => !usedIds.has(p.id)) || aacProducts[0];
    const rate = nextProduct ? Number(nextProduct.cbmPerBlock) : 0.018;
    setBlockItems((prev) => [
      ...prev,
      {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: nextProduct?.id || "",
        cbm: Number((500 * rate).toFixed(3)),
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
      const cbmPerBlock = prod ? Number(prod.cbmPerBlock) : 0.018;
      const cbmVal = typeof item.cbm === "number" ? Math.max(0, item.cbm) : 0;
      let qty = typeof item.quantity === "number" ? Math.max(0, item.quantity) : 0;
      if (cbmVal > 0 && qty === 0 && cbmPerBlock > 0) {
        qty = Math.round(cbmVal / cbmPerBlock);
      }
      const totalCbm = cbmVal > 0 ? cbmVal : Number((qty * cbmPerBlock).toFixed(4));
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
    const list: Array<{ productId: string; quantity: number; cbm?: number }> = [];
    for (const r of rowCalculations) {
      if (r.productId && (r.numericQty > 0 || r.totalCbm > 0)) {
        list.push({
          productId: r.productId,
          quantity: r.numericQty,
          cbm: r.totalCbm > 0 ? r.totalCbm : undefined,
        });
      }
    }
    if (adhesiveProduct && numAdhesiveBags > 0) {
      list.push({ productId: adhesiveProduct.id, quantity: numAdhesiveBags });
    }
    return JSON.stringify(list);
  }, [rowCalculations, adhesiveProduct, numAdhesiveBags]);

  return (
    <form
      action={isEditing ? editCustomerOrderAction : placeCustomerOrderAction}
      onSubmit={() => setIsSubmitting(true)}
      className="space-y-6 min-w-0 max-w-full"
    >
      {/* Hidden Fields for Action Processing */}
      {isEditing && <input type="hidden" name="orderId" value={orderId || ""} />}
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
                      onChange={(e) => {
                        const newProductId = e.target.value;
                        const newProd = aacProducts.find((p) => p.id === newProductId);
                        const newRate = Number(newProd?.cbmPerBlock || 0.018);
                        let newQty = item.quantity;
                        if (typeof item.cbm === "number" && item.cbm > 0 && newRate > 0) {
                          newQty = Math.round(item.cbm / newRate);
                        }
                        updateBlockSizeRow(item.id, {
                          productId: newProductId,
                          quantity: newQty,
                        });
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                    >
                      {aacProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatBlockSizeName(p.sizeLabel)} ({p.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Enter CBM Quantity (Primary) */}
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Order Quantity (CBM) *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        value={item.cbm}
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : Number(e.target.value);
                          const rate = Number(currentProduct?.cbmPerBlock || 0.018);
                          const calcQty = val !== "" && rate > 0 ? Math.round(Number(val) / rate) : "";
                          updateBlockSizeRow(item.id, {
                            cbm: val,
                            quantity: calcQty,
                          });
                        }}
                        placeholder="e.g. 100.000"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-14 text-xs sm:text-sm font-mono font-black text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="pointer-events-none absolute right-3 text-xs font-bold text-slate-400 select-none">
                        CBM
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto Calculated Row Metrics */}
                {rowCalc && (rowCalc.totalCbm > 0 || rowCalc.numericQty > 0) ? (
                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white border border-teal-200/90 p-3 sm:p-3.5 text-center shadow-xs">
                    <div className="border-r border-slate-100 pr-2">
                      <span className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Approx. Blocks
                      </span>
                      <span className="text-sm sm:text-base font-black font-mono text-navy mt-0.5 block">
                        {formatNumber(rowCalc.numericQty)} Nos
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] sm:text-[11px] font-black text-[#13789B] uppercase tracking-wider">
                        Total CBM
                      </span>
                      <span className="text-sm sm:text-base font-black font-mono text-[#13789B] mt-0.5 block">
                        {rowCalc.totalCbm.toFixed(3)} CBM
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
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold text-teal-300 uppercase">
                Total Order Volume
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-teal-300 block">
                {combinedCbm.toFixed(3)} CBM
              </span>
              <span className="text-[11px] text-slate-300 italic block mt-0.5">
                ≈ {formatNumber(totalBlocks)} Blocks
              </span>
            </div>
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold text-slate-300 uppercase">
                Selected Block Sizes
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-white block">
                {blockItems.length} Size{blockItems.length > 1 ? "s" : ""}
              </span>
              <span className="text-[11px] text-slate-300 italic block mt-0.5">
                Standard Factory Dimensions
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

          {/* Pincode */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Pincode *</label>
            <input
              type="text"
              required
              value={pincode}
              onChange={(e) => {
                setPincode(e.target.value);
                setDeliveryLocation((prev) => ({ ...prev, pincode: e.target.value }));
              }}
              placeholder="6-digit pincode"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* Delivery Site Address & Google Maps Location Picker */}
          <div id="delivery-location-section" className="sm:col-span-2 space-y-1.5 scroll-mt-24">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#13789B]" />
              <span>Delivery Site Location (Google Maps Search & Custom Entry) *</span>
            </label>
            <DeliveryLocationPicker
              value={deliveryLocation}
              onChange={(newLoc) => {
                setDeliveryLocation(newLoc);
                setDeliveryAddress(newLoc.address);
                if (newLoc.city) setCity(newLoc.city);
                if (newLoc.pincode) setPincode(newLoc.pincode);
              }}
              disabled={isSubmitting}
            />
            {/* Hidden form inputs for server action */}
            <input type="hidden" name="deliveryAddress" value={deliveryAddress} />
            <input type="hidden" name="city" value={city} />
            <input type="hidden" name="pincode" value={pincode} />
            <input type="hidden" name="googleMapsUrl" value={deliveryLocation.googleMapsUrl || ""} />
            <input type="hidden" name="googlePlaceId" value={deliveryLocation.googlePlaceId || ""} />
            <input type="hidden" name="latitude" value={deliveryLocation.latitude ?? ""} />
            <input type="hidden" name="longitude" value={deliveryLocation.longitude ?? ""} />
            <input type="hidden" name="customSiteName" value={deliveryLocation.customSiteName || ""} />
            <input type="hidden" name="villageArea" value={deliveryLocation.villageArea || ""} />
            <input type="hidden" name="district" value={deliveryLocation.district || ""} />
            <input type="hidden" name="state" value={deliveryLocation.state || "Gujarat"} />
            <input type="hidden" name="nearbyLandmark" value={deliveryLocation.nearbyLandmark || ""} />
            <input type="hidden" name="locationSource" value={deliveryLocation.locationSource} />
          </div>

          {/* Additional Notes */}
          <div className="sm:col-span-2 space-y-1.5">
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
                    {formatBlockSizeName(r.product?.sizeLabel) || `Size #${idx + 1}`} AAC Block
                  </strong>
                  <span className="text-slate-500 text-[11px] block font-mono">
                    {r.product?.dimensions} • {r.cbmPerBlock.toFixed(4)} CBM/block
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-navy text-sm block">
                    {r.totalCbm.toFixed(3)} CBM
                  </span>
                  <span className="text-[11px] text-slate-500 italic block">
                    ≈ {formatNumber(r.numericQty)} Blocks
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

        {/* Step 4: PREVIEW ORDER BUTTON */}
        <button
          type="button"
          onClick={() => {
            if (totalBlocks <= 0 || !deliveryAddress.trim() || !customerName.trim() || !customerMobile.trim()) {
              alert("Please ensure AAC block quantity, customer contact, and delivery address are entered.");
              return;
            }
            setIsPreviewOpen(true);
          }}
          disabled={isSubmitting || totalBlocks <= 0 || !deliveryAddress.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0F627F] disabled:bg-slate-300 py-4 px-6 text-sm sm:text-base font-black text-white shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
        >
          <Sparkles className="h-5 w-5" />
          <span>PREVIEW ORDER BEFORE CONFIRMATION</span>
        </button>
      </div>

      {/* =========================================================================
          ORDER PREVIEW MODAL / REVIEW SCREEN (STEP 5 & 6)
      ========================================================================= */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-[#13789B] p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-teal-300 block">
                  Swarnim AAC Block Private Limited
                </span>
                <h3 className="text-lg font-black tracking-tight mt-0.5">
                  Review & Confirm Your Consignment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
              {/* AAC Block Items */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-black text-navy uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-[#13789B]" />
                    <span>Selected AAC Blocks</span>
                  </span>
                  <span className="font-bold text-slate-500">
                    {rowCalculations.length} Size{rowCalculations.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {rowCalculations.map((r, idx) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-1.5 border-b border-slate-200/60 last:border-0"
                    >
                      <div>
                        <strong className="text-navy text-sm font-black">
                          {formatBlockSizeName(r.product?.sizeLabel) || `Size #${idx + 1}`}
                        </strong>
                        <span className="text-slate-500 text-[11px] block font-mono">
                          Dimensions: {r.product?.dimensions} • {r.cbmPerBlock.toFixed(4)} CBM/block
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-[#13789B] text-sm block">
                          {r.totalCbm.toFixed(3)} CBM
                        </span>
                        <span className="text-slate-500 text-[11px] italic block">
                          ≈ {formatNumber(r.numericQty)} Blocks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-xs font-bold text-navy">
                  <span>Total AAC Block Volume:</span>
                  <span className="font-black font-mono text-base text-[#13789B]">
                    {combinedCbm.toFixed(3)} CBM (≈ {formatNumber(totalBlocks)} Blocks)
                  </span>
                </div>
              </div>

              {/* Block Jointing Morter */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 flex items-center justify-between">
                <div>
                  <strong className="text-navy text-sm font-black block">
                    Block Jointing Morter
                  </strong>
                  <span className="text-slate-500 text-[11px]">
                    Packaging: 40 KG Bag Only • High Polymer Masonry
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-navy text-base block">
                    {numAdhesiveBags} Bags
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {numAdhesiveBags > 0 ? `${numAdhesiveBags * 40} KG` : "0 Bags"}
                  </span>
                </div>
              </div>

              {/* Customer & Destination */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-black text-navy uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#13789B]" />
                    <span>Customer & Delivery Location</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPreviewOpen(false);
                      const el = document.getElementById("delivery-location-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline cursor-pointer"
                  >
                    <span>Edit Location</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer Name</span>
                    <strong className="text-navy">{customerName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Mobile</span>
                    <strong className="text-navy font-mono">{customerMobile}</strong>
                  </div>
                  {customerEmail && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Email</span>
                      <span className="text-slate-700">{customerEmail}</span>
                    </div>
                  )}

                  <div className="col-span-2 pt-2 border-t border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Location Source:</span>
                      <span className="text-[11px] font-bold text-[#13789B] bg-teal-100/70 px-2 py-0.5 rounded-md">
                        {deliveryLocation.locationSource === "GPS"
                          ? "GPS Location"
                          : deliveryLocation.locationSource === "GOOGLE_MAPS_LINK"
                          ? "Google Maps Link"
                          : "Manual Address"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Delivery Address:</span>
                      <span className="text-navy font-semibold block text-xs mt-0.5">{deliveryAddress}</span>
                    </div>

                    {deliveryLocation.nearbyLandmark && (
                      <div className="text-[11px] text-slate-600">
                        <strong>Nearby Landmark:</strong> {deliveryLocation.nearbyLandmark}
                      </div>
                    )}

                    {deliveryLocation.latitude && deliveryLocation.longitude && (
                      <div className="text-[11px] font-mono text-slate-600">
                        <strong>Coordinates:</strong> {deliveryLocation.latitude}, {deliveryLocation.longitude}
                      </div>
                    )}

                    {(deliveryLocation.googleMapsUrl || (deliveryLocation.latitude && deliveryLocation.longitude) || deliveryAddress) && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Google Maps:</span>
                        <a
                          href={
                            deliveryLocation.googleMapsUrl ||
                            (deliveryLocation.latitude && deliveryLocation.longitude
                              ? `https://www.google.com/maps?q=${deliveryLocation.latitude},${deliveryLocation.longitude}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress)}`)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline"
                        >
                          <span>View Location</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {notes && (
                    <div className="col-span-2 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Unloading Instructions</span>
                      <span className="text-slate-700 italic">{notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Free Notice */}
              <p className="text-[11px] text-slate-500 italic text-center">
                This confirmation books your physical consignment into Swarnim factory queue. Price and billing are handled separately.
              </p>
            </div>

            {/* Modal Actions: Edit Order vs Confirm & Place Order */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 py-3 px-5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Edit Order</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#13789B] hover:bg-[#0f607d] disabled:bg-slate-300 py-3.5 px-6 text-sm font-black text-white shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isEditing ? "UPDATING ORDER..." : "PLACING ORDER..."}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isEditing ? "CONFIRM & UPDATE ORDER" : "CONFIRM & PLACE ORDER"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
