import { describe, expect, it } from "vitest";
import {
  createConfirmRequest,
  revealSellerPhone,
  submitAccuracyFeedback,
  submitBuyerReport,
  submitDemandPost,
} from "./buyer-ops";

function makeMockDb() {
  return {
    sellers: [
      {
        id: "shop_test",
        business_name: "Test Shop",
        slug: "test-shop",
        phone: "08031234567",
        whatsapp_number: "08031234567",
        accuracy_score: 0.9,
        status: "active",
      },
    ],
    listings: [
      {
        id: "lst_test",
        seller_id: "shop_test",
        title_as_listed: "Tiger Generator",
        price_kobo: 9_800_000,
        stock_status: "in",
        status: "active",
        views_7d: 0,
        report_count: 0,
      },
    ],
    confirm_requests: [],
    accuracy_reports: [],
    reports: [],
    demand_posts: [],
    events: [],
    audit_log: [],
  };
}

describe("buyer-ops integration rules", () => {
  it("creates a pending confirm_request visible to the seller", () => {
    const db = makeMockDb();
    const res = createConfirmRequest(db, {
      listingId: "lst_test",
      buyerName: "Chinedu",
      buyerPhone: "0803 555 1212",
    });
    expect(res.ok).toBe(true);
    expect(db.confirm_requests).toHaveLength(1);
    expect((db.confirm_requests[0] as any).state).toBe("pending");
    expect((db.confirm_requests[0] as any).buyer_phone).toBe("+2348035551212");
  });

  it("auto-demotes a listing to unconfirmed after 3 distinct not_available strikes (US-3.2)", () => {
    const db = makeMockDb();
    expect(
      submitAccuracyFeedback(db, {
        listingId: "lst_test",
        verdict: "not_available",
        buyerKey: "b1",
      }).demoted
    ).toBe(false);
    // Same buyer tapping twice does not count as 2 strikes
    expect(
      submitAccuracyFeedback(db, {
        listingId: "lst_test",
        verdict: "not_available",
        buyerKey: "b1",
      }).strikes
    ).toBe(1);
    expect(
      submitAccuracyFeedback(db, {
        listingId: "lst_test",
        verdict: "not_available",
        buyerKey: "b2",
      }).demoted
    ).toBe(false);

    const third = submitAccuracyFeedback(db, {
      listingId: "lst_test",
      verdict: "not_available",
      buyerKey: "b3",
    });
    expect(third.demoted).toBe(true);
    expect(db.listings[0].stock_status).toBe("unconfirmed");
  });

  it("enforces 15 reveals/hour anti-scraping rate limit on phone numbers (US-4.2)", () => {
    const db = makeMockDb();
    for (let i = 0; i < 15; i++) {
      const okRes = revealSellerPhone(db, {
        sellerId: "shop_test",
        clientKey: "ip_1",
      });
      expect(okRes.ok).toBe(true);
    }
    const blocked = revealSellerPhone(db, {
      sellerId: "shop_test",
      clientKey: "ip_1",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.status).toBe(429);
    }
  });

  it("records demand posts and buyer abuse reports cleanly", () => {
    const db = makeMockDb();
    expect(
      submitDemandPost(db, {
        rawText: "Need 1.5HP copper coil AC around Woji",
        cluster: "Ada George",
      }).ok
    ).toBe(true);
    expect(db.demand_posts).toHaveLength(1);

    expect(
      submitBuyerReport(db, {
        listingId: "lst_test",
        reason: "wrong_price",
        note: "Quoted higher price on arrival",
      }).ok
    ).toBe(true);
    expect(db.reports).toHaveLength(1);
  });
});
