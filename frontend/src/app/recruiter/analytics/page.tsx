'use client';

import { displayJobStatus } from '@/lib/jobDeadline';
import { statusLabel } from '@/lib/statusLabels';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUSES, applicationsLoadMessage, loadApplicationsForJobs } from '@/lib/applicationWorkflow';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job, Application } from '@/types';
import { fetchRecruiterJobs, fetchJobApplications } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { MatchMetricsCard } from '@/components/recruiter/MatchMetricsCard';
import { MetricCard } from '@/components/recruiter/MetricCard';
import {
  TrendingUp,
  Users,
  Award,
  Calendar,
  Briefcase,
  ArrowRight
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export default function RecruiterAnalyticsPage() {
  const { locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const jobList = await fetchRecruiterJobs();
      const applications = await loadApplicationsForJobs(jobList, fetchJobApplications);
      setJobs(jobList);
      setAllApplications(applications);
    } catch (error: unknown) {
      console.error('Failed to load analytics:', error);
      setError(applicationsLoadMessage(error, locale));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const jobList = await fetchRecruiterJobs();
        const applications = await loadApplicationsForJobs(jobList, fetchJobApplications);
        if (!active) return;
        setJobs(jobList);
        setAllApplications(applications);
      } catch (error: unknown) {
        if (!active) return;
        console.error('Failed to load analytics:', error);
        setError(applicationsLoadMessage(error, locale));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInitialData();
    return () => { active = false; };
  }, [locale]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] p-12 text-center text-slate-500 flex items-center justify-center">
        <EmptyState
          type="LOADING"
          title={locale === 'vi' ? 'Đang phân tích dữ liệu tuyển dụng...' : 'Calculating recruitment analytics...'}
          description={locale === 'vi' ? 'Hệ thống đang tổng hợp dữ liệu phân bố hồ sơ hiện tại và điểm số đối sánh...' : 'Aggregating current distribution and match scores...'}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] p-12 text-center flex flex-col items-center justify-center space-y-4">
        <EmptyState
          type="ERROR"
          title={locale === 'vi' ? 'Lỗi tải phân tích' : 'Analytics Load Error'}
          description={error}
        />
        <button
          onClick={loadData}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
        >
          {locale === 'vi' ? 'Thử lại' : 'Retry'}
        </button>
      </div>
    );
  }

  const totalApps = allApplications.length;
  const shortlistedCount = allApplications.filter(a => a.status === 'SHORTLISTED').length;
  const interviewingCount = allApplications.filter(a => a.status === 'INTERVIEWING').length;
  const hiredCount = allApplications.filter(a => a.status === 'HIRED').length;

  const shortlistRate = totalApps > 0 ? ((shortlistedCount / totalApps) * 100).toFixed(1) : '0';
  const interviewRate = totalApps > 0 ? ((interviewingCount / totalApps) * 100).toFixed(1) : '0';
  const hireRate = totalApps > 0 ? ((hiredCount / totalApps) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[var(--surface-secondary)] text-[var(--heading)] flex flex-col transition-colors pb-20 w-full min-w-0">
      <main className="flex-1 w-full max-w-7xl min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Recruiter Header */}
        <RecruiterPageHeader
          title={locale === 'vi' ? 'Phân Tích & Hiệu Suất Tuyển Dụng' : 'Recruitment Analytics & Insights'}
          subtitle={locale === 'vi' ? 'Theo dõi phân bố hồ sơ hiện tại, hiệu quả đối sánh AI và năng lực đáp ứng của ứng viên' : 'View current application distribution and match scores'}
          categoryTag="Talent Intelligence"
        />

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
          <MetricCard
            label={locale === 'vi' ? 'Tổng lượt ứng tuyển' : 'Total Applications'}
            value={totalApps}
            subtext={locale === 'vi' ? 'Trên tất cả các tin' : 'Across all jobs'}
            icon={Users}
            variant="primary"
          />
          <MetricCard
            label={locale === 'vi' ? 'Tỷ trọng đang ở danh sách chọn' : 'Current shortlist share'}
            value={`${shortlistRate}%`}
            subtext={locale === 'vi' ? `${shortlistedCount} hồ sơ ở vòng này` : `${shortlistedCount} candidates`}
            icon={TrendingUp}
            variant="success"
          />
          <MetricCard
            label={locale === 'vi' ? 'Ứng viên Phỏng vấn' : 'In Interview'}
            value={interviewingCount}
            subtext={locale === 'vi' ? `${interviewRate}% trên tổng nộp` : `${interviewRate}% of applications`}
            icon={Calendar}
            variant="warning"
          />
          <MetricCard
            label={locale === 'vi' ? 'Ứng viên Tuyển dụng' : 'Hired Candidates'}
            value={hiredCount}
            subtext={locale === 'vi' ? `Tỷ lệ tuyển: ${hireRate}%` : `${hireRate}% hire rate`}
            icon={Award}
            variant="primary"
          />
        </div>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="text-base font-bold">
            {locale === 'vi' ? 'Phân bố hồ sơ hiện tại' : 'Current application distribution'}
          </h3>
          <ul className="mt-4 space-y-3">
            {[...APPLICATION_STATUSES, 'UNKNOWN' as const].map(status => {
              const count = allApplications.filter(app => app.status === status).length;
              const share = totalApps ? (count / totalApps) * 100 : 0;
              return (
                <li key={status} className="flex justify-between border-b border-[var(--border-soft)] pb-2 text-sm">
                  <span>{APPLICATION_STATUS_LABELS[status][locale === 'vi' ? 0 : 1]}</span>
                  <span>{count} ({share.toFixed(1)}%)</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* AI Match Quality Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MatchMetricsCard applications={allApplications} locale={locale} />

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-3">
              <Briefcase className="w-5 h-5 text-[var(--primary)]" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Năng Lực Tuyển Dụng Doanh Nghiệp' : 'Recruitment Capacity'}
              </h4>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-[var(--primary)] font-sans">{jobs.length}</span>
              <span className="text-xs text-slate-500">Tổng số tin tuyển dụng đã tạo</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {locale === 'vi'
                ? `Đang có ${jobs.filter(j => displayJobStatus(j) === 'PUBLISHED').length} tin xuất bản công khai và ${jobs.filter(j => j.status === 'DRAFT').length} tin đang ở trạng thái bản nháp.`
                : `${jobs.filter(j => displayJobStatus(j) === 'PUBLISHED').length} published active jobs and ${jobs.filter(j => j.status === 'DRAFT').length} drafts.`}
            </p>
          </div>
        </div>

        {/* Job Performance Breakdown Table */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[var(--border-soft)]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {locale === 'vi' ? 'Hiệu Suất Tuyển Dụng Từng Vị Trí' : 'Performance by Job Opening'}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--surface-secondary)] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-sans uppercase text-[11px]">
                  <th className="py-3 px-5">Vị trí tuyển dụng</th>
                  <th className="py-3 px-5 text-center">Trạng thái</th>
                  <th className="py-3 px-5 text-center">Tổng đơn nộp</th>
                  <th className="py-3 px-5 text-center">Đã duyệt</th>
                  <th className="py-3 px-5 text-center">Đã tuyển</th>
                  <th className="py-3 px-5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {jobs.map(job => {
                  const jobApps = allApplications.filter(a => a.job?.id === job.id);
                  const shortlisted = jobApps.filter(a => a.status === 'SHORTLISTED').length;
                  const hired = jobApps.filter(a => a.status === 'HIRED').length;
                  return (
                    <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-900 dark:text-white block">{job.title}</span>
                        <span className="text-[11px] text-slate-400">{job.industry} • {job.location || 'Remote'}</span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                          displayJobStatus(job) === 'PUBLISHED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200'
                        }`}>
                          {statusLabel(displayJobStatus(job), locale)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-sans font-bold">{jobApps.length}</td>
                      <td className="py-4 px-5 text-center font-sans text-emerald-600 dark:text-emerald-400 font-bold">{shortlisted}</td>
                      <td className="py-4 px-5 text-center font-sans text-[var(--primary)] font-bold">{hired}</td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/recruiter/jobs/${job.id}/applications`}
                          className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline font-semibold text-xs"
                        >
                          <span>Xem Pipeline</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
