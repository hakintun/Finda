import Link from 'next/link';
import { signOutAdmin } from '../login/actions';
import { createClient } from '@/lib/supabase/server';
import styles from '../auth.module.css';

export default async function UnauthorizedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profileCheck = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null, error: null };
  const profile = profileCheck.data;
  return <main className={styles.page}><section className={styles.card}>
    <Link className={styles.brand} href="/"><span>f</span>finda<span className={styles.dot}>.</span></Link>
    <div className={styles.eyebrow}>ACCESS RESTRICTED</div><h1>Admin access only</h1>
    <p className={styles.intro}>This account doesn’t have administrator permissions. Contact a FINDA administrator if you think this is a mistake.</p>
    {user&&<div className={styles.info}>FINDA checked <b>{user.email}</b>.<br/>Auth user ID: <code>{user.id}</code><br/>Database role: <b>{profile?.role ?? 'profile not found'}</b>{profileCheck.error&&<><br/>Database lookup error: <code>{profileCheck.error.message}</code></>}</div>}
    <form action={signOutAdmin}><button className={styles.secondary}>Sign out</button></form>
    <Link className={styles.back} href="/">← Back to marketplace</Link>
  </section></main>;
}
