'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CV, CVQuota } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { fetchCandidateCVs, deleteCandidateCV, fetchCVQuota } from '@/lib/api';
import { CVUploadModal } from '@/components/cv/CVUploadModal';
import { CVExtractionReviewModal } from '@/components/cv/CVExtractionReviewModal';
import { CVCardMetadataModal } from '@/components/cv/CVCardMetadataModal';
import { EmptyState } from '@/components/common/EmptyState';
import { Reveal } from '@/components/motion/Reveal';
import { staggerDelay } from '@/components/motion/stagger';
import {
  FolderOpen,
  Plus,
  Upload,
  Download,
  Trash2,
  GitBranch,
  ExternalLink,
  Eye
} from 'lucide-react';

export default function CVLibraryPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const isVi = locale === 'vi';
  const [cvList, setCvList] = useState<CV[]>([]);
  const [quota, setQuota] = useState<CVQuota | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedCvForHistory, setSelectedCvForHistory] = useState<CV | null>(null);
  const [selectedCvForReview, setSelectedCvForReview] = useState<CV | null>(null);
  const [selectedCvForMetadata, setSelectedCvForMetadata] = useState<CV | null>(null);

  const loadCVs = () => {
    setIsLoading(true);
    Promise.all([
      fetchCandidateCVs(),
      fetchCVQuota().catch((err) => {
        console.warn('Failed to fetch CV quota:', err);
        return null;
      }),
    ])
      .then(([data, quotaData]) => {
        setCvList(data);
        if (quotaData) setQuota(quotaData);
        setFetchError(null);
      })
      .catch((err) => {
        setFetchError(err.message || 'Không thể tải danh sách CV.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(loadCVs, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleDelete = async (targetCv: CV) => {
    if (confirm(`Are you sure you want to delete profile "${targetCv.title}"?`)) {
      try {
        await deleteCandidateCV(targetCv.id);
        loadCVs();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Lỗi khi xóa CV');
      }
    }
  };

  const handleExport = (targetCv: CV) => {
    router.push(`/candidate/cvs/builder?edit=${targetCv.id}`);
  };

  return (
    <div className="bg-slate-50/60 dark:bg-[var(--surface)] min-h-screen py-8 text-[var(--heading)] dark:text-[var(--retro-cream)] space-y-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* 06 — Header Section (Figma Screen 06) */}
        <Reveal direction="up" delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[var(--border)] pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-sans font-semibold text-[var(--primary)] dark:text-[var(--retro-sky)] uppercase tracking-widest">
                CANDIDATE ASSETS
              </span>
              <h1 className="text-3xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                {t('candidatePages.myCvsTitle', 'Hồ Sơ & Bản Lưu Năng Lực midCV®')}
                <span className="sr-only"> — Thư Viện CV Cá Nhân</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {quota && (
                <div
                  id="cv-quota-badge"
                  className={`px-3 py-2 rounded-xl text-xs font-sans font-semibold border flex items-center gap-1.5 transition ${
                    quota.remainingSlots === 0
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      : 'bg-blue-50 dark:bg-[var(--surface)] border-blue-200 dark:border-blue-900/50 text-[var(--primary)] dark:text-[var(--retro-sky)]'
                  }`}
                  title={`${isVi ? 'Gói tài khoản' : 'Account plan'}: ${quota.plan} (${quota.currentCount}/${quota.maxLimit} CV)`}
                >
                  <span className="font-bold">{quota.plan}</span>
                  <span className="opacity-40">|</span>
                  <span>{quota.currentCount}/{quota.maxLimit} CV</span>
                </div>
              )}
              <button
                id="upload-cv-btn"
                onClick={() => setIsUploadModalOpen(true)}
                disabled={quota?.canUpload !== true}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[var(--border)] text-[var(--heading)] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                title={quota?.canUpload !== true ? (isVi ? 'Đã đạt giới hạn hoặc chưa kiểm tra được hạn mức CV' : 'CV limit reached or quota unavailable') : undefined}
              >
                {t('candidatePages.uploadCv', 'Tải CV Lên / Ingest Repo')}
              </button>
              <Link
                href={quota?.canUpload === true ? '/candidate/cvs/builder' : '#'}
                onClick={(e) => {
                  if (quota?.canUpload !== true) {
                    e.preventDefault();
                    alert(isVi ? 'Bạn đã đạt giới hạn tối đa số lượng CV cho gói tài khoản này. Vui lòng xóa bớt CV cũ hoặc liên hệ nâng cấp PRO.' : 'You have reached the maximum CV quota for this account plan.');
                  }
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition shadow-xs flex items-center gap-1.5 ${
                  quota?.canUpload !== true
                    ? 'bg-slate-400 dark:bg-slate-600 opacity-50 cursor-not-allowed'
                    : 'bg-[var(--primary)] hover:bg-[var(--primary)] cursor-pointer'
                }`}
                title={quota?.canUpload !== true ? (isVi ? 'Đã đạt giới hạn hoặc chưa kiểm tra được hạn mức CV' : 'CV limit reached or quota unavailable') : undefined}
              >
                <Plus className="w-4 h-4" />
                <span>{t('candidatePages.createCv', 'Tạo Hồ Sơ Mới')}</span>
              </Link>
            </div>
          </div>
        </Reveal>

        {/* 06 — CV Cards Grid, Loading, Error or Genuine Empty State */}
        {isLoading ? (
          <EmptyState
            type="LOADING"
            title={t('common.loading', 'Đang tải danh sách CV...')}
            description="Hệ thống đang đồng bộ danh sách hồ sơ năng lực..."
          />
        ) : fetchError ? (
          <EmptyState
            type="ERROR"
            title="Không thể tải thư viện CV"
            description={fetchError}
            primaryCtaText={t('common.retry', 'Thử lại')}
            onPrimaryCtaClick={loadCVs}
          />
        ) : cvList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cvList.map((cv, idx) => {
              const isConfirmed = cv.status?.toUpperCase() === 'CONFIRMED';
              const statusCardStyle = isConfirmed
                ? 'border-2 border-emerald-200 dark:border-emerald-900/70 shadow-md shadow-emerald-100/80 dark:shadow-emerald-950/40 hover:border-emerald-400 dark:hover:border-emerald-700'
                : 'border-2 border-amber-200 dark:border-amber-900/70 shadow-md shadow-amber-100/80 dark:shadow-amber-950/40 hover:border-amber-400 dark:hover:border-amber-700';

              return (
              <Reveal key={cv.id} delay={staggerDelay(idx)} className="h-full">
                <div
                  data-testid={`cv-card-${cv.id}`}
                  className={`motion-hover-lift bg-white dark:bg-[var(--surface)] rounded-xl p-6 flex flex-col justify-between h-full transition-colors ${statusCardStyle}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-[var(--heading)] dark:text-white text-sm truncate max-w-[220px]" title={cv.title}>
                          {cv.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-xl text-[10px] font-sans font-bold bg-[var(--surface-secondary)] dark:bg-[var(--success)]/15 text-[var(--heading)] dark:text-[var(--success)] border border-[var(--border)]/30">
                            v{cv.currentVersionNumber || cv.versions?.[0]?.versionNumber || 1}.0
                          </span>
                          <button
                            id={`version-history-btn-${cv.id}`}
                            onClick={() => setSelectedCvForHistory(cv)}
                            className="version-history-btn text-[11px] flex items-center gap-1 text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline font-semibold font-sans"
                          >
                            <GitBranch className="w-3 h-3" />
                            <span>{cv.versions?.length || 1} {isVi ? 'phiên bản (Lịch sử)' : 'versions (History)'}</span>
                          </button>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-sans mt-0.5">
                          {cv.updatedAt ? `${isVi ? 'Cập nhật' : 'Updated'}: ${cv.updatedAt}` : (isVi ? 'Mới cập nhật' : 'Recently updated')}
                        </div>
                      </div>

                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span
                        role="status"
                        className={`inline-flex items-center rounded-xl border px-2.5 py-1 font-semibold ${isConfirmed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}
                      >
                        {isConfirmed
                          ? (isVi ? 'Đã xác nhận' : 'Confirmed')
                          : (isVi ? 'Bản nháp' : 'Draft')}
                      </span>
                      <span className="px-2 py-0.5 rounded-xl bg-slate-100 dark:bg-[var(--surface)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border border-slate-200 dark:border-[var(--border)]">
                        {cv.creationPath === 'BUILDER' ? (isVi ? 'Hồ sơ có cấu trúc' : 'Structured Profile') : (isVi ? 'CV tải lên' : 'Uploaded Document')}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-5 mt-4 border-t border-slate-100 dark:border-[var(--border)] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedCvForReview(cv)}
                      title={isVi ? 'Rà soát và chỉnh sửa CV' : 'Review and edit CV'}
                      className="py-2 px-3 rounded-xl text-center text-xs font-semibold border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Trích Xuất & Evidence' : 'Extracted & Evidence'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCvForMetadata(cv)}
                      title={isVi ? 'Sửa thông tin thẻ CV' : 'Edit CV card details'}
                      className="py-2 px-3 rounded-xl text-center text-xs font-semibold border border-slate-200 dark:border-[var(--border)] text-[var(--heading)] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[var(--surface)] transition"
                    >
                      {t('common.edit', isVi ? 'Chỉnh Sửa' : 'Edit')}
                    </button>

                    <button
                      onClick={() => handleExport(cv)}
                      title="Export / Download PDF"
                      className="p-2 rounded-xl border border-slate-200 dark:border-[var(--border)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--heading)] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[var(--surface)] transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cv)}
                      title="Delete Profile"
                      className="p-2 rounded-xl border border-slate-200 dark:border-[var(--border)] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Reveal>
              );
            })}

            {/* Upload New / Ingest Repo Card (Dashed) */}
            <Reveal delay={staggerDelay(cvList.length)} className="h-full">
              <div
                onClick={() => {
                  if (quota?.canUpload !== true) {
                    alert(isVi ? 'Bạn đã đạt giới hạn tối đa số lượng CV cho gói tài khoản này.' : 'You have reached the maximum CV quota for your account.');
                    return;
                  }
                  setIsUploadModalOpen(true);
                }}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition min-h-[220px] h-full space-y-3 ${
                  quota?.canUpload !== true
                    ? 'border-slate-200 dark:border-[var(--border)] opacity-50 cursor-not-allowed bg-slate-50/20 dark:bg-[var(--surface)]/20'
                    : 'border-slate-200 dark:border-[var(--border)] hover:border-[var(--border)] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[var(--surface)]/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] flex items-center justify-center border border-[var(--border-soft)] dark:border-[var(--border)]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--heading)] dark:text-white">{t('candidatePages.uploadCv', isVi ? 'Tải CV Mới Lên' : 'Upload New CV')}</div>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-1">
                    {isVi ? 'Kéo thả PDF, DOCX hoặc trích xuất từ repository' : 'Drag & drop PDF, DOCX or extract from repository'}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        ) : (
          <EmptyState
            type="EMPTY"
            icon={<FolderOpen className="w-8 h-8 text-[var(--primary)]" />}
            title={t('emptyStates.cvs.emptyTitle', 'Bạn chưa có CV nào')}
            description={t('emptyStates.cvs.emptyDesc', 'Tạo hồ sơ CV có cấu trúc hoặc tải lên bản CV để hệ thống trích xuất năng lực và kích hoạt đối sánh AI.')}
            primaryCtaText={t('emptyStates.cvs.createCvCta', 'Tạo CV Mới')}
            primaryCtaHref="/candidate/cvs/builder"
            secondaryCtaText={t('emptyStates.cvs.uploadCvCta', 'Tải CV Lên')}
            onSecondaryCtaClick={() => { if (quota?.canUpload === true) setIsUploadModalOpen(true); }}
          />
        )}

        </div>

      {/* Upload Modal */}
      {isUploadModalOpen && quota?.canUpload === true && (
        <CVUploadModal
          isOpen={true}
          quota={quota}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={(newCv) => {
            setIsUploadModalOpen(false);
            loadCVs();
            setSelectedCvForReview(newCv);
          }}
          onSuccess={() => {
            setIsUploadModalOpen(false);
            loadCVs();
          }}
        />
      )}

      {/* CV Extraction & Evidence Review Modal */}
      {selectedCvForReview && (
        <CVExtractionReviewModal
          isOpen={true}
          cvId={selectedCvForReview.id}
          onClose={() => setSelectedCvForReview(null)}
          onCvUpdated={loadCVs}
        />
      )}

      <CVCardMetadataModal
        key={selectedCvForMetadata?.id ?? 'closed'}
        cv={selectedCvForMetadata}
        onClose={() => setSelectedCvForMetadata(null)}
        onSaved={(updatedCv) => {
          setCvList((current) => current.map((cv) => cv.id === updatedCv.id ? updatedCv : cv));
          setSelectedCvForMetadata(null);
        }}
      />

      {/* Version History Modal */}
      {selectedCvForHistory && (
        <div id="version-history-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-fade-in duration-150">
          <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 max-w-xl w-full shadow-2xl space-y-5 text-[var(--heading)] dark:text-[var(--retro-cream)] max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[var(--border)] pb-4">
              <div>
                <span className="text-[10px] font-sans font-semibold uppercase text-[var(--primary)] dark:text-[var(--retro-sky)] tracking-wider">
                  IMMUTABLE AUDIT TRAIL
                </span>
                <h3 className="text-lg font-bold font-editorial text-[var(--heading)] dark:text-white">
                  Lịch Sử Phiên Bản CV
                </h3>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-0.5">
                  {selectedCvForHistory.title}
                </p>
              </div>
              <button
                id="close-version-history-modal-btn"
                onClick={() => setSelectedCvForHistory(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-[var(--heading)] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[var(--surface)] transition"
              >
                ✕
              </button>
            </div>

            {/* Version List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(selectedCvForHistory.versions || []).map((ver) => {
                const isActive = ver.versionNumber === (selectedCvForHistory.currentVersionNumber || 1);
                return (
                  <div
                    key={ver.id}
                    className={`p-4 rounded-xl border transition-[color,background-color,border-color,box-shadow] ${
                      isActive
                        ? 'bg-[var(--surface-secondary)]/60 dark:bg-[var(--success)]/10 border-[var(--border)]/40'
                        : 'bg-slate-50 dark:bg-[var(--surface)] border-slate-200 dark:border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-sans font-bold bg-[var(--primary)] text-white">
                          v{ver.versionNumber}.0
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-semibold text-[var(--heading)] dark:text-[var(--success)] bg-[var(--surface-secondary)] dark:bg-[var(--success)]/20 px-2 py-0.5 rounded-xl border border-[var(--border)]/30">
                            Phiên bản hiện tại
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-sans">
                        {ver.createdAt}
                      </span>
                    </div>

                    {ver.summaryText && (
                      <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                        {ver.summaryText}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-[var(--border)] flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-sans">
                        {ver.sections?.length || 0} mục nội dung
                      </span>
                      <Link
                        href={`/candidate/cvs/builder?edit=${selectedCvForHistory.id}&v=${ver.versionNumber}`}
                        className="text-xs font-semibold text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline flex items-center gap-1"
                      >
                        <span>Mở bản này trong Studio</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-[var(--border)] flex justify-end">
              <button
                onClick={() => setSelectedCvForHistory(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[var(--surface)] text-[var(--heading)] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[var(--surface)] transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
