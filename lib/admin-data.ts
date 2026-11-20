import { createClient } from '@/lib/supabase/server';

export type AdminSeller = { id:string; name:string; shop:string; category:string; location:string; submitted:string; status:string; applicationStatus:string; phone:string };
export type AdminProduct = { id:string; name:string; seller:string; category:string; price:number|null; status:string };
export type AdminBuyer = { id:string; name:string; phone:string; registered:string; suspended:boolean };
export type AdminReport = { id:string; title:string; item:string; reason:string; received:string; status:string };
export type AdminCategory = { id:number; name:string; active:boolean; productCount:number };
export type AdminLocation = { id:number; name:string; active:boolean; sellerCount:number };
export type AdminData = {
  stats:{ buyers:number; sellers:number; pending:number; products:number };
  sellers:AdminSeller[]; products:AdminProduct[]; buyers:AdminBuyer[]; reports:AdminReport[];
  categories:AdminCategory[]; locations:AdminLocation[]; activity:{labels:string[]; whatsapp:number[]; phone:number[]};
};

function fail(error:{message:string}|null){if(error)throw new Error(error.message);}
function dateLabel(value:string){return new Date(value).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'});}
function shortDate(value:string){return new Date(value).toLocaleDateString('en-NG',{month:'short',day:'numeric'});}
function statusLabel(value:string){return value==='needs_information'?'Needs info':value.charAt(0).toUpperCase()+value.slice(1);}

export async function loadAdminData():Promise<AdminData>{
  const supabase=await createClient();
  const now=new Date();const weekAgo=new Date(now);weekAgo.setDate(now.getDate()-6);weekAgo.setHours(0,0,0,0);
  const [buyerCount,sellerCount,pendingCount,productCount,sellerResult,applicationResult,productResult,buyerResult,reportResult,categoryResult,locationResult,enquiryResult]=await Promise.all([
    supabase.from('profiles').select('id',{count:'exact',head:true}).eq('role','buyer'),
    supabase.from('seller_profiles').select('id',{count:'exact',head:true}).eq('status','approved'),
    supabase.from('seller_applications').select('id',{count:'exact',head:true}).eq('status','pending'),
    supabase.from('products').select('id',{count:'exact',head:true}).eq('is_active',true),
    supabase.from('seller_profiles').select('id,user_id,business_name,status,created_at,category_id,location_id,business_phone').order('created_at',{ascending:false}).limit(200),
    supabase.from('seller_applications').select('id,seller_id,status,submitted_at,decision_reason').order('submitted_at',{ascending:false}).limit(300),
    supabase.from('products').select('id,name,price,is_active,seller_id,category_id,created_at').order('created_at',{ascending:false}).limit(200),
    supabase.from('profiles').select('id,full_name,phone,role,suspended_at,created_at').eq('role','buyer').order('created_at',{ascending:false}).limit(30),
    supabase.from('reports').select('id,reason,details,status,created_at,product_id,seller_id').order('created_at',{ascending:false}).limit(200),
    supabase.from('categories').select('id,name,is_active').order('name'),
    supabase.from('locations').select('id,neighbourhood,is_active').order('neighbourhood'),
    supabase.from('enquiries').select('created_at,channel').gte('created_at',weekAgo.toISOString()).order('created_at'),
  ]);
  [buyerCount,sellerCount,pendingCount,productCount].forEach(r=>fail(r.error));
  [sellerResult,applicationResult,productResult,buyerResult,reportResult,categoryResult,locationResult,enquiryResult].forEach(r=>fail(r.error));
  const sellersRaw=sellerResult.data||[];const apps=applicationResult.data||[];const productsRaw=productResult.data||[];
  const categoriesRaw=categoryResult.data||[];const locationsRaw=locationResult.data||[];const buyersRaw=buyerResult.data||[];const reportsRaw=reportResult.data||[];
  const userIds=Array.from(new Set(sellersRaw.map(s=>s.user_id)));
  const [usersResult]=userIds.length?await Promise.all([supabase.from('profiles').select('id,full_name,phone').in('id',userIds)]):[{data:[],error:null}];
  fail(usersResult.error);
  const usersById=new Map((usersResult.data||[]).map(u=>[u.id,u]));
  const categoryById=new Map(categoriesRaw.map(c=>[c.id,c.name]));
  const locationById=new Map(locationsRaw.map(l=>[l.id,l.neighbourhood]));
  const latestApp=new Map<string,(typeof apps)[number]>();
  apps.forEach(a=>{if(!latestApp.has(a.seller_id))latestApp.set(a.seller_id,a)});
  const sellers:AdminSeller[]=sellersRaw.map(s=>{
    const user=usersById.get(s.user_id);const application=latestApp.get(s.id);
    return {id:s.id,name:user?.full_name||'Seller',shop:s.business_name,category:categoryById.get(s.category_id)||'Uncategorized',location:locationById.get(s.location_id)||'Location unavailable',submitted:application?dateLabel(application.submitted_at):dateLabel(s.created_at),status:statusLabel(s.status),applicationStatus:statusLabel(application?.status||s.status),phone:s.business_phone||user?.phone||'Not provided'};
  });
  const sellerById=new Map(sellersRaw.map(s=>[s.id,s.business_name]));
  const products:AdminProduct[]=productsRaw.map(p=>({id:p.id,name:p.name,seller:sellerById.get(p.seller_id)||'Seller unavailable',category:categoryById.get(p.category_id)||'Uncategorized',price:p.price===null?null:Number(p.price),status:p.is_active?'Active':'Disabled'}));
  const productById=new Map(productsRaw.map(p=>[p.id,p.name]));
  const reports:AdminReport[]=reportsRaw.map(r=>({id:r.id,title:r.reason,item:r.product_id?(productById.get(r.product_id)||'Product listing'):r.seller_id?(sellerById.get(r.seller_id)||'Seller profile'):'Marketplace content',reason:r.details||r.reason,received:dateLabel(r.created_at),status:statusLabel(r.status)}));
  const buyers:AdminBuyer[]=(buyersRaw||[]).map(b=>({id:b.id,name:b.full_name,phone:b.phone||'Phone not provided',registered:dateLabel(b.created_at),suspended:Boolean(b.suspended_at)}));
  const productCounts=new Map<number,number>();productsRaw.forEach(p=>productCounts.set(p.category_id,(productCounts.get(p.category_id)||0)+1));
  const sellerCountsByLocation=new Map<number,number>();sellersRaw.forEach(s=>sellerCountsByLocation.set(s.location_id,(sellerCountsByLocation.get(s.location_id)||0)+1));
  const labels:string[]=[];const whatsapp:number[]=[];const phone:number[]=[];const enquiries=enquiryResult.data||[];
  for(let day=0;day<7;day++){const d=new Date(weekAgo);d.setDate(weekAgo.getDate()+day);const key=d.toISOString().slice(0,10);labels.push(shortDate(d.toISOString()));whatsapp.push(enquiries.filter(e=>e.created_at.slice(0,10)===key&&e.channel==='whatsapp').length);phone.push(enquiries.filter(e=>e.created_at.slice(0,10)===key&&e.channel==='phone').length);}
  return {
    stats:{buyers:buyerCount.count||0,sellers:sellerCount.count||0,pending:pendingCount.count||0,products:productCount.count||0},
    sellers,products,buyers,reports,
    categories:categoriesRaw.map(c=>({id:c.id,name:c.name,active:c.is_active,productCount:productCounts.get(c.id)||0})),
    locations:locationsRaw.map(l=>({id:l.id,name:l.neighbourhood,active:l.is_active,sellerCount:sellerCountsByLocation.get(l.id)||0})),
    activity:{labels,whatsapp,phone},
  };
}
