# FINDA

FINDA is a Port Harcourt product discovery marketplace. The public marketplace loads live listings from Supabase. Sellers submit applications, admins review them, and approved sellers can publish products with photos and contact details.

## Run locally

```sh
npm install
npm run dev
```

Keep the terminal open while testing. Open the `Local` URL printed by Next.js (usually http://localhost:3000). If the terminal prints port 3001, open that URL instead.

## Connect Supabase

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key) in `.env.local`, then restart the dev server.
2. In Supabase SQL Editor, apply `supabase/schema.sql` for a new project.
3. Apply `supabase/admin-dashboard-migration.sql`, then the latest `supabase/seller-portal-migration.sql`.
4. In Supabase Authentication → URL Configuration, add your local callback URL, such as `http://localhost:3000/auth/callback` (use port 3001 if that is the URL Next.js printed).

## Test the seller-to-marketplace flow

1. Open `/seller/register`, create a seller account, and confirm its email if email confirmation is enabled.
2. Sign in at `/seller/login`. New applications start as pending; an admin must approve the seller before publishing is enabled. If rejected, sign in again and choose **Update application and reapply** to edit the details and submit a fresh application.
3. Sign in at `/admin/login`, open **Seller applications**, review the new application, and approve it.
4. Return to `/seller`, add a product and photo, and publish it.
5. Open the homepage (`/`). The listing should appear with its price, neighbourhood, and seller contact options. The marketplace only displays active listings from approved sellers.

If the homepage has no listings, check the seller is approved, the product is published and available, and the browser is pointed at the same Supabase project as `.env.local`. If the admin role was changed to `seller`, restore it in Supabase SQL Editor with the trusted project owner account:

```sql
update public.profiles set role = 'admin' where id = 'AUTH_USER_UUID';
```

## Supabase admin access

The `/admin` route requires a signed-in Supabase user whose `profiles.role` is `admin`. Its metrics, seller/application lists, buyers, products, reports, categories, and locations load from Supabase. Admin changes run through server actions, check the admin role again, and are recorded in `admin_logs`.

The seller portal is available at `/seller/register`, `/seller/login`, and `/seller`. Sellers can submit an application, see its review status, and, after approval, create, publish, update availability, and delete products with photos stored in the `product-images` bucket. Apply `supabase/seller-portal-migration.sql` after the main schema to configure the public image bucket and upload policies. If email confirmation is enabled, allow your local callback URLs (for example, `http://localhost:3000/auth/callback` and `http://localhost:3001/auth/callback`) in Supabase Authentication → URL Configuration. The redirect URL uses the origin that opened the form.

1. Copy `.env.example` to `.env.local`, then set the Supabase project URL and publishable key from the project's Connect dialog or Settings → API Keys. (The legacy anon key is also accepted.) Restart `npm run dev` after editing environment variables.
2. Apply `supabase/schema.sql` in the Supabase SQL Editor.
3. Create your administrator user in Supabase Authentication → Users (disable public sign-ups in production if they are not needed).
4. Find that user's UUID in Authentication → Users, then provision the role with the SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where id = 'AUTH_USER_UUID';
   ```

5. Open `http://localhost:3000/admin/login` and sign in with that user's email and password.

The public anon key is designed for browser use and protected by RLS. Never put the Supabase service role key in `NEXT_PUBLIC_*` variables or any client-side file. The SQL role update must be run by a trusted project owner.
