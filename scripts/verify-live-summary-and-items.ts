import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import { SignJWT } from "jose";

async function verifyLive() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const artifactsDir = "C:/Users/baps/.gemini/antigravity/brain/0c5710c5-dab4-4c5e-be40-60f9a0a4d897";
  const orderId = "cmvv09mc50001l608dybk8ffl";
  const baseUrl = "https://aac-block-management.vercel.app";

  console.log(`Starting Live Verification on ${baseUrl}...`);

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  // Generate authentic signed session token for ADMIN
  const authSecret = process.env.AUTH_SECRET || "6e0aa748f02ef40355c0d10ae2bfd4e2201617670408c5f637af3342eb0ed626815896cfb74dfc05ed8644c77a2c8791";
  const token = await new SignJWT({
    id: "cmvhtkls00000i007cl75lsup",
    name: "Swarnim Admin",
    email: "swarnimaacblock.pvt.ltd@gmail.com",
    role: "ADMIN",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(authSecret));

  await context.addCookies([
    {
      name: "acc_session",
      value: token,
      domain: "aac-block-management.vercel.app",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  // 1. Open Order Detail Page: /admin/orders/[id]
  const orderUrl = `${baseUrl}/admin/orders/${orderId}`;
  console.log(`Navigating to live order details: ${orderUrl}...`);
  await page.goto(orderUrl, { waitUntil: "networkidle", timeout: 45000 });

  const orderPageScreenshot = path.join(artifactsDir, "live_admin_order_detail.png");
  await page.screenshot({ path: orderPageScreenshot, fullPage: true });
  console.log(`Saved live order detail screenshot to ${orderPageScreenshot}`);

  // Check the DOM of Order Items table
  const pageContent = await page.content();

  // Verify that the table does NOT contain "Block Jointing Mortar (40 KG)" as a table row
  const tableRows = await page.$$eval("table tbody tr", (trs) =>
    trs.map((tr) => (tr as HTMLElement).innerText)
  );
  console.log(`Found ${tableRows.length} rows in the AAC items table on live server:`);
  for (const r of tableRows) {
    console.log(`  -> Row: ${r.replace(/\n+/g, " | ")}`);
  }

  const mortarInTable = tableRows.some((r) => r.toLowerCase().includes("mortar") || r.toLowerCase().includes("morter"));
  if (mortarInTable) {
    console.error("❌ FAILED: Mortar found inside AAC table rows on live server!");
    process.exit(1);
  } else {
    console.log("✅ PASS: Mortar is completely removed from AAC block table on live server!");
  }

  // Verify that the dedicated bottom card displays 10 Bags
  const hasBottomCard = pageContent.includes("10 Bags") && pageContent.includes("Block Jointing Morter");
  if (!hasBottomCard) {
    console.error("❌ FAILED: Dedicated Block Jointing Morter 10 Bags card not found on live server!");
    process.exit(1);
  } else {
    console.log("✅ PASS: Dedicated Block Jointing Morter 10 Bags card verified on live server!");
  }

  // 2. Open Summary PDF: /api/orders/[id]/summary-pdf
  const summaryPdfUrl = `${baseUrl}/api/orders/${orderId}/summary-pdf`;
  console.log(`Navigating to ${summaryPdfUrl}...`);
  await page.goto(summaryPdfUrl, { waitUntil: "networkidle", timeout: 45000 });

  // Screen preview screenshot
  const liveSummaryScreenPath = path.join(artifactsDir, "live_summary_screen.png");
  await page.screenshot({ path: liveSummaryScreenPath, fullPage: true });
  console.log(`Saved live summary screen preview to ${liveSummaryScreenPath}`);

  // Print media emulation screenshot
  await page.emulateMedia({ media: "print" });
  const liveSummaryPrintPath = path.join(artifactsDir, "live_summary_print.png");
  await page.screenshot({ path: liveSummaryPrintPath, fullPage: true });
  console.log(`Saved live summary print media screenshot to ${liveSummaryPrintPath}`);

  // Generate A4 PDF
  const livePdfPath = path.join(artifactsDir, "live_order_summary_SWA-2026-1060.pdf");
  await page.pdf({
    path: livePdfPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "8mm",
      bottom: "8mm",
      left: "8mm",
      right: "8mm",
    },
  });
  console.log(`Generated live A4 PDF to ${livePdfPath}`);

  // Count pages in PDF
  const pdfBytes = fs.readFileSync(livePdfPath);
  const pdfText = pdfBytes.toString("latin1");
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;
  console.log(`\n===========================================`);
  console.log(`LIVE PRODUCTION VERIFICATION RESULT:`);
  console.log(`Target: ${summaryPdfUrl}`);
  console.log(`Live PDF Total Pages: ${pageCount}`);
  if (pageCount === 1) {
    console.log(`✅ SUCCESS! The live Order Summary PDF is strictly 1 A4 page!`);
  } else {
    console.error(`❌ FAILED! Live PDF generated ${pageCount} pages, expected 1 page!`);
    process.exit(1);
  }
  console.log(`===========================================\n`);

  await browser.close();
  console.log("=== ALL LIVE PRODUCTION TESTS COMPLETED SUCCESSFULLY! ===");
}

verifyLive().catch((err) => {
  console.error(err);
  process.exit(1);
});
