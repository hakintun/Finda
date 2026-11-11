import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  authenticateCustomer,
  issueVerificationOtp,
  registerCustomer,
  requestLoginOtp,
  verifyCustomerOtp,
} from "./customer-auth";
import { toggleCustomerStatus, toggleSellerStatus } from "./ops";
import { queryBuyerCatalog } from "./buyer-cards";
import { emptyDraft, parsePriceNaira, validateStep } from "./onboarding";

function makeDb() {
  const now = new Date().toISOString();
  return {
    zones: [
      { id: "mile1", name: "Mile 1 Market", center_lat: 4.8, center_lng: 7.0 },
    ],
    products: [],
    synonyms: [],
    users: [
      {
        id: "usr_existing",
        name: "Secret Existing Customer",
        role: "seller",
        email: "existing@shop.ng",
        phone: "+2348030001111",
        status: "active",
      },
    ],
    sellers: [
      {
        id: "shop_existing",
        user_id: "usr_existing",
        business_name: "Secret Existing Stall",
        slug: "secret-stall",
        zone_id: "mile1",
        lat: 4.8,
        lng: 7.0,
        landmark_text: "Line 4 Mile 1",
        phone: "+2348030001111",
        verification_tier: "phone",
        status: "active",
      },
    ],
    listings: [
      {
        id: "lst_existing",
        seller_id: "shop_existing",
        title_as_listed: "50kg Mama Gold Rice",
        category: "Provisions",
        price_kobo: 8_200_000,
        stock_status: "in",
        confirmed_at: now,
        status: "active",
      },
    ],
    otp_codes: [],
    user_sessions: [{ token: "tok_1", user_id: "usr_existing" }],
    audit_log: [],
    events: [],
  };
}

describe("Multi-channel customer verification, privacy & admin delisting", () => {
  it("registers and verifies a Buyer via Email, Phone SMS, and WhatsApp", () => {
    const db = makeDb();

    const reg = registerCustomer(db, {
      name: "Adaeze Nwosu",
      role: "buyer",
      email: "adaeze@example.com",
      phone: "08051112233",
      password: "securePassword1",
      channel: "email",
    });
    assert.equal(reg.ok, true);
    if (!reg.ok) return;
    assert.equal(reg.otp?.channel, "email");
    assert.equal(reg.user.is_verified, false);

    // Verify Email OTP
    const verEmail = verifyCustomerOtp(db, {
      userId: reg.user.id,
      channel: "email",
      code: reg.otp!.sandboxCode!,
    });
    assert.equal(verEmail.ok, true);
    assert.equal(reg.user.is_verified, true);
    assert.ok(reg.user.verified_channels.includes("email"));

    // Also verify Phone SMS
    const smsOtp = issueVerificationOtp(db, {
      userId: reg.user.id,
      channel: "phone",
    });
    assert.equal(smsOtp.ok, true);
    if (smsOtp.ok) {
      assert.equal(
        verifyCustomerOtp(db, {
          userId: reg.user.id,
          channel: "phone",
          code: smsOtp.sandboxCode!,
        }).ok,
        true
      );
    }

    // Also verify WhatsApp
    const waOtp = issueVerificationOtp(db, {
      userId: reg.user.id,
      channel: "whatsapp",
    });
    assert.equal(waOtp.ok, true);
    if (waOtp.ok) {
      assert.ok(waOtp.whatsappLink?.includes("wa.me/2348051112233"));
      assert.equal(
        verifyCustomerOtp(db, {
          userId: reg.user.id,
          channel: "whatsapp",
          code: waOtp.sandboxCode!,
        }).ok,
        true
      );
    }

    assert.ok(reg.user.verified_channels.includes("email"));
    assert.ok(reg.user.verified_channels.includes("phone"));
    assert.ok(reg.user.verified_channels.includes("whatsapp"));
  });

  it("never leaks already-registered customer names or shops during sign-up", () => {
    const db = makeDb();
    const dup = registerCustomer(db, {
      name: "New Person",
      role: "seller",
      email: "existing@shop.ng",
      password: "password123",
      channel: "email",
    });
    assert.equal(dup.ok, false);
    if (!dup.ok) {
      assert.equal(dup.error, "account_exists");
      assert.ok(!JSON.stringify(dup).includes("Secret Existing"));
    }
  });

  it("immediately hides a customer and all their listings when Admin delists them", () => {
    const db = makeDb();

    // Initially visible in catalog
    assert.equal(queryBuyerCatalog(db, { q: "rice" }).results.length, 1);
    assert.equal(queryBuyerCatalog(db, {}).results.length, 1);

    // Admin delists the customer
    const delist = toggleSellerStatus(db, "usr_admin", "shop_existing");
    assert.equal(delist.ok, true);
    if (delist.ok) assert.equal(delist.status, "delisted");

    // Immediately gone from both keyword search and browse catalog
    assert.equal(queryBuyerCatalog(db, { q: "rice" }).results.length, 0);
    assert.equal(queryBuyerCatalog(db, {}).results.length, 0);
    // Active sessions for delisted customer are revoked
    assert.equal(db.user_sessions.length, 0);

    // Restoring brings them back immediately
    const restore = toggleSellerStatus(db, "usr_admin", "shop_existing");
    assert.equal(restore.ok, true);
    assert.equal(queryBuyerCatalog(db, { q: "rice" }).results.length, 1);
  });

  it("authenticates registered customer and blocks suspended/delisted accounts", () => {
    const db = makeDb();
    const reg = registerCustomer(db, {
      name: "Boma Briggs",
      role: "seller",
      phone: "08098887766",
      password: "mySecretPassword",
      channel: "whatsapp",
    });
    assert.equal(reg.ok, true);

    const okLogin = authenticateCustomer(db, {
      identifier: "0809 888 7766",
      password: "mySecretPassword",
    });
    assert.equal(okLogin.ok, true);

    // Suspend user -> login denied
    if (reg.ok) {
      reg.user.status = "delisted";
    }
    const blocked = authenticateCustomer(db, {
      identifier: "08098887766",
      password: "mySecretPassword",
    });
    assert.equal(blocked.ok, false);
  });

  it("delists and restores a customer record directly via toggleCustomerStatus", () => {
    const db = makeDb();
    assert.equal(queryBuyerCatalog(db, {}).results.length, 1);
    assert.equal(db.user_sessions.length, 1);

    const out = toggleCustomerStatus(db, "usr_admin", "usr_existing");
    assert.equal(out.ok, true);
    if (out.ok) assert.equal(out.status, "delisted");

    // Linked shop & listings vanish from catalog and sessions are revoked
    assert.equal(queryBuyerCatalog(db, {}).results.length, 0);
    assert.equal(db.user_sessions.length, 0);

    const back = toggleCustomerStatus(db, "usr_admin", "usr_existing");
    assert.equal(back.ok, true);
    assert.equal(queryBuyerCatalog(db, {}).results.length, 1);
  });

  it("allows OTP-only accounts to sign in seamlessly via 6-digit code (WhatsApp/SMS/Email)", () => {
    const db = makeDb();
    // usr_existing has no password_hash -> password login guides to 6-digit code
    const pwAttempt = authenticateCustomer(db, {
      identifier: "+2348030001111",
      password: "anyPassword",
    });
    assert.equal(pwAttempt.ok, false);
    if (!pwAttempt.ok) assert.equal(pwAttempt.error, "otp_only_account");

    // Sign in with 6-digit code via WhatsApp
    const otpReq = requestLoginOtp(db, {
      identifier: "0803 000 1111",
      channel: "whatsapp",
    });
    assert.equal(otpReq.ok, true);
    if (!otpReq.ok) return;

    const ver = verifyCustomerOtp(db, {
      otpId: otpReq.otpId,
      channel: "whatsapp",
      code: otpReq.sandboxCode!,
    });
    assert.equal(ver.ok, true);
    if (ver.ok) {
      assert.equal(ver.user.id, "usr_existing");
      assert.equal(ver.shop?.id, "shop_existing");
    }
  });

  it("parses formatted Naira prices with commas and symbols cleanly during publish validation", () => {
    assert.equal(parsePriceNaira("18,500"), 18500);
    assert.equal(parsePriceNaira("₦ 250,000"), 250000);
    assert.equal(parsePriceNaira("4500"), 4500);
    assert.equal(parsePriceNaira(""), 0);

    const d = emptyDraft("drf_test_publish");
    d.verified = true;
    d.consent = true;
    d.business_name = "Rivers Solar Hub";
    d.owner_name = "Tamuno";
    d.primary_category = "Solar & Power";
    d.zone_id = "mile-1";
    d.lat = 4.7918;
    d.lng = 7.0012;
    d.landmark_text = "Beside First Bank, Mile 1 Market";
    d.items = [
      {
        title: "200Ah Tubular Battery",
        product_id: null,
        price_naira: "₦ 185,000",
        stock_status: "in",
      },
    ];

    assert.deepEqual(validateStep(5, d), []);
  });
});
