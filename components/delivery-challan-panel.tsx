"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  MessageCircle,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Truck,
} from "lucide-react";
import { formatNumber, normalizeWhatsAppPhone, mapsHref } from "@/lib/utils";
import { generateDeliveryChallanAction } from "@/lib/actions/orders";
import { OpenLocationButton } from "@/components/open-location-button";

interface Props {
  order: {
    id: string;
    orderNo: string;
    status: string;
    dcNumber?: string | null;
    invoiceNo?: string | null;
    totalCbm?: any;
    quantity: number;
    adhesiveBags?: number | null;
    deliveryAddress: string;
    customer?: {
      name: string;
      companyName?: string | null;
      mobile: string;
    } | null;
    product?: {
      name?: string | null;
      sizeLabel?: string | null;
      dimensions?: string | null;
    } | null;
    items?: Array<{
      id: string;
      productName: string;
      sizeLabel?: string | null;
      dimensions?: string | null;
      quantity: number;
      cbmPerUnit?: any;
      totalCbm?: any;
      productType?: string | null;
    }> | null;
    transport?: {
      truckNumber?: string | null;
      driverName?: string | null;
      driverMobile?: string | null;
      transporterName?: string | null;
    } | null;
    weighbridgeSlip?: {
      netWeightKg?: any;
      rstNumber?: string | null;
    } | null;
    loadingRecord?: {
      netWeight?: any;
      rstNumber?: string | null;
    } | null;
  };
  userRole: "ADMIN" | "STAFF" | "STOCKER";
}

export function DeliveryChallanPanel({ order, userRole }: Props) {
  const challanNo = order.dcNumber || order.invoiceNo || null;
  const isConfirmedOrBeyond = ![
    "PENDING",
    "CANCELLED",
    "REJECTED",
  ].includes(order.status);

  const netWeight =
    order.weighbridgeSlip?.netWeightKg
      ? Number(order.weighbridgeSlip.netWeightKg)
      : order.loadingRecord?.netWeight
      ? Number(order.loadingRecord.netWeight)
      : null;

  const rstNumber =
    order.weighbridgeSlip?.rstNumber || order.loadingRecord?.rstNumber || null;

  // Build WhatsApp Share Message with ALL material items
  const waChallanHref = React.useMemo(() => {
    const mobile = order.customer?.mobile || order.transport?.driverMobile;
    if (!mobile) return "";
    const cleanPhone = normalizeWhatsAppPhone(mobile);
    if (!cleanPhone) return "";

    const mapsLink = mapsHref(order.deliveryAddress);
    const materialLines: string[] = [];

    if (order.items && order.items.length > 0) {
      order.items.forEach((it) => {
        const isBlock = it.productType === "AAC_BLOCK" || (!it.productType && it.totalCbm);
        if (isBlock) {
          materialLines.push(
            `• ${it.productName || "AAC Block"} ${it.sizeLabel ? `(${it.sizeLabel})` : ""}: ${
              it.totalCbm ? `${Number(it.totalCbm).toFixed(3)} CBM` : ""
            } (≈ ${it.quantity.toLocaleString()} Blocks)`
          );
        } else {
          materialLines.push(`• ${it.productName || "Block Jointing Morter"}: ${it.quantity} Bags (40 KG)`);
        }
      });
    }

    const lines = [
      `*SWARNIM AAC BLOCK - MATERIAL DELIVERY CHALLAN*`,
      `Delivery Challan: ${challanNo || "Pending Generation"}`,
      `Order Ref: ${order.orderNo}`,
      `Customer / Consignee: ${order.customer?.companyName || order.customer?.name || "Client"}`,
      order.totalCbm ? `Total Volume: ${Number(order.totalCbm).toFixed(3)} CBM (≈ ${order.quantity.toLocaleString()} Blocks)` : null,
      order.adhesiveBags ? `Jointing Morter: ${order.adhesiveBags} Bags (40 KG)` : null,
      materialLines.length > 0 ? `\n*Material Breakdown:*\n${materialLines.join("\n")}` : null,
      order.transport?.truckNumber ? `Vehicle Number: ${order.transport.truckNumber}` : null,
      order.transport?.driverName ? `Driver: ${order.transport.driverName} (${order.transport.driverMobile || ""})` : null,
      netWeight ? `Certified Net Weight: ${netWeight.toLocaleString()} KG` : null,
      `Delivery Site: ${order.deliveryAddress}`,
      mapsLink ? `Google Maps: ${mapsLink}` : null,
      `HSN Classification: 6810 (AAC Blocks) · 38245090 (Jointing Morter)`,
      `Status: ${order.status}`,
    ].filter(Boolean);

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [order, challanNo, netWeight]);

  if (!isConfirmedOrBeyond) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4 border-l-4 border-l-emerald-600 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-2xs">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-navy truncate">
              Delivery Challan Documentation
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              Official Material Delivery Challan & Dispatch Slip
            </p>
          </div>
        </div>

        {challanNo ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-mono text-xs font-black text-emerald-800 self-start sm:self-auto shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{challanNo}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800 self-start sm:self-auto shrink-0">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Challan: Pending Generation</span>
          </span>
        )}
      </div>

      {challanNo ? (
        <>
          <p className="text-xs text-slate-500">
            Official material consignment document issued under Challan #{challanNo} for Order Ref #{order.orderNo}.
          </p>

          {/* Details Grid */}
          <div className="rounded-2xl bg-slate-50 p-3.5 sm:p-4 space-y-2.5 text-xs border border-slate-100 min-w-0">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-semibold">Challan / Slip Number</span>
              <strong className="font-mono font-black text-navy text-sm sm:text-base truncate">
                {challanNo}
              </strong>
            </div>

            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-semibold">Order Volume</span>
              <div className="text-right">
                <strong className="font-bold text-navy block">
                  {order.totalCbm
                    ? `${Number(order.totalCbm).toFixed(3)} CBM`
                    : `${formatNumber(order.quantity)} units`}
                </strong>
                <span className="text-[11px] text-slate-400 italic">
                  ≈ {formatNumber(order.quantity)} Blocks
                </span>
              </div>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="py-2 border-y border-slate-200/60 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  All Consigned Material Items ({order.items.length})
                </span>
                {order.items.map((it) => (
                  <div key={it.id} className="flex justify-between items-center text-[11px]">
                    <span className="text-navy font-semibold truncate">
                      {it.productName || "AAC Block"} {it.sizeLabel ? `(${it.sizeLabel})` : ""}
                    </span>
                    <span className="font-mono text-slate-700 shrink-0">
                      {it.totalCbm ? `${Number(it.totalCbm).toFixed(3)} CBM` : `${it.quantity} Bags`}
                      {it.totalCbm ? ` (≈ ${it.quantity} blk)` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-semibold">Block Jointing Morter</span>
              <strong className="font-bold text-navy">
                {order.adhesiveBags ?? 0} Bags (40 KG)
              </strong>
            </div>

            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-semibold">HSN Classification</span>
              <strong className="font-mono text-slate-700">
                6810 (AAC Blocks) · 38245090 (Jointing Morter)
              </strong>
            </div>

            {order.transport?.truckNumber && (
              <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-500 font-semibold">Staged Vehicle & Driver</span>
                <strong className="font-mono text-navy font-bold truncate">
                  {order.transport.truckNumber} ({order.transport.driverName || "Driver"})
                </strong>
              </div>
            )}

            {netWeight !== null && (
              <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-500 font-semibold">Certified Net Weight</span>
                <strong className="font-mono text-emerald-700 font-black">
                  {netWeight.toLocaleString()} KG {rstNumber ? `(RST #${rstNumber})` : ""}
                </strong>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 pt-1.5 border-t border-slate-200/60">
              <span className="text-slate-500 font-semibold">Delivery Site & Map</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-navy font-semibold truncate max-w-xs">{order.deliveryAddress}</span>
                <OpenLocationButton address={order.deliveryAddress} variant="badge" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <Link
              href={`/invoice/${order.id}`}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0f607d] py-3 text-xs font-black text-white shadow-md shadow-[#13789B]/20 transition-all cursor-pointer active:scale-[0.99]"
            >
              <Printer className="h-4 w-4" />
              <span>View / Print Official Delivery Challan</span>
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={`/api/orders/${order.id}/summary-pdf`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-900 py-2.5 text-xs font-bold text-white shadow-2xs transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Download Challan PDF</span>
              </a>

              {waChallanHref ? (
                <a
                  href={waChallanHref}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-2xs transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Send Challan Slip on WhatsApp</span>
                </a>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                Delivery Challan: Pending Generation
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Order is confirmed. A canonical delivery challan will be generated atomically with series number (e.g. SAB/DC/0001). You can generate the official challan number now.
              </p>
            </div>
          </div>

          <form action={generateDeliveryChallanAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Official Delivery Challan Now</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
