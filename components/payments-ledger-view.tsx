"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, CreditCard, ArrowRight } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export interface PaymentRecord {
  id: string;
  amount: number;
  mode: string;
  referenceNo: string | null;
  paidAt: string; // ISO string
  order: {
    id: string;
    orderNo: string;
    customer: {
      name: string;
      companyName: string | null;
    };
  };
  createdBy: {
    name: string;
  } | null;
}

export function PaymentsLedgerView({
  payments,
  totalFilteredAmount,
}: {
  payments: PaymentRecord[];
  totalFilteredAmount: number;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const totalPages = Math.ceil(payments.length / pageSize) || 1;
  const paginated = payments.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCSV = () => {
    const headers = [
      "Payment Date & Time",
      "Order Number",
      "Customer / Builder",
      "Payment Mode",
      "UTR / Reference No",
      "Recorded By",
      "Amount (INR)",
    ];

    const rows = payments.map((p) => [
      `"${formatDateTime(p.paidAt)}"`,
      `"${p.order.orderNo}"`,
      `"${p.order.customer.companyName || p.order.customer.name}"`,
      `"${p.mode}"`,
      `"${p.referenceNo || "—"}"`,
      `"${p.createdBy?.name || "Super Admin"}"`,
      p.amount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `swarnim_payments_ledger_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
      {/* Sub-header with Total Filtered Receipts & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Filtered Total:{" "}
            <strong className="text-emerald-700 font-black text-sm">
              {formatCurrency(totalFilteredAmount)}
            </strong>
          </span>
          <span className="text-xs text-slate-300">|</span>
          <span className="text-xs text-slate-500">
            <strong>{payments.length}</strong> transactions
          </span>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={payments.length === 0}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto disabled:opacity-40 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">Payment Date & Time</th>
              <th className="py-3.5 px-4">Order ID</th>
              <th className="py-3.5 px-4">Customer / Builder</th>
              <th className="py-3.5 px-4">Payment Mode</th>
              <th className="py-3.5 px-4">Transaction UTR / Ref</th>
              <th className="py-3.5 px-4">Recorded By</th>
              <th className="py-3.5 px-4 text-right">Amount Received</th>
              <th className="py-3.5 px-4 text-right">View Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                  {formatDateTime(p.paidAt)}
                </td>

                <td className="py-3.5 px-4">
                  <Link
                    href={`/admin/orders/${p.order.id}`}
                    className="font-bold text-[#13789B] group-hover:underline font-mono"
                  >
                    {p.order.orderNo}
                  </Link>
                </td>

                <td className="py-3.5 px-4 font-bold text-navy">
                  {p.order.customer.companyName || p.order.customer.name}
                </td>

                <td className="py-3.5 px-4">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-navy text-[10px]">
                    {p.mode}
                  </span>
                </td>

                <td className="py-3.5 px-4 font-mono text-slate-600">
                  {p.referenceNo ? (
                    <span className="text-slate-800 font-medium">{p.referenceNo}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                <td className="py-3.5 px-4 text-slate-600 font-medium">
                  {p.createdBy?.name || "Super Admin"}
                </td>

                <td className="py-3.5 px-4 text-right font-black text-sm text-emerald-700 whitespace-nowrap">
                  +{formatCurrency(p.amount)}
                </td>

                <td className="py-3.5 px-4 text-right">
                  <Link
                    href={`/admin/orders/${p.order.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#13789B] hover:bg-[#13789B] hover:text-white transition-all shadow-2xs"
                  >
                    <span>Order</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / Tablet Responsive Cards */}
      <div className="lg:hidden divide-y divide-slate-100">
        {paginated.map((p) => (
          <div key={p.id} className="p-4 space-y-2.5 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-xs text-[#13789B]">
                  {p.order.orderNo}
                </span>
                <p className="font-bold text-xs text-navy mt-0.5">
                  {p.order.customer.companyName || p.order.customer.name}
                </p>
              </div>
              <span className="font-black text-sm text-emerald-700">
                +{formatCurrency(p.amount)}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-navy text-[10px]">
                {p.mode}
              </span>
              <span>{formatDateTime(p.paidAt)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono truncate max-w-[180px]">
                Ref: {p.referenceNo || "—"}
              </span>
              <Link
                href={`/admin/orders/${p.order.id}`}
                className="font-bold text-[#13789B] flex items-center gap-0.5 hover:underline"
              >
                View Order →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {payments.length === 0 && (
        <div className="p-12 text-center text-slate-400">
          <CreditCard className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-navy">No Payment Receipts Found</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            No payments matched your search query, payment mode, or date range.
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50/50 text-xs">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-navy hover:bg-white transition-all disabled:opacity-40"
          >
            ← Previous
          </button>
          <div className="font-semibold text-slate-500">
            Page <span className="font-bold text-navy">{page}</span> of{" "}
            <span className="font-bold text-navy">{totalPages}</span>
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-navy hover:bg-white transition-all disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
