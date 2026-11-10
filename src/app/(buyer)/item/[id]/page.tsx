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

export default async function FindaStockDetailPage({
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
      <div className="min-h-dvh flex flex-col bg-[#F8F7F2]">
        <TopBar customer={topCustomer} />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-14 text-center">
          <div className="rounded-2xl border border-[#E4E1D6] bg-white p-8 shadow-xs space-y-4">
            <div className="text-4xl">📦</div>
            <h1 className="text-xl font-extrabold text-[#111827]">
              This stock item is no longer active
            </h1>
            <p className="text-sm text-[#4B5563]">
              The trader may have sold out or this listing was removed by
              marketplace moderation.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <Link href="/search" className="btn btn-primary">
                Explore Live Stock
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
    <div className="min-h-dvh flex flex-col bg-[#F8F7F2]">
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
          <Link href="/" className="hover:text-[#064E3B]">
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/search?category=${encodeURIComponent(
              listing.category || seller.primary_category || ""
            )}`}
            className="hover:text-[#064E3B]"
          >
            {listing.category || seller.primary_category}
          </Link>
          {zone ? (
            <>
              <span>/</span>
              <Link
                href={`/search?zone=${encodeURIComponent(zone.id)}`}
                className="hover:text-[#064E3B]"
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
            ✓ Report submitted. Finda&apos;s market team reviews every report
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
          {/* LEFT COLUMN: Finda Live-Stock Ticket Sheet */}
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-[#E4E1D6] bg-white shadow-xs">
              {/* Distinctive Deep Forest Top Status Band */}
              <div className="finda-canopy px-6 py-5 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1 text-xs font-bold text-[#FDE68A]">
                    <span>{vis.emoji}</span>
                    <span>{vis.shortLabel}</span>
                  </span>
                  <StockBadge status={mapDbStockToUi(listing.stock_status)} />
                </div>

                <SaveAdButton listingId={listing.id} compact={false} />
              </div>

              {/* Main Price, Freshness & Specs */}
              <div className="p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[#DFDCD2] pb-5">
                  <div className="space-y-1.5">
                    <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">
                      {listing.title_as_listed}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <FreshnessTag confirmedAt={listing.confirmed_at} />
                      <span className="text-[#6B7280]">
                        · {listing.views_7d || 1} recent checks
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-left sm:text-right">
                    <p className="text-2xl font-black text-[#064E3B] tabular-nums">
                      {formatNairaFromKobo(listing.price_kobo)}
                    </p>
                    <p className="text-[11px] font-bold text-[#065F46]">
                      {listing.price_negotiable
                        ? `Negotiable · per ${unitLabel}`
                        : `Stall price · per ${unitLabel}`}
                    </p>
                  </div>
                </div>

                {/* Spec Tiles */}
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F8F7F2] border border-[#E4E1D6] p-4 sm:grid-cols-3 text-xs">
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
                      Selling Unit
                    </span>
                    <span className="font-bold text-[#111827]">{unitLabel}</span>
                  </div>
                  <div>
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Department
                    </span>
                    <span className="font-bold text-[#111827]">
                      {listing.category || seller.primary_category}
                    </span>
                  </div>
                  <div>
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Market Hub
                    </span>
                    <span className="font-bold text-[#111827]">
                      {zone?.name || "Port Harcourt"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block uppercase text-[10px] font-bold text-[#6B7280]">
                      Opening Status
                    </span>
                    <span
                      className={`font-bold ${
                        openState.open === false
                          ? "text-[#991B1B]"
                          : "text-[#064E3B]"
                      }`}
                    >
                      {openState.label}
                    </span>
                  </div>
                </div>

                {/* 1-Tap Confirm Availability Before Making the Trip */}
                <form
                  action={startConfirmForMe}
                  className="rounded-2xl border-2 border-[#064E3B] bg-[#ECFDF5]/65 p-5 space-y-3"
                >
                  <input type="hidden" name="listing_id" value={listing.id} />
                  <div>
                    <p className="text-sm font-extrabold text-[#042F22]">
                      ⚡ Ask Trader Before Leaving Home: &ldquo;Still on ground
                      at {formatNairaFromKobo(listing.price_kobo)}?&rdquo;
                    </p>
                    <p className="text-xs text-[#374151]">
                      Sends an instant 1-tap Yes/No ping to{" "}
                      <strong>{seller.business_name}</strong> so you don&apos;t
                      waste transport fare.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      name="buyer_name"
                      type="text"
                      defaultValue={customerSession?.user?.name || ""}
                      placeholder="Your first name"
                      className="min-h-11 flex-1 rounded-xl border border-[#D1CEC2] bg-white px-3 text-sm"
                    />
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl bg-[#064E3B] px-5 text-sm font-extrabold text-white hover:bg-[#043927] cursor-pointer"
                    >
                      ✓ Check Availability
                    </button>
                  </div>
                </form>

                {/* Buyer Trip Accuracy Feedback */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F1EFE7] pt-4">
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
                        className="rounded-lg border border-[#D1CEC2] bg-white px-3 py-1.5 text-xs font-bold text-[#064E3B] hover:bg-[#ECFDF5] cursor-pointer"
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
                        className="rounded-lg border border-[#D1CEC2] bg-white px-3 py-1.5 text-xs font-bold text-[#991B1B] hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        ✗ Out of stock
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </section>

            {/* Other Stalls Carrying Similar Stock */}
            {similar.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#111827]">
                  Compare Other Port Harcourt Stalls
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

          {/* RIGHT COLUMN: Stall Landmark Ticket + Protected Contact + Report */}
          <aside className="space-y-4">
            <section className="rounded-3xl border border-[#E4E1D6] bg-white p-5 shadow-xs space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Verified Stall Profile
                </span>
                <Link
                  href={`/s/${seller.slug}`}
                  className="block text-lg font-extrabold text-[#111827] hover:text-[#064E3B]"
                >
                  {seller.business_name}
                </Link>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <VerificationBadge
                    tier={mapDbTierToUi(seller.verification_tier)}
                  />
                  <span className="rounded-full bg-[#F1EFE7] px-2.5 py-0.5 text-[11px] font-bold text-[#374151]">
                    {Math.round((seller.accuracy_score ?? 0.9) * 100)}% accuracy
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-[#F8F7F2] border border-[#E4E1D6] p-3.5 text-xs space-y-1.5">
                <p className="font-extrabold text-[#064E3B]">
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
                  className="btn btn-block"
                >
                  🗺️ Street Landmark &amp; Pin Map
                </Link>

                <Link
                  href={`/s/${seller.slug}`}
                  className="block text-center text-xs font-bold text-[#064E3B] hover:underline pt-1"
                >
                  See all stock in this stall →
                </Link>
              </div>
            </section>

            {/* Buyer Market Tips */}
            <section className="rounded-2xl border border-[#E4E1D6] bg-white p-5 shadow-2xs space-y-2">
              <h2 className="text-sm font-extrabold text-[#111827]">
                🧭 Smart Market Trip Checklist
              </h2>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-[#4B5563]">
                <li>
                  Tap <strong>Check Availability</strong> before taking a Keke
                  or Bolt.
                </li>
                <li>
                  Give your driver the exact street landmark shown above.
                </li>
                <li>
                  Inspect the item at the stall before making any transfer.
                </li>
              </ul>
            </section>

            {/* Report */}
            <section className="rounded-2xl border border-[#E4E1D6] bg-white p-4 shadow-2xs">
              <details className="text-xs">
                <summary className="cursor-pointer font-bold text-[#991B1B] text-center">
                  🚩 Flag Wrong Price or Issue
                </summary>
                <form
                  action={flagListingReport}
                  className="mt-3 space-y-2.5 border-t border-[#F1EFE7] pt-3"
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
                    className="min-h-10 w-full rounded-xl border border-[#D1CEC2] bg-white px-3 text-xs"
                  >
                    <option value="wrong_price">Price is different at stall</option>
                    <option value="not_available">Item out of stock</option>
                    <option value="wrong_location">Wrong street landmark</option>
                    <option value="counterfeit">Suspected fake / unsafe</option>
                  </select>
                  <input
                    name="note"
                    type="text"
                    placeholder="Short note (optional)"
                    className="min-h-10 w-full rounded-xl border border-[#D1CEC2] px-3 text-xs"
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
