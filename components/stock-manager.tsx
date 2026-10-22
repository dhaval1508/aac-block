"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  AlertTriangle,
  Search,
  Layers,
  Clock,
  Package,
  Download,
  Eye,
  X,
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { formatDateTime, formatNumber } from "@/lib/utils";
import {
  addStockAction,
  updateStockAction,
  deleteStockAction,
} from "@/lib/actions/stock";
import { DateRangeFilter } from "@/components/date-range-filter";

export type ProductWithStock = {
  id: string;
  name: string;
  sizeLabel: string;
  dimensions: string;
  cbmPerBlock: number | { toString(): string };
  blocksPerCbm?: number;
  currentStock: number;
  currentCbm?: number;
  category?: string;
  active?: boolean;
};

export type MortarStockInfo = {
  id: string;
  name: string;
  category: string;
  brand: string;
  sizeLabel: string;
  dimensions: string;
  productType: string;
  description: string;
  bagWeightKg: number;
  stock: number;
  totalIn: number;
  totalOut: number;
  latestPurchasePrice: number;
  latestSellingPrice: number;
  latestSupplier: string;
  totalPurchaseValue: number;
};

export type Movement = {
  id: string;
  type: "IN" | "OUT";
  quantityDelta: number;
  cbmDelta?: number | null;
  referenceNo: string | null;
  note: string | null;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  supplier?: string | null;
  entryDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  product: {
    id?: string;
    name?: string;
    category?: string;
    sizeLabel: string;
    dimensions?: string;
    bagWeightKg?: number | null;
    cbmPerBlock?: number;
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
  mortarStock,
  movements,
  role,
  error,
  periodLabel = "This Month",
}: {
  products: ProductWithStock[];
  mortarStock?: MortarStockInfo;
  movements: Movement[];
  role: "ADMIN" | "STOCKER";
  error?: string;
  periodLabel?: string;
}) {
  // Category Selection in Add Stock Form: "AAC_BLOCK" vs "MORTAR"
  const [selectedCategory, setSelectedCategory] = useState<"AAC_BLOCK" | "MORTAR">("AAC_BLOCK");

  // AAC Block Form State
  const [selectedProductId, setSelectedProductId] = useState(
    products.find((p) => p.active)?.id ?? products[0]?.id ?? ""
  );
  const [cbmInput, setCbmInput] = useState<string>("");

  // Form Common State
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState<number | "">("");
  const [referenceNo, setReferenceNo] = useState("");
  const [note, setNote] = useState("");

  // Mortar Form Specific State
  const [purchasePrice, setPurchasePrice] = useState<number | "">(
    mortarStock?.latestPurchasePrice && mortarStock.latestPurchasePrice > 0
      ? mortarStock.latestPurchasePrice
      : ""
  );
  const [sellingPrice, setSellingPrice] = useState<number | "">(
    mortarStock?.latestSellingPrice && mortarStock.latestSellingPrice > 0
      ? mortarStock.latestSellingPrice
      : ""
  );
  const [supplier, setSupplier] = useState(mortarStock?.latestSupplier || "Swarnim Plant");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));

  // History Toolbar State
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<"ALL" | "AAC_BLOCK" | "MORTAR">("ALL");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [historySizeFilter, setHistorySizeFilter] = useState<string>("ALL");
  const [historySearch, setHistorySearch] = useState("");

  // Modals State
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<Movement | null>(null);

  // Edit Modal Internal Form State
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number | "">("");
  const [editSellingPrice, setEditSellingPrice] = useState<number | "">("");
  const [editSupplier, setEditSupplier] = useState("");
  const [editEntryDate, setEditEntryDate] = useState("");
  const [editReferenceNo, setEditReferenceNo] = useState("");
  const [editNote, setEditNote] = useState("");

  // Pagination
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

  const totalYardCbm = useMemo(
    () =>
      products.reduce(
        (sum, p) =>
          sum +
          (p.currentCbm != null
            ? p.currentCbm
            : p.currentStock * Number(p.cbmPerBlock || 0.018)),
        0
      ),
    [products]
  );

  const lowStockCount = useMemo(
    () => products.filter((p) => p.currentStock < 500).length,
    [products]
  );

  // Fallback default mortar info if not provided
  const mortar = useMemo<MortarStockInfo>(() => {
    return (
      mortarStock || {
        id: "",
        name: "Block Jointing Mortar (40 KG)",
        category: "MORTAR",
        brand: "Swarnim",
        sizeLabel: "40 KG Bag",
        dimensions: "40 KG Bag Only",
        productType: "High Polymer Modified",
        description:
          "Factory-certified thin-bed jointing mortar engineered for high-strength AAC block wall masonry.",
        bagWeightKg: 40,
        stock: 0,
        totalIn: 0,
        totalOut: 0,
        latestPurchasePrice: 0,
        latestSellingPrice: 0,
        latestSupplier: "Swarnim Plant",
        totalPurchaseValue: 0,
      }
    );
  }, [mortarStock]);

  // Inbound & Outbound calculations for current period
  const { periodIn, periodOut, periodInCbm, periodOutCbm } = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    let inCbm = 0;
    let outCbm = 0;
    for (const m of movements) {
      const isMortar =
        m.product.category === "MORTAR" ||
        m.product.category === "ADHESIVE" ||
        m.product.category === "BLOCK_JOINTING_MORTAR";
      if (m.type === "IN") {
        inCount += m.quantityDelta;
        if (!isMortar) {
          inCbm += m.cbmDelta != null ? Number(m.cbmDelta) : m.quantityDelta * Number(m.product.cbmPerBlock || 0.018);
        }
      } else {
        outCount += Math.abs(m.quantityDelta);
        if (!isMortar) {
          outCbm += m.cbmDelta != null ? Math.abs(Number(m.cbmDelta)) : Math.abs(m.quantityDelta) * Number(m.product.cbmPerBlock || 0.018);
        }
      }
    }
    return {
      periodIn: inCount,
      periodOut: outCount,
      periodInCbm: Number(inCbm.toFixed(3)),
      periodOutCbm: Number(outCbm.toFixed(3)),
    };
  }, [movements]);

  // Live Automatic Calculations for Mortar Entry
  const mortarCalculations = useMemo(() => {
    const qty = typeof quantity === "number" ? Math.max(0, quantity) : 0;
    const totalWeightKg = qty * 40;
    const totalWeightMt = totalWeightKg / 1000;

    return {
      qty,
      totalWeightKg,
      totalWeightMt,
    };
  }, [quantity]);

  // Negative Stock Guard
  const exceedsStock = useMemo(() => {
    if (movementType === "OUT") {
      if (selectedCategory === "MORTAR") {
        const entered = Number(quantity) || 0;
        return entered > mortar.stock;
      }
      if (selectedCategory === "AAC_BLOCK" && selectedProduct) {
        const enteredCbm = Number(cbmInput) || 0;
        const availableCbm =
          selectedProduct.currentCbm != null
            ? selectedProduct.currentCbm
            : selectedProduct.currentStock * Number(selectedProduct.cbmPerBlock || 0.018);
        return enteredCbm > availableCbm;
      }
    }
    return false;
  }, [movementType, quantity, cbmInput, selectedCategory, selectedProduct, mortar.stock]);

  // Filtered Movements for Table
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const isMortar =
        m.product.category === "MORTAR" ||
        m.product.category === "ADHESIVE" ||
        m.product.category === "BLOCK_JOINTING_MORTAR" ||
        m.product.sizeLabel?.includes("40") ||
        m.product.name?.toLowerCase().includes("mortar") ||
        m.product.name?.toLowerCase().includes("morter");

      if (historyCategoryFilter === "AAC_BLOCK" && isMortar) return false;
      if (historyCategoryFilter === "MORTAR" && !isMortar) return false;

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
        const matchesSize = m.product.sizeLabel?.toLowerCase().includes(q);
        const matchesName = m.product.name?.toLowerCase().includes(q);
        const matchesSupplier = m.supplier?.toLowerCase().includes(q);
        const matchesOrder = m.order?.orderNo.toLowerCase().includes(q);
        const matchesUser = m.createdBy?.name.toLowerCase().includes(q);
        if (
          !matchesRef &&
          !matchesNote &&
          !matchesSize &&
          !matchesName &&
          !matchesSupplier &&
          !matchesOrder &&
          !matchesUser
        ) {
          return false;
        }
      }
      return true;
    });
  }, [movements, historyCategoryFilter, historyTypeFilter, historySizeFilter, historySearch]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize) || 1;
  const paginatedMovements = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMovements.slice(start, start + pageSize);
  }, [filteredMovements, page, pageSize]);

  // Distinct product/sizes for filter dropdown
  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.sizeLabel));
    if (mortar.sizeLabel) set.add(mortar.sizeLabel);
    return Array.from(set).sort();
  }, [products, mortar.sizeLabel]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Date & Time",
      "Category",
      "Product Name",
      "Packaging / Size",
      "Type",
      "Quantity Delta",
      "Unit",
      "Purchase Price (INR)",
      "Selling Price (INR)",
      "Supplier",
      "Total Value (INR)",
      "Reference Number",
      "Linked Order",
      "Responsible User",
      "Notes",
    ];

    const rows = filteredMovements.map((m) => {
      const isMortar =
        m.product.category === "MORTAR" ||
        m.product.category === "ADHESIVE" ||
        m.product.category === "BLOCK_JOINTING_MORTAR" ||
        m.product.sizeLabel?.includes("40");

      const categoryName = isMortar ? "Block Jointing Mortar" : "AAC Block";
      const unit = isMortar ? "40 KG Bags" : "Blocks";
      const pPrice = m.purchasePrice != null ? m.purchasePrice : "";
      const sPrice = m.sellingPrice != null ? m.sellingPrice : "";
      const totalVal =
        m.purchasePrice != null ? (Math.abs(m.quantityDelta) * m.purchasePrice).toFixed(2) : "";

      return [
        `"${formatDateTime(m.createdAt)}"`,
        `"${categoryName}"`,
        `"${m.product.name || (isMortar ? "Block Jointing Mortar (40 KG)" : "AAC Block")}"`,
        `"${m.product.sizeLabel}"`,
        `"${m.type}"`,
        m.quantityDelta,
        `"${unit}"`,
        pPrice,
        sPrice,
        `"${m.supplier || ""}"`,
        totalVal,
        `"${m.referenceNo || ""}"`,
        `"${m.order?.orderNo || ""}"`,
        `"${m.createdBy?.name || "System"}"`,
        `"${(m.note || "").replace(/"/g, '""')}"`,
      ];
    });

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

  // Open Edit Modal
  const handleOpenEdit = (m: Movement) => {
    setEditingMovement(m);
    setEditQuantity(Math.abs(m.quantityDelta));
    setEditPurchasePrice(m.purchasePrice != null ? m.purchasePrice : "");
    setEditSellingPrice(m.sellingPrice != null ? m.sellingPrice : "");
    setEditSupplier(m.supplier || "");
    setEditReferenceNo(m.referenceNo || "");
    setEditNote(m.note || "");
    setEditEntryDate(
      m.entryDate
        ? new Date(m.entryDate).toISOString().slice(0, 10)
        : new Date(m.createdAt).toISOString().slice(0, 10)
    );
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
            Manage AAC Blocks and Block Jointing Mortar (40 KG Bags) with concurrency-safe balances, purchase pricing, and complete audit tracking.
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
          TOP INVENTORY METRICS CARDS (5 KPIs including Mortar)
      ========================================================================= */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {/* Total AAC Blocks in CBM */}
        <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-[#13789B]">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Available Yard Stock</span>
            <Boxes className="h-4 w-4 text-[#13789B]" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-navy">{totalYardCbm.toFixed(3)} <span className="text-xs font-semibold text-slate-400">CBM</span></p>
          <span className="text-[11px] text-slate-500 italic block mt-0.5">≈ {formatNumber(totalYardStock)} Blocks</span>
        </div>

        {/* Dedicated Mortar Stock KPI */}
        <div className="card p-4 rounded-2xl bg-sky-50/70 border border-sky-200 shadow-xs border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-[11px] font-bold uppercase text-sky-800">Mortar Stock</span>
            <Package className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-sky-950">
            {formatNumber(mortar.stock)}{" "}
            <span className="text-xs font-semibold text-sky-700">Bags</span>
          </p>
          <span className="text-[11px] font-medium text-sky-700">
            {((mortar.stock * 40) / 1000).toFixed(2)} MT · 40 KG Bags
          </span>
        </div>

        {/* Low Stock Alert */}
        <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Low Stock Sizes</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-amber-600">{lowStockCount}</p>
          <span className="text-[11px] text-slate-400">Sizes &lt; 500 blocks</span>
        </div>

        {/* Inbound Intake */}
        <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Stock In ({periodLabel})</span>
            <ArrowDownRight className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-emerald-700">+{periodInCbm.toFixed(3)} <span className="text-xs font-semibold text-emerald-600">CBM</span></p>
          <span className="text-[11px] text-slate-500 italic block mt-0.5">≈ +{formatNumber(periodIn)} Blocks</span>
        </div>

        {/* Outbound Dispatches */}
        <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Stock Out ({periodLabel})</span>
            <ArrowUpRight className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-rose-700">-{periodOutCbm.toFixed(3)} <span className="text-xs font-semibold text-rose-600">CBM</span></p>
          <span className="text-[11px] text-slate-500 italic block mt-0.5">≈ -{formatNumber(periodOut)} Blocks</span>
        </div>
      </div>

      {/* =========================================================================
          DUAL-PANE: ENTRY FORM & LIVE SIZE-WISE + MORTAR INVENTORY
      ========================================================================= */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modern Stock Entry Card */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 lg:col-span-1 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-black text-navy flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#13789B]" />
              Record Stock Movement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select product category, movement type, and quantity.
            </p>
          </div>

          {/* Category Toggle: AAC Blocks vs Block Jointing Mortar */}
          <div>
            <label className="label">Product Category *</label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("AAC_BLOCK");
                  setQuantity("");
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === "AAC_BLOCK"
                    ? "bg-[#13789B] text-white shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                <Boxes className="h-3.5 w-3.5" />
                <span>AAC Blocks</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("MORTAR");
                  setQuantity("");
                  if (mortar.latestPurchasePrice && mortar.latestPurchasePrice > 0) {
                    setPurchasePrice(mortar.latestPurchasePrice);
                  }
                  if (mortar.latestSellingPrice && mortar.latestSellingPrice > 0) {
                    setSellingPrice(mortar.latestSellingPrice);
                  }
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === "MORTAR"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Block Jointing Mortar</span>
              </button>
            </div>
          </div>

          <form action={addStockAction} className="space-y-4">
            {/* Movement Type: Stock In vs Stock Out */}
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

            {/* If MORTAR is selected */}
            {selectedCategory === "MORTAR" ? (
              <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-3.5 sm:p-4">
                <input type="hidden" name="productId" value={mortar.id} />

                {/* Product Info Banner */}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-2xs">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-black text-navy text-xs sm:text-sm">
                        {mortar.name}
                      </span>
                      <span className="rounded-md bg-sky-200 border border-sky-300 text-sky-900 px-1.5 py-0.5 text-[10px] font-bold">
                        40 KG Bag Only
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      High Polymer Modified thin-bed mortar engineered for AAC block masonry.
                    </p>
                  </div>
                </div>

                {/* Available Mortar Stock Banner */}
                <div className="rounded-xl border border-sky-200 bg-white p-2.5 text-xs flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Available in Yard:</span>
                  <div className="text-right">
                    <span className="font-black text-sky-950 text-sm">
                      {formatNumber(mortar.stock)} Bags
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      ({((mortar.stock * 40) / 1000).toFixed(2)} MT Total)
                    </span>
                  </div>
                </div>

                {/* Quantity in 40 KG Bags */}
                <div>
                  <label className="label flex items-center justify-between">
                    <span>Quantity (40 KG Bags) *</span>
                    <span className="text-[10px] font-bold text-sky-700 uppercase">
                      Bag Weight: 40 KG
                    </span>
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="Number of 40 KG bags"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className={`field text-base font-bold font-mono ${
                      exceedsStock ? "border-rose-500 text-rose-700 bg-rose-50" : ""
                    }`}
                  />
                  {exceedsStock && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Quantity exceeds available stock ({mortar.stock} bags)</span>
                    </p>
                  )}
                </div>

                {/* Stock Entry Date */}
                <div>
                  <label className="label">Stock Entry Date</label>
                  <input
                    name="entryDate"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="field text-xs font-medium"
                  />
                </div>

                {/* Live Automatic Calculations Box */}
                {mortarCalculations.qty > 0 && (
                  <div className="rounded-xl border border-sky-300 bg-sky-100/60 p-3 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-600 font-semibold">
                      <span>Total Stock Weight:</span>
                      <span className="font-mono font-black text-navy text-sm">
                        {formatNumber(mortarCalculations.totalWeightKg)} KG ({mortarCalculations.totalWeightMt.toFixed(2)} MT)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* If AAC_BLOCK is selected */
              <>
                <div>
                  <label className="label">AAC Block Size *</label>
                  <select
                    name="productId"
                    required
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setCbmInput("");
                      setQuantity("");
                    }}
                    className="field text-xs font-semibold"
                  >
                    {products
                      .filter((p) => p.active)
                      .map((p) => {
                      const cbm = p.currentCbm != null ? p.currentCbm : p.currentStock * Number(p.cbmPerBlock || 0.018);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.sizeLabel} ({p.dimensions}) · Available: {cbm.toFixed(3)} CBM (≈ {formatNumber(p.currentStock)} blk)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Live Available Quantity Banner */}
                {selectedProduct && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Available in Yard:</span>
                    <div className="text-right">
                      <span className="font-black text-navy text-sm block">
                        {(selectedProduct.currentCbm != null ? selectedProduct.currentCbm : selectedProduct.currentStock * Number(selectedProduct.cbmPerBlock || 0.018)).toFixed(3)} CBM
                      </span>
                      <span className="text-[11px] text-slate-500 italic block">
                        ≈ {formatNumber(selectedProduct.currentStock)} Blocks
                      </span>
                    </div>
                  </div>
                )}

                {/* Quantity Input with Live Overdraw Warning */}
                <div>
                  <label className="label flex items-center justify-between">
                    <span>Quantity (CBM) *</span>
                    {selectedProduct && (
                      <span className="text-[10px] font-bold text-[#13789B]">
                        1 Block = {Number(selectedProduct.cbmPerBlock).toFixed(4)} CBM
                      </span>
                    )}
                  </label>
                  <input
                    name="cbm"
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    placeholder="Enter CBM quantity"
                    value={cbmInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCbmInput(val);
                      const num = Number(val) || 0;
                      const rate = Number(selectedProduct?.cbmPerBlock) || 0.018;
                      const calculatedQty = num > 0 ? Math.round(num / rate) : 0;
                      setQuantity(calculatedQty > 0 ? calculatedQty : "");
                    }}
                    className={`field text-base font-bold font-mono ${
                      exceedsStock ? "border-rose-500 text-rose-700 bg-rose-50" : ""
                    }`}
                  />
                  <input type="hidden" name="quantity" value={quantity || ""} />

                  {/* Calculated Blocks Count Underneath */}
                  <p className="mt-1 text-xs text-slate-500 italic">
                    {Number(cbmInput) > 0 && selectedProduct
                      ? `≈ ${formatNumber(Math.round(Number(cbmInput) / (Number(selectedProduct.cbmPerBlock) || 0.018)))} Blocks`
                      : "Enter CBM quantity to calculate blocks count"}
                  </p>

                  {exceedsStock && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>
                        Quantity exceeds available stock ({(selectedProduct?.currentCbm != null ? selectedProduct.currentCbm : (selectedProduct?.currentStock || 0) * Number(selectedProduct?.cbmPerBlock || 0.018)).toFixed(3)} CBM)
                      </span>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Reference Number */}
            <div>
              <label className="label">Challan / Batch / Ref No.</label>
              <input
                name="referenceNo"
                placeholder={
                  selectedCategory === "MORTAR"
                    ? "e.g. MORTAR-BATCH-104 or INVOICE-89"
                    : "e.g. PROD-BATCH-104 or RETURN-08"
                }
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="field text-xs font-medium"
              />
            </div>

            {/* Remarks / Shift Notes */}
            <div>
              <label className="label">Remarks / Shift Notes</label>
              <textarea
                name="note"
                rows={2}
                placeholder={
                  selectedCategory === "MORTAR"
                    ? "Storage location, pallet stack, moisture testing, supplier remarks..."
                    : "Optional supplier notes, autoclave batch, or damage reason"
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="field text-xs font-medium"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                exceedsStock ||
                (selectedCategory === "MORTAR"
                  ? quantity === "" || Number(quantity) <= 0
                  : cbmInput === "" || Number(cbmInput) <= 0)
              }
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
              {selectedCategory === "MORTAR"
                ? movementType === "IN"
                  ? "✓ Confirm Mortar Stock Intake (40 KG Bags)"
                  : "✓ Confirm Mortar Stock Outflow (40 KG Bags)"
                : movementType === "IN"
                ? "✓ Confirm Stock Intake"
                : "✓ Confirm Stock Outflow"}
            </button>
          </form>
        </div>

        {/* Live Size-Wise & Mortar Inventory Section */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 lg:col-span-2 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-navy flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#13789B]" />
                Live Yard Inventory by Category & Size
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical stack levels of AAC Blocks and Block Jointing Mortar.
              </p>
            </div>
            <Link
              href={role === "ADMIN" ? "/admin/products" : "/stocker/products"}
              className="text-xs font-bold text-[#13789B] hover:underline"
            >
              Manage Dimensions →
            </Link>
          </div>

          {/* =========================================================================
              DEDICATED BLOCK JOINTING MORTAR INVENTORY CARD
          ========================================================================= */}
          <div className="rounded-2xl border-2 border-sky-300 bg-sky-50/50 p-4 sm:p-5 shadow-xs transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-200/80 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white font-black text-xs shadow-xs">
                  40 KG
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-navy text-sm sm:text-base">
                      {mortar.name}
                    </h3>
                    <span className="rounded-md bg-sky-200 border border-sky-300 text-sky-900 px-2 py-0.5 text-[10px] font-bold">
                      40 KG Bag Only
                    </span>
                    <span className="rounded-md bg-emerald-100 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                      High Polymer Modified
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {mortar.description}
                  </p>
                </div>
              </div>

              <span
                className={`self-start sm:self-auto shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                  mortar.stock < 100
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {mortar.stock < 100 ? "Low Mortar Stock" : "In Stock"}
              </span>
            </div>

            {/* Mortar Inventory Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Available Stock
                </span>
                <span className="text-xl sm:text-2xl font-black text-sky-950 font-mono">
                  {formatNumber(mortar.stock)}
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">40 KG Bags</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Weight
                </span>
                <span className="text-xl sm:text-2xl font-black text-navy font-mono">
                  {((mortar.stock * 40) / 1000).toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">
                  Metric Tonnes ({formatNumber(mortar.stock * 40)} KG)
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Latest Purchase Rate
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                  {mortar.latestPurchasePrice > 0 ? `₹${mortar.latestPurchasePrice}` : "—"}
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">
                  per 40 KG Bag
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Stock Value
                </span>
                <span className="text-xl sm:text-2xl font-black text-navy font-mono">
                  {mortar.totalPurchaseValue > 0
                    ? `₹${formatNumber(mortar.totalPurchaseValue)}`
                    : "—"}
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">
                  Est. Inventory Valuation
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="mt-3 pt-3 border-t border-sky-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">
                Supplier: <strong className="text-navy">{mortar.latestSupplier || "Swarnim Plant"}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("MORTAR");
                    setMovementType("IN");
                  }}
                  className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1.5 transition-colors cursor-pointer"
                >
                  + Add Mortar Stock (40 KG)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryCategoryFilter("MORTAR");
                    setPage(1);
                  }}
                  className="rounded-xl border border-sky-300 bg-white hover:bg-sky-50 text-sky-800 font-bold px-3 py-1.5 transition-colors cursor-pointer"
                >
                  Filter Mortar History →
                </button>
              </div>
            </div>
          </div>

          {/* AAC Block Grid */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              AAC Block Sizes & Volumes
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products
                .filter((p) => p.active)
                .map((p) => {
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

                    {(() => {
                      const cbm = p.currentCbm != null ? p.currentCbm : p.currentStock * Number(p.cbmPerBlock || 0.018);
                      return (
                        <>
                          <div className="mt-3">
                            <p className="text-2xl font-black text-navy tracking-tight font-mono">
                              {cbm.toFixed(3)} CBM
                            </p>
                            <p className="text-xs text-slate-500 italic mt-0.5">
                              ≈ {formatNumber(p.currentStock)} Blocks
                            </p>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">
                            <span>{Number(p.cbmPerBlock).toFixed(4)} CBM/blk</span>
                            <span className="font-semibold text-slate-700">
                              {p.blocksPerCbm ? Number(p.blocksPerCbm).toFixed(1) : (1 / Number(p.cbmPerBlock || 0.018)).toFixed(1)} blk/CBM
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
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
              Stock Movement Audit History & Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ledger of Block Jointing Mortar and AAC Block stock entries, edits, and automated dispatches.
            </p>
          </div>

          {/* Filter & Export Toolbar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            {/* Category Filter Toggle */}
            <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs shrink-0">
              {(
                [
                  { key: "ALL", label: "All Items" },
                  { key: "AAC_BLOCK", label: "AAC Blocks" },
                  { key: "MORTAR", label: "Mortar (40 KG)" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setHistoryCategoryFilter(cat.key);
                    setPage(1);
                  }}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    historyCategoryFilter === cat.key
                      ? "bg-white text-navy shadow-xs"
                      : "text-slate-500 hover:text-navy"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

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
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    historyTypeFilter === t
                      ? "bg-white text-navy shadow-xs"
                      : "text-slate-500 hover:text-navy"
                  }`}
                >
                  {t === "ALL" ? "All Types" : t === "IN" ? "Stock In" : "Stock Out"}
                </button>
              ))}
            </div>

            {/* Product Size Filter */}
            <select
              value={historySizeFilter}
              onChange={(e) => {
                setHistorySizeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-navy outline-none cursor-pointer"
            >
              <option value="ALL">All Sizes & Bags</option>
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
                  placeholder="Search ref, supplier, order, note..."
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
          {paginatedMovements.map((m) => {
            const isMortar =
              m.product.category === "MORTAR" ||
              m.product.category === "ADHESIVE" ||
              m.product.category === "BLOCK_JOINTING_MORTAR" ||
              m.product.sizeLabel?.includes("40");

            return (
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
                    <span className="font-bold text-xs text-navy">
                      {isMortar ? "Block Jointing Mortar" : m.product.sizeLabel}
                    </span>
                    {isMortar && (
                      <span className="rounded bg-sky-100 text-sky-800 text-[9px] font-bold px-1.5 py-0.2">
                        40 KG Bag
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    {isMortar ? (
                      <span
                        className={`font-black text-sm font-mono ${
                          m.quantityDelta > 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {m.quantityDelta > 0
                          ? `+${formatNumber(m.quantityDelta)}`
                          : formatNumber(m.quantityDelta)}{" "}
                        Bags
                      </span>
                    ) : (
                      <div>
                        <span
                          className={`font-black text-sm font-mono block ${
                            (m.cbmDelta != null ? Number(m.cbmDelta) > 0 : m.quantityDelta > 0)
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }`}
                        >
                          {m.cbmDelta != null
                            ? `${Number(m.cbmDelta) > 0 ? "+" : ""}${Number(m.cbmDelta).toFixed(3)} CBM`
                            : `${m.quantityDelta > 0 ? "+" : ""}${(m.quantityDelta * Number(m.product.cbmPerBlock || 0.018)).toFixed(3)} CBM`}
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal italic block">
                          ≈ {m.quantityDelta > 0 ? "+" : ""}{formatNumber(m.quantityDelta)} Blocks
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Pricing & Supplier info if recorded */}
                {(m.purchasePrice != null || m.supplier) && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                    {m.purchasePrice != null && (
                      <span>
                        Rate: <strong className="font-bold">₹{m.purchasePrice}</strong>
                      </span>
                    )}
                    {m.purchasePrice != null && (
                      <span>
                        Total:{" "}
                        <strong className="font-bold text-emerald-800">
                          ₹{formatNumber(Math.abs(m.quantityDelta) * m.purchasePrice)}
                        </strong>
                      </span>
                    )}
                    {m.supplier && (
                      <span className="text-slate-500">
                        Supplier: <strong className="text-navy">{m.supplier}</strong>
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{formatDateTime(m.createdAt)}</span>
                  <span className="font-mono font-medium">
                    Ref:{" "}
                    {m.order ? (
                      <Link
                        href={
                          role === "ADMIN"
                            ? `/admin/orders/${m.order.id}`
                            : `/stocker/orders/${m.order.id}`
                        }
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
                  <span className="text-[10px] text-slate-400">
                    By: {m.createdBy?.name || "System"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(m)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-navy py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Edit stock entry"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </button>

                    {!m.order && (
                      <button
                        type="button"
                        onClick={() => setDeletingMovement(m)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Delete stock entry"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedMovement(m)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#13789B] hover:underline py-1 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {paginatedMovements.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching stock movement records found.
            </div>
          )}
        </div>

        {/* Desktop View: Full Data Table (hidden md:block) */}
        <div className="hidden md:block w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase tracking-wider font-bold">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Product / Category</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Quantity Delta</th>
                <th className="py-3 px-3">Pricing & Supplier</th>
                <th className="py-3 px-3">Reference / Order</th>
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMovements.map((m) => {
                const isMortar =
                  m.product.category === "MORTAR" ||
                  m.product.category === "ADHESIVE" ||
                  m.product.category === "BLOCK_JOINTING_MORTAR" ||
                  m.product.sizeLabel?.includes("40");

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {formatDateTime(m.createdAt)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-navy">
                        {isMortar ? "Block Jointing Mortar (40 KG)" : m.product.sizeLabel}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isMortar ? "40 KG Bag Only" : m.product.dimensions || "AAC Block"}
                      </span>
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

                    <td className="py-3 px-3 font-black text-sm whitespace-nowrap font-mono">
                      {isMortar ? (
                        <span className={m.quantityDelta > 0 ? "text-emerald-700" : "text-rose-700"}>
                          {m.quantityDelta > 0
                            ? `+${formatNumber(m.quantityDelta)}`
                            : formatNumber(m.quantityDelta)}{" "}
                          <span className="text-xs font-semibold">Bags</span>
                        </span>
                      ) : (
                        <div>
                          <span
                            className={`block ${
                              (m.cbmDelta != null ? Number(m.cbmDelta) > 0 : m.quantityDelta > 0)
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}
                          >
                            {m.cbmDelta != null
                              ? `${Number(m.cbmDelta) > 0 ? "+" : ""}${Number(m.cbmDelta).toFixed(3)} CBM`
                              : `${m.quantityDelta > 0 ? "+" : ""}${(m.quantityDelta * Number(m.product.cbmPerBlock || 0.018)).toFixed(3)} CBM`}
                          </span>
                          <span className="text-[11px] text-slate-500 font-normal italic block">
                            ≈ {m.quantityDelta > 0 ? "+" : ""}{formatNumber(m.quantityDelta)} Blocks
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-[11px]">
                      {m.purchasePrice != null ? (
                        <div>
                          <span className="font-bold text-emerald-800">₹{m.purchasePrice}/bag</span>
                          <span className="text-slate-400 block text-[10px]">
                            {m.supplier || "Swarnim Plant"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">{m.supplier || "—"}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-xs">
                      {m.order ? (
                        <Link
                          href={
                            role === "ADMIN"
                              ? `/admin/orders/${m.order.id}`
                              : `/stocker/orders/${m.order.id}`
                          }
                          className="font-bold text-[#13789B] hover:underline"
                        >
                          {m.order.orderNo}
                        </Link>
                      ) : (
                        <span className="text-slate-600">{m.referenceNo || "—"}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {m.createdBy?.name || "System"}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px] max-w-[150px] truncate">
                      {m.note || "—"}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(m)}
                          className="p-1 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit stock entry"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {!m.order && (
                          <button
                            type="button"
                            onClick={() => setDeletingMovement(m)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete stock entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedMovement(m)}
                          className="p-1 rounded-lg text-slate-400 hover:text-[#13789B] hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Inspect movement"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedMovements.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
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

      {/* =========================================================================
          EDIT STOCK MOVEMENT MODAL
      ========================================================================= */}
      {editingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Update Stock Ledger Entry
                </span>
                <h3 className="text-base font-black text-navy mt-0.5">
                  Edit {editingMovement.product.name || editingMovement.product.sizeLabel} (
                  {editingMovement.type})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMovement(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-navy transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={updateStockAction} className="space-y-4">
              <input type="hidden" name="movementId" value={editingMovement.id} />

              <div className="rounded-2xl bg-slate-50 p-3 text-xs flex items-center justify-between">
                <span className="text-slate-500">Transaction Type:</span>
                <span
                  className={`font-black ${
                    editingMovement.type === "IN" ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {editingMovement.type === "IN" ? "INBOUND (Intake)" : "OUTBOUND (Issue / Dispatch)"}
                </span>
              </div>

              {/* Quantity */}
              <div>
                <label className="label">
                  Quantity ({editingMovement.product.sizeLabel?.includes("40") ? "40 KG Bags" : "Blocks"}) *
                </label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  required
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Math.max(1, Number(e.target.value)))}
                  className="field text-base font-bold font-mono"
                />
              </div>

              {/* Purchase Price & Selling Price */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="label">Purchase Price (₹/Unit)</label>
                  <input
                    name="purchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 250"
                    value={editPurchasePrice}
                    onChange={(e) =>
                      setEditPurchasePrice(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="field text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="label">Selling Price (₹/Unit)</label>
                  <input
                    name="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 320"
                    value={editSellingPrice}
                    onChange={(e) =>
                      setEditSellingPrice(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="field text-xs font-semibold font-mono"
                  />
                </div>
              </div>

              {/* Supplier & Entry Date */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="label">Supplier / Source</label>
                  <input
                    name="supplier"
                    type="text"
                    placeholder="Supplier name"
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    className="field text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="label">Stock Entry Date</label>
                  <input
                    name="entryDate"
                    type="date"
                    value={editEntryDate}
                    onChange={(e) => setEditEntryDate(e.target.value)}
                    className="field text-xs font-medium"
                  />
                </div>
              </div>

              {/* Total Recalculation Preview */}
              {typeof editPurchasePrice === "number" && editPurchasePrice > 0 && editQuantity > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs flex items-center justify-between">
                  <span className="text-emerald-800 font-semibold">Total Entry Value:</span>
                  <span className="font-mono font-black text-emerald-900 text-sm">
                    ₹{formatNumber(editQuantity * editPurchasePrice)}
                  </span>
                </div>
              )}

              {/* Reference */}
              <div>
                <label className="label">Reference / Challan No.</label>
                <input
                  name="referenceNo"
                  value={editReferenceNo}
                  onChange={(e) => setEditReferenceNo(e.target.value)}
                  className="field text-xs font-medium"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="label">Remarks / Notes</label>
                <textarea
                  name="note"
                  rows={2}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="field text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMovement(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#13789B] hover:bg-[#0F627F] text-white px-5 py-2 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION MODAL
      ========================================================================= */}
      {deletingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-navy">Confirm Stock Deletion</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove this stock record?
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2 text-xs border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-bold text-navy">
                  {deletingMovement.product.name || deletingMovement.product.sizeLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity Delta:</span>
                <span className="font-mono font-black text-navy">
                  {deletingMovement.quantityDelta > 0
                    ? `+${formatNumber(deletingMovement.quantityDelta)}`
                    : formatNumber(deletingMovement.quantityDelta)}{" "}
                  {deletingMovement.product.sizeLabel?.includes("40") ? "Bags" : "Blocks"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono font-medium text-slate-700">
                  {deletingMovement.referenceNo || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded At:</span>
                <span className="text-slate-700">{formatDateTime(deletingMovement.createdAt)}</span>
              </div>
            </div>

            <form action={deleteStockAction} className="space-y-3">
              <input type="hidden" name="movementId" value={deletingMovement.id} />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingMovement(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Yes, Delete Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MOVEMENT DETAIL INSPECTION MODAL
      ========================================================================= */}
      {selectedMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Inventory Movement Ledger
                </span>
                <h3 className="text-base font-black text-navy mt-0.5">
                  {selectedMovement.product.name || selectedMovement.product.sizeLabel} (
                  {selectedMovement.type})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovement(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-navy transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-bold text-navy">
                    {selectedMovement.product.category === "MORTAR" ||
                    selectedMovement.product.sizeLabel?.includes("40")
                      ? "Block Jointing Mortar"
                      : "AAC Block"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Movement Type:</span>
                  <span
                    className={`font-black ${
                      selectedMovement.type === "IN" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {selectedMovement.type === "IN"
                      ? "INBOUND (Intake / Purchase)"
                      : "OUTBOUND (Dispatch / Issue)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity Delta:</span>
                  <span className="font-mono font-black text-navy text-sm">
                    {selectedMovement.quantityDelta > 0
                      ? `+${formatNumber(selectedMovement.quantityDelta)}`
                      : formatNumber(selectedMovement.quantityDelta)}{" "}
                    {selectedMovement.product.sizeLabel?.includes("40") ? "40 KG Bags" : "Blocks"}
                  </span>
                </div>
                {selectedMovement.product.sizeLabel?.includes("40") && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Equivalent Weight:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {(Math.abs(selectedMovement.quantityDelta) * 40).toLocaleString()} KG (
                      {((Math.abs(selectedMovement.quantityDelta) * 40) / 1000).toFixed(2)} MT)
                    </span>
                  </div>
                )}
                {selectedMovement.purchasePrice != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Purchase Rate:</span>
                    <span className="font-mono font-bold text-emerald-800">
                      ₹{selectedMovement.purchasePrice} / unit
                    </span>
                  </div>
                )}
                {selectedMovement.sellingPrice != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selling Rate:</span>
                    <span className="font-mono font-bold text-navy">
                      ₹{selectedMovement.sellingPrice} / unit
                    </span>
                  </div>
                )}
                {selectedMovement.supplier && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supplier:</span>
                    <span className="font-bold text-navy">{selectedMovement.supplier}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-medium text-slate-700">
                    {formatDateTime(selectedMovement.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsible User:</span>
                  <span className="font-bold text-navy">
                    {selectedMovement.createdBy?.name || "System"}
                  </span>
                </div>
                {selectedMovement.referenceNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference No:</span>
                    <span className="font-mono font-bold text-navy">
                      {selectedMovement.referenceNo}
                    </span>
                  </div>
                )}
                {selectedMovement.order && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Linked Order:</span>
                    <Link
                      href={
                        role === "ADMIN"
                          ? `/admin/orders/${selectedMovement.order.id}`
                          : `/stocker/orders/${selectedMovement.order.id}`
                      }
                      className="font-bold text-[#13789B] hover:underline flex items-center gap-1"
                    >
                      <span>{selectedMovement.order.orderNo}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
                {selectedMovement.note && (
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-slate-500 block mb-0.5">Notes:</span>
                    <p className="font-medium text-slate-700 italic bg-white p-2 rounded-xl border border-slate-100">
                      {selectedMovement.note}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const m = selectedMovement;
                  setSelectedMovement(null);
                  handleOpenEdit(m);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-navy hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Entry</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMovement(null)}
                className="rounded-xl bg-[#13789B] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F627F] cursor-pointer"
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
