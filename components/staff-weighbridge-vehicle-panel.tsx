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
  User,
  Clock,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Phone,
} from "lucide-react";
import { saveWeighbridgeSlipAction } from "@/lib/actions/orders";
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
    customer?: {
      name?: string | null;
      companyName?: string | null;
      mobile?: string | null;
      email?: string | null;
    } | null;
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
  // Merged view by default, WhatsApp available in tab
  const [activeTab, setActiveTab] = useState<"LOGISTICS" | "WHATSAPP">("LOGISTICS");

  // Shared Canonical State
  const [rstNumber, setRstNumber] = useState(
    order.weighbridgeSlip?.rstNumber || order.loadingRecord?.rstNumber || ""
  );
  const [receiptNumber, setReceiptNumber] = useState(
    order.weighbridgeSlip?.receiptNumber || ""
  );
  const [weighbridgeName, setWeighbridgeName] = useState(
    order.weighbridgeSlip?.weighbridgeName || "Swarnim Plant Weighbridge"
  );
  const [slipTime, setSlipTime] = useState(order.weighbridgeSlip?.slipTime || "");
  const [vehicleNumber, setVehicleNumber] = useState(
    order.weighbridgeSlip?.vehicleNumber ||
      order.transport?.truckNumber ||
      order.loadingRecord?.vehicleNumber ||
      ""
  );
  const [driverName, setDriverName] = useState(
    order.weighbridgeSlip?.driverName ||
      order.transport?.driverName ||
      order.loadingRecord?.driverName ||
      ""
  );
  const [driverMobile, setDriverMobile] = useState(
    order.weighbridgeSlip?.driverMobile ||
      order.transport?.driverMobile ||
      order.loadingRecord?.driverMobile ||
      ""
  );
  const [transporterName, setTransporterName] = useState(
    order.transport?.transporterName || order.loadingRecord?.transporterName || ""
  );

  // Active Weight Rule: ONLY Net Weight (KG) is entered (No Gross/Tare calculations)
  const [netWeight, setNetWeight] = useState<number | "">(
    order.weighbridgeSlip?.netWeightKg
      ? Number(order.weighbridgeSlip.netWeightKg)
      : order.loadingRecord?.netWeight
      ? Number(order.loadingRecord.netWeight)
      : ""
  );

  const [remarks, setRemarks] = useState(
    order.weighbridgeSlip?.remarks || order.loadingRecord?.remarks || ""
  );
  const [loadingStartTime, setLoadingStartTime] = useState(
    order.loadingRecord?.loadingStartTime || ""
  );
  const [loadingEndTime, setLoadingEndTime] = useState(
    order.loadingRecord?.loadingEndTime || ""
  );

  // Weighbridge Slip Document Upload
  const [slipUrl, setSlipUrl] = useState(order.weighbridgeSlip?.slipUrl || "");
  const [fileName, setFileName] = useState(order.weighbridgeSlip?.fileName || "");
  const [fileType, setFileType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [isSaving, startSavingTransition] = useTransition();

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

  // Customer identity & verified mobile
  const rawCustName = order.customer?.name?.trim();
  const rawCompName = order.customer?.companyName?.trim();
  const isEmail = (s?: string | null) => Boolean(s && s.includes("@"));
  const customerName = (rawCustName && !isEmail(rawCustName))
    ? rawCustName
    : (rawCompName && !isEmail(rawCompName))
    ? rawCompName
    : rawCustName || "Valued Customer";

  const initialCustomerMobile = order.customer?.mobile?.trim().replace(/\D/g, "") || "";
  const [customerMobile, setCustomerMobile] = useState<string>(initialCustomerMobile);

  const cleanCustomerMobile = customerMobile.replace(/\D/g, "");
  const isCustomerMobileValid = cleanCustomerMobile.length === 10;

  // Google Maps URL
  const destinationAddress = order.formattedAddress || order.deliveryAddress;
  const mapsUrl =
    order.googleMapsUrl ||
    mapsHref(
      order.latitude ? Number(order.latitude) : null,
      order.longitude ? Number(order.longitude) : null,
      destinationAddress
    );

  // Generate WhatsApp Message Template (Driver Dispatch)
  const whatsappMessageText = buildDriverDeliveryWhatsAppMessage({
    driverName: driverName || "Driver",
    driverMobile: driverMobile,
    orderNo: order.orderNo,
    customerName,
    customerMobile: isCustomerMobileValid ? cleanCustomerMobile : customerMobile,
    dcNumber: order.dcNumber || order.invoiceNo || null,
    vehicleNumber: vehicleNumber || "Assigned Vehicle",
    loadedCbm: order.totalCbm ? Number(order.totalCbm).toFixed(3) : null,
    orderedCbm: order.totalCbm ? Number(order.totalCbm).toFixed(3) : null,
    approxBlocks: order.quantity,
    mortarBags: order.adhesiveBags ?? 0,
    netWeightKg: netWeight !== "" ? netWeight : null,
    deliveryAddress: destinationAddress,
    googleMapsLocation: mapsUrl,
    materialItems: order.items || [],
  });

  const whatsappHref = driverMobile && isCustomerMobileValid
    ? `https://wa.me/${normalizeWhatsAppPhone(driverMobile)}?text=${encodeURIComponent(
        whatsappMessageText
      )}`
    : null;

  const isFormValid =
    rstNumber.trim().length > 0 &&
    vehicleNumber.trim().length > 0 &&
    driverName.trim().length > 0 &&
    driverMobile.trim().length > 0 &&
    typeof netWeight === "number" &&
    netWeight > 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5">
      {/* Tab Switcher: Merged Logistics Form & Driver WhatsApp */}
      <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("LOGISTICS")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "LOGISTICS"
              ? "bg-white text-[#13789B] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Truck className="h-4 w-4 text-[#13789B]" />
          <span>Driver, Vehicle & Weighbridge Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("WHATSAPP")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "WHATSAPP"
              ? "bg-white text-emerald-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="h-4 w-4 text-emerald-600" />
          <span>Send WhatsApp to Driver</span>
        </button>
      </div>

      {/* MERGED SECTION: DRIVER, VEHICLE & WEIGHBRIDGE DETAILS */}
      {activeTab === "LOGISTICS" && (
        <form
          action={async (formData) => {
            startSavingTransition(async () => {
              await saveWeighbridgeSlipAction(formData);
            });
          }}
          className="space-y-6"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="slipUrl" value={slipUrl} />
          <input type="hidden" name="fileName" value={fileName} />
          <input type="hidden" name="fileType" value={fileType} />

          {/* Section Header */}
          <div className="border-b border-slate-100 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#13789B] border border-teal-200">
                  <Scale className="h-4 w-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-navy">
                  Driver, Vehicle & Weighbridge Details
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Record verified net weighbridge dispatch weight, vehicle registration, driver contact and logistics details.
              </p>
            </div>

            {slipUrl && (
              <a
                href={slipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 border border-teal-200 text-[#13789B] px-3.5 py-1.5 text-xs font-bold hover:bg-teal-100 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View Weight Slip</span>
              </a>
            )}
          </div>

          {/* Subsection 1: Driver & Vehicle Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
              <User className="h-4 w-4 text-[#13789B]" />
              <span>Driver & Vehicle Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                  Driver Full Name <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  name="driverName"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver Full Name"
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 font-bold text-navy text-xs sm:text-sm outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                  Driver Mobile Number <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="tel"
                  name="driverMobile"
                  required
                  value={driverMobile}
                  onChange={(e) => setDriverMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 font-mono font-bold text-navy text-xs sm:text-sm outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                  Vehicle Registration Number <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="GJ-01-AB-1234"
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 font-mono font-black text-navy text-sm uppercase tracking-wider outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                  Transporter / Logistics Agency
                </label>
                <input
                  type="text"
                  name="transporterName"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  placeholder="e.g. Swarnim Logistics / Direct Truck"
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 font-bold text-navy text-xs sm:text-sm outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Subsection 2: Weighbridge Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
              <Scale className="h-4 w-4 text-[#13789B]" />
              <span>Weighbridge & Net Weight Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                  Weighbridge Slip RST Number <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  name="rstNumber"
                  required
                  value={rstNumber}
                  onChange={(e) => setRstNumber(e.target.value)}
                  placeholder="e.g. RST-98214"
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 font-mono font-bold text-navy text-xs sm:text-sm outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                  Receipt / Slip Number (if different)
                </label>
                <input
                  type="text"
                  name="receiptNumber"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="e.g. RCP-0045"
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 font-mono text-navy text-xs sm:text-sm outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                  Weighbridge Name <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  name="weighbridgeName"
                  required
                  value={weighbridgeName}
                  onChange={(e) => setWeighbridgeName(e.target.value)}
                  placeholder="Swarnim Plant Weighbridge"
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 font-bold text-navy text-xs sm:text-sm outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                />
              </div>
            </div>

            {/* Crucial Weight Rule: Only Net Weight (KG) is entered */}
            <div className="rounded-2xl bg-teal-50/70 border border-teal-200/90 p-4 sm:p-5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label
                  htmlFor="netWeightKgInput"
                  className="block text-xs sm:text-sm font-black uppercase tracking-wider text-[#13789B]"
                >
                  Net Weight (KG) *
                </label>
                <span className="text-[11px] text-teal-800 font-medium">
                  Direct entry from official weighbridge slip
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
                  onChange={(e) =>
                    setNetWeight(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="e.g. 18500"
                  className="w-full rounded-xl border border-teal-300 bg-white px-4 py-3 font-mono text-xl sm:text-2xl font-black text-navy outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 font-mono pointer-events-none">
                  KG
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Enter the verified physical Net Weight from the slip. Gross and Tare calculations are no longer required.
              </p>
            </div>
          </div>

          {/* Subsection 3: Weighbridge Slip Upload & Remarks */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Upload Weighbridge Slip (JPG, PNG, PDF)
                </label>
                <div className="flex items-center gap-2.5">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-300 hover:border-[#13789B] bg-slate-50 hover:bg-slate-100 px-4 py-2.5 font-bold text-slate-700 transition-colors">
                    <Upload className="h-4 w-4 text-[#13789B]" />
                    <span>Choose Slip File</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {isUploading && (
                    <div className="flex items-center gap-1.5 text-xs text-[#13789B] font-bold">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                  {fileName && (
                    <span className="text-xs text-slate-700 font-medium truncate max-w-[220px] bg-slate-100 px-2.5 py-1 rounded-lg">
                      {fileName}
                    </span>
                  )}
                </div>
                {uploadError && <p className="text-xs text-rose-600 mt-1">{uploadError}</p>}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Logistics & Loading Remarks
                </label>
                <input
                  type="text"
                  name="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Weighbridge calibration checked / Sealed consignment"
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-navy text-xs sm:text-sm outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                />
              </div>
            </div>

            {/* Optional Loading Start & End Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs pt-1">
              <div>
                <label className="block font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Loading Start Time (Optional)</span>
                </label>
                <input
                  type="text"
                  name="loadingStartTime"
                  value={loadingStartTime}
                  onChange={(e) => setLoadingStartTime(e.target.value)}
                  placeholder="e.g. 10:30 AM"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3 font-mono text-navy text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Loading Completion Time (Optional)</span>
                </label>
                <input
                  type="text"
                  name="loadingEndTime"
                  value={loadingEndTime}
                  onChange={(e) => setLoadingEndTime(e.target.value)}
                  placeholder="e.g. 11:45 AM"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3 font-mono text-navy text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Unified Save Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400 font-medium">
              * Driver Name, Mobile, Vehicle Number, RST Number & Net Weight are required.
            </span>
            <button
              type="submit"
              disabled={isSaving || !isFormValid}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0f607d] disabled:bg-slate-300 py-3.5 px-7 text-sm font-black text-white shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Details...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Driver, Vehicle & Weighbridge Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: WHATSAPP DRIVER INTEGRATION */}
      {activeTab === "WHATSAPP" && (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-navy flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>Send Delivery Details to Driver via WhatsApp</span>
              </h3>
              <p className="text-slate-500 mt-0.5">
                Dispatch message contains complete loaded materials, Customer Contact, and Google Maps link.
              </p>
            </div>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-2.5 px-5 font-black text-white shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>OPEN WHATSAPP MESSAGE</span>
              </a>
            ) : !driverMobile ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-500 px-3.5 py-2 text-xs font-bold">
                Driver Mobile Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 px-3.5 py-2 text-xs font-bold">
                Enter Valid Customer Mobile Below
              </span>
            )}
          </div>

          {/* Missing or Incomplete Customer Contact Warning Banner */}
          {!isCustomerMobileValid ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-black text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Customer Mobile Number Missing or Incomplete</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                The driver must receive the customer&apos;s direct phone number to coordinate arrival and site unloading. Please specify the verified 10-digit customer mobile number before opening WhatsApp:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 max-w-sm">
                <div className="relative flex-1 min-w-[200px]">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Enter 10-digit customer mobile"
                    className="w-full h-9 rounded-xl border border-amber-300 bg-white pl-9 pr-3 font-mono font-bold text-navy text-xs outline-none focus:border-[#13789B] focus:ring-1 focus:ring-[#13789B]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-teal-50/70 border border-teal-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-teal-950 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Customer Contact for Driver: <strong className="font-mono text-navy font-black">{customerMobile}</strong> ({customerName})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  maxLength={10}
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  title="Edit Customer Mobile"
                  className="w-32 h-8 rounded-lg border border-teal-300 bg-white px-2 font-mono font-bold text-navy text-[11px] outline-none focus:border-[#13789B]"
                />
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3 font-mono">
            <div className="flex flex-wrap items-center justify-between text-slate-500 text-[11px] pb-2 border-b border-slate-200 font-sans gap-2">
              <span>Driver: <strong className="text-navy">{driverName || "Driver"}</strong> ({driverMobile || "No Mobile Set"})</span>
              <span>Vehicle: <strong className="text-navy">{vehicleNumber || "Not Set"}</strong></span>
              <span>Customer: <strong className="text-navy">{customerName}</strong> ({customerMobile || "No Number"})</span>
            </div>
            <pre className="text-slate-800 text-xs whitespace-pre-wrap font-mono leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
              {whatsappMessageText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
