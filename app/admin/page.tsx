import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadAdminData } from '@/lib/admin-data';
import AdminDashboard from './dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    redirect('/admin/login?setup=required');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: profile } = await supabase.from('profiles').select('role,full_name').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/admin/unauthorized');

  let data: Awaited<ReturnType<typeof loadAdminData>>;
  try {
    data = await loadAdminData();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase could not be reached.';
    return <main style={{minHeight:'100vh',background:'#f5f7f2',display:'grid',placeItems:'center',padding:24,fontFamily:'Arial,sans-serif',color:'#253129'}}>
      <section style={{maxWidth:520,background:'#fff',border:'1px solid #e4e9e3',borderRadius:12,padding:30}}>
        <p style={{fontSize:11,letterSpacing:1,color:'#145d43',fontWeight:700}}>FINDA ADMIN</p>
        <h1 style={{fontSize:24,margin:'8px 0'}}>Dashboard data could not load</h1>
        <p style={{fontSize:14,lineHeight:1.6,color:'#667268'}}>You’re signed in as an administrator, but FINDA could not fetch live data from Supabase. Check your internet connection and Supabase project status, then retry.</p>
        <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12,color:'#8b5145',background:'#fff4f1',padding:12,borderRadius:6}}>{message}</pre>
        <a href="/admin" style={{display:'inline-block',marginTop:8,background:'#145d43',color:'#fff',padding:'11px 15px',borderRadius:6,textDecoration:'none',fontSize:13,fontWeight:700}}>Retry dashboard</a>
      </section>
    </main>;
  }
  return <AdminDashboard data={data} adminName={profile.full_name || user.email || 'Admin'} />;
}
