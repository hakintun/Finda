import Link from "next/link";
import {
  JijiAdCard,
  MarketplaceFooter,
  TopBar,
} from "@/components/buyer/shell";
import { HeroSearchBar } from "@/components/buyer/hero-search";
import { getDB } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { queryBuyerCatalog, toResultCardListing } from "@/lib/buyer-cards";
import { getCategoryVisual } from "@/lib/category-visuals";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; filter?: string }>;
}) {
  const [db, customerSession, sp] = await Promise.all([
    Promise.resolve(getDB()),
    getCustomerSession(),
    searchParams,
  ]);

  const viewMode: "grid" | "list" = sp.view === "list" ? "list" : "grid";
  const quickFilter = sp.filter || "all";

  const zones = db.zones || [];
  const suggestions = (db.products || []).slice(0, 80).map((p: any) => ({
    name: String(p.canonical_name),
    category: String(p.category || "Market"),
  }));

  // Single fast catalog pass for category counts + trending feed
  const allCatalog = queryBuyerCatalog(db, { sort: "best", limit: 400 });
  const catCountMap = new Map<string, number>();
  const zoneShopCountMap = new Map<string, number>();

  for (const s of db.sellers || []) {
    if (s.status === "active") {
      zoneShopCountMap.set(
        s.zone_id,
        (zoneShopCountMap.get(s.zone_id) || 0) + 1
      );
    }
  }

  for (const hit of allCatalog.results) {
    const c = hit.listing.category || hit.seller.primary_category || "Other";
    catCountMap.set(c, (catCountMap.get(c) || 0) + 1);
  }

  const categories = [...catCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      ...getCategoryVisual(name),
    }));

  let feedHits = allCatalog.results;
  if (quickFilter === "verified") {
    feedHits = feedHits.filter(
      (h) => h.seller.verification_tier && h.seller.verification_tier !== "unverified"
    );
  } else if (quickFilter === "instock") {
    feedHits = feedHits.filter((h) => h.listing.stock_status === "in");
  }
  const trending = feedHits.slice(0, 24);

  const activeSellersCount = (db.sellers || []).filter(
    (s: any) => s.status === "active"
  ).length;

  const topCustomer = customerSession
    ? {
        name: customerSession.user.name,
        role: customerSession.user.role,
        isVerified: Boolean(customerSession.user.is_verified),
        hasShop: Boolean(customerSession.shop),
      }
    : null;

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5] text-[#111827]">
      <TopBar customer={topCustomer} />

      {/* JIJI-INSPIRED DEEP EMERALD HERO SEARCH BANNER WITH FINDA RADAR DNA */}
      <section className="finda-canopy text-white border-b border-[#043D2D]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 border border-white/20 px-3.5 py-1 text-[11px] font-bold text-[#FDE68A]">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>
                {allCatalog.total} Live Confirmed Items · {activeSellersCount} Verified Stalls Across 6 PH Hubs
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              What are you looking for in Port Harcourt?
            </h1>

            <HeroSearchBar
              zones={zones.map((z: any) => ({ id: z.id, name: z.name }))}
              suggestions={suggestions}
            />

            {/* Popular Searches Strip */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs">
              <span className="text-white/75 font-medium">Trending:</span>
              {[
                "12.5kg Cooking Gas",
                "Generator",
                "Solar Inverter",
                "50kg Rice",
                "Cement",
                "Standing Fan",
              ].map((chip) => (
                <Link
                  key={chip}
                  href={`/search?q=${encodeURIComponent(chip)}`}
                  prefetch={false}
                  className="rounded-full bg-white/12 border border-white/15 px-3 py-1 font-semibold text-white transition hover:bg-white hover:text-[#065F46]"
                >
                  {chip}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN MARKETPLACE WORKSPACE (Jiji.ng structure + Finda unique modules) */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[265px_1fr]">
          {/* LEFT SIDEBAR: Categories + Port Harcourt Market Hubs */}
          <aside aria-label="Marketplace categories" className="space-y-4">
            {/* Desktop Sticky Category Rail */}
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-[#DEDBD0] bg-white shadow-2xs">
              {/* Top Post Ad / List Stall Action Tile (like Jiji's top sidebar item) */}
              <Link
                href={topCustomer?.hasShop ? "/seller/items" : "/sell"}
                prefetch={false}
                className="flex items-center justify-between border-b border-[#E5E2D9] bg-[#ECFDF5] px-4 py-3 text-xs font-extrabold text-[#065F46] hover:bg-[#D1FAE5]"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#065F46] text-white font-black">
                    +
                  </span>
                  <span>{topCustomer?.hasShop ? "Add Item to Stall" : "Post Ad / Open Stall"}</span>
                </span>
                <span>→</span>
              </Link>

              <ul className="divide-y divide-[#F3F2EC]">
                <li>
                  <Link
                    href="/search"
                    prefetch={false}
                    className="flex items-center justify-between gap-2.5 px-4 py-2.5 text-xs font-extrabold text-[#065F46] hover:bg-[#FAF9F5]"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5] text-sm">
                        🔥
                      </span>
                      <span>All Trending Stock</span>
                    </span>
                    <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-bold text-[#065F46] tabular-nums">
                      {allCatalog.total}
                    </span>
                  </Link>
                </li>

                {categories.map((cat) => (
                  <li key={cat.name}>
                    <Link
                      href={`/search?category=${encodeURIComponent(cat.name)}`}
                      prefetch={false}
                      className="flex items-center justify-between gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#1F2937] transition hover:bg-[#ECFDF5]/60 hover:text-[#065F46]"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${cat.bgGradient} text-sm`}
                        >
                          {cat.emoji}
                        </span>
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-[#6B7280] tabular-nums">
                        <span>{cat.count}</span>
                        <span aria-hidden="true">›</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Unique Finda Hyperlocal Module: Port Harcourt Market Hubs */}
            <div className="hidden lg:block rounded-2xl border border-[#DEDBD0] bg-white p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#065F46]">
                  📍 Market Hubs
                </h2>
                <Link
                  href="/market-data"
                  prefetch={false}
                  className="text-[11px] font-bold text-[#065F46] hover:underline"
                >
                  Map →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {zones.map((z: any) => (
                  <Link
                    key={z.id}
                    href={`/search?zone=${encodeURIComponent(z.id)}`}
                    prefetch={false}
                    className="rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] px-2.5 py-2 text-xs transition hover:border-[#065F46] hover:bg-[#ECFDF5]"
                  >
                    <p className="font-bold text-[#111827] truncate">{z.name}</p>
                    <p className="text-[10px] font-semibold text-[#065F46]">
                      {zoneShopCountMap.get(z.id) || 0} stalls
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Category Icon Grid (Jiji mobile tile deck) */}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:hidden">
              <Link
                href={topCustomer?.hasShop ? "/seller/items" : "/sell"}
                prefetch={false}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#065F46] bg-[#ECFDF5] p-2.5 text-center shadow-2xs"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#065F46] text-lg font-black text-white">
                  +
                </span>
                <span className="text-[11px] font-extrabold text-[#065F46]">
                  Post Ad
                </span>
              </Link>

              {categories.slice(0, 9).map((cat) => (
                <Link
                  key={cat.name}
                  href={`/search?category=${encodeURIComponent(cat.name)}`}
                  prefetch={false}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-[#DEDBD0] bg-white p-2.5 text-center shadow-2xs hover:border-[#065F46]"
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${cat.bgGradient} text-lg`}
                  >
                    {cat.emoji}
                  </span>
                  <span className="text-[11px] font-bold leading-tight text-[#111827] line-clamp-2">
                    {cat.shortLabel}
                  </span>
                </Link>
              ))}
            </div>
          </aside>

          {/* RIGHT MAIN FEED: 4 Feature Banners + Trending & Confirmed Ads */}
          <div className="space-y-5">
            {/* 4-Card Feature Banner Strip (inspired by Jiji's top promo row, uniquely Finda) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link
                href="/search?tier=verified_any"
                prefetch={false}
                className="rounded-2xl border border-[#DEDBD0] bg-white p-3.5 shadow-2xs transition hover:border-[#065F46]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFDF5] text-sm font-black text-[#065F46]">
                  ✓
                </span>
                <p className="mt-2 text-xs font-extrabold text-[#111827]">
                  Verified Stalls
                </p>
                <p className="text-[11px] text-[#6B7280]">
                  Email, SMS &amp; Visit checked
                </p>
              </Link>

              <Link
                href="/search?stock=1"
                prefetch={false}
                className="rounded-2xl border border-[#DEDBD0] bg-white p-3.5 shadow-2xs transition hover:border-[#065F46]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFDF5] text-sm">
                  ⚡
                </span>
                <p className="mt-2 text-xs font-extrabold text-[#111827]">
                  1-Tap Stock Check
                </p>
                <p className="text-[11px] text-[#6B7280]">
                  Confirm before boarding Keke
                </p>
              </Link>

              <Link
                href="/market-data"
                prefetch={false}
                className="rounded-2xl border border-[#DEDBD0] bg-white p-3.5 shadow-2xs transition hover:border-[#065F46]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFDF5] text-sm">
                  📊
                </span>
                <p className="mt-2 text-xs font-extrabold text-[#111827]">
                  PH Price Watch
                </p>
                <p className="text-[11px] text-[#6B7280]">
                  Compare typical stall prices
                </p>
              </Link>

              <Link
                href="/sell"
                prefetch={false}
                className="rounded-2xl border border-[#065F46] bg-[#065F46] p-3.5 text-white shadow-2xs transition hover:bg-[#064E3B]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-sm font-black text-[#FDE68A]">
                  🏪
                </span>
                <p className="mt-2 text-xs font-extrabold text-white">
                  Sell Free Today
                </p>
                <p className="text-[11px] text-emerald-100/85">
                  List your stall in 5 mins
                </p>
              </Link>
            </div>

            {/* Feed Header + Filter Chips + Grid/List Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-[#111827]">
                  Trending &amp; Confirmed Ads
                </h2>
                <div className="flex items-center gap-1 rounded-xl border border-[#DEDBD0] bg-white p-1 text-xs">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "verified", label: "✓ Verified" },
                      { id: "instock", label: "In Stock" },
                    ] as const
                  ).map((f) => (
                    <Link
                      key={f.id}
                      prefetch={false}
                      href={`/?filter=${f.id}&view=${viewMode}`}
                      className={`rounded-lg px-2.5 py-1 font-bold transition ${
                        quickFilter === f.id
                          ? "bg-[#065F46] text-white"
                          : "text-[#4B5563] hover:text-[#111827]"
                      }`}
                    >
                      {f.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Grid / List View Switcher (Jiji feed toggle) */}
                <div className="inline-flex rounded-xl border border-[#DEDBD0] bg-white p-1 text-xs">
                  <Link
                    prefetch={false}
                    href={`/?filter=${quickFilter}&view=grid`}
                    aria-label="Grid view"
                    className={`rounded-lg px-2.5 py-1 font-bold ${
                      viewMode === "grid"
                        ? "bg-[#ECFDF5] text-[#065F46]"
                        : "text-[#6B7280]"
                    }`}
                  >
                    ⊞ Grid
                  </Link>
                  <Link
                    prefetch={false}
                    href={`/?filter=${quickFilter}&view=list`}
                    aria-label="List view"
                    className={`rounded-lg px-2.5 py-1 font-bold ${
                      viewMode === "list"
                        ? "bg-[#ECFDF5] text-[#065F46]"
                        : "text-[#6B7280]"
                    }`}
                  >
                    ☰ List
                  </Link>
                </div>

                <Link
                  href="/search"
                  prefetch={false}
                  className="text-xs font-extrabold text-[#065F46] hover:underline"
                >
                  See all ({allCatalog.total}) →
                </Link>
              </div>
            </div>

            {trending.length === 0 ? (
              <div className="rounded-2xl border border-[#DEDBD0] bg-white p-10 text-center space-y-3">
                <p className="text-base font-bold text-[#111827]">
                  No active listings match that filter right now
                </p>
                <Link href="/" className="btn btn-primary">
                  Show All Active Stock
                </Link>
              </div>
            ) : (
              <div
                className={
                  viewMode === "list"
                    ? "space-y-3"
                    : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                }
              >
                {trending.map((row) => {
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
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
