'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Job, Company, Application } from '@/types';
import { fetchRecruiterJobs, fetchRecruiterCompany, fetchJobApplications } from '@/lib/api';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { MetricCard } from '@/components/recruiter/MetricCard';
import { CompanyVerificationBanner } from '@/components/recruiter/CompanyVerificationBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { Reveal } from '@/components/motion/Reveal';
import { staggerDelay } from '@/components/motion/stagger';
import {
  Briefcase,
  Users,
  Clock,
  FileText,
  PlusCircle,
  ArrowRight,
  AlertCircle,
  ChevronRight,
  Award
} from 'lucide-react';

export default function HRDashboardPage() {
  const { locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
        setFetchError(err.message || (locale === 'vi' ? 'Không thể tải dữ liệu tuyển dụng.' : 'Unable to load recruitment data.'));
      })
      .finally(() => setIsLoading(false));
  }, [locale]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDashboardData]);

  const publishedJobs = jobs.filter((j) => j.status === 'PUBLISHED');
  const draftJobs = jobs.filter((j) => j.status === 'DRAFT');
  const submittedApps = applications.filter((a) => a.status === 'SUBMITTED');

  // Sorted recent jobs and applications
  const recentJobs = [...jobs].slice(0, 5);
  const recentApplications = [...applications].slice(0, 6);

  if (fetchError && !isLoading && jobs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <EmptyState
          type="ERROR"
          title={locale === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server Connection Error'}
          description={fetchError}
          primaryCtaText={locale === 'vi' ? 'Thử lại' : 'Retry'}
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
        title={locale === 'vi' ? 'Tổng Quan Tuyển Dụng Doanh Nghiệp' : 'Enterprise Recruitment Overview'}
        subtitle={
          company?.name
            ? `${company.name} • ${locale === 'vi' ? 'Bảng điều khiển hoạt động tuyển dụng, phân tích ứng viên và telemetry đối sánh' : 'Hiring operations telemetry, candidate pipelines and matching metrics'}`
            : (locale === 'vi' ? 'Bảng điều khiển hoạt động tuyển dụng và đối sánh năng lực kỹ thuật' : 'Hiring operations command center and technical matching vectors')
        }
        companyName={company?.name}
        isCompanyVerified={company?.verificationStatus === 'VERIFIED'}
      />

      {/* Verification Status Banner if unverified */}
      {company && (
        <CompanyVerificationBanner
          status={company.verificationStatus}
          companyName={company.name}
          reason={company.verificationReason}
        />
      )}

        {/* Welcome Banner */}
        <Reveal direction="up" delay={0}>
          <div className="bg-gradient-to-r from-[#0F2A52] via-[#1E3A5F] to-[#0F2A52] text-white rounded-2xl p-8 border border-blue-900/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 suppressHydrationWarning className="text-2xl sm:text-3xl font-editorial font-normal text-white">
                {locale === 'vi' ? 'Chào mừng trở lại, ' : 'Welcome back, '}{recruiterName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 font-light leading-relaxed">
                {locale === 'vi' ? (
                  <>Hệ sinh thái <strong className="font-semibold text-white">mid<span className="text-[#00B14F]">CV</span><sup>®</sup></strong> đang đồng bộ các vị trí tuyển dụng với mô hình trích xuất thực thể và đối sánh vector chuẩn hóa.</>
                ) : (
                  <>The <strong className="font-semibold text-white">mid<span className="text-[#00B14F]">CV</span><sup>®</sup></strong> ecosystem is syncing requisition vectors and candidate semantic pipelines.</>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/recruiter/jobs/new"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#00B14F] hover:bg-[#009643] text-white transition shadow-sm flex items-center gap-1.5"
              >
                <span>{locale === 'vi' ? '+ Đăng Tin Tuyển Dụng' : '+ Post New Job'}</span>
              </Link>
              {jobs.length > 0 && (
                <Link
                  href={`/recruiter/jobs/${jobs[0].id}/applications`}
                  className="px-4 py-2 rounded-lg text-xs font-medium border border-white/25 text-white hover:bg-white/10 transition"
                >
                  {locale === 'vi' ? 'Duyệt Ứng Viên' : 'Review Candidates'}
                </Link>
              )}
            </div>
          </div>
        </Reveal>

        {isLoading ? (
          <EmptyState
            type="LOADING"
            title="Đang tải dữ liệu tuyển dụng..."
            description="Hệ thống đang kết nối cơ sở dữ liệu doanh nghiệp và trích xuất số liệu..."
          />
        ) : fetchError ? (
          <EmptyState
            type="ERROR"
            title="Không thể tải dữ liệu tuyển dụng"
            description={fetchError}
            primaryCtaText="Thử lại"
            onPrimaryCtaClick={loadDashboardData}
          />
        ) : activeTab === 'console' ? (
          <>
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <Reveal delay={staggerDelay(0)}>
                <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                    ACTIVE JOB POSTINGS
                  </span>
                  <div className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                    {publishedJobs.length}
                  </div>
                  <div className="text-[11px] text-[#00B14F] dark:text-[#3B82F6] font-medium pt-1">
                    {jobs.length} tổng số vị trí đã tạo
                  </div>
                </div>
              </Reveal>

              <Reveal delay={staggerDelay(1)}>
                <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                    APPLICANTS RECEIVED
                  </span>
                  <div className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                    {applications.length}
                  </div>
                  <div className="text-[11px] text-[#00B14F] dark:text-[#3B82F6] font-medium pt-1">
                    Xác thực danh tính thực tế
                  </div>
                </div>
              </Reveal>

              <Reveal delay={staggerDelay(2)}>
                <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                    DRAFT JOBS
                  </span>
                  <div className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                    {draftJobs.length}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    Đang hoàn thiện mô tả JD
                  </div>
                </div>
              </Reveal>

              <Reveal delay={staggerDelay(3)}>
                <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                    AI MATCH ENGINE
                  </span>
                  <div className="text-3xl font-editorial font-bold text-[#00B14F] dark:text-[#3B82F6]">
                    Active
                  </div>
                  <div className="text-[11px] text-[#00B14F] dark:text-[#3B82F6] font-medium pt-1">
                    NDCG@K chuẩn hóa
                  </div>
                </div>
              </Reveal>
            </div>
            <Link
              href="/recruiter/jobs"
              className="text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1"
            >
              <span>{locale === 'vi' ? 'Xem tất cả' : 'View all'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

            {/* Active Sourcing Funnel Stage */}
            <Reveal delay={120}>
              <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-6 shadow-xs space-y-4">
                <div className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                  Active Sourcing Funnel
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
                  {[
                    { count: applications.length, label: 'Submitted (Nộp đơn)' },
                    { count: applications.filter(a => a.status === 'UNDER_REVIEW').length, label: 'Screening (Sàng lọc)' },
                    { count: applications.filter(a => a.status === 'SHORTLISTED').length, label: 'Shortlisted (Chọn tiếp)' },
                    { count: applications.filter(a => a.status === 'REJECTED').length, label: 'Rejected (Từ chối)' },
                  ].map((st, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-[#13233F] border border-slate-200/80 dark:border-[#1E293B] rounded-lg p-3">
                      <div className="text-xl font-bold font-editorial text-slate-900 dark:text-white">{st.count}</div>
                      <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mt-0.5">{st.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Two Columns: Top Performing Postings & Recent Candidate Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Top Performing Postings */}
              <Reveal delay={160} className="lg:col-span-8">
                <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Vị Trí Đang Tuyển Dụng</h3>
                    <Link href="/recruiter/jobs" className="text-xs font-semibold text-[#2563EB] hover:underline">
                      Xem tất cả ({jobs.length})
                    </Link>
                  </div>

                  {jobs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-[#13233F] text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-[#1E293B]">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold">Tiêu đề vị trí</th>
                            <th className="py-2.5 px-3 font-semibold">Ngành nghề</th>
                            <th className="py-2.5 px-3 font-semibold">Mức lương</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#1F4A40] text-slate-700 dark:text-slate-300">
                          {jobs.slice(0, 5).map((j) => (
                            <tr key={j.id} className="hover:bg-slate-50/80 dark:hover:bg-[#15342E]">
                              <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                                <Link href={`/recruiter/jobs/${j.id}/ranking`} className="hover:text-[#2563EB] hover:underline">
                                  {j.title}
                                </Link>
                              </td>
                              <td className="py-3 px-3 font-mono">{j.industry}</td>
                              <td className="py-3 px-3 font-mono">${j.salaryMin} - ${j.salaryMax}</td>
                              <td className="py-3 px-3 text-right">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    j.status === 'PUBLISHED'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#00B14F] border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {j.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      type="EMPTY"
                      compact
                      title={t('emptyStates.jobs.emptyTitle', "Chưa có bài tuyển dụng nào")}
                      description={t('emptyStates.jobs.emptyDesc', "Hiện tại chưa có vị trí tuyển dụng nào trên hệ thống.")}
                      primaryCtaText="Tạo tin tuyển dụng đầu tiên"
                      primaryCtaHref="/recruiter/jobs/new"
                    />
                  )}
                </div>
              </Reveal>

              {/* Right Column: Recent Candidate Activity */}
              <Reveal delay={200} className="lg:col-span-4">
                <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Đơn Ứng Tuyển Mới Nhất</h3>

                  {applications.length > 0 ? (
                    <div className="space-y-3 text-xs">
                      {applications.slice(0, 4).map((app) => (
                        <div key={app.id} className="p-3 bg-slate-50 dark:bg-[#13233F] border border-slate-200/80 dark:border-[#1E293B] rounded-lg flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 dark:text-white">{app.appliedCvTitle}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{app.job.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{app.appliedDate}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            {app.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      type="EMPTY"
                      compact
                      title={t('emptyStates.applications.candidateEmptyTitle', "Chưa có đơn ứng tuyển nào")}
                      description={t('emptyStates.applications.recruiterEmptyDesc', "Chưa có đơn ứng tuyển nào được ghi nhận.")}
                    />
                  )}
                </div>
              </Reveal>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/recruiter/jobs/${job.id}/applications`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8FAFC] dark:bg-[#13233F] hover:bg-[#EFF6FF] dark:hover:bg-[#18294E] text-[#1E3A5F] dark:text-[#D6E4E1] border border-[#E2E8F0] dark:border-[#1E293B] transition flex items-center gap-1.5 shrink-0"
                        >
                          <Users className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" />
                          <span>{jobAppCount} {locale === 'vi' ? 'ứng tuyển' : 'applicants'}</span>
                        </Link>
                        <Link
                          href={`/recruiter/jobs/${job.id}/ranking`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#DBEAFE] border border-[#2563EB]/20 transition flex items-center gap-1.5 shrink-0"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>AI Ranking</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Applications */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00B14F] dark:text-[#10B981]" />
              <h2 className="text-base font-bold text-[#0F2A52] dark:text-white">
                {locale === 'vi' ? 'Ứng Tuyển Mới Nhất' : 'Latest Applications'}
              </h2>
            </div>
            <Link
              href="/recruiter/pipeline"
              className="text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1"
            >
              <span>{locale === 'vi' ? 'Pipeline' : 'Pipeline'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] animate-pulse" />
              ))}
            </div>
          ) : recentApplications.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] text-center space-y-2">
              <Users className="w-8 h-8 text-[#94A3B8] mx-auto opacity-40" />
              <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {locale === 'vi' ? 'Chưa nhận được hồ sơ nào.' : 'No candidate submissions yet.'}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentApplications.map((app) => (
                <Link
                  key={app.id}
                  href={`/recruiter/applications/${app.id}`}
                  className="p-3.5 rounded-xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#3B82F6] shadow-2xs transition block space-y-1.5 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0F2A52] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition truncate">
                      {app.candidateName || (locale === 'vi' ? 'Ứng viên' : 'Candidate')}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                        app.status === 'SHORTLISTED'
                          ? 'bg-[#E8F8EE] dark:bg-[#00B14F]/15 text-[#00B14F]'
                          : app.status === 'SUBMITTED'
                          ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB]'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <span className="truncate max-w-[180px]">
                      {app.job?.title || 'Vị trí tuyển dụng'}
                    </span>
                    <span className="font-mono text-[10px] shrink-0">
                      {app.appliedDate}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
