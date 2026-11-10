import Link from "next/link";
import {
  JijiAdCard,
  MarketplaceFooter,
  TopBar,
} from "@/components/buyer/shell";
import { getDB, saveDBBackground } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
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
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  expired?: string;
  demand?: string;
  feedback?: string;
  demoted?: string;
}>;

const PRICE_RANGES = [
  { label: "Under ₦10,000", min: "", max: "10000" },
  { label: "₦10,000 – ₦50,000", min: "10000", max: "50000" },
  { label: "₦50,000 – ₦250,000", min: "50000", max: "250000" },
  { label: "Above ₦250,000", min: "250000", max: "" },
];

export default async function BuyerSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [sp, customerSession] = await Promise.all([
    searchParams,
    getCustomerSession(),
  ]);

  const q = (sp.q || "").trim();
  const zoneId = sp.zone && sp.zone !== "all" ? sp.zone : undefined;
  const category = sp.category && sp.category !== "all" ? sp.category : undefined;
  const stockFilter = sp.stock || "all";
  const tierFilter = sp.tier || "all";
  const minPriceNaira = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPriceNaira = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const sort = (sp.sort as any) || "best";
  const includeExpired = sp.expired === "1";

  const db = getDB();
  const zones: any[] = db.zones || [];
  const activeZone = zones.find((z: any) => z.id === zoneId);

  const origin = activeZone
    ? { lat: activeZone.center_lat, lng: activeZone.center_lng }
    : null;

  const { results: baseResults, expanded } = queryBuyerCatalog(db, {
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
    limit: 120,
  });

  const filtered =
    minPriceNaira && Number.isFinite(minPriceNaira) && minPriceNaira > 0
      ? baseResults.filter(
          (r) => r.listing.price_kobo >= Math.round(minPriceNaira * 100)
        )
      : baseResults;

  if (q) {
    logSearchQuery(db, q, activeZone?.name || "Port Harcourt", filtered.length);
    saveDBBackground(db);
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

  const topCustomer = customerSession
    ? {
        name: customerSession.user.name,
        role: customerSession.user.role,
        isVerified: Boolean(customerSession.user.is_verified),
        hasShop: Boolean(customerSession.shop),
      }
    : null;

  return (
    <div className="min-h-dvh flex flex-col bg-[#F8F7F2]">
      <TopBar
        activeClusterLabel={activeZone?.name || "Port Harcourt"}
        customer={topCustomer}
      />

      {/* Deep Forest Search Strip */}
      <div className="finda-canopy px-4 py-4 text-white">
        <form
          action="/search"
          method="get"
          role="search"
          className="mx-auto flex max-w-6xl gap-2"
        >
          {category ? (
            <input type="hidden" name="category" value={category} />
          ) : null}
          {zoneId ? <input type="hidden" name="zone" value={zoneId} /> : null}
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search item, brand, or Pidgin slang across Port Harcourt…"
            className="min-h-11 flex-1 rounded-xl border-0 bg-white px-4 text-sm text-[#111827]"
          />
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-[#FDE68A] px-5 text-xs font-black uppercase tracking-wide text-[#042F22] hover:bg-[#FCD34D] cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 space-y-4">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="text-xs text-[#6B7280] flex flex-wrap items-center gap-1.5"
        >
          <Link href="/" className="hover:text-[#064E3B]">
            Home
          </Link>
          <span>/</span>
          <Link href="/search" className="hover:text-[#064E3B]">
            Live Stock
          </Link>
          {activeZone ? (
            <>
              <span>/</span>
              <span className="font-semibold text-[#111827]">
                {activeZone.name}
              </span>
            </>
          ) : null}
          {category ? (
            <>
              <span>/</span>
              <span className="font-semibold text-[#111827]">{category}</span>
            </>
          ) : null}
        </nav>

        {sp.demand === "sent" ? (
          <div className="notice notice-ok">
            ✓ Request logged! Nearby verified Port Harcourt stalls can now see
            what you need.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
          {/* Left Refine Panel */}
          <aside>
            <form
              action="/search"
              method="get"
              className="rounded-2xl border border-[#E4E1D6] bg-white p-4 shadow-2xs space-y-5"
            >
              <input type="hidden" name="q" value={q} />

              <div className="space-y-1.5">
                <label
                  htmlFor="flt-cat"
                  className="block text-xs font-extrabold uppercase tracking-wider text-[#374151]"
                >
                  Department
                </label>
                <select
                  id="flt-cat"
                  name="category"
                  defaultValue={category || "all"}
                  className="min-h-10 w-full rounded-xl border border-[#D1CEC2] bg-white px-3 text-xs font-semibold"
                >
                  <option value="all">All Departments</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="flt-zone"
                  className="block text-xs font-extrabold uppercase tracking-wider text-[#374151]"
                >
                  Market Hub
                </label>
                <select
                  id="flt-zone"
                  name="zone"
                  defaultValue={zoneId || "all"}
                  className="min-h-10 w-full rounded-xl border border-[#D1CEC2] bg-white px-3 text-xs font-semibold"
                >
                  <option value="all">All Port Harcourt</option>
                  {zones.map((z: any) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 border-t border-[#F1EFE7] pt-4">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-[#374151]">
                  Budget (₦)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="minPrice"
                    type="number"
                    min={0}
                    defaultValue={minPriceNaira || ""}
                    placeholder="Min ₦"
                    className="min-h-9 rounded-lg border border-[#D1CEC2] px-2.5 text-xs"
                  />
                  <input
                    name="maxPrice"
                    type="number"
                    min={0}
                    defaultValue={maxPriceNaira || ""}
                    placeholder="Max ₦"
                    className="min-h-9 rounded-lg border border-[#D1CEC2] px-2.5 text-xs"
                  />
                </div>
                <div className="space-y-1 pt-1">
                  {PRICE_RANGES.map((b) => (
                    <Link
                      key={b.label}
                      href={`/search?q=${encodeURIComponent(q)}&zone=${
                        zoneId || "all"
                      }&category=${category || "all"}&minPrice=${
                        b.min
                      }&maxPrice=${b.max}`}
                      className="block rounded-lg px-2 py-1 text-xs text-[#4B5563] hover:bg-[#ECFDF5] hover:text-[#064E3B]"
                    >
                      • {b.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-[#F1EFE7] pt-4">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-[#374151]">
                  Trust &amp; Availability
                </span>
                <select
                  name="tier"
                  defaultValue={tierFilter}
                  aria-label="Verification tier"
                  className="min-h-10 w-full rounded-xl border border-[#D1CEC2] bg-white px-3 text-xs font-semibold"
                >
                  <option value="all">All Stalls</option>
                  <option value="verified_any">✓ Verified Stalls Only</option>
                  <option value="visit">✓✓✓ Physically Visited Stalls</option>
                </select>

                <select
                  name="stock"
                  defaultValue={stockFilter}
                  aria-label="Stock status"
                  className="min-h-10 w-full rounded-xl border border-[#D1CEC2] bg-white px-3 text-xs font-semibold"
                >
                  <option value="all">Any Stock Status</option>
                  <option value="in_stock">In Stock / Low Stock Only</option>
                </select>

                <select
                  name="sort"
                  defaultValue={sort}
                  aria-label="Sort order"
                  className="min-h-10 w-full rounded-xl border border-[#D1CEC2] bg-white px-3 text-xs font-semibold"
                >
                  <option value="best">Sort: Best Match</option>
                  <option value="cheapest">Sort: Lowest Price (₦)</option>
                  <option value="freshest">Sort: Recently Confirmed</option>
                  <option value="nearest">Sort: Nearest Hub</option>
                </select>

                <label className="flex items-center gap-2 pt-1 text-xs text-[#4B5563] cursor-pointer">
                  <input
                    type="checkbox"
                    name="expired"
                    value="1"
                    defaultChecked={includeExpired}
                  />
                  Include &gt;14d unconfirmed
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="min-h-10 flex-1 rounded-xl bg-[#064E3B] px-3 text-xs font-extrabold text-white hover:bg-[#043927] cursor-pointer"
                >
                  Apply Filters
                </button>
                <Link
                  href="/search"
                  className="text-xs font-bold text-[#6B7280] hover:text-[#111827]"
                >
                  Reset
                </Link>
              </div>
            </form>
          </aside>

          {/* Right Results Grid */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-[#E4E1D6] bg-white px-4 py-3 shadow-2xs">
              <div>
                <h1 className="text-base font-extrabold text-[#111827]">
                  {q
                    ? `${filtered.length} stalls matched “${q}”`
                    : category
                    ? `${category} in ${activeZone?.name || "Port Harcourt"}`
                    : `Confirmed Stock in ${activeZone?.name || "Port Harcourt"}`}{" "}
                  <span className="text-xs font-semibold text-[#6B7280]">
                    ({filtered.length} items)
                  </span>
                </h1>
                {q && expanded.length > 1 ? (
                  <p className="text-[11px] text-[#6B7280]">
                    Expanded local terms:{" "}
                    <span className="font-semibold">
                      {expanded.slice(0, 5).join(", ")}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((row) => {
                  const card = toResultCardListing(row);
                  return (
                    <JijiAdCard
                      key={card.id}
                      listing={card}
                      category={
                        row.listing.category || row.seller.primary_category
                      }
                      unit={row.listing.pack_size || row.listing.unit}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E4E1D6] bg-white p-6 space-y-3 shadow-2xs">
                  <h2 className="text-lg font-extrabold text-[#111827]">
                    No confirmed stall matched{" "}
                    {q ? `“${q}”` : "those exact filters"} right now
                  </h2>
                  <p className="text-sm text-[#4B5563]">
                    Tell local Port Harcourt traders what you&apos;re looking
                    for and our market team will notify stalls in that line.
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
                        What item do you need?
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
                        Your WhatsApp or Phone (optional)
                      </label>
                      <input
                        id="demand-phone"
                        name="buyer_phone"
                        type="tel"
                        defaultValue={customerSession?.user?.phone || ""}
                        placeholder="e.g. 0803 123 4567"
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl bg-[#064E3B] px-5 text-xs font-extrabold uppercase text-white hover:bg-[#043927] cursor-pointer"
                    >
                      Notify Nearby Stalls
                    </button>
                  </form>
                </div>

                {fallbackSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold text-[#374151]">
                      Recently confirmed stock nearby instead
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {fallbackSuggestions.map((row) => {
                        const card = toResultCardListing(row);
                        return (
                          <JijiAdCard
                            key={card.id}
                            listing={card}
                            category={
                              row.listing.category ||
                              row.seller.primary_category
                            }
                            unit={row.listing.pack_size || row.listing.unit}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
