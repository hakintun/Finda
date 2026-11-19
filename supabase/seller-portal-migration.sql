-- Apply in Supabase SQL Editor to enable seller applications and product image uploads.
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.categories, public.locations to anon, authenticated;
grant select, insert, update, delete on public.seller_profiles, public.seller_applications,
  public.products, public.product_images to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Ensure new users get a buyer profile, regardless of public user metadata.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,phone,role)
  values (new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.raw_user_meta_data->>'phone','buyer');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Seller applications must not change the user's buyer/admin role. Seller
-- capability is represented by seller_profiles; role changes are admin-only.
create or replace function public.protect_profile_role() returns trigger language plpgsql set search_path=public as $$
begin
  if old.role is distinct from new.role and current_user not in ('postgres','service_role') and not public.is_admin() then
    raise exception 'Only an administrator can change profile roles';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles
for each row execute function public.protect_profile_role();

-- Public product images; writes are restricted to approved sellers' own folder.
insert into storage.buckets (id,name,public)
values ('product-images','product-images',true)
on conflict (id) do update set public=true;

grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

drop policy if exists "public reads FINDA product images" on storage.objects;
create policy "public reads FINDA product images" on storage.objects
  for select using (bucket_id='product-images');

drop policy if exists "approved sellers upload FINDA product images" on storage.objects;
create policy "approved sellers upload FINDA product images" on storage.objects
  for insert to authenticated with check (
    bucket_id='product-images'
    and (storage.foldername(name))[1]=auth.uid()::text
    and exists(select 1 from public.seller_profiles s where s.user_id=auth.uid() and s.status='approved')
  );

drop policy if exists "approved sellers update FINDA product images" on storage.objects;
create policy "approved sellers update FINDA product images" on storage.objects
  for update to authenticated using (
    bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text
    and exists(select 1 from public.seller_profiles s where s.user_id=auth.uid() and s.status='approved')
  ) with check (
    bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text
    and exists(select 1 from public.seller_profiles s where s.user_id=auth.uid() and s.status='approved')
  );

drop policy if exists "approved sellers delete FINDA product images" on storage.objects;
create policy "approved sellers delete FINDA product images" on storage.objects
  for delete to authenticated using (
    bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text
    and exists(select 1 from public.seller_profiles s where s.user_id=auth.uid() and s.status='approved')
  );

-- Allow a seller to resubmit only after an administrator rejected their
-- seller profile. They cannot change application status or approve themselves.
create or replace function public.protect_seller_status() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if old.status is distinct from new.status and not public.is_admin() then
    if tg_table_name='seller_profiles' and old.user_id=auth.uid()
      and old.status='rejected' and new.status='pending' then
      return new;
    end if;
    raise exception 'Only an administrator can change seller status';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_seller_profile_status on public.seller_profiles;
create trigger protect_seller_profile_status before update on public.seller_profiles
for each row execute function public.protect_seller_status();
drop trigger if exists protect_seller_application_status on public.seller_applications;
create trigger protect_seller_application_status before update on public.seller_applications
for each row execute function public.protect_seller_status();
