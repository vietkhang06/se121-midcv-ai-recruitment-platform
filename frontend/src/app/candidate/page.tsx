'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  fetchCandidateProfile,
  fetchCVQuota,
  fetchCandidateCVs,
  fetchCandidateApplications,
  fetchJobs
} from '@/lib/api';
import {
  CandidateProfile,
  CV,
  Application,
  Job,
  CVQuota
} from '@/types';
import {
  Sparkles,
  FileText,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  ShieldCheck,
  GitBranch,
  Award,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export default function CandidateDashboardPage() {
  const { user } = useAuth();
  const { locale } = useLanguage();

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [quota, setQuota] = useState<CVQuota | null>(null);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profData, quotaData, cvsData, appsData, jobsData] = await Promise.all([
        fetchCandidateProfile().catch(() => null),
        fetchCVQuota().catch(() => null),
        fetchCandidateCVs().catch(() => []),
        fetchCandidateApplications().catch(() => []),
        fetchJobs().catch(() => [])
      ]);

      setProfile(profData);
      setQuota(quotaData);
      setCvs(cvsData);
      setApplications(appsData);
      // Filter published jobs for discovery recommendations (top 3)
      setRecommendedJobs(jobsData.filter(j => j.status === 'PUBLISHED').slice(0, 3));
    } catch (err: any) {
      console.error('Failed to load candidate dashboard:', err);
      setError(err?.message || (locale === 'vi' ? 'Không thể tải dữ liệu bảng điều khiển ứng viên' : 'Failed to load candidate dashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Deterministic Profile Completeness Calculation based on real fields
  const calculateCompleteness = (p: CandidateProfile | null) => {
    if (!p) return 0;
    let score = 0;
    if (p.fullName?.trim()) score += 15;
    if (p.email?.trim()) score += 10;
    if (p.phone?.trim()) score += 10;
    if (p.location?.trim()) score += 10;
    if ((p.targetRoles && p.targetRoles.length > 0) || p.primaryIndustry) score += 15;
    if (p.bio?.trim()) score += 10;
    if (p.skills && p.skills.length > 0) score += 15;
    if (p.githubUsername?.trim() || p.githubUrl?.trim()) score += 15;
    return Math.min(100, score);
  };

  const completeness = calculateCompleteness(profile);

  // Application Pipeline Metrics (Derived from Real API Data)
  const totalApps = applications.length;
  const shortlistedApps = applications.filter(a => a.status === 'SHORTLISTED');
  const interviewingApps = applications.filter(a => a.status === 'INTERVIEWING');
  const hiredApps = applications.filter(a => a.status === 'HIRED');

  // Real matching evaluations if present
  const scoredApps = applications.filter(a => a.matchScore != null && (a.matchScore as number) > 0);
  const topScoredApp = scoredApps.length > 0
    ? [...scoredApps].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))[0]
    : null;

  const candidateDisplayName = profile?.fullName || user?.fullName || user?.email?.split('@')[0] || (locale === 'vi' ? 'Ứng viên' : 'Candidate');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-44 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1329] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#111C38] border border-rose-200 dark:border-rose-900/60 shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {locale === 'vi' ? 'Không thể tải dữ liệu Tổng quan' : 'Failed to Load Dashboard'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error}
          </p>
          <button
            onClick={loadDashboardData}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{locale === 'vi' ? 'Thử lại' : 'Retry'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 transition-colors pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">

        {/* 1. Candidate Hero Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F2A52] via-[#173B73] to-[#2563EB] p-6 sm:p-8 text-white shadow-xl animate-fade-in-up">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider bg-white/10 text-blue-200 border border-white/20 uppercase">
                  CANDIDATE TALENT PORTAL
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#E8F8EE] text-[#009643] border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-[#00B14F] animate-pulse" />
                  {quota?.plan === 'PRO' ? 'Gói midCV Pro (5 CVs)' : 'Gói Tiêu Chuẩn (3 CVs)'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {locale === 'vi' ? `Xin chào, ${candidateDisplayName} 👋` : `Welcome back, ${candidateDisplayName} 👋`}
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
                {locale === 'vi'
                  ? 'Theo dõi trạng thái đối sánh AI, quản lý hạn ngạch CV và cập nhật tiến trình ứng tuyển vào các doanh nghiệp.'
                  : 'Track your AI match accuracy, manage CV quotas, and monitor application milestones across active employers.'}
              </p>
            </div>

            {/* Quick Actions in Hero */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                href="/candidate/cvs/builder"
                className="px-4 py-2.5 rounded-xl bg-white text-[#0F2A52] hover:bg-blue-50 text-xs font-bold transition flex items-center gap-2 shadow-sm whitespace-nowrap active:scale-95"
              >
                <Plus className="w-4 h-4 text-[#2563EB]" />
                <span>{locale === 'vi' ? 'Tạo CV Mới' : 'New Resume'}</span>
              </Link>
              <Link
                href="/jobs"
                className="px-4 py-2.5 rounded-xl bg-blue-700/60 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 border border-white/20 whitespace-nowrap active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>{locale === 'vi' ? 'Khám Phá Việc Làm' : 'Browse Jobs'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. 4 Core Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 animate-fade-in-up stagger-1">
          {/* Card 1: CV Quota Usage */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 card-hover-lift">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-[#3B82F6]">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#3B82F6]">
                {quota?.plan || 'STANDARD'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {quota ? `${quota.currentCount} / ${quota.maxLimit}` : `${cvs.length} CVs`}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === 'vi'
                  ? `Còn lại ${quota ? quota.remainingSlots : 0} lượt tạo CV`
                  : `${quota ? quota.remainingSlots : 0} CV slots remaining`}
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${quota ? Math.min(100, (quota.currentCount / quota.maxLimit) * 100) : 0}%`
                }}
              />
            </div>
          </div>

          {/* Card 2: Profile Completeness */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 card-hover-lift">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                {completeness >= 80 ? 'EXCELLENT' : completeness >= 50 ? 'GOOD' : 'NEEDS WORK'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {completeness}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === 'vi' ? 'Mức độ hoàn thiện hồ sơ' : 'Profile completeness'}
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>

          {/* Card 3: Inbound Applications */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 card-hover-lift">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
                APPLICATIONS
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {totalApps}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === 'vi'
                  ? `${shortlistedApps.length} hồ sơ được duyệt`
                  : `${shortlistedApps.length} shortlisted`}
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalApps > 0 ? (shortlistedApps.length / totalApps) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Card 4: Top Match Score */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 card-hover-lift">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#00B14F] dark:text-emerald-400">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[#009643] dark:text-emerald-400">
                MATCH SIGNAL
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {topScoredApp?.matchScore != null ? `${topScoredApp.matchScore}%` : 'N/A'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {topScoredApp
                  ? (locale === 'vi' ? `Điểm cao nhất: ${topScoredApp.job?.title || 'Công việc'}` : `Best match: ${topScoredApp.job?.title || 'Job'}`)
                  : (locale === 'vi' ? 'Chưa có điểm đối sánh' : 'No scored applications')}
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#00B14F] h-full rounded-full transition-all duration-500"
                style={{ width: `${topScoredApp?.matchScore || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Main Dashboard 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column (8 cols): Applications Pipeline & CV Repository */}
          <div className="lg:col-span-8 space-y-8">

            {/* Section: Application Pipeline */}
            <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 animate-fade-in-up stagger-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {locale === 'vi' ? 'Tiến Trình Ứng Tuyển Của Bạn' : 'Active Applications'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {locale === 'vi' ? 'Trạng thái chuyển vòng và kết quả đối sánh từ nhà tuyển dụng' : 'Stage progression and AI evaluation records'}
                  </p>
                </div>
                <Link
                  href="/candidate/applications"
                  className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  <span>{locale === 'vi' ? 'Xem tất cả' : 'View all'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {applications.length === 0 ? (
                <EmptyState
                  type="EMPTY"
                  title={locale === 'vi' ? 'Chưa có đơn ứng tuyển nào' : 'No applications submitted yet'}
                  description={locale === 'vi' ? 'Khám phá các vị trí tuyển dụng phù hợp và nộp CV để nhận báo cáo đối sánh AI chi tiết.' : 'Discover open jobs and apply with your verified CV to receive deterministic match scores.'}
                  primaryCtaText={locale === 'vi' ? 'Tìm việc làm ngay' : 'Explore Jobs'}
                  primaryCtaHref="/jobs"
                />
              ) : (
                <div className="space-y-3.5">
                  {applications.slice(0, 4).map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#13233F]/50 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2563EB] transition card-hover-lift"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {app.job?.title || (locale === 'vi' ? 'Vị trí tuyển dụng' : 'Job Opening')}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            app.status === 'SHORTLISTED'
                              ? 'bg-emerald-50 text-[#009643] dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                              : app.status === 'INTERVIEWING'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200'
                              : app.status === 'HIRED'
                              ? 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-[#3B82F6] border border-blue-200'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {app.job?.companyName || 'Doanh nghiệp'} • {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : 'Gần đây'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        {app.matchScore != null && (
                          <div className="text-right">
                            <span className="text-[10px] font-mono uppercase text-slate-400 block">Match Score</span>
                            <span className="font-mono font-bold text-sm text-[#00B14F] dark:text-emerald-400">
                              {app.matchScore}%
                            </span>
                          </div>
                        )}
                        <Link
                          href={`/candidate/applications`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#2563EB] transition"
                        >
                          Chi tiết →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: CV Repository Snapshot */}
            <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 animate-fade-in-up stagger-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {locale === 'vi' ? 'Thư Viện Hồ Sơ CV Của Bạn' : 'My CV Repository'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {locale === 'vi'
                      ? `Quản lý các phiên bản CV bất biến (Đã sử dụng ${quota?.currentCount || cvs.length}/${quota?.maxLimit || 3})`
                      : `Version-controlled CV snapshots (${quota?.currentCount || cvs.length}/${quota?.maxLimit || 3} slots)`}
                  </p>
                </div>
                <Link
                  href="/candidate/cvs"
                  className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  <span>{locale === 'vi' ? 'Quản lý kho CV' : 'Manage CVs'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {cvs.length === 0 ? (
                <EmptyState
                  type="EMPTY"
                  title={locale === 'vi' ? 'Chưa có CV nào trong tài khoản' : 'No CVs in your repository'}
                  description={locale === 'vi' ? 'Tạo mới hoặc tải lên CV để kích hoạt khả năng đối sánh tự động theo tiêu chí chuẩn hóa.' : 'Build or upload a CV to enable automated rubric matching against engineering jobs.'}
                  primaryCtaText={locale === 'vi' ? 'Tạo CV ngay' : 'Create Resume'}
                  primaryCtaHref="/candidate/cvs/builder"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cvs.map((cv) => (
                    <div
                      key={cv.id}
                      className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#13233F]/50 border border-slate-200/80 dark:border-slate-800 space-y-3 card-hover-lift"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#3B82F6]">
                          v{cv.currentVersionNumber || 1}.0
                        </span>
                        {cv.isDefault && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#009643] dark:text-emerald-400">
                            DEFAULT CV
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {cv.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {cv.targetRole || cv.targetIndustry || 'Technical Specialist'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {cv.updatedAt ? new Date(cv.updatedAt).toLocaleDateString() : 'Updated'}
                        </span>
                        <Link
                          href={`/candidate/cvs/builder?edit=${cv.id}`}
                          className="font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:underline"
                        >
                          Chỉnh sửa →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column (4 cols): Profile Readiness & GitHub Evidence */}
          <div className="lg:col-span-4 space-y-6">

            {/* Profile Completion Checklist */}
            <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 animate-fade-in-up stagger-4 card-hover-lift">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  <span>{locale === 'vi' ? 'Độ Hoàn Thiện Hồ Sơ' : 'Profile Completeness'}</span>
                </h3>
                <span className="font-mono font-bold text-xs text-[#2563EB] dark:text-[#3B82F6]">
                  {completeness}%
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { label: locale === 'vi' ? 'Họ và tên đầy đủ' : 'Full Name', done: !!profile?.fullName },
                  { label: locale === 'vi' ? 'Email xác thực' : 'Verified Email', done: !!profile?.email },
                  { label: locale === 'vi' ? 'Vị trí công tác mục tiêu' : 'Target Role Title', done: !!((profile?.targetRoles && profile.targetRoles.length > 0) || profile?.primaryIndustry) },
                  { label: locale === 'vi' ? 'Kỹ năng chuyên môn' : 'Technical Skills Catalog', done: (profile?.skills?.length || 0) > 0 },
                  { label: locale === 'vi' ? 'Liên kết GitHub' : 'GitHub Account Linked', done: !!(profile?.githubUsername || profile?.githubUrl) },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                    <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00B14F] shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <Link
                href="/candidate/profile"
                className="block text-center py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[#2563EB] dark:text-[#3B82F6] font-bold text-xs transition"
              >
                Cập nhật hồ sơ năng lực →
              </Link>
            </div>

            {/* GitHub Verification Card */}
            <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 animate-fade-in-up stagger-5 card-hover-lift">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-slate-800 dark:text-white" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    GitHub Signal
                  </h3>
                </div>
                {profile?.githubUsername ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-[#009643] border border-emerald-300">
                    LINKED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
                    NOT LINKED
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {profile?.githubUsername
                  ? `Đã liên kết với tài khoản @${profile.githubUsername}. Minh chứng commit và năng lực mã nguồn thực tế được bảo vệ tính toàn vẹn.`
                  : 'Liên kết kho mã nguồn GitHub để nhà tuyển dụng xác thực năng lực lập trình thực tế qua commit minh chứng.'}
              </p>

              {profile?.githubUsername ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>@{profile.githubUsername}</span>
                  <a
                    href={`https://github.com/${profile.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563EB] hover:underline flex items-center gap-1"
                  >
                    <span>Xem repo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <Link
                  href="/candidate/profile"
                  className="block text-center py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition"
                >
                  Kết nối GitHub ngay
                </Link>
              )}
            </div>

            {/* Recommended Openings Snapshot */}
            <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 animate-fade-in-up stagger-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>{locale === 'vi' ? 'Vị Trí Đang Mở Đơn' : 'Open Positions'}</span>
                </h3>
                <Link href="/jobs" className="text-xs font-semibold text-[#2563EB] hover:underline">
                  Xem tất cả
                </Link>
              </div>

              {recommendedJobs.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  {locale === 'vi' ? 'Hiện chưa có tin tuyển dụng nào đang mở.' : 'No active jobs open at the moment.'}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {recommendedJobs.map((j) => (
                    <Link key={j.id} href={`/jobs/${j.id}`} className="block group">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#13233F]/40 border border-slate-200/80 dark:border-slate-800 group-hover:border-[#2563EB] transition">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-[#2563EB] transition truncate">
                          {j.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span className="truncate max-w-[130px]">{j.companyName || 'Doanh nghiệp'}</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{j.industry}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
