-- Foundation only: run on a NEW Supabase project. Writes are intentionally
-- service-role-only until validated RPCs, rate limits and moderation are built.
create extension if not exists pgcrypto;
create extension if not exists postgis with schema extensions;

create table public.market_areas (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  boundary extensions.geometry(MultiPolygon,4326)
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, created_at timestamptz not null default now()
);
create table public.shops (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.market_areas(id), name text not null, landmark text not null,
  location extensions.geography(Point,4326), verified boolean not null default false,
  pin_review_status text not null default 'pending' check (pin_review_status in ('pending','inside','outside','unknown')),
  created_at timestamptz not null default now()
);
-- Phone is separated from public shop data. No direct client access is granted.
create table public.shop_contacts (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+234[0-9]{10}$')
);
create table public.products (id uuid primary key default gen_random_uuid(), name text not null unique);
create table public.product_aliases (alias text primary key, product_id uuid not null references public.products(id) on delete cascade);
create table public.listings (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id), price_naira numeric(12,2) not null check (price_naira >= 0),
  in_stock boolean not null default true, confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(), unique(shop_id,product_id)
);
create table public.confirmation_requests (
  id uuid primary key default gen_random_uuid(), buyer_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','yes','no','expired')),
  created_at timestamptz not null default now(), answered_at timestamptz
);
create table public.accuracy_reports (
  id uuid primary key default gen_random_uuid(), buyer_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(), unique(buyer_id,listing_id)
);
create table public.activity_history (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
  event_type text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index shops_location_idx on public.shops using gist(location);
create index market_areas_boundary_idx on public.market_areas using gist(boundary);
create index listings_product_idx on public.listings(product_id);
create index requests_buyer_idx on public.confirmation_requests(buyer_id);

alter table public.market_areas enable row level security;
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.shop_contacts enable row level security;
alter table public.products enable row level security;
alter table public.product_aliases enable row level security;
alter table public.listings enable row level security;
alter table public.confirmation_requests enable row level security;
alter table public.accuracy_reports enable row level security;
alter table public.activity_history enable row level security;

-- Explicitly remove client privileges first. Only the following reads are exposed.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.market_areas, public.shops, public.products, public.product_aliases, public.listings to anon, authenticated;
grant select on public.profiles, public.confirmation_requests, public.accuracy_reports to authenticated;
create policy areas_public on public.market_areas for select to anon, authenticated using (true);
create policy shops_public on public.shops for select to anon, authenticated using (true);
create policy products_public on public.products for select to anon, authenticated using (true);
create policy aliases_public on public.product_aliases for select to anon, authenticated using (true);
create policy listings_public on public.listings for select to anon, authenticated using (confirmed_at > now() - interval '14 days');
create policy own_profile on public.profiles for select to authenticated using (id = auth.uid());
create policy own_requests on public.confirmation_requests for select to authenticated using (buyer_id = auth.uid());
create policy own_reports on public.accuracy_reports for select to authenticated using (buyer_id = auth.uid());
