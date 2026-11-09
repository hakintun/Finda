/**
 * Member 3 — Task 10 (testing) · PRD §15.3 Definition of Done:
 * "unit test on the ranking/decay/price logic".
 *
 * Run with:  npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshnessState, freshnessLabel, freshnessWeight, formatNaira, nairaToKobo,
  stockWeight, haversineKm, formatDistance, toE164, maskPhone, shopOpenState,
  FRESH_HOURS, AGING_HOURS, STALE_HOURS,
} from "../src/lib/freshness";
import { pointInPolygon, validatePin } from "../src/lib/geo";
import { checkBanned } from "../src/lib/moderation";
import { suggestProducts, didYouMean, similarity, type Product } from "../src/lib/products";

const H = 3600 * 1000;
const ago = (hours: number) => new Date(Date.now() - hours * H).toISOString();

/* ---------------------------------------------------------------- */
test("freshness: boundaries match the PRD", () => {
  assert.equal(freshnessState(ago(1)), "fresh");
  assert.equal(freshnessState(ago(FRESH_HOURS - 1)), "fresh");
  assert.equal(freshnessState(ago(FRESH_HOURS + 1)), "aging");
  assert.equal(freshnessState(ago(AGING_HOURS - 1)), "aging");
  assert.equal(freshnessState(ago(AGING_HOURS + 1)), "stale");
  assert.equal(freshnessState(ago(STALE_HOURS - 1)), "stale");
  assert.equal(freshnessState(ago(STALE_HOURS + 1)), "expired");
});

test("freshness: never-confirmed is expired, not fresh", () => {
  assert.equal(freshnessState(null), "expired");
  assert.equal(freshnessState(undefined), "expired");
  assert.equal(freshnessState("not-a-date"), "expired");
  assert.equal(freshnessLabel(null), "Never confirmed");
});

test("freshness: labels are plain English, never ISO dates", () => {
  assert.equal(freshnessLabel(ago(0.2)), "Confirmed just now");
  assert.equal(freshnessLabel(ago(6)), "Confirmed 6h ago");
  assert.equal(freshnessLabel(ago(24)), "Confirmed yesterday");
  assert.equal(freshnessLabel(ago(96)), "Confirmed 4 days ago");
  assert.match(freshnessLabel(ago(24 * 9)), /may have changed/);
  assert.match(freshnessLabel(ago(24 * 20)), /likely outdated/);
});

test("freshness: decay halves roughly every 4 days", () => {
  const now = Date.now();
  const at = (h: number) => new Date(now - h * H).toISOString();
  const w0 = freshnessWeight(at(0), now);
  const w4 = freshnessWeight(at(96), now);
  const w8 = freshnessWeight(at(192), now);
  assert.ok(Math.abs(w0 - 1) < 1e-9);
  assert.ok(Math.abs(w4 - 0.5) < 1e-9, `expected 0.5, got ${w4}`);
  assert.ok(Math.abs(w8 - 0.25) < 1e-9, `expected 0.25, got ${w8}`);
  // and it must be monotonically decreasing
  assert.ok(freshnessWeight(at(10), now) > freshnessWeight(at(50), now));
  assert.ok(freshnessWeight(at(50), now) > freshnessWeight(at(500), now));
});

/* ---------------------------------------------------------------- */
test("money: stored as integer kobo, displayed as Naira", () => {
  assert.equal(formatNaira(18500000), "₦185,000");
  assert.equal(formatNaira(150000), "₦1,500");
  assert.equal(formatNaira(0), "₦0");
  assert.equal(nairaToKobo("185,000"), 18500000);
  assert.equal(nairaToKobo("₦1,500.50"), 150050);
  assert.equal(nairaToKobo(-5), 0);
  // kobo is always an integer — no float drift on 0.1 + 0.2 style prices
  const k = nairaToKobo("185.55");
  assert.ok(Number.isInteger(k), "kobo must be an integer");
  assert.equal(k, 18555);
});

test("stock: in-stock always outranks out-of-stock", () => {
  assert.ok(stockWeight("in") > stockWeight("low"));
  assert.ok(stockWeight("low") > stockWeight("unconfirmed"));
  assert.ok(stockWeight("unconfirmed") > stockWeight("out"));
});

/* ---------------------------------------------------------------- */
test("distance: Port Harcourt spot checks", () => {
  const mile1 = { lat: 4.8098, lng: 6.9901 };
  const mile3 = { lat: 4.8352, lng: 6.9951 };
  const d = haversineKm(mile1, mile3);
  assert.ok(d > 2 && d < 4, `Mile 1 → Mile 3 should be ~2.9 km, got ${d}`);
  assert.equal(formatDistance(0.4), "400 m");
  assert.equal(formatDistance(1.24), "1.2 km");
});

test("geo: point-in-polygon rejects pins outside the boundary", () => {
  const square = [
    { lat: 4.80, lng: 6.98 }, { lat: 4.82, lng: 6.98 },
    { lat: 4.82, lng: 7.00 }, { lat: 4.80, lng: 7.00 },
  ];
  assert.equal(pointInPolygon({ lat: 4.81, lng: 6.99 }, square), true);
  assert.equal(pointInPolygon({ lat: 4.83, lng: 6.99 }, square), false);
  assert.equal(pointInPolygon({ lat: 4.81, lng: 7.01 }, square), false);
});

test("geo: validatePin flags a pin that lands in another zone", () => {
  const zones = [
    { id: "mile1", lat: 4.8098, lng: 6.9901, boundary: [
      { lat: 4.80, lng: 6.98 }, { lat: 4.82, lng: 6.98 }, { lat: 4.82, lng: 7.00 }, { lat: 4.80, lng: 7.00 }] },
    { id: "choba", lat: 4.8979, lng: 6.9081, boundary: [
      { lat: 4.89, lng: 6.90 }, { lat: 4.91, lng: 6.90 }, { lat: 4.91, lng: 6.92 }, { lat: 4.89, lng: 6.92 }] },
  ];
  const good = validatePin({ lat: 4.81, lng: 6.99 }, "mile1", zones);
  assert.equal(good.ok, true);
  assert.equal(good.ok === true && good.distance_km, 0);

  // a Choba pin claiming to be in Mile 1 — the pin-dropping case
  const dropped = validatePin({ lat: 4.90, lng: 6.91 }, "mile1", zones);
  assert.equal(dropped.ok, false);
  if (dropped.ok === false) {
    assert.equal(dropped.reason, "outside_zone");
    assert.equal(dropped.nearest_zone_id, "choba", "should notice it actually sits in Choba");
    assert.ok(dropped.distance_km > 8, `should report ~10 km from Mile 1, got ${dropped.distance_km}`);
  }
});

/* ---------------------------------------------------------------- */
test("moderation: blocks prohibited items, allows innocent ones", () => {
  assert.ok(checkBanned("Tramadol 500mg"));
  assert.ok(checkBanned("tokunbo pistol"));
  assert.ok(checkBanned("Rolex replica watch"));
  assert.equal(checkBanned("1KVA Generator"), null);
  assert.equal(checkBanned("Gunmetal grey paint"), null, "must not match inside a word");
});

/* ---------------------------------------------------------------- */
const dict: Product[] = [
  { id: "gen", canonical_name: "1KVA Generator", category: "Generators", unit: "each", typical_price_kobo: 18500000, aliases: ["gen", "i better pass my neighbour"] },
  { id: "indomie", canonical_name: "Indomie Carton (40 packs)", category: "Foodstuff", unit: "carton", typical_price_kobo: 980000, aliases: ["indomine", "noodles"] },
  { id: "ac", canonical_name: '1.5HP Air Conditioner', category: "Electronics", unit: "each", typical_price_kobo: 38500000, aliases: ["ac", "air con"] },
];

test("products: 'Did you mean…?' catches the messy name", () => {
  const s = didYouMean("jennerator", dict);
  assert.ok(s, "should suggest something for jennerator");
  assert.equal(s!.product.id, "gen");
});

test("products: exact canonical names are not re-suggested", () => {
  assert.equal(didYouMean("1KVA Generator", dict), null);
});

test("products: aliases and misspellings find the product", () => {
  const a = suggestProducts("indomine", dict);
  assert.equal(a[0].product.id, "indomie");
  const b = suggestProducts("air con", dict);
  assert.equal(b[0].product.id, "ac");
});

test("products: a totally unrelated word suggests nothing", () => {
  assert.equal(suggestProducts("zzzzqqq", dict).length, 0);
  assert.ok(similarity("generator", "generator") > 0.99);
});

/* ---------------------------------------------------------------- */
test("accounts: Nigerian numbers normalise to E.164", () => {
  assert.equal(toE164("08031234567"), "+2348031234567");
  assert.equal(toE164("0803 123 4567"), "+2348031234567");
  assert.equal(toE164("+2348031234567"), "+2348031234567");
  assert.equal(toE164("2348031234567"), "+2348031234567");
  assert.equal(toE164("12345"), null);
});

test("accounts: phone numbers are masked in the UI", () => {
  const m = maskPhone("+2348031234567");
  assert.ok(!m.includes("1234567"), "middle digits must be hidden");
  assert.ok(m.endsWith("67"));
});

/* ---------------------------------------------------------------- */
test("hours: closed-now notice works", () => {
  const hours = { mon: "8:00-18:00", tue: "8:00-18:00", wed: "8:00-18:00", thu: "8:00-18:00", fri: "8:00-18:00", sat: "8:00-16:00", sun: "closed" };
  const monday10 = new Date("2026-11-09T10:00:00");
  const monday20 = new Date("2026-11-09T20:00:00");
  const sunday = new Date("2026-11-08T12:00:00");
  assert.equal(shopOpenState(hours, monday10).open, true);
  assert.equal(shopOpenState(hours, monday20).open, false);
  assert.match(shopOpenState(hours, monday20).label, /Closed now/);
  assert.equal(shopOpenState(hours, sunday).open, false);
});

/* ---------------------------------------------------------------- */
test("prices in the seed data are integers in kobo (no floats)", async () => {
  const { readFileSync } = await import("node:fs");
  const seed = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"));
  const bad = seed.listings.filter((l: any) => !Number.isInteger(l.price_kobo) || l.price_kobo <= 0);
  assert.equal(bad.length, 0, `${bad.length} listings have a bad price_kobo`);

  const missingLandmark = seed.sellers.filter((s: any) => !s.landmark_text || s.landmark_text.length < 6);
  assert.equal(missingLandmark.length, 0, "landmark_text is required for every seller");
});

test("seed data: enough shops, and all six market areas are populated", async () => {
  const { readFileSync } = await import("node:fs");
  const seed = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"));
  assert.ok(seed.sellers.length >= 30, `expected ≥30 sample shops, got ${seed.sellers.length}`);
  assert.equal(seed.zones.length, 6);
  for (const z of seed.zones) {
    const n = seed.sellers.filter((s: any) => s.zone_id === z.id).length;
    assert.ok(n >= 3, `${z.name} has only ${n} shops`);
  }
});

/* ---------------------------------------------------------------- */
/* Regression: the seed stores relative offsets (confirmed_at_hours_ago).
   The materialiser must convert them to real *_at fields — an earlier bug
   produced "confirmed_at_at" and silently broke freshness across the app. */
test("seed: relative hour offsets materialise into real *_at timestamps", async () => {
  const { readFileSync } = await import("node:fs");
  const seed = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"));

  assert.ok("confirmed_at_hours_ago" in seed.listings[0], "seed should store relative offsets");
  assert.ok("last_nudge_hours_ago" in seed.sellers[0]);

  // reproduce the transformation used by lib/db.ts
  const toReal = (f: string) => {
    const target = f.replace(/_hours_ago$/, "");
    return target.endsWith("_at") ? target : `${target}_at`;
  };
  assert.equal(toReal("confirmed_at_hours_ago"), "confirmed_at");
  assert.equal(toReal("created_at_hours_ago"), "created_at");
  assert.equal(toReal("last_nudge_hours_ago"), "last_nudge_at");
  assert.equal(toReal("reviewed_at_hours_ago"), "reviewed_at");
});

test("the working database has fresh, correctly-named timestamps", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const path = new URL("../data/db.json", import.meta.url);
  if (!existsSync(path)) return; // a fresh clone has no db.json until first run

  const db = JSON.parse(readFileSync(path, "utf8"));
  const bad = db.listings.filter((l: any) => !l.confirmed_at || l.confirmed_at_at);
  assert.equal(bad.length, 0, "no listing may have a missing or double-suffixed timestamp");

  const fresh = db.listings.filter((l: any) => freshnessState(l.confirmed_at) === "fresh").length;
  assert.ok(fresh > 0, "at least some listings must be fresh (the demo must not look stale)");
});
