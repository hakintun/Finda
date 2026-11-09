/**
 * Prohibited-category enforcement — Member 3 · Task 6
 * "blocking banned categories like prescription drugs or weapons" (PRD US-3.3).
 *
 * Enforced at listing-creation time (server action) and logged for the admin
 * queue so the team can see what traders are trying to post.
 */

export type BannedHit = { term: string; reason: string; label: string };

const FALLBACK_TERMS: BannedHit[] = [
  { term: "tramadol", reason: "prescription_drugs", label: "Prescription drugs" },
  { term: "codeine", reason: "prescription_drugs", label: "Prescription drugs" },
  { term: "gun", reason: "weapons", label: "Weapons" },
  { term: "pistol", reason: "weapons", label: "Weapons" },
  { term: "replica", reason: "counterfeit", label: "Counterfeit branded goods" },
  { term: "ivory", reason: "wildlife", label: "Ivory / protected wildlife" },
  { term: "escort", reason: "sexual_services", label: "Sexual services" },
];

/** Returns the banned term that matched, or null. */
export function checkBanned(rawName: string, bannedTerms: BannedHit[] = FALLBACK_TERMS): BannedHit | null {
  const hay = (rawName || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!hay) return null;
  for (const b of bannedTerms) {
    const t = b.term.toLowerCase();
    // word-boundary-ish match so "gun" doesn't hit "gunmetal grey paint"
    const re = new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
    if (re.test(hay)) return b;
  }
  return null;
}

export const PROHIBITED_CATEGORIES = [
  "Prescription drugs & controlled medicines",
  "Weapons, ammunition & explosives",
  "Counterfeit branded goods",
  "Ivory, wildlife & protected species",
  "Sexual services",
  "Human parts / trafficking",
  "Stolen goods",
];
