'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job, Application } from '@/types';
import { fetchRecruiterJobs, fetchJobApplications } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { MetricCard } from '@/components/recruiter/MetricCard';
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  CheckCircle2,
  Calendar,
  Briefcase,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export default function RecruiterAnalyticsPage() {
  const { t, locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRecruiterJobs()
      .then(async (jobList) => {
        setJobs(jobList);
        const appsPromises = jobList.map(j => fetchJobApplications(j.id).catch(() => []));
        const results = await Promise.all(appsPromises);
        const flattened = results.flat();
        setAllApplications(flattened);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] p-12 text-center text-slate-500 flex items-center justify-center">
        <EmptyState
          type="LOADING"
          title={locale === 'vi' ? 'Đang phân tích dữ liệu tuyển dụng...' : 'Calculating recruitment analytics...'}
          description={locale === 'vi' ? 'Hệ thống đang tổng hợp dữ liệu phễu chuyển đổi và điểm số đối sánh...' : 'Aggregating conversion funnel and match scores...'}
        />
      </div>
    );
  }

  const totalApps = allApplications.length;
  const submittedCount = allApplications.filter(a => a.status === 'SUBMITTED').length;
  const shortlistedCount = allApplications.filter(a => a.status === 'SHORTLISTED').length;
  const interviewingCount = allApplications.filter(a => a.status === 'INTERVIEWING').length;
  const hiredCount = allApplications.filter(a => a.status === 'HIRED').length;
  const rejectedCount = allApplications.filter(a => a.status === 'REJECTED').length;

  const shortlistRate = totalApps > 0 ? ((shortlistedCount / totalApps) * 100).toFixed(1) : '0';
  const interviewRate = totalApps > 0 ? ((interviewingCount / totalApps) * 100).toFixed(1) : '0';
  const hireRate = totalApps > 0 ? ((hiredCount / totalApps) * 100).toFixed(1) : '0';

  // AI Matching Analytics
  const scoredApps = allApplications.filter(a => a.matchScore != null && (a.matchScore as number) > 0);
  const avgScore = scoredApps.length > 0
    ? (scoredApps.reduce((acc, curr) => acc + (curr.matchScore || 0), 0) / scoredApps.length).toFixed(1)
    : 'N/A';
  const highMatchCount = scoredApps.filter(a => (a.matchScore || 0) >= 80).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col transition-colors pb-20">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
        {/* Recruiter Header */}
        <RecruiterPageHeader
          title={locale === 'vi' ? 'Phân Tích & Hiệu Suất Tuyển Dụng' : 'Recruitment Analytics & Insights'}
          subtitle={locale === 'vi' ? 'Theo dõi phễu chuyển đổi hồ sơ, hiệu quả đối sánh AI và năng lực đáp ứng của ứng viên' : 'Track applicant conversion funnel, AI match performance, and hiring velocity'}
          categoryTag="Talent Intelligence"
        />

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label={locale === 'vi' ? 'Tổng lượt ứng tuyển' : 'Total Applications'}
            value={totalApps}
            subtext={locale === 'vi' ? 'Trên tất cả các tin' : 'Across all jobs'}
            icon={Users}
            variant="primary"
          />
          <MetricCard
            label={locale === 'vi' ? 'Tỷ lệ Phù hợp hồ sơ' : 'Shortlist Rate'}
            value={`${shortlistRate}%`}
            subtext={locale === 'vi' ? `${shortlistedCount} ứng viên đạt chuẩn` : `${shortlistedCount} candidates`}
            icon={TrendingUp}
            variant="success"
          />
          <MetricCard
            label={locale === 'vi' ? 'Ứng viên Phỏng vấn' : 'In Interview'}
            value={interviewingCount}
            subtext={locale === 'vi' ? `${interviewRate}% trên tổng nộp` : `${interviewRate}% conversion`}
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

        {/* Recruitment Conversion Funnel */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Phễu Tuyển Dụng Tổng Hợp (Hiring Conversion Funnel)' : 'Hiring Conversion Funnel'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'vi' ? 'Tỷ lệ tiến triển qua các chặng đánh giá nhân sự của MidCV' : 'Candidate progression through evaluation stages'}
              </p>
            </div>
            <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full font-semibold">
              Live Pipeline Data
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Step 1: Submitted */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">1. Nộp hồ sơ</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{totalApps}</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-full rounded-full" />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">100% Khởi điểm</span>
            </div>

            {/* Step 2: Shortlisted */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">2. Duyệt hồ sơ</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{shortlistedCount}</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${shortlistRate}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">{shortlistRate}% chuyển đổi</span>
            </div>

            {/* Step 3: Interviewing */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">3. Phỏng vấn</span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">{interviewingCount}</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${interviewRate}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">{interviewRate}% chuyển đổi</span>
            </div>

            {/* Step 4: Hired */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">4. Tuyển dụng</span>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400 font-mono">{hiredCount}</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-600 h-full rounded-full" style={{ width: `${hireRate}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">{hireRate}% tuyển dụng</span>
            </div>

            {/* Step 5: Rejected */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Chưa phù hợp</span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">{rejectedCount}</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: totalApps > 0 ? `${(rejectedCount / totalApps) * 100}%` : '0%' }} />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Đã lưu trữ hồ sơ</span>
            </div>
          </div>
        </div>

        {/* AI Match Quality Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Chất Lượng Đối Sánh AI (Semantic Match Quality)' : 'AI Semantic Match Quality'}
              </h4>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">{avgScore}%</span>
              <span className="text-xs text-slate-500">Điểm tương thích trung bình toàn bộ hồ sơ</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {locale === 'vi'
                ? `Có ${highMatchCount} ứng viên đạt ngưỡng Match Cao (≥ 80.0%), đảm bảo chất lượng ứng viên đầu vào phù hợp với tiêu chí JD.`
                : `${highMatchCount} candidates achieved High Match threshold (≥ 80.0%), validating job criteria precision.`}
            </p>
          </div>

          <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Năng Lực Tuyển Dụng Doanh Nghiệp' : 'Recruitment Capacity'}
              </h4>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{jobs.length}</span>
              <span className="text-xs text-slate-500">Tổng số tin tuyển dụng đã tạo</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {locale === 'vi'
                ? `Đang có ${jobs.filter(j => j.status === 'PUBLISHED').length} tin xuất bản công khai và ${jobs.filter(j => j.status === 'DRAFT').length} tin đang ở trạng thái bản nháp.`
                : `${jobs.filter(j => j.status === 'PUBLISHED').length} published active jobs and ${jobs.filter(j => j.status === 'DRAFT').length} drafts.`}
            </p>
          </div>
        </div>

        {/* Job Performance Breakdown Table */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {locale === 'vi' ? 'Hiệu Suất Tuyển Dụng Từng Vị Trí' : 'Performance by Job Opening'}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B1329] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono uppercase text-[11px]">
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          job.status === 'PUBLISHED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-mono font-bold">{jobApps.length}</td>
                      <td className="py-4 px-5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">{shortlisted}</td>
                      <td className="py-4 px-5 text-center font-mono text-blue-600 dark:text-blue-400 font-bold">{hired}</td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/recruiter/jobs/${job.id}/applications`}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold text-xs"
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
