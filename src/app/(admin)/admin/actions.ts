"use server";

/**
 * Thin Server Action wrappers for the admin console.
 * Business rules live in lib/ops.ts and are unit-tested.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDB, saveDB } from "@/lib/db";
import { createAdminSession, destroyAdminSession, getAdminSession, setSellerSession } from "@/lib/auth";
import * as ops from "@/lib/ops";

async function requireAdmin() {
  const s = await getAdminSession();
  if (!s) redirect("/admin?need=login");
  return s;
}

function run<T extends { ok: boolean }>(fn: (db: any) => T): T {
  const db = getDB();
  const out = fn(db);
  saveDB(db);
  return out;
}

/* ------------------------------ auth -------------------------------- */
export async function login(formData: FormData) {
  const res = await createAdminSession(String(formData.get("code") || ""));
  if (!res.ok) redirect(`/admin?error=${encodeURIComponent(res.error || "login failed")}`);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function logout() {
  await destroyAdminSession();
  redirect("/admin");
}

export async function impersonate(formData: FormData) {
  await requireAdmin();
  await setSellerSession(String(formData.get("shop_id") || ""));
  redirect("/seller");
}

/* --------------------------- verifications -------------------------- */
export async function reviewVerification(formData: FormData) {
  const session = await requireAdmin();
  const requestId = String(formData.get("request_id") || "");
  const decision = String(formData.get("decision") || "approve");

  if (decision === "approve") {
    run((db) => ops.approveVerification(db, session.actor_id, requestId));
  } else {
    run((db) => ops.rejectVerification(db, session.actor_id, requestId, String(formData.get("reason") || "").trim()));
  }
  revalidatePath("/admin/verifications");
  revalidatePath("/admin");
}

/* ------------------------------ reports ----------------------------- */
export async function handleReport(formData: FormData) {
  const session = await requireAdmin();
  run((db) =>
    ops.handleReport(
      db, session.actor_id,
      String(formData.get("report_id") || ""),
      String(formData.get("decision") || "dismiss") as ops.ReportAction,
      String(formData.get("note") || "").trim()
    )
  );
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function requestReconfirm(formData: FormData) {
  const session = await requireAdmin();
  run((db) => ops.requestReconfirm(db, session.actor_id, String(formData.get("listing_id") || "")));
  revalidatePath("/admin/reports");
}

/* --------------------------- pin validation ------------------------- */
export async function resolvePinFlag(formData: FormData) {
  const session = await requireAdmin();
  run((db) =>
    ops.resolvePinFlag(
      db, session.actor_id,
      String(formData.get("flag_id") || ""),
      String(formData.get("decision") || "dismiss") as "dismiss" | "keep" | "move_to_zone"
    )
  );
  revalidatePath("/admin/pins");
  revalidatePath("/admin");
}

export async function runPinAudit() {
  const session = await requireAdmin();
  const out = run((db) => ops.runPinAudit(db, session.actor_id));
  revalidatePath("/admin/pins");
  redirect(`/admin/pins?audit=${out.flagged}`);
}

/* ---------------------- manual seller creation --------------------- */
export async function createSellerManually(formData: FormData) {
  const session = await requireAdmin();
  const items = String(formData.get("items") || "").split("\n").map((s) => s.trim()).filter(Boolean);

  const out = run((db) =>
    ops.createSellerManually(db, session.actor_id, {
      business_name: String(formData.get("business_name") || ""),
      owner_name: String(formData.get("owner_name") || ""),
      zone_id: String(formData.get("zone_id") || ""),
      landmark_text: String(formData.get("landmark_text") || ""),
      phone: String(formData.get("phone") || ""),
      primary_category: String(formData.get("primary_category") || "Provisions"),
      seller_type: String(formData.get("seller_type") || "stall"),
      verification_tier: String(formData.get("verification_tier") || "visit"),
      items,
    })
  );
  if (!out.ok) redirect("/admin/add-shop?error=missing");
  revalidatePath("/admin/sellers");
  redirect("/admin/sellers?created=1");
}

/* ------------------------ listing moderation ----------------------- */
export async function toggleListingStatus(formData: FormData) {
  const session = await requireAdmin();
  run((db) => ops.toggleListingStatus(db, session.actor_id, String(formData.get("listing_id") || "")));
  revalidatePath("/admin/listings");
  revalidatePath("/admin/sellers");
}

export async function addBannedTerm(formData: FormData) {
  const session = await requireAdmin();
  run((db) =>
    ops.addBannedTerm(db, session.actor_id, String(formData.get("term") || ""), String(formData.get("reason") || "other"))
  );
  revalidatePath("/admin/moderation");
}
