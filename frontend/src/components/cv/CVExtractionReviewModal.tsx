'use client';

import React, { useState, useEffect } from 'react';
import { CVReviewData, CVEvidenceItem, PageSegmentItem } from '@/types';
import { fetchCVReview, downloadCVFile, retryCVExtraction } from '@/lib/api';
import { AnimatedModalShell, AnimatedStatus } from '@/components/motion';
import {
  X,
  FileText,
  Code,
  ShieldCheck,
  AlertTriangle,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface CVExtractionReviewModalProps {
  cvId: string;
  isOpen: boolean;
  onClose: () => void;
  onCvUpdated?: () => void;
}

type TabType = 'overview' | 'raw_text' | 'evidence' | 'json' | 'warnings';

export const CVExtractionReviewModal: React.FC<CVExtractionReviewModalProps> = ({
  cvId,
  isOpen,
  onClose,
  onCvUpdated
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<CVReviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && cvId) {
      loadReviewData();
    }
  }, [isOpen, cvId]);

  const loadReviewData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let review = await fetchCVReview(cvId);
      // If review is currently in PROCESSING state or rawText is null/empty and processing, poll briefly
      if (review && (review.status === 'PROCESSING' || (!review.rawText && review.status !== 'FAILED'))) {
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          try {
            const nextReview = await fetchCVReview(cvId);
            if (nextReview && (nextReview.status === 'READY' || nextReview.status === 'EXTRACTED' || nextReview.rawText)) {
              review = nextReview;
              break;
            }
          } catch (_) {}
        }
      }
      setData(review);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải kết quả trích xuất CV.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMessage(null);
    try {
      const refreshed = await retryCVExtraction(cvId);
      setData(refreshed);
      if (onCvUpdated) onCvUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể thử lại trích xuất CV.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = async (format: 'raw' | 'json' | 'original') => {
    if (!data) return;
    setDownloadingFormat(format);
    try {
      const base = data.title || 'cv';
      const fallbackName =
        format === 'raw'
          ? `${base}_raw.txt`
          : format === 'json'
          ? `${base}_structured.json`
          : data.fileName || `${base}.pdf`;
      await downloadCVFile(cvId, format, fallbackName);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải tập tin.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const structured = data?.structured || {};
  const evidences = data?.evidences || [];
  const unverifiedFacts = data?.unverifiedFacts || [];
  const warnings = data?.warnings || [];
  const pages = data?.pages || [];

  return (
    <AnimatedModalShell
      isOpen={isOpen}
      onRequestClose={onClose}
      titleId="cv-review-modal-title"
      descriptionId="cv-review-modal-description"
      testId="cv-review-modal"
      overlayClassName="p-3 sm:p-5 bg-slate-950/80 dark:bg-slate-950/80 backdrop-blur-md"
      panelClassName="bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-[#1E293B] rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100"
    >
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E293B] flex items-center justify-between bg-slate-50/80 dark:bg-[#111C38]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="cv-review-modal-title" className="text-base sm:text-lg font-bold truncate text-[#0F2A52] dark:text-white">
                  {data?.title || 'Đang tải dữ liệu hồ sơ...'}
                </h2>
                {data?.status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                      data.status === 'READY'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : data.status === 'FAILED'
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {data.status}
                  </span>
                )}
                {data?.extractionMethod && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-[#18294E] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1E293B]">
                    {data.extractionMethod}
                  </span>
                )}
              </div>
              <p id="cv-review-modal-description" className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {data?.fileName ? `${data.fileName} (${((data.fileSize || 0) / 1024).toFixed(1)} KB)` : 'Chi tiết trích xuất nội dung & Grounded Evidence'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              title="Thử lại trích xuất CV"
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18294E] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Trích xuất lại</span>
            </button>
            <button
              onClick={onClose}
              data-autofocus="true"
              aria-label="Đóng chi tiết trích xuất CV"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#18294E] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Action Bar */}
        <div className="px-6 py-2 border-b border-slate-200 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0B1329]">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#18294E]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Hồ Sơ Cấu Trúc</span>
            </button>

            <button
              onClick={() => setActiveTab('raw_text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'raw_text'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#18294E]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Văn Bản Thô ({data?.rawText ? `${data.rawText.length} ký tự` : '0'})</span>
            </button>

            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'evidence'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#18294E]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bằng Chứng Đối Chiếu ({evidences.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'json'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#18294E]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON Đã Kiểm Tra</span>
            </button>

            <button
              onClick={() => setActiveTab('warnings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'warnings'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#18294E]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cảnh Báo & Audit ({warnings.length + unverifiedFacts.length})</span>
            </button>
          </div>

          {/* Download Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('raw')}
              disabled={downloadingFormat !== null}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18294E] transition flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>raw.txt</span>
            </button>
            <button
              onClick={() => handleDownload('json')}
              disabled={downloadingFormat !== null}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18294E] transition flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>structured.json</span>
            </button>
            <button
              onClick={() => handleDownload('original')}
              disabled={downloadingFormat !== null}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>File Gốc</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-[#070D1E]/50">
          {isLoading ? (
            <AnimatedStatus stateKey="loading" isBusy className="h-full flex flex-col items-center justify-center space-y-3 py-16">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin motion-reduce:animate-none" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải và xử lý hồ sơ trích xuất...</p>
            </AnimatedStatus>
          ) : errorMessage ? (
            <AnimatedStatus stateKey="error" isError className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Trích xuất gặp sự cố</h4>
                <p className="text-xs mt-1">{errorMessage}</p>
                <button
                  onClick={handleRetry}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition"
                >
                  Thử lại trích xuất
                </button>
              </div>
            </AnimatedStatus>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & EXTRACTED PROFILE */}
              {activeTab === 'overview' && (
                <div className="animate-fade-in space-y-6 max-w-5xl mx-auto">
                  
                  {/* Personal Header Card */}
                  <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#0F2A52] dark:text-white">
                          {structured.full_name || structured.name || 'Chưa xác định họ tên'}
                        </h3>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                          {structured.headline || structured.target_role || 'Chuyên viên kỹ thuật'}
                        </p>
                        {structured.address && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            📍 {structured.address}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col text-xs text-slate-600 dark:text-slate-300 space-y-1 sm:text-right">
                        {structured.email && (
                          <div>
                            <span className="font-mono text-slate-400">Email:</span> {structured.email}
                          </div>
                        )}
                        {structured.phone && (
                          <div>
                            <span className="font-mono text-slate-400">SĐT:</span> {structured.phone}
                          </div>
                        )}
                        {structured.linkedin_url && (
                          <a
                            href={structured.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center sm:justify-end gap-1"
                          >
                            <span>LinkedIn Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {structured.github_url && (
                          <a
                            href={structured.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center sm:justify-end gap-1"
                          >
                            <span>GitHub Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {structured.summary && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#1E293B]">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Tóm tắt năng lực
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {structured.summary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Skills Grid Card */}
                  <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-[#0F2A52] dark:text-white uppercase tracking-wider">
                        Kỹ năng được bóc tách ({Array.isArray(structured.skills) ? structured.skills.length : 0})
                      </h4>
                    </div>

                    {Array.isArray(structured.skills) && structured.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {structured.skills.map((s: any, idx: number) => {
                          const skillName = typeof s === 'string' ? s : s.name;
                          const yearsExp = typeof s === 'object' && s.years_exp != null ? `${s.years_exp} năm` : null;
                          return (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 flex items-center gap-1.5"
                            >
                              <span>{skillName}</span>
                              {yearsExp && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-200/60 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                  {yearsExp}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Không tìm thấy kỹ năng nào trong văn bản.</p>
                    )}
                  </div>

                  {/* Experience Timeline Card */}
                  <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs">
                    <div className="flex items-center gap-2 mb-4">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-[#0F2A52] dark:text-white uppercase tracking-wider">
                        Kinh nghiệm làm việc
                      </h4>
                    </div>

                    {Array.isArray(structured.experiences) && structured.experiences.length > 0 ? (
                      <div className="space-y-4">
                        {structured.experiences.map((exp: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg border border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-[#0B1329]/50 space-y-1.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="font-semibold text-sm text-[#0F2A52] dark:text-white">
                                {exp.role || exp.position || 'Chức danh'} {exp.company ? `@ ${exp.company}` : ''}
                              </div>
                              <div className="text-xs font-mono text-slate-500">
                                {exp.start_date || exp.startDate || 'N/A'} — {exp.end_date || exp.endDate || 'Hiện tại'}
                              </div>
                            </div>
                            {exp.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Chưa ghi nhận kinh nghiệm làm việc.</p>
                    )}
                  </div>

                  {/* Education & Certifications Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Education */}
                    <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs">
                      <div className="flex items-center gap-2 mb-3">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-[#0F2A52] dark:text-white uppercase tracking-wider">
                          Học vấn
                        </h4>
                      </div>
                      {Array.isArray(structured.educations) && structured.educations.length > 0 ? (
                        <div className="space-y-3">
                          {structured.educations.map((edu: any, idx: number) => (
                            <div key={idx} className="text-xs space-y-0.5 border-b border-slate-100 dark:border-[#1E293B] pb-2 last:border-0 last:pb-0">
                              <div className="font-semibold text-slate-800 dark:text-slate-100">
                                {edu.institution || edu.school}
                              </div>
                              <div className="text-slate-600 dark:text-slate-400">
                                {edu.degree} {edu.field_of_study ? `— ${edu.field_of_study}` : ''}
                              </div>
                              {edu.graduation_year && (
                                <div className="text-[11px] font-mono text-slate-400">
                                  Tốt nghiệp: {edu.graduation_year}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Không có thông tin học vấn.</p>
                      )}
                    </div>

                    {/* Certifications & Languages */}
                    <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4 text-amber-500" />
                          <h4 className="text-sm font-bold text-[#0F2A52] dark:text-white uppercase tracking-wider">
                            Chứng chỉ
                          </h4>
                        </div>
                        {Array.isArray(structured.certifications) && structured.certifications.length > 0 ? (
                          <div className="space-y-1">
                            {structured.certifications.map((c: any, idx: number) => (
                              <div key={idx} className="text-xs text-slate-700 dark:text-slate-300">
                                • {typeof c === 'string' ? c : `${c.name || ''} ${c.issuer ? `(${c.issuer})` : ''}`}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">Không có chứng chỉ.</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B]">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-emerald-500" />
                          <h4 className="text-sm font-bold text-[#0F2A52] dark:text-white uppercase tracking-wider">
                            Ngoại ngữ
                          </h4>
                        </div>
                        {Array.isArray(structured.languages) && structured.languages.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {structured.languages.map((l: any, idx: number) => {
                              const name = typeof l === 'string' ? l : l.language;
                              const prof = typeof l === 'object' && l.proficiency_level ? l.proficiency_level : null;
                              return (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-md text-xs bg-slate-100 dark:bg-[#18294E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E293B]"
                                >
                                  {name} {prof ? `(${prof})` : ''}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">Không có thông tin ngoại ngữ.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RAW TEXT */}
              {activeTab === 'raw_text' && (
                <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between bg-white dark:bg-[#111C38] p-4 rounded-xl border border-slate-200 dark:border-[#1E293B]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0F2A52] dark:text-white">
                        Văn bản nguyên bản từ DocumentExtractor
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pages.length > 0
                          ? `Đã phân đoạn theo ${pages.length} trang/khối độc lập`
                          : 'Bản trích xuất thuần túy, bảo toàn nguồn'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(data?.rawText || '', 'raw_text')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#1E293B] hover:bg-slate-100 dark:hover:bg-[#18294E] transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedType === 'raw_text' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép toàn bộ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {pages.length > 0 ? (
                    <div className="space-y-4">
                      {pages.map((p, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-2 text-xs">
                            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                              Trang {p.page_number}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                                  p.used_ocr
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {p.method}
                              </span>
                              {p.ocr_confidence != null && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  OCR: {p.ocr_confidence.toFixed(1)}%
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400">
                                [{p.start_char}..{p.end_char}]
                              </span>
                            </div>
                          </div>

                          <pre className="font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-[#070D1E] p-3 rounded-lg overflow-x-auto max-h-96">
                            {p.text}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 shadow-xs">
                      <pre className="font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-[#070D1E] p-4 rounded-lg overflow-x-auto">
                        {data?.rawText || 'Không có văn bản trích xuất.'}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: GROUNDED EVIDENCE */}
              {activeTab === 'evidence' && (
                <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">
                  <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 p-4 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Cơ chế Grounded Evidence:</span> Mọi sự thật quan trọng được trích xuất đều phải có trích dẫn nguyên văn từ nguồn (verbatim quote), vị trí ký tự và trang tài liệu. Các sự thật không tìm thấy trích dẫn nguyên văn sẽ bị phân tách vào mục cảnh báo chống bịa.
                    </div>
                  </div>

                  {evidences.length > 0 ? (
                    <div className="space-y-3">
                      {evidences.map((ev, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 shadow-xs space-y-2 transition hover:border-blue-300 dark:hover:border-blue-700"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-[#18294E] text-slate-700 dark:text-slate-200 font-semibold">
                                {ev.field_path}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>VERIFIED</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                              {(ev.page_number || ev.source_page) && (
                                <span>Trang {ev.page_number || ev.source_page}</span>
                              )}
                              {ev.start_char != null && (
                                <span>[{ev.start_char}..{ev.end_char}]</span>
                              )}
                              {(ev.method || ev.extraction_method) && (
                                <span className="uppercase">{ev.method || ev.extraction_method}</span>
                              )}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#070D1E] border border-slate-100 dark:border-[#1E293B]/60 text-xs text-slate-700 dark:text-slate-300 font-mono">
                            <span className="text-slate-400 mr-2">Trích dẫn:</span>
                            <span className="text-blue-700 dark:text-blue-300 font-medium">"{ev.quote}"</span>
                          </div>

                          {ev.verbatim_value && (
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <span>Giá trị nguyên văn:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {typeof ev.verbatim_value === 'object' ? JSON.stringify(ev.verbatim_value) : String(ev.verbatim_value)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-[#1E293B]">
                      <p className="text-xs text-slate-400">Chưa ghi nhận bằng chứng đối chiếu cho hồ sơ này.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: STRUCTURED JSON */}
              {activeTab === 'json' && (
                <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between bg-white dark:bg-[#111C38] p-4 rounded-xl border border-slate-200 dark:border-[#1E293B]">
                    <div>
                      <h4 className="text-sm font-bold text-[#0F2A52] dark:text-white">
                        Dữ liệu JSON chuẩn hóa qua Pydantic Validation
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Schema version: {structured.schema_version || '2.0.0'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(JSON.stringify(structured, null, 2), 'json')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#1E293B] hover:bg-slate-100 dark:hover:bg-[#18294E] transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedType === 'json' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép JSON</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-[#0D1117] border border-slate-800 rounded-xl p-4 overflow-hidden">
                    <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[60vh]">
                      {JSON.stringify(structured, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 5: WARNINGS & AUDIT */}
              {activeTab === 'warnings' && (
                <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">
                  
                  {/* Warnings List */}
                  <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h4 className="text-sm font-bold text-[#0F2A52] dark:text-white uppercase tracking-wider">
                        Cảnh báo phát sinh ({warnings.length})
                      </h4>
                    </div>

                    {warnings.length > 0 ? (
                      <div className="space-y-2">
                        {warnings.map((w, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2"
                          >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Không có cảnh báo trích xuất nào. Toàn bộ nội dung trích xuất đạt tiêu chuẩn.</span>
                      </p>
                    )}
                  </div>

                  {/* Unverified Facts */}
                  <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-500" />
                      <h4 className="text-sm font-bold text-[#0F2A52] dark:text-white uppercase tracking-wider">
                        Sự thật chưa được đối chiếu (Unverified Facts: {unverifiedFacts.length})
                      </h4>
                    </div>

                    {unverifiedFacts.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">
                          Các trường dưới đây do LLM đề xuất nhưng không tìm thấy trích dẫn nguyên văn đối chiếu từ văn bản gốc, cần người dùng tự kiểm chứng:
                        </p>
                        {unverifiedFacts.map((uf, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 space-y-1"
                          >
                            <div className="font-mono font-semibold">{uf.field_path}</div>
                            <div className="text-[11px] font-mono">
                              Trích dẫn đề xuất: "{uf.quote}"
                            </div>
                            <div className="text-[11px] text-rose-600 dark:text-rose-400">
                              Lý do: {uf.reason || 'Trích dẫn không khớp chính xác chuỗi con trong raw text.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Không có sự thật không đối chiếu. Toàn bộ các thực thể bóc tách đều có bằng chứng nguồn.
                      </p>
                    )}
                  </div>

                </div>
              )}
            </>
          )}
        </div>

    </AnimatedModalShell>
  );
};
