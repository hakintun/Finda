import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
    assert.equal(formatNairaFromKobo(0), "₦0");
    assert.equal(formatNairaFromKobo(50_000), "₦500");
    assert.equal(formatNairaFromKobo(18_500_000), "₦185,000");
    assert.equal(formatNairaFromKobo(125_000_000n), "₦1,250,000");
  });

  it("renders kobo decimals and supports compact + negotiable options", () => {
    assert.equal(formatNairaFromKobo(150_050), "₦1,500.50");
    assert.equal(formatNairaFromKobo(18_500_000, { compact: true }), "₦185k");
    assert.equal(
      formatNairaFromKobo(18_500_000, { negotiable: true }),
      "₦185,000 · Negotiable"
    );
  });

  it("rejects floating-point or negative kobo values", () => {
    assert.throws(() => formatNairaFromKobo(1850.5), RangeError);
    assert.throws(() => formatNairaFromKobo(-100), RangeError);
  });
});

describe("parseNairaToKobo", () => {
  it("converts user-entered Naira strings to exact integer kobo", () => {
    assert.equal(parseNairaToKobo("185,000"), 18_500_000);
    assert.equal(parseNairaToKobo("₦19.99"), 1999);
    assert.equal(parseNairaToKobo(2500), 250_000);
  });
});

describe("getFreshnessInfo (WAT decay states)", () => {
  const now = new Date("2026-11-06T14:00:00Z");

  it("marks <48h confirmations as fresh", () => {
    assert.equal(
      getFreshnessInfo("2026-11-06T08:00:00Z", now).label,
      "Confirmed 6h ago"
    );
    assert.equal(
      getFreshnessInfo("2026-11-05T14:00:00Z", now).label,
      "Confirmed yesterday"
    );
  });

  it("marks 3–7d as aging, 8–14d as stale, and >14d as expired", () => {
    assert.equal(getFreshnessInfo("2026-11-02T12:00:00Z", now).bucket, "aging");
    assert.equal(getFreshnessInfo("2026-10-27T12:00:00Z", now).bucket, "stale");
    assert.equal(
      getFreshnessInfo("2026-10-17T12:00:00Z", now).bucket,
      "expired"
    );
  });
});

describe("WAT time, NG phone & distance helpers", () => {
  it("formats WAT time, normalizes +234 numbers, and formats distances", () => {
    assert.ok(formatTimeWAT("2026-11-06T13:30:00Z").includes("WAT"));
    assert.equal(normalizeNgPhone("0803 123 4567"), "+2348031234567");
    assert.equal(normalizeNgPhone("12345"), null);
    assert.equal(formatDistanceKm(0.39), "400 m");
    assert.equal(formatDistanceKm(1.24), "1.2 km");
  });
});
