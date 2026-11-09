# Member 3 — what changed on the team repo, and how to review it

## The short story

You are not adding a folder to an empty repo any more. Your teammates shipped real
work while you were building:

- **Member 1** — Next.js 15 app shell, design system, `/design-system` page, buyer home
- **Member 2** — Supabase schema, a Node prototype in `demo/`, a `MEMBER2_GUIDE.md`

So this branch is a **merge**, not a copy. Everything of theirs still works; my
seller + admin + market-data code sits beside it in the same app.

---

## ⚠ The bug you should tell the team about first

**`package.json` on `main` is corrupted.** It contains two JSON objects glued
together:

```json
{"name":"finda-member2-foundation", ... "engines":{"node":">=20"}}
{
  "name": "finda",
  ...
}
```

Consequences for everyone right now:

- `npm install` on `main` fails with `EJSONPARSE`
- so nobody on the team can run the app from a fresh clone
- the same corruption is on `main` and `member-2-foundation`

It arrived in the merge of `member-2-foundation` (commit `3c787fd`). This branch
repairs it — the repaired file keeps every tool they added and adds the ones I need.

**Action:** post this in the team chat, because it blocks all three of you.

---

## What this branch contains

### Layout

```
src/app/
├── layout.tsx              ← Member 1's (untouched: fonts, metadata, Tailwind)
├── globals.css             ← Member 1's (untouched: Tailwind + design tokens)
├── (buyer)/page.tsx        ← Member 1's buyer home (untouched)
├── (buyer)/design-system/  ← Member 1's (untouched)
├── sell/page.tsx           ← Member 1's sell landing (untouched)
├── (seller)/seller/*       ← NEW: my seller console
├── (admin)/admin/*         ← NEW: my admin control centre
├── market-data/            ← NEW
├── test-plan/              ← NEW
└── privacy/                ← NEW
```

`(seller)` and `(admin)` are **route groups**: the parentheses mean the folder
name is not part of the URL, so these pages live at `/seller` and `/admin` while
keeping their own layouts without touching `src/app/layout.tsx`.

### Shared files I touched — read these carefully, reviewer

| File | Change | Why |
|---|---|---|
| `package.json` | **Repaired** (was invalid JSON), added `qrcode`, `@types/qrcode`, `tsx`; added `test:member3`, `test:engine`, `seed`, `reset`, `check` scripts | npm could not read it at all |
| `vitest.config.ts` | **New** — scopes vitest to `src/**` | `npm test` was already failing on `main`: vitest tried to collect Member 2's `demo/engine.test.js`, which uses `node:test`, and errored with "No test suite found" |
| `.gitignore` | Added `/data/db.json`, `*.tsbuildinfo` | my demo database is regenerable, not source |
| `src/lib/*` | 9 new modules beside Member 1's `format.ts`, `types.ts` | my business logic |
| `tests/` | 51 new tests (Node test runner, like Member 2's `demo/`) | freshness, prices, geo, moderation |

**Nothing of Member 1's was edited.** No line of `(buyer)/`, `layout.tsx`,
`globals.css`, `sell/`, `src/lib/format.ts` or `src/lib/types.ts` changed.

---

## Verification — run these yourself

```bash
npm install          # works now; it did not before
npm run typecheck    # 0 errors across the whole app
npm run test         # 51 (mine) + 4 (Member 2's engine)
npx vitest run       # 7 (Member 1's)
npm run build        # 30 routes compile
```

Results on this branch:

```
typecheck   0 errors
tests       51 pass · 4 pass
vitest      7 pass
build       ✓ 30 routes
```

---

## Design collisions — known, and deliberate

Member 1's design tokens are custom properties (`--brand-primary`,
`--ink-primary`). Mine are `.btn`, `.card`, `.badge`, `.kpi`. I grepped:
**their `globals.css` defines no class names that I use**, so the two coexist.
Longer term the team should settle on one visual language — probably Member 1's
tokens with my components re-skinned onto them. That is a follow-up, not a
blocker.

Member 1 also already exports `StockBadge`, `FreshnessTag`, `VerificationBadge`,
`PriceDisplay` from `src/components/ui/index.tsx` — the same concepts as my
`src/lib/member3-ui.tsx`. **Someone should own reconciling those two files.**
I left mine untouched so the merge could not break their pages.

---

## Schema divergence — for Member 2

My demo store and Member 2's Supabase schema model the same things with
different names:

| Concept | Mine (`data/seed.json`) | Member 2 (`supabase/migrations`) |
|---|---|---|
| Shop | `sellers` | `shops` |
| Area | `zones` | `market_areas` |
| Product | `products` | `products` + `product_aliases` |
| Price | `price_kobo` (integer) | `price_naira` (numeric) |
| Stock | `stock_status` enum | `in_stock` boolean |
| Verification | `verification_tier` (4 tiers) | `verified` boolean + `pin_review_status` |

Two real decisions to settle before either of us wires to the database:

1. **Integer kobo vs numeric naira** — the PRD (§11) says kobo integers, no
   floats ever. My code follows the PRD. Worth agreeing explicitly.
2. **A boolean `verified` cannot express the four verification tiers** the PRD
   asks for (unverified → phone → ID → visit-verified), which the admin
   verification queue depends on.

`supabase/migrations/0001_member3_supply_and_admin.sql` in my original build has
a fuller version. It is **not** applied and not in this branch — it needs to be
reconciled with Member 2's `202611090001_foundation.sql` rather than dropped in
beside it.

---

## The honest recommendation

Take this branch as it is: it makes the repo installable again, keeps all three
members' work in one app, and every check passes. Then, as a team:

1. Fix `package.json` on `main` immediately (this branch does it — merge it early)
2. Agree the shared schema (kobo integers, four verification tiers)
3. Pick one component library and delete the duplicate
4. Point my `src/lib/db.ts` at Member 2's Supabase tables
