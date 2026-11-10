import * as React from "react";
import Link from "next/link";
import type { ResultCardListing } from "@/lib/types";
import { formatDistanceKm, formatNairaFromKobo } from "@/lib/format";
import {
  FreshnessTag,
  StockBadge,
  VerificationBadge,
} from "@/components/ui";
import { getCategoryVisual } from "@/lib/category-visuals";
import { ProductArtwork } from "./product-artwork";
import { SaveAdButton } from "./save-ad-button";

export interface TopBarCustomer {
  name: string;
  role: string;
  isVerified: boolean;
  hasShop?: boolean;
}

/**
 * Jiji-inspired Marketplace Top Bar in Finda's signature Deep Emerald (#065F46)
 * with hyperlocal Port Harcourt indicator, Saved Heart, Sign in | Registration, and SELL CTA.
 */
export function TopBar({
  activeClusterLabel = "Port Harcourt",
  customer,
}: {
  activeClusterLabel?: string;
  customer?: TopBarCustomer | null;
}) {
  return (
    <header className="sticky top-0 z-30 bg-[#065F46] text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        {/* Brand Emblem + Tagline */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg py-0.5 focus-visible:outline-white"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/25 shadow-xs"
            >
              <svg viewBox="0 0 28 28" className="h-5 w-5" fill="none">
                <circle
                  cx="14"
                  cy="13"
                  r="9"
                  stroke="#A7F3D0"
                  strokeWidth="1.8"
                  strokeDasharray="3 2"
                />
                <path
                  d="M14 6.5c-3.1 0-5.5 2.4-5.5 5.4 0 3.9 5.5 9.6 5.5 9.6s5.5-5.7 5.5-9.6c0-3-2.4-5.4-5.5-5.4Z"
                  fill="#FDE68A"
                />
                <circle cx="14" cy="11.8" r="2.1" fill="#065F46" />
              </svg>
            </span>

            <div className="leading-tight">
              <span className="block text-xl font-black tracking-tight text-white">
                Finda
              </span>
              <span className="hidden text-[10px] font-semibold text-emerald-100/90 sm:block">
                Find faster, Buy smarter · {activeClusterLabel}
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions: Saved | Sign in / Registration | SELL */}
        <nav
          aria-label="Marketplace navigation"
          className="flex items-center gap-2 sm:gap-2.5"
        >
          <Link
            href="/saved"
            prefetch={false}
            title="Saved items"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-sm font-bold text-white transition hover:bg-white/22"
          >
            ♡
          </Link>

          {customer ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/account"
                prefetch={false}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/14 px-3 py-1 text-xs font-bold text-white hover:bg-white/24"
              >
                <span className="truncate max-w-[105px]">
                  {customer.name.split(" ")[0]}
                </span>
                {customer.isVerified ? (
                  <span
                    title="Verified account"
                    className="text-[#FDE68A] font-black"
                  >
                    ✓
                  </span>
                ) : (
                  <span className="rounded bg-[#FDE68A] px-1.5 py-0.5 text-[10px] font-extrabold text-[#043D2D]">
                    Verify
                  </span>
                )}
              </Link>
              {customer.hasShop ? (
                <Link
                  href="/seller"
                  prefetch={false}
                  className="hidden sm:inline-flex min-h-9 items-center rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#065F46] hover:bg-emerald-50"
                >
                  My Stall
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs font-bold text-white">
              <Link
                href="/auth?tab=login"
                prefetch={false}
                className="rounded-lg px-2 py-1.5 hover:bg-white/12"
              >
                Sign in
              </Link>
              <span className="opacity-45">|</span>
              <Link
                href="/auth?tab=register"
                prefetch={false}
                className="hidden sm:inline-block rounded-lg px-2 py-1.5 hover:bg-white/12"
              >
                Registration
              </Link>
            </div>
          )}

          <Link
            href={customer?.hasShop ? "/seller/items" : "/sell"}
            prefetch={false}
            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#F59E0B] px-4 py-1.5 text-xs font-black uppercase tracking-wide text-[#111827] shadow-xs transition hover:bg-[#FBBF24]"
          >
            SELL
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function BuyerShell({
  children,
  activeClusterLabel,
  customer,
  maxWidth = "max-w-5xl",
}: {
  children: React.ReactNode;
  activeClusterLabel?: string;
  customer?: TopBarCustomer | null;
  maxWidth?: "max-w-3xl" | "max-w-5xl" | "max-w-6xl";
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5] text-[#111827]">
      <TopBar activeClusterLabel={activeClusterLabel} customer={customer} />
      <main className={`mx-auto w-full ${maxWidth} flex-1 px-4 pb-16 pt-5`}>
        {children}
      </main>
      <MarketplaceFooter />
    </div>
  );
}

/**
 * Jiji-style Visual Marketplace Card fused with Finda's hyperlocal Street-Landmark & Freshness DNA.
 * Supports both Grid ("grid") and List ("list") layouts.
 */
export function JijiAdCard({
  listing,
  category,
  unit,
  layout = "grid",
}: {
  listing: ResultCardListing;
  category?: string;
  unit?: string;
  layout?: "grid" | "list";
}) {
  const vis = getCategoryVisual(category);

  if (layout === "list") {
    return (
      <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#DEDBD0] bg-white shadow-2xs transition hover:border-[#065F46] hover:shadow-md sm:flex-row">
        <Link
          href={`/item/${listing.id}`}
          prefetch={false}
          className="relative block sm:w-44 shrink-0 overflow-hidden"
        >
          <ProductArtwork
            title={listing.titleAsListed}
            category={category}
            size="card"
          />
          {listing.verificationTier !== "unverified" ? (
            <span className="absolute left-2.5 top-2.5 z-20 inline-flex items-center gap-1 rounded-md bg-[#065F46] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-2xs">
              ✓ Verified Stall
            </span>
          ) : null}
        </Link>

        <div className="flex flex-1 flex-col justify-between p-4 gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                href={`/item/${listing.id}`}
                prefetch={false}
                className="text-base font-extrabold text-[#111827] group-hover:text-[#065F46]"
              >
                {listing.titleAsListed}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <StockBadge status={listing.stockStatus} />
                <FreshnessTag confirmedAt={listing.confirmedAt} />
                <span className="rounded-md bg-[#F3F2EC] px-2 py-0.5 text-[11px] font-semibold text-[#374151]">
                  {vis.shortLabel}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-lg font-black text-[#065F46] tabular-nums">
                {formatNairaFromKobo(listing.priceKobo)}
              </p>
              {unit ? (
                <p className="text-[11px] text-[#6B7280]">per {unit}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[#E2DFD5] pt-2.5 text-xs text-[#4B5563]">
            <span className="truncate max-w-md">
              📍 <strong className="text-[#111827]">{listing.zoneName}</strong> ·{" "}
              {listing.landmarkText}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#374151]">
                {listing.sellerName}
              </span>
              <SaveAdButton listingId={listing.id} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DEDBD0] bg-white shadow-2xs transition duration-150 hover:-translate-y-0.5 hover:border-[#065F46] hover:shadow-md">
      {/* Visual Product Frame (Jiji-like card media + overlapping Save button) */}
      <div className="relative">
        <Link
          href={`/item/${listing.id}`}
          prefetch={false}
          className="block focus:outline-none"
        >
          <ProductArtwork
            title={listing.titleAsListed}
            category={category}
            size="card"
          />
        </Link>

        {/* Top-left Verified / Category pill */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex flex-wrap gap-1">
          {listing.verificationTier !== "unverified" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#065F46] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-2xs">
              {listing.verificationTier === "visit"
                ? "✓✓✓ Visited"
                : "✓ Verified ID"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#374151] shadow-2xs">
              {vis.shortLabel}
            </span>
          )}
        </div>

        {/* Floating circular Bookmark Button overlapping bottom-right of image (Jiji signature) */}
        <div className="absolute -bottom-4 right-3 z-20">
          <SaveAdButton listingId={listing.id} />
        </div>
      </div>

      {/* Card Body: Price -> Title -> Condition/Freshness Chips */}
      <Link
        href={`/item/${listing.id}`}
        prefetch={false}
        className="flex flex-1 flex-col justify-between p-3.5 pt-4 space-y-2.5"
      >
        <div className="space-y-1">
          <div className="flex items-baseline gap-1.5 pr-8">
            <span className="text-lg font-black tracking-tight text-[#065F46] tabular-nums">
              {formatNairaFromKobo(listing.priceKobo)}
            </span>
            {unit ? (
              <span className="text-[11px] font-medium text-[#6B7280]">
                / {unit}
              </span>
            ) : null}
          </div>

          <h3 className="text-sm font-bold leading-snug text-[#111827] line-clamp-2 group-hover:text-[#065F46]">
            {listing.titleAsListed}
          </h3>
        </div>

        <div className="space-y-2">
          {/* Jiji-like attribute chips + Finda live stock freshness */}
          <div className="flex flex-wrap items-center gap-1.5">
            <StockBadge status={listing.stockStatus} />
            {listing.priceNegotiable ? (
              <span className="rounded bg-[#F3F2EC] px-1.5 py-0.5 text-[10px] font-semibold text-[#374151]">
                Negotiable
              </span>
            ) : null}
          </div>

          <div className="text-[11px]">
            <FreshnessTag confirmedAt={listing.confirmedAt} />
          </div>
        </div>
      </Link>

      {/* Unique Finda Perforated Street-Landmark Footer */}
      <div className="border-t border-dashed border-[#E2DFD5] bg-[#FAF9F5] px-3.5 py-2 text-[11px] text-[#4B5563] flex items-center justify-between gap-2">
        <span className="truncate">
          📍 <strong className="text-[#111827]">{listing.zoneName}</strong> ·{" "}
          {listing.landmarkText}
        </span>
        {listing.distanceKm !== null ? (
          <span className="shrink-0 font-bold text-[#065F46] tabular-nums">
            {formatDistanceKm(listing.distanceKm)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Preserved ResultCard export for design-system & horizontal list views.
 */
export function ResultCard({
  listing,
  category,
}: {
  listing: ResultCardListing;
  category?: string;
  now?: Date;
}) {
  return (
    <article className="rounded-2xl border border-[#DEDBD0] bg-white p-4 shadow-2xs transition hover:border-[#065F46]">
      <div className="flex gap-3.5">
        <Link href={`/item/${listing.id}`} prefetch={false} className="shrink-0">
          <div className="overflow-hidden rounded-xl border border-[#E2DFD5]">
            <ProductArtwork
              title={listing.titleAsListed}
              category={category}
              size="thumb"
            />
          </div>
        </Link>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/item/${listing.id}`}
                prefetch={false}
                className="text-base font-extrabold text-[#111827] hover:text-[#065F46] line-clamp-1"
              >
                {listing.titleAsListed}
              </Link>
              <p className="mt-0.5 text-xs text-[#4B5563]">
                <span className="font-bold text-[#111827]">
                  {listing.zoneName}
                </span>{" "}
                · {listing.landmarkText}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[#065F46] tabular-nums">
                {formatNairaFromKobo(listing.priceKobo)}
              </p>
              {listing.priceNegotiable ? (
                <span className="text-[11px] font-medium text-[#6B7280]">
                  Negotiable
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StockBadge status={listing.stockStatus} />
            <FreshnessTag confirmedAt={listing.confirmedAt} />
            <VerificationBadge tier={listing.verificationTier} />
            {listing.distanceKm !== null ? (
              <span className="text-xs font-bold text-[#065F46]">
                {formatDistanceKm(listing.distanceKm)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F3F2EC]">
            <Link
              href={`/s/${listing.sellerSlug}`}
              prefetch={false}
              className="text-xs font-bold text-[#374151] hover:text-[#065F46]"
            >
              🏪 {listing.sellerName}
            </Link>
            <div className="flex items-center gap-2">
              <SaveAdButton listingId={listing.id} />
              <Link
                href={`/item/${listing.id}`}
                prefetch={false}
                className="inline-flex min-h-9 items-center rounded-xl bg-[#065F46] px-3.5 text-xs font-bold text-white hover:bg-[#064E3B]"
              >
                Check Price &amp; Contact →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function MarketplaceFooter() {
  return (
    <footer className="mt-14 border-t border-[#DEDBD0] bg-[#043D2D] text-white/85">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 font-black text-[#FDE68A]">
              F
            </span>
            <p className="text-base font-black text-white">Finda</p>
          </div>
          <p className="text-white/70 leading-relaxed">
            Port Harcourt&apos;s hyperlocal marketplace. Compare confirmed Naira
            prices, live stall availability, and exact street landmarks before
            making the trip.
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-bold uppercase tracking-wider text-[#FDE68A]">
            Port Harcourt Hubs
          </p>
          <ul className="space-y-1.5 text-white/75">
            <li>
              <Link prefetch={false} href="/search?zone=mile1" className="hover:text-white">
                Mile 1 Market
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/search?zone=mile3" className="hover:text-white">
                Mile 3 Market
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/search?zone=oilmill" className="hover:text-white">
                Oil Mill &amp; Eleme Jct
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/search?zone=garrison" className="hover:text-white">
                Garrison &amp; Aba Road
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/search?zone=rumuokoro" className="hover:text-white">
                Rumuokoro &amp; Choba
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-bold uppercase tracking-wider text-[#FDE68A]">
            For Traders &amp; Shops
          </p>
          <ul className="space-y-1.5 text-white/75">
            <li>
              <Link prefetch={false} href="/sell" className="hover:text-white">
                Sell on Finda (Free)
              </Link>
            </li>
            <li>
              <Link
                prefetch={false}
                href="/auth?tab=register&role=seller"
                className="hover:text-white"
              >
                Verify via Email, SMS or WhatsApp
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/seller" className="hover:text-white">
                Seller Stall Manager
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-bold uppercase tracking-wider text-[#FDE68A]">
            Trust &amp; Market Guide
          </p>
          <ul className="space-y-1.5 text-white/75">
            <li>
              <Link prefetch={false} href="/privacy" className="hover:text-white">
                Privacy &amp; Buyer Protection
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/market-data" className="hover:text-white">
                Port Harcourt Price Guide
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/saved" className="hover:text-white">
                Saved Items
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-[11px] text-white/60">
        © {new Date().getFullYear()} Finda Port Harcourt · Verified Local Stock &amp; Street Landmarks
      </div>
    </footer>
  );
}
