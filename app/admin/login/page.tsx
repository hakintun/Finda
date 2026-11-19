import Link from 'next/link';
import { signInAdmin } from './actions';
import AdminSubmitButton from './submit-button';
import styles from '../auth.module.css';

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string; setup?: string }> }) {
  const params = await searchParams;
  return <main className={styles.page}>
    <section className={styles.card}>
      <Link className={styles.brand} href="/"><span>f</span>finda<span className={styles.dot}>.</span></Link>
      <div className={styles.eyebrow}>ADMINISTRATOR ACCESS</div>
      <h1>Welcome back</h1>
      <p className={styles.intro}>Sign in with your FINDA administrator account.</p>
      {params.setup&&<div className={styles.info}>Supabase isn’t configured yet. Add the project URL and anon key to <code>.env.local</code>, then restart the app.</div>}
      {params.error&&<div className={styles.error}>{params.error==='invalid'?'Email or password is incorrect.':'Enter your email and password.'}</div>}
      <form action={signInAdmin} className={styles.form}>
        <label>Email address<input name="email" type="email" autoComplete="username" placeholder="admin@yourbusiness.com" required/></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required/></label>
        <AdminSubmitButton />
      </form>
      <small className={styles.note}>Admin access is limited to accounts provisioned by FINDA.</small>
      <Link className={styles.back} href="/">← Back to marketplace</Link>
    </section>
  </main>;
}
