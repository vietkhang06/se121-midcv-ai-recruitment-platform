'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Industry, EmploymentType, Job, Company, RequirementType } from '@/types';
import { fetchRecruiterCompany, fetchRecruiterJobById, publishJob, saveJob } from '@/lib/api';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { richTextPlain, RichTextDisplay } from '@/components/editor/RichText';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { recruitmentDate, isJobExpired, formatJobDeadline } from '@/lib/jobDeadline';
import { formatSalary } from '@/lib/i18n';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { SkillCatalogPicker } from '@/components/skills/SkillCatalogPicker';
import { useLanguage } from '@/context/LanguageContext';
import {
  Sparkles,
  Save,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit3,
  Building2,
  MapPin,
  DollarSign
} from 'lucide-react';

interface SkillRequirementItem {
  id: string;
  skillName: string;
  requirementType: RequirementType;
  minYearsExperience: number;
}

const controlClass = 'w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm';

function plainAsRichText(text: string): string {
  const element = document.createElement('div');
  element.textContent = text;
  return element.innerHTML.replace(/\r?\n/g, '<br>');
}

function readSalary(text: string, currency: string): number | null {
  const whole = ['VND', 'JPY', 'KRW'].includes(currency);
  const pattern = whole ? /^\d{1,10}$/ : /^\d{1,10}(?:[.,]\d{1,2})?$/;
  return pattern.test(text) ? Number(text.replace(',', '.')) : null;
}

export function JobEditor({ jobId }: { jobId?: string }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const isVi = locale === 'vi';
  const submissionInProgress = useRef(false);
  const savedDraftId = useRef<string | undefined>(jobId);
  const [confirmation, setConfirmation] = useState<'publish' | 'update' | 'discard' | null>(null);
  const [originalDeadline, setOriginalDeadline] = useState('');
  const [deadline, setDeadline] = useState('');
  const [vacancies, setVacancies] = useState(jobId ? '' : '1');
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [responsibilitiesHtml, setResponsibilitiesHtml] = useState('');
  const [salaryMode, setSalaryMode] = useState<'UNDISCLOSED' | 'NEGOTIABLE' | 'FIXED' | 'LEGACY'>('UNDISCLOSED');
  const [company, setCompany] = useState<Company | null>(null);
  const [loadedJobId, setLoadedJobId] = useState<string | null>(null);
  const loadingJob = Boolean(jobId && loadedJobId !== jobId);
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
  const isSalaryNegotiable = salaryMode === 'NEGOTIABLE';
  const [description, setDescription] = useState<string>('');
  const [responsibilities, setResponsibilities] = useState<string>('');

  // Dynamic Rubric Requirements
  const [requirements, setRequirements] = useState<SkillRequirementItem[]>([]);

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
    void fetchRecruiterJobById(jobId).then((job) => {
      if (!active) return;
      const amount = (value: number | null | undefined) => value == null ? '' : String(value);
      setTitle(job.title); setIndustry(job.industryOther ? 'OTHER' : job.industry); setIndustryOther(job.industryOther || '');
      setSeniority(job.seniorityOther ? 'OTHER' : job.seniority); setSeniorityOther(job.seniorityOther || '');
      setEmploymentType(job.employmentTypeOther ? 'OTHER' : job.employmentType); setEmploymentTypeOther(job.employmentTypeOther || '');
      setLocation(job.location); setSalaryCurrency(job.salaryCurrency || 'VND');
      setSalaryMin(amount(job.salaryMin)); setSalaryMax(amount(job.salaryMax));
      setSalaryMode(job.salaryNegotiable ? 'NEGOTIABLE'
        : job.salaryMin == null && job.salaryMax == null ? 'UNDISCLOSED'
        : job.salaryMin != null && job.salaryMin === job.salaryMax ? 'FIXED' : 'LEGACY');
      setDescription(job.description || '');
      setDescriptionHtml(job.descriptionHtml ?? plainAsRichText(job.description || ''));
      setResponsibilitiesHtml(job.responsibilitiesHtml ?? plainAsRichText((job.responsibilities || []).join('\n')));
      setVacancies(job.vacancyCount == null ? '' : String(job.vacancyCount));
      setDeadline(job.applicationDeadline ?? '');
      setOriginalDeadline(job.applicationDeadline ?? '');
      setResponsibilities((job.responsibilities || []).join('\n')); setOriginalStatus(job.status);
      setRequirements((job.requirements || []).map((req) => ({ id: req.id, skillName: req.skillName,
        requirementType: req.requirementType, minYearsExperience: req.minYearsExperience ?? req.minExperienceYears ?? 0 })));
    }).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : 'Không thể tải tin tuyển dụng.'); })
      .finally(() => { if (active) setLoadedJobId(jobId); });
    return () => { active = false; };
  }, [jobId]);

  const handleRemoveSkill = (id: string) => {
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (targetStatus: 'DRAFT' | 'PUBLISHED') => {
    if (submissionInProgress.current) return;
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
    if (customValues.some(([choice, value]) => choice === 'OTHER' && (!value.trim() || value.trim().length > 80))) {
      setErrorMessage(locale === 'vi' ? 'Với lựa chọn Khác, hãy nhập nội dung từ 1 đến 80 ký tự.' : 'For Other, enter 1–80 characters.');
      return;
    }

    const salaryMinValue = salaryMode === 'FIXED' ? readSalary(salaryMin, salaryCurrency) : salaryMode === 'LEGACY' && salaryMin !== '' ? Number(salaryMin) : null;
    const salaryMaxValue = salaryMode === 'FIXED' ? salaryMinValue : salaryMode === 'LEGACY' && salaryMax !== '' ? Number(salaryMax) : null;
    if (salaryMode === 'FIXED' && salaryMinValue === null) {
      setErrorMessage(isVi ? 'Nhập một mức lương hợp lệ.' : 'Enter a valid salary amount.');
      return;
    }
    const vacancyCount = vacancies === '' ? undefined : Number(vacancies);
    if ((vacancyCount === undefined && (targetStatus === 'PUBLISHED' || !jobId))
        || (vacancyCount !== undefined && (!Number.isInteger(vacancyCount) || vacancyCount < 1 || vacancyCount > 10000))) {
      setErrorMessage(isVi ? 'Số lượng tuyển phải là số nguyên từ 1 đến 10.000.' : 'Openings must be a whole number from 1 to 10,000.');
      return;
    }
    if ((targetStatus === 'PUBLISHED' && !deadline)
        || (isJobExpired(deadline) && (targetStatus === 'PUBLISHED' || deadline !== originalDeadline))
        || (originalStatus === 'PUBLISHED' && originalDeadline && !deadline)) {
      setErrorMessage(isVi ? 'Chọn hạn nộp từ hôm nay trở đi. Tin đang đăng đã có hạn nộp cần giữ hoặc gia hạn.' : 'Choose today or a later deadline. Keep or extend an existing deadline on a published job.');
      return;
    }

    if (targetStatus === 'PUBLISHED' && company?.verificationStatus !== 'VERIFIED') {
      setErrorMessage(
        locale === 'vi'
          ? 'Doanh nghiệp cần được xác minh để đăng tin. Bạn vẫn có thể lưu bản nháp.'
          : 'Company is not verified. You can save a draft while awaiting verification.'
      );
      return;
    }

    submissionInProgress.current = true;
    setIsSubmitting(true);
    try {
      const payload: Job = {
        id: savedDraftId.current || `job-temp-${Date.now()}`,
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
        descriptionHtml,
        responsibilitiesHtml,
        applicationDeadline: deadline || undefined,
        vacancyCount,
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
        status: 'DRAFT'
      };

      const saved = await saveJob(payload);
      savedDraftId.current = saved.id;
      if (targetStatus === 'PUBLISHED' && saved.status !== 'PUBLISHED') {
        await publishJob(saved.id);
      }
      setConfirmation(null);
      setSuccessMessage(
        targetStatus === 'PUBLISHED'
          ? (locale === 'vi' ? 'Đã xuất bản tin tuyển dụng thành công!' : 'Job published successfully!')
          : (locale === 'vi' ? (jobId ? 'Đã lưu thay đổi tin tuyển dụng.' : 'Đã lưu bản nháp tin tuyển dụng thành công!') : 'Job saved successfully!')
      );

      router.push('/recruiter/jobs');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Lỗi khi lưu tin tuyển dụng.');
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  if (loadingJob) return <p role="status" className="p-8">Đang tải tin tuyển dụng…</p>;
  if (loadError) return <div role="alert" className="p-8"><p>{loadError}</p><Link href="/recruiter/jobs">Quay lại danh sách</Link></div>;

  return (
    <div className="w-full max-w-5xl min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <RecruiterPageHeader

        title={jobId ? (locale === 'vi' ? 'Chỉnh sửa tin tuyển dụng' : 'Edit job') : (locale === 'vi' ? 'Tạo tin tuyển dụng' : 'Create job')}
        subtitle={locale === 'vi' ? 'Nhập thông tin, mô tả và kỹ năng cho vị trí cần tuyển.' : 'Add the job details, description and required skills.'}
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
              ? 'Lưu ý: Doanh nghiệp của bạn đang chờ xác minh. Bạn có thể lưu bản nháp, sau khi hoàn tất xác minh bạn sẽ xuất bản được tin tuyển dụng.'
              : 'Note: Company is pending verification. You can save as Draft; publication will be enabled once verified.'}
          </span>
        </div>
      )}

      {/* EDIT TAB */}
      {activeTab === 'edit' && (
        <div className="space-y-6">
          {/* Section 1: Basic Job Info */}
          <div className="bg-white dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--heading)] dark:text-white border-b border-[var(--border-soft)] dark:border-[var(--border)] pb-3">
              Thông tin Tuyển Dụng Cơ Bản
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-[var(--heading)] dark:text-slate-300 mb-1">
                  {isVi ? 'Tiêu đề vị trí tuyển dụng' : 'Job title'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Senior Java Backend Engineer, Data Scientist..."
                  aria-label={isVi ? 'Tiêu đề vị trí tuyển dụng' : 'Job title'}
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

              <label className="space-y-1">
                <span className="block font-semibold">{isVi ? 'Số lượng tuyển' : 'Openings'}</span>
                <input type="number" min={1} max={10000} step={1} value={vacancies} onChange={e => setVacancies(e.target.value)} className={controlClass} />
              </label>
              <label className="space-y-1">
                <span className="block font-semibold">{isVi ? 'Hạn nộp hồ sơ' : 'Application deadline'}</span>
                <input type="date" min={recruitmentDate()} value={deadline} onChange={e => setDeadline(e.target.value)} className={controlClass} />
                <span className="block text-[var(--text-secondary)]">{isVi ? 'Nhận hồ sơ đến hết ngày đã chọn, giờ Việt Nam.' : 'Applications are accepted through this date, Vietnam time.'}</span>
              </label>
              <fieldset className="sm:col-span-2 grid gap-3 border-t border-[var(--border-soft)] pt-3 sm:grid-cols-3">
                <legend className="font-semibold">{isVi ? 'Mức lương mỗi tháng' : 'Monthly salary'}</legend>
                <label className="space-y-1">
                  <span className="block">{isVi ? 'Cách công bố' : 'Display option'}</span>
                  <select value={salaryMode} onChange={e => {
                    const mode = e.target.value as typeof salaryMode;
                    if (mode === 'FIXED' && salaryMode === 'LEGACY') setSalaryMin('');
                    setSalaryMode(mode);
                  }} className={controlClass}>
                    <option value="UNDISCLOSED">{isVi ? 'Chưa công bố' : 'Undisclosed'}</option>
                    <option value="NEGOTIABLE">{isVi ? 'Thỏa thuận' : 'Negotiable'}</option>
                    <option value="FIXED">{isVi ? 'Mức cụ thể' : 'Fixed amount'}</option>
                    {salaryMode === 'LEGACY' && <option value="LEGACY">{isVi ? 'Giữ mức lương đã lưu' : 'Keep saved salary'}</option>}
                  </select>
                </label>
                {salaryMode === 'FIXED' && <>
                  <label className="space-y-1">
                    <span className="block">{isVi ? 'Số tiền' : 'Amount'}</span>
                    <input type="number" min={0} max={9999999999.99} step={['VND', 'JPY', 'KRW'].includes(salaryCurrency) ? 1 : 0.01} inputMode="decimal" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="4000000" className={controlClass} />
                  </label>
                  <label className="space-y-1">
                    <span className="block">{isVi ? 'Tiền tệ' : 'Currency'}</span>
                    <select value={salaryCurrency} onChange={e => setSalaryCurrency(e.target.value as typeof salaryCurrency)} className={controlClass}>
                      {['VND', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'SGD', 'AUD', 'CAD'].map(code => <option key={code}>{code}</option>)}
                    </select>
                  </label>
                </>}
                {salaryMode === 'LEGACY' && <p className="self-end sm:col-span-2">{formatSalary(readSalary(salaryMin, salaryCurrency), readSalary(salaryMax, salaryCurrency), undefined, locale, false, salaryCurrency)}</p>}
              </fieldset>
            </div>
          </div>

          <section className="space-y-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 sm:p-6">
            <h3 className="font-semibold">{isVi ? 'Kỹ năng cần có' : 'Skills'}</h3>
            <SkillCatalogPicker
              compact
              placeholder={isVi ? 'Tìm hoặc nhập tên kỹ năng' : 'Find or add a skill'}
              selectedSkills={requirements.map(req => req.skillName)}
              onAddSkill={skillName => setRequirements(current => current.some(req => req.skillName.toLowerCase() === skillName.trim().toLowerCase())
                ? current : [...current, { id: crypto.randomUUID(), skillName: skillName.trim(), requirementType: 'REQUIRED', minYearsExperience: 0 }])}
            />
            <ul className="divide-y divide-[var(--border-soft)]">
              {requirements.map(req => (
                <li key={req.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-24 flex-1 break-words text-sm font-medium">{req.skillName}</span>
                  <select aria-label={`${isVi ? 'Loại yêu cầu' : 'Requirement type'} · ${req.skillName}`} value={req.requirementType} onChange={e => {
                    const requirementType = e.target.value as RequirementType;
                    setRequirements(current => current.map(item => item.id === req.id ? { ...item, requirementType } : item));
                  }} className={`${controlClass} !w-auto`}>
                    <option value="REQUIRED">{isVi ? 'Bắt buộc' : 'Required'}</option>
                    <option value="PREFERRED">{isVi ? 'Ưu tiên' : 'Preferred'}</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="number" min={0} max={50} aria-label={`${isVi ? 'Số năm tối thiểu' : 'Minimum years'} · ${req.skillName}`} value={req.minYearsExperience} onChange={e => {
                      const minYearsExperience = Math.max(0, Math.min(50, Math.trunc(Number(e.target.value) || 0)));
                      setRequirements(current => current.map(item => item.id === req.id ? { ...item, minYearsExperience } : item));
                    }} className={`${controlClass} !w-16`} />
                    {isVi ? 'năm' : 'years'}
                  </label>
                  <button type="button" aria-label={`${isVi ? 'Xóa' : 'Remove'} ${req.skillName}`} onClick={() => handleRemoveSkill(req.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 sm:p-6">
            <RichTextEditor label={isVi ? 'Mô tả công việc' : 'Job description'} value={descriptionHtml} onChange={html => { setDescriptionHtml(html); setDescription(richTextPlain(html)); }} />
            <RichTextEditor label={isVi ? 'Trách nhiệm chính' : 'Key responsibilities'} value={responsibilitiesHtml} onChange={html => { setResponsibilitiesHtml(html); setResponsibilities(richTextPlain(html)); }} />
          </section>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setConfirmation('discard')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--heading)] dark:hover:text-white border border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] text-center transition"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => { setErrorMessage(null); if (originalStatus === 'PUBLISHED') setConfirmation('update'); else void handleSubmit('DRAFT'); }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--surface)] dark:bg-[var(--surface)] text-[var(--heading)] dark:text-slate-200 border border-[var(--border-soft)] dark:border-[var(--border)] hover:bg-[var(--surface-secondary)] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? (isVi ? 'Đang lưu…' : 'Saving…') : jobId ? (isVi ? 'Lưu thay đổi' : 'Save changes') : (isVi ? 'Lưu bản nháp' : 'Save draft')}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || company?.verificationStatus !== 'VERIFIED' || (Boolean(jobId) && originalStatus !== 'DRAFT' && originalStatus !== 'CLOSED')}
              onClick={() => { setErrorMessage(null); setConfirmation('publish'); }}
              title={
                company?.verificationStatus !== 'VERIFIED'
                  ? 'Chỉ doanh nghiệp đã xác minh mới được đăng tin'
                  : undefined
              }
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (isVi ? 'Đang đăng…' : 'Publishing…')
                  : company?.verificationStatus !== 'VERIFIED'
                  ? (isVi ? 'Chờ xác minh' : 'Verification required')
                  : (isVi ? 'Đăng tin' : 'Publish job')}
              </span>
            </button>
          </div>
        </div>
      )}

      <ConfirmActionDialog
        isOpen={confirmation !== null}
        title={confirmation === 'discard' ? (isVi ? 'Rời trình chỉnh sửa?' : 'Leave the editor?')
          : confirmation === 'update' ? (isVi ? 'Cập nhật tin đang đăng?' : 'Update the published job?')
          : (isVi ? 'Đăng tin tuyển dụng?' : 'Publish this job?')}
        description={confirmation === 'discard' ? (isVi ? 'Các thay đổi chưa lưu sẽ bị bỏ.' : 'Unsaved changes will be lost.')
          : (isVi ? 'Nội dung cập nhật sẽ hiển thị cho ứng viên.' : 'The updated content will be visible to applicants.')}
        confirmLabel={isVi ? 'Xác nhận' : 'Confirm'}
        cancelLabel={isVi ? 'Quay lại' : 'Go back'}
        errorMessage={confirmation === 'discard' ? null : errorMessage}
        isLoading={isSubmitting}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => confirmation === 'discard' ? router.push('/recruiter/jobs') : handleSubmit(confirmation === 'publish' ? 'PUBLISHED' : 'DRAFT')}
      />

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
              {title || (isVi ? 'Tiêu đề vị trí tuyển dụng' : 'Job title')}
            </h1>

            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{company?.name || 'Doanh nghiệp'}</span>
              </span>

              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{location || (isVi ? 'Toàn quốc' : 'Nationwide')}</span>
              </span>

              <span className="flex items-center gap-1 font-sans text-[var(--success)] font-semibold">
                <DollarSign className="w-3.5 h-3.5" />
                <span>
                  {formatSalary(
                    salaryMode === 'FIXED' || salaryMode === 'LEGACY' ? readSalary(salaryMin, salaryCurrency) : null,
                    salaryMode === 'FIXED' ? readSalary(salaryMin, salaryCurrency) : salaryMode === 'LEGACY' ? readSalary(salaryMax, salaryCurrency) : null,
                    undefined, locale, isSalaryNegotiable, salaryCurrency,
                  )}
                </span>
              </span>
              {vacancies && <span>{isVi ? 'Số lượng tuyển' : 'Openings'} · {vacancies}</span>}
              {deadline && <span>{isVi ? 'Hạn nộp' : 'Deadline'} · {formatJobDeadline(deadline, locale)}</span>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 text-xs leading-relaxed text-[var(--heading)] dark:text-slate-300">
            <h4 className="font-bold text-sm text-[var(--heading)] dark:text-white">
              {isVi ? 'Mô tả công việc' : 'Job description'}
            </h4>
            <RichTextDisplay html={descriptionHtml} fallback={description} />
          </div>

          {/* Responsibilities */}
          {responsibilities && (
            <div className="space-y-2 text-xs leading-relaxed text-[var(--heading)] dark:text-slate-300 pt-3 border-t border-[var(--border-soft)] dark:border-[var(--border)]">
              <h4 className="font-bold text-sm text-[var(--heading)] dark:text-white">
                {isVi ? 'Trách nhiệm chính' : 'Key responsibilities'}
              </h4>
              <RichTextDisplay html={responsibilitiesHtml} fallback={responsibilities} />
            </div>
          )}

          {/* Rubric Breakdown */}
          <div className="space-y-3 pt-3 border-t border-[var(--border-soft)] dark:border-[var(--border)]">
            <h4 className="font-bold text-sm text-[var(--heading)] dark:text-white">
              {isVi ? 'Kỹ năng cần có' : 'Skills'} ({requirements.length})
            </h4>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] font-sans font-bold text-amber-700 dark:text-amber-300 block mb-1.5">
                  {isVi ? 'Bắt buộc' : 'Required'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {requirements
                    .filter((r) => r.requirementType === 'REQUIRED')
                    .map((r) => (
                      <span
                        key={r.id}
                        className="px-2.5 py-1 rounded-xl text-xs font-sans font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300"
                      >
                        {r.skillName} (≥ {r.minYearsExperience} {isVi ? 'năm' : 'years'})
                      </span>
                    ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-sans font-bold text-blue-700 dark:text-blue-300 block mb-1.5 pt-2">
                  {isVi ? 'Ưu tiên' : 'Preferred'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {requirements
                    .filter((r) => r.requirementType === 'PREFERRED')
                    .map((r) => (
                      <span
                        key={r.id}
                        className="px-2.5 py-1 rounded-xl text-xs font-sans font-medium bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300"
                      >
                        {r.skillName} (≥ {r.minYearsExperience} {isVi ? 'năm' : 'years'})
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
