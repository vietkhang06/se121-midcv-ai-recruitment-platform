'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ApiError, apiRequest, clearAuthSession } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export function PasswordResetForm({ token }: { token?: string }) {
  const { locale } = useLanguage(); const vi = locale === 'vi';
  const [email,setEmail] = useState(''); const [password,setPassword] = useState(''); const [confirm,setConfirm] = useState('');
  const [busy,setBusy] = useState(false); const [message,setMessage] = useState(''); const [error,setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (token !== undefined && (!token || password !== confirm)) { setError(vi ? 'Liên kết không hợp lệ hoặc mật khẩu xác nhận không khớp.' : 'Invalid link or passwords do not match.'); return; }
    setBusy(true);
    try {
      await apiRequest(token === undefined ? '/api/v1/auth/forgot-password' : '/api/v1/auth/reset-password', {
        method:'POST', body:JSON.stringify(token === undefined ? {email} : {token,password})
      });
      if (token !== undefined) { clearAuthSession(); setPassword(''); setConfirm(''); }
      setMessage(token === undefined ? (vi ? 'Nếu email hợp lệ và đang hoạt động, liên kết sẽ được gửi đến hộp thư. Kiểm tra cả mục thư rác.' : 'If the email is eligible, a reset link will be sent. Check your spam folder.') : (vi ? 'Đã cập nhật mật khẩu. Hãy đăng nhập lại.' : 'Password updated. Sign in again.'));
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 400 && token !== undefined
        ? (vi ? 'Liên kết đã hết hạn, đã được sử dụng hoặc không hợp lệ. Hãy yêu cầu liên kết mới.' : 'This link expired, has already been used or is invalid. Request a new link.')
        : (vi ? 'Chưa xử lý được yêu cầu. Vui lòng thử lại.' : 'Could not process the request. Please retry.'));
    }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
    <h1 className="text-2xl font-bold">{token === undefined ? (vi ? 'Quên mật khẩu' : 'Forgot password') : (vi ? 'Đặt lại mật khẩu' : 'Reset password')}</h1>
    {token === undefined ? <label className="block">Email<input className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-3 text-[var(--heading)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label> : <>
      <label className="block">{vi ? 'Mật khẩu mới' : 'New password'}<input className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-3 text-[var(--heading)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <label className="block">{vi ? 'Xác nhận mật khẩu' : 'Confirm password'}<input className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-3 text-[var(--heading)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} /></label>
    </>}
    {error && <p role="alert" className="text-red-600">{error}</p>}{message && <p role="status">{message}</p>}
    <button disabled={busy || token === ''} className="rounded-lg bg-[var(--primary)] px-5 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:opacity-50">{busy ? '…' : token === undefined ? (vi ? 'Gửi liên kết' : 'Send reset link') : (vi ? 'Lưu mật khẩu' : 'Save password')}</button>
    <Link className="block underline" href="/login">{vi ? 'Quay lại đăng nhập' : 'Back to sign in'}</Link>
  </form></main>;
}
