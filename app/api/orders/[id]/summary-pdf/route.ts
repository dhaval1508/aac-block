import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatBlockSizeName, canViewOrderPricing, calculateOrderPrice } from "@/lib/utils";
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
        salesman: true,
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

  // Security Guard: Salesman can only view their assigned customers' orders
  if (session.role === "SALESMAN" && order.salesmanId !== session.id && order.customer?.salesmanId !== session.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const canViewPricing = canViewOrderPricing(session, order);

  const html = renderOrderSummaryHtml({ order, company, canViewPricing });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export function renderOrderSummaryHtml(params: {
  order: any;
  company: any;
  canViewPricing: boolean;
}): string {
  const { order, company, canViewPricing } = params;

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

  const aacItems = items.filter((it: any) => it.productType === "AAC_BLOCK");

  const totalBlocks = aacItems.reduce((acc: number, it: any) => acc + it.quantity, 0) || order.quantity;

  const totalCbm = order.totalCbm
    ? Number(order.totalCbm)
    : aacItems.reduce((acc: number, it: any) => acc + (Number(it.totalCbm) || 0), 0);

  const mortarItems = items.filter(
    (it: any) => it.productType === "MORTAR" || ("product" in it && (it as { product?: { category?: string } }).product?.category === "MORTAR")
  );
  const adhesiveBags =
    order.adhesiveBags && order.adhesiveBags > 0
      ? order.adhesiveBags
      : mortarItems.reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);
  const pricing = calculateOrderPrice(order);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Swarnim AAC Order Summary - ${order.orderNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 16px 12px;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #13789b;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #0d5d79 0%, #13789b 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 900;
      font-size: 18px;
      box-shadow: 0 2px 6px rgba(19, 120, 155, 0.25);
    }
    .brand-title {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .brand-sub {
      font-size: 9.5px;
      font-weight: 700;
      color: #13789b;
      margin-top: 1px;
    }
    .brand-address {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 3px;
      max-width: 440px;
      line-height: 1.35;
    }
    .order-badge-box {
      text-align: right;
      flex-shrink: 0;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      background: #0f172a;
      color: #ffffff;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .order-id {
      font-size: 15px;
      font-weight: 900;
      color: #13789b;
      font-family: monospace;
      margin-top: 2px;
    }
    .meta-date {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 1px;
    }
    .weighbridge-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 6px 12px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .weighbridge-title {
      color: #166534;
      font-size: 11px;
    }
    .weighbridge-text {
      color: #15803d;
    }
    .weighbridge-net {
      font-size: 13px;
      font-weight: 900;
      color: #14532d;
      font-family: monospace;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .info-title {
      font-size: 8.5px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 2px;
    }
    .info-text-bold {
      font-weight: 800;
      color: #0f172a;
      font-size: 11.5px;
    }
    .info-text {
      color: #475569;
      font-size: 10px;
      margin-top: 1.5px;
      line-height: 1.35;
    }
    .metrics-banner {
      background: linear-gradient(135deg, #0f172a 0%, #13789b 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 8px 14px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      text-align: center;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .metric-label {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #93c5fd;
      letter-spacing: 0.5px;
    }
    .metric-val {
      font-size: 14px;
      font-weight: 900;
      font-family: monospace;
      margin-top: 1px;
      color: #ffffff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 5px 8px;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 10px;
      color: #1e293b;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .adhesive-card {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 6px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .adhesive-title {
      font-size: 11px;
      font-weight: 800;
      color: #0369a1;
    }
    .adhesive-sub {
      font-size: 9px;
      color: #0284c7;
      margin-top: 1px;
    }
    .adhesive-qty {
      font-size: 13px;
      font-weight: 900;
      color: #0c4a6e;
      font-family: monospace;
    }
    .pricing-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pricing-title {
      font-weight: 800;
      font-size: 11px;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }
    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      font-size: 10px;
    }
    .pricing-label {
      font-size: 8.5px;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
      display: block;
    }
    .pricing-val {
      font-size: 12px;
      font-family: monospace;
      color: #0f172a;
    }
    .footer-note {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .btn-bar {
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .print-btn {
      background: #13789b;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
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
      padding: 7px 14px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        height: auto !important;
        font-size: 9.5px !important;
        line-height: 1.3 !important;
      }
      .container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .btn-bar {
        display: none !important;
      }
      .header {
        padding-bottom: 5px !important;
        margin-bottom: 6px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .logo-icon {
        width: 32px !important;
        height: 32px !important;
        font-size: 16px !important;
      }
      .brand-title {
        font-size: 13px !important;
      }
      .brand-sub {
        font-size: 8.5px !important;
      }
      .brand-address {
        font-size: 7.5px !important;
        line-height: 1.2 !important;
        max-width: 380px !important;
      }
      .order-id {
        font-size: 13px !important;
      }
      .meta-date {
        font-size: 8px !important;
      }
      .weighbridge-banner {
        padding: 4px 8px !important;
        margin-bottom: 6px !important;
        font-size: 8.5px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .grid-info {
        padding: 6px 8px !important;
        gap: 8px !important;
        margin-bottom: 6px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .info-title {
        font-size: 7px !important;
      }
      .info-text-bold {
        font-size: 10px !important;
      }
      .info-text {
        font-size: 8.5px !important;
        line-height: 1.2 !important;
      }
      .metrics-banner {
        padding: 6px 8px !important;
        gap: 6px !important;
        margin-bottom: 6px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .metric-label {
        font-size: 7px !important;
      }
      .metric-val {
        font-size: 12px !important;
      }
      table {
        margin-bottom: 6px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      th {
        padding: 3px 5px !important;
        font-size: 7.5px !important;
      }
      td {
        padding: 3px 5px !important;
        font-size: 8.5px !important;
      }
      .adhesive-card {
        padding: 4px 8px !important;
        margin-bottom: 6px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .adhesive-title {
        font-size: 9.5px !important;
      }
      .adhesive-sub {
        font-size: 7.5px !important;
      }
      .adhesive-qty {
        font-size: 11px !important;
      }
      .pricing-card {
        padding: 5px 8px !important;
        margin-bottom: 6px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .pricing-title {
        font-size: 9.5px !important;
        padding-bottom: 3px !important;
        margin-bottom: 5px !important;
      }
      .pricing-grid {
        gap: 6px !important;
        font-size: 8.5px !important;
      }
      .pricing-label {
        font-size: 7px !important;
      }
      .pricing-val {
        font-size: 10.5px !important;
      }
      .footer-note {
        padding-top: 4px !important;
        font-size: 7px !important;
        line-height: 1.2 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
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
            ${company.factoryAddress ? `<strong>Factory / Yard:</strong> ${company.factoryName ? `${company.factoryName} • ` : ""}${company.factoryAddress}${company.factoryCity ? `, ${company.factoryCity}` : ""}${company.factoryPincode ? ` - ${company.factoryPincode}` : ""}<br>` : ""}
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
    <div class="weighbridge-banner">
      <div>
        <strong class="weighbridge-title">⚖️ Official Weighbridge / Vajan Slip Details</strong><br>
        <span class="weighbridge-text">RST Slip No: <strong>${order.weighbridgeSlip.rstNumber}</strong> • Vehicle: <strong>${order.weighbridgeSlip.vehicleNumber}</strong> • Weighbridge: <strong>${order.weighbridgeSlip.weighbridgeName}</strong></span>
      </div>
      <div style="text-align:right;">
        <span class="weighbridge-net">Net Weight: ${Number(order.weighbridgeSlip.netWeightKg).toLocaleString()} KG</span>
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
        <div class="info-text" style="color:#6b21a8; font-weight:700; margin-top:3px;">
          Assigned Salesman: ${order.salesman?.name || order.salesmanNameSnapshot || "Factory Direct (Unassigned)"}
        </div>
        ${order.gstBillingSelected ? `
          <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1;">
            <div style="color:#047857; font-weight:800; font-size:11px;">✓ GST Billing Requested (Tax Invoice)</div>
            <div style="font-weight:700; color:#0f172a; font-size:12px;">GSTIN: <span style="font-family:monospace;">${order.gstNumber || order.customer.gstin || "N/A"}</span></div>
            ${order.gstRegisteredName ? `<div style="font-size:11px; color:#475569;">Reg Name: ${order.gstRegisteredName}</div>` : ""}
            <div style="font-size:10px; color:#047857;">Status: ${order.gstStatus || "Active"}${order.gstState ? ` • State: ${order.gstState}` : ""}</div>
          </div>
        ` : order.gstBillingSelected === false ? `
          <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; color:#64748b; font-size:11px;">
            <strong>Billing Mode:</strong> Direct Without-GST Supply (Non-GST Bill)
          </div>
        ` : order.customer.gstin ? `
          <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; font-size:11px; color:#475569;">
            <strong>Customer GSTIN:</strong> <span style="font-family:monospace;">${order.customer.gstin}</span>
          </div>
        ` : ""}
      </div>
      <div>
        <div class="info-title">Delivery & Unloading Site</div>
        <div class="info-text-bold">${order.deliveryAddress}</div>
        ${order.formattedAddress && order.formattedAddress !== order.deliveryAddress ? `<div class="info-text" style="color:#64748b;font-size:11px;">Mapped: ${order.formattedAddress}</div>` : ""}
        ${order.googleMapsUrl ? `<div class="info-text" style="color:#0284c7;font-size:11px;margin-top:2px;">📍 Google Maps: <a href="${order.googleMapsUrl}" target="_blank" style="color:#0284c7;text-decoration:underline;">View Site Location</a></div>` : ""}
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

    ${canViewPricing ? `
      <!-- Private Commercial Pricing Summary (Authorized Super Admin & Creator Only) -->
      <div class="pricing-card">
        <div class="pricing-title">
          Order Price & Commercial Details
        </div>
        <div class="pricing-grid">
          <div>
            <span class="pricing-label">Price Per CBM</span>
            <strong class="pricing-val">${pricing.pricePerCbm > 0 ? `₹${Number(pricing.pricePerCbm).toLocaleString('en-IN')}` : "Price Not Added"}</strong>
          </div>
          <div>
            <span class="pricing-label">Material Calculation</span>
            <strong class="pricing-val">${pricing.isPriceAdded && pricing.totalPrice > 0 ? `₹${pricing.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "Price Not Added"}</strong>
          </div>
          <div>
            <span class="pricing-label">GST Billing</span>
            <strong class="pricing-val" style="color:#065f46;">${order.gstBillingSelected ? "18% GST Bill" : "Without GST"}</strong>
          </div>
          <div>
            <span class="pricing-label" style="color:#0369a1;">Total Order Price</span>
            <strong class="pricing-val" style="color:#13789b; font-size:13px;">${pricing.isPriceAdded && pricing.totalPrice > 0 ? `₹${pricing.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "Price Not Added"}</strong>
          </div>
        </div>
        ${order.pricingRemarks ? `<div style="margin-top:6px; padding-top:5px; border-top:1px dashed #cbd5e1; font-size:9.5px; color:#475569;"><strong>Notes / Remarks:</strong> <em>${order.pricingRemarks}</em></div>` : ""}
      </div>
    ` : ""}

    <div class="footer-note">
      This is an official computer-generated Order Placement Summary issued by Swarnim AAC Block Pvt. Ltd.<br>
      This document records product quantities and delivery destination only. Commercial billing and dispatch are processed directly by factory administration.<br>
      For logistics or dispatch inquiries, contact plant dispatch at +91 7698787476 / +91 9904966385.
    </div>
  </div>
</body>
</html>`;
}
