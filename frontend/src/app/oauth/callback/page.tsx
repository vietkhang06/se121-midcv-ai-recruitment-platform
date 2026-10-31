'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BASE_URL, saveAuthTokens } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

const exchanges = new Map<string, Promise<Response>>();

function OAuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { locale } = useLanguage();
  const vi = locale === 'vi';
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    const complete = async () => {
      const ticket = params.get('ticket');
      const currentLocaleIsVi = () => localStorage.getItem('midcv_lang') !== 'en';
      if (!ticket) { setMessage(currentLocaleIsVi() ? 'Liên kết đăng nhập không hợp lệ. Vui lòng thử lại.' : 'The sign-in link is invalid. Please try again.'); return; }
      const requestedNext = params.get('next') || '/candidate';
      const safeNext = requestedNext.startsWith('/') && !requestedNext.startsWith('//') && !requestedNext.includes('\\') ? requestedNext : '/candidate';
      window.history.replaceState(null, '', '/oauth/callback');
      try {
        if (!exchanges.has(ticket)) exchanges.set(ticket, fetch(`${BASE_URL}/api/v1/auth/oauth/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket }), cache: 'no-store' }));
        const response = (await exchanges.get(ticket)!).clone();
        const body = await response.json();
        if (!response.ok || !body?.data?.accessToken) throw new Error(currentLocaleIsVi() ? 'Đăng nhập đã hết hạn hoặc không thể hoàn tất. Vui lòng thử lại.' : 'Sign-in expired or could not be completed. Please try again.');
        if (!active) return;
        const auth = body.data;
        const user = { id: auth.userId, email: auth.email, fullName: auth.email, role: auth.role === 'HR' ? 'RECRUITER' : auth.role, emailVerified: true, isActive: true };
        localStorage.setItem('auth_user', JSON.stringify(user));
        saveAuthTokens(auth);
        window.location.replace(auth.role === 'ADMIN' ? '/admin' : auth.role === 'HR' ? '/recruiter' : safeNext);
      } catch (error: unknown) { if (active) setMessage(error instanceof Error ? error.message : (currentLocaleIsVi() ? 'Đăng nhập không thành công. Vui lòng thử lại.' : 'Sign-in failed. Please try again.')); }
    };
    void complete(); return () => { active = false; };
  }, [params, router]);
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950"><div role="status" className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">{message || (vi ? 'Đang hoàn tất đăng nhập…' : 'Completing sign-in…')}</div></main>;
}

export default function OAuthCallbackPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Completing sign-in…</main>}><OAuthCallbackContent /></Suspense>;
}
