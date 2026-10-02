'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { fetchRecruiterProfile } from '@/lib/api';
import { RecruiterProfile } from '@/types';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import {
  User,
  Mail,
  Building2,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Calendar,
  Lock
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export default function RecruiterProfilePage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRecruiterProfile()
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] p-12 text-center text-slate-500 flex items-center justify-center">
        <EmptyState
          type="LOADING"
          title={locale === 'vi' ? 'Đang tải hồ sơ nhà tuyển dụng...' : 'Loading recruiter profile...'}
          description={locale === 'vi' ? 'Hệ thống đang đồng bộ thông tin tài khoản...' : 'Synchronizing account credentials...'}
        />
      </div>
    );
  }

  const displayName = profile?.fullName || user?.fullName || user?.email?.split('@')[0] || 'Nhà tuyển dụng';
  const email = profile?.email || user?.email || '';
  const companyName = profile?.company?.name || 'Doanh nghiệp MidCV';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col transition-colors pb-20">
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
        <RecruiterPageHeader
          title={locale === 'vi' ? 'Hồ Sơ Nhà Tuyển Dụng' : 'Recruiter Account Profile'}
          subtitle={locale === 'vi' ? 'Thông tin định danh quản trị viên tuyển dụng và quyền hạn doanh nghiệp' : 'Manage your recruiter credentials, company association, and account security'}
          categoryTag="Enterprise Account"
        />

        {/* User Card */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{displayName}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                RECRUITER
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                VERIFIED EMAIL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{email}</span>
            </p>
          </div>
        </div>

        {/* Account Details & Organization */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {locale === 'vi' ? 'Tổ Chức & Quyền Hạn Doanh Nghiệp' : 'Organization & Permissions'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <span className="text-slate-400 block mb-1 font-semibold">{locale === 'vi' ? 'Doanh nghiệp quản lý:' : 'Associated Company:'}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{companyName}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-semibold">{locale === 'vi' ? 'Trạng thái xác minh doanh nghiệp:' : 'Company Verification:'}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{profile?.company?.verificationStatus || 'VERIFIED'}</span>
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-semibold">{locale === 'vi' ? 'Quyền hạn tài khoản:' : 'Account Privileges:'}</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {locale === 'vi'
                  ? 'Được quyền tạo, chỉnh sửa, xuất bản tin tuyển dụng; xem hồ sơ và thực hiện quyết định tuyển dụng đối với các ứng viên ứng tuyển vào doanh nghiệp.'
                  : 'Authorized to create, publish, and close job postings; evaluate candidates and record hiring decisions.'}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-semibold">{locale === 'vi' ? 'Bảo mật tài khoản:' : 'Security & Session:'}</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-mono">
                JWT Authentication • Active Session • Role-based Access Control
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
