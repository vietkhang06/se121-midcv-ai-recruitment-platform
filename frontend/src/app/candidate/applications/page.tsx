'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Application, CV, MatchInspectionData } from '@/types';
import { fetchCandidateApplications, saveCandidateCV, fetchMatchInspection } from '@/lib/api';
import { CVUploadModal } from '@/components/cv/CVUploadModal';
import { EmptyState } from '@/components/common/EmptyState';
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [inspections, setInspections] = useState<Record<string, MatchInspectionData | null>>({});

  const loadApplications = () => {
    setIsLoading(true);
    fetchCandidateApplications()
      .then((apps) => {
        setApplications(apps || []);
        setFetchError(null);
      })
      .catch((err) => {
        setFetchError(err.message || 'Không thể tải danh sách đơn ứng tuyển.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleUploadSuccess = (newCv: CV) => {
    saveCandidateCV(newCv);
    setIsUploadOpen(false);
  };

  const toggleExpand = async (id: string) => {
    const nextId = expandedAppId === id ? null : id;
    setExpandedAppId(nextId);
    if (nextId && inspections[nextId] === undefined) {
      try {
        const data = await fetchMatchInspection(nextId);
        setInspections(prev => ({ ...prev, [nextId]: data }));
      } catch (err) {
        console.error('Failed to load match inspection:', err);
        setInspections(prev => ({ ...prev, [nextId]: null }));
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#071A17] text-[#0F2A52] dark:text-[#F1F5F9] py-10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1F4A40] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#00B14F]" />
              <span>midCV® AUDITABLE APPLICATION & MATCH REPORTS</span>
            </div>
            <h1 className="text-3xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9] tracking-tight">
              {t('applications.title', 'Danh Sách Việc Làm Đã Nộp Đơn')}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-2xl">
              {t('applications.subtitle', 'Theo dõi trạng thái nộp đơn, bản snapshot CV bất biến và báo cáo đối soát năng lực thuật toán.')}
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <UploadCloud className="w-4 h-4 text-[#D7F9FA]" />
            <span>Tải Lên & Phân Tích CV</span>
          </button>
        </div>

        {/* Applications List, Loading, Error or Genuine Empty State */}
        {isLoading ? (
          <EmptyState
            type="LOADING"
            title={t('common.loading', 'Đang tải danh sách đơn ứng tuyển...')}
            description="Hệ thống đang kết nối dữ liệu đơn nộp và phân tích đối sánh..."
          />
        ) : fetchError ? (
          <EmptyState
            type="ERROR"
            title="Không thể tải lịch sử ứng tuyển"
            description={fetchError}
            primaryCtaText={t('common.retry', 'Thử lại')}
            onPrimaryCtaClick={loadApplications}
          />
        ) : applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((app) => {
              const isExpanded = expandedAppId === app.id;

              return (
                <div
                  key={app.id}
                  className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F8EE] dark:bg-[#00B14F]/15 border border-[#00B14F]/30 text-[#00873D] dark:text-[#10B981] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#00B14F]" />
                          <span>{t('applications.appliedSuccess', 'Đã nộp đơn thành công')}</span>
                        </span>
                        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                          ID: #{app.id}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[#2563EB] dark:text-[#93C5FD] font-mono bg-[#EFF6FF] dark:bg-[#2563EB]/15 border border-[#BFDBFE] dark:border-[#2563EB]/30 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3 text-[#2563EB]" />
                          <span>Immutable Snapshot: v{app.appliedCvVersion}.0</span>
                        </span>
                      </div>

                      <h2 className="text-xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9] hover:text-[#2563EB] transition-colors">
                        <Link href={`/jobs/${app.job.id}`}>{app.job.title}</Link>
                      </h2>

                      <div className="flex items-center gap-4 text-xs text-[#64748B] dark:text-[#94A3B8] flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-[#0F2A52] dark:text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                          {app.job.companyName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
                          {app.job.location}
                        </span>
                        <span className="flex items-center gap-1 text-[#00B14F] font-semibold">
                          <DollarSign className="w-3.5 h-3.5" />
                          ${app.job.salaryMin} - ${app.job.salaryMax}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                          Ngày nộp: {app.appliedDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => toggleExpand(app.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-[#0F2A52] dark:text-slate-200 bg-slate-100 dark:bg-[#071A17] hover:bg-slate-200 dark:hover:bg-[#1F4A40] border border-slate-200 dark:border-[#1F4A40] transition cursor-pointer"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Báo cáo đối sánh</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <Link
                        href={`/jobs/${app.job.id}`}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-xs cursor-pointer"
                      >
                        <span>{t('applications.viewJd', 'Xem lại JD')}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                      </Link>
                    </div>
                  </div>

                  {/* CV Snapshot Metadata Banner */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071A17] border border-slate-200 dark:border-[#1F4A40] text-xs text-[#64748B] dark:text-[#94A3B8] space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" />
                      <span>
                        {t('applications.cvUsed', 'Bản CV đã dùng')}: <strong className="text-[#0F2A52] dark:text-white">{app.appliedCvTitle}</strong>
                      </span>
                    </div>
                    {app.candidateNotes && (
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] italic">
                        "{app.candidateNotes}"
                      </p>
                    )}
                  </div>

                  {/* Expandable Match Report Detail */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-200 dark:border-[#1F4A40] space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0F2A52] dark:text-[#E2E8F0]">
                          BÁO CÁO PHÂN TÍCH ĐỐI SÁNH midCV® AI
                        </span>
                        <span className="text-[11px] text-[#00873D] dark:text-[#10B981] font-semibold bg-[#E8F8EE] dark:bg-[#00B14F]/15 px-2.5 py-0.5 rounded-full border border-[#00B14F]/30">
                          Xác thực bảo vệ ứng viên
                        </span>
                      </div>

                      {(() => {
                        const insp = inspections[app.id];
                        const overall = insp ? `${Number(insp.overallScore).toFixed(1)}%` : '---';
                        const core = insp ? `${Number(insp.coreScore).toFixed(1)}%` : '---';
                        const gh = insp?.githubScore != null ? `${Number(insp.githubScore).toFixed(1)}%` : (insp ? 'N/A' : '---');
                        const isHigh = insp && Number(insp.overallScore) >= 80;

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071A17] border border-slate-200 dark:border-[#1F4A40] space-y-1">
                              <span className="text-[10px] font-mono uppercase text-[#64748B] dark:text-[#94A3B8]">ĐIỂM ĐỐI SÁNH TỔNG THỂ</span>
                              <div className="text-2xl font-editorial font-bold text-[#0F2A52] dark:text-white">
                                {overall}
                              </div>
                              <span className={`text-[10px] font-medium block ${isHigh ? 'text-[#00B14F] dark:text-[#10B981]' : 'text-[#64748B]'}`}>
                                {insp ? (isHigh ? 'Đạt ngưỡng tiến cử trực tiếp' : 'Đang trong diện xem xét') : 'Đang tính toán điểm...'}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071A17] border border-slate-200 dark:border-[#1F4A40] space-y-1">
                              <span className="text-[10px] font-mono uppercase text-[#64748B] dark:text-[#94A3B8]">TRỌNG SỐ CORE JD-CV</span>
                              <div className="text-2xl font-editorial font-bold text-[#0F2A52] dark:text-white">
                                {core}
                              </div>
                              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">
                                {insp ? `Khớp ${insp.requiredSkillsStatus?.filter(s => s.status === 'MATCH').length || 0}/${insp.requiredSkillsStatus?.length || 0} kỹ năng bắt buộc` : 'Phân tích tiêu chí'}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071A17] border border-slate-200 dark:border-[#1F4A40] space-y-1">
                              <span className="text-[10px] font-mono uppercase text-[#64748B] dark:text-[#94A3B8]">TÍN HIỆU GITHUB (PHỤ TRỢ)</span>
                              <div className="text-2xl font-editorial font-bold text-[#0F2A52] dark:text-white">
                                {gh}
                              </div>
                              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">
                                {insp?.githubScoreActive ? 'Tín hiệu bổ trợ (15% trọng số)' : 'Không áp dụng (Zero Penalty)'}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="text-xs text-[#64748B] dark:text-[#94A3B8] bg-slate-50 dark:bg-[#071A17] p-3.5 rounded-xl border border-slate-200 dark:border-[#1F4A40] leading-relaxed">
                        <strong>Lưu ý bảo mật & minh bạch:</strong> Snapshot CV phiên bản v{app.appliedCvVersion}.0 đã được cố định tại thời điểm nộp đơn. Bất kỳ chỉnh sửa nào trong tương lai đối với hồ sơ gốc của bạn sẽ không làm thay đổi bản lưu hồ sơ này mà Nhà tuyển dụng đang xem xét.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            type="EMPTY"
            icon={<FileText className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />}
            title={t('emptyStates.applications.candidateEmptyTitle', 'Bạn chưa có đơn ứng tuyển nào')}
            description={t('emptyStates.applications.candidateEmptyDesc', 'Khám phá các vị trí tuyển dụng phù hợp và nộp đơn để theo dõi tiến trình đối sánh tại đây.')}
            primaryCtaText={t('emptyStates.applications.exploreJobsCta', 'Khám Phá Việc Làm Ngay')}
            primaryCtaHref="/jobs"
            secondaryCtaText="Tải lên CV kiểm tra"
            onSecondaryCtaClick={() => setIsUploadOpen(true)}
          />
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
