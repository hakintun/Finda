import Link from "next/link";
import { formatDistanceKm, formatNairaFromKobo } from "@/lib/format";
import { getCategoryVisual } from "@/lib/category-visuals";
import type { ResultCardListing } from "@/lib/types";
import {
  Button,
  FreshnessTag,
  PriceDisplay,
  StockBadge,
  VerificationBadge,
} from "@/components/ui";
import { SaveAdButton } from "./save-ad-button";

export interface TopBarCustomer {
  name: string;
  role?: string;
  isVerified?: boolean;
  hasShop?: boolean;
}

/**
 * Jiji.ng-inspired Signature Green Marketplace Header (#00B53F).
 * Strictly customer-facing — zero Admin links exposed.
 */
export function TopBar({
  activeClusterLabel = "Port Harcourt",
  customer = null,
}: {
  activeClusterLabel?: string;
  customer?: TopBarCustomer | null;
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#00B53F] text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        {/* Brand Logo + Tagline */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl pr-1 text-white hover:opacity-95"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-black text-[#00B53F] shadow-xs"
            >
              F
            </span>
            <span className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none">
                Finda
              </span>
              <span className="mt-0.5 text-[10px] font-semibold text-white/90 leading-none">
                {activeClusterLabel}
              </span>
            </span>
          </Link>
          <span className="hidden md:inline-block text-xs font-semibold text-white/85 border-l border-white/25 pl-3">
            Sell faster, buy smarter
          </span>
        </div>

        {/* Customer Actions + Iconic Orange SELL CTA */}
        <nav
          aria-label="Marketplace navigation"
          className="flex items-center gap-2 sm:gap-3"
        >
          <Link
            href="/saved"
            title="Saved Ads"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-base font-bold text-white hover:bg-white/25"
          >
            ♡
          </Link>

          {customer ? (
            <div className="flex items-center gap-1.5">
              {customer.hasShop ? (
                <Link
                  href="/seller"
                  className="hidden sm:inline-flex min-h-10 items-center rounded-xl bg-white/15 px-3 text-xs font-bold text-white hover:bg-white/25"
                >
                  🏪 My Shop
                </Link>
              ) : null}
              <Link
                href="/account"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-bold text-white hover:bg-white/25"
              >
                <span>👤 {customer.name.split(" ")[0]}</span>
                {customer.isVerified ? (
                  <span
                    title="Verified Account"
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#00B53F]"
                  >
                    ✓
                  </span>
                ) : null}
              </Link>
            </div>
          ) : (
            <div className="flex items-center text-xs sm:text-sm font-bold">
              <Link
                href="/auth?tab=login"
                className="rounded-lg px-2.5 py-2 text-white hover:bg-white/15"
              >
                Sign in
              </Link>
              <span className="opacity-50">|</span>
              <Link
                href="/auth?tab=register"
                className="rounded-lg px-2.5 py-2 text-white hover:bg-white/15"
              >
                Registration
              </Link>
            </div>
          )}

          <Link
            href={customer?.hasShop ? "/seller/items?fast=1" : "/sell"}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#FF8900] px-4 sm:px-5 text-xs sm:text-sm font-black uppercase tracking-wide text-white shadow-sm hover:bg-[#EA7B00]"
          >
            SELL
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * Jiji.ng-style Grid Ad Card for Homepage & Search Grid.
 */
export function JijiAdCard({
  listing,
  category,
  unit,
  now,
}: {
  listing: ResultCardListing;
  category?: string;
  unit?: string;
  now?: Date;
}) {
  const vis = getCategoryVisual(category);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-[#00B53F] hover:shadow-md">
      {/* Visual Product Tile Header */}
      <Link
        href={`/item/${listing.id}`}
        className="relative flex h-36 items-center justify-center overflow-hidden border-b border-[#F2F4F7]"
        style={{ backgroundColor: vis.bg }}
      >
        <span
          aria-hidden="true"
          className="text-5xl transition-transform duration-200 group-hover:scale-110 select-none"
        >
          {vis.emoji}
        </span>

        {/* Top-left Verified Pill (Jiji-style) */}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
          {listing.verificationTier !== "unverified" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#00B53F] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-2xs">
              ✓ Verified{" "}
              {listing.verificationTier === "visit"
                ? "Stall"
                : listing.verificationTier === "id"
                ? "ID"
                : "Seller"}
            </span>
          ) : null}
        </div>

        {/* Bottom-left Category label */}
        <span
          className="absolute bottom-2 left-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold"
          style={{ color: vis.accent }}
        >
          {vis.shortLabel}
        </span>
      </Link>

      {/* Save Heart Floating Button */}
      <div className="absolute right-2.5 top-2.5 z-10">
        <SaveAdButton listingId={listing.id} />
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2.5">
        <div className="space-y-1">
          {/* Jiji Signature Green Bold Price */}
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-lg font-black tracking-tight text-[#00B53F] tabular-nums">
              {formatNairaFromKobo(listing.priceKobo)}
            </p>
            {listing.priceNegotiable ? (
              <span className="text-[10px] font-bold uppercase text-[#6B7280]">
                Negotiable
              </span>
            ) : null}
          </div>

          <Link
            href={`/item/${listing.id}`}
            className="block text-sm font-bold leading-snug text-[#111827] group-hover:text-[#00B53F] line-clamp-2"
          >
            {listing.titleAsListed}
          </Link>
        </div>

        <div className="space-y-2 pt-1">
          {/* Stock + Freshness */}
          <div className="flex flex-wrap items-center gap-1.5">
            <StockBadge status={listing.stockStatus} />
            {unit ? (
              <span className="rounded bg-[#F2F4F7] px-2 py-0.5 text-[10px] font-semibold text-[#374151]">
                {unit}
              </span>
            ) : null}
          </div>

          <div className="text-[11px]">
            <FreshnessTag confirmedAt={listing.confirmedAt} now={now} />
          </div>

          {/* Location & Shop */}
          <div className="border-t border-[#F2F4F7] pt-2 text-[11px] text-[#4B5563]">
            <p className="font-semibold text-[#374151] truncate">
              📍 {listing.zoneName}
              {listing.distanceKm !== null &&
              Number.isFinite(listing.distanceKm)
                ? ` · ${formatDistanceKm(listing.distanceKm)}`
                : ""}
            </p>
            <p className="truncate text-[#6B7280]">{listing.landmarkText}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Horizontal / Compact Results Card (also used in UI Kit `/design-system`).
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
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs transition hover:border-[#00B53F]">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/item/${listing.id}`}
          className="text-base font-bold leading-snug text-[#111827] hover:text-[#00B53F]"
        >
          {listing.titleAsListed}
        </Link>
        <PriceDisplay
          priceKobo={listing.priceKobo}
          negotiable={listing.priceNegotiable}
          size="lg"
          className="shrink-0 justify-end text-right text-[#00B53F]"
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <StockBadge status={listing.stockStatus} />
        <FreshnessTag confirmedAt={listing.confirmedAt} now={now} />
      </div>

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

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F2F4F7] pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {sellerHref ? (
            <Link
              href={sellerHref}
              className="font-semibold text-[#00B53F] hover:underline"
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

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        {confirmHref ? (
          <Link
            href={confirmHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#00B53F] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#009933]"
          >
            Confirm Stock
          </Link>
        ) : (
          <Button fullWidth onClick={() => onConfirm?.(listing)}>
            Confirm Stock
          </Button>
        )}

        {directionsHref ? (
          <Link
            href={directionsHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-bold text-[#111827] hover:bg-[#F3F4F6]"
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

/**
 * Clean Jiji-style Marketplace Footer (100% Customer-Safe — No Admin Links).
 */
export function MarketplaceFooter() {
  return (
    <footer className="mt-12 border-t border-[#009933] bg-[#00B53F] text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4 text-xs">
        <div className="space-y-2">
          <p className="text-base font-black">Finda Port Harcourt</p>
          <p className="text-white/85 leading-relaxed">
            Buy smarter and sell faster across Port Harcourt markets. Live Naira
            prices, confirmed stock status, and exact street landmarks.
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-extrabold uppercase tracking-wider text-white/95">
            For Buyers
          </p>
          <ul className="space-y-1.5 text-white/90">
            <li>
              <Link href="/search" className="hover:underline">
                Browse All Ads
              </Link>
            </li>
            <li>
              <Link href="/saved" className="hover:underline">
                Saved Ads
              </Link>
            </li>
            <li>
              <Link href="/market-data" className="hover:underline">
                Port Harcourt Price Index
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-extrabold uppercase tracking-wider text-white/95">
            For Sellers
          </p>
          <ul className="space-y-1.5 text-white/90">
            <li>
              <Link href="/sell" className="hover:underline">
                Sell on Finda (Free)
              </Link>
            </li>
            <li>
              <Link href="/seller/onboard" className="hover:underline">
                Register Your Shop
              </Link>
            </li>
            <li>
              <Link href="/seller" className="hover:underline">
                Seller Dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-extrabold uppercase tracking-wider text-white/95">
            Account & Trust
          </p>
          <ul className="space-y-1.5 text-white/90">
            <li>
              <Link href="/auth?tab=login" className="hover:underline">
                Sign In / Registration
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:underline">
                Verify Email, SMS or WhatsApp
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:underline">
                Privacy & Safety Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15 py-4 text-center text-[11px] text-white/85">
        © {new Date().getFullYear()} Finda Marketplace · Port Harcourt, Rivers State
      </div>
    </footer>
  );
}
