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
      {/* Background Image: Candidate */}
      <div
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
          isCandidate ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/auth/candidate-auth-hero.jpg"
          alt="Bắt đầu hành trình sự nghiệp cùng midCV"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
      </div>

      {/* Background Image: Recruiter / HR */}
      <div
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
          !isCandidate ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/auth/hr-auth-hero.jpg"
          alt="Kết nối đúng ứng viên cùng midCV"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
      </div>

      {/* Atmospheric Overlays */}
      {/* Top subtle vignette for logo clarity */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050D20]/80 via-[#050D20]/40 to-transparent pointer-events-none z-[1]" />

      {/* Bottom deep gradient for typography readability */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#06122A] via-[#08183B]/85 to-transparent pointer-events-none z-[1]" />

      {/* Right-edge soft blue ambient accent */}
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#06122A]/40 to-transparent pointer-events-none z-[1]" />

      {/* Futuristic Glowing Neon Rings (matching Figma bottom-right aesthetic) */}
      <div className="absolute -bottom-20 -right-20 w-80 h-80 sm:w-96 sm:h-96 pointer-events-none z-[2] opacity-80">
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="260" cy="260" r="160" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="6 4" />
          <circle cx="260" cy="260" r="130" stroke="#2563EB" strokeWidth="2" strokeOpacity="0.4" />
          <circle cx="260" cy="260" r="95" stroke="#60A5FA" strokeWidth="2.5" strokeOpacity="0.6" />
          <circle cx="260" cy="260" r="60" fill="url(#blueCoreGlow)" />
          <circle cx="330" cy="180" r="4" fill="#67E8F9" filter="url(#glowFilter)" />
          <circle cx="170" cy="300" r="3.5" fill="#38BDF8" filter="url(#glowFilter)" />
          <defs>
            <radialGradient id="blueCoreGlow" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
            </radialGradient>
            <filter id="glowFilter" x="-10" y="-10" width="30" height="30" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>
      </div>

      {/* Top Section: midCV Brand Logo */}
      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg py-1 px-1.5 -ml-1.5 transition-transform hover:scale-105"
        >
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            mid<span className="text-[#3B82F6]">CV</span>
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
