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
      <div className="w-full max-w-xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-2xl p-8 sm:p-10 space-y-8 relative overflow-hidden transition-colors">
        {/* Subtle Brand Gradient Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#00B14F]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-5">
          <BrandLogo size="md" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] dark:text-[#94A3B8] bg-slate-100 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] px-2.5 py-1 rounded-full">
            Auth Layer v2
          </span>
        </div>

        {/* State Icon Indicator */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-transform animate-scale-in">
            {status === 'VERIFYING' && (
              <div className="w-20 h-20 rounded-3xl bg-[#EFF6FF] dark:bg-[#2563EB]/20 border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB]">
                <RefreshCw className="w-10 h-10 animate-spin" />
              </div>
            )}
            {status === 'SUCCESS' && (
              <div className="w-20 h-20 rounded-3xl bg-[#E8F8EE] dark:bg-[#00B14F]/20 border border-[#00B14F]/40 flex items-center justify-center text-[#00B14F]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {status === 'ALREADY_USED' && (
              <div className="w-20 h-20 rounded-3xl bg-[#D7F9FA] dark:bg-[#06B6D4]/20 border border-[#06B6D4]/40 flex items-center justify-center text-[#06B6D4]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {status === 'EXPIRED' && (
              <div className="w-20 h-20 rounded-3xl bg-[#FEF9C3] dark:bg-[#FACC15]/20 border border-[#FACC15]/40 flex items-center justify-center text-[#92400E] dark:text-[#FACC15]">
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
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9] tracking-tight">
              {status === 'VERIFYING' && t('verifyEmail.verifyingTitle', 'Đang Xác Thực Tài Khoản')}
              {status === 'SUCCESS' && (t('verifyEmail.successTitle', 'Xác thực email thành công!'))}
              {status === 'ALREADY_USED' && 'Tài khoản đã được xác thực'}
              {status === 'EXPIRED' && 'Liên kết xác thực đã hết hạn'}
              {(status === 'INVALID' || status === 'ERROR') && (t('verifyEmail.errorTitle', 'Xác thực không thành công'))}
            </h1>

            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed">
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
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('verifyEmail.continueCta', 'Tiếp tục vào midCV®')}</span>
              <span className="text-xs font-normal opacity-90">— Đăng nhập ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-center">
              <Link
                href="/"
                className="text-xs text-[#64748B] hover:text-[#0F2A52] dark:hover:text-[#F1F5F9] transition"
              >
                {t('verifyEmail.backHome', 'Quay lại Trang chủ')}
              </Link>
            </div>
          </div>
        )}

        {(status === 'EXPIRED' || status === 'INVALID' || status === 'ERROR') && (
          <div className="space-y-5 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] space-y-3 text-left">
              <span className="text-xs font-semibold text-[#0F2A52] dark:text-[#E2E8F0] block">
                {t('verifyEmail.resendPrompt', 'Yêu cầu mã xác thực mới:')}
              </span>
              <form onSubmit={handleResendSubmit} className="space-y-2.5">
                <input
                  type="email"
                  placeholder="Nhập email tài khoản đã đăng ký..."
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-xs focus:outline-none focus:border-[#2563EB]"
                  required
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition disabled:opacity-50 cursor-pointer"
                >
                  {resendLoading ? 'Đang gửi...' : t('verifyEmail.resendButton', 'Gửi lại email xác thực')}
                </button>
              </form>
              {resendStatus && (
                <p className="text-xs text-[#00B14F] dark:text-[#10B981] pt-1 font-medium">{resendStatus}</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 text-xs">
              <button
                onClick={() => openAuthModal('LOGIN')}
                className="font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
              >
                {t('verifyEmail.tryLoginAgain', 'Thử đăng nhập lại')}
              </button>
              <Link href="/" className="text-[#64748B] hover:text-[#0F2A52] dark:hover:text-[#F1F5F9]">
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
