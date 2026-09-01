'use client';

import React, { useState, useEffect } from 'react';
import { Company } from '@/types';
import { fetchRecruiterProfile } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { CompanyVerificationBanner } from '@/components/recruiter/CompanyVerificationBanner';
import { Building2, Globe, Mail, Phone, Users, ShieldCheck, Save, CheckCircle2 } from 'lucide-react';

export default function CompanyProfilePage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetchRecruiterProfile().then(p => setCompany(p.company));
  }, []);

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <RecruiterNavbar />
        <div className="p-10 text-center text-slate-400">Đang tải thông tin doanh nghiệp...</div>
      </div>
    );
  }

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <RecruiterNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Company Profile & Verification</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Hồ Sơ Doanh Nghiệp & Trạng Thái Xác Minh</h1>
          <p className="text-sm text-slate-400">Quản lý thông tin công ty và kiểm tra quyền hạn xuất bản tin tuyển dụng</p>
        </div>

        {/* Verification Status Banner */}
        <CompanyVerificationBanner
          status={company.verificationStatus}
          companyName={company.name}
          reason={company.verificationReason}
        />

        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Thông tin doanh nghiệp đã được cập nhật thành công!</span>
          </div>
        )}

        <form onSubmit={handleSaveCompany} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Thông tin Doanh nghiệp</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tên Doanh nghiệp chính thức</label>
              <input
                type="text"
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Lĩnh vực hoạt động (Industry)</label>
              <input
                type="text"
                value={company.industry}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Website công ty</label>
              <input
                type="url"
                value={company.website}
                onChange={(e) => setCompany({ ...company, website: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Quy mô nhân sự</label>
              <input
                type="text"
                value={company.companySize}
                onChange={(e) => setCompany({ ...company, companySize: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email liên hệ tuyển dụng</label>
              <input
                type="email"
                value={company.contactEmail}
                onChange={(e) => setCompany({ ...company, contactEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại liên hệ</label>
              <input
                type="text"
                value={company.contactPhone || ''}
                onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thông Tin Doanh Nghiệp</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
