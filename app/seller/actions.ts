'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createSellerApplication } from '@/lib/seller-registration';

export async function signInSeller(formData:FormData){
  const email=String(formData.get('email')||'').trim();const password=String(formData.get('password')||'');
  if(!email||!password)redirect('/seller/login?error=missing');
  const supabase=await createClient();const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error||!data.user)redirect('/seller/login?error=invalid');
  redirect('/seller');
}

export async function submitSellerApplication(formData:FormData){
  const supabase=await createClient();let {data:{user}}=await supabase.auth.getUser();
  if(formData.get('terms')!=='on')redirect('/seller/register?error=terms');
  const fullName=String(formData.get('full_name')||'').trim();const phone=String(formData.get('phone')||'').trim();
  const fields={full_name:fullName,phone,business_name:formData.get('business_name'),description:formData.get('description'),category_id:formData.get('category_id'),address:formData.get('address'),location_id:formData.get('location_id'),whatsapp:formData.get('whatsapp'),business_phone:formData.get('business_phone')};
  if(!user){
    const email=String(formData.get('email')||'').trim();const password=String(formData.get('password')||'');
    if(password.length<8)redirect('/seller/register?error=password');
    const origin=(await headers()).get('origin')||'http://localhost:3000';
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{finda_seller_application:true,...fields},emailRedirectTo:new URL('/auth/callback?next=/seller',origin).toString()}});
    if(error||!data.user)redirect('/seller/register?error=signup');
    user=data.user;
    if(!data.session)redirect('/seller/register?check-email=1');
  }
  const result=await createSellerApplication(supabase,user,fields);
  if(result.error)redirect(`/seller/register?error=${encodeURIComponent(result.error)}`);
  revalidatePath('/seller');
  redirect('/seller');
}

export async function signOutSeller(){const supabase=await createClient();await supabase.auth.signOut();redirect('/seller/login');}
