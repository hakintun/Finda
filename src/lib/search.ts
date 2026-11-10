/**
 * Fast indexed search engine for Finda Port Harcourt catalog.
 * Pre-indexes sellers and zones by ID for O(1) lookup per listing.
 */
import { freshnessWeight, freshnessState, haversineKm, stockWeight } from "./freshness";

export type SearchHit = {
  listing: any;
  seller: any;
  zone: any;
  distance_km: number;
  score: number;
  reason: string;
};

function norm(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

export function expandQuery(raw: string, synonyms: any[], products: any[]): string[] {
  const q = norm(raw);
  if (!q) return [];
  const terms = new Set<string>([q]);
  const productById = new Map<string, any>();
  for (const p of products || []) productById.set(p.id, p);

  q.split(" ").forEach((w) => {
    if (w.length > 1) terms.add(w);
  });

  for (const s of synonyms || []) {
    const t = norm(s.term);
    if (!t) continue;
    if (q === t) {
      const p = productById.get(s.maps_to);
      if (p) {
        terms.add(norm(p.canonical_name));
        (p.aliases || []).forEach((a: string) => terms.add(norm(a)));
      }
    } else if (q.includes(t) || t.includes(q)) {
      terms.add(t);
      const p = productById.get(s.maps_to);
      if (p) terms.add(norm(p.canonical_name));
    }
  }
  return [...terms].filter(Boolean);
}

export function searchListings(
  rawQuery: string,
  opts: {
    db: any;
    zoneId?: string | null;
    origin?: { lat: number; lng: number } | null;
    includeExpired?: boolean;
    limit?: number;
  }
): { results: SearchHit[]; total: number; stateCounts: Record<string, number> } {
  const { db, zoneId, origin, includeExpired = false, limit = 30 } = opts;
  const terms = expandQuery(rawQuery, db.synonyms, db.products);
  const now = Date.now();

  const sellerById = new Map<string, any>();
  for (const s of db.sellers || []) sellerById.set(s.id, s);

  const zoneById = new Map<string, any>();
  for (const z of db.zones || []) zoneById.set(z.id, z);

  const stateCounts: Record<string, number> = {
    fresh: 0,
    aging: 0,
    stale: 0,
    expired: 0,
  };
  const hits: SearchHit[] = [];

  for (const listing of db.listings || []) {
    if (listing.status === "delisted" || listing.status === "hidden") continue;

    const seller = sellerById.get(listing.seller_id);
    if (!seller || seller.status !== "active") continue;

    const state = freshnessState(listing.confirmed_at, now);
    stateCounts[state] = (stateCounts[state] || 0) + 1;
    if (state === "expired" && !includeExpired) continue;
    if (zoneId && seller.zone_id !== zoneId) continue;

    const titleNorm = norm(listing.title_as_listed);
    const hay = norm(
      `${listing.title_as_listed} ${listing.category} ${seller.business_name} ${seller.primary_category || ""}`
    );
    let text = 0;
    let matchedTerm = "";
    for (const t of terms) {
      if (!t) continue;
      if (titleNorm === t) {
        text = Math.max(text, 1);
        matchedTerm = t;
      } else if (titleNorm.includes(t)) {
        text = Math.max(text, 0.85);
        matchedTerm = matchedTerm || t;
      } else if (hay.includes(t)) {
        text = Math.max(text, 0.55);
        matchedTerm = matchedTerm || t;
      }
    }
    if (text === 0) continue;

    const dist = origin
      ? haversineKm(origin, { lat: seller.lat, lng: seller.lng })
      : null;
    const proximity = dist == null ? 0.5 : Math.max(0, 1 - Math.min(dist, 15) / 15);

    const score =
      0.4 * text +
      0.25 * freshnessWeight(listing.confirmed_at, now) +
      0.2 * proximity +
      0.1 *
        (seller.verification_tier === "visit"
          ? 1
          : seller.verification_tier === "id"
          ? 0.8
          : seller.verification_tier === "phone"
          ? 0.6
          : 0.3) +
      0.05 * stockWeight(listing.stock_status);

    hits.push({
      listing,
      seller,
      zone: zoneById.get(seller.zone_id),
      distance_km: dist ?? NaN,
      score: Number(score.toFixed(4)),
      reason: matchedTerm ? `matched "${matchedTerm}"` : "category match",
    });
  }

  hits.sort(
    (a, b) => b.score - a.score || a.listing.price_kobo - b.listing.price_kobo
  );
  return { results: hits.slice(0, limit), total: hits.length, stateCounts };
}
