"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Search,
  ExternalLink,
  Building,
  Navigation,
  CheckCircle2,
  Sparkles,
  Map,
} from "lucide-react";
import { mapsHref } from "@/lib/utils";

export interface DeliveryLocationData {
  address: string;
  locationSource: "GOOGLE_MAPS" | "MANUAL";
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
  const [activeTab, setActiveTab] = useState<"SEARCH" | "CUSTOM">(
    value.locationSource === "MANUAL" && !value.googlePlaceId ? "CUSTOM" : "SEARCH"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debouncing
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/maps/places?input=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.predictions || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Failed to fetch location suggestions", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (place: any) => {
    setSearchQuery(place.description);
    setShowDropdown(false);
    onChange({
      address: place.description,
      locationSource: "GOOGLE_MAPS",
      googlePlaceId: place.placeId,
      latitude: place.lat ?? value.latitude,
      longitude: place.lng ?? value.longitude,
      city: place.city || value.city || "Ahmedabad",
      district: place.district || value.district || "Ahmedabad",
      state: place.state || value.state || "Gujarat",
      pincode: place.pincode || value.pincode,
      customSiteName: place.mainText,
      villageArea: place.secondaryText,
      nearbyLandmark: value.nearbyLandmark,
    });
  };

  const handleDetectGPS = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onChange({
            ...value,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        (err) => {
          console.warn("Geolocation warning:", err.message);
        }
      );
    }
  };

  const mapsUrl = mapsHref(value.latitude, value.longitude, value.address);

  return (
    <div className="space-y-4">
      {/* Mode Selection Tabs: Option A vs Option B */}
      <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveTab("SEARCH")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "SEARCH"
              ? "bg-white text-[#13789B] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Option A: Search on Google Maps</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveTab("CUSTOM")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "CUSTOM"
              ? "bg-white text-[#13789B] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building className="h-3.5 w-3.5" />
          <span>Option B: Enter Custom Delivery Location</span>
        </button>
      </div>

      {/* OPTION A: Google Maps Search */}
      {activeTab === "SEARCH" && (
        <div className="space-y-2 relative" ref={dropdownRef}>
          <label className="block text-xs font-bold text-slate-700">
            Search Delivery Location (Google Places)
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              disabled={disabled}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='e.g. "Ganesh Glory Ahmedabad", "Sanand GIDC", "Science City"'
              className="w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-10 py-3 text-sm font-medium text-navy placeholder:text-slate-400 focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 outline-none transition-all"
            />
            {isLoading && (
              <div className="absolute right-3.5 top-3.5">
                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-[#13789B] border-t-transparent" />
              </div>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl space-y-0.5 max-h-60 overflow-y-auto">
              {suggestions.map((p, idx) => (
                <button
                  key={p.placeId || idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(p)}
                  className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-teal-50/70 transition-colors cursor-pointer group"
                >
                  <MapPin className="h-4 w-4 text-[#13789B] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-black text-navy group-hover:text-[#13789B]">
                      {p.mainText || p.description}
                    </div>
                    {p.secondaryText && (
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {p.secondaryText}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            Search cities, villages, areas, societies, construction sites, businesses, landmarks, and roads.
          </p>
        </div>
      )}

      {/* OPTION B: Custom Address Details */}
      {activeTab === "CUSTOM" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Building / Project / Site Name
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
                placeholder="e.g. Shivalik Residency, Site #4"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Village / Area / Colony
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
                placeholder="e.g. Jagatpur, Chenpur, Bopal"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Site Address <span className="text-red-500">*</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GPS Map Pin / Coordinates (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={disabled}
                  value={
                    value.latitude && value.longitude
                      ? `${value.latitude}, ${value.longitude}`
                      : ""
                  }
                  onChange={(e) => {
                    const parts = e.target.value.split(",");
                    if (parts.length === 2) {
                      const lat = parseFloat(parts[0].trim());
                      const lng = parseFloat(parts[1].trim());
                      if (!isNaN(lat) && !isNaN(lng)) {
                        onChange({ ...value, latitude: lat, longitude: lng });
                      }
                    }
                  }}
                  placeholder="23.1118, 72.5412"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-navy focus:border-[#13789B] outline-none"
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleDetectGPS}
                  title="Detect current device location pin"
                  className="rounded-xl border border-slate-300 hover:border-[#13789B] hover:text-[#13789B] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">GPS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Location Confirmation & View on Google Maps Banner */}
      {value.address && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-[#13789B] mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#13789B]">
                  Confirmed Destination ({value.locationSource === "GOOGLE_MAPS" ? "Google Maps" : "Custom Site"})
                </span>
                {value.latitude && value.longitude && (
                  <span className="text-[10px] bg-teal-200/60 text-teal-900 font-mono px-1.5 py-0.2 rounded-md font-semibold">
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

          {mapsUrl && (
            <a
              href={mapsUrl}
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
