'use client';
import { Suspense, useEffect, useState } from 'react';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { useSearchParams } from 'next/navigation';
function Content() {
  const params=useSearchParams(); const [token]=useState(()=>params.get('token') || '');
  useEffect(()=>{ window.history.replaceState(null,'','/reset-password'); },[]);
  return <PasswordResetForm token={token} />;
}
export default function Page() { return <Suspense fallback={<p>…</p>}><Content /></Suspense>; }
