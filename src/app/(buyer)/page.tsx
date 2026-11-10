import Link from "next/link";
import {
  JijiAdCard,
  MarketplaceFooter,
  TopBar,
} from "@/components/buyer/shell";
import { getDB } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { queryBuyerCatalog, toResultCardListing } from "@/lib/buyer-cards";
import { getCategoryVisual } from "@/lib/category-visuals";

export const dynamic = "force-dynamic";

const TRENDING_CHIPS = [
  { label: "I better pass my neighbour", q: "i better pass my neighbour" },
  { label: "Generator", q: "generator" },
  { label: "Cement", q: "cement" },
  { label: "50kg Rice", q: "50kg rice" },
  { label: "Indomine", q: "indomine" },
  { label: "Inverter Battery", q: "inverter battery" },
  { label: "12.5kg Gas", q: "12.5kg gas" },
];

export default async function BuyerHomePage() {
  const [db, customerSession] = await Promise.all([
    Promise.resolve(getDB()),
    getCustomerSession(),
  ]);

  const zones: any[] = db.zones || [];

  // Pull all live listings once to compute accurate per-category ad counts & trending feed
  const { results: allLive, total } = queryBuyerCatalog(db, {
    sort: "freshest",
    limit: 200,
  });

  const catCounts = new Map<string, number>();
  for (const p of db.products || []) {
    if (p.category && !catCounts.has(p.category)) {
      catCounts.set(p.category, 0);
    }
  }
  for (const hit of allLive) {
    const c = hit.listing.category || hit.seller.primary_category || "Other";
    catCounts.set(c, (catCounts.get(c) || 0) + 1);
  }

  const categoryList = Array.from(catCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      visual: getCategoryVisual(name),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const trendingAds = allLive.slice(0, 18);

  const topCustomer = customerSession
    ? {
        name: customerSession.user.name,
        role: customerSession.user.role,
        isVerified: Boolean(customerSession.user.is_verified),
        hasShop: Boolean(customerSession.shop),
      }
    : null;

  return (
    <div className="min-h-dvh flex flex-col bg-[#F2F4F7]">
      <TopBar activeClusterLabel="Port Harcourt" customer={topCustomer} />

      {/* Jiji Signature Green Hero Search Banner */}
      <section className="bg-gradient-to-b from-[#00B53F] to-[#009933] px-4 pb-9 pt-6 text-white">
        <div className="mx-auto max-w-4xl text-center space-y-4">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            What are you looking for in Port Harcourt?
          </h1>

          <form
            action="/search"
            method="get"
            role="search"
            className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row"
          >
            {/* Market Area Selector */}
            <select
              name="zone"
              defaultValue="all"
              aria-label="Select Port Harcourt market area"
              className="min-h-13 rounded-xl border-0 bg-white px-4 text-sm font-bold text-[#111827] shadow-sm sm:w-52"
            >
              <option value="all">📍 All Port Harcourt</option>
              {zones.map((z: any) => (
                <option key={z.id} value={z.id}>
                  📍 {z.name}
                </option>
              ))}
            </select>

            {/* Main Search Input */}
            <div className="relative flex flex-1">
              <input
                name="q"
                type="search"
                placeholder="I am looking for… (e.g. generator, cement, 50kg rice)"
                className="min-h-13 w-full rounded-xl border-0 bg-white pl-4 pr-28 text-base text-[#111827] shadow-sm placeholder:text-[#6B7280]"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 rounded-lg bg-[#00B53F] px-5 text-sm font-extrabold text-white hover:bg-[#009933] cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>

          {/* Popular Search Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-xs font-semibold text-white/85">
              Popular:
            </span>
            {TRENDING_CHIPS.map((chip) => (
              <Link
                key={chip.q}
                href={`/search?q=${encodeURIComponent(chip.q)}`}
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Main Jiji 2-Column Marketplace Body */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6">
        {/* Mobile Category Icon Grid (Jiji Mobile Style) */}
        <section aria-label="Categories" className="mb-6 lg:hidden">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            <Link
              href="/sell"
              className="flex flex-col items-center justify-center rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] p-3 text-center shadow-2xs"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF8900] text-xl font-black text-white">
                +
              </span>
              <span className="mt-1.5 text-xs font-extrabold text-[#9A3412]">
                Post Ad
              </span>
              <span className="text-[10px] text-[#C2410C]">Free</span>
            </Link>

            {categoryList.map((cat) => (
              <Link
                key={cat.name}
                href={`/search?category=${encodeURIComponent(cat.name)}`}
                className="flex flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white p-3 text-center shadow-2xs hover:border-[#00B53F]"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full text-2xl"
                  style={{ backgroundColor: cat.visual.bg }}
                >
                  {cat.visual.emoji}
                </span>
                <span className="mt-1.5 text-xs font-bold text-[#111827] line-clamp-1">
                  {cat.name}
                </span>
                <span className="text-[10px] font-medium text-[#6B7280]">
                  {cat.count} ads
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
          {/* Left Sticky Category Sidebar (Jiji Desktop Style) */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xs">
              <div className="border-b border-[#F2F4F7] px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">
                Categories ({total} ads)
              </div>
              <ul className="divide-y divide-[#F2F4F7]">
                {categoryList.map((cat) => (
                  <li key={cat.name}>
                    <Link
                      href={`/search?category=${encodeURIComponent(cat.name)}`}
                      className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-[#ECFDF5] group"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg"
                          style={{ backgroundColor: cat.visual.bg }}
                        >
                          {cat.visual.emoji}
                        </span>
                        <span className="truncate font-semibold text-[#111827] group-hover:text-[#00B53F]">
                          {cat.name}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#6B7280] shrink-0">
                        <span>{cat.count}</span>
                        <span aria-hidden="true">›</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Right Main Feed */}
          <div className="space-y-6">
            {/* Jiji-style Action Banners */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href="/sell"
                className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs hover:border-[#FF8900]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED] text-2xl">
                  🚀
                </span>
                <div>
                  <p className="text-sm font-extrabold text-[#111827]">
                    Got a shop? Sell for free
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    List your items in 5 mins →
                  </p>
                </div>
              </Link>

              <Link
                href="/auth?tab=register"
                className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs hover:border-[#00B53F]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-2xl">
                  ✅
                </span>
                <div>
                  <p className="text-sm font-extrabold text-[#111827]">
                    Verify Account
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Email · Phone SMS · WhatsApp
                  </p>
                </div>
              </Link>

              <Link
                href="/market-data"
                className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs hover:border-[#00B53F]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-2xl">
                  📊
                </span>
                <div>
                  <p className="text-sm font-extrabold text-[#111827]">
                    PH Market Price Index
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Compare Mile 1 vs Mile 3 →
                  </p>
                </div>
              </Link>
            </div>

            {/* Market Area Quick Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Link
                href="/search"
                className="shrink-0 rounded-full bg-[#00B53F] px-3.5 py-1.5 text-xs font-extrabold text-white"
              >
                🔥 All Port Harcourt
              </Link>
              {zones.map((z: any) => (
                <Link
                  key={z.id}
                  href={`/search?zone=${encodeURIComponent(z.id)}`}
                  className="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-bold text-[#374151] hover:border-[#00B53F] hover:text-[#00B53F]"
                >
                  📍 {z.name}
                </Link>
              ))}
            </div>

            {/* Trending Ads Grid */}
            <section aria-labelledby="trending-heading" className="space-y-3.5">
              <div className="flex items-baseline justify-between">
                <h2
                  id="trending-heading"
                  className="text-lg font-extrabold text-[#111827]"
                >
                  Trending Ads in Port Harcourt
                </h2>
                <Link
                  href="/search?sort=freshest"
                  className="text-xs font-extrabold text-[#00B53F] hover:underline"
                >
                  Show all {total} ads →
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {trendingAds.map((row) => {
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
            </section>
          </div>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
