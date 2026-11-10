import Link from "next/link";
import {
  JijiAdCard,
  MarketplaceFooter,
  TopBar,
} from "@/components/buyer/shell";
import { HeroSearchBar } from "@/components/buyer/hero-search";
import { getDB, saveDBBackground } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { formatNairaFromKobo } from "@/lib/format";
import { queryBuyerCatalog, toResultCardListing } from "@/lib/buyer-cards";
import { postBuyerDemand } from "../actions";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    zone?: string;
    category?: string;
    stock?: string;
    tier?: string;
    min_price?: string;
    max_price?: string;
    expired?: string;
    sort?: string;
    view?: string;
    demand_posted?: string;
  }>;
}) {
  const [sp, customerSession] = await Promise.all([
    searchParams,
    getCustomerSession(),
  ]);

  const db = getDB();
  const q = (sp.q || "").trim();
  const zoneId = sp.zone || "";
  const category = sp.category || "";
  const stockOnly = sp.stock === "1";
  const tierFilter = sp.tier || "all";
  const minPriceNaira = sp.min_price ? Number(sp.min_price) : 0;
  const maxPriceNaira = sp.max_price ? Number(sp.max_price) : 0;
  const includeExpired = sp.expired === "1";
  const viewMode: "grid" | "list" = sp.view === "list" ? "list" : "grid";
  const sort = (
    ["best", "cheapest", "highest", "freshest", "nearest"].includes(
      sp.sort || ""
    )
      ? sp.sort
      : "best"
  ) as "best" | "cheapest" | "highest" | "freshest" | "nearest";

  const activeZone = (db.zones || []).find((z: any) => z.id === zoneId);
  const origin = activeZone
    ? {
        lat: activeZone.lat ?? activeZone.center_lat,
        lng: activeZone.lng ?? activeZone.center_lng,
      }
    : null;

  const { results, expanded, total } = queryBuyerCatalog(db, {
    q,
    zoneId: zoneId || undefined,
    category: category || undefined,
    stockOnly,
    tierFilter,
    minPriceKobo: minPriceNaira > 0 ? Math.round(minPriceNaira * 100) : undefined,
    maxPriceKobo: maxPriceNaira > 0 ? Math.round(maxPriceNaira * 100) : undefined,
    includeExpired,
    origin,
    sort,
    limit: 60,
  });

  // Non-blocking search telemetry
  if (q) {
    db.search_queries = db.search_queries || [];
    db.search_queries.unshift({
      id: `sq_${Date.now()}`,
      raw_query: q,
      cluster: zoneId || "all",
      result_count: total,
      created_at: new Date().toISOString(),
    });
    db.search_queries = db.search_queries.slice(0, 500);
    saveDBBackground(db);
  }

  const categories = Array.from(
    new Set<string>(
      (db.products || []).map((p: any) => p.category).filter(Boolean)
    )
  ).sort();

  const suggestions = (db.products || []).slice(0, 80).map((p: any) => ({
    name: String(p.canonical_name),
    category: String(p.category || "Market"),
  }));

  const topCustomer = customerSession
    ? {
        name: customerSession.user.name,
        role: customerSession.user.role,
        isVerified: Boolean(customerSession.user.is_verified),
        hasShop: Boolean(customerSession.shop),
      }
    : null;

  function buildFilterHref(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string> = {};
    if (q) merged.q = q;
    if (zoneId) merged.zone = zoneId;
    if (category) merged.category = category;
    if (stockOnly) merged.stock = "1";
    if (tierFilter !== "all") merged.tier = tierFilter;
    if (minPriceNaira > 0) merged.min_price = String(minPriceNaira);
    if (maxPriceNaira > 0) merged.max_price = String(maxPriceNaira);
    if (includeExpired) merged.expired = "1";
    if (sort !== "best") merged.sort = sort;
    if (viewMode !== "grid") merged.view = viewMode;

    for (const [k, v] of Object.entries(overrides)) {
      if (!v) delete merged[k];
      else merged[k] = v;
    }
    const qs = new URLSearchParams(merged).toString();
    return `/search${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
      <TopBar
        activeClusterLabel={activeZone?.name || "Port Harcourt"}
        customer={topCustomer}
      />

      {/* Deep Emerald Search Strip */}
      <div className="finda-canopy py-4 shadow-xs">
        <div className="mx-auto max-w-6xl px-4">
          <HeroSearchBar
            zones={(db.zones || []).map((z: any) => ({ id: z.id, name: z.name }))}
            suggestions={suggestions}
            defaultQuery={q}
            defaultZone={zoneId}
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 space-y-4">
        {/* Breadcrumbs */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-[#6B7280]">
          <Link href="/" className="hover:text-[#065F46]">
            Port Harcourt
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#111827]">
            {category || "All Categories"}
          </span>
          {activeZone ? (
            <>
              <span>/</span>
              <span className="font-semibold text-[#065F46]">
                {activeZone.name}
              </span>
            </>
          ) : null}
        </nav>

        {sp.demand_posted === "1" ? (
          <div className="notice notice-ok">
            ✓ Demand request posted! Nearby Port Harcourt stalls in{" "}
            <strong>{activeZone?.name || "your area"}</strong> have been
            alerted.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[265px_1fr]">
          {/* LEFT FILTER SIDEBAR (Jiji-style Category + Location + Price ₦ Min/Max + Verification) */}
          <aside className="space-y-4">
            <form
              action="/search"
              method="get"
              className="rounded-2xl border border-[#DEDBD0] bg-white p-4 shadow-2xs space-y-4"
            >
              {q ? <input type="hidden" name="q" value={q} /> : null}
              {viewMode !== "grid" ? (
                <input type="hidden" name="view" value={viewMode} />
              ) : null}

              <div className="flex items-center justify-between border-b border-[#F3F2EC] pb-2.5">
                <h2 className="text-sm font-extrabold text-[#111827]">
                  Filters
                </h2>
                <Link
                  href="/search"
                  prefetch={false}
                  className="text-xs font-bold text-[#065F46] hover:underline"
                >
                  Reset all
                </Link>
              </div>

              <div>
                <label
                  htmlFor="flt-cat"
                  className="mb-1 block text-xs font-bold text-[#374151]"
                >
                  Category
                </label>
                <select
                  id="flt-cat"
                  name="category"
                  defaultValue={category}
                  className="min-h-10 w-full rounded-xl border border-[#CFC9BA] bg-white px-3 text-xs font-semibold"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="flt-zone"
                  className="mb-1 block text-xs font-bold text-[#374151]"
                >
                  Market Location
                </label>
                <select
                  id="flt-zone"
                  name="zone"
                  defaultValue={zoneId}
                  className="min-h-10 w-full rounded-xl border border-[#CFC9BA] bg-white px-3 text-xs font-semibold"
                >
                  <option value="">All Port Harcourt</option>
                  {(db.zones || []).map((z: any) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jiji-style Price, ₦ Min - Max + Quick Brackets */}
              <div className="space-y-2 border-t border-[#F3F2EC] pt-3">
                <span className="block text-xs font-bold text-[#374151]">
                  Price, ₦
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="min_price"
                    type="number"
                    min={0}
                    step={500}
                    defaultValue={minPriceNaira > 0 ? minPriceNaira : ""}
                    placeholder="min"
                    className="min-h-9 rounded-xl border border-[#CFC9BA] px-2.5 text-xs"
                  />
                  <input
                    name="max_price"
                    type="number"
                    min={0}
                    step={500}
                    defaultValue={maxPriceNaira > 0 ? maxPriceNaira : ""}
                    placeholder="max"
                    className="min-h-9 rounded-xl border border-[#CFC9BA] px-2.5 text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5 text-[11px]">
                  {[
                    { label: "Under ₦10k", min: "", max: "10000" },
                    { label: "₦10k–₦50k", min: "10000", max: "50000" },
                    { label: "₦50k–₦200k", min: "50000", max: "200000" },
                    { label: "₦200k+", min: "200000", max: "" },
                  ].map((b) => (
                    <Link
                      key={b.label}
                      prefetch={false}
                      href={buildFilterHref({
                        min_price: b.min || undefined,
                        max_price: b.max || undefined,
                      })}
                      className="rounded-lg border border-[#DEDBD0] bg-[#FAF9F5] px-2 py-0.5 font-semibold text-[#374151] hover:border-[#065F46] hover:text-[#065F46]"
                    >
                      {b.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#F3F2EC] pt-3">
                <label
                  htmlFor="flt-tier"
                  className="mb-1 block text-xs font-bold text-[#374151]"
                >
                  Seller Verification
                </label>
                <select
                  id="flt-tier"
                  name="tier"
                  defaultValue={tierFilter}
                  className="min-h-10 w-full rounded-xl border border-[#CFC9BA] bg-white px-3 text-xs font-semibold"
                >
                  <option value="all">All Sellers</option>
                  <option value="verified_any">✓ Verified Stalls Only</option>
                  <option value="visit">✓✓✓ Field-Visited Only</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="flt-sort"
                  className="mb-1 block text-xs font-bold text-[#374151]"
                >
                  Sort By
                </label>
                <select
                  id="flt-sort"
                  name="sort"
                  defaultValue={sort}
                  className="min-h-10 w-full rounded-xl border border-[#CFC9BA] bg-white px-3 text-xs font-semibold"
                >
                  <option value="best">Recommended</option>
                  <option value="freshest">Newest Confirmed</option>
                  <option value="cheapest">Lowest Price First</option>
                  <option value="highest">Highest Price First</option>
                  <option value="nearest">Nearest Market Hub</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#374151] cursor-pointer">
                <input
                  type="checkbox"
                  name="stock"
                  value="1"
                  defaultChecked={stockOnly}
                  className="h-4 w-4 accent-[#065F46]"
                />
                <span>In stock / Low stock only</span>
              </label>

              <button
                type="submit"
                className="min-h-11 w-full rounded-xl bg-[#065F46] text-xs font-extrabold text-white hover:bg-[#064E3B] cursor-pointer"
              >
                Apply Filters
              </button>
            </form>
          </aside>

          {/* RIGHT RESULTS COLUMN */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DEDBD0] bg-white px-4 py-3 shadow-2xs">
              <div>
                <h1 className="text-base font-extrabold text-[#111827]">
                  {q
                    ? `Results for "${q}"`
                    : category
                    ? `${category} in ${activeZone?.name || "Port Harcourt"}`
                    : `All Active Stock in ${activeZone?.name || "Port Harcourt"}`}
                </h1>
                <p className="text-xs text-[#4B5563]">
                  Found <strong>{total}</strong> active listing
                  {total === 1 ? "" : "s"}
                  {minPriceNaira > 0
                    ? ` · From ${formatNairaFromKobo(minPriceNaira * 100)}`
                    : ""}
                  {maxPriceNaira > 0
                    ? ` · Up to ${formatNairaFromKobo(maxPriceNaira * 100)}`
                    : ""}
                  {expanded.length > 1
                    ? ` · Matched local terms: ${expanded.slice(0, 4).join(", ")}`
                    : ""}
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-[#DEDBD0] bg-[#FAF9F5] p-1 text-xs">
                <Link
                  prefetch={false}
                  href={buildFilterHref({ view: undefined })}
                  className={`rounded-lg px-2.5 py-1 font-bold ${
                    viewMode === "grid"
                      ? "bg-white text-[#065F46] shadow-2xs"
                      : "text-[#6B7280]"
                  }`}
                >
                  ⊞ Grid
                </Link>
                <Link
                  prefetch={false}
                  href={buildFilterHref({ view: "list" })}
                  className={`rounded-lg px-2.5 py-1 font-bold ${
                    viewMode === "list"
                      ? "bg-white text-[#065F46] shadow-2xs"
                      : "text-[#6B7280]"
                  }`}
                >
                  ☰ List
                </Link>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl border border-[#DEDBD0] bg-white p-6 space-y-4 shadow-2xs">
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-[#111827]">
                    No active stalls matched &ldquo;{q || category || "that filter"}&rdquo;
                  </h2>
                  <p className="text-xs text-[#4B5563]">
                    Post what you need below and verified Port Harcourt traders
                    in this area can respond with availability and price.
                  </p>
                </div>

                <form
                  action={postBuyerDemand}
                  className="grid gap-3 rounded-xl bg-[#FAF9F5] border border-[#DEDBD0] p-4 sm:grid-cols-2"
                >
                  <div>
                    <label className="mb-1 block text-xs font-bold">
                      What item do you need?
                    </label>
                    <input
                      name="query_text"
                      type="text"
                      required
                      defaultValue={q}
                      placeholder="e.g. 200Ah Tubular Inverter Battery"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold">
                      Preferred Market Area
                    </label>
                    <select name="zone_id" defaultValue={zoneId || "mile1"}>
                      {(db.zones || []).map((z: any) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold">
                      Your Phone or WhatsApp (optional)
                    </label>
                    <input
                      name="buyer_phone"
                      type="tel"
                      placeholder="0803 000 0000"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" className="btn btn-primary">
                      Alert Nearby Stalls
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div
                className={
                  viewMode === "list"
                    ? "space-y-3"
                    : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                }
              >
                {results.map((row) => {
                  const card = toResultCardListing(row);
                  return (
                    <JijiAdCard
                      key={card.id}
                      listing={card}
                      category={
                        row.listing.category || row.seller.primary_category
                      }
                      unit={row.listing.pack_size || row.listing.unit}
                      layout={viewMode}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
