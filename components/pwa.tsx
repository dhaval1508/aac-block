"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // In development mode, unregister any active service worker and clear stale caches
    // to prevent hydration mismatches between cached Webpack bundles and server HTML.
    const isDev =
      process.env.NODE_ENV !== "production" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isDev) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration failures in production edge cases.
    });
  }, []);

  return null;
}

export function InstallAppButton({
  className,
  variant = "primary",
  compact = false,
}: {
  className?: string;
  variant?: "primary" | "secondary" | "card";
  compact?: boolean;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setIosHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const showIos = isIos() && !deferred;
  const canPrompt = Boolean(deferred);

  // On desktop Chrome the prompt event may arrive after first paint.
  // Keep a visible install entry anyway so users know the app is installable.
  const label = compact ? "Install" : "Install App";

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferred(null);
      return;
    }
    if (showIos || isIos()) {
      setIosHelp(true);
      return;
    }
    // Fallback tip for browsers that hide the prompt until criteria are met
    setIosHelp(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className={cn(
          variant === "primary" && "btn-brand w-full rounded-2xl py-3 text-sm font-bold shadow-md transition-all hover:opacity-95",
          variant === "secondary" && "btn-secondary w-full rounded-2xl py-3 text-sm font-bold",
          variant === "card" &&
            "card flex w-full items-center gap-3 p-4 text-left font-semibold text-navy hover:shadow-md transition-shadow",
          className,
        )}
      >
        {variant === "card" ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
            <Download className="h-5 w-5" />
          </span>
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className={variant === "card" ? "flex-1" : undefined}>
          {label}
          {variant === "card" ? (
            <span className="mt-0.5 block text-sm font-normal text-slate-500">
              {canPrompt || showIos
                ? "Add Swarnim AAC Block to your home screen"
                : "Install for quick mobile access"}
            </span>
          ) : null}
        </span>
      </button>

      {iosHelp ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/60 backdrop-blur-xs p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 p-1.5 shadow-2xs">
                  <img src="/logo.png" alt="Swarnim AAC Logo" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-base font-black text-navy tracking-tight">Install Swarnim AAC Block</p>
                  <p className="text-xs text-slate-500">
                    Factory Operations &amp; ERP App
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIosHelp(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isIos() ? (
              <ol className="space-y-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 border border-slate-100">
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#13789B] text-[11px] font-bold text-white">1</span>
                  <span>
                    Tap <Share className="inline h-3.5 w-3.5 text-[#13789B] mx-0.5" /> <strong>Share</strong> in Safari browser
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#13789B] text-[11px] font-bold text-white">2</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#13789B] text-[11px] font-bold text-white">3</span>
                  <span>Tap <strong>Add</strong> to launch directly from your home screen</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 border border-slate-100">
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#13789B] text-[11px] font-bold text-white">1</span>
                  <span>Open browser menu (⋮ in Chrome or ⋯ in Edge)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#13789B] text-[11px] font-bold text-white">2</span>
                  <span>Select <strong>Install app</strong> or <strong>Add to Home screen</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#13789B] text-[11px] font-bold text-white">3</span>
                  <span>Confirm Install to launch Swarnim AAC as a standalone app</span>
                </li>
              </ol>
            )}

            <button
              type="button"
              className="mt-5 w-full rounded-2xl bg-[#13789B] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all"
              onClick={() => setIosHelp(false)}
            >
              Got It
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
