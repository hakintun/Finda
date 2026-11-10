import Link from "next/link";
import {
  JijiAdCard,
  MarketplaceFooter,
  TopBar,
} from "@/components/buyer/shell";
import { ProductArtwork } from "@/components/buyer/product-artwork";
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

export default async function FindaListingDetailPage({
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

  if (!listing || !seller) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
        <TopBar customer={topCustomer} />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-14 text-center">
          <div className="rounded-2xl border border-[#DEDBD0] bg-white p-8 shadow-xs space-y-4">
            <div className="text-4xl">📦</div>
            <h1 className="text-xl font-extrabold text-[#111827]">
              This listing is no longer available
            </h1>
            <p className="text-sm text-[#4B5563]">
              The seller may have sold out or this account/item was delisted by
              marketplace moderation.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <Link href="/search" className="btn btn-primary">
                Browse Active Stock
              </Link>
              <Link href="/" className="btn">
                Home
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
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
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
          <Link href="/" className="hover:text-[#065F46]">
            All Port Harcourt
          </Link>
          <span>/</span>
          <Link
            href={`/search?category=${encodeURIComponent(
              listing.category || seller.primary_category || ""
            )}`}
            prefetch={false}
            className="hover:text-[#065F46]"
          >
            {listing.category || seller.primary_category}
          </Link>
          {zone ? (
            <>
              <span>/</span>
              <Link
                href={`/search?zone=${encodeURIComponent(zone.id)}`}
                prefetch={false}
                className="hover:text-[#065F46]"
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
            ✓ Report submitted. Finda&apos;s moderation team reviews every report
            promptly.
          </div>
        ) : null}
        {sp.demoted === "1" ? (
          <div className="notice notice-warn">
            Thanks — 3 distinct buyers reported this item out of stock, so its
            status was automatically set to <strong>Unconfirmed</strong>.
          </div>
        ) : sp.feedback ? (
          <div className="notice notice-ok">
            ✓ Trip feedback recorded! Thank you for keeping Port Harcourt prices
            accurate.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* LEFT COLUMN: Jiji-style Product Showcase + Specs + Finda 1-Tap Confirm */}
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-[#DEDBD0] bg-white shadow-xs">
              {/* Bespoke Visual Product Stage */}
              <div className="relative border-b border-[#E5E2D9]">
                <ProductArtwork
                  title={listing.title_as_listed}
                  category={listing.category || seller.primary_category}
                  size="hero"
                />

                <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-white/95 px-3 py-1 text-xs font-extrabold text-[#111827] shadow-xs">
                    {vis.emoji} {vis.shortLabel}
                  </span>
                  <StockBadge status={mapDbStockToUi(listing.stock_status)} />
                </div>

                <div className="absolute right-4 top-4 z-20">
                  <SaveAdButton listingId={listing.id} compact={false} />
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-2 border-b border-dashed border-[#E2DFD5] pb-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                    <span>📍 {zone?.name || "Port Harcourt"}</span>
                    <span>·</span>
                    <FreshnessTag confirmedAt={listing.confirmed_at} />
                    <span>·</span>
                    <span>👁️ {listing.views_7d || 1} views</span>
                  </div>

                  <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">
                    {listing.title_as_listed}
                  </h1>
                </div>

                {/* Jiji-style Key Attributes Grid */}
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#FAF9F5] border border-[#E5E2D9] p-4 sm:grid-cols-3 text-xs">
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
                      Market Area
                    </span>
                    <span className="font-bold text-[#111827]">
                      {zone?.name || "Port Harcourt"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Stall Hours
                    </span>
                    <span
                      className={`font-bold ${
                        openState.open === false
                          ? "text-[#991B1B]"
                          : "text-[#065F46]"
                      }`}
                    >
                      {openState.label}
                    </span>
                  </div>
                </div>

                {/* Unique Finda Feature: 1-Tap "Confirm Availability Before Leaving Home" */}
                <form
                  action={startConfirmForMe}
                  className="rounded-2xl border-2 border-[#065F46] bg-[#ECFDF5]/65 p-5 space-y-3"
                >
                  <input type="hidden" name="listing_id" value={listing.id} />
                  <div>
                    <p className="text-sm font-extrabold text-[#043D2D]">
                      ⚡ Quick Check: &ldquo;Is this still in stock at{" "}
                      {formatNairaFromKobo(listing.price_kobo)}?&rdquo;
                    </p>
                    <p className="text-xs text-[#374151]">
                      Sends an instant 1-tap Yes/No ping to{" "}
                      <strong>{seller.business_name}</strong> before you spend
                      transport fare.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      name="buyer_name"
                      type="text"
                      defaultValue={customerSession?.user?.name || ""}
                      placeholder="Your first name"
                      className="min-h-11 flex-1 rounded-xl border border-[#CFC9BA] bg-white px-3 text-sm"
                    />
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl bg-[#065F46] px-5 text-sm font-extrabold text-white hover:bg-[#064E3B] cursor-pointer"
                    >
                      ✓ Ask Seller Now
                    </button>
                  </div>
                </form>

                {/* Buyer Trip Accuracy Feedback */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F3F2EC] pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#4B5563]">
                      Visited this stall?
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
                        className="rounded-lg border border-[#CFC9BA] bg-white px-3 py-1.5 text-xs font-bold text-[#065F46] hover:bg-[#ECFDF5] cursor-pointer"
                      >
                        ✓ Bought it at this price
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
                        className="rounded-lg border border-[#CFC9BA] bg-white px-3 py-1.5 text-xs font-bold text-[#991B1B] hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        ✗ Out of stock
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </section>

            {/* Similar Ads in Port Harcourt */}
            {similar.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#111827]">
                  Similar Ads in Port Harcourt
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

          {/* RIGHT SIDEBAR (Jiji-style Price Box + Seller Storefront + Show Contact + Safety Tips) */}
          <aside className="space-y-4">
            {/* Price Callout Card */}
            <section className="rounded-2xl border border-[#DEDBD0] bg-white p-5 shadow-xs space-y-1">
              <p className="text-3xl font-black text-[#065F46] tabular-nums">
                {formatNairaFromKobo(listing.price_kobo)}
              </p>
              <p className="text-xs font-semibold text-[#4B5563]">
                {listing.price_negotiable
                  ? `Negotiable · per ${unitLabel}`
                  : `Fixed stall price · per ${unitLabel}`}
              </p>
            </section>

            {/* Seller Storefront & Contact Card */}
            <section className="rounded-2xl border border-[#DEDBD0] bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-lg font-black text-[#065F46]">
                  {String(seller.business_name || "S")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/s/${seller.slug}`}
                    prefetch={false}
                    className="block text-base font-extrabold text-[#111827] hover:text-[#065F46] truncate"
                  >
                    {seller.business_name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <VerificationBadge
                      tier={mapDbTierToUi(seller.verification_tier)}
                    />
                    <span className="rounded-full bg-[#F3F2EC] px-2 py-0.5 text-[10px] font-bold text-[#374151]">
                      {Math.round((seller.accuracy_score ?? 0.9) * 100)}% accurate
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#FAF9F5] border border-[#E5E2D9] p-3 text-xs space-y-1">
                <p className="font-bold text-[#065F46]">
                  📍 {zone?.name || "Port Harcourt"}
                </p>
                <p className="font-medium text-[#111827]">
                  {seller.landmark_text}
                </p>
                {seller.ask_for || seller.owner_name ? (
                  <p className="text-[#4B5563]">
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
                  prefetch={false}
                  className="btn btn-block"
                >
                  🗺️ View Directions &amp; Pin Map
                </Link>

                <Link
                  href={`/s/${seller.slug}`}
                  prefetch={false}
                  className="block text-center text-xs font-bold text-[#065F46] hover:underline pt-0.5"
                >
                  View all items from this seller →
                </Link>
              </div>
            </section>

            {/* Safety Tips (Jiji-inspired buyer protection card) */}
            <section className="rounded-2xl border border-[#DEDBD0] bg-white p-5 shadow-2xs space-y-2">
              <h2 className="text-sm font-extrabold text-[#111827]">
                🛡️ Safety tips
              </h2>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-[#4B5563]">
                <li>Avoid paying in advance before inspecting the item.</li>
                <li>Meet the seller at their verified public market stall.</li>
                <li>Check the item quality and price before completing payment.</li>
              </ul>
            </section>

            {/* Report Abuse / Wrong Price */}
            <section className="rounded-2xl border border-[#DEDBD0] bg-white p-4 shadow-2xs">
              <details className="text-xs">
                <summary className="cursor-pointer font-bold text-[#991B1B] text-center">
                  🚩 Report Abuse or Wrong Price
                </summary>
                <form
                  action={flagListingReport}
                  className="mt-3 space-y-2.5 border-t border-[#F3F2EC] pt-3"
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
                    className="min-h-10 w-full rounded-xl border border-[#CFC9BA] bg-white px-3 text-xs"
                  >
                    <option value="wrong_price">Price is different at shop</option>
                    <option value="not_available">Item out of stock</option>
                    <option value="wrong_location">Wrong landmark / pin</option>
                    <option value="counterfeit">Suspected fake / unsafe</option>
                  </select>
                  <input
                    name="note"
                    type="text"
                    placeholder="Short note (optional)"
                    className="min-h-10 w-full rounded-xl border border-[#CFC9BA] px-3 text-xs"
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

            {/* Post Ad Like This CTA (Jiji sidebar prompt) */}
            <div className="rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-center space-y-2">
              <p className="text-xs font-bold text-[#065F46]">
                Have items like this in your shop?
              </p>
              <Link
                href="/sell"
                prefetch={false}
                className="btn btn-primary btn-sm btn-block"
              >
                + Post Your Stock Free
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
