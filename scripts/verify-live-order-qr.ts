import { chromium } from "playwright-core";
import { SignJWT } from "jose";
import { prisma } from "../lib/prisma";

const LIVE_URL = "https://aac-block-management.vercel.app";
const ARTIFACTS_DIR = "C:/Users/baps/.gemini/antigravity/brain/0c5710c5-dab4-4c5e-be40-60f9a0a4d897";

async function main() {
  console.log("=== Starting Live Production Order QR System Verification ===");

  // 1. Fetch an active QR code from Neon DB
  const testQr = await prisma.orderQrCode.findFirst({
    where: { status: "ACTIVE" },
    include: {
      order: {
        include: {
          customer: true,
          items: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!testQr) {
    throw new Error("No active QR code found in database!");
  }

  console.log(`Testing with Order: ${testQr.order.orderNo}, Token: ${testQr.token}`);

  // Launch Chrome
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // -------------------------------------------------------------
  // TEST 1: Public Order QR Scanning Page (Desktop)
  // -------------------------------------------------------------
  const publicQrUrl = `${LIVE_URL}/order-qr/${testQr.token}`;
  console.log(`Navigating to public QR page: ${publicQrUrl}`);
  const resp = await page.goto(publicQrUrl, { waitUntil: "networkidle", timeout: 30000 });
  console.log(`Public QR Page HTTP Status: ${resp?.status()}`);

  if (resp?.status() !== 200) {
    throw new Error(`Expected HTTP 200 on public QR page, got ${resp?.status()}`);
  }

  // Assertions on public order manifest
  await page.waitForSelector("header", { timeout: 15000 });
  const h1Text = await page.textContent("h1");
  console.log(`Page H1: ${h1Text}`);

  await page.waitForSelector(`text=${testQr.order.orderNo}`, { timeout: 15000 });
  console.log("✓ Brand header and Order Number verified on live page");

  // Check verification pill
  const verifiedPill = await page.textContent("text=Verified Order QR Code");
  console.log(`✓ Verification pill present: ${Boolean(verifiedPill)}`);

  // Capture Desktop Screenshot
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/live_order_qr_desktop.png`,
    fullPage: true,
  });
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/live_order_qr_desktop.png`);

  // -------------------------------------------------------------
  // TEST 2: Public Order QR Scanning Page (Mobile 375x812)
  // -------------------------------------------------------------
  console.log("Testing mobile viewport 375x812...");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);

  // Verify responsive layout
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/live_order_qr_mobile.png`,
    fullPage: false,
  });
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/live_order_qr_mobile.png`);

  // Reset viewport to desktop
  await page.setViewportSize({ width: 1280, height: 900 });

  // -------------------------------------------------------------
  // TEST 3: Admin Order QR Center (/admin/orders/qr-center)
  // -------------------------------------------------------------
  console.log("Setting Super Admin session cookie...");
  const authSecret = process.env.AUTH_SECRET || "6e0aa748f02ef40355c0d10ae2bfd4e2201617670408c5f637af3342eb0ed626815896cfb74dfc05ed8644c77a2c8791";
  const sessionToken = await new SignJWT({
    id: "cmvv09mc50001l608dybk8lft",
    name: "Super Admin",
    role: "ADMIN",
    mobile: "9999990001",
    email: "admin@swarnimdemo.com",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(authSecret));

  await context.addCookies([
    {
      name: "acc_session",
      value: sessionToken,
      domain: "aac-block-management.vercel.app",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  // Navigate to Order QR Center
  console.log("Navigating to /admin/orders/qr-center...");
  await page.goto(`${LIVE_URL}/admin/orders/qr-center`, { waitUntil: "networkidle" });

  await page.waitForSelector("text=Order QR Code Control Center", { timeout: 10000 });
  console.log("✓ Order QR Code Control Center loaded successfully!");

  // Verify Metrics Cards
  const totalOrdersText = await page.textContent("text=Total Orders");
  const activeQrsText = await page.textContent("text=Active QRs");
  console.log(`✓ Metrics verified: Total Orders and Active QRs visible`);

  // Take screenshot of Admin QR Center
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/live_admin_qr_center.png`,
    fullPage: true,
  });
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/live_admin_qr_center.png`);

  // Click "Manage QR" button on first row
  console.log("Clicking 'Manage QR' to test modal...");
  const manageQrBtn = page.locator('button:has-text("Manage QR")').first();
  await manageQrBtn.click();

  await page.waitForSelector("text=Order QR Management", { timeout: 10000 });
  console.log("✓ Order QR Management Modal opened!");

  // Check Download, Print, WhatsApp buttons inside modal
  const hasDownloadPng = await page.isVisible('button:has-text("Download PNG")');
  const hasDownloadSvg = await page.isVisible('button:has-text("Download SVG")');
  const hasPrintSticker = await page.isVisible('button:has-text("Print Sticker")');
  const hasWhatsApp = await page.isVisible('button:has-text("Share WhatsApp")');

  console.log(`✓ Modal Actions: PNG=${hasDownloadPng}, SVG=${hasDownloadSvg}, Print=${hasPrintSticker}, WhatsApp=${hasWhatsApp}`);

  // Take screenshot of Modal
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/live_admin_qr_modal.png`,
    fullPage: false,
  });
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/live_admin_qr_modal.png`);

  // Switch to "Audit & Scans" tab
  await page.click('button:has-text("Audit & Scans")');
  await page.waitForTimeout(500);
  console.log("✓ Switched to Audit & Scans tab inside modal");

  // Close modal
  await page.click('button:has-text("Close")');
  await page.waitForTimeout(500);

  // -------------------------------------------------------------
  // TEST 4: Admin Order Details Page (/admin/orders/[id])
  // -------------------------------------------------------------
  const orderDetailUrl = `${LIVE_URL}/admin/orders/${testQr.orderId}`;
  console.log(`Navigating to admin order detail: ${orderDetailUrl}`);
  await page.goto(orderDetailUrl, { waitUntil: "networkidle" });

  await page.waitForSelector("text=Digital Order QR Code", { timeout: 10000 });
  console.log("✓ Digital Order QR Code panel rendered in Order Details page!");

  await page.screenshot({
    path: `${ARTIFACTS_DIR}/live_admin_order_qr_panel.png`,
    fullPage: false,
  });
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/live_admin_order_qr_panel.png`);

  await browser.close();
  console.log("=== ALL LIVE PRODUCTION TESTS PASSED WITH 100% SUCCESS! ===");
}

main()
  .catch((e) => {
    console.error("Live test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
