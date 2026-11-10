import Link from "next/link";
import { ResultCard, TopBar } from "@/components/buyer/shell";
import { getDB } from "@/lib/db";
import { queryBuyerCatalog, toResultCardListing } from "@/lib/buyer-cards";

export const dynamic = "force-dynamic";

const QUICK_SEARCH_CHIPS = [
  { label: "I better pass my neighbour", q: "i better pass my neighbour" },
  { label: "Generator", q: "generator" },
  { label: "Dangote Cement", q: "cement" },
  { label: "50kg Rice", q: "50kg rice" },
  { label: "Indomine", q: "indomine" },
  { label: "Solar Battery", q: "inverter battery" },
  { label: "Cooking Gas", q: "12.5kg gas" },
];

export default function BuyerHomePage() {
  const db = getDB();
  const zones: any[] = db.zones || [];
  const activeShopsCount = (db.sellers || []).filter(
    (s: any) => s.status === "active"
  ).length;

  const { results, total } = queryBuyerCatalog(db, {
    sort: "freshest",
    limit: 6,
  });

  const categories: string[] = Array.from(
    new Set<string>(
      (db.products || []).map((p: any) => String(p.category || ""))
    )
  )
    .filter(Boolean)
    .sort()
    .slice(0, 8);

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
      <TopBar activeClusterLabel={`${activeShopsCount} shops · Port Harcourt`} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-5 space-y-6">
        {/* Hero Search Form -> /search */}
        <section aria-labelledby="hero-heading" className="space-y-3">
          <div>
            <h1
              id="hero-heading"
              className="text-2xl font-extrabold tracking-tight text-[#111827] sm:text-3xl"
            >
              Find who actually has it in stock nearby.
            </h1>
            <p className="mt-1 text-sm text-[#4B5563]">
              Check live Naira prices, stock freshness, and street landmarks
              across {zones.length} Port Harcourt markets before making the trip.
            </p>
          </div>

          <form
            action="/search"
            method="get"
            role="search"
            className="space-y-2.5"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <label htmlFor="home-q" className="sr-only">
                  Search product, brand, or Nigerian slang
                </label>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[#4B5563]"
                >
                  🔍
                </span>
                <input
                  id="home-q"
                  name="q"
                  type="search"
                  placeholder="Try 'generator', 'cement', '50kg rice', 'indomine'…"
                  className="min-h-12 w-full rounded-xl border border-[#9CA3AF] bg-white pl-10 pr-3 text-base text-[#111827] placeholder:text-[#6B7280]"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#065F46] px-5 text-sm font-bold text-white hover:bg-[#064E3B]"
              >
                Search
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="home-zone"
                className="text-xs font-semibold text-[#4B5563]"
              >
                Market area:
              </label>
              <select
                id="home-zone"
                name="zone"
                defaultValue="all"
                className="min-h-10 rounded-xl border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827]"
              >
                <option value="all">
                  All Port Harcourt ({total} active items)
                </option>
                {zones.map((z: any) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — {z.area}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {/* Local Pidgin / Slang Quick Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-xs font-semibold text-[#4B5563] mr-0.5">
              Popular:
            </span>
            {QUICK_SEARCH_CHIPS.map((chip) => (
              <Link
                key={chip.q}
                href={`/search?q=${encodeURIComponent(chip.q)}`}
                className="inline-flex min-h-9 items-center rounded-full border border-[#D1D5DB] bg-white px-3 py-1 text-xs font-semibold text-[#374151] hover:border-[#065F46] hover:text-[#065F46]"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Browse by Port Harcourt Market Zone */}
        <section aria-labelledby="zones-heading" className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <h2
              id="zones-heading"
              className="text-sm font-bold uppercase tracking-wider text-[#374151]"
            >
              Browse by Market Area
            </h2>
            <Link
              href="/market-data"
              className="text-xs font-semibold text-[#065F46] hover:underline"
            >
              View Port Harcourt Price Index →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {zones.map((z: any) => (
              <Link
                key={z.id}
                href={`/search?zone=${encodeURIComponent(z.id)}`}
                className="rounded-xl border border-[#D1D5DB] bg-white p-3 hover:border-[#065F46]"
              >
                <p className="text-sm font-bold text-[#111827]">{z.name}</p>
                <p className="mt-0.5 text-xs text-[#4B5563] line-clamp-1">
                  {z.area}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Browse by Category */}
        <section aria-labelledby="cat-heading" className="space-y-2">
          <h2
            id="cat-heading"
            className="text-sm font-bold uppercase tracking-wider text-[#374151]"
          >
            Categories
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/search?category=${encodeURIComponent(cat)}`}
                className="inline-flex min-h-10 items-center rounded-xl border border-[#D1D5DB] bg-white px-3.5 text-xs font-semibold text-[#111827] hover:bg-[#F3F2EC]"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>

        {/* Freshly Confirmed Nearby */}
        <section aria-labelledby="fresh-heading" className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2
              id="fresh-heading"
              className="text-base font-bold text-[#111827]"
            >
              Freshly confirmed in Port Harcourt
            </h2>
            <Link
              href="/search?sort=freshest"
              className="text-xs font-semibold text-[#065F46] hover:underline"
            >
              See all {total} listings →
            </Link>
          </div>

          <div className="space-y-3">
            {results.map((row) => {
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
        </section>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white px-4 py-5 text-center text-xs text-[#4B5563]">
        <p className="font-medium">
          Finda Port Harcourt Pilot · Text-first (&lt;150 KB) for 2G/3G networks
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link
            href="/sell"
            className="font-semibold text-[#065F46] hover:underline"
          >
            List your shop
          </Link>
          <Link
            href="/seller"
            className="font-semibold text-[#065F46] hover:underline"
          >
            Seller Console
          </Link>
          <Link
            href="/admin"
            className="font-semibold text-[#065F46] hover:underline"
          >
            Admin Ops
          </Link>
          <Link
            href="/market-data"
            className="font-semibold text-[#065F46] hover:underline"
          >
            Market Data
          </Link>
          <Link
            href="/test-plan"
            className="font-semibold text-[#065F46] hover:underline"
          >
            QA Test Plan
          </Link>
          <Link
            href="/design-system"
            className="font-semibold text-[#065F46] hover:underline"
          >
            UI Kit
          </Link>
          <Link
            href="/privacy"
            className="font-semibold text-[#065F46] hover:underline"
          >
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
