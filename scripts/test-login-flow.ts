import { chromium } from "playwright-core";
import * as path from "path";
import * as fs from "fs";

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const screenshotsDir = "C:\\Users\\baps\\.gemini\\antigravity-ide\\brain\\3c9dfa91-20c1-43db-b2cd-f99f44f5f48c\\screenshots";
  
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  console.log("Navigating to login page...");
  await page.goto("https://aac-block-management.vercel.app/login", { waitUntil: "networkidle" });

  console.log("Filling admin credentials...");
  await page.fill('input[name="email"], input[type="text"]', "admin@swarnimdemo.com");
  await page.fill('input[name="password"], input[type="password"]', "Admin@123");
  
  console.log("Submitting login form...");
  await page.click('button[type="submit"]');

  console.log("Waiting for redirect...");
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });

  const currentUrl = page.url();
  console.log(`Successfully logged in! Current URL: ${currentUrl}`);

  const shot = path.join(screenshotsDir, "admin_dashboard_verified_1280px.png");
  await page.screenshot({ path: shot, fullPage: true });
  console.log(`Screenshot saved to: ${shot}`);

  await browser.close();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
