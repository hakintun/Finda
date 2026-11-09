import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { setSellerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Demo-only: hop between seeded shops without an OTP. */
export async function POST(req: NextRequest) {
  const { shop_id } = await req.json().catch(() => ({}));
  const db = getDB();
  if (!db.sellers.some((s: any) => s.id === shop_id)) {
    return NextResponse.json({ ok: false, error: "Unknown shop" }, { status: 400 });
  }
  await setSellerSession(shop_id);
  return NextResponse.json({ ok: true });
}
