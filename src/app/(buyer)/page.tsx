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

const QUICK_SEARCHES = [
  { label: "I better pass my neighbour", q: "i better pass my neighbour" },
  { label: "Generator", q: "generator" },
  { label: "Dangote Cement", q: "cement" },
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
  const activeSellers = (db.sellers || []).filter(
    (s: any) => s.status === "active"
  );

  const { results: allLive, total } = queryBuyerCatalog(db, {
    sort: "freshest",
    limit: 200,
  });

  // Per-category live item counts
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

  // Per-zone live counts for the "Market Pulse" Bento Card
  const zoneStats = zones.map((z: any) => {
    const shopCount = activeSellers.filter((s: any) => s.zone_id === z.id).length;
    const itemCount = allLive.filter((h) => h.seller.zone_id === z.id).length;
    return { zone: z, shopCount, itemCount };
  });

  const featuredStock = allLive.slice(0, 15);

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
        activeClusterLabel={`${activeSellers.length} stalls · Port Harcourt`}
        customer={topCustomer}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 space-y-8">
        {/* Unique Finda Asymmetric Deep-Forest Bento Hero */}
        <section className="finda-canopy overflow-hidden rounded-3xl border border-[#065F46]/40 p-6 sm:p-8 lg:p-10 text-white shadow-lg">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
            {/* Left: Editorial Copy + Unified Search Dock */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#10B981]/30 bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#FDE68A]">
                <span className="h-2 w-2 rounded-full bg-[#34D399]" />
                Port Harcourt Live Inventory Radar
              </div>

              <h1 className="text-2xl font-black tracking-tight leading-tight sm:text-4xl">
                Check real stall prices &amp; stock{" "}
                <span className="text-[#A7F3D0]">before you enter market.</span>
              </h1>

              <p className="max-w-xl text-sm text-white/80 leading-relaxed">
                Search {total} freshly confirmed items across{" "}
                {activeSellers.length} verified Port Harcourt shops — complete
                with Keke/Bolt street landmarks and 1-tap seller confirmation.
              </p>

              {/* Elevated White Search Command Bar */}
              <form
                action="/search"
                method="get"
                role="search"
                className="rounded-2xl bg-white p-2 shadow-md flex flex-col gap-2 sm:flex-row"
              >
                <select
                  name="zone"
                  defaultValue="all"
                  aria-label="Choose Port Harcourt market hub"
                  className="min-h-12 rounded-xl border border-[#E4E1D6] bg-[#F8F7F2] px-3.5 text-xs font-extrabold text-[#111827] sm:w-48"
                >
                  <option value="all">📍 All Markets</option>
                  {zones.map((z: any) => (
                    <option key={z.id} value={z.id}>
                      📍 {z.name}
                    </option>
                  ))}
                </select>

                <input
                  name="q"
                  type="search"
                  placeholder="Search item, brand, or Pidgin slang…"
                  className="min-h-12 flex-1 rounded-xl border-0 bg-white px-3.5 text-sm font-medium text-[#111827] placeholder:text-[#6B7280] focus:outline-none"
                />

                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-[#064E3B] px-6 text-sm font-extrabold text-white hover:bg-[#043927] cursor-pointer"
                >
                  Find Stock
                </button>
              </form>

              {/* Local Pidgin & Slang Quick Searches */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#A7F3D0] mr-1">
                  Try:
                </span>
                {QUICK_SEARCHES.map((chip) => (
                  <Link
                    key={chip.q}
                    href={`/search?q=${encodeURIComponent(chip.q)}`}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/95 hover:bg-white/20"
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: Live Port Harcourt Market Hubs Bento Panel */}
            <div className="rounded-2xl border border-white/15 bg-[#032B1E]/75 p-5 backdrop-blur-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#FDE68A]">
                  Jump into a Market Hub
                </span>
                <Link
                  href="/market-data"
                  className="text-[11px] font-bold text-[#A7F3D0] hover:underline"
                >
                  Price Index →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {zoneStats.map(({ zone, shopCount, itemCount }) => (
                  <Link
                    key={zone.id}
                    href={`/search?zone=${encodeURIComponent(zone.id)}`}
                    className="group rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-[#6EE7B7]/60 hover:bg-white/10"
                  >
                    <p className="text-sm font-extrabold text-white group-hover:text-[#FDE68A] truncate">
                      {zone.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/70 truncate">
                      {shopCount} stalls · {itemCount} items
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tactile Category Deck (Replaces vertical classifieds sidebar) */}
        <section aria-labelledby="cat-deck-heading" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2
              id="cat-deck-heading"
              className="text-base font-extrabold tracking-tight text-[#111827]"
            >
              Browse by Market Department
            </h2>
            <Link
              href="/search"
              className="text-xs font-bold text-[#064E3B] hover:underline"
            >
              View full catalog →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {categoryList.map((cat) => (
              <Link
                key={cat.name}
                href={`/search?category=${encodeURIComponent(cat.name)}`}
                className="group flex items-center gap-3 rounded-2xl border border-[#E4E1D6] bg-white p-3 shadow-2xs transition hover:border-[#064E3B] hover:shadow-xs"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{ backgroundColor: cat.visual.bg }}
                >
                  {cat.visual.emoji}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-[#111827] group-hover:text-[#064E3B]">
                    {cat.name}
                  </p>
                  <p className="text-[11px] font-medium text-[#6B7280]">
                    {cat.count} live
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Finda Distinct Trust Strip */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E4E1D6] bg-white p-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-base font-black text-[#064E3B]">
              01
            </span>
            <div>
              <p className="text-xs font-extrabold text-[#111827]">
                Honest Freshness Timestamps
              </p>
              <p className="mt-0.5 text-[11px] text-[#4B5563]">
                Stale prices (&gt;14 days) expire automatically so you never
                chase old numbers.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E4E1D6] bg-white p-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFFBEB] text-base font-black text-[#92400E]">
              02
            </span>
            <div>
              <p className="text-xs font-extrabold text-[#111827]">
                1-Tap “Still in Stock?” Check
              </p>
              <p className="mt-0.5 text-[11px] text-[#4B5563]">
                Ping the trader before boarding a Keke or Bolt and get a live
                Yes/No confirmation.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E4E1D6] bg-white p-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-base font-black text-[#064E3B]">
              03
            </span>
            <div>
              <p className="text-xs font-extrabold text-[#111827]">
                Verified via Email, SMS &amp; WhatsApp
              </p>
              <p className="mt-0.5 text-[11px] text-[#4B5563]">
                Verified stalls plus street-level landmarks (“Opposite St
                Paul&apos;s, Line 3”).
              </p>
            </div>
          </div>
        </section>

        {/* Freshly Confirmed Live Stock Grid */}
        <section aria-labelledby="live-stock-heading" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2
                id="live-stock-heading"
                className="text-xl font-black tracking-tight text-[#111827]"
              >
                Freshly Confirmed Stock
              </h2>
              <p className="text-xs text-[#4B5563]">
                Updated directly by Port Harcourt shop owners and market agents
              </p>
            </div>
            <Link
              href="/search?sort=freshest"
              className="rounded-xl border border-[#D1CEC2] bg-white px-3.5 py-2 text-xs font-extrabold text-[#064E3B] hover:border-[#064E3B]"
            >
              Browse all {total} items →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredStock.map((row) => {
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
      </main>

      <MarketplaceFooter />
    </div>
  );
}
