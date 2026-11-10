import { cookies } from "next/headers";
import { getDB, saveDB, id, nowISO, audit } from "./db";
import { getSessionCookieOptions } from "./cookie-opts";
import { getCustomerSession } from "./customer-auth";

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
  const s = (db.admin_sessions || []).find(
    (x: any) => x.token === token && !x.revoked_at
  );
  return s || null;
}

export async function getSellerSession() {
  const store = await cookies();
  const shopId = store.get(SELLER_COOKIE)?.value;
  if (shopId) {
    const db = getDB();
    const seller = db.sellers.find((s: any) => s.id === shopId);
    if (seller && seller.status === "active") {
      return { shopId, seller };
    }
  }

  // Fallback to authenticated customer session (covers cookie-blocked iframes & linked seller accounts)
  const customer = await getCustomerSession();
  if (customer?.shop && customer.shop.status === "active") {
    return { shopId: customer.shop.id, seller: customer.shop };
  }

  return null;
}

export async function createAdminSession(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  if (code.trim() !== adminCode()) {
    return {
      ok: false,
      error: "Wrong team passcode. Ask the team lead for the admin code.",
    };
  }
  const db = getDB();
  const token = id("adm");
  db.admin_sessions = db.admin_sessions || [];
  db.admin_sessions.push({
    id: id("asess"),
    token,
    actor_id: "usr_admin_demo",
    created_at: nowISO(),
    revoked_at: null,
  });
  audit(db, "usr_admin_demo", "admin_session", token, "login");
  saveDB(db);

  const store = await cookies();
  const opts = await getSessionCookieOptions(60 * 60 * 12);
  store.set(ADMIN_COOKIE, token, opts);
  return { ok: true };
}

export async function destroyAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) {
    const db = getDB();
    const s = (db.admin_sessions || []).find((x: any) => x.token === token);
    if (s) {
      s.revoked_at = nowISO();
      saveDB(db);
    }
  }
  const opts = await getSessionCookieOptions(0);
  store.set(ADMIN_COOKIE, "", opts);
}

export async function setSellerSession(shopId: string) {
  const store = await cookies();
  const opts = await getSessionCookieOptions(60 * 60 * 24 * 14);
  store.set(SELLER_COOKIE, shopId, opts);
}

export async function clearSellerSession() {
  const store = await cookies();
  const opts = await getSessionCookieOptions(0);
  store.set(SELLER_COOKIE, "", opts);
}
