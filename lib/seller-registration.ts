import type { SupabaseClient, User } from '@supabase/supabase-js';

function text(value:unknown){return typeof value==='string'?value.trim():'';}

export async function createSellerApplication(supabase:SupabaseClient,user:User,fields:Record<string,unknown>){
  const fullName=text(fields.full_name)||text(user.user_metadata?.full_name)||text(user.email?.split('@')[0]);
  const phone=text(fields.phone)||text(user.user_metadata?.phone);
  const businessName=text(fields.business_name);
  const description=text(fields.description);
  const address=text(fields.address);
  const whatsapp=text(fields.whatsapp);
  const businessPhone=text(fields.business_phone);
  const categoryId=Number(fields.category_id);
  const locationId=Number(fields.location_id);
  if(!fullName||!phone||!businessName||!description||!address||!whatsapp||!businessPhone||!categoryId||!locationId){
    return {error:'Complete all required account and business fields.'};
  }

  // Seller capability is represented by seller_profiles. Keep the primary
  // profile role intact so an existing buyer/admin can also sell.
  const {error:profileError}=await supabase.from('profiles').update({full_name:fullName,phone}).eq('id',user.id);
  if(profileError)return {error:profileError.message};
  const {data:existing,error:existingError}=await supabase.from('seller_profiles').select('id,status').eq('user_id',user.id).maybeSingle();
  if(existingError)return {error:existingError.message};
  let sellerId=existing?.id;
  if(existing){
    if(existing.status!=='rejected')return {error:'An application is already in progress or this seller account cannot reapply.'};
    const {error}=await supabase.from('seller_profiles').update({business_name:businessName,description,category_id:categoryId,location_id:locationId,address,whatsapp,business_phone:businessPhone,status:'pending',updated_at:new Date().toISOString()}).eq('id',existing.id);
    if(error)return {error:error.message};
  }else{
    const {data:seller,error}=await supabase.from('seller_profiles').insert({user_id:user.id,business_name:businessName,description,category_id:categoryId,location_id:locationId,address,whatsapp,business_phone:businessPhone,status:'pending'}).select('id').single();
    if(error)return {error:error.message};
    sellerId=seller.id;
  }
  const {error:appError}=await supabase.from('seller_applications').insert({seller_id:sellerId,status:'pending'});
  if(appError)return {error:appError.message};
  return {success:true,sellerId};
}

export async function completePendingSellerApplication(supabase:SupabaseClient,user:User){
  const metadata=user.user_metadata||{};
  if(metadata.finda_seller_application!==true)return {success:false};
  return createSellerApplication(supabase,user,metadata);
}
