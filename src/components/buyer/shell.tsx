import Link from "next/link";
import { formatDistanceKm } from "@/lib/format";
import type { ResultCardListing } from "@/lib/types";
import {
  Button,
  FreshnessTag,
  PriceDisplay,
  StockBadge,
  VerificationBadge,
} from "@/components/ui";

export function TopBar({
  activeClusterLabel = "Port Harcourt",
}: {
  activeClusterLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-[#FAF9F5]/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2.5 rounded-xl pr-2"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#065F46] text-sm font-black text-white"
          >
            F
          </span>
          <span className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-[#111827] leading-none">
              Finda
            </span>
            <span className="mt-0.5 text-[11px] font-medium text-[#4B5563] leading-none">
              {activeClusterLabel}
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="flex flex-wrap items-center gap-1.5"
        >
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center rounded-xl border border-[#D1D5DB] bg-white px-3 text-xs font-semibold text-[#374151] hover:bg-[#F3F2EC]"
          >
            Search
          </Link>
          <Link
            href="/seller"
            className="inline-flex min-h-11 items-center rounded-xl border border-[#D1D5DB] bg-white px-3 text-xs font-semibold text-[#374151] hover:bg-[#F3F2EC]"
          >
            Seller
          </Link>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-xl border border-[#D1D5DB] bg-white px-3 text-xs font-semibold text-[#374151] hover:bg-[#F3F2EC]"
          >
            Admin
          </Link>
          <Link
            href="/sell"
            className="inline-flex min-h-11 items-center rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3 text-xs font-semibold text-[#065F46] hover:bg-[#D1FAE5]"
          >
            List shop
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * The 300px Zero-Image Results Card (PRD §9.2 priority order).
 * Works both as a link-driven SSR card and as an interactive callback card.
 */
export function ResultCard({
  listing,
  now,
  confirmHref,
  directionsHref,
  sellerHref,
  onConfirm,
  onDirections,
}: {
  listing: ResultCardListing;
  now?: Date;
  confirmHref?: string;
  directionsHref?: string;
  sellerHref?: string;
  onConfirm?: (listing: ResultCardListing) => void;
  onDirections?: (listing: ResultCardListing) => void;
}) {
  return (
    <article className="rounded-2xl border border-[#D1D5DB] bg-white p-4 shadow-xs">
      {/* 1. Product name + Naira price */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold leading-snug text-[#111827]">
          {listing.titleAsListed}
        </h3>
        <PriceDisplay
          priceKobo={listing.priceKobo}
          negotiable={listing.priceNegotiable}
          size="lg"
          className="shrink-0 justify-end text-right"
        />
      </div>

      {/* 2 & 3. Stock badge + Freshness timestamp */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <StockBadge status={listing.stockStatus} />
        <FreshnessTag confirmedAt={listing.confirmedAt} now={now} />
      </div>

      {/* 4. Distance + Zone + Landmark */}
      <div className="mt-3 text-xs text-[#374151]">
        <p className="font-semibold text-[#111827]">
          📍{" "}
          {listing.distanceKm !== null && Number.isFinite(listing.distanceKm)
            ? `${formatDistanceKm(listing.distanceKm)} · `
            : ""}
          {listing.zoneName}
        </p>
        <p className="mt-0.5 text-[#4B5563]">{listing.landmarkText}</p>
      </div>

      {/* 5. Seller + Verification tier + Closed warning */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F3F2EC] pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {sellerHref ? (
            <Link
              href={sellerHref}
              className="font-semibold text-[#065F46] hover:underline"
            >
              {listing.sellerName}
            </Link>
          ) : (
            <span className="font-semibold text-[#111827]">
              {listing.sellerName}
            </span>
          )}
          <VerificationBadge tier={listing.verificationTier} />
        </div>
        {listing.isClosedNow ? (
          <span className="rounded bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#991B1B]">
            {listing.opensAtLabel || "Closed now"}
          </span>
        ) : null}
      </div>

      {/* 6. Confirm & Directions (>=44px actions) */}
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        {confirmHref ? (
          <Link
            href={confirmHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#065F46] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#064E3B]"
          >
            Confirm
          </Link>
        ) : (
          <Button fullWidth onClick={() => onConfirm?.(listing)}>
            Confirm
          </Button>
        )}

        {directionsHref ? (
          <Link
            href={directionsHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#9CA3AF] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] hover:bg-[#F3F4F6]"
          >
            Directions
          </Link>
        ) : (
          <Button
            variant="outline"
            fullWidth
            onClick={() => onDirections?.(listing)}
          >
            Directions
          </Button>
        )}
      </div>
    </article>
  );
}
