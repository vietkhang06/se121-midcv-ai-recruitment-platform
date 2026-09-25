'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job, Application } from '@/types';
import { fetchJobById, fetchJobApplications } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowLeft,
  Users,
  Award,
  Filter,
  SlidersHorizontal,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  FileText
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export default function JobApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, locale } = useLanguage();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1329] p-12 text-center text-slate-500 flex items-center justify-center">
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
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1329] p-12 text-center text-slate-500 flex items-center justify-center">
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

  const jobApplications = applications.filter(a => a.job?.id === job.id);
  const submittedApps = jobApplications.filter(a => a.status === 'SUBMITTED');
  const reviewApps = jobApplications.filter(a => a.status === 'UNDER_REVIEW');
  const shortlistApps = jobApplications.filter(a => a.status === 'SHORTLISTED');
  const rejectedApps = jobApplications.filter(a => a.status === 'REJECTED');

  const columns = [
    { title: locale === 'vi' ? 'Mới Nộp (New)' : 'New (Applied)', count: submittedApps.length, items: submittedApps },
    { title: locale === 'vi' ? 'Sàng Lọc (Screening)' : 'Screening', count: reviewApps.length, items: reviewApps },
    { title: locale === 'vi' ? 'Chọn (Shortlisted)' : 'Shortlisted', count: shortlistApps.length, items: shortlistApps },
    { title: locale === 'vi' ? 'Từ Chối (Rejected)' : 'Rejected', count: rejectedApps.length, items: rejectedApps },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col py-8 transition-colors">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 w-full">
        
        {/* Header Section */}
        <div className="border-b border-slate-200 dark:border-[#1E293B] pb-4 space-y-2">
          <Link
            href="/recruiter"
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{locale === 'vi' ? 'Quay lại Dashboard Console' : 'Back to Dashboard Console'}</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Job Candidate Pipeline — Danh Sách Đơn Ứng Tuyển' : 'Job Candidate Pipeline — Applications'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'vi' ? `Theo dõi và sàng lọc ứng viên cho vị trí: ${job.title}` : `Track and screen candidates for: ${job.title}`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/recruiter/jobs/${job.id}/ranking`}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#00B14F] hover:bg-[#009643] shadow-sm shadow-emerald-500/20 transition flex items-center gap-1.5"
              >
                <Award className="w-4 h-4 text-white" />
                <span>{locale === 'vi' ? 'Mở Bảng Xếp Hạng AI (NDCG@K)' : 'Open AI Ranking (NDCG@K)'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Active Job Bar */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {locale === 'vi' ? 'Vị trí tuyển:' : 'Job Position:'} <strong className="text-slate-900 dark:text-white">{job.title}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              {locale === 'vi' ? `${jobApplications.length} Ứng viên đã nộp đơn` : `${jobApplications.length} Applicants`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/jobs/${job.id}`}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#1E293B] bg-slate-50 dark:bg-[#13233F] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#18294E] transition"
            >
              {locale === 'vi' ? 'Xem trang bài đăng JD' : 'View Job JD'}
            </Link>
          </div>
        </div>

        {/* Dynamic Pipeline Stages */}
        {jobApplications.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title={t('emptyStates.applications.recruiterEmptyTitle', "Chưa có ứng viên ứng tuyển vào vị trí này")}
            description={t('emptyStates.applications.recruiterEmptyDesc', "Vị trí tuyển dụng chưa nhận được hồ sơ ứng tuyển nào từ ứng viên.")}
            primaryCtaText={locale === 'vi' ? 'Xem trang bài đăng JD' : 'View Job JD'}
            primaryCtaHref={`/jobs/${job.id}`}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pb-4">
            {columns.map((col, idx) => (
              <div key={idx} className="bg-slate-100/70 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] rounded-xl p-3.5 space-y-3 min-w-[220px]">
                <div className="flex items-center justify-between font-semibold text-xs text-slate-800 dark:text-slate-200 px-1">
                  <span>{col.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B]">
                    {col.count}
                  </span>
                </div>

                <div className="space-y-3">
                  {col.items.length > 0 ? (
                    col.items.map((app) => (
                      <div key={app.id} className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-lg p-3.5 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                              {app.candidateName || app.candidateProfile?.fullName || (locale === 'vi' ? 'Ứng viên' : 'Candidate')}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {app.appliedCvTitle || (locale === 'vi' ? 'Ứng viên' : 'Candidate')}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold font-mono text-[#00B14F] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            v{app.appliedCvVersion}.0
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {locale === 'vi' ? 'Nộp ngày:' : 'Applied on:'} {app.appliedDate}
                        </div>
                        {app.candidateNotes && (
                          <div className="text-[10px] text-slate-600 dark:text-slate-300 italic line-clamp-2">
                            "{app.candidateNotes}"
                          </div>
                        )}
                        <Link
                          href={`/recruiter/applications/${app.id}`}
                          className="block text-center py-1.5 rounded text-[10px] font-semibold border border-slate-200 dark:border-[#1E293B] text-[#2563EB] dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-[#18294E] transition"
                        >
                          {locale === 'vi' ? 'Kiểm tra hồ sơ đối sánh' : 'Inspect match report'}
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                      {locale === 'vi' ? 'Chưa có ứng viên' : 'No applicants'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
