'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Application, CV } from '@/types';
import { fetchCandidateApplications, saveCandidateCV } from '@/lib/api';
import { CVUploadModal } from '@/components/cv/CVUploadModal';
import { useLanguage } from '@/context/LanguageContext';
import {
  Send,
  Building2,
  Calendar,
  FileText,
  CheckCircle2,
  ArrowRight,
  Lock,
  MapPin,
  DollarSign,
  UploadCloud,
  ShieldCheck,
  Sparkles,
  BarChart2,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ApplicationHistoryPage() {
  const { t } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidateApplications().then((apps) => {
      if (apps && apps.length > 0) {
        setApplications(apps);
      } else {
        setApplications([
          {
            id: 'app-001',
            job: {
              id: 'job-tech-01',
              title: 'Senior Java Backend Engineer (Spring Boot & Vector AI)',
              companyName: 'FPT Software Corporation',
              companyVerified: true,
              industry: 'Technology',
              employmentType: 'FULL_TIME',
              seniority: 'Senior',
              location: 'Hồ Chí Minh',
              salaryMin: 2200,
              salaryMax: 3500,
              publishedDate: '2026-08-28',
              description: 'Microservices & Vector AI position.',
              requirements: [],
              status: 'PUBLISHED'
            },
            appliedCvId: 'cv-01',
            appliedCvTitle: 'CV Senior Java Backend Engineer (Tech Standard)',
            appliedCvVersion: 1,
            status: 'SUBMITTED',
            appliedDate: '2026-08-29',
            candidateNotes: 'Ứng viên nộp đơn có snapshot bất biến.'
          }
        ]);
      }
    });
  }, []);

  const handleUploadSuccess = (newCv: CV) => {
    saveCandidateCV(newCv);
    setIsUploadOpen(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedAppId(prev => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 py-10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1B3D34] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>MATCHPROOF AUDITABLE APPLICATION & MATCH REPORTS</span>
            </div>
            <h1 className="text-3xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">
              {t('applications.title', 'Danh Sách Việc Làm Đã Nộp Đơn')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              {t('applications.subtitle', 'Track submission status, immutable CV snapshots, and algorithmic match factor breakdowns.')}
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>Tải Lên & Phân Tích CV</span>
          </button>
        </div>

        {/* Applications List */}
        {applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((app) => {
              const isExpanded = expandedAppId === app.id;

              return (
                <div
                  key={app.id}
                  className="bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{t('applications.appliedSuccess', 'Đã nộp đơn thành công')}</span>
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          ID: #{app.id}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-50/50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Immutable Snapshot: v{app.appliedCvVersion}.0</span>
                        </span>
                      </div>

                      <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                        <Link href={`/jobs/${app.job.id}`}>{app.job.title}</Link>
                      </h2>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {app.job.companyName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {app.job.location}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <DollarSign className="w-3.5 h-3.5" />
                          ${app.job.salaryMin} - ${app.job.salaryMax}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Ngày nộp: {app.appliedDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => toggleExpand(app.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#14332B] hover:bg-slate-200 dark:hover:bg-[#1c453a] transition cursor-pointer"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Báo cáo đối sánh</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <Link
                        href={`/jobs/${app.job.id}`}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition shadow-xs cursor-pointer"
                      >
                        <span>{t('applications.viewJd', 'Xem lại JD')}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                      </Link>
                    </div>
                  </div>

                  {/* CV Snapshot Metadata Banner */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>
                        {t('applications.cvUsed', 'Bản CV đã dùng')}: <strong className="text-slate-900 dark:text-white">{app.appliedCvTitle}</strong>
                      </span>
                    </div>
                    {app.candidateNotes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        "{app.candidateNotes}"
                      </p>
                    )}
                  </div>

                  {/* Expandable Match Report Detail */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-200 dark:border-[#1B3D34] space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          BÁO CÁO PHÂN TÍCH ĐỐI SÁNH MATCHPROOF AI
                        </span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          Xác thực bảo vệ ứng viên
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] space-y-1">
                          <span className="text-[10px] font-mono uppercase text-slate-400">ĐIỂM ĐỐI SÁNH TỔNG THỂ</span>
                          <div className="text-2xl font-editorial font-bold text-slate-900 dark:text-white">
                            91.2%
                          </div>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                            Đạt ngưỡng tiến cử trực tiếp
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] space-y-1">
                          <span className="text-[10px] font-mono uppercase text-slate-400">TRỌNG SỐ CORE JD-CV</span>
                          <div className="text-2xl font-editorial font-bold text-slate-900 dark:text-white">
                            91.5%
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            Trùng khớp kỹ năng bắt buộc
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] space-y-1">
                          <span className="text-[10px] font-mono uppercase text-slate-400">TÍN HIỆU GITHUB (PHỤ TRỢ)</span>
                          <div className="text-2xl font-editorial font-bold text-slate-900 dark:text-white">
                            89.5%
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            Tín hiệu bổ trợ (Zero Penalty)
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#071410] p-3 rounded-xl border border-slate-200 dark:border-[#1B3D34] leading-relaxed">
                        <strong>Lưu ý bảo mật & minh bạch:</strong> Snapshot CV phiên bản v{app.appliedCvVersion}.0 đã được cố định tại thời điểm nộp đơn. Bất kỳ chỉnh sửa nào trong tương lai đối với hồ sơ gốc của bạn sẽ không làm thay đổi bản lưu hồ sơ này mà Nhà tuyển dụng đang xem xét.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-editorial font-bold text-slate-900 dark:text-white">
                {t('applications.noReportsTitle', 'No Applications Submitted Yet')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('applications.noReportsSubtitle', 'Discover verified jobs and complete the 5-step Quick Apply workflow.')}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition shadow-sm"
              >
                <span>{t('applications.exploreCta', 'Khám phá việc làm ngay')}</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </Link>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#14332B] hover:bg-slate-200 dark:hover:bg-[#1c453a] transition cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Tải lên CV kiểm tra</span>
              </button>
            </div>
          </div>
        )}

        {/* CV Upload Modal */}
        <CVUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />

      </div>
    </div>
  );
}
