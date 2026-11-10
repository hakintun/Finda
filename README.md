# Finda
Finda is a marketplace app designed to connect buyers and sellers, allowing buyers to easily find products, check prices and availability, locate sellers, and saves time without walking around searching for the sellers that have what they need.

## Member 2 prototype

See [MEMBER2_GUIDE.md](MEMBER2_GUIDE.md) for the local test demo, the separate Supabase schema, limitations, and GitHub push instructions. This is not production-ready.

Finda is a discovery-first local marketplace PWA for **Port Harcourt**, designed to connect buyers and nearby sellers—allowing buyers to check today's Naira (`₦`) price, confirmed stock availability, and street-landmark directions without walking around markets or calling five numbers only to hear *"come and check"* or *"e don finish."*

---

## Tech Stack
- **Frontend PWA:** Next.js 15 (App Router, TypeScript, Tailwind CSS v4), mobile-first (`360×640`), WCAG 2.1 AA (`≥44px` tap targets, non-colour-only stock states)
- **Backend & Geo Search (Member 2):** Supabase (Postgres + PostGIS + `pg_trgm` + Auth + Storage + RLS)
- **Testing:** Vitest (`npm test`)

---

## Team Folder Ownership (Zero-Conflict Boundaries)

| Member | Role | Owned Directories |
|---|---|---|
| **Member 1** | **Buyer Side (Search, Results & Directions)** | `src/app/(buyer)/*`, `src/components/buyer/*`, `src/components/ui/*`, `supabase/seeds/synonyms.csv` |
| **Member 2** | **Engine, Database & Messaging** | `supabase/migrations/*`, `src/lib/supabase/*`, `src/app/api/*`, `src/sw.ts` |
| **Member 3** | **Seller Side, Admin, Market Data & QA** | `src/app/sell/*`, `src/app/seller/*`, `src/app/admin/*`, `supabase/seeds/{zones,products,demo_sellers}.sql` |

---

## Getting Started Locally

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests (Naira kobo math, WAT freshness decay, +234 phone normalizer)
npm test

# 3. Check TypeScript types & production bundle size
npm run typecheck
npm run build

# 4. Start local dev server (http://localhost:3000)
npm run dev
```

### Key Routes Available Now (Task 1 — App Shell & Design System)
- **`/`** — Discovery-first Buyer Home Shell, Port Harcourt cluster selector, and zero-image **300px Results Card** preview.
- **`/design-system`** — Interactive Test Bench to verify `₦` integer kobo formatting, live Freshness Decay states (`Fresh <48h` → `Aging 3–7d` → `Stale 8–14d` → `Expired >14d`), non-colour-only stock badges, `+234` phone validation, and a `360×640` Android screen simulator.
- **`/api/health`** — Health endpoint (`Africa/Lagos` WAT timezone).
- **`/sell`**, **`/seller`**, **`/admin`** — Reserved workspaces for Member 3.

---

## Core Engineering Rules (Do Not Break)
1. **Prices are integer kobo only** (`18_500_000` = `₦185,000`) — never store or pass floating-point numbers (`src/lib/format.ts`).
2. **Every price must show its confirmation age** (`FreshnessTag`) — never render a bare price without a timestamp.
3. **Cards must work with zero images** — photos are optional enhancements, never required for layout.
4. **Touch targets ≥ 44×44px** (`min-h-11`) and **no colour-only badges**.
