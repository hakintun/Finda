import { id, nowISO, audit, trackEvent } from "./db";
import { toE164 } from "./freshness";
import type {
  StockStatus as UiStockStatus,
  VerificationTier as UiVerificationTier,
} from "./types";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Maps DB stock values ("in" | "low" | "out" | "unconfirmed") to UI StockStatus.
 */
export function mapDbStockToUi(raw: string | null | undefined): UiStockStatus {
  switch (raw) {
    case "in":
    case "in_stock":
      return "in_stock";
    case "low":
    case "low_stock":
      return "low_stock";
    case "out":
    case "out_of_stock":
      return "out_of_stock";
    default:
      return "unconfirmed";
  }
}

/**
 * Maps DB verification_tier ("none"|"phone"|"id"|"visit") to UI VerificationTier.
 */
export function mapDbTierToUi(
  raw: string | null | undefined
): UiVerificationTier {
  switch (raw) {
    case "visit":
    case "physically_verified":
      return "visit";
    case "id":
    case "rep_verified":
      return "id";
    case "phone":
    case "phone_verified":
      return "phone";
    default:
      return "unverified";
  }
}

/**
 * Logs buyer searches (especially zero-result queries) for Admin Freshness Dashboard (US-8.3).
 */
export function logSearchQuery(
  db: any,
  rawQuery: string,
  cluster: string,
  resultCount: number
) {
  const q = (rawQuery || "").trim();
  if (!q) return;
  db.search_queries = db.search_queries || [];
  db.search_queries.unshift({
    id: id("sq"),
    raw_query: q,
    cluster: cluster || "Port Harcourt",
    result_count: resultCount,
    created_at: nowISO(),
  });
  db.search_queries = db.search_queries.slice(0, 500);
  trackEvent(db, "search_submitted", {
    raw_query: q,
    cluster,
    result_count: resultCount,
  });
}

/**
 * Creates a real "Confirm for me" availability request (PRD US-4.1).
 * Appears immediately in the Seller Console under "Buyers waiting for an answer".
 */
export function createConfirmRequest(
  db: any,
  input: {
    listingId: string;
    buyerName?: string;
    buyerPhone?: string;
    channel?: "in_app" | "whatsapp";
  }
) {
  const listing = (db.listings || []).find(
    (l: any) => l.id === input.listingId && l.status !== "delisted"
  );
  if (!listing) {
    return { ok: false as const, error: "listing_not_found" };
  }

  const normalizedPhone = input.buyerPhone ? toE164(input.buyerPhone) : null;
  const reqId = id("req");
  const record = {
    id: reqId,
    listing_id: listing.id,
    buyer_user_id: normalizedPhone ? `buyer_${normalizedPhone}` : "usr_buyer_anon",
    buyer_name: (input.buyerName || "").trim() || "A nearby buyer",
    buyer_phone: normalizedPhone,
    channel: input.channel || "in_app",
    state: "pending",
    created_at: nowISO(),
    responded_at: null,
    price_at_response: null,
  };

  db.confirm_requests = db.confirm_requests || [];
  db.confirm_requests.unshift(record);
  listing.views_7d = (listing.views_7d || 0) + 1;

  trackEvent(db, "confirm_requested", {
    request_id: reqId,
    listing_id: listing.id,
    seller_id: listing.seller_id,
    channel: record.channel,
  });

  return { ok: true as const, request: record, listing };
}

/**
 * Files a buyer "Tell sellers what you need" demand post on zero-result searches (US-1.1).
 */
export function submitDemandPost(
  db: any,
  input: { rawText: string; cluster?: string; buyerPhone?: string }
) {
  const text = (input.rawText || "").trim();
  if (text.length < 3) {
    return { ok: false as const, error: "too_short" };
  }
  const item = {
    id: id("dmd"),
    raw_text: text.slice(0, 240),
    cluster: input.cluster || "Port Harcourt",
    buyer_phone: input.buyerPhone ? toE164(input.buyerPhone) : null,
    created_at: nowISO(),
  };
  db.demand_posts = db.demand_posts || [];
  db.demand_posts.unshift(item);
  trackEvent(db, "demand_posted", { id: item.id, cluster: item.cluster });
  return { ok: true as const, demand: item };
}

/**
 * Files a <=2-tap buyer abuse/accuracy report into the Admin Report Queue (US-3.3, US-6.2).
 */
export function submitBuyerReport(
  db: any,
  input: {
    listingId: string;
    reason: string;
    note?: string;
    reporter?: string;
  }
) {
  const listing = (db.listings || []).find((l: any) => l.id === input.listingId);
  if (!listing) {
    return { ok: false as const, error: "listing_not_found" };
  }
  const allowedReasons = new Set([
    "wrong_price",
    "not_available",
    "wrong_location",
    "counterfeit",
    "banned",
    "other",
  ]);
  const reason = allowedReasons.has(input.reason) ? input.reason : "other";
  const rep = {
    id: id("rep"),
    listing_id: listing.id,
    reason,
    note:
      (input.note || "").trim() ||
      `Buyer flagged listing as ${reason.replace(/_/g, " ")}.`,
    reporter: input.reporter || "usr_buyer_web",
    state: "open",
    created_at: nowISO(),
    handled_by: null,
    handled_at: null,
    resolution_note: null,
  };

  db.reports = db.reports || [];
  db.reports.unshift(rep);
  listing.report_count = (listing.report_count || 0) + 1;
  trackEvent(db, "report_submitted", {
    report_id: rep.id,
    listing_id: listing.id,
    reason,
  });

  return { ok: true as const, report: rep };
}

/**
 * Records buyer trip outcome ("Did you find it?") and enforces the 3-Strike
 * Accuracy Auto-Demotion rule (PRD US-3.2):
 * 3 distinct `not_available` reports in 7 days -> flips listing to `unconfirmed`.
 */
export function submitAccuracyFeedback(
  db: any,
  input: {
    listingId: string;
    verdict: "got_it" | "different_price" | "not_available" | "didnt_go";
    buyerKey: string;
  }
) {
  const listing = (db.listings || []).find((l: any) => l.id === input.listingId);
  if (!listing) {
    return { ok: false as const, error: "listing_not_found" };
  }

  const key = (input.buyerKey || "").trim() || id("anon");
  db.accuracy_reports = db.accuracy_reports || [];

  // Deduplicate per buyerKey + listingId + verdict within 24h
  const now = Date.now();
  const duplicate = db.accuracy_reports.find(
    (r: any) =>
      r.listing_id === listing.id &&
      r.buyer_key === key &&
      now - new Date(r.created_at).getTime() < DAY_MS
  );
  if (duplicate) {
    duplicate.verdict = input.verdict;
  } else {
    db.accuracy_reports.unshift({
      id: id("acc"),
      listing_id: listing.id,
      buyer_key: key,
      verdict: input.verdict,
      created_at: nowISO(),
    });
  }

  const seller = (db.sellers || []).find((s: any) => s.id === listing.seller_id);

  if (input.verdict === "got_it") {
    trackEvent(db, "got_it_reported", {
      listing_id: listing.id,
      seller_id: listing.seller_id,
    });
    if (seller) {
      seller.accuracy_score = Math.min(
        1,
        Number(((seller.accuracy_score ?? 0.85) + 0.02).toFixed(2))
      );
    }
    return { ok: true as const, demoted: false, strikes: 0 };
  }

  // Count distinct buyers reporting `not_available` on this listing in last 7 days
  const recentStrikes = new Set(
    db.accuracy_reports
      .filter(
        (r: any) =>
          r.listing_id === listing.id &&
          r.verdict === "not_available" &&
          now - new Date(r.created_at).getTime() <= 7 * DAY_MS
      )
      .map((r: any) => r.buyer_key)
  );

  let demoted = false;
  if (recentStrikes.size >= 3 && listing.stock_status !== "unconfirmed") {
    const prev = listing.stock_status;
    listing.stock_status = "unconfirmed";
    demoted = true;
    if (seller) {
      seller.accuracy_score = Math.max(
        0.2,
        Number(((seller.accuracy_score ?? 0.85) - 0.15).toFixed(2))
      );
    }
    audit(
      db,
      "system_3strike",
      "listing",
      listing.id,
      "auto_demoted_3_strikes",
      { stock_status: prev },
      { stock_status: "unconfirmed", strikes: recentStrikes.size }
    );
  }

  if (input.verdict === "not_available") {
    trackEvent(db, "not_available_reported", {
      listing_id: listing.id,
      strikes: recentStrikes.size,
      demoted,
    });
  }

  return { ok: true as const, demoted, strikes: recentStrikes.size };
}

/**
 * Server-side protected phone reveal with anti-scraping rate limit (PRD US-4.2: max 15/hr/client).
 */
export function revealSellerPhone(
  db: any,
  input: { sellerId: string; listingId?: string | null; clientKey: string }
) {
  const seller = (db.sellers || []).find(
    (s: any) => s.id === input.sellerId && s.status === "active"
  );
  if (!seller) {
    return { ok: false as const, error: "seller_not_found", status: 404 };
  }

  const now = Date.now();
  const key = input.clientKey || "anon";
  const recentReveals = (db.events || []).filter(
    (e: any) =>
      e.name === "contact_revealed" &&
      e.client_key === key &&
      now - new Date(e.created_at).getTime() < HOUR_MS
  );

  if (recentReveals.length >= 15) {
    return {
      ok: false as const,
      error: "rate_limited",
      status: 429,
      message:
        "Too many phone numbers revealed this hour (limit: 15/hr). Please wait a bit.",
    };
  }

  const rawPhone = seller.phone || seller.whatsapp_number || "";
  const e164 = toE164(rawPhone) || rawPhone;
  if (!e164) {
    return { ok: false as const, error: "no_phone", status: 404 };
  }

  trackEvent(db, "contact_revealed", {
    seller_id: seller.id,
    listing_id: input.listingId || null,
    client_key: key,
  });

  const waDigits = e164.replace(/\D/g, "");
  return {
    ok: true as const,
    phoneE164: e164,
    whatsappUrl: `https://wa.me/${waDigits}`,
  };
}
