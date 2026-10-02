'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Industry, EmploymentType, Job, Company, RequirementType } from '@/types';
import { fetchRecruiterCompany, saveJob } from '@/lib/api';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowLeft,
  Sparkles,
  Save,
  Send,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit3,
  Building2,
  MapPin,
  DollarSign,
  ShieldCheck,
  Award
} from 'lucide-react';

interface SkillRequirementItem {
  id: string;
  skillName: string;
  requirementType: RequirementType;
  minYearsExperience: number;
}

export default function CreateJobPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [company, setCompany] = useState<Company | null>(null);

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [industry, setIndustry] = useState<Industry>('Technology');
  const [seniority, setSeniority] = useState<string>('Mid-Level');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [location, setLocation] = useState<string>('');
  const [salaryMin, setSalaryMin] = useState<number>(1000);
  const [salaryMax, setSalaryMax] = useState<number>(2500);
  const [isSalaryNegotiable, setIsSalaryNegotiable] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [responsibilities, setResponsibilities] = useState<string>('');

  // Dynamic Rubric Requirements
  const [requirements, setRequirements] = useState<SkillRequirementItem[]>([
    { id: 'req-1', skillName: 'Java', requirementType: 'REQUIRED', minYearsExperience: 2 },
    { id: 'req-2', skillName: 'Spring Boot', requirementType: 'REQUIRED', minYearsExperience: 2 },
    { id: 'req-3', skillName: 'Docker', requirementType: 'PREFERRED', minYearsExperience: 1 }
  ]);
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [newSkillType, setNewSkillType] = useState<RequirementType>('REQUIRED');
  const [newSkillYears, setNewSkillYears] = useState<number>(1);

  // UI State
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRecruiterCompany()
      .then((c) => setCompany(c))
      .catch(() => null);
  }, []);

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const exists = requirements.some(
      (r) => r.skillName.toLowerCase() === newSkillName.trim().toLowerCase()
    );
    if (exists) {
      alert(locale === 'vi' ? 'Kỹ năng này đã có trong danh sách rubric.' : 'Skill already in rubric.');
      return;
    }
    const item: SkillRequirementItem = {
      id: `req-${Date.now()}`,
      skillName: newSkillName.trim(),
      requirementType: newSkillType,
      minYearsExperience: Math.max(0, newSkillYears)
    };
    setRequirements((prev) => [...prev, item]);
    setNewSkillName('');
    setNewSkillYears(1);
  };

  const handleRemoveSkill = (id: string) => {
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (targetStatus: 'DRAFT' | 'PUBLISHED') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setErrorMessage(locale === 'vi' ? 'Vui lòng nhập tiêu đề vị trí tuyển dụng.' : 'Please enter job title.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage(locale === 'vi' ? 'Vui lòng nhập mô tả công việc (JD).' : 'Please enter job description.');
      return;
    }

    if (targetStatus === 'PUBLISHED' && company?.verificationStatus !== 'VERIFIED') {
      setErrorMessage(
        locale === 'vi'
          ? 'Doanh nghiệp chưa được xác minh. Bạn chỉ có thể Lưu Bản Nháp (DRAFT). Vui lòng liên hệ Quản trị viên để xác minh công ty trước khi xuất bản.'
          : 'Company is not verified. You can only save as DRAFT until verified by administrator.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Job = {
        id: `job-temp-${Date.now()}`,
        title: title.trim(),
        companyName: company?.name || 'Doanh nghiệp',
        companyVerified: company?.verificationStatus === 'VERIFIED',
        industry,
        employmentType,
        seniority,
        location: location.trim() || 'Toàn quốc',
        salaryMin: isSalaryNegotiable ? 0 : Number(salaryMin) || 0,
        salaryMax: isSalaryNegotiable ? 0 : Number(salaryMax) || 0,
        publishedDate: new Date().toISOString().split('T')[0],
        description: description.trim(),
        responsibilities: responsibilities
          ? responsibilities.split('\n').map((s) => s.trim()).filter(Boolean)
          : undefined,
        requirements: requirements.map((r) => ({
          id: r.id,
          skillName: r.skillName,
          requirementType: r.requirementType,
          minYearsExperience: r.minYearsExperience,
          minExperienceYears: r.minYearsExperience
        })),
        status: targetStatus
      };

      await saveJob(payload);
      setSuccessMessage(
        targetStatus === 'PUBLISHED'
          ? (locale === 'vi' ? 'Đã xuất bản tin tuyển dụng thành công!' : 'Job published successfully!')
          : (locale === 'vi' ? 'Đã lưu bản nháp tin tuyển dụng thành công!' : 'Job draft saved successfully!')
      );

      setTimeout(() => {
        router.push('/recruiter/jobs');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu tin tuyển dụng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
      {/* Header */}
      <RecruiterPageHeader
        categoryTag="RUBRIC COMPILER"
        title={locale === 'vi' ? 'Tạo Tin Tuyển Dụng & Thiết Lập Rubric' : 'Create Job & Establish Rubric'}
        subtitle={locale === 'vi' ? 'Thiết lập tiêu chuẩn năng lực, kỹ năng bắt buộc và các trọng số đối sánh AI vector' : 'Define requirements rubric, mandatory skills and vector matching baseline'}
        backLink={{ href: '/recruiter/jobs', label: locale === 'vi' ? 'Quay lại Quản lý bài đăng' : 'Back to Job Postings' }}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'bg-white dark:bg-[#111C38] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E293B]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{locale === 'vi' ? 'Soạn thảo' : 'Editor'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'bg-white dark:bg-[#111C38] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E293B]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{locale === 'vi' ? 'Xem trước' : 'Preview'}</span>
            </button>
          </div>
        }
      />

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Verification Warning if not verified */}
      {company && company.verificationStatus !== 'VERIFIED' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            {locale === 'vi'
              ? 'Lưu ý: Doanh nghiệp của bạn đang chờ xác minh. Bạn có thể lưu bản nháp (Draft), sau khi hoàn tất xác minh bạn sẽ xuất bản được tin tuyển dụng.'
              : 'Note: Company is pending verification. You can save as Draft; publication will be enabled once verified.'}
          </span>
        </div>
      )}

      {/* EDIT TAB */}
      {activeTab === 'edit' && (
        <div className="space-y-6">
          {/* Section 1: Basic Job Info */}
          <div className="bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2A52] dark:text-white border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
              1. Thông Tin Tuyển Dụng Cơ Bản
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#1E3A5F] dark:text-slate-300 mb-1">
                  Tiêu đề vị trí tuyển dụng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Senior Java Backend Engineer, Data Scientist..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E3A5F] dark:text-slate-300 mb-1">
                  Lĩnh vực hoạt động (Industry)
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as Industry)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="Technology">Technology (Công nghệ thông tin)</option>
                  <option value="Marketing">Marketing (Tiếp thị & Truyền thông)</option>
                  <option value="Finance">Finance (Tài chính - Ngân hàng)</option>
                  <option value="Design">Design (Thiết kế đồ họa / UI/UX)</option>
                  <option value="HR">HR (Nhân sự)</option>
                  <option value="Sales">Sales (Kinh doanh)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1E3A5F] dark:text-slate-300 mb-1">
                  Cấp bậc / Trình độ (Seniority)
                </label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="Intern">Intern / Thực tập sinh</option>
                  <option value="Junior">Junior (0 - 2 năm)</option>
                  <option value="Mid-Level">Mid-Level (2 - 5 năm)</option>
                  <option value="Senior">Senior (5+ năm)</option>
                  <option value="Lead / Principal">Lead / Tech Lead / Principal</option>
                  <option value="Manager">Engineering Manager / Director</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1E3A5F] dark:text-slate-300 mb-1">
                  Hình thức làm việc
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="FULL_TIME">Toàn thời gian (Full-time)</option>
                  <option value="PART_TIME">Bán thời gian (Part-time)</option>
                  <option value="REMOTE">Làm việc từ xa (Remote)</option>
                  <option value="HYBRID">Linh hoạt (Hybrid)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1E3A5F] dark:text-slate-300 mb-1">
                  Địa điểm làm việc
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cầu Giấy, Hà Nội hoặc Quận 1, TP.HCM"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Salary Section */}
              <div className="sm:col-span-2 space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#1E3A5F] dark:text-slate-300">
                    Mức lương (USD / tháng)
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSalaryNegotiable}
                      onChange={(e) => setIsSalaryNegotiable(e.target.checked)}
                      className="rounded text-[#2563EB]"
                    />
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Mức lương Thỏa thuận</span>
                  </label>
                </div>

                {!isSalaryNegotiable && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block mb-1">Lương tối thiểu ($)</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={salaryMin}
                        onChange={(e) => setSalaryMin(Number(e.target.value))}
                        className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block mb-1">Lương tối đa ($)</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(Number(e.target.value))}
                        className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic Rubric & Requirements Builder */}
          <div className="bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2A52] dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>2. Rubric Kỹ Năng & Tiêu Chuẩn Năng Lực (Vector Baseline)</span>
                </h3>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Kỹ năng Bắt buộc (REQUIRED) sẽ tham gia cơ chế Gating loại trừ; Kỹ năng Ưu tiên (PREFERRED) tính điểm thưởng.
                </p>
              </div>
            </div>

            {/* Existing Requirements Chips */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#1E3A5F] dark:text-slate-300 block">
                Danh sách tiêu chuẩn đã thiết lập ({requirements.length}):
              </span>

              {requirements.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#13233F] text-center text-xs text-[#94A3B8]">
                  Chưa có kỹ năng nào được thêm. Hãy nhập kỹ năng bên dưới để xây dựng rubric.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#13233F] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-xs text-[#0F2A52] dark:text-white truncate">
                          {req.skillName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                              req.requirementType === 'REQUIRED'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/40'
                            }`}
                          >
                            {req.requirementType}
                          </span>
                          <span className="text-[#64748B] dark:text-[#94A3B8]">
                            ≥ {req.minYearsExperience} năm
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(req.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                        title="Xóa kỹ năng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Skill Form */}
            <div className="p-3.5 rounded-xl bg-[#EFF6FF] dark:bg-[#0B1528] border border-[#DBEAFE] dark:border-[#1E3A5F] space-y-2">
              <span className="text-[11px] font-bold text-[#2563EB] dark:text-[#3B82F6] block">
                + Thêm tiêu chuẩn kỹ năng vào Rubric:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Tên kỹ năng (ví dụ: Python, PostgreSQL, Kafka...)"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-lg text-[#0F2A52] dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <select
                    value={newSkillType}
                    onChange={(e) => setNewSkillType(e.target.value as RequirementType)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-lg text-[#0F2A52] dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="REQUIRED">Bắt buộc (REQUIRED)</option>
                    <option value="PREFERRED">Ưu tiên (PREFERRED)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    placeholder="Năm KN"
                    value={newSkillYears}
                    onChange={(e) => setNewSkillYears(Number(e.target.value))}
                    className="w-20 px-2.5 py-2 bg-white dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-lg text-[#0F2A52] dark:text-white text-xs font-mono"
                    title="Số năm kinh nghiệm tối thiểu"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Job Description & Responsibilities */}
          <div className="bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2A52] dark:text-white border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
              3. Mô Tả Công Việc (JD Description)
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1E3A5F] dark:text-slate-300 mb-1">
                  Mô tả tổng quát công việc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Mô tả bối cảnh dự án, sứ mệnh của vai trò, văn hóa đội ngũ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3.5 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white focus:outline-none focus:border-[#2563EB] leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E3A5F] dark:text-slate-300 mb-1">
                  Trách nhiệm chính (Mỗi dòng một gạch đầu dòng)
                </label>
                <textarea
                  rows={3}
                  placeholder="- Thiết kế và phát triển RESTful APIs&#10;- Tối ưu hóa hiệu năng cơ sở dữ liệu&#10;- Review code và hướng dẫn các thành viên junior"
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  className="w-full p-3.5 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white focus:outline-none focus:border-[#2563EB] leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
            <Link
              href="/recruiter/jobs"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111C38] text-center transition"
            >
              Hủy bỏ
            </Link>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#F8FAFC] dark:bg-[#13233F] text-[#1E3A5F] dark:text-slate-200 border border-[#CBD5E1] dark:border-[#1E3A5F] hover:bg-[#F1F5F9] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Bản Nháp (Draft)'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('PUBLISHED')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang xuất bản...' : 'Xuất Bản Tin (Publish)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW TAB */}
      {activeTab === 'preview' && (
        <div className="bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] pb-6 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] border border-[#2563EB]/20">
                {industry}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#E8F8EE] dark:bg-[#00B14F]/15 text-[#00B14F] border border-[#00B14F]/20">
                {seniority}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                {employmentType}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-[#0F2A52] dark:text-white">
              {title || 'Tiêu đề vị trí tuyển dụng'}
            </h1>

            <div className="flex items-center gap-4 text-xs text-[#64748B] dark:text-[#94A3B8] flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{company?.name || 'Doanh nghiệp'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{location || 'Toàn quốc'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-[#00B14F] font-semibold">
                <DollarSign className="w-3.5 h-3.5" />
                <span>
                  {isSalaryNegotiable
                    ? 'Thỏa thuận'
                    : `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}/tháng`}
                </span>
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 text-xs leading-relaxed text-[#1E3A5F] dark:text-slate-300">
            <h4 className="font-bold text-sm text-[#0F2A52] dark:text-white">
              Mô tả công việc:
            </h4>
            <p className="whitespace-pre-wrap">{description || 'Chưa nhập mô tả công việc.'}</p>
          </div>

          {/* Responsibilities */}
          {responsibilities && (
            <div className="space-y-2 text-xs leading-relaxed text-[#1E3A5F] dark:text-slate-300 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <h4 className="font-bold text-sm text-[#0F2A52] dark:text-white">
                Trách nhiệm chính:
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                {responsibilities
                  .split('\n')
                  .filter(Boolean)
                  .map((item, idx) => (
                    <li key={idx}>{item.replace(/^[-*•]\s*/, '')}</li>
                  ))}
              </ul>
            </div>
          )}

          {/* Rubric Breakdown */}
          <div className="space-y-3 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            <h4 className="font-bold text-sm text-[#0F2A52] dark:text-white">
              Rubric kỹ năng đối sánh AI ({requirements.length}):
            </h4>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 block mb-1.5 uppercase">
                  Required Skills (Gating bắt buộc):
                </span>
                <div className="flex flex-wrap gap-2">
                  {requirements
                    .filter((r) => r.requirementType === 'REQUIRED')
                    .map((r) => (
                      <span
                        key={r.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300"
                      >
                        {r.skillName} (≥ {r.minYearsExperience} năm)
                      </span>
                    ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 block mb-1.5 uppercase pt-2">
                  Preferred Skills (Kỹ năng ưu tiên):
                </span>
                <div className="flex flex-wrap gap-2">
                  {requirements
                    .filter((r) => r.requirementType === 'PREFERRED')
                    .map((r) => (
                      <span
                        key={r.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300"
                      >
                        {r.skillName} (≥ {r.minYearsExperience} năm)
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
