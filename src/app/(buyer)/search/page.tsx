import Link from "next/link";
import { ResultCard, TopBar } from "@/components/buyer/shell";
import { getDB, saveDB } from "@/lib/db";
import { logSearchQuery } from "@/lib/buyer-ops";
import { queryBuyerCatalog, toResultCardListing } from "@/lib/buyer-cards";
import { postBuyerDemand } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  zone?: string;
  category?: string;
  stock?: string;
  tier?: string;
  maxPrice?: string;
  sort?: string;
  expired?: string;
  demand?: string;
  feedback?: string;
  demoted?: string;
  error?: string;
}>;

export default async function BuyerSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const zoneId = sp.zone && sp.zone !== "all" ? sp.zone : undefined;
  const category = sp.category && sp.category !== "all" ? sp.category : undefined;
  const stockFilter = sp.stock || "all";
  const tierFilter = sp.tier || "all";
  const maxPriceNaira = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const sort = (sp.sort as any) || "best";
  const includeExpired = sp.expired === "1";

  const db = getDB();
  const zones: any[] = db.zones || [];
  const activeZone = zones.find((z: any) => z.id === zoneId);

  const origin = activeZone
    ? { lat: activeZone.center_lat, lng: activeZone.center_lng }
    : null;

  const { results: filtered, expanded, total } = queryBuyerCatalog(db, {
    q,
    zoneId,
    category,
    stockOnly: stockFilter === "in_stock",
    tierFilter,
    maxPriceKobo:
      maxPriceNaira && Number.isFinite(maxPriceNaira) && maxPriceNaira > 0
        ? Math.round(maxPriceNaira * 100)
        : undefined,
    includeExpired,
    origin,
    sort,
    limit: 60,
  });

  if (q) {
    logSearchQuery(db, q, activeZone?.name || "Port Harcourt", filtered.length);
    saveDB(db);
  }

  const fallbackSuggestions =
    filtered.length === 0
      ? queryBuyerCatalog(db, { zoneId, sort: "freshest", limit: 3 }).results
      : [];

  const categories: string[] = Array.from(
    new Set<string>(
      (db.products || []).map((p: any) => String(p.category || ""))
    )
  )
    .filter(Boolean)
    .sort();

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
      <TopBar activeClusterLabel={activeZone?.name || "Port Harcourt"} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-4 space-y-4">
        {sp.demand === "sent" ? (
          <div className="notice notice-ok">
            ✓ Request sent! Nearby Port Harcourt sellers and market agents can
            now see what you need.
          </div>
        ) : null}
        {sp.demoted === "1" ? (
          <div className="notice notice-warn">
            Thanks — 3 buyers reported this item unavailable, so it has been
            automatically demoted to <strong>Unconfirmed</strong>.
          </div>
        ) : sp.feedback ? (
          <div className="notice notice-ok">
            ✓ Thanks for helping keep Port Harcourt stock prices honest!
          </div>
        ) : null}

        {/* Search & Filter Form (URL-persisted via GET) */}
        <form
          action="/search"
          method="get"
          role="search"
          className="rounded-2xl border border-[#D1D5DB] bg-white p-3.5 space-y-3 shadow-xs"
        >
          <div className="flex gap-2">
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search item, brand, or Pidgin slang…"
              className="min-h-11 flex-1 rounded-xl border border-[#9CA3AF] bg-white px-3.5 text-base text-[#111827]"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              name="zone"
              defaultValue={zoneId || "all"}
              aria-label="Filter by market area"
              className="min-h-10 rounded-xl border border-[#D1D5DB] bg-white px-2.5 text-xs font-semibold"
            >
              <option value="all">All Markets</option>
              {zones.map((z: any) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>

            <select
              name="category"
              defaultValue={category || "all"}
              aria-label="Filter by category"
              className="min-h-10 rounded-xl border border-[#D1D5DB] bg-white px-2.5 text-xs font-semibold"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              name="stock"
              defaultValue={stockFilter}
              aria-label="Filter by stock status"
              className="min-h-10 rounded-xl border border-[#D1D5DB] bg-white px-2.5 text-xs font-semibold"
            >
              <option value="all">Any Stock</option>
              <option value="in_stock">In Stock / Low</option>
            </select>

            <select
              name="sort"
              defaultValue={sort}
              aria-label="Sort results"
              className="min-h-10 rounded-xl border border-[#D1D5DB] bg-white px-2.5 text-xs font-semibold"
            >
              <option value="best">Sort: Best Match</option>
              <option value="cheapest">Sort: Cheapest (₦)</option>
              <option value="freshest">Sort: Freshest</option>
              <option value="nearest">Sort: Nearest</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <select
                name="tier"
                defaultValue={tierFilter}
                aria-label="Filter by verification tier"
                className="min-h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-xs font-semibold"
              >
                <option value="all">All Sellers</option>
                <option value="verified_any">Verified Sellers (✓+)</option>
                <option value="visit">Physically Verified (✓✓✓)</option>
              </select>

              <input
                name="maxPrice"
                type="number"
                min={0}
                step={500}
                defaultValue={maxPriceNaira || ""}
                placeholder="Max ₦ price"
                className="min-h-9 w-32 rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
              />

              <label className="inline-flex items-center gap-1.5 text-xs text-[#4B5563] cursor-pointer">
                <input
                  type="checkbox"
                  name="expired"
                  value="1"
                  defaultChecked={includeExpired}
                />
                Include &gt;14d unconfirmed
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button type="submit" className="btn btn-sm">
                Apply filters
              </button>
              <Link
                href="/search"
                className="text-xs font-semibold text-[#065F46] underline"
              >
                Reset
              </Link>
            </div>
          </div>
        </form>

        {/* Synonym expansion feedback */}
        {q && expanded.length > 1 ? (
          <p className="text-xs text-[#4B5563]">
            Matched local terms:{" "}
            <span className="font-semibold text-[#111827]">
              {expanded.slice(0, 5).join(", ")}
            </span>
          </p>
        ) : null}

        {/* Results Header */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-base font-bold text-[#111827]">
            {filtered.length} {filtered.length === 1 ? "listing" : "listings"}{" "}
            {q ? (
              <>
                for <span className="text-[#065F46]">&ldquo;{q}&rdquo;</span>
              </>
            ) : (
              "available"
            )}
          </h1>
          <span className="text-xs text-[#4B5563]">
            {activeZone ? activeZone.name : "All Port Harcourt"}
          </span>
        </div>

        {/* Results List OR Helpful Zero-Results Fallback (US-1.1) */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((row) => {
              const card = toResultCardListing(row);
              return (
                <ResultCard
                  key={card.id}
                  listing={card}
                  sellerHref={`/s/${card.sellerSlug}`}
                  confirmHref={`/s/${card.sellerSlug}?confirm=${encodeURIComponent(
                    card.id
                  )}#item-${card.id}`}
                  directionsHref={`/s/${card.sellerSlug}/map`}
                />
              );
            })}
          </div>
        ) : (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[#D1D5DB] bg-white p-5 space-y-3">
              <h2 className="text-lg font-extrabold text-[#111827]">
                No confirmed shop matched{" "}
                {q ? `“${q}”` : "those exact filters"} right now
              </h2>
              <p className="text-sm text-[#4B5563]">
                We never show fake or expired stock as available. Tell local
                Port Harcourt traders what you need so our market agent can
                source it — or try broadening your area filter.
              </p>

              <form action={postBuyerDemand} className="space-y-2.5 pt-1">
                <input type="hidden" name="return_q" value={q} />
                <input
                  type="hidden"
                  name="cluster"
                  value={activeZone?.name || "Port Harcourt"}
                />
                <div className="field">
                  <label className="lbl" htmlFor="demand-text">
                    Tell sellers what you need
                  </label>
                  <input
                    id="demand-text"
                    name="raw_text"
                    type="text"
                    required
                    defaultValue={q}
                    placeholder="e.g. 200Ah tubular battery around Mile 3"
                  />
                </div>
                <div className="field">
                  <label className="lbl" htmlFor="demand-phone">
                    Optional WhatsApp / phone number (if you want a reply)
                  </label>
                  <input
                    id="demand-phone"
                    name="buyer_phone"
                    type="tel"
                    placeholder="e.g. 0803 123 4567"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Notify nearby sellers
                </button>
              </form>
            </div>

            {fallbackSuggestions.length > 0 ? (
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-[#374151]">
                  Freshly confirmed items nearby instead
                </h3>
                {fallbackSuggestions.map((row) => {
                  const card = toResultCardListing(row);
                  return (
                    <ResultCard
                      key={card.id}
                      listing={card}
                      sellerHref={`/s/${card.sellerSlug}`}
                      confirmHref={`/s/${card.sellerSlug}?confirm=${encodeURIComponent(
                        card.id
                      )}#item-${card.id}`}
                      directionsHref={`/s/${card.sellerSlug}/map`}
                    />
                  );
                })}
              </div>
            ) : null}
          </section>
        )}

        {total > filtered.length ? (
          <p className="text-center text-xs text-[#4B5563]">
            Showing {filtered.length} of {total} matching listings.
          </p>
        ) : null}
      </main>
    </div>
  );
}
