"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  PackageCheck,
  ShoppingCart,
  Truck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  orderId?: string | null;
  read: boolean;
  createdAt: string;
}

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15); // D6

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start(ctx.currentTime + 0.1);

    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio context may be blocked before first user gesture
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationBell({ role }: { role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const prevCountRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      const count = data.unreadCount || 0;
      setUnreadCount(count);

      // Play chime if new unread notification arrived
      if (count > prevCountRef.current && soundEnabled && prevCountRef.current !== 0) {
        playNotificationChime();
      }
      prevCountRef.current = count;
    } catch {
      // Ignore background fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Check Web Push support and permission
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      if (Notification.permission === "granted") {
        setPushSubscribed(true);
      }
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSubscribePush = async () => {
    if (!pushSupported) return;
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSubscribing(false);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined");
        setSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const subJson = subscription.toJSON();
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      setPushSubscribed(true);
      playNotificationChime();
    } catch (err) {
      console.error("Failed to subscribe push:", err);
    } finally {
      setSubscribing(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      prevCountRef.current = 0;
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.read) {
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: item.id }),
      }).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setOpen(false);

    if (item.link) {
      router.push(item.link);
    } else if (item.orderId) {
      if (role === "ADMIN") router.push(`/admin/orders/${item.orderId}`);
      else if (role === "STAFF") router.push(`/staff/orders/${item.orderId}`);
      else router.push(`/customer/orders/${item.orderId}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "NEW_ORDER":
        return <ShoppingCart className="h-4 w-4 text-amber-500" />;
      case "ORDER_ASSIGNED":
        return <Truck className="h-4 w-4 text-blue-500" />;
      case "DISPATCH":
      case "DELIVERED":
        return <PackageCheck className="h-4 w-4 text-emerald-500" />;
      default:
        return <Bell className="h-4 w-4 text-[#13789B]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-navy transition-all cursor-pointer shadow-2xs"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Modal */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-navy uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#13789B] text-white px-2 py-0.5 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled((s) => !s)}
                title={soundEnabled ? "Mute notification sounds" : "Enable notification sounds"}
                className="text-slate-400 hover:text-navy text-xs p-1"
              >
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5 text-slate-600" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                )}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#13789B] hover:underline cursor-pointer"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Web Push Banner if not subscribed */}
          {pushSupported && !pushSubscribed && (
            <div className="p-3 bg-gradient-to-r from-teal-50 to-amber-50 border-b border-teal-100 flex items-center justify-between gap-3">
              <div className="text-left">
                <p className="text-[11px] font-bold text-navy">Enable Push Alerts</p>
                <p className="text-[10px] text-slate-500">Get order & loading updates instantly</p>
              </div>
              <button
                type="button"
                onClick={handleSubscribePush}
                disabled={subscribing}
                className="rounded-xl bg-[#13789B] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#0F627F] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {subscribing ? "Enabling..." : "Enable"}
              </button>
            </div>
          )}

          {/* List of Notifications */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300 stroke-[1.5]" />
                <p className="mt-2 text-xs font-bold text-slate-700">No notifications yet</p>
                <p className="text-[10px] text-slate-400">Order updates and yard alerts will appear here</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 hover:bg-slate-50/90 transition-colors cursor-pointer text-left relative",
                    !item.read && "bg-teal-50/40"
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-xs leading-tight truncate", !item.read ? "font-black text-navy" : "font-semibold text-slate-700")}>
                        {item.title}
                      </p>
                      <span className="text-[9px] text-slate-400 shrink-0 font-medium">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                      {item.message}
                    </p>
                  </div>
                  {!item.read && (
                    <span className="h-2 w-2 rounded-full bg-[#13789B] shrink-0 mt-1.5 ring-2 ring-white" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50 text-center">
            <span className="text-[10px] text-slate-400 font-medium">
              Real-time synchronization enabled
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
