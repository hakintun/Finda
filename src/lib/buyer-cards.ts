import {
  freshnessState,
  freshnessWeight,
  haversineKm,
  shopOpenState,
  stockWeight,
} from "./freshness";
import { expandQuery, searchListings, type SearchHit } from "./search";
import { mapDbStockToUi, mapDbTierToUi } from "./buyer-ops";
import type { ResultCardListing, SellerType } from "./types";

export function toResultCardListing(row: {
  listing: any;
  seller: any;
  zone?: any;
  distance_km?: number | null;
  distanceKm?: number | null;
}): ResultCardListing {
  const { listing, seller, zone } = row;
  const rawDist = row.distanceKm ?? row.distance_km ?? null;
  const distanceKm =
    rawDist !== null && Number.isFinite(rawDist) ? rawDist : null;

  const openInfo = shopOpenState(seller?.hours || seller?.opening_hours);

  return {
    id: listing.id,
    productSlug: String(listing.product_id || listing.id),
    titleAsListed: String(listing.title_as_listed || "Item"),
    priceKobo: Number(listing.price_kobo || 0),
    priceNegotiable: Boolean(listing.price_negotiable),
    stockStatus: mapDbStockToUi(listing.stock_status),
    confirmedAt: String(listing.confirmed_at || listing.created_at),
    distanceKm,
    zoneName: String(zone?.name || "Port Harcourt"),
    landmarkText: String(seller?.landmark_text || "Main market road"),
    sellerName: String(seller?.business_name || "Local Shop"),
    sellerSlug: String(seller?.slug || "shop"),
    sellerType: (seller?.seller_type === "stall" ||
    seller?.seller_type === "service"
      ? seller.seller_type
      : "shop") as SellerType,
    verificationTier: mapDbTierToUi(seller?.verification_tier),
    isClosedNow: openInfo.open === false,
    opensAtLabel: openInfo.open === false ? openInfo.label : undefined,
  };
}

/**
 * High-speed O(N) Buyer Catalog Query Engine:
 * - Pre-indexes sellers and zones in Maps for sub-millisecond filtering
 * - Supports keyword search + empty-query browse mode
 * - Supports minPriceKobo, maxPriceKobo, stockOnly, tierFilter, and sorts
 */
export function queryBuyerCatalog(
  db: any,
  opts: {
    q?: string;
    zoneId?: string;
    category?: string;
    stockOnly?: boolean;
    tierFilter?: string;
    minPriceKobo?: number;
    maxPriceKobo?: number;
    includeExpired?: boolean;
    origin?: { lat: number; lng: number } | null;
    sort?: "best" | "cheapest" | "highest" | "freshest" | "nearest";
    limit?: number;
  }
): {
  results: SearchHit[];
  expanded: string[];
  total: number;
} {
  const q = (opts.q || "").trim();
  const now = Date.now();
  const limit = opts.limit ?? 60;

  let hits: SearchHit[] = [];
  let expanded: string[] = [];

  if (q) {
    expanded = expandQuery(q, db.synonyms || [], db.products || []);
    const base = searchListings(q, {
      db,
      zoneId: opts.zoneId || null,
      origin: opts.origin || null,
      includeExpired: Boolean(opts.includeExpired),
      limit: 500,
    });
    hits = base.results;
  } else {
    const sellerById = new Map<string, any>();
    for (const s of db.sellers || []) sellerById.set(s.id, s);

    const zoneById = new Map<string, any>();
    for (const z of db.zones || []) zoneById.set(z.id, z);

    for (const listing of db.listings || []) {
      if (listing.status === "delisted" || listing.status === "hidden") continue;
      const state = freshnessState(listing.confirmed_at, now);
      if (state === "expired" && !opts.includeExpired) continue;

      const seller = sellerById.get(listing.seller_id);
      if (!seller || seller.status !== "active") continue;
      if (opts.zoneId && seller.zone_id !== opts.zoneId) continue;

      const dist = opts.origin
        ? haversineKm(opts.origin, { lat: seller.lat, lng: seller.lng })
        : null;
      const proximity =
        dist == null ? 0.5 : Math.max(0, 1 - Math.min(dist, 15) / 15);
      const score =
        0.5 * freshnessWeight(listing.confirmed_at, now) +
        0.25 * proximity +
        0.15 *
          (seller.verification_tier === "visit"
            ? 1
            : seller.verification_tier === "id"
            ? 0.8
            : seller.verification_tier === "phone"
            ? 0.6
            : 0.3) +
        0.1 * stockWeight(listing.stock_status);

      hits.push({
        listing,
        seller,
        zone: zoneById.get(seller.zone_id),
        distance_km: dist ?? NaN,
        score: Number(score.toFixed(4)),
        reason: "browse",
      });
    }
  }

  if (opts.category) {
    hits = hits.filter(
      (h) =>
        h.listing.category === opts.category ||
        h.seller.primary_category === opts.category
    );
  }
  if (opts.stockOnly) {
    hits = hits.filter(
      (h) => h.listing.stock_status === "in" || h.listing.stock_status === "low"
    );
  }
  if (opts.minPriceKobo && opts.minPriceKobo > 0) {
    hits = hits.filter((h) => h.listing.price_kobo >= opts.minPriceKobo!);
  }
  if (opts.maxPriceKobo && opts.maxPriceKobo > 0) {
    hits = hits.filter((h) => h.listing.price_kobo <= opts.maxPriceKobo!);
  }
  if (opts.tierFilter && opts.tierFilter !== "all") {
    if (opts.tierFilter === "verified_any") {
      hits = hits.filter(
        (h) => mapDbTierToUi(h.seller.verification_tier) !== "unverified"
      );
    } else {
      hits = hits.filter(
        (h) => mapDbTierToUi(h.seller.verification_tier) === opts.tierFilter
      );
    }
  }

  const sort = opts.sort || "best";
  if (sort === "cheapest") {
    hits.sort((a, b) => a.listing.price_kobo - b.listing.price_kobo);
  } else if (sort === "highest") {
    hits.sort((a, b) => b.listing.price_kobo - a.listing.price_kobo);
  } else if (sort === "freshest") {
    hits.sort(
      (a, b) =>
        new Date(b.listing.confirmed_at || 0).getTime() -
        new Date(a.listing.confirmed_at || 0).getTime()
    );
  } else if (sort === "nearest") {
    hits.sort((a, b) => {
      const da = Number.isFinite(a.distance_km) ? a.distance_km : 999;
      const dbDist = Number.isFinite(b.distance_km) ? b.distance_km : 999;
      return da - dbDist || b.score - a.score;
    });
  } else {
    hits.sort(
      (a, b) => b.score - a.score || a.listing.price_kobo - b.listing.price_kobo
    );
  }

  return {
    results: hits.slice(0, limit),
    expanded,
    total: hits.length,
  };
}
