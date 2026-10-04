'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Building2,
  ShieldCheck,
  Users,
  CheckCircle2,
  ArrowRight,
  Activity,
  RefreshCw,
  Clock,
  ShieldAlert,
  Briefcase,
  AlertTriangle,
  Tags,
  History,
  Check,
  XCircle
} from 'lucide-react';
import { fetchAdminDashboardStats, testAiSettings } from '@/lib/api';
import { AdminDashboardStats } from '@/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ healthy: boolean; latencyMs?: number; message?: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchAdminDashboardStats()
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load admin stats:', err);
        setError('Không thể kết nối đến máy chủ quản trị. Vui lòng thử lại sau.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickAiCheck = async () => {
    if (!stats?.aiStatus) return;
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await testAiSettings({
        provider: stats.aiStatus.provider as 'LOCAL_OLLAMA' | 'CLOUD_OPENAI_COMPATIBLE',
      });
      setTestResult({
        healthy: res.healthy,
        latencyMs: res.latencyMs,
        message: res.message || (res.healthy ? 'Động cơ AI hoạt động tốt' : res.error || 'Kiểm tra thất bại'),
      });
    } catch {
      setTestResult({ healthy: false, message: 'Không thể kết nối đến máy chủ AI' });
    } finally {
      setTestingAi(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#060D1E] text-slate-800 dark:text-slate-100 transition-colors">
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        
        {/* Executive Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1329] via-[#111C38] to-[#1E1B4B] p-6 sm:p-8 border border-indigo-900/40 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  Central Admin Command
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Hệ Thống Hoạt Động (Production Active)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Bảng Điều Khiển Quản Trị Hệ Thống MidCV
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Giám sát trung tâm toàn bộ hoạt động nền tảng, thẩm định pháp lý doanh nghiệp, kiểm soát an toàn tài khoản người dùng và nhật ký kiểm toán bất biến.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
              <Link
                href="/admin/companies"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm whitespace-nowrap active:scale-95"
              >
                <Building2 className="w-4 h-4" />
                <span>Hàng đợi Thẩm định</span>
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-bold underline hover:no-underline cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* 4 Core Management Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Users */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                {loading ? '...' : `${stats?.activeUsersCount || 0} Hoạt động`}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng Người Dùng</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {loading ? '...' : (stats?.totalUsers || 0)}
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                {stats?.candidatesCount || 0} Ứng viên • {stats?.recruitersCount || 0} Tuyển dụng
              </span>
              <Link href="/admin/users" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Quản lý →
              </Link>
            </div>
          </div>

          {/* Card 2: Company Verification Queue */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                {loading ? '...' : `${stats?.companiesPendingCount || 0} Chờ duyệt`}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Doanh Nghiệp Đã Xác Minh</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {loading ? '...' : (stats?.companiesVerifiedCount || 0)}
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                {stats?.companiesUnderReviewCount || 0} Đang review • {stats?.companiesSuspendedCount || 0} Đình chỉ
              </span>
              <Link href="/admin/companies" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Xét duyệt →
              </Link>
            </div>
          </div>

          {/* Card 3: Active Jobs & Moderation */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                {loading ? '...' : `${stats?.activeJobsCount || 0} Xuất bản`}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tin Tuyển Dụng</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {loading ? '...' : (stats?.activeJobsCount || 0)}
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                {stats?.suspendedJobsCount || 0} Tin bị đình chỉ
              </span>
              <Link href="/admin/moderation" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Kiểm duyệt →
              </Link>
            </div>
          </div>

          {/* Card 4: Reports & Violations */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                (stats?.pendingReportsCount || 0) > 0
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 animate-pulse'
                  : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              }`}>
                {loading ? '...' : `${stats?.pendingReportsCount || 0} Cần xử lý`}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Báo Cáo Vi Phạm</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {loading ? '...' : (stats?.pendingReportsCount || 0)}
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                {(stats?.pendingReportsCount || 0) === 0 ? 'Không có báo cáo tồn đọng' : 'Ưu tiên xử lý ngay'}
              </span>
              <Link href="/admin/moderation" className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline">
                Xem báo cáo →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Navigation Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Trung Tâm Tác Vụ Quản Trị Hệ Thống
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-medium">MidCV Enterprise Control</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* 1. Doanh nghiệp */}
                <Link
                  href="/admin/companies"
                  className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-[#111C38] transition flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Thẩm Định Doanh Nghiệp
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Xét duyệt giấy phép, mã số thuế và thẩm quyền đăng tin của nhà tuyển dụng.
                    </p>
                  </div>
                  <div className="mt-3 text-xs font-bold text-amber-600 dark:text-amber-400">
                    {stats?.companiesPendingCount || 0} công ty đang chờ duyệt →
                  </div>
                </Link>

                {/* 2. Người dùng */}
                <Link
                  href="/admin/users"
                  className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-[#111C38] transition flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        <Users className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Quản Trị Người Dùng
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Kiểm soát an toàn tài khoản Ứng viên và Recruiter, đình chỉ vi phạm với lý do bắt buộc.
                    </p>
                  </div>
                  <div className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400">
                    {stats?.totalUsers || 0} tài khoản đăng ký →
                  </div>
                </Link>

                {/* 3. Kiểm duyệt */}
                <Link
                  href="/admin/moderation"
                  className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-[#111C38] transition flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Kiểm Duyệt Tin & Báo Cáo
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Xử lý báo cáo gian lận, đình chỉ tin tuyển dụng vi phạm và bảo vệ ứng viên.
                    </p>
                  </div>
                  <div className="mt-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                    {stats?.pendingReportsCount || 0} báo cáo cần xem xét →
                  </div>
                </Link>

                {/* 4. Taxonomy */}
                <Link
                  href="/admin/taxonomy"
                  className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-[#111C38] transition flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        <Tags className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Từ Điển Taxonomy Kỹ Năng
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Quản lý từ khóa chuẩn hóa, bí danh đa ngôn ngữ và phân cấp kỹ năng cho AI Engine.
                    </p>
                  </div>
                  <div className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Tra cứu và chuẩn hóa →
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Audit Logs Table */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Nhật Ký Tác Vụ Quản Trị Gần Đây
                  </h2>
                </div>
                <Link href="/admin/audit-logs" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Xem tất cả →
                </Link>
              </div>

              {(!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có nhật ký tác vụ quản trị nào được ghi nhận.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                        <th className="pb-2.5">Thời gian</th>
                        <th className="pb-2.5">Quản trị viên</th>
                        <th className="pb-2.5">Hành động</th>
                        <th className="pb-2.5">Đối tượng</th>
                        <th className="pb-2.5">Chi tiết / Lý do</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
                      {stats.recentAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-2.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td className="py-2.5 font-medium whitespace-nowrap">
                            {log.adminEmail}
                          </td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-400">
                            {log.targetType}
                          </td>
                          <td className="py-2.5 max-w-[200px] truncate text-slate-500 dark:text-slate-400">
                            {log.reason || `${log.previousState || ''} → ${log.newState || ''}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Engine Health & System Shield */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Động Cơ AI & LLM
                  </h3>
                </div>
                <button
                  onClick={handleQuickAiCheck}
                  disabled={testingAi}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${testingAi ? 'animate-spin' : ''}`} />
                  <span>Test</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">Chế độ hoạt động</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {stats?.aiStatus?.provider || 'LOCAL_OLLAMA'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">Model nội bộ</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {stats?.aiStatus?.ollamaModel || 'dna5rm/granite4.2'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">Model Cloud</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {stats?.aiStatus?.cloudModel || 'gpt-4o-mini'}
                  </span>
                </div>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.healthy
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
                }`}>
                  {testResult.healthy ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0" />}
                  <span className="leading-snug">{testResult.message} {testResult.latencyMs != null && `(${testResult.latencyMs}ms)`}</span>
                </div>
              )}

              <Link
                href="/admin/ai-settings"
                className="block text-center py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition"
              >
                Cấu hình chuyên sâu →
              </Link>
            </div>

            {/* Security Architecture Invariant Box */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Ranh Giới Bảo Mật Bất Biến
                </h3>
              </div>
              <ul className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Admin không sửa CV và không sửa điểm matching của AI.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Chỉ doanh nghiệp VERIFIED mới được phép xuất bản tin tuyển dụng.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Toàn bộ hành động quản trị được ghi nhật ký kiểm toán bất biến.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
