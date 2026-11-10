import type { FreshnessBucket } from "./types";

export const WAT_TIMEZONE = "Africa/Lagos";

const nairaIntFormatter = new Intl.NumberFormat("en-NG", {
  maximumFractionDigits: 0,
});

const watDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: WAT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const watTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  timeZone: WAT_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export interface FormatNairaOptions {
  /** Compact shorthand e.g. ₦185k for dense secondary chips */
  compact?: boolean;
  /** Appends " · Negotiable" per PRD D-09 */
  negotiable?: boolean;
  /** Always show .00 even when whole Naira */
  alwaysShowKobo?: boolean;
}

/**
 * Formats integer kobo into Nigerian Naira (₦) using en-NG grouping.
 * PRD §11: Prices are stored strictly as integer kobo — floats are rejected.
 */
export function formatNairaFromKobo(
  priceKobo: number | bigint,
  options: FormatNairaOptions = {}
): string {
  let koboBig: bigint;

  if (typeof priceKobo === "bigint") {
    if (priceKobo < 0n) {
      throw new RangeError("priceKobo cannot be negative");
    }
    koboBig = priceKobo;
  } else {
    if (!Number.isSafeInteger(priceKobo) || priceKobo < 0) {
      throw new RangeError(
        `priceKobo must be a non-negative safe integer in kobo, received: ${priceKobo}`
      );
    }
    koboBig = BigInt(priceKobo);
  }

  const wholeNaira = koboBig / 100n;
  const remainderKobo = Number(koboBig % 100n);

  let formattedCore: string;

  if (options.compact && wholeNaira >= 1_000n && remainderKobo === 0) {
    const nairaNum = Number(wholeNaira);
    if (nairaNum >= 1_000_000) {
      const millions = nairaNum / 1_000_000;
      const clean = Number.isInteger(millions)
        ? millions.toString()
        : millions.toFixed(1).replace(/\.0$/, "");
      formattedCore = `₦${clean}m`;
    } else {
      const thousands = nairaNum / 1_000;
      const clean = Number.isInteger(thousands)
        ? thousands.toString()
        : thousands.toFixed(1).replace(/\.0$/, "");
      formattedCore = `₦${clean}k`;
    }
  } else {
    const wholeStr = nairaIntFormatter.format(wholeNaira);
    if (remainderKobo > 0 || options.alwaysShowKobo) {
      const koboPadded = remainderKobo.toString().padStart(2, "0");
      formattedCore = `₦${wholeStr}.${koboPadded}`;
    } else {
      formattedCore = `₦${wholeStr}`;
    }
  }

  if (options.negotiable) {
    return `${formattedCore} · Negotiable`;
  }

  return formattedCore;
}

/**
 * Parses a Naira string or number (e.g. "185,000", "₦185000.50", 185000)
 * into exact integer kobo without IEEE-754 floating-point drift.
 */
export function parseNairaToKobo(input: string | number): number {
  const cleaned = String(input)
    .replace(/[₦,\s_]/g, "")
    .trim();

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new ValueError(
      `Invalid Naira amount "${input}". Expected digits with at most 2 decimal places.`
    );
  }

  const [nairaPart, koboPart = ""] = cleaned.split(".");
  const koboPadded = koboPart.padEnd(2, "0");
  const totalKobo = Number(nairaPart) * 100 + Number(koboPadded);

  if (!Number.isSafeInteger(totalKobo)) {
    throw new RangeError("Amount exceeds safe integer kobo range");
  }

  return totalKobo;
}

class ValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValueError";
  }
}

export interface FreshnessInfo {
  bucket: FreshnessBucket;
  /** Short relative age e.g. "6h ago", "yesterday", "4 days ago" (PRD NFR-9) */
  relativeAge: string;
  /** Full UI line for result cards per PRD §7.2, D-07 & §9.2 */
  label: string;
  /** Caveat shown on Aging/Stale/Expired listings */
  caveat: string | null;
  ageHours: number | null;
}

function getWatDayDiff(earlier: Date, later: Date): number {
  const earlierKey = watDateKeyFormatter.format(earlier); // YYYY-MM-DD in Africa/Lagos
  const laterKey = watDateKeyFormatter.format(later);
  const [ey, em, ed] = earlierKey.split("-").map(Number);
  const [ly, lm, ld] = laterKey.split("-").map(Number);
  const utcEarlier = Date.UTC(ey, em - 1, ed);
  const utcLater = Date.UTC(ly, lm - 1, ld);
  return Math.round((utcLater - utcEarlier) / 86_400_000);
}

/**
 * Computes listing freshness state & plain-English WAT relative label.
 * PRD §7.2 rules:
 *  - Fresh:   < 48h
 *  - Aging:   48h to <= 7 days (168h) — shown with caveat
 *  - Stale:   > 7 days to <= 14 days (336h) — demoted with strong caveat
 *  - Expired: > 14 days or unconfirmed — hidden from default search
 */
export function getFreshnessInfo(
  confirmedAt: Date | string | number | null | undefined,
  now: Date = new Date()
): FreshnessInfo {
  if (confirmedAt === null || confirmedAt === undefined || confirmedAt === "") {
    return {
      bucket: "expired",
      relativeAge: "never",
      label: "Unconfirmed — ask seller first",
      caveat: "Never confirmed",
      ageHours: null,
    };
  }

  const confirmedDate =
    confirmedAt instanceof Date ? confirmedAt : new Date(confirmedAt);

  if (Number.isNaN(confirmedDate.getTime())) {
    return {
      bucket: "expired",
      relativeAge: "unknown",
      label: "Unconfirmed — ask seller first",
      caveat: "Invalid timestamp",
      ageHours: null,
    };
  }

  const diffMs = Math.max(0, now.getTime() - confirmedDate.getTime());
  const ageMinutes = Math.floor(diffMs / 60_000);
  const ageHours = diffMs / 3_600_000;
  const ageDays = Math.floor(ageHours / 24);
  const watDayDiff = getWatDayDiff(confirmedDate, now);

  // 1. Fresh (< 48 hours)
  if (ageHours < 48) {
    let relativeAge: string;
    if (ageMinutes < 2) {
      relativeAge = "just now";
    } else if (ageMinutes < 60) {
      relativeAge = `${ageMinutes}m ago`;
    } else if (watDayDiff === 1 && ageHours >= 18) {
      relativeAge = "yesterday";
    } else {
      relativeAge = `${Math.floor(ageHours)}h ago`;
    }

    return {
      bucket: "fresh",
      relativeAge,
      label: `Confirmed ${relativeAge}`,
      caveat: null,
      ageHours,
    };
  }

  // 2. Aging (48h to <= 7 days / 168h)
  if (ageHours <= 168) {
    const days = Math.max(2, ageDays);
    const relativeAge = `${days} days ago`;
    const caveat = "may have changed";
    return {
      bucket: "aging",
      relativeAge,
      label: `Confirmed ${relativeAge} — ${caveat}`,
      caveat,
      ageHours,
    };
  }

  // 3. Stale (> 7 days to <= 14 days / 336h)
  if (ageHours <= 336) {
    const days = Math.max(8, ageDays);
    const relativeAge = `${days} days ago`;
    const caveat = "likely outdated";
    return {
      bucket: "stale",
      relativeAge,
      label: `Confirmed ${relativeAge} — ${caveat}`,
      caveat,
      ageHours,
    };
  }

  // 4. Expired (> 14 days)
  const relativeAge = `${ageDays} days ago`;
  const caveat = "unconfirmed >14d";
  return {
    bucket: "expired",
    relativeAge,
    label: `Unconfirmed (${relativeAge})`,
    caveat,
    ageHours,
  };
}

/**
 * Formats a timestamp into Port Harcourt local time (WAT / Africa/Lagos).
 */
export function formatTimeWAT(dateInput: Date | string | number): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return `${watTimeFormatter.format(date)} WAT`;
}

/**
 * Normalizes Nigerian phone numbers to strict E.164 (+234XXXXXXXXXX) per PRD §11 & NFR-9.
 * Accepts "0803 123 4567", "8031234567", "+2348031234567", "2348031234567".
 * Returns null if not a valid 10-digit NG subscriber number.
 */
export function normalizeNgPhone(raw: string): string | null {
  const digitsAndPlus = raw.replace(/[\s\-().]/g, "");
  let national = "";

  if (digitsAndPlus.startsWith("+234")) {
    national = digitsAndPlus.slice(4);
  } else if (digitsAndPlus.startsWith("234") && digitsAndPlus.length === 13) {
    national = digitsAndPlus.slice(3);
  } else if (digitsAndPlus.startsWith("0") && digitsAndPlus.length === 11) {
    national = digitsAndPlus.slice(1);
  } else if (digitsAndPlus.length === 10) {
    national = digitsAndPlus;
  } else {
    return null;
  }

  // Nigerian mobile prefixes start with 70, 80, 81, 90, 91 (10 digits after +234)
  if (!/^[789][01]\d{8}$/.test(national)) {
    return null;
  }

  return `+234${national}`;
}

/**
 * Formats distance in metres/kilometres for Port Harcourt results cards.
 */
export function formatDistanceKm(km: number | null | undefined): string {
  if (km === null || km === undefined || Number.isNaN(km) || km < 0) {
    return "Distance unknown";
  }
  if (km < 0.1) {
    return "< 100 m";
  }
  if (km < 1) {
    const roundedMetres = Math.round((km * 1000) / 50) * 50;
    return `${roundedMetres} m`;
  }
  const oneDecimal = Math.round(km * 10) / 10;
  return `${oneDecimal % 1 === 0 ? oneDecimal.toFixed(0) : oneDecimal.toFixed(1)} km`;
}
