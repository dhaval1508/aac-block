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

export function isGoogleMapsUrl(str?: string | null): boolean {
  if (!str) return false;
  return /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(str);
}

export function mapsHref(
  arg1?: number | string | null,
  arg2?: number | null,
  arg3?: string | number | null
): string | null {
  // Case 1: mapsHref(lat, lng, address?)
  if (typeof arg1 === "number" && typeof arg2 === "number") {
    return `https://www.google.com/maps?q=${arg1},${arg2}`;
  }

  // Case 2: mapsHref(addressOrUrl, lat?, lng?)
  if (typeof arg1 === "string" && arg1.trim().length > 0) {
    const raw = arg1.trim();

    // Direct Google Maps URL or embedded link
    const urlMatch = raw.match(/https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\S*/i);
    if (urlMatch) {
      return urlMatch[0];
    }
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw;
    }

    // Coordinates in string e.g. "23.028555, 72.544332"
    const coordMatch = raw.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`;
    }

    // Explicit numeric lat/lng provided as second/third args
    if (typeof arg2 === "number" && typeof arg3 === "number") {
      return `https://www.google.com/maps?q=${arg2},${arg3}`;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
  }

  // Case 3: arg3 is address string
  if (typeof arg3 === "string" && arg3.trim().length > 0) {
    const raw = arg3.trim();
    const urlMatch = raw.match(/https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\S*/i);
    if (urlMatch) {
      return urlMatch[0];
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
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
  STOCKER: "Loading & Stock Staff",
  STAFF: "Loading & Stock Staff",
  CUSTOMER: "Customer",
  SALESMAN: "Salesman",
};

export function roleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "SALESMAN":
      return "/salesman/dashboard";
    case "STOCKER":
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
  return role === "ADMIN" || role === "STOCKER" || role === "STAFF";
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

export function canLoading(role: Role) {
  return role === "ADMIN" || role === "STAFF" || role === "STOCKER";
}

/**
 * Strict Price Privacy Rule:
 * Price Per CBM, material amounts, private pricing remarks, and tax breakdowns
 * are visible ONLY to Super Admin and the exact user who created the order.
 */
export function canViewOrderPricing(
  user?: { id?: string | null; role?: string | null } | null,
  order?: { createdById?: string | null } | null
): boolean {
  if (!user || !user.role) return false;
  if (user.role === "ADMIN") return true;
  if (order?.createdById && user.id && user.id === order.createdById) return true;
  return false;
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

/**
 * Standardize AAC block size labels to exact format:
 * "3 Inch", "4 Inch", "4+ Inch", "5 Inch", "6 Inch", "8 Inch", "9 Inch", "9+ Inch", "12 Inch"
 */
export function formatBlockSizeName(sizeLabel?: string | null): string {
  if (!sizeLabel) return "AAC Block";
  const s = sizeLabel.trim();
  if (/^3(?:\s*inch|\")?$/i.test(s)) return "3 Inch";
  if (/^4\+(?:\s*inch|\")?$/i.test(s)) return "4+ Inch";
  if (/^4(?:\s*inch|\")?$/i.test(s)) return "4 Inch";
  if (/^5(?:\s*inch|\")?$/i.test(s)) return "5 Inch";
  if (/^6(?:\s*inch|\")?$/i.test(s)) return "6 Inch";
  if (/^8(?:\s*inch|\")?$/i.test(s)) return "8 Inch";
  if (/^9\+(?:\s*inch|\")?$/i.test(s)) return "9+ Inch";
  if (/^9(?:\s*inch|\")?$/i.test(s)) return "9 Inch";
  if (/^12(?:\s*inch|\")?$/i.test(s)) return "12 Inch";
  return s.replace(/"/g, " Inch").replace(/\s+Inch/gi, " Inch");
}

export interface OrderPricingResult {
  isPriceAdded: boolean;
  totalPrice: number;        // Material total: Order CBM × Price Per CBM (no GST)
  pricePerCbm: number;       // Rate per CBM
  totalCbm: number;          // Total AAC Block CBM
  hasMultipleRates: boolean; // True if multiple sizes with different rates
  formattedTotal: string;    // "₹90,000" or "Price Not Added"
  formattedRate: string;     // "₹3,000 / CBM" or "Price Not Added"
}

/**
 * Shared authoritative order price calculation:
 * Total Price is strictly Price Per CBM × Ordered CBM (without adding GST).
 * For multiple block sizes: Sum of (Each Block Item CBM × Its Price Per CBM).
 */
export function calculateOrderPrice(order?: {
  pricePerCbm?: any;
  rate?: any;
  totalCbm?: any;
  quantity?: any;
  subtotal?: any;
  totalAmount?: any;
  items?: Array<{
    productType?: string | null;
    totalCbm?: any;
    cbm?: any;
    rate?: any;
    pricePerCbm?: any;
    subtotal?: any;
  }> | null;
} | null): OrderPricingResult {
  if (!order) {
    return {
      isPriceAdded: false,
      totalPrice: 0,
      pricePerCbm: 0,
      totalCbm: 0,
      hasMultipleRates: false,
      formattedTotal: "Price Not Added",
      formattedRate: "Price Not Added",
    };
  }

  let basePricePerCbm =
    order.pricePerCbm !== undefined && order.pricePerCbm !== null
      ? Number(order.pricePerCbm)
      : order.rate !== undefined && order.rate !== null
      ? Number(order.rate)
      : 0;

  const baseTotalCbm =
    order.totalCbm !== undefined && order.totalCbm !== null
      ? Number(order.totalCbm)
      : 0;

  const baseSubtotal =
    order.subtotal !== undefined && order.subtotal !== null
      ? Number(order.subtotal)
      : 0;

  if (basePricePerCbm <= 0 && baseSubtotal > 0 && baseTotalCbm > 0) {
    basePricePerCbm = Number((baseSubtotal / baseTotalCbm).toFixed(2));
  }

  // Filter AAC Block items only (never include mortar / adhesive in CBM block pricing)
  const allItems = Array.isArray(order.items) ? order.items : [];
  const aacItems = allItems.filter(
    (it) =>
      it.productType === "AAC_BLOCK" ||
      (!it.productType && (Number(it.totalCbm || 0) > 0 || Number(it.cbm || 0) > 0))
  );

  let combinedBlockCbm = 0;
  let itemsTotalPrice = 0;
  let itemsWithRatesCount = 0;
  const distinctRates = new Set<number>();

  if (aacItems.length > 0) {
    for (const it of aacItems) {
      const itCbm = Number(it.totalCbm ?? it.cbm ?? 0);
      const itRate = Number(it.pricePerCbm ?? it.rate ?? 0);
      combinedBlockCbm += itCbm;

      if (itRate > 0 && itCbm > 0) {
        itemsWithRatesCount++;
        distinctRates.add(itRate);
        itemsTotalPrice += Number((itCbm * itRate).toFixed(2));
      } else if (Number(it.subtotal || 0) > 0 && itCbm > 0) {
        itemsWithRatesCount++;
        const impliedRate = Number((Number(it.subtotal) / itCbm).toFixed(2));
        distinctRates.add(impliedRate);
        itemsTotalPrice += Number(Number(it.subtotal).toFixed(2));
      }
    }
  }

  const effectiveCbm = combinedBlockCbm > 0 ? combinedBlockCbm : baseTotalCbm;
  let finalTotalPrice = 0;
  let finalPricePerCbm = 0;
  const hasMultipleRates = distinctRates.size > 1;

  if (itemsWithRatesCount > 0 && itemsTotalPrice > 0) {
    finalTotalPrice = Number(itemsTotalPrice.toFixed(2));
    finalPricePerCbm =
      effectiveCbm > 0
        ? Number((finalTotalPrice / effectiveCbm).toFixed(2))
        : basePricePerCbm;
  } else if (basePricePerCbm > 0 && effectiveCbm > 0) {
    finalTotalPrice = Number((effectiveCbm * basePricePerCbm).toFixed(2));
    finalPricePerCbm = basePricePerCbm;
  } else if (basePricePerCbm > 0) {
    finalPricePerCbm = basePricePerCbm;
    finalTotalPrice = 0;
  }

  const isPriceAdded = finalTotalPrice > 0 || finalPricePerCbm > 0;

  return {
    isPriceAdded,
    totalPrice: finalTotalPrice,
    pricePerCbm: finalPricePerCbm,
    totalCbm: effectiveCbm,
    hasMultipleRates,
    formattedTotal:
      isPriceAdded && finalTotalPrice > 0
        ? `₹${formatNumber(Math.round(finalTotalPrice))}`
        : "Price Not Added",
    formattedRate:
      finalPricePerCbm > 0
        ? `₹${formatNumber(Math.round(finalPricePerCbm))} / CBM`
        : "Price Not Added",
  };
}

