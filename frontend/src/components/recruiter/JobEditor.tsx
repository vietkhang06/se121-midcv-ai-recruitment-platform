'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Industry, EmploymentType, Job, Company, RequirementType } from '@/types';
import { fetchRecruiterCompany, fetchRecruiterJobById, saveJob } from '@/lib/api';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { SkillCatalogPicker } from '@/components/skills/SkillCatalogPicker';
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

export function JobEditor({ jobId }: { jobId?: string }) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [company, setCompany] = useState<Company | null>(null);
  const [loadingJob, setLoadingJob] = useState(Boolean(jobId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<Job['status']>('DRAFT');

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [industry, setIndustry] = useState<Industry>('Technology');
  const [industryOther, setIndustryOther] = useState('');
  const [seniority, setSeniority] = useState<string>('Mid-Level');
  const [seniorityOther, setSeniorityOther] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [employmentTypeOther, setEmploymentTypeOther] = useState('');
  const [location, setLocation] = useState<string>('');
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');
  const [salaryCurrency, setSalaryCurrency] = useState<NonNullable<Job['salaryCurrency']>>('VND');
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

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    setLoadingJob(true);
    void fetchRecruiterJobById(jobId).then((job) => {
      if (!active) return;
      const amount = (value: number | null | undefined) => value == null ? '' : new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 2 }).format(value);
      setTitle(job.title); setIndustry(job.industryOther ? 'OTHER' : job.industry); setIndustryOther(job.industryOther || '');
      setSeniority(job.seniorityOther ? 'OTHER' : job.seniority); setSeniorityOther(job.seniorityOther || '');
      setEmploymentType(job.employmentTypeOther ? 'OTHER' : job.employmentType); setEmploymentTypeOther(job.employmentTypeOther || '');
      setLocation(job.location); setSalaryCurrency(job.salaryCurrency || 'VND');
      setSalaryMin(amount(job.salaryMin)); setSalaryMax(amount(job.salaryMax));
      setIsSalaryNegotiable(job.salaryNegotiable === true); setDescription(job.description || '');
      setResponsibilities((job.responsibilities || []).join('\n')); setOriginalStatus(job.status);
      setRequirements((job.requirements || []).map((req) => ({ id: req.id, skillName: req.skillName,
        requirementType: req.requirementType, minYearsExperience: req.minYearsExperience ?? req.minExperienceYears ?? 0 })));
    }).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : 'Không thể tải tin tuyển dụng.'); })
      .finally(() => { if (active) setLoadingJob(false); });
    return () => { active = false; };
  }, [jobId]);

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
    const customValues = [[industry, industryOther], [seniority, seniorityOther], [employmentType, employmentTypeOther]] as const;
    if (customValues.some(([choice, value]) => choice === 'OTHER' ? !value.trim() || value.trim().length > 80 : !!value.trim())) {
      setErrorMessage(locale === 'vi' ? 'Với lựa chọn Khác, hãy nhập nội dung từ 1 đến 80 ký tự; trường tùy chỉnh khác phải để trống.' : 'For Other, enter 1–80 characters and leave inactive custom fields blank.');
      return;
    }

    const parseAmount = (raw: string) => {
      const cleaned = raw.trim().replace(/\s/g, '');
      if (!cleaned) return null;
      const decimalDigits = ['JPY', 'KRW', 'VND'].includes(salaryCurrency) ? 0 : 2;
      const normalized = locale === 'vi' ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
      const amountPattern = decimalDigits === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${decimalDigits}})?$`);
      if (!amountPattern.test(normalized)) return null;
      const amount = Number(normalized);
      return Number.isFinite(amount) && amount >= 0 ? amount : null;
    };
    const salaryMinValue = salaryMin.trim() ? parseAmount(salaryMin) : null;
    const salaryMaxValue = salaryMax.trim() ? parseAmount(salaryMax) : null;
    if (!isSalaryNegotiable && ((salaryMin.trim() && salaryMinValue === null) || (salaryMax.trim() && salaryMaxValue === null))) {
      setErrorMessage(locale === 'vi' ? `Mức lương ${salaryCurrency} không hợp lệ. Kiểm tra dấu phân cách và số chữ số thập phân.` : `Invalid ${salaryCurrency} amount. Check separators and decimal places.`);
      return;
    }
    if (!isSalaryNegotiable && salaryMinValue !== null && salaryMaxValue !== null && salaryMinValue > salaryMaxValue) {
      setErrorMessage(locale === 'vi' ? 'Lương tối thiểu không được cao hơn lương tối đa.' : 'Minimum salary cannot exceed maximum salary.');
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
        id: jobId || `job-temp-${Date.now()}`,
        title: title.trim(),
        companyName: company?.name || 'Doanh nghiệp',
        companyVerified: company?.verificationStatus === 'VERIFIED',
        industry,
        industryOther: industry === 'OTHER' ? industryOther.trim() : undefined,
        employmentType,
        employmentTypeOther: employmentType === 'OTHER' ? employmentTypeOther.trim() : undefined,
        seniority,
        seniorityOther: seniority === 'OTHER' ? seniorityOther.trim() : undefined,
        location: location.trim() || 'Toàn quốc',
        salaryMin: isSalaryNegotiable ? null : salaryMinValue,
        salaryMax: isSalaryNegotiable ? null : salaryMaxValue,
        salaryNegotiable: isSalaryNegotiable,
        salaryCurrency,
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
          : (locale === 'vi' ? (jobId ? 'Đã lưu thay đổi tin tuyển dụng.' : 'Đã lưu bản nháp tin tuyển dụng thành công!') : 'Job saved successfully!')
      );

      setTimeout(() => {
        router.push('/recruiter/jobs');
      }, 1200);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Lỗi khi lưu tin tuyển dụng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingJob) return <p role="status" className="p-8">Đang tải tin tuyển dụng…</p>;
  if (loadError) return <div role="alert" className="p-8"><p>{loadError}</p><Link href="/recruiter/jobs">Quay lại danh sách</Link></div>;

  return (
    <div className="w-full max-w-5xl min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <RecruiterPageHeader
        categoryTag="RUBRIC COMPILER"
        title={jobId ? (locale === 'vi' ? 'Chỉnh sửa tin tuyển dụng' : 'Edit job') : (locale === 'vi' ? 'Tạo Tin Tuyển Dụng & Thiết Lập Rubric' : 'Create Job & Establish Rubric')}
        subtitle={locale === 'vi' ? 'Thiết lập tiêu chuẩn năng lực, kỹ năng bắt buộc và các trọng số đối sánh AI vector' : 'Define requirements rubric, mandatory skills and vector matching baseline'}
        backLink={{ href: '/recruiter/jobs', label: locale === 'vi' ? 'Quay lại Quản lý bài đăng' : 'Back to Job Postings' }}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'bg-[var(--primary)] text-white shadow-2xs'
                  : 'bg-white dark:bg-[var(--surface)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border border-[var(--border-soft)] dark:border-[var(--border)]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{locale === 'vi' ? 'Soạn thảo' : 'Editor'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-[var(--primary)] text-white shadow-2xs'
                  : 'bg-white dark:bg-[var(--surface)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border border-[var(--border-soft)] dark:border-[var(--border)]'
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
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
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
          <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--heading)] dark:text-white border-b border-[var(--border-soft)] dark:border-[var(--border)] pb-3">
              1. Thông Tin Tuyển Dụng Cơ Bản
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-[var(--heading)] dark:text-slate-300 mb-1">
                  Tiêu đề vị trí tuyển dụng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Senior Java Backend Engineer, Data Scientist..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl text-[var(--heading)] dark:text-white focus:outline-none focus:border-[var(--border)]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--heading)] dark:text-slate-300 mb-1">
                  Lĩnh vực hoạt động (Industry)
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as Industry)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl text-[var(--heading)] dark:text-white focus:outline-none focus:border-[var(--border)]"
                >
                  <option value="Technology">Technology (Công nghệ thông tin)</option>
                  <option value="Marketing">Marketing (Tiếp thị & Truyền thông)</option>
                  <option value="Finance">Finance (Tài chính - Ngân hàng)</option>
                  <option value="Design">Design (Thiết kế đồ họa / UI/UX)</option>
                  <option value="HR">HR (Nhân sự)</option>
                  <option value="Sales">Sales (Kinh doanh)</option>
                  <option value="OTHER">{locale === 'vi' ? 'Khác' : 'Other'}</option>
                </select>
                {industry === 'OTHER' && <input aria-label={locale === 'vi' ? 'Lĩnh vực khác' : 'Other industry'} maxLength={80} required value={industryOther} onChange={(e) => setIndustryOther(e.target.value)} placeholder={locale === 'vi' ? 'Nhập lĩnh vực (tối đa 80 ký tự)' : 'Enter industry (up to 80 characters)'} className="mt-2 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-2.5 text-sm dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-white" />}
              </div>

              <div>
                <label className="block font-semibold text-[var(--heading)] dark:text-slate-300 mb-1">
                  Cấp bậc / Trình độ (Seniority)
                </label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl text-[var(--heading)] dark:text-white focus:outline-none focus:border-[var(--border)]"
                >
                  <option value="Intern">Intern / Thực tập sinh</option>
                  <option value="Junior">Junior (0 - 2 năm)</option>
                  <option value="Mid-Level">Mid-Level (2 - 5 năm)</option>
                  <option value="Senior">Senior (5+ năm)</option>
                  <option value="Lead / Principal">Lead / Tech Lead / Principal</option>
                  <option value="Manager">Engineering Manager / Director</option>
                  <option value="OTHER">{locale === 'vi' ? 'Khác' : 'Other'}</option>
                </select>
                {seniority === 'OTHER' && <input aria-label={locale === 'vi' ? 'Cấp bậc khác' : 'Other seniority'} maxLength={80} required value={seniorityOther} onChange={(e) => setSeniorityOther(e.target.value)} placeholder={locale === 'vi' ? 'Nhập cấp bậc' : 'Enter seniority'} className="mt-2 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-2.5 text-sm dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-white" />}
              </div>

              <div>
                <label className="block font-semibold text-[var(--heading)] dark:text-slate-300 mb-1">
                  Hình thức làm việc
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl text-[var(--heading)] dark:text-white focus:outline-none focus:border-[var(--border)]"
                >
                  <option value="FULL_TIME">Toàn thời gian (Full-time)</option>
                  <option value="PART_TIME">Bán thời gian (Part-time)</option>
                  <option value="REMOTE">Làm việc từ xa (Remote)</option>
                  <option value="HYBRID">Linh hoạt (Hybrid)</option>
                  <option value="OTHER">{locale === 'vi' ? 'Khác' : 'Other'}</option>
                </select>
                {employmentType === 'OTHER' && <input aria-label={locale === 'vi' ? 'Hình thức làm việc khác' : 'Other employment type'} maxLength={80} required value={employmentTypeOther} onChange={(e) => setEmploymentTypeOther(e.target.value)} placeholder={locale === 'vi' ? 'Nhập hình thức làm việc' : 'Enter employment type'} className="mt-2 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-2.5 text-sm dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-white" />}
              </div>

              <div>
                <label className="block font-semibold text-[var(--heading)] dark:text-slate-300 mb-1">
                  Địa điểm làm việc
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cầu Giấy, Hà Nội hoặc Quận 1, TP.HCM"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl text-[var(--heading)] dark:text-white focus:outline-none focus:border-[var(--border)]"
                />
              </div>

              {/* Salary Section */}
              <div className="sm:col-span-2 space-y-2 pt-2 border-t border-[var(--border-soft)] dark:border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[var(--heading)] dark:text-slate-300">
                    {locale === 'vi' ? 'Mức lương (VND / tháng)' : 'Salary (VND / month)'}
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSalaryNegotiable}
                      onChange={(e) => setIsSalaryNegotiable(e.target.checked)}
                      className="rounded text-[var(--primary)]"
                    />
                    <span className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Mức lương Thỏa thuận</span>
                  </label>
                </div>

                {!isSalaryNegotiable && <label className="block max-w-sm text-xs font-medium text-[var(--heading)] dark:text-slate-300">
                  {locale === 'vi' ? 'Đơn vị tiền tệ (giữ nguyên khi đổi ngôn ngữ)' : 'Currency (unchanged when language changes)'}
                  <select value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value as NonNullable<Job['salaryCurrency']>)} className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-white">
                    {[
                      ['VND', 'Đồng Việt Nam'], ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'], ['JPY', 'Japanese Yen'], ['CNY', 'Chinese Yuan'], ['KRW', 'South Korean Won'], ['SGD', 'Singapore Dollar'], ['AUD', 'Australian Dollar'], ['CAD', 'Canadian Dollar'],
                    ].map(([code, name]) => <option key={code} value={code}>{code} — {locale === 'vi' ? name : ({ VND: 'Vietnamese Dong', USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen', CNY: 'Chinese Yuan', KRW: 'South Korean Won', SGD: 'Singapore Dollar', AUD: 'Australian Dollar', CAD: 'Canadian Dollar' } as Record<string, string>)[code]}</option>)}
                  </select>
                </label>}

                {!isSalaryNegotiable && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] block mb-1">{locale === 'vi' ? `Lương tối thiểu (${salaryCurrency})` : `Minimum salary (${salaryCurrency})`}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={locale === 'vi' ? `Lương tối thiểu, ${salaryCurrency} mỗi tháng` : `Minimum salary, ${salaryCurrency} per month`}
                        value={salaryMin}
                        onChange={(e) => setSalaryMin(e.target.value)}
                        placeholder={locale === 'vi' ? 'Ví dụ: 15.000.000' : 'Example: 15,000,000'}
                        className="w-full px-3.5 py-2 bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl text-[var(--heading)] dark:text-white font-sans"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] block mb-1">{locale === 'vi' ? `Lương tối đa (${salaryCurrency})` : `Maximum salary (${salaryCurrency})`}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={locale === 'vi' ? `Lương tối đa, ${salaryCurrency} mỗi tháng` : `Maximum salary, ${salaryCurrency} per month`}
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(e.target.value)}
                        placeholder={locale === 'vi' ? 'Ví dụ: 30.000.000' : 'Example: 30,000,000'}
                        className="w-full px-3.5 py-2 bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl text-[var(--heading)] dark:text-white font-sans"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic Rubric & Requirements Builder */}
          <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-soft)] dark:border-[var(--border)] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--heading)] dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-[var(--primary)] dark:text-[var(--retro-sky)]" />
                  <span>2. Rubric Kỹ Năng & Tiêu Chuẩn Năng Lực (Vector Baseline)</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  Kỹ năng Bắt buộc (REQUIRED) sẽ tham gia cơ chế Gating loại trừ; Kỹ năng Ưu tiên (PREFERRED) tính điểm thưởng.
                </p>
              </div>
            </div>

            {/* Existing Requirements Chips */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[var(--heading)] dark:text-slate-300 block">
                Danh sách tiêu chuẩn đã thiết lập ({requirements.length}):
              </span>

              {requirements.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[var(--surface)] text-center text-xs text-[var(--text-secondary)]">
                  Chưa có kỹ năng nào được thêm. Hãy nhập kỹ năng bên dưới để xây dựng rubric.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-xs text-[var(--heading)] dark:text-white truncate">
                          {req.skillName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span
                            className={`px-1.5 py-0.2 rounded font-sans font-bold uppercase ${
                              req.requirementType === 'REQUIRED'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/40'
                            }`}
                          >
                            {req.requirementType}
                          </span>
                          <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                            ≥ {req.minYearsExperience} năm
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(req.id)}
                        className="p-1 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                        title="Xóa kỹ năng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Skill Form using Canonical Catalog Autocomplete & Favorites */}
            <div className="p-4 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--primary)] dark:text-[var(--retro-sky)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Thêm tiêu chuẩn kỹ năng vào Rubric (Taxonomy Autocomplete & Quick-Pick Yêu thích):</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                  Phân tách REQUIRED vs PREFERRED
                </span>
              </div>

              <SkillCatalogPicker
                allowRequirementType={true}
                allowExperienceYears={true}
                selectedSkills={requirements.map((r) => r.skillName)}
                onSelectCriteria={(criteria) => {
                  const exists = requirements.some(
                    (r) => r.skillName.toLowerCase() === criteria.skillName.trim().toLowerCase()
                  );
                  if (exists) {
                    alert(locale === 'vi' ? 'Kỹ năng này đã có trong danh sách rubric.' : 'Skill already in rubric.');
                    return;
                  }
                  setRequirements([
                    ...requirements,
                    {
                      id: criteria.id || `req-${Date.now()}`,
                      skillName: criteria.skillName,
                      requirementType: criteria.requirementType || 'REQUIRED',
                      minYearsExperience: criteria.minYearsExperience ?? 1
                    }
                  ]);
                }}
              />
            </div>
          </div>

          {/* Section 3: Job Description & Responsibilities */}
          <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--heading)] dark:text-white border-b border-[var(--border-soft)] dark:border-[var(--border)] pb-3">
              3. Mô Tả Công Việc (JD Description)
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--heading)] dark:text-slate-300 mb-1">
                  Mô tả tổng quát công việc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Mô tả bối cảnh dự án, sứ mệnh của vai trò, văn hóa đội ngũ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3.5 bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl text-[var(--heading)] dark:text-white focus:outline-none focus:border-[var(--border)] leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--heading)] dark:text-slate-300 mb-1">
                  Trách nhiệm chính (Mỗi dòng một gạch đầu dòng)
                </label>
                <textarea
                  rows={3}
                  placeholder="- Thiết kế và phát triển RESTful APIs&#10;- Tối ưu hóa hiệu năng cơ sở dữ liệu&#10;- Review code và hướng dẫn các thành viên junior"
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  className="w-full p-3.5 bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl text-[var(--heading)] dark:text-white focus:outline-none focus:border-[var(--border)] leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
            <Link
              href="/recruiter/jobs"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--heading)] dark:hover:text-white border border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] text-center transition"
            >
              Hủy bỏ
            </Link>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--surface)] dark:bg-[var(--surface)] text-[var(--heading)] dark:text-slate-200 border border-[var(--border-soft)] dark:border-[var(--border)] hover:bg-[var(--surface-secondary)] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : jobId ? 'Lưu thay đổi' : 'Lưu Bản Nháp (Draft)'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || company?.verificationStatus !== 'VERIFIED' || (Boolean(jobId) && originalStatus !== 'DRAFT' && originalStatus !== 'CLOSED')}
              onClick={() => handleSubmit('PUBLISHED')}
              title={
                company?.verificationStatus !== 'VERIFIED'
                  ? 'Chỉ doanh nghiệp Đã Xác Minh (VERIFIED) mới được quyền xuất bản tin'
                  : undefined
              }
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Đang xuất bản...'
                  : company?.verificationStatus !== 'VERIFIED'
                  ? 'Xuất Bản (Chờ xác minh)'
                  : 'Xuất Bản Tin (Publish)'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW TAB */}
      {activeTab === 'preview' && (
        <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[var(--border-soft)] dark:border-[var(--border)] pb-6 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-sans font-bold bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] border border-[var(--border)]/20">
                {industry}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-sans font-bold bg-[var(--surface-secondary)] dark:bg-[var(--success)]/15 text-[var(--success)] border border-[var(--border)]/20">
                {seniority}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-sans text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                {employmentType}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-[var(--heading)] dark:text-white">
              {title || 'Tiêu đề vị trí tuyển dụng'}
            </h1>

            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex-wrap">
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
              <span className="flex items-center gap-1 font-sans text-[var(--success)] font-semibold">
                <DollarSign className="w-3.5 h-3.5" />
                <span>
                  {isSalaryNegotiable
                    ? 'Thỏa thuận'
                    : (salaryMin || salaryMax ? `${salaryMin || (locale === 'vi' ? 'Không công bố' : 'Undisclosed')} – ${salaryMax || (locale === 'vi' ? 'Không công bố' : 'Undisclosed')} ${salaryCurrency}/${locale === 'vi' ? 'tháng' : 'month'}` : (locale === 'vi' ? 'Chưa công bố' : 'Undisclosed'))}
                </span>
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 text-xs leading-relaxed text-[var(--heading)] dark:text-slate-300">
            <h4 className="font-bold text-sm text-[var(--heading)] dark:text-white">
              Mô tả công việc:
            </h4>
            <p className="whitespace-pre-wrap">{description || 'Chưa nhập mô tả công việc.'}</p>
          </div>

          {/* Responsibilities */}
          {responsibilities && (
            <div className="space-y-2 text-xs leading-relaxed text-[var(--heading)] dark:text-slate-300 pt-3 border-t border-[var(--border-soft)] dark:border-[var(--border)]">
              <h4 className="font-bold text-sm text-[var(--heading)] dark:text-white">
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
          <div className="space-y-3 pt-3 border-t border-[var(--border-soft)] dark:border-[var(--border)]">
            <h4 className="font-bold text-sm text-[var(--heading)] dark:text-white">
              Rubric kỹ năng đối sánh AI ({requirements.length}):
            </h4>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] font-sans font-bold text-amber-700 dark:text-amber-300 block mb-1.5 uppercase">
                  Required Skills (Gating bắt buộc):
                </span>
                <div className="flex flex-wrap gap-2">
                  {requirements
                    .filter((r) => r.requirementType === 'REQUIRED')
                    .map((r) => (
                      <span
                        key={r.id}
                        className="px-2.5 py-1 rounded-xl text-xs font-sans font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300"
                      >
                        {r.skillName} (≥ {r.minYearsExperience} năm)
                      </span>
                    ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-sans font-bold text-blue-700 dark:text-blue-300 block mb-1.5 uppercase pt-2">
                  Preferred Skills (Kỹ năng ưu tiên):
                </span>
                <div className="flex flex-wrap gap-2">
                  {requirements
                    .filter((r) => r.requirementType === 'PREFERRED')
                    .map((r) => (
                      <span
                        key={r.id}
                        className="px-2.5 py-1 rounded-xl text-xs font-sans font-medium bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300"
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
