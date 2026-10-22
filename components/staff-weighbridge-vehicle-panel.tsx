"use client";

import React, { useState, useTransition } from "react";
import {
  Scale,
  Truck,
  Upload,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";
import { saveWeighbridgeSlipAction, saveLoadingAndVehicleAction } from "@/lib/actions/orders";
import { mapsHref, normalizeWhatsAppPhone } from "@/lib/utils";
import { buildDriverDeliveryWhatsAppMessage } from "@/lib/whatsapp";
import { OpenLocationButton } from "@/components/open-location-button";

interface Props {
  order: {
    id: string;
    orderNo: string;
    dcNumber?: string | null;
    invoiceNo?: string | null;
    status: string;
    deliveryAddress: string;
    googleMapsUrl?: string | null;
    formattedAddress?: string | null;
    latitude?: any;
    longitude?: any;
    totalCbm?: any;
    quantity: number;
    adhesiveBags?: number | null;
    product?: { sizeLabel?: string | null; dimensions?: string | null } | null;
    items?: any[];
    transport?: {
      truckNumber?: string | null;
      driverName?: string | null;
      driverMobile?: string | null;
      transporterName?: string | null;
    } | null;
    weighbridgeSlip?: {
      id?: string;
      rstNumber?: string;
      receiptNumber?: string | null;
      weighbridgeName?: string;
      slipDate?: any;
      slipTime?: string | null;
      vehicleNumber?: string;
      driverName?: string;
      driverMobile?: string;
      grossWeightKg?: any;
      tareWeightKg?: any;
      netWeightKg?: any;
      remarks?: string | null;
      slipUrl?: string | null;
      fileName?: string | null;
    } | null;
    loadingRecord?: {
      id?: string;
      driverName?: string;
      driverMobile?: string;
      vehicleNumber?: string;
      transporterName?: string | null;
      vehicleType?: string | null;
      loadingStartTime?: string | null;
      loadingEndTime?: string | null;
      loadedBlockSize?: string | null;
      loadedCbm?: any;
      loadedMortarBags?: number | null;
      rstNumber?: string | null;
      grossWeight?: any;
      tareWeight?: any;
      netWeight?: any;
      remarks?: string | null;
    } | null;
  };
}

export function StaffWeighbridgeVehiclePanel({ order }: Props) {
  const [activeTab, setActiveTab] = useState<"WEIGHBRIDGE" | "VEHICLE" | "WHATSAPP">("WEIGHBRIDGE");

  // Weighbridge State
  const [rstNumber, setRstNumber] = useState(order.weighbridgeSlip?.rstNumber || order.loadingRecord?.rstNumber || "");
  const [receiptNumber, setReceiptNumber] = useState(order.weighbridgeSlip?.receiptNumber || "");
  const [weighbridgeName, setWeighbridgeName] = useState(order.weighbridgeSlip?.weighbridgeName || "Swarnim Plant Weighbridge");
  const [slipTime, setSlipTime] = useState(order.weighbridgeSlip?.slipTime || "");
  const [vehicleNumber, setVehicleNumber] = useState(
    order.weighbridgeSlip?.vehicleNumber || order.transport?.truckNumber || order.loadingRecord?.vehicleNumber || ""
  );
  const [driverName, setDriverName] = useState(
    order.weighbridgeSlip?.driverName || order.transport?.driverName || order.loadingRecord?.driverName || ""
  );
  const [driverMobile, setDriverMobile] = useState(
    order.weighbridgeSlip?.driverMobile || order.transport?.driverMobile || order.loadingRecord?.driverMobile || ""
  );
  const [netWeight, setNetWeight] = useState<number | "">(
    order.weighbridgeSlip?.netWeightKg
      ? Number(order.weighbridgeSlip.netWeightKg)
      : order.loadingRecord?.netWeight
      ? Number(order.loadingRecord.netWeight)
      : ""
  );
  const [remarks, setRemarks] = useState(order.weighbridgeSlip?.remarks || "");
  const [slipUrl, setSlipUrl] = useState(order.weighbridgeSlip?.slipUrl || "");
  const [fileName, setFileName] = useState(order.weighbridgeSlip?.fileName || "");
  const [fileType, setFileType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Loading & Vehicle State
  const [transporterName, setTransporterName] = useState(order.transport?.transporterName || order.loadingRecord?.transporterName || "");
  const [vehicleType, setVehicleType] = useState(order.loadingRecord?.vehicleType || "Heavy Multi-Axle Truck");
  const [loadingStartTime, setLoadingStartTime] = useState(order.loadingRecord?.loadingStartTime || "");
  const [loadingEndTime, setLoadingEndTime] = useState(order.loadingRecord?.loadingEndTime || "");
  const [loadedBlockSize, setLoadedBlockSize] = useState(order.loadingRecord?.loadedBlockSize || order.product?.sizeLabel || "6 Inch");
  const [loadedCbm, setLoadedCbm] = useState<number | "">(
    order.loadingRecord?.loadedCbm ? Number(order.loadingRecord.loadedCbm) : order.totalCbm ? Number(order.totalCbm) : ""
  );
  const [loadedMortarBags, setLoadedMortarBags] = useState<number | "">(
    typeof order.loadingRecord?.loadedMortarBags === "number" ? order.loadingRecord.loadedMortarBags : order.adhesiveBags ?? 0
  );

  const [isSlipPending, startSlipTransition] = useTransition();
  const [isVehiclePending, startVehicleTransition] = useTransition();

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/weighbridge", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setSlipUrl(data.url);
        setFileName(data.fileName);
        setFileType(data.fileType);
      } else {
        setUploadError(data.error || "Upload failed");
      }
    } catch (err: any) {
      setUploadError(err?.message || "File upload error");
    } finally {
      setIsUploading(false);
    }
  };

  // Google Maps URL
  const destinationAddress = order.formattedAddress || order.deliveryAddress;
  const mapsUrl =
    order.googleMapsUrl ||
    mapsHref(
      order.latitude ? Number(order.latitude) : null,
      order.longitude ? Number(order.longitude) : null,
      destinationAddress
    );

  // Generate WhatsApp Message Template (Section 8 - Driver Dispatch)
  const whatsappMessageText = buildDriverDeliveryWhatsAppMessage({
    driverName: driverName || "Driver",
    orderNo: order.orderNo,
    dcNumber: order.dcNumber || order.invoiceNo || null,
    vehicleNumber: vehicleNumber || "Assigned Vehicle",
    loadedCbm: loadedCbm !== "" ? loadedCbm : null,
    orderedCbm: order.totalCbm ? Number(order.totalCbm).toFixed(3) : null,
    approxBlocks: order.quantity,
    mortarBags: typeof loadedMortarBags === "number" ? loadedMortarBags : order.adhesiveBags ?? 0,
    netWeightKg: netWeight !== "" ? netWeight : null,
    deliveryAddress: destinationAddress,
    googleMapsLocation: mapsUrl,
  });

  const whatsappHref = driverMobile
    ? `https://wa.me/${normalizeWhatsAppPhone(driverMobile)}?text=${encodeURIComponent(whatsappMessageText)}`
    : null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Tab Switcher */}
      <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("WEIGHBRIDGE")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "WEIGHBRIDGE"
              ? "bg-white text-[#13789B] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Weighbridge Slip (Vajan)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("VEHICLE")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "VEHICLE"
              ? "bg-white text-[#13789B] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Driver & Vehicle Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("WHATSAPP")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "WHATSAPP"
              ? "bg-white text-emerald-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Send WhatsApp to Driver</span>
        </button>
      </div>

      {/* TAB 1: WEIGHBRIDGE SLIP MANAGEMENT */}
      {activeTab === "WEIGHBRIDGE" && (
        <form action={saveWeighbridgeSlipAction} className="space-y-4">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="slipUrl" value={slipUrl} />
          <input type="hidden" name="fileName" value={fileName} />
          <input type="hidden" name="fileType" value={fileType} />

          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-navy flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#13789B]" />
                <span>Weighbridge Slip / Vajan Slip Details</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record exact certified gross, tare, and net weights with uploaded slip voucher.
              </p>
            </div>
            {slipUrl && (
              <a
                href={slipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 border border-teal-200 text-[#13789B] px-3 py-1.5 text-xs font-bold hover:bg-teal-100 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View Weight Slip</span>
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Weighbridge Slip RST Number *
              </label>
              <input
                type="text"
                name="rstNumber"
                required
                value={rstNumber}
                onChange={(e) => setRstNumber(e.target.value)}
                placeholder="e.g. RST-98214"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono font-bold text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Receipt / Slip Number (if different)
              </label>
              <input
                type="text"
                name="receiptNumber"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="e.g. RCP-0045"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Weighbridge Name *
              </label>
              <input
                type="text"
                name="weighbridgeName"
                required
                value={weighbridgeName}
                onChange={(e) => setWeighbridgeName(e.target.value)}
                placeholder="Swarnim Plant Weighbridge"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Vehicle Registration Number *
              </label>
              <input
                type="text"
                name="vehicleNumber"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="GJ-01-AB-1234"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono font-black text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Driver Full Name *
              </label>
              <input
                type="text"
                name="driverName"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Driver Name"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-navy outline-none focus:border-[#13789B]"
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
                value={driverMobile}
                onChange={(e) => setDriverMobile(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-navy outline-none focus:border-[#13789B]"
              />
            </div>
          </div>

          {/* Weight Field: Only Net Weight (KG) */}
          <div className="rounded-2xl bg-teal-50/60 border border-teal-200/80 p-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label htmlFor="netWeightKgInput" className="block text-xs font-black uppercase tracking-wider text-[#13789B]">
                Net Weight (KG) *
              </label>
              <span className="text-[11px] text-teal-800 font-medium">
                Direct entry from official weighbridge slip (e.g. 18500)
              </span>
            </div>
            <div className="relative">
              <input
                id="netWeightKgInput"
                type="number"
                name="netWeightKg"
                required
                step="0.01"
                min="1"
                value={netWeight}
                onChange={(e) => setNetWeight(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 18500"
                className="w-full rounded-xl border border-teal-300 bg-white px-4 py-3 font-mono text-lg font-black text-navy outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 font-mono pointer-events-none">
                KG
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Enter the verified physical Net Weight from the slip. Gross and Tare calculations are no longer required.
            </p>
          </div>

          {/* Slip Upload & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Upload Weighbridge Slip (JPG, PNG, PDF)
              </label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-300 hover:border-[#13789B] bg-slate-50 px-3.5 py-2.5 font-bold text-slate-700 transition-colors">
                  <Upload className="h-4 w-4 text-[#13789B]" />
                  <span>Choose Slip File</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {isUploading && <Loader2 className="h-4 w-4 animate-spin text-[#13789B]" />}
                {fileName && (
                  <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                    {fileName}
                  </span>
                )}
              </div>
              {uploadError && <p className="text-xs text-rose-600 mt-1">{uploadError}</p>}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Loading Remarks</label>
              <input
                type="text"
                name="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Weighbridge calibration checked / Sealed consignment"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-navy outline-none focus:border-[#13789B]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSlipPending || !rstNumber || !vehicleNumber || typeof netWeight !== "number" || netWeight <= 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0f607d] disabled:bg-slate-300 py-3 px-6 text-sm font-black text-white shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>SAVE WEIGHBRIDGE DETAILS</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: DRIVER & VEHICLE DETAILS (SECTION 7) */}
      {activeTab === "VEHICLE" && (
        <form action={saveLoadingAndVehicleAction} className="space-y-4">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="rstNumber" value={rstNumber} />
          <input type="hidden" name="netWeight" value={netWeight} />

          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-navy flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#13789B]" />
              <span>Loading & Vehicle Details (Section 7)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify driver, vehicle, loading timestamps, loaded CBM, and jointing mortar bags.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Driver Full Name *</label>
              <input
                type="text"
                name="driverName"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Full Name"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Driver Contact Number *</label>
              <input
                type="tel"
                name="driverMobile"
                required
                value={driverMobile}
                onChange={(e) => setDriverMobile(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Vehicle Registration Number *</label>
              <input
                type="text"
                name="vehicleNumber"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="GJ-01-AB-1234"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-black text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Transporter Name</label>
              <input
                type="text"
                name="transporterName"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                placeholder="e.g. Swarnim Logistics / Direct Truck"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Vehicle Type</label>
              <input
                type="text"
                name="vehicleType"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="e.g. 10 Wheeler / 14 Wheeler / 22 Wheeler"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Loaded AAC Block Size</label>
              <input
                type="text"
                name="loadedBlockSize"
                value={loadedBlockSize}
                onChange={(e) => setLoadedBlockSize(e.target.value)}
                placeholder="e.g. 6 Inch (600 × 200 × 150 mm)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Loading Start Time</label>
              <input
                type="text"
                name="loadingStartTime"
                value={loadingStartTime}
                onChange={(e) => setLoadingStartTime(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-navy outline-none focus:border-[#13789B]"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Loaded CBM (m³)</label>
              <input
                type="number"
                step="0.001"
                name="loadedCbm"
                value={loadedCbm}
                onChange={(e) => setLoadedCbm(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 18.000"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Block Jointing Morter (40 KG Bags)</label>
              <input
                type="number"
                name="loadedMortarBags"
                value={loadedMortarBags}
                onChange={(e) => setLoadedMortarBags(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 10"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold text-navy outline-none focus:border-[#13789B]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Remarks</label>
              <input
                type="text"
                name="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Clean truck bed / Tarp securely tied"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none focus:border-[#13789B]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isVehiclePending || !driverName || !vehicleNumber}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0f607d] disabled:bg-slate-300 py-3 px-6 text-sm font-black text-white shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>SAVE VEHICLE & LOADING DETAILS</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: WHATSAPP DRIVER INTEGRATION (SECTION 8) */}
      {activeTab === "WHATSAPP" && (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-navy flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>Send Delivery Details to Driver via WhatsApp (Section 8)</span>
              </h3>
              <p className="text-slate-500 mt-0.5">
                Generate prefilled click-to-chat dispatch message with Google Maps navigation link.
              </p>
            </div>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-2.5 px-5 font-black text-white shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>OPEN WHATSAPP MESSAGE</span>
              </a>
            )}
          </div>

          {/* Destination & Map Quick Link */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-[#13789B] mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-navy block">{destinationAddress}</span>
                {order.latitude && order.longitude && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Coordinates: {order.latitude}, {order.longitude}
                  </span>
                )}
              </div>
            </div>
            <OpenLocationButton
              address={destinationAddress}
              googleMapsUrl={mapsUrl}
              variant="button"
            />
          </div>

          {/* Prefilled Message Review Box */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              Message Preview (Template Compliant with Section 8)
            </label>
            <textarea
              readOnly
              rows={12}
              value={whatsappMessageText}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5 font-mono text-xs text-slate-800 leading-relaxed outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-500">
              Driver Phone: <strong className="text-navy font-mono">{driverMobile || "Not entered"}</strong>
            </p>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 px-6 text-sm font-black text-white shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>OPEN WHATSAPP MESSAGE</span>
              </a>
            ) : (
              <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                Please enter driver mobile number in the Weighbridge or Vehicle tab first.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
