"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Share2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Send,
  MessageCircle,
  Mail,
  History,
  Activity,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  getOrderQrDetailsAction,
  getOrCreateOrderQrAction,
  regenerateOrderQrAction,
  revokeOrderQrAction,
  restoreOrderQrAction,
  logOrderQrShareAction,
  sendOrderQrEmailAction,
} from "@/lib/actions/order-qr";
import { formatDateTime } from "@/lib/utils";

export interface OrderQrModalProps {
  orderId: string;
  orderNo: string;
  customerName?: string;
  onClose: () => void;
  onStatusChange?: () => void;
}

export function OrderQrModal({
  orderId,
  orderNo,
  customerName,
  onClose,
  onStatusChange,
}: OrderQrModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"QR" | "ACTIVITY" | "SECURITY">("QR");

  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailFeedback, setEmailFeedback] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [revokeReason, setRevokeReason] = useState("");
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Load QR details on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        let res = await getOrderQrDetailsAction(orderId);
        if (!res) {
          // If no QR yet, generate one
          const created = await getOrCreateOrderQrAction(orderId);
          res = await getOrderQrDetailsAction(orderId);
        }
        if (mounted && res) {
          setData(res);
          if (res.customer?.email) {
            setEmailInput(res.customer.email);
          }
        }
      } catch (err: any) {
        console.error("Failed to load QR details:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  // Copy QR Link
  const handleCopyLink = async () => {
    if (!data?.qrUrl) return;
    try {
      await navigator.clipboard.writeText(data.qrUrl);
      setCopied(true);
      startTransition(async () => {
        await logOrderQrShareAction(orderId, "COPY_LINK");
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Download PNG
  const handleDownloadPng = () => {
    if (!data?.dataUrl) return;
    const a = document.createElement("a");
    a.href = data.dataUrl;
    a.download = `QR-${orderNo}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download SVG
  const handleDownloadSvg = () => {
    if (!data?.svg) return;
    const blob = new Blob([data.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-${orderNo}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print QR Sticker
  const handlePrintSticker = () => {
    if (!data) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order QR Sticker - ${orderNo}</title>
          <style>
            @page { size: auto; margin: 8mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 10px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              color: #0f172a;
            }
            .card {
              border: 2px solid #0f172a;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              width: 320px;
              background: #fff;
            }
            .header {
              font-weight: 900;
              font-size: 15px;
              letter-spacing: -0.5px;
              margin-bottom: 2px;
            }
            .sub {
              font-size: 10px;
              color: #64748b;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 16px;
            }
            .qr-img {
              width: 200px;
              height: 200px;
              margin: 0 auto;
              display: block;
            }
            .order-no {
              font-size: 18px;
              font-weight: 900;
              font-family: monospace;
              margin: 14px 0 4px;
            }
            .customer {
              font-size: 12px;
              font-weight: 800;
              color: #334155;
            }
            .footer {
              font-size: 9px;
              color: #94a3b8;
              margin-top: 14px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">SWARNIM AAC BLOCK</div>
            <div class="sub">Official Digital Order QR</div>
            <img class="qr-img" src="${data.dataUrl}" alt="Order QR" />
            <div class="order-no">${orderNo}</div>
            <div class="customer">${data.customer?.name || customerName || "Authorized Consignee"}</div>
            <div class="footer">Scan to verify material manifest, delivery & live status</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    if (!data?.whatsappText) return;
    const phone = data.customer?.mobile ? data.customer.mobile.replace(/\D/g, "") : "";
    const cleanPhone = phone.startsWith("91") ? phone : phone.length === 10 ? `91${phone}` : phone;
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(data.whatsappText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(data.whatsappText)}`;

    startTransition(async () => {
      await logOrderQrShareAction(orderId, "WHATSAPP", cleanPhone || undefined);
    });

    window.open(url, "_blank");
  };

  // Email Send
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      setEmailFeedback({ type: "error", msg: "Please enter a valid email address." });
      return;
    }
    setEmailFeedback(null);

    startTransition(async () => {
      try {
        const res = await sendOrderQrEmailAction(orderId, emailInput);
        if (res.success) {
          setEmailFeedback({ type: "success", msg: res.message });
        } else {
          setEmailFeedback({
            type: res.isConfigMissing ? "info" : "error",
            msg: res.message,
          });
        }
      } catch (err: any) {
        setEmailFeedback({ type: "error", msg: err.message || "Failed to send email." });
      }
    });
  };

  // Regenerate QR
  const handleRegenerate = () => {
    startTransition(async () => {
      try {
        await regenerateOrderQrAction(orderId, "Regenerated by Admin via QR Modal");
        setShowRegenerateConfirm(false);
        // Refresh details
        const updated = await getOrderQrDetailsAction(orderId);
        setData(updated);
        if (onStatusChange) onStatusChange();
      } catch (err: any) {
        alert(err.message || "Failed to regenerate QR code");
      }
    });
  };

  // Revoke QR
  const handleRevoke = () => {
    startTransition(async () => {
      try {
        await revokeOrderQrAction(orderId, revokeReason || "Revoked by Super Admin");
        setShowRevokeConfirm(false);
        setRevokeReason("");
        // Refresh details
        const updated = await getOrderQrDetailsAction(orderId);
        setData(updated);
        if (onStatusChange) onStatusChange();
      } catch (err: any) {
        alert(err.message || "Failed to revoke QR code");
      }
    });
  };

  // Restore QR
  const handleRestore = () => {
    startTransition(async () => {
      try {
        await restoreOrderQrAction(orderId);
        const updated = await getOrderQrDetailsAction(orderId);
        setData(updated);
        if (onStatusChange) onStatusChange();
      } catch (err: any) {
        alert(err.message || "Failed to restore QR code");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#13789B] text-white shadow-xs">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Order QR Management</span>
                <span className="text-xs font-mono font-bold text-[#13789B] bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                  {orderNo}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Customer: <strong className="text-slate-700">{data?.customer?.name || customerName || "Customer"}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200/80 px-5 sm:px-6 bg-white gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("QR")}
            className={`py-2.5 px-3 text-xs font-extrabold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "QR"
                ? "border-[#13789B] text-[#13789B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>QR Code & Actions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ACTIVITY")}
            className={`py-2.5 px-3 text-xs font-extrabold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "ACTIVITY"
                ? "border-[#13789B] text-[#13789B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Audit & Scans</span>
            {data?.totalScans > 0 && (
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                {data.totalScans}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SECURITY")}
            className={`py-2.5 px-3 text-xs font-extrabold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "SECURITY"
                ? "border-[#13789B] text-[#13789B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Security Controls</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-[#13789B]" />
              <p className="text-xs font-bold">Loading cryptographically verified QR code...</p>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Failed to load QR code. Please try again.
            </div>
          ) : activeTab === "QR" ? (
            /* ===============================================================
               TAB 1: QR PREVIEW & SHARING ACTIONS
            =============================================================== */
            <div className="space-y-5">
              {/* Status Banner if Revoked */}
              {data.qr.status === "REVOKED" && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-900 text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold">This Order QR Code is Revoked</strong>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Scanners will see an access revoked warning. You can restore or regenerate it in Security Controls.
                    </p>
                  </div>
                </div>
              )}

              {/* QR Image & URL Card */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90">
                {/* QR Canvas / Image */}
                <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-sm shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.dataUrl}
                    alt={`QR Code for ${orderNo}`}
                    className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-xl"
                  />
                </div>

                {/* QR Metadata & Link */}
                <div className="flex-1 space-y-3 min-w-0 w-full text-center sm:text-left">
                  <div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          data.qr.status === "ACTIVE"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}
                      >
                        {data.qr.status}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Generated {formatDateTime(data.qr.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5">
                      Scannable on any smartphone camera to open the complete, responsive order manifest.
                    </p>
                  </div>

                  {/* 1-Click Copy Link Bar */}
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <input
                      type="text"
                      readOnly
                      value={data.qrUrl}
                      className="text-[11px] font-mono text-slate-600 bg-transparent flex-1 px-2 outline-none select-all truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 rounded-lg bg-[#13789B] text-white text-[11px] font-bold shrink-0 hover:bg-[#0f607d] transition flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                    <a
                      href={data.qrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="Open Order Details Page"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-[#13789B]" />
                  <span>Download PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-purple-600" />
                  <span>Download SVG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintSticker}
                  className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Print Sticker</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="p-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 shadow-2xs transition flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <span>Share WhatsApp</span>
                </button>
              </div>

              {/* Email Delivery Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-600" />
                  <span className="text-xs font-black uppercase text-slate-800">
                    Send QR Link via Email
                  </span>
                </div>
                <form onSubmit={handleSendEmail} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="customer@example.com"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#13789B]"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    <span>Send Email</span>
                  </button>
                </form>

                {emailFeedback && (
                  <p
                    className={`text-xs p-2 rounded-xl ${
                      emailFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : emailFeedback.type === "info"
                        ? "bg-sky-50 text-sky-800 border border-sky-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {emailFeedback.msg}
                  </p>
                )}
              </div>
            </div>
          ) : activeTab === "ACTIVITY" ? (
            /* ===============================================================
               TAB 2: SCAN ACTIVITY & SHARE LOGS
            =============================================================== */
            <div className="space-y-5 text-xs">
              {/* Scan Log History */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-slate-800 uppercase tracking-wider">
                    <Activity className="h-4 w-4 text-[#13789B]" />
                    <span>Scan Activity Log ({data.totalScans} Total Scans)</span>
                  </div>
                </div>

                {data.scanLogs && data.scanLogs.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {data.scanLogs.map((s: any) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 block">{formatDateTime(s.scannedAt)}</span>
                          <span className="text-[10px] text-slate-400 truncate block font-mono">
                            {s.userAgent || "Standard Browser / Scanner"}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            s.result === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {s.result}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 rounded-xl bg-slate-50 text-slate-400 text-center italic">
                    No scans recorded yet for this order QR.
                  </p>
                )}
              </div>

              {/* Share Log History */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 font-black text-slate-800 uppercase tracking-wider">
                  <History className="h-4 w-4 text-purple-600" />
                  <span>Sharing History ({data.totalShares} Shares)</span>
                </div>

                {data.shareLogs && data.shareLogs.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {data.shareLogs.map((l: any) => (
                      <div
                        key={l.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span>{l.channel}</span>
                            {l.recipient && (
                              <span className="font-mono text-slate-500 font-normal">
                                ({l.recipient})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Sent by {l.sentByName || "Admin"} • {formatDateTime(l.createdAt)}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 rounded-xl bg-slate-50 text-slate-400 text-center italic">
                    No outbound shares logged yet.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* ===============================================================
               TAB 3: SECURITY CONTROLS (REGENERATE / REVOKE / RESTORE)
            =============================================================== */
            <div className="space-y-5 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="h-4 w-4 text-amber-700" />
                  <span>Administrative Security Controls</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Only Super Admins can revoke access tokens or generate replacement QR codes. Action events are permanently recorded in the immutable audit log.
                </p>
              </div>

              {/* Status toggle: Revoke vs Restore */}
              {data.qr.status === "ACTIVE" ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">Revoke QR Code Access</h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Immediately prevents anyone scanning this QR code from viewing order details.
                    </p>
                  </div>

                  {showRevokeConfirm ? (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                      <p className="font-bold text-rose-800">Provide revocation reason:</p>
                      <input
                        type="text"
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder="e.g. Order cancelled, address changed, or replacement sent"
                        className="w-full px-3 py-1.5 rounded-lg border border-rose-200 text-xs bg-white"
                      />
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setShowRevokeConfirm(false)}
                          className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleRevoke}
                          disabled={isPending}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                        >
                          Confirm Revoke
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowRevokeConfirm(true)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold transition flex items-center gap-1.5"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span>Revoke QR Access</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <h4 className="font-black text-emerald-900 text-sm">Restore QR Code</h4>
                  <p className="text-emerald-700 text-xs">
                    This QR code is currently Revoked. Re-activating it will restore instant scanning access.
                  </p>
                  <button
                    type="button"
                    onClick={handleRestore}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Restore Active Status</span>
                  </button>
                </div>
              )}

              {/* Regenerate with new secure token */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Regenerate Fresh QR Token</h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Creates a completely new 32-character secure random token. The previous QR code will immediately become invalid.
                  </p>
                </div>

                {showRegenerateConfirm ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <p className="font-bold text-amber-900">
                      Are you sure you want to regenerate this Order QR code?
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Any existing physical printouts or previously shared links will stop working.
                    </p>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRegenerateConfirm(false)}
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleRegenerate}
                        disabled={isPending}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                      >
                        Confirm Regenerate
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRegenerateConfirm(true)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4 text-[#13789B]" />
                    <span>Regenerate QR Code</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            Token: {data?.qr?.token?.slice(0, 16)}...
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
