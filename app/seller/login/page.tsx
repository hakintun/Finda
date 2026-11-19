import Link from 'next/link';
import { signInSeller } from '../actions';
import styles from '../seller.module.css';

export default async function SellerLogin({searchParams}:{searchParams:Promise<{error?:string}>}){
  const params=await searchParams;
  return <main className={styles.page}><header className={styles.bar}><Link className={styles.brand} href="/"><span className={styles.brandIcon}>f</span>finda<span className={styles.dot}>.</span></Link><Link className={styles.barLink} href="/seller/register">Open a seller account →</Link></header><section className={styles.card}>
    <div className={styles.eyebrow}>FINDA SELLER PORTAL</div><h1>Sign in to your shop</h1><p className={styles.intro}>Manage your application and products for customers in Port Harcourt.</p>
    {params.error&&<div className={`${styles.message} ${styles.error}`}>{params.error==='invalid'?'Email or password is incorrect.':params.error==='confirmation'?'The email confirmation link is invalid or expired.':'Enter your email and password.'}</div>}
    <form className={styles.form} action={signInSeller}><label className={styles.full}>Email address<input name="email" type="email" autoComplete="username" placeholder="you@example.com" required/></label><label className={styles.full}>Password<input name="password" type="password" autoComplete="current-password" placeholder="Your password" required/></label><button className={styles.submit}>Sign in to seller portal →</button></form>
    <small className={styles.foot}>New to FINDA? <Link href="/seller/register">Apply to sell</Link></small>
  </section></main>;
}
