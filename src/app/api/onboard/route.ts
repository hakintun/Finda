import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, nowISO } from "@/lib/db";
import { setSellerSession } from "@/lib/auth";
import {
  createCustomerSession,
  dispatchExternalOtp,
  getCustomerSession,
  hashPassword,
  normalizeEmail,
} from "@/lib/customer-auth";
import {
  getOrCreateDraftForWrite,
  publishDraft,
  validateStep,
} from "@/lib/onboarding";
import { checkBanned } from "@/lib/moderation";
import { toE164 } from "@/lib/freshness";

export const dynamic = "force-dynamic";

function applyClientFields(draft: any, src: any) {
  if (!src || typeof src !== "object") return;
  const allowed = [
    "step",
    "business_name",
    "owner_name",
    "seller_type",
    "primary_category",
    "zone_id",
    "lat",
    "lng",
    "landmark_text",
    "items",
    "consent",
  ];
  for (const k of allowed) {
    if (k in src && src[k] !== undefined) {
      draft[k] = src[k];
    }
  }
  if (typeof src.phone === "string" && src.phone.trim() && !draft.phone) {
    const p = toE164(src.phone);
    if (p) draft.phone = p;
  }
  if (typeof src.email === "string" && src.email.trim() && !draft.email) {
    const em = normalizeEmail(src.email);
    if (em) draft.email = em;
  }
}

/**
 * Backend for the seller sign-up wizard.
 * Supports multi-channel verification (Email, Phone SMS, or WhatsApp)
 * and explicit `draft_id` + full `draft` payload sync so onboarding works
 * even when third-party cookies are blocked in cross-origin preview iframes.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action || "save";
  const requestedDraftId =
    typeof body.draft_id === "string" ? body.draft_id : null;
  const draft = (await getOrCreateDraftForWrite(requestedDraftId)) as any;
  const db = getDB();

  /* ---------------------------------------------- restart / change phone */
  if (action === "restart" || action === "reset-otp") {
    if (action === "restart") {
      draft.step = 1;
      draft.phone = "";
      draft.email = "";
      draft.verify_channel = "whatsapp";
      draft.business_name = "";
      draft.owner_name = "";
      draft.seller_type = "stall";
      draft.primary_category = "";
      draft.zone_id = "";
      draft.lat = null;
      draft.lng = null;
      draft.landmark_text = "";
      draft.items = [];
      draft.published_shop_id = null;
    }
    draft.otp_sent = false;
    draft.otp_code = null;
    draft.verified = false;
    draft.updated_at = nowISO();
    saveDB(db);
    return NextResponse.json({ ok: true, draft });
  }

  /* ---------------------------------------------- step 1: Email / SMS / WhatsApp OTP */
  if (action === "send-otp") {
    const channel: "email" | "phone" | "whatsapp" =
      body.channel === "email"
        ? "email"
        : body.channel === "phone"
        ? "phone"
        : "whatsapp";

    const e164 = body.phone ? toE164(body.phone) : null;
    const email = body.email ? normalizeEmail(body.email) : null;

    if (!e164) {
      return NextResponse.json(
        {
          ok: false,
          errors: [
            "Enter a valid Nigerian phone number (e.g. 0803 123 4567) so buyers can reach your stall.",
          ],
        },
        { status: 400 }
      );
    }

    if (channel === "email" && !email) {
      return NextResponse.json(
        {
          ok: false,
          errors: [
            "Enter a valid email address to receive your Email verification code.",
          ],
        },
        { status: 400 }
      );
    }

    const customer = await getCustomerSession();
    const phoneTaken = (db.sellers || []).some(
      (s: any) =>
        s.phone &&
        toE164(s.phone) === e164 &&
        (!customer?.user || s.user_id !== customer.user.id)
    );
    if (phoneTaken) {
      return NextResponse.json(
        {
          ok: false,
          errors: [
            "An account with this phone number already has a shop. Please sign in to manage your shop.",
          ],
        },
        { status: 409 }
      );
    }

    if (typeof body.password === "string" && body.password.trim().length > 0) {
      if (body.password.length < 6) {
        return NextResponse.json(
          {
            ok: false,
            errors: ["Optional password must be at least 6 characters."],
          },
          { status: 400 }
        );
      }
      draft.password_hash = hashPassword(body.password);
    }

    const code = String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
    draft.phone = e164;
    if (email) draft.email = email;
    draft.verify_channel = channel;
    draft.otp_sent = true;
    draft.otp_code = code;
    draft.verified = false;
    draft.updated_at = nowISO();
    saveDB(db);

    const target = channel === "email" ? email! : e164;
    void dispatchExternalOtp(channel, target, code);

    const whatsappLink =
      channel === "whatsapp"
        ? `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(
            `Your Finda Seller verification code is ${code}.`
          )}`
        : null;

    return NextResponse.json({
      ok: true,
      demo_code: code,
      channel,
      whatsapp_link: whatsappLink,
      draft,
    });
  }

  if (action === "verify-otp") {
    if (!draft.otp_sent) {
      return NextResponse.json(
        { ok: false, errors: ["Send the verification code first."] },
        { status: 400 }
      );
    }
    if (String(body.code || "").trim() !== String(draft.otp_code)) {
      return NextResponse.json(
        {
          ok: false,
          errors: [
            "Invalid 6-digit verification code. Please check and try again.",
          ],
        },
        { status: 400 }
      );
    }
    draft.verified = true;
    draft.consent = body.consent === true || draft.consent || true;
    draft.step = Math.max(draft.step, 2);
    draft.updated_at = nowISO();
    saveDB(db);
    return NextResponse.json({ ok: true, draft });
  }

  /* ---------------------------------------------- generic save */
  if (action === "save") {
    applyClientFields(draft, body.patch || {});

    const bannedHits: string[] = [];
    for (const item of draft.items || []) {
      const hit = checkBanned(item.title || "");
      if (hit) {
        bannedHits.push(
          `"${item.title}" is blocked — ${hit.label} cannot be listed on Finda.`
        );
      }
    }

    draft.updated_at = nowISO();
    saveDB(db);

    const errors = validateStep(
      Math.min(body.validateStep ?? draft.step, 5),
      draft
    );
    return NextResponse.json({
      ok: true,
      draft,
      errors,
      bannedHits,
      saved_at: draft.updated_at,
    });
  }

  /* ---------------------------------------------- publish */
  if (action === "publish") {
    // Sync latest client form fields directly so there is zero debounce race condition
    if (body.draft) {
      applyClientFields(draft, body.draft);
    }

    const customer = await getCustomerSession();
    // Honor verified customer session if seller already verified at /auth
    if (customer?.user) {
      if (!draft.phone && customer.user.phone) {
        draft.phone = toE164(customer.user.phone) || customer.user.phone;
      }
      if (!draft.email && customer.user.email) {
        draft.email = customer.user.email;
      }
      if (!draft.owner_name && customer.user.name) {
        draft.owner_name = customer.user.name;
      }
      if (customer.user.is_verified && draft.phone) {
        draft.verified = true;
        draft.consent = true;
      }
    }

    const result = publishDraft(draft, customer?.user);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, errors: result.errors },
        { status: 400 }
      );
    }

    // Mint both Customer Session AND Seller Shop Session so TopBar + Seller Console stay signed in
    const createdSess = await createCustomerSession(result.user.id);
    await setSellerSession(result.seller.id);

    return NextResponse.json({
      ok: true,
      seller_id: result.seller.id,
      slug: result.seller.slug,
      listing_count: result.listing_count,
      warnings: result.warnings,
      sessionToken: createdSess?.token || null,
    });
  }

  return NextResponse.json(
    { ok: false, errors: ["Unknown action"] },
    { status: 400 }
  );
}

export async function GET(req: NextRequest) {
  const draftId = req.nextUrl.searchParams.get("draft_id");
  const draft = await getOrCreateDraftForWrite(draftId);
  return NextResponse.json({ ok: true, draft });
}
