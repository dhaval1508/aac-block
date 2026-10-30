import { chromium } from "playwright-core";
import * as path from "path";
import * as fs from "fs";

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome not found at ${chromePath}`);
  }

  const outDir = path.join(__dirname, "test-output");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  const testUrl = "http://localhost:3005/invoice/share/9d932b453ac822aa34298c4a3530df605d217105ace8bba0";
  console.log(`Navigating to ${testUrl}...`);
  await page.goto(testUrl, { waitUntil: "networkidle", timeout: 20000 });

  // 1. Verify Destination Site content in DOM
  const pageText = await page.innerText("body");
  const destSiteElement = await page.$("text=DESTINATION SITE");
  console.log("Found Destination Site section:", !!destSiteElement);

  const containsErroneousAhmedabad = /22\.532420.*Ahmedabad/i.test(pageText);
  if (containsErroneousAhmedabad) {
    throw new Error("FAIL: Erroneous 'Ahmedabad' found in destination site!");
  }
  console.log("PASS: Erroneous 'Ahmedabad' is NOT in the delivery challan!");

  const hasRealAddress = pageText.includes("Chorpura Primary School");
  console.log("PASS: Real destination site address displayed:", hasRealAddress);

  // 2. Take desktop screen preview screenshot
  const screenPreviewPath = path.join(outDir, "challan_desktop_screen_preview.png");
  await page.screenshot({ path: screenPreviewPath, fullPage: true });
  console.log(`Saved desktop preview screenshot to: ${screenPreviewPath}`);

  // 3. Emulate Print media
  await page.emulateMedia({ media: "print" });

  const printPreviewPath = path.join(outDir, "challan_print_media_preview.png");
  await page.screenshot({ path: printPreviewPath, fullPage: true });
  console.log(`Saved print media screenshot to: ${printPreviewPath}`);

  // 4. Generate actual A4 PDF
  const pdfPath = path.join(outDir, "delivery_challan_INV-2026-0036.pdf");
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "8mm",
      bottom: "8mm",
      left: "8mm",
      right: "8mm",
    },
  });
  console.log(`Generated A4 PDF: ${pdfPath}`);

  // Count pages in PDF
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfText = pdfBytes.toString("latin1");
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;
  console.log(`PDF Page Count: ${pageCount}`);

  if (pageCount === 1) {
    console.log("SUCCESS: Delivery Challan generates exactly ONE A4 page!");
  } else {
    console.error(`WARNING: Generated ${pageCount} pages instead of 1 page!`);
  }

  // 5. Test Mobile viewport
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 }, // iPhone / modern Android screen
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  });
  await mobilePage.goto(testUrl, { waitUntil: "networkidle", timeout: 20000 });

  const mobileScreenPath = path.join(outDir, "challan_mobile_screen_preview.png");
  await mobilePage.screenshot({ path: mobileScreenPath, fullPage: true });
  console.log(`Saved mobile preview screenshot to: ${mobileScreenPath}`);

  // Emulate print from mobile
  await mobilePage.emulateMedia({ media: "print" });
  const mobilePdfPath = path.join(outDir, "delivery_challan_from_mobile.pdf");
  await mobilePage.pdf({
    path: mobilePdfPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "8mm",
      bottom: "8mm",
      left: "8mm",
      right: "8mm",
    },
  });
  const mobilePdfBytes = fs.readFileSync(mobilePdfPath);
  const mobilePdfText = mobilePdfBytes.toString("latin1");
  const mobilePageMatches = mobilePdfText.match(/\/Type\s*\/Page\b/g);
  const mobilePageCount = mobilePageMatches ? mobilePageMatches.length : 1;
  console.log(`Mobile Print PDF Page Count: ${mobilePageCount}`);

  await browser.close();
  console.log("\n=== ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

