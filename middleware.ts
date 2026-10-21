import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_EXACT = ["/login", "/register", "/forgot-password", "/reset-password"];

function roleHome(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "STOCKER":
    case "STAFF":
      return "/staff/dashboard";
    case "CUSTOMER":
    default:
      return "/customer/dashboard";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC_EXACT.includes(pathname) ||
    pathname.startsWith("/invoice/share");

  const token = request.cookies.get("acc_session")?.value;
  const secret = process.env.AUTH_SECRET;

  let valid = false;
  let userRole: string | undefined;

  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      valid = true;
      userRole = String(payload.role);
    } catch {
      valid = false;
    }
  }

  // Not logged in and accessing protected route
  if (!valid && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in and accessing public auth pages
  if (valid && PUBLIC_EXACT.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = roleHome(userRole ?? "CUSTOMER");
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Logged in and visiting root "/"
  if (valid && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = roleHome(userRole ?? "CUSTOMER");
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Role-based route gating
  if (valid && userRole) {
    if (pathname.startsWith("/admin") && userRole !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = roleHome(userRole);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/stocker") && !["ADMIN", "STOCKER", "STAFF"].includes(userRole)) {
      const url = request.nextUrl.clone();
      url.pathname = roleHome(userRole);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/staff") && !["ADMIN", "STAFF", "STOCKER"].includes(userRole)) {
      const url = request.nextUrl.clone();
      url.pathname = roleHome(userRole);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/customer") && !["ADMIN", "CUSTOMER"].includes(userRole)) {
      const url = request.nextUrl.clone();
      url.pathname = roleHome(userRole);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
