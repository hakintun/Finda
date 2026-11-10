/**
 * Seller onboarding draft + publish — Member 3 · Task 2 & 3
 *
 * PRD US-2.1: "Given I start onboarding on a 3G phone, then I reach 'published'
 * in ≤15 minutes and ≤6 screens, and I can abandon at any step and resume."
 *
 * Supports both cookie-based draft persistence (`finda_draft`) AND explicit
 * `draft_id` / payload sync so cross-origin preview iframes with strict cookie
 * blocking work seamlessly alongside localhost.
 */
import { cookies } from "next/headers";
import { getDB, saveDB, id, nowISO, audit, trackEvent } from "./db";
import { getSessionCookieOptions } from "./cookie-opts";
import { checkBanned } from "./moderation";
import { validatePin } from "./geo";
import { toE164 } from "./freshness";

export const DRAFT_COOKIE = "finda_draft";

export const STEPS = [
  { n: 1, title: "Your phone", short: "Phone code" },
  { n: 2, title: "Your shop", short: "Shop name" },
  { n: 3, title: "What you sell", short: "Category" },
  { n: 4, title: "Where you are", short: "Pin + landmark" },
  { n: 5, title: "Your first 5 items", short: "Items" },
  { n: 6, title: "Publish", short: "Go live" },
];

export type DraftItem = {
  title: string;
  product_id: string | null;
  price_naira: string;
  stock_status: "in" | "low" | "out" | "unconfirmed";
};

export type Draft = {
  id: string;
  step: number;
  phone: string;
  email?: string;
  verify_channel?: "email" | "phone" | "whatsapp";
  password_hash?: string | null;
  otp_sent: boolean;
  otp_code: string | null;
  verified: boolean;
  consent: boolean;
  business_name: string;
  owner_name: string;
  seller_type: string;
  primary_category: string;
  zone_id: string;
  lat: number | null;
  lng: number | null;
  landmark_text: string;
  items: DraftItem[];
  published_shop_id: string | null;
  created_at: string;
  updated_at: string;
};

export function parsePriceNaira(val: unknown): number {
  const cleaned = String(val ?? "").replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function emptyDraft(preferredId?: string): Draft {
  const safeId =
    preferredId && /^drf_[a-zA-Z0-9_-]{3,40}$/.test(preferredId)
      ? preferredId
      : id("drf");
  return {
    id: safeId,
    step: 1,
    phone: "",
    email: "",
    verify_channel: "whatsapp",
    password_hash: null,
    otp_sent: false,
    otp_code: null,
    verified: false,
    consent: false,
    business_name: "",
    owner_name: "",
    seller_type: "stall",
    primary_category: "",
    zone_id: "",
    lat: null,
    lng: null,
    landmark_text: "",
    items: [],
    published_shop_id: null,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

export async function getDraft(): Promise<Draft> {
  const store = await cookies();
  const draftId = store.get(DRAFT_COOKIE)?.value;
  const db = getDB();
  db.onboarding_drafts = db.onboarding_drafts || [];
  let draft = draftId
    ? db.onboarding_drafts.find((d: any) => d.id === draftId)
    : null;

  if (!draft) {
    draft = emptyDraft();
    db.onboarding_drafts.push(draft);
    saveDB(db);
  }
  return draft;
}

/**
 * Used by route handlers, which can set cookies AND accept explicit `requestedDraftId`
 * when browser third-party cookies are blocked inside cross-origin preview iframes.
 */
export async function getOrCreateDraftForWrite(
  requestedDraftId?: string | null
): Promise<Draft> {
  const store = await cookies();
  const cookieDraftId = store.get(DRAFT_COOKIE)?.value;
  const db = getDB();
  db.onboarding_drafts = db.onboarding_drafts || [];

  const lookupId = requestedDraftId?.trim() || cookieDraftId || null;
  let draft = lookupId
    ? db.onboarding_drafts.find((d: any) => d.id === lookupId)
    : null;

  if (!draft) {
    draft = emptyDraft(requestedDraftId || undefined);
    db.onboarding_drafts.push(draft);
  }

  const opts = await getSessionCookieOptions(60 * 60 * 24 * 7);
  store.set(DRAFT_COOKIE, draft.id, opts);
  saveDB(db);
  return draft;
}

export function validateStep(step: number, draft: Draft): string[] {
  const errors: string[] = [];
  if (step >= 1) {
    if (!draft.verified)
      errors.push("Confirm the verification code on Step 1 first.");
    if (!draft.consent)
      errors.push("Tick the consent box so we can store your shop details.");
  }
  if (step >= 2) {
    if (!draft.business_name || draft.business_name.trim().length < 2)
      errors.push("Enter your shop or stall name (Step 2).");
    if (!draft.owner_name || draft.owner_name.trim().length < 2)
      errors.push("Enter the name buyers should ask for (Step 2).");
  }
  if (step >= 3 && !draft.primary_category) {
    errors.push("Choose what you mostly sell (Step 3).");
  }
  if (step >= 4) {
    if (draft.lat == null || draft.lng == null)
      errors.push("Drop your shop pin on the map (Step 4).");
    if (!draft.zone_id)
      errors.push("Choose the market area your shop is in (Step 4).");
    if (!draft.landmark_text || draft.landmark_text.trim().length < 6)
      errors.push(
        "Add a walkable street landmark of at least 6 characters (Step 4)."
      );
  }
  if (step >= 5) {
    const real = (draft.items || []).filter(
      (i) => i.title?.trim() && parsePriceNaira(i.price_naira) > 0
    );
    if (real.length < 1)
      errors.push("Add at least 1 item with a Naira price (Step 5).");
    for (const i of real) {
      const banned = checkBanned(i.title);
      if (banned)
        errors.push(`"${i.title}" is not allowed: ${banned.label}.`);
    }
  }
  return errors;
}

export type PublishResult =
  | {
      ok: true;
      seller: any;
      user: any;
      listing_count: number;
      warnings: string[];
    }
  | { ok: false; errors: string[] };

export function publishDraft(draft: Draft, linkedUser?: any): PublishResult {
  const db = getDB();
  const errors = validateStep(5, draft);
  if (errors.length) return { ok: false, errors };

  const phone =
    toE164(draft.phone || linkedUser?.phone || "") ||
    draft.phone ||
    linkedUser?.phone ||
    "";

  if (!phone) {
    return {
      ok: false,
      errors: [
        "Enter a valid Nigerian phone number on Step 1 so buyers can reach your shop.",
      ],
    };
  }

  const existingSeller = (db.sellers || []).find(
    (s: any) =>
      (s.phone && toE164(s.phone) === phone) ||
      (s.whatsapp_number && toE164(s.whatsapp_number) === phone)
  );
  if (existingSeller) {
    // Idempotent success if the same authenticated user already published this shop
    if (linkedUser && existingSeller.user_id === linkedUser.id) {
      const existingCount = (db.listings || []).filter(
        (l: any) => l.seller_id === existingSeller.id
      ).length;
      return {
        ok: true,
        seller: existingSeller,
        user: linkedUser,
        listing_count: existingCount,
        warnings: [],
      };
    }
    return {
      ok: false,
      errors: [
        "An account with this phone number already has a shop. Please sign in to manage your shop.",
      ],
    };
  }

  const warnings: string[] = [];
  const pinCheck = validatePin(
    { lat: draft.lat!, lng: draft.lng! },
    draft.zone_id,
    db.zones
  );
  const verification_tier = "phone";
  if (!pinCheck.ok) {
    warnings.push(
      `Your pin looks ${pinCheck.distance_km} km outside the ${draft.zone_id} boundary. Your shop is live, but we sent it to the team to check — you keep your listing either way.`
    );
  }

  const slugBase =
    draft.business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "shop";
  let slug = slugBase;
  let n = 2;
  while ((db.sellers || []).some((s: any) => s.slug === slug)) {
    slug = `${slugBase}-${n++}`;
  }

  // Reuse existing user account if registered via /auth (preventing duplicate user rows!)
  db.users = db.users || [];
  const normEmail = draft.email ? draft.email.trim().toLowerCase() : null;
  let user =
    linkedUser ||
    db.users.find(
      (u: any) =>
        (u.phone && toE164(u.phone) === phone) ||
        (normEmail && u.email && u.email.toLowerCase() === normEmail)
    );

  const ch = draft.verify_channel || "whatsapp";
  if (user) {
    user.role = "seller";
    user.name = user.name || draft.owner_name.trim();
    user.phone = user.phone || phone;
    user.whatsapp_number = user.whatsapp_number || phone;
    if (!user.email && normEmail) user.email = normEmail;
    if (!user.password_hash && draft.password_hash) {
      user.password_hash = draft.password_hash;
    }
    user.is_verified = true;
    user.status = user.status || "active";
    user.verified_channels = Array.from(
      new Set([...(user.verified_channels || []), ch])
    );
  } else {
    user = {
      id: id("usr"),
      name: draft.owner_name.trim(),
      role: "seller",
      email: normEmail || null,
      phone,
      whatsapp_number: phone,
      password_hash: draft.password_hash || null,
      verified_channels: [ch],
      is_verified: true,
      status: "active",
      created_at: nowISO(),
    };
    db.users.push(user);
  }

  const sellerId = id("shp");
  const seller = {
    id: sellerId,
    user_id: user.id,
    business_name: draft.business_name.trim(),
    slug,
    seller_type: draft.seller_type || "stall",
    primary_category: draft.primary_category,
    zone_id: draft.zone_id,
    lat: draft.lat,
    lng: draft.lng,
    landmark_text: draft.landmark_text.trim(),
    whatsapp_number: phone,
    phone,
    hours: {
      mon: "8:00-18:00",
      tue: "8:00-18:00",
      wed: "8:00-18:00",
      thu: "8:00-18:00",
      fri: "8:00-18:00",
      sat: "8:00-16:00",
      sun: "closed",
    },
    verification_tier,
    accuracy_score: 0.75,
    response_rate: 0.6,
    view_count_30d: 0,
    status: "active",
    created_at: nowISO(),
    last_nudge_at: null,
    owner_name: draft.owner_name.trim(),
    created_via: "self-onboarding",
  };
  db.sellers.push(seller);

  let count = 0;
  for (const item of draft.items || []) {
    if (!item.title?.trim()) continue;
    const naira = parsePriceNaira(item.price_naira);
    if (naira <= 0) continue;

    const product = item.product_id
      ? db.products.find((p: any) => p.id === item.product_id)
      : null;
    db.listings.push({
      id: id("lst"),
      seller_id: sellerId,
      product_id: product?.id ?? null,
      title_as_listed: item.title.trim(),
      category: product?.category ?? draft.primary_category,
      price_kobo: Math.round(naira * 100),
      price_negotiable: false,
      unit: product?.unit ?? "each",
      stock_status: item.stock_status || "in",
      condition: "new",
      photo_url: null,
      confirmed_at: nowISO(),
      evidence: "self",
      status: "active",
      views_7d: 0,
      report_count: 0,
      created_at: nowISO(),
    });
    count++;
  }

  if (!pinCheck.ok) {
    db.pin_flags = db.pin_flags || [];
    db.pin_flags.unshift({
      id: id("pin"),
      seller_id: sellerId,
      claimed_zone: draft.zone_id,
      distance_km: pinCheck.distance_km,
      lat: draft.lat,
      lng: draft.lng,
      note: `New seller pin is ${pinCheck.distance_km} km outside the ${draft.zone_id} boundary. Generated automatically at sign-up.`,
      state: "open",
      created_at: nowISO(),
    });
  }

  draft.published_shop_id = sellerId;

  audit(db, user.id, "seller", sellerId, "seller_onboarded", null, {
    business_name: seller.business_name,
    listings: count,
  });
  trackEvent(db, "seller_onboarded", {
    seller_id: sellerId,
    listing_count: count,
    zone: draft.zone_id,
  });
  saveDB(db);

  return { ok: true, seller, user, listing_count: count, warnings };
}
