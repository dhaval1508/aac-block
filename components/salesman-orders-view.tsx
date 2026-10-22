"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  ExternalLink,
  Phone,
  Eye,
} from "lucide-react";
import {
  formatDate,
  formatNumber,
  formatBlockSizeName,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
} from "@/lib/utils";

export interface SalesmanOrderItem {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  sizeLabel: string | null;
  dimensions: string | null;
  quantity: number;
  totalCbm: number | null;
  adhesiveBags: number | null;
  deliveryAddress: string;
  googleMapsUrl: string | null;
  status: string;
  createdAt: Date | string;
}

interface SalesmanOrdersViewProps {
  orders: SalesmanOrderItem[];
  initialCustomerId?: string;
}

export function SalesmanOrdersView({
  orders,
  initialCustomerId,
}: SalesmanOrdersViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || "ALL");

  // Unique customers from orders
  const customerList = Array.from(
    new Map(orders.map((o) => [o.customerId, { id: o.customerId, name: o.customerName }])).values()
  );

  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      o.orderNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerMobile.includes(q) ||
      o.deliveryAddress.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "ALL" ? true : o.status === statusFilter;
    const matchesCustomer =
      selectedCustomerId === "ALL" ? true : o.customerId === selectedCustomerId;

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const totalCbm = filteredOrders.reduce(
    (acc, o) => acc + (o.totalCbm ? Number(o.totalCbm) : 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, mobile, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/10 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Customer filter dropdown */}
            {customerList.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Customer:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="bg-transparent font-semibold text-navy outline-none cursor-pointer text-xs"
                >
                  <option value="ALL">All Customers</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status filter dropdown */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="text-slate-400 font-bold text-[11px]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent font-semibold text-navy outline-none cursor-pointer text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending / Placed</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="LOADING">In Loading</option>
                <option value="LOADED">Loaded & Staged</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered</option>
              </select>
            </div>
          </div>
        </div>

        {/* CBM Summary badge */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-500">
            Showing <strong className="text-navy">{filteredOrders.length}</strong> orders
          </span>
          <span className="rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 font-bold font-mono">
            Total Volume: {totalCbm.toFixed(2)} CBM
          </span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Orders Found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              {search || statusFilter !== "ALL" || selectedCustomerId !== "ALL"
                ? "No customer orders match your search and filter criteria."
                : "Your assigned customers have not placed any orders yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Order ID & Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Block Size</th>
                  <th className="py-3.5 px-4 text-right">Volume (CBM)</th>
                  <th className="py-3.5 px-4 text-center">Block Jointing Morter</th>
                  <th className="py-3.5 px-4">Delivery Site</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/salesman/orders/${o.id}`}
                        className="font-black text-[#13789B] hover:underline font-mono block text-sm"
                      >
                        {o.orderNo}
                      </Link>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {formatDate(o.createdAt)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-navy block">{o.customerName}</span>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {o.customerMobile}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">
                        {o.sizeLabel ? formatBlockSizeName(o.sizeLabel) : "Standard"}
                      </span>
                      {o.dimensions && (
                        <span className="text-[11px] text-slate-400 font-mono block">
                          {o.dimensions}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-black text-navy text-sm font-mono block">
                        {o.totalCbm ? `${Number(o.totalCbm).toFixed(3)} CBM` : "-"}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold block">
                        ≈ {formatNumber(o.quantity)} Blocks
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1 text-xs font-mono font-bold text-navy">
                        {o.adhesiveBags ?? 0} Bags
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-[200px]">
                      <p className="text-[11px] text-slate-600 truncate" title={o.deliveryAddress}>
                        📍 {o.deliveryAddress}
                      </p>
                      {o.googleMapsUrl && (
                        <a
                          href={o.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#13789B] hover:underline"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          <span>View on Maps</span>
                        </a>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          (ORDER_STATUS_CLASS as Record<string, string>)[o.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {(ORDER_STATUS_LABEL as Record<string, string>)[o.status] || o.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/salesman/orders/${o.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-[#13789B] hover:text-white px-3 py-1.5 text-xs font-bold text-slate-700 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Details</span>
                      </Link>
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
