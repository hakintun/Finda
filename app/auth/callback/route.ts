import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completePendingSellerApplication } from '@/lib/seller-registration';

export async function GET(request:NextRequest){
  const url=new URL(request.url);const code=url.searchParams.get('code');const next=url.searchParams.get('next');
  if(code){
    const supabase=await createClient();const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(!error){
      const {data:{user}}=await supabase.auth.getUser();
      if(user){const result=await completePendingSellerApplication(supabase,user);if('error'in result&&result.error)return NextResponse.redirect(new URL('/seller/register?error=application',url.origin));}
      return NextResponse.redirect(new URL(next?.startsWith('/')?next:'/seller',url.origin));
    }
  }
  return NextResponse.redirect(new URL('/seller/login?error=confirmation',url.origin));
}
