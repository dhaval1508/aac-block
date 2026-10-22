"use client";

import React from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { mapsHref } from "@/lib/utils";

interface Props {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  className?: string;
  variant?: "button" | "badge" | "link" | "full";
  customLabel?: string;
}

export function OpenLocationButton({
  address,
  latitude,
  longitude,
  googleMapsUrl,
  className = "",
  variant = "badge",
  customLabel,
}: Props) {
  const url = googleMapsUrl || mapsHref(address, latitude, longitude);
  if (!url) return null;

  if (variant === "button") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 text-xs font-bold text-[#13789B] transition-all shrink-0 cursor-pointer shadow-2xs ${className}`}
        title="Open destination site in Google Maps (opens in new tab / Maps app)"
      >
        <MapPin className="h-3.5 w-3.5 text-[#13789B] shrink-0" />
        <span>{customLabel || "Open Location →"}</span>
      </a>
    );
  }

  if (variant === "full") {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <p className="text-xs text-slate-700 leading-relaxed break-words">{address}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1 text-xs font-bold text-[#13789B] transition-colors cursor-pointer"
        >
          <MapPin className="h-3.5 w-3.5 text-[#13789B] shrink-0" />
          <span>{customLabel || "Open Location →"}</span>
          <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
        </a>
      </div>
    );
  }

  if (variant === "link") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 text-xs font-bold text-[#13789B] hover:text-[#0F627F] hover:underline cursor-pointer ${className}`}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span>{customLabel || "Open Location →"}</span>
      </a>
    );
  }

  // Default: "badge"
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200/80 px-2 py-0.5 text-[11px] font-bold text-[#13789B] transition-colors shrink-0 cursor-pointer ${className}`}
      title="Open destination site in Google Maps"
    >
      <MapPin className="h-3 w-3 shrink-0" />
      <span>{customLabel || "Open Location →"}</span>
    </a>
  );
}
