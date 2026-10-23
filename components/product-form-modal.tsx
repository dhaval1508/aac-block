"use client";

import { useMemo, useState } from "react";
import { createProductAction, updateProductAction } from "@/lib/actions/products";
import { Layers, AlertTriangle, CheckCircle2, Calculator, Info } from "lucide-react";

type Product = {
  id?: string;
  name?: string;
  sizeLabel?: string;
  lengthMm?: number;
  heightMm?: number;
  widthMm?: number;
  cbmPerBlock?: number | { toString(): string };
  price?: number | { toString(): string };
  gstRate?: number | { toString(): string };
  active?: boolean;
};

export function ProductFormModal({
  product,
  role,
  onClose,
}: {
  product?: Product | null;
  role: "ADMIN" | "STOCKER";
  onClose: () => void;
}) {
  const isEdit = Boolean(product?.id);
  const isAdmin = role === "ADMIN";

  const [name, setName] = useState(product?.name ?? "FLYASH BLOCK");
  const [sizeLabel, setSizeLabel] = useState(product?.sizeLabel ?? "6 Inch");
  const [lengthMm, setLengthMm] = useState(product?.lengthMm ?? 600);
  const [heightMm, setHeightMm] = useState(product?.heightMm ?? 200);
  const [widthMm, setWidthMm] = useState(product?.widthMm ?? 150);

  // Initial CBM from product or dimensions
  const initialCbm = product?.cbmPerBlock
    ? Number(product.cbmPerBlock)
    : Number(((product?.lengthMm ?? 600) * (product?.heightMm ?? 200) * (product?.widthMm ?? 150) / 1000000000).toFixed(4));

  const [cbmInput, setCbmInput] = useState<string>(
    initialCbm > 0 ? initialCbm.toFixed(4) : "0.0180"
  );
  const [price, setPrice] = useState(Number(product?.price ?? 0));
  const [gstRate, setGstRate] = useState(Number(product?.gstRate ?? 18));
  const [active, setActive] = useState(product?.active ?? true);
  const [confirmMismatch, setConfirmMismatch] = useState(false);

  // Suggested dimension-based CBM
  const suggestedDimensionCbm = useMemo(() => {
    const l = Math.max(0, lengthMm);
    const h = Math.max(0, heightMm);
    const w = Math.max(0, widthMm);
    const vol = (l * h * w) / 1000000000;
    return Number(vol.toFixed(4));
  }, [lengthMm, heightMm, widthMm]);

  // Parsed entered CBM
  const parsedCbm = Number(cbmInput);
  const isValidCbm = !isNaN(parsedCbm) && parsedCbm > 0;

  // Check if manually entered CBM differs from dimension calculation
  const hasMismatch = useMemo(() => {
    if (!isValidCbm || suggestedDimensionCbm <= 0) return false;
    return Math.abs(parsedCbm - suggestedDimensionCbm) >= 0.0001;
  }, [isValidCbm, parsedCbm, suggestedDimensionCbm]);

  // Live Approximate Blocks Preview
  const previewMultipliers = useMemo(() => {
    if (!isValidCbm || parsedCbm <= 0) {
      return { blocksPer1Cbm: 0, blocksPer10Cbm: 0, blocksPer20Cbm: 0, bpcExact: "0.00" };
    }
    const exactPerCbm = 1 / parsedCbm;
    return {
      blocksPer1Cbm: (1 / parsedCbm).toFixed(2),
      blocksPer10Cbm: Math.round(10 / parsedCbm).toLocaleString(),
      blocksPer20Cbm: Math.round(20 / parsedCbm).toLocaleString(),
      bpcExact: exactPerCbm.toFixed(2),
    };
  }, [isValidCbm, parsedCbm]);

  const handleApplySuggested = () => {
    if (suggestedDimensionCbm > 0) {
      setCbmInput(suggestedDimensionCbm.toFixed(4));
      setConfirmMismatch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-white p-4 sm:p-6 shadow-2xl my-auto max-h-[95vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#13789B]/10 text-[#13789B]">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-navy truncate">
                {isEdit ? "Edit AAC Block Size & CBM" : "Add New Block Size & CBM"}
              </h2>
              <p className="text-[11px] text-slate-500">
                Configure physical dimensions and specify exact CBM per block.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form action={isEdit ? updateProductAction : createProductAction} className="mt-4 space-y-4">
          {isEdit ? <input type="hidden" name="id" value={product?.id} /> : null}

          {/* Product / Block Name */}
          <div>
            <label className="label">Product / Block Name *</label>
            <input
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FLYASH BLOCK 6 Inch or SAND BLOCK 6 Inch"
              className="field font-bold text-navy"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Specify full variant identity (e.g. FLYASH BLOCK or SAND BLOCK) to prevent variant confusion.
            </p>
          </div>

          {/* Block Size Name */}
          <div>
            <label className="label">Block Size Name *</label>
            <input
              name="sizeLabel"
              required
              value={sizeLabel}
              onChange={(e) => setSizeLabel(e.target.value)}
              placeholder="e.g. 4 Inch, 5 Inch, 6 Inch, 8 Inch, 9+ Inch"
              className="field font-bold"
            />
          </div>

          {/* Physical Dimensions (mm) */}
          <div>
            <label className="label">Dimensions (mm) *</label>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Length</span>
                <input
                  name="lengthMm"
                  type="number"
                  required
                  min="50"
                  value={lengthMm}
                  onChange={(e) => setLengthMm(Number(e.target.value))}
                  className="field font-mono"
                  placeholder="600"
                />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Height</span>
                <input
                  name="heightMm"
                  type="number"
                  required
                  min="50"
                  value={heightMm}
                  onChange={(e) => setHeightMm(Number(e.target.value))}
                  className="field font-mono"
                  placeholder="200"
                />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Width</span>
                <input
                  name="widthMm"
                  type="number"
                  required
                  min="25"
                  value={widthMm}
                  onChange={(e) => setWidthMm(Number(e.target.value))}
                  className="field font-mono"
                  placeholder="150"
                />
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>Dimensions: <strong>{lengthMm} × {heightMm} × {widthMm} mm</strong></span>
              <span className="font-mono text-[#13789B]">
                Formula CBM: {suggestedDimensionCbm.toFixed(4)} CBM
              </span>
            </div>
          </div>

          {/* REQUIRED FIELD: 1 Block = How Many CBM? */}
          <div className="rounded-2xl border-2 border-[#13789B]/30 bg-sky-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="label text-[#13789B] font-black text-xs sm:text-sm">
                1 Block = How Many CBM? *
              </label>
              {suggestedDimensionCbm > 0 && (
                <button
                  type="button"
                  onClick={handleApplySuggested}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline cursor-pointer"
                >
                  <Calculator className="h-3 w-3" />
                  Use Formula ({suggestedDimensionCbm.toFixed(4)})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-navy whitespace-nowrap">1 Block =</span>
              <div className="relative flex-1">
                <input
                  name="cbmPerBlock"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  value={cbmInput}
                  onChange={(e) => {
                    setCbmInput(e.target.value);
                    setConfirmMismatch(false);
                  }}
                  placeholder="e.g. 0.0180"
                  className="w-full rounded-xl border border-sky-300 bg-white px-3.5 py-2.5 font-mono text-base font-black text-navy focus:border-[#13789B] focus:outline-none focus:ring-2 focus:ring-[#13789B]/20"
                />
              </div>
              <span className="text-sm font-black text-[#13789B] whitespace-nowrap">CBM</span>
            </div>

            <p className="text-[11px] text-slate-500">
              Must be a positive decimal supporting precision up to 4 decimal places (e.g. 0.0090, 0.0120, 0.0138, 0.0150, 0.0180, 0.0240, 0.0270, 0.0276, 0.0360).
            </p>

            {/* Live Dimension Mismatch Warning Banner */}
            {hasMismatch && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5 mt-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Custom CBM Differs from Dimension Formula</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Calculated from dimensions ({lengthMm} × {heightMm} × {widthMm} mm ÷ 1,000,000,000) is <strong>{suggestedDimensionCbm.toFixed(4)} CBM</strong>, but you specified <strong>{parsedCbm.toFixed(4)} CBM</strong>.
                </p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmMismatch}
                    onChange={(e) => setConfirmMismatch(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-[#13789B]"
                  />
                  <span className="font-bold text-[11px] text-amber-950">
                    I confirm this custom CBM value is intentionally specified.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Helpful Live Calculation Preview Box */}
          {isValidCbm && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-navy">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-[#13789B]" />
                  Live Approximate Blocks Preview
                </span>
                <span className="font-mono text-[#13789B]">1 Block = {parsedCbm.toFixed(4)} CBM</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">1 CBM Volume</span>
                  <p className="mt-1 font-black text-navy text-sm font-mono">≈ {previewMultipliers.blocksPer1Cbm}</p>
                  <span className="text-[10px] text-slate-400">Blocks</span>
                </div>
                <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">10 CBM Volume</span>
                  <p className="mt-1 font-black text-navy text-sm font-mono">≈ {previewMultipliers.blocksPer10Cbm}</p>
                  <span className="text-[10px] text-slate-400">Blocks</span>
                </div>
                <div className="rounded-xl bg-white p-2.5 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">20 CBM Volume</span>
                  <p className="mt-1 font-black text-navy text-sm font-mono">≈ {previewMultipliers.blocksPer20Cbm}</p>
                  <span className="text-[10px] text-slate-400">Blocks</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic text-center">
                Approximate Blocks = Math.round(Entered CBM / Saved CBM Per Block). Exact CBM remains primary.
              </p>
            </div>
          )}

          <input type="hidden" name="price" value={price || 50} />
          <input type="hidden" name="gstRate" value={gstRate || 18} />

          {/* Active / Inactive Status */}
          {isAdmin ? (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 bg-slate-50/50">
              <div>
                <span className="font-bold text-xs text-navy block">Status: {active ? "Active" : "Inactive"}</span>
                <span className="text-[11px] text-slate-500">
                  {active
                    ? "Available in Customer & Salesman order creation catalogs."
                    : "Hidden from new order selectors. Existing historical orders preserved."}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Notice:</strong> Catalog status is managed by the Super Admin.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidCbm || (hasMismatch && !confirmMismatch)}
              className="flex items-center gap-1.5 rounded-2xl bg-[#13789B] hover:bg-[#0f627f] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isEdit ? "Update Block Size" : "Save Block Size"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
