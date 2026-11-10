import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "finda_admin";
const CUSTOMER_COOKIE = "finda_customer";
const SELLER_COOKIE = "finda_seller";

/**
 * Enforces strict separation between Customers (Buyers/Sellers) and Admin tools,
 * and bridges iframe session tokens (`?__ft=` / `x-finda-token`) into request headers
 * when third-party cookies are blocked in cross-origin preview iframes.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const ftToken =
    req.nextUrl.searchParams.get("__ft")?.trim() ||
    req.headers.get("x-finda-token")?.trim() ||
    "";

  const hasAdmin = Boolean(req.cookies.get(ADMIN_COOKIE)?.value);
  const isLoggedCustomer = Boolean(
    req.cookies.get(CUSTOMER_COOKIE)?.value ||
      req.cookies.get(SELLER_COOKIE)?.value ||
      ftToken
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
    url.searchParams.delete("__ft");
    return NextResponse.redirect(url);
  }

  // Block signed-in buyers/sellers from opening `/admin/*`
  if (pathname.startsWith("/admin") && isLoggedCustomer && !hasAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/restricted";
    return NextResponse.redirect(url);
  }

  if (ftToken) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-finda-token", ftToken);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
