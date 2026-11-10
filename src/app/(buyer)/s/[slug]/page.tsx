import Link from "next/link";
import { TopBar } from "@/components/buyer/shell";
import { RevealPhoneButton } from "@/components/buyer/reveal-phone-button";
import {
  FreshnessTag,
  PriceDisplay,
  StockBadge,
  VerificationBadge,
} from "@/components/ui";
import { getDB } from "@/lib/db";
import { freshnessState, shopOpenState } from "@/lib/freshness";
import { mapDbStockToUi, mapDbTierToUi } from "@/lib/buyer-ops";
import {
  flagListingReport,
  recordTripOutcome,
  startConfirmForMe,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function PublicShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    confirm?: string;
    reported?: string;
    feedback?: string;
    demoted?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const db = getDB();

  const seller = (db.sellers || []).find(
    (s: any) =>
      s.slug === slug && s.status !== "suspended" && s.status !== "banned"
  );

  // Graceful, helpful empty state for unknown slugs (e.g. /s/does-not-exist — Check T17)
  if (!seller) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
        <TopBar />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
          <div className="rounded-2xl border border-[#D1D5DB] bg-white p-6 text-center space-y-4 shadow-xs">
            <div className="text-4xl" aria-hidden="true">
              🏪
            </div>
            <h1 className="text-xl font-extrabold text-[#111827]">
              We couldn&apos;t find shop &ldquo;{slug}&rdquo;
            </h1>
            <p className="text-sm text-[#4B5563]">
              The QR link may have a typo, or the trader may have moved stalls.
              Search active Port Harcourt shops below instead.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <Link href="/search" className="btn btn-primary">
                Search Port Harcourt shops
              </Link>
              <Link href="/" className="btn">
                Back to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const zone = (db.zones || []).find((z: any) => z.id === seller.zone_id);
  const openState = shopOpenState(seller.hours || seller.opening_hours);
  const askFor = seller.ask_for || seller.owner_name;
  const listings = (db.listings || [])
    .filter(
      (l: any) =>
        l.seller_id === seller.id &&
        l.status === "active" &&
        freshnessState(l.confirmed_at) !== "expired"
    )
    .sort(
      (a: any, b: any) =>
        new Date(b.confirmed_at || 0).getTime() -
        new Date(a.confirmed_at || 0).getTime()
    );

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
      <TopBar activeClusterLabel={zone?.name || "Port Harcourt"} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-5 space-y-5">
        {sp.reported === "1" ? (
          <div className="notice notice-ok">
            ✓ Report received. Our Port Harcourt market ops team reviews every
            report within 24 hours.
          </div>
        ) : null}
        {sp.demoted === "1" ? (
          <div className="notice notice-warn">
            Thanks — 3 distinct buyers reported that item unavailable, so its
            status was automatically changed to <strong>Unconfirmed</strong>.
          </div>
        ) : sp.feedback ? (
          <div className="notice notice-ok">
            ✓ Trip feedback recorded. Thank you for helping other buyers!
          </div>
        ) : null}

        {/* Shop Header Card */}
        <section className="rounded-2xl border border-[#D1D5DB] bg-white p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">
                {seller.business_name}
              </h1>
              <p className="mt-1 text-xs font-semibold text-[#4B5563]">
                {seller.primary_category} · {zone?.name || "Port Harcourt"}
              </p>
            </div>
            <VerificationBadge tier={mapDbTierToUi(seller.verification_tier)} />
          </div>

          <div className="rounded-xl bg-[#F3F2EC] p-3.5 text-sm space-y-1">
            <p className="font-bold text-[#111827]">
              📍 {zone?.name ? `${zone.name} — ` : ""}
              {seller.landmark_text}
            </p>
            {askFor ? (
              <p className="text-xs text-[#374151]">
                🗣️ Who to ask for: <strong>{askFor}</strong>
              </p>
            ) : null}
            <p className="text-xs text-[#4B5563]">
              🕒{" "}
              {openState.open === false ? (
                <span className="font-semibold text-[#991B1B]">
                  {openState.label}
                </span>
              ) : (
                <span className="font-semibold text-[#065F46]">
                  {openState.label}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link href={`/s/${seller.slug}/map`} className="btn btn-primary">
              🗺️ Directions & Map
            </Link>
            <RevealPhoneButton
              sellerId={seller.id}
              sellerName={seller.business_name}
            />
          </div>
        </section>

        {/* Active Shop Inventory */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold text-[#111827]">
              Current Stock & Prices ({listings.length})
            </h2>
            <Link
              href="/search"
              className="text-xs font-semibold text-[#065F46] hover:underline"
            >
              Compare across markets →
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-2xl border border-[#D1D5DB] bg-white p-6 text-center text-sm text-[#4B5563]">
              This shop has no recently confirmed items (&le;14 days). Use{" "}
              <strong>Show phone number</strong> above to check before visiting.
            </div>
          ) : (
            listings.map((item: any) => {
              const highlightConfirm = sp.confirm === item.id;
              const unitLabel = item.pack_size || item.unit;
              return (
                <article
                  id={`item-${item.id}`}
                  key={item.id}
                  className={`rounded-2xl border bg-white p-4 space-y-3 shadow-xs ${
                    highlightConfirm
                      ? "border-2 border-[#065F46] ring-2 ring-[#A7F3D0]"
                      : "border-[#D1D5DB]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#111827]">
                        {item.title_as_listed}
                      </h3>
                      {unitLabel ? (
                        <p className="text-xs text-[#4B5563]">
                          Unit: {unitLabel}
                        </p>
                      ) : null}
                    </div>
                    <PriceDisplay
                      priceKobo={item.price_kobo}
                      negotiable={Boolean(item.price_negotiable)}
                      size="lg"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StockBadge status={mapDbStockToUi(item.stock_status)} />
                    <FreshnessTag confirmedAt={item.confirmed_at} />
                  </div>

                  {/* Primary Action: 1-Tap "Confirm for me" before travelling (US-4.1) */}
                  <form
                    action={startConfirmForMe}
                    className="rounded-xl border border-[#E5E7EB] bg-[#FAF9F5] p-3 space-y-2"
                  >
                    <input type="hidden" name="listing_id" value={item.id} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#111827]">
                        Ask seller: &ldquo;Still in stock at this price?&rdquo;
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        name="buyer_name"
                        type="text"
                        placeholder="Your first name (optional)"
                        className="min-h-10 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-3 text-xs"
                      />
                      <button type="submit" className="btn btn-primary btn-sm">
                        ✓ Confirm for me
                      </button>
                    </div>
                  </form>

                  {/* Trip Accuracy Feedback (US-3.2: 3 strikes -> unconfirmed) & 2-Tap Report */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F3F2EC]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#4B5563]">
                        Visited shop?
                      </span>
                      <form action={recordTripOutcome} className="inline">
                        <input type="hidden" name="listing_id" value={item.id} />
                        <input
                          type="hidden"
                          name="return_to"
                          value={`/s/${seller.slug}`}
                        />
                        <input type="hidden" name="verdict" value="got_it" />
                        <button
                          type="submit"
                          className="rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#065F46] hover:bg-[#ECFDF5]"
                        >
                          ✓ Got it
                        </button>
                      </form>
                      <form action={recordTripOutcome} className="inline">
                        <input type="hidden" name="listing_id" value={item.id} />
                        <input
                          type="hidden"
                          name="return_to"
                          value={`/s/${seller.slug}`}
                        />
                        <input
                          type="hidden"
                          name="verdict"
                          value="not_available"
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#991B1B] hover:bg-[#FEF2F2]"
                        >
                          ✗ Out of stock
                        </button>
                      </form>
                    </div>

                    <details className="text-xs">
                      <summary className="cursor-pointer font-semibold text-[#4B5563] hover:text-[#991B1B]">
                        Report listing
                      </summary>
                      <form
                        action={flagListingReport}
                        className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-2.5"
                      >
                        <input
                          type="hidden"
                          name="listing_id"
                          value={item.id}
                        />
                        <input
                          type="hidden"
                          name="seller_slug"
                          value={seller.slug}
                        />
                        <select
                          name="reason"
                          defaultValue="wrong_price"
                          className="min-h-9 rounded-lg border border-[#FCA5A5] bg-white px-2 text-xs"
                        >
                          <option value="wrong_price">Wrong price</option>
                          <option value="not_available">Item not there</option>
                          <option value="wrong_location">Wrong landmark</option>
                          <option value="counterfeit">Fake / unsafe</option>
                        </select>
                        <button type="submit" className="btn btn-danger btn-sm">
                          Submit report
                        </button>
                      </form>
                    </details>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
