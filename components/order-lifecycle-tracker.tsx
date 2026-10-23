"use client";

import { OrderStatus } from "@prisma/client";
import { Check, Clock, Truck, ShieldCheck, AlertCircle, XCircle } from "lucide-react";

interface Props {
  status: OrderStatus;
  confirmedAt?: Date | string | null;
  dispatchedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  createdAt?: Date | string | null;
}

export function OrderLifecycleTracker({
  status,
  confirmedAt,
  dispatchedAt,
  deliveredAt,
  createdAt,
}: Props) {
  // 4 Primary Order Lifecycle Stages
  const stages = [
    {
      id: "PLACED",
      step: 1,
      title: "Placed",
      desc: "Order created & logged",
      icon: Clock,
    },
    {
      id: "CONFIRMED",
      step: 2,
      title: "Confirmed",
      desc: "Approved & factory staged",
      icon: Check,
    },
    {
      id: "DISPATCHED",
      step: 3,
      title: "Dispatched",
      desc: "In transit to site",
      icon: Truck,
    },
    {
      id: "DELIVERED",
      step: 4,
      title: "Delivered",
      desc: "Delivered & verified",
      icon: ShieldCheck,
    },
  ];

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
        return 3; // Delivered
      case OrderStatus.CANCELLED:
      case OrderStatus.REJECTED:
        return -1;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(status);
  const isCancelledOrRejected = status === OrderStatus.CANCELLED || status === OrderStatus.REJECTED;

  // Sub-status pill for Stage 2 (Confirmed)
  const getSubStatusText = (): string | null => {
    if (status === OrderStatus.ASSIGNED) return "Staff & Truck Allocated";
    if (status === OrderStatus.LOADING) return "Loading in Progress at Bay";
    if (status === OrderStatus.LOADED) return "Loading Staged & Verified";
    if (status === OrderStatus.CONFIRMED) return "Approved by Factory";
    return null;
  };

  const subStatusText = getSubStatusText();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Live Order Status Progression
          </h2>
          <p className="text-xs text-slate-500">
            Standard 4-stage dispatch pipeline: Placed → Confirmed → Dispatched → Delivered
          </p>
        </div>

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
        ) : subStatusText ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-[#13789B]">
            <span className="h-2 w-2 rounded-full bg-[#13789B] animate-pulse"></span>
            <span>Operational Sub-Status: {subStatusText}</span>
          </span>
        ) : null}
      </div>

      {isCancelledOrRejected ? (
        <div className="rounded-2xl bg-rose-50/60 border border-rose-200 p-4 text-xs text-rose-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <strong className="font-black text-sm block">
              This order has been {status === OrderStatus.CANCELLED ? "cancelled" : "rejected"}.
            </strong>
            <p className="mt-0.5 text-rose-700">
              Operational activities are stopped. Historical records are preserved for audit purposes.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Connecting Progress Line (Desktop) */}
          <div className="hidden sm:block absolute top-5 left-10 right-10 h-1 bg-slate-100 -z-0">
            <div
              className="h-full bg-[#13789B] transition-all duration-500"
              style={{
                width: `${(Math.max(0, currentIndex) / 3) * 100}%`,
              }}
            />
          </div>

          {/* 4 Stages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 relative z-10">
            {stages.map((stg, idx) => {
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              const isFuture = currentIndex < idx;

              return (
                <div
                  key={stg.id}
                  className={`flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? "bg-sky-50/60 border-[#13789B] ring-2 ring-[#13789B]/20 shadow-xs"
                      : isPast
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-slate-50/50 border-slate-200/60 opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-black mb-2 transition-all shadow-xs ${
                      isCurrent
                        ? "bg-[#13789B] text-white ring-4 ring-sky-100"
                        : isPast
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isPast ? <Check className="h-5 w-5" /> : stg.step}
                  </div>

                  <span
                    className={`text-sm font-black truncate block ${
                      isCurrent
                        ? "text-[#13789B]"
                        : isPast
                        ? "text-emerald-800"
                        : "text-slate-600"
                    }`}
                  >
                    {stg.title}
                  </span>

                  <span className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    {stg.desc}
                  </span>

                  {isCurrent && subStatusText && stg.id === "CONFIRMED" && (
                    <span className="mt-1.5 inline-block rounded-md bg-[#13789B]/10 px-2 py-0.5 text-[10px] font-bold text-[#13789B]">
                      {subStatusText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
