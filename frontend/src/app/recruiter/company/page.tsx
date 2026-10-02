'use client';

import React, { useState, useEffect } from 'react';
import { Company, Job } from '@/types';
import { fetchRecruiterProfile, saveCompanyProfile, fetchRecruiterJobs } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { CompanyVerificationBanner } from '@/components/recruiter/CompanyVerificationBanner';
import { Building2, Globe, Mail, Phone, Users, ShieldCheck, Save, CheckCircle2, Briefcase, FileText } from 'lucide-react';

export default function CompanyProfilePage() {
  const { t, locale } = useLanguage();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      fetchRecruiterProfile().then((p) => p.company),
      fetchRecruiterJobs()
    ])
      .then(([comp, jobList]) => {
        setCompany(comp);
        setJobs(jobList);
      })
      .catch(console.error);
  }, []);

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 transition-colors flex items-center justify-center p-12">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <p className="text-sm font-medium">{t('common.loading', 'Đang tải thông tin doanh nghiệp...')}</p>
        </div>
      </div>
    );
  }

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await saveCompanyProfile(company);
      setCompany(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update company profile');
    } finally {
      setIsSaving(false);
    }
  };

  const publishedJobsCount = jobs.filter(j => j.status === 'PUBLISHED').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col transition-colors pb-16">
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
        {/* Recruiter Header */}
        <RecruiterPageHeader
          title={t('companyPages.title', 'Hồ Sơ Doanh Nghiệp & Trạng Thái Xác Minh')}
          subtitle={t('companyPages.subtitle', 'Quản lý thông tin thương hiệu công ty và xác thực quyền xuất bản tin')}
          categoryTag="Enterprise Verification"
        />

        {/* Verification Status Banner */}
        <CompanyVerificationBanner
          status={company.verificationStatus}
          companyName={company.name}
          reason={company.verificationReason}
        />

        {/* Success Alert */}
        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{t('companyPages.saveSuccess', 'Thông tin doanh nghiệp đã được cập nhật thành công!')}</span>
          </div>
        )}

        {/* Company Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-mono">Doanh nghiệp</span>
            <span className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">{company.name}</span>
          </div>
          <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-mono">Tin tuyển dụng đang mở</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{publishedJobsCount} / {jobs.length}</span>
          </div>
          <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-mono">Ngành nghề chính</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{company.industry || 'Technology'}</span>
          </div>
        </div>

        {/* Company Edit Form */}
        <form onSubmit={handleSaveCompany} className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('companyPages.nameLabel', 'Thông tin Doanh nghiệp')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('companyPages.nameLabel', 'Tên Doanh nghiệp chính thức')} *
              </label>
              <input
                type="text"
                value={company.name ?? ''}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1329] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('companyPages.industryLabel', 'Lĩnh vực hoạt động (Industry)')}
              </label>
              <input
                type="text"
                value={company.industry ?? ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('companyPages.websiteLabel', 'Website công ty')}
              </label>
              <input
                type="url"
                value={company.website ?? ''}
                onChange={(e) => setCompany({ ...company, website: e.target.value })}
                placeholder="https://company.example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1329] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('companyPages.sizeLabel', 'Quy mô nhân sự')}
              </label>
              <input
                type="text"
                value={company.companySize ?? ''}
                onChange={(e) => setCompany({ ...company, companySize: e.target.value })}
                placeholder="50-200 nhân viên"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1329] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('companyPages.emailLabel', 'Email liên hệ tuyển dụng')}
              </label>
              <input
                type="email"
                value={company.contactEmail ?? ''}
                onChange={(e) => setCompany({ ...company, contactEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1329] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('companyPages.phoneLabel', 'Số điện thoại liên hệ')}
              </label>
              <input
                type="text"
                value={company.contactPhone ?? ''}
                onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1329] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? (locale === 'vi' ? 'Đang lưu...' : 'Saving...') : t('companyPages.saveButton', 'Lưu Thông Tin Doanh Nghiệp')}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
