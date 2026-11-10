import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { audit, getDB, id, nowISO, saveDB, trackEvent } from "./db";
import { getSessionCookieOptions } from "./cookie-opts";
import { toE164 } from "./freshness";

export const CUSTOMER_COOKIE = "finda_customer";
const SELLER_COOKIE = "finda_seller";

export type VerifyChannel = "email" | "phone" | "whatsapp";
export type CustomerRole = "buyer" | "seller";

const OTP_TTL_MS = 15 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, keyHex] = stored.split(":");
  const keyBuf = Buffer.from(keyHex, "hex");
  const derived = scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
}

export function normalizeEmail(raw: string | undefined | null): string | null {
  const e = (raw || "").trim().toLowerCase();
  if (!e) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

export function maskTarget(channel: VerifyChannel, target: string): string {
  if (channel === "email") {
    const [local, domain] = target.split("@");
    if (!domain) return target;
    const head = local.slice(0, 2);
    return `${head}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
  }
  if (target.length <= 6) return target;
  return `${target.slice(0, 6)}••••${target.slice(-3)}`;
}

function generateSixDigitOtp(): string {
  const n = randomBytes(4).readUInt32BE(0) % 900000;
  return String(100000 + n);
}

/**
 * Finds an existing customer account by email or Nigerian phone number.
 * Also links orphaned seller records (`db.sellers` without a matching `db.users` row)
 * so every registered trader can sign in seamlessly.
 */
function findCustomerByIdentifier(db: any, rawIdentifier: string) {
  const raw = (rawIdentifier || "").trim();
  const asEmail = normalizeEmail(raw);
  const asPhone = toE164(raw);

  if (!asEmail && !asPhone) return null;

  db.users = db.users || [];
  let user = db.users.find((u: any) => {
    if (asEmail && u.email && u.email.toLowerCase() === asEmail) return true;
    if (asPhone && u.phone && toE164(u.phone) === asPhone) return true;
    return false;
  });

  // If a shop exists in db.sellers with that phone number, ensure its linked user record is returned
  if (!user && asPhone) {
    const shop = (db.sellers || []).find(
      (s: any) =>
        (s.phone && toE164(s.phone) === asPhone) ||
        (s.whatsapp_number && toE164(s.whatsapp_number) === asPhone)
    );
    if (shop) {
      user = shop.user_id
        ? db.users.find((u: any) => u.id === shop.user_id)
        : null;
      if (!user) {
        user = {
          id: shop.user_id || id("usr"),
          name: shop.owner_name || shop.business_name || "Shop Owner",
          role: "seller",
          phone: asPhone,
          whatsapp_number: asPhone,
          status: shop.status === "active" ? "active" : shop.status,
          is_verified: Boolean(
            shop.verification_tier && shop.verification_tier !== "unverified"
          ),
          verified_channels: ["phone"],
          created_at: nowISO(),
        };
        shop.user_id = user.id;
        db.users.push(user);
      }
    }
  }

  return user || null;
}

/**
 * Registers a new Buyer or Seller WITHOUT ever exposing existing customer details.
 */
export function registerCustomer(
  db: any,
  input: {
    name: string;
    role: CustomerRole;
    email?: string;
    phone?: string;
    password: string;
    channel: VerifyChannel;
  }
) {
  const name = (input.name || "").trim();
  if (name.length < 2) {
    return {
      ok: false as const,
      error: "invalid_name",
      message: "Please enter your full name (at least 2 characters).",
    };
  }

  const role: CustomerRole = input.role === "seller" ? "seller" : "buyer";
  const email = input.email ? normalizeEmail(input.email) : null;
  const phone = input.phone ? toE164(input.phone) : null;

  if (input.email && !email) {
    return {
      ok: false as const,
      error: "invalid_email",
      message: "Please enter a valid email address.",
    };
  }
  if (input.phone && !phone) {
    return {
      ok: false as const,
      error: "invalid_phone",
      message:
        "Please enter a valid Nigerian phone number (e.g. 0803 123 4567).",
    };
  }

  if (input.channel === "email" && !email) {
    return {
      ok: false as const,
      error: "missing_email",
      message: "An email address is required to verify via Email.",
    };
  }
  if ((input.channel === "phone" || input.channel === "whatsapp") && !phone) {
    return {
      ok: false as const,
      error: "missing_phone",
      message: `A valid phone number is required to verify via ${
        input.channel === "whatsapp" ? "WhatsApp" : "Phone SMS"
      }.`,
    };
  }

  if (!input.password || input.password.length < 6) {
    return {
      ok: false as const,
      error: "weak_password",
      message: "Password must be at least 6 characters.",
    };
  }

  db.users = db.users || [];

  // Privacy-safe uniqueness check: never reveal who owns the contact
  const emailTaken =
    email &&
    db.users.some((u: any) => u.email && u.email.toLowerCase() === email);
  const phoneTaken =
    phone &&
    (db.users.some((u: any) => u.phone && toE164(u.phone) === phone) ||
      (db.sellers || []).some(
        (s: any) => s.phone && toE164(s.phone) === phone
      ));

  if (emailTaken || phoneTaken) {
    return {
      ok: false as const,
      error: "account_exists",
      message:
        "An account with these contact details already exists. Please sign in instead.",
    };
  }

  const user = {
    id: id("usr"),
    name,
    role,
    email,
    phone,
    whatsapp_number: phone,
    password_hash: hashPassword(input.password),
    verified_channels: [] as VerifyChannel[],
    is_verified: false,
    status: "active",
    created_at: nowISO(),
  };

  db.users.push(user);
  audit(db, user.id, "user", user.id, "customer_registered", null, {
    role,
    channel: input.channel,
  });

  const otpRes = issueVerificationOtp(db, {
    userId: user.id,
    channel: input.channel,
  });

  return {
    ok: true as const,
    user,
    otp: otpRes.ok ? otpRes : null,
  };
}

/**
 * Issues a 6-digit OTP on Email, Phone SMS, or WhatsApp.
 */
export function issueVerificationOtp(
  db: any,
  input: {
    userId: string;
    channel: VerifyChannel;
    overrideTarget?: string;
  }
) {
  const user = (db.users || []).find((u: any) => u.id === input.userId);
  if (!user) {
    return {
      ok: false as const,
      error: "user_not_found",
      message: "Account not found.",
    };
  }

  let target: string | null = null;
  if (input.channel === "email") {
    target = input.overrideTarget
      ? normalizeEmail(input.overrideTarget)
      : normalizeEmail(user.email);
    if (!target) {
      return {
        ok: false as const,
        error: "missing_email",
        message:
          "No email address is linked to this account. Choose WhatsApp or Phone SMS instead.",
      };
    }
    user.email = target;
  } else {
    target = input.overrideTarget
      ? toE164(input.overrideTarget)
      : toE164(user.phone || user.whatsapp_number || "");
    if (!target) {
      return {
        ok: false as const,
        error: "missing_phone",
        message:
          "No phone number is linked to this account. Choose Email verification instead.",
      };
    }
    user.phone = target;
    if (input.channel === "whatsapp") {
      user.whatsapp_number = target;
    }
  }

  db.otp_codes = db.otp_codes || [];
  const now = Date.now();
  const recent = db.otp_codes.filter(
    (c: any) =>
      c.user_id === user.id &&
      now - new Date(c.created_at).getTime() < OTP_TTL_MS
  );
  if (recent.length >= 8) {
    return {
      ok: false as const,
      error: "rate_limited",
      message:
        "Too many verification codes requested. Please wait a few minutes.",
    };
  }

  for (const c of db.otp_codes) {
    if (c.user_id === user.id && c.channel === input.channel && !c.used_at) {
      c.invalidated = true;
    }
  }

  const code = generateSixDigitOtp();
  const record = {
    id: id("otp"),
    user_id: user.id,
    channel: input.channel,
    target,
    code,
    attempts: 0,
    used_at: null as string | null,
    invalidated: false,
    expires_at: new Date(now + OTP_TTL_MS).toISOString(),
    created_at: nowISO(),
  };

  db.otp_codes.unshift(record);
  db.otp_codes = db.otp_codes.slice(0, 500);

  trackEvent(db, "otp_issued", {
    user_id: user.id,
    channel: input.channel,
  });

  const waDigits = target.replace(/\D/g, "");
  const whatsappLink =
    input.channel === "whatsapp"
      ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
          `Finda Verification Code: ${code} (valid for 15 minutes)`
        )}`
      : null;

  return {
    ok: true as const,
    otpId: record.id,
    channel: input.channel,
    maskedTarget: maskTarget(input.channel, target),
    sandboxCode:
      process.env.FINDA_HIDE_SANDBOX_OTP === "1" ? undefined : code,
    whatsappLink,
  };
}

/**
 * Initiates Passwordless 6-Digit Code Sign-In via Email, Phone SMS, or WhatsApp.
 * Works for password accounts, OTP-onboarded shops, and existing seeded accounts
 * without exposing any account names or customer details before OTP verification.
 */
export function requestLoginOtp(
  db: any,
  input: { identifier: string; channel?: VerifyChannel }
) {
  const raw = (input.identifier || "").trim();
  const asEmail = normalizeEmail(raw);
  const asPhone = toE164(raw);

  if (!asEmail && !asPhone) {
    return {
      ok: false as const,
      error: "invalid_identifier",
      message:
        "Enter a valid email address or Nigerian phone number (e.g. 0803 123 4567).",
    };
  }

  const user = findCustomerByIdentifier(db, raw);
  if (!user) {
    return {
      ok: false as const,
      error: "account_not_found",
      message:
        "No account found with that email or phone number. Tap 'Create account' to register in 30 seconds.",
    };
  }

  if (
    user.status === "banned" ||
    user.status === "delisted" ||
    user.status === "suspended"
  ) {
    return {
      ok: false as const,
      error: "account_suspended",
      message: "This account has been suspended by marketplace moderation.",
    };
  }

  const shop = (db.sellers || []).find((s: any) => s.user_id === user.id);
  if (shop && (shop.status === "banned" || shop.status === "delisted")) {
    return {
      ok: false as const,
      error: "shop_delisted",
      message: "Your shop has been delisted by marketplace moderation.",
    };
  }

  // Pick requested channel or auto-match identifier type
  let chosenChannel: VerifyChannel = input.channel || (asEmail ? "email" : "whatsapp");
  if (chosenChannel === "email" && !user.email) {
    chosenChannel = "whatsapp";
  } else if (chosenChannel !== "email" && !user.phone && user.email) {
    chosenChannel = "email";
  }

  return issueVerificationOtp(db, {
    userId: user.id,
    channel: chosenChannel,
  });
}

/**
 * Optional live external delivery hook (Resend Email / Termii SMS & WhatsApp) when env keys exist.
 */
export async function dispatchExternalOtp(
  channel: VerifyChannel,
  target: string,
  code: string
) {
  try {
    if (channel === "email" && process.env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.FINDA_FROM_EMAIL || "Finda <verify@finda.ng>",
          to: [target],
          subject: `${code} is your Finda verification code`,
          text: `Your Finda verification code is ${code}. It expires in 15 minutes.`,
        }),
      });
    } else if (
      (channel === "phone" || channel === "whatsapp") &&
      process.env.TERMII_API_KEY
    ) {
      await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: target.replace(/^\+/, ""),
          from: process.env.TERMII_SENDER_ID || "Finda",
          sms: `Your Finda verification code is ${code}. Valid for 15 mins.`,
          type: "plain",
          channel: channel === "whatsapp" ? "whatsapp" : "generic",
          api_key: process.env.TERMII_API_KEY,
        }),
      });
    }
  } catch {
    // Non-fatal: sandbox/in-app OTP verification remains available
  }
}

/**
 * Verifies a 6-digit OTP for Email, Phone SMS, or WhatsApp.
 * Supports lookup either by authenticated `userId` OR by `otpId` (for passwordless OTP login).
 */
export function verifyCustomerOtp(
  db: any,
  input: {
    userId?: string;
    otpId?: string;
    channel: VerifyChannel;
    code: string;
    newPassword?: string;
  }
) {
  const cleanCode = (input.code || "").replace(/\s+/g, "").trim();
  const now = Date.now();

  let record: any = null;
  if (input.otpId) {
    record = (db.otp_codes || []).find(
      (c: any) => c.id === input.otpId && !c.used_at && !c.invalidated
    );
  }
  if (!record && input.userId) {
    record = (db.otp_codes || []).find(
      (c: any) =>
        c.user_id === input.userId &&
        c.channel === input.channel &&
        !c.used_at &&
        !c.invalidated
    );
  }

  if (!record) {
    return {
      ok: false as const,
      error: "no_active_code",
      message: "No active verification code found. Please request a new code.",
    };
  }

  const user = (db.users || []).find((u: any) => u.id === record.user_id);
  if (!user) {
    return {
      ok: false as const,
      error: "user_not_found",
      message: "Account not found.",
    };
  }

  if (
    user.status === "banned" ||
    user.status === "delisted" ||
    user.status === "suspended"
  ) {
    return {
      ok: false as const,
      error: "account_suspended",
      message: "This account has been suspended by marketplace moderation.",
    };
  }

  if (now > new Date(record.expires_at).getTime()) {
    record.invalidated = true;
    return {
      ok: false as const,
      error: "expired",
      message:
        "This verification code has expired. Please request a new one.",
    };
  }

  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    record.invalidated = true;
    return {
      ok: false as const,
      error: "too_many_attempts",
      message: "Too many incorrect attempts. Please request a new code.",
    };
  }

  if (record.code !== cleanCode) {
    return {
      ok: false as const,
      error: "wrong_code",
      message:
        "Incorrect 6-digit verification code. Please check and try again.",
    };
  }

  record.used_at = nowISO();
  const verifiedChannel: VerifyChannel = record.channel || input.channel;
  user.verified_channels = Array.from(
    new Set([...(user.verified_channels || []), verifiedChannel])
  );
  user.is_verified = true;
  user.verified_at = nowISO();

  if (input.newPassword && input.newPassword.length >= 6) {
    user.password_hash = hashPassword(input.newPassword);
  }

  const shop = (db.sellers || []).find(
    (s: any) => s.user_id === user.id && s.status === "active"
  );
  if (
    shop &&
    (!shop.verification_tier ||
      shop.verification_tier === "none" ||
      shop.verification_tier === "unverified")
  ) {
    shop.verification_tier = "phone";
    shop.verified_via = verifiedChannel;
  }

  audit(db, user.id, "user", user.id, `verified_${verifiedChannel}`, null, {
    verified_channels: user.verified_channels,
  });
  trackEvent(db, "customer_verified", {
    user_id: user.id,
    channel: verifiedChannel,
    role: user.role,
  });

  return { ok: true as const, user, shop: shop || null };
}

/**
 * Authenticates an existing Buyer or Seller via Email or Phone + Password.
 * Never reveals customer names or private details on failure.
 */
export function authenticateCustomer(
  db: any,
  input: { identifier: string; password: string }
) {
  const user = findCustomerByIdentifier(db, input.identifier || "");

  if (!user) {
    return {
      ok: false as const,
      error: "invalid_credentials",
      message:
        "Invalid email/phone or password. (New here? Tap 'Create account' above.)",
    };
  }

  if (
    user.status === "banned" ||
    user.status === "delisted" ||
    user.status === "suspended"
  ) {
    return {
      ok: false as const,
      error: "account_suspended",
      message: "This account has been suspended by marketplace moderation.",
    };
  }

  const shop = (db.sellers || []).find((s: any) => s.user_id === user.id);
  if (shop && (shop.status === "banned" || shop.status === "delisted")) {
    return {
      ok: false as const,
      error: "shop_delisted",
      message: "Your shop has been delisted by marketplace moderation.",
    };
  }

  // If this account was created via Phone/WhatsApp OTP onboarding without a password yet:
  if (!user.password_hash) {
    return {
      ok: false as const,
      error: "otp_only_account",
      message:
        "This account signs in with a 6-digit verification code. Choose WhatsApp, SMS, or Email below to receive your sign-in code.",
    };
  }

  if (!verifyPasswordHash(input.password || "", user.password_hash)) {
    return {
      ok: false as const,
      error: "invalid_credentials",
      message: "Invalid email/phone or password.",
    };
  }

  return { ok: true as const, user, shop: shop || null };
}

/* ---------------- Cookie + Header Session Helpers (Server Only) ---------------- */

async function resolveRequestSessionTokens(): Promise<string[]> {
  const tokens: string[] = [];
  try {
    const jar = await cookies();
    const cookieToken = jar.get(CUSTOMER_COOKIE)?.value?.trim();
    if (cookieToken) tokens.push(cookieToken);
  } catch {
    // ignore outside request context
  }
  try {
    const hdrs = await headers();
    const hdrToken = hdrs.get("x-finda-token")?.trim();
    if (hdrToken && !tokens.includes(hdrToken)) {
      tokens.push(hdrToken);
    }
  } catch {
    // ignore outside request context
  }
  return tokens;
}

function findActiveShopForUser(db: any, user: any) {
  const userPhone = user.phone ? toE164(user.phone) : null;
  const shop = (db.sellers || []).find(
    (s: any) =>
      s.status === "active" &&
      (s.user_id === user.id ||
        (userPhone && s.phone && toE164(s.phone) === userPhone))
  );
  if (shop && !shop.user_id) {
    shop.user_id = user.id;
  }
  return shop || null;
}

export async function createCustomerSession(userId: string) {
  const db = getDB();
  const user = (db.users || []).find((u: any) => u.id === userId);
  if (!user) return null;

  const token = `csess_${randomBytes(20).toString("hex")}`;
  db.user_sessions = db.user_sessions || [];
  db.user_sessions.unshift({
    token,
    user_id: user.id,
    created_at: nowISO(),
  });
  db.user_sessions = db.user_sessions.slice(0, 500);

  const shop = findActiveShopForUser(db, user);
  saveDB(db);

  const jar = await cookies();
  const maxAge = 60 * 60 * 24 * 14;
  const opts = await getSessionCookieOptions(maxAge);

  jar.set(CUSTOMER_COOKIE, token, opts);

  if (shop) {
    jar.set(SELLER_COOKIE, shop.id, opts);
  } else {
    const clearOpts = await getSessionCookieOptions(0);
    jar.set(SELLER_COOKIE, "", clearOpts);
  }

  return { token, user, shop };
}

export async function getCustomerSession(opts?: {
  cookieOnly?: boolean;
}): Promise<{
  user: any;
  shop: any | null;
  token: string;
} | null> {
  let candidates: string[] = [];
  if (opts?.cookieOnly) {
    const jar = await cookies();
    const ct = jar.get(CUSTOMER_COOKIE)?.value?.trim();
    if (ct) candidates = [ct];
  } else {
    candidates = await resolveRequestSessionTokens();
  }
  if (!candidates.length) return null;

  const db = getDB();
  for (const token of candidates) {
    const sess = (db.user_sessions || []).find((s: any) => s.token === token);
    if (!sess) continue;

    const user = (db.users || []).find((u: any) => u.id === sess.user_id);
    if (
      !user ||
      user.status === "banned" ||
      user.status === "delisted" ||
      user.status === "suspended"
    ) {
      continue;
    }

    const shop = findActiveShopForUser(db, user);
    return { user, shop, token };
  }

  return null;
}

export async function destroyCustomerSession() {
  const tokens = await resolveRequestSessionTokens();
  if (tokens.length) {
    const db = getDB();
    db.user_sessions = (db.user_sessions || []).filter(
      (s: any) => !tokens.includes(s.token)
    );
    saveDB(db);
  }
  const jar = await cookies();
  const clearOpts = await getSessionCookieOptions(0);
  jar.set(CUSTOMER_COOKIE, "", clearOpts);
  jar.set(SELLER_COOKIE, "", clearOpts);
}
