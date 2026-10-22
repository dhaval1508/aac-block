"use client";

import React, { useState } from "react";
import {
  Truck,
  UserCheck,
  Phone,
  Scale,
  Clock,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { saveTruckAndLoadingStagingAction } from "@/lib/actions/orders";
import { normalizeWhatsAppPhone, formatNumber, mapsHref } from "@/lib/utils";

interface StaffOption {
  id: string;
  name: string;
  mobile?: string | null;
}

interface Props {
  order: {
    id: string;
    orderNo: string;
    status: string;
    assignedStaffId?: string | null;
    assignedStaff?: { id: string; name: string; mobile?: string | null } | null;
    totalCbm?: any;
    quantity: number;
    adhesiveBags?: number | null;
    deliveryAddress: string;
    transport?: {
      truckNumber?: string | null;
      driverName?: string | null;
      driverMobile?: string | null;
      transporterName?: string | null;
      expectedDelivery?: any;
    } | null;
    loadingRecord?: {
      loadingStartTime?: string | null;
      loadingEndTime?: string | null;
      loadedCbm?: any;
      netWeight?: any;
      rstNumber?: string | null;
      remarks?: string | null;
    } | null;
    weighbridgeSlip?: {
      rstNumber?: string | null;
      netWeightKg?: any;
      remarks?: string | null;
    } | null;
  };
  staffList?: StaffOption[];
  userRole: "ADMIN" | "STAFF" | "STOCKER";
  currentUserId?: string;
  currentUserName?: string;
}

export function TruckStagingForm({
  order,
  staffList = [],
  userRole,
  currentUserId,
  currentUserName,
}: Props) {
  const isFinalized = ["DISPATCHED", "DELIVERED", "CANCELLED", "REJECTED"].includes(order.status);

  // Form State initialized from canonical order records
  const [staffId, setStaffId] = useState<string>(
    order.assignedStaffId || (userRole !== "ADMIN" && currentUserId ? currentUserId : "")
  );
  const [truckNumber, setTruckNumber] = useState<string>(
    order.transport?.truckNumber || ""
  );
  const [driverName, setDriverName] = useState<string>(
    order.transport?.driverName || ""
  );
  const [driverMobile, setDriverMobile] = useState<string>(
    order.transport?.driverMobile || ""
  );
  const [transporterName, setTransporterName] = useState<string>(
    order.transport?.transporterName || ""
  );
  const [expectedDelivery, setExpectedDelivery] = useState<string>(
    order.transport?.expectedDelivery
      ? new Date(order.transport.expectedDelivery).toISOString().split("T")[0]
      : ""
  );
  const [loadingStartTime, setLoadingStartTime] = useState<string>(
    order.loadingRecord?.loadingStartTime || ""
  );
  const [loadingEndTime, setLoadingEndTime] = useState<string>(
    order.loadingRecord?.loadingEndTime || ""
  );
  const [loadedCbm, setLoadedCbm] = useState<number | "">(
    order.loadingRecord?.loadedCbm
      ? Number(order.loadingRecord.loadedCbm)
      : order.totalCbm
      ? Number(order.totalCbm)
      : ""
  );
  const [netWeightKg, setNetWeightKg] = useState<number | "">(
    order.weighbridgeSlip?.netWeightKg
      ? Number(order.weighbridgeSlip.netWeightKg)
      : order.loadingRecord?.netWeight
      ? Number(order.loadingRecord.netWeight)
      : ""
  );
  const [rstNumber, setRstNumber] = useState<string>(
    order.weighbridgeSlip?.rstNumber || order.loadingRecord?.rstNumber || ""
  );
  const [remarks, setRemarks] = useState<string>(
    order.loadingRecord?.remarks || order.weighbridgeSlip?.remarks || ""
  );

  // Build driver WhatsApp staging message
  const driverWaHref = React.useMemo(() => {
    if (!driverMobile) return "";
    const cleanPhone = normalizeWhatsAppPhone(driverMobile);
    if (!cleanPhone) return "";

    const mapsLink = mapsHref(order.deliveryAddress);
    const lines = [
      `*SWARNIM AAC BLOCK - VEHICLE STAGING DETAILS*`,
      `Order Ref: ${order.orderNo}`,
      `Vehicle Number: ${truckNumber || "Pending"}`,
      `Driver Name: ${driverName || "Driver"}`,
      transporterName ? `Transporter: ${transporterName}` : null,
      order.totalCbm ? `Total Volume: ${Number(order.totalCbm).toFixed(3)} CBM (≈ ${order.quantity.toLocaleString()} Blocks)` : null,
      order.adhesiveBags ? `Jointing Morter: ${order.adhesiveBags} Bags (40 KG)` : null,
      typeof netWeightKg === "number" && netWeightKg > 0 ? `Net Weight: ${netWeightKg.toLocaleString()} KG` : null,
      `Delivery Site: ${order.deliveryAddress}`,
      mapsLink ? `Google Maps Location: ${mapsLink}` : null,
      `Please report to factory loading gate on arrival.`,
    ].filter(Boolean);

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [driverMobile, order, truckNumber, driverName, transporterName, netWeightKg]);

  // Read-only locked view for dispatched/delivered orders
  if (isFinalized) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4 border-l-4 border-l-slate-400 min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Truck className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-navy truncate">
                Loading Staff & Truck Staging
              </h3>
              <p className="text-[11px] text-slate-400">
                Finalized dispatch record • Locked against modifications
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 shrink-0">
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl bg-slate-50 p-3 sm:p-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Truck Number</span>
            <p className="mt-0.5 font-mono font-black text-navy text-sm">
              {order.transport?.truckNumber || "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Driver Name</span>
            <p className="mt-0.5 font-bold text-navy text-sm">
              {order.transport?.driverName || "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Driver Mobile</span>
            <p className="mt-0.5 font-bold text-navy">
              {order.transport?.driverMobile || "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Certified Net Weight</span>
            <p className="mt-0.5 font-mono font-black text-emerald-700">
              {typeof netWeightKg === "number" && netWeightKg > 0 ? `${netWeightKg.toLocaleString()} KG` : "—"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4 border-l-4 border-l-[#13789B] min-w-0">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#13789B] shadow-2xs">
            <Truck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-navy truncate">
              Loading Staff & Truck Staging
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              Staging vehicle, driver contact, yard assignment & certified Net Weight
            </p>
          </div>
        </div>

        {order.assignedStaff ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 self-start sm:self-auto shrink-0">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Assigned: {order.assignedStaff.name}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700 self-start sm:self-auto shrink-0">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Yard Queue: Unassigned</span>
          </span>
        )}
      </div>

      {/* Main Unified Form */}
      <form action={saveTruckAndLoadingStagingAction} className="space-y-4">
        <input type="hidden" name="orderId" value={order.id} />

        {/* Section 1: Staff Assignment */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Assign Loading Staff *
            </label>
            {userRole !== "ADMIN" && !order.assignedStaffId && (
              <span className="text-[11px] font-bold text-[#13789B]">
                ⚡ Saving will claim this order to your account
              </span>
            )}
          </div>

          {userRole === "ADMIN" ? (
            <select
              name="staffId"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-navy outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            >
              <option value="">-- Select Active Staff Member --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.mobile ? `(${s.mobile})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="font-medium text-slate-700">
                {order.assignedStaffId === currentUserId ? (
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Assigned to You ({currentUserName || "Loading Staff"})
                  </span>
                ) : order.assignedStaff ? (
                  <span className="text-slate-600">
                    Assigned Staff: <strong className="text-navy">{order.assignedStaff.name}</strong>
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold">
                    Unassigned in Yard Queue (Will be assigned to You upon saving)
                  </span>
                )}
              </div>
              <input type="hidden" name="staffId" value={staffId || currentUserId || ""} />
            </div>
          )}
        </div>

        {/* Section 2: Truck & Driver Information (Required Fields) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Truck Registration Number *
            </label>
            <input
              type="text"
              name="truckNumber"
              required
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value.toUpperCase())}
              placeholder="e.g. GJ-01-AX-9942"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono font-black text-navy text-sm uppercase outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Driver Name *
            </label>
            <input
              type="text"
              name="driverName"
              required
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="e.g. Sanjay Parmar"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-bold text-navy outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Driver Mobile Number *
            </label>
            <input
              type="tel"
              name="driverMobile"
              required
              maxLength={13}
              value={driverMobile}
              onChange={(e) => setDriverMobile(e.target.value)}
              placeholder="10-digit mobile"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono font-bold text-navy outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>
        </div>

        {/* Section 3: Transporter & Delivery Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Transporter / Logistics Agency
            </label>
            <input
              type="text"
              name="transporterName"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              placeholder="e.g. Gujarat Express Freight / Swarnim Logistics"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-navy outline-none focus:border-[#13789B]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Expected Loading / Dispatch Date
            </label>
            <input
              type="date"
              name="expectedDelivery"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-navy outline-none focus:border-[#13789B]"
            />
          </div>
        </div>

        {/* Section 4: Certified Net Weight (Only Net Weight) */}
        <div className="rounded-2xl bg-teal-50/70 border border-teal-200 p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label htmlFor="netWeightInput" className="block text-xs font-black uppercase tracking-wider text-[#13789B] flex items-center gap-1.5">
              <Scale className="h-4 w-4" />
              <span>Certified Net Weight (KG)</span>
            </label>
            <span className="text-[11px] text-teal-800 font-medium">
              Direct weighbridge net entry (e.g. 18500)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <input
                id="netWeightInput"
                type="number"
                name="netWeightKg"
                step="0.01"
                min="0"
                value={netWeightKg}
                onChange={(e) => setNetWeightKg(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 18500"
                className="w-full rounded-xl border border-teal-300 bg-white px-4 py-2.5 font-mono text-base font-black text-navy outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 font-mono pointer-events-none">
                KG
              </span>
            </div>

            <div>
              <input
                type="text"
                name="rstNumber"
                value={rstNumber}
                onChange={(e) => setRstNumber(e.target.value.toUpperCase())}
                placeholder="RST Slip No. (e.g. 1245)"
                className="w-full rounded-xl border border-teal-300 bg-white px-4 py-2.5 font-mono font-bold text-navy text-xs outline-none focus:border-[#13789B]"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Certified material weight printed on Delivery Challan and verified against factory weighbridge slip.
          </p>
        </div>

        {/* Section 5: Loading Timings & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Loading Start Time</label>
            <input
              type="text"
              name="loadingStartTime"
              value={loadingStartTime}
              onChange={(e) => setLoadingStartTime(e.target.value)}
              placeholder="e.g. 10:30 AM"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-navy outline-none focus:border-[#13789B]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Loading Completion Time</label>
            <input
              type="text"
              name="loadingEndTime"
              value={loadingEndTime}
              onChange={(e) => setLoadingEndTime(e.target.value)}
              placeholder="e.g. 11:45 AM"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-navy outline-none focus:border-[#13789B]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Loaded Volume (CBM)</label>
            <input
              type="number"
              step="0.001"
              name="loadedCbm"
              value={loadedCbm}
              onChange={(e) => setLoadedCbm(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 18.000"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono font-bold text-navy outline-none focus:border-[#13789B]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Loading Remarks</label>
          <input
            type="text"
            name="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Tarpaulin secured / Weighbridge verified / Corner blocks checked"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-navy outline-none focus:border-[#13789B]"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="submit"
            className="w-full flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0f607d] py-3 text-xs font-black text-white shadow-md shadow-[#13789B]/20 transition-all cursor-pointer active:scale-[0.99]"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Save Truck & Loading Details</span>
          </button>

          {driverWaHref && (
            <a
              href={driverWaHref}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Send Truck & Driver Info on WhatsApp</span>
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
