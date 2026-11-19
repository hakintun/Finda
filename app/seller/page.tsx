import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOutSeller } from './actions';
import SellerWorkspace from './workspace';
import styles from './seller.module.css';

export const dynamic='force-dynamic';

export default async function SellerPage(){
  const hasConfig=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  if(!hasConfig)redirect('/seller/login');
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/seller/login');
  const {data:seller,error:sellerError}=await supabase.from('seller_profiles').select('id,business_name,description,status,business_phone,whatsapp,created_at').eq('user_id',user.id).maybeSingle();
  if(sellerError)return <main className={styles.page}><section className={styles.card}><h1>Could not load seller profile</h1><p className={styles.intro}>{sellerError.message}</p></section></main>;
  if(!seller)redirect('/seller/register?apply=1');
  if(seller.status!=='approved')return <main className={styles.page}><header className={styles.bar}><a className={styles.brand} href="/"><span className={styles.brandIcon}>f</span>finda<span className={styles.dot}>.</span></a><span className={styles.barLink}>{user.email}</span></header><section className={`${styles.card} ${styles.statusCard}`}>
    <div className={styles.statusTop}><div><div className={styles.eyebrow}>SELLER APPLICATION</div><h1>{seller.business_name}</h1><p className={styles.intro}>Your shop status and next steps.</p></div><span className={`${styles.statusPill} ${styles[seller.status]||''}`}>{seller.status.replace('_',' ')}</span></div>
    <div className={styles.statusDetails}><h2>{seller.status==='pending'?'Your application is being reviewed':seller.status==='needs_information'?'We need a little more information':seller.status==='rejected'?'Application not approved':'Seller access is suspended'}</h2><p>{seller.status==='pending'?'FINDA will review your business details. You’ll be able to list products once your application is approved.':seller.status==='needs_information'?'Please contact FINDA support to provide the additional details requested by the admin.':seller.status==='rejected'?'Update your business details and submit a new application for review.':'Contact FINDA support for help with this account.'}</p></div>
    {seller.status==='rejected'&&<p><a className={styles.addButton} href="/seller/register?apply=1">Update application and reapply →</a></p>}<form action={signOutSeller}><button className={styles.addButton}>Sign out</button></form>
  </section></main>;
  const [{data:products,error:productsError},{data:categories},{data:locations},{data:enquiries,error:enquiriesError}]=await Promise.all([
    supabase.from('products').select('id,name,description,price,brand,condition,availability,quantity,is_active,category_id,location_id,created_at,product_images(id,storage_path,position,alt_text)').eq('seller_id',seller.id).order('created_at',{ascending:false}),
    supabase.from('categories').select('id,name').eq('is_active',true).order('name'),
    supabase.from('locations').select('id,neighbourhood').eq('is_active',true).order('neighbourhood'),
    supabase.from('enquiries').select('id,channel').eq('seller_id',seller.id),
  ]);
  if(productsError||enquiriesError)return <main className={styles.page}><section className={styles.card}><h1>Could not load seller workspace</h1><p className={styles.intro}>{productsError?.message||enquiriesError?.message}</p></section></main>;
  const categoryNames=new Map((categories||[]).map(c=>[c.id,c.name]));const locationNames=new Map((locations||[]).map(l=>[l.id,l.neighbourhood]));
  const list=(products||[]).map(p=>{const images=(p.product_images||[]).sort((a,b)=>a.position-b.position);const path=images[0]?.storage_path;const imageUrl=path?supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl:null;return {...p,category:categoryNames.get(p.category_id)||'Uncategorized',location:locationNames.get(p.location_id)||'Location unavailable',imageUrl};});
  return <SellerWorkspace seller={{id:seller.id,name:seller.business_name,status:seller.status}} products={list} categories={categories||[]} locations={locations||[]} enquiryCount={(enquiries||[]).length}/>;
}
