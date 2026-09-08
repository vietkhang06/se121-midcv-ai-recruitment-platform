'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CV } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { fetchCandidateCVs, saveCandidateCV, deleteCandidateCV } from '@/lib/api';
import { CVUploadModal } from '@/components/cv/CVUploadModal';
import { EmptyState } from '@/components/common/EmptyState';
import {
  FolderOpen,
  Plus,
  Upload,
  Download,
  Trash2,
  GitBranch,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Edit3
} from 'lucide-react';

export default function CVLibraryPage() {
  const { t } = useLanguage();
  const [cvList, setCvList] = useState<CV[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedCvForHistory, setSelectedCvForHistory] = useState<CV | null>(null);

  useEffect(() => {
    fetchCandidateCVs().then(setCvList);
  }, []);

  const handleDelete = async (targetCv: CV) => {
    if (confirm(`Are you sure you want to delete profile "${targetCv.title}"?`)) {
      await deleteCandidateCV(targetCv.id);
      const updated = await fetchCandidateCVs();
      setCvList(updated);
    }
  };

  const handleExport = (targetCv: CV) => {
    window.location.href = `/candidate/cvs/builder?edit=${targetCv.id}`;
  };

  return (
    <div className="bg-[#F8FAF9] dark:bg-[#071410] min-h-screen py-8 text-slate-800 dark:text-slate-100 space-y-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* 06 — Header Section (Figma Screen 06) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1B3D34] pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
              CANDIDATE ASSETS
            </span>
            <h1 className="text-3xl font-editorial text-slate-900 dark:text-white">
              {t('candidatePages.myCvsTitle', 'Curate Verifiable Experience Profiles')}
              <span className="sr-only"> — Thư Viện CV Cá Nhân</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="upload-cv-btn"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1B3D34] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E] transition"
            >
              {t('candidatePages.uploadCv', 'Upload New / Ingest Repo')}
            </button>
            <Link
              href="/candidate/cvs/builder"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0C2B24] dark:bg-emerald-600 hover:bg-[#133E34] dark:hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('candidatePages.createCv', 'Create New CV')}</span>
            </Link>
          </div>
        </div>


        {/* 06 — CV Cards Grid or Genuine Empty State */}
        {cvList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cvList.map((cv) => (
              <div
                key={cv.id}
                className="bg-white dark:bg-[#0E241E] border border-[#E2E8F0] dark:border-[#1B3D34] hover:border-[#0C2B24] dark:hover:border-emerald-500 rounded-xl p-6 shadow-xs flex flex-col justify-between transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[220px]" title={cv.title}>
                        {cv.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          v{cv.currentVersionNumber || cv.versions?.[0]?.versionNumber || 1}.0
                        </span>
                        <button
                          id={`version-history-btn-${cv.id}`}
                          onClick={() => setSelectedCvForHistory(cv)}
                          className="version-history-btn text-[11px] flex items-center gap-1 text-[#0C2B24] dark:text-emerald-400 hover:underline font-semibold font-mono"
                        >
                          <GitBranch className="w-3 h-3" />
                          <span>{cv.versions?.length || 1} phiên bản (Lịch sử)</span>
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {cv.updatedAt ? `Cập nhật: ${cv.updatedAt}` : 'Mới cập nhật'}
                      </div>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                      {cv.targetIndustry || 'Tech'}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                      {cv.targetRole || 'Chuyên viên kỹ thuật'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#133E34] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-emerald-500/20">
                      {cv.creationPath === 'BUILDER' ? 'Hồ sơ có cấu trúc' : 'CV tải lên'}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-[#1B3D34] flex items-center justify-between gap-2">
                  <Link
                    href={`/candidate/cvs/builder?edit=${cv.id}`}
                    className="flex-1 py-1.5 px-3 rounded-md text-center text-xs font-semibold border border-slate-300 dark:border-[#1B3D34] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#133E34] transition"
                  >
                    {t('common.edit', 'Chỉnh Sửa')}
                  </Link>
                  <button
                    onClick={() => handleExport(cv)}
                    title="Export / Download PDF"
                    className="p-2 rounded-md border border-slate-200 dark:border-[#1B3D34] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#133E34] transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cv)}
                    title="Delete Profile"
                    className="p-2 rounded-md border border-slate-200 dark:border-[#1B3D34] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Upload New / Ingest Repo Card (Dashed) */}
            <div
              onClick={() => setIsUploadModalOpen(true)}
              className="border-2 border-dashed border-slate-300 dark:border-[#1B3D34] hover:border-[#0C2B24] dark:hover:border-emerald-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#0E241E]/50 transition min-h-[220px] space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-[#F1F5F3] dark:bg-[#133E34] text-[#0C2B24] dark:text-emerald-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{t('candidatePages.uploadCv', 'Tải CV Mới Lên')}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kéo thả PDF, DOCX hoặc trích xuất từ repository</p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            type="EMPTY"
            icon={<FolderOpen className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />}
            title={t('emptyStates.cvs.emptyTitle', 'Bạn chưa có CV nào')}
            description={t('emptyStates.cvs.emptyDesc', 'Tạo hồ sơ CV có cấu trúc hoặc tải lên bản CV để hệ thống trích xuất năng lực và kích hoạt đối sánh AI.')}
            primaryCtaText={t('emptyStates.cvs.createCvCta', 'Tạo CV Mới')}
            primaryCtaHref="/candidate/cvs/builder"
            secondaryCtaText={t('emptyStates.cvs.uploadCvCta', 'Tải CV Lên')}
            onSecondaryCtaClick={() => setIsUploadModalOpen(true)}
          />
        )}

        </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <CVUploadModal
          isOpen={true}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            setIsUploadModalOpen(false);
            fetchCandidateCVs().then(setCvList);
          }}
        />
      )}

      {/* Version History Modal */}
      {selectedCvForHistory && (
        <div id="version-history-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 text-slate-800 dark:text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#1B3D34] pb-4">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  IMMUTABLE AUDIT TRAIL
                </span>
                <h3 className="text-lg font-bold font-editorial text-slate-900 dark:text-white">
                  Lịch Sử Phiên Bản CV
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedCvForHistory.title}
                </p>
              </div>
              <button
                id="close-version-history-modal-btn"
                onClick={() => setSelectedCvForHistory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#14332B] transition"
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
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-[#F8FAF9] dark:bg-[#071410] border-slate-200 dark:border-[#1B3D34]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#0C2B24] text-white dark:bg-emerald-600">
                          v{ver.versionNumber}.0
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                            Phiên bản hiện tại
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {ver.createdAt}
                      </span>
                    </div>

                    {ver.summaryText && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                        {ver.summaryText}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-[#1B3D34] flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ver.sections?.length || 0} mục nội dung
                      </span>
                      <Link
                        href={`/candidate/cvs/builder?edit=${selectedCvForHistory.id}&v=${ver.versionNumber}`}
                        className="text-xs font-semibold text-[#0C2B24] dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>Mở bản này trong Studio</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-[#1B3D34] flex justify-end">
              <button
                onClick={() => setSelectedCvForHistory(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#133E34] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1A4D41] transition"
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
