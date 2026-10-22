"use client";

import {
  Printer,
  MessageCircle,
  CheckCircle2,
  Truck,
} from "lucide-react";
import { formatDate, formatNumber, whatsappHref } from "@/lib/utils";
import { buildWhatsAppMessage, APP_NAME } from "@/lib/whatsapp";
import { OpenLocationButton } from "@/components/open-location-button";

type InvoiceOrder = {
  id: string;
  orderNo: string;
  invoiceNo: string | null;
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
  dcNumber?: string | null;
  adhesiveBags?: number | null;
  weighbridgeSlip?: {
    rstNumber: string;
    netWeightKg: number | { toString(): string };
    weighbridgeName?: string;
    vehicleNumber?: string;
  } | null;
  customer: {
    name: string;
    mobile: string;
    companyName: string | null;
    gstin: string | null;
    billingAddress: string | null;
  };
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

export function TaxInvoiceView({
  order,
  isPublic = false,
}: {
  order: InvoiceOrder;
  isPublic?: boolean;
}) {
  const handlePrint = () => {
    window.print();
  };

  const totalCbmNum = order.totalCbm
    ? Number(order.totalCbm)
    : order.product
    ? Number(order.product.cbmPerBlock) * order.quantity
    : 0;
  const loadedCbmNum = order.loadedCbm ? Number(order.loadedCbm) : 0;

  const waMessage = buildWhatsAppMessage("invoice", {
    orderNo: order.orderNo,
    customerName: order.customer.companyName || order.customer.name,
    sizeLabel: order.product?.sizeLabel || "Standard",
    quantity: order.quantity,
    invoiceNo: order.invoiceNo,
    shareToken: order.shareToken,
    truckNumber: order.transport?.truckNumber,
    driverName: order.transport?.driverName,
    driverMobile: order.transport?.driverMobile,
    expectedDelivery: order.transport?.expectedDelivery,
  });

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-8 print:bg-white print:p-0 min-w-0 max-w-full">
      <div className="mx-auto max-w-3xl space-y-4 min-w-0">
        {/* Actions bar (Hidden in print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="min-w-0">
            <h1 className="text-xl font-black text-navy tracking-tight truncate">Material Delivery Challan</h1>
            <p className="text-xs text-slate-500 font-mono truncate">
              Challan: {order.dcNumber || order.invoiceNo || "PENDING"} · Order: {order.orderNo}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isPublic ? (
              <a
                href={whatsappHref(order.customer.mobile, waMessage)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Share on WhatsApp</span>
              </a>
            ) : null}

            <button
              onClick={handlePrint}
              className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl cursor-pointer shadow-2xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Formal Challan Sheet */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-10 shadow-xs print:border-none print:shadow-none print:p-0 min-w-0">
          {/* Header */}
          <div className="flex flex-col justify-between border-b border-slate-200 pb-6 sm:flex-row sm:items-start gap-4">
            <div className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="SWARNIM AAC BLOCK PRIVATE LIMITED"
                className="h-10 w-auto object-contain mb-2"
              />
              <p className="text-sm font-black text-[#13789B]">SWARNIM AAC BLOCK PRIVATE LIMITED</p>
              <p className="text-xs text-slate-500">Premium Autoclaved Aerated Concrete Blocks</p>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Registered Office: Office No. 615, D-6th Floor, Ganesh Glory 11, Jagatpur Chenpur Road, Ahmedabad, Gujarat - 382470
                <br />
                <strong>GSTIN: 24ABNCS5280K1ZU</strong> · State Code: 24 (Gujarat)
              </p>
            </div>

            <div className="sm:text-right min-w-0">
              <span className="inline-block rounded-lg bg-[#111827] px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                DELIVERY CHALLAN
              </span>
              <p className="mt-2 text-lg font-black text-navy font-mono break-all">{order.dcNumber || order.invoiceNo || "PENDING"}</p>
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                <p>Order Ref: <strong className="font-mono text-navy">{order.orderNo}</strong></p>
                <p>Date: {formatDate(order.confirmedAt || order.createdAt)}</p>
                <p>Plant: Swarnim AAC Block Plant</p>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2 text-xs">
            <div className="space-y-1 min-w-0">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Client / Consignee</span>
              <p className="font-bold text-navy text-sm break-words">
                {order.customer.companyName || order.customer.name}
              </p>
              <p className="text-slate-600 leading-relaxed break-words">
                {order.customer.billingAddress || order.deliveryAddress}
              </p>
              <p className="font-semibold text-navy break-words">
                GSTIN: {order.customer.gstin || "—"} · Contact: {order.customer.name} ({order.customer.mobile})
              </p>
            </div>

            <div className="space-y-1 min-w-0">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Destination Site</span>
              <p className="font-medium text-slate-700 leading-relaxed break-words">
                {order.deliveryAddress}
              </p>
              <div className="pt-1 pb-1 print:hidden">
                <OpenLocationButton address={order.deliveryAddress} variant="button" />
              </div>
              {order.transport ? (
                <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-slate-700 space-y-0.5">
                  <p className="font-bold text-navy flex items-center gap-1.5 break-words">
                    <Truck className="h-3.5 w-3.5 text-[#13789B] shrink-0" />
                    <span>Truck: {order.transport.truckNumber}</span>
                  </p>
                  <p className="text-[11px] text-slate-600 break-words">
                    Driver: {order.transport.driverName} ({order.transport.driverMobile})
                  </p>
                  {order.transport.transporterName ? (
                    <p className="text-[11px] text-slate-500 break-words">Transporter: {order.transport.transporterName}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Itemized Operational Table */}
          <div className="py-6 overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Dimensions</th>
                  <th className="py-2.5 px-3 text-right">Unit CBM</th>
                  <th className="py-2.5 px-3 text-right">HSN Code</th>
                  <th className="py-2.5 px-3 text-right">Volume (CBM) & Blocks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-3">
                    <p className="font-bold text-navy text-sm">
                      {order.product?.name || "AAC Blocks"} {order.product?.sizeLabel || ""}
                    </p>
                    <p className="text-[11px] text-slate-400">Standard Autoclaved Aerated Concrete</p>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700 font-semibold">{order.product?.dimensions || "-"}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700 font-semibold">
                    {order.product ? `${Number(order.product.cbmPerBlock).toFixed(4)} CBM` : "-"}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 font-mono">6810</td>
                  <td className="py-3 px-3 text-right">
                    <p className="font-black text-navy text-sm font-mono">
                      {totalCbmNum.toFixed(3)} CBM
                    </p>
                    <p className="text-[11px] text-slate-400 italic">
                      ≈ {formatNumber(order.quantity)} Blocks
                    </p>
                  </td>
                </tr>
                {order.adhesiveBags && order.adhesiveBags > 0 ? (
                  <tr>
                    <td className="py-3 px-3">
                      <p className="font-bold text-navy text-sm">Block Jointing Morter</p>
                      <p className="text-[11px] text-slate-400">Factory Spec: 40 KG Thin-Bed Adhesive</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 font-semibold">40 KG Bag</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 font-semibold">—</td>
                    <td className="py-3 px-3 text-right text-slate-600 font-mono">38245090</td>
                    <td className="py-3 px-3 text-right">
                      <p className="font-black text-navy text-sm font-mono">
                        {order.adhesiveBags} Bags
                      </p>
                      <p className="text-[11px] text-slate-400 italic">
                        {order.adhesiveBags * 40} KG
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Operational Verification & Dispatch Totals */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs min-w-0">
            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">Material Dispatch Status</span>
              <div className="flex items-center gap-2 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Verified Quality Passed • Factory Staged</span>
              </div>
            </div>

            <div className="w-full sm:w-auto rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-1.5 min-w-[240px]">
              <div className="flex justify-between items-start text-slate-600">
                <span>Total Volume Dispatched</span>
                <div className="text-right">
                  <strong className="text-navy font-mono text-sm block">{totalCbmNum.toFixed(3)} CBM</strong>
                  <span className="text-[11px] text-slate-400 italic">≈ {formatNumber(order.quantity)} Blocks</span>
                </div>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Block Specification</span>
                <strong className="text-[#13789B] font-mono text-sm">{order.product?.sizeLabel || "Standard"}</strong>
              </div>
              {order.adhesiveBags && order.adhesiveBags > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Jointing Morter (40 KG)</span>
                  <strong className="text-sky-800 font-mono text-sm">{order.adhesiveBags} Bags</strong>
                </div>
              ) : null}
              {order.loadedQuantity && order.loadedQuantity > 0 ? (
                <div className="flex justify-between items-start text-emerald-700 border-t border-slate-200 pt-1">
                  <span>Verified Yard Loaded</span>
                  <div className="text-right">
                    <strong className="font-mono text-sm block">
                      {loadedCbmNum > 0 ? `${loadedCbmNum.toFixed(3)} CBM` : `${totalCbmNum.toFixed(3)} CBM`}
                    </strong>
                    <span className="text-[11px] text-emerald-600 italic">
                      ≈ {formatNumber(order.loadedQuantity)} Blocks
                    </span>
                  </div>
                </div>
              ) : null}
              {order.weighbridgeSlip?.netWeightKg ? (
                <div className="flex justify-between items-center text-teal-800 border-t border-slate-200 pt-1.5 font-semibold">
                  <span>Certified Net Weight</span>
                  <div className="text-right">
                    <strong className="font-mono text-sm text-emerald-700 block">
                      {Number(order.weighbridgeSlip.netWeightKg).toLocaleString()} KG
                    </strong>
                    {order.weighbridgeSlip.rstNumber ? (
                      <span className="text-[10px] text-slate-400 font-mono block">
                        RST #{order.weighbridgeSlip.rstNumber}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Acknowledgment Signatures */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 border-t border-slate-200 pt-8 text-center text-xs">
            <div>
              <div className="h-10 sm:h-12 border-b border-dashed border-slate-300 mx-4" />
              <p className="mt-2 font-bold text-navy">Plant Dispatch Supervisor</p>
              <p className="text-[10px] text-slate-400">Swarnim AAC Factory</p>
            </div>
            <div>
              <div className="h-10 sm:h-12 border-b border-dashed border-slate-300 mx-4" />
              <p className="mt-2 font-bold text-navy">Vehicle Driver</p>
              <p className="text-[10px] text-slate-400">Material Handover</p>
            </div>
            <div>
              <div className="h-10 sm:h-12 border-b border-dashed border-slate-300 mx-4" />
              <p className="mt-2 font-bold text-navy">Site Consignee Receiver</p>
              <p className="text-[10px] text-slate-400">Seal & Signature</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
            <p>
              This is a computer-generated factory delivery challan and dispatch voucher issued by {APP_NAME}.
              Material once dispatched must be checked at site arrival for block count.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
