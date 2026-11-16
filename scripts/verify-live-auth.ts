import { chromium } from "playwright-core";
import * as path from "path";

const LIVE_URL = "https://aac-block-management.vercel.app";
const ARTIFACTS_DIR = "C:/Users/baps/.gemini/antigravity/brain/0c5710c5-dab4-4c5e-be40-60f9a0a4d897";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  console.log("=== STARTING LIVE PRODUCTION LOGIN & AUTHENTICATION VERIFICATION ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
  });

  // -------------------------------------------------------------------
  // TEST 1: Live Login Page & Form Rendering (Desktop 1280x800)
  // -------------------------------------------------------------------
  console.log("\n--- TEST 1: Desktop Login Page Layout & Inputs ---");
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desktopContext.newPage();

  console.log(`Navigating to ${LIVE_URL}/login...`);
  await page.goto(`${LIVE_URL}/login`, { waitUntil: "networkidle" });

  await page.waitForSelector("text=Enterprise Portal Login", { timeout: 15000 });
  console.log("? 'Enterprise Portal Login' heading rendered");

  // Check email/mobile input field
  const emailInput = page.locator('input[name="email"]');
  await emailInput.waitFor({ state: "visible" });
  const placeholder = await emailInput.getAttribute("placeholder");
  console.log(`? Email/Mobile Input placeholder: "${placeholder}"`);

  // Take screenshot of fresh login page
  const shotDesktop = path.join(ARTIFACTS_DIR, "live_login_desktop.png");
  await page.screenshot({ path: shotDesktop, fullPage: false });
  console.log(`? Saved screenshot: ${shotDesktop}`);

  // -------------------------------------------------------------------
  // TEST 2: Invalid Credentials Error State
  // -------------------------------------------------------------------
  console.log("\n--- TEST 2: Testing Invalid Credentials Error Handling ---");
  await emailInput.fill("admin@swarnimdemo.com");
  await page.fill('input[name="password"]', "IncorrectPassword999!");
  await page.click('button[type="submit"]');

  await page.waitForSelector("text=Invalid email/mobile or password", { timeout: 15000 });
  console.log("? Error banner rendered: 'Invalid email/mobile or password'");

  const shotError = path.join(ARTIFACTS_DIR, "live_login_error_state.png");
  await page.screenshot({ path: shotError, fullPage: false });
  console.log(`? Saved screenshot: ${shotError}`);

  // -------------------------------------------------------------------
  // TEST 3: Successful Desktop Super Admin Login
  // -------------------------------------------------------------------
  console.log("\n--- TEST 3: Super Admin Live Authentication & Dashboard Redirect ---");
  await emailInput.fill("admin@swarnimdemo.com");
  await page.fill('input[name="password"]', "Swarnim@2026");
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => url.pathname.includes("/admin/dashboard"), { timeout: 20000 });
  console.log(`? Redirected successfully to: ${page.url()}`);

  await page.waitForSelector("text=Super Admin", { timeout: 15000 });
  console.log("? Authenticated dashboard loaded with 'Super Admin' role badge");

  const shotAdminDash = path.join(ARTIFACTS_DIR, "live_auth_admin_dashboard.png");
  await page.screenshot({ path: shotAdminDash, fullPage: true });
  console.log(`? Saved screenshot: ${shotAdminDash}`);

  // -------------------------------------------------------------------
  // TEST 4: Session Logout Verification
  // -------------------------------------------------------------------
  console.log("\n--- TEST 4: Session Termination & Logout Verification ---");
  // Locate and click logout in sidebar
  const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
  } else {
    // Or trigger logout via form action
    await page.evaluate(() => {
      const form = document.querySelector('form[action*="logout"]') as HTMLFormElement;
      if (form) form.submit();
    });
  }

  await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 15000 });
  console.log(`? Logout successful! Current URL: ${page.url()}`);
  await desktopContext.close();

  // -------------------------------------------------------------------
  // TEST 5: Mobile Viewport Login (375x812) using Mobile Number
  // -------------------------------------------------------------------
  console.log("\n--- TEST 5: Mobile Login using 10-Digit Mobile Number ---");
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto(`${LIVE_URL}/login`, { waitUntil: "networkidle" });
  console.log("? Mobile login page loaded");

  const shotMobileLogin = path.join(ARTIFACTS_DIR, "live_login_mobile.png");
  await mobilePage.screenshot({ path: shotMobileLogin, fullPage: false });
  console.log(`? Saved screenshot: ${shotMobileLogin}`);

  // Enter mobile number (9999990001) instead of email
  console.log("Entering 10-digit mobile number 9999990001...");
  await mobilePage.fill('input[name="email"]', "9999990001");
  await mobilePage.fill('input[name="password"]', "Swarnim@2026");
  await mobilePage.click('button[type="submit"]');

  await mobilePage.waitForURL((url) => url.pathname.includes("/admin/dashboard"), { timeout: 20000 });
  console.log(`? Mobile login via phone number succeeded! Redirected to: ${mobilePage.url()}`);

  const shotMobileDash = path.join(ARTIFACTS_DIR, "live_auth_mobile_dashboard.png");
  await mobilePage.screenshot({ path: shotMobileDash, fullPage: false });
  console.log(`? Saved screenshot: ${shotMobileDash}`);

  await mobileContext.close();
  await browser.close();

  console.log("\n===================================================================");
  console.log("?? ALL LIVE PRODUCTION AUTHENTICATION & LOGIN TESTS PASSED 100%!");
  console.log("===================================================================");
}

main().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
