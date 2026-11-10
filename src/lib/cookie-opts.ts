import { headers } from "next/headers";

/**
 * Computes cookie attributes that work reliably in BOTH:
 * 1. Cross-origin HTTPS iframes (e.g. Arena Live Preview `https://3000-*.e2b.app`),
 *    where browsers require `SameSite=None; Secure; Partitioned` (CHIPS) and silently
 *    drop `SameSite=Lax` cookies.
 * 2. Local development over plain HTTP (`http://localhost:3000`), where `Secure`
 *    must be `false` and `SameSite=Lax` is required.
 */
export async function getSessionCookieOptions(maxAgeSeconds: number) {
  let isHttps = false;
  try {
    const h = await headers();
    const xfProto = (h.get("x-forwarded-proto") || "").split(",")[0].trim();
    const origin = h.get("origin") || "";
    const referer = h.get("referer") || "";
    const host = h.get("x-forwarded-host") || h.get("host") || "";

    if (
      xfProto === "https" ||
      origin.startsWith("https://") ||
      referer.startsWith("https://") ||
      host.endsWith(".e2b.app")
    ) {
      isHttps = true;
    }
  } catch {
    // Fallback outside request context (e.g. unit tests)
    isHttps = false;
  }

  if (isHttps) {
    return {
      httpOnly: true,
      sameSite: "none" as const,
      secure: true,
      path: "/",
      maxAge: maxAgeSeconds,
      ...({ partitioned: true } as Record<string, unknown>),
    };
  }

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
