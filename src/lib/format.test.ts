import { describe, expect, it } from "vitest";
import {
  formatDistanceKm,
  formatNairaFromKobo,
  formatTimeWAT,
  getFreshnessInfo,
  normalizeNgPhone,
  parseNairaToKobo,
} from "./format";

describe("formatNairaFromKobo", () => {
  it("formats whole Naira amounts from integer kobo with en-NG commas", () => {
    expect(formatNairaFromKobo(0)).toBe("₦0");
    expect(formatNairaFromKobo(50_000)).toBe("₦500");
    expect(formatNairaFromKobo(18_500_000)).toBe("₦185,000");
    expect(formatNairaFromKobo(125_000_000n)).toBe("₦1,250,000");
  });

  it("renders kobo decimals and supports compact + negotiable options", () => {
    expect(formatNairaFromKobo(150_050)).toBe("₦1,500.50");
    expect(formatNairaFromKobo(18_500_000, { compact: true })).toBe("₦185k");
    expect(formatNairaFromKobo(18_500_000, { negotiable: true })).toBe(
      "₦185,000 · Negotiable"
    );
  });

  it("rejects floating-point or negative kobo values", () => {
    expect(() => formatNairaFromKobo(1850.5)).toThrow(RangeError);
    expect(() => formatNairaFromKobo(-100)).toThrow(RangeError);
  });
});

describe("parseNairaToKobo", () => {
  it("converts user-entered Naira strings to exact integer kobo", () => {
    expect(parseNairaToKobo("185,000")).toBe(18_500_000);
    expect(parseNairaToKobo("₦19.99")).toBe(1999);
    expect(parseNairaToKobo(2500)).toBe(250_000);
  });
});

describe("getFreshnessInfo (WAT decay states)", () => {
  const now = new Date("2026-11-06T14:00:00Z");

  it("marks <48h confirmations as fresh", () => {
    expect(getFreshnessInfo("2026-11-06T08:00:00Z", now).label).toBe(
      "Confirmed 6h ago"
    );
    expect(getFreshnessInfo("2026-11-05T14:00:00Z", now).label).toBe(
      "Confirmed yesterday"
    );
  });

  it("marks 3–7d as aging, 8–14d as stale, and >14d as expired", () => {
    expect(getFreshnessInfo("2026-11-02T12:00:00Z", now).bucket).toBe("aging");
    expect(getFreshnessInfo("2026-10-27T12:00:00Z", now).bucket).toBe("stale");
    expect(getFreshnessInfo("2026-10-17T12:00:00Z", now).bucket).toBe("expired");
  });
});

describe("WAT time, NG phone & distance helpers", () => {
  it("formats WAT time, normalizes +234 numbers, and formats distances", () => {
    expect(formatTimeWAT("2026-11-06T13:30:00Z")).toContain("WAT");
    expect(normalizeNgPhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalizeNgPhone("12345")).toBeNull();
    expect(formatDistanceKm(0.39)).toBe("400 m");
    expect(formatDistanceKm(1.24)).toBe("1.2 km");
  });
});
