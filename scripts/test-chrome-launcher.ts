import { chromium } from "playwright-core";
import * as path from "path";
import * as fs from "fs";

async function main() {
  console.log("🚀 Testing local Chrome launcher with playwright-core...");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome not found at ${chromePath}`);
  }

  const screenshotsDir = "C:\\Users\\baps\\.gemini\\antigravity-ide\\brain\\3c9dfa91-20c1-43db-b2cd-f99f44f5f48c\\screenshots";
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  console.log("Navigating to https://aac-block-management.vercel.app ...");
  await page.goto("https://aac-block-management.vercel.app/login", { waitUntil: "networkidle", timeout: 30000 });

  const title = await page.title();
  console.log(`Page title: ${title}`);

  const screenshotPath = path.join(screenshotsDir, "prod_login_1280px.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  await browser.close();
  console.log("✅ Local Chrome test passed successfully!");
}

main().catch((err) => {
  console.error("❌ Chrome launch error:", err);
  process.exit(1);
});
