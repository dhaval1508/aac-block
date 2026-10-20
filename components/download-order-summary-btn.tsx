"use client";

import { FileDown, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export function DownloadOrderSummaryButton({
  orderId,
  orderNo,
  className,
}: {
  orderId: string;
  orderNo: string;
  className?: string;
}) {
  const handleOpen = () => {
    window.open(`/api/orders/${orderId}/summary-pdf`, "_blank");
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:text-navy transition-all shadow-xs cursor-pointer",
        className
      )}
    >
      <FileDown className="h-4 w-4 text-[#13789B]" />
      <span>Download Order Summary (PDF)</span>
    </button>
  );
}

export { DownloadOrderSummaryButton as DownloadOrderSummaryBtn };
