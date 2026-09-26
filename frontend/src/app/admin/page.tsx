'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Building2,
  ShieldCheck,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Server,
  Activity,
  Layers,
  FileCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import { fetchAiSettings, testAiSettings } from '@/lib/api';
import { AiSettings } from '@/types';

export default function AdminDashboardPage() {
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ healthy: boolean; latencyMs?: number; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAiSettings()
      .then((data) => {
        setAiSettings(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleQuickAiCheck = async () => {
    if (!aiSettings) return;
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await testAiSettings({
        provider: aiSettings.provider,
        ollamaUrl: aiSettings.ollamaUrl,
        ollamaModel: aiSettings.ollamaModel,
        cloudBaseUrl: aiSettings.cloudBaseUrl,
        cloudModel: aiSettings.cloudModel,
      });
      setTestResult({
        healthy: res.healthy,
        latencyMs: res.latencyMs,
        message: res.message || (res.healthy ? 'Động cơ AI phản hồi tốt' : res.error || 'Kiểm tra thất bại'),
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
                  Hệ Thống Hoạt Động (Healthy)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Bảng Điều Khiển Quản Trị Hệ Thống MidCV
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Giám sát trung tâm toàn bộ hoạt động nền tảng, trạng thái động cơ bóc tách AI (LLM), vector embedding, thẩm định doanh nghiệp và thực thi phân quyền 3 role nghiêm ngặt.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/admin/ai-settings"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm whitespace-nowrap active:scale-95"
              >
                <Cpu className="w-4 h-4" />
                <span>Cấu hình AI</span>
              </Link>
              <Link
                href="/admin/companies"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap active:scale-95"
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Xác thực Doanh nghiệp</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Core Management Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: AI Engine */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {aiSettings?.provider || 'LOCAL_OLLAMA'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Động cơ Bóc tách AI</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {loading ? 'Đang tải...' : (aiSettings?.provider === 'LOCAL_OLLAMA' ? (aiSettings?.ollamaModel || 'Local Ollama') : (aiSettings?.cloudModel || 'Cloud AI'))}
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Vector: bge-m3 1024d</span>
              <button
                onClick={handleQuickAiCheck}
                disabled={testingAi}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${testingAi ? 'animate-spin' : ''}`} />
                <span>Kiểm tra</span>
              </button>
            </div>
            {testResult && (
              <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${testResult.healthy ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'}`}>
                {testResult.healthy ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Clock className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{testResult.message} {testResult.latencyMs != null && `(${testResult.latencyMs}ms)`}</span>
              </div>
            )}
          </div>

          {/* Card 2: Strict 3-Role Isolation */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                3 ROLES ISOLATED
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kiểm soát Phân quyền</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Candidate • Recruiter • Admin
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Frontend Guards: Active</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Khóa 100%</span>
            </div>
          </div>

          {/* Card 3: Company Verification */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                THẨM ĐỊNH
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hồ sơ Doanh nghiệp</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Quản lý Pháp lý Doanh nghiệp
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Xét duyệt đăng tin</span>
              <Link href="/admin/companies" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Xem chi tiết →
              </Link>
            </div>
          </div>

          {/* Card 4: Security & Integrity */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                SECURITY SHIELD
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bảo mật & Tenant Isolation</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Spring Security & JWT Filter
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Độc quyền Admin API</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Protected</span>
            </div>
          </div>
        </div>

        {/* 2 Feature Panels: Quick Control Suite + System Role Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Quick Action & Control Suite */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Trung Tâm Tác Vụ Quản Trị Hệ Thống
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-medium">Bản phát hành v1.0 Production-Ready</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Action Card 1: AI Settings */}
                <Link
                  href="/admin/ai-settings"
                  className="group p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-[#111C38] transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Cấu hình AI & Engine Đối sánh
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Thiết lập linh hoạt giữa Local Ollama (Granite 4.2 / BGE-M3) và Cloud OpenAI Compatible (OpenAI, DeepSeek, Google Gemini, Groq).
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Mở trình cấu hình AI →
                  </div>
                </Link>

                {/* Action Card 2: Company Verification */}
                <Link
                  href="/admin/companies"
                  className="group p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-[#111C38] transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Thẩm Định Pháp Lý Doanh Nghiệp
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Phê duyệt hoặc từ chối trạng thái xác minh doanh nghiệp tuyển dụng. Đảm bảo uy tín và bảo vệ ứng viên khỏi tin tuyển dụng rác.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Quản lý danh sách doanh nghiệp →
                  </div>
                </Link>
              </div>
            </div>

            {/* System Audit Events Stream */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Nhật Ký Kiểm Toán & Trạng Thái Hệ Thống
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Audit Defense Active
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111C38] border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="p-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
                      SECURITY
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Phân định 3 Role Độc Lập hoàn tất</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Đã thu hồi quyền Admin từ HR, bảo vệ nghiêm ngặt khu vực /admin và /api/admin/**.</p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[10px] font-mono whitespace-nowrap">Just now</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111C38] border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="p-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">
                      AI_ENGINE
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Native AI Ingestion & Vector Service Online</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Embedding bge-m3 1024d & pgvector HNSW indexing sẵn sàng phục vụ xếp hạng đối sánh.</p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[10px] font-mono whitespace-nowrap">Active</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111C38] border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="p-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                      VERIFICATION
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Quy trình Phê duyệt Doanh nghiệp kết nối API</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">API PUT /api/v1/admin/companies/:id/verification khóa cứng thẩm quyền ADMIN.</p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[10px] font-mono whitespace-nowrap">Enforced</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Role Architecture Card */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ma Trận Phân Quyền 3 Role (RBAC)
                </h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Hệ thống MidCV thiết lập cơ chế cô lập tuyệt đối giữa 3 vai trò người dùng nhằm bảo đảm an toàn dữ liệu và trải nghiệm mạch lạc:
              </p>

              <div className="space-y-3 pt-1">
                {/* Candidate Role */}
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-900 dark:text-blue-300">1. CANDIDATE (Ứng viên)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">ROLE_CANDIDATE</span>
                  </div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-normal">
                    Truy cập Cổng Ứng viên: Tạo CV chuẩn ATS, trích xuất AI, xem báo cáo đối sánh và xác thực hồ sơ GitHub.
                  </p>
                </div>

                {/* Recruiter Role */}
                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-900 dark:text-amber-300">2. RECRUITER (HR Tuyển dụng)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">ROLE_HR</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                    Truy cập HR Portal: Soạn thảo & xuất bản tin tuyển dụng, xếp hạng ứng viên theo bằng chứng, quản lý hồ sơ doanh nghiệp.
                  </p>
                </div>

                {/* Admin Role */}
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-900 dark:text-indigo-300">3. ADMIN (Quản trị Hệ thống)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold">ROLE_ADMIN</span>
                  </div>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-normal">
                    Truy cập Admin Portal: Cấu hình động cơ AI toàn hệ thống, thẩm định tư cách pháp nhân doanh nghiệp, bảo toàn an ninh.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-900/50 text-white space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Liên kết Nhanh</span>
              </div>
              <div className="flex flex-col space-y-1 text-xs">
                <Link href="/admin/ai-settings" className="py-1.5 px-2.5 rounded-lg hover:bg-white/10 transition text-slate-300 hover:text-white flex items-center justify-between">
                  <span>Trang Cấu hình AI Engine</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link href="/admin/companies" className="py-1.5 px-2.5 rounded-lg hover:bg-white/10 transition text-slate-300 hover:text-white flex items-center justify-between">
                  <span>Trang Thẩm định Doanh nghiệp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link href="/jobs" className="py-1.5 px-2.5 rounded-lg hover:bg-white/10 transition text-slate-300 hover:text-white flex items-center justify-between">
                  <span>Xem Danh sách Tin Tuyển Dụng</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
