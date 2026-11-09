/**
 * Demo auth.
 *
 * Production target is phone OTP + Supabase Auth (Member 2's work). Until that
 * lands, Member 3 tests the seller + admin surfaces with:
 *   - Seller console: "demo login" as any seeded shop (cookie = shop id)
 *   - Admin console:  team passcode (cookie = session token)
 *
 * The passcode comes from FINDA_ADMIN_CODE, defaulting to "finda-admin".
 */
import { cookies } from "next/headers";
import { getDB, saveDB, id, nowISO, audit } from "./db";

export const ADMIN_COOKIE = "finda_admin";
export const SELLER_COOKIE = "finda_seller";

export function adminCode(): string {
  return process.env.FINDA_ADMIN_CODE || "finda-admin";
}

export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const db = getDB();
  const s = (db.admin_sessions || []).find((x: any) => x.token === token && !x.revoked_at);
  return s || null;
}

export async function getSellerSession() {
  const store = await cookies();
  const shopId = store.get(SELLER_COOKIE)?.value;
  if (!shopId) return null;
  const db = getDB();
  const seller = db.sellers.find((s: any) => s.id === shopId);
  if (!seller) return null;
  return { shopId, seller };
}

export async function createAdminSession(code: string): Promise<{ ok: boolean; error?: string }> {
  if (code.trim() !== adminCode()) {
    return { ok: false, error: "Wrong team passcode. Ask the team lead for the admin code." };
  }
  const db = getDB();
  const token = id("adm");
  db.admin_sessions = db.admin_sessions || [];
  db.admin_sessions.push({
    id: id("asess"), token, actor_id: "usr_admin_demo",
    created_at: nowISO(), revoked_at: null,
  });
  audit(db, "usr_admin_demo", "admin_session", token, "login");
  saveDB(db);
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  return { ok: true };
}

export async function destroyAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) {
    const db = getDB();
    const s = (db.admin_sessions || []).find((x: any) => x.token === token);
    if (s) { s.revoked_at = nowISO(); saveDB(db); }
  }
  store.delete(ADMIN_COOKIE);
}

export async function setSellerSession(shopId: string) {
  const store = await cookies();
  store.set(SELLER_COOKIE, shopId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}
export async function clearSellerSession() {
  const store = await cookies();
  store.delete(SELLER_COOKIE);
}
