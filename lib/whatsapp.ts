import { formatNumber, normalizeWhatsAppPhone, mapsHref } from "@/lib/utils";

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

export function buildCustomerInvitationWhatsAppMessage(
  first: string | { customerName: string; salesmanName: string; inviteUrl: string },
  second?: string,
  third?: string
): string {
  let customerName = "";
  let salesmanName = "";
  let inviteUrl = "";

  if (typeof first === "object" && first !== null) {
    customerName = first.customerName;
    salesmanName = first.salesmanName;
    inviteUrl = first.inviteUrl;
  } else {
    customerName = String(first || "Valued Customer");
    salesmanName = String(second || "Your Representative");
    inviteUrl = String(third || "");
  }

  return `Hello ${customerName},

Welcome to Swarnim AAC Block Private Limited.

I am ${salesmanName}, your assigned Salesman.

You can register and place your AAC Block orders using the secure link below:

${inviteUrl}

You can order AAC Blocks by CBM and add Block Jointing Morter (40 KG bags) as required.

Thank you,
${salesmanName}
Swarnim AAC Block Private Limited`;
}

export interface DriverWhatsAppMaterialItem {
  productName?: string | null;
  sizeLabel?: string | null;
  dimensions?: string | null;
  quantity?: number | string | null;
  cbm?: number | string | null;
  totalCbm?: number | string | null;
  productType?: string | null;
}

export function buildDriverDeliveryWhatsAppMessage(params: {
  driverName: string;
  driverMobile?: string | null;
  vehicleNumber: string;
  orderNo: string;
  customerName?: string | null;
  customerMobile?: string | null;
  deliveryAddress: string;
  googleMapsLocation?: string | null;
  googleMapsUrl?: string | null;
  materialItems?: DriverWhatsAppMaterialItem[];
  items?: DriverWhatsAppMaterialItem[];
  orderedCbm?: string | number | null;
  loadedCbm?: string | number | null;
  totalMaterialCbm?: string | number;
  totalCbm?: string | number;
  approxBlocks?: string | number | null;
  mortarBags?: string | number | null;
  netWeightKg?: string | number | null;
  dcNumber?: string | null;
}): string {
  const driverName = params.driverName?.trim() || "Driver";
  const customerName = params.customerName?.trim() || "Valued Customer";
  const customerContact = params.customerMobile?.trim() || "Not Provided";
  const cbmValue = params.loadedCbm ?? params.orderedCbm ?? params.totalMaterialCbm ?? params.totalCbm ?? "";
  const mapsUrl = params.googleMapsLocation || params.googleMapsUrl || mapsHref(params.deliveryAddress);

  const lines: string[] = [
    `Hello ${driverName},`,
    "",
    "SWARNIM AAC BLOCK - DELIVERY DETAILS",
    `Order ID: ${params.orderNo}`,
    `Customer Name: ${customerName}`,
    `Customer Contact: ${customerContact}`,
    `Delivery Address: ${params.deliveryAddress}`,
  ];

  if (mapsUrl) {
    lines.push(`Google Maps: ${mapsUrl}`);
  }

  lines.push(`Vehicle Number: ${params.vehicleNumber}`);

  // Material breakdown items
  const items = params.materialItems || params.items || [];
  const blockItems = items.filter((it) => it.productType !== "ADHESIVE" && it.productType !== "MORTAR");

  lines.push("");
  lines.push("Material Details:");

  if (blockItems.length > 0) {
    blockItems.forEach((it) => {
      const label = it.sizeLabel || it.productName || "AAC Block";
      const dim = it.dimensions ? ` (${it.dimensions})` : "";
      const itemCbm = it.totalCbm ?? it.cbm;
      const cbmStr = itemCbm ? `${Number(itemCbm).toFixed(3)} CBM` : "";
      const blocksStr = it.quantity ? `≈ ${formatNumber(Number(it.quantity))} Blocks` : "";
      const detailParts = [cbmStr, blocksStr].filter(Boolean).join(" · ");
      lines.push(`• ${label}${dim}: ${detailParts || "Loaded"}`);
    });
  } else if (cbmValue) {
    lines.push(`• AAC Blocks: ${cbmValue} CBM`);
  }

  if (params.approxBlocks) {
    lines.push(`Total AAC Blocks: ${formatNumber(Number(params.approxBlocks))} Nos`);
  }

  if (cbmValue) {
    lines.push(`Total CBM: ${cbmValue} CBM`);
  }

  if (params.mortarBags !== undefined && params.mortarBags !== null) {
    lines.push(`Block Jointing Morter: ${params.mortarBags} Bags (40 KG)`);
  }

  if (params.netWeightKg) {
    lines.push(`Net Weight: ${Number(params.netWeightKg).toLocaleString()} KG`);
  }

  if (params.dcNumber) {
    lines.push(`Delivery Challan: ${params.dcNumber}`);
  }

  lines.push("");
  lines.push("Please contact the customer before reaching the delivery location when required.");
  lines.push("");
  lines.push("Thank you,");
  lines.push("Swarnim AAC Block Private Limited");

  return lines.join("\n");
}


