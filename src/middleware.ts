import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "finda_admin";
const CUSTOMER_COOKIE = "finda_customer";
const SELLER_COOKIE = "finda_seller";

/**
 * Enforces strict separation between Customers (Buyers/Sellers) and Admin tools.
 * Customers without an active staff session cannot access `/admin`, `/test-plan`,
 * `/api/export`, or `/api/seller/switch`.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasAdmin = Boolean(req.cookies.get(ADMIN_COOKIE)?.value);
  const isLoggedCustomer = Boolean(
    req.cookies.get(CUSTOMER_COOKIE)?.value ||
      req.cookies.get(SELLER_COOKIE)?.value
  );

  // Staff-only API endpoints
  if (
    (pathname.startsWith("/api/export") ||
      pathname.startsWith("/api/seller/switch")) &&
    !hasAdmin
  ) {
    return NextResponse.json(
      { ok: false, error: "Forbidden — staff access required." },
      { status: 403 }
    );
  }

  // Internal staff test plan requires admin session
  if (pathname.startsWith("/test-plan") && !hasAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/restricted";
    return NextResponse.redirect(url);
  }

  // Block signed-in buyers/sellers from opening `/admin/*`
  if (pathname.startsWith("/admin") && isLoggedCustomer && !hasAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/restricted";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/test-plan/:path*",
    "/api/export/:path*",
    "/api/seller/switch/:path*",
  ],
};
