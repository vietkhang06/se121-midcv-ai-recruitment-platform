'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export type AuthRole = 'CANDIDATE' | 'RECRUITER';

interface AuthHeroBannerProps {
  role: AuthRole;
  className?: string;
}

export const AuthHeroBanner: React.FC<AuthHeroBannerProps> = ({ role, className = '' }) => {
  const { locale } = useLanguage();
  const isCandidate = role === 'CANDIDATE';
  const isVi = locale === 'vi';

  return (
    <div
      className={`relative w-full h-full min-h-[320px] md:min-h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-14 select-none ${className}`}
      data-testid="auth-hero-banner"
    >
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center opacity-70 pointer-events-none">
        <svg viewBox="0 0 600 720" className="w-full max-w-[600px]" fill="none">
          <circle cx="445" cy="250" r="128" fill="var(--studio-sky)" opacity=".55"/>
          <circle cx="145" cy="395" r="110" fill="var(--studio-butter)" opacity=".6"/>
          <rect x="123" y="137" width="342" height="350" rx="26" fill="var(--studio-butter)" stroke="var(--studio-auth-ink)" strokeWidth="1.7"/>
          <rect x="115" y="129" width="342" height="350" rx="26" fill="var(--studio-auth-paper)" stroke="var(--studio-auth-ink)" strokeWidth="1.7"/>
          <path d="M115 192H457" stroke="var(--studio-auth-ink)" strokeWidth="1.4"/>
          <circle cx="143" cy="161" r="5" fill="var(--studio-peach)"/>
          <circle cx="165" cy="161" r="5" fill="var(--studio-butter)"/>
          <circle cx="187" cy="161" r="5" fill="var(--retro-mint)"/>
          <rect x="145" y="220" width="95" height="95" rx="22" fill="var(--retro-mint)" stroke="var(--studio-auth-ink)" strokeWidth="1.3"/>
          <circle cx="193" cy="251" r="15" stroke="var(--studio-auth-ink)" strokeWidth="1.8"/>
          <path d="M168 291c4-26 46-26 50 0" stroke="var(--studio-auth-ink)" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M267 238h150M267 260h117M267 282h139M145 349h271M145 373h234" stroke="var(--retro-sky)" strokeWidth="7" strokeLinecap="round" opacity=".7"/>
          <rect x="145" y="407" width="104" height="36" rx="11" fill="var(--studio-lavender)" stroke="var(--studio-auth-ink)"/>
          <rect x="262" y="407" width="91" height="36" rx="11" fill="var(--studio-peach)" stroke="var(--studio-auth-ink)"/>
          <rect x="370" y="407" width="48" height="36" rx="11" fill="var(--retro-mint)" stroke="var(--studio-auth-ink)"/>
          <path d="m385 425 7 6 13-14" stroke="var(--studio-auth-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="358" y="315" width="170" height="68" rx="18" fill="var(--studio-butter)" stroke="var(--studio-auth-ink)" strokeWidth="1.5"/>
          <circle cx="386" cy="349" r="12" fill="var(--retro-mint)" stroke="var(--studio-auth-ink)"/>
          <path d="m381 349 4 4 7-8M410 341h92M410 355h65" stroke="var(--studio-auth-ink)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Atmospheric Overlays */}
      {/* Top subtle vignette for logo clarity */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--retro-deep)]/80 via-[var(--retro-deep)]/40 to-transparent pointer-events-none z-[1]" />

      {/* Bottom deep gradient for typography readability */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[var(--retro-deep)] via-[var(--retro-deep)]/85 to-transparent pointer-events-none z-[1]" />

      {/* Right-edge soft blue ambient accent */}
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--retro-deep)]/40 to-transparent pointer-events-none z-[1]" />

      <div aria-hidden="true" className="absolute -bottom-20 -right-20 w-80 h-80 sm:w-96 sm:h-96 pointer-events-none z-[2] opacity-80">
        <svg viewBox="0 0 400 400" fill="none" className="w-full h-full"><circle cx="260" cy="260" r="160" stroke="var(--retro-sky)" strokeWidth="1" opacity=".3"/><circle cx="260" cy="260" r="130" stroke="var(--retro-sky)" strokeWidth="1" opacity=".3"/></svg>
      </div>

      {/* Top Section: midCV Brand Logo */}
      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl py-1 px-1.5 -ml-1.5 transition-transform hover:scale-105"
        >
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            mid<span className="text-[var(--primary)]">CV</span>
          </span>
        </Link>
      </div>

      {/* Bottom Section: Hero Text content */}
      <div className="relative z-10 pt-16 sm:pt-24 max-w-xl">
        {/* Candidate Editorial Message */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            isCandidate ? 'opacity-100 translate-y-0 block' : 'opacity-0 translate-y-2 hidden'
          }`}
        >
          <h1 className="text-2xl sm:text-3xl lg:text-[36px] xl:text-[40px] font-extrabold text-white leading-[1.2] tracking-tight drop-shadow-md">
            {isVi ? (
              <>
                Bắt đầu hành trình<br />
                sự nghiệp của bạn
              </>
            ) : (
              <>
                Start Your Career<br />
                Journey With midCV
              </>
            )}
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal drop-shadow-sm max-w-[460px]">
            {isVi
              ? 'Tạo tài khoản ứng viên trên midCV để khám phá hàng ngàn cơ hội việc làm phù hợp, kết nối với nhà tuyển dụng và phát triển sự nghiệp.'
              : 'Create a candidate account on midCV to explore thousands of curated jobs, connect directly with top employers, and elevate your career.'}
          </p>
        </div>

        {/* Recruiter / HR Editorial Message */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            !isCandidate ? 'opacity-100 translate-y-0 block' : 'opacity-0 translate-y-2 hidden'
          }`}
        >
          <h1 className="text-2xl sm:text-3xl lg:text-[36px] xl:text-[40px] font-extrabold text-white leading-[1.2] tracking-tight drop-shadow-md">
            {isVi ? (
              <>
                Kết nối đúng ứng viên<br />
                Xây dựng đội ngũ tốt hơn
              </>
            ) : (
              <>
                Connect with Top Talent<br />
                Build Stronger Teams
              </>
            )}
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal drop-shadow-sm max-w-[460px]">
            {isVi
              ? 'Tạo tài khoản nhà tuyển dụng trên midCV để đăng tin tuyển dụng, tiếp cận ứng viên phù hợp và tối ưu quy trình tuyển dụng với công nghệ AI.'
              : 'Create an employer account on midCV to post job opportunities, discover matched candidates, and accelerate hiring with AI.'}
          </p>
        </div>
      </div>
    </div>
  );
};
