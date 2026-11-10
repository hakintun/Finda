import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getAdminSession, setSellerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Admin-only support impersonation endpoint (strictly forbidden for customers). */
export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Forbidden — admin authentication required." },
      { status: 403 }
    );
  }
  const { shop_id } = await req.json().catch(() => ({}));
  const db = getDB();
  if (!db.sellers.some((s: any) => s.id === shop_id)) {
    return NextResponse.json(
      { ok: false, error: "Unknown shop" },
      { status: 400 }
    );
  }
  await setSellerSession(shop_id);
  return NextResponse.json({ ok: true });
}
