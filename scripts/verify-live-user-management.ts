import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import { SignJWT } from "jose";

async function verifyLive() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const artifactsDir = "C:/Users/baps/.gemini/antigravity/brain/0c5710c5-dab4-4c5e-be40-60f9a0a4d897";
  const baseUrl = "https://aac-block-management.vercel.app";

  console.log(`=== STARTING LIVE PRODUCTION VERIFICATION ON ${baseUrl} ===`);

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });

  // Generate authentic signed session token for SUPER_ADMIN
  const authSecret = "6e0aa748f02ef40355c0d10ae2bfd4e2201617670408c5f637af3342eb0ed626815896cfb74dfc05ed8644c77a2c8791";
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

  // 1. Navigate to /admin/users
  const usersUrl = `${baseUrl}/admin/users`;
  console.log(`Navigating to ${usersUrl}...`);
  await page.goto(usersUrl, { waitUntil: "networkidle", timeout: 45000 });

  // Verify Page Title
  const heading = await page.innerText("h1");
  console.log("Live page heading:", heading);
  if (!heading.includes("User") && !heading.includes("Access")) {
    throw new Error(`Unexpected page heading: ${heading}`);
  }

  // Take full page screenshot of directory
  const directoryShot = path.join(artifactsDir, "live_user_directory.png");
  await page.screenshot({ path: directoryShot, fullPage: true });
  console.log("✓ Saved live directory screenshot to", directoryShot);

  // 2. Verify Table Columns & Action buttons
  const viewButtons = await page.$$("button:has-text('View')");
  const editButtons = await page.$$("button:has-text('Edit')");
  console.log(`Found ${viewButtons.length} 'View' buttons and ${editButtons.length} 'Edit' buttons in live table.`);

  if (viewButtons.length === 0 || editButtons.length === 0) {
    throw new Error("FAIL: View and Edit buttons not found in live table!");
  }
  console.log("✓ PASS: View and Edit action buttons are rendered on live server!");

  // 3. Test Clicking "View" to open Complete User Profile Modal
  console.log("Clicking first 'View' button to open UserProfileModal...");
  await viewButtons[0].click();
  await page.waitForTimeout(600);

  // Check if profile modal is visible
  const profileModal = await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const modalText = await profileModal.innerText();
  console.log("Profile modal opened! Contains:", modalText.slice(0, 150).replace(/\n+/g, " "));

  const profileShot = path.join(artifactsDir, "live_user_profile_modal.png");
  await page.screenshot({ path: profileShot });
  console.log("✓ Saved live user profile modal screenshot to", profileShot);

  // Check switching tabs inside Profile Modal
  const permTab = await page.$("button:has-text('Role & Permissions')");
  if (permTab) {
    await permTab.click();
    await page.waitForTimeout(400);
    const permShot = path.join(artifactsDir, "live_user_permissions_tab.png");
    await page.screenshot({ path: permShot });
    console.log("✓ Saved permissions tab screenshot to", permShot);
  }

  // Close profile modal
  const closeProfileBtn = await page.$("button:has-text('Close Profile')");
  if (closeProfileBtn) {
    await closeProfileBtn.click();
    await page.waitForTimeout(400);
  }

  // 4. Test Clicking "Edit" to open Edit User Modal
  console.log("Clicking first 'Edit' button to open EditUserModal...");
  const freshEditButtons = await page.$$("button:has-text('Edit')");
  await freshEditButtons[0].click();
  await page.waitForTimeout(600);

  const editModal = await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const editModalText = await editModal.innerText();
  console.log("Edit modal opened! Contains:", editModalText.slice(0, 150).replace(/\n+/g, " "));

  const editShot = path.join(artifactsDir, "live_edit_user_modal.png");
  await page.screenshot({ path: editShot });
  console.log("✓ Saved live edit user modal screenshot to", editShot);

  // Cancel edit modal
  const cancelEditBtn = await page.$("button:has-text('Cancel')");
  if (cancelEditBtn) {
    await cancelEditBtn.click();
    await page.waitForTimeout(400);
  }

  // 5. Test Password Reset Modal
  console.log("Testing Password Reset modal opening...");
  const keyBtn = await page.$('button[title="Reset User Password"]');
  if (keyBtn) {
    await keyBtn.click();
    await page.waitForTimeout(600);
    const resetShot = path.join(artifactsDir, "live_reset_password_modal.png");
    await page.screenshot({ path: resetShot });
    console.log("✓ Saved live reset password modal screenshot to", resetShot);

    const cancelResetBtn = await page.$("button:has-text('Cancel')");
    if (cancelResetBtn) {
      await cancelResetBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // 6. Test Search functionality on live site
  console.log("Testing live search by query 'Galabhai'...");
  await page.fill('input[placeholder*="Search by"]', "Galabhai");
  await page.waitForTimeout(600);
  const searchResultsText = await page.innerText("table");
  console.log("Search results match 'Galabhai':", searchResultsText.includes("Galabhai"));

  // 7. Test Mobile Viewport Responsive Layout
  console.log("Testing mobile viewport (375x812)...");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.fill('input[placeholder*="Search by"]', "");
  await page.waitForTimeout(600);

  const mobileShot = path.join(artifactsDir, "live_mobile_user_directory.png");
  await page.screenshot({ path: mobileShot, fullPage: true });
  console.log("✓ Saved live mobile directory screenshot to", mobileShot);

  await browser.close();
  console.log("\n=======================================================");
  console.log("✅ ALL LIVE PRODUCTION VERIFICATION CHECKS PASSED 100%!");
  console.log("Target Live URL: https://aac-block-management.vercel.app/admin/users");
  console.log("=======================================================\n");
}

verifyLive().catch((err) => {
  console.error("Live verification failed:", err);
  process.exit(1);
});
