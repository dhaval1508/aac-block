"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  Boxes,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

export interface DashboardChartsProps {
  ordersByStatus: {
    pending: number;
    confirmed: number;
    assigned: number;
    loading: number;
    loaded: number;
    dispatched: number;
    delivered: number;
  };
  financials?: {
    periodBilled?: number;
    periodCollected?: number;
    outstandingBalance?: number;
    paidOrdersCount?: number;
    partialOrdersCount?: number;
    pendingOrdersCount?: number;
  };
  stockMovementTotals: {
    inboundTotal: number;
    outboundTotal: number;
  };
  periodLabel: string;
}

export function DashboardCharts({
  ordersByStatus,
  stockMovementTotals,
  periodLabel,
}: DashboardChartsProps) {

  const totalOrders =
    ordersByStatus.pending +
    ordersByStatus.confirmed +
    ordersByStatus.assigned +
    ordersByStatus.loading +
    ordersByStatus.loaded +
    ordersByStatus.dispatched +
    ordersByStatus.delivered;

  const completedFulfillment = ordersByStatus.dispatched + ordersByStatus.delivered;
  const fulfillmentRate = totalOrders > 0 ? Math.round((completedFulfillment / totalOrders) * 100) : 0;

  // Status breakdown configuration
  const statusItems = [
    { label: "Pending", count: ordersByStatus.pending, color: "bg-amber-500", text: "text-amber-600", filter: "PENDING" },
    { label: "Confirmed", count: ordersByStatus.confirmed, color: "bg-blue-500", text: "text-blue-600", filter: "CONFIRMED" },
    { label: "Assigned", count: ordersByStatus.assigned, color: "bg-indigo-500", text: "text-indigo-600", filter: "ASSIGNED" },
    { label: "Loading / Loaded", count: ordersByStatus.loading + ordersByStatus.loaded, color: "bg-purple-500", text: "text-purple-600", filter: "LOADING" },
    { label: "Dispatched", count: ordersByStatus.dispatched, color: "bg-teal-500", text: "text-teal-600", filter: "DISPATCHED" },
    { label: "Delivered", count: ordersByStatus.delivered, color: "bg-emerald-500", text: "text-emerald-600", filter: "DELIVERED" },
  ];

  // Stock Ratio calculation
  const totalStockShift = stockMovementTotals.inboundTotal + Math.abs(stockMovementTotals.outboundTotal);
  const inboundPct = totalStockShift > 0 ? Math.round((stockMovementTotals.inboundTotal / totalStockShift) * 100) : 50;
  const outboundPct = 100 - inboundPct;

  return (
    <div className="card rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-6 min-w-0">
      {/* Chart Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#13789B]/10 text-[#13789B]">
            <BarChart3 className="h-4 w-4" />
          </span>
          <h3 className="text-sm sm:text-base font-black text-navy tracking-tight truncate">
            Factory Operational Analytics & Material Flow
          </h3>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 min-w-0">
        {/* CHART 1: Orders Pipeline Distribution */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:p-5 space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Order Lifecycle
              </span>
              <h4 className="text-sm font-black text-navy mt-0.5">Orders by Operational Status</h4>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-[#13789B] hover:underline flex items-center gap-1"
            >
              View All ({totalOrders}) <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Segmented Progress Bar */}
          <div className="h-4 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
            {totalOrders === 0 ? (
              <div className="h-full w-full bg-slate-200 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                No orders in selected period
              </div>
            ) : (
              statusItems.map((item, idx) => {
                const widthPct = (item.count / totalOrders) * 100;
                if (widthPct === 0) return null;
                return (
                  <div
                    key={idx}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full ${item.color} transition-all duration-500`}
                    title={`${item.label}: ${item.count} orders (${Math.round(widthPct)}%)`}
                  />
                );
              })
            )}
          </div>

          {/* Status Breakdown Legend & Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            {statusItems.map((item, idx) => {
              const pct = totalOrders > 0 ? Math.round((item.count / totalOrders) * 100) : 0;
              return (
                <Link
                  key={idx}
                  href={`/admin/orders?status=${item.filter}`}
                  className="rounded-xl border border-slate-200/80 bg-white p-2.5 hover:border-[#13789B] transition-all group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color} shrink-0`} />
                    <span className="text-[11px] font-medium text-slate-600 truncate group-hover:text-navy">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-black text-navy">{item.count}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{pct}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* CHART 2: Fulfillment Rate & Stock Movement Flow */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:p-5 space-y-4 sm:space-y-5 min-w-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operations & Yard Velocity
            </span>
            <h4 className="text-sm font-black text-navy mt-0.5">
              Dispatch Fulfillment & Stock Dynamics
            </h4>
          </div>

          {/* Fulfillment Rate Progress */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Orders Completed / In Transit</span>
                <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                  <span className="text-base font-black text-navy">
                    {completedFulfillment} Orders
                  </span>
                  <span className="text-xs text-slate-400">
                    of {totalOrders} total booked
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-black text-[#13789B]">
                {fulfillmentRate}% Staged / Done
              </div>
            </div>

            {/* Visual Bar */}
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
              <div
                style={{ width: `${fulfillmentRate}%` }}
                className="h-full bg-[#13789B] rounded-full transition-all duration-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Active queue: <strong className="text-amber-700 font-bold">{totalOrders - completedFulfillment} awaiting loading</strong></span>
              <Link href="/admin/orders" className="text-[#13789B] font-bold hover:underline">
                Manage Queue →
              </Link>
            </div>
          </div>

          {/* Stock Inbound vs Outbound Dynamics */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Production Intake vs Dispatches</span>
                <div className="flex items-center gap-3 mt-0.5 text-xs font-bold">
                  <span className="text-emerald-700">+{formatNumber(stockMovementTotals.inboundTotal)} In</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-rose-700">{formatNumber(stockMovementTotals.outboundTotal)} Out</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Net: {stockMovementTotals.inboundTotal + stockMovementTotals.outboundTotal >= 0 ? "+" : ""}
                {formatNumber(stockMovementTotals.inboundTotal + stockMovementTotals.outboundTotal)} blocks
              </span>
            </div>

            {/* Inbound vs Outbound Bar */}
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              {totalStockShift === 0 ? (
                <div className="h-full w-full bg-slate-200 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                  No stock movements recorded in period
                </div>
              ) : (
                <>
                  <div
                    style={{ width: `${inboundPct}%` }}
                    className="h-full bg-emerald-500 transition-all duration-500"
                    title={`Inbound: ${stockMovementTotals.inboundTotal} blocks (${inboundPct}%)`}
                  />
                  <div
                    style={{ width: `${outboundPct}%` }}
                    className="h-full bg-rose-500 transition-all duration-500"
                    title={`Outbound: ${Math.abs(stockMovementTotals.outboundTotal)} blocks (${outboundPct}%)`}
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Intake ({inboundPct}%)
                <span className="h-2 w-2 rounded-full bg-rose-500 ml-2" /> Dispatches ({outboundPct}%)
              </span>
              <Link href="/admin/stock" className="text-[#13789B] font-bold hover:underline">
                Yard Ledger →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
