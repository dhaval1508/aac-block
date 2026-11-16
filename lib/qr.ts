import QRCode from "qrcode";
import crypto from "crypto";

export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "https://aac-block-management.vercel.app";

/**
 * Generates a cryptographically secure, url-safe token for an Order QR code.
 */
export function generateSecureQrToken(): string {
  // 24 bytes of entropy formatted as base64url = 32 url-safe chars
  return "qr_" + crypto.randomBytes(24).toString("base64url");
}

/**
 * Returns the public scanning URL for a given order QR token.
 */
export function getOrderQrUrl(token: string): string {
  return `${APP_BASE_URL.replace(/\/+$/, "")}/order-qr/${token}`;
}

/**
 * Generates a high-resolution PNG data URL for the given text/URL.
 */
export async function generateQrDataUrl(
  text: string,
  options?: { width?: number; margin?: number; darkColor?: string; lightColor?: string }
): Promise<string> {
  const width = options?.width || 1024;
  const margin = options?.margin ?? 2;
  const darkColor = options?.darkColor || "#0f172a";
  const lightColor = options?.lightColor || "#ffffff";

  return QRCode.toDataURL(text, {
    width,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: "H", // High error correction (up to 30% damage recovery)
  });
}

/**
 * Generates vector SVG markup for the given text/URL.
 */
export async function generateQrSvg(
  text: string,
  options?: { margin?: number; darkColor?: string; lightColor?: string }
): Promise<string> {
  const margin = options?.margin ?? 2;
  const darkColor = options?.darkColor || "#0f172a";
  const lightColor = options?.lightColor || "#ffffff";

  return QRCode.toString(text, {
    type: "svg",
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: "H",
  });
}

/**
 * Formats a professional, order-specific WhatsApp message with the secure QR link.
 */
export function formatOrderQrWhatsAppText(params: {
  orderNo: string;
  customerName: string;
  totalCbm?: number | string | null;
  totalBlocks?: number | string | null;
  status: string;
  deliverySite?: string;
  qrUrl: string;
}): string {
  const lines = [
    `*SWARNIM AAC BLOCK PRIVATE LIMITED*`,
    `Official Order QR Code & Verification`,
    ``,
    `Dear *${params.customerName}*,`,
    `Your AAC block consignment has an official digital verification QR code:`,
    ``,
    `📄 *Order No:* ${params.orderNo}`,
    `📦 *Status:* ${params.status}`,
    params.totalCbm ? `📐 *Total Volume:* ${Number(params.totalCbm).toFixed(3)} CBM` : null,
    params.totalBlocks ? `🧱 *Estimated Blocks:* ${params.totalBlocks} Blocks` : null,
    params.deliverySite ? `📍 *Destination Site:* ${params.deliverySite}` : null,
    ``,
    `🔍 *Scan or tap the link below to view full order details, delivery status, and itemized invoice:*`,
    params.qrUrl,
    ``,
    `Swarnim AAC Block Plant & Logistics`,
    `Need assistance? Contact plant dispatch: +91 7698787476`,
  ].filter(Boolean);

  return lines.join("\n");
}
