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
 * Finda's Own Distinctive Warm-Stone & Deep-Forest Header.
 * Crisp editorial surface with a custom Radar-Pin emblem and live city indicator.
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
    <header className="sticky top-0 z-40 border-b border-[#E4E1D6] bg-[#FAF9F5]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        {/* Unique Finda Radar-Pin Brand Mark */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2.5 rounded-xl pr-1 text-[#111827] hover:opacity-90"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#064E3B] text-[#FDE68A] shadow-xs"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z"
                />
                <circle cx="12" cy="11" r="2.2" fill="currentColor" />
              </svg>
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-[#042F22] leading-none">
                Finda
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#065F46] leading-none">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#059669]" />
                {activeClusterLabel}
              </span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1 border-l border-[#E4E1D6] pl-3 text-xs font-semibold text-[#374151]">
            <Link
              href="/search"
              className="rounded-lg px-2.5 py-1.5 hover:bg-[#EFECE3] hover:text-[#064E3B]"
            >
              Explore Stock
            </Link>
            <Link
              href="/market-data"
              className="rounded-lg px-2.5 py-1.5 hover:bg-[#EFECE3] hover:text-[#064E3B]"
            >
              Market Index
            </Link>
          </div>
        </div>

        {/* Customer Actions + Distinctive Deep Forest CTA */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-2"
        >
          <Link
            href="/saved"
            title="Saved Items"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#E4E1D6] bg-white px-3 text-xs font-bold text-[#374151] hover:border-[#064E3B] hover:text-[#064E3B]"
          >
            <span aria-hidden="true">♡</span>
            <span className="hidden sm:inline">Saved</span>
          </Link>

          {customer ? (
            <div className="flex items-center gap-1.5">
              {customer.hasShop ? (
                <Link
                  href="/seller"
                  className="hidden sm:inline-flex min-h-10 items-center rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 text-xs font-bold text-[#064E3B] hover:bg-[#D1FAE5]"
                >
                  🏪 Stall Console
                </Link>
              ) : null}
              <Link
                href="/account"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#E4E1D6] bg-white px-3 text-xs font-bold text-[#111827] hover:border-[#064E3B]"
              >
                <span>{customer.name.split(" ")[0]}</span>
                {customer.isVerified ? (
                  <span
                    title="Verified Account"
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#064E3B] text-[10px] font-black text-[#FDE68A]"
                  >
                    ✓
                  </span>
                ) : null}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/auth?tab=login"
                className="inline-flex min-h-10 items-center rounded-xl px-3 text-xs font-bold text-[#374151] hover:bg-[#EFECE3] hover:text-[#111827]"
              >
                Sign in
              </Link>
              <Link
                href="/auth?tab=register"
                className="hidden sm:inline-flex min-h-10 items-center rounded-xl border border-[#D1CEC2] bg-white px-3 text-xs font-bold text-[#111827] hover:border-[#064E3B]"
              >
                Join
              </Link>
            </div>
          )}

          <Link
            href={customer?.hasShop ? "/seller/items?fast=1" : "/sell"}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#064E3B] px-3.5 sm:px-4 text-xs font-extrabold text-white shadow-xs hover:bg-[#043927]"
          >
            <span className="text-[#FDE68A] font-black">+</span>
            <span>{customer?.hasShop ? "Add Stock" : "List Your Shop"}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * Finda's Signature "Live-Stock & Street-Landmark Ticket Card".
 * Purpose-built around real Naira price, live confirmation freshness, and Keke/street landmarks
 * (distinct from classified photo-box templates).
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
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4E1D6] bg-white shadow-2xs transition duration-150 hover:-translate-y-0.5 hover:border-[#064E3B] hover:shadow-md">
      {/* Top Body: Category Micro-Tag + Title + Deep Forest Price + Stock/Freshness */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/item/${listing.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold"
            style={{ backgroundColor: vis.bg, color: vis.accent }}
          >
            <span aria-hidden="true">{vis.emoji}</span>
            <span>{vis.shortLabel}</span>
          </Link>

          <SaveAdButton listingId={listing.id} />
        </div>

        <div className="space-y-1.5">
          <Link
            href={`/item/${listing.id}`}
            className="block text-base font-extrabold leading-snug text-[#111827] group-hover:text-[#064E3B] line-clamp-2"
          >
            {listing.titleAsListed}
          </Link>

          <div className="flex items-baseline justify-between gap-2 pt-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black tracking-tight text-[#064E3B] tabular-nums">
                {formatNairaFromKobo(listing.priceKobo)}
              </span>
              {unit ? (
                <span className="text-xs font-medium text-[#6B7280]">
                  / {unit}
                </span>
              ) : null}
            </div>
            {listing.priceNegotiable ? (
              <span className="rounded-md bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 text-[10px] font-bold text-[#92400E]">
                Negotiable
              </span>
            ) : null}
          </div>
        </div>

        {/* Live Stock + Confirmation Freshness */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <StockBadge status={listing.stockStatus} />
          <FreshnessTag confirmedAt={listing.confirmedAt} now={now} />
        </div>
      </div>

      {/* Perforated Street-Landmark Footer Ticket */}
      <div className="border-t border-dashed border-[#DFDCD2] bg-[#F7F5EE] px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2 text-xs">
          <div className="min-w-0">
            <p className="font-bold text-[#111827] truncate">
              📍 {listing.zoneName}
              {listing.distanceKm !== null &&
              Number.isFinite(listing.distanceKm)
                ? ` · ${formatDistanceKm(listing.distanceKm)}`
                : ""}
            </p>
            <p className="text-[11px] text-[#4B5563] truncate">
              {listing.landmarkText}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0 text-[11px]">
            <Link
              href={`/s/${listing.sellerSlug}`}
              className="truncate font-bold text-[#374151] hover:text-[#064E3B] hover:underline"
            >
              {listing.sellerName}
            </Link>
            <VerificationBadge tier={listing.verificationTier} />
          </div>

          <Link
            href={`/item/${listing.id}`}
            className="shrink-0 rounded-lg bg-[#064E3B] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#043927]"
          >
            Details →
          </Link>
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
    <article className="rounded-2xl border border-[#E4E1D6] bg-white p-4 shadow-xs transition hover:border-[#064E3B]">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/item/${listing.id}`}
          className="text-base font-bold leading-snug text-[#111827] hover:text-[#064E3B]"
        >
          {listing.titleAsListed}
        </Link>
        <PriceDisplay
          priceKobo={listing.priceKobo}
          negotiable={listing.priceNegotiable}
          size="lg"
          className="shrink-0 justify-end text-right text-[#064E3B]"
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

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1EFE7] pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {sellerHref ? (
            <Link
              href={sellerHref}
              className="font-semibold text-[#064E3B] hover:underline"
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
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#064E3B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#043927]"
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
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#D1CEC2] bg-white px-4 py-2.5 text-sm font-bold text-[#111827] hover:bg-[#F1EFE7]"
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
 * Deep Forest Canopy Footer (100% Customer-Safe — Zero Admin Links).
 */
export function MarketplaceFooter() {
  return (
    <footer className="mt-14 border-t border-[#064E3B] bg-[#042F22] text-[#ECFDF5]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-11 sm:grid-cols-2 md:grid-cols-4 text-xs">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#065F46] text-xs font-black text-[#FDE68A]">
              F
            </span>
            <p className="text-base font-black text-white">Finda</p>
          </div>
          <p className="text-[#A7F3D0]/85 leading-relaxed">
            Port Harcourt&apos;s live market inventory &amp; price radar. Check
            verified stalls, real Naira prices, and street landmarks before
            leaving home.
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-extrabold uppercase tracking-wider text-[#FDE68A]">
            Discover Stock
          </p>
          <ul className="space-y-1.5 text-white/85">
            <li>
              <Link href="/search" className="hover:text-white hover:underline">
                Search Live Inventory
              </Link>
            </li>
            <li>
              <Link href="/saved" className="hover:text-white hover:underline">
                Saved Items
              </Link>
            </li>
            <li>
              <Link
                href="/market-data"
                className="hover:text-white hover:underline"
              >
                Port Harcourt Price Index
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-extrabold uppercase tracking-wider text-[#FDE68A]">
            For Market Traders
          </p>
          <ul className="space-y-1.5 text-white/85">
            <li>
              <Link href="/sell" className="hover:text-white hover:underline">
                Why List Your Stall
              </Link>
            </li>
            <li>
              <Link
                href="/seller/onboard"
                className="hover:text-white hover:underline"
              >
                15-Minute Shop Onboarding
              </Link>
            </li>
            <li>
              <Link href="/seller" className="hover:text-white hover:underline">
                Seller Console
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-extrabold uppercase tracking-wider text-[#FDE68A]">
            Account & Trust
          </p>
          <ul className="space-y-1.5 text-white/85">
            <li>
              <Link
                href="/auth?tab=login"
                className="hover:text-white hover:underline"
              >
                Sign In / Create Account
              </Link>
            </li>
            <li>
              <Link
                href="/account"
                className="hover:text-white hover:underline"
              >
                Email, SMS &amp; WhatsApp Verification
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="hover:text-white hover:underline"
              >
                Privacy &amp; Buyer Safety
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-[11px] text-white/70">
        © {new Date().getFullYear()} Finda · Built for Port Harcourt Markets,
        Rivers State
      </div>
    </footer>
  );
}
