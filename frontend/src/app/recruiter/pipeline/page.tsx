'use client';

import { APPLICATION_STATUS_LABELS, APPLICATION_STATUSES, IncompleteApplicationsError, loadApplicationsForJobs } from '@/lib/applicationWorkflow';

import React, { useState, useEffect, useCallback } from 'react';
import { Job, Application, ApplicationStatus } from '@/types';
import { fetchRecruiterJobs, fetchJobApplications, updateApplicationStatus, ApiError } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { PipelineCandidateCard } from '@/components/recruiter/PipelineCandidateCard';
import { EmptyState } from '@/components/common/EmptyState';

const PIPELINE_COLUMNS = [...APPLICATION_STATUSES, 'UNKNOWN'] as const;

export default function RecruiterPipelinePage() {
  const { locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ jobs?: string[] } | null>(null);
  const [decisionError, setDecisionError] = useState<{ id: string; conflict: boolean } | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const vi = locale === 'vi';
  const label = (status: ApplicationStatus) => APPLICATION_STATUS_LABELS[status][vi ? 0 : 1];

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRecruiterJobs()
      .then(async (jobList) => {
        setJobs(jobList);
        setAllApplications(await loadApplicationsForJobs(jobList, fetchJobApplications));
      })
      .catch((error: unknown) => {
        console.error('Failed to load pipeline:', error);
        setError(error instanceof IncompleteApplicationsError ? { jobs: error.jobTitles } : {});
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleAdvanceStatus = async (application: Application, nextStatus: ApplicationStatus) => {
    const appId = application.id;
    setDecisionError(null);
    setOpenActionsId(null);
    setUpdatingId(appId);
    try {
      const updated = await updateApplicationStatus(appId, nextStatus, undefined, application.status);
      setAllApplications(prev => prev.map(a => a.id === appId ? { ...a, status: updated.status } : a));
    } catch (err: unknown) {
      setDecisionError({ id: appId, conflict: err instanceof ApiError && err.status === 409 });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[var(--surface)] p-12 text-center text-slate-500 flex items-center justify-center">
        <EmptyState
          type="LOADING"
          title={locale === 'vi' ? 'Đang tải quy trình tuyển dụng...' : 'Loading hiring pipeline...'}
          description={locale === 'vi' ? 'Hệ thống đang chuẩn bị bảng Kanban ứng viên...' : 'Preparing applicant Kanban pipeline...'}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[var(--surface)] p-12 text-center flex flex-col items-center justify-center space-y-4">
        <EmptyState
          type="ERROR"
          title={locale === 'vi' ? 'Lỗi tải quy trình tuyển dụng' : 'Pipeline Load Error'}
          description={error.jobs
            ? `${vi ? 'Chưa tải được hồ sơ của' : 'Could not load applications for'} ${error.jobs.join(', ')}`
            : vi ? 'Chưa tải được danh sách tin tuyển dụng.' : 'Could not load job openings.'}
          primaryCtaText={vi ? 'Thử lại' : 'Retry'}
          onPrimaryCtaClick={loadData}
        />

      </div>
    );
  }

  const filteredApps = selectedJobId === 'ALL'
    ? allApplications
    : allApplications.filter(a => a.job?.id === selectedJobId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 flex flex-col transition-colors pb-20 w-full min-w-0">
      <main className="flex-1 w-full max-w-[1440px] min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Recruiter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <RecruiterPageHeader
            title={locale === 'vi' ? 'Quy Trình Tuyển Dụng Tổng Hợp' : 'Candidate Hiring Pipeline'}
            subtitle={locale === 'vi' ? 'Theo dõi luồng ứng viên qua các chặng đánh giá nhân sự, phân loại nhanh và thực hiện quyết định' : 'Track applicant flow across hiring stages with real-time decision controls'}
            categoryTag="Kanban Pipeline"
          />

          {/* Job Filter Selector */}
          <div className="flex max-w-full min-w-0 items-center gap-2 self-start sm:self-auto">
            <label htmlFor="pipeline-job-filter" className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{locale === 'vi' ? 'Lọc theo tin:' : 'Job Filter:'}</label>
            <select
              id="pipeline-job-filter"
              value={selectedJobId}
              onChange={event => {
                setSelectedJobId(event.target.value);
                setOpenActionsId(null);
              }}
              className="min-w-0 truncate px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div
            role="region"
            aria-label={vi ? 'Bảng quy trình tuyển dụng' : 'Hiring pipeline board'}
            tabIndex={0}
            className="grid w-full min-w-0 grid-cols-1 items-start gap-4 overflow-x-auto pb-4 focus-visible:outline-2 focus-visible:outline-[var(--primary)] md:flex"
          >
            {PIPELINE_COLUMNS.map((status) => {
              const colApps = filteredApps.filter(a => a.status === status);
              return (
                <div
                  key={status}
                  className="kanban-col min-w-0 space-y-3 p-3.5 shadow-xs md:flex-[1_0_245px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="text-sm font-semibold text-[var(--heading)]">{label(status)}</h2>
                    <span className="shrink-0 rounded-lg bg-[var(--surface-secondary)] px-2 py-1 text-xs">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2.5">
                    {colApps.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-[var(--surface)]/40">
                        {locale === 'vi' ? 'Chưa có hồ sơ' : 'No records'}
                      </div>
                    ) : (
                      colApps.map(app => (
                        <PipelineCandidateCard
                          key={app.id}
                          application={app}
                          locale={locale}
                          actionsOpen={openActionsId === app.id}
                          updating={updatingId === app.id}
                          updatesDisabled={updatingId !== null || (decisionError?.id === app.id && decisionError.conflict)}
                          error={decisionError?.id === app.id ? decisionError : undefined}
                          onToggleActions={() => setOpenActionsId(current => current === app.id ? null : app.id)}
                          onCloseActions={() => setOpenActionsId(current => current === app.id ? null : current)}
                          onAdvance={next => handleAdvanceStatus(app, next)}
                          onReload={() => {
                            setDecisionError(null);
                            loadData();
                          }}
                        />
                      ))
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
