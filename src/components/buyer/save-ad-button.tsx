"use client";

import * as React from "react";

const STORAGE_KEY = "finda_saved_ads_v1";

export function readSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const getSavedIds = readSavedIds;

export function toggleSavedId(id: string): boolean {
  const current = new Set(readSavedIds());
  let nextSaved = false;
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
    nextSaved = true;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
    window.dispatchEvent(new CustomEvent("finda:saved-changed"));
  } catch {
    // ignore storage quota errors
  }
  return nextSaved;
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
    const sync = () => setSaved(readSavedIds().includes(listingId));
    sync();
    window.addEventListener("finda:saved-changed", sync);
    return () => window.removeEventListener("finda:saved-changed", sync);
  }, [listingId]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved(toggleSavedId(listingId));
      }}
      aria-label={saved ? "Remove from saved items" : "Save item"}
      title={saved ? "Saved" : "Bookmark item"}
      className={`inline-flex items-center justify-center rounded-full border transition cursor-pointer ${
        compact ? "h-9 w-9 text-sm shadow-sm" : "min-h-10 px-3.5 gap-1.5 text-xs font-bold"
      } ${
        saved
          ? "border-[#065F46] bg-[#ECFDF5] text-[#065F46]"
          : "border-[#DEDBD0] bg-white text-[#374151] hover:border-[#065F46] hover:text-[#065F46]"
      }`}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
      {!compact ? <span>{saved ? "Saved" : "Save"}</span> : null}
    </button>
  );
}
