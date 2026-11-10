/**
 * Freshness + formatting rules — Member 3 · Task 5 (Daily Tap / freshness) and
 * PRD §7.2 (Freshness decay) & D-07 ("every price carries a timestamp").
 *
 * These are deliberately pure functions so they can be unit-tested
 * (see tests/freshness.test.mjs) — the PRD's Definition of Done requires a
 * unit test on the decay/price logic.
 */

export type FreshnessState = "fresh" | "aging" | "stale" | "expired";

export const FRESH_HOURS = 48;        // < 48h        → Fresh
export const AGING_HOURS = 168;       // 3–7 days     → Aging
export const STALE_HOURS = 336;       // 7–14 days    → Stale
//                                     // > 14 days    → Expired (hidden by default)

const HOUR = 3600 * 1000;

export function hoursSinceISO(iso: string | null | undefined, now: number = Date.now()): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (now - t) / HOUR;
}

/** Alias used across the app. */
export const hoursSince = hoursSinceISO;

export function freshnessState(confirmedAt: string | null | undefined, now: number = Date.now()): FreshnessState {
  const h = hoursSinceISO(confirmedAt, now);
  if (h < FRESH_HOURS) return "fresh";
  if (h < AGING_HOURS) return "aging";
  if (h < STALE_HOURS) return "stale";
  return "expired";
}

export function freshnessLabel(confirmedAt: string | null | undefined, now: number = Date.now()): string {
  const h = hoursSinceISO(confirmedAt, now);
  if (!Number.isFinite(h)) return "Never confirmed";
  if (h < 1) return "Confirmed just now";
  if (h < 24) return `Confirmed ${Math.floor(h)}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Confirmed yesterday";
  if (d < 7) return `Confirmed ${d} days ago`;
  if (d < 14) return `Confirmed ${d} days ago — may have changed`;
  return `Confirmed ${d} days ago — likely outdated`;
}

/** Decay weight used by ranking: halves roughly every 4 days. */
export function freshnessWeight(confirmedAt: string | null | undefined, now: number = Date.now()): number {
  const h = hoursSinceISO(confirmedAt, now);
  if (!Number.isFinite(h)) return 0;
  return Math.pow(0.5, h / 96); // 96h = 4 days
}

/* ------------------------------- money ----------------------------- */
/** Prices are integer KOBO everywhere (PRD §11). Never floats. */
export function formatNaira(kobo: number): string {
  if (!Number.isFinite(kobo)) return "₦—";
  const naira = kobo / 100;
  return "₦" + naira.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export function nairaToKobo(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[₦,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/* ------------------------------- stock ----------------------------- */
export type StockStatus = "in" | "low" | "unconfirmed" | "out";

export function stockLabel(s: StockStatus | string): string {
  switch (s) {
    case "in": return "In stock";
    case "low": return "Low stock";
    case "out": return "Out of stock";
    default: return "Unconfirmed";
  }
}

export function stockWeight(s: StockStatus | string): number {
  switch (s) {
    case "in": return 1;
    case "low": return 0.7;
    case "unconfirmed": return 0.35;
    case "out": return 0.05;
    default: return 0.3;
  }
}

/* ------------------------------ distance --------------------------- */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/* ------------------------------ accounts --------------------------- */
export function maskPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 6) return phone;
  return `${digits.slice(0, 4)}${"•".repeat(Math.max(0, digits.length - 6))}${digits.slice(-2)}`;
}

/** Normalise any Nigerian number to E.164 (+234…) for storage. */
export function toE164(input: string): string | null {
  const d = (input || "").replace(/\D/g, "");
  if (d.startsWith("234") && d.length === 13) return `+${d}`;
  if (d.startsWith("0") && d.length === 11) return `+234${d.slice(1)}`;
  if (d.length === 10) return `+234${d}`;
  return null;
}

/** Opening hours check — returns "open" | "closed" with the next opening time. */
export function shopOpenState(hours: Record<string, string> | null, now: Date = new Date()) {
  if (!hours) return { open: true, label: "" };
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const dayKey = days[now.getDay()];
  const spec = hours[dayKey];
  if (!spec || spec === "closed") return { open: false, label: "Closed today" };

  const [openStr, closeStr] = spec.split("-");
  const [oh, om] = openStr.split(":").map(Number);
  const [ch, cm] = closeStr.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const openM = oh * 60 + om;
  const closeM = ch * 60 + cm;

  if (mins < openM) return { open: false, label: `Closed now · opens ${openStr}` };
  if (mins > closeM) return { open: false, label: `Closed now · opens 8:00 tomorrow`.replace("8:00 tomorrow", openingTomorrow(hours, now)) };
  return { open: true, label: `Open now · closes ${closeStr}` };
}

function openingTomorrow(hours: Record<string, string>, now: Date): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  for (let i = 1; i <= 7; i++) {
    const k = days[(now.getDay() + i) % 7];
    const spec = hours[k];
    if (spec && spec !== "closed") return spec.split("-")[0] + " tomorrow";
  }
  return "—";
}
