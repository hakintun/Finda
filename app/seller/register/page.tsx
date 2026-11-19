import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { submitSellerApplication } from '../actions';
import styles from '../seller.module.css';

export const dynamic='force-dynamic';

export default async function SellerRegister({searchParams}:{searchParams:Promise<{error?:string;'check-email'?:string}>}){
  const params=await searchParams;
  const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  let user:null|{id:string;email?:string;user_metadata:Record<string,unknown>}=null;let categories:{id:number;name:string}[]=[];let locations:{id:number;neighbourhood:string}[]=[];let existingSeller:{business_name:string;description:string;category_id:number|null;location_id:number;address:string;whatsapp:string;business_phone:string;status:string}|null=null;
  if(configured){const supabase=await createClient();const auth=await supabase.auth.getUser();user=auth.data.user?{id:auth.data.user.id,email:auth.data.user.email,user_metadata:auth.data.user.user_metadata}:null;
    const [categoryResult,locationResult]=await Promise.all([supabase.from('categories').select('id,name').eq('is_active',true).order('name'),supabase.from('locations').select('id,neighbourhood').eq('is_active',true).order('neighbourhood')]);
    categories=categoryResult.data||[];locations=locationResult.data||[];
    if(user){const {data:seller}=await supabase.from('seller_profiles').select('business_name,description,category_id,location_id,address,whatsapp,business_phone,status').eq('user_id',user.id).maybeSingle();if(seller){if(seller.status!=='rejected')redirect('/seller');existingSeller=seller;}}
  }
  return <main className={styles.page}><header className={styles.bar}><Link className={styles.brand} href="/"><span className={styles.brandIcon}>f</span>finda<span className={styles.dot}>.</span></Link><Link className={styles.barLink} href="/seller/login">Already applied? Sign in →</Link></header><section className={styles.card}>
    <div className={styles.eyebrow}>SELL ON FINDA</div><h1>{existingSeller?'Update your application and reapply':user?'Complete your seller application':'Bring your shop to FINDA'}</h1><p className={styles.intro}>{existingSeller?'Your previous application was rejected. Update your business details, then submit a new application for review.':'Reach customers looking for products in Port Harcourt. Your application will be reviewed before you can publish listings.'}</p>
    {!configured&&<div className={`${styles.message} ${styles.error}`}>Supabase isn’t configured. Add your project URL and public key to `.env.local` before applying.</div>}
    {params['check-email']&&<div className={styles.message}>Check your email to confirm your account. Your application will be submitted when you follow the confirmation link.</div>}
    {params.error&&<div className={`${styles.message} ${styles.error}`}>{params.error==='password'?'Use a password with at least 8 characters.':params.error==='terms'?'Accept the seller terms to submit your application.':params.error==='signup'?'We could not create this account. The email may already be registered; sign in and continue your application.':params.error==='application'?'Your account was confirmed, but the seller application could not be completed. Sign in and contact FINDA support.':decodeURIComponent(params.error)}</div>}
    {(!categories.length||!locations.length)&&configured&&<div className={`${styles.message} ${styles.error}`}>Add active categories and Port Harcourt neighbourhoods in Supabase before applying.</div>}
    <form className={styles.form} action={submitSellerApplication}>
      {!user&&<><label>Full name<input name="full_name" autoComplete="name" required placeholder="Your full name"/></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" required placeholder="080…"/></label><label className={styles.full}>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label><label className={styles.full}>Password<input name="password" type="password" minLength={8} autoComplete="new-password" required placeholder="At least 8 characters"/></label></>}
      {user&&<><div className={styles.account}>Applying as <b>{user.email}</b></div><label>Full name<input name="full_name" defaultValue={String(user.user_metadata.full_name||'')} autoComplete="name" required/></label><label>Phone number<input name="phone" defaultValue={String(user.user_metadata.phone||'')} type="tel" required placeholder="080…"/></label></>}
      <label>Shop or business name<input name="business_name" defaultValue={existingSeller?.business_name||''} required placeholder="Your business name"/></label><label>Business category<select name="category_id" defaultValue={existingSeller?.category_id||''} required><option value="" disabled>Select a category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className={styles.full}>Business description<textarea name="description" defaultValue={existingSeller?.description||''} required placeholder="What do you sell? Tell customers about your shop."/></label>
      <label className={styles.full}>Street address<input name="address" defaultValue={existingSeller?.address||''} required placeholder="Shop address or landmark"/></label>
      <label>Neighbourhood<select name="location_id" defaultValue={existingSeller?.location_id||''} required><option value="" disabled>Select an area</option>{locations.map(l=><option key={l.id} value={l.id}>{l.neighbourhood}</option>)}</select></label>
      <label>Business phone<input name="business_phone" defaultValue={existingSeller?.business_phone||''} type="tel" required placeholder="Phone customers can call"/></label>
      <label className={styles.full}>WhatsApp number<input name="whatsapp" defaultValue={existingSeller?.whatsapp||''} type="tel" required placeholder="Include country code, e.g. 2348012345678"/></label>
      <label className={styles.check}><input name="terms" type="checkbox" required/><span>I agree to FINDA’s seller terms and confirm my business details are accurate.</span></label>
      <button className={styles.submit} disabled={!configured||!categories.length||!locations.length}>{existingSeller?'Submit new application →':'Submit seller application →'}</button>
    </form>
    <small className={styles.foot}>Applications start as pending. Products can be published after admin approval.</small>
  </section></main>;
}
