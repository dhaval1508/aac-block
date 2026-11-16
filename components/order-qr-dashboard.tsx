"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  QrCode,
  Search,
  Filter,
  RefreshCw,
  Download,
  Printer,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Boxes,
  PlusCircle,
  Building2,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import { OrderQrModal } from "@/components/order-qr-modal";
import { bulkGenerateMissingOrderQrsAction } from "@/lib/actions/order-qr";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";

export interface QrDashboardOrder {
  id: string;
  orderNo: string;
  createdAt: string;
  status: string;
  totalCbm?: number | null;
  quantity: number;
  customer?: {
    id: string;
    name: string;
    mobile: string;
    companyName?: string | null;
  } | null;
  qrCode?: {
    id: string;
    token: string;
    status: string;
    createdAt: string;
    _count?: {
      scanLogs: number;
      shareLogs: number;
    };
  } | null;
}

export interface OrderQrDashboardProps {
  orders: QrDashboardOrder[];
  stats: {
    totalOrders: number;
    ordersWithQr: number;
    ordersWithoutQr: number;
    activeQrs: number;
    revokedQrs: number;
    expiredQrs: number;
    totalScans: number;
    totalShares: number;
  };
}

export function OrderQrDashboard({ orders: initialOrders, stats: initialStats }: OrderQrDashboardProps) {
  const [orders, setOrders] = useState<QrDashboardOrder[]>(initialOrders);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "MISSING" | "REVOKED">("ALL");

  const [selectedOrderForQr, setSelectedOrderForQr] = useState<QrDashboardOrder | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Search match
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.orderNo.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q) ||
        o.customer?.companyName?.toLowerCase().includes(q) ||
        o.customer?.mobile?.includes(q) ||
        o.id.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // 2. Status filter
      if (statusFilter === "ACTIVE") return o.qrCode && o.qrCode.status === "ACTIVE";
      if (statusFilter === "MISSING") return !o.qrCode;
      if (statusFilter === "REVOKED") return o.qrCode && o.qrCode.status === "REVOKED";

      return true;
    });
  }, [orders, search, statusFilter]);

  // Bulk Generate Missing QRs
  const handleBulkGenerate = () => {
    setBulkFeedback(null);
    startTransition(async () => {
      try {
        const res = await bulkGenerateMissingOrderQrsAction();
        setBulkFeedback(res.message);
        if (res.count > 0) {
          // Update local state
          setStats((prev) => ({
            ...prev,
            ordersWithQr: prev.totalOrders,
            ordersWithoutQr: 0,
            activeQrs: prev.activeQrs + res.count,
          }));
        }
      } catch (err: any) {
        setBulkFeedback("Error generating QR codes: " + err.message);
      }
    });
  };

  const handleCopy = async (token: string) => {
    const url = `https://aac-block-management.vercel.app/order-qr/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          SUMMARY METRICS CARDS
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Orders */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Orders</span>
            <Boxes className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {stats.totalOrders}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">In system database</span>
        </div>

        {/* Active QR Codes */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active QRs</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {stats.activeQrs}
          </p>
          <span className="text-[10px] text-emerald-600 font-bold block truncate">
            {stats.totalOrders > 0 ? `${Math.round((stats.activeQrs / stats.totalOrders) * 100)}% Coverage` : "0%"}
          </span>
        </div>

        {/* Missing QRs */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Missing QRs</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-700 font-mono">
            {stats.ordersWithoutQr}
          </p>
          <span className="text-[10px] text-amber-600 font-bold block truncate">
            {stats.ordersWithoutQr > 0 ? "Action Recommended" : "All Provisioned"}
          </span>
        </div>

        {/* Revoked QRs */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Revoked QRs</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
            {stats.revokedQrs}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">Access disabled</span>
        </div>

        {/* Total Scans */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#13789B]">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Scans</span>
            <Activity className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#13789B] font-mono">
            {stats.totalScans}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">Audited camera scans</span>
        </div>

        {/* Total Outbound Shares */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shares Sent</span>
            <Share2 className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-700 font-mono">
            {stats.totalShares}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">WhatsApp & Email</span>
        </div>
      </div>

      {/* =========================================================================
          TOOLBAR: SEARCH, FILTER & BULK ACTIONS
      ========================================================================= */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order No (e.g. SWA-2026-1001), Customer, Mobile..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 text-xs font-medium placeholder:text-slate-400 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13789B] transition"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { key: "ALL", label: `All (${orders.length})` },
                { key: "ACTIVE", label: `Active (${stats.activeQrs})` },
                { key: "MISSING", label: `Missing (${stats.ordersWithoutQr})` },
                { key: "REVOKED", label: `Revoked (${stats.revokedQrs})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-[#13789B] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bulk Generate Missing Button */}
          {stats.ordersWithoutQr > 0 && (
            <button
              type="button"
              onClick={handleBulkGenerate}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>Provision Missing QRs ({stats.ordersWithoutQr})</span>
            </button>
          )}
        </div>

        {bulkFeedback && (
          <p className="text-xs p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            {bulkFeedback}
          </p>
        )}
      </div>

      {/* =========================================================================
          ORDER QR LIST (DESKTOP TABLE & MOBILE CARDS)
      ========================================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Order Details</th>
                <th className="py-3.5 px-4">Customer & Entity</th>
                <th className="py-3.5 px-4 text-center">Volume (CBM)</th>
                <th className="py-3.5 px-4 text-center">QR Status</th>
                <th className="py-3.5 px-4 text-center">Scans</th>
                <th className="py-3.5 px-4 text-right">QR Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord, idx) => {
                  const hasQr = Boolean(ord.qrCode);
                  const qrToken = ord.qrCode?.token;
                  const qrStatus = ord.qrCode?.status || "MISSING";
                  const scanCount = ord.qrCode?._count?.scanLogs || 0;
                  const shareCount = ord.qrCode?._count?.shareLogs || 0;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Order Number & Date */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className="font-black text-sm text-slate-900 hover:text-[#13789B] font-mono block"
                        >
                          {ord.orderNo}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDate(ord.createdAt)} • {ord.status}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900 text-xs">
                          {ord.customer?.companyName || ord.customer?.name || "Direct Customer"}
                        </p>
                        {ord.customer?.mobile && (
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {ord.customer.mobile}
                          </span>
                        )}
                      </td>

                      {/* Total Volume */}
                      <td className="py-3.5 px-4 text-center font-mono font-black text-slate-800">
                        {ord.totalCbm ? `${Number(ord.totalCbm).toFixed(3)} m³` : `${ord.quantity} units`}
                      </td>

                      {/* QR Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            qrStatus === "ACTIVE"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : qrStatus === "REVOKED"
                              ? "bg-rose-50 border-rose-200 text-rose-800"
                              : "bg-slate-100 border-slate-200 text-slate-500"
                          }`}
                        >
                          {qrStatus}
                        </span>
                      </td>

                      {/* Scans Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
                          <Activity className="h-3 w-3 text-slate-400" />
                          <span>{scanCount}</span>
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForQr(ord)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#13789B] hover:bg-[#0f607d] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            <span>Manage QR</span>
                          </button>

                          {qrToken && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopy(qrToken)}
                                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                                title="Copy Public QR Link"
                              >
                                {copiedToken === qrToken ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>

                              <Link
                                href={`/order-qr/${qrToken}`}
                                target="_blank"
                                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                                title="Open Public Scan View"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs italic">
                    No orders matching search filter found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden divide-y divide-slate-100 p-4 space-y-3">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((ord) => {
              const qrToken = ord.qrCode?.token;
              const qrStatus = ord.qrCode?.status || "MISSING";
              const scanCount = ord.qrCode?._count?.scanLogs || 0;

              return (
                <div key={ord.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/admin/orders/${ord.id}`}
                        className="font-black text-sm text-slate-900 font-mono hover:text-[#13789B]"
                      >
                        {ord.orderNo}
                      </Link>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {ord.customer?.companyName || ord.customer?.name || "Customer"}
                      </p>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDate(ord.createdAt)} • {ord.status}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        qrStatus === "ACTIVE"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : qrStatus === "REVOKED"
                          ? "bg-rose-50 border-rose-200 text-rose-800"
                          : "bg-slate-100 border-slate-200 text-slate-500"
                      }`}
                    >
                      {qrStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 font-mono">
                    <span className="text-slate-500">
                      Volume: <strong className="text-slate-800">{ord.totalCbm ? `${Number(ord.totalCbm).toFixed(3)} m³` : `${ord.quantity} units`}</strong>
                    </span>
                    <span className="text-slate-500">
                      Scans: <strong className="text-[#13789B]">{scanCount}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForQr(ord)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#13789B] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Manage QR</span>
                    </button>

                    {qrToken && (
                      <Link
                        href={`/order-qr/${qrToken}`}
                        target="_blank"
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                        title="Open Scan View"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No orders found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Selected Order QR Modal */}
      {selectedOrderForQr && (
        <OrderQrModal
          orderId={selectedOrderForQr.id}
          orderNo={selectedOrderForQr.orderNo}
          customerName={selectedOrderForQr.customer?.name}
          onClose={() => setSelectedOrderForQr(null)}
          onStatusChange={() => {
            // refresh
          }}
        />
      )}
    </div>
  );
}

