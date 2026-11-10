"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDB, saveDB, id } from "@/lib/db";
import {
  createConfirmRequest,
  submitAccuracyFeedback,
  submitBuyerReport,
  submitDemandPost,
} from "@/lib/buyer-ops";

async function getOrSetBuyerKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get("finda_buyer_key")?.value;
  if (existing) return existing;
  const fresh = id("bkey");
  store.set("finda_buyer_key", fresh, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return fresh;
}

export async function startConfirmForMe(formData: FormData) {
  const listingId = String(formData.get("listing_id") || "");
  const buyerName = String(formData.get("buyer_name") || "").trim();
  const buyerPhone = String(formData.get("buyer_phone") || "").trim();

  const db = getDB();
  const out = createConfirmRequest(db, {
    listingId,
    buyerName,
    buyerPhone,
    channel: "in_app",
  });
  if (!out.ok) {
    redirect("/search?error=missing_listing");
  }
  saveDB(db);
  revalidatePath("/seller");
  redirect(`/request/${out.request.id}`);
}

export async function postBuyerDemand(formData: FormData) {
  const rawText = String(formData.get("raw_text") || "");
  const cluster = String(formData.get("cluster") || "Port Harcourt");
  const buyerPhone = String(formData.get("buyer_phone") || "");
  const returnQuery = String(formData.get("return_q") || "");

  const db = getDB();
  const res = submitDemandPost(db, { rawText, cluster, buyerPhone });
  if (res.ok) {
    saveDB(db);
    revalidatePath("/admin/freshness");
  }
  redirect(
    `/search?q=${encodeURIComponent(returnQuery)}&demand=${res.ok ? "sent" : "invalid"}`
  );
}

export async function flagListingReport(formData: FormData) {
  const listingId = String(formData.get("listing_id") || "");
  const sellerSlug = String(formData.get("seller_slug") || "");
  const reason = String(formData.get("reason") || "other");
  const note = String(formData.get("note") || "");
  const buyerKey = await getOrSetBuyerKey();

  const db = getDB();
  const res = submitBuyerReport(db, {
    listingId,
    reason,
    note,
    reporter: buyerKey,
  });
  if (res.ok) {
    saveDB(db);
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
  }
  redirect(`/s/${sellerSlug}?reported=1`);
}

export async function recordTripOutcome(formData: FormData) {
  const listingId = String(formData.get("listing_id") || "");
  const returnTo = String(formData.get("return_to") || "/");
  const verdict = String(formData.get("verdict") || "got_it") as
    | "got_it"
    | "different_price"
    | "not_available"
    | "didnt_go";
  const customBuyerKey = String(formData.get("buyer_key") || "").trim();
  const buyerKey = customBuyerKey || (await getOrSetBuyerKey());

  const db = getDB();
  const res = submitAccuracyFeedback(db, { listingId, verdict, buyerKey });
  if (res.ok) {
    saveDB(db);
    revalidatePath("/search");
    revalidatePath("/admin/freshness");
  }
  const sep = returnTo.includes("?") ? "&" : "?";
  redirect(
    `${returnTo}${sep}feedback=${encodeURIComponent(verdict)}${
      res.ok && res.demoted ? "&demoted=1" : ""
    }`
  );
}
