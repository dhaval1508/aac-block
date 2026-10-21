"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Pencil,
  CheckCircle2,
  XCircle,
  Search,
  LayoutGrid,
  List,
  Filter,
  Boxes,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { formatNumber, formatBlockSizeName } from "@/lib/utils";
import { ProductFormModal } from "@/components/product-form-modal";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { toggleProductActiveAction, deleteProductAction } from "@/lib/actions/products";

type ProductWithStock = {
  id: string;
  name: string;
  sizeLabel: string;
  dimensions: string;
  lengthMm: number;
  heightMm: number;
  widthMm: number;
  cbmPerBlock: number | { toString(): string };
  blocksPerCbm: number | { toString(): string };
  price: number | { toString(): string };
  gstRate: number | { toString(): string };
  active: boolean;
  currentStock: number;
  currentCbm?: number;
};

export function ProductsManager({
  products,
  role,
}: {
  products: ProductWithStock[];
  role: "ADMIN" | "STOCKER";
}) {
  const [items, setItems] = useState<ProductWithStock[]>(products);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductWithStock | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  useEffect(() => {
    setItems(products);
  }, [products]);

  // Auto-dismiss notification after 4s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const isAdmin = role === "ADMIN";

  const totalSizes = items.length;
  const activeSizes = items.filter((p) => p.active).length;
  const inactiveSizes = items.filter((p) => !p.active).length;
  const totalStock = items.reduce((sum, p) => sum + p.currentStock, 0);

  const filteredProducts = useMemo(() => {
    return items.filter((p) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? p.active : !p.active;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.sizeLabel.toLowerCase().includes(q) ||
        p.dimensions.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [items, statusFilter, search]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProductWithStock) => {
    setEditingProduct(p);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteProductAction(deleteTarget.id);
      if (res?.success) {
        setItems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setNotification({
          type: "success",
          message: `Product size "${deleteTarget.sizeLabel}" deleted successfully.`,
        });
        setDeleteTarget(null);
      } else {
        setNotification({
          type: "error",
          message: res?.error || "Failed to delete product.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "An error occurred while deleting the product.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 max-w-full">
      {/* =========================================================================
          PAGE HEADER
      ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#13789B] shrink-0" />
            AAC Block Sizes & Catalog Specifications
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            {isAdmin
              ? "Configure physical dimensions (L × H × W), automatic volume (CBM), and catalog availability."
              : "Inspect physical block specifications, volume calculations, and yard dimensions."}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Size</span>
        </button>
      </div>

      {/* Success / Error Notification */}
      {notification && (
        <div
          className={`rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xs transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          TOP 4 SPECIFICATION KPI CARDS
      ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4 min-w-0">
        <div className="card p-3 sm:p-4 border-l-4 border-l-[#13789B] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 truncate block">Total Sizes</span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-slate-900 truncate">{totalSizes}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 truncate block">In factory system</span>
        </div>

        <div className="card p-3 sm:p-4 border-l-4 border-l-emerald-500 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 truncate block">Active for Ordering</span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-700 truncate">{activeSizes}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 truncate block">Customer catalog</span>
        </div>

        <div className="card p-3 sm:p-4 border-l-4 border-l-slate-400 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 truncate block">Inactive / Staged</span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-slate-600 truncate">{inactiveSizes}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 truncate block">Unpublished sizes</span>
        </div>

        <div className="card p-3 sm:p-4 border-l-4 border-l-amber-500 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 truncate block">Total Yard Stock</span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-slate-900 truncate">
            {items.reduce((sum, p) => sum + (p.currentCbm || (p.currentStock * Number(p.cbmPerBlock))), 0).toFixed(3)} CBM
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 truncate block italic">
            ≈ {formatNumber(totalStock)} Blocks
          </span>
        </div>
      </div>

      {/* =========================================================================
          FILTER TOOLBAR (SEARCH, STATUS, VIEW TOGGLE)
      ========================================================================= */}
      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by size label (e.g. 4 Inch, 6 Inch) or dimensions..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#13789B] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs shrink-0">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === s
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {s === "ALL" ? "All" : s === "ACTIVE" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 self-end sm:self-auto rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode("GRID")}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "GRID"
                ? "bg-white text-[#13789B] shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TABLE")}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "TABLE"
                ? "bg-white text-[#13789B] shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Table View"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          PRODUCT DISPLAY: GRID VIEW
      ========================================================================= */}
      {viewMode === "GRID" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p) => {
            const cbmVal = Number(p.cbmPerBlock);
            const bpcVal = Number(p.blocksPerCbm);
            const priceVal = Number(p.price);

            return (
              <div
                key={p.id}
                className={`card p-5 hover:border-slate-300 transition-all ${
                  p.active ? "border-slate-200" : "border-slate-200 bg-slate-50/50 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{formatBlockSizeName(p.sizeLabel)}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{p.dimensions}</p>
                  </div>
                  {p.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      <XCircle className="h-3 w-3" /> Inactive
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Volume</span>
                    <p className="font-bold text-slate-900">{cbmVal.toFixed(4)} m³</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Blocks / CBM</span>
                    <p className="font-bold text-slate-900">{bpcVal.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Yard Stock
                    </span>
                    <p className="text-base font-black text-slate-900">
                      {(p.currentCbm !== undefined ? p.currentCbm : (p.currentStock * cbmVal)).toFixed(3)} CBM
                    </p>
                    <p className="text-[11px] text-slate-400 italic">
                      ≈ {formatNumber(p.currentStock)} Blocks
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <>
                        <form action={toggleProductActiveAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                          >
                            {p.active ? "Deactivate" : "Activate"}
                          </button>
                        </form>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
                          title="Delete specification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="flex items-center gap-1 rounded-lg bg-[#13789B]/10 px-2.5 py-1.5 text-xs font-bold text-[#13789B] hover:bg-[#13789B] hover:text-white transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =========================================================================
            PRODUCT DISPLAY: COMPACT TABLE VIEW
        ========================================================================= */
        <div className="card overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Size Label</th>
                <th className="py-3 px-4">Dimensions</th>
                <th className="py-3 px-4">CBM / Block</th>
                <th className="py-3 px-4">Blocks / CBM</th>
                <th className="py-3 px-4">Current Yard Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-black text-slate-900">{formatBlockSizeName(p.sizeLabel)}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{p.dimensions}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {Number(p.cbmPerBlock).toFixed(4)} CBM
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {Number(p.blocksPerCbm).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-black text-slate-900">
                      {(p.currentCbm !== undefined ? p.currentCbm : (p.currentStock * Number(p.cbmPerBlock))).toFixed(3)} CBM
                    </p>
                    <p className="text-[11px] text-slate-400 italic">
                      ≈ {formatNumber(p.currentStock)} Blocks
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {isAdmin && (
                        <>
                          <form action={toggleProductActiveAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              {p.active ? "Deactivate" : "Activate"}
                            </button>
                          </form>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            title="Delete specification"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="rounded-lg bg-[#13789B]/10 px-2 py-1 text-xs font-bold text-[#13789B] hover:bg-[#13789B] hover:text-white cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="card p-12 text-center text-slate-400">
          <Layers className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Block Sizes Found</h3>
          <p className="mt-1 text-xs text-slate-400">
            No products match your search or status filter.
          </p>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          role={role}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Delete Block Size Specification"
        itemName={deleteTarget ? `${deleteTarget.sizeLabel} (${deleteTarget.dimensions})` : undefined}
        message="Are you sure you want to delete this? This action cannot be undone."
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
