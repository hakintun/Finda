import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
    assert.equal(res.ok, true);
    assert.equal(db.confirm_requests.length, 1);
    assert.equal((db.confirm_requests[0] as any).state, "pending");
    assert.equal((db.confirm_requests[0] as any).buyer_phone, "+2348035551212");
  });

  it("auto-demotes a listing to unconfirmed after 3 distinct not_available strikes (US-3.2)", () => {
    const db = makeMockDb();
    assert.equal(
      submitAccuracyFeedback(db, {
        listingId: "lst_test",
        verdict: "not_available",
        buyerKey: "b1",
      }).demoted,
      false
    );
    // Same buyer tapping twice does not count as 2 strikes
    assert.equal(
      submitAccuracyFeedback(db, {
        listingId: "lst_test",
        verdict: "not_available",
        buyerKey: "b1",
      }).strikes,
      1
    );
    assert.equal(
      submitAccuracyFeedback(db, {
        listingId: "lst_test",
        verdict: "not_available",
        buyerKey: "b2",
      }).demoted,
      false
    );

    const third = submitAccuracyFeedback(db, {
      listingId: "lst_test",
      verdict: "not_available",
      buyerKey: "b3",
    });
    assert.equal(third.demoted, true);
    assert.equal(db.listings[0].stock_status, "unconfirmed");
  });

  it("enforces 15 reveals/hour anti-scraping rate limit on phone numbers (US-4.2)", () => {
    const db = makeMockDb();
    for (let i = 0; i < 15; i++) {
      const okRes = revealSellerPhone(db, {
        sellerId: "shop_test",
        clientKey: "ip_1",
      });
      assert.equal(okRes.ok, true);
    }
    const blocked = revealSellerPhone(db, {
      sellerId: "shop_test",
      clientKey: "ip_1",
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.equal(blocked.status, 429);
    }
  });

  it("records demand posts and buyer abuse reports cleanly", () => {
    const db = makeMockDb();
    assert.equal(
      submitDemandPost(db, {
        rawText: "Need 1.5HP copper coil AC around Woji",
        cluster: "Ada George",
      }).ok,
      true
    );
    assert.equal(db.demand_posts.length, 1);

    assert.equal(
      submitBuyerReport(db, {
        listingId: "lst_test",
        reason: "wrong_price",
        note: "Quoted higher price on arrival",
      }).ok,
      true
    );
    assert.equal(db.reports.length, 1);
  });
});
