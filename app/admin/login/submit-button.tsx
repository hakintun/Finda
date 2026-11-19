'use client';

import { useFormStatus } from 'react-dom';
import styles from '../auth.module.css';

export default function AdminSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-live="polite">
      {pending && <span className={styles.spinner} aria-hidden="true" />}
      {pending ? 'Signing in…' : 'Sign in to admin'}
      {!pending && <span aria-hidden="true">→</span>}
    </button>
  );
}
