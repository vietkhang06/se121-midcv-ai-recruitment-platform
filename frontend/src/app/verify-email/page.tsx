'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmailToken, resendVerificationToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Mail,
  ArrowRight,
  Sparkles,
  Lock,
  ExternalLink
} from 'lucide-react';

type VerifyState = 'VERIFYING' | 'SUCCESS' | 'EXPIRED' | 'INVALID' | 'ALREADY_USED' | 'ERROR';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const { openAuthModal } = useAuth();
  const { t } = useLanguage();

  const [status, setStatus] = useState<VerifyState>('VERIFYING');
  const [statusMessage, setStatusMessage] = useState<string>('Validating cryptographic verification token...');
  const [resendEmail, setResendEmail] = useState<string>('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const verifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('INVALID');
      setStatusMessage('No verification token found in URL parameters. Please check your verification email.');
      return;
    }

    if (verifiedRef.current === token) return;
    verifiedRef.current = token;

    verifyEmailToken(token)
      .then((res) => {
        if (res.success) {
          setStatus('SUCCESS');
          setStatusMessage(res.message || 'Email đã được xác thực thành công. Bạn có thể đăng nhập ngay bây giờ.');
        } else {
          const msg = (res.message || '').toLowerCase();
          if (msg.includes('expired') || msg.includes('hết hạn')) {
            setStatus('EXPIRED');
          } else if (msg.includes('already') || msg.includes('đã được sử dụng')) {
            setStatus('ALREADY_USED');
          } else {
            setStatus('INVALID');
          }
          setStatusMessage(res.message || 'Mã xác thực không hợp lệ.');
        }
      })
      .catch((err) => {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('expired') || msg.includes('hết hạn')) {
          setStatus('EXPIRED');
        } else if (msg.includes('already') || msg.includes('đã được')) {
          setStatus('ALREADY_USED');
        } else {
          setStatus('INVALID');
        }
        setStatusMessage(err.message || 'Mã xác thực không hợp lệ hoặc lỗi kết nối.');
      });
  }, [token]);

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    setResendStatus(null);
    try {
      const res = await resendVerificationToken(resendEmail.trim());
      setResendStatus(res.message);
    } catch (err: any) {
      setResendStatus(err.message || 'Unable to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-3xl shadow-2xl p-8 sm:p-10 space-y-8 relative overflow-hidden transition-colors">
        {/* Subtle MatchJD Forest Gradient Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#0C2B24]/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#D97706]/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1B3D34] pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0C2B24] dark:bg-emerald-950 flex items-center justify-center text-[#10B981] border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-editorial text-xl font-bold text-slate-900 dark:text-white">MatchJD</span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#14332B] px-2.5 py-1 rounded-full">
            Auth Layer v2
          </span>
        </div>

        {/* State Icon Indicator */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-transform animate-scale-in">
            {status === 'VERIFYING' && (
              <div className="w-20 h-20 rounded-3xl bg-[#0C2B24]/10 dark:bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <RefreshCw className="w-10 h-10 animate-spin" />
              </div>
            )}
            {status === 'SUCCESS' && (
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {status === 'ALREADY_USED' && (
              <div className="w-20 h-20 rounded-3xl bg-teal-50 dark:bg-teal-950/60 border border-teal-500/40 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {status === 'EXPIRED' && (
              <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Clock className="w-10 h-10" />
              </div>
            )}
            {(status === 'INVALID' || status === 'ERROR') && (
              <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Heading and Description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">
              {status === 'VERIFYING' && t('verifyEmail.verifyingTitle', 'Đang Xác Thực Tài Khoản')}
              {status === 'SUCCESS' && (t('verifyEmail.successTitle', 'Xác thực email thành công!'))}
              {status === 'ALREADY_USED' && 'Tài khoản đã được xác thực'}
              {status === 'EXPIRED' && 'Liên kết xác thực đã hết hạn'}
              {(status === 'INVALID' || status === 'ERROR') && (t('verifyEmail.errorTitle', 'Xác thực không thành công'))}
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              {statusMessage}
            </p>
          </div>
        </div>

        {/* State Actions */}
        {(status === 'SUCCESS' || status === 'ALREADY_USED') && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                openAuthModal('LOGIN');
                router.push('/jobs');
              }}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#0C2B24] hover:bg-[#133E34] dark:bg-emerald-700 dark:hover:bg-emerald-600 shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('verifyEmail.continueCta', 'Continue to MatchJD')}</span>
              <span className="text-xs font-normal opacity-90">— Đăng nhập ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-center">
              <Link
                href="/"
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              >
                {t('verifyEmail.backHome', 'Back to Home')}
              </Link>
            </div>
          </div>
        )}

        {(status === 'EXPIRED' || status === 'INVALID' || status === 'ERROR') && (
          <div className="space-y-5 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0A1E19] border border-slate-200 dark:border-[#1B3D34] space-y-3 text-left">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {t('verifyEmail.resendPrompt', 'Request a new verification token:')}
              </span>
              <form onSubmit={handleResendSubmit} className="space-y-2.5">
                <input
                  type="email"
                  placeholder="Enter your registered email..."
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E241E] border border-slate-300 dark:border-[#1B3D34] text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500"
                  required
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#0C2B24] dark:bg-emerald-700 hover:bg-[#133E34] transition disabled:opacity-50 cursor-pointer"
                >
                  {resendLoading ? 'Sending...' : t('verifyEmail.resendButton', 'Resend Verification Email')}
                </button>
              </form>
              {resendStatus && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 pt-1 font-medium">{resendStatus}</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 text-xs">
              <button
                onClick={() => openAuthModal('LOGIN')}
                className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {t('verifyEmail.tryLoginAgain', 'Try Sign In Again')}
              </button>
              <Link href="/" className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                {t('verifyEmail.backHome', 'Back to Home')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-500">Loading verification service...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
