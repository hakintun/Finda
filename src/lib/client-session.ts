"use client";

/**
 * Client-side session fallback utilities for cross-origin preview iframes
 * where browsers (Safari ITP, Brave Shields, Firefox Strict, Chrome Incognito)
 * block all third-party Set-Cookie headers.
 *
 * On standard browsers & localhost where cookies work natively, URLs remain 100% clean.
 */

const TOKEN_KEY = "finda_session_token";
const COOKIE_BLOCKED_KEY = "finda_cookie_blocked";

let memoryToken: string | null = null;
let memoryCookieBlocked = false;

export function getClientSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search).get("__ft")?.trim();
  if (fromUrl) {
    memoryToken = fromUrl;
    return fromUrl;
  }
  try {
    const s =
      window.sessionStorage.getItem(TOKEN_KEY) ||
      window.localStorage.getItem(TOKEN_KEY);
    if (s) return s;
  } catch {
    // storage restricted in strict sandbox
  }
  return memoryToken;
}

export function isCookieBlockedMode(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).has("__ft")) {
    return true;
  }
  try {
    return (
      window.sessionStorage.getItem(COOKIE_BLOCKED_KEY) === "1" ||
      window.localStorage.getItem(COOKIE_BLOCKED_KEY) === "1"
    );
  } catch {
    return memoryCookieBlocked;
  }
}

export function saveClientSessionToken(
  token: string | null,
  cookieBlocked?: boolean
) {
  memoryToken = token;
  if (typeof cookieBlocked === "boolean") {
    memoryCookieBlocked = cookieBlocked;
  }
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.sessionStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
    }
    if (typeof cookieBlocked === "boolean") {
      if (cookieBlocked) {
        window.sessionStorage.setItem(COOKIE_BLOCKED_KEY, "1");
        window.localStorage.setItem(COOKIE_BLOCKED_KEY, "1");
      } else {
        window.sessionStorage.removeItem(COOKIE_BLOCKED_KEY);
        window.localStorage.removeItem(COOKIE_BLOCKED_KEY);
      }
    }
  } catch {
    // ignore storage quota / sandbox restrictions
  }
}

export function withSessionParam(pathOrUrl: string, token: string): string {
  if (!token) return pathOrUrl;
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(pathOrUrl, base);
    if (typeof window !== "undefined" && u.origin !== window.location.origin) {
      return pathOrUrl;
    }
    u.searchParams.set("__ft", token);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return pathOrUrl;
  }
}

export function stripSessionParam(pathOrUrl: string): string {
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(pathOrUrl, base);
    u.searchParams.delete("__ft");
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return pathOrUrl;
  }
}

/**
 * Verifies whether browser cookies persisted after login/register/publish.
 * - If cookies persisted (normal browser / localhost): navigates cleanly to `targetPath`.
 * - If cookies were dropped by a cross-origin iframe: activates token bridge and navigates with `?__ft=`.
 */
export async function completeClientAuthAndNavigate(
  targetPath: string,
  sessionToken?: string | null
) {
  const cleanTarget = stripSessionParam(targetPath || "/");
  if (sessionToken) {
    saveClientSessionToken(sessionToken);
  }

  let cookiesWork = false;
  try {
    const probe = await window.fetch("/api/auth?cookie_probe=1", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const data = await probe.json().catch(() => ({}));
    cookiesWork = Boolean(data?.authenticated);
  } catch {
    cookiesWork = false;
  }

  const token = sessionToken || getClientSessionToken();
  if (cookiesWork || !token) {
    saveClientSessionToken(token || null, false);
    window.location.assign(cleanTarget);
    return;
  }

  // Cookies were blocked by iframe privacy settings — engage seamless token bridge
  saveClientSessionToken(token, true);
  window.location.assign(withSessionParam(cleanTarget, token));
}

export async function clearClientAuthAndRedirect(targetPath = "/") {
  const token = getClientSessionToken();
  saveClientSessionToken(null, false);
  try {
    await window.fetch("/api/auth", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-finda-token": token } : {}),
      },
      body: JSON.stringify({ action: "logout" }),
    });
  } catch {
    // ignore network failure during sign-out
  }
  window.location.assign(stripSessionParam(targetPath));
}
