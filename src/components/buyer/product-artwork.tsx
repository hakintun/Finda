import * as React from "react";
import { getCategoryVisual } from "@/lib/category-visuals";

/**
 * Bespoke vector SVG product showcase for Finda cards & detail pages.
 * Gives every listing Jiji-like visual scanability while staying uniquely Finda
 * with clean geometric product illustrations and zero external network dependencies.
 */
export function ProductArtwork({
  title,
  category,
  size = "card",
}: {
  title?: string | null;
  category?: string | null;
  size?: "card" | "hero" | "thumb";
}) {
  const vis = getCategoryVisual(category);
  const hay = `${title || ""} ${category || ""}`.toLowerCase();

  let kind:
    | "gas"
    | "power"
    | "phone"
    | "food"
    | "build"
    | "appliance"
    | "fashion"
    | "health"
    | "auto"
    | "general" = "general";

  if (/gas|cylinder|burner|cooking/.test(hay)) kind = "gas";
  else if (/gen|generator|solar|inverter|battery|stabilizer/.test(hay))
    kind = "power";
  else if (/phone|iphone|samsung|tecno|infinix|laptop|charger|earbud|usb/.test(hay))
    kind = "phone";
  else if (/rice|garri|oil|beans|indomie|milk|sugar|flour|provision|food|yam/.test(hay))
    kind = "food";
  else if (/cement|paint|pipe|rod|roof|tile|wire|cable|tool|plumb|build/.test(hay))
    kind = "build";
  else if (/fan|fridge|freezer|iron|blender|kettle|ac|tv|television|appliance/.test(hay))
    kind = "appliance";
  else if (/shoe|sneaker|bag|dress|shirt|lace|ankara|fashion|watch/.test(hay))
    kind = "fashion";
  else if (/cream|soap|lotion|vitamin|baby|diaper|health|beauty|hair/.test(hay))
    kind = "health";
  else if (/tyre|tire|oil|brake|spark|car|keke|motor|auto/.test(hay))
    kind = "auto";

  const dims =
    size === "hero"
      ? "h-64 sm:h-72"
      : size === "thumb"
      ? "h-28 w-32 sm:h-32 sm:w-40 shrink-0"
      : "h-40 sm:h-44 w-full";

  const svgScale = size === "hero" ? "h-36 w-36" : size === "thumb" ? "h-16 w-16" : "h-24 w-24";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${vis.bgGradient} ${dims}`}
    >
      {/* Subtle Finda architectural dot-grid backdrop */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
      >
        <defs>
          <pattern
            id="finda-dots"
            x="0"
            y="0"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="#065F46" fillOpacity="0.22" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#finda-dots)" />
      </svg>

      {/* Soft studio pedestal glow */}
      <div className="pointer-events-none absolute h-28 w-28 rounded-full bg-white/75 blur-md" />

      {/* Custom Vector Product Illustration */}
      <svg
        viewBox="0 0 96 96"
        fill="none"
        aria-hidden="true"
        className={`relative z-10 ${svgScale} drop-shadow-xs transition-transform duration-200 group-hover:scale-105`}
      >
        {kind === "gas" && (
          <>
            <rect x="34" y="14" width="28" height="10" rx="4" stroke="#065F46" strokeWidth="3.5" fill="#ECFDF5" />
            <path d="M48 18V26" stroke="#065F46" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="24" y="26" width="48" height="52" rx="16" fill="#065F46" />
            <rect x="28" y="46" width="40" height="10" rx="3" fill="#FDE68A" />
            <rect x="32" y="78" width="32" height="6" rx="3" fill="#043D2D" />
          </>
        )}

        {kind === "power" && (
          <>
            <rect x="14" y="26" width="68" height="48" rx="8" fill="#065F46" />
            <rect x="20" y="32" width="34" height="36" rx="5" fill="#ECFDF5" />
            <path d="M39 38L30 51H38L35 62L46 48H38L39 38Z" fill="#D97706" />
            <circle cx="66" cy="42" r="6" fill="#FDE68A" />
            <rect x="60" y="54" width="12" height="12" rx="3" fill="#043D2D" />
            <path d="M22 26V20H74V26" stroke="#043D2D" strokeWidth="4" strokeLinecap="round" />
          </>
        )}

        {kind === "phone" && (
          <>
            <rect x="28" y="12" width="40" height="72" rx="9" fill="#043D2D" />
            <rect x="32" y="19" width="32" height="54" rx="4" fill="#ECFDF5" />
            <circle cx="48" cy="78" r="2.5" fill="#A7F3D0" />
            <rect x="38" y="28" width="20" height="14" rx="3" fill="#065F46" />
            <rect x="38" y="47" width="14" height="4" rx="2" fill="#10B981" />
            <rect x="38" y="55" width="20" height="4" rx="2" fill="#A7F3D0" />
          </>
        )}

        {kind === "food" && (
          <>
            <path d="M24 28C24 22 32 18 48 18C64 18 72 22 72 28L76 74C76 79 68 82 48 82C28 82 20 79 20 74L24 28Z" fill="#FDE68A" stroke="#065F46" strokeWidth="3.5" />
            <rect x="28" y="38" width="40" height="22" rx="5" fill="#065F46" />
            <path d="M36 49H60" stroke="#ECFDF5" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M41 55H55" stroke="#A7F3D0" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {kind === "build" && (
          <>
            <rect x="18" y="48" width="28" height="16" rx="3" fill="#065F46" />
            <rect x="50" y="48" width="28" height="16" rx="3" fill="#047857" />
            <rect x="34" y="28" width="28" height="16" rx="3" fill="#D97706" />
            <rect x="22" y="68" width="52" height="12" rx="3" fill="#043D2D" />
          </>
        )}

        {kind === "appliance" && (
          <>
            <circle cx="48" cy="38" r="22" fill="#ECFDF5" stroke="#065F46" strokeWidth="4" />
            <circle cx="48" cy="38" r="5" fill="#065F46" />
            <path d="M48 20C53 20 55 28 48 33C41 28 43 20 48 20Z" fill="#10B981" />
            <path d="M64 46C61 51 53 49 51 41C59 38 66 42 64 46Z" fill="#10B981" />
            <path d="M32 46C30 42 37 38 45 41C43 49 35 51 32 46Z" fill="#10B981" />
            <path d="M48 60V76" stroke="#043D2D" strokeWidth="5" strokeLinecap="round" />
            <rect x="34" y="74" width="28" height="7" rx="3.5" fill="#065F46" />
          </>
        )}

        {kind === "fashion" && (
          <>
            <path d="M32 22L40 18H56L64 22L76 34L68 44L60 38V76H36V38L28 44L20 34L32 22Z" fill="#065F46" />
            <path d="M40 18C42 24 54 24 56 18" stroke="#FDE68A" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="40" y="48" width="16" height="4" rx="2" fill="#A7F3D0" />
          </>
        )}

        {kind === "health" && (
          <>
            <rect x="28" y="28" width="40" height="52" rx="10" fill="#ECFDF5" stroke="#065F46" strokeWidth="3.5" />
            <rect x="38" y="16" width="20" height="12" rx="4" fill="#065F46" />
            <path d="M48 44V64M38 54H58" stroke="#065F46" strokeWidth="5" strokeLinecap="round" />
          </>
        )}

        {kind === "auto" && (
          <>
            <circle cx="48" cy="48" r="28" fill="#043D2D" />
            <circle cx="48" cy="48" r="15" fill="#ECFDF5" />
            <circle cx="48" cy="48" r="6" fill="#D97706" />
            <path d="M48 20V28M48 68V76M20 48H28M68 48H76" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
          </>
        )}

        {kind === "general" && (
          <>
            <path d="M22 34L48 20L74 34V64L48 78L22 64V34Z" fill="#065F46" />
            <path d="M22 34L48 48L74 34" stroke="#A7F3D0" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M48 48V78" stroke="#A7F3D0" strokeWidth="3.5" />
            <circle cx="66" cy="28" r="8" fill="#FDE68A" />
          </>
        )}
      </svg>
    </div>
  );
}
