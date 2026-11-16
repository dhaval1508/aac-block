import { prisma } from "../lib/prisma";
import { recordOrderQrScan } from "../lib/actions/order-qr";
import { generateQrDataUrl, generateQrSvg, getOrderQrUrl } from "../lib/qr";

async function main() {
  console.log("=== Testing Order QR Code System ===");

  // 1. Fetch an order that has a QR code
  const qr = await prisma.orderQrCode.findFirst({
    where: { status: "ACTIVE" },
    include: {
      order: {
        include: {
          customer: true,
          items: true,
        },
      },
    },
  });

  if (!qr) {
    throw new Error("No active QR code found in database!");
  }

  console.log(`✓ Found active QR for Order: ${qr.order.orderNo}`);
  console.log(`  Token: ${qr.token}`);
  console.log(`  Customer: ${qr.order.customer?.name || "Direct"}`);
  console.log(`  Items Count: ${qr.order.items.length}`);

  // 2. Test QR URL & Image Generators
  const qrUrl = getOrderQrUrl(qr.token);
  console.log(`  Target Scanning URL: ${qrUrl}`);

  const [dataUrl, svg] = await Promise.all([
    generateQrDataUrl(qrUrl),
    generateQrSvg(qrUrl),
  ]);

  if (!dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("Invalid PNG Data URL generated!");
  }
  console.log("✓ Generated PNG Data URL (1024x1024)");

  if (!svg.includes("<svg") || !svg.includes("</svg>")) {
    throw new Error("Invalid SVG generated!");
  }
  console.log("✓ Generated Vector SVG Markup");

  // 3. Test Scan Logging (Simulate Scan Event)
  const initialScanCount = await prisma.orderQrScanLog.count({ where: { qrCodeId: qr.id } });
  const scanResult = await recordOrderQrScan(qr.token, "Playwright-Test-Agent/1.0 (Windows)", "127.0.0.1");

  if (!scanResult.valid || scanResult.orderId !== qr.orderId) {
    throw new Error("Scan result failed or returned wrong orderId!");
  }

  const updatedScanCount = await prisma.orderQrScanLog.count({ where: { qrCodeId: qr.id } });
  if (updatedScanCount !== initialScanCount + 1) {
    throw new Error("Scan log was not recorded in database!");
  }
  console.log(`✓ Scan successfully recorded in OrderQrScanLog (Count: ${updatedScanCount})`);

  // 4. Test Revocation Behavior
  await prisma.orderQrCode.update({
    where: { id: qr.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: "Automated test revocation",
    },
  });

  const revokedScan = await recordOrderQrScan(qr.token, "Playwright-Test-Agent/1.0", "127.0.0.1");
  if (revokedScan.valid || revokedScan.reason !== "REVOKED") {
    throw new Error("Revoked QR was incorrectly accepted as valid!");
  }
  console.log("✓ Revoked QR properly rejected with reason: 'REVOKED'");

  // 5. Restore back to ACTIVE
  await prisma.orderQrCode.update({
    where: { id: qr.id },
    data: {
      status: "ACTIVE",
      revokedAt: null,
      revokedReason: null,
    },
  });

  const restoredScan = await recordOrderQrScan(qr.token, "Playwright-Test-Agent/1.0", "127.0.0.1");
  if (!restoredScan.valid) {
    throw new Error("Restored QR was not accepted!");
  }
  console.log("✓ Restored QR properly accepted with valid: true");

  console.log("=== ALL UNIT TESTS PASSED SUCCESSFULLY! ===");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

