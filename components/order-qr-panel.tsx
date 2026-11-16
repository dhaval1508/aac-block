"use client";

import React, { useState } from "react";
import {
  QrCode,
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
} from "lucide-react";
import { OrderQrModal } from "@/components/order-qr-modal";
import { logOrderQrShareAction } from "@/lib/actions/order-qr";

export interface OrderQrPanelProps {
  orderId: string;
  orderNo: string;
  customerName?: string;
  qrToken?: string | null;
  qrStatus?: string | null;
  scanCount?: number;
}

export function OrderQrPanel({
  orderId,
  orderNo,
  customerName,
  qrToken,
  qrStatus = "ACTIVE",
  scanCount = 0,
}: OrderQrPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrUrl = qrToken
    ? `https://aac-block-management.vercel.app/order-qr/${qrToken}`
    : null;

  const handleCopy = async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      await logOrderQrShareAction(orderId, "COPY_LINK");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareWhatsApp = () => {
    if (!qrUrl) return;
    const text = encodeURIComponent(
      `*SWARNIM AAC BLOCK PRIVATE LIMITED*\nOfficial Order QR Code & Verification\n\nOrder No: ${orderNo}\nCustomer: ${customerName || "Customer"}\n\nView complete order details & delivery tracking:\n${qrUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <>
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#13789B]">
              <QrCode className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Digital Order QR Code
              </h2>
              <p className="text-[11px] text-slate-500">
                Official encrypted tracking & verification token
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
              qrStatus === "ACTIVE"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {qrStatus}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
          <div
            onClick={() => setShowModal(true)}
            className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs hover:border-[#13789B] transition cursor-pointer shrink-0 text-center group"
            title="Click to expand Order QR Code"
          >
            <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-2xs border border-slate-100">
              <QrCode className="w-16 h-16 text-slate-800 group-hover:text-[#13789B] transition" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#13789B] mt-1 block">
              Expand QR
            </span>
          </div>

          <div className="flex-1 space-y-2.5 min-w-0 text-center sm:text-left">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Public Order Portal URL</span>
              <p className="font-mono text-xs text-slate-700 truncate mt-0.5">
                {qrUrl || "Generating secure QR token..."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#13789B] hover:bg-[#0f607d] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Manage QR Code</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!qrUrl}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy Link"}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={!qrUrl}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3 pt-1 text-[11px] text-slate-500 font-mono">
              <span className="inline-flex items-center gap-1">
                <Activity className="h-3 w-3 text-slate-400" />
                <span>Scanned {scanCount} times</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>SHA-256 Entropy</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <OrderQrModal
          orderId={orderId}
          orderNo={orderNo}
          customerName={customerName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
