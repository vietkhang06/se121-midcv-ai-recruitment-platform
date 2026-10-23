'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BASE_URL } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

function OAuthCompletionContent() {
  const params = useSearchParams();
  const { locale } = useLanguage();
  const vi = locale === 'vi';
  const ticket = params.get('ticket') || '';
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    window.history.replaceState(null, '', '/oauth/complete');
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/oauth/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket, email }), cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || (vi ? 'Không thể hoàn tất đăng ký.' : 'Could not complete registration.'));
      setMessage(vi ? `Tài khoản đang chờ xác minh email tại ${body?.data?.email || email}. Mở email xác minh rồi đăng nhập lại bằng GitHub.` : `The account is waiting for email verification at ${body?.data?.email || email}. Verify the address, then sign in with GitHub again.`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : (vi ? 'Không thể hoàn tất đăng ký. Vui lòng thử lại.' : 'Could not complete registration. Please try again.')); }
    finally { setBusy(false); }
  };
  const visibleError = error || (!ticket ? (vi ? 'Yêu cầu đăng ký đã hết hạn. Hãy thử lại từ trang đăng nhập.' : 'This registration request expired. Start again from the sign-in page.') : '');
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5 dark:bg-slate-950"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h1 className="text-xl font-semibold">{vi ? 'Hoàn tất đăng ký GitHub' : 'Complete GitHub registration'}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{vi ? 'GitHub không cung cấp email công khai đã xác minh. Nhập email để nhận thư xác minh. Email chưa xác minh sẽ không được dùng để tự liên kết tài khoản.' : 'GitHub did not provide a verified email. Enter an address to receive a verification message. An unverified email will not be used to link an account.'}</p><form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-sm font-medium">Email<input aria-label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-950" /></label><button disabled={!ticket || busy || !!message} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{busy ? (vi ? 'Đang gửi…' : 'Sending…') : (vi ? 'Gửi email xác minh' : 'Send verification email')}</button></form>{visibleError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{visibleError}</p>}{message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}<a href="/login" className="mt-5 inline-block text-sm font-medium text-blue-700 hover:underline dark:text-blue-300">{vi ? 'Quay lại đăng nhập' : 'Back to sign in'}</a></section></main>;
}

export default function OAuthCompletionPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading…</main>}><OAuthCompletionContent /></Suspense>;
}
