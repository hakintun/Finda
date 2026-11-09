"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Quick "switch shop" control so one tester can walk several stalls. */
export function ShopSwitcher({ shops, current }: { shops: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <select
      aria-label="Switch demo shop"
      value={current}
      disabled={busy}
      onChange={async (e) => {
        setBusy(true);
        await fetch("/api/seller/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop_id: e.target.value }),
        });
        router.refresh();
        setBusy(false);
      }}
      style={{ minHeight: 34, fontSize: 13.5, padding: "4px 8px", width: "auto", maxWidth: 210 }}
    >
      {shops.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}
