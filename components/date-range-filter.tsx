"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Check,
  RotateCcw,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  DATE_PRESETS,
  DatePresetKey,
  resolveDateRange,
  formatISTDate,
} from "@/lib/date-utils";

export function DateRangeFilter({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentPreset = (searchParams.get("preset") as DatePresetKey) || "this_month";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";

  // Resolve current active state for display
  const resolved = resolveDateRange(currentPreset, currentFrom, currentTo);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePresetKey>(currentPreset);
  const [customStart, setCustomStart] = useState<string>(
    currentFrom || formatISTDate(new Date())
  );
  const [customEnd, setCustomEnd] = useState<string>(
    currentTo || formatISTDate(new Date())
  );
  const [validationError, setValidationError] = useState<string>("");

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keep state in sync with URL
  useEffect(() => {
    setSelectedPreset(currentPreset);
    if (currentFrom) setCustomStart(currentFrom);
    if (currentTo) setCustomEnd(currentTo);
  }, [currentPreset, currentFrom, currentTo]);

  const applyFilter = (preset: DatePresetKey, fromVal?: string, toVal?: string) => {
    setValidationError("");
    const params = new URLSearchParams(searchParams.toString());

    // Reset pagination to page 1 when date filter changes
    params.delete("page");

    if (preset === "all_time") {
      params.set("preset", "all_time");
      params.delete("from");
      params.delete("to");
    } else if (preset === "custom") {
      if (!fromVal || !toVal) {
        setValidationError("Please select both start and end dates.");
        return;
      }
      if (fromVal > toVal) {
        setValidationError("Start date cannot be after end date.");
        return;
      }
      params.set("preset", "custom");
      params.set("from", fromVal);
      params.set("to", toVal);
    } else {
      const computed = resolveDateRange(preset);
      params.set("preset", preset);
      if (computed.fromParam) params.set("from", computed.fromParam);
      else params.delete("from");
      if (computed.toParam) params.set("to", computed.toParam);
      else params.delete("to");
    }

    setIsOpen(false);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleReset = () => {
    applyFilter("this_month");
  };

  const isFiltered = currentPreset !== "all_time";

  return (
    <div className={`relative inline-block text-left ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-all shadow-xs ${
          isFiltered
            ? "border-[#13789B] bg-[#13789B]/10 text-[#13789B] font-bold"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        } ${isPending ? "opacity-70 animate-pulse" : ""}`}
        title="Filter by period or date range"
      >
        <CalendarIcon
          className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
            isFiltered ? "text-[#13789B]" : "text-slate-400"
          }`}
        />

        <div className="flex items-center gap-1.5 truncate">
          <span className="hidden sm:inline text-slate-500 font-medium">Period:</span>
          <span className="truncate max-w-[150px] sm:max-w-[200px] text-navy font-bold">
            {resolved.label}
          </span>
        </div>

        {isFiltered && (
          <span className="flex h-2 w-2 rounded-full bg-[#13789B] ring-2 ring-white" />
        )}

        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover / Dropdown Menu - Aligned centered on mobile, right on desktop */}
      {isOpen && (
        <>
          {/* Mobile backdrop overlay to prevent clicks leaking and allow easy dismissal */}
          <div
            className="fixed inset-0 z-40 bg-navy/30 backdrop-blur-xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-3 top-20 sm:top-auto sm:inset-x-auto sm:absolute sm:right-0 z-50 mt-1 sm:mt-2 w-auto sm:w-[400px] max-w-[calc(100vw-1.5rem)] sm:max-w-[420px] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#13789B]/10 text-[#13789B]">
                <Clock className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-navy">
                Filter Date Range
              </h4>
            </div>

            {currentPreset !== "this_month" && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          {/* Quick Presets Grid */}
          <div className="mt-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Factory Operational Presets
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {DATE_PRESETS.filter((p) => p.key !== "custom").map((preset) => {
                const active = selectedPreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.key);
                      applyFilter(preset.key);
                    }}
                    className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                      active
                        ? "bg-[#13789B] text-white font-bold shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-navy"
                    }`}
                  >
                    <span className="truncate">{preset.label}</span>
                    {active && <Check className="h-3 w-3 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Range Section */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Custom Date Range
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Asia/Kolkata (IST)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => {
                    setCustomStart(e.target.value);
                    setSelectedPreset("custom");
                    setValidationError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-navy outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => {
                    setCustomEnd(e.target.value);
                    setSelectedPreset("custom");
                    setValidationError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-navy outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>
            </div>

            {validationError && (
              <p className="mt-2 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <span>⚠</span> {validationError}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => applyFilter("custom", customStart, customEnd)}
                className="flex items-center gap-1.5 rounded-xl bg-[#13789B] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all"
              >
                <span>Apply Range</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
