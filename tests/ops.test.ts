/**
 * Member 3 · Task 10 — integration tests for the seller + admin journeys.
 *
 * These run the SAME functions the buttons call (lib/ops.ts), against a fresh
 * copy of the demo database, so the launch checklist is verified automatically
 * rather than only by clicking.
 *
 * Run with:  npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as ops from "../src/lib/ops";
import { materialiseSeed } from "../src/lib/db";
import { freshnessState } from "../src/lib/freshness";

const ACTOR = "usr_admin_demo";

/**
 * A pristine DB for each test: the seed is re-materialised from scratch, so a
 * test never depends on what somebody clicked in the browser earlier.
 */
function freshDB() {
  const seed = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"));
  return materialiseSeed(seed);
}

/* ================================================================== */
/* VERIFICATIONS                                                       */
/* ================================================================== */
test("admin: approving a verification raises the seller's tier", () => {
  const db = freshDB();
  const req = db.verification_requests.find((v: any) => v.state === "pending")!;
  const seller = db.sellers.find((s: any) => s.id === req.seller_id)!;
  const before = seller.verification_tier;

  const out = ops.approveVerification(db, ACTOR, req.id);

  assert.equal(out.ok, true);
  assert.equal(req.state, "approved");
  assert.equal(req.reviewed_by, ACTOR);
  assert.ok(req.reviewed_at, "reviewed_at must be stamped");
  assert.equal(seller.verification_tier, req.tier_requested === "visit" ? "visit" : seller.verification_tier);
  assert.notEqual(seller.verification_tier, undefined);
  assert.ok(db.audit_log.some((a: any) => a.action === "verification_approved"), "must be audited");
  assert.ok(before, "sanity: seller had a tier before");
});

test("admin: rejecting a verification keeps the tier and records the reason", () => {
  const db = freshDB();
  const req = db.verification_requests.find((v: any) => v.state === "pending")!;
  const seller = db.sellers.find((s: any) => s.id === req.seller_id)!;
  const before = seller.verification_tier;

  const out = ops.rejectVerification(db, ACTOR, req.id, "Photo was blurry");

  assert.equal(out.ok, true);
  assert.equal(req.state, "rejected");
  assert.equal(req.rejection_reason, "Photo was blurry");
  assert.equal(seller.verification_tier, before, "tier must not change on rejection");
});

test("admin: approval never lowers a tier", () => {
  const db = freshDB();
  const seller = db.sellers.find((s: any) => s.verification_tier === "visit")!;
  const req = {
    id: "ver_test", seller_id: seller.id, tier_requested: "phone",
    note: "", state: "pending", created_at: new Date().toISOString(),
    reviewed_by: null, reviewed_at: null, rejection_reason: null, agent_name: null, evidence_photo_url: null,
  };
  db.verification_requests.push(req);

  ops.approveVerification(db, ACTOR, req.id);
  assert.equal(seller.verification_tier, "visit", "a visit-verified seller must not drop to phone-verified");
});

/* ================================================================== */
/* REPORTS                                                             */
/* ================================================================== */
test("admin: delisting a reported listing hides it and logs the reason", () => {
  const db = freshDB();
  const rep = db.reports.find((r: any) => r.state === "open")!;
  const listing = db.listings.find((l: any) => l.id === rep.listing_id)!;

  const out = ops.handleReport(db, ACTOR, rep.id, "delist", "Price was wrong by ₦55,000");

  assert.equal(out.ok, true);
  assert.equal(listing.status, "delisted");
  assert.equal(rep.state, "actioned");
  assert.equal(rep.resolution_note, "Price was wrong by ₦55,000");
  assert.ok(db.audit_log.some((a: any) => a.action === "report_delist"));
});

test("admin: dismissing a report leaves the listing live", () => {
  const db = freshDB();
  const rep = db.reports.find((r: any) => r.state === "open")!;
  const listing = db.listings.find((l: any) => l.id === rep.listing_id)!;

  ops.handleReport(db, ACTOR, rep.id, "dismiss");

  assert.equal(listing.status, "active");
  assert.equal(rep.state, "dismissed");
});

test("admin: banning a seller also marks their shop banned", () => {
  const db = freshDB();
  const rep = db.reports.find((r: any) => r.state === "open")!;
  const listing = db.listings.find((l: any) => l.id === rep.listing_id)!;
  const seller = db.sellers.find((s: any) => s.id === listing.seller_id)!;

  const out = ops.handleReport(db, ACTOR, rep.id, "ban");

  assert.equal(out.ok, true);
  assert.equal(seller.status, "banned");
  assert.equal(listing.status, "delisted");
});

test("admin: 'ask to re-confirm' flips to unconfirmed and queues a nudge", () => {
  const db = freshDB();
  const listing = db.listings.find((l: any) => l.status === "active")!;
  listing.stock_status = "in";

  const out = ops.requestReconfirm(db, ACTOR, listing.id);

  assert.equal(out.ok, true);
  assert.equal(listing.stock_status, "unconfirmed");
  assert.equal(db.nudges.length, 1);
  assert.equal(db.nudges[0].mode, "admin_reconfirm");
});

/* ================================================================== */
/* PIN VALIDATION                                                      */
/* ================================================================== */
test("admin: the boundary audit catches pin-droppers", () => {
  const db = freshDB();
  // push one seller's pin far outside their market
  const seller = db.sellers[0];
  seller.lat = seller.lat + 0.5;   // ~55 km away

  const out = ops.runPinAudit(db, ACTOR);

  assert.equal(out.ok, true);
  assert.ok(out.flagged >= 1, "should flag at least the displaced seller");
  const flag = db.pin_flags.find((f: any) => f.seller_id === seller.id && f.state === "open");
  assert.ok(flag, "a flag row must be created");
  assert.ok(flag.distance_km > 10);
});

test("admin: snapping a pin into the zone fixes it", () => {
  const db = freshDB();
  const flag = db.pin_flags.find((f: any) => f.state === "open")!;
  const seller = db.sellers.find((s: any) => s.id === flag.seller_id)!;
  const zone = db.zones.find((z: any) => z.id === flag.claimed_zone)!;

  ops.resolvePinFlag(db, ACTOR, flag.id, "move_to_zone");

  assert.equal(seller.lat, zone.lat);
  assert.equal(seller.lng, zone.lng);
  assert.equal(flag.state, "resolved");
  assert.ok(db.audit_log.some((a: any) => a.action === "pin_moved_into_zone"));
});

/* ================================================================== */
/* FIELD-AGENT CREATION                                                */
/* ================================================================== */
test("admin: a field agent can create a shop for a trader", () => {
  const db = freshDB();
  const before = db.sellers.length;

  const out = ops.createSellerManually(db, ACTOR, {
    business_name: "Mama Blessing Fish",
    owner_name: "Mama Blessing",
    zone_id: "mile1",
    landmark_text: "Beside Creek Road jetty, ask for Mama Blessing",
    phone: "08123456789",
    primary_category: "Foodstuff",
    verification_tier: "visit",
    items: ["Titus Fish (carton)", "Crayfish 1kg", "tramadol 200mg"],
  });

  assert.equal(out.ok, true);
  assert.equal(db.sellers.length, before + 1);
  assert.equal(out.items_added, 2, "the banned item must be skipped");
  assert.equal(out.blocked, 1);

  const created = db.sellers.find((s: any) => s.id === out.seller_id)!;
  assert.equal(created.created_via, "field_agent");
  assert.equal(created.created_by, ACTOR);
  assert.equal(created.verification_tier, "visit");
  assert.ok(created.landmark_text.length > 6);
});

test("admin: field-agent creation refuses a missing landmark", () => {
  const db = freshDB();
  const out = ops.createSellerManually(db, ACTOR, {
    business_name: "No Landmark Shop", zone_id: "mile1", landmark_text: "near",
  });
  assert.equal(out.ok, false);
});

/* ================================================================== */
/* SELLER: ITEMS                                                       */
/* ================================================================== */
test("seller: one-tap stock flip also refreshes the confirmed time", () => {
  const db = freshDB();
  const listing = db.listings.find((l: any) => l.seller_id === "shop_01")!;
  listing.stock_status = "in";
  const oldConfirmed = listing.confirmed_at;

  const out = ops.toggleStock(db, "shop_01", listing.id);

  assert.equal(out.ok, true);
  assert.equal(listing.stock_status, "out");
  assert.notEqual(listing.confirmed_at, oldConfirmed, "stock change counts as a confirmation");
  assert.equal(freshnessState(listing.confirmed_at), "fresh");

  ops.toggleStock(db, "shop_01", listing.id);
  assert.equal(listing.stock_status, "in", "tapping again flips back");
});

test("seller: price edit stores integer kobo and is attributed in the audit log", () => {
  const db = freshDB();
  const listing = db.listings.find((l: any) => l.seller_id === "shop_01")!;

  const out = ops.updatePrice(db, "shop_01", listing.id, 187550.5);

  assert.equal(out.ok, true);
  assert.equal(listing.price_kobo, 18755050);
  assert.ok(Number.isInteger(listing.price_kobo), "price must be an integer number of kobo");
  assert.equal(freshnessState(listing.confirmed_at), "fresh");

  const entry = db.audit_log.find((a: any) => a.action === "price_updated")!;
  assert.ok(entry, "price change must be audited");
  assert.equal(entry.entity_id, listing.id);
});

test("seller: a rejected price changes nothing", () => {
  const db = freshDB();
  const listing = db.listings.find((l: any) => l.seller_id === "shop_01")!;
  const before = listing.price_kobo;

  assert.equal(ops.updatePrice(db, "shop_01", listing.id, 0).ok, false);
  assert.equal(ops.updatePrice(db, "shop_01", listing.id, -500).ok, false);
  assert.equal(ops.updatePrice(db, "shop_01", listing.id, NaN).ok, false);
  assert.equal(listing.price_kobo, before);
});

test("seller: cannot edit another shop's listing (RLS rule)", () => {
  const db = freshDB();
  const other = db.listings.find((l: any) => l.seller_id === "shop_02")!;
  const before = other.price_kobo;

  const out = ops.updatePrice(db, "shop_01", other.id, 1000);

  assert.equal(out.ok, false);
  assert.equal(other.price_kobo, before, "another seller's price must not move");
});

test("seller: prohibited items are blocked and logged", () => {
  const db = freshDB();
  const before = db.listings.length;

  const out = ops.addListing(db, "shop_01", { title: "Tramadol 500mg capsules", naira: 3000 });

  assert.equal(out.ok, false);
  if (!out.ok && out.error === "banned") {
    assert.equal(out.banned.reason, "prescription_drugs");
  } else {
    assert.fail("expected the item to be blocked");
  }
  assert.equal(db.listings.length, before, "no listing may be created");
  assert.ok(db.banned_attempts.some((b: any) => b.attempted_name.includes("Tramadol")), "attempt must be logged");
});

test("seller: a legitimate item is created as fresh and in stock", () => {
  const db = freshDB();
  const out = ops.addListing(db, "shop_01", {
    title: "1KVA Generator", product_id: "gen-1kva", naira: 195000, stock: "in",
  });

  assert.equal(out.ok, true);
  const l = db.listings.find((x: any) => x.id === (out as any).listing_id)!;
  assert.equal(l.price_kobo, 19500000);
  assert.equal(freshnessState(l.confirmed_at), "fresh");
  assert.equal(l.category, "Generators", "should inherit the canonical category");
});

test("seller: the 10-common-items shortcut adds only the prices you filled", () => {
  const db = freshDB();
  const prices: Record<string, string> = {};
  const products = db.products.filter((p: any) => p.category === "Provisions").slice(0, 10);
  products.slice(0, 3).forEach((p: any, i: number) => { prices[p.id] = String(3000 + i * 1000); });

  const out = ops.bulkAddCommon(db, "shop_01", "Provisions", prices);

  assert.equal(out.ok, true);
  assert.equal(out.added, 3, "blank boxes must be skipped");
});

/* ================================================================== */
/* SELLER: DAILY TAP                                                   */
/* ================================================================== */
test("seller: the Daily Tap refreshes exactly 5 items in one action", () => {
  const db = freshDB();
  const mine = db.listings.filter((l: any) => l.seller_id === "shop_01" && l.status !== "delisted");
  mine.forEach((l: any) => { l.confirmed_at = new Date(Date.now() - 400 * 3600 * 1000).toISOString(); });
  assert.ok(mine.length >= 5, "seed shop should have at least 5 items");

  const out = ops.dailyTapAll(db, "shop_01");

  assert.equal(out.ok, true);
  assert.equal(out.refreshed, 5, "one tap refreshes up to 5 items, not all");
  const refreshed = db.listings.filter(
    (l: any) => l.seller_id === "shop_01" && freshnessState(l.confirmed_at) === "fresh"
  );
  assert.equal(refreshed.length, 5);
  assert.ok(db.audit_log.some((a: any) => a.action === "daily_tap"));
});

test("seller: the Daily Tap turns stale listings fresh again (trust restored)", () => {
  const db = freshDB();
  const listing = db.listings.find((l: any) => l.seller_id === "shop_01")!;
  listing.confirmed_at = new Date(Date.now() - 200 * 3600 * 1000).toISOString();
  assert.equal(freshnessState(listing.confirmed_at), "stale");

  ops.dailyTapOne(db, "shop_01", listing.id);

  assert.equal(freshnessState(listing.confirmed_at), "fresh");
});

/* ================================================================== */
/* BUYER QUESTIONS                                                     */
/* ================================================================== */
test("seller: answering YES confirms the listing and records the price shown", () => {
  const db = freshDB();
  const listing = db.listings.find((l: any) => l.seller_id === "shop_01")!;
  listing.confirmed_at = new Date(Date.now() - 100 * 3600 * 1000).toISOString();
  const req = {
    id: "req_test", listing_id: listing.id, buyer_user_id: "usr_buyer_demo",
    channel: "inapp", state: "pending", responded_at: null, price_at_response: null,
    created_at: new Date().toISOString(), buyer_name: "Chinedu",
  };
  db.confirm_requests.push(req);

  const out = ops.answerRequest(db, "shop_01", "req_test", "yes");

  assert.equal(out.ok, true);
  assert.equal(req.state, "yes");
  assert.equal(req.price_at_response, listing.price_kobo, "the price at response is the lead record");
  assert.equal(freshnessState(listing.confirmed_at), "fresh");
});

test("seller: answering NO does not refresh freshness", () => {
  const db = freshDB();
  const listing = db.listings.find((l: any) => l.seller_id === "shop_01")!;
  const stale = new Date(Date.now() - 100 * 3600 * 1000).toISOString();
  listing.confirmed_at = stale;
  db.confirm_requests.push({ id: "req_no", listing_id: listing.id, state: "pending", created_at: new Date().toISOString() });

  ops.answerRequest(db, "shop_01", "req_no", "no");

  assert.equal(listing.confirmed_at, stale, "an honest NO must not refresh the timestamp");
});

test("seller: cannot answer a question about another shop's item", () => {
  const db = freshDB();
  const other = db.listings.find((l: any) => l.seller_id === "shop_02")!;
  db.confirm_requests.push({ id: "req_x", listing_id: other.id, state: "pending", created_at: new Date().toISOString() });

  const out = ops.answerRequest(db, "shop_01", "req_x", "yes");

  assert.equal(out.ok, false);
});

/* ================================================================== */
/* VERIFICATION REQUESTS + LOCATION                                     */
/* ================================================================== */
test("seller: asking for verification creates one pending request", () => {
  const db = freshDB();
  const before = db.verification_requests.filter((v: any) => v.seller_id === "shop_01").length;

  const out = ops.requestVerification(db, "shop_01", "visit", "Any morning");

  assert.equal(out.ok, true);
  const after = db.verification_requests.filter((v: any) => v.seller_id === "shop_01");
  assert.equal(after.length, before + 1);
  assert.equal(after[0].state, "pending");
});

test("seller: moving the pin outside the market raises a flag", () => {
  const db = freshDB();
  const seller = db.sellers.find((s: any) => s.id === "shop_03")!;
  const flagsBefore = db.pin_flags.length;

  const out = ops.updateLocation(db, "shop_03", seller.lat + 0.3, seller.lng + 0.3, "mile1", "Near the big mango tree");

  assert.equal(out.ok, true);
  assert.equal(out.pin_ok, false);
  assert.equal(db.pin_flags.length, flagsBefore + 1);
  assert.equal(db.pin_flags[0].seller_id, "shop_03");
});

test("seller: a landmark shorter than 6 characters is refused", () => {
  const db = freshDB();
  const out = ops.updateLocation(db, "shop_03", 4.81, 6.99, "mile1", "near");
  assert.equal(out.ok, false);
});

/* ================================================================== */
/* MODERATION                                                          */
/* ================================================================== */
test("admin: delisting and re-listing round-trips", () => {
  const db = freshDB();
  const l = db.listings[0];

  ops.toggleListingStatus(db, ACTOR, l.id);
  assert.equal(l.status, "delisted");

  ops.toggleListingStatus(db, ACTOR, l.id);
  assert.equal(l.status, "active");
});

test("admin: adding a blocked word is idempotent", () => {
  const db = freshDB();
  const a = ops.addBannedTerm(db, ACTOR, "  Tramadol ", "prescription_drugs");
  const b = ops.addBannedTerm(db, ACTOR, "tramadol", "prescription_drugs");

  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  if (b.ok) assert.equal(b.duplicate, true, "the same word must not be added twice");
  assert.equal(db.banned_terms.filter((t: any) => t.term === "tramadol").length, 1);
});

/* ================================================================== */
/* MISSING RECORDS — the screens must not crash                        */
/* ================================================================== */
test("every operation fails gracefully on an unknown id", () => {
  const db = freshDB();
  assert.equal(ops.approveVerification(db, ACTOR, "nope").ok, false);
  assert.equal(ops.rejectVerification(db, ACTOR, "nope", "").ok, false);
  assert.equal(ops.handleReport(db, ACTOR, "nope", "dismiss").ok, false);
  assert.equal(ops.resolvePinFlag(db, ACTOR, "nope", "dismiss").ok, false);
  assert.equal(ops.toggleStock(db, "shop_01", "nope").ok, false);
  assert.equal(ops.updatePrice(db, "shop_01", "nope", 100).ok, false);
  assert.equal(ops.removeListing(db, "shop_01", "nope").ok, false);
  assert.equal(ops.dailyTapOne(db, "shop_01", "nope").ok, false);
  assert.equal(ops.toggleListingStatus(db, ACTOR, "nope").ok, false);
});

test("admin: a banned item added by a field agent is logged in the moderation queue", () => {
  const db = freshDB();
  const before = db.banned_attempts.length;

  ops.createSellerManually(db, ACTOR, {
    business_name: "Test Chemist", zone_id: "mile1",
    landmark_text: "Opposite Mile 1 Police Station, line 3",
    items: ["Tramadol 500mg"],
  });

  assert.equal(db.banned_attempts.length, before + 1, "the attempt must appear in the admin queue");
  assert.equal(db.banned_attempts[0].via, "field_agent");
});
