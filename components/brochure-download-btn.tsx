"use client";

import { Download, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function BrochureDownloadButton({
  className,
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "secondary" | "card";
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 2000);
  };

  if (variant === "card") {
    return (
      <div className={cn("rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/70 via-white to-amber-50/50 p-4 sm:p-5 shadow-xs", className)}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#13789B] text-white shadow-xs">
              <FileText className="h-6 w-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-navy tracking-tight">
                  Official Swarnim Product Brochure
                </h4>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 uppercase tracking-wide">
                  Verified PDF
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                4-page technical specifications, compressive strength, CBM formulas & masonry guidelines.
              </p>
            </div>
          </div>

          <a
            href="/downloads/Swarnim-AAC-Block-Brochure.pdf"
            download="Swarnim-AAC-Block-Brochure.pdf"
            onClick={handleDownload}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#13789B] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0F627F] transition-all shadow-xs shrink-0 cursor-pointer"
          >
            {downloading ? (
              <>
                <CheckCircle2 className="h-4 w-4 animate-bounce text-emerald-300" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download Swarnim AAC Block Brochure</span>
              </>
            )}
          </a>
        </div>
      </div>
    );
  }

  return (
    <a
      href="/downloads/Swarnim-AAC-Block-Brochure.pdf"
      download="Swarnim-AAC-Block-Brochure.pdf"
      onClick={handleDownload}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer",
        variant === "primary"
          ? "bg-[#13789B] text-white hover:bg-[#0F627F]"
          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-navy",
        className
      )}
    >
      {downloading ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Downloading...</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span>Download Swarnim AAC Block Brochure</span>
        </>
      )}
    </a>
  );
}
