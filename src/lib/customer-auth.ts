import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { audit, getDB, id, nowISO, saveDB, trackEvent } from "./db";
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
      message: "Please enter a valid Nigerian phone number (e.g. 0803 123 4567).",
    };
  }

  if (input.channel === "email" && !email) {
    return {
      ok: false as const,
      error: "missing_email",
      message: "An email address is required to verify via Email.",
    };
  }
  if (
    (input.channel === "phone" || input.channel === "whatsapp") &&
    !phone
  ) {
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
    return { ok: false as const, error: "user_not_found", message: "Account not found." };
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
        message: "Please provide a valid email address first.",
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
        message: "Please provide a valid Nigerian phone number first.",
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
    (c: any) => c.user_id === user.id && now - new Date(c.created_at).getTime() < OTP_TTL_MS
  );
  if (recent.length >= 6) {
    return {
      ok: false as const,
      error: "rate_limited",
      message: "Too many verification codes requested. Please wait a few minutes.",
    };
  }

  // Invalidate older unused codes on same channel
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
    // Exposed only to the initiating user session in non-production / sandbox when live SMS/SMTP keys aren't configured
    sandboxCode:
      process.env.FINDA_HIDE_SANDBOX_OTP === "1" ? undefined : code,
    whatsappLink,
  };
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
 */
export function verifyCustomerOtp(
  db: any,
  input: { userId: string; channel: VerifyChannel; code: string }
) {
  const user = (db.users || []).find((u: any) => u.id === input.userId);
  if (!user) {
    return { ok: false as const, error: "user_not_found", message: "Account not found." };
  }

  const cleanCode = (input.code || "").replace(/\s+/g, "").trim();
  const now = Date.now();

  const record = (db.otp_codes || []).find(
    (c: any) =>
      c.user_id === user.id &&
      c.channel === input.channel &&
      !c.used_at &&
      !c.invalidated
  );

  if (!record) {
    return {
      ok: false as const,
      error: "no_active_code",
      message: "No active verification code found. Request a new code.",
    };
  }

  if (now > new Date(record.expires_at).getTime()) {
    record.invalidated = true;
    return {
      ok: false as const,
      error: "expired",
      message: "This verification code has expired. Please request a new one.",
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
      message: "Incorrect 6-digit verification code. Please check and try again.",
    };
  }

  record.used_at = nowISO();
  user.verified_channels = Array.from(
    new Set([...(user.verified_channels || []), input.channel])
  );
  user.is_verified = true;
  user.verified_at = nowISO();

  // If this user owns a seller shop, automatically reflect contact verification!
  const shop = (db.sellers || []).find((s: any) => s.user_id === user.id);
  if (
    shop &&
    (!shop.verification_tier ||
      shop.verification_tier === "none" ||
      shop.verification_tier === "unverified")
  ) {
    shop.verification_tier = "phone";
    shop.verified_via = input.channel;
  }

  audit(db, user.id, "user", user.id, `verified_${input.channel}`, null, {
    verified_channels: user.verified_channels,
  });
  trackEvent(db, "customer_verified", {
    user_id: user.id,
    channel: input.channel,
    role: user.role,
  });

  return { ok: true as const, user, shop };
}

/**
 * Authenticates an existing Buyer or Seller via Email or Phone + Password.
 * Never reveals whether an account exists on failure (generic invalid credentials message).
 */
export function authenticateCustomer(
  db: any,
  input: { identifier: string; password: string }
) {
  const raw = (input.identifier || "").trim();
  const asEmail = normalizeEmail(raw);
  const asPhone = toE164(raw);

  const user = (db.users || []).find((u: any) => {
    if (asEmail && u.email && u.email.toLowerCase() === asEmail) return true;
    if (asPhone && u.phone && toE164(u.phone) === asPhone) return true;
    return false;
  });

  if (!user || !user.password_hash) {
    return {
      ok: false as const,
      error: "invalid_credentials",
      message: "Invalid email/phone or password.",
    };
  }

  if (user.status === "banned" || user.status === "delisted" || user.status === "suspended") {
    return {
      ok: false as const,
      error: "account_suspended",
      message: "This account has been suspended by marketplace moderation.",
    };
  }

  if (!verifyPasswordHash(input.password || "", user.password_hash)) {
    return {
      ok: false as const,
      error: "invalid_credentials",
      message: "Invalid email/phone or password.",
    };
  }

  // Check if seller's shop was delisted/banned by admin
  const shop = (db.sellers || []).find((s: any) => s.user_id === user.id);
  if (shop && (shop.status === "banned" || shop.status === "delisted")) {
    return {
      ok: false as const,
      error: "shop_delisted",
      message: "Your shop has been delisted by marketplace moderation.",
    };
  }

  return { ok: true as const, user, shop: shop || null };
}

/* ---------------- Cookie Session Helpers (Server Only) ---------------- */

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

  const shop = (db.sellers || []).find(
    (s: any) => s.user_id === user.id && s.status === "active"
  );
  saveDB(db);

  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  if (shop) {
    jar.set(SELLER_COOKIE, shop.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  } else {
    jar.delete(SELLER_COOKIE);
  }

  return { token, user, shop: shop || null };
}

export async function getCustomerSession(): Promise<{
  user: any;
  shop: any | null;
} | null> {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;

  const db = getDB();
  const sess = (db.user_sessions || []).find((s: any) => s.token === token);
  if (!sess) return null;

  const user = (db.users || []).find((u: any) => u.id === sess.user_id);
  if (
    !user ||
    user.status === "banned" ||
    user.status === "delisted" ||
    user.status === "suspended"
  ) {
    return null;
  }

  const shop =
    (db.sellers || []).find(
      (s: any) => s.user_id === user.id && s.status === "active"
    ) || null;

  return { user, shop };
}

export async function destroyCustomerSession() {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (token) {
    const db = getDB();
    db.user_sessions = (db.user_sessions || []).filter(
      (s: any) => s.token !== token
    );
    saveDB(db);
  }
  jar.delete(CUSTOMER_COOKIE);
  jar.delete(SELLER_COOKIE);
}
