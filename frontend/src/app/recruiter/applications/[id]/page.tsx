'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { MatchInspectionData } from '@/types';
import { fetchMatchInspection } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { ScoreBreakdownCard } from '@/components/recruiter/ScoreBreakdownCard';
import { GitHubAssessmentCard } from '@/components/recruiter/GitHubAssessmentCard';
import {
  ArrowLeft,
  User,
  FileText,
  CheckCircle2,
  Award,
  GitBranch,
  Sparkles,
  Building2,
  Calendar,
  Lock,
  Unlock,
  ShieldCheck,
  Mail,
  Phone,
  Share2,
  Download
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { EmptyState } from '@/components/common/EmptyState';

export default function CandidateMatchInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t } = useLanguage();
  const [data, setData] = useState<MatchInspectionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isContactUnlocked, setIsContactUnlocked] = useState<boolean>(false);

  useEffect(() => {
    fetchMatchInspection(resolvedParams.id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 transition-colors flex items-center justify-center">
        <EmptyState
          type="LOADING"
          title={t('common.loading', 'Đang tải dữ liệu...')}
          description="Đang kết nối AI telemetry và trích xuất điểm số đối sánh..."
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 transition-colors py-12 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/recruiter/jobs" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Bảng Xếp Hạng & Quản lý Đơn Nộp</span>
          </Link>
        </div>
        <EmptyState
          type="EMPTY"
          title={t('emptyStates.match.noMatchDataTitle', 'Không tìm thấy dữ liệu đối sánh')}
          description={t('emptyStates.match.noMatchDataDesc', 'Đơn ứng tuyển này chưa được tính toán đối sánh hoặc không tồn tại trong hệ thống.')}
          primaryCtaText="Quay lại Bảng Xếp Hạng Tuyển Dụng"
          primaryCtaHref="/recruiter/jobs"
        />
      </div>
    );
  }

  const maskedEmail = 'n***@example.com';
  const realEmail = 'nguyenvanjava@example.com';
  const maskedPhone = '091***678';
  const realPhone = '0912345678';

  const matchedSkillsCount = data.requiredSkillsStatus.filter((s) => s.status === 'MATCH').length;
  const totalSkillsCount = data.requiredSkillsStatus.length;

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/recruiter/jobs" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Bảng Xếp Hạng & Quản lý Đơn Nộp</span>
          </Link>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Application ID: #{data.applicationId}</span>
        </div>

        {/* SCREEN 08: Evidence Verification Index Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-[#1B3D34] pb-6">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 tracking-wider uppercase font-mono block">
              EVIDENCE VERIFICATION INDEX
            </span>
            <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">
              {data.candidateName} vs. {data.jobTitle || 'CloudScale Systems'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hệ thống đối sánh đa chiều MatchJD • Phân tích độ tương thích thực tế dựa trên Grounded Evidence
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => alert('Đã sao chép liên kết báo cáo đối sánh')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1B3D34] bg-white dark:bg-[#0E241E] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#14332B] font-semibold text-xs transition shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Report</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0C2B24] hover:bg-[#133E34] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#040D0A] font-semibold text-xs transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Match PDF</span>
            </button>
          </div>
        </div>

        {/* Top 2-Card Row: Overall Fit Index & Match Explanation Narrative */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Overall Fit Index (Radial progress) */}
          <div className="md:col-span-4 bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col items-center justify-center text-center space-y-4 transition-colors">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block font-mono">
              Overall Fit Index
            </span>

            {/* Radial SVG Meter */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#E2E8F0"
                  className="stroke-slate-200 dark:stroke-[#1B3D34]"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#10B981"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - Math.min(100, data.overallScore) / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-editorial font-bold text-slate-900 dark:text-white">
                  {data.overallScore.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-mono">MATCH</span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              CONFIDENCE INTERVAL: 94-98%
            </span>
          </div>

          {/* Card 2: Match Explanation Narrative */}
          <div className="md:col-span-8 bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono text-slate-900 dark:text-white uppercase tracking-wider">
                  Match Explanation Narrative
                </h3>
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full font-mono">
                  Top 4% Match
                </span>
              </div>

              {/* Required by tests: 'Giải thích Trí tuệ Nhân tạo' */}
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Giải thích Trí tuệ Nhân tạo (Grounded Evidence Explanation):</span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {data.humanReadableExplanation}
              </p>
            </div>

            {/* Bottom KPI metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-[#1B3D34]">
              <div>
                <span className="text-2xl sm:text-3xl font-editorial font-bold text-amber-600 dark:text-amber-400 block font-mono">
                  {Math.round(data.overallScore)}th
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                  PERCENTILE RANK
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-editorial font-bold text-amber-600 dark:text-amber-400 block font-mono">
                  {matchedSkillsCount} of {totalSkillsCount}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                  SKILLS VERIFIED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Protection Contact Bar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors">
          <div className="space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Bảo Mật Thông Tin Liên Hệ Ứng Viên (Enterprise Privacy Guard):</span>
            </span>
            <div className="flex items-center gap-5 text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-slate-900 dark:text-white font-medium">{isContactUnlocked ? realEmail : maskedEmail}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-slate-900 dark:text-white font-medium">{isContactUnlocked ? realPhone : maskedPhone}</span>
              </span>
            </div>
          </div>

          {!isContactUnlocked ? (
            <button
              onClick={() => setIsContactUnlocked(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0C2B24] hover:bg-[#133E34] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#040D0A] shadow-xs active:scale-95 transition flex-shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400 dark:text-[#040D0A]" />
              <span>Mở khóa Liên hệ / Phỏng vấn</span>
            </button>
          ) : (
            <span className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 font-mono">
              <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Đã mở khóa liên hệ</span>
            </span>
          )}
        </div>

        {/* Match Scores & Semantic Skills Breakdown */}
        <ScoreBreakdownCard data={data} />

        {/* GitHub Assessment Card */}
        <GitHubAssessmentCard assessment={data.githubAssessment} />

        {/* Snapshot CV Inspection Section */}
        <div className="bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-6 sm:p-7 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1B3D34] pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <h3 className="text-base font-bold font-editorial text-slate-900 dark:text-white">Bản Ghi Snapshot CV Tại Thời Điểm Nộp Đơn</h3>
            </div>
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full font-semibold">
              ✓ Immutable Snapshot Preserved
            </span>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] space-y-4 text-xs transition-colors">
            <div className="space-y-1">
              <h4 className="font-bold font-mono text-slate-900 dark:text-white uppercase text-[11px]">CV Tóm tắt Bản thân</h4>
              <p className="text-slate-600 dark:text-slate-300">
                Lập trình viên Backend với 3.5 năm kinh nghiệm Java 21, Spring Boot và PostgreSQL. Đam mê thiết kế hệ thống Microservices quy mô lớn.
              </p>
            </div>

            <div className="space-y-1 border-t border-slate-200 dark:border-[#1B3D34] pt-3">
              <h4 className="font-bold font-mono text-slate-900 dark:text-white uppercase text-[11px]">Kỹ năng Chuyên môn Trích xuất</h4>
              <p className="text-slate-600 dark:text-slate-300">Java 21, Spring Boot, PostgreSQL, Docker, Redis, REST API, Git</p>
            </div>

            <div className="space-y-1 border-t border-slate-200 dark:border-[#1B3D34] pt-3">
              <h4 className="font-bold font-mono text-slate-900 dark:text-white uppercase text-[11px]">Kinh nghiệm Làm việc Thực tế</h4>
              <p className="text-slate-600 dark:text-slate-300">
                2023 - Nay: Senior Java Backend Engineer tại FPT Software. Thiết kế Microservices xử lý 100,000+ request/ngày.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

