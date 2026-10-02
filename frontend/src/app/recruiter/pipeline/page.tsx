'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job, Application, ApplicationStatus } from '@/types';
import { fetchRecruiterJobs, fetchJobApplications, updateApplicationStatus } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import {
  GitBranch,
  Filter,
  CheckCircle2,
  Calendar,
  Award,
  ChevronRight,
  ExternalLink,
  ThumbsDown,
  Briefcase
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

const PIPELINE_COLUMNS: { status: ApplicationStatus; titleVi: string; titleEn: string; color: string; badge: string }[] = [
  { status: 'SUBMITTED', titleVi: 'Mới Nộp', titleEn: 'Submitted', color: 'border-blue-400', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
  { status: 'SHORTLISTED', titleVi: 'Duyệt Hồ Sơ', titleEn: 'Shortlisted', color: 'border-emerald-400', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  { status: 'INTERVIEWING', titleVi: 'Phỏng Vấn', titleEn: 'Interviewing', color: 'border-purple-400', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' },
  { status: 'HIRED', titleVi: 'Trúng Tuyển', titleEn: 'Hired', color: 'border-green-500', badge: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300' },
  { status: 'REJECTED', titleVi: 'Từ Chối', titleEn: 'Rejected', color: 'border-rose-400', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' }
];

export default function RecruiterPipelinePage() {
  const { t, locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchRecruiterJobs()
      .then(async (jobList) => {
        setJobs(jobList);
        const appsPromises = jobList.map(j => fetchJobApplications(j.id).catch(() => []));
        const results = await Promise.all(appsPromises);
        setAllApplications(results.flat());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdvanceStatus = async (appId: string, nextStatus: ApplicationStatus) => {
    setUpdatingId(appId);
    try {
      const updated = await updateApplicationStatus(appId, nextStatus, 'Chuyển vòng từ Kanban Pipeline');
      setAllApplications(prev => prev.map(a => a.id === appId ? { ...a, status: updated.status } : a));
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] p-12 text-center text-slate-500 flex items-center justify-center">
        <EmptyState
          type="LOADING"
          title={locale === 'vi' ? 'Đang tải quy trình tuyển dụng...' : 'Loading hiring pipeline...'}
          description={locale === 'vi' ? 'Hệ thống đang chuẩn bị bảng Kanban ứng viên...' : 'Preparing applicant Kanban pipeline...'}
        />
      </div>
    );
  }

  const filteredApps = selectedJobId === 'ALL'
    ? allApplications
    : allApplications.filter(a => a.job?.id === selectedJobId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col transition-colors pb-20">
      <main className="flex-1 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
        {/* Recruiter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <RecruiterPageHeader
            title={locale === 'vi' ? 'Quy Trình Tuyển Dụng Tổng Hợp' : 'Candidate Hiring Pipeline'}
            subtitle={locale === 'vi' ? 'Theo dõi luồng ứng viên qua các chặng đánh giá nhân sự, phân loại nhanh và thực hiện quyết định' : 'Track applicant flow across hiring stages with real-time decision controls'}
            categoryTag="Kanban Pipeline"
          />

          {/* Job Filter Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{locale === 'vi' ? 'Lọc theo tin:' : 'Job Filter:'}</span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">{locale === 'vi' ? 'Tất cả vị trí tuyển dụng' : 'All Job Openings'} ({allApplications.length})</option>
              {jobs.map(j => {
                const count = allApplications.filter(a => a.job?.id === j.id).length;
                return (
                  <option key={j.id} value={j.id}>
                    {j.title} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Kanban Board */}
        {filteredApps.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title={locale === 'vi' ? 'Chưa có ứng viên nào trong pipeline' : 'No candidates in pipeline'}
            description={locale === 'vi' ? 'Vị trí tuyển dụng được chọn chưa nhận được đơn ứng tuyển nào.' : 'The selected job opening has no applicants yet.'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
            {PIPELINE_COLUMNS.map(col => {
              const colApps = filteredApps.filter(a => a.status === col.status);
              return (
                <div
                  key={col.status}
                  className="bg-slate-100/70 dark:bg-[#13233F] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-3 min-w-[240px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {locale === 'vi' ? col.titleVi : col.titleEn}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${col.badge}`}>
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2.5">
                    {colApps.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 italic">
                        {locale === 'vi' ? 'Chưa có hồ sơ' : 'No records'}
                      </div>
                    ) : (
                      colApps.map(app => {
                        const score = app.matchScore != null ? Math.round(app.matchScore) : null;
                        return (
                          <div
                            key={app.id}
                            className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-xs hover:border-blue-400 dark:hover:border-blue-700 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white block line-clamp-1">
                                  {app.candidateName || 'Ứng viên'}
                                </span>
                                {score !== null && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0 ${
                                    score >= 80
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  }`}>
                                    {score}%
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block line-clamp-1">
                                {app.job?.title || 'Vị trí'}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-400 font-mono">
                              {locale === 'vi' ? 'Nộp ngày:' : 'Applied:'} {app.appliedDate || 'Gần đây'}
                            </div>

                            {/* Card Footer Actions */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1">
                              <Link
                                href={`/recruiter/applications/${app.id}`}
                                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                              >
                                <span>Chi tiết</span>
                                <ChevronRight className="w-3 h-3" />
                              </Link>

                              {/* Stage Advancement Quick Action */}
                              {col.status === 'SUBMITTED' && (
                                <button
                                  type="button"
                                  disabled={updatingId === app.id}
                                  onClick={() => handleAdvanceStatus(app.id, 'SHORTLISTED')}
                                  className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100 font-semibold"
                                >
                                  Duyệt →
                                </button>
                              )}
                              {col.status === 'SHORTLISTED' && (
                                <button
                                  type="button"
                                  disabled={updatingId === app.id}
                                  onClick={() => handleAdvanceStatus(app.id, 'INTERVIEWING')}
                                  className="text-[10px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 hover:bg-purple-100 font-semibold"
                                >
                                  Phỏng vấn →
                                </button>
                              )}
                              {col.status === 'INTERVIEWING' && (
                                <button
                                  type="button"
                                  disabled={updatingId === app.id}
                                  onClick={() => handleAdvanceStatus(app.id, 'HIRED')}
                                  className="text-[10px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-300 hover:bg-green-200 font-semibold"
                                >
                                  Tuyển →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
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
