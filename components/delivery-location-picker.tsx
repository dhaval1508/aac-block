"use client";

import { useState } from "react";
import {
  Navigation,
  Link2,
  Building,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";

export interface DeliveryLocationData {
  address: string;
  locationSource: "GPS" | "GOOGLE_MAPS_LINK" | "MANUAL";
  googleMapsUrl?: string;
  googlePlaceId?: string;
  latitude?: number;
  longitude?: number;
  customSiteName?: string;
  villageArea?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  nearbyLandmark?: string;
}

interface Props {
  value: DeliveryLocationData;
  onChange: (val: DeliveryLocationData) => void;
  disabled?: boolean;
}

export function DeliveryLocationPicker({ value, onChange, disabled }: Props) {
  const [activeTab, setActiveTab] = useState<"GPS" | "LINK" | "MANUAL">(
    value.locationSource === "GPS"
      ? "GPS"
      : value.locationSource === "GOOGLE_MAPS_LINK"
      ? "LINK"
      : "MANUAL"
  );

  // GPS state
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Link state
  const [mapsLinkInput, setMapsLinkInput] = useState(value.googleMapsUrl || "");
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Option 1: USE MY CURRENT LOCATION (Browser Geolocation API)
  // ---------------------------------------------------------------------------
  const handleUseCurrentLocation = () => {
    setGpsError(null);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError(
        "Geolocation is not supported by your browser. Please paste a Google Maps link or enter your site address manually."
      );
      return;
    }

    setIsDetectingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        let formattedAddress = `GPS Location: ${lat}, ${lng}`;
        let city = value.city || "Ahmedabad";
        let district = value.district || "Ahmedabad";
        let state = value.state || "Gujarat";
        let pincode = value.pincode || "";

        try {
          const res = await fetch("/api/maps/reverse-geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          });
          const data = await res.json();
          if (data.success && data.address) {
            formattedAddress = data.address;
            if (data.city) city = data.city;
            if (data.district) district = data.district;
            if (data.state) state = data.state;
            if (data.pincode) pincode = data.pincode;
          }
        } catch (err) {
          console.warn("Reverse geocode network warning:", err);
        }

        const generatedMapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

        onChange({
          ...value,
          locationSource: "GPS",
          latitude: lat,
          longitude: lng,
          address: formattedAddress,
          googleMapsUrl: generatedMapsLink,
          city,
          district,
          state,
          pincode,
        });

        setIsDetectingGps(false);
      },
      (err) => {
        setIsDetectingGps(false);
        let msg = "Could not retrieve your location.";
        if (err.code === 1) {
          msg = "Location permission was denied. Please allow location access in your browser, or paste a Google Maps link / enter address manually.";
        } else if (err.code === 2) {
          msg = "GPS position is unavailable. Please check your network or enter address manually.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please try again or enter address manually.";
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  // ---------------------------------------------------------------------------
  // Option 2: PASTE GOOGLE MAPS LOCATION LINK
  // ---------------------------------------------------------------------------
  const handleVerifyMapsLink = async () => {
    setLinkError(null);
    const trimmed = mapsLinkInput.trim();

    if (!trimmed) {
      setLinkError("Please paste your Google Maps link.");
      return;
    }

    setIsVerifyingLink(true);

    try {
      const res = await fetch("/api/maps/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setLinkError(data.error || "Invalid Google Maps link. Please check the URL.");
        setIsVerifyingLink(false);
        return;
      }

      const confirmedAddress =
        data.address ||
        data.siteName ||
        (data.latitude && data.longitude
          ? `Google Maps Site (${data.latitude}, ${data.longitude})`
          : value.address || "Google Maps Delivery Site");

      onChange({
        ...value,
        locationSource: "GOOGLE_MAPS_LINK",
        googleMapsUrl: data.originalUrl || trimmed,
        latitude: data.latitude ?? value.latitude,
        longitude: data.longitude ?? value.longitude,
        address: confirmedAddress,
        customSiteName: data.siteName || value.customSiteName,
        city: data.city || value.city || "Ahmedabad",
        state: data.state || value.state || "Gujarat",
      });
    } catch (err: any) {
      setLinkError("Network error while verifying link. You may enter the site address manually.");
    } finally {
      setIsVerifyingLink(false);
    }
  };

  // Compute live Google Maps link for the preview
  const liveMapsUrl =
    value.googleMapsUrl ||
    (value.latitude && value.longitude
      ? `https://www.google.com/maps?q=${value.latitude},${value.longitude}`
      : value.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.address)}`
      : null);

  return (
    <div className="space-y-4">
      {/* SECTION TITLE & THREE SELECTION TABS */}
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
          Select Delivery Location
        </label>
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setActiveTab("GPS")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "GPS"
                ? "bg-white text-[#13789B] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Navigation className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Use My Location</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setActiveTab("LINK")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "LINK"
                ? "bg-white text-[#13789B] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Paste Maps Link</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setActiveTab("MANUAL")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "MANUAL"
                ? "bg-white text-[#13789B] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Enter Manually</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          OPTION 1: USE MY CURRENT LOCATION
      ========================================================================= */}
      {activeTab === "GPS" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-navy uppercase tracking-wider">
                Option 1: Device GPS Location
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Quickly fetch your construction site coordinates directly from your phone or laptop.
              </p>
            </div>
            <button
              type="button"
              disabled={disabled || isDetectingGps}
              onClick={handleUseCurrentLocation}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#13789B] hover:bg-[#0f607d] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:bg-slate-300 shrink-0"
            >
              {isDetectingGps ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Locating Device...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Use My Current Location</span>
                </>
              )}
            </button>
          </div>

          {gpsError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">GPS Unavailable</span>
                <span>{gpsError}</span>
              </div>
            </div>
          )}

          {value.locationSource === "GPS" && value.latitude && value.longitude && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#13789B]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Location Selected Successfully</span>
                </span>
                <span className="text-[11px] font-mono text-slate-600 bg-teal-100/80 px-2 py-0.5 rounded-md font-semibold">
                  {value.latitude}, {value.longitude}
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Confirmed Site Address (You can adjust below if needed)
                </label>
                <textarea
                  rows={2}
                  disabled={disabled}
                  value={value.address || ""}
                  onChange={(e) => onChange({ ...value, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
                  placeholder="Street, area, landmarks..."
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={disabled || isDetectingGps}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-navy cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Change Location</span>
                </button>
                {liveMapsUrl && (
                  <a
                    href={liveMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline ml-auto"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          OPTION 2: PASTE GOOGLE MAPS LOCATION LINK
      ========================================================================= */}
      {activeTab === "LINK" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <h4 className="text-xs font-black text-navy uppercase tracking-wider">
              Option 2: Paste Google Maps Link
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Open Google Maps on your phone or computer, select your site pin, click <strong>Share</strong>, copy the link, and paste it here.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                disabled={disabled || isVerifyingLink}
                value={mapsLinkInput}
                onChange={(e) => setMapsLinkInput(e.target.value)}
                placeholder="Paste your Google Maps link here (e.g. https://maps.app.goo.gl/...)"
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 outline-none"
              />
            </div>
            <button
              type="button"
              disabled={disabled || isVerifyingLink || !mapsLinkInput.trim()}
              onClick={handleVerifyMapsLink}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#13789B] hover:bg-[#0f607d] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:bg-slate-300 shrink-0"
            >
              {isVerifyingLink ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verify Location</span>
                </>
              )}
            </button>
          </div>

          {linkError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{linkError}</span>
            </div>
          )}

          {value.locationSource === "GOOGLE_MAPS_LINK" && value.address && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#13789B]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Google Maps Link Verified Successfully</span>
                </span>
                {value.latitude && value.longitude && (
                  <span className="text-[11px] font-mono text-slate-600 bg-teal-100/80 px-2 py-0.5 rounded-md font-semibold">
                    {value.latitude}, {value.longitude}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Delivery Site Address Confirmation
                </label>
                <textarea
                  rows={2}
                  disabled={disabled}
                  value={value.address || ""}
                  onChange={(e) => onChange({ ...value, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
                  placeholder="Enter full address for the truck driver..."
                />
              </div>
              {liveMapsUrl && (
                <div className="pt-1 flex justify-end">
                  <a
                    href={liveMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline"
                  >
                    <span>View Destination on Google Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          OPTION 3: ENTER ADDRESS MANUALLY
      ========================================================================= */}
      {activeTab === "MANUAL" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <h4 className="text-xs font-black text-navy uppercase tracking-wider">
              Option 3: Enter Address Manually
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Enter your complete construction site or unloading address directly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Site / Building / Project Name
              </label>
              <input
                type="text"
                disabled={disabled}
                value={value.customSiteName || ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    customSiteName: e.target.value,
                    locationSource: "MANUAL",
                  })
                }
                placeholder="e.g. Ganesh Glory 11, Plot 42"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Area / Village / Sector
              </label>
              <input
                type="text"
                disabled={disabled}
                value={value.villageArea || ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    villageArea: e.target.value,
                    locationSource: "MANUAL",
                  })
                }
                placeholder="e.g. Jagatpur, GIDC, Bopal"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Delivery Address <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              disabled={disabled}
              value={value.address || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  address: e.target.value,
                  locationSource: "MANUAL",
                })
              }
              placeholder="Enter complete delivery site street address, plot number, road name..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">City</label>
              <input
                type="text"
                disabled={disabled}
                value={value.city || ""}
                onChange={(e) => onChange({ ...value, city: e.target.value })}
                placeholder="Ahmedabad"
                className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
              <input
                type="text"
                disabled={disabled}
                value={value.district || ""}
                onChange={(e) => onChange({ ...value, district: e.target.value })}
                placeholder="Ahmedabad"
                className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">State</label>
              <input
                type="text"
                disabled={disabled}
                value={value.state || "Gujarat"}
                onChange={(e) => onChange({ ...value, state: e.target.value })}
                placeholder="Gujarat"
                className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Pincode</label>
              <input
                type="text"
                disabled={disabled}
                value={value.pincode || ""}
                onChange={(e) => onChange({ ...value, pincode: e.target.value })}
                placeholder="382470"
                className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nearby Landmark
            </label>
            <input
              type="text"
              disabled={disabled}
              value={value.nearbyLandmark || ""}
              onChange={(e) => onChange({ ...value, nearbyLandmark: e.target.value })}
              placeholder="e.g. Near Nirma University, Opposite Bharat Petrol Pump"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          SELECTED LOCATION SUMMARY BANNER (Always visible when address is selected)
      ========================================================================= */}
      {value.address && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-[#13789B] mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#13789B]">
                  Confirmed Destination (
                  {value.locationSource === "GPS"
                    ? "Current GPS"
                    : value.locationSource === "GOOGLE_MAPS_LINK"
                    ? "Google Maps Link"
                    : "Manual Address"}
                  )
                </span>
                {value.latitude && value.longitude && (
                  <span className="text-[10px] bg-teal-200/60 text-teal-900 font-mono px-1.5 py-0.5 rounded-md font-semibold">
                    {value.latitude}, {value.longitude}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-navy mt-0.5 line-clamp-2">
                {value.address}
              </p>
              {value.nearbyLandmark && (
                <p className="text-[11px] text-slate-600 mt-0.5">
                  <strong>Landmark:</strong> {value.nearbyLandmark}
                </p>
              )}
            </div>
          </div>

          {liveMapsUrl && (
            <a
              href={liveMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#13789B] text-white px-3.5 py-2 text-xs font-bold hover:bg-[#0f607d] transition-colors shrink-0 shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View on Google Maps</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
