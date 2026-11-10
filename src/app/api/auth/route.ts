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
  verifyCustomerOtp,
  type CustomerRole,
  type VerifyChannel,
} from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

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
    await createCustomerSession(res.user.id);

    if (res.otp?.sandboxCode) {
      const target =
        channel === "email" ? res.user.email : res.user.phone || "";
      if (target) {
        void dispatchExternalOtp(channel, target, res.otp.sandboxCode);
      }
    }

    return NextResponse.json({
      ok: true,
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

  /* 2. Sign in existing Buyer or Seller */
  if (action === "login") {
    const res = authenticateCustomer(db, {
      identifier: String(body.identifier || ""),
      password: String(body.password || ""),
    });
    if (!res.ok) {
      return NextResponse.json(res, { status: 401 });
    }

    await createCustomerSession(res.user.id);
    return NextResponse.json({
      ok: true,
      user: {
        id: res.user.id,
        name: res.user.name,
        role: res.user.role,
        is_verified: Boolean(res.user.is_verified),
        verified_channels: res.user.verified_channels || [],
      },
      hasShop: Boolean(res.shop),
    });
  }

  /* 3. Request / Resend 6-digit OTP via Email, Phone SMS, or WhatsApp */
  if (action === "send_otp") {
    const sess = await getCustomerSession();
    if (!sess) {
      return NextResponse.json(
        { ok: false, message: "Please sign in first." },
        { status: 401 }
      );
    }

    const channel = (
      ["email", "phone", "whatsapp"].includes(body.channel)
        ? body.channel
        : "phone"
    ) as VerifyChannel;

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

  /* 4. Verify 6-digit OTP */
  if (action === "verify_otp") {
    const sess = await getCustomerSession();
    if (!sess) {
      return NextResponse.json(
        { ok: false, message: "Please sign in first." },
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
      userId: sess.user.id,
      channel,
      code: String(body.code || ""),
    });

    if (!out.ok) {
      saveDB(freshDb);
      return NextResponse.json(out, { status: 400 });
    }

    saveDB(freshDb);
    return NextResponse.json({
      ok: true,
      verified_channels: out.user.verified_channels,
      role: out.user.role,
      hasShop: Boolean(out.shop),
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
