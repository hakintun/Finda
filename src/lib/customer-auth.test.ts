import { describe, expect, it } from "vitest";
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
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    expect(reg.otp?.channel).toBe("email");
    expect(reg.user.is_verified).toBe(false);

    // Verify Email OTP
    const verEmail = verifyCustomerOtp(db, {
      userId: reg.user.id,
      channel: "email",
      code: reg.otp!.sandboxCode!,
    });
    expect(verEmail.ok).toBe(true);
    expect(reg.user.is_verified).toBe(true);
    expect(reg.user.verified_channels).toContain("email");

    // Also verify Phone SMS
    const smsOtp = issueVerificationOtp(db, {
      userId: reg.user.id,
      channel: "phone",
    });
    expect(smsOtp.ok).toBe(true);
    if (smsOtp.ok) {
      expect(
        verifyCustomerOtp(db, {
          userId: reg.user.id,
          channel: "phone",
          code: smsOtp.sandboxCode!,
        }).ok
      ).toBe(true);
    }

    // Also verify WhatsApp
    const waOtp = issueVerificationOtp(db, {
      userId: reg.user.id,
      channel: "whatsapp",
    });
    expect(waOtp.ok).toBe(true);
    if (waOtp.ok) {
      expect(waOtp.whatsappLink).toContain("wa.me/2348051112233");
      expect(
        verifyCustomerOtp(db, {
          userId: reg.user.id,
          channel: "whatsapp",
          code: waOtp.sandboxCode!,
        }).ok
      ).toBe(true);
    }

    expect(reg.user.verified_channels).toEqual(
      expect.arrayContaining(["email", "phone", "whatsapp"])
    );
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
    expect(dup.ok).toBe(false);
    if (!dup.ok) {
      expect(dup.error).toBe("account_exists");
      expect(JSON.stringify(dup)).not.toContain("Secret Existing");
    }
  });

  it("immediately hides a customer and all their listings when Admin delists them", () => {
    const db = makeDb();

    // Initially visible in catalog
    expect(queryBuyerCatalog(db, { q: "rice" }).results).toHaveLength(1);
    expect(queryBuyerCatalog(db, {}).results).toHaveLength(1);

    // Admin delists the customer
    const delist = toggleSellerStatus(db, "usr_admin", "shop_existing");
    expect(delist.ok).toBe(true);
    if (delist.ok) expect(delist.status).toBe("delisted");

    // Immediately gone from both keyword search and browse catalog
    expect(queryBuyerCatalog(db, { q: "rice" }).results).toHaveLength(0);
    expect(queryBuyerCatalog(db, {}).results).toHaveLength(0);
    // Active sessions for delisted customer are revoked
    expect(db.user_sessions).toHaveLength(0);

    // Restoring brings them back immediately
    const restore = toggleSellerStatus(db, "usr_admin", "shop_existing");
    expect(restore.ok).toBe(true);
    expect(queryBuyerCatalog(db, { q: "rice" }).results).toHaveLength(1);
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
    expect(reg.ok).toBe(true);

    const okLogin = authenticateCustomer(db, {
      identifier: "0809 888 7766",
      password: "mySecretPassword",
    });
    expect(okLogin.ok).toBe(true);

    // Suspend user -> login denied
    if (reg.ok) {
      reg.user.status = "delisted";
    }
    const blocked = authenticateCustomer(db, {
      identifier: "08098887766",
      password: "mySecretPassword",
    });
    expect(blocked.ok).toBe(false);
  });

  it("delists and restores a customer record directly via toggleCustomerStatus", () => {
    const db = makeDb();
    expect(queryBuyerCatalog(db, {}).results).toHaveLength(1);
    expect(db.user_sessions).toHaveLength(1);

    const out = toggleCustomerStatus(db, "usr_admin", "usr_existing");
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.status).toBe("delisted");

    // Linked shop & listings vanish from catalog and sessions are revoked
    expect(queryBuyerCatalog(db, {}).results).toHaveLength(0);
    expect(db.user_sessions).toHaveLength(0);

    const back = toggleCustomerStatus(db, "usr_admin", "usr_existing");
    expect(back.ok).toBe(true);
    expect(queryBuyerCatalog(db, {}).results).toHaveLength(1);
  });

  it("allows OTP-only accounts to sign in seamlessly via 6-digit code (WhatsApp/SMS/Email)", () => {
    const db = makeDb();
    // usr_existing has no password_hash -> password login guides to 6-digit code
    const pwAttempt = authenticateCustomer(db, {
      identifier: "+2348030001111",
      password: "anyPassword",
    });
    expect(pwAttempt.ok).toBe(false);
    if (!pwAttempt.ok) expect(pwAttempt.error).toBe("otp_only_account");

    // Sign in with 6-digit code via WhatsApp
    const otpReq = requestLoginOtp(db, {
      identifier: "0803 000 1111",
      channel: "whatsapp",
    });
    expect(otpReq.ok).toBe(true);
    if (!otpReq.ok) return;

    const ver = verifyCustomerOtp(db, {
      otpId: otpReq.otpId,
      channel: "whatsapp",
      code: otpReq.sandboxCode!,
    });
    expect(ver.ok).toBe(true);
    if (ver.ok) {
      expect(ver.user.id).toBe("usr_existing");
      expect(ver.shop?.id).toBe("shop_existing");
    }
  });

  it("parses formatted Naira prices with commas and symbols cleanly during publish validation", () => {
    expect(parsePriceNaira("18,500")).toBe(18500);
    expect(parsePriceNaira("₦ 250,000")).toBe(250000);
    expect(parsePriceNaira("4500")).toBe(4500);
    expect(parsePriceNaira("")).toBe(0);

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

    expect(validateStep(5, d)).toEqual([]);
  });
});
