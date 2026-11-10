import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Admin-only dataset export (strictly blocked for regular customers). */
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Forbidden — admin authentication required." },
      { status: 403 }
    );
  }
  const db = getDB();
  return NextResponse.json(db, {
    headers: {
      "Content-Disposition": `attachment; filename="finda-data-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
