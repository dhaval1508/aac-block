import { chromium } from "playwright-core";
import { prisma } from "../lib/prisma";
import { getCompanyProfile } from "../lib/company-profile";
import { renderOrderSummaryHtml } from "../lib/order-summary-template";
import fs from "fs";
import path from "path";

async function run() {
  const orderId = "cmvv09mc50001l608dybk8ffl";
  console.log(`Testing Order Summary PDF layout for order ${orderId}...`);

  const [order, company] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
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
    console.error("Order not found!");
    process.exit(1);
  }

  const html = renderOrderSummaryHtml({
    order,
    company,
    canViewPricing: true,
  });

  const artifactsDir = "C:/Users/baps/.gemini/antigravity/brain/0c5710c5-dab4-4c5e-be40-60f9a0a4d897";
  const pdfOutPath = path.join(artifactsDir, "order_summary_SWA-2026-1060.pdf");
  const screenImgPath = path.join(artifactsDir, "order_summary_screen.png");
  const printImgPath = path.join(artifactsDir, "order_summary_print.png");

  console.log("Launching Chrome...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });

  // 1. Screen preview screenshot
  await page.screenshot({ path: screenImgPath, fullPage: true });
  console.log(`Saved screen screenshot to ${screenImgPath}`);

  // 2. Emulate print media & take screenshot
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: printImgPath, fullPage: true });
  console.log(`Saved print media screenshot to ${printImgPath}`);

  // 3. Generate PDF with exact A4 portrait settings
  await page.pdf({
    path: pdfOutPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "8mm",
      bottom: "8mm",
      left: "8mm",
      right: "8mm",
    },
  });
  console.log(`Generated PDF at ${pdfOutPath}`);

  await browser.close();

  // 4. Verify page count
  const pdfBytes = fs.readFileSync(pdfOutPath);
  const pdfText = pdfBytes.toString("latin1");
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;

  console.log(`\n===========================================`);
  console.log(`PDF Verification Result:`);
  console.log(`Order: ${order.orderNo}`);
  console.log(`Total Pages: ${pageCount}`);
  if (pageCount === 1) {
    console.log(`✅ SUCCESS! The Order Summary PDF is strictly 1 A4 page!`);
  } else {
    console.error(`❌ FAILED! PDF generated ${pageCount} pages, expected 1 page!`);
    process.exit(1);
  }
  console.log(`===========================================\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
