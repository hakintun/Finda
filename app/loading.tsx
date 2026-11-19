
import styles from './loading.module.css';

export default function Loading() {
  return (
    <main className={styles.screen} role="status" aria-live="polite" aria-label="Loading FINDA">
      <div className={styles.content}>
        <span className={styles.mark} aria-hidden="true">f</span>
        <span className={styles.spinner} aria-hidden="true" />
        <p>Loading FINDA…</p>
      </div>
    </main>
  );
}
