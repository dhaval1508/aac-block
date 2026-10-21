import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatBlockSizeName } from "@/lib/utils";
import { getCompanyProfile } from "@/lib/company-profile";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const [order, company] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        items: { include: { product: true } },
        transport: true,
        weighbridgeSlip: true,
        loadingRecord: true,
      },
    }),
    getCompanyProfile(),
  ]);

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
          rate: 0,
          gstRate: 0,
          subtotal: 0,
          gstAmount: 0,
          totalAmount: 0,
        },
      ]
    : [];

  const aacItems = items.filter((it) => it.productType === "AAC_BLOCK");

  const totalBlocks = aacItems.reduce((acc, it) => acc + it.quantity, 0) || order.quantity;

  const totalCbm = order.totalCbm
    ? Number(order.totalCbm)
    : aacItems.reduce((acc, it) => acc + (Number(it.totalCbm) || 0), 0);

  const adhesiveBags = order.adhesiveBags ?? 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Swarnim AAC Order Summary - ${order.orderNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 30px 16px;
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
      border-bottom: 2px solid #13789b;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #0d5d79 0%, #13789b 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 900;
      font-size: 22px;
      box-shadow: 0 2px 8px rgba(19, 120, 155, 0.3);
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
      margin-top: 1px;
    }
    .brand-address {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
      max-width: 400px;
      line-height: 1.4;
    }
    .order-badge-box {
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .order-id {
      font-size: 20px;
      font-weight: 900;
      color: #13789b;
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
    .metrics-banner {
      background: linear-gradient(135deg, #0f172a 0%, #13789b 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 16px 20px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      text-align: center;
      margin-bottom: 24px;
    }
    .metric-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #93c5fd;
      letter-spacing: 0.5px;
    }
    .metric-val {
      font-size: 18px;
      font-weight: 900;
      font-family: monospace;
      margin-top: 2px;
      color: #ffffff;
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
    .adhesive-card {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .adhesive-title {
      font-size: 13px;
      font-weight: 800;
      color: #0369a1;
    }
    .adhesive-sub {
      font-size: 11px;
      color: #0284c7;
      margin-top: 1px;
    }
    .adhesive-qty {
      font-size: 18px;
      font-weight: 900;
      color: #0c4a6e;
      font-family: monospace;
    }
    .footer-note {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .btn-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .print-btn {
      background: #13789b;
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .brochure-link {
      background: #ffffff;
      color: #13789b;
      border: 1px solid #cbd5e1;
      padding: 9px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
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
      <a href="/downloads/Swarnim-AAC-Block-Brochure.pdf" download="Swarnim-AAC-Block-Brochure.pdf" class="brochure-link">
        📄 Download Technical Brochure (PDF)
      </a>
      <button class="print-btn" onclick="window.print()">
        🖨️ Print / Save Order Summary (PDF)
      </button>
    </div>

    <!-- Header with Swarnim Logo & Details -->
    <div class="header">
      <div class="logo-container">
        <div class="logo-icon">S</div>
        <div>
          <div class="brand-title">${company.legalName}</div>
          <div class="brand-sub">Autoclaved Aerated Concrete Blocks & Tiling Solutions</div>
          <div class="brand-address">
            <strong>GSTIN:</strong> ${company.gstin} • <strong>Constitution:</strong> ${company.constitution}<br>
            <strong>Reg. Office:</strong> ${company.registeredAddress}<br>
            ${company.factoryAddress ? `<strong>Factory:</strong> ${company.factoryAddress}<br>` : ""}
            <strong>Phone:</strong> ${company.companyMobile || "+91 98795 00000"}${company.altMobile ? ` / ${company.altMobile}` : ""} • <strong>Email:</strong> ${company.companyEmail || "info@swarnimaac.com"}
          </div>
        </div>
      </div>
      <div class="order-badge-box">
        <span class="badge">Official Order Summary</span>
        <div class="order-id">${order.orderNo}</div>
        ${order.dcNumber ? `<div style="font-size:12px;font-weight:bold;color:#6b21a8;margin-top:3px;">Challan: ${order.dcNumber}</div>` : ""}
        <div class="meta-date">Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
        <div class="meta-date">Status: <strong>${order.status}</strong></div>
      </div>
    </div>

    ${order.weighbridgeSlip ? `
    <!-- Weighbridge Slip Banner -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
      <div>
        <strong style="color:#166534;font-size:13px;">⚖️ Official Weighbridge / Vajan Slip Details</strong><br>
        <span style="color:#15803d;">RST Slip No: <strong>${order.weighbridgeSlip.rstNumber}</strong> • Vehicle: <strong>${order.weighbridgeSlip.vehicleNumber}</strong> • Weighbridge: <strong>${order.weighbridgeSlip.weighbridgeName}</strong></span>
      </div>
      <div style="text-align:right;">
        <span style="font-size:15px;font-weight:900;color:#14532d;font-family:monospace;">Net Weight: ${Number(order.weighbridgeSlip.netWeightKg).toLocaleString()} KG</span><br>
        <span style="font-size:11px;color:#166534;">Gross: ${Number(order.weighbridgeSlip.grossWeightKg).toLocaleString()} KG • Tare: ${Number(order.weighbridgeSlip.tareWeightKg).toLocaleString()} KG</span>
      </div>
    </div>
    ` : ""}

    <!-- Customer & Delivery Site Info -->
    <div class="grid-info">
      <div>
        <div class="info-title">Customer Contact Details</div>
        <div class="info-text-bold">${order.customer.companyName || order.customer.name}</div>
        <div class="info-text">Contact Person: ${order.customer.name}</div>
        <div class="info-text">Mobile: ${order.customer.mobile}</div>
        <div class="info-text">Email: ${order.customer.email}</div>
      </div>
      <div>
        <div class="info-title">Delivery & Unloading Site</div>
        <div class="info-text-bold">${order.deliveryAddress}</div>
        ${order.formattedAddress && order.formattedAddress !== order.deliveryAddress ? `<div class="info-text" style="color:#64748b;font-size:11px;">Mapped: ${order.formattedAddress}</div>` : ""}
        ${order.requestedDate ? `<div class="info-text">Requested Delivery: <strong>${new Date(order.requestedDate).toLocaleDateString("en-IN")}</strong></div>` : ""}
        ${order.notes ? `<div class="info-text">Site Notes: <em>${order.notes}</em></div>` : ""}
        ${order.transport ? `<div class="info-text" style="margin-top:6px; color:#13789b;"><strong>Allocated Truck: ${order.transport.truckNumber}</strong> (Driver: ${order.transport.driverName} - ${order.transport.driverMobile})</div>` : ""}
      </div>
    </div>

    <!-- Metrics Banner (CBM, Blocks, Adhesive) -->
    <div class="metrics-banner">
      <div>
        <div class="metric-label">Total Volume (CBM)</div>
        <div class="metric-val">${totalCbm.toFixed(3)} CBM</div>
        <div style="font-size:10px; color:#64748b; font-style:italic; margin-top:2px;">≈ ${formatNumber(totalBlocks)} Blocks</div>
      </div>
      <div>
        <div class="metric-label">Estimated Total Blocks</div>
        <div class="metric-val">${formatNumber(totalBlocks)}</div>
      </div>
      <div>
        <div class="metric-label">Block Jointing Morter</div>
        <div class="metric-val">${adhesiveBags} Bags (40 KG)</div>
      </div>
    </div>

    <!-- AAC Block Items Table -->
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>AAC Block Size & Specification</th>
          <th class="text-center">Volume & Quantity</th>
          <th class="text-right">CBM / Block</th>
          <th class="text-right">Total CBM</th>
        </tr>
      </thead>
      <tbody>
        ${aacItems.map((it, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <strong>${formatBlockSizeName(it.sizeLabel)}</strong><br>
              <span style="font-size:10px; color:#64748b;">${it.dimensions || it.productType}</span>
            </td>
            <td class="text-center">
              <strong>${it.totalCbm ? Number(it.totalCbm).toFixed(3) : "—"} CBM</strong><br>
              <span style="font-size:10px; color:#64748b; font-style:italic;">≈ ${formatNumber(it.quantity)} Blocks</span>
            </td>
            <td class="text-right" style="font-family:monospace;">${it.cbmPerUnit ? Number(it.cbmPerUnit).toFixed(4) : "—"} CBM</td>
            <td class="text-right" style="font-family:monospace; font-weight:bold; color:#13789b;">${it.totalCbm ? Number(it.totalCbm).toFixed(3) : "—"} CBM</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- Compulsory Mortar Details Card -->
    <div class="adhesive-card">
      <div>
        <div class="adhesive-title">Block Jointing Morter</div>
        <div class="adhesive-sub">Plant Specification: 40 KG Bag Only</div>
      </div>
      <div class="adhesive-qty">${adhesiveBags} Bags ${adhesiveBags > 0 ? `(${adhesiveBags * 40} KG)` : "(0 Bags)"}</div>
    </div>

    <div class="footer-note">
      This is an official computer-generated Order Placement Summary issued by Swarnim AAC Block Pvt. Ltd.<br>
      This document records product quantities and delivery destination only. Commercial billing and dispatch are processed directly by factory administration.<br>
      For logistics or dispatch inquiries, contact plant dispatch at +91 7698787476 / +91 9904966385.
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
