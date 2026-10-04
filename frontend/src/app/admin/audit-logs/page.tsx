'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Search,
  ShieldAlert,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { AdminAuditLogDto } from '@/types';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLogDto[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAuditLogs({
        targetType: targetTypeFilter === 'ALL' ? undefined : targetTypeFilter,
        page: currentPage,
        size: 15
      });
      setLogs(res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải nhật ký quản trị.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, targetTypeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
                <FileText className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Nhật Ký Quản Trị Hệ Thống (Audit Logs)
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Lưu vết bất biến toàn bộ hành vi thẩm định, thay đổi trạng thái và can thiệp bảo mật của Quản trị viên.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 shrink-0">
            <Shield className="w-4 h-4 text-rose-500" />
            <span>Bất biến & Chỉ đọc</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Đối tượng tác động:</span>
            {(['ALL', 'COMPANY', 'USER', 'JOB', 'REPORT', 'TAXONOMY'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTargetTypeFilter(t);
                  setCurrentPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  targetTypeFilter === t
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {t === 'ALL' ? 'Tất cả' : t}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0B1329] rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang tải nhật ký quản trị...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#0B1329] border border-rose-200 dark:border-rose-900/50 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lỗi tải dữ liệu</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Thử lại
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && logs.length === 0 && (
          <div className="p-12 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Không có bản ghi nhật ký</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Chưa có thao tác quản trị nào được ghi lại đối với bộ lọc này.
            </p>
          </div>
        )}

        {/* Log Table */}
        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1329] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#111C38] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Thời Gian</th>
                  <th className="py-3.5 px-4">Admin Phụ Trách</th>
                  <th className="py-3.5 px-4">Hành Động</th>
                  <th className="py-3.5 px-4">Mục Tiêu (Target)</th>
                  <th className="py-3.5 px-4">Lý Do / Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(l.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {l.adminEmail || l.adminId}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1.5">
                        {l.targetType}:
                      </span>
                      <span className="text-[11px] text-slate-400">{l.targetId}</span>
                    </td>
                    <td className="py-4 px-4 max-w-sm truncate text-slate-600 dark:text-slate-300">
                      {l.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Trang {currentPage + 1} / {totalPages} (Tổng {totalElements} bản ghi)
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

      </main>
    </div>
  );
}
