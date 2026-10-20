"use client";

import { useState, useMemo } from "react";
import {
  MASTER_BLOCK_SIZES,
  computeBlockRequirement,
  computeMortarRequirement,
  type CalcMode,
} from "@/lib/aac-calculator";
import {
  Calculator,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Info,
  Check,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onAddToOrder?: (data: {
    size: string;
    quantity: number;
    totalCbm: number;
    totalSqft: number;
    mortarBags?: number;
  }) => void;
  initialSize?: string;
  className?: string;
  rates?: Record<string, number>;
}

export function AACBlockCalculator({
  onAddToOrder,
  initialSize = '6"',
  className,
  rates = {},
}: Props) {
  const [selectedSize, setSelectedSize] = useState<string>(initialSize);
  const [mode, setMode] = useState<CalcMode>("quantity");
  const [quantityInput, setQuantityInput] = useState<number>(1000);
  const [cbmInput, setCbmInput] = useState<number>(18.0);
  const [sqftInput, setSqftInput] = useState<number>(1292);
  const [wastagePercent, setWastagePercent] = useState<number>(0);
  const [includeMortar, setIncludeMortar] = useState<boolean>(true);
  const [jointThickness, setJointThickness] = useState<number>(3.0);

  const currentRate = rates[selectedSize] || 72; // default rate if not specified

  const result = useMemo(() => {
    return computeBlockRequirement({
      size: selectedSize,
      mode,
      quantity: quantityInput,
      cbm: cbmInput,
      wallAreaSqft: sqftInput,
      wastagePercent,
      ratePerBlock: currentRate,
    });
  }, [selectedSize, mode, quantityInput, cbmInput, sqftInput, wastagePercent, currentRate]);

  const mortarResult = useMemo(() => {
    return computeMortarRequirement({
      totalCbm: result.totalCbm,
      jointThicknessMm: jointThickness,
      consumptionRateKgPerCbm: 35.0,
      wastagePercent,
      bagWeightKg: 40.0,
      pricePerBag: 380,
    });
  }, [result.totalCbm, jointThickness, wastagePercent]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* =========================================================================
          MASTER TABLE VIEW (COLLAPSIBLE / RESPONSIVE)
      ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-[#111827] px-4 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#13789B] text-white">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                AAC Block Master Specification Table
              </h3>
              <p className="text-[10px] text-slate-300">
                All 9 Standard Sizes • Length 600mm × Height 200mm
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold">
            9 Verified Sizes
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-amber-300 font-black text-slate-900 border-b border-amber-400">
                <th className="py-2.5 px-3 text-center">Sr.</th>
                <th className="py-2.5 px-3">Inch</th>
                <th className="py-2.5 px-3 text-right">Length</th>
                <th className="py-2.5 px-3 text-right">Height</th>
                <th className="py-2.5 px-3 text-right">Width</th>
                <th className="py-2.5 px-3 text-right">CBM / Block</th>
                <th className="py-2.5 px-3 text-right">Blocks / CBM</th>
                <th className="py-2.5 px-3 text-right">Sq.Ft. / Block</th>
                <th className="py-2.5 px-3 text-right">Sq.Ft. / CBM</th>
                <th className="py-2.5 px-3 text-center">Select</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MASTER_BLOCK_SIZES.map((s, idx) => {
                const isSelected = selectedSize === s.size;
                return (
                  <tr
                    key={s.size}
                    onClick={() => setSelectedSize(s.size)}
                    className={cn(
                      "transition-colors cursor-pointer",
                      isSelected
                        ? "bg-teal-50/80 font-bold text-navy"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-black text-slate-900">
                      {s.size}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{s.lengthMm}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{s.heightMm}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#13789B]">
                      {s.widthMm} mm
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {s.cbmPerBlock.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {s.blocksPerCbm.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {s.sqftPerBlock.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      {s.sqftPerCbm.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                          isSelected
                            ? "bg-[#13789B] text-white font-bold"
                            : "border border-slate-300 text-transparent"
                        )}
                      >
                        ✓
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE CALCULATOR PANEL
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input Parameters Box */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#13789B]" />
              <h4 className="text-sm font-black text-navy uppercase tracking-wide">
                Calculator Inputs
              </h4>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Size: <strong className="text-[#13789B]">{selectedSize}</strong>
            </span>
          </div>

          {/* Size Quick Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              1. Choose AAC Block Thickness
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {MASTER_BLOCK_SIZES.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => setSelectedSize(s.size)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border text-xs transition-all cursor-pointer",
                    selectedSize === s.size
                      ? "border-[#13789B] bg-[#13789B] text-white font-black shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 font-bold"
                  )}
                >
                  <span>{s.size}</span>
                  <span className={cn("text-[9px] font-medium", selectedSize === s.size ? "text-teal-100" : "text-slate-400")}>
                    {s.widthMm}mm
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              2. Calculate Requirement By
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode("quantity")}
                className={cn(
                  "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center",
                  mode === "quantity"
                    ? "border-[#13789B] bg-teal-50 text-[#13789B] ring-1 ring-[#13789B]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                No. of Blocks
              </button>
              <button
                type="button"
                onClick={() => setMode("cbm")}
                className={cn(
                  "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center",
                  mode === "cbm"
                    ? "border-[#13789B] bg-teal-50 text-[#13789B] ring-1 ring-[#13789B]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                Total CBM (m³)
              </button>
              <button
                type="button"
                onClick={() => setMode("area")}
                className={cn(
                  "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center",
                  mode === "area"
                    ? "border-[#13789B] bg-teal-50 text-[#13789B] ring-1 ring-[#13789B]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                Wall Area (Sq.Ft.)
              </button>
            </div>
          </div>

          {/* Mode-specific input */}
          {mode === "quantity" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Number of Blocks:
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantityInput || ""}
                onChange={(e) => setQuantityInput(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-navy focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 outline-none"
                placeholder="e.g. 1000"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Direct quantity in units of 600 × 200 mm blocks
              </p>
            </div>
          )}

          {mode === "cbm" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Required Volume in CBM (m³):
              </label>
              <input
                type="number"
                min="0.1"
                step="0.01"
                value={cbmInput || ""}
                onChange={(e) => setCbmInput(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-navy focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 outline-none"
                placeholder="e.g. 18.00"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Blocks calculated as: <code>Math.ceil(CBM / CBM_per_block)</code>
              </p>
            </div>
          )}

          {mode === "area" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Total Wall Area (Sq.Ft.):
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={sqftInput || ""}
                onChange={(e) => setSqftInput(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-navy focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 outline-none"
                placeholder="e.g. 1292"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Each block covers ~1.29 Sq.Ft. wall face area
              </p>
            </div>
          )}

          {/* Optional Wastage */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
              <span>3. Optional Cutting / Site Wastage:</span>
              <span className="text-[#13789B] font-black">{wastagePercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              {[0, 2, 5, 7, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setWastagePercent(pct)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer",
                    wastagePercent === pct
                      ? "bg-[#13789B] border-[#13789B] text-white shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Include Mortar Checkbox */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMortar}
                onChange={(e) => setIncludeMortar(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-[#13789B] focus:ring-[#13789B]"
              />
              <div>
                <span className="text-xs font-black text-navy block">
                  Include Swarnim Block Jointing Mortar (40 Kg Bag)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Automatic consumption estimate based on {result.totalCbm} CBM masonry
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Calculation Result Summary Box */}
        <div className="lg:col-span-6 rounded-2xl border border-teal-200 bg-gradient-to-br from-white via-teal-50/20 to-white p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-teal-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h4 className="text-sm font-black text-navy uppercase tracking-wide">
                Calculation Results
              </h4>
            </div>
            <span className="rounded-full bg-[#13789B] text-white px-2.5 py-0.5 text-xs font-black">
              {result.spec.size} ({result.spec.widthMm}mm)
            </span>
          </div>

          {/* Primary Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Required Blocks
              </span>
              <p className="text-xl font-black text-navy mt-0.5">
                {result.finalBlocks.toLocaleString()}
              </p>
              {result.wastageBlocks > 0 && (
                <span className="text-[10px] text-amber-600 font-bold">
                  +{result.wastageBlocks} ({result.wastagePercent}% wastage)
                </span>
              )}
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-[#13789B] uppercase tracking-wider block">
                Total Volume (CBM)
              </span>
              <p className="text-xl font-black text-[#13789B] mt-0.5">
                {result.totalCbm.toFixed(2)} m³
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                {result.cbmPerBlock.toFixed(4)} CBM/block
              </span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Wall Face Area
              </span>
              <p className="text-xl font-black text-navy mt-0.5">
                {result.totalSqft.toLocaleString()} Sq.Ft.
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                ~1.29 Sq.Ft./block
              </span>
            </div>
          </div>

          {/* Formula Breakdown Details */}
          <div className="rounded-xl bg-slate-50 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Dimensions:</span>
              <strong className="text-navy">{result.spec.lengthMm} × {result.spec.heightMm} × {result.spec.widthMm} mm</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Blocks per CBM:</span>
              <strong className="text-navy">{result.blocksPerCbm.toFixed(2)} blocks</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Square Feet per CBM:</span>
              <strong className="text-navy">{result.spec.sqftPerCbm.toFixed(2)} Sq.Ft./m³</strong>
            </div>
            {result.ratePerBlock > 0 && (
              <>
                <div className="border-t border-slate-200 my-1 pt-1 flex justify-between text-slate-600">
                  <span>Rate per Block:</span>
                  <strong className="text-navy">₹{result.ratePerBlock.toFixed(2)} + 18% GST</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Block Total:</span>
                  <strong className="text-navy">₹{result.totalAmount.toLocaleString()}</strong>
                </div>
              </>
            )}
          </div>

          {/* Mortar Addon Preview */}
          {includeMortar && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-700" />
                  <span className="text-xs font-black text-amber-900 uppercase">
                    Swarnim Jointing Mortar (40 Kg Bag)
                  </span>
                </div>
                <span className="text-xs font-black text-amber-800">
                  {mortarResult.requiredBags} Bags
                </span>
              </div>
              <p className="text-[11px] text-amber-800/80 leading-snug">
                Estimated mortar: ~{mortarResult.requiredMortarKg} kg dry powder (~{mortarResult.consumptionRateKgPerCbm} kg/CBM at {jointThickness}mm joint)
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-xs">
                <span className="text-amber-900 font-bold">Mortar Amount (₹380/bag):</span>
                <span className="font-black text-amber-900">₹{mortarResult.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Combined Grand Total */}
          {result.ratePerBlock > 0 && (
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-teal-900 to-[#13789B] text-white rounded-xl shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">
                  Estimated Order Total (Incl. 18% GST)
                </span>
                <span className="text-lg font-black tracking-tight">
                  ₹{(result.totalAmount + (includeMortar ? mortarResult.totalAmount : 0)).toLocaleString()}
                </span>
              </div>
              <span className="text-xs text-teal-100 font-semibold text-right">
                {result.finalBlocks.toLocaleString()} Blocks
                {includeMortar && ` + ${mortarResult.requiredBags} Bags`}
              </span>
            </div>
          )}

          {/* Add to Order Button */}
          {onAddToOrder && (
            <button
              type="button"
              onClick={() =>
                onAddToOrder({
                  size: selectedSize,
                  quantity: result.finalBlocks,
                  totalCbm: result.totalCbm,
                  totalSqft: result.totalSqft,
                  mortarBags: includeMortar ? mortarResult.requiredBags : 0,
                })
              }
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#13789B] hover:bg-[#0F627F] text-white font-bold py-3 px-4 text-xs shadow-md transition-all cursor-pointer"
            >
              <span>Add to Order ({result.finalBlocks.toLocaleString()} Blocks • {result.totalCbm} CBM)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
