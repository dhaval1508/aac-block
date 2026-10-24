"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Building2,
  User,
  UserCheck,
  MapPin,
  ShieldCheck,
  FileText,
  Package,
  Truck,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Layers,
  CheckCircle2,
  Loader2,
  PackageCheck,
  XCircle,
  AlertCircle,
  IndianRupee,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";
import {
  formatDate,
  formatNumber,
  formatBlockSizeName,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
} from "@/lib/utils";
import { OpenLocationButton } from "@/components/open-location-button";
import { DeleteOrderModal } from "@/components/delete-order-modal";

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PENDING:
      return <Clock className="h-3 w-3 shrink-0 text-amber-500" />;
    case OrderStatus.CONFIRMED:
      return <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-500" />;
    case OrderStatus.ASSIGNED:
      return <UserCheck className="h-3 w-3 shrink-0 text-indigo-500" />;
    case OrderStatus.LOADING:
      return <Loader2 className="h-3 w-3 shrink-0 text-purple-500 animate-spin" />;
    case OrderStatus.LOADED:
      return <PackageCheck className="h-3 w-3 shrink-0 text-teal-500" />;
    case OrderStatus.DISPATCHED:
      return <Truck className="h-3 w-3 shrink-0 text-sky-500" />;
    case OrderStatus.DELIVERED:
      return <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-500" />;
    case OrderStatus.REJECTED:
      return <XCircle className="h-3 w-3 shrink-0 text-rose-500" />;
    case OrderStatus.CANCELLED:
      return <AlertCircle className="h-3 w-3 shrink-0 text-slate-500" />;
    default:
      return null;
  }
}

interface AdminOrderRowProps {
  order: {
    id: string;
    orderNo: string;
    createdAt: Date | string;
    status: OrderStatus;
    totalCbm?: any;
    quantity: number;
    adhesiveBags?: number | null;
    deliveryAddress: string;
    googleMapsUrl?: string | null;
    latitude?: any;
    longitude?: any;
    gstBillingSelected?: boolean | null;
    gstRegisteredName?: string | null;
    gstNumber?: string | null;
    createdByRole?: string | null;
    createdByNameSnapshot?: string | null;
    salesmanNameSnapshot?: string | null;
    invoiceNo?: string | null;
    dcNumber?: string | null;
    totalAmount?: any;
    pricePerCbm?: any;
    rate?: any;
    customer: {
      name: string;
      companyName?: string | null;
      mobile: string;
      email?: string | null;
    };
    product?: {
      sizeLabel?: string | null;
      dimensions?: string | null;
      cbmPerBlock?: any;
    } | null;
    salesman?: {
      id: string;
      name: string;
    } | null;
    transport?: {
      truckNumber?: string | null;
      driverName?: string | null;
      driverMobile?: string | null;
    } | null;
    items?: Array<{
      id: string;
      productName: string;
      sizeLabel?: string | null;
      dimensions?: string | null;
      productType?: string | null;
      quantity: number;
      totalCbm?: any;
      cbmPerUnit?: any;
      product?: {
        name: string;
        sizeLabel?: string | null;
        dimensions?: string | null;
      } | null;
    }>;
  };
}

export function AdminOrderRow({ order }: AdminOrderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const items = order.items && order.items.length > 0 ? order.items : [];
  const hasMultipleItems = items.length > 1;

  // Customer Name Fix: Always prioritize real customer name, never show email as primary customer name
  const isEmail = (s?: string | null) => Boolean(s && s.includes("@"));
  const rawCustName = order.customer?.name?.trim();
  const rawCompName = order.customer?.companyName?.trim();
  const rawEmail = order.customer?.email?.trim();
  const mobile = order.customer?.mobile?.trim();

  let primaryCustomerName = "";
  if (rawCustName && !isEmail(rawCustName)) {
    primaryCustomerName = rawCustName;
  } else if (order.createdByNameSnapshot && !isEmail(order.createdByNameSnapshot)) {
    primaryCustomerName = order.createdByNameSnapshot;
  } else if (rawCompName && !isEmail(rawCompName)) {
    primaryCustomerName = rawCompName;
  } else if (rawCustName) {
    primaryCustomerName = rawCustName.split("@")[0];
  } else if (rawCompName) {
    primaryCustomerName = rawCompName.split("@")[0];
  } else {
    primaryCustomerName = "Valued Customer";
  }

  // Secondary contact / company info
  let secondaryLabel = "";
  if (rawCompName && rawCompName !== primaryCustomerName && !isEmail(rawCompName)) {
    secondaryLabel = rawCompName;
  } else if (mobile) {
    secondaryLabel = `📱 ${mobile}`;
  } else if (rawEmail) {
    secondaryLabel = rawEmail;
  }

  const orderPriceNum = Number(order.totalAmount || 0);
  const pricePerCbmNum = Number(order.pricePerCbm || 0);

  return (
    <>
      <tr className="hover:bg-slate-50/80 transition-colors group">
        {/* 1. Order ID & Date */}
        <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
          <div className="flex flex-col gap-1">
            <Link
              href={`/admin/orders/${order.id}`}
              className="font-black text-sm text-[#13789B] group-hover:underline block font-mono tracking-tight"
            >
              {order.orderNo}
            </Link>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{formatDate(order.createdAt)}</span>
            </div>
            {order.gstBillingSelected === true ? (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 w-fit mt-0.5"
                title={`GST: ${order.gstRegisteredName || 'Verified'} | ${order.gstNumber || ''}`}
              >
                <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>GST Bill</span>
              </span>
            ) : order.gstBillingSelected === false ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 w-fit mt-0.5">
                <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                <span>Without GST</span>
              </span>
            ) : null}
          </div>
        </td>

        {/* 2. Customer Name (Real Name Primary, Contact Secondary) */}
        <td className="py-3.5 px-3.5 align-top min-w-[180px]">
          <p
            className="font-extrabold text-navy text-sm truncate max-w-[200px]"
            title={primaryCustomerName}
          >
            {primaryCustomerName}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {order.createdByRole === "SALESMAN" ? (
              <span className="inline-flex items-center gap-1 rounded bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                <UserCheck className="h-2.5 w-2.5 text-purple-600 shrink-0" />
                <span className="truncate max-w-[140px]">Sales: {order.createdByNameSnapshot || order.salesman?.name || "Salesman"}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-teal-50 border border-teal-200 px-1.5 py-0.5 text-[10px] font-bold text-[#13789B]">
                <Building2 className="h-2.5 w-2.5 text-[#13789B] shrink-0" />
                <span>Direct Customer</span>
              </span>
            )}
          </div>

          {secondaryLabel && (
            <span
              className="text-[11px] text-slate-500 font-mono mt-1 block truncate max-w-[190px]"
              title={secondaryLabel}
            >
              {secondaryLabel}
            </span>
          )}
        </td>

        {/* 3. Delivery Address */}
        <td className="py-3.5 px-3.5 align-top min-w-[190px]">
          <div className="space-y-1.5">
            <div className="flex items-start gap-1 text-[11px] text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
              <span className="truncate max-w-[170px]" title={order.deliveryAddress}>
                {order.deliveryAddress}
              </span>
            </div>
            <OpenLocationButton
              address={order.deliveryAddress}
              googleMapsUrl={order.googleMapsUrl}
              variant="badge"
            />
            {order.transport?.truckNumber && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono pt-0.5">
                <Truck className="h-3 w-3 text-slate-400 shrink-0" />
                <span>{order.transport.truckNumber}</span>
              </div>
            )}
          </div>
        </td>

        {/* 4. Block Size & Order Quantity */}
        <td className="py-3.5 px-3.5 align-top min-w-[200px]">
          {items.length > 0 ? (
            <div className="space-y-1.5">
              {hasMultipleItems ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Layers className="h-3 w-3 shrink-0" />
                    <span>{items.length} Material Items</span>
                    {isExpanded ? (
                      <ChevronUp className="h-2.5 w-2.5 shrink-0" />
                    ) : (
                      <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                    )}
                  </button>

                  <span className="text-[11px] text-slate-500 block mt-1 truncate max-w-[190px] font-mono">
                    {items.map((i) => i.productName || i.product?.name).join(" + ")}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-bold text-navy block text-xs">
                    {items[0].productName || items[0].product?.name || "AAC Block"}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                    {items[0].dimensions || items[0].product?.dimensions || "-"}
                  </span>
                </div>
              )}

              {/* Total volume & mortar */}
              <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <strong className="font-black text-xs text-navy">
                  {order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} CBM` : `${formatNumber(order.quantity)} units`}
                </strong>
                <span className="text-[11px] text-slate-400 italic">
                  ≈ {formatNumber(order.quantity)} Blocks
                </span>
                {order.adhesiveBags && order.adhesiveBags > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded bg-sky-50 border border-sky-200 px-1.5 py-0.2 text-[10px] font-mono font-bold text-navy">
                    +{order.adhesiveBags} Bags Morter
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">No Morter</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <span className="font-bold text-navy block text-xs">
                {order.product?.sizeLabel
                  ? formatBlockSizeName(order.product.sizeLabel)
                  : "Standard AAC Block"}
              </span>
              <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                {order.product?.dimensions || "-"}
              </span>
              <div className="pt-1 mt-1 border-t border-slate-100 flex items-center gap-2">
                <strong className="font-black text-xs text-navy">
                  {order.totalCbm ? `${Number(order.totalCbm).toFixed(3)} CBM` : `${formatNumber(order.quantity)} units`}
                </strong>
                <span className="text-[11px] text-slate-400 italic">
                  ≈ {formatNumber(order.quantity)} Blocks
                </span>
              </div>
            </div>
          )}
        </td>

        {/* 5. Order Price (Super Admin & Authorized Viewers) */}
        <td className="py-3.5 px-3.5 align-top whitespace-nowrap min-w-[130px]">
          {orderPriceNum > 0 ? (
            <div className="space-y-0.5">
              <p className="font-black text-sm text-emerald-700">
                ₹{formatNumber(orderPriceNum)}
              </p>
              {pricePerCbmNum > 0 && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  ₹{formatNumber(pricePerCbmNum)} / CBM
                </span>
              )}
            </div>
          ) : pricePerCbmNum > 0 ? (
            <p className="font-black text-xs text-emerald-700 font-mono">
              ₹{formatNumber(pricePerCbmNum)} / CBM
            </p>
          ) : (
            <span className="text-slate-400 text-xs italic">Price Not Added</span>
          )}
        </td>

        {/* 6. Order Status */}
        <td className="py-3.5 px-3.5 text-center align-top whitespace-nowrap min-w-[120px]">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border shadow-2xs ${
              ORDER_STATUS_CLASS[order.status]
            }`}
          >
            {getStatusIcon(order.status)}
            <span>{ORDER_STATUS_LABEL[order.status]}</span>
          </span>
        </td>

        {/* 7. Actions (Sticky right) */}
        <td className="py-3.5 px-3.5 text-right align-top whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur-xs group-hover:bg-slate-50/95 transition-colors shadow-[-6px_0_12px_rgba(0,0,0,0.03)] min-w-[110px]">
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={`/admin/orders/${order.id}`}
              className="inline-flex items-center gap-1 rounded-xl bg-[#13789B] hover:bg-[#0f607d] text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs group/btn cursor-pointer whitespace-nowrap"
            >
              <span>Manage</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
            </Link>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              title="Delete or Archive Order"
              className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expandable Multi-Item Row Breakdown */}
      {isExpanded && items.length > 0 && (
        <tr className="bg-slate-50/90 border-b border-indigo-100">
          <td colSpan={7} className="px-6 py-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-navy">
                    Complete Material Breakdown ({order.orderNo})
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Total AAC Volume: <strong className="text-navy">{Number(order.totalCbm || 0).toFixed(3)} CBM</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <strong className="font-bold text-navy">{it.productName || it.product?.name}</strong>
                      <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                        {it.productType === "ADHESIVE" ? "Mortar" : "Block"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Dimensions: {it.dimensions || it.product?.dimensions || "Standard"}
                    </p>
                    <div className="pt-1 flex justify-between items-baseline border-t border-slate-200/60 font-mono">
                      <span className="text-slate-500">
                        {it.totalCbm ? `${Number(it.totalCbm).toFixed(3)} CBM` : `${it.quantity} Bags`}
                      </span>
                      {it.totalCbm ? (
                        <span className="text-slate-400 text-[11px] italic">
                          ≈ {formatNumber(it.quantity)} Blocks
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Delete Confirmation Modal (Simple Yes / No confirmation) */}
      {showDeleteModal && (
        <DeleteOrderModal
          order={{
            id: order.id,
            orderNo: order.orderNo,
            status: order.status,
            totalCbm: order.totalCbm,
            quantity: order.quantity,
            adhesiveBags: order.adhesiveBags,
            customerName: primaryCustomerName,
            companyName: order.customer.companyName,
            dcNumber: order.dcNumber,
            invoiceNo: order.invoiceNo,
            hasDispatchedStock: order.status === "DISPATCHED",
            hasDelivered: order.status === "DELIVERED",
          }}
          onClose={() => setShowDeleteModal(false)}
          returnPath="/admin/orders"
        />
      )}
    </>
  );
}
