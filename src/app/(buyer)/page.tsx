"use client";

import * as React from "react";
import Link from "next/link";
import {
  PORT_HARCOURT_CLUSTERS,
  type ClusterId,
  type ResultCardListing,
} from "@/lib/types";
import { Button, ClusterSelector } from "@/components/ui";
import { ResultCard, TopBar } from "@/components/buyer/shell";

const DEMO_NOW = new Date("2026-11-06T14:00:00Z");

const SAMPLE_LISTINGS: (ResultCardListing & { keywords: string[] })[] = [
  {
    id: "demo-1",
    productSlug: "hisense-1-5hp-split-ac",
    titleAsListed: "Hisense 1.5HP Split Air Conditioner (Copper Coil)",
    priceKobo: 28_500_000,
    priceNegotiable: true,
    stockStatus: "in_stock",
    confirmedAt: "2026-11-06T08:00:00Z",
    distanceKm: 0.85,
    zoneName: "Mile 1 Market, Line 4",
    landmarkText: "Beside First Bank, off Ikwerre Road — ask for Tunde",
    sellerName: "Tunde CoolTech Electronics",
    sellerSlug: "tunde-cooltech",
    sellerType: "shop",
    verificationTier: "visit",
    keywords: ["ac", "air conditioner", "1.5hp", "hisense"],
  },
  {
    id: "demo-2",
    productSlug: "tiger-tg950-generator",
    titleAsListed: "Tiger TG950 Small Generator (I Better Pass My Neighbour)",
    priceKobo: 9_800_000,
    priceNegotiable: false,
    stockStatus: "low_stock",
    confirmedAt: "2026-11-05T15:00:00Z",
    distanceKm: 1.2,
    zoneName: "Mile 1 Market, Engine Line",
    landmarkText: "Opposite Mile 1 Flyover bridge, Stall B12",
    sellerName: "Chukwuma Power & Spares",
    sellerSlug: "chukwuma-power",
    sellerType: "stall",
    verificationTier: "phone",
    keywords: ["gen", "generator", "tiger", "i better pass my neighbour"],
  },
  {
    id: "demo-3",
    productSlug: "mama-gold-rice-50kg",
    titleAsListed: "Mama Gold Parboiled Rice — 50kg Bag",
    priceKobo: 7_950_000,
    priceNegotiable: false,
    stockStatus: "in_stock",
    confirmedAt: "2026-11-02T11:00:00Z",
    distanceKm: 2.4,
    zoneName: "Mile 3 Market, Foodstuff Row",
    landmarkText: "Behind Mile 3 Motor Park gate, 2nd store on left",
    sellerName: "Mama Ngozi Provisions",
    sellerSlug: "mama-ngozi",
    sellerType: "stall",
    verificationTier: "visit",
    keywords: ["rice", "50kg", "mama gold", "foodstuff"],
  },
];

const QUICK_CHIPS = [
  "1.5HP air conditioner",
  "I better pass my neighbour",
  "50kg rice",
];

export default function BuyerHomePage() {
  const [cluster, setCluster] = React.useState<ClusterId>("Mile1");
  const [query, setQuery] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const activeCluster =
    PORT_HARCOURT_CLUSTERS.find((c) => c.id === cluster) ??
    PORT_HARCOURT_CLUSTERS[0];

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAMPLE_LISTINGS;
    return SAMPLE_LISTINGS.filter(
      (item) =>
        item.titleAsListed.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q) || q.includes(kw))
    );
  }, [query]);

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
      <TopBar activeClusterLabel={`Port Harcourt · ${activeCluster.label}`} />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-5 pb-14">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">
          Find who has it, near you.
        </h1>
        <p className="mt-1 text-sm text-[#4B5563]">
          Check today&apos;s Naira price, confirmed stock status, and landmark
          directions before you leave home.
        </p>

        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="mt-4"
        >
          <div className="flex min-h-12 items-center gap-2 rounded-2xl border-2 border-[#065F46] bg-white px-3.5">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “1.5HP AC”, “gen”, or “rice”…"
              aria-label="Search for an item in Port Harcourt"
              className="w-full min-h-12 bg-transparent text-base text-[#111827] placeholder:text-[#6B7280] focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="min-h-11 px-2 text-xs font-semibold text-[#4B5563] cursor-pointer"
              >
                Clear
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setQuery(chip)}
              className="min-h-11 rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F3F2EC] cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        <section className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#4B5563]">
            Your area ({activeCluster.zonesHint})
          </p>
          <ClusterSelector selected={cluster} onSelect={setCluster} />
        </section>

        {notice ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#6EE7B7] bg-[#ECFDF5] px-3.5 py-2.5 text-xs font-medium text-[#065F46]">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="ml-2 font-bold underline cursor-pointer"
            >
              OK
            </button>
          </div>
        ) : null}

        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-bold text-[#111827]">
            Nearby confirmed listings ({results.length})
          </h2>
          {results.length > 0 ? (
            results.map((listing) => (
              <ResultCard
                key={listing.id}
                listing={listing}
                now={DEMO_NOW}
                onConfirm={(item) =>
                  setNotice(`Confirm tapped for ${item.sellerName}`)
                }
                onDirections={(item) =>
                  setNotice(`Directions: ${item.landmarkText}`)
                }
              />
            ))
          ) : (
            <div className="rounded-2xl border border-[#D1D5DB] bg-white p-5 text-center space-y-2">
              <p className="text-sm font-bold text-[#111827]">
                No nearby seller has confirmed &ldquo;{query}&rdquo; yet.
              </p>
              <Button variant="secondary" onClick={() => setQuery("")}>
                Reset sample search
              </Button>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-4">
          <p className="text-sm font-bold text-[#065F46]">
            Member 1 · Task 1 Interactive UI Test Bench
          </p>
          <p className="mt-1 text-xs text-[#064E3B]">
            Test Naira kobo math, live freshness sliders, stock badges, +234
            phone validation, and the 360×640 Android frame.
          </p>
          <Link
            href="/design-system"
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#065F46] px-4 py-2.5 text-xs font-semibold text-white"
          >
            Open Interactive UI Kit →
          </Link>
        </section>
      </main>
    </div>
  );
}
