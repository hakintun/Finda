import Link from "next/link";
import { MarketplaceFooter, TopBar } from "@/components/buyer/shell";
import { RevealPhoneButton } from "@/components/buyer/reveal-phone-button";
import { PriceDisplay, VerificationBadge } from "@/components/ui";
import { getDB } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { mapDbTierToUi } from "@/lib/buyer-ops";

export const dynamic = "force-dynamic";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export default async function BuyerConfirmRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id: reqId }, customerSession] = await Promise.all([
    params,
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

  const request = (db.confirm_requests || []).find((r: any) => r.id === reqId);
  const listing = request
    ? (db.listings || []).find(
        (l: any) => l.id === request.listing_id && l.status === "active"
      )
    : null;
  const seller = listing
    ? (db.sellers || []).find(
        (s: any) => s.id === listing.seller_id && s.status === "active"
      )
    : null;

  if (!request || !listing || !seller) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#F2F4F7]">
        <TopBar customer={topCustomer} />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-14 text-center space-y-4">
          <h1 className="text-xl font-extrabold text-[#111827]">
            Availability request unavailable
          </h1>
          <p className="text-sm text-[#4B5563]">
            This request was not found or the listing is no longer active.
          </p>
          <Link href="/search" className="btn btn-primary">
            Browse Active Ads
          </Link>
        </main>
        <MarketplaceFooter />
      </div>
    );
  }

  const zone = (db.zones || []).find((z: any) => z.id === seller.zone_id);
  const elapsedMs = Date.now() - new Date(request.created_at).getTime();
  const isTimedOut =
    request.state === "pending" && elapsedMs >= THIRTY_MINUTES_MS;

  return (
    <div className="min-h-dvh flex flex-col bg-[#F8F7F2]">
      <TopBar activeClusterLabel="Availability Check" customer={topCustomer} />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 space-y-5">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 space-y-4 shadow-xs">
          {request.state === "yes" ? (
            <div className="rounded-xl border border-[#6EE7B7] bg-[#ECFDF5] p-4 space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#065F46]">
                ✓ Seller Confirmed YES
              </p>
              <h1 className="text-xl font-extrabold text-[#065F46]">
                It&apos;s in stock right now!
              </h1>
              <p className="text-xs text-[#065F46]">
                {seller.business_name} confirmed availability at{" "}
                <strong>
                  ₦
                  {Math.round(
                    (request.price_at_response ?? listing.price_kobo ?? 0) / 100
                  ).toLocaleString("en-NG")}
                </strong>
                .
              </p>
            </div>
          ) : request.state === "no" ? (
            <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-4 space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#991B1B]">
                ✗ Seller Replied NO
              </p>
              <h1 className="text-xl font-extrabold text-[#991B1B]">
                Out of stock at this shop
              </h1>
              <p className="text-xs text-[#991B1B]">
                Trip saved! Compare other Port Harcourt sellers below.
              </p>
            </div>
          ) : isTimedOut ? (
            <div className="rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-4 space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#92400E]">
                ⏱️ No reply after 30 minutes
              </p>
              <h1 className="text-xl font-extrabold text-[#92400E]">
                Seller hasn&apos;t tapped Yes/No yet
              </h1>
              <p className="text-xs text-[#92400E]">
                Reveal their phone number below to call directly or message on
                WhatsApp.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#93C5FD] bg-[#EFF6FF] p-4 space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#1E40AF]">
                ⏳ Waiting for seller reply…
              </p>
              <h1 className="text-xl font-extrabold text-[#111827]">
                Sent to {seller.business_name}
              </h1>
              <p className="text-xs text-[#1E40AF]">
                This page updates automatically in real time the moment the
                seller taps Yes or No.
              </p>
            </div>
          )}

          <div className="border-t border-[#E5E7EB] pt-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/item/${listing.id}`}
                  className="text-base font-bold text-[#111827] hover:text-[#064E3B]"
                >
                  {listing.title_as_listed}
                </Link>
                <p className="text-xs text-[#4B5563]">
                  {seller.business_name} · {zone?.name || "Port Harcourt"}
                </p>
              </div>
              <PriceDisplay
                priceKobo={request.price_at_response ?? listing.price_kobo ?? 0}
                negotiable={Boolean(listing.price_negotiable)}
                size="lg"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge
                tier={mapDbTierToUi(seller.verification_tier)}
              />
              <span className="text-xs text-[#4B5563]">
                📍 {seller.landmark_text}
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <Link
                href={`/s/${seller.slug}/map`}
                className="btn btn-primary btn-sm"
              >
                🗺️ Get Directions
              </Link>
              <RevealPhoneButton
                sellerId={seller.id}
                sellerName={seller.business_name}
                listingId={listing.id}
                itemTitle={listing.title_as_listed}
              />
            </div>
          </div>
        </section>

        <div className="text-center">
          <Link
            href={`/search?q=${encodeURIComponent(listing.title_as_listed)}`}
            className="text-xs font-extrabold text-[#064E3B] hover:underline"
          >
            ← Compare other Port Harcourt stalls for this item
          </Link>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
