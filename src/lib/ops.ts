/**
 * Business operations — the logic behind every admin / seller button.
 *
 * These are pure functions over the demo DB: no cookies, no Next.js. The Server
 * Actions in app/seller/actions.ts and app/admin/actions.ts are thin wrappers
 * that handle auth + persistence and then call in here.
 *
 * That separation is deliberate — it means the launch checklist can be tested
 * automatically (tests/ops.test.ts) instead of only by clicking.
 */
import { id, nowISO, audit, trackEvent } from "./db";
import { checkBanned } from "./moderation";
import { validatePin, pointInPolygon } from "./geo";

const TIER_RANK: Record<string, number> = { unverified: 0, phone: 1, id: 2, visit: 3 };

/* ================================================================== */
/* VERIFICATIONS                                                       */
/* ================================================================== */
export function approveVerification(db: any, actorId: string, requestId: string) {
  const req = (db.verification_requests || []).find((v: any) => v.id === requestId);
  if (!req) return { ok: false as const, error: "not_found" };

  req.state = "approved";
  req.reviewed_by = actorId;
  req.reviewed_at = nowISO();
  req.rejection_reason = null;

  const seller = db.sellers.find((s: any) => s.id === req.seller_id);
  let tier_raised = false;
  if (seller && (TIER_RANK[req.tier_requested] ?? 0) > (TIER_RANK[seller.verification_tier] ?? 0)) {
    seller.verification_tier = req.tier_requested;
    tier_raised = true;
  }
  audit(db, actorId, "verification", req.id, "verification_approved", { state: "pending" }, { state: "approved", tier: seller?.verification_tier });
  trackEvent(db, "verification_reviewed", { request_id: req.id, decision: "approve" });
  return { ok: true as const, seller, tier_raised };
}

export function rejectVerification(db: any, actorId: string, requestId: string, reason: string) {
  const req = (db.verification_requests || []).find((v: any) => v.id === requestId);
  if (!req) return { ok: false as const, error: "not_found" };

  req.state = "rejected";
  req.reviewed_by = actorId;
  req.reviewed_at = nowISO();
  req.rejection_reason = reason || "Evidence was not clear enough.";
  audit(db, actorId, "verification", req.id, "verification_rejected", { state: "pending" }, { state: "rejected", reason: req.rejection_reason });
  trackEvent(db, "verification_reviewed", { request_id: req.id, decision: "reject" });
  return { ok: true as const };
}

/* ================================================================== */
/* REPORTS                                                             */
/* ================================================================== */
export type ReportAction = "dismiss" | "warn" | "delist" | "ban";

export function handleReport(db: any, actorId: string, reportId: string, action: ReportAction, note = "") {
  const rep = (db.reports || []).find((r: any) => r.id === reportId);
  if (!rep) return { ok: false as const, error: "not_found" };

  rep.state = action === "dismiss" ? "dismissed" : "actioned";
  rep.handled_by = actorId;
  rep.handled_at = nowISO();
  rep.resolution_note = note || {
    dismiss: "No action needed.",
    warn: "Seller warned.",
    delist: "Listing removed.",
    ban: "Seller blocked.",
  }[action];

  const listing = db.listings.find((l: any) => l.id === rep.listing_id);
  let seller_banned = false;

  if (listing) {
    if (action === "delist" || action === "ban") {
      listing.status = "delisted";
    } else if (action === "warn") {
      listing.report_count = (listing.report_count || 0) + 1;
    }
    if (action === "ban") {
      const seller = db.sellers.find((s: any) => s.id === listing.seller_id);
      if (seller) { seller.status = "banned"; seller_banned = true; }
    }
  }
  audit(db, actorId, "report", rep.id, `report_${action}`, { state: "open" }, { state: rep.state, note: rep.resolution_note });
  return { ok: true as const, seller_banned };
}

/** "Ask to re-confirm" — verify, don't punish (PRD US-3.2). */
export function requestReconfirm(db: any, actorId: string, listingId: string) {
  const listing = db.listings.find((l: any) => l.id === listingId);
  if (!listing) return { ok: false as const };

  const before = listing.stock_status;
  listing.stock_status = "unconfirmed";
  db.nudges = db.nudges || [];
  db.nudges.unshift({
    id: id("ndg"), seller_id: listing.seller_id, channel: "whatsapp",
    sent_at: nowISO(), items: [listing.id], opened_at: null, responded_at: null,
    mode: "admin_reconfirm",
  });
  audit(db, actorId, "listing", listing.id, "reconfirm_requested", { stock_status: before }, { stock_status: "unconfirmed" });
  return { ok: true as const, nudge_sent: true };
}

/* ================================================================== */
/* PIN VALIDATION                                                      */
/* ================================================================== */
export function resolvePinFlag(db: any, actorId: string, flagId: string, decision: "dismiss" | "keep" | "move_to_zone") {
  const flag = (db.pin_flags || []).find((p: any) => p.id === flagId);
  if (!flag) return { ok: false as const };

  flag.state = decision === "dismiss" ? "dismissed" : "resolved";
  flag.resolution = decision;

  if (decision === "move_to_zone") {
    const zone = db.zones.find((z: any) => z.id === flag.claimed_zone);
    const seller = db.sellers.find((s: any) => s.id === flag.seller_id);
    if (zone && seller) {
      const before = { lat: seller.lat, lng: seller.lng };
      seller.lat = zone.lat;
      seller.lng = zone.lng;
      seller.zone_id = zone.id;
      audit(db, actorId, "seller", seller.id, "pin_moved_into_zone", before, { lat: zone.lat, lng: zone.lng });
    }
  }
  audit(db, actorId, "pin_flag", flag.id, `pin_flag_${flag.state}`, { state: "open" }, { state: flag.state, resolution: decision });
  return { ok: true as const };
}

/** Boundary audit across every shop. Returns how many pins are outside. */
export function runPinAudit(db: any, actorId: string) {
  let flagged = 0;
  for (const seller of db.sellers) {
    const zone = db.zones.find((z: any) => z.id === seller.zone_id);
    if (!zone) continue;
    const inside = pointInPolygon({ lat: seller.lat, lng: seller.lng }, zone.boundary);
    if (inside) continue;

    flagged++;
    const already = (db.pin_flags || []).some((f: any) => f.seller_id === seller.id && f.state === "open");
    if (already) continue;

    const check = validatePin({ lat: seller.lat, lng: seller.lng }, seller.zone_id, db.zones);
    db.pin_flags = db.pin_flags || [];
    db.pin_flags.unshift({
      id: id("pin"), seller_id: seller.id, claimed_zone: seller.zone_id,
      distance_km: check.ok ? 0 : check.distance_km,
      lat: seller.lat, lng: seller.lng,
      note: `Pin audit: pin is outside the ${zone.name} boundary.`,
      state: "open", created_at: nowISO(),
    });
  }
  audit(db, actorId, "zone", "all", "pin_audit_run", null, { flagged });
  return { ok: true as const, flagged };
}

/* ================================================================== */
/* FIELD-AGENT SELLER CREATION                                         */
/* ================================================================== */
export function createSellerManually(
  db: any,
  actorId: string,
  input: {
    business_name: string; owner_name?: string; zone_id: string; landmark_text: string;
    phone?: string; primary_category?: string; seller_type?: string;
    verification_tier?: string; items?: string[];
  }
) {
  const zone = db.zones.find((z: any) => z.id === input.zone_id);
  if (!zone) return { ok: false as const, error: "unknown_zone" };
  if (!input.business_name?.trim() || (input.landmark_text || "").trim().length < 6) {
    return { ok: false as const, error: "missing_fields" };
  }

  const slugBase = input.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let slug = slugBase, n = 2;
  while (db.sellers.some((s: any) => s.slug === slug)) slug = `${slugBase}-${n++}`;

  const userId = id("usr");
  db.users.push({ id: userId, phone: input.phone || null, role: "seller", name: input.owner_name || input.business_name, created_at: nowISO() });

  const sellerId = id("shp");
  db.sellers.push({
    id: sellerId, user_id: userId,
    business_name: input.business_name.trim(), slug,
    seller_type: input.seller_type || "stall",
    primary_category: input.primary_category || "Provisions",
    zone_id: zone.id,
    lat: zone.lat, lng: zone.lng,
    landmark_text: input.landmark_text.trim(),
    whatsapp_number: input.phone || null, phone: input.phone || null,
    hours: { mon: "8:00-18:00", tue: "8:00-18:00", wed: "8:00-18:00", thu: "8:00-18:00", fri: "8:00-18:00", sat: "8:00-16:00", sun: "closed" },
    verification_tier: input.verification_tier || "visit",
    accuracy_score: 0.8, response_rate: 0.6, view_count_30d: 0,
    status: "active", created_at: nowISO(), last_nudge_at: null,
    owner_name: input.owner_name || input.business_name,
    created_via: "field_agent", created_by: actorId,
  });

  let items_added = 0;
  let blocked = 0;
  for (const title of (input.items || []).slice(0, 20)) {
    if (!title?.trim()) continue;
    const banned = checkBanned(title);
    if (banned) {
      blocked++;
      db.banned_attempts = db.banned_attempts || [];
      db.banned_attempts.unshift({
        id: id("ban"), seller_id: sellerId, attempted_name: title,
        reason: banned.reason, raw_input: title, state: "blocked",
        created_at: nowISO(), via: "field_agent",
      });
      continue;
    }
    const product = db.products.find((p: any) => p.canonical_name.toLowerCase() === title.trim().toLowerCase());
    db.listings.push({
      id: id("lst"), seller_id: sellerId, product_id: product?.id ?? null,
      title_as_listed: title.trim(), category: product?.category ?? (input.primary_category || "Provisions"),
      price_kobo: product?.typical_price_kobo ?? 0,
      price_negotiable: false, unit: product?.unit ?? "each", stock_status: "unconfirmed",
      condition: "new", photo_url: null, confirmed_at: nowISO(),
      evidence: "agent", status: "active", views_7d: 0, report_count: 0, created_at: nowISO(),
    });
    items_added++;
  }

  audit(db, actorId, "seller", sellerId, "seller_created_by_agent", null, { name: input.business_name, zone_id: zone.id, items: items_added });
  trackEvent(db, "seller_onboarded", { seller_id: sellerId, via: "field_agent" });
  return { ok: true as const, seller_id: sellerId, slug, items_added, blocked };
}

/* ================================================================== */
/* LISTINGS — seller side                                              */
/* ================================================================== */
export function toggleStock(db: any, sellerId: string, listingId: string) {
  const l = db.listings.find((x: any) => x.id === listingId && x.seller_id === sellerId);
  if (!l) return { ok: false as const };

  const before = l.stock_status;
  l.stock_status = before === "in" || before === "low" ? "out" : "in";
  l.confirmed_at = nowISO();   // touching stock is a freshness confirmation
  const seller = db.sellers.find((s: any) => s.id === sellerId);
  audit(db, seller?.user_id ?? null, "listing", l.id, "stock_changed", { stock_status: before }, { stock_status: l.stock_status });
  trackEvent(db, "stock_changed", { seller_id: sellerId, listing_id: l.id });
  return { ok: true as const, stock_status: l.stock_status };
}

export function updatePrice(db: any, sellerId: string, listingId: string, naira: number) {
  if (!Number.isFinite(naira) || naira <= 0) return { ok: false as const, error: "invalid_price" };
  const l = db.listings.find((x: any) => x.id === listingId && x.seller_id === sellerId);
  if (!l) return { ok: false as const, error: "not_found" };

  const before = l.price_kobo;
  l.price_kobo = Math.round(naira * 100);       // integer kobo, never floats
  l.confirmed_at = nowISO();
  const seller = db.sellers.find((s: any) => s.id === sellerId);
  audit(db, seller?.user_id ?? null, "listing", l.id, "price_updated", { price_kobo: before }, { price_kobo: l.price_kobo });
  trackEvent(db, "price_updated", { seller_id: sellerId, listing_id: l.id, from: before, to: l.price_kobo });
  return { ok: true as const, price_kobo: l.price_kobo };
}

export function removeListing(db: any, sellerId: string, listingId: string) {
  const l = db.listings.find((x: any) => x.id === listingId && x.seller_id === sellerId);
  if (!l) return { ok: false as const };
  l.status = "delisted";                       // never hard-deleted (PRD §11)
  const seller = db.sellers.find((s: any) => s.id === sellerId);
  audit(db, seller?.user_id ?? null, "listing", l.id, "delisted", { status: "active" }, { status: "delisted" });
  return { ok: true as const };
}

export type AddListingResult =
  | { ok: true; listing_id: string }
  | { ok: false; error: "invalid" }
  | { ok: false; error: "banned"; banned: { term: string; reason: string; label: string } };

export function addListing(db: any, sellerId: string, input: { title: string; product_id?: string | null; naira: number; stock?: string }): AddListingResult {
  const title = (input.title || "").trim();
  if (!title || !Number.isFinite(input.naira) || input.naira <= 0) {
    return { ok: false as const, error: "invalid" };
  }
  const banned = checkBanned(title);
  if (banned) {
    db.banned_attempts = db.banned_attempts || [];
    db.banned_attempts.unshift({
      id: id("ban"), seller_id: sellerId, attempted_name: title,
      reason: banned.reason, raw_input: title, state: "blocked", created_at: nowISO(),
    });
    return { ok: false as const, error: "banned", banned };
  }

  const seller = db.sellers.find((s: any) => s.id === sellerId);
  const product = input.product_id ? db.products.find((p: any) => p.id === input.product_id) : null;
  const listingId = id("lst");
  db.listings.push({
    id: listingId, seller_id: sellerId, product_id: product?.id ?? null,
    title_as_listed: title, category: product?.category ?? seller?.primary_category ?? "Other",
    price_kobo: Math.round(input.naira * 100), price_negotiable: false, unit: product?.unit ?? "each",
    stock_status: input.stock || "in", condition: "new", photo_url: null,
    confirmed_at: nowISO(), evidence: "self", status: "active",
    views_7d: 0, report_count: 0, created_at: nowISO(),
  });
  audit(db, seller?.user_id ?? null, "listing", listingId, "listing_created", null, { title, price_kobo: Math.round(input.naira * 100) });
  trackEvent(db, "listing_created", { seller_id: sellerId, title });
  return { ok: true as const, listing_id: listingId };
}

/** Task 4 — the "10 common items" template, prices only. */
export function bulkAddCommon(db: any, sellerId: string, category: string, prices: Record<string, string | number>) {
  const picks = db.products.filter((p: any) => p.category === category).slice(0, 10);
  let added = 0;
  for (const p of picks) {
    const raw = String(prices[p.id] ?? "").replace(/[₦,\s]/g, "");
    if (!raw) continue;
    const naira = Number(raw);
    if (!Number.isFinite(naira) || naira <= 0) continue;
    db.listings.push({
      id: id("lst"), seller_id: sellerId, product_id: p.id,
      title_as_listed: p.canonical_name, category: p.category,
      price_kobo: Math.round(naira * 100), price_negotiable: false, unit: p.unit,
      stock_status: "in", condition: "new", photo_url: null,
      confirmed_at: nowISO(), evidence: "self", status: "active",
      views_7d: 0, report_count: 0, created_at: nowISO(),
    });
    added++;
  }
  const seller = db.sellers.find((s: any) => s.id === sellerId);
  audit(db, seller?.user_id ?? null, "seller", sellerId, "bulk_items_added", null, { category, added });
  return { ok: true as const, added };
}

/* ================================================================== */
/* THE DAILY TAP                                                       */
/* ================================================================== */
export function dailyTapAll(db: any, sellerId: string) {
  const mine = db.listings
    .filter((l: any) => l.seller_id === sellerId && l.status !== "delisted")
    .sort((a: any, b: any) => new Date(b.confirmed_at || 0).getTime() - new Date(a.confirmed_at || 0).getTime())
    .slice(0, 5);

  const now = nowISO();
  for (const l of mine) { l.confirmed_at = now; l.evidence = "self"; }
  const s = db.sellers.find((x: any) => x.id === sellerId);
  if (s) s.last_nudge_at = now;

  trackEvent(db, "nudge_responded", { seller_id: sellerId, refreshed: mine.length, mode: "all" });
  audit(db, s?.user_id ?? null, "seller", sellerId, "daily_tap", null, { refreshed: mine.length });
  return { ok: true as const, refreshed: mine.length };
}

export function dailyTapOne(db: any, sellerId: string, listingId: string) {
  const l = db.listings.find((x: any) => x.id === listingId && x.seller_id === sellerId);
  if (!l) return { ok: false as const };
  l.confirmed_at = nowISO();
  l.evidence = "self";
  trackEvent(db, "nudge_responded", { seller_id: sellerId, listing_id: listingId, mode: "single" });
  return { ok: true as const };
}

/* ================================================================== */
/* BUYER QUESTIONS                                                     */
/* ================================================================== */
export function answerRequest(db: any, sellerId: string, requestId: string, answer: "yes" | "no") {
  const r = (db.confirm_requests || []).find((x: any) => x.id === requestId);
  if (!r) return { ok: false as const, error: "not_found" };

  const listing = db.listings.find((l: any) => l.id === r.listing_id);
  if (!listing || listing.seller_id !== sellerId) return { ok: false as const, error: "forbidden" };

  r.state = answer;
  r.responded_at = nowISO();
  r.price_at_response = listing.price_kobo;
  if (answer === "yes") { listing.confirmed_at = nowISO(); listing.evidence = "self"; }
  trackEvent(db, "confirm_responded", { seller_id: sellerId, request_id: r.id, answer });
  return { ok: true as const };
}

/* ================================================================== */
/* VERIFICATION REQUESTS + LOCATION                                    */
/* ================================================================== */
export function requestVerification(db: any, sellerId: string, tier: string, note: string) {
  db.verification_requests = db.verification_requests || [];
  const req = {
    id: id("ver"), seller_id: sellerId, tier_requested: tier,
    note: note || (tier === "visit" ? "Requested a field visit." : "Uploaded ID for review."),
    evidence_photo_url: null, agent_name: null, state: "pending",
    created_at: nowISO(), reviewed_by: null, reviewed_at: null, rejection_reason: null,
  };
  db.verification_requests.unshift(req);
  trackEvent(db, "verification_requested", { seller_id: sellerId, tier });
  return { ok: true as const, request_id: req.id };
}

export function updateLocation(db: any, sellerId: string, lat: number, lng: number, zoneId: string, landmark: string) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (landmark || "").trim().length < 6) {
    return { ok: false as const, error: "invalid" };
  }
  const s = db.sellers.find((x: any) => x.id === sellerId);
  if (!s) return { ok: false as const, error: "not_found" };

  const before = { lat: s.lat, lng: s.lng, zone_id: s.zone_id, landmark_text: s.landmark_text };
  s.lat = lat; s.lng = lng; s.zone_id = zoneId; s.landmark_text = landmark.trim();

  const check = validatePin({ lat, lng }, zoneId, db.zones);
  if (!check.ok) {
    db.pin_flags = db.pin_flags || [];
    db.pin_flags.unshift({
      id: id("pin"), seller_id: s.id, claimed_zone: zoneId,
      distance_km: check.distance_km, lat, lng,
      note: `Seller moved their pin ${check.distance_km} km outside the ${zoneId} boundary.`,
      state: "open", created_at: nowISO(),
    });
  }
  audit(db, s.user_id, "seller", s.id, "location_updated", before, { lat, lng, zone_id: zoneId, landmark_text: landmark });
  return { ok: true as const, pin_ok: check.ok };
}

/* ================================================================== */
/* MODERATION                                                          */
/* ================================================================== */
export function toggleListingStatus(db: any, actorId: string, listingId: string) {
  const l = db.listings.find((x: any) => x.id === listingId);
  if (!l) return { ok: false as const };
  const before = l.status;
  l.status = before === "delisted" ? "active" : "delisted";
  audit(db, actorId, "listing", l.id, "moderation_status", { status: before }, { status: l.status });
  return { ok: true as const, status: l.status };
}

/**
 * Delists or restores an entire Seller/Customer account & all of their storefront visibility
 * immediately across Buyer Home, Search, Shop pages, Item pages, and Market Data.
 */
export function toggleSellerStatus(db: any, actorId: string, sellerId: string) {
  const s = (db.sellers || []).find((x: any) => x.id === sellerId);
  if (!s) return { ok: false as const };
  const before = s.status || "active";
  const next = before === "active" ? "delisted" : "active";
  s.status = next;

  // Also sync linked customer user status if present
  if (s.user_id) {
    const user = (db.users || []).find((u: any) => u.id === s.user_id);
    if (user) {
      user.status = next;
    }
    if (next !== "active") {
      db.user_sessions = (db.user_sessions || []).filter(
        (sess: any) => sess.user_id !== s.user_id
      );
    }
  }

  audit(
    db,
    actorId,
    "seller",
    s.id,
    next === "delisted" ? "seller_delisted" : "seller_restored",
    { status: before },
    { status: next }
  );
  trackEvent(db, next === "delisted" ? "seller_delisted" : "seller_restored", {
    seller_id: s.id,
  });
  return { ok: true as const, status: next };
}

export function addBannedTerm(db: any, actorId: string, term: string, reason: string) {
  const t = (term || "").trim().toLowerCase();
  if (!t) return { ok: false as const, error: "empty" };
  db.banned_terms = db.banned_terms || [];
  if (db.banned_terms.some((b: any) => b.term === t)) return { ok: true as const, duplicate: true };
  db.banned_terms.push({ term: t, reason, label: reason.replace(/_/g, " ") });
  audit(db, actorId, "banned_term", t, "banned_term_added");
  return { ok: true as const, duplicate: false };
}
