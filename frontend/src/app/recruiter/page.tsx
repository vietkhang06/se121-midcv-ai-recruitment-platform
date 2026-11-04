'use client';

import React, { useState, useEffect, useCallback } from 'react';

import Link from 'next/link';

import { Job, Company, Application } from '@/types';

import { fetchRecruiterJobs, fetchRecruiterCompany, fetchJobApplications } from '@/lib/api';

import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { CompanyVerificationBanner } from '@/components/recruiter/CompanyVerificationBanner';
import { formatSalary } from '@/lib/i18n';

import { SuspensionBanner } from '@/components/recruiter/SuspensionBanner';

import { AppealModal } from '@/components/recruiter/AppealModal';

import { EmptyState } from '@/components/common/EmptyState';

import { Reveal } from '@/components/motion/Reveal';

import { staggerDelay } from '@/components/motion/stagger';
import { useLanguage } from '@/context/LanguageContext';
import { Users, ChevronRight, Briefcase, Plus } from 'lucide-react';

export default function HRDashboardPage() {

  const { locale } = useLanguage();
  const isVi = locale === 'vi';

  const [jobs, setJobs] = useState<Job[]>([]);

  const [company, setCompany] = useState<Company | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isAppealModalOpen, setIsAppealModalOpen] = useState<boolean>(false);

  const loadDashboardData = useCallback(() => {

    setIsLoading(true);

    setFetchError(null);

    Promise.all([

      fetchRecruiterJobs(),

      fetchRecruiterCompany().catch(() => null),

    ])

      .then(async ([recJobs, comp]) => {

        setJobs(recJobs);

        if (comp) setCompany(comp);

        if (recJobs.length > 0) {

          const appLists = await Promise.all(

            recJobs.map((j) => fetchJobApplications(j.id).catch(() => []))

          );

          setApplications(appLists.flat());

        } else {

          setApplications([]);

        }

      })

      .catch((err) => {
        setFetchError(err.message || (isVi ? 'Không thể tải dữ liệu tuyển dụng.' : 'Unable to load recruitment data.'));
      })

      .finally(() => setIsLoading(false));
  }, [isVi]);

  useEffect(() => {

    const timer = setTimeout(() => {

      loadDashboardData();

    }, 0);

    return () => clearTimeout(timer);

  }, [loadDashboardData]);

  const publishedJobs = jobs.filter((j) => j.status === 'PUBLISHED');
  const draftJobs = jobs.filter((j) => j.status === 'DRAFT');
  const recentApplications = [...applications].slice(0, 6);

  // Real AI matching evaluations based on applicant pool
  const scoredApps = applications.filter((a) => a.matchScore != null && Number(a.matchScore) > 0);
  const avgMatchScore = scoredApps.length > 0
    ? Math.round(scoredApps.reduce((acc, curr) => acc + (Number(curr.matchScore) || 0), 0) / scoredApps.length)
    : null;
  const highMatchCount = applications.filter((a) => (Number(a.matchScore) || 0) >= 75).length;

  if (fetchError && !isLoading && jobs.length === 0) {

    return (

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <EmptyState

          type="ERROR"
          title={isVi ? 'Lỗi kết nối máy chủ' : 'Server Connection Error'}
          description={fetchError}
          primaryCtaText={isVi ? 'Thử lại' : 'Retry'}
          onPrimaryCtaClick={loadDashboardData}

        />

      </div>

    );

  }

  return (

    <div className="w-full max-w-7xl min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Page Header */}

      <RecruiterPageHeader

        categoryTag="RECRUITER WORKSPACE"
        title={isVi ? 'Tổng Quan Tuyển Dụng Doanh Nghiệp' : 'Enterprise Recruitment Overview'}
        subtitle={

          company?.name
            ? `${company.name} • ${isVi ? 'Bảng điều khiển hoạt động tuyển dụng, phân tích ứng viên và telemetry đối sánh' : 'Hiring operations telemetry, candidate pipelines and matching metrics'}`
            : (isVi ? 'Bảng điều khiển hoạt động tuyển dụng và đối sánh năng lực kỹ thuật' : 'Hiring operations command center and technical matching vectors')
        }

        companyName={company?.name}

        isCompanyVerified={company?.verificationStatus === 'VERIFIED'}

      />

      {/* Suspension Status Banner if suspended */}

      <SuspensionBanner

        companyVerificationStatus={company?.verificationStatus}

        companyName={company?.name}

        onOpenAppealModal={() => setIsAppealModalOpen(true)}

      />

      {/* Appeal Submission Modal */}

      <AppealModal

        isOpen={isAppealModalOpen}

        onClose={() => setIsAppealModalOpen(false)}

        onSuccess={loadDashboardData}

      />

      {/* Verification Status Banner if unverified */}

      {company && company.verificationStatus !== 'SUSPENDED' && (

        <CompanyVerificationBanner

          status={company.verificationStatus}

          companyName={company.name}

          reason={company.verificationReason}

        />

      )}

      {/* Welcome Banner */}
      <Reveal direction="up" delay={0}>
        <div className="bg-gradient-to-r from-[var(--retro-deep)] via-[var(--retro-deep)] to-[var(--retro-deep)] text-white rounded-xl p-8 border border-blue-900/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 suppressHydrationWarning className="text-2xl sm:text-3xl font-editorial font-normal text-white">
              {isVi ? 'Chào mừng trở lại, ' : 'Welcome back, '}{company?.name || (isVi ? 'Nhà tuyển dụng' : 'Recruiter')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 font-light leading-relaxed">
              {isVi ? (
                <>Hệ sinh thái <strong className="font-semibold text-white">mid<span className="text-[var(--success)]">CV</span><sup>®</sup></strong> đang đồng bộ các vị trí tuyển dụng với mô hình trích xuất thực thể và đối sánh vector chuẩn hóa.</>
              ) : (
                <>The <strong className="font-semibold text-white">mid<span className="text-[var(--success)]">CV</span><sup>®</sup></strong> ecosystem is syncing requisition vectors and candidate semantic pipelines.</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/recruiter/jobs/new"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--success)] hover:bg-[var(--retro-deep)] text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isVi ? 'Đăng Tin Tuyển Dụng' : 'Post New Job'}</span>
            </Link>
            {jobs.length > 0 && (
              <Link
                href={`/recruiter/jobs/${jobs[0].id}/applications`}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-white/25 text-white hover:bg-white/10 transition cursor-pointer"
              >
                {isVi ? 'Duyệt Ứng Viên' : 'Review Candidates'}
              </Link>
            )}
          </div>
        </div>
      </Reveal>

      {isLoading ? (
        <EmptyState
          type="LOADING"
          title={isVi ? 'Đang tải dữ liệu tuyển dụng...' : 'Loading recruitment data...'}
          description={isVi ? 'Hệ thống đang kết nối cơ sở dữ liệu doanh nghiệp và trích xuất số liệu...' : 'Connecting enterprise telemetry and aggregating pipelines...'}
        />
      ) : fetchError ? (
        <EmptyState
          type="ERROR"
          title={isVi ? 'Không thể tải dữ liệu tuyển dụng' : 'Unable to load recruitment data'}
          description={fetchError}
          primaryCtaText={isVi ? 'Thử lại' : 'Retry'}
          onPrimaryCtaClick={loadDashboardData}
        />
      ) : (
        <>
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <Reveal delay={staggerDelay(0)}>
              <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-sans font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {isVi ? 'TIN TUYỂN DỤNG ĐANG MỞ' : 'ACTIVE JOB POSTINGS'}
                </span>
                <div className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                  {publishedJobs.length}
                </div>
                <div className="text-[11px] text-[var(--success)] dark:text-[var(--retro-sky)] font-medium pt-1">
                  {isVi ? `${jobs.length} tổng số vị trí đã tạo` : `${jobs.length} total positions created`}
                </div>
              </div>
            </Reveal>

            <Reveal delay={staggerDelay(1)}>
              <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-sans font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {isVi ? 'HỒ SƠ ỨNG TUYỂN' : 'APPLICANTS RECEIVED'}
                </span>
                <div className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                  {applications.length}
                </div>
                <div className="text-[11px] text-[var(--success)] dark:text-[var(--retro-sky)] font-medium pt-1">
                  {isVi ? 'Xác thực danh tính thực tế' : 'Verified applicant profiles'}
                </div>
              </div>
            </Reveal>

            <Reveal delay={staggerDelay(2)}>
              <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-sans font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {isVi ? 'TIN NHÁP CHỜ ĐĂNG' : 'DRAFT JOBS'}
                </span>
                <div className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                  {draftJobs.length}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  {isVi ? 'Đang hoàn thiện mô tả JD' : 'Pending requisition draft'}
                </div>
              </div>
            </Reveal>

            <Reveal delay={staggerDelay(3)}>
              <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-sans font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {isVi ? 'ĐỐI SÁNH AI & VECTOR' : 'AI MATCH ENGINE'}
                </span>
                <div className="text-3xl font-editorial font-bold text-[var(--success)] dark:text-[var(--retro-sky)]">
                  {avgMatchScore !== null ? `${avgMatchScore}%` : (isVi ? 'Sẵn sàng' : 'Ready')}
                </div>
                <div className="text-[11px] text-[var(--success)] dark:text-[var(--retro-sky)] font-medium pt-1 truncate" title={avgMatchScore !== null ? (isVi ? `${highMatchCount} ứng viên phù hợp cao (>=75%)` : `${highMatchCount} high-fit candidates (>=75%)`) : (isVi ? 'Chờ hồ sơ ứng tuyển để đối sánh' : 'Awaiting candidate applications')}>
                  {avgMatchScore !== null
                    ? (isVi ? `${highMatchCount} ứng viên phù hợp cao (>=75%)` : `${highMatchCount} high-fit candidates (>=75%)`)
                    : (isVi ? 'Chờ hồ sơ ứng tuyển để đối sánh' : 'Awaiting candidate applications')}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Active Sourcing Funnel Stage */}
          <Reveal delay={120}>
            <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                <div className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                  {isVi ? 'Phễu Tuyển Dụng Đang Hoạt Động' : 'Active Sourcing Funnel'}
                </div>
                <Link
                  href="/recruiter/pipeline"
                  className="text-xs font-semibold text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{isVi ? 'Xem Kanban Pipeline' : 'View Kanban Pipeline'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-1">
                {[
                  { count: applications.length, label: isVi ? 'Mới nộp (Submitted)' : 'Submitted' },
                  { count: applications.filter(a => a.status === 'UNDER_REVIEW').length, label: isVi ? 'Sàng lọc (Screening)' : 'Screening' },
                  { count: applications.filter(a => a.status === 'SHORTLISTED').length, label: isVi ? 'Duyệt hồ sơ (Shortlisted)' : 'Shortlisted' },
                  { count: applications.filter(a => a.status === 'REJECTED').length, label: isVi ? 'Từ chối (Rejected)' : 'Rejected' },
                ].map((st, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-[var(--surface)] border border-slate-200/80 dark:border-[var(--border)] rounded-xl p-3">
                    <div className="text-xl font-bold font-editorial text-slate-900 dark:text-white">{st.count}</div>
                    <div className="text-[10px] font-sans uppercase text-slate-500 dark:text-slate-400 mt-0.5">{st.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Two Columns: Top Performing Postings & Recent Applications */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Top Performing Postings (8 cols) */}
            <Reveal delay={160} className="lg:col-span-8">
              <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[var(--primary)]" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {isVi ? 'Vị Trí Đang Tuyển Dụng' : 'Active Requisitions'}
                    </h3>
                  </div>
                  <Link href="/recruiter/jobs" className="text-xs font-semibold text-[var(--primary)] hover:underline">
                    {isVi ? `Xem tất cả (${jobs.length})` : `View all (${jobs.length})`}
                  </Link>
                </div>

                {jobs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[var(--surface)] text-slate-500 dark:text-slate-400 font-sans text-[10px] uppercase border-b border-slate-200 dark:border-[var(--border)]">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">{isVi ? 'Tiêu đề vị trí' : 'Job Title'}</th>
                          <th className="py-2.5 px-3 font-semibold">{isVi ? 'Ngành nghề' : 'Industry'}</th>
                          <th className="py-2.5 px-3 font-semibold">{isVi ? 'Mức lương' : 'Salary'}</th>
                          <th className="py-2.5 px-3 font-semibold text-center">{isVi ? 'Ứng viên' : 'Applicants'}</th>
                          <th className="py-2.5 px-3 font-semibold text-right">{isVi ? 'Trạng thái' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)] text-slate-700 dark:text-slate-300">
                        {jobs.slice(0, 5).map((j) => {
                          const jobAppCount = applications.filter(a => a.job?.id === j.id).length;
                          return (
                            <tr key={j.id} className="hover:bg-slate-50/80 dark:hover:bg-[var(--surface)] transition">
                              <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">

                                <Link href={`/recruiter/jobs/${j.id}/ranking`} className="hover:text-[var(--primary)] hover:underline">

                                  {j.title}

                                </Link>

                              </td>

                              <td className="py-3 px-3 font-sans">{j.industry}</td>

                              <td className="py-3 px-3 font-sans">{formatSalary(j.salaryMin, j.salaryMax, j.salaryRange, locale, j.salaryNegotiable, j.salaryCurrency)}</td>
                              <td className="py-3 px-3 text-center">
                                <Link
                                  href={`/recruiter/jobs/${j.id}/ranking`}
                                  className="inline-flex items-center gap-1 font-sans font-semibold px-2 py-0.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                                  title={isVi ? 'Xem bảng xếp hạng ứng viên' : 'View candidate ranking'}
                                >
                                  <Users className="w-3 h-3" />
                                  <span>{jobAppCount}</span>
                                </Link>
                              </td>
                              <td className="py-3 px-3 text-right">

                                <span

                                  className={`px-2 py-0.5 rounded-xl text-[10px] font-semibold ${j.status === 'PUBLISHED'

                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[var(--success)] border border-emerald-200 dark:border-emerald-800'

                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'

                                    }`}

                                >

                                  {j.status}

                                </span>

                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    type="EMPTY"
                    compact
                    title={isVi ? 'Chưa có bài tuyển dụng nào' : 'No job postings yet'}
                    description={isVi ? 'Hiện tại chưa có vị trí tuyển dụng nào trên hệ thống.' : 'There are currently no job postings.'}
                    primaryCtaText={isVi ? 'Tạo tin tuyển dụng đầu tiên' : 'Post first job'}
                    primaryCtaHref="/recruiter/jobs/new"
                  />
                )}
              </div>
            </Reveal>

            {/* Right Column: Unified Recent Applications (4 cols) */}
            <Reveal delay={200} className="lg:col-span-4">
              <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--success)] dark:text-[var(--success)]" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {isVi ? 'Ứng Tuyển Mới Nhất' : 'Latest Applications'}
                    </h3>
                  </div>
                  <Link
                    href="/recruiter/pipeline"
                    className="text-xs font-semibold text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isVi ? 'Pipeline' : 'Pipeline'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentApplications.length > 0 ? (
                  <div className="space-y-2.5">
                    {recentApplications.map((app) => (
                      <Link
                        key={app.id}
                        href={`/recruiter/applications/${app.id}`}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-[var(--surface)] border border-slate-200/80 dark:border-[var(--border)] hover:border-[var(--border)] dark:hover:border-[var(--border)] hover:bg-slate-100/60 dark:hover:bg-[var(--surface)] shadow-2xs transition block space-y-1.5 group cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[var(--primary)] dark:group-hover:text-[var(--retro-sky)] transition truncate">
                            {app.candidateName || (isVi ? 'Ứng viên' : 'Candidate')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase shrink-0 ${app.status === 'SHORTLISTED'
                                ? 'bg-[var(--surface-secondary)] dark:bg-[var(--success)]/15 text-[var(--success)]'
                                : app.status === 'SUBMITTED'
                                  ? 'bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)]'
                                  : app.status === 'REJECTED'
                                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                          >
                            {app.status}

                          </span>

                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="truncate max-w-[180px]">
                            {app.job?.title || (isVi ? 'Vị trí tuyển dụng' : 'Job Position')}
                          </span>
                          <span className="font-sans text-[10px] shrink-0">
                            {app.appliedDate}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    type="EMPTY"
                    compact
                    title={isVi ? 'Chưa có đơn ứng tuyển nào' : 'No applications yet'}
                    description={isVi ? 'Chưa có đơn ứng tuyển nào được ghi nhận.' : 'No applications have been recorded yet.'}
                  />
                )}
              </div>
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
}
