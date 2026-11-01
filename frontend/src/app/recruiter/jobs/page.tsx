'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import {
  closeJob,
  deleteDraftJob,
  fetchJobApplicationCount,
  fetchRecruiterJobs,
  publishJob,
} from '@/lib/api';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { JobMatchingPolicyModal } from '@/components/recruiter/JobMatchingPolicyModal';
import { Reveal, staggerDelay } from '@/components/motion';
import { useLanguage } from '@/context/LanguageContext';
import { formatSalary, translateIndustry, translateWorkMode } from '@/lib/i18n';
import {
  AlertTriangle,
  Award,
  Briefcase,
  CheckCircle,
  DollarSign,
  Eye,
  MapPin,
  PlusCircle,
  Search,
  Sliders,
  Users,
  XCircle,
} from 'lucide-react';

export default function RecruiterJobsListPage() {
  const { t, locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const [policyModalJob, setPolicyModalJob] = useState<Job | null>(null);
  const [confirmDeleteJobId, setConfirmDeleteJobId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const handleDelete = async () => {
    if (!confirmDeleteJobId) return;
    setActionInProgressId(confirmDeleteJobId);
    setDeleteError(null);
    try {
      await deleteDraftJob(confirmDeleteJobId);
      setConfirmDeleteJobId(null);
      await loadJobs();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Không thể xóa tin nháp.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const [confirmCloseJobId, setConfirmCloseJobId] = useState<string | null>(null);
  const [confirmPublishJobId, setConfirmPublishJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const data = await fetchRecruiterJobs();
      setJobs(data);

      // Load application counts independently so one inaccessible job does not
      // prevent the rest of the recruiter dashboard from appearing.
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (job) => {
          try {
            counts[job.id] = await fetchJobApplicationCount(job.id);
          } catch {
            // Keep the count unknown when the server cannot confirm it.
          }
        }),
      );
      setApplicationCounts(counts);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : locale === 'vi'
            ? 'Không thể tải danh sách bài tuyển dụng.'
            : 'Unable to load jobs list.';
      setFetchError(message);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    let active = true;
    const loadInitialJobs = async () => {
      try {
        const data = await fetchRecruiterJobs();
        if (!active) return;
        setJobs(data);
        const counts = await Promise.all(data.map(async (job) => {
          try { return [job.id, await fetchJobApplicationCount(job.id)] as const; }
          catch { return null; }
        }));
        if (active) setApplicationCounts(Object.fromEntries(counts.filter((entry) => entry !== null)));
      } catch (error: unknown) {
        if (active) setFetchError(error instanceof Error ? error.message : 'Unable to load jobs list. / Không thể tải danh sách bài tuyển dụng.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void loadInitialJobs();
    return () => { active = false; };
  }, []);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    const query = searchKeyword.trim().toLowerCase();

    if (query) {
      result = result.filter((job) =>
        [job.title, job.location, job.industry, job.description]
          .filter((value): value is string => typeof value === 'string')
          .some((value) => value.toLowerCase().includes(query)),
      );
    }

    if (selectedStatus !== 'ALL') {
      result = result.filter((job) => job.status === selectedStatus);
    }

    return result;
  }, [searchKeyword, selectedStatus, jobs]);

  const handleExecutePublish = async () => {
    if (!confirmPublishJobId) return;

    const jobId = confirmPublishJobId;
    setActionInProgressId(jobId);
    try {
      const updatedJob = await publishJob(jobId);
      if (updatedJob) {
        setJobs((currentJobs) =>
          currentJobs.map((job) => (job.id === jobId ? updatedJob : job)),
        );
      }
      setConfirmPublishJobId(null);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Xuất bản tin thất bại.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleExecuteClose = async () => {
    if (!confirmCloseJobId) return;

    const jobId = confirmCloseJobId;
    setActionInProgressId(jobId);
    try {
      const updatedJob = await closeJob(jobId);
      if (updatedJob) {
        setJobs((currentJobs) =>
          currentJobs.map((job) => (job.id === jobId ? updatedJob : job)),
        );
      }
      setConfirmCloseJobId(null);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Đóng tin tuyển dụng thất bại.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const publishedCount = jobs.filter((job) => job.status === 'PUBLISHED').length;
  const draftCount = jobs.filter((job) => job.status === 'DRAFT').length;
  const closedCount = jobs.filter((job) => job.status === 'CLOSED').length;

  return (
    <div className="min-h-screen bg-[var(--surface)] dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
        {/* Page header */}
        <Reveal direction="up" delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-sans">
                <Briefcase className="w-4 h-4" />
                <span>Job Management Center</span>
              </div>
              <h1 className="text-3xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">
                {t('recruiterPages.jobsTitle', 'Danh Sách Tin Tuyển Dụng Doanh Nghiệp')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t(
                  'recruiterPages.jobsSubtitle',
                  'Quản lý nội dung JD, trạng thái xuất bản, xem ứng tuyển và Bảng xếp hạng AI Matching',
                )}
              </p>
            </div>

            <Link
              href="/recruiter/jobs/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-[var(--primary)] hover:bg-[var(--primary)] shadow-md shadow-blue-500/20 transition active:scale-95 flex-shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('recruiterNav.createJob', 'Tạo Bài Tuyển Dụng Mới')}</span>
            </Link>
          </div>
        </Reveal>

        {/* Status summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-[var(--surface)] px-4 py-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'vi' ? 'Đã xuất bản' : 'Published'}
              </p>
              <p className="text-lg font-bold">{publishedCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-[var(--surface)] px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'vi' ? 'Bản nháp' : 'Drafts'}
              </p>
              <p className="text-lg font-bold">{draftCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] px-4 py-3">
            <XCircle className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'vi' ? 'Đã đóng' : 'Closed'}
              </p>
              <p className="text-lg font-bold">{closedCount}</p>
            </div>
          </div>
        </div>

        {/* Search and status filters */}
        <Reveal direction="up" delay={80}>
          <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 transition-colors">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={locale === 'vi' ? 'Tìm kiếm vị trí tuyển dụng...' : 'Search job requisitions...'}
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[var(--border)]"
              />
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[var(--border)]"
              >
                <option value="ALL">{locale === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
                <option value="PUBLISHED">PUBLISHED {locale === 'vi' ? '(Đã xuất bản)' : '(Published)'}</option>
                <option value="DRAFT">DRAFT {locale === 'vi' ? '(Bài nháp)' : '(Draft)'}</option>
                <option value="CLOSED">CLOSED {locale === 'vi' ? '(Đã đóng)' : '(Closed)'}</option>
              </select>
            </div>
          </div>
        </Reveal>

        {/* Jobs list */}
        {isLoading ? (
          <EmptyState
            type="LOADING"
            title={t('emptyStates.jobs.loading', 'Đang tải danh sách bài tuyển dụng...')}
            description={locale === 'vi' ? 'Hệ thống đang kết nối dữ liệu việc làm...' : 'Connecting to requisitions catalog...'}
          />
        ) : fetchError ? (
          <EmptyState
            type="ERROR"
            title={t('emptyStates.jobs.errorTitle', 'Không thể tải danh sách bài tuyển dụng')}
            description={fetchError}
            primaryCtaText={t('common.retry', 'Thử lại')}
            onPrimaryCtaClick={() => void loadJobs()}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title={t('emptyStates.jobs.emptyTitle', 'Chưa có bài tuyển dụng nào')}
            description={t(
              'emptyStates.jobs.emptyDesc',
              'Doanh nghiệp chưa tạo bài tuyển dụng nào. Hãy bắt đầu bằng cách tạo vị trí tuyển dụng mới.',
            )}
            primaryCtaText={t('recruiterNav.createJob', 'Tạo Bài Tuyển Dụng Mới')}
            primaryCtaHref="/recruiter/jobs/new"
          />
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map((job, index) => {
              const isBusy = actionInProgressId === job.id;
              const applicationCount = applicationCounts[job.id] ?? '—';

              return (
                <Reveal key={job.id} delay={staggerDelay(index)}>
                  <article className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] hover:border-[var(--border)] dark:hover:border-[var(--border)] transition shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] text-slate-700 dark:text-[var(--retro-sky)]">
                            {translateIndustry(job.industry || '', locale)}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                              job.status === 'PUBLISHED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                                : job.status === 'DRAFT'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>

                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white break-words">
                            <Link href={`/recruiter/jobs/${job.id}`} className="hover:text-[var(--primary)] dark:hover:text-[var(--retro-sky)] transition-colors">
                              {job.title}
                            </Link>
                          </h2>
                          {job.description && (
                            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                              {job.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                          {job.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {job.location}
                            </span>
                          )}
                          {job.employmentType && (
                            <span className="inline-flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5" />
                              {translateWorkMode(job.employmentType, locale)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />
                            {formatSalary(job.salaryMin, job.salaryMax, job.salaryRange, locale, job.salaryNegotiable, job.salaryCurrency)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap lg:justify-end items-center gap-2">
                        <Link
                          href={`/recruiter/jobs/${job.id}`}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[var(--primary)] hover:border-[var(--border)] transition text-xs font-semibold"
                          title={locale === 'vi' ? 'Xem chi tiết JD' : 'View job details'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {locale === 'vi' ? 'Chi tiết' : 'Details'}
                        </Link>
                        <Link
                          href={`/recruiter/jobs/${job.id}/ranking`}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] hover:bg-[var(--surface-secondary)] border border-[var(--border)]/20 transition text-xs font-semibold"
                          title={locale === 'vi' ? 'Xem bảng xếp hạng AI' : 'View AI ranking'}
                        >
                          <Award className="w-3.5 h-3.5" />
                          Ranking
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPolicyModalJob(job)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 transition text-xs font-semibold"
                          title={locale === 'vi' ? 'Cấu hình trọng số đối sánh' : 'Configure matching policy'}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          {locale === 'vi' ? 'Đối sánh' : 'Matching'}
                        </button>
                        <Link href={`/recruiter/jobs/${job.id}/edit`}
                          className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold">
                          {locale === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                        </Link>
                        {job.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => setConfirmPublishJobId(job.id)}
                            disabled={actionInProgressId !== null}
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-secondary)] dark:bg-emerald-950/40 text-[var(--heading)] dark:text-emerald-400 hover:bg-[var(--surface-secondary)] border border-[var(--border)]/30 transition disabled:opacity-50"
                          >
                            {isBusy ? '...' : locale === 'vi' ? 'Xuất bản' : 'Publish'}
                          </button>
                        )}
                        {job.status === 'DRAFT' && (
                          <button type="button" disabled={actionInProgressId !== null}
                            onClick={() => { setDeleteError(null); setConfirmDeleteJobId(job.id); }}
                            className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 text-xs font-semibold disabled:opacity-50">
                            {locale === 'vi' ? 'Xóa bản nháp' : 'Delete draft'}
                          </button>
                        )}
                        {job.status === 'PUBLISHED' && (
                          <button
                            type="button"
                            onClick={() => setConfirmCloseJobId(job.id)}
                            disabled={actionInProgressId !== null}
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                          >
                            {isBusy ? '...' : locale === 'vi' ? 'Đóng tin' : 'Close'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-[var(--border)] pt-4">
                      <Link
                        href={`/recruiter/jobs/${job.id}/applications`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] font-semibold text-xs hover:bg-[var(--surface-secondary)] transition"
                      >
                        <Users className="w-4 h-4" />
                        <span>{applicationCount} {locale === 'vi' ? 'ứng viên ứng tuyển' : 'applicants'}</span>
                      </Link>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {locale === 'vi' ? 'Mã tin:' : 'Job ID:'} {job.id}
                      </span>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <EmptyState
            type="NO_MATCH"
            title={locale === 'vi' ? 'Không tìm thấy tin tuyển dụng phù hợp' : 'No matching job postings found'}
            description={locale === 'vi' ? 'Hãy thử thay đổi từ khóa hoặc trạng thái lọc.' : 'Try changing your search keyword or status filter.'}
            primaryCtaText={locale === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
            onPrimaryCtaClick={() => {
              setSearchKeyword('');
              setSelectedStatus('ALL');
            }}
          />
        )}
      </main>

      <ConfirmActionDialog
        isOpen={confirmDeleteJobId !== null}
        title={locale === 'vi' ? 'Xóa tin tuyển dụng nháp?' : 'Delete this draft job?'}
        description={locale === 'vi' ? 'Bản nháp sẽ được xóa khỏi danh sách.' : 'The draft will be removed from the list.'}
        confirmLabel={locale === 'vi' ? 'Xóa bản nháp' : 'Delete draft'}
        variant="danger" isLoading={actionInProgressId !== null} errorMessage={deleteError}
        onConfirm={handleDelete} onCancel={() => setConfirmDeleteJobId(null)}
      />
      {policyModalJob && (
        <JobMatchingPolicyModal
          jobId={policyModalJob.id}
          jobTitle={policyModalJob.title}
          isOpen={true}
          onClose={() => setPolicyModalJob(null)}
          onPolicyUpdated={() => void loadJobs()}
        />
      )}

      <ConfirmActionDialog
        isOpen={confirmPublishJobId !== null}
        title={locale === 'vi' ? 'Xác nhận xuất bản tin tuyển dụng' : 'Confirm job publication'}
        description={locale === 'vi' ? 'Tin tuyển dụng sẽ được công khai cho ứng viên nộp hồ sơ. Hãy đảm bảo doanh nghiệp đã được xác thực và đang hoạt động bình thường.' : 'This job will become visible to candidates. Ensure your company is verified and active.'}
        confirmLabel={locale === 'vi' ? 'Xuất bản ngay' : 'Publish now'}
        cancelLabel={locale === 'vi' ? 'Hủy' : 'Cancel'}
        variant="info"
        isLoading={actionInProgressId !== null}
        onConfirm={handleExecutePublish}
        onCancel={() => setConfirmPublishJobId(null)}
      />

      <ConfirmActionDialog
        isOpen={confirmCloseJobId !== null}
        title={locale === 'vi' ? 'Xác nhận đóng tin tuyển dụng' : 'Confirm job closure'}
        description={locale === 'vi' ? 'Sau khi đóng tin, ứng viên sẽ không thể xem hoặc nộp đơn vào vị trí này nữa. Các hồ sơ đã nộp vẫn được lưu trữ an toàn.' : 'Candidates will no longer be able to view or apply to this job. Existing applications will remain stored.'}
        confirmLabel={locale === 'vi' ? 'Đóng tin tuyển dụng' : 'Close job'}
        cancelLabel={locale === 'vi' ? 'Quay lại' : 'Go back'}
        variant="warning"
        isLoading={actionInProgressId !== null}
        onConfirm={handleExecuteClose}
        onCancel={() => setConfirmCloseJobId(null)}
      />
    </div>
  );
}
