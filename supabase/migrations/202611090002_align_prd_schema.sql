-- Finda PRD v1.0 Schema Alignment Migration
-- Aligns Supabase Postgres schema with the unified Buyer + Seller + Admin TypeScript data model:
--   * Integer kobo pricing (`price_kobo bigint`) — zero floating-point Naira rounding errors
--   * 4-state stock (`in`, `low`, `out`, `unconfirmed`)
--   * 4-tier seller verification (`unverified`, `phone_verified`, `rep_verified`, `physically_verified`)
--   * Port Harcourt market zones, Pidgin synonyms, confirm_requests, 3-strike accuracy_reports,
--     moderation reports, demand_posts, search_queries, and append-only audit_log.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- 1. Market Zones (e.g., Mile 1, Mile 3, Creek Road, Ada George, Rumuokoro, Choba)
create table if not exists public.zones (
  id text primary key,
  name text not null,
  city text not null default 'Port Harcourt',
  area text not null default '',
  center_lat double precision not null,
  center_lng double precision not null,
  box jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. Sellers (Public Shop Profiles; phone numbers protected via server-side rate-limited reveal)
create table if not exists public.sellers (
  id text primary key,
  owner_id uuid references auth.users(id) on delete set null,
  slug text not null unique,
  business_name text not null,
  ask_for text,
  phone text not null,
  whatsapp_number text,
  zone_id text not null references public.zones(id) on restrict,
  landmark_text text not null,
  lat double precision,
  lng double precision,
  opening_hours jsonb not null default '{}'::jsonb,
  primary_category text not null default 'Provisions',
  verification_tier text not null default 'unverified'
    check (verification_tier in ('unverified', 'phone_verified', 'rep_verified', 'physically_verified', 'none', 'phone', 'id', 'visit')),
  accuracy_score numeric(4,2) not null default 0.85
    check (accuracy_score >= 0 and accuracy_score <= 1),
  status text not null default 'active'
    check (status in ('active', 'delisted', 'banned', 'suspended', 'pending')),
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Canonical Products & Local Pidgin / Typo Synonyms
create table if not exists public.products (
  id text primary key,
  canonical_name text not null,
  category text not null,
  pack_size text,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.synonyms (
  term text primary key,
  expands_to text[] not null,
  locale text not null default 'en-NG'
);

create table if not exists public.banned_terms (
  term text primary key,
  category text not null default 'prohibited'
);

-- 4. Listings (Integer Kobo Pricing + 4-State Stock + Freshness Timestamps)
-- Upgrade legacy `listings` table if `202611090001_foundation.sql` was run first, or create fresh.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'shop_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'price_kobo'
  ) then
    alter table public.listings rename to listings_legacy_v1;
  end if;
end $$;

create table if not exists public.listings (
  id text primary key,
  seller_id text not null references public.sellers(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  title_as_listed text not null,
  pack_size text,
  price_kobo bigint not null check (price_kobo >= 0),
  price_negotiable boolean not null default false,
  stock_status text not null default 'in'
    check (stock_status in ('in', 'low', 'out', 'unconfirmed')),
  confirmed_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active', 'hidden', 'delisted')),
  views_7d integer not null default 0,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Buyer "Confirm for me" Availability Requests (US-4.1)
create table if not exists public.confirm_requests (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  buyer_user_id text,
  buyer_name text not null default 'A nearby buyer',
  buyer_phone text,
  channel text not null default 'in_app' check (channel in ('in_app', 'whatsapp')),
  state text not null default 'pending' check (state in ('pending', 'yes', 'no')),
  price_at_response bigint,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- 6. Buyer Trip Accuracy Feedback (US-3.2: 3 distinct `not_available` in 7d -> `unconfirmed`)
create table if not exists public.accuracy_reports (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  buyer_key text not null,
  verdict text not null check (verdict in ('got_it', 'different_price', 'not_available', 'didnt_go')),
  created_at timestamptz not null default now()
);

-- 7. Buyer Abuse / Moderation Reports & Verification Queue (US-3.3, US-6.1, US-6.2)
create table if not exists public.reports (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  reason text not null,
  note text,
  reporter text,
  state text not null default 'open' check (state in ('open', 'dismissed', 'actioned')),
  handled_by text,
  handled_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_requests (
  id text primary key,
  seller_id text not null references public.sellers(id) on delete cascade,
  requested_tier text not null
    check (requested_tier in ('phone_verified', 'rep_verified', 'physically_verified')),
  note text,
  evidence_note text,
  state text not null default 'open' check (state in ('open', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

-- 8. Zero-Result Buyer Demand Posts, Search Logs & Append-Only Audit Log (US-1.1, US-6.4, US-8.3)
create table if not exists public.demand_posts (
  id text primary key,
  raw_text text not null,
  cluster text not null default 'Port Harcourt',
  buyer_phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.search_queries (
  id text primary key,
  raw_query text not null,
  cluster text not null default 'Port Harcourt',
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id text primary key,
  actor text not null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 9. Multi-Channel Customer Verification OTPs (Email, Phone SMS, WhatsApp)
create table if not exists public.otp_codes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email', 'phone', 'whatsapp')),
  target text not null,
  code_hash text not null,
  attempts integer not null default 0,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Indexes for <1.0s p95 search & freshness queries
create index if not exists idx_sellers_zone_status on public.sellers (zone_id, status);
create index if not exists idx_listings_seller_status on public.listings (seller_id, status);
create index if not exists idx_listings_confirmed_at on public.listings (confirmed_at desc);
create index if not exists idx_listings_title_trgm on public.listings using gin (title_as_listed gin_trgm_ops);
create index if not exists idx_confirm_requests_listing_state on public.confirm_requests (listing_id, state);
create index if not exists idx_accuracy_reports_listing_created on public.accuracy_reports (listing_id, created_at desc);

-- Row Level Security
alter table public.zones enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.synonyms enable row level security;
alter table public.listings enable row level security;
alter table public.confirm_requests enable row level security;
alter table public.accuracy_reports enable row level security;
alter table public.reports enable row level security;
alter table public.demand_posts enable row level security;

drop policy if exists "zones_public_read" on public.zones;
create policy "zones_public_read" on public.zones for select using (true);

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select using (true);

drop policy if exists "synonyms_public_read" on public.synonyms;
create policy "synonyms_public_read" on public.synonyms for select using (true);

drop policy if exists "listings_public_read_active" on public.listings;
create policy "listings_public_read_active" on public.listings
  for select using (status = 'active');

-- Public safe view of sellers omitting raw phone/whatsapp numbers (anti-scraping US-4.2)
create or replace view public.public_sellers as
  select
    id,
    slug,
    business_name,
    ask_for,
    zone_id,
    landmark_text,
    lat,
    lng,
    opening_hours,
    primary_category,
    verification_tier,
    accuracy_score,
    status
  from public.sellers
  where status = 'active';
