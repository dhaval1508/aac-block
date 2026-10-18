"use client";

import { useMemo, useState } from "react";
import { createProductAction, updateProductAction } from "@/lib/actions/products";

type Product = {
  id?: string;
  sizeLabel?: string;
  lengthMm?: number;
  heightMm?: number;
  widthMm?: number;
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

  const [sizeLabel, setSizeLabel] = useState(product?.sizeLabel ?? "");
  const [lengthMm, setLengthMm] = useState(product?.lengthMm ?? 600);
  const [heightMm, setHeightMm] = useState(product?.heightMm ?? 200);
  const [widthMm, setWidthMm] = useState(product?.widthMm ?? 100);
  const [price, setPrice] = useState(Number(product?.price ?? 0));
  const [gstRate, setGstRate] = useState(Number(product?.gstRate ?? 18));
  const [active, setActive] = useState(product?.active ?? true);

  const { cbm, bpc } = useMemo(() => {
    const vol = (lengthMm * heightMm * widthMm) / 1000000000;
    const blocks = vol > 0 ? 1 / vol : 0;
    return {
      cbm: vol.toFixed(4),
      bpc: blocks.toFixed(2),
    };
  }, [lengthMm, heightMm, widthMm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white p-4 sm:p-6 shadow-2xl my-auto max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <h2 className="text-base sm:text-lg font-bold text-navy truncate">
            {isEdit ? "Edit AAC Block Size" : "Add New AAC Block Size"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <form action={isEdit ? updateProductAction : createProductAction} className="mt-4 space-y-4">
          {isEdit ? <input type="hidden" name="id" value={product?.id} /> : null}

          <div>
            <label className="label">Size Label *</label>
            <input
              name="sizeLabel"
              required
              value={sizeLabel}
              onChange={(e) => setSizeLabel(e.target.value)}
              placeholder="e.g. 4 Inch, 6 Inch, 8 Inch, 9 Inch"
              className="field"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Length (mm) *</label>
              <input
                name="lengthMm"
                type="number"
                required
                value={lengthMm}
                onChange={(e) => setLengthMm(Number(e.target.value))}
                className="field"
              />
            </div>
            <div>
              <label className="label">Height (mm) *</label>
              <input
                name="heightMm"
                type="number"
                required
                value={heightMm}
                onChange={(e) => setHeightMm(Number(e.target.value))}
                className="field"
              />
            </div>
            <div>
              <label className="label">Width (mm) *</label>
              <input
                name="widthMm"
                type="number"
                required
                value={widthMm}
                onChange={(e) => setWidthMm(Number(e.target.value))}
                className="field"
              />
            </div>
          </div>

          {/* Live Dimension & CBM Preview Card */}
          <div className="rounded-2xl bg-navy-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Live Volume & Specification Preview
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-white p-2">
                <span className="text-slate-400">Dimensions</span>
                <p className="mt-0.5 font-bold text-navy">
                  {lengthMm} × {heightMm} × {widthMm} mm
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <span className="text-slate-400">CBM / Block</span>
                <p className="mt-0.5 font-bold text-navy">{cbm} m³</p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <span className="text-slate-400">Blocks / CBM</span>
                <p className="mt-0.5 font-bold text-navy">{bpc}</p>
              </div>
            </div>
          </div>

          <input type="hidden" name="price" value={price || 50} />
          <input type="hidden" name="gstRate" value={gstRate || 18} />

          {isAdmin ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-navy"
              />
              <label htmlFor="active" className="text-sm font-medium text-slate-700">
                Active for Customer Catalog & Ordering
              </label>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Notice:</strong> As Stock & Order Manager, you can edit physical dimensions.
              Catalog activation is managed by the Super Admin.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEdit ? "Update Block Size" : "Save Block Size"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
