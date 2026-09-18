'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getImageSlot } from '@/config/imageConfig';
import { BrandLogo } from '@/components/common/BrandLogo';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  LogIn,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUnverified, setIsUnverified] = useState<boolean>(false);

  const authHeroSlot = getImageSlot('IMAGE_PLACEHOLDER_AUTH_HERO');

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'RECRUITER') {
        router.push('/recruiter');
      } else {
        router.push('/candidate/profile');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnverified(false);
    setIsLoading(true);

    try {
      await login(email, password);
      if (user?.role === 'RECRUITER') {
        router.push('/recruiter');
      } else {
        router.push('/candidate/profile');
      }
    } catch (err: any) {
      if (err.code === 'EMAIL_NOT_VERIFIED' || err.message?.includes('EMAIL_NOT_VERIFIED') || err.message?.toLowerCase().includes('not verified')) {
        setIsUnverified(true);
        setError('Email của bạn chưa được xác thực. Vui lòng xác thực tài khoản để đăng nhập.');
      } else {
        setError(err.message || 'Tài khoản hoặc mật khẩu không chính xác.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] dark:bg-[#0B1329] flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="w-full max-w-4xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column: midCV® Editorial Branding */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#0F2A52] to-[#1E3A5F] dark:from-[#0F172A] dark:to-[#1E293B] p-8 text-white flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <BrandLogo size="md" />

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#2563EB]/20 text-[#D7F9FA] border border-[#2563EB]/40">
                <Sparkles className="w-3 h-3 text-[#D7F9FA]" />
                Evidence-Based Portal
              </span>
              <h1 className="font-editorial text-3xl text-white leading-tight">
                Đăng Nhập Tài Khoản midCV®
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trải nghiệm đối sánh năng lực chuẩn xác trên dữ liệu thực tế và bản lưu đánh giá bất biến.
              </p>
            </div>
          </div>

          {/* Graphical Representation */}
          <div className="relative z-10 my-6 py-4 px-3 rounded-xl bg-white/10 dark:bg-black/30 border border-white/10">
            {authHeroSlot.placeholderUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={authHeroSlot.placeholderUrl}
                alt={authHeroSlot.label}
                className="w-full h-32 object-cover rounded-lg"
              />
            ) : (
              <div className="h-28 w-full flex flex-col justify-center items-center">
                <svg className="w-full h-full text-[#00B14F]" viewBox="0 0 300 100" fill="none">
                  <line x1="20" y1="50" x2="280" y2="50" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                  <circle cx="60" cy="50" r="14" fill="#2563EB" stroke="#D7F9FA" strokeWidth="2" />
                  <circle cx="240" cy="50" r="14" fill="#00B14F" stroke="#A7F3D0" strokeWidth="2" />
                  <circle cx="150" cy="50" r="18" fill="#1E3A5F" stroke="#00B14F" strokeWidth="2.5" />
                  <text x="60" y="54" fontSize="9" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">CV</text>
                  <text x="240" y="54" fontSize="9" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">JD</text>
                  <text x="150" y="54" fontSize="10" fill="#FACC15" textAnchor="middle" fontWeight="bold">94%</text>
                </svg>
              </div>
            )}
          </div>

          <div className="relative z-10 space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00B14F]" />
              <span>Đối sánh vector ngữ nghĩa đa chiều</span>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 bg-white dark:bg-[#111C38] flex flex-col justify-between">
          <div>
            <div className="mb-6 space-y-1">
              <h2 className="font-editorial text-2xl font-bold text-[#0F2A52] dark:text-[#F1F5F9] tracking-tight">
                Đăng Nhập Tài Khoản
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Nhập email và mật khẩu của bạn để tiếp tục.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span>{error}</span>
                  {isUnverified && (
                    <div className="pt-1">
                      <Link
                        href="/verify-email"
                        className="text-[#2563EB] dark:text-[#3B82F6] underline font-semibold hover:text-[#1D4ED8]"
                      >
                        Đến trang xác thực email
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E3A5F] dark:text-[#D6E4E1] mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                  <span>Email đăng nhập</span>
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email || ''}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-[#94A3B8]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E3A5F] dark:text-[#D6E4E1] mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                  <span>Mật khẩu</span>
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu..."
                  value={password || ''}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-[#94A3B8]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}</span>
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between">
            <span>Chưa có tài khoản midCV®?</span>
            <Link
              href="/register"
              className="font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:text-[#1D4ED8] flex items-center gap-1 transition"
            >
              <span>Đăng ký tài khoản</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
