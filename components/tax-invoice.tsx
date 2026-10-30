"use client";

import React from "react";
import {
  Printer,
  MessageCircle,
  CheckCircle2,
  Truck,
} from "lucide-react";
import { formatDate, formatNumber, whatsappHref } from "@/lib/utils";
import { buildWhatsAppMessage, APP_NAME } from "@/lib/whatsapp";
import { CompanyProfileData } from "@/lib/company-profile";

export type InvoiceOrder = {
  id: string;
  orderNo: string;
  invoiceNo: string | null;
  dcNumber?: string | null;
  shareToken: string | null;
  confirmedAt: Date | string | null;
  createdAt: Date | string;
  quantity: number;
  loadedQuantity?: number;
  totalCbm?: number | { toString(): string } | null;
  loadedCbm?: number | { toString(): string } | null;
  rate: number | { toString(): string };
  gstRate: number | { toString(): string };
  subtotal: number | { toString(): string };
  gstAmount: number | { toString(): string };
  totalAmount: number | { toString(): string };
  paidAmount: number | { toString(): string };
  deliveryAddress: string;
  customSiteName?: string | null;
  formattedAddress?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  nearbyLandmark?: string | null;
  villageArea?: string | null;
  googleMapsUrl?: string | null;
  adhesiveBags?: number | null;
  weighbridgeSlip?: {
    rstNumber: string;
    netWeightKg: number | { toString(): string };
    weighbridgeName?: string;
    vehicleNumber?: string;
  } | null;
  customer?: {
    name: string;
    mobile: string;
    companyName: string | null;
    gstin: string | null;
    billingAddress: string | null;
    deliveryAddress?: string | null;
    city?: string | null;
    pincode?: string | null;
  } | null;
  items?: Array<{
    id: string;
    productName: string;
    sizeLabel?: string | null;
    dimensions?: string | null;
    quantity: number;
    loadedQuantity?: number;
    cbmPerUnit?: number | null;
    totalCbm?: number | null;
    productType?: string | null;
    product?: {
      name?: string | null;
      sizeLabel?: string | null;
      dimensions?: string | null;
      category?: string | null;
      cbmPerBlock?: number | null;
    } | null;
  }>;
  product: {
    name: string;
    sizeLabel: string;
    dimensions: string;
    cbmPerBlock: number | { toString(): string };
  } | null;
  transport: {
    truckNumber: string;
    transporterName?: string | null;
    driverName: string;
    driverMobile: string;
    expectedDelivery: Date | string | null;
  } | null;
};

/**
 * Resolves destination site details dynamically from authentic order data.
 * Guarantees that neither "Ahmedabad" nor raw coordinates are displayed
 * unless genuinely present in valid destination information.
 */
function resolveDestinationSite(order: InvoiceOrder) {
  const isCoordsString = (str?: string | null) => {
    if (!str) return false;
    const t = str.trim();
    return (
      /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t) ||
      /^gps location:\s*-?\d+/i.test(t) ||
      /^gps site location:\s*-?\d+/i.test(t) ||
      /^site coordinates:\s*-?\d+/i.test(t) ||
      /^google maps site/i.test(t)
    );
  };

  const isUrlString = (str?: string | null) => {
    if (!str) return false;
    return /^https?:\/\//i.test(str.trim());
  };

  // 1. Site Name
  let siteName: string | null = null;
  if (order.customSiteName && !isCoordsString(order.customSiteName) && !isUrlString(order.customSiteName)) {
    siteName = order.customSiteName.trim();
  }

  // 2. Physical Site Address
  let rawAddress = (order.deliveryAddress || order.formattedAddress || "").trim();

  // Strip raw URL if present in address
  if (isUrlString(rawAddress)) {
    rawAddress = "";
  }

  // If address consists of GPS coordinates with erroneously appended fake city:
  // e.g. "22.532420, 73.190135, Ahmedabad - 391770"
  if (/^-?\d+\.\d+\s*,\s*-?\d+\.\d+(?:,\s*.*)?$/i.test(rawAddress)) {
    const custDelivery = order.customer?.deliveryAddress?.trim();
    const custBilling = order.customer?.billingAddress?.trim();
    if (custDelivery && !isCoordsString(custDelivery) && !isUrlString(custDelivery)) {
      rawAddress = custDelivery;
    } else if (custBilling && !isCoordsString(custBilling) && !isUrlString(custBilling)) {
      rawAddress = custBilling;
    } else {
      rawAddress = "";
    }
  }

  // If address has mistakenly appended ", Ahmedabad" when the actual customer/order location is in a different city
  const effectiveCity = (order.customer?.city || order.city || "").trim();
  if (effectiveCity && effectiveCity.toLowerCase() !== "ahmedabad") {
    rawAddress = rawAddress.replace(/,\s*Ahmedabad(?:\s*-\s*\d{6})?/gi, "").trim();
  }

  // Clean trailing punctuation
  rawAddress = rawAddress.replace(/[,\s-]+$/, "").trim();

  // Prevent duplicate text if siteName matches rawAddress
  if (siteName && rawAddress.toLowerCase() === siteName.toLowerCase()) {
    rawAddress = "";
  }

  return {
    siteName,
    address: rawAddress || (siteName ? "" : "—"),
  };
}

export function TaxInvoiceView({
  order,
  companyProfile,
  isPublic = false,
}: {
  order: InvoiceOrder;
  companyProfile?: CompanyProfileData | null;
  isPublic?: boolean;
}) {
  const handlePrint = () => {
    window.print();
  };

  const aacItems = (order.items && order.items.length > 0)
    ? order.items.filter((it) => it.productType === "AAC_BLOCK" || (!it.productType && it.totalCbm))
    : order.product
    ? [
        {
          id: "primary",
          productName: order.product.name,
          sizeLabel: order.product.sizeLabel,
          dimensions: order.product.dimensions,
          quantity: order.quantity,
          cbmPerUnit: Number(order.product.cbmPerBlock),
          totalCbm: order.totalCbm
            ? Number(order.totalCbm)
            : Number(order.product.cbmPerBlock) * order.quantity,
        },
      ]
    : [];

  const mortarItems = (order.items && order.items.length > 0)
    ? order.items.filter((it) => it.productType === "MORTAR" || it.product?.category === "MORTAR")
    : [];

  const totalMortarBags =
    mortarItems.reduce((acc, it) => acc + it.quantity, 0) || (order.adhesiveBags ?? 0);

  const totalCbmNum = order.totalCbm
    ? Number(order.totalCbm)
    : aacItems.reduce((acc, it) => acc + (Number(it.totalCbm) || 0), 0);

  const totalAacBlocks = aacItems.reduce((acc, it) => acc + it.quantity, 0) || order.quantity;
  const loadedCbmNum = order.loadedCbm ? Number(order.loadedCbm) : 0;

  const destinationSite = resolveDestinationSite(order);

  const custDisplayName = order.customer?.companyName || order.customer?.name || "Consignee";
  const custMobile = order.customer?.mobile || "";

  const waMessage = buildWhatsAppMessage("invoice", {
    orderNo: order.orderNo,
    customerName: custDisplayName,
    sizeLabel: order.product?.sizeLabel || aacItems[0]?.sizeLabel || "Standard",
    quantity: totalAacBlocks,
    invoiceNo: order.invoiceNo || order.dcNumber,
    shareToken: order.shareToken,
    truckNumber: order.transport?.truckNumber,
    driverName: order.transport?.driverName,
    driverMobile: order.transport?.driverMobile,
    expectedDelivery: order.transport?.expectedDelivery,
  });

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-6 print:bg-white print:p-0 min-w-0 max-w-full flex flex-col items-center justify-start">
      {/* =========================================================================
          ACTIONS TOOLBAR (STRICTLY HIDDEN IN PRINT)
      ========================================================================= */}
      <div className="w-full max-w-[210mm] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 print:hidden">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-navy tracking-tight truncate">
            Material Delivery Challan
          </h1>
          <p className="text-xs text-slate-500 font-mono truncate">
            Challan: {order.dcNumber || order.invoiceNo || "PENDING"} · Order: {order.orderNo}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isPublic && custMobile ? (
            <a
              href={whatsappHref(custMobile, waMessage)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Share on WhatsApp</span>
            </a>
          ) : null}

          <button
            onClick={handlePrint}
            className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl cursor-pointer shadow-2xs bg-[#13789B] hover:bg-[#0F627F] text-white"
          >
            <Printer className="h-4 w-4" />
            <span>Print A4 Challan / Save PDF</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          STRICT SINGLE-PAGE A4 DELIVERY CHALLAN DOCUMENT
      ========================================================================= */}
      <div className="w-full max-w-[210mm] bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-md p-4 sm:p-7 print:p-0 print:border-none print:shadow-none print:rounded-none challan-a4-document print-avoid-break">
        
        {/* 1. DOCUMENT HEADER */}
        <div className="flex flex-row justify-between items-start gap-4 border-b border-slate-200 pb-2.5 mb-2.5 print-avoid-break">
          {/* Company Branding & Legal Details */}
          <div className="min-w-0 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="SWARNIM AAC BLOCK PRIVATE LIMITED"
              className="h-8 sm:h-9 w-auto object-contain mb-1"
            />
            <p className="text-xs sm:text-sm font-black text-[#13789B] tracking-tight leading-tight">
              {companyProfile?.legalName || "SWARNIM AAC BLOCK PRIVATE LIMITED"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Premium Autoclaved Aerated Concrete Blocks
            </p>
            
            <div className="mt-1 text-[10px] text-slate-600 leading-snug space-y-0.5">
              <p>
                <strong className="text-slate-800">Reg. Office:</strong> {companyProfile?.registeredAddress || "Office No. 615, D-6th Floor, Ganesh Glory 11, Jagatpur Chenpur Road, Ahmedabad, Gujarat - 382470"}
              </p>
              {companyProfile?.factoryAddress ? (
                <p>
                  <strong className="text-slate-800">Factory / Yard:</strong> {companyProfile.factoryName ? `${companyProfile.factoryName} • ` : ""}{companyProfile.factoryAddress}{companyProfile.factoryCity ? `, ${companyProfile.factoryCity}` : ""}{companyProfile.factoryPincode ? ` - ${companyProfile.factoryPincode}` : ""}
                </p>
              ) : null}
              <p>
                <strong className="text-slate-800">GSTIN:</strong> {companyProfile?.gstin || "24ABNCS5280K1ZU"} · State Code: {companyProfile?.state || "Gujarat"} (24)
              </p>
            </div>
          </div>

          {/* Challan Badge & Official Voucher Meta */}
          <div className="text-right shrink-0">
            <span className="inline-block rounded-md bg-[#111827] px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white">
              DELIVERY CHALLAN
            </span>
            <p className="mt-1 text-base sm:text-lg font-black text-navy font-mono">
              {order.dcNumber || order.invoiceNo || "PENDING"}
            </p>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 space-y-0.5">
              <p>Order Ref: <strong className="font-mono text-navy font-bold">{order.orderNo}</strong></p>
              <p>Date: <strong className="text-slate-700">{formatDate(order.confirmedAt || order.createdAt)}</strong></p>
              <p className="truncate max-w-[220px]">Plant: {companyProfile?.factoryName || "Swarnim AAC Manufacturing Plant & Yard"}</p>
            </div>
          </div>
        </div>

        {/* 2. CONSIGNEE & DESTINATION SITE INFORMATION */}
        <div className="grid grid-cols-2 print-grid-2 gap-3 sm:gap-4 border-b border-slate-200 pb-2.5 mb-2.5 text-[11px] print-avoid-break">
          {/* Client / Consignee */}
          <div className="space-y-1 min-w-0">
            <span className="font-black uppercase tracking-wider text-slate-400 text-[9px] block">
              Client / Consignee
            </span>
            <p className="font-black text-navy text-xs sm:text-sm break-words leading-snug">
              {custDisplayName}
            </p>
            <p className="text-slate-600 leading-snug break-words text-[10px] sm:text-[11px]">
              {order.customer?.billingAddress || order.deliveryAddress || "—"}
            </p>
            <p className="font-semibold text-slate-700 break-words text-[10px]">
              GSTIN: {order.customer?.gstin || "—"} · Contact: {order.customer?.name || "—"} {custMobile ? `(${custMobile})` : ""}
            </p>
          </div>

          {/* Destination Site */}
          <div className="space-y-1 min-w-0">
            <span className="font-black uppercase tracking-wider text-slate-400 text-[9px] block">
              Destination Site
            </span>
            {destinationSite.siteName ? (
              <p className="font-bold text-navy text-xs break-words leading-snug">
                {destinationSite.siteName}
              </p>
            ) : null}
            <p className="text-slate-700 leading-snug break-words text-[10px] sm:text-[11px] font-medium">
              {destinationSite.address}
            </p>

            {/* Vehicle & Logistics Details */}
            {order.transport ? (
              <div className="mt-1.5 rounded-xl bg-slate-50 border border-slate-200/80 p-2 text-slate-700 space-y-0.5 text-[10px]">
                <p className="font-black text-navy flex items-center gap-1.5 break-words">
                  <Truck className="h-3 w-3 text-[#13789B] shrink-0" />
                  <span>Truck: {order.transport.truckNumber}</span>
                </p>
                <p className="text-slate-600 break-words">
                  Driver: {order.transport.driverName} ({order.transport.driverMobile})
                </p>
                {order.transport.transporterName ? (
                  <p className="text-slate-500 break-words">
                    Transporter: {order.transport.transporterName}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* 3. ITEMIZED OPERATIONAL MATERIAL TABLE */}
        <div className="py-1 mb-2 overflow-x-auto min-w-0 print-avoid-break">
          <table className="w-full text-left text-[11px] border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-1.5 px-2">Item Description</th>
                <th className="py-1.5 px-2">Dimensions</th>
                <th className="py-1.5 px-2 text-right">Unit CBM</th>
                <th className="py-1.5 px-2 text-right">HSN Code</th>
                <th className="py-1.5 px-2 text-right">Volume (CBM) & Blocks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aacItems.map((item, idx) => {
                const itemCbm = Number(item.totalCbm || (item.quantity * Number(item.cbmPerUnit || 0)));
                const unitCbm = Number(item.cbmPerUnit || (item.product?.cbmPerBlock || 0));

                return (
                  <tr key={item.id || idx} className="print-avoid-break">
                    <td className="py-1.5 px-2">
                      <p className="font-bold text-navy text-xs leading-snug">
                        {item.productName || item.product?.name || "AAC Block"} {item.sizeLabel || item.product?.sizeLabel || ""}
                      </p>
                      <p className="text-[9px] text-slate-400">Standard Autoclaved Aerated Concrete</p>
                    </td>
                    <td className="py-1.5 px-2 font-mono text-slate-700 font-semibold text-[10px] sm:text-[11px]">
                      {item.dimensions || item.product?.dimensions || "-"}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-700 font-semibold text-[10px] sm:text-[11px]">
                      {unitCbm > 0 ? `${unitCbm.toFixed(4)} CBM` : "-"}
                    </td>
                    <td className="py-1.5 px-2 text-right text-slate-600 font-mono text-[10px] sm:text-[11px]">
                      6810
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <p className="font-black text-navy text-xs sm:text-sm font-mono leading-tight">
                        {itemCbm.toFixed(3)} CBM
                      </p>
                      <p className="text-[9px] text-slate-400 italic">
                        ≈ {formatNumber(item.quantity)} Blocks
                      </p>
                    </td>
                  </tr>
                );
              })}

              {totalMortarBags > 0 ? (
                <tr className="print-avoid-break">
                  <td className="py-1.5 px-2">
                    <p className="font-bold text-navy text-xs leading-snug">Block Jointing Morter</p>
                    <p className="text-[9px] text-slate-400">Factory Spec: 40 KG Thin-Bed Adhesive</p>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-slate-700 font-semibold text-[10px] sm:text-[11px]">
                    40 KG Bag
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-700 font-semibold text-[10px] sm:text-[11px]">
                    —
                  </td>
                  <td className="py-1.5 px-2 text-right text-slate-600 font-mono text-[10px] sm:text-[11px]">
                    38245090
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <p className="font-black text-navy text-xs sm:text-sm font-mono leading-tight">
                      {totalMortarBags} Bags
                    </p>
                    <p className="text-[9px] text-slate-400 italic">
                      {totalMortarBags * 40} KG
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* 4. DISPATCH VERIFICATION STATUS & CONSOLIDATED TOTALS */}
        <div className="flex flex-row print-flex-row justify-between items-start gap-3 border-t border-slate-200 pt-2 mb-2 text-[11px] print-avoid-break">
          {/* Material Dispatch Status Badge */}
          <div className="space-y-1">
            <span className="font-black text-slate-400 uppercase text-[9px] block">
              Material Dispatch Status
            </span>
            <div className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-[10px] sm:text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Verified Quality Passed • Factory Staged</span>
            </div>
          </div>

          {/* Consolidated Summary Totals Box */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-2 sm:p-2.5 space-y-1 min-w-[240px] text-[10px] sm:text-[11px]">
            <div className="flex justify-between items-start text-slate-600">
              <span>Total Volume Dispatched</span>
              <div className="text-right">
                <strong className="text-navy font-mono text-xs sm:text-sm block">
                  {totalCbmNum.toFixed(3)} CBM
                </strong>
                <span className="text-[9px] text-slate-400 italic">
                  ≈ {formatNumber(totalAacBlocks)} Blocks
                </span>
              </div>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Block Specifications</span>
              <strong className="text-[#13789B] font-mono text-[10px] sm:text-[11px] text-right max-w-[150px] truncate">
                {aacItems.map((it) => it.sizeLabel || "Standard").join(", ") || "Standard"}
              </strong>
            </div>

            {totalMortarBags > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>Jointing Morter (40 KG)</span>
                <strong className="text-sky-800 font-mono text-xs font-bold">{totalMortarBags} Bags</strong>
              </div>
            ) : null}

            {order.loadedQuantity && order.loadedQuantity > 0 ? (
              <div className="flex justify-between items-start text-emerald-700 border-t border-slate-200 pt-1">
                <span>Verified Yard Loaded</span>
                <div className="text-right">
                  <strong className="font-mono text-xs sm:text-sm block">
                    {loadedCbmNum > 0 ? `${loadedCbmNum.toFixed(3)} CBM` : `${totalCbmNum.toFixed(3)} CBM`}
                  </strong>
                  <span className="text-[9px] text-emerald-600 italic">
                    ≈ {formatNumber(order.loadedQuantity)} Blocks
                  </span>
                </div>
              </div>
            ) : null}

            {order.weighbridgeSlip?.netWeightKg ? (
              <div className="flex justify-between items-center text-teal-800 border-t border-slate-200 pt-1 font-semibold">
                <span>Certified Net Weight</span>
                <div className="text-right">
                  <strong className="font-mono text-xs sm:text-sm text-emerald-700 block">
                    {Number(order.weighbridgeSlip.netWeightKg).toLocaleString()} KG
                  </strong>
                  {order.weighbridgeSlip.rstNumber ? (
                    <span className="text-[9px] text-slate-400 font-mono block">
                      RST #{order.weighbridgeSlip.rstNumber}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* 5. ACKNOWLEDGMENT SIGNATURES */}
        <div className="grid grid-cols-3 print-grid-3 gap-2 sm:gap-4 border-t border-slate-200 pt-2.5 text-center text-[10px] print-avoid-break">
          <div>
            <div className="h-6 sm:h-7 border-b border-dashed border-slate-400 mx-2 sm:mx-4 mb-1" />
            <p className="font-black text-navy text-[10px] sm:text-[11px] leading-tight">Plant Dispatch Supervisor</p>
            <p className="text-[9px] text-slate-400">Swarnim AAC Factory</p>
          </div>
          <div>
            <div className="h-6 sm:h-7 border-b border-dashed border-slate-400 mx-2 sm:mx-4 mb-1" />
            <p className="font-black text-navy text-[10px] sm:text-[11px] leading-tight">Vehicle Driver</p>
            <p className="text-[9px] text-slate-400">Material Handover</p>
          </div>
          <div>
            <div className="h-6 sm:h-7 border-b border-dashed border-slate-400 mx-2 sm:mx-4 mb-1" />
            <p className="font-black text-navy text-[10px] sm:text-[11px] leading-tight">Site Consignee Receiver</p>
            <p className="text-[9px] text-slate-400">Seal & Signature</p>
          </div>
        </div>

        {/* 6. LEGAL COMPLIANCE FOOTER */}
        <div className="mt-2 border-t border-slate-100 pt-1.5 text-center text-[9px] text-slate-400 leading-tight print-avoid-break">
          <p>
            This is a computer-generated factory delivery challan and dispatch voucher issued by {companyProfile?.legalName || APP_NAME}.
            Material once dispatched must be checked at site arrival for block count.
          </p>
        </div>

      </div>
    </div>
  );
}
