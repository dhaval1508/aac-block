import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Printer, Truck, CheckCircle2, Package, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerInvoicesPage() {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN"].includes(session.role)) redirect("/login");

  const invoices = await prisma.order.findMany({
    where: {
      customerId: session.id,
      invoiceNo: { not: null },
    },
    orderBy: { confirmedAt: "desc" },
    include: { product: true, transport: true },
  });

  const totalQuantity = invoices.reduce((sum, inv) => sum + inv.quantity, 0);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto min-w-0 max-w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">Material Delivery Challans & Dispatch Slips</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Official factory-certified delivery slips generated upon vehicle dispatch under HSN 6810.
        </p>
      </div>

      {/* Operational Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 min-w-0">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs border-l-4 border-l-[#13789B] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Delivery Challans</span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-navy font-mono">{invoices.length}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Official slips issued</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs border-l-4 border-l-emerald-600 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Blocks Dispatched</span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-800 font-mono">{formatNumber(totalQuantity)}</p>
          <p className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5">Physical blocks staged/delivered</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs border-l-4 border-l-sky-500 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-700">Active Delivery Sites</span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-navy font-mono">{new Set(invoices.map((i) => i.deliveryAddress)).size}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Construction sites served</p>
        </div>
      </div>

      {/* Invoices / Delivery Challans List */}
      <div className="space-y-3.5 min-w-0">
        {invoices.map((inv) => {
          return (
            <div
              key={inv.id}
              className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs hover:border-[#13789B]/50 transition-all min-w-0"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#13789B] border border-sky-100">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-sm sm:text-base font-black text-navy font-mono">{inv.invoiceNo}</span>
                      <span className="text-xs text-slate-400 font-mono">({inv.orderNo})</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                      Issue Date: {formatDate(inv.confirmedAt || inv.createdAt)} • Factory Origin: Plant Yard
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Quality Verified</span>
                  </span>
                  <Link
                    href={`/invoice/${inv.id}`}
                    className="flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl bg-[#13789B] text-white hover:bg-[#0F627F] transition-all shadow-2xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>View & Print</span>
                  </Link>
                </div>
              </div>

              {/* Line item info & breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Product / Size</span>
                  <p className="font-bold text-navy mt-0.5">{inv.product?.sizeLabel || (inv.totalCbm ? `${Number(inv.totalCbm).toFixed(2)} m³` : "Standard")}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{inv.product?.dimensions || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Material Quantity</span>
                  <p className="font-black text-navy mt-0.5 font-mono text-sm">{formatNumber(inv.quantity)} Blocks</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {inv.product ? `${Number(inv.product.cbmPerBlock).toFixed(4)} m³/block` : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">HSN Classification</span>
                  <p className="font-bold text-navy mt-0.5 font-mono text-xs sm:text-sm">6810</p>
                  <p className="text-[11px] text-slate-500">AAC Precast Block</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Assigned Vehicle</span>
                  <p className="font-black text-navy text-sm mt-0.5 font-mono">
                    {inv.transport?.truckNumber || "Yard Staging"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {inv.transport ? `${inv.transport.driverName}` : "Bay loading"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {invoices.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
            <FileText className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-navy text-base">No Delivery Challans Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Official delivery challans are generated automatically upon order approval and vehicle assignment.
            </p>
            <Link
              href="/customer/new-order"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#13789B] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F627F]"
            >
              Place an Order
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
