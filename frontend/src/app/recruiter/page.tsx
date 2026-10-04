'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Job, Company, Application } from '@/types';
import { fetchRecruiterJobs, fetchRecruiterCompany, fetchJobApplications } from '@/lib/api';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { MetricCard } from '@/components/recruiter/MetricCard';
import { CompanyVerificationBanner } from '@/components/recruiter/CompanyVerificationBanner';
import { SuspensionBanner } from '@/components/recruiter/SuspensionBanner';
import { AppealModal } from '@/components/recruiter/AppealModal';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
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

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
        <MetricCard
          label={locale === 'vi' ? 'Tin Đang Tuyển' : 'Active Postings'}
          value={publishedJobs.length}
          subtext={locale === 'vi' ? `Trên tổng số ${jobs.length} tin` : `Out of ${jobs.length} total jobs`}
          icon={Briefcase}
          variant="primary"
          loading={isLoading}
        />
        <MetricCard
          label={locale === 'vi' ? 'Tổng Hồ Sơ Ứng Tuyển' : 'Total Applications'}
          value={applications.length}
          subtext={locale === 'vi' ? 'Nhận qua các bài tuyển dụng' : 'Across all company postings'}
          icon={Users}
          variant="success"
          loading={isLoading}
        />
        <MetricCard
          label={locale === 'vi' ? 'Hồ Sơ Chờ Xử Lý' : 'Pending Review'}
          value={submittedApps.length}
          subtext={locale === 'vi' ? 'Cần đánh giá và sàng lọc' : 'Awaiting human decision'}
          icon={Clock}
          variant={submittedApps.length > 0 ? 'warning' : 'neutral'}
          badge={submittedApps.length > 0 ? (locale === 'vi' ? 'Cần xem' : 'Action needed') : undefined}
          loading={isLoading}
        />
        <MetricCard
          label={locale === 'vi' ? 'Tin Đang Soạn' : 'Draft Requisitions'}
          value={draftJobs.length}
          subtext={locale === 'vi' ? 'Chưa xuất bản công khai' : 'Unpublished drafts'}
          icon={FileText}
          variant="neutral"
          loading={isLoading}
        />
      </div>

      {/* Action Items Block (Việc Cần Xử Lý) */}
      {(submittedApps.length > 0 || draftJobs.length > 0 || company?.verificationStatus !== 'VERIFIED') && !isLoading && (
        <div className="p-5 rounded-2xl bg-[#EFF6FF] dark:bg-[#111C38] border border-[#DBEAFE] dark:border-[#1E3A5F] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A5F] dark:text-[#93C5FD] uppercase tracking-wider font-mono">
            <AlertCircle className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>{locale === 'vi' ? 'Việc Cần Xử Lý Ngay' : 'Pending Action Items'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full min-w-0">
            {submittedApps.length > 0 && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#0B1329] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs flex items-center justify-between gap-3 min-w-0">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold text-[#0F2A52] dark:text-white truncate">
                    {submittedApps.length} {locale === 'vi' ? 'hồ sơ mới nộp' : 'new applications'}
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                    {locale === 'vi' ? 'Cần xem xét đối sánh và xếp hạng' : 'Need review & score inspection'}
                  </p>
                </div>
                <Link
                  href="/recruiter/pipeline"
                  className="p-1.5 rounded-lg bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#DBEAFE] transition shrink-0"
                  title={locale === 'vi' ? 'Đến quy trình' : 'Go to pipeline'}
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {draftJobs.length > 0 && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#0B1329] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs flex items-center justify-between gap-3 min-w-0">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold text-[#0F2A52] dark:text-white truncate">
                    {draftJobs.length} {locale === 'vi' ? 'bài tuyển dụng nháp' : 'draft job postings'}
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                    {locale === 'vi' ? 'Hoàn thiện rubric và xuất bản' : 'Complete rubric & publish'}
                  </p>
                </div>
                <Link
                  href="/recruiter/jobs"
                  className="p-1.5 rounded-lg bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#DBEAFE] transition shrink-0"
                  title={locale === 'vi' ? 'Quản lý tin' : 'Manage jobs'}
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {company && company.verificationStatus !== 'VERIFIED' && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#0B1329] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs flex items-center justify-between gap-3 min-w-0">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold text-[#F59E0B] dark:text-[#FACC15] truncate">
                    {locale === 'vi' ? 'Chưa xác minh doanh nghiệp' : 'Pending Company Verification'}
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                    {locale === 'vi' ? 'Cần xác minh để xuất bản tin công khai' : 'Verification required to publish'}
                  </p>
                </div>
                <Link
                  href="/recruiter/company"
                  className="p-1.5 rounded-lg bg-[#FEF3C7] dark:bg-[#FACC15]/20 text-[#B45309] dark:text-[#FACC15] hover:bg-[#FDE68A] transition shrink-0"
                  title={locale === 'vi' ? 'Hồ sơ công ty' : 'Company profile'}
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Grid: Recent Jobs + Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
        {/* Left Column: Recent Jobs (2 cols wide) */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
              <h2 className="text-base font-bold text-[#0F2A52] dark:text-white">
                {locale === 'vi' ? 'Tin Tuyển Dụng Gần Đây' : 'Recent Job Openings'}
              </h2>
            </div>
            <Link
              href="/recruiter/jobs"
              className="text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1"
            >
              <span>{locale === 'vi' ? 'Xem tất cả' : 'View all'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] animate-pulse" />
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] text-center space-y-3">
              <Briefcase className="w-10 h-10 text-[#94A3B8] mx-auto opacity-40" />
              <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                {locale === 'vi' ? 'Chưa có bài tuyển dụng nào được tạo.' : 'No job postings created yet.'}
              </div>
              <Link
                href="/recruiter/jobs/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{locale === 'vi' ? 'Tạo tin đầu tiên' : 'Create first job'}</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => {
                const jobAppCount = applications.filter((a) => a.job?.id === job.id).length;
                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#3B82F6] shadow-xs transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              job.status === 'PUBLISHED'
                                ? 'bg-[#E8F8EE] dark:bg-[#00B14F]/15 text-[#00B14F] dark:text-[#10B981] border border-[#00B14F]/30'
                                : job.status === 'DRAFT'
                                ? 'bg-[#FEF3C7] dark:bg-[#FACC15]/15 text-[#B45309] dark:text-[#FACC15] border border-[#FACC15]/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {job.status}
                          </span>
                          <span className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                            {job.industry}
                          </span>
                          <span className="text-[11px] text-[#94A3B8]">•</span>
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            {job.location || 'Toàn quốc'}
                          </span>
                        </div>
                        <Link
                          href={`/recruiter/jobs/${job.id}`}
                          className="text-sm font-bold text-[#0F2A52] dark:text-white hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition block truncate"
                        >
                          {job.title}
                        </Link>
                      </div>

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
