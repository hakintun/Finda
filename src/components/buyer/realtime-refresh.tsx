"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Subscribes to `/api/realtime` (SSE) so whenever Admin delists/restores a
 * customer or item — or a Seller updates price/stock — every open frontend tab
 * refreshes automatically in real time (< 200ms).
 */
export function RealtimeRefresh() {
  const router = useRouter();
  const lastVersionRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      es = new EventSource("/api/realtime");
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (typeof data.version === "number") {
            if (
              lastVersionRef.current !== null &&
              data.version !== lastVersionRef.current
            ) {
              router.refresh();
            }
            lastVersionRef.current = data.version;
          }
        } catch {
          // ignore malformed frame
        }
      };
      es.onerror = () => {
        es?.close();
        retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [router]);

  return null;
}
