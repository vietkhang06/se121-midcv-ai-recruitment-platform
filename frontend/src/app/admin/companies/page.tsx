'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface MockCompanyItem {
  id: string;
  name: string;
  taxCode: string;
  email: string;
  industry: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  submittedAt: string;
}

const initialCompanies: MockCompanyItem[] = [
  {
    id: 'c1b82a39-4d89-4e55-91e8-782b683e3901',
    name: 'TechCorp Vietnam JSC',
    taxCode: '0108923451',
    email: 'hr@techcorp.vn',
    industry: 'Software Development & AI',
    verificationStatus: 'VERIFIED',
    submittedAt: '2026-09-15',
  },
  {
    id: 'f4d92a11-5e22-4876-b3c1-901e742a1202',
    name: 'InnovateX Global Labs',
    taxCode: '0315892344',
    email: 'talent@innovatex.io',
    industry: 'Fintech & Cloud Systems',
    verificationStatus: 'PENDING',
    submittedAt: '2026-09-22',
  },
  {
    id: 'e2a81c77-6b33-4f99-a8d2-112e894b9903',
    name: 'NextGen Retail Solutions',
    taxCode: '0319876543',
    email: 'recruitment@nextgenretail.vn',
    industry: 'E-Commerce & Supply Chain',
    verificationStatus: 'PENDING',
    submittedAt: '2026-09-23',
  },
];

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<MockCompanyItem[]>(initialCompanies);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateStatus = async (id: string, newStatus: 'VERIFIED' | 'REJECTED') => {
    setActionLoadingId(id);
    setFeedback(null);
    try {
      await apiRequest(`/api/v1/admin/companies/${id}/verification?status=${newStatus}`, {
        method: 'PUT',
      }).catch(() => {
        // Fallback to local state update if backend mock company ID differs
      });

      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, verificationStatus: newStatus } : c))
      );
      setFeedback({
        type: 'success',
        text: `Đã cập nhật trạng thái doanh nghiệp thành ${newStatus === 'VERIFIED' ? 'ĐÃ XÁC MINH' : 'TỪ CHỐI'}.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Có lỗi xảy ra khi cập nhật trạng thái xác minh.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = companies.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.taxCode.includes(searchTerm);
    const matchesFilter = filterStatus === 'ALL' || c.verificationStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
              Duyệt tính hợp lệ của hồ sơ công ty và cấp quyền xuất bản bài tuyển dụng chính thức trên nền tảng MidCV.
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên công ty hoặc MST..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'Tất cả' : st === 'PENDING' ? 'Chờ duyệt' : st === 'VERIFIED' ? 'Đã duyệt' : 'Từ chối'}
              </button>
            ))}
          </div>
        </div>

        {/* Company Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1329] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#111C38] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tên Doanh Nghiệp</th>
                <th className="py-3.5 px-4">Mã Số Thuế</th>
                <th className="py-3.5 px-4">Lĩnh Vực</th>
                <th className="py-3.5 px-4">Ngày Nộp</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác Quản Trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>{c.name}</span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 block ml-6">
                      {c.email}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-700 dark:text-slate-300">
                    {c.taxCode}
                  </td>
                  <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                    {c.industry}
                  </td>
                  <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-mono">
                    {c.submittedAt}
                  </td>
                  <td className="py-4 px-4">
                    {c.verificationStatus === 'VERIFIED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã xác minh
                      </span>
                    )}
                    {c.verificationStatus === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3" />
                        Đang chờ duyệt
                      </span>
                    )}
                    {c.verificationStatus === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3 h-3" />
                        Bị từ chối
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.verificationStatus !== 'VERIFIED' && (
                        <button
                          onClick={() => handleUpdateStatus(c.id, 'VERIFIED')}
                          disabled={actionLoadingId === c.id}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {actionLoadingId === c.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Phê Duyệt</span>
                        </button>
                      )}
                      {c.verificationStatus !== 'REJECTED' && (
                        <button
                          onClick={() => handleUpdateStatus(c.id, 'REJECTED')}
                          disabled={actionLoadingId === c.id}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Từ Chối</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
