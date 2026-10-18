import { formatNumber, normalizeWhatsAppPhone } from "@/lib/utils";

export const APP_NAME = "Swarnim AAC Block Pvt. Ltd.";

export function getWhatsAppShareUrl(phone: string, text: string): string {
  const norm = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${norm}?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppMessage(
  type: "invoice" | "confirmed" | "assigned" | "loading" | "loaded" | "dispatched" | "delivered" | "payment" | "status",
  order: {
    orderNo: string;
    customerName: string;
    productName?: string;
    sizeLabel?: string;
    quantity?: number;
    loadedQuantity?: number;
    totalAmount?: number;
    paidAmount?: number;
    invoiceNo?: string | null;
    shareToken?: string | null;
    truckNumber?: string | null;
    driverName?: string | null;
    driverMobile?: string | null;
    expectedDelivery?: Date | string | null;
    statusLabel?: string;
  },
  baseUrl = ""
): string {
  const name = order.customerName || "Customer";
  const brand = APP_NAME;
  const eta = order.expectedDelivery
    ? new Date(order.expectedDelivery).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "to be updated";

  const invoiceUrl = order.shareToken
    ? `${baseUrl || ""}/invoice/share/${order.shareToken}`
    : "";

  switch (type) {
    case "invoice":
      return `Hello ${name}, your Material Delivery Challan ${order.invoiceNo || ""} for order ${order.orderNo} is ready. Quantity: ${formatNumber(
        order.quantity ?? 0
      )} blocks (${order.sizeLabel || "AAC Block"}). View/print challan: ${invoiceUrl}\n- ${brand}`;

    case "confirmed":
      return `Hello ${name}, your order ${order.orderNo} has been confirmed. Quantity: ${formatNumber(
        order.quantity ?? 0
      )} blocks (${order.sizeLabel || "AAC Block"}). Challan Reference: ${order.invoiceNo || "generated"}.\n- ${brand}`;

    case "assigned":
      return `Hello ${name}, transport has been assigned for order ${order.orderNo}. Truck: ${
        order.truckNumber || "TBA"
      }, Driver: ${order.driverName || "TBA"}, Mobile: ${order.driverMobile || "TBA"}, Expected delivery: ${eta}.\n- ${brand}`;

    case "loading":
      return `Hello ${name}, loading has started for order ${order.orderNo}. Quantity: ${formatNumber(
        order.quantity ?? 0
      )} blocks (${order.sizeLabel || "AAC Block"}).\n- ${brand}`;

    case "loaded":
      return `Hello ${name}, loading is complete for order ${order.orderNo}. Loaded quantity: ${formatNumber(
        order.loadedQuantity || order.quantity || 0
      )} blocks. Dispatch update will follow shortly.\n- ${brand}`;

    case "dispatched":
      return `Hello ${name}, your order ${order.orderNo} has been dispatched. Truck: ${
        order.truckNumber || "TBA"
      }, Driver: ${order.driverName || "TBA"}, Mobile: ${order.driverMobile || "TBA"}, ETA: ${eta}.\n- ${brand}`;

    case "delivered":
      return `Hello ${name}, order ${order.orderNo} has been marked delivered. Thank you for choosing ${brand}.`;

    case "payment":
      return `Hello ${name}, fulfillment update for order ${order.orderNo}: order verified and staged for factory dispatch.\n- ${brand}`;

    default:
      return `Hello ${name}, update for order ${order.orderNo}: ${order.statusLabel || "Processing"}.\n- ${brand}`;
  }
}
