"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  clearClientAuthAndRedirect,
  getClientSessionToken,
  isCookieBlockedMode,
  saveClientSessionToken,
  withSessionParam,
} from "@/lib/client-session";

declare global {
  interface Window {
    __findaFetchPatched?: boolean;
  }
}

/**
 * Transparently keeps sessions alive inside cookie-blocking cross-origin iframes
 * while doing zero URL modification on standard browsers / localhost.
 */
export function AuthSessionBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Patch same-origin fetch once so RSC navigations & API calls attach `x-finda-token` when stored
  useEffect(() => {
    if (typeof window === "undefined" || window.__findaFetchPatched) return;
    window.__findaFetchPatched = true;

    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const token = getClientSessionToken();
        if (token) {
          const rawUrl =
            typeof input === "string"
              ? input
              : input instanceof URL
              ? input.href
              : input.url;
          const resolved = new URL(rawUrl, window.location.origin);
          const isSameOrigin = resolved.origin === window.location.origin;
          const isCookieProbe =
            resolved.pathname === "/api/auth" &&
            resolved.searchParams.get("cookie_probe") === "1";

          if (isSameOrigin && !isCookieProbe) {
            const headers = new Headers(
              init?.headers ||
                (input instanceof Request ? input.headers : undefined)
            );
            if (!headers.has("x-finda-token")) {
              headers.set("x-finda-token", token);
            }
            return nativeFetch(input, { ...init, headers });
          }
        }
      } catch {
        // fall through to native fetch
      }
      return nativeFetch(input, init);
    };
  }, []);

  // 2. Sync URL token when running inside a cookie-blocked iframe so refreshes & form actions stay signed in
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlFt = new URLSearchParams(window.location.search).get("__ft")?.trim();
    if (urlFt) {
      saveClientSessionToken(urlFt, true);
      return;
    }

    if (isCookieBlockedMode()) {
      const token = getClientSessionToken();
      if (token && pathname !== "/auth") {
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const updated = withSessionParam(current, token);
        if (updated !== current) {
          window.history.replaceState(window.history.state, "", updated);
        }
      }
    }
  }, [pathname, searchParams]);

  // 3. Intercept seller server-action Sign Out forms so client fallback token is cleared too
  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const signOutBtn = target.closest("[data-signout='1']") as HTMLElement | null;
      if (signOutBtn) {
        e.preventDefault();
        void clearClientAuthAndRedirect("/");
        return;
      }

      // If cookie-blocked mode is active, ensure plain/new-tab same-origin links also carry __ft
      if (isCookieBlockedMode()) {
        const token = getClientSessionToken();
        const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
        if (token && anchor) {
          const rawHref = anchor.getAttribute("href") || "";
          if (
            rawHref.startsWith("/") &&
            !rawHref.startsWith("//") &&
            !rawHref.startsWith("/api/") &&
            !rawHref.includes("__ft=")
          ) {
            anchor.setAttribute("href", withSessionParam(rawHref, token));
          }
        }
      }
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  return null;
}
