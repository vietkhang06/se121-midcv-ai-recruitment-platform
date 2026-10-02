'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ShieldAlert,
  Loader2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Ban,
  FileEdit,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { CompanyAdminDto, CompanyVerificationState, CompanyReviewAction } from '@/types';

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyAdminDto[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Review Actions
  const [selectedCompany, setSelectedCompany] = useState<CompanyAdminDto | null>(null);
  const [actionType, setActionType] = useState<CompanyReviewAction | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getCompanies({
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        search: searchTerm.trim() || undefined,
        page: currentPage,
        size: 10
      });
      setCompanies(res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách doanh nghiệp.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, searchTerm]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleOpenActionModal = (company: CompanyAdminDto, action: CompanyReviewAction) => {
    setSelectedCompany(company);
    setActionType(action);
    setActionNotes('');
    setFeedback(null);
  };

  const handleExecuteAction = async () => {
    if (!selectedCompany || !actionType) return;

    // Check mandatory notes for rejection, change request, suspension
    if (['REQUEST_CHANGES', 'REJECT', 'SUSPEND'].includes(actionType) && !actionNotes.trim()) {
      setFeedback({
        type: 'error',
        text: 'Vui lòng nhập lý do cụ thể cho thao tác này.'
      });
      return;
    }

    setSubmittingAction(true);
    setFeedback(null);
    try {
      await adminApi.transitionCompanyVerification(selectedCompany.id, {
        action: actionType,
        notes: actionNotes.trim() || undefined
      });
      setFeedback({
        type: 'success',
        text: `Thao tác [${actionType}] với doanh nghiệp "${selectedCompany.name}" thành công.`
      });
      setSelectedCompany(null);
      setActionType(null);
      fetchCompanies();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Lỗi khi cập nhật trạng thái doanh nghiệp.'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const renderStatusBadge = (status: CompanyVerificationState) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Đã xác minh
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Eye className="w-3 h-3" />
            Đang thẩm định
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <FileEdit className="w-3 h-3" />
            Yêu cầu sửa đổi
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            Chờ thẩm định
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3" />
            Bị từ chối
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Ban className="w-3 h-3" />
            Bị đình chỉ
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#060D1E] text-slate-800 dark:text-slate-100 transition-colors">
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        
        {/* Breadcrumb Navigation */}
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
                <Building2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Thẩm Định & Xác Thực Doanh Nghiệp
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Kiểm tra hồ sơ pháp lý, phê duyệt quyền đăng tin tuyển dụng và quản lý trạng thái doanh nghiệp.
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
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
              feedback.type === 'success'
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

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Tìm theo tên công ty hoặc MST..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'PENDING', label: 'Chờ duyệt' },
              { id: 'UNDER_REVIEW', label: 'Đang thẩm định' },
              { id: 'VERIFIED', label: 'Đã xác minh' },
              { id: 'CHANGES_REQUESTED', label: 'Yêu cầu sửa đổi' },
              { id: 'REJECTED', label: 'Từ chối' },
              { id: 'SUSPENDED', label: 'Đình chỉ' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setFilterStatus(st.id);
                  setCurrentPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  filterStatus === st.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0B1329] rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang tải danh sách thẩm định doanh nghiệp...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#0B1329] border border-rose-200 dark:border-rose-900/50 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lỗi tải dữ liệu</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchCompanies}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Thử lại
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && companies.length === 0 && (
          <div className="p-12 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Không có doanh nghiệp nào</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Không tìm thấy hồ sơ doanh nghiệp nào phù hợp với bộ lọc hoặc từ khóa hiện tại.
            </p>
          </div>
        )}

        {/* Company Table */}
        {!loading && !error && companies.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1329] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#111C38] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Tên Doanh Nghiệp</th>
                  <th className="py-3.5 px-4">Mã Số Thuế</th>
                  <th className="py-3.5 px-4">Lĩnh Vực / Địa Điểm</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Ghi Chú Xét Duyệt</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác Thẩm Định</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>{c.name}</span>
                      </div>
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block ml-6">
                        Website: {c.website || 'Chưa cung cấp'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {c.taxCode || 'Chưa có'}
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                      <p className="font-medium">{c.industry || 'Chưa cập nhật'}</p>
                      <p className="text-[11px] text-slate-400">{c.location || 'N/A'}</p>
                    </td>
                    <td className="py-4 px-4">
                      {renderStatusBadge(c.verificationStatus)}
                    </td>
                    <td className="py-4 px-4 max-w-xs truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {c.reviewNotes || '—'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {c.verificationStatus === 'PENDING' && (
                          <button
                            onClick={() => handleOpenActionModal(c, 'START_REVIEW')}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Bắt đầu duyệt</span>
                          </button>
                        )}

                        {['PENDING', 'UNDER_REVIEW'].includes(c.verificationStatus) && (
                          <>
                            <button
                              onClick={() => handleOpenActionModal(c, 'VERIFY')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Xác minh</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal(c, 'REQUEST_CHANGES')}
                              className="px-2.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              <span>Yêu cầu sửa</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal(c, 'REJECT')}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Từ chối</span>
                            </button>
                          </>
                        )}

                        {c.verificationStatus === 'VERIFIED' && (
                          <button
                            onClick={() => handleOpenActionModal(c, 'SUSPEND')}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Đình chỉ</span>
                          </button>
                        )}

                        {c.verificationStatus === 'SUSPENDED' && (
                          <button
                            onClick={() => handleOpenActionModal(c, 'RESTORE')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Khôi phục</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Trang {currentPage + 1} / {totalPages} (Tổng {totalElements} doanh nghiệp)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Confirmation Modal */}
        {selectedCompany && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Xác nhận thao tác: {actionType}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Doanh nghiệp: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCompany.name}</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do / Ghi chú thẩm định {['REQUEST_CHANGES', 'REJECT', 'SUSPEND'].includes(actionType) && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={
                    ['REQUEST_CHANGES', 'REJECT', 'SUSPEND'].includes(actionType)
                      ? 'Bắt buộc ghi rõ lý do đưa ra quyết định này...'
                      : 'Ghi chú nội bộ bổ sung (tùy chọn)...'
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedCompany(null);
                    setActionType(null);
                  }}
                  disabled={submittingAction}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleExecuteAction}
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xác nhận thực hiện
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
