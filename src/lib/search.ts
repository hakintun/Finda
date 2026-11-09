/**
 * Minimal search used so Member 3 can verify the supply side end-to-end
 * ("By Day 2 evening, you can add a shop and find it in search!").
 *
 * NOTE: the full ranking engine (PRD US-1.3) is Member 1/Member 2's work.
 * This is a compatible stand-in with the same freshness rules so seller
 * listings can be checked today. Do not duplicate it — swap in their engine.
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
  // every individual word
  q.split(" ").forEach((w) => { if (w.length > 1) terms.add(w); });
  // synonym expansion (term inside the query, or query inside the term)
  for (const s of synonyms || []) {
    const t = norm(s.term);
    if (!t) continue;
    if (q === t) {
      const p = products.find((x) => x.id === s.maps_to);
      if (p) { terms.add(norm(p.canonical_name)); (p.aliases || []).forEach((a: string) => terms.add(norm(a))); }
    } else if (q.includes(t) || t.includes(q)) {
      terms.add(t);
      const p = products.find((x) => x.id === s.maps_to);
      if (p) terms.add(norm(p.canonical_name));
    }
  }
  return [...terms].filter(Boolean);
}

export function searchListings(
  rawQuery: string,
  opts: { db: any; zoneId?: string | null; origin?: { lat: number; lng: number } | null; includeExpired?: boolean; limit?: number }
): { results: SearchHit[]; total: number; stateCounts: Record<string, number> } {
  const { db, zoneId, origin, includeExpired = false, limit = 30 } = opts;
  const terms = expandQuery(rawQuery, db.synonyms, db.products);
  const now = Date.now();

  const stateCounts: Record<string, number> = { fresh: 0, aging: 0, stale: 0, expired: 0 };
  const hits: SearchHit[] = [];

  for (const listing of db.listings) {
    if (listing.status === "delisted") continue;
    const state = freshnessState(listing.confirmed_at, now);
    stateCounts[state] = (stateCounts[state] || 0) + 1;
    if (state === "expired" && !includeExpired) continue;

    const seller = db.sellers.find((s: any) => s.id === listing.seller_id);
    if (!seller || seller.status !== "active") continue;
    if (zoneId && seller.zone_id !== zoneId) continue;

    // text relevance
    const hay = norm(`${listing.title_as_listed} ${listing.category} ${seller.business_name} ${(seller.primary_category || "")}`);
    let text = 0;
    let matchedTerm = "";
    for (const t of terms) {
      if (!t) continue;
      if (norm(listing.title_as_listed) === t) { text = Math.max(text, 1); matchedTerm = t; }
      else if (norm(listing.title_as_listed).includes(t)) { text = Math.max(text, 0.85); matchedTerm = matchedTerm || t; }
      else if (hay.includes(t)) { text = Math.max(text, 0.55); matchedTerm = matchedTerm || t; }
    }
    if (text === 0) continue;

    const dist = origin ? haversineKm(origin, { lat: seller.lat, lng: seller.lng }) : null;
    const proximity = dist == null ? 0.5 : Math.max(0, 1 - Math.min(dist, 15) / 15);

    const score =
      0.40 * text +
      0.25 * freshnessWeight(listing.confirmed_at, now) +
      0.20 * proximity +
      0.10 * (seller.verification_tier === "visit" ? 1 : seller.verification_tier === "id" ? 0.8 : seller.verification_tier === "phone" ? 0.6 : 0.3) +
      0.05 * stockWeight(listing.stock_status);

    hits.push({
      listing, seller, zone: db.zones.find((z: any) => z.id === seller.zone_id),
      distance_km: dist ?? NaN, score: Number(score.toFixed(4)),
      reason: matchedTerm ? `matched "${matchedTerm}"` : "category match",
    });
  }

  hits.sort((a, b) => b.score - a.score || a.listing.price_kobo - b.listing.price_kobo);
  return { results: hits.slice(0, limit), total: hits.length, stateCounts };
}
