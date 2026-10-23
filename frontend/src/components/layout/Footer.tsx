'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useLanguage } from '@/context/LanguageContext';

export const Footer: React.FC = () => {
  const pathname = usePathname();
  const { locale } = useLanguage();
  if (pathname === '/login' || pathname === '/register' || pathname?.startsWith('/recruiter') || pathname?.startsWith('/admin')) return null;
  const vi = locale === 'vi';
  return <footer className="mt-auto border-t border-slate-200 bg-slate-50 py-8 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
      <div className="space-y-3"><BrandLogo size="md"/><p className="max-w-sm text-sm leading-6">{vi ? 'Nền tảng kết nối ứng viên và nhà tuyển dụng.' : 'A platform connecting candidates and recruiters.'}</p></div>
      <nav aria-label={vi ? 'Liên kết việc làm' : 'Job links'}><h2 className="mb-3 text-sm font-semibold">{vi ? 'Việc làm' : 'Jobs'}</h2><ul className="space-y-2 text-sm"><li><Link className="hover:text-blue-700 dark:hover:text-blue-300" href="/jobs">{vi ? 'Tìm việc' : 'Search jobs'}</Link></li><li><Link className="hover:text-blue-700 dark:hover:text-blue-300" href="/help">{vi ? 'Trợ giúp' : 'Help'}</Link></li></ul></nav>
      <nav aria-label={vi ? 'Liên kết ứng viên' : 'Candidate links'}><h2 className="mb-3 text-sm font-semibold">{vi ? 'Ứng viên' : 'Candidates'}</h2><ul className="space-y-2 text-sm"><li><Link className="hover:text-blue-700 dark:hover:text-blue-300" href="/candidate/cvs">{vi ? 'Hồ sơ CV' : 'CV library'}</Link></li><li><Link className="hover:text-blue-700 dark:hover:text-blue-300" href="/candidate/profile">{vi ? 'Hồ sơ cá nhân' : 'Profile'}</Link></li></ul></nav>
      <nav aria-label={vi ? 'Liên kết nhà tuyển dụng' : 'Recruiter links'}><h2 className="mb-3 text-sm font-semibold">{vi ? 'Nhà tuyển dụng' : 'Recruiters'}</h2><ul className="space-y-2 text-sm"><li><Link className="hover:text-blue-700 dark:hover:text-blue-300" href="/recruiter/jobs">{vi ? 'Tin tuyển dụng' : 'Job listings'}</Link></li><li><Link className="hover:text-blue-700 dark:hover:text-blue-300" href="/recruiter/company">{vi ? 'Doanh nghiệp' : 'Company'}</Link></li></ul></nav>
    </div>
    <div className="mx-auto mt-7 max-w-7xl border-t border-slate-200 px-4 pt-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-6 lg:px-8">© {new Date().getFullYear()} midCV</div>
  </footer>;
};
