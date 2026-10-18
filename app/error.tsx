"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold text-navy">Something went wrong</h2>
      <p className="mt-1 max-w-md text-xs text-slate-500">
        {error?.message || "An unexpected error occurred while loading this page."}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try Again
        </button>
        <a
          href="/login"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}
