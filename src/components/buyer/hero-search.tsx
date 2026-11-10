"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type ZoneOpt = { id: string; name: string };
type SuggestionItem = { name: string; category: string };

/**
 * Jiji-style prominent search bar with Port Harcourt Market Area selector
 * + instant local product typeahead suggestions.
 */
export function HeroSearchBar({
  zones,
  suggestions = [],
  defaultQuery = "",
  defaultZone = "",
  compact = false,
}: {
  zones: ZoneOpt[];
  suggestions?: SuggestionItem[];
  defaultQuery?: string;
  defaultZone?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(defaultQuery);
  const [zone, setZone] = React.useState(defaultZone);
  const [openSuggest, setOpenSuggest] = React.useState(false);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 1) return [];
    return suggestions
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.category.toLowerCase().includes(term)
      )
      .slice(0, 6);
  }, [q, suggestions]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpenSuggest(false);
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (zone) sp.set("zone", zone);
    router.push(`/search${sp.toString() ? `?${sp.toString()}` : ""}`);
  }

  function pickSuggestion(name: string) {
    setQ(name);
    setOpenSuggest(false);
    const sp = new URLSearchParams();
    sp.set("q", name);
    if (zone) sp.set("zone", zone);
    router.push(`/search?${sp.toString()}`);
  }

  return (
    <div className="relative w-full">
      <form
        onSubmit={handleSubmit}
        role="search"
        className={`flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row sm:items-center ${
          compact ? "border border-[#DEDBD0]" : ""
        }`}
      >
        {/* Jiji-like Location / Market Hub Selector */}
        <div className="relative flex items-center sm:w-52 sm:border-r sm:border-[#E5E7EB] sm:pr-2">
          <span
            aria-hidden="true"
            className="pointer-events-none pl-2.5 text-sm text-[#065F46]"
          >
            📍
          </span>
          <select
            name="zone"
            aria-label="Port Harcourt Market Area"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="min-h-11 w-full appearance-none border-0 bg-transparent pl-2 pr-6 text-xs font-extrabold text-[#111827] focus:outline-none cursor-pointer"
          >
            <option value="">All Port Harcourt</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>

        {/* Instant Search Input */}
        <div className="relative flex-1">
          <input
            type="search"
            name="q"
            value={q}
            onFocus={() => setOpenSuggest(true)}
            onBlur={() => setTimeout(() => setOpenSuggest(false), 160)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpenSuggest(true);
            }}
            placeholder="I am looking for... (e.g. 12.5kg Gas, Generator, Rice, Solar)"
            aria-label="What are you looking for?"
            className="min-h-11 w-full border-0 bg-transparent px-3 text-sm font-medium text-[#111827] placeholder:text-[#6B7280] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#065F46] px-6 text-sm font-extrabold text-white shadow-xs transition hover:bg-[#064E3B] cursor-pointer"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <span>Search</span>
        </button>
      </form>

      {/* Instant Typeahead Dropdown */}
      {openSuggest && filtered.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-2xl border border-[#DEDBD0] bg-white shadow-xl">
          <div className="border-b border-[#F3F2EC] px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">
            Instant Port Harcourt Matches
          </div>
          {filtered.map((item) => (
            <button
              key={item.name}
              type="button"
              onMouseDown={() => pickSuggestion(item.name)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-[#ECFDF5] cursor-pointer"
            >
              <span className="font-bold text-[#111827]">{item.name}</span>
              <span className="rounded-full bg-[#F3F2EC] px-2 py-0.5 text-[11px] font-semibold text-[#065F46]">
                {item.category}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
