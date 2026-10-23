"use client";

import React, { useTransition } from "react";
import { OrderStatus } from "@prisma/client";
import {
  Check,
  Clock,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { markOrderDoneAction, dispatchOrderAction } from "@/lib/actions/orders";

interface Props {
  orderId?: string;
  orderNo?: string;
  status: OrderStatus;
  confirmedAt?: Date | string | null;
  dispatchedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  createdAt?: Date | string | null;
  userRole?: "ADMIN" | "STAFF" | "STOCKER" | "SALESMAN" | "CUSTOMER";
  allowActions?: boolean;
}

export function OrderLifecycleTracker({
  orderId,
  orderNo,
  status,
  confirmedAt,
  dispatchedAt,
  deliveredAt,
  createdAt,
  userRole,
  allowActions = true,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Map database enum to 4-stage index (0 to 3)
  const getStageIndex = (st: OrderStatus): number => {
    switch (st) {
      case OrderStatus.PENDING:
        return 0; // Placed
      case OrderStatus.CONFIRMED:
      case OrderStatus.ASSIGNED:
      case OrderStatus.LOADING:
      case OrderStatus.LOADED:
        return 1; // Confirmed
      case OrderStatus.DISPATCHED:
        return 2; // Dispatched
      case OrderStatus.DELIVERED:
        return 3; // Delivered (Done)
      case OrderStatus.CANCELLED:
      case OrderStatus.REJECTED:
        return -1;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(status);
  const isCancelledOrRejected = status === OrderStatus.CANCELLED || status === OrderStatus.REJECTED;
  const isDelivered = status === OrderStatus.DELIVERED;

  // Sub-status pill for Stage 2 (Confirmed)
  const getSubStatusText = (): string | null => {
    if (status === OrderStatus.ASSIGNED) return "Staff & Truck Staged";
    if (status === OrderStatus.LOADING) return "Loading in Progress at Bay";
    if (status === OrderStatus.LOADED) return "Loading Verified & Weighed";
    if (status === OrderStatus.CONFIRMED) return "Approved by Factory";
    return null;
  };

  const subStatusText = getSubStatusText();

  // 4 Primary Order Lifecycle Stages
  const stages = [
    {
      id: "PLACED",
      step: 1,
      title: "Placed",
      desc: "Order created & booked",
      timestamp: createdAt,
      icon: Clock,
    },
    {
      id: "CONFIRMED",
      step: 2,
      title: "Confirmed",
      desc: "Approved & factory staged",
      timestamp: confirmedAt,
      icon: Check,
    },
    {
      id: "DISPATCHED",
      step: 3,
      title: "Dispatched",
      desc: "In transit to site",
      timestamp: dispatchedAt,
      icon: Truck,
    },
    {
      id: "DELIVERED",
      step: 4,
      title: "Delivered (Done)",
      desc: "Delivered & verified",
      timestamp: deliveredAt,
      icon: ShieldCheck,
    },
  ];

  // Dynamic progress percentage for line
  const getProgressPercentage = (): number => {
    if (isDelivered) return 100;
    if (status === OrderStatus.DISPATCHED) return 72;
    if (status === OrderStatus.LOADED) return 55;
    if (status === OrderStatus.LOADING || status === OrderStatus.ASSIGNED) return 42;
    if (status === OrderStatus.CONFIRMED) return 33;
    if (status === OrderStatus.PENDING) return 8;
    return 0;
  };

  const canPerformYardActions =
    allowActions &&
    orderId &&
    !isCancelledOrRejected &&
    !isDelivered &&
    (!userRole || ["STAFF", "STOCKER", "ADMIN"].includes(userRole));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs min-w-0 space-y-4 sm:space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-navy">
              Live Order Status Progression
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Standard 4-stage dispatch pipeline: Placed → Confirmed → Dispatched → Delivered (Done)
          </p>
        </div>

        <div>
          {isCancelledOrRejected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-black text-rose-700">
              {status === OrderStatus.CANCELLED ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Order Cancelled</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Order Rejected</span>
                </>
              )}
            </span>
          ) : isDelivered ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3.5 py-1 text-xs font-black text-emerald-800 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>ORDER COMPLETED & DELIVERED</span>
            </span>
          ) : subStatusText ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-[#13789B]">
              <span className="h-2 w-2 rounded-full bg-[#13789B] animate-pulse"></span>
              <span>Operational Sub-Status: {subStatusText}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
              <span>Status: {status}</span>
            </span>
          )}
        </div>
      </div>

      {isCancelledOrRejected ? (
        <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-4 text-xs text-rose-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <strong className="font-black text-sm block">
              This order is {status === OrderStatus.CANCELLED ? "Cancelled" : "Rejected"}.
            </strong>
            <p className="mt-0.5 text-rose-700">
              Operational activities are stopped. All historical records are safely preserved for plant audit.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Visual 4-Stage Stepper */}
          <div className="relative pt-2 pb-1">
            {/* Connecting Progress Line (Desktop) */}
            <div className="hidden sm:block absolute top-7 left-12 right-12 h-1.5 bg-slate-100 rounded-full overflow-hidden z-0">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isDelivered ? "bg-emerald-500" : "bg-[#13789B]"
                }`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            {/* 4 Stages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 relative z-10">
              {stages.map((stg, idx) => {
                const isPast = isDelivered ? true : currentIndex > idx;
                const isCurrent = isDelivered ? idx === 3 : currentIndex === idx;
                const isCompleted = isDelivered || isPast || (isCurrent && idx === 3);

                return (
                  <div
                    key={stg.id}
                    className={`flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border transition-all ${
                      isDelivered || isPast
                        ? "bg-emerald-50/50 border-emerald-200/90 shadow-2xs"
                        : isCurrent
                        ? "bg-sky-50/80 border-[#13789B] ring-2 ring-[#13789B]/20 shadow-xs"
                        : "bg-slate-50/40 border-slate-200/60 opacity-60"
                    }`}
                  >
                    {/* Circle Step Icon */}
                    <div
                      className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl text-xs sm:text-sm font-black mb-2 transition-all shadow-xs ${
                        isDelivered || isPast
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-[#13789B] text-white ring-4 ring-sky-100"
                          : "bg-white text-slate-400 border border-slate-200"
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5 stroke-[2.5]" /> : stg.step}
                    </div>

                    {/* Stage Title */}
                    <span
                      className={`text-xs sm:text-sm font-black truncate block ${
                        isDelivered || isPast
                          ? "text-emerald-900"
                          : isCurrent
                          ? "text-[#13789B]"
                          : "text-slate-600"
                      }`}
                    >
                      {stg.title}
                    </span>

                    {/* Stage Description */}
                    <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">
                      {stg.desc}
                    </span>

                    {/* Timestamp if present */}
                    {stg.timestamp && (isPast || isCurrent) ? (
                      <span className="mt-1.5 inline-block text-[10px] font-mono font-bold text-slate-600 bg-white/80 border border-slate-200/60 px-2 py-0.5 rounded-md">
                        {formatDateTime(stg.timestamp)}
                      </span>
                    ) : null}

                    {/* Sub-status label for Confirmed stage */}
                    {!isDelivered && isCurrent && subStatusText && stg.id === "CONFIRMED" && (
                      <span className="mt-1.5 inline-block rounded-md bg-[#13789B]/10 border border-[#13789B]/20 px-2 py-0.5 text-[10px] font-bold text-[#13789B]">
                        {subStatusText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Celebration Banner when Delivered */}
          {isDelivered && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <strong className="font-black text-emerald-950 block">
                    Order Consignment Delivered & Fully Completed!
                  </strong>
                  <p className="text-[11px] text-emerald-800">
                    All stages (Placed, Confirmed, Staged, Dispatched, Delivered) are locked and verified.
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                Delivered: {deliveredAt ? formatDateTime(deliveredAt) : "Done"}
              </span>
            </div>
          )}

          {/* =========================================================================
              ACTION BAR FOR LOADER & STOCKER ("ODER DONE OPSIN")
              Enables Loader, Stocker & Admin to mark Order Done independently of Super Admin!
          ========================================================================= */}
          {canPerformYardActions && (
            <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-3.5 sm:p-4 text-xs shadow-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-emerald-950">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-black text-navy">
                      Yard Operations: Complete Order & Advance Status
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    <strong>Loader & Stocker Action:</strong> Mark order Done (Delivered) or Dispatch directly from yard without waiting for Super Admin.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Dispatch Option if not yet in transit */}
                  {status !== OrderStatus.DISPATCHED && (
                    <form action={dispatchOrderAction}>
                      <input type="hidden" name="orderId" value={orderId} />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Truck className="h-4 w-4" />
                        <span>Dispatch Truck</span>
                      </button>
                    </form>
                  )}

                  {/* 1-Click "ORDER DONE" (Delivered) Option */}
                  <form action={markOrderDoneAction}>
                    <input type="hidden" name="orderId" value={orderId} />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 px-4 py-2.5 text-xs sm:text-sm font-black text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>ORDER DONE (MARK DELIVERED)</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
