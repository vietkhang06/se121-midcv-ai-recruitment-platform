'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Application, CV, MatchInspectionData } from '@/types';
import { fetchCandidateApplications, saveCandidateCV, fetchMatchInspection } from '@/lib/api';
import { CVUploadModal } from '@/components/cv/CVUploadModal';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
import { Reveal } from '@/components/motion/Reveal';
import { staggerDelay } from '@/components/motion/stagger';
import { formatSalary } from '@/lib/i18n';
import {
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
  BarChart2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ApplicationHistoryPage() {
  const { t, locale } = useLanguage();
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
    const timer = setTimeout(() => {
      loadApplications();
    }, 0);
    return () => clearTimeout(timer);
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
    <div className="min-h-screen bg-slate-50/60 dark:bg-[var(--surface)] text-[var(--heading)] dark:text-[var(--retro-cream)] py-10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Page Header */}
        <Reveal direction="up" delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[var(--border)] pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px] font-sans font-bold text-[var(--primary)] dark:text-[var(--retro-sky)] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
                <span>midCV® AUDITABLE APPLICATION & MATCH REPORTS</span>
              </div>
              <h1 className="text-3xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)] tracking-tight">
                {t('applications.title', 'Danh Sách Việc Làm Đã Nộp Đơn')}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] max-w-2xl">
                {t('applications.subtitle', 'Theo dõi trạng thái nộp đơn, bản snapshot CV bất biến và báo cáo đối soát năng lực thuật toán.')}
              </p>
            </div>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] transition shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <UploadCloud className="w-4 h-4 text-[var(--retro-cream)]" />
              <span>{locale === 'vi' ? 'Tải Lên & Phân Tích CV' : 'Upload & Analyze CV'}</span>
            </button>
          </div>
        </Reveal>

        {/* Applications List, Loading, Error or Genuine Empty State */}
        {isLoading ? (
          <EmptyState
            type="LOADING"
            title={t('common.loading', 'Đang tải danh sách đơn ứng tuyển...')}
            description={locale === 'vi' ? 'Hệ thống đang kết nối dữ liệu đơn nộp và phân tích đối sánh...' : 'Connecting application records and analyzing match reports...'}
          />
        ) : fetchError ? (
          <EmptyState
            type="ERROR"
            title={locale === 'vi' ? 'Không thể tải lịch sử ứng tuyển' : 'Failed to load application history'}
            description={fetchError}
            primaryCtaText={t('common.retry', 'Thử lại')}
            onPrimaryCtaClick={loadApplications}
          />
        ) : applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((app, idx) => {
              const isExpanded = expandedAppId === app.id;

              return (
                <Reveal key={app.id} delay={staggerDelay(idx)}>
                  <div
                    className="motion-hover-lift bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 shadow-xs hover:shadow-md space-y-4"
                  >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-semibold bg-[var(--surface-secondary)] dark:bg-[var(--success)]/15 border border-[var(--border)]/30 text-[var(--heading)] dark:text-[var(--success)] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
                          <span>{t('applications.appliedSuccess', 'Đã nộp đơn thành công')}</span>
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-sans">
                          ID: #{app.id}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[var(--primary)] dark:text-[var(--retro-sky)] font-sans bg-[var(--surface-secondary)] dark:bg-[var(--primary)]/15 border border-[var(--border-soft)] dark:border-[var(--border)]/30 px-2 py-0.5 rounded-xl">
                          <Lock className="w-3 h-3 text-[var(--primary)]" />
                          <span>{app.appliedCvVersion != null ? `Snapshot: v${app.appliedCvVersion}.0` : (locale === 'vi' ? 'Chưa có thông tin phiên bản' : 'Version unavailable')}</span>
                        </span>
                      </div>

                      <h2 className="text-xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)] hover:text-[var(--primary)] transition-colors">
                        <Link href={`/jobs/${app.job.id}`}>{app.job.title}</Link>
                      </h2>

                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-[var(--heading)] dark:text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          {app.job.companyName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          {app.job.location}
                        </span>
                        <span className="flex items-center gap-1 text-[var(--success)] font-semibold">
                          <DollarSign className="w-3.5 h-3.5" />
                          {formatSalary(app.job.salaryMin, app.job.salaryMax, app.job.salaryRange, locale, app.job.salaryNegotiable, app.job.salaryCurrency)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          {locale === 'vi' ? 'Ngày nộp:' : 'Applied on:'} {app.appliedDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => toggleExpand(app.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--heading)] dark:text-slate-200 bg-slate-100 dark:bg-[var(--surface)] hover:bg-slate-200 dark:hover:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] transition cursor-pointer"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span>{locale === 'vi' ? 'Báo cáo đối sánh' : 'Match report'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <Link
                        href={`/jobs/${app.job.id}`}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] transition shadow-xs cursor-pointer"
                      >
                        <span>{t('applications.viewJd', 'Xem lại JD')}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                      </Link>
                    </div>
                  </div>

                  {/* 4-Step Interactive Progress Timeline (Adapted from SE347 MatchaJob) */}
                  {(() => {
                    const statusStr = app.status || 'SUBMITTED';
                    const isRejected = statusStr === 'REJECTED';
                    const isHired = statusStr === 'HIRED';
                    const currentStep = (isHired || isRejected) ? 4 : (statusStr === 'INTERVIEWING' ? 3 : (statusStr === 'SHORTLISTED' ? 2 : 1));
                    const progressPercent = ((currentStep - 1) / 3) * 100;

                    const timelineSteps = [
                      { labelVi: 'Đã nộp hồ sơ', labelEn: 'Submitted' },
                      { labelVi: 'Sàng lọc hồ sơ', labelEn: 'Screening' },
                      { labelVi: 'Phỏng vấn', labelEn: 'Interview' },
                      {
                        labelVi: isRejected ? 'Chưa phù hợp' : (isHired ? 'Trúng tuyển' : 'Quyết định'),
                        labelEn: isRejected ? 'Rejected' : (isHired ? 'Hired' : 'Decision')
                      }
                    ];

                    return (
                      <div className="pt-3 pb-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="relative flex justify-between items-center my-3 max-w-2xl mx-auto px-4">
                          {/* Background Track */}
                          <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700/60 z-0 rounded-xl" />
                          {/* Active Filled Track */}
                          <div
                            className={`absolute top-1/2 left-6 -translate-y-1/2 h-1 z-0 rounded-xl transition-all duration-500 ${
                              isRejected ? 'bg-rose-500' : 'bg-[var(--primary)] dark:bg-[var(--primary)]'
                            }`}
                            style={{ width: `calc(${progressPercent}% * 0.88)` }}
                          />

                          {timelineSteps.map((stepItem, stepIdx) => {
                            const stepNumber = stepIdx + 1;
                            const isStepPassed = currentStep >= stepNumber;
                            const isCurrent = currentStep === stepNumber;

                            return (
                              <div key={stepItem.labelVi} className="flex flex-col items-center relative z-10">
                                <div
                                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                                    isCurrent && isRejected
                                      ? 'bg-rose-500 text-white ring-4 ring-rose-100 dark:ring-rose-950/50'
                                      : isStepPassed
                                        ? 'bg-[var(--primary)] text-white ring-4 ring-blue-50 dark:ring-blue-950/40'
                                        : 'bg-white dark:bg-[var(--surface)] text-slate-400 border border-slate-300 dark:border-slate-700'
                                  }`}
                                >
                                  {isStepPassed ? (
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                  ) : (
                                    <span>{stepNumber}</span>
                                  )}
                                </div>
                                <span
                                  className={`text-[11px] mt-1.5 text-center font-medium ${
                                    isCurrent && isRejected
                                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                                      : isStepPassed
                                        ? 'text-[var(--primary)] dark:text-[var(--retro-sky)] font-bold'
                                        : 'text-slate-400 dark:text-slate-500'
                                  }`}
                                >
                                  {locale === 'vi' ? stepItem.labelVi : stepItem.labelEn}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* CV Snapshot Metadata Banner */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />
                      <span>
                        {t('applications.cvUsed', 'Bản CV đã dùng')}: <strong className="text-[var(--heading)] dark:text-white">{app.appliedCvTitle}</strong>
                      </span>
                    </div>
                    {app.candidateNotes && (
                      <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] italic">
                        &ldquo;{app.candidateNotes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Expandable Match Report Detail */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-200 dark:border-[var(--border)] space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--heading)] dark:text-[var(--retro-cream)]">
                          {locale === 'vi' ? 'BÁO CÁO PHÂN TÍCH ĐỐI SÁNH midCV® AI' : 'midCV® AI MATCH REPORT ANALYSIS'}
                        </span>
                        <span className="text-[11px] text-[var(--heading)] dark:text-[var(--success)] font-semibold bg-[var(--surface-secondary)] dark:bg-[var(--success)]/15 px-2.5 py-0.5 rounded-xl border border-[var(--border)]/30">
                          {locale === 'vi' ? 'Xác thực bảo vệ ứng viên' : 'Candidate Privacy Protected'}
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
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] space-y-1">
                              <span className="text-[10px] font-sans uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                                {locale === 'vi' ? 'ĐIỂM ĐỐI SÁNH TỔNG THỂ' : 'OVERALL MATCH SCORE'}
                              </span>
                              <div className="text-2xl font-editorial font-bold text-[var(--heading)] dark:text-white">
                                {overall}
                              </div>
                              <span className={`text-[10px] font-medium block ${isHigh ? 'text-[var(--success)] dark:text-[var(--success)]' : 'text-[var(--text-secondary)]'}`}>
                                {insp 
                                  ? (isHigh ? (locale === 'vi' ? 'Đạt ngưỡng tiến cử trực tiếp' : 'Direct recommendation threshold met') : (locale === 'vi' ? 'Đang trong diện xem xét' : 'Under consideration')) 
                                  : (locale === 'vi' ? 'Đang tính toán điểm...' : 'Calculating score...')}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] space-y-1">
                              <span className="text-[10px] font-sans uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                                {locale === 'vi' ? 'TRỌNG SỐ CORE JD-CV' : 'CORE JD-CV WEIGHT'}
                              </span>
                              <div className="text-2xl font-editorial font-bold text-[var(--heading)] dark:text-white">
                                {core}
                              </div>
                              <span className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">
                                {insp 
                                  ? (locale === 'vi' ? `Khớp ${insp.requiredSkillsStatus?.filter(s => s.status === 'MATCH').length || 0}/${insp.requiredSkillsStatus?.length || 0} kỹ năng bắt buộc` : `Matched ${insp.requiredSkillsStatus?.filter(s => s.status === 'MATCH').length || 0}/${insp.requiredSkillsStatus?.length || 0} required skills`) 
                                  : (locale === 'vi' ? 'Phân tích tiêu chí' : 'Analyzing criteria')}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] space-y-1">
                              <span className="text-[10px] font-sans uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                                {locale === 'vi' ? 'TÍN HIỆU GITHUB (PHỤ TRỢ)' : 'GITHUB SIGNAL (AUXILIARY)'}
                              </span>
                              <div className="text-2xl font-editorial font-bold text-[var(--heading)] dark:text-white">
                                {gh}
                              </div>
                              <span className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">
                                {insp?.githubScoreActive 
                                  ? (locale === 'vi' ? 'Tín hiệu bổ trợ (theo trọng số đã lưu)' : 'Auxiliary signal (saved policy weight)')
                                  : (locale === 'vi' ? 'Không áp dụng (Zero Penalty)' : 'Not applied (Zero Penalty)')}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] bg-slate-50 dark:bg-[var(--surface)] p-3.5 rounded-xl border border-slate-200 dark:border-[var(--border)] leading-relaxed">
                        <strong>{locale === 'vi' ? 'Lưu ý bảo mật & minh bạch:' : 'Security & Transparency Notice:'}</strong> {app.appliedCvVersion == null ? (locale === 'vi' ? 'Hồ sơ lịch sử chưa có thông tin phiên bản để đối chiếu.' : 'Version information is unavailable for this historical application.') : (locale === 'vi' ? `Snapshot CV phiên bản v${app.appliedCvVersion}.0 được lưu tại thời điểm nộp đơn. Chỉnh sửa CV sau đó không thay đổi phiên bản đã nộp.` : `CV snapshot v${app.appliedCvVersion}.0 was saved upon submission. Later edits do not change the submitted version.`)}
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
          </div>
        ) : (
          <EmptyState
            type="EMPTY"
            icon={<FileText className="w-8 h-8 text-[var(--primary)] dark:text-[var(--retro-sky)]" />}
            title={t('emptyStates.applications.candidateEmptyTitle', 'Bạn chưa có đơn ứng tuyển nào')}
            description={t('emptyStates.applications.candidateEmptyDesc', 'Khám phá các vị trí tuyển dụng phù hợp và nộp đơn để theo dõi tiến trình đối sánh tại đây.')}
            primaryCtaText={t('emptyStates.applications.exploreJobsCta', 'Khám Phá Việc Làm Ngay')}
            primaryCtaHref="/jobs"
            secondaryCtaText={locale === 'vi' ? 'Tải lên CV kiểm tra' : 'Upload CV for check'}
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
