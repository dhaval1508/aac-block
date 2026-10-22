"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  ShoppingBag,
  Layers,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRightLeft,
  Clock,
  X,
  ExternalLink,
  Shield,
  ShoppingCart,
  MessageCircle,
  Eye,
  History,
} from "lucide-react";
import { reassignCustomerAction } from "@/lib/actions/salesmen";
import { formatDate, formatNumber, formatBlockSizeName, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL, phoneDigits } from "@/lib/utils";

interface CustomerItem {
  id: string;
  name: string;
  companyName: string | null;
  mobile: string;
  email: string;
  assignedAt: Date | string | null;
  active: boolean;
  totalOrdersCount: number;
  totalCbm: number;
}

interface OrderItem {
  id: string;
  orderNo: string;
  customerName: string;
  customerMobile: string;
  sizeLabel: string | null;
  totalCbm: number | null;
  quantity: number;
  adhesiveBags: number | null;
  deliveryAddress: string;
  status: string;
  createdAt: Date | string;
}

interface HistoryItem {
  id: string;
  customerName: string;
  fromSalesmanName: string | null;
  toSalesmanName: string | null;
  assignedByName: string;
  reason: string | null;
  createdAt: Date | string;
}

interface SalesmanDetailViewProps {
  salesman: {
    id: string;
    name: string;
    salesmanCode: string | null;
    mobile: string;
    email: string;
    active: boolean;
    address: string | null;
    remarks: string | null;
    createdAt: Date | string;
  };
  customers: CustomerItem[];
  orders: OrderItem[];
  history: HistoryItem[];
  otherSalesmen: Array<{ id: string; name: string }>;
}

export function SalesmanDetailView({
  salesman,
  customers,
  orders,
  history,
  otherSalesmen,
}: SalesmanDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"CUSTOMERS" | "ORDERS" | "HISTORY">("CUSTOMERS");
  const [reassigningCustomer, setReassigningCustomer] = useState<CustomerItem | null>(null);

  const totalCbm = orders.reduce(
    (acc, ord) => acc + (ord.totalCbm ? Number(ord.totalCbm) : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/salesmen"
          className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200/90 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-[#13789B] hover:border-[#13789B]/40 transition-all group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-[#13789B] group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to All Salesmen</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>Users & Access</span>
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-sky-50 border border-sky-200 hover:bg-sky-100 px-3.5 py-2 text-xs font-bold text-[#13789B] transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>All Orders</span>
          </Link>
        </div>
      </div>

      {/* Salesman Profile Card */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black rounded-lg bg-sky-50 text-[#13789B] border border-sky-200 px-2 py-0.5">
                {salesman.salesmanCode || "SAB-SALES"}
              </span>
              {salesman.active ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-200">
                  <XCircle className="h-3 w-3" />
                  Deactivated
                </span>
              )}
            </div>

            <h1 className="mt-2 text-2xl font-black text-navy">{salesman.name}</h1>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{salesman.mobile}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{salesman.email}</span>
              </div>
              {salesman.address && (
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{salesman.address}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Created {formatDate(salesman.createdAt)}</span>
              </div>
            </div>

            {salesman.remarks && (
              <p className="mt-2 text-xs text-slate-500 italic">
                Note: {salesman.remarks}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Linked Customers</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{customers.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 font-semibold">Active accounts</p>
        </div>

        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Customer Orders</span>
            <ShoppingBag className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{orders.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 font-semibold">Total orders placed</p>
        </div>

        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Ordered Volume</span>
            <Layers className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{totalCbm.toFixed(2)} CBM</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-semibold">Real Neon PostgreSQL data</p>
        </div>
      </div>

      {/* Navigation Tabs with Modern Icons */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("CUSTOMERS")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === "CUSTOMERS"
              ? "bg-[#13789B] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Linked Customers ({customers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("ORDERS")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === "ORDERS"
              ? "bg-[#13789B] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Customer Orders ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("HISTORY")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeTab === "HISTORY"
              ? "bg-[#13789B] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Assignment History ({history.length})</span>
        </button>
      </div>

      {/* TAB 1: ASSIGNED CUSTOMERS */}
      {activeTab === "CUSTOMERS" && (
        <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          {customers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Customers Linked Yet</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Customers invited by this salesman via WhatsApp or manually created will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Customer Name & Company</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4 text-center">Assignment Date</th>
                    <th className="py-3.5 px-4 text-right">Total Orders</th>
                    <th className="py-3.5 px-4 text-right">Total CBM</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-navy block">{c.name}</span>
                        {c.companyName && (
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {c.companyName}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div>{c.mobile}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{c.email}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-500">
                        {c.assignedAt ? formatDate(c.assignedAt) : "Initial Registration"}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-navy font-mono">
                        {c.totalOrdersCount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-navy font-mono">
                        {c.totalCbm.toFixed(2)} CBM
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {c.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.mobile && (
                            <a
                              href={`https://wa.me/91${phoneDigits(c.mobile)}?text=${encodeURIComponent(
                                `Hello ${c.name}, greetings from Swarnim AAC Block.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                              title="Chat with Customer on WhatsApp"
                            >
                              <MessageCircle className="h-3 w-3" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          <button
                            onClick={() => setReassigningCustomer(c)}
                            className="inline-flex items-center gap-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 text-[11px] font-bold hover:bg-purple-100 transition cursor-pointer"
                            title="Reassign Customer to another Salesman"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            <span>Reassign</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER ORDERS */}
      {activeTab === "ORDERS" && (
        <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          {orders.length === 0 ? (
            <div className="text-center py-12 px-4">
              <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Orders Placed Yet</h3>
              <p className="mt-1 text-xs text-slate-400">
                Orders booked by this salesman&apos;s assigned customers will be tracked here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Order ID & Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Block Size</th>
                    <th className="py-3.5 px-4 text-right">Order Quantity</th>
                    <th className="py-3.5 px-4 text-center">Block Jointing Morter</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-black text-[#13789B] hover:underline font-mono"
                        >
                          {o.orderNo}
                        </Link>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {formatDate(o.createdAt)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-navy block">{o.customerName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{o.customerMobile}</span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {o.sizeLabel ? formatBlockSizeName(o.sizeLabel) : "AAC Block"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-navy">
                          {o.totalCbm ? `${Number(o.totalCbm).toFixed(3)} CBM` : "-"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          ≈ {formatNumber(o.quantity)} Blocks
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block rounded-lg bg-sky-50 border border-sky-200 px-2 py-0.5 text-xs font-mono font-bold text-navy">
                          {o.adhesiveBags ?? 0} Bags (40 KG)
                        </span>
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
                          href={`/admin/orders/${o.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-[#13789B] hover:text-white px-2.5 py-1 text-[11px] font-bold text-slate-700 transition"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Order</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ASSIGNMENT HISTORY */}
      {activeTab === "HISTORY" && (
        <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          {history.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Assignment History Recorded</h3>
              <p className="mt-1 text-xs text-slate-400">
                Audited assignment events for this salesman will be listed here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Previous Salesman</th>
                    <th className="py-3.5 px-4">New Salesman</th>
                    <th className="py-3.5 px-4">Assigned By</th>
                    <th className="py-3.5 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {formatDate(h.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-navy">
                        {h.customerName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {h.fromSalesmanName || "Unassigned"}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#13789B]">
                        {h.toSalesmanName || "Unassigned"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {h.assignedByName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 italic">
                        {h.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          REASSIGN CUSTOMER MODAL
      ========================================================================= */}
      {reassigningCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-extrabold text-navy">Reassign Customer</h3>
              </div>
              <button
                onClick={() => setReassigningCustomer(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={reassignCustomerAction} className="mt-4 space-y-4">
              <input type="hidden" name="customerId" value={reassigningCustomer.id} />

              <div className="rounded-2xl bg-purple-50/70 border border-purple-200/80 p-3.5">
                <p className="text-xs font-bold text-purple-900">
                  Customer: <span className="font-extrabold text-navy">{reassigningCustomer.name}</span>
                </p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Current Salesman: <span className="font-bold">{salesman.name}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign To Salesman *
                </label>
                <select
                  name="toSalesmanId"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                >
                  <option value="" disabled>Select target salesman...</option>
                  <option value="">Unassign (Remove Salesman)</option>
                  {otherSalesmen.map((os) => (
                    <option key={os.id} value={os.id}>
                      {os.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Reassignment (Audit Log) *
                </label>
                <input
                  name="reason"
                  required
                  placeholder="e.g. Territory reorganization, Salesman requested transfer..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassigningCustomer(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-sm"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
