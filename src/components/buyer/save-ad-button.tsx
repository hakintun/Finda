"use client";

import * as React from "react";

const STORAGE_KEY = "finda_saved_ads_v1";

export function getSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SaveAdButton({
  listingId,
  compact = true,
}: {
  listingId: string;
  compact?: boolean;
}) {
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setSaved(getSavedIds().includes(listingId));
  }, [listingId]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const current = getSavedIds();
    const next = current.includes(listingId)
      ? current.filter((x) => x !== listingId)
      : [listingId, ...current];
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("finda-saved-change"));
    } catch {
      // ignore storage quota errors
    }
    setSaved(!saved);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={saved ? "Remove from saved ads" : "Save ad"}
        title={saved ? "Saved" : "Save ad"}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition cursor-pointer ${
          saved
            ? "border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626]"
            : "border-[#E4E1D6] bg-[#FAF9F5] text-[#4B5563] hover:border-[#064E3B] hover:text-[#064E3B]"
        }`}
      >
        {saved ? "♥" : "♡"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`btn btn-sm ${saved ? "btn-danger" : ""}`}
    >
      {saved ? "♥ Saved" : "♡ Save Ad"}
    </button>
  );
}
