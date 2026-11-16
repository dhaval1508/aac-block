"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  Layers,
  MapPin,
  Phone,
  MessageCircle,
  Building2,
  FileText,
  Printer,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Download,
  AlertTriangle,
  FileCheck,
  Boxes,
  Calendar,
  CreditCard,
  User,
  Scale,
  QrCode,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatBlockSizeName,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  telHref,
  whatsappHref,
  mapsHref,
} from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import { CompanyProfileData } from "@/lib/company-profile-types";

export interface OrderQrViewProps {
  order: any;
  companyProfile: CompanyProfileData;
  qrDetails: {
    token: string;
    status: string;
    accessPolicy: string;
    createdAt: string;
    scannedAt: string;
    verified: boolean;
    revocationReason?: string | null;
  };
}

export function OrderQrView({ order, companyProfile, qrDetails }: OrderQrViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Swarnim AAC Block Order - ${order.orderNo}`,
          text: `Official order details for ${order.orderNo} (${order.customer?.name || "Customer"})`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const items: any[] = order.items && order.items.length > 0 ? order.items : [];
  const aacBlockItems = items.filter((it) => it.productType === "AAC_BLOCK");
  const mortarItems = items.filter((it) => it.productType !== "AAC_BLOCK");

  const totalCbm = Number(order.totalCbm || 0);
  const totalQty = Number(order.quantity || 0);
  const totalAmount = Number(order.totalAmount || 0);
  const subtotal = Number(order.subtotal || 0);
  const gstAmount = Number(order.gstAmount || 0);
  const paidAmount = Number(order.paidAmount || 0);
  const balanceAmount = Math.max(0, totalAmount - paidAmount);

  // Fallback for single product older orders without items array
  const hasItemsArray = items.length > 0;

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 font-sans print:bg-white print:text-black">
      {/* =========================================================================
          PRINT-ONLY STYLES
      ========================================================================= */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* =========================================================================
          TOP VERIFICATION BAR & ACTIONS (Print-hidden)
      ========================================================================= */}
      <div className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  Verified Order QR Code
                </span>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Scanned {formatDateTime(qrDetails.scannedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print Document</span>
              <span className="sm:hidden">Print</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Share QR Link</span>
              <span className="sm:hidden">Share</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#13789B] hover:bg-[#0f607d] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN ORDER DETAILS CONTAINER
      ========================================================================= */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* =======================================================================
            HEADER: COMPANY BRANDING & LOGO
        ======================================================================= */}
        <header className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 shadow-xs print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center font-black text-xl tracking-tighter shadow-sm shrink-0 border border-slate-800">
                <span>SAB</span>
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-[#0f172a] tracking-tight">
                  {companyProfile.legalName || "SWARNIM AAC BLOCK PRIVATE LIMITED"}
                </h1>
                <p className="text-xs font-semibold text-[#13789B]">
                  Premium Autoclaved Aerated Concrete Blocks & Mortar Solutions
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  GSTIN: <strong className="font-mono text-slate-700">{companyProfile.gstin || "24ABNCS5280K1ZU"}</strong> • State: {companyProfile.state || "Gujarat"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end text-left sm:text-right">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-800">
                <QrCode className="h-3.5 w-3.5 text-[#13789B]" />
                <span>OFFICIAL ORDER MANIFEST</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono mt-1">
                Ref ID: {order.id.slice(0, 14)}...
              </span>
            </div>
          </div>

          {/* Quick Helpline banner */}
          <div className="mt-4 pt-1 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span className="truncate max-w-xl text-[11px]">
                Factory & Yard: {companyProfile.yardAddress || companyProfile.factoryAddress || "Swarnim AAC Manufacturing Plant, Kapadvanj - Kheda, Gujarat"}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <a
                href={telHref(companyProfile.companyMobile || "+917698787476")}
                className="hover:text-[#13789B] font-bold inline-flex items-center gap-1"
              >
                <Phone className="h-3 w-3" />
                <span>Dispatch: {companyProfile.companyMobile || "+91 7698787476"}</span>
              </a>
            </div>
          </div>
        </header>

        {/* =======================================================================
            HERO CARD: ORDER NUMBER, STATUS & KEY METRICS
        ======================================================================= */}
        <section className="rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-5 sm:p-7 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#13789B]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-700/60">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  Order Reference
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wide border shadow-2xs ${
                    ORDER_STATUS_CLASS[order.status as OrderStatus] || "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                  <span>{ORDER_STATUS_LABEL[order.status as OrderStatus] || order.status}</span>
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white font-mono">
                {order.orderNo}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Booked: {formatDateTime(order.createdAt)}</span>
                </span>
                {order.confirmedAt && (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirmed: {formatDate(order.confirmedAt)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Official Document Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 no-print">
              <Link
                href={`/api/orders/${order.id}/summary-pdf`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all shadow-xs"
              >
                <Download className="h-3.5 w-3.5 text-sky-400" />
                <span>Order Summary PDF</span>
              </Link>

              {order.shareToken && (
                <Link
                  href={`/invoice/share/${order.shareToken}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#13789B] hover:bg-[#0f607d] text-xs font-bold text-white transition-all shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Tax Invoice / DC</span>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="relative z-10 pt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Total AAC Volume
              </span>
              <p className="text-lg sm:text-xl font-black text-white font-mono">
                {totalCbm > 0 ? `${totalCbm.toFixed(3)} CBM` : "—"}
              </p>
              <span className="text-[11px] text-slate-400">
                ≈ {totalQty > 0 ? formatNumber(totalQty) : "0"} Blocks
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Jointing Mortar
              </span>
              <p className="text-lg sm:text-xl font-black text-sky-400 font-mono">
                {order.adhesiveBags && order.adhesiveBags > 0
                  ? `${order.adhesiveBags} Bags`
                  : "0 Bags"}
              </p>
              <span className="text-[11px] text-slate-400">
                {order.adhesiveBags ? `${order.adhesiveBags * 40} KG Total` : "No Mortar"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Grand Total (₹)
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                ₹{formatNumber(Math.round(totalAmount))}
              </p>
              <span className="text-[11px] text-slate-400">
                {order.gstBillingSelected ? "Incl. 18% GST" : "Commercial Excl."}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Payment Status
              </span>
              <p className="text-lg sm:text-xl font-black text-white capitalize">
                {order.paymentStatus || "PENDING"}
              </p>
              <span className="text-[11px] text-slate-400">
                Paid: ₹{formatNumber(Math.round(paidAmount))}
              </span>
            </div>
          </div>
        </section>

        {/* =======================================================================
            CUSTOMER & DESTINATION LOGISTICS (2 CARDS)
        ======================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside-avoid">
          {/* Card 1: Customer Information */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#13789B]">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Customer & Consignee
                  </h3>
                  <p className="text-[11px] text-slate-500">Registered account and billing details</p>
                </div>
              </div>
              {order.customer?.id && (
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                  ID: {order.customer.id.slice(0, 10)}
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[11px] uppercase text-slate-400 font-bold">Client / Entity Name</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {order.customer?.companyName || order.customer?.name || "Customer Entity"}
                </p>
                {order.customer?.companyName && order.customer?.name && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    Contact Person: <strong className="text-slate-800">{order.customer.name}</strong>
                  </p>
                )}
              </div>

              {/* Contact Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {order.customer?.mobile && (
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Mobile</span>
                      <a
                        href={telHref(order.customer.mobile)}
                        className="text-xs font-mono font-bold text-[#13789B] hover:underline truncate block"
                      >
                        {order.customer.mobile}
                      </a>
                    </div>
                    <a
                      href={whatsappHref(
                        order.customer.mobile,
                        `Hello ${order.customer?.name || ""}, regarding Swarnim AAC Block order ${order.orderNo}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition no-print"
                      title="Open WhatsApp Chat"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {order.customer?.email && (
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Email</span>
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="text-xs font-bold text-slate-700 hover:underline truncate block"
                      title={order.customer.email}
                    >
                      {order.customer.email}
                    </a>
                  </div>
                )}
              </div>

              {/* GST Verification Badge */}
              {order.gstBillingSelected && (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>GST Registered Tax Invoice</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-emerald-700 block font-semibold">GSTIN</span>
                      <span className="font-mono font-bold text-slate-800">{order.gstNumber || order.customer?.gstin || "—"}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block font-semibold">Registered Entity</span>
                      <span className="font-bold text-slate-800 truncate block">{order.gstRegisteredName || "—"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Address */}
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Registered Billing Address</span>
                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                  {order.customer?.billingAddress || order.deliveryAddress}
                </p>
              </div>

              {/* Sales Representative Attribution */}
              {(order.salesman || order.createdByNameSnapshot) && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Assigned Representative:</span>
                  <span className="font-bold text-slate-800">
                    {order.salesman?.name || order.createdByNameSnapshot || "Factory Sales"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Destination Site & Transport Logistics */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Unloading Site & Logistics
                  </h3>
                  <p className="text-[11px] text-slate-500">Destination site coordinates & transport</p>
                </div>
              </div>
              {order.transport?.truckNumber && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                  <Truck className="h-3 w-3" />
                  <span>{order.transport.truckNumber}</span>
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Destination Unloading Address</span>
                <p className="text-xs font-bold text-slate-800 mt-0.5 leading-relaxed">
                  {order.formattedAddress || order.deliveryAddress}
                </p>
                {(order.city || order.state || order.pincode) && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {[order.city, order.district, order.state, order.pincode].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>

              {/* Google Maps Location Button */}
              {(order.googleMapsUrl || order.deliveryAddress) && (
                <div className="pt-1 no-print">
                  <a
                    href={order.googleMapsUrl || mapsHref(order.deliveryAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition w-full justify-center shadow-2xs"
                  >
                    <MapPin className="h-3.5 w-3.5 text-rose-600" />
                    <span>View Unloading Site on Google Maps</span>
                    <ExternalLink className="h-3 w-3 text-slate-400 ml-1" />
                  </a>
                </div>
              )}

              {/* Transport & Vehicle Details */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  Carrier / Transporter Details
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Vehicle / Truck</span>
                    <strong className="font-mono text-slate-900 block">
                      {order.transport?.truckNumber || "Assigned on Dispatch"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Transporter</span>
                    <strong className="text-slate-900 truncate block">
                      {order.transport?.transporterName || "Swarnim Fleet Logistics"}
                    </strong>
                  </div>
                  {order.transport?.driverName && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">Driver Name</span>
                      <strong className="text-slate-900 block">{order.transport.driverName}</strong>
                    </div>
                  )}
                  {order.transport?.driverMobile && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">Driver Mobile</span>
                      <a
                        href={telHref(order.transport.driverMobile)}
                        className="font-mono font-bold text-[#13789B] hover:underline"
                      >
                        {order.transport.driverMobile}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Weighbridge Slip verification if present */}
              {order.weighbridgeSlip && (
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-indigo-700 font-semibold text-[11px] block">Verified Net Cargo Weight</span>
                    <strong className="text-base font-black text-indigo-950 font-mono">
                      {formatNumber(Number(order.weighbridgeSlip.netWeightKg || 0))} KG
                    </strong>
                    <span className="text-[10px] text-indigo-600 block">
                      ≈ {(Number(order.weighbridgeSlip.netWeightKg || 0) / 1000).toFixed(2)} MT
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 block">
                      RST: {order.weighbridgeSlip.rstNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {order.weighbridgeSlip.weighbridgeName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =======================================================================
            COMPLETE PRODUCT BREAKDOWN SECTION
            (Show EVERY product included in that particular order!)
        ======================================================================= */}
        <section className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden print-break-inside-avoid">
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <Boxes className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Complete Ordered Products & Material Manifest
                </h3>
                <p className="text-[11px] text-slate-500">
                  Itemized specifications, volume (CBM), block quantities, and pricing
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
              Total {items.length > 0 ? items.length : 1} Line Item{items.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Product Description & Specs</th>
                  <th className="py-3 px-4">Dimensions</th>
                  <th className="py-3 px-4 text-center">Unit CBM</th>
                  <th className="py-3 px-4 text-right">Volume (CBM) & Blocks</th>
                  <th className="py-3 px-4 text-right">Rate (₹)</th>
                  <th className="py-3 px-4 text-center">GST</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hasItemsArray ? (
                  items.map((it, idx) => {
                    const isMortar = it.productType !== "AAC_BLOCK";
                    const itemRate = Number(it.rate || 0);
                    const itemGstRate = Number(it.gstRate || 18);
                    const itemTotal = Number(it.totalAmount || 0);
                    const itemCbm = it.totalCbm ? Number(it.totalCbm) : null;

                    return (
                      <tr key={it.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-slate-900 text-sm">
                            {it.productName || it.product?.name || (isMortar ? "Block Jointing Mortar" : "AAC Block")}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            {isMortar ? (
                              <span className="text-sky-700 font-bold bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                                Jointing Adhesive (40 KG Bag)
                              </span>
                            ) : (
                              <span className="text-teal-700 font-bold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                {it.sizeLabel ? formatBlockSizeName(it.sizeLabel) : "Autoclaved Aerated Concrete"}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {it.dimensions || it.product?.dimensions || (isMortar ? "40 KG Bag" : "—")}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                          {it.cbmPerUnit ? Number(it.cbmPerUnit).toFixed(4) : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isMortar ? (
                            <div>
                              <strong className="font-black text-slate-900 text-sm font-mono block">
                                {it.quantity} Bags
                              </strong>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {it.quantity * 40} KG Total
                              </span>
                            </div>
                          ) : (
                            <div>
                              <strong className="font-black text-slate-900 text-sm font-mono block">
                                {itemCbm ? `${itemCbm.toFixed(3)} CBM` : `${formatNumber(it.quantity)} Blocks`}
                              </strong>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ≈ {formatNumber(it.quantity)} Blocks
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                          {itemRate > 0 ? `₹${formatNumber(Math.round(itemRate))}` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                          {order.gstBillingSelected ? `${itemGstRate}%` : "0%"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          ₹{formatNumber(Math.round(itemTotal))}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  // Fallback for single product older orders
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">1</td>
                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-slate-900 text-sm">
                        {order.product?.name || "Standard AAC Block"}
                      </p>
                      <span className="text-teal-700 font-bold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 text-[11px]">
                        {order.product?.sizeLabel ? formatBlockSizeName(order.product.sizeLabel) : "Autoclaved Aerated Concrete"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {order.product?.dimensions || "600 × 200 × 100 mm"}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                      {order.product?.cbmPerBlock ? Number(order.product.cbmPerBlock).toFixed(4) : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <strong className="font-black text-slate-900 text-sm font-mono block">
                        {totalCbm > 0 ? `${totalCbm.toFixed(3)} CBM` : `${formatNumber(totalQty)} units`}
                      </strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ≈ {formatNumber(totalQty)} Blocks
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      ₹{formatNumber(Math.round(Number(order.rate || 0)))}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                      {order.gstBillingSelected ? `${Number(order.gstRate || 18)}%` : "0%"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      ₹{formatNumber(Math.round(totalAmount))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Product Cards View */}
          <div className="sm:hidden divide-y divide-slate-100 p-4 space-y-3">
            {hasItemsArray ? (
              items.map((it, idx) => {
                const isMortar = it.productType !== "AAC_BLOCK";
                const itemRate = Number(it.rate || 0);
                const itemTotal = Number(it.totalAmount || 0);
                const itemCbm = it.totalCbm ? Number(it.totalCbm) : null;

                return (
                  <div key={it.id || idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">Item #{idx + 1}</span>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          {it.productName || it.product?.name || (isMortar ? "Block Jointing Mortar" : "AAC Block")}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {it.dimensions || it.product?.dimensions || (isMortar ? "40 KG Bag" : "—")}
                        </span>
                      </div>
                      <span className="font-black text-sm text-[#13789B] font-mono">
                        ₹{formatNumber(Math.round(itemTotal))}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 font-mono">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Volume / Qty</span>
                        <strong className="text-slate-800">
                          {isMortar
                            ? `${it.quantity} Bags`
                            : itemCbm
                            ? `${itemCbm.toFixed(3)} CBM`
                            : `${it.quantity} Blocks`}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Rate</span>
                        <span className="text-slate-800">₹{formatNumber(Math.round(itemRate))}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {order.product?.name || "Standard AAC Block"}
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {order.product?.dimensions || "600 × 200 × 100 mm"}
                    </span>
                  </div>
                  <span className="font-black text-sm text-[#13789B] font-mono">
                    ₹{formatNumber(Math.round(totalAmount))}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 font-mono">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Total CBM</span>
                    <strong className="text-slate-800">{totalCbm > 0 ? `${totalCbm.toFixed(3)} CBM` : "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Total Blocks</span>
                    <span className="text-slate-800">≈ {formatNumber(totalQty)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table Summary Footer */}
          <div className="bg-slate-50/90 p-4 sm:p-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-white border border-slate-200/80 space-y-0.5">
              <span className="text-[11px] uppercase text-slate-400 font-bold block">Material Subtotal</span>
              <p className="text-base font-black text-slate-900 font-mono">
                ₹{formatNumber(Math.round(subtotal))}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-slate-200/80 space-y-0.5">
              <span className="text-[11px] uppercase text-slate-400 font-bold block">18% GST Amount</span>
              <p className="text-base font-black text-slate-900 font-mono">
                ₹{formatNumber(Math.round(gstAmount))}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-0.5">
              <span className="text-[11px] uppercase text-emerald-800 font-bold block">Grand Invoice Total</span>
              <p className="text-base font-black text-emerald-900 font-mono">
                ₹{formatNumber(Math.round(totalAmount))}
              </p>
            </div>
          </div>
        </section>

        {/* =======================================================================
            FINANCIAL LEDGER & TRANSACTION HISTORY
        ======================================================================= */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4 print-break-inside-avoid">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <CreditCard className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Commercial Ledger & Payments
                </h3>
                <p className="text-[11px] text-slate-500">Receipts and pending commercial balance</p>
              </div>
            </div>
            <span
              className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${
                order.paymentStatus === "PAID"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : order.paymentStatus === "PARTIAL"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {order.paymentStatus || "PENDING"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Billed</span>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                ₹{formatNumber(Math.round(totalAmount))}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] uppercase text-emerald-700 font-bold block">Amount Paid</span>
              <p className="text-base font-black text-emerald-900 font-mono mt-0.5">
                ₹{formatNumber(Math.round(paidAmount))}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
              <span className="text-[10px] uppercase text-rose-700 font-bold block">Balance Pending</span>
              <p className="text-base font-black text-rose-900 font-mono mt-0.5">
                ₹{formatNumber(Math.round(balanceAmount))}
              </p>
            </div>
          </div>

          {/* Payment Receipts list if present */}
          {order.payments && order.payments.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] uppercase text-slate-400 font-bold block mb-2">Recorded Payments</span>
              <div className="space-y-2">
                {order.payments.map((p: any) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="font-mono text-slate-900 font-black">
                        ₹{formatNumber(Number(p.amount || 0))}
                      </strong>
                      <span className="text-[11px] text-slate-500 ml-2">via {p.mode}</span>
                      {p.referenceNo && (
                        <span className="text-[10px] font-mono text-slate-400 ml-2">
                          (Ref: {p.referenceNo})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{formatDate(p.paidAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* =======================================================================
            ORDER TIMELINE & AUDIT HISTORY
        ======================================================================= */}
        {order.events && order.events.length > 0 && (
          <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4 print-break-inside-avoid">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Order Progression & Dispatch Timeline
                </h3>
                <p className="text-[11px] text-slate-500">Official log of milestone events</p>
              </div>
            </div>

            <div className="space-y-3">
              {order.events.map((evt: any, i: number) => (
                <div key={evt.id || i} className="flex items-start gap-3 text-xs">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <strong className="font-bold text-slate-900">{evt.title}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDateTime(evt.createdAt)}
                      </span>
                    </div>
                    {evt.note && <p className="text-slate-600 text-[11px] mt-0.5">{evt.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Customer Notes / Special Instructions if any */}
        {order.notes && (
          <div className="rounded-3xl bg-amber-50/70 border border-amber-200 p-4 sm:p-5 text-xs text-amber-900 space-y-1 print-break-inside-avoid">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="h-4 w-4 text-amber-700" />
              <span>Customer Notes & Instructions</span>
            </div>
            <p className="text-amber-800 leading-relaxed">{order.notes}</p>
          </div>
        )}

        {/* =======================================================================
            FOOTER: COMPANY VERIFICATION & LOGISTICS DISCLAIMER
        ======================================================================= */}
        <footer className="rounded-3xl bg-slate-100/90 border border-slate-200 p-5 sm:p-7 text-center space-y-3 text-xs text-slate-500">
          <p className="font-bold text-slate-700">
            This is an official computer-generated digital order manifest and verification page issued by{" "}
            {companyProfile.legalName || "Swarnim AAC Block Private Limited"}.
          </p>
          <p className="text-[11px] text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Registered Office: {companyProfile.registeredAddress || "Office No. 615, D-6th Floor, Ganesh Glory 11, Jagatpur Chenpur Road, Ahmedabad, Gujarat - 382470"}.
            Materials once dispatched are subject to factory inspection terms. For inquiries or unloading queries, contact plant dispatch at{" "}
            {companyProfile.companyMobile || "+91 7698787476"}.
          </p>
          <div className="pt-2 text-[10px] font-mono text-slate-400">
            Token Verification: {qrDetails.token.slice(0, 16)}... • Status: {qrDetails.status}
          </div>
        </footer>
      </main>
    </div>
  );
}
