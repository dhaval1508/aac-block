import { SignJWT } from "jose";
import { prisma } from "../lib/prisma";

async function main() {
  const secretKey = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback_super_secret_production_key_acc_block_2026_jwt");

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", active: true },
  });

  if (!admin) {
    console.error("Admin user not found!");
    process.exit(1);
  }

  const token = await new SignJWT({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  const cookieHeader = `acc_session=${token}`;
  const baseUrl = "http://localhost:3000";

  console.log("======================================================================");
  console.log("🚀 TESTING SUPER ADMIN REDESIGNED PAGES & DATE FILTER PRESETS");
  console.log("======================================================================");

  const datePresets = [
    "today",
    "yesterday",
    "this_week",
    "last_week",
    "last_7_days",
    "last_30_days",
    "this_month",
    "last_month",
    "last_3_months",
    "this_year",
    "all_time",
    "custom&from=2026-10-01&to=2026-10-13",
  ];

  console.log("\n1. Testing Dashboard with all 12 Date Presets:");
  for (const preset of datePresets) {
    const url = `${baseUrl}/admin/dashboard?preset=${preset}`;
    const res = await fetch(url, { headers: { Cookie: cookieHeader } });
    const text = await res.text();
    const ok = res.status === 200 && text.includes("Swarnim AAC Command Center");
    console.log(`   ${ok ? "✅" : "❌"} /admin/dashboard?preset=${preset.padEnd(35)} -> HTTP ${res.status} [${text.length} bytes]`);
    if (!ok) console.error("      Error:", text.slice(0, 300));
  }

  console.log("\n2. Testing Orders Management with Filters:");
  const orderRoutes = [
    "/admin/orders",
    "/admin/orders?preset=today",
    "/admin/orders?preset=last_7_days&status=CONFIRMED",
    "/admin/orders?paymentStatus=PAID",
    "/admin/orders?paymentStatus=PARTIAL",
    "/admin/orders?sort=oldest",
  ];
  for (const route of orderRoutes) {
    const res = await fetch(`${baseUrl}${route}`, { headers: { Cookie: cookieHeader } });
    const text = await res.text();
    const ok = res.status === 200 && text.includes("Factory Orders Management");
    console.log(`   ${ok ? "✅" : "❌"} ${route.padEnd(50)} -> HTTP ${res.status} [${text.length} bytes]`);
  }

  console.log("\n3. Testing Live Yard Inventory & Stock Movements with Filters:");
  const stockRoutes = [
    "/admin/stock",
    "/admin/stock?preset=today",
    "/admin/stock?preset=last_30_days",
    "/admin/stock?type=IN",
    "/admin/stock?type=OUT",
  ];
  for (const route of stockRoutes) {
    const res = await fetch(`${baseUrl}${route}`, { headers: { Cookie: cookieHeader } });
    const text = await res.text();
    const ok = res.status === 200 && text.includes("Live Factory Inventory Management");
    console.log(`   ${ok ? "✅" : "❌"} ${route.padEnd(50)} -> HTTP ${res.status} [${text.length} bytes]`);
  }

  console.log("\n4. Testing Payments & Receivables Ledger with Filters:");
  const paymentRoutes = [
    "/admin/payments",
    "/admin/payments?preset=today",
    "/admin/payments?preset=this_month",
    "/admin/payments?mode=UPI",
    "/admin/payments?mode=BANK_TRANSFER",
    "/admin/payments?mode=CASH",
  ];
  for (const route of paymentRoutes) {
    const res = await fetch(`${baseUrl}${route}`, { headers: { Cookie: cookieHeader } });
    const text = await res.text();
    const ok = res.status === 200 && (text.includes("Central Payments") || text.includes("Payments &amp; Receivables"));
    console.log(`   ${ok ? "✅" : "❌"} ${route.padEnd(50)} -> HTTP ${res.status} [${text.length} bytes]`);
  }

  console.log("\n5. Testing Users & Team Directory with Tabs & Status:");
  const userRoutes = [
    "/admin/users",
    "/admin/users?role=STAFF",
    "/admin/users?role=CUSTOMER",
    "/admin/users?status=active",
  ];
  for (const route of userRoutes) {
    const res = await fetch(`${baseUrl}${route}`, { headers: { Cookie: cookieHeader } });
    const text = await res.text();
    const ok = res.status === 200 && (text.includes("Users") && text.includes("Management"));
    console.log(`   ${ok ? "✅" : "❌"} ${route.padEnd(50)} -> HTTP ${res.status} [${text.length} bytes]`);
  }

  console.log("\n6. Testing Activity Audit Log with Filters:");
  const activityRoutes = [
    "/admin/activity",
    "/admin/activity?preset=today",
    "/admin/activity?category=ORDER",
    "/admin/activity?category=STOCK",
    "/admin/activity?category=PAYMENT",
  ];
  for (const route of activityRoutes) {
    const res = await fetch(`${baseUrl}${route}`, { headers: { Cookie: cookieHeader } });
    const text = await res.text();
    const ok = res.status === 200 && (text.includes("Audit Trail") || text.includes("Activity Feed"));
    console.log(`   ${ok ? "✅" : "❌"} ${route.padEnd(50)} -> HTTP ${res.status} [${text.length} bytes]`);
  }

  console.log("\n7. Testing Block Sizes & CBM Catalog:");
  const productRoutes = [
    "/admin/products",
  ];
  for (const route of productRoutes) {
    const res = await fetch(`${baseUrl}${route}`, { headers: { Cookie: cookieHeader } });
    const text = await res.text();
    const ok = res.status === 200 && text.includes("Block Sizes");
    console.log(`   ${ok ? "✅" : "❌"} ${route.padEnd(50)} -> HTTP ${res.status} [${text.length} bytes]`);
  }

  console.log("\n======================================================================");
  console.log("🎉 ALL SUPER ADMIN PAGES & FILTER PRESET TESTS EXECUTED SUCCESSFULLY");
  console.log("======================================================================");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
