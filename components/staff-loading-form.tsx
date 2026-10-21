"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Play, AlertTriangle, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { startLoadingAction, completeLoadingAction } from "@/lib/actions/orders";

export function StaffLoadingForm({
  orderId,
  orderedQuantity,
  orderedCbm,
  cbmPerBlock = 0.018,
  status,
}: {
  orderId: string;
  orderedQuantity: number;
  orderedCbm?: number;
  cbmPerBlock?: number;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const initialCbm = orderedCbm || Number((orderedQuantity * cbmPerBlock).toFixed(3));
  const [loadedCbm, setLoadedCbm] = useState<number | "">(initialCbm);
  const [loadedQty, setLoadedQty] = useState<number>(orderedQuantity);
  const [shortageReason, setShortageReason] = useState<string>("");

  const numCbm = typeof loadedCbm === "number" ? loadedCbm : 0;
  const isShortage = numCbm < initialCbm - 0.0001;
  const shortageCbm = Math.max(0, Number((initialCbm - numCbm).toFixed(3)));
  const shortageCount = Math.max(0, orderedQuantity - loadedQty);

  const handleStartLoading = (formData: FormData) => {
    startTransition(async () => {
      await startLoadingAction(formData);
    });
  };

  const handleCompleteLoading = (formData: FormData) => {
    startTransition(async () => {
      await completeLoadingAction(formData);
    });
  };

  if (status === "ASSIGNED") {
    return (
      <form action={handleStartLoading} className="space-y-4">
        <input type="hidden" name="orderId" value={orderId} />
        <div>
          <h3 className="text-base font-bold text-navy">Ready to Load Truck</h3>
          <p className="mt-1 text-xs text-slate-500">
            Verify the vehicle registration at the gate, then tap below to log loading commencement in the yard.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          style={{ backgroundColor: "#1E72A8", color: "#ffffff" }}
          className="w-full min-h-[52px] rounded-2xl py-3.5 px-6 font-bold text-base shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Starting Loading...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 fill-current" /> Start Loading Material
            </>
          )}
        </button>
      </form>
    );
  }

  if (status === "LOADING") {
    return (
      <form action={handleCompleteLoading} className="space-y-4">
        <input type="hidden" name="orderId" value={orderId} />
        <div>
          <h3 className="text-base font-bold text-navy">Physical Volume Verification</h3>
          <p className="mt-1 text-xs text-slate-500">
            Verify the actual material volume physically loaded onto the truck. Enter the verified CBM volume.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
              Verified Loaded Volume (CBM) *
            </label>
            <span className="text-xs text-slate-400">
              Ordered: <strong className="text-navy">{initialCbm.toFixed(3)} CBM</strong> (≈ {formatNumber(orderedQuantity)} blk)
            </span>
          </div>
          <input
            name="loadedCbm"
            type="number"
            step="0.001"
            min="0.001"
            max={initialCbm}
            required
            value={loadedCbm}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              setLoadedCbm(val);
              if (val !== "" && cbmPerBlock > 0) {
                setLoadedQty(Math.round(Number(val) / cbmPerBlock));
              }
            }}
            className="w-full min-h-[52px] rounded-2xl border-2 border-slate-300 bg-white px-4 text-xl font-black text-navy focus:border-[#1E72A8] focus:outline-none transition-colors font-mono"
          />
          <input type="hidden" name="loadedQuantity" value={loadedQty} />
          <p className="mt-1 text-xs text-slate-500 italic">
            ≈ {formatNumber(loadedQty)} Blocks physically verified
          </p>
        </div>

        {/* Shortage indicator & explanation input */}
        {isShortage && numCbm > 0 ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">
                  Material Shortage Detected: {shortageCbm.toFixed(3)} CBM (≈ {formatNumber(shortageCount)} Blocks Short)
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  The truck is carrying less volume than ordered. Please specify the yard reason below.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-amber-900 block mb-1">
                Shortage Reason / Yard Note *
              </label>
              <select
                name="shortageReason"
                value={shortageReason}
                onChange={(e) => setShortageReason(e.target.value)}
                required={isShortage}
                className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="">Select reason for shortage...</option>
                <option value="Truck payload capacity reached">Truck payload capacity reached</option>
                <option value="Customer site requested partial delivery">Customer site requested partial delivery</option>
                <option value="Yard stack count variation">Yard stack count variation</option>
                <option value="Damaged blocks culled during loading">Damaged blocks culled during loading</option>
                <option value="Other / Super Admin notified">Other / Super Admin notified</option>
              </select>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || numCbm <= 0 || numCbm > initialCbm + 0.0001}
          style={{ backgroundColor: isShortage ? "#d97706" : "#059669", color: "#ffffff" }}
          className="w-full min-h-[52px] rounded-2xl py-3.5 px-6 font-bold text-base shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Verifying & Saving...
            </>
          ) : isShortage ? (
            <>
              <CheckCircle2 className="h-5 w-5" /> Confirm Partial Loading ({numCbm.toFixed(3)} CBM / ≈ {formatNumber(loadedQty)} Blocks)
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" /> Confirm & Complete Loading ({numCbm.toFixed(3)} CBM / ≈ {formatNumber(loadedQty)} Blocks)
            </>
          )}
        </button>
      </form>
    );
  }

  return null;
}
