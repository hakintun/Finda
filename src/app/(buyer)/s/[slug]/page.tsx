import Link from "next/link";
import {
  JijiAdCard,
  MarketplaceFooter,
  TopBar,
} from "@/components/buyer/shell";
import { RevealPhoneButton } from "@/components/buyer/reveal-phone-button";
import { VerificationBadge } from "@/components/ui";
import { getDB } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { freshnessState, shopOpenState } from "@/lib/freshness";
import { mapDbTierToUi } from "@/lib/buyer-ops";
import { toResultCardListing } from "@/lib/buyer-cards";

export const dynamic = "force-dynamic";

export default async function PublicShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    reported?: string;
    feedback?: string;
    demoted?: string;
  }>;
}) {
  const [{ slug }, sp, customerSession] = await Promise.all([
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

  const seller = (db.sellers || []).find(
    (s: any) => s.slug === slug && s.status === "active"
  );

  if (!seller) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#F8F7F2]">
        <TopBar customer={topCustomer} />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-14">
          <div className="rounded-2xl border border-[#E4E1D6] bg-white p-8 text-center space-y-4 shadow-xs">
            <div className="text-4xl" aria-hidden="true">
              🏪
            </div>
            <h1 className="text-xl font-extrabold text-[#111827]">
              Stall &ldquo;{slug}&rdquo; is not available
            </h1>
            <p className="text-sm text-[#4B5563]">
              This QR link may have a typo or the shop is currently delisted.
              Browse active Port Harcourt stalls below.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <Link href="/search" className="btn btn-primary">
                Explore Active Stalls
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
    <div className="min-h-dvh flex flex-col bg-[#F8F7F2]">
      <TopBar
        activeClusterLabel={zone?.name || "Port Harcourt"}
        customer={topCustomer}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 space-y-6">
        {sp.reported === "1" ? (
          <div className="notice notice-ok">
            ✓ Report received. Thank you for helping keep Finda accurate.
          </div>
        ) : null}

        {/* Deep Forest Storefront Banner */}
        <section className="overflow-hidden rounded-3xl border border-[#E4E1D6] bg-white shadow-xs">
          <div className="finda-canopy px-6 py-4 text-white flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#FDE68A]">
              📍 {zone?.name || "Port Harcourt"} · Verified Market Stall
            </span>
            <VerificationBadge tier={mapDbTierToUi(seller.verification_tier)} />
          </div>

          <div className="p-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-[#111827]">
                {seller.business_name}
              </h1>

              <p className="text-sm font-semibold text-[#374151]">
                🧭 {seller.landmark_text}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#4B5563]">
                {askFor ? (
                  <span>
                    🗣️ Ask for: <strong>{askFor}</strong>
                  </span>
                ) : null}
                <span>
                  🕒{" "}
                  <strong
                    className={
                      openState.open === false
                        ? "text-[#991B1B]"
                        : "text-[#064E3B]"
                    }
                  >
                    {openState.label}
                  </strong>
                </span>
                <span>
                  ⭐ {Math.round((seller.accuracy_score ?? 0.9) * 100)}% stock
                  accuracy
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/s/${seller.slug}/map`}
                className="btn btn-primary"
              >
                🗺️ Directions &amp; Pin Map
              </Link>
              <RevealPhoneButton
                sellerId={seller.id}
                sellerName={seller.business_name}
              />
            </div>
          </div>
        </section>

        {/* Storefront Stock Grid */}
        <section className="space-y-3.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold text-[#111827]">
              Confirmed Stock at {seller.business_name} ({listings.length})
            </h2>
            <Link
              href="/search"
              className="text-xs font-extrabold text-[#064E3B] hover:underline"
            >
              Compare across markets →
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-2xl border border-[#E4E1D6] bg-white p-8 text-center text-sm text-[#4B5563]">
              No active confirmed items right now. Tap{" "}
              <strong>Show phone number</strong> above to check directly with
              the stall.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((item: any) => {
                const card = toResultCardListing({
                  listing: item,
                  seller,
                  zone,
                });
                return (
                  <JijiAdCard
                    key={card.id}
                    listing={card}
                    category={item.category || seller.primary_category}
                    unit={item.pack_size || item.unit}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
