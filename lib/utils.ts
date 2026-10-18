import { OrderStatus, PaymentStatus, Role } from "@prisma/client";

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || "A";
}

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "").replace(/^91/, "");
}

export function normalizeWhatsAppPhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  else if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
  return d;
}

export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel:+${digits.startsWith("91") ? digits : `91${digits}`}`;
}

export function mapsHref(lat?: number | null, lng?: number | null, address?: string | null) {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}

export function whatsappHref(phone: string, message: string) {
  const norm = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${norm}?text=${encodeURIComponent(message)}`;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending Confirmation",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned for Loading",
  LOADING: "Loading",
  LOADED: "Loading Completed",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ASSIGNED: "bg-purple-100 text-purple-800 border-purple-200",
  LOADING: "bg-sky-100 text-sky-800 border-sky-200",
  LOADED: "bg-teal-100 text-teal-800 border-teal-200",
  DISPATCHED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Payment Pending",
  PARTIAL: "Partially Paid",
  PAID: "Fully Settled",
};

export const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  PARTIAL: "bg-sky-50 text-sky-800 border-sky-200",
  PAID: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Super Admin",
  STOCKER: "Stock & Order Manager",
  STAFF: "Loading Staff",
  CUSTOMER: "Customer",
};

export function roleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "STOCKER":
      return "/stocker/dashboard";
    case "STAFF":
      return "/staff/dashboard";
    case "CUSTOMER":
    default:
      return "/customer/dashboard";
  }
}

export function canManageFinance(role: Role) {
  return role === "ADMIN";
}

export function canManageStock(role: Role) {
  return role === "ADMIN" || role === "STOCKER";
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

export function canLoading(role: Role) {
  return role === "ADMIN" || role === "STAFF";
}

export function avatarTone(name: string) {
  const tones = [
    "bg-rose-100 text-rose-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
    "bg-teal-100 text-teal-700",
  ];
  const index = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[index % tones.length];
}
