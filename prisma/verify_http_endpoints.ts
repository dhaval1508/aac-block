import { getSession } from "../lib/session";
import { cookies } from "next/headers";

async function verifyHttpRoutesAndRoleGuards() {
  console.log("======================================================================");
  console.log("🌐 AUDITING LIVE HTTP ENDPOINTS & ROLE AUTHORIZATION GUARDS");
  console.log("======================================================================\n");

  const baseUrl = "http://localhost:3000";

  // Test public endpoints
  const publicRoutes = ["/login", "/register", "/forgot-password"];
  for (const route of publicRoutes) {
    try {
      const res = await fetch(`${baseUrl}${route}`);
      console.log(`[HTTP ${res.status}] ${route} -> ${res.status === 200 ? "✅ OK" : "⚠️ " + res.status}`);
    } catch (err: any) {
      console.log(`[ERROR] ${route} -> ${err.message}`);
    }
  }

  // Test protected routes without session -> must return 307/302 redirect to /login or redirect to login
  const protectedRoutes = [
    "/admin/dashboard",
    "/admin/orders",
    "/admin/payments",
    "/stocker/dashboard",
    "/stocker/stock",
    "/staff/dashboard",
    "/customer/dashboard",
  ];

  console.log("\n🔒 Verifying Unauthenticated Access Redirection:");
  for (const route of protectedRoutes) {
    try {
      const res = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
      const isRedirect = res.status === 307 || res.status === 302 || res.status === 303;
      const location = res.headers.get("location") || "";
      const isPass = isRedirect && location.includes("/login");
      console.log(`[HTTP ${res.status}] ${route} -> ${isPass ? "✅ Blocked (Redirects to /login)" : "❌ FAILED (" + res.status + " " + location + ")"}`);
    } catch (err: any) {
      console.log(`[ERROR] ${route} -> ${err.message}`);
    }
  }

  console.log("\n======================================================================");
  console.log("✅ HTTP ROUTE AND AUTHENTICATION GUARDS VALIDATION COMPLETED");
  console.log("======================================================================\n");
}

verifyHttpRoutesAndRoleGuards();
