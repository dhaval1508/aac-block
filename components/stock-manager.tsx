"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Clock,
  ShieldCheck,
  Package,
  Download,
  Eye,
  X,
  ExternalLink,
} from "lucide-react";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { addStockAction } from "@/lib/actions/stock";
import { DateRangeFilter } from "@/components/date-range-filter";

type ProductWithStock = {
  id: string;
  name: string;
  sizeLabel: string;
  dimensions: string;
  cbmPerBlock: number | { toString(): string };
  currentStock: number;
};

type Movement = {
  id: string;
  type: "IN" | "OUT";
  quantityDelta: number;
  referenceNo: string | null;
  note: string | null;
  createdAt: Date | string;
  product: {
    sizeLabel: string;
  };
  order: {
    id: string;
    orderNo: string;
  } | null;
  createdBy: {
    name: string;
  } | null;
};

export function StockManager({
  products,
  movements,
  role,
  error,
  periodLabel = "This Month",
}: {
  products: ProductWithStock[];
  movements: Movement[];
  role: "ADMIN" | "STOCKER";
  error?: string;
  periodLabel?: string;
}) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState<number | "">("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [historySizeFilter, setHistorySizeFilter] = useState<string>("ALL");
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const totalYardStock = useMemo(
    () => products.reduce((sum, p) => sum + p.currentStock, 0),
    [products]
  );

  const lowStockCount = useMemo(
    () => products.filter((p) => p.currentStock < 500).length,
    [products]
  );

  // Inbound & Outbound calculations for current period
  const { periodIn, periodOut } = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    for (const m of movements) {
      if (m.type === "IN") inCount += m.quantityDelta;
      else outCount += Math.abs(m.quantityDelta);
    }
    return { periodIn: inCount, periodOut: outCount };
  }, [movements]);

  // Negative Stock Guard
  const exceedsStock = useMemo(() => {
    if (movementType === "OUT" && selectedProduct) {
      const entered = Number(quantity) || 0;
      return entered > selectedProduct.currentStock;
    }
    return false;
  }, [movementType, quantity, selectedProduct]);

  // Filtered Movements for Table
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (historyTypeFilter !== "ALL" && m.type !== historyTypeFilter) {
        return false;
      }
      if (historySizeFilter !== "ALL" && m.product.sizeLabel !== historySizeFilter) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchesRef = m.referenceNo?.toLowerCase().includes(q);
        const matchesNote = m.note?.toLowerCase().includes(q);
        const matchesSize = m.product.sizeLabel.toLowerCase().includes(q);
        const matchesOrder = m.order?.orderNo.toLowerCase().includes(q);
        const matchesUser = m.createdBy?.name.toLowerCase().includes(q);
        if (!matchesRef && !matchesNote && !matchesSize && !matchesOrder && !matchesUser) {
          return false;
        }
      }
      return true;
    });
  }, [movements, historyTypeFilter, historySizeFilter, historySearch]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize) || 1;
  const paginatedMovements = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMovements.slice(start, start + pageSize);
  }, [filteredMovements, page, pageSize]);

  // Distinct block sizes for filter dropdown
  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.sizeLabel));
    return Array.from(set).sort();
  }, [products]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Date & Time",
      "Block Size",
      "Movement Type",
      "Quantity Delta",
      "Reference Number",
      "Linked Order",
      "Responsible User",
      "Notes",
    ];

    const rows = filteredMovements.map((m) => [
      `"${formatDateTime(m.createdAt)}"`,
      `"${m.product.sizeLabel}"`,
      `"${m.type}"`,
      m.quantityDelta,
      `"${m.referenceNo || ""}"`,
      `"${m.order?.orderNo || ""}"`,
      `"${m.createdBy?.name || "System"}"`,
      `"${(m.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `swarnim_stock_movements_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#13789B]/10 text-[#13789B]">
              <Boxes className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
              Live Factory Inventory Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Record manufacturing production intake (Stock In) and physical outflows with concurrency-safe balance assertions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <DateRangeFilter />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{decodeURIComponent(error)}</span>
        </div>
      ) : null}

      {/* =========================================================================
          TOP INVENTORY METRICS CARDS (4 KPIs)
      ========================================================================= */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-[#13789B]">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Available Stock</span>
            <Boxes className="h-4 w-4 text-[#13789B]" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-navy">{formatNumber(totalYardStock)}</p>
          <span className="text-[11px] text-slate-400">Live blocks in yard</span>
        </div>

        <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Low Stock Sizes</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-amber-600">{lowStockCount}</p>
          <span className="text-[11px] text-slate-400">Sizes &lt; 500 blocks</span>
        </div>

        <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Stock In ({periodLabel})</span>
            <ArrowDownRight className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-emerald-700">+{formatNumber(periodIn)}</p>
          <span className="text-[11px] text-slate-400">Production intake</span>
        </div>

        <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Stock Out ({periodLabel})</span>
            <ArrowUpRight className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-rose-700">-{formatNumber(periodOut)}</p>
          <span className="text-[11px] text-slate-400">Dispatches & returns</span>
        </div>
      </div>

      {/* =========================================================================
          DUAL-PANE: ENTRY FORM & LIVE SIZE-WISE INVENTORY
      ========================================================================= */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modern Stock Entry Card */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 lg:col-span-1 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-black text-navy">Record Stock Movement</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select transaction type and enter batch count.
            </p>
          </div>

          <form action={addStockAction} className="space-y-4">
            {/* Segmented Button: Stock In vs Stock Out */}
            <div>
              <label className="label">Movement Type *</label>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setMovementType("IN")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                    movementType === "IN"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-navy"
                  }`}
                >
                  <ArrowDownRight className="h-4 w-4" />
                  <span>STOCK IN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType("OUT")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                    movementType === "OUT"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-navy"
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  <span>STOCK OUT</span>
                </button>
              </div>
              <input type="hidden" name="type" value={movementType} />
            </div>

            {/* Block Size Selection */}
            <div>
              <label className="label">AAC Block Size *</label>
              <select
                name="productId"
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="field text-xs font-semibold"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sizeLabel} ({p.dimensions}) · Available: {formatNumber(p.currentStock)}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Available Quantity Banner */}
            {selectedProduct && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs flex items-center justify-between">
                <span className="text-slate-500 font-medium">Available in Yard:</span>
                <span className="font-black text-navy text-sm">
                  {formatNumber(selectedProduct.currentStock)} blocks
                </span>
              </div>
            )}

            {/* Quantity Input with Live Overdraw Warning */}
            <div>
              <label className="label">Quantity (Blocks) *</label>
              <input
                name="quantity"
                type="number"
                min="1"
                required
                placeholder="Number of blocks"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value === "" ? "" : Number(e.target.value))
                }
                className={`field text-base font-bold ${
                  exceedsStock ? "border-rose-500 text-rose-700 bg-rose-50" : ""
                }`}
              />
              {exceedsStock && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Quantity exceeds available stock ({selectedProduct?.currentStock} blocks)</span>
                </p>
              )}
            </div>

            {/* Reference Number */}
            <div>
              <label className="label">Challan / Batch / Ref No.</label>
              <input
                name="referenceNo"
                placeholder="e.g. PROD-BATCH-104 or RETURN-08"
                className="field text-xs font-medium"
              />
            </div>

            {/* Remarks / Shift Notes */}
            <div>
              <label className="label">Remarks / Shift Notes</label>
              <textarea
                name="note"
                rows={2}
                placeholder="Optional supplier notes, autoclave batch, or damage reason"
                className="field text-xs font-medium"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={exceedsStock || quantity === "" || Number(quantity) <= 0}
              className={`w-full py-3 rounded-2xl font-bold text-xs text-white shadow-xs transition-all cursor-pointer ${
                movementType === "IN"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              } ${
                exceedsStock || quantity === "" || Number(quantity) <= 0
                  ? "opacity-50 cursor-not-allowed"
                  : "active:scale-[0.99]"
              }`}
            >
              {movementType === "IN" ? "✓ Confirm Stock Intake" : "✓ Confirm Stock Outflow"}
            </button>
          </form>
        </div>

        {/* Live Size-Wise Inventory Grid */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 lg:col-span-2 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-navy flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#13789B]" />
                Live Yard Inventory by Size
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Physical stack levels in yard</p>
            </div>
            <Link
              href={role === "ADMIN" ? "/admin/products" : "/stocker/products"}
              className="text-xs font-bold text-[#13789B] hover:underline"
            >
              Manage Dimensions →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => {
              const isLow = p.currentStock < 500;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    isLow
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-black text-navy text-sm block">{p.sizeLabel}</span>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{p.dimensions}</p>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isLow ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isLow ? "Low Stock" : "In Stock"}
                    </span>
                  </div>

                  <p className="mt-3 text-2xl font-black text-navy tracking-tight">
                    {formatNumber(p.currentStock)}
                  </p>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">
                    <span>{Number(p.cbmPerBlock).toFixed(4)} CBM/blk</span>
                    <span className="font-semibold text-slate-700">
                      {(p.currentStock * Number(p.cbmPerBlock)).toFixed(2)} m³ Total
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          STOCK MOVEMENT HISTORY TABLE & ADVANCED TOOLBAR
      ========================================================================= */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-navy flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#13789B]" />
              Stock Movement Audit History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological ledger of receipts, manual adjustments, and automated dispatch stock-outs.
            </p>
          </div>

          {/* Filter & Export Toolbar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            {/* Type Pill Toggle */}
            <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs shrink-0">
              {(["ALL", "IN", "OUT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setHistoryTypeFilter(t);
                    setPage(1);
                  }}
                  className={`flex-1 sm:flex-initial rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    historyTypeFilter === t
                      ? "bg-white text-navy shadow-xs"
                      : "text-slate-500 hover:text-navy"
                  }`}
                >
                  {t === "ALL" ? "All Types" : t === "IN" ? "Stock In" : "Stock Out"}
                </button>
              ))}
            </div>

            {/* Block Size Filter Dropdown */}
            <select
              value={historySizeFilter}
              onChange={(e) => {
                setHistorySizeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-navy outline-none cursor-pointer"
            >
              <option value="ALL">All Block Sizes</option>
              {sizeOptions.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>

            {/* Search Input & CSV Export */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search ref, order, user..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-navy placeholder:text-slate-400 focus:outline-none focus:border-[#13789B]"
                />
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-navy hover:bg-slate-100 transition-colors shadow-2xs shrink-0 cursor-pointer"
                title="Download CSV report"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View: High-contrast Card List (md:hidden) */}
        <div className="md:hidden divide-y divide-slate-100 -mx-1">
          {paginatedMovements.map((m) => (
            <div key={m.id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${
                      m.type === "IN"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {m.type === "IN" ? (
                      <>
                        <ArrowDownRight className="h-3 w-3" /> IN
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-3 w-3" /> OUT
                      </>
                    )}
                  </span>
                  <span className="font-bold text-xs text-navy">{m.product.sizeLabel}</span>
                </div>

                <span className={`font-black text-sm ${m.quantityDelta > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {m.quantityDelta > 0 ? `+${formatNumber(m.quantityDelta)}` : formatNumber(m.quantityDelta)} blocks
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{formatDateTime(m.createdAt)}</span>
                <span className="font-mono font-medium">
                  Ref:{" "}
                  {m.order ? (
                    <Link
                      href={role === "ADMIN" ? `/admin/orders/${m.order.id}` : `/stocker/orders/${m.order.id}`}
                      className="font-bold text-[#13789B] hover:underline"
                    >
                      {m.order.orderNo}
                    </Link>
                  ) : (
                    m.referenceNo || "—"
                  )}
                </span>
              </div>

              {m.note && (
                <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl italic">
                  {m.note}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                <span className="text-[10px] text-slate-400">By: {m.createdBy?.name || "System"}</span>
                <button
                  type="button"
                  onClick={() => setSelectedMovement(m)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#13789B] hover:underline py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>
          ))}

          {paginatedMovements.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching stock movement records found.
            </div>
          )}
        </div>

        {/* Desktop View: Full Data Table (hidden md:block) */}
        <div className="hidden md:block w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase tracking-wider font-bold">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Block Size</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Quantity Delta</th>
                <th className="py-3 px-3">Reference / Order</th>
                <th className="py-3 px-3">Responsible User</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMovements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                    {formatDateTime(m.createdAt)}
                  </td>
                  <td className="py-3 px-3 font-bold text-navy">
                    {m.product.sizeLabel}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${
                        m.type === "IN"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {m.type === "IN" ? (
                        <>
                          <ArrowDownRight className="h-3 w-3" /> IN
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-3 w-3" /> OUT
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-black text-sm whitespace-nowrap">
                    <span className={m.quantityDelta > 0 ? "text-emerald-700" : "text-rose-700"}>
                      {m.quantityDelta > 0
                        ? `+${formatNumber(m.quantityDelta)}`
                        : formatNumber(m.quantityDelta)}{" "}
                      blocks
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs">
                    {m.order ? (
                      <Link
                        href={role === "ADMIN" ? `/admin/orders/${m.order.id}` : `/stocker/orders/${m.order.id}`}
                        className="font-bold text-[#13789B] hover:underline"
                      >
                        {m.order.orderNo}
                      </Link>
                    ) : (
                      <span className="text-slate-600">
                        {m.referenceNo || "—"}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">
                    {m.createdBy?.name || "System"}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px] max-w-[200px] truncate">
                    {m.note || "—"}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedMovement(m)}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#13789B] hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Inspect movement"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {paginatedMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No matching stock movement records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filteredMovements.length)} of{" "}
              {filteredMovements.length} movements
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-xl border border-slate-200 px-3 py-1 font-bold text-navy disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="font-bold text-navy px-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-xl border border-slate-200 px-3 py-1 font-bold text-navy disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Movement Detail Inspection Modal */}
      {selectedMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Inventory Movement Ledger
                </span>
                <h3 className="text-base font-black text-navy mt-0.5">
                  {selectedMovement.product.sizeLabel} ({selectedMovement.type})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovement(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-navy transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Movement Type:</span>
                  <span className={`font-black ${selectedMovement.type === "IN" ? "text-emerald-700" : "text-rose-700"}`}>
                    {selectedMovement.type === "IN" ? "INBOUND (Intake)" : "OUTBOUND (Dispatch / Return)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity Delta:</span>
                  <span className="font-black text-navy text-sm">
                    {selectedMovement.quantityDelta > 0 ? `+${formatNumber(selectedMovement.quantityDelta)}` : formatNumber(selectedMovement.quantityDelta)} blocks
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-medium text-slate-700">{formatDateTime(selectedMovement.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsible User:</span>
                  <span className="font-bold text-navy">{selectedMovement.createdBy?.name || "System"}</span>
                </div>
                {selectedMovement.referenceNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference No:</span>
                    <span className="font-mono font-bold text-navy">{selectedMovement.referenceNo}</span>
                  </div>
                )}
                {selectedMovement.order && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Linked Order:</span>
                    <Link
                      href={role === "ADMIN" ? `/admin/orders/${selectedMovement.order.id}` : `/stocker/orders/${selectedMovement.order.id}`}
                      className="font-mono font-bold text-[#13789B] hover:underline flex items-center gap-1"
                    >
                      {selectedMovement.order.orderNo}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-navy block mb-1">Remarks / Note:</span>
                <p className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-slate-700">
                  {selectedMovement.note || "No notes entered for this transaction."}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMovement(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
