'use client';

import { useEffect, useState } from 'react';
import styles from './loading.module.css';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

function isPrefetch(input:FetchInput,init?:FetchInit){
  const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
  return headers.has('next-router-prefetch')||headers.get('purpose')==='prefetch'||headers.get('sec-purpose')?.includes('prefetch')===true;
}

export default function GlobalLoading(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const originalFetch=window.fetch;
    let activeRequests=0;
    let timer:ReturnType<typeof setTimeout>|undefined;

    window.fetch=async (input,init)=>{
      if(isPrefetch(input,init))return originalFetch.call(window,input,init);
      activeRequests+=1;
      if(activeRequests===1){
        timer=setTimeout(()=>setVisible(true),120);
      }
      try{return await originalFetch.call(window,input,init)}
      finally{
        activeRequests=Math.max(0,activeRequests-1);
        if(activeRequests===0){
          if(timer)clearTimeout(timer);
          timer=undefined;
          setVisible(false);
        }
      }
    };

    return ()=>{
      window.fetch=originalFetch;
      if(timer)clearTimeout(timer);
    };
  },[]);

  if(!visible)return null;
  return <div className={styles.screen} role="status" aria-live="polite" aria-label="Loading FINDA">
    <div className={styles.content}><span className={styles.mark} aria-hidden="true">f</span><span className={styles.spinner} aria-hidden="true"/><p>Loading FINDA…</p></div>
  </div>;
}
