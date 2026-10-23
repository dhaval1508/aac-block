"use client";

import React, { useState } from "react";
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  UserCheck,
  Scale,
  FileText,
  Send,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { dispatchOrderAction, deliverOrderAction } from "@/lib/actions/orders";
import { formatNumber } from "@/lib/utils";

interface Props {
  order: {
    id: string;
    orderNo: string;
    status: OrderStatus;
    totalCbm?: any;
    quantity: number;
    adhesiveBags?: number | null;
    assignedStaffId?: string | null;
    assignedStaff?: { name: string } | null;
    dcNumber?: string | null;
    invoiceNo?: string | null;
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
    items?: Array<{
      id: string;
      productName: string;
      sizeLabel?: string | null;
      quantity: number;
      totalCbm?: any;
    }>;
  };
  hasEnoughStock: boolean;
  currentCbm: number;
  userRole: "ADMIN" | "STAFF" | "STOCKER";
}

export function LogisticsDispatchChecklist({
  order,
  hasEnoughStock,
  currentCbm,
  userRole,
}: Props) {
  const isConfirmed = order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.REJECTED;
  const hasItems = (order.items && order.items.length > 0) || order.quantity > 0;
  const hasStaff = Boolean(order.assignedStaffId || order.assignedStaff?.name);
  const hasTruck = Boolean(order.transport?.truckNumber?.trim());
  const hasDriver = Boolean(order.transport?.driverName?.trim() && order.transport?.driverMobile?.trim());
  const hasNetWeight = Boolean(
    (order.weighbridgeSlip?.netWeightKg && Number(order.weighbridgeSlip.netWeightKg) > 0) ||
    (order.loadingRecord?.netWeight && Number(order.loadingRecord.netWeight) > 0)
  );
  const isLoaded = order.status === OrderStatus.LOADED || hasNetWeight;
  const hasDocuments = Boolean(order.dcNumber || order.invoiceNo || isConfirmed);

  // All 8 Mandatory Verification Checks
  const checklist = [
    {
      id: "confirmed",
      label: "Order Confirmed & Approved",
      passed: isConfirmed,
      detail: isConfirmed ? "Approved for factory dispatch operations" : "Awaiting Super Admin approval",
    },
    {
      id: "items",
      label: "All Material Items & Quantities Verified",
      passed: hasItems,
      detail: `${order.items?.length || 1} material lines confirmed (${order.totalCbm ? Number(order.totalCbm).toFixed(3) : 0} CBM)`,
    },
    {
      id: "staff",
      label: "Loading Staff Assigned",
      passed: hasStaff,
      detail: order.assignedStaff?.name ? `Assigned to ${order.assignedStaff.name}` : "Awaiting staff assignment in truck staging",
    },
    {
      id: "truck",
      label: "Truck Information Saved",
      passed: hasTruck,
      detail: order.transport?.truckNumber ? `Vehicle: ${order.transport.truckNumber}` : "Vehicle number required",
    },
    {
      id: "driver",
      label: "Driver Name & Mobile Saved",
      passed: hasDriver,
      detail: order.transport?.driverName ? `${order.transport.driverName} (${order.transport.driverMobile})` : "Driver name & mobile required",
    },
    {
      id: "stock",
      label: "Factory Yard Stock Available",
      passed: hasEnoughStock,
      detail: hasEnoughStock
        ? `Available in yard: ${currentCbm.toFixed(3)} CBM (Sufficient)`
        : `Yard stock (${currentCbm.toFixed(3)} CBM) insufficient for required volume`,
    },
    {
      id: "loading",
      label: "Loading Staged / Net Weight Recorded",
      passed: isLoaded,
      detail: hasNetWeight
        ? `Certified Net Weight: ${Number(order.weighbridgeSlip?.netWeightKg || order.loadingRecord?.netWeight).toLocaleString()} KG`
        : order.status === OrderStatus.LOADED
        ? "Physical loading completed"
        : "Pending physical staging & net weight recording",
    },
    {
      id: "docs",
      label: "Delivery Challan Series Ready",
      passed: hasDocuments,
      detail: order.dcNumber ? `Challan #${order.dcNumber}` : "Will be issued upon dispatch clearance",
    },
  ];

  const totalPassed = checklist.filter((c) => c.passed).length;
  const allPassed = totalPassed === checklist.length;

  const isDispatched = order.status === OrderStatus.DISPATCHED;
  const isDelivered = order.status === OrderStatus.DELIVERED;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4 border-l-4 border-l-indigo-600 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
            <Boxes className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-navy">
              Logistics & Dispatch Verification Checklist
            </h3>
            <p className="text-[11px] text-slate-500">
              Operational gatekeeping before releasing delivery truck from factory yard.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shrink-0 ${
            allPassed
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-amber-50 border border-amber-200 text-amber-800"
          }`}
        >
          {allPassed ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span>{totalPassed} of {checklist.length} Checks Passed</span>
        </span>
      </div>

      {/* Checklist items */}
      <div className="grid gap-2 text-xs">
        {checklist.map((item, idx) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all ${
              item.passed
                ? "bg-emerald-50/30 border-emerald-100 text-slate-700"
                : "bg-amber-50/40 border-amber-200 text-slate-700"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {item.passed ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-800">
                  <span className="text-[10px] font-black">{idx + 1}</span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-bold ${item.passed ? "text-navy" : "text-amber-900"}`}>
                  {item.label}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${
                    item.passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {item.passed ? "Verified" : "Pending"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Area: Dispatch or Delivery Confirmation */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        {!isDispatched && !isDelivered && (
          <>
            {!allPassed ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Dispatch Locked:</strong> Complete all {checklist.length} verification checks above to enable truck dispatch.
                </span>
              </div>
            ) : (
              <form action={dispatchOrderAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>Authorize Dispatch & Deduct Stock</span>
                </button>
              </form>
            )}
          </>
        )}

        {isDispatched && (
          <div className="space-y-2">
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#13789B] shrink-0" />
                <div>
                  <strong className="block">Order Dispatched & In Transit</strong>
                  <span className="text-[11px] text-sky-700">Vehicle {order.transport?.truckNumber} is on the way to site.</span>
                </div>
              </div>
              {order.dcNumber && (
                <span className="font-mono font-bold text-sky-900 text-xs">
                  Challan: {order.dcNumber}
                </span>
              )}
            </div>

            <form action={deliverOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark as Delivered (Confirm Site Receipt)</span>
              </button>
            </form>
          </div>
        )}

        {isDelivered && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <strong className="text-sm block">Consignment Successfully Delivered</strong>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Material receipt acknowledged at site. Lifecycle completed.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
