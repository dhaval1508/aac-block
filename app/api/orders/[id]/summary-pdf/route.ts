import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      product: true,
      items: { include: { product: true } },
      transport: true,
    },
  });

  if (!order) {
    return new NextResponse("Order not found", { status: 404 });
  }

  // Security Guard: Customer can only view their own order
  if (session.role === "CUSTOMER" && order.customerId !== session.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const items = order.items.length > 0
    ? order.items
    : order.product
    ? [
        {
          id: "primary",
          productName: order.product.name,
          productType: order.product.category,
          sizeLabel: order.product.sizeLabel,
          dimensions: order.product.dimensions,
          quantity: order.quantity,
          cbmPerUnit: order.product.cbmPerBlock,
          totalCbm: order.totalCbm || Number(order.product.cbmPerBlock) * order.quantity,
          sqftPerUnit: 1.29,
          totalSqft: order.totalSqft || 1.29 * order.quantity,
          rate: order.rate,
          gstRate: order.gstRate,
          subtotal: order.subtotal,
          gstAmount: order.gstAmount,
          totalAmount: order.totalAmount,
        },
      ]
    : [];

  const totalCbm = order.totalCbm
    ? Number(order.totalCbm)
    : items.reduce((acc, it) => acc + (Number(it.totalCbm) || 0), 0);

  const totalSqft = order.totalSqft
    ? Number(order.totalSqft)
    : items.reduce((acc, it) => acc + (Number(it.totalSqft) || 0), 0);

  const subtotal = Number(order.subtotal);
  const gstAmount = Number(order.gstAmount);
  const totalAmount = Number(order.totalAmount);
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Swarnim AAC Order Summary - ${order.orderNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #172033;
      background: #f8fafc;
      padding: 30px 20px;
      font-size: 13px;
      line-height: 1.5;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #13789b;
      margin-top: 2px;
    }
    .brand-address {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      max-width: 380px;
    }
    .order-badge-box {
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      background: #111827;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .order-id {
      font-size: 20px;
      font-weight: 900;
      color: #0f766e;
      font-family: monospace;
      margin-top: 6px;
    }
    .meta-date {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 24px;
    }
    .info-title {
      font-size: 10px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    .info-text-bold {
      font-weight: 800;
      color: #0f172a;
      font-size: 13px;
    }
    .info-text {
      color: #475569;
      font-size: 12px;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      color: #1e293b;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
      margin-bottom: 24px;
    }
    .totals-box {
      width: 320px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #475569;
      margin-bottom: 6px;
    }
    .totals-row-grand {
      display: flex;
      justify-content: space-between;
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 8px;
    }
    .cbm-highlight {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .cbm-value {
      font-size: 18px;
      font-weight: 900;
      color: #065f46;
      font-family: monospace;
    }
    .footer-note {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
    .btn-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .print-btn {
      background: #0f766e;
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .btn-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="btn-bar">
      <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="header">
      <div>
        <div class="brand-title">Swarnim AAC Block Pvt. Ltd.</div>
        <div class="brand-sub">Premium Autoclaved Aerated Concrete Blocks & Mortars</div>
        <div class="brand-address">
          Factory: 166 p2/p2, Khakhriya-1 Village, Vadol, Kapdwanj Dist-Kheda 387620<br>
          Office: No. 615, Ganesh Glory 11, Jagatpur-Chenpur Road, Ahmedabad, Gujarat<br>
          <strong>GSTIN: 24AAACS0000A1Z5</strong> • Ph: +91 7698787476
        </div>
      </div>
      <div class="order-badge-box">
        <span class="badge">Official Order Summary</span>
        <div class="order-id">${order.orderNo}</div>
        <div class="meta-date">Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
        <div class="meta-date">Status: <strong>${order.status}</strong></div>
      </div>
    </div>

    <div class="grid-info">
      <div>
        <div class="info-title">Customer / Billing Details</div>
        <div class="info-text-bold">${order.customer.companyName || order.customer.name}</div>
        <div class="info-text">Contact: ${order.customer.name} (${order.customer.mobile})</div>
        <div class="info-text">Email: ${order.customer.email}</div>
        <div class="info-text">GSTIN: ${order.customer.gstin || "Unregistered"}</div>
      </div>
      <div>
        <div class="info-title">Unloading & Delivery Site</div>
        <div class="info-text-bold">${order.deliveryAddress}</div>
        ${order.requestedDate ? `<div class="info-text">Requested Delivery: <strong>${new Date(order.requestedDate).toLocaleDateString("en-IN")}</strong></div>` : ""}
        ${order.notes ? `<div class="info-text">Instructions: <em>${order.notes}</em></div>` : ""}
        ${order.transport ? `<div class="info-text" style="margin-top:6px; color:#0f766e;"><strong>Assigned Truck: ${order.transport.truckNumber}</strong> (Driver: ${order.transport.driverName} - ${order.transport.driverMobile})</div>` : ""}
      </div>
    </div>

    <!-- CBM Banner -->
    <div class="cbm-highlight">
      <div>
        <div style="font-size:11px; font-weight:800; color:#065f46; text-transform:uppercase;">Total Consignment Volume (CBM)</div>
        <div style="font-size:11px; color:#047857;">Calculated at full engineering precision</div>
      </div>
      <div class="cbm-value">${totalCbm.toFixed(2)} m³</div>
    </div>

    <!-- Line Items Table -->
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Product & Specification</th>
          <th class="text-center">Quantity</th>
          <th class="text-right">Unit CBM</th>
          <th class="text-right">Total CBM</th>
          <th class="text-right">Unit Rate</th>
          <th class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <strong>${it.productName}</strong> ${it.sizeLabel ? `(${it.sizeLabel})` : ""}<br>
              <span style="font-size:10px; color:#64748b;">${it.dimensions || it.productType}</span>
            </td>
            <td class="text-center"><strong>${it.quantity.toLocaleString()}</strong></td>
            <td class="text-right" style="font-family:monospace;">${it.cbmPerUnit ? Number(it.cbmPerUnit).toFixed(4) : "—"}</td>
            <td class="text-right" style="font-family:monospace; font-weight:bold; color:#0f766e;">${it.totalCbm ? Number(it.totalCbm).toFixed(2) : "—"}</td>
            <td class="text-right" style="font-family:monospace;">₹${Number(it.rate).toFixed(2)}</td>
            <td class="text-right" style="font-family:monospace; font-weight:bold;">₹${Number(it.totalAmount).toLocaleString()}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- Totals Breakdown -->
    <div class="totals-wrapper">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal (Excl. Tax):</span>
          <span style="font-family:monospace; font-weight:bold;">₹${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span>CGST (9.0%):</span>
          <span style="font-family:monospace;">₹${cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span>SGST (9.0%):</span>
          <span style="font-family:monospace;">₹${sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row-grand">
          <span>Grand Total:</span>
          <span>₹${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row" style="margin-top:8px; font-size:11px;">
          <span>Payment Status:</span>
          <span style="font-weight:bold; color:${order.paymentStatus === 'PAID' ? '#059669' : '#d97706'};">${order.paymentStatus}</span>
        </div>
      </div>
    </div>

    <div class="footer-note">
      This is an official computer-generated Order Summary document issued by Swarnim AAC Block Pvt. Ltd.<br>
      For any billing or delivery questions, contact dispatch support at +91 7698787476 / +91 9904966385.
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
