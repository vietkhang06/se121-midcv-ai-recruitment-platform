'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Search,
  ShieldAlert,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Ban,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Building2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Mail
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { UserAdminDto, UserRole } from '@/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserAdminDto[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Moderation
  const [selectedUser, setSelectedUser] = useState<UserAdminDto | null>(null);
  const [moderationAction, setModerationAction] = useState<'SUSPEND' | 'REACTIVATE' | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchTerm.trim() || undefined,
        page: currentPage,
        size: 10
      });
      setUsers(res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, roleFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenModeration = (user: UserAdminDto, action: 'SUSPEND' | 'REACTIVATE') => {
    setSelectedUser(user);
    setModerationAction(action);
    setModerationReason('');
    setFeedback(null);
  };

  const handleExecuteModeration = async () => {
    if (!selectedUser || !moderationAction) return;

    if (moderationAction === 'SUSPEND' && !moderationReason.trim()) {
      setFeedback({
        type: 'error',
        text: 'Vui lòng nhập lý do đình chỉ tài khoản này.'
      });
      return;
    }

    setSubmittingAction(true);
    setFeedback(null);
    try {
      await adminApi.moderateUser(selectedUser.id, {
        action: moderationAction,
        reason: moderationReason.trim() || undefined
      });
      setFeedback({
        type: 'success',
        text: `Đã ${moderationAction === 'SUSPEND' ? 'đình chỉ' : 'kích hoạt lại'} tài khoản ${selectedUser.email}.`
      });
      setSelectedUser(null);
      setModerationAction(null);
      fetchUsers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Có lỗi xảy ra khi cập nhật tài khoản.'
      });
    } finally {
      setSubmittingAction(false);
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
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Quản Trị Tài Khoản Người Dùng
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Theo dõi và quản lý an toàn tài khoản Ứng viên (Candidate) và Nhà tuyển dụng (Recruiter) trên nền tảng.
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

        {/* Filter Controls */}
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
              placeholder="Tìm theo email hoặc họ tên..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {/* Role Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              {(['ALL', 'CANDIDATE', 'RECRUITER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRoleFilter(r);
                    setCurrentPage(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    roleFilter === r
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {r === 'ALL' ? 'Tất cả Vai trò' : r === 'CANDIDATE' ? 'Ứng viên' : r === 'RECRUITER' ? 'Tuyển dụng' : 'Admin'}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setCurrentPage(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === s
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s === 'ALL' ? 'Mọi trạng thái' : s === 'ACTIVE' ? 'Hoạt động' : 'Đã đình chỉ'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0B1329] rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang tải danh sách tài khoản...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#0B1329] border border-rose-200 dark:border-rose-900/50 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lỗi tải dữ liệu</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Thử lại
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && users.length === 0 && (
          <div className="p-12 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Không tìm thấy người dùng</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Không có tài khoản nào phù hợp với tiêu chí lọc hoặc từ khóa tìm kiếm.
            </p>
          </div>
        )}

        {/* User Table */}
        {!loading && !error && users.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1329] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#111C38] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Tài Khoản / Email</th>
                  <th className="py-3.5 px-4">Họ và Tên</th>
                  <th className="py-3.5 px-4">Vai Trò</th>
                  <th className="py-3.5 px-4">Doanh Nghiệp (Recruiter)</th>
                  <th className="py-3.5 px-4">Xác Thực Email</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {u.fullName || '—'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : u.role === 'RECRUITER'
                          ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {u.role === 'ADMIN' ? 'Admin' : u.role === 'RECRUITER' ? 'Recruiter' : 'Candidate'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                      {u.companyName ? (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{u.companyName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {u.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          <XCircle className="w-3 h-3" /> Chưa xác thực
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {u.accountStatus === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <UserCheck className="w-3 h-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <Ban className="w-3 h-3" /> Đình chỉ
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {u.role !== 'ADMIN' && (
                        <div>
                          {u.accountStatus === 'ACTIVE' ? (
                            <button
                              onClick={() => handleOpenModeration(u, 'SUSPEND')}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Đình chỉ</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenModeration(u, 'REACTIVATE')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Kích hoạt lại</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Trang {currentPage + 1} / {totalPages} (Tổng {totalElements} tài khoản)
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
        {selectedUser && moderationAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  moderationAction === 'SUSPEND'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                }`}>
                  {moderationAction === 'SUSPEND' ? <Ban className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {moderationAction === 'SUSPEND' ? 'Đình chỉ tài khoản' : 'Kích hoạt lại tài khoản'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Người dùng: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUser.email}</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do điều chỉnh {moderationAction === 'SUSPEND' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder={
                    moderationAction === 'SUSPEND'
                      ? 'Bắt buộc nhập lý do đình chỉ tài khoản này (ví dụ: vi phạm chính sách, báo cáo spam...)'
                      : 'Nhập ghi chú kích hoạt lại (tùy chọn)...'
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setModerationAction(null);
                  }}
                  disabled={submittingAction}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleExecuteModeration}
                  disabled={submittingAction}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 ${
                    moderationAction === 'SUSPEND'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xác nhận {moderationAction === 'SUSPEND' ? 'đình chỉ' : 'kích hoạt'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
