'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchRecruiterJobs, publishJob, closeJob, fetchJobApplications } from '@/lib/api';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
import {
  Briefcase,
  PlusCircle,
  Search,
  Users,
  Award,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  MapPin,
  DollarSign,
  Sliders
} from 'lucide-react';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { JobMatchingPolicyModal } from '@/components/recruiter/JobMatchingPolicyModal';

export default function RecruiterJobsListPage() {
  const { t, locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Policy and Action confirmation modals
  const [policyModalJob, setPolicyModalJob] = useState<Job | null>(null);
  const [confirmCloseJobId, setConfirmCloseJobId] = useState<string | null>(null);
  const [confirmPublishJobId, setConfirmPublishJobId] = useState<string | null>(null);

  const loadJobs = () => {
    setIsLoading(true);
    fetchRecruiterJobs()
      .then(async (data) => {
        setJobs(data);
        setFilteredJobs(data);
        setFetchError(null);

        // Fetch application counts
        const counts: Record<string, number> = {};
        await Promise.all(
          data.map(async (j) => {
            try {
              const apps = await fetchJobApplications(j.id);
              counts[j.id] = apps.length;
            } catch {
              counts[j.id] = 0;
            }
          })
        );
        setApplicationCounts(counts);
      })
      .catch((err) => {
        setFetchError(err.message || (locale === 'vi' ? 'Không thể tải danh sách bài tuyển dụng.' : 'Unable to load jobs list.'));
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    let result = [...jobs];
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          (j.location && j.location.toLowerCase().includes(q)) ||
          (j.industry && j.industry.toLowerCase().includes(q))
      );
    }
    if (selectedStatus !== 'ALL') {
      result = result.filter((j) => j.status === selectedStatus);
    }
    setFilteredJobs(result);
  }, [searchKeyword, selectedStatus, jobs]);

  const handleExecutePublish = async () => {
    if (!confirmPublishJobId) return;
    setActionInProgressId(confirmPublishJobId);
    try {
      const updated = await publishJob(confirmPublishJobId);
      if (updated) {
        setJobs((prev) => prev.map((j) => (j.id === confirmPublishJobId ? updated : j)));
      }
      setConfirmPublishJobId(null);
    } catch (err: any) {
      alert(err.message || 'Xuất bản tin thất bại.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleExecuteClose = async () => {
    if (!confirmCloseJobId) return;
    setActionInProgressId(confirmCloseJobId);
    try {
      const updated = await closeJob(confirmCloseJobId);
      if (updated) {
        setJobs((prev) => prev.map((j) => (j.id === confirmCloseJobId ? updated : j)));
      }
      setConfirmCloseJobId(null);
    } catch (err: any) {
      alert(err.message || 'Đóng tin tuyển dụng thất bại.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const publishedCount = jobs.filter((j) => j.status === 'PUBLISHED').length;
  const draftCount = jobs.filter((j) => j.status === 'DRAFT').length;
  const closedCount = jobs.filter((j) => j.status === 'CLOSED').length;

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
        {/* Page Header */}
        <Reveal direction="up" delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
                <Briefcase className="w-4 h-4" />
                <span>Job Management Center</span>
              </div>
              <h1 className="text-3xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">
                {t('recruiterPages.jobsTitle', 'Danh Sách Tin Tuyển Dụng Doanh Nghiệp')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('recruiterPages.jobsSubtitle', 'Quản lý nội dung JD, trạng thái xuất bản, xem ứng tuyển và Bảng xếp hạng AI Matching')}
              </p>
            </div>

            <Link
              href="/recruiter/jobs/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md shadow-blue-500/20 transition active:scale-95 flex-shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('recruiterNav.createJob', 'Tạo Bài Tuyển Dụng Mới')}</span>
            </Link>
          </div>
        </Reveal>

        {/* Filter Bar */}
        <Reveal direction="up" delay={80}>
          <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 transition-colors">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={locale === 'vi' ? 'Tìm kiếm vị trí tuyển dụng...' : 'Search job requisitions...'}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
              >
                <option value="">{locale === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
                <option value="PUBLISHED">PUBLISHED {locale === 'vi' ? '(Đã xuất bản)' : '(Published)'}</option>
                <option value="DRAFT">DRAFT {locale === 'vi' ? '(Bài nháp)' : '(Draft)'}</option>
                <option value="CLOSED">CLOSED {locale === 'vi' ? '(Đã đóng)' : '(Closed)'}</option>
              </select>
            </div>
          </div>
        </Reveal>

        {/* Job Grid or Loading / Error / Empty State */}
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
            onPrimaryCtaClick={loadJobs}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title={t('emptyStates.jobs.emptyTitle', 'Chưa có bài tuyển dụng nào')}
            description={t('emptyStates.jobs.emptyDesc', 'Doanh nghiệp chưa tạo bài tuyển dụng nào. Hãy bắt đầu bằng cách tạo vị trí tuyển dụng mới.')}
            primaryCtaText={t('recruiterNav.createJob', 'Tạo Bài Tuyển Dụng Mới')}
            primaryCtaHref="/recruiter/jobs/new"
          />
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map((job, idx) => (
              <Reveal key={job.id} delay={staggerDelay(idx)}>
                <div
                  className="p-6 rounded-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#2563EB] transition shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1E293B] pb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#93C5FD]">
                          {translateIndustry(job.industry, locale)}
                        </span>
                      </td>

                      {/* Applications Count */}
                      <td className="py-4 px-4 text-center">
                        <Link
                          href={`/recruiter/jobs/${job.id}/applications`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-mono font-bold hover:bg-[#DBEAFE] transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{appCount}</span>
                        </Link>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/recruiter/jobs/${job.id}`}
                            className="p-1.5 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] hover:bg-[#F1F5F9] dark:hover:bg-[#13233F] transition"
                            title="Xem chi tiết JD"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/recruiter/jobs/${job.id}/ranking`}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#DBEAFE] border border-[#2563EB]/20 transition inline-flex items-center gap-1"
                            title="Xem Bảng xếp hạng AI"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ranking</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => setPolicyModalJob(job)}
                            className="p-1.5 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-[#F1F5F9] dark:hover:bg-[#13233F] transition cursor-pointer"
                            title="Cấu hình trọng số đối sánh"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {job.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => setConfirmPublishJobId(job.id)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#E8F8EE] text-[#00B14F] hover:bg-[#C9F2D8] border border-[#00B14F]/30 transition disabled:opacity-50 cursor-pointer"
                            >
                              {isBusy ? '...' : (locale === 'vi' ? 'Xuất bản' : 'Publish')}
                            </button>
                          )}

                          {job.status === 'PUBLISHED' && (
                            <button
                              type="button"
                              onClick={() => setConfirmCloseJobId(job.id)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50 cursor-pointer"
                            >
                              {isBusy ? '...' : (locale === 'vi' ? 'Đóng tin' : 'Close')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matching Policy Configuration Modal */}
      {policyModalJob && (
        <JobMatchingPolicyModal
          jobId={policyModalJob.id}
          jobTitle={policyModalJob.title}
          isOpen={true}
          onClose={() => setPolicyModalJob(null)}
          onPolicyUpdated={() => loadJobs()}
        />
      )}

      {/* Confirm Publish Dialog */}
      <ConfirmActionDialog
        isOpen={confirmPublishJobId !== null}
        title="Xác nhận xuất bản tin tuyển dụng"
        description="Tin tuyển dụng sẽ được công khai cho ứng viên nộp hồ sơ. Hãy đảm bảo doanh nghiệp đã được xác thực và đang hoạt động bình thường."
        confirmLabel="Xuất bản ngay"
        cancelLabel="Hủy"
        variant="info"
        isLoading={actionInProgressId !== null}
        onConfirm={handleExecutePublish}
        onCancel={() => setConfirmPublishJobId(null)}
      />

      {/* Confirm Close Dialog */}
      <ConfirmActionDialog
        isOpen={confirmCloseJobId !== null}
        title="Xác nhận đóng tin tuyển dụng"
        description="Sau khi đóng tin, ứng viên sẽ không thể xem hoặc nộp đơn vào vị trí này nữa. Các hồ sơ đã nộp vẫn được lưu trữ an toàn."
        confirmLabel="Đóng tin tuyển dụng"
        cancelLabel="Quay lại"
        variant="warning"
        isLoading={actionInProgressId !== null}
        onConfirm={handleExecuteClose}
        onCancel={() => setConfirmCloseJobId(null)}
      />
    </div>
  );
}
