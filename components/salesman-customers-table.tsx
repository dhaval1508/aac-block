"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Phone,
  Eye,
  CheckCircle2,
  XCircle,
  PlusCircle,
} from "lucide-react";

export interface SalesmanCustomerItem {
  id: string;
  name: string;
  companyName: string | null;
  mobile: string;
  email: string;
  active: boolean;
  assignedAt: Date | string | null;
  totalOrdersCount: number;
  totalCbm: number;
}

export function SalesmanCustomersTable({
  customers,
}: {
  customers: SalesmanCustomerItem[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ACTIVE"
        ? c.active
        : !c.active;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, company, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/10 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                statusFilter === filter
                  ? "bg-[#13789B] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter === "ALL" ? "All" : filter === "ACTIVE" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Customers Found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? "No customers match your search query."
                : "You don't have any assigned customers yet. Click 'Invite Customer via WhatsApp' or 'Add Customer' to start."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Registered Mobile</th>
                  <th className="py-3.5 px-4 text-center">Total Orders</th>
                  <th className="py-3.5 px-4 text-right">Total Ordered CBM</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-navy block text-sm">{c.name}</span>
                      {c.companyName && (
                        <span className="text-[11px] text-slate-500 font-medium block">
                          {c.companyName}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{c.mobile}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 font-bold text-xs font-mono">
                        {c.totalOrdersCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-black text-navy font-mono text-sm">
                        {c.totalCbm.toFixed(2)} CBM
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {c.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200">
                          <XCircle className="h-3 w-3" />
                          Pending Activation
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/salesman/orders/new?customer=${c.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#13789B]/10 hover:bg-[#13789B] hover:text-white px-2.5 py-1.5 font-bold text-xs text-[#13789B] transition"
                          title="Create New Order for this Customer"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Order</span>
                        </Link>
                        <Link
                          href={`/salesman/orders?customer=${c.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 font-bold text-xs text-slate-700 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Orders</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
