"use server";

/**
 * Thin Server Action wrappers: auth + persistence live here, all business rules
 * live in lib/ops.ts (which is unit-tested — see tests/ops.test.ts).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDB, saveDB } from "@/lib/db";
import { getSellerSession, setSellerSession, clearSellerSession } from "@/lib/auth";
import * as ops from "@/lib/ops";

async function requireShop() {
  const session = await getSellerSession();
  if (!session) redirect("/seller?need=login");
  return session;
}

function run<T extends { ok: boolean }>(fn: (db: any) => T): T {
  const db = getDB();
  const out = fn(db);
  saveDB(db);
  return out;
}

/* ------------------------------ demo sign-in ------------------------------ */
export async function demoLogin(formData: FormData) {
  const shopId = String(formData.get("shop_id") || "");
  const db = getDB();
  if (!db.sellers.some((s: any) => s.id === shopId)) redirect("/seller?error=noshop");
  await setSellerSession(shopId);
  revalidatePath("/seller");
  redirect("/seller");
}

export async function logout() {
  await clearSellerSession();
  revalidatePath("/seller");
  redirect("/seller");
}

/* ------------------------------ items ------------------------------------ */
export async function toggleStock(formData: FormData) {
  const { seller } = await requireShop();
  run((db) => ops.toggleStock(db, seller.id, String(formData.get("listing_id") || "")));
  revalidatePath("/seller");
  revalidatePath("/seller/items");
}

export async function updatePrice(formData: FormData) {
  const { seller } = await requireShop();
  const naira = Number(String(formData.get("price") || "").replace(/[₦,\s]/g, ""));
  run((db) => ops.updatePrice(db, seller.id, String(formData.get("listing_id") || ""), naira));
  revalidatePath("/seller");
  revalidatePath("/seller/items");
}

export async function removeListing(formData: FormData) {
  const { seller } = await requireShop();
  run((db) => ops.removeListing(db, seller.id, String(formData.get("listing_id") || "")));
  revalidatePath("/seller");
  revalidatePath("/seller/items");
}

export async function addListing(formData: FormData) {
  const { seller } = await requireShop();
  const naira = Number(String(formData.get("price") || "").replace(/[₦,\s]/g, ""));
  const result = run((db) =>
    ops.addListing(db, seller.id, {
      title: String(formData.get("title") || ""),
      product_id: String(formData.get("product_id") || "") || null,
      naira,
      stock: String(formData.get("stock") || "in"),
    })
  );
  if (!result.ok) {
    if (result.error === "banned") {
      redirect(`/seller/items?blocked=${encodeURIComponent(result.banned.label)}`);
    }
    redirect("/seller/items?error=invalid");
  }
  revalidatePath("/seller/items");
  redirect("/seller/items?saved=1");
}

export async function bulkAddCommon(formData: FormData) {
  const { seller } = await requireShop();
  const db = getDB();
  const category = String(formData.get("category") || seller.primary_category);
  const prices: Record<string, string> = {};
  for (const p of db.products.filter((x: any) => x.category === category).slice(0, 10)) {
    const v = formData.get(`price_${p.id}`);
    if (v) prices[p.id] = String(v);
  }
  const out = run((dbx) => ops.bulkAddCommon(dbx, seller.id, category, prices));
  revalidatePath("/seller/items");
  redirect(`/seller/items?bulk=${out.added}`);
}

/* ------------------------------ daily tap -------------------------------- */
export async function dailyTapAll() {
  const { seller } = await requireShop();
  run((db) => ops.dailyTapAll(db, seller.id));
  revalidatePath("/seller");
  redirect("/seller?tapped=1");
}

export async function dailyTapOne(formData: FormData) {
  const { seller } = await requireShop();
  run((db) => ops.dailyTapOne(db, seller.id, String(formData.get("listing_id") || "")));
  revalidatePath("/seller");
  revalidatePath("/seller/daily-tap");
}

/* ------------------------------ buyer questions --------------------------- */
export async function answerRequest(formData: FormData) {
  const { seller } = await requireShop();
  const answer = String(formData.get("answer") || "no") as "yes" | "no";
  run((db) => ops.answerRequest(db, seller.id, String(formData.get("request_id") || ""), answer));
  revalidatePath("/seller");
}

/* ------------------------------ verification ----------------------------- */
export async function requestVerification(formData: FormData) {
  const { seller } = await requireShop();
  run((db) =>
    ops.requestVerification(db, seller.id, String(formData.get("tier") || "id"), String(formData.get("note") || "").trim())
  );
  revalidatePath("/seller/verify");
  redirect("/seller/verify?sent=1");
}

/* ------------------------------ location --------------------------------- */
export async function updateLocation(formData: FormData) {
  const { seller } = await requireShop();
  const out = run((db) =>
    ops.updateLocation(
      db, seller.id,
      Number(formData.get("lat")), Number(formData.get("lng")),
      String(formData.get("zone_id") || seller.zone_id),
      String(formData.get("landmark_text") || "")
    )
  );
  revalidatePath("/seller/location");
  redirect(out.ok ? "/seller/location?saved=1" : "/seller/location?error=invalid");
}
