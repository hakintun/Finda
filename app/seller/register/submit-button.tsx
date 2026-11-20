'use client';

import { useFormStatus } from 'react-dom';
import styles from '../seller.module.css';

export default function SubmitApplicationButton({disabled,label}:{disabled:boolean;label:string}){
  const {pending}=useFormStatus();
  return <button className={styles.submit} type="submit" disabled={disabled||pending} aria-live="polite">
    {pending&&<span className={styles.spinner} aria-hidden="true"/>}
    {pending?'Submitting application…':label}
  </button>;
}
