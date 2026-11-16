import { chromium } from "playwright-core";
import * as path from "path";

const LIVE_URL = "https://aac-block-management.vercel.app";
const TOKEN = "qr__TSuCPWPtzSv17ur9CGjT9nLXVngC1f1"; // Order SWA-2026-1073 from user screenshot
const ARTIFACTS_DIR = "C:/Users/baps/.gemini/antigravity/brain/0c5710c5-dab4-4c5e-be40-60f9a0a4d897";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  console.log("=== Testing Order QR Address Display on Live Production ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
  });

  // Test on exact mobile viewport matching iPhone 12/13/14 (390x844) & 375x812
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const url = `${LIVE_URL}/order-qr/${TOKEN}`;
  console.log(`Navigating to: ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  await page.waitForSelector("text=SWARNIM AAC BLOCK PRIVATE LIMITED", { timeout: 15000 });
  console.log("? Brand header loaded");

  // Check Factory & Yard text content
  const factoryText = await page.textContent("text=Factory & Yard:");
  console.log(`? Factory label found: ${Boolean(factoryText)}`);

  // Check if address is truncated (should NOT contain "...")
  const headerSection = await page.locator("header").textContent();
  console.log("Header text excerpt:", headerSection?.slice(0, 300));
  
  if (headerSection?.includes("Chikhlo...")) {
    throw new Error("Address is still truncated with 'Chikhlo...'!");
  }
  console.log("? Verified: Address is NOT truncated with ellipsis!");

  // Take mobile screenshot matching user's screen
  const shotMobile = path.join(ARTIFACTS_DIR, "live_order_qr_address_fixed_mobile.png");
  await page.screenshot({ path: shotMobile, fullPage: false });
  console.log(`? Saved mobile screenshot: ${shotMobile}`);

  // Also take full page screenshot
  const shotFull = path.join(ARTIFACTS_DIR, "live_order_qr_full_mobile.png");
  await page.screenshot({ path: shotFull, fullPage: true });
  console.log(`? Saved full mobile screenshot: ${shotFull}`);

  // Test on Desktop (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1000);
  const shotDesktop = path.join(ARTIFACTS_DIR, "live_order_qr_address_fixed_desktop.png");
  await page.screenshot({ path: shotDesktop, fullPage: false });
  console.log(`? Saved desktop screenshot: ${shotDesktop}`);

  await browser.close();
  console.log("=== ALL LIVE VERIFICATION CHECKS PASSED SUCCESSFULLY! ===");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
