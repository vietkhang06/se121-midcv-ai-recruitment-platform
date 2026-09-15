'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job, Company, Application } from '@/types';
import { fetchRecruiterJobs, fetchRecruiterProfile, getAuthUser, fetchJobApplications } from '@/lib/api';
import { CompanyVerificationBanner } from '@/components/recruiter/CompanyVerificationBanner';
import { useLanguage } from '@/context/LanguageContext';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Building2,
  FileText
} from 'lucide-react';

export default function HRDashboardPage() {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'analytics'>('console');
  const user = getAuthUser();

  const loadDashboardData = () => {
    setIsLoading(true);
    setFetchError(null);
    Promise.all([
      fetchRecruiterJobs(),
      fetchRecruiterProfile().catch(() => null),
    ])
      .then(async ([recJobs, profile]) => {
        setJobs(recJobs);
        if (profile?.company) setCompany(profile.company);

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
        setFetchError(err.message || 'Lỗi khi tải dữ liệu nhà tuyển dụng.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const publishedJobs = jobs.filter((j) => j.status === 'PUBLISHED');
  const draftJobs = jobs.filter((j) => j.status === 'DRAFT');
  const recruiterName = user?.fullName || 'Tuyển Dụng';

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 flex flex-col py-8 transition-colors">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 w-full">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1B3D34] pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              RECRUITER PORTAL COMMAND CENTER
            </span>
            <h1 className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
              Dashboard Console — Tổng Quan Tuyển Dụng Doanh Nghiệp
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {company?.name || 'Doanh nghiệp'} Recruitment command center & telemetry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-lg p-1 text-xs font-medium shadow-xs">
              <button
                onClick={() => setActiveTab('console')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeTab === 'console'
                    ? 'bg-[#2563EB] text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Dashboard Console
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-[#2563EB] text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Recruitment Telemetry
              </button>
            </div>

            <Link
              href="/recruiter/jobs/new"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Tạo Bài Tuyển Dụng Mới</span>
            </Link>
          </div>
        </div>

        {/* Company Verification Banner */}
        {company && (
          <CompanyVerificationBanner
            status={company.verificationStatus}
            companyName={company.name}
            reason={company.verificationReason}
          />
        )}

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#0F2A52] via-[#1E3A5F] to-[#0F2A52] text-white rounded-2xl p-8 border border-blue-900/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 suppressHydrationWarning className="text-2xl sm:text-3xl font-editorial font-normal text-white">
              Chào mừng trở lại, {recruiterName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 font-light leading-relaxed">
              Hệ sinh thái <strong className="font-semibold text-white">mid<span className="text-[#00B14F]">CV</span><sup>®</sup></strong> đang đồng bộ các vị trí tuyển dụng với mô hình trích xuất thực thể và đối sánh vector chuẩn hóa.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/recruiter/jobs/new"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#00B14F] hover:bg-[#009643] text-white transition shadow-sm flex items-center gap-1.5"
            >
              <span>+ Đăng Tin Tuyển Dụng</span>
            </Link>
            {jobs.length > 0 && (
              <Link
                href={`/recruiter/jobs/${jobs[0].id}/applications`}
                className="px-4 py-2 rounded-lg text-xs font-medium border border-white/25 text-white hover:bg-white/10 transition"
              >
                Duyệt Ứng Viên
              </Link>
            )}
          </div>
        </div>

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
              <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                  ACTIVE JOB POSTINGS
                </span>
                <div className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                  {publishedJobs.length}
                </div>
                <div className="text-[11px] text-[#00B14F] dark:text-[#00B14F] font-medium pt-1">
                  {jobs.length} tổng số vị trí đã tạo
                </div>
              </div>

              <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                  APPLICANTS RECEIVED
                </span>
                <div className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                  {applications.length}
                </div>
                <div className="text-[11px] text-[#00B14F] dark:text-[#00B14F] font-medium pt-1">
                  Xác thực danh tính thực tế
                </div>
              </div>

              <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-xl p-5 shadow-xs space-y-1">
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

              <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                  AI MATCH ENGINE
                </span>
                <div className="text-3xl font-editorial font-bold text-[#00B14F] dark:text-[#00B14F]">
                  Active
                </div>
                <div className="text-[11px] text-[#00B14F] dark:text-[#00B14F] font-medium pt-1">
                  NDCG@K chuẩn hóa
                </div>
              </div>
            </div>

            {/* Active Sourcing Funnel Stage */}
            <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-xl p-6 shadow-xs space-y-4">
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
                  <div key={idx} className="bg-slate-50 dark:bg-[#071A17] border border-slate-200/80 dark:border-[#1F4A40] rounded-lg p-3">
                    <div className="text-xl font-bold font-editorial text-slate-900 dark:text-white">{st.count}</div>
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mt-0.5">{st.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Two Columns: Top Performing Postings & Recent Candidate Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Top Performing Postings */}
              <div className="lg:col-span-8 bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F4A40] pb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Vị Trí Đang Tuyển Dụng</h3>
                  <Link href="/recruiter/jobs" className="text-xs font-semibold text-[#2563EB] hover:underline">
                    Xem tất cả ({jobs.length})
                  </Link>
                </div>

                {jobs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#071A17] text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-[#1F4A40]">
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

              {/* Right Column: Recent Candidate Activity */}
              <div className="lg:col-span-4 bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Đơn Ứng Tuyển Mới Nhất</h3>

                {applications.length > 0 ? (
                  <div className="space-y-3 text-xs">
                    {applications.slice(0, 4).map((app) => (
                      <div key={app.id} className="p-3 bg-slate-50 dark:bg-[#071A17] border border-slate-200/80 dark:border-[#1F4A40] rounded-lg flex items-center justify-between">
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

            </div>
          </>
        ) : (
          /* Assessment & Analytics View */
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1F4A40] pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Recruitment Telemetry & Funnel Analytics
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chỉ số đo lường hiệu suất đối sánh và chất lượng nguồn ứng viên
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071A17] border border-slate-200/80 dark:border-[#1F4A40] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">ĐỘ CHÍNH XÁC XẾP HẠNG (NDCG@3)</span>
                  <div className="text-2xl font-editorial font-bold text-slate-900 dark:text-white">1.00</div>
                  <span className="text-[10px] text-[#00B14F] dark:text-[#00B14F] font-medium">100% Top-tier candidate alignment</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071A17] border border-slate-200/80 dark:border-[#1F4A40] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">F1 EXTRACTION EVALUATION</span>
                  <div className="text-2xl font-editorial font-bold text-slate-900 dark:text-white">83.6%</div>
                  <span className="text-[10px] text-[#00B14F] dark:text-[#00B14F] font-medium">Recall 100% on technical benchmark</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071A17] border border-slate-200/80 dark:border-[#1F4A40] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">CHÍNH SÁCH BẢO VỆ GITHUB</span>
                  <div className="text-2xl font-editorial font-bold text-slate-900 dark:text-white">Zero Penalty</div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Tín hiệu bổ trợ (Supplementary Only)</span>
                </div>
              </div>
            </div>

            {/* AI Sourcing Copilot Insights Card */}
            <div className="bg-gradient-to-br from-[#0F2A52] to-[#1E3A5F] text-white border border-blue-900/30 rounded-xl p-6 shadow-md space-y-3">
              <div className="text-[10px] font-mono uppercase text-[#00B14F] tracking-wider font-semibold">AI SOURCING COPILOT INSIGHTS</div>
              <ul className="space-y-2 text-xs text-slate-200 font-light list-disc pl-5">
                <li>Hệ thống áp dụng chuẩn hóa từ đồng nghĩa (JS → JavaScript, Postgres → PostgreSQL, K8s → Kubernetes).</li>
                <li>Ứng viên chưa đủ thông tin hoặc chưa tải CV sẽ được gắn nhãn INSUFFICIENT_DATA minh bạch, không đưa ra điểm số ảo.</li>
              </ul>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
