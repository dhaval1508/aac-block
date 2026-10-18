"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global runtime error:", error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 font-sans text-center" suppressHydrationWarning>
        <h2 className="text-xl font-bold text-slate-900">Application Error</h2>
        <p className="mt-2 text-xs text-slate-500">
          {error?.message || "An unexpected critical error occurred."}
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
