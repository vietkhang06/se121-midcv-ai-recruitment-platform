'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  Briefcase,
  AlertTriangle,
  Search,
  Loader2,
  RefreshCw,
  Ban,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Scale
} from 'lucide-react';
import {
  adminApi,
  fetchAdminAppeals,
  startReviewAdminAppeal,
  approveAdminAppeal,
  rejectAdminAppeal
} from '@/lib/api';
import { JobAdminDto, ReportAdminDto, ReportStatus, ReportTargetType, SuspensionAppeal } from '@/types';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';

export default function AdminModerationPage() {
  const [activeTab, setActiveTab] = useState<'JOBS' | 'REPORTS' | 'APPEALS'>('JOBS');

  // Jobs State
  const [jobs, setJobs] = useState<JobAdminDto[]>([]);
  const [jobsTotalPages, setJobsTotalPages] = useState(0);
  const [jobsTotalElements, setJobsTotalElements] = useState(0);
  const [jobsPage, setJobsPage] = useState(0);
  const [jobsStatusFilter, setJobsStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'SUSPENDED' | 'DRAFT'>('ALL');
  const [jobsSearch, setJobsSearch] = useState('');
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  // Reports State
  const [reports, setReports] = useState<ReportAdminDto[]>([]);
  const [reportsTotalPages, setReportsTotalPages] = useState(0);
  const [reportsTotalElements, setReportsTotalElements] = useState(0);
  const [reportsPage, setReportsPage] = useState(0);
  const [reportsStatusFilter, setReportsStatusFilter] = useState<'ALL' | ReportStatus>('ALL');
  const [reportsTypeFilter, setReportsTypeFilter] = useState<'ALL' | ReportTargetType>('ALL');
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Appeals State
  const [appeals, setAppeals] = useState<SuspensionAppeal[]>([]);
  const [appealsTotalPages, setAppealsTotalPages] = useState(0);
  const [appealsTotalElements, setAppealsTotalElements] = useState(0);
  const [appealsPage, setAppealsPage] = useState(0);
  const [appealsStatusFilter, setAppealsStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED'>('ALL');
  const [appealsLoading, setAppealsLoading] = useState(true);
  const [appealsError, setAppealsError] = useState<string | null>(null);

  // Selected Appeal Action Modal
  const [selectedAppeal, setSelectedAppeal] = useState<SuspensionAppeal | null>(null);
  const [appealAction, setAppealAction] =
    useState<'APPROVE' | 'REJECT' | null>(null);
  const [appealResolutionNote, setAppealResolutionNote] = useState('');

  // Action Modals
  const [selectedJob, setSelectedJob] = useState<JobAdminDto | null>(null);
  const [jobAction, setJobAction] = useState<'SUSPEND' | 'RESTORE' | null>(null);
  const [jobReason, setJobReason] = useState('');

  const [selectedReport, setSelectedReport] = useState<ReportAdminDto | null>(null);
  const [reportAction, setReportAction] = useState<'RESOLVE' | 'DISMISS' | null>(null);
  const [reportNotes, setReportNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const res = await adminApi.getJobs({
        status: jobsStatusFilter === 'ALL' ? undefined : jobsStatusFilter,
        search: jobsSearch.trim() || undefined,
        page: jobsPage,
        size: 10
      });
      setJobs(res.content || []);
      setJobsTotalPages(res.totalPages || 0);
      setJobsTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setJobsError(err?.message || 'Không thể tải danh sách tin tuyển dụng.');
    } finally {
      setJobsLoading(false);
    }
  }, [jobsPage, jobsStatusFilter, jobsSearch]);

  // Fetch Reports
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const res = await adminApi.getReports({
        status: reportsStatusFilter === 'ALL' ? undefined : reportsStatusFilter,
        targetType: reportsTypeFilter === 'ALL' ? undefined : reportsTypeFilter,
        page: reportsPage,
        size: 10
      });
      setReports(res.content || []);
      setReportsTotalPages(res.totalPages || 0);
      setReportsTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setReportsError(err?.message || 'Không thể tải danh sách báo cáo vi phạm.');
    } finally {
      setReportsLoading(false);
    }
  }, [reportsPage, reportsStatusFilter, reportsTypeFilter]);

  // Fetch Appeals
  const fetchAppeals = useCallback(async () => {
    setAppealsLoading(true);
    setAppealsError(null);
    try {
      const res = await fetchAdminAppeals({
        status: appealsStatusFilter === 'ALL' ? undefined : appealsStatusFilter,
        page: appealsPage,
        size: 10
      });
      setAppeals(res.content || []);
      setAppealsTotalPages(res.totalPages || 0);
      setAppealsTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setAppealsError(err?.message || 'Không thể tải danh sách khiếu nại đình chỉ.');
    } finally {
      setAppealsLoading(false);
    }
  }, [appealsPage, appealsStatusFilter]);

  useEffect(() => {
    if (activeTab === 'JOBS') {
      fetchJobs();
    } else if (activeTab === 'REPORTS') {
      fetchReports();
    } else if (activeTab === 'APPEALS') {
      fetchAppeals();
    }
  }, [activeTab, fetchJobs, fetchReports, fetchAppeals]);

  // Handle Review Appeal
  const handleStartReview = async (appeal: SuspensionAppeal) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      await startReviewAdminAppeal(appeal.id);
      setFeedback({ type: 'success', text: 'Đã chuyển đơn khiếu nại sang trạng thái đang xét duyệt.' });
      fetchAppeals();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Không thể cập nhật trạng thái khiếu nại.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Appeal Resolution (Approve / Reject)
  const handleExecuteAppealResolution = async () => {
    if (!selectedAppeal || !appealAction) return;

    if (!appealResolutionNote.trim()) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập lý do / ghi chú quyết định khiếu nại.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      if (appealAction === 'APPROVE') {
        await approveAdminAppeal(selectedAppeal.id, appealResolutionNote.trim());
        setFeedback({ type: 'success', text: 'Đã chấp thuận khiếu nại và gỡ bỏ trạng thái đình chỉ thành công!' });
      } else if (appealAction === 'REJECT') {
        await rejectAdminAppeal(selectedAppeal.id, appealResolutionNote.trim());
        setFeedback({ type: 'success', text: 'Đã bác bỏ đơn khiếu nại đình chỉ.' });
      }
      setSelectedAppeal(null);
      setAppealAction(null);
      setAppealResolutionNote('');
      fetchAppeals();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Lỗi khi xử lý quyết định khiếu nại.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Job Moderation
  const handleExecuteJobModeration = async () => {
    if (!selectedJob || !jobAction) return;

    if (jobAction === 'SUSPEND' && !jobReason.trim()) {
      setFeedback({ type: 'error', text: 'Bắt buộc nhập lý do đình chỉ tin tuyển dụng.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await adminApi.moderateJob(selectedJob.id, {
        action: jobAction,
        reason: jobReason.trim() || undefined
      });
      setFeedback({
        type: 'success',
        text: `Đã ${jobAction === 'SUSPEND' ? 'đình chỉ' : 'khôi phục'} tin tuyển dụng "${selectedJob.title}".`
      });
      setSelectedJob(null);
      setJobAction(null);
      fetchJobs();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Lỗi khi cập nhật trạng thái tin.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Report Resolution
  const handleExecuteReportResolution = async () => {
    if (!selectedReport || !reportAction) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await adminApi.resolveReport(selectedReport.id, {
        action: reportAction,
        resolutionNotes: reportNotes.trim() || undefined
      });
      setFeedback({
        type: 'success',
        text: `Báo cáo đã được ${reportAction === 'RESOLVE' ? 'giải quyết thành công' : 'bác bỏ'}.`
      });
      setSelectedReport(null);
      setReportAction(null);
      fetchReports();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Lỗi khi xử lý báo cáo.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#060D1E] text-slate-800 dark:text-slate-100 transition-colors">
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link
            href="/admin"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Trang Quản trị</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Kiểm Duyệt & Xử Lý Vi Phạm
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Giám sát tin tuyển dụng nghi vấn và giải quyết các báo cáo vi phạm tiêu chuẩn cộng đồng.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Khu vực Độc quyền Admin</span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('JOBS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'JOBS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#0B1329] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
              }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Kiểm Duyệt Tin Tuyển Dụng</span>
          </button>
          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'REPORTS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#0B1329] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
              }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Báo Cáo Vi Phạm Từ Người Dùng</span>
          </button>
          <button
            onClick={() => setActiveTab('APPEALS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'APPEALS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#0B1329] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
              }`}
          >
            <Scale className="w-4 h-4" />
            <span>Khiếu Nại Đình Chỉ ({appealsTotalElements})</span>
          </button>
        </div>

        {/* TAB 1: JOBS MODERATION */}
        {activeTab === 'JOBS' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={jobsSearch}
                  onChange={(e) => {
                    setJobsSearch(e.target.value);
                    setJobsPage(0);
                  }}
                  placeholder="Tìm theo tiêu đề tin tuyển dụng..."
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'PUBLISHED', label: 'Đang hiển thị' },
                  { id: 'SUSPENDED', label: 'Bị đình chỉ' },
                  { id: 'DRAFT', label: 'Bản nháp' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setJobsStatusFilter(s.id as any);
                      setJobsPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${jobsStatusFilter === s.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Jobs Loading */}
            {jobsLoading && (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0B1329] rounded-2xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang tải danh sách tin...</p>
              </div>
            )}

            {/* Jobs Error */}
            {!jobsLoading && jobsError && (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#0B1329] border border-rose-200 dark:border-rose-900/50 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lỗi tải dữ liệu</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">{jobsError}</p>
                <button
                  onClick={fetchJobs}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                </button>
              </div>
            )}

            {/* Jobs Empty */}
            {!jobsLoading && !jobsError && jobs.length === 0 && (
              <div className="p-12 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Không có tin tuyển dụng</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Không tìm thấy bài tuyển dụng nào phù hợp với bộ lọc hiện tại.
                </p>
              </div>
            )}

            {/* Jobs Table */}
            {!jobsLoading && !jobsError && jobs.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1329] shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#111C38] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Tiêu Đề Tin Tuyển Dụng</th>
                      <th className="py-3.5 px-4">Doanh Nghiệp</th>
                      <th className="py-3.5 px-4">Trạng Thái</th>
                      <th className="py-3.5 px-4">Lý Do Kiểm Duyệt</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {jobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                          <p>{j.title}</p>
                          <span className="text-[11px] font-normal text-slate-400 block mt-0.5">
                            {j.jobType || 'Toàn thời gian'} • {j.experienceLevel || 'Không yêu cầu'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{j.companyName || 'Công ty ẩn'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {j.status === 'PUBLISHED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Đang hiển thị
                            </span>
                          )}
                          {j.status === 'SUSPENDED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <Ban className="w-3 h-3" /> Đã đình chỉ
                            </span>
                          )}
                          {j.status === 'DRAFT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <FileText className="w-3 h-3" /> Bản nháp
                            </span>
                          )}
                          {j.status === 'CLOSED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" /> Đã đóng
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 max-w-xs truncate text-[11px] text-slate-500">
                          {j.moderationReason || '—'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {j.status === 'PUBLISHED' && (
                            <button
                              onClick={() => {
                                setSelectedJob(j);
                                setJobAction('SUSPEND');
                                setJobReason('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" /> Đình chỉ
                            </button>
                          )}
                          {j.status === 'SUSPENDED' && (
                            <button
                              onClick={() => {
                                setSelectedJob(j);
                                setJobAction('RESTORE');
                                setJobReason('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Jobs Pagination */}
                {jobsTotalPages > 1 && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Trang {jobsPage + 1} / {jobsTotalPages} (Tổng {jobsTotalElements} tin)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setJobsPage((p) => Math.max(0, p - 1))}
                        disabled={jobsPage === 0}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setJobsPage((p) => Math.min(jobsTotalPages - 1, p + 1))}
                        disabled={jobsPage >= jobsTotalPages - 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REPORTS MODERATION */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Đối tượng:</span>
                {(['ALL', 'JOB', 'COMPANY', 'CANDIDATE', 'RECRUITER'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setReportsTypeFilter(t);
                      setReportsPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${reportsTypeFilter === t
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    {t === 'ALL' ? 'Tất cả' : t === 'JOB' ? 'Tin tuyển dụng' : t === 'COMPANY' ? 'Doanh nghiệp' : t === 'CANDIDATE' ? 'Ứng viên' : 'Nhà tuyển dụng'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Trạng thái:</span>
                {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setReportsStatusFilter(s);
                      setReportsPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${reportsStatusFilter === s
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    {s === 'ALL' ? 'Tất cả' : s === 'PENDING' ? 'Chưa xử lý' : s === 'RESOLVED' ? 'Đã giải quyết' : 'Đã bác bỏ'}
                  </button>
                ))}
              </div>
            </div>

            {/* Reports Loading */}
            {reportsLoading && (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0B1329] rounded-2xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang tải báo cáo vi phạm...</p>
              </div>
            )}

            {/* Reports Error */}
            {!reportsLoading && reportsError && (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#0B1329] border border-rose-200 dark:border-rose-900/50 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lỗi tải dữ liệu</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">{reportsError}</p>
                <button
                  onClick={fetchReports}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                </button>
              </div>
            )}

            {/* Reports Empty */}
            {!reportsLoading && !reportsError && reports.length === 0 && (
              <div className="p-12 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hệ thống trong sạch</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Hiện không có báo cáo vi phạm nào cần giải quyết.
                </p>
              </div>
            )}

            {/* Reports Table */}
            {!reportsLoading && !reportsError && reports.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1329] shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#111C38] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Mục Tiêu Vi Phạm</th>
                      <th className="py-3.5 px-4">Lý Do Báo Cáo</th>
                      <th className="py-3.5 px-4">Mô Tả Chi Tiết</th>
                      <th className="py-3.5 px-4">Trạng Thái</th>
                      <th className="py-3.5 px-4">Ghi Chú Xử Lý</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4 font-mono font-medium text-slate-900 dark:text-white">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 mr-2">
                            {r.targetType}
                          </span>
                          <span className="text-[11px] text-slate-400">{r.targetId}</span>
                        </td>
                        <td className="py-4 px-4 font-semibold text-rose-600 dark:text-rose-400">
                          {r.reason}
                        </td>
                        <td className="py-4 px-4 max-w-sm truncate text-slate-600 dark:text-slate-300">
                          {r.details || 'Không có mô tả thêm'}
                        </td>
                        <td className="py-4 px-4">
                          {r.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" /> Đang chờ
                            </span>
                          )}
                          {r.status === 'RESOLVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Đã xử lý
                            </span>
                          )}
                          {r.status === 'DISMISSED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <XCircle className="w-3 h-3" /> Đã bác bỏ
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-500 text-[11px]">
                          {r.resolutionNotes || '—'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {r.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedReport(r);
                                  setReportAction('RESOLVE');
                                  setReportNotes('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition cursor-pointer"
                              >
                                Xử lý
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedReport(r);
                                  setReportAction('DISMISS');
                                  setReportNotes('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-[11px] transition cursor-pointer"
                              >
                                Bác bỏ
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Reports Pagination */}
                {reportsTotalPages > 1 && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Trang {reportsPage + 1} / {reportsTotalPages} (Tổng {reportsTotalElements} báo cáo)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReportsPage((p) => Math.max(0, p - 1))}
                        disabled={reportsPage === 0}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setReportsPage((p) => Math.min(reportsTotalPages - 1, p + 1))}
                        disabled={reportsPage >= reportsTotalPages - 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUSPENSION APPEALS */}
        {activeTab === 'APPEALS' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'SUBMITTED', label: 'Mới gửi' },
                  { id: 'UNDER_REVIEW', label: 'Đang xét duyệt' },
                  { id: 'APPROVED', label: 'Đã chấp thuận' },
                  { id: 'REJECTED', label: 'Đã từ chối' },
                  { id: 'CANCELLED', label: 'Đã hủy' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setAppealsStatusFilter(s.id as any);
                      setAppealsPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${appealsStatusFilter === s.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchAppeals()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm mới</span>
              </button>
            </div>

            {/* Appeals Table */}
            {appealsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-500">Đang tải danh sách khiếu nại...</span>
              </div>
            ) : appealsError ? (
              <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-center">
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{appealsError}</p>
                <button
                  onClick={() => fetchAppeals()}
                  className="mt-3 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white"
                >
                  Thử lại
                </button>
              </div>
            ) : appeals.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Scale className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Không có đơn khiếu nại nào</h4>
                <p className="text-xs text-slate-500 mt-1">Hiện không có đơn khiếu nại nào phù hợp với bộ lọc đã chọn.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1329] overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                    <tr>
                      <th className="py-3.5 px-4">Người Khiếu Nại</th>
                      <th className="py-3.5 px-4">Đối Tượng</th>
                      <th className="py-3.5 px-4">Tiêu Đề & Nội Dung</th>
                      <th className="py-3.5 px-4">Trạng Thái</th>
                      <th className="py-3.5 px-4">Thời Gian</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {appeals.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {a.appellantEmail || a.appellantUserId}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${a.targetType === 'COMPANY'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                            {a.targetType}
                          </span>
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-white">{a.subject}</div>
                          <p className="text-slate-500 dark:text-slate-400 truncate mt-0.5">{a.content}</p>
                          {a.evidenceAttachmentId && (
                            <a
                              href={a.evidenceAttachmentId}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 underline mt-1 inline-block"
                            >
                              Xem minh chứng đính kèm
                            </a>
                          )}
                          {a.resolutionNote && (
                            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-1.5 rounded">
                              <span className="font-semibold">Kết luận:</span> {a.resolutionNote}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${a.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            a.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              a.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                a.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                  'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500">
                          {new Date(a.submittedAt || a.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {a.status === 'SUBMITTED' && (
                              <button
                                onClick={() => handleStartReview(a)}
                                disabled={submitting}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition"
                              >
                                Xem xét
                              </button>
                            )}
                            {(a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW') && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedAppeal(a);
                                    setAppealAction('APPROVE');
                                    setAppealResolutionNote('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition"
                                >
                                  Chấp thuận
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAppeal(a);
                                    setAppealAction('REJECT');
                                    setAppealResolutionNote('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-[11px] transition"
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Appeals Pagination */}
                {appealsTotalPages > 1 && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Trang {appealsPage + 1} / {appealsTotalPages} (Tổng {appealsTotalElements} khiếu nại)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAppealsPage((p) => Math.max(0, p - 1))}
                        disabled={appealsPage === 0}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAppealsPage((p) => Math.min(appealsTotalPages - 1, p + 1))}
                        disabled={appealsPage >= appealsTotalPages - 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Appeal Action Confirm Dialog */}
        <ConfirmActionDialog
          isOpen={selectedAppeal !== null && appealAction !== null}
          title={
            appealAction === 'APPROVE'
              ? 'Xác nhận chấp thuận khiếu nại & Gỡ đình chỉ'
              : 'Xác nhận từ chối khiếu nại'
          }
          description={
            appealAction === 'APPROVE'
              ? 'Hành động này sẽ chấp thuận giải trình của người dùng, tự động gỡ bỏ trạng thái đình chỉ và khôi phục hoạt động bình thường.'
              : 'Đơn khiếu nại sẽ bị từ chối và trạng thái đình chỉ tiếp tục được duy trì.'
          }
          confirmLabel={appealAction === 'APPROVE' ? 'Chấp thuận & Gỡ đình chỉ' : 'Bác bỏ khiếu nại'}
          cancelLabel="Hủy bỏ"
          variant={appealAction === 'APPROVE' ? 'info' : 'danger'}
          isLoading={submitting}
          onConfirm={handleExecuteAppealResolution}
          onCancel={() => {
            setSelectedAppeal(null);
            setAppealAction(null);
            setAppealResolutionNote('');
          }}
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lý do / Căn cứ quyết định *
            </label>
            <textarea
              rows={3}
              required
              value={appealResolutionNote}
              onChange={(e) => setAppealResolutionNote(e.target.value)}
              placeholder="Ghi rõ lý do chấp thuận hoặc căn cứ từ chối khiếu nại..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </ConfirmActionDialog>

        {/* Job Action Modal */}
        {selectedJob && jobAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {jobAction === 'SUSPEND' ? 'Đình chỉ tin tuyển dụng' : 'Khôi phục tin tuyển dụng'}
              </h3>
              <p className="text-xs text-slate-500">
                Tin tuyển dụng: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedJob.title}</span>
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do điều chỉnh {jobAction === 'SUSPEND' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={jobReason}
                  onChange={(e) => setJobReason(e.target.value)}
                  placeholder="Ghi rõ lý do đình chỉ tin này..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    setJobAction(null);
                  }}
                  disabled={submitting}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleExecuteJobModeration}
                  disabled={submitting}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 ${jobAction === 'SUSPEND' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Resolution Modal */}
        {selectedReport && reportAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {reportAction === 'RESOLVE' ? 'Xác nhận xử lý vi phạm' : 'Xác nhận bác bỏ báo cáo'}
              </h3>
              <p className="text-xs text-slate-500">
                Đối tượng: <span className="font-mono text-slate-800 dark:text-slate-200">{selectedReport.targetType} ({selectedReport.targetId})</span>
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú kết luận xử lý
                </label>
                <textarea
                  rows={3}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Ghi chú chi tiết biện pháp giải quyết hoặc lý do bác bỏ..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setReportAction(null);
                  }}
                  disabled={submitting}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleExecuteReportResolution}
                  disabled={submitting}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 ${reportAction === 'RESOLVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
