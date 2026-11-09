"use client";

import * as React from "react";
import Link from "next/link";
import {
  formatNairaFromKobo,
  formatTimeWAT,
  getFreshnessInfo,
  parseNairaToKobo,
} from "@/lib/format";
import type {
  ResultCardListing,
  StockStatus,
  VerificationTier,
} from "@/lib/types";
import {
  Button,
  FreshnessTag,
  PhoneInput,
  PriceDisplay,
  StockBadge,
  VerificationBadge,
} from "@/components/ui";
import { ResultCard, TopBar } from "@/components/buyer/shell";

const REFERENCE_NOW = new Date("2026-11-06T14:00:00Z");

export default function DesignSystemPage() {
  const [frame360, setFrame360] = React.useState(false);
  const [nairaInput, setNairaInput] = React.useState("185,000");
  const [negotiable, setNegotiable] = React.useState(true);
  const [ageHours, setAgeHours] = React.useState(6);
  const [stock, setStock] = React.useState<StockStatus>("in_stock");
  const [tier, setTier] = React.useState<VerificationTier>("visit");
  const [closedNow, setClosedNow] = React.useState(false);
  const [phoneRaw, setPhoneRaw] = React.useState("0803 123 4567");
  const [phoneE164, setPhoneE164] = React.useState<string | null>(
    "+2348031234567"
  );

  let parsedKobo = 18_500_000;
  let koboError: string | null = null;
  try {
    parsedKobo = parseNairaToKobo(nairaInput);
  } catch (err) {
    koboError = err instanceof Error ? err.message : "Invalid amount";
  }

  const confirmedAt = new Date(
    REFERENCE_NOW.getTime() - ageHours * 3_600_000
  ).toISOString();
  const freshness = getFreshnessInfo(confirmedAt, REFERENCE_NOW);

  const demoListing: ResultCardListing = {
    id: "test-card",
    productSlug: "firman-generator",
    titleAsListed: "Sumec Firman SPG3000E2 2.5kVA Generator",
    priceKobo: parsedKobo,
    priceNegotiable: negotiable,
    stockStatus: stock,
    confirmedAt,
    distanceKm: 1.2,
    zoneName: "Mile 1 Market, Line 4",
    landmarkText: "Beside First Bank, Aggrey Road — ask for Mama Ngozi",
    sellerName: "Ngozi Power & Appliances",
    sellerSlug: "ngozi-power",
    sellerType: "stall",
    verificationTier: tier,
    isClosedNow: closedNow,
    opensAtLabel: "8:00 AM",
  };

  return (
    <div className="min-h-dvh bg-[#FAF9F5] pb-16">
      <TopBar activeClusterLabel="UI Kit · Task 1 Test Bench" />

      <div className="border-b border-[#D1D5DB] bg-white">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <span className="text-xs font-bold text-[#111827]">
            Task 1 Playground (360×640, ≥44px buttons, ₦ kobo &amp; WAT time)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant={frame360 ? "primary" : "outline"}
              onClick={() => setFrame360((v) => !v)}
            >
              {frame360 ? "Exit 360×640 Frame" : "Simulate 360×640 Phone"}
            </Button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center px-3 text-xs font-semibold text-[#065F46]"
            >
              ← Home
            </Link>
          </div>
        </div>
      </div>

      <main
        className={[
          "mx-auto mt-6 space-y-6 px-4",
          frame360
            ? "w-[360px] rounded-3xl border-4 border-[#111827] py-5 shadow-xl"
            : "max-w-2xl",
        ].join(" ")}
      >
        <section className="rounded-2xl border border-[#D1D5DB] bg-white p-4 space-y-4">
          <h1 className="text-base font-extrabold text-[#111827]">
            1. Live Results Card Playground
          </h1>

          <ResultCard listing={demoListing} now={REFERENCE_NOW} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="naira-input"
                className="block text-xs font-bold text-[#111827]"
              >
                Naira Price Input
              </label>
              <input
                id="naira-input"
                type="text"
                value={nairaInput}
                onChange={(e) => setNairaInput(e.target.value)}
                className="mt-1 w-full min-h-11 rounded-xl border border-[#9CA3AF] px-3 text-sm"
              />
              {koboError ? (
                <p className="mt-1 text-xs font-semibold text-[#991B1B]">
                  {koboError}
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#374151]">
                  Kobo integer: <strong>{parsedKobo}</strong> · Compact:{" "}
                  <strong>
                    {formatNairaFromKobo(parsedKobo, { compact: true })}
                  </strong>
                </p>
              )}
              <label className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={negotiable}
                  onChange={(e) => setNegotiable(e.target.checked)}
                />
                Negotiable
              </label>
            </div>

            <div>
              <label
                htmlFor="age-slider"
                className="block text-xs font-bold text-[#111827]"
              >
                Hours Since Confirmed: {ageHours}h ({freshness.bucket})
              </label>
              <input
                id="age-slider"
                type="range"
                min={0}
                max={384}
                step={2}
                value={ageHours}
                onChange={(e) => setAgeHours(Number(e.target.value))}
                className="mt-2 w-full h-6 accent-[#065F46]"
              />
              <p className="text-xs text-[#4B5563]">
                {formatTimeWAT(confirmedAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 border-t border-[#F3F2EC] pt-3">
            <select
              aria-label="Stock status"
              value={stock}
              onChange={(e) => setStock(e.target.value as StockStatus)}
              className="min-h-11 rounded-xl border border-[#9CA3AF] px-3 text-xs font-semibold"
            >
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="unconfirmed">Unconfirmed</option>
            </select>

            <select
              aria-label="Verification tier"
              value={tier}
              onChange={(e) => setTier(e.target.value as VerificationTier)}
              className="min-h-11 rounded-xl border border-[#9CA3AF] px-3 text-xs font-semibold"
            >
              <option value="visit">Tier 3 — Verified stall (✓✓✓)</option>
              <option value="id">Tier 2 — ID verified (✓✓)</option>
              <option value="phone">Tier 1 — Phone verified (✓)</option>
              <option value="unverified">Tier 0 — Unverified</option>
            </select>

            <label className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={closedNow}
                onChange={(e) => setClosedNow(e.target.checked)}
              />
              Closed now
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D1D5DB] bg-white p-4 space-y-3">
          <h2 className="text-base font-extrabold text-[#111827]">
            2. Badges, Buttons &amp; +234 Phone Input
          </h2>
          <div className="flex flex-wrap gap-2">
            <StockBadge status="in_stock" />
            <StockBadge status="low_stock" />
            <StockBadge status="out_of_stock" />
            <StockBadge status="unconfirmed" />
          </div>
          <div className="flex flex-wrap gap-2">
            <VerificationBadge tier="phone" />
            <VerificationBadge tier="id" />
            <VerificationBadge tier="visit" />
          </div>
          <div className="space-y-1">
            <div>
              <FreshnessTag
                confirmedAt="2026-11-06T08:00:00Z"
                now={REFERENCE_NOW}
              />
            </div>
            <div>
              <FreshnessTag
                confirmedAt="2026-11-02T12:00:00Z"
                now={REFERENCE_NOW}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap items-baseline gap-4">
            <PriceDisplay priceKobo={50_000} size="md" />
            <PriceDisplay priceKobo={18_500_000} negotiable size="lg" />
          </div>
          <PhoneInput
            value={phoneRaw}
            onChange={(raw, e164) => {
              setPhoneRaw(raw);
              setPhoneE164(e164);
            }}
            helperText={`Normalized E.164: ${phoneE164 ?? "invalid"}`}
          />
        </section>
      </main>
    </div>
  );
}
