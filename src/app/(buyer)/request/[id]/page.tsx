import Link from "next/link";
import { TopBar } from "@/components/buyer/shell";
import { RevealPhoneButton } from "@/components/buyer/reveal-phone-button";
import { PriceDisplay, VerificationBadge } from "@/components/ui";
import { getDB } from "@/lib/db";
import { mapDbTierToUi } from "@/lib/buyer-ops";

export const dynamic = "force-dynamic";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export default async function BuyerConfirmRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reqId } = await params;
  const db = getDB();

  const request = (db.confirm_requests || []).find((r: any) => r.id === reqId);

  if (!request) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
        <TopBar />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 text-center space-y-4">
          <h1 className="text-xl font-extrabold text-[#111827]">
            Confirmation request not found
          </h1>
          <p className="text-sm text-[#4B5563]">
            This availability request ID does not exist or was reset.
          </p>
          <Link href="/search" className="btn btn-primary">
            Search Port Harcourt stock
          </Link>
        </main>
      </div>
    );
  }

  const listing = (db.listings || []).find(
    (l: any) => l.id === request.listing_id
  );
  const seller = listing
    ? (db.sellers || []).find((s: any) => s.id === listing.seller_id)
    : null;
  const zone = seller
    ? (db.zones || []).find((z: any) => z.id === seller.zone_id)
    : null;

  const elapsedMs = Date.now() - new Date(request.created_at).getTime();
  const isTimedOut =
    request.state === "pending" && elapsedMs >= THIRTY_MINUTES_MS;

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
      <TopBar activeClusterLabel="Availability Check" />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-6 space-y-5">
        <section className="rounded-2xl border border-[#D1D5DB] bg-white p-5 space-y-4 shadow-xs">
          {/* Status Banner */}
          {request.state === "yes" ? (
            <div className="rounded-xl border border-[#6EE7B7] bg-[#ECFDF5] p-4 space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#065F46]">
                ✓ Seller Confirmed YES
              </p>
              <h1 className="text-xl font-extrabold text-[#065F46]">
                It&apos;s in stock right now!
              </h1>
              <p className="text-xs text-[#065F46]">
                {seller?.business_name} confirmed availability at{" "}
                <strong>
                  ₦
                  {Math.round(
                    (request.price_at_response ?? listing?.price_kobo ?? 0) /
                      100
                  ).toLocaleString("en-NG")}
                </strong>
                . Head over or call to hold it.
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
                Trip saved! We automatically updated this shop&apos;s listing to{" "}
                <strong>Out of Stock</strong> so nobody else wastes transport
                fare.
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
                Market stalls get noisy! Reveal their phone number below to call
                directly, or pick another verified shop nearby.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#93C5FD] bg-[#EFF6FF] p-4 space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#1E40AF]">
                ⏳ Waiting for seller reply…
              </p>
              <h1 className="text-xl font-extrabold text-[#111827]">
                Sent to {seller?.business_name || "the seller"}
              </h1>
              <p className="text-xs text-[#1E40AF]">
                Requested by <strong>{request.buyer_name}</strong>. If the
                trader does not reply within 30 minutes, we&apos;ll give you
                direct call &amp; alternative shop options.
              </p>
            </div>
          )}

          {/* Item & Shop Details */}
          {listing && seller ? (
            <div className="border-t border-[#E5E7EB] pt-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-[#111827]">
                    {listing.title_as_listed}
                  </p>
                  <p className="text-xs text-[#4B5563]">
                    {seller.business_name} · {zone?.name || "Port Harcourt"}
                  </p>
                </div>
                <PriceDisplay
                  priceKobo={
                    request.price_at_response ?? listing.price_kobo ?? 0
                  }
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
                  href={`/request/${request.id}`}
                  className="btn btn-sm"
                >
                  ↻ Refresh status
                </Link>
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
          ) : null}
        </section>

        {/* Helpful Demo/Testing Box for Team Walkthroughs */}
        {request.state === "pending" && seller ? (
          <div className="rounded-2xl border border-dashed border-[#065F46] bg-[#ECFDF5]/60 p-4 text-xs text-[#065F46] space-y-2">
            <p className="font-bold">
              🧪 Testing end-to-end on one laptop?
            </p>
            <p>
              Switch into <strong>{seller.business_name}</strong>&apos;s Seller
              Console to tap <strong>✓ Yes, I have it</strong> or{" "}
              <strong>✗ No</strong>, then come back here and tap Refresh!
            </p>
            <form action="/api/seller/switch" method="post">
              <input type="hidden" name="seller_id" value={seller.id} />
              <input type="hidden" name="next" value="/seller" />
              <button type="submit" className="btn btn-primary btn-sm">
                Open {seller.business_name}&apos;s Seller Console →
              </button>
            </form>
          </div>
        ) : null}

        <div className="text-center">
          <Link
            href={
              listing
                ? `/search?q=${encodeURIComponent(listing.title_as_listed)}`
                : "/search"
            }
            className="text-xs font-semibold text-[#065F46] hover:underline"
          >
            ← Compare other Port Harcourt shops for this item
          </Link>
        </div>
      </main>
    </div>
  );
}
