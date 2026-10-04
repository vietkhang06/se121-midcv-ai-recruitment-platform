'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job, Application, ApplicationStatus } from '@/types';
import { fetchJobById, fetchJobApplications, updateApplicationStatus } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowLeft,
  Users,
  Award,
  Filter,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  FileText,
  Calendar,
  Sparkles,
  ArrowUpDown,
  ThumbsDown,
  UserCheck
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

const STATUS_TABS: { key: string; labelVi: string; labelEn: string; status?: ApplicationStatus }[] = [
  { key: 'ALL', labelVi: 'Tất cả', labelEn: 'All' },
  { key: 'SUBMITTED', labelVi: 'Mới nộp', labelEn: 'Submitted', status: 'SUBMITTED' },
  { key: 'SHORTLISTED', labelVi: 'Phù hợp hồ sơ', labelEn: 'Shortlisted', status: 'SHORTLISTED' },
  { key: 'INTERVIEWING', labelVi: 'Phỏng vấn', labelEn: 'Interviewing', status: 'INTERVIEWING' },
  { key: 'HIRED', labelVi: 'Trúng tuyển', labelEn: 'Hired', status: 'HIRED' },
  { key: 'REJECTED', labelVi: 'Từ chối', labelEn: 'Rejected', status: 'REJECTED' }
];

export default function JobApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, locale } = useLanguage();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('score');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    setFetchError(null);
    Promise.all([
      fetchJobById(resolvedParams.id),
      fetchJobApplications(resolvedParams.id),
    ])
      .then(([j, apps]) => {
        setJob(j);
        setApplications(apps);
      })
      .catch((err) => {
        setFetchError(err.message || (locale === 'vi' ? 'Không thể tải dữ liệu tuyển dụng.' : 'Failed to load recruitment data.'));
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  const handleQuickStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    setUpdatingAppId(appId);
    try {
      const updated = await updateApplicationStatus(appId, newStatus, 'Cập nhật nhanh từ Pipeline');
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: updated.status } : a));
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update status');
    } finally {
      setUpdatingAppId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] p-12 text-center text-slate-500 flex items-center justify-center">
        <EmptyState
          type="LOADING"
          title={locale === 'vi' ? 'Đang tải pipeline ứng viên...' : 'Loading candidate pipeline...'}
          description={locale === 'vi' ? 'Hệ thống đang đồng bộ danh sách đơn ứng tuyển...' : 'Synchronizing application records...'}
        />
      </div>
    );
  }

  if (fetchError || !job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] p-12 text-center text-slate-500 flex items-center justify-center">
        <EmptyState
          type="ERROR"
          title={locale === 'vi' ? 'Không thể tải pipeline ứng viên' : 'Failed to load candidate pipeline'}
          description={fetchError || (locale === 'vi' ? 'Không tìm thấy vị trí tuyển dụng.' : 'Job opening not found.')}
          primaryCtaText={locale === 'vi' ? 'Thử lại' : 'Retry'}
          onPrimaryCtaClick={loadData}
        />
      </div>
    );
  }

  // Filter & Search Logic
  const filteredApplications = applications.filter(app => {
    // Status Filter
    if (activeTab !== 'ALL') {
      const tabDef = STATUS_TABS.find(t => t.key === activeTab);
      if (tabDef?.status && app.status !== tabDef.status) return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (app.candidateName || '').toLowerCase();
      const cvTitle = (app.appliedCvTitle || '').toLowerCase();
      const email = (app.candidateEmail || '').toLowerCase();
      return name.includes(q) || cvTitle.includes(q) || email.includes(q);
    }
    return true;
  });

  // Sort Logic
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (sortBy === 'score') {
      return (b.matchScore || 0) - (a.matchScore || 0);
    }
    return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col py-8 transition-colors pb-20 w-full min-w-0">
      <main className="flex-1 w-full max-w-7xl min-w-0 mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Section */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-3">
          <Link
            href="/recruiter/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{locale === 'vi' ? 'Quay lại Quản lý bài đăng' : 'Back to Job Postings'}</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-mono">
                  {job.industry || 'Technology'}
                </span>
                <span className="text-xs text-slate-400 font-mono">Job ID: #{job.id.slice(0, 8)}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {locale === 'vi' ? `Pipeline Ứng Viên — ${job.title}` : `Candidate Pipeline — ${job.title}`}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'vi'
                  ? `Quản lý ${applications.length} hồ sơ ứng tuyển, đối sánh AI và quyết định quy trình nhân sự`
                  : `Manage ${applications.length} applicant records, evaluate AI fit scores, and advance candidates`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/recruiter/jobs/${job.id}/ranking`}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition active:scale-95 flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>{locale === 'vi' ? 'Bảng Xếp Hạng AI' : 'AI Rankings'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {STATUS_TABS.map(tab => {
                const count = tab.key === 'ALL'
                  ? applications.length
                  : applications.filter(a => a.status === tab.status).length;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <span>{locale === 'vi' ? tab.labelVi : tab.labelEn}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={locale === 'vi' ? 'Tìm tên ứng viên, CV...' : 'Search applicant name, CV...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1329] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setSortBy(prev => prev === 'score' ? 'date' : 'score')}
                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 flex-shrink-0"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {sortBy === 'score'
                    ? (locale === 'vi' ? 'Xếp theo: Điểm AI' : 'Sort: AI Score')
                    : (locale === 'vi' ? 'Xếp theo: Ngày nộp' : 'Sort: Date')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Applications List */}
        {sortedApplications.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title={locale === 'vi' ? 'Không tìm thấy hồ sơ nào' : 'No applicants found'}
            description={locale === 'vi' ? 'Chưa có đơn nộp nào phù hợp với bộ lọc tìm kiếm hiện tại.' : 'No application records match your current filter criteria.'}
            primaryCtaText={activeTab !== 'ALL' || searchQuery ? (locale === 'vi' ? 'Xóa bộ lọc' : 'Clear filters') : undefined}
            onPrimaryCtaClick={() => { setActiveTab('ALL'); setSearchQuery(''); }}
          />
        ) : (
          <div className="space-y-3">
            {sortedApplications.map(app => {
              const score = app.matchScore != null ? Math.round(app.matchScore) : null;
              return (
                <div
                  key={app.id}
                  className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-800/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-base flex-shrink-0">
                      {(app.candidateName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {app.candidateName || 'Ứng viên'}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold font-mono border ${
                          app.status === 'SHORTLISTED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : app.status === 'INTERVIEWING'
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                            : app.status === 'HIRED'
                            ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 border-green-300'
                            : app.status === 'REJECTED'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200'
                        }`}>
                          {app.status}
                        </span>
                        {score !== null && (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            score >= 80
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              : score >= 60
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            AI Fit: {score}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>{app.appliedCvTitle || 'CV Ứng tuyển'}</span>
                        <span>•</span>
                        <span>{locale === 'vi' ? 'Nộp ngày:' : 'Applied:'} {app.appliedDate || 'Gần đây'}</span>
                        {app.candidateEmail && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{app.candidateEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Decision */}
                  <div className="flex items-center gap-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    {/* Quick Move to Shortlist */}
                    {app.status !== 'SHORTLISTED' && (
                      <button
                        type="button"
                        disabled={updatingAppId === app.id}
                        onClick={() => handleQuickStatusChange(app.id, 'SHORTLISTED')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 transition disabled:opacity-50"
                      >
                        {locale === 'vi' ? 'Duyệt' : 'Shortlist'}
                      </button>
                    )}

                    {/* Quick Move to Interview */}
                    {app.status !== 'INTERVIEWING' && (
                      <button
                        type="button"
                        disabled={updatingAppId === app.id}
                        onClick={() => handleQuickStatusChange(app.id, 'INTERVIEWING')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 transition disabled:opacity-50"
                      >
                        {locale === 'vi' ? 'Phỏng vấn' : 'Interview'}
                      </button>
                    )}

                    {/* Inspect Match Full Report */}
                    <Link
                      href={`/recruiter/applications/${app.id}`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition active:scale-95 flex items-center gap-1"
                    >
                      <span>{locale === 'vi' ? 'Chi tiết & Quyết định' : 'Inspect & Decide'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
