import {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  rmSync,
} from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const DB_PATH = resolve(ROOT, "data/db.json");
const SEED_PATH = resolve(ROOT, "data/seed.json");

export type DB = Record<string, any>;

const HOUR = 3600 * 1000;

type Listener = (payload: { version: number; updatedAt: string }) => void;

type GlobalStore = {
  cache: { db: DB; stamp: string; checkedAt: number } | null;
  version: number;
  listeners: Set<Listener>;
  flushTimer: ReturnType<typeof setTimeout> | null;
};

const g = globalThis as unknown as { __findaStore?: GlobalStore };
if (!g.__findaStore) {
  g.__findaStore = {
    cache: null,
    version: 1,
    listeners: new Set(),
    flushTimer: null,
  };
}
const store = g.__findaStore;

export function materialiseSeed(seed: any): DB {
  const now = Date.now();
  const iso = (hoursAgo: number) =>
    new Date(now - hoursAgo * HOUR).toISOString();

  const fix = (rows: any[], fields: string[]) =>
    (rows || []).map((r) => {
      const out = { ...r };
      for (const f of fields) {
        if (typeof out[f] === "number") {
          const target = f.replace(/_hours_ago$/, "");
          const finalKey =
            target.includes("_at") || target.endsWith("_at")
              ? target
              : `${target}_at`;
          out[finalKey] = iso(out[f]);
          delete out[f];
        }
      }
      return out;
    });

  return {
    ...seed,
    users: fix(seed.users, ["created_at_hours_ago"]),
    sellers: fix(seed.sellers, [
      "created_at_hours_ago",
      "last_nudge_hours_ago",
    ]),
    listings: fix(seed.listings, [
      "confirmed_at_hours_ago",
      "created_at_hours_ago",
    ]),
    verification_requests: fix(seed.verification_requests, [
      "created_at_hours_ago",
      "reviewed_at_hours_ago",
    ]),
    reports: fix(seed.reports, [
      "created_at_hours_ago",
      "handled_at_hours_ago",
    ]),
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
    otp_codes: [],
    user_sessions: [],
    saved_items: [],
    audit_log: [],
    events: [],
    admin_sessions: [],
    _version: 1,
    _materialised_at: new Date().toISOString(),
  };
}

function isMaterialised(db: any): boolean {
  return Boolean(db && db._materialised_at && Array.isArray(db.listings));
}

function fileStamp(): string | null {
  if (!existsSync(DB_PATH)) return null;
  const s = statSync(DB_PATH);
  return `${s.mtimeMs}:${s.size}`;
}

export function getDB(): DB {
  const stamp = fileStamp();

  if (!stamp) {
    const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
    const db = materialiseSeed(seed);
    writeFileSync(DB_PATH, JSON.stringify(db));
    store.version += 1;
    store.cache = { db, stamp: fileStamp()!, checkedAt: Date.now() };
    return db;
  }

  if (!store.cache || store.cache.stamp !== stamp) {
    const raw = JSON.parse(readFileSync(DB_PATH, "utf8"));
    const db = isMaterialised(raw) ? raw : materialiseSeed(raw);
    if (!isMaterialised(raw)) {
      writeFileSync(DB_PATH, JSON.stringify(db));
    }
    store.version += 1;
    store.cache = { db, stamp: fileStamp()!, checkedAt: Date.now() };
    return db;
  }

  return store.cache.db;
}

function broadcast(updatedAt: string) {
  const payload = { version: store.version, updatedAt };
  for (const fn of store.listeners) {
    try {
      fn(payload);
    } catch {
      // ignore closed listener
    }
  }
}

export function saveDB(db: DB) {
  if (store.flushTimer) {
    clearTimeout(store.flushTimer);
    store.flushTimer = null;
  }
  const updatedAt = new Date().toISOString();
  store.version += 1;
  db._version = store.version;
  db._updated_at = updatedAt;
  const serialized = JSON.stringify(db);
  writeFileSync(DB_PATH, serialized);
  store.cache = { db, stamp: fileStamp()!, checkedAt: Date.now() };
  broadcast(updatedAt);
}

/**
 * Non-blocking background persistence for high-frequency telemetry (e.g. search logs)
 * so buyer page loads never wait on disk I/O and never overwrite newer mutations.
 */
export function saveDBBackground(db: DB) {
  if (store.flushTimer) return;
  const scheduledVersion = store.version;
  const scheduledStamp = store.cache?.stamp || null;
  store.flushTimer = setTimeout(async () => {
    store.flushTimer = null;
    try {
      // Abort background telemetry flush if any real mutation happened in memory or on disk
      if (store.version !== scheduledVersion) return;
      if (scheduledStamp && fileStamp() !== scheduledStamp) return;

      db._updated_at = new Date().toISOString();
      await writeFile(DB_PATH, JSON.stringify(db));
      if (store.cache && store.version === scheduledVersion) {
        const st = fileStamp();
        if (st) store.cache.stamp = st;
        store.cache.checkedAt = Date.now();
      }
    } catch {
      // ignore background write race
    }
  }, 400);
}

export function getDBVersion(): number {
  getDB();
  return store.version;
}

export function subscribeDBChanges(listener: Listener): () => void {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

export function resetDB() {
  if (store.flushTimer) {
    clearTimeout(store.flushTimer);
    store.flushTimer = null;
  }
  rmSync(DB_PATH, { force: true });
  store.cache = null;
  store.version += 1;
  broadcast(new Date().toISOString());
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
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
export function audit(
  db: DB,
  actor_id: string | null,
  entity: string,
  entity_id: string,
  action: string,
  before: any = null,
  after: any = null
) {
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
export function trackEvent(
  db: DB,
  name: string,
  payload: Record<string, any> = {}
) {
  db.events = db.events || [];
  db.events.unshift({ id: id("evt"), name, ...payload, created_at: nowISO() });
  db.events = db.events.slice(0, 2000);
}
