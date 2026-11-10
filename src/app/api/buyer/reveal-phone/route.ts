import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { revealSellerPhone } from "@/lib/buyer-ops";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sellerId = String(body.sellerId || "");
  const listingId = body.listingId ? String(body.listingId) : null;

  const forwarded = req.headers.get("x-forwarded-for") || "";
  const clientIp = forwarded.split(",")[0]?.trim() || "local";
  const ua = (req.headers.get("user-agent") || "").slice(0, 48);
  const clientKey = `${clientIp}:${ua}`;

  const db = getDB();
  const res = revealSellerPhone(db, { sellerId, listingId, clientKey });
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: res.error, message: res.message || "Unavailable" },
      { status: res.status }
    );
  }

  saveDB(db);
  return NextResponse.json(res);
}
