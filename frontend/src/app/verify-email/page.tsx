'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmailToken, resendVerificationToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { BrandLogo } from '@/components/common/BrandLogo';
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
  const [statusMessage, setStatusMessage] = useState<string>('Đang thẩm định mã xác thực số hóa...');
  const [resendEmail, setResendEmail] = useState<string>('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const verifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('INVALID');
      setStatusMessage('Không tìm thấy token xác thực trong đường dẫn. Vui lòng kiểm tra email của bạn.');
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
      setResendStatus(err.message || 'Không thể gửi lại email xác thực.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl shadow-2xl p-8 sm:p-10 space-y-8 relative overflow-hidden transition-colors">
        {/* Subtle Brand Gradient Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[var(--primary)]/10 rounded-xl opacity-0 pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[var(--success)]/10 rounded-xl opacity-0 pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-5">
          <BrandLogo size="md" />
          <span className="text-[10px] font-sans uppercase tracking-widest text-[var(--text-secondary)] dark:text-[var(--text-secondary)] bg-slate-100 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] px-2.5 py-1 rounded-xl">
            Auth Layer v2
          </span>
        </div>

        {/* State Icon Indicator */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-xl flex items-center justify-center shadow-lg transition-transform animate-scale-in">
            {status === 'VERIFYING' && (
              <div className="w-20 h-20 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--primary)]/20 border border-[var(--border)]/30 flex items-center justify-center text-[var(--primary)]">
                <RefreshCw className="w-10 h-10 animate-spin" />
              </div>
            )}
            {status === 'SUCCESS' && (
              <div className="w-20 h-20 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--success)]/20 border border-[var(--border)]/40 flex items-center justify-center text-[var(--success)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {status === 'ALREADY_USED' && (
              <div className="w-20 h-20 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--primary)]/20 border border-[var(--border)]/40 flex items-center justify-center text-[var(--primary)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {status === 'EXPIRED' && (
              <div className="w-20 h-20 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--warning)]/20 border border-[var(--border)]/40 flex items-center justify-center text-[var(--warning)] dark:text-[var(--warning)]">
                <Clock className="w-10 h-10" />
              </div>
            )}
            {(status === 'INVALID' || status === 'ERROR') && (
              <div className="w-20 h-20 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Heading and Description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)] tracking-tight">
              {status === 'VERIFYING' && t('verifyEmail.verifyingTitle', 'Đang Xác Thực Tài Khoản')}
              {status === 'SUCCESS' && (t('verifyEmail.successTitle', 'Xác thực email thành công!'))}
              {status === 'ALREADY_USED' && 'Tài khoản đã được xác thực'}
              {status === 'EXPIRED' && 'Liên kết xác thực đã hết hạn'}
              {(status === 'INVALID' || status === 'ERROR') && (t('verifyEmail.errorTitle', 'Xác thực không thành công'))}
            </h1>

            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
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
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[var(--primary)] hover:bg-[var(--primary)] shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('verifyEmail.continueCta', 'Tiếp tục vào midCV®')}</span>
              <span className="text-xs font-normal opacity-90">— Đăng nhập ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-center">
              <Link
                href="/"
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--heading)] dark:hover:text-[var(--retro-cream)] transition"
              >
                {t('verifyEmail.backHome', 'Quay lại Trang chủ')}
              </Link>
            </div>
          </div>
        )}

        {(status === 'EXPIRED' || status === 'INVALID' || status === 'ERROR') && (
          <div className="space-y-5 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] space-y-3 text-left">
              <span className="text-xs font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)] block">
                {t('verifyEmail.resendPrompt', 'Yêu cầu mã xác thực mới:')}
              </span>
              <form onSubmit={handleResendSubmit} className="space-y-2.5">
                <input
                  type="email"
                  placeholder="Nhập email tài khoản đã đăng ký..."
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] text-[var(--heading)] dark:text-[var(--retro-cream)] text-xs focus:outline-none focus:border-[var(--border)]"
                  required
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] transition disabled:opacity-50 cursor-pointer"
                >
                  {resendLoading ? 'Đang gửi...' : t('verifyEmail.resendButton', 'Gửi lại email xác thực')}
                </button>
              </form>
              {resendStatus && (
                <p className="text-xs text-[var(--success)] dark:text-[var(--success)] pt-1 font-medium">{resendStatus}</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 text-xs">
              <button
                onClick={() => openAuthModal('LOGIN')}
                className="font-semibold text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline cursor-pointer"
              >
                {t('verifyEmail.tryLoginAgain', 'Thử đăng nhập lại')}
              </button>
              <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--heading)] dark:hover:text-[var(--retro-cream)]">
                {t('verifyEmail.backHome', 'Quay lại Trang chủ')}
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
