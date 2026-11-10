import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import {
  authenticateCustomer,
  createCustomerSession,
  destroyCustomerSession,
  dispatchExternalOtp,
  getCustomerSession,
  issueVerificationOtp,
  registerCustomer,
  requestLoginOtp,
  verifyCustomerOtp,
  type CustomerRole,
  type VerifyChannel,
} from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cookieOnly = req.nextUrl.searchParams.get("cookie_probe") === "1";
  const sess = await getCustomerSession({ cookieOnly });
  if (!sess) {
    return NextResponse.json({ ok: true, authenticated: false });
  }
  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      id: sess.user.id,
      name: sess.user.name,
      role: sess.user.role,
      is_verified: Boolean(sess.user.is_verified),
      verified_channels: sess.user.verified_channels || [],
    },
    hasShop: Boolean(sess.shop),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const db = getDB();

  /* 1. Register new Buyer or Seller (zero exposure of existing customers) */
  if (action === "register") {
    const channel = (
      ["email", "phone", "whatsapp"].includes(body.channel)
        ? body.channel
        : "phone"
    ) as VerifyChannel;
    const role: CustomerRole = body.role === "seller" ? "seller" : "buyer";

    const res = registerCustomer(db, {
      name: String(body.name || ""),
      role,
      email: body.email ? String(body.email) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
      password: String(body.password || ""),
      channel,
    });

    if (!res.ok) {
      return NextResponse.json(res, { status: 400 });
    }

    saveDB(db);
    const createdSess = await createCustomerSession(res.user.id);

    if (res.otp?.sandboxCode) {
      const target =
        channel === "email" ? res.user.email : res.user.phone || "";
      if (target) {
        void dispatchExternalOtp(channel, target, res.otp.sandboxCode);
      }
    }

    return NextResponse.json({
      ok: true,
      sessionToken: createdSess?.token || null,
      user: {
        id: res.user.id,
        name: res.user.name,
        role: res.user.role,
        is_verified: res.user.is_verified,
        verified_channels: res.user.verified_channels,
      },
      otp: res.otp,
    });
  }

  /* 2a. Sign in existing Buyer or Seller via Password */
  if (action === "login") {
    const res = authenticateCustomer(db, {
      identifier: String(body.identifier || ""),
      password: String(body.password || ""),
    });
    if (!res.ok) {
      return NextResponse.json(res, { status: 401 });
    }

    const createdSess = await createCustomerSession(res.user.id);
    return NextResponse.json({
      ok: true,
      sessionToken: createdSess?.token || null,
      user: {
        id: res.user.id,
        name: res.user.name,
        role: res.user.role,
        is_verified: Boolean(res.user.is_verified),
        verified_channels: res.user.verified_channels || [],
      },
      hasShop: Boolean(createdSess?.shop || res.shop),
    });
  }

  /* 2b. Sign in existing Buyer or Seller via 6-Digit Code (Email / SMS / WhatsApp) */
  if (action === "request_login_otp") {
    const channel = ["email", "phone", "whatsapp"].includes(body.channel)
      ? (body.channel as VerifyChannel)
      : undefined;

    const out = requestLoginOtp(db, {
      identifier: String(body.identifier || ""),
      channel,
    });

    if (!out.ok) {
      return NextResponse.json(out, { status: 400 });
    }

    saveDB(db);
    if (out.sandboxCode) {
      const otpRow = (db.otp_codes || []).find((c: any) => c.id === out.otpId);
      if (otpRow?.target) {
        void dispatchExternalOtp(out.channel, otpRow.target, out.sandboxCode);
      }
    }

    return NextResponse.json({
      ok: true,
      otp: out,
    });
  }

  /* 3. Request / Resend 6-digit OTP via Email, Phone SMS, or WhatsApp */
  if (action === "send_otp") {
    const sess = await getCustomerSession();
    const channel = (
      ["email", "phone", "whatsapp"].includes(body.channel)
        ? body.channel
        : "phone"
    ) as VerifyChannel;

    // If not yet in cookie session (e.g. passwordless OTP login), resend via identifier
    if (!sess && body.identifier) {
      const out = requestLoginOtp(db, {
        identifier: String(body.identifier),
        channel,
      });
      if (!out.ok) return NextResponse.json(out, { status: 400 });
      saveDB(db);
      return NextResponse.json(out);
    }

    if (!sess) {
      return NextResponse.json(
        { ok: false, message: "Please sign in first." },
        { status: 401 }
      );
    }

    const freshDb = getDB();
    const out = issueVerificationOtp(freshDb, {
      userId: sess.user.id,
      channel,
      overrideTarget: body.target ? String(body.target) : undefined,
    });

    if (!out.ok) {
      return NextResponse.json(out, { status: 400 });
    }

    saveDB(freshDb);
    if (out.sandboxCode) {
      const updatedUser = freshDb.users.find((u: any) => u.id === sess.user.id);
      const target =
        channel === "email" ? updatedUser?.email : updatedUser?.phone;
      if (target) {
        void dispatchExternalOtp(channel, target, out.sandboxCode);
      }
    }

    return NextResponse.json(out);
  }

  /* 4. Verify 6-digit OTP (works for BOTH Registration Verification & Passwordless Sign-In!) */
  if (action === "verify_otp") {
    const sess = await getCustomerSession();
    const otpId = body.otpId ? String(body.otpId) : undefined;

    if (!sess && !otpId) {
      return NextResponse.json(
        { ok: false, message: "Verification session expired. Please request a new code." },
        { status: 401 }
      );
    }

    const channel = (
      ["email", "phone", "whatsapp"].includes(body.channel)
        ? body.channel
        : "phone"
    ) as VerifyChannel;

    const freshDb = getDB();
    const out = verifyCustomerOtp(freshDb, {
      userId: sess?.user.id,
      otpId,
      channel,
      code: String(body.code || ""),
      newPassword: body.newPassword ? String(body.newPassword) : undefined,
    });

    if (!out.ok) {
      saveDB(freshDb);
      return NextResponse.json(out, { status: 400 });
    }

    saveDB(freshDb);
    // Always mint/refresh session cookie on verified OTP so user is signed in immediately
    const createdSess = await createCustomerSession(out.user.id);

    return NextResponse.json({
      ok: true,
      sessionToken: createdSess?.token || null,
      verified_channels: out.user.verified_channels,
      role: out.user.role,
      hasShop: Boolean(createdSess?.shop || out.shop),
    });
  }

  /* 5. Sign out */
  if (action === "logout") {
    await destroyCustomerSession();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, message: "Unknown auth action." },
    { status: 400 }
  );
}
