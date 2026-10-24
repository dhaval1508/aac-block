import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBlockSizeName } from "@/lib/utils";
import { OrderStatus, Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Prisma.OrderWhereInput = {};
  if (status && status !== "all") {
    where.status = status as OrderStatus;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      product: true,
      items: {
        include: {
          product: true,
        },
      },
      transport: true,
    },
  });

  const headers = [
    "Order ID",
    "Date",
    "Customer Name",
    "Company Name",
    "Mobile",
    "Delivery Address",
    "Status",
    "Invoice No",
    "Block Size",
    "Block Quantity",
    "Total CBM",
    "Block Jointing Morter (40 KG Bags)",
    "Price Per CBM",
    "Material Subtotal",
    "GST Rate",
    "GST Amount",
    "Total Amount",
    "Pricing Remarks",
    "Truck Number",
    "Driver Name",
    "Driver Mobile",
  ];

  const escapeCsv = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  type ExportOrderItem = {
    productType?: string | null;
    quantity?: number;
    sizeLabel?: string | null;
    product?: { sizeLabel?: string | null } | null;
  };

  type ExportOrder = {
    orderNo: string;
    createdAt: Date | string;
    customer: { name: string; companyName?: string | null; mobile: string };
    deliveryAddress: string;
    status: string;
    invoiceNo?: string | null;
    product?: { sizeLabel?: string | null; cbmPerBlock?: unknown } | null;
    quantity: number;
    totalCbm?: unknown;
    totalSqft?: unknown;
    adhesiveBags?: number | null;
    pricePerCbm?: unknown;
    pricingRemarks?: string | null;
    subtotal?: unknown;
    gstRate?: unknown;
    gstAmount?: unknown;
    totalAmount?: unknown;
    transport?: {
      truckNumber?: string | null;
      driverName?: string | null;
      driverMobile?: string | null;
    } | null;
    items?: ExportOrderItem[];
  };

  const rows = (orders as unknown as ExportOrder[]).map((o) => {
    const cbm = o.totalCbm
      ? Number(o.totalCbm).toFixed(2)
      : o.product?.cbmPerBlock
      ? (Number(o.product.cbmPerBlock) * o.quantity).toFixed(2)
      : "0";

    // Format block size(s) cleanly
    let blockSizeDesc = formatBlockSizeName(o.product?.sizeLabel) || "Standard";
    if (o.items && o.items.length > 0) {
      const blockItems = o.items.filter(
        (it) => it.productType === "AAC_BLOCK" || !it.productType
      );
      if (blockItems.length > 0) {
        blockSizeDesc = blockItems
          .map(
            (it) =>
              `${formatBlockSizeName(it.product?.sizeLabel || it.sizeLabel)} (${it.quantity ?? 0})`
          )
          .join("; ");
      }
    }

    const mortarBags = o.adhesiveBags ?? 0;

    return [
      escapeCsv(o.orderNo),
      escapeCsv(new Date(o.createdAt).toISOString().split("T")[0]),
      escapeCsv(o.customer.name),
      escapeCsv(o.customer.companyName || ""),
      escapeCsv(o.customer.mobile),
      escapeCsv(o.deliveryAddress),
      escapeCsv(o.status),
      escapeCsv(o.invoiceNo || ""),
      escapeCsv(blockSizeDesc),
      escapeCsv(o.quantity),
      escapeCsv(cbm),
      escapeCsv(mortarBags),
      escapeCsv(o.pricePerCbm ? String(o.pricePerCbm) : "Price Not Added"),
      escapeCsv(o.subtotal ? String(o.subtotal) : ""),
      escapeCsv(o.gstRate ? `${o.gstRate}%` : ""),
      escapeCsv(o.gstAmount ? String(o.gstAmount) : ""),
      escapeCsv(o.totalAmount ? String(o.totalAmount) : ""),
      escapeCsv(o.pricingRemarks || ""),
      escapeCsv(o.transport?.truckNumber || ""),
      escapeCsv(o.transport?.driverName || ""),
      escapeCsv(o.transport?.driverMobile || ""),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");

  const dateStr = new Date().toISOString().split("T")[0];
  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Swarnim-Orders-${dateStr}.csv"`,
    },
  });
}
