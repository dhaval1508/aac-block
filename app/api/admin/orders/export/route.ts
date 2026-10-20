import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (status && status !== "all") {
    where.status = status;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      product: true,
      items: true,
      transport: true,
    },
  });

  const headers = [
    "Order ID",
    "Date",
    "Customer Name",
    "Company Name",
    "Mobile",
    "GSTIN",
    "Delivery Address",
    "Status",
    "Invoice No",
    "Primary Product",
    "Block Quantity",
    "Total CBM",
    "Has Mortar",
    "Has Adhesive",
    "Subtotal (₹)",
    "GST Amount (₹)",
    "Total Amount (₹)",
    "Paid Amount (₹)",
    "Payment Status",
    "Truck Number",
    "Driver Name",
    "Driver Mobile",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = orders.map((o) => {
    const cbm = o.totalCbm
      ? Number(o.totalCbm).toFixed(2)
      : o.product
      ? (Number(o.product.cbmPerBlock) * o.quantity).toFixed(2)
      : "0";

    return [
      escapeCsv(o.orderNo),
      escapeCsv(new Date(o.createdAt).toISOString().split("T")[0]),
      escapeCsv(o.customer.name),
      escapeCsv(o.customer.companyName || ""),
      escapeCsv(o.customer.mobile),
      escapeCsv(o.customer.gstin || ""),
      escapeCsv(o.deliveryAddress),
      escapeCsv(o.status),
      escapeCsv(o.invoiceNo || ""),
      escapeCsv(o.product?.sizeLabel || ""),
      escapeCsv(o.quantity),
      escapeCsv(cbm),
      escapeCsv(o.hasMortar ? "Yes" : "No"),
      escapeCsv(o.hasAdhesive ? "Yes" : "No"),
      escapeCsv(Number(o.subtotal).toFixed(2)),
      escapeCsv(Number(o.gstAmount).toFixed(2)),
      escapeCsv(Number(o.totalAmount).toFixed(2)),
      escapeCsv(Number(o.paidAmount).toFixed(2)),
      escapeCsv(o.paymentStatus),
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
