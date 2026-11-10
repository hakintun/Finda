import Link from "next/link";
import {
  JijiAdCard,
  MarketplaceFooter,
  TopBar,
} from "@/components/buyer/shell";
import { RevealPhoneButton } from "@/components/buyer/reveal-phone-button";
import { SaveAdButton } from "@/components/buyer/save-ad-button";
import {
  FreshnessTag,
  StockBadge,
  VerificationBadge,
} from "@/components/ui";
import { getDB } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { formatNairaFromKobo } from "@/lib/format";
import { shopOpenState } from "@/lib/freshness";
import { mapDbStockToUi, mapDbTierToUi } from "@/lib/buyer-ops";
import { queryBuyerCatalog, toResultCardListing } from "@/lib/buyer-cards";
import { getCategoryVisual } from "@/lib/category-visuals";
import {
  flagListingReport,
  recordTripOutcome,
  startConfirmForMe,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function JijiItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    reported?: string;
    feedback?: string;
    demoted?: string;
  }>;
}) {
  const [{ id: itemId }, sp, customerSession] = await Promise.all([
    params,
    searchParams,
    getCustomerSession(),
  ]);

  const db = getDB();
  const topCustomer = customerSession
    ? {
        name: customerSession.user.name,
        role: customerSession.user.role,
        isVerified: Boolean(customerSession.user.is_verified),
        hasShop: Boolean(customerSession.shop),
      }
    : null;

  const listing = (db.listings || []).find(
    (l: any) => l.id === itemId && l.status === "active"
  );
  const seller = listing
    ? (db.sellers || []).find(
        (s: any) => s.id === listing.seller_id && s.status === "active"
      )
    : null;

  // Immediately hides delisted items OR delisted/banned customers in real time!
  if (!listing || !seller) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#F2F4F7]">
        <TopBar customer={topCustomer} />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-14 text-center">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-xs space-y-4">
            <div className="text-4xl">📦</div>
            <h1 className="text-xl font-extrabold text-[#111827]">
              This ad is no longer available
            </h1>
            <p className="text-sm text-[#4B5563]">
              The seller may have sold out or this listing was removed by
              marketplace moderation.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <Link href="/search" className="btn btn-primary">
                Browse Active Ads
              </Link>
              <Link href="/" className="btn">
                Marketplace Home
              </Link>
            </div>
          </div>
        </main>
        <MarketplaceFooter />
      </div>
    );
  }

  const zone = (db.zones || []).find((z: any) => z.id === seller.zone_id);
  const openState = shopOpenState(seller.hours || seller.opening_hours);
  const vis = getCategoryVisual(listing.category || seller.primary_category);
  const unitLabel = listing.pack_size || listing.unit || "each";

  const similar = queryBuyerCatalog(db, {
    category: listing.category || seller.primary_category,
    sort: "freshest",
    limit: 4,
  })
    .results.filter((r) => r.listing.id !== listing.id)
    .slice(0, 3);

  return (
    <div className="min-h-dvh flex flex-col bg-[#F2F4F7]">
      <TopBar
        activeClusterLabel={zone?.name || "Port Harcourt"}
        customer={topCustomer}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 space-y-6">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-[#6B7280]"
        >
          <Link href="/" className="hover:text-[#00B53F]">
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/search?category=${encodeURIComponent(
              listing.category || seller.primary_category || ""
            )}`}
            className="hover:text-[#00B53F]"
          >
            {listing.category || seller.primary_category}
          </Link>
          {zone ? (
            <>
              <span>/</span>
              <Link
                href={`/search?zone=${encodeURIComponent(zone.id)}`}
                className="hover:text-[#00B53F]"
              >
                {zone.name}
              </Link>
            </>
          ) : null}
          <span>/</span>
          <span className="font-semibold text-[#111827] truncate max-w-xs">
            {listing.title_as_listed}
          </span>
        </nav>

        {sp.reported === "1" ? (
          <div className="notice notice-ok">
            ✓ Report submitted. Finda&apos;s moderation team reviews every
            report promptly.
          </div>
        ) : null}
        {sp.demoted === "1" ? (
          <div className="notice notice-warn">
            Thanks — 3 distinct buyers reported this item out of stock, so its
            status was automatically set to <strong>Unconfirmed</strong>.
          </div>
        ) : sp.feedback ? (
          <div className="notice notice-ok">
            ✓ Feedback saved! Thank you for keeping Port Harcourt prices
            accurate.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* LEFT COLUMN: Showcase + Specs + Confirm Availability */}
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xs">
              {/* Visual Banner */}
              <div
                className="relative flex h-64 sm:h-72 items-center justify-center border-b border-[#F2F4F7]"
                style={{ backgroundColor: vis.bg }}
              >
                <span aria-hidden="true" className="text-7xl select-none">
                  {vis.emoji}
                </span>

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <StockBadge status={mapDbStockToUi(listing.stock_status)} />
                </div>

                <div className="absolute right-4 top-4">
                  <SaveAdButton listingId={listing.id} compact={false} />
                </div>

                <div className="absolute bottom-3 left-4 rounded-lg bg-white/95 px-3 py-1 text-xs font-bold shadow-2xs">
                  <FreshnessTag confirmedAt={listing.confirmed_at} />
                </div>
              </div>

              {/* Title, Location & Specs */}
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-[#111827]">
                      {listing.title_as_listed}
                    </h1>
                    <p className="mt-1.5 text-sm text-[#4B5563]">
                      📍 <strong>{zone?.name || "Port Harcourt"}</strong> ·{" "}
                      {seller.landmark_text}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-black text-[#00B53F] tabular-nums">
                      {formatNairaFromKobo(listing.price_kobo)}
                    </p>
                    <p className="text-xs font-semibold text-[#6B7280]">
                      {listing.price_negotiable ? "Negotiable" : "Fixed Shop Price"}
                    </p>
                  </div>
                </div>

                {/* Jiji-style Structured Attributes Grid */}
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F8FAFC] border border-[#E5E7EB] p-4 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Condition
                    </span>
                    <span className="font-bold text-[#111827] capitalize">
                      {listing.condition || "Brand New"}
                    </span>
                  </div>
                  <div>
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Unit / Pack
                    </span>
                    <span className="font-bold text-[#111827]">{unitLabel}</span>
                  </div>
                  <div>
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Category
                    </span>
                    <span className="font-bold text-[#111827]">
                      {listing.category || seller.primary_category}
                    </span>
                  </div>
                  <div>
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Market Zone
                    </span>
                    <span className="font-bold text-[#111827]">
                      {zone?.name || "Port Harcourt"}
                    </span>
                  </div>
                  <div>
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Shop Hours
                    </span>
                    <span
                      className={`font-bold ${
                        openState.open === false
                          ? "text-[#991B1B]"
                          : "text-[#00B53F]"
                      }`}
                    >
                      {openState.label}
                    </span>
                  </div>
                  <div>
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Views (7d)
                    </span>
                    <span className="font-bold text-[#111827]">
                      {listing.views_7d || 1} views
                    </span>
                  </div>
                </div>

                {/* 1-Tap Confirm Availability Before Making the Trip */}
                <form
                  action={startConfirmForMe}
                  className="rounded-2xl border-2 border-[#00B53F] bg-[#ECFDF5]/60 p-4 space-y-3"
                >
                  <input type="hidden" name="listing_id" value={listing.id} />
                  <div>
                    <p className="text-sm font-extrabold text-[#065F46]">
                      ⚡ Ask Seller: &ldquo;Is this still in stock at{" "}
                      {formatNairaFromKobo(listing.price_kobo)}?&rdquo;
                    </p>
                    <p className="text-xs text-[#374151]">
                      Get a 1-tap Yes/No confirmation from{" "}
                      <strong>{seller.business_name}</strong> before paying
                      transport fare.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      name="buyer_name"
                      type="text"
                      defaultValue={customerSession?.user?.name || ""}
                      placeholder="Your name"
                      className="min-h-11 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-3 text-sm"
                    />
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl bg-[#00B53F] px-5 text-sm font-extrabold text-white hover:bg-[#009933] cursor-pointer"
                    >
                      ✓ Confirm Stock Now
                    </button>
                  </div>
                </form>

                {/* Buyer Trip Accuracy Feedback */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F2F4F7] pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#4B5563]">
                      Visited this stall recently?
                    </span>
                    <form action={recordTripOutcome} className="inline">
                      <input
                        type="hidden"
                        name="listing_id"
                        value={listing.id}
                      />
                      <input
                        type="hidden"
                        name="return_to"
                        value={`/item/${listing.id}`}
                      />
                      <input type="hidden" name="verdict" value="got_it" />
                      <button
                        type="submit"
                        className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-bold text-[#00B53F] hover:bg-[#ECFDF5] cursor-pointer"
                      >
                        ✓ Yes, got it
                      </button>
                    </form>
                    <form action={recordTripOutcome} className="inline">
                      <input
                        type="hidden"
                        name="listing_id"
                        value={listing.id}
                      />
                      <input
                        type="hidden"
                        name="return_to"
                        value={`/item/${listing.id}`}
                      />
                      <input
                        type="hidden"
                        name="verdict"
                        value="not_available"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-bold text-[#991B1B] hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        ✗ Out of stock
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </section>

            {/* Similar Ads */}
            {similar.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#111827]">
                  Similar Ads in Port Harcourt
                </h2>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  {similar.map((row) => {
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
            ) : null}
          </div>

          {/* RIGHT COLUMN: Jiji Seller Contact Box + Safety Tips + Report */}
          <aside className="space-y-4">
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Seller Information
                </span>
                <Link
                  href={`/s/${seller.slug}`}
                  className="block text-lg font-extrabold text-[#111827] hover:text-[#00B53F]"
                >
                  {seller.business_name}
                </Link>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <VerificationBadge
                    tier={mapDbTierToUi(seller.verification_tier)}
                  />
                  <span className="rounded-full bg-[#F2F4F7] px-2.5 py-0.5 text-[11px] font-bold text-[#374151]">
                    {Math.round((seller.accuracy_score ?? 0.9) * 100)}% accuracy
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] p-3 text-xs space-y-1">
                <p className="font-bold text-[#111827]">
                  📍 {zone?.name || "Port Harcourt"}
                </p>
                <p className="text-[#4B5563]">{seller.landmark_text}</p>
                {seller.ask_for || seller.owner_name ? (
                  <p className="text-[#374151]">
                    🗣️ Ask for:{" "}
                    <strong>{seller.ask_for || seller.owner_name}</strong>
                  </p>
                ) : null}
              </div>

              <div className="space-y-2.5">
                <RevealPhoneButton
                  sellerId={seller.id}
                  sellerName={seller.business_name}
                  listingId={listing.id}
                  itemTitle={listing.title_as_listed}
                />

                <Link
                  href={`/s/${seller.slug}/map`}
                  className="btn btn-block"
                >
                  🗺️ View Landmark & Map
                </Link>

                <Link
                  href={`/s/${seller.slug}`}
                  className="block text-center text-xs font-bold text-[#00B53F] hover:underline pt-1"
                >
                  View all items from this shop →
                </Link>
              </div>
            </section>

            {/* Jiji Safety Tips Box */}
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs space-y-2.5">
              <h2 className="text-sm font-extrabold text-[#111827]">
                🛡️ Safety tips for buyers
              </h2>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-[#4B5563]">
                <li>
                  Tap <strong>Confirm Stock Now</strong> before travelling to the
                  market.
                </li>
                <li>
                  Meet at the listed market stall landmark during daylight
                  opening hours.
                </li>
                <li>
                  Inspect the item thoroughly and confirm the price before
                  paying.
                </li>
                <li>Avoid paying in advance before seeing the item.</li>
              </ul>
            </section>

            {/* Report Abuse */}
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs">
              <details className="text-xs">
                <summary className="cursor-pointer font-bold text-[#991B1B] text-center">
                  🚩 Report Abuse / Wrong Price
                </summary>
                <form
                  action={flagListingReport}
                  className="mt-3 space-y-2.5 border-t border-[#F2F4F7] pt-3"
                >
                  <input type="hidden" name="listing_id" value={listing.id} />
                  <input
                    type="hidden"
                    name="return_to"
                    value={`/item/${listing.id}`}
                  />
                  <select
                    name="reason"
                    defaultValue="wrong_price"
                    className="min-h-10 w-full rounded-xl border border-[#D1D5DB] bg-white px-3 text-xs"
                  >
                    <option value="wrong_price">Price is different at shop</option>
                    <option value="not_available">Item out of stock</option>
                    <option value="wrong_location">Wrong market landmark</option>
                    <option value="counterfeit">Suspected fake / unsafe</option>
                  </select>
                  <input
                    name="note"
                    type="text"
                    placeholder="Short note (optional)"
                    className="min-h-10 w-full rounded-xl border border-[#D1D5DB] px-3 text-xs"
                  />
                  <button
                    type="submit"
                    className="btn btn-danger btn-sm btn-block"
                  >
                    Submit Report
                  </button>
                </form>
              </details>
            </section>
          </aside>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
