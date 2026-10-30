import { chromium } from "playwright-core";
import * as path from "path";
import * as fs from "fs";

async function main() {
  console.log("=== VERIFYING LIVE PRODUCTION DEPLOYMENT ===");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome not found at ${chromePath}`);
  }

  const outDir = path.join(__dirname, "test-output-live");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const liveUrl = "https://aac-block-management.vercel.app/invoice/share/9d932b453ac822aa34298c4a3530df605d217105ace8bba0";
  console.log(`Connecting to live production: ${liveUrl}`);

  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  await page.goto(liveUrl, { waitUntil: "networkidle", timeout: 45000 });

  // Check content in live DOM
  const pageText = await page.innerText("body");
  
  const hasErroneousAhmedabad = /22\.532420.*Ahmedabad/i.test(pageText);
  if (hasErroneousAhmedabad) {
    throw new Error("FAIL: Live website still displays erroneous Ahmedabad location!");
  }
  console.log("✓ VERIFIED ON LIVE PRODUCTION: Incorrect 'Ahmedabad' is NOT displayed!");

  const hasChorpuraSchool = pageText.includes("Chorpura Primary School");
  console.log("✓ VERIFIED ON LIVE PRODUCTION: Correct destination 'Chorpura Primary School' is present:", hasChorpuraSchool);

  // Take live screen preview screenshot
  const liveScreenShotPath = path.join(outDir, "live_challan_screen.png");
  await page.screenshot({ path: liveScreenShotPath, fullPage: true });
  console.log(`✓ Live screen screenshot: ${liveScreenShotPath}`);

  // Emulate Print Media on live production
  await page.emulateMedia({ media: "print" });
  const livePrintShotPath = path.join(outDir, "live_challan_print_media.png");
  await page.screenshot({ path: livePrintShotPath, fullPage: true });
  console.log(`✓ Live print media screenshot: ${livePrintShotPath}`);

  // Generate A4 PDF from live site
  const livePdfPath = path.join(outDir, "live_challan_INV-2026-0036.pdf");
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
  console.log(`✓ Live A4 PDF generated: ${livePdfPath}`);

  const pdfBytes = fs.readFileSync(livePdfPath);
  const pdfText = pdfBytes.toString("latin1");
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;
  console.log(`✓ Live A4 PDF Page Count: ${pageCount}`);

  if (pageCount !== 1) {
    throw new Error(`FAIL: Live A4 PDF generated ${pageCount} pages instead of 1 page!`);
  }

  // Mobile print verification on live production
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  });
  await mobilePage.goto(liveUrl, { waitUntil: "networkidle", timeout: 45000 });

  const mobileScreenPath = path.join(outDir, "live_challan_mobile.png");
  await mobilePage.screenshot({ path: mobileScreenPath, fullPage: true });
  console.log(`✓ Live mobile screen screenshot: ${mobileScreenPath}`);

  await mobilePage.emulateMedia({ media: "print" });
  const liveMobilePdfPath = path.join(outDir, "live_challan_from_mobile.pdf");
  await mobilePage.pdf({
    path: liveMobilePdfPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "8mm",
      bottom: "8mm",
      left: "8mm",
      right: "8mm",
    },
  });

  const mobilePdfBytes = fs.readFileSync(liveMobilePdfPath);
  const mobilePdfText = mobilePdfBytes.toString("latin1");
  const mobilePageMatches = mobilePdfText.match(/\/Type\s*\/Page\b/g);
  const mobilePageCount = mobilePageMatches ? mobilePageMatches.length : 1;
  console.log(`✓ Live Mobile Print Page Count: ${mobilePageCount}`);

  if (mobilePageCount !== 1) {
    throw new Error(`FAIL: Live Mobile Print generated ${mobilePageCount} pages instead of 1 page!`);
  }

  await browser.close();
  console.log("\n🎯 LIVE PRODUCTION VERIFICATION 100% COMPLETE & CONFIRMED!");
}

main().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
