-- Apply once in the Supabase SQL Editor to enable the live admin dashboard.
-- Grants only allow the API role to reach a table; RLS still enforces access.
grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

grant select on public.categories, public.locations, public.seller_profiles,
  public.products, public.product_images to anon, authenticated;
grant select, insert, update, delete on public.seller_profiles,
  public.seller_applications, public.products, public.product_images,
  public.favourites, public.enquiries, public.reports, public.notifications,
  public.categories, public.locations to authenticated;
grant insert on public.enquiries, public.reports to anon;
grant all on public.admin_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists "admin manages locations" on public.locations;
create policy "admin manages locations" on public.locations
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manages categories" on public.categories;
create policy "admin manages categories" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());
