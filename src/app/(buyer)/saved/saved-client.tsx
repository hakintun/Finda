"use client";

import * as React from "react";
import Link from "next/link";
import { JijiAdCard } from "@/components/buyer/shell";
import { getSavedIds } from "@/components/buyer/save-ad-button";
import type { ResultCardListing } from "@/lib/types";

export function SavedAdsClient({
  catalog,
}: {
  catalog: {
    card: ResultCardListing;
    category?: string;
    unit?: string;
  }[];
}) {
  const [ids, setIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const sync = () => setIds(getSavedIds());
    sync();
    window.addEventListener("finda-saved-change", sync);
    return () => window.removeEventListener("finda-saved-change", sync);
  }, []);

  const savedItems = catalog.filter((x) => ids.includes(x.card.id));

  if (savedItems.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center space-y-3 shadow-xs">
        <div className="text-4xl">♡</div>
        <h2 className="text-lg font-extrabold text-[#111827]">
          No saved ads yet
        </h2>
        <p className="text-sm text-[#4B5563]">
          Tap the heart icon on any listing to save it here for quick price
          comparison.
        </p>
        <Link href="/search" className="btn btn-primary">
          Browse Port Harcourt Ads
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {savedItems.map((item) => (
        <JijiAdCard
          key={item.card.id}
          listing={item.card}
          category={item.category}
          unit={item.unit}
        />
      ))}
    </div>
  );
}
