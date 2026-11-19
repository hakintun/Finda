-- FINDA relational MVP foundation for Supabase/PostgreSQL.
create extension if not exists pgcrypto;

create type public.seller_status as enum ('pending','approved','rejected','needs_information','suspended');
create type public.product_condition as enum ('new','used','refurbished');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  suspended_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.locations (
  id bigint generated always as identity primary key,
  city text not null default 'Port Harcourt', state text not null default 'Rivers',
  neighbourhood text not null, is_active boolean not null default true,
  unique(city,state,neighbourhood)
);
create table public.categories (
  id bigint generated always as identity primary key, name text not null unique,
  slug text not null unique, is_active boolean not null default true
);
create table public.seller_profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null, description text not null, category_id bigint references public.categories(id),
  location_id bigint not null references public.locations(id), address text not null,
  whatsapp text not null, business_phone text not null, logo_path text,
  status public.seller_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.seller_applications (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  status public.seller_status not null default 'pending', verification_path text,
  submitted_at timestamptz not null default now(), reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, decision_reason text
);
create table public.products (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  category_id bigint not null references public.categories(id), location_id bigint not null references public.locations(id),
  name text not null, description text not null, price numeric(14,2) check(price is null or price >= 0),
  brand text, condition public.product_condition not null, availability boolean not null default true,
  quantity integer check(quantity is null or quantity >= 0), keywords text[] not null default '{}',
  is_active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null, position integer not null default 0, alt_text text not null
);
create table public.favourites (
  user_id uuid not null references public.profiles(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,product_id)
);
create table public.enquiries (
  id uuid primary key default gen_random_uuid(), buyer_id uuid references public.profiles(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade, seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  channel text not null check(channel in ('whatsapp','phone')), created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid references public.profiles(id) on delete set null,
  product_id uuid references public.products(id) on delete cascade, seller_id uuid references public.seller_profiles(id) on delete cascade,
  reason text not null, details text, status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')), created_at timestamptz not null default now(),
  check(product_id is not null or seller_id is not null)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text not null, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.admin_logs (
  id bigint generated always as identity primary key, admin_id uuid not null references public.profiles(id),
  action text not null, entity_type text not null, entity_id text not null, reason text, created_at timestamptz not null default now()
);

-- Create a least-privilege buyer profile for every new Auth user. Never accept
-- a public sign-up's requested role as trusted metadata.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,phone,role)
  values (new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.raw_user_meta_data->>'phone','buyer');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Role checks are database enforced; a browser supplied user id is never trusted.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and suspended_at is null)
$$;
create or replace function public.protect_profile_role() returns trigger language plpgsql set search_path=public as $$
begin
  if old.role is distinct from new.role and current_user not in ('postgres','service_role') and not public.is_admin() then
    raise exception 'Only an administrator can change profile roles';
  end if;
  return new;
end;
$$;
create trigger protect_profile_role before update on public.profiles
for each row execute function public.protect_profile_role();
create or replace function public.owns_seller(seller uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.seller_profiles where id=seller and user_id=auth.uid())
$$;
create or replace function public.public_product(product uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.products p join public.seller_profiles s on s.id=p.seller_id join public.profiles u on u.id=s.user_id
    where p.id=product and p.is_active and p.availability and s.status='approved' and u.suspended_at is null)
$$;
-- Seller owners may edit business details but cannot approve themselves or
-- change their own application state. Only admin operations can do that.
create or replace function public.protect_seller_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.status is distinct from new.status and not public.is_admin() then
    if tg_table_name='seller_profiles' and old.user_id=auth.uid() and old.status='rejected' and new.status='pending' then
      return new;
    end if;
    raise exception 'Only an administrator can change seller status';
  end if;
  return new;
end;
$$;
create trigger protect_seller_profile_status before update on public.seller_profiles
for each row execute function public.protect_seller_status();
create trigger protect_seller_application_status before update on public.seller_applications
for each row execute function public.protect_seller_status();

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.categories enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.seller_applications enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.favourites enable row level security;
alter table public.enquiries enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_logs enable row level security;

create policy "public reads locations" on public.locations for select using (is_active or public.is_admin());
create policy "public reads categories" on public.categories for select using (is_active or public.is_admin());
create policy "admin manages locations" on public.locations for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manages categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "users read own profile or admin" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "users update own profile" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid() and role <> 'admin');
create policy "admin manages profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads approved sellers" on public.seller_profiles for select using (status='approved' or user_id=auth.uid() or public.is_admin());
create policy "seller creates own profile" on public.seller_profiles for insert with check (user_id=auth.uid() and status='pending');
create policy "seller updates own profile" on public.seller_profiles for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "admin manages sellers" on public.seller_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "seller reads own applications or admin" on public.seller_applications for select using (public.owns_seller(seller_id) or public.is_admin());
create policy "seller submits application" on public.seller_applications for insert with check (public.owns_seller(seller_id) and status='pending');
create policy "admin manages applications" on public.seller_applications for all using (public.is_admin()) with check (public.is_admin());
create policy "public reads discoverable products" on public.products for select using (public.public_product(id) or public.owns_seller(seller_id) or public.is_admin());
create policy "approved sellers create products" on public.products for insert with check (public.owns_seller(seller_id) and exists(select 1 from public.seller_profiles s where s.id=seller_id and s.status='approved'));
create policy "owners update products" on public.products for update using (public.owns_seller(seller_id) or public.is_admin()) with check (public.owns_seller(seller_id) or public.is_admin());
create policy "owners delete products" on public.products for delete using (public.owns_seller(seller_id) or public.is_admin());
create policy "public reads images for discoverable products" on public.product_images for select using (public.public_product(product_id) or exists(select 1 from public.products p where p.id=product_id and public.owns_seller(p.seller_id)) or public.is_admin());
create policy "owners manage images" on public.product_images for all using (exists(select 1 from public.products p where p.id=product_id and public.owns_seller(p.seller_id)) or public.is_admin()) with check (exists(select 1 from public.products p where p.id=product_id and public.owns_seller(p.seller_id)) or public.is_admin());
create policy "buyers manage own favourites" on public.favourites for all using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid());
create policy "users create enquiries" on public.enquiries for insert with check (buyer_id is null or buyer_id=auth.uid());
create policy "users view own enquiries or admin" on public.enquiries for select using (buyer_id=auth.uid() or public.is_admin() or public.owns_seller(seller_id));
create policy "anyone can submit report" on public.reports for insert with check (reporter_id is null or reporter_id=auth.uid());
create policy "reporters and admins view reports" on public.reports for select using (reporter_id=auth.uid() or public.is_admin());
create policy "admin manages reports" on public.reports for update using (public.is_admin()) with check (public.is_admin());
create policy "users view own notifications" on public.notifications for select using (user_id=auth.uid() or public.is_admin());
create policy "users update own notifications" on public.notifications for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "admin logs are admin only" on public.admin_logs for all using (public.is_admin()) with check (public.is_admin());

insert into public.categories(name,slug) values
 ('Phones & tablets','phones-tablets'),('Electronics','electronics'),('Home & living','home-living'),('Fashion','fashion'),('Beauty','beauty'),('Auto & tools','auto-tools')
on conflict(slug) do nothing;
insert into public.locations(neighbourhood) values ('Woji'),('Mile 3'),('Rumuokoro'),('GRA Phase 2'),('Eleme Junction'),('Trans Amadi')
on conflict(city,state,neighbourhood) do nothing;

-- SQL-created tables may not inherit Supabase's default API grants. These
-- grants make the API roles eligible to use tables; RLS policies above still
-- control which rows and operations they can access.
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.locations, public.seller_profiles, public.products, public.product_images to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.seller_profiles, public.seller_applications, public.products,
  public.product_images, public.favourites, public.enquiries, public.reports, public.notifications,
  public.categories, public.locations to authenticated;
grant insert on public.enquiries, public.reports to anon;
grant all on public.admin_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;
