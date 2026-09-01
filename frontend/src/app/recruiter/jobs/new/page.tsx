'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Industry, EmploymentType, Job, Company } from '@/types';
import { MOCK_COMPANY, fetchRecruiterProfile } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { CompanyVerificationBanner } from '@/components/recruiter/CompanyVerificationBanner';
import { ArrowLeft, Save, Send, Sparkles, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function CreateJobPage() {
  const [company, setCompany] = useState<Company>(MOCK_COMPANY);
  
  const [title, setTitle] = useState<string>('Senior Java & AI Engineer');
  const [industry, setIndustry] = useState<Industry>('Technology');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [seniority, setSeniority] = useState<string>('Senior');
  const [location, setLocation] = useState<string>('Hồ Chí Minh');
  const [salaryMin, setSalaryMin] = useState<number>(2000);
  const [salaryMax, setSalaryMax] = useState<number>(3500);
  const [description, setDescription] = useState<string>('Tuyển dụng Kỹ sư Lập trình Java Senior thiết kế hệ thống backend quy mô lớn.');
  
  const [requiredSkills, setRequiredSkills] = useState<string>('Java, Spring Boot, PostgreSQL, Docker');
  const [preferredSkills, setPreferredSkills] = useState<string>('Redis, TypeScript, Pgvector');
  const [responsibilities, setResponsibilities] = useState<string>('Phát triển các mô đun Spring Boot Microservices.\nTối ưu hóa truy vấn PostgreSQL.');
  const [applicationQuestions, setApplicationQuestions] = useState<string>('Số năm kinh nghiệm làm việc thực tế với Java?');

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [lastSavedStatus, setLastSavedStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [publishBlockedMessage, setPublishBlockedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRecruiterProfile().then(p => setCompany(p.company));
  }, []);

  const handleSaveJob = (statusToSave: 'DRAFT' | 'PUBLISHED') => {
    if (statusToSave === 'PUBLISHED' && company?.verificationStatus !== 'VERIFIED') {
      setPublishBlockedMessage('Doanh nghiệp chưa hoàn tất xác minh! Thao tác PUBLISH (Xuất bản) bị từ chối.');
      return;
    }

    setPublishBlockedMessage(null);
    setLastSavedStatus(statusToSave);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const isPublishAllowed = company?.verificationStatus === 'VERIFIED';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <RecruiterNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Page Header */}
        <div className="space-y-1">
          <Link href="/recruiter/jobs" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Quản lý bài đăng</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Tạo Bài Tuyển Dụng Mới (Job Description Engine)</h1>
          <p className="text-sm text-slate-400">Thiết lập thông tin vị trí, kỹ năng bắt buộc/ưu tiên và câu hỏi tuyển dụng</p>
        </div>

        {/* Company Verification Banner */}
        {company && (
          <CompanyVerificationBanner
            status={company.verificationStatus}
            companyName={company.name}
            reason={company.verificationReason}
          />
        )}

        {publishBlockedMessage && (
          <div id="publish-blocked-banner" className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>{publishBlockedMessage}</span>
          </div>
        )}

        {savedSuccess && (
          <div id="save-success-banner" className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Đã lưu thành công bài tuyển dụng với trạng thái <strong>{lastSavedStatus}</strong>!</span>
          </div>
        )}

        {/* Form Body */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">1. Thông tin Chung Vị trí Tuyển dụng</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Tiêu đề bài đăng</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ngành nghề (Industry)</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Technology">Technology</option>
                <option value="Marketing">Marketing</option>
                <option value="Design">Design</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Hình thức làm việc</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="FULL_TIME">Toàn thời gian (Full-time)</option>
                <option value="PART_TIME">Bán thời gian (Part-time)</option>
                <option value="REMOTE">Remote 100%</option>
                <option value="HYBRID">Hybrid Linh hoạt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Cấp bậc (Seniority)</label>
              <input
                type="text"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Địa điểm làm việc</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mức lương tối thiểu ($/tháng)</label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mức lương tối đa ($/tháng)</label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Description & Responsibilities */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-base font-bold text-white">2. Mô tả & Trách nhiệm Công việc</h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mô tả công việc chung (JD Description)</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Trách nhiệm chính (Mỗi dòng 1 ý)</label>
              <textarea
                rows={3}
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Skill Requirements: Required vs Preferred */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-base font-bold text-white">3. Phân tách Kỹ năng Bắt buộc vs Ưu tiên</h3>

            <div>
              <label className="block text-xs font-semibold text-cyan-400 mb-1">
                Kỹ năng Bắt buộc (Required Skills - Phân cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-white text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Kỹ năng Ưu tiên (Preferred Skills - Point Bonus Only)
              </label>
              <input
                type="text"
                value={preferredSkills}
                onChange={(e) => setPreferredSkills(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Application Questions */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-base font-bold text-white">4. Câu hỏi Tuyển dụng (Application Questions)</h3>
            <textarea
              rows={2}
              value={applicationQuestions}
              onChange={(e) => setApplicationQuestions(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action Bar with Verification Protection Check */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              id="save-draft-btn"
              type="button"
              onClick={() => handleSaveJob('DRAFT')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Bài Đăng Dạng DRAFT (Nháp)</span>
            </button>

            <button
              id="publish-job-btn"
              type="button"
              onClick={() => handleSaveJob('PUBLISHED')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer transition"
            >
              <Send className="w-4 h-4" />
              <span>Xuất Bản Tin (PUBLISH)</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
