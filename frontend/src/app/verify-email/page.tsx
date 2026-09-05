'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { verifyEmailToken, resendVerificationToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, AlertCircle, RefreshCw, Mail, ArrowRight, Sparkles } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { openAuthModal } = useAuth();

  const [status, setStatus] = useState<'VERIFYING' | 'SUCCESS' | 'ERROR'>('VERIFYING');
  const [message, setMessage] = useState<string>('Đang tiến hành xác thực tài khoản của bạn...');
  const [resendEmail, setResendEmail] = useState<string>('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const verifiedRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('ERROR');
      setMessage('Không tìm thấy mã xác thực (token) trong liên kết. Vui lòng kiểm tra lại email của bạn.');
      return;
    }

    if (verifiedRef.current === token) return;
    verifiedRef.current = token;

    verifyEmailToken(token).then((res) => {
      if (res.success) {
        setStatus('SUCCESS');
        setMessage(res.message);
      } else {
        setStatus('ERROR');
        setMessage(res.message);
      }
    }).catch((err) => {
      setStatus('ERROR');
      setMessage(err.message || 'Lỗi trong quá trình xác thực email.');
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
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-slate-100 text-center space-y-6 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-6">
          {/* Header Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl">
            {status === 'VERIFYING' && (
              <div className="w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-cyan-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            )}
            {status === 'SUCCESS' && (
              <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            )}
            {status === 'ERROR' && (
              <div className="w-16 h-16 rounded-2xl bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Heading and Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {status === 'VERIFYING' && 'Đang Xác Thực Tài Khoản'}
              {status === 'SUCCESS' && 'Xác Thực Email Thành Công!'}
              {status === 'ERROR' && 'Xác Thực Không Thành Công'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              {message}
            </p>
          </div>

          {/* Actions on SUCCESS */}
          {status === 'SUCCESS' && (
            <div className="pt-2 space-y-3">
              <button
                onClick={() => openAuthModal('LOGIN')}
                className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/"
                className="inline-block text-xs text-slate-400 hover:text-white transition"
              >
                Về Trang chủ
              </Link>
            </div>
          )}

          {/* Actions on ERROR */}
          {status === 'ERROR' && (
            <div className="pt-2 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3">
                <span className="text-xs font-semibold text-slate-200 block">
                  Yêu cầu gửi lại email xác thực:
                </span>
                <form onSubmit={handleResendSubmit} className="space-y-2.5">
                  <input
                    type="email"
                    placeholder="Nhập email của bạn..."
                    value={resendEmail ?? ''}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50"
                  >
                    {resendLoading ? 'Đang gửi...' : 'Gửi lại mã xác thực mới'}
                  </button>
                </form>
                {resendStatus && (
                  <p className="text-xs text-cyan-400 pt-1">{resendStatus}</p>
                )}
              </div>

              <div className="flex justify-center gap-4 text-xs">
                <button
                  onClick={() => openAuthModal('LOGIN')}
                  className="text-indigo-400 hover:underline"
                >
                  Thử đăng nhập lại
                </button>
                <Link href="/" className="text-slate-400 hover:text-white">
                  Về Trang chủ
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-400">Đang tải trang xác thực...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
