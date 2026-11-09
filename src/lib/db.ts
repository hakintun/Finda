import { readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Demo persistence layer.
 *
 * The PRD targets Supabase/Postgres, but Member 3 needs to *test the product*
 * before the database is ready. So this implements the same tables in a local
 * JSON file (data/db.json) behind a small API. Swapping to Supabase later means
 * replacing the functions in this file only — pages never touch disk.
 *
 * FRESHNESS MODEL: data/seed.json stores RELATIVE timestamps ("confirmed 6
 * hours ago") so the demo never rots. On first load they are converted into
 * real ISO dates ("materialised") into data/db.json. Every demo reset simply
 * deletes db.json and the next page load rebuilds it — which is why the demo
 * always looks fresh, no matter when the team runs it.
 */

const ROOT = process.cwd();
const DB_PATH = resolve(ROOT, "data/db.json");
const SEED_PATH = resolve(ROOT, "data/seed.json");

export type DB = Record<string, any>;

const HOUR = 3600 * 1000;

/* --------------------------- load / save --------------------------- */
export function materialiseSeed(seed: any): DB {
  const now = Date.now();
  const iso = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();

  const fix = (rows: any[], fields: string[]) =>
    (rows || []).map((r) => {
      const out = { ...r };
      for (const f of fields) {
        if (typeof out[f] === "number") {
          // `confirmed_at_hours_ago` → `confirmed_at`
          // `last_nudge_hours_ago`    → `last_nudge_at`
          const target = f.replace(/_hours_ago$/, "");
          const finalKey = target.includes("_at") || target.endsWith("_at") ? target : `${target}_at`;
          out[finalKey] = iso(out[f]);
          delete out[f];
        }
      }
      return out;
    });

  return {
    ...seed,
    users: fix(seed.users, ["created_at_hours_ago"]),
    sellers: fix(seed.sellers, ["created_at_hours_ago", "last_nudge_hours_ago"]),
    listings: fix(seed.listings, ["confirmed_at_hours_ago", "created_at_hours_ago"]),
    verification_requests: fix(seed.verification_requests, ["created_at_hours_ago", "reviewed_at_hours_ago"]),
    reports: fix(seed.reports, ["created_at_hours_ago", "handled_at_hours_ago"]),
    pin_flags: fix(seed.pin_flags, ["created_at_hours_ago"]),
    banned_attempts: fix(seed.banned_attempts, ["created_at_hours_ago"]),
    search_queries: (seed.search_queries || []).map((q: any, i: number) => ({
      id: `sq_seed_${i}`,
      raw_query: q.raw_query,
      cluster: q.cluster,
      result_count: q.result_count,
      created_at: iso(q.hours_ago),
    })),
    demand_posts: fix(seed.demand_posts || [], ["created_at_hours_ago"]),
    confirm_requests: [],
    accuracy_reports: [],
    audit_log: [],
    events: [],
    admin_sessions: [],
    _materialised_at: new Date().toISOString(),
  };
}

/** True when the object on disk is a materialised DB rather than the raw seed. */
function isMaterialised(db: any): boolean {
  return Boolean(db && db._materialised_at && Array.isArray(db.listings));
}

let cache: { db: DB; stamp: string } | null = null;

function fileStamp(): string | null {
  if (!existsSync(DB_PATH)) return null;
  const s = statSync(DB_PATH);
  return `${s.mtimeMs}:${s.size}`;
}

export function getDB(): DB {
  const stamp = fileStamp();

  // The file was deleted or replaced (npm run reset) → rebuild from the seed.
  if (!stamp) {
    const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
    const db = materialiseSeed(seed);
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    cache = { db, stamp: fileStamp()! };
    return db;
  }

  // Another process (or a reset) changed the file → reload.
  if (!cache || cache.stamp !== stamp) {
    const raw = JSON.parse(readFileSync(DB_PATH, "utf8"));
    const db = isMaterialised(raw) ? raw : materialiseSeed(raw);
    if (!isMaterialised(raw)) writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    cache = { db, stamp: fileStamp()! };
    return db;
  }

  return cache.db;
}

export function saveDB(db: DB) {
  db._updated_at = new Date().toISOString();
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  cache = { db, stamp: fileStamp()! };
}

/** Wipe the demo database. The next page load rebuilds it from data/seed.json. */
export function resetDB() {
  rmSync(DB_PATH, { force: true });
  cache = null;
}

/* --------------------------- helpers ------------------------------- */
export function nowISO() {
  return new Date().toISOString();
}
export function hoursSince(iso: string | null | undefined) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / HOUR;
}
export function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
export function audit(db: DB, actor_id: string | null, entity: string, entity_id: string, action: string, before: any = null, after: any = null) {
  db.audit_log = db.audit_log || [];
  db.audit_log.unshift({
    id: id("aud"),
    actor_id,
    entity,
    entity_id,
    action,
    before,
    after,
    created_at: nowISO(),
  });
  db.audit_log = db.audit_log.slice(0, 500);
}
export function trackEvent(db: DB, name: string, payload: Record<string, any> = {}) {
  db.events = db.events || [];
  db.events.unshift({ id: id("evt"), name, ...payload, created_at: nowISO() });
  db.events = db.events.slice(0, 2000);
}
