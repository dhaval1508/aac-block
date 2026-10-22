"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  ShoppingBag,
  Layers,
  ArrowRight,
  Edit2,
  Archive,
  Power,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  createSalesmanAction,
  updateSalesmanAction,
  toggleSalesmanActiveAction,
  archiveSalesmanSafelyAction,
} from "@/lib/actions/salesmen";

export interface SalesmanListItem {
  id: string;
  name: string;
  salesmanCode: string | null;
  mobile: string;
  email: string;
  active: boolean;
  address: string | null;
  remarks: string | null;
  createdAt: Date | string;
  assignedCustomersCount: number;
  totalOrdersCount: number;
  totalCbm: number;
}

interface SalesmenManagerProps {
  salesmen: SalesmanListItem[];
  totalCustomersCount: number;
  unassignedCustomersCount: number;
}

export function SalesmenManager({
  salesmen,
  totalCustomersCount,
  unassignedCustomersCount,
}: SalesmenManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DEACTIVATED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState<SalesmanListItem | null>(null);
  const [archivingSalesman, setArchivingSalesman] = useState<SalesmanListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredSalesmen = salesmen.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.mobile.includes(search) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.salesmanCode && s.salesmanCode.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ACTIVE"
        ? s.active
        : !s.active;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSalesmen.length / pageSize) || 1;
  const paginatedSalesmen = filteredSalesmen.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalOrders = salesmen.reduce((acc, s) => acc + s.totalOrdersCount, 0);
  const totalCbm = salesmen.reduce((acc, s) => acc + s.totalCbm, 0);
  const activeCount = salesmen.filter((s) => s.active).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Add Salesman Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy">Salesmen Management</h1>
          <p className="mt-1 text-xs text-slate-500">
            Create and manage sales representatives, customer assignments, order attribution, and performance.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0f607d] transition cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Salesman</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Salesmen</span>
            <Users className="h-4 w-4 text-[#13789B]" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{salesmen.length}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-semibold">{activeCount} active</p>
        </div>

        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Assigned Customers</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">
            {salesmen.reduce((acc, s) => acc + s.assignedCustomersCount, 0)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 font-semibold">
            {unassignedCustomersCount} unassigned
          </p>
        </div>

        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Salesman Orders</span>
            <ShoppingBag className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{totalOrders}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 font-semibold">Attributed orders</p>
        </div>

        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Booked Volume</span>
            <Layers className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{totalCbm.toFixed(2)} CBM</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-semibold">Real factory data</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, salesman ID, mobile or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/10 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(["ALL", "ACTIVE", "DEACTIVATED"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                statusFilter === filter
                  ? "bg-[#13789B] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter === "ALL" ? "All Salesmen" : filter === "ACTIVE" ? "Active" : "Deactivated"}
            </button>
          ))}
        </div>
      </div>

      {/* Salesmen Table */}
      <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {filteredSalesmen.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Salesmen Found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? "No salesmen match your current search query."
                : "No salesmen have been created yet. Click 'Add Salesman' above to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Salesman ID & Name</th>
                  <th className="py-3.5 px-4">Contact Details</th>
                  <th className="py-3.5 px-4 text-center">Assigned Customers</th>
                  <th className="py-3.5 px-4 text-right">Orders & Volume</th>
                  <th className="py-3.5 px-4 text-center">Account Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSalesmen.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold rounded-md bg-sky-50 text-[#13789B] border border-sky-200 px-1.5 py-0.5">
                          {s.salesmanCode || "SAB-SALES"}
                        </span>
                      </div>
                      <Link
                        href={`/admin/salesmen/${s.id}`}
                        className="mt-1 font-bold text-navy group-hover:text-[#13789B] group-hover:underline block"
                      >
                        {s.name}
                      </Link>
                      {s.remarks && (
                        <span className="text-[10px] text-slate-400 italic block mt-0.5">
                          {s.remarks}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{s.mobile}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span className="truncate max-w-[180px]">{s.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 font-black text-xs font-mono">
                        {s.assignedCustomersCount} Customers
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-black text-navy">{s.totalCbm.toFixed(2)} CBM</div>
                      <div className="text-[11px] text-slate-400 font-semibold">
                        {s.totalOrdersCount} orders booked
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {s.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
                          <XCircle className="h-3 w-3 text-slate-500" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/salesmen/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-[#13789B] hover:text-white px-2.5 py-1.5 font-bold text-[11px] text-slate-700 transition"
                          title="View assigned customers and order history"
                        >
                          <span>Manage</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>

                        <button
                          onClick={() => setEditingSalesman(s)}
                          className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                          title="Edit Salesman"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <form action={toggleSalesmanActiveAction}>
                          <input type="hidden" name="salesmanId" value={s.id} />
                          <button
                            type="submit"
                            className={`rounded-xl border p-1.5 transition ${
                              s.active
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                            title={s.active ? "Deactivate Account" : "Activate Account"}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </form>

                        <button
                          onClick={() => setArchivingSalesman(s)}
                          className="rounded-xl border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 transition"
                          title="Archive Salesman Safely"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <div className="text-xs font-semibold text-slate-500">
              Page <span className="font-bold text-navy">{currentPage}</span> of{" "}
              <span className="font-bold text-navy">{totalPages}</span> ({filteredSalesmen.length} salesmen)
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          ADD SALESMAN MODAL
      ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-navy">Add New Salesman</h3>
                <p className="text-xs text-slate-400">Salesman ID is generated automatically upon creation.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={createSalesmanAction} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Dhaval Patel"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    name="mobile"
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    placeholder="10-digit mobile"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="salesman@swarnim.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Login Password (Min 6 chars) *</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
                <p className="mt-1 text-[11px] text-slate-400">Passwords are cryptographically hashed using bcrypt.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Optional Address / Territory</label>
                <input
                  name="address"
                  placeholder="e.g. Surat South / GIDC Zone"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Optional Remarks</label>
                <input
                  name="remarks"
                  placeholder="e.g. Senior Field Sales Executive"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="active"
                  id="active"
                  value="true"
                  defaultChecked
                  className="rounded border-slate-300 text-[#13789B] focus:ring-[#13789B]"
                />
                <label htmlFor="active" className="text-xs font-semibold text-slate-700">
                  Account is immediately Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#13789B] px-5 py-2 text-xs font-bold text-white hover:bg-[#0f607d] shadow-sm"
                >
                  Create Salesman Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          EDIT SALESMAN MODAL
      ========================================================================= */}
      {editingSalesman && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-navy">Edit Salesman Details</h3>
                <p className="text-xs text-slate-400">ID: {editingSalesman.salesmanCode || "SAB-SALES"}</p>
              </div>
              <button
                onClick={() => setEditingSalesman(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={updateSalesmanAction} className="mt-4 space-y-3.5">
              <input type="hidden" name="salesmanId" value={editingSalesman.id} />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  name="name"
                  defaultValue={editingSalesman.name}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    name="mobile"
                    type="tel"
                    required
                    defaultValue={editingSalesman.mobile}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={editingSalesman.email}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password (Leave blank to keep current)</label>
                <input
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address / Territory</label>
                <input
                  name="address"
                  defaultValue={editingSalesman.address || ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  name="remarks"
                  defaultValue={editingSalesman.remarks || ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="active"
                  id="edit-active"
                  value="true"
                  defaultChecked={editingSalesman.active}
                  className="rounded border-slate-300 text-[#13789B] focus:ring-[#13789B]"
                />
                <label htmlFor="edit-active" className="text-xs font-semibold text-slate-700">
                  Account is Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSalesman(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#13789B] px-5 py-2 text-xs font-bold text-white hover:bg-[#0f607d] shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ARCHIVE / SAFE DEACTIVATE MODAL
      ========================================================================= */}
      {archivingSalesman && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50">
                <Archive className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-navy">Archive Salesman Account</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are archiving <span className="font-bold text-slate-900">{archivingSalesman.name}</span>.
              Historical customer and order data will <strong className="text-slate-900">not</strong> be deleted.
            </p>

            <form action={archiveSalesmanSafelyAction} className="mt-4 space-y-4">
              <input type="hidden" name="salesmanId" value={archivingSalesman.id} />

              <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="unassignCustomers"
                    value="true"
                    defaultChecked
                    className="mt-0.5 rounded border-amber-300 text-[#13789B] focus:ring-[#13789B]"
                  />
                  <span className="text-xs text-amber-900 font-medium">
                    Safely unassign active customers ({archivingSalesman.assignedCustomersCount} linked) to Unassigned state and record audit log.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setArchivingSalesman(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
                >
                  Archive Safely
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
