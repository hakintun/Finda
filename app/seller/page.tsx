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
  const {data:seller,error:sellerError}=await supabase.from('seller_profiles').select('id,business_name,description,status,business_phone,whatsapp,created_at,updated_at,category_id,location_id,address').eq('user_id',user.id).maybeSingle();
  if(sellerError)return <main className={styles.page}><section className={styles.card}><h1>Could not load seller profile</h1><p className={styles.intro}>{sellerError.message}</p></section></main>;
  if(!seller)redirect('/seller/register?apply=1');
  if(seller.status!=='approved'){
    const [{data:category},{data:location},{data:application}]=await Promise.all([
      supabase.from('categories').select('name').eq('id',seller.category_id).maybeSingle(),
      supabase.from('locations').select('neighbourhood').eq('id',seller.location_id).maybeSingle(),
      supabase.from('seller_applications').select('submitted_at,decision_reason').eq('seller_id',seller.id).order('submitted_at',{ascending:false}).limit(1).maybeSingle(),
    ]);
    const rejected=seller.status==='rejected';
    const submittedAt=application?.submitted_at||seller.created_at;
    const submittedDate=new Date(submittedAt).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'});
    const statusTitle=seller.status==='pending'?'Application received':seller.status==='needs_information'?'More information needed':rejected?'Your application needs changes':'Seller access is paused';
    return <main className={styles.page}><header className={styles.bar}><a className={styles.brand} href="/"><span className={styles.brandIcon}>f</span>finda<span className={styles.dot}>.</span></a><div className={styles.accountActions}><span className={styles.barLink}>{user.email}</span><form action={signOutSeller}><button className={styles.signOut}>Sign out</button></form></div></header>
      <section className={`${styles.card} ${styles.applicationDashboard} ${rejected?styles.rejectedDashboard:''}`}>
        <div className={styles.dashboardTop}><div><div className={styles.eyebrow}>{rejected?'APPLICATION REVIEW':'SELLER APPLICATION'}</div><h1>{statusTitle}</h1><p>{rejected?'Review the feedback, update your business information, and send a new application.':'Your seller application is saved here. You can check its progress at any time.'}</p></div><span className={`${styles.statusPill} ${styles[seller.status]||''}`}>{seller.status.replace('_',' ')}</span></div>
        <div className={styles.applicationProgress} aria-label={`Application status: ${seller.status}`}>
          <div className={styles.progressStep}><span className={styles.stepDone}>✓</span><b>Application sent</b><small>{submittedDate}</small></div><div className={styles.progressLine}/>
          <div className={styles.progressStep}><span className={seller.status==='pending'?styles.stepCurrent:rejected?styles.stepRejected:styles.stepDone}>{seller.status==='pending'?'2':rejected?'!':'✓'}</span><b>{rejected?'Changes requested':'FINDA review'}</b><small>{seller.status==='pending'?'In progress':rejected?'Update and reapply':'Review complete'}</small></div><div className={styles.progressLine}/>
          <div className={styles.progressStep}><span className={styles.stepWaiting}>3</span><b>Seller workspace</b><small>{rejected?'After approval':'Available after approval'}</small></div>
        </div>
        <div className={styles.applicationGrid}>
          <article className={styles.applicationPanel}><div className={styles.panelEyebrow}>SHOP DETAILS</div><h2>{seller.business_name}</h2><p>{category?.name||'Category not set'}{location?.neighbourhood?` · ${location.neighbourhood}`:''}</p><div className={styles.applicationMeta}><span>APPLICATION DATE</span><b>{submittedDate}</b></div><div className={styles.applicationMeta}><span>CONTACT</span><b>{seller.business_phone}</b></div></article>
          <article className={styles.applicationPanel}><div className={styles.panelEyebrow}>{rejected?'REVIEW FEEDBACK':'WHAT HAPPENS NEXT'}</div>{rejected?<><h2>Update and reapply</h2><p>{application?.decision_reason||'The review team could not approve this application yet. Update your shop details and submit them again for review.'}</p><a className={styles.primaryAction} href="/seller/register?apply=1">Update application →</a></>:seller.status==='pending'?<><h2>We’re reviewing your shop</h2><p>FINDA is checking your shop details. Once approved, your product workspace will unlock automatically.</p><span className={styles.reviewNote}>You can sign back in later to see the latest status.</span></>:seller.status==='needs_information'?<><h2>Please contact FINDA</h2><p>{application?.decision_reason||'The review team needs a little more information before it can complete your application.'}</p></>:<><h2>Contact FINDA support</h2><p>Your seller access is currently paused. Contact the FINDA team for help.</p></>}</article>
        </div>
      </section></main>;
  }
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
