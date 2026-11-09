import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Download the whole demo dataset — handy for reviewing supply quality offline. */
export function GET() {
  const db = getDB();
  return NextResponse.json(db, {
    headers: {
      "Content-Disposition": `attachment; filename="finda-demo-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
