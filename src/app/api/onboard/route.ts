import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, nowISO } from "@/lib/db";
import { setSellerSession } from "@/lib/auth";
import { getOrCreateDraftForWrite, publishDraft, validateStep } from "@/lib/onboarding";
import { checkBanned } from "@/lib/moderation";
import { toE164 } from "@/lib/freshness";

export const dynamic = "force-dynamic";

/**
 * Demo backend for the seller sign-up wizard.
 * action = save | send-otp | verify-otp | publish | restart
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action || "save";
  const draft = await getOrCreateDraftForWrite();
  const db = getDB();

  /* ---------------------------------------------- restart */
  if (action === "restart") {
    draft.step = 1; draft.phone = ""; draft.otp_sent = false; draft.otp_code = null;
    draft.verified = false; draft.consent = false; draft.business_name = ""; draft.owner_name = "";
    draft.seller_type = "stall"; draft.primary_category = ""; draft.zone_id = "";
    draft.lat = null; draft.lng = null; draft.landmark_text = ""; draft.items = [];
    draft.published_shop_id = null; draft.updated_at = nowISO();
    saveDB(db);
    return NextResponse.json({ ok: true, draft });
  }

  /* ---------------------------------------------- step 1: OTP */
  if (action === "send-otp") {
    const e164 = toE164(body.phone || "");
    if (!e164) {
      return NextResponse.json({ ok: false, errors: ["Enter a valid Nigerian number, e.g. 0803 123 4567."] }, { status: 400 });
    }
    // Demo OTP: fixed 6 digits, shown on screen because there is no SMS in this build.
    const code = "123456";
    draft.phone = e164;
    draft.otp_sent = true;
    draft.otp_code = code;
    draft.verified = false;
    draft.updated_at = nowISO();
    saveDB(db);
    return NextResponse.json({ ok: true, demo_code: code, draft });
  }

  if (action === "verify-otp") {
    if (!draft.otp_sent) return NextResponse.json({ ok: false, errors: ["Send the code first."] }, { status: 400 });
    if (String(body.code || "").trim() !== draft.otp_code) {
      return NextResponse.json({ ok: false, errors: ["That code is wrong. In this demo build the code is 123456."] }, { status: 400 });
    }
    draft.verified = true;
    draft.consent = body.consent === true || draft.consent;
    draft.step = Math.max(draft.step, 2);
    draft.updated_at = nowISO();
    saveDB(db);
    return NextResponse.json({ ok: true, draft });
  }

  /* ---------------------------------------------- generic save */
  if (action === "save") {
    const p = body.patch || {};
    const allowed = [
      "step", "business_name", "owner_name", "seller_type", "primary_category",
      "zone_id", "lat", "lng", "landmark_text", "items", "consent",
    ];
    for (const k of allowed) if (k in p) (draft as any)[k] = p[k];

    // Block prohibited items the moment they are typed.
    const bannedHits: string[] = [];
    for (const item of draft.items || []) {
      const hit = checkBanned(item.title || "");
      if (hit) bannedHits.push(`"${item.title}" is blocked — ${hit.label} cannot be listed on Finda.`);
    }

    draft.updated_at = nowISO();
    saveDB(db);

    const errors = validateStep(Math.min(body.validateStep ?? draft.step, 5), draft);
    return NextResponse.json({ ok: true, draft, errors, bannedHits, saved_at: draft.updated_at });
  }

  /* ---------------------------------------------- publish */
  if (action === "publish") {
    const result = publishDraft(draft);
    if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    saveDB(db);
    await setSellerSession(result.seller.id);
    return NextResponse.json({
      ok: true,
      seller_id: result.seller.id,
      slug: result.seller.slug,
      listing_count: result.listing_count,
      warnings: result.warnings,
    });
  }

  return NextResponse.json({ ok: false, errors: ["Unknown action"] }, { status: 400 });
}

export async function GET() {
  const draft = await getOrCreateDraftForWrite();
  return NextResponse.json({ ok: true, draft });
}
