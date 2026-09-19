'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { QuickScreeningRun, QuickScreeningDetail } from '@/types';
import {
  fetchQuickScreenings,
  uploadQuickScreening,
  fetchScreeningDetail,
  rematchScreening,
  ApiError
} from '@/lib/api';
import { DetailedMatchResultModal } from './DetailedMatchResultModal';

interface QuickScreeningModalProps {
  job: { id: string; title: string; industry?: string };
  isOpen: boolean;
  onClose: () => void;
}

export function QuickScreeningModal({ job, isOpen, onClose }: QuickScreeningModalProps) {
  const [runs, setRuns] = useState<QuickScreeningRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [githubEnabled, setGithubEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<QuickScreeningDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadScreenings = async () => {
    try {
      const data = await fetchQuickScreenings(job.id, 0, 50);
      setRuns(data);
      setError(null);
    } catch (err) {
      console.error('Lỗi tải danh sách sàng lọc nhanh:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadScreenings();

    // Auto refresh while any job is processing
    const timer = setInterval(() => {
      loadScreenings();
    }, 4000);

    return () => clearInterval(timer);
  }, [isOpen, job.id]);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 20) {
      setError('Vui lòng chọn tối đa 20 CV mỗi lượt tải lên.');
      return;
    }

    setUploading(true);
    setError(null);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Đang tải lên ${i + 1}/${files.length}: ${file.name}...`);
      try {
        await uploadQuickScreening(job.id, file, githubEnabled);
        successCount++;
      } catch (err) {
        console.error(`Lỗi tải tệp ${file.name}:`, err);
      }
    }

    setUploadProgress(`Hoàn tất: Đã nhận ${successCount}/${files.length} hồ sơ. Pipeline AI đang xử lý.`);
    setUploading(false);
    loadScreenings();

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleViewDetail = async (runId: string) => {
    setDetailLoading(true);
    try {
      const detail = await fetchScreeningDetail(runId);
      setSelectedDetail(detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tải chi tiết đối sánh.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRematch = async (runId: string) => {
    try {
      await rematchScreening(runId);
      loadScreenings();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể yêu cầu đối sánh lại.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white dark:bg-[#0F1A36] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono">
                  Sàng lọc nhanh hàng loạt (Multi-CV Screening)
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Sàng lọc CV theo: {job.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tải lên nhiều CV để xếp hạng và đối sánh với JD mà không cần tạo tài khoản ứng viên ảo.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Upload Box */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center mx-auto shadow-sm">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chọn hoặc kéo thả các CV cần sàng lọc
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Hỗ trợ định dạng PDF, DOCX, TXT · Tối đa 20 CV mỗi lượt · 15 MB/tệp
                </p>
              </div>

              {/* GitHub Toggle */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium select-none">
                  <input
                    type="checkbox"
                    checked={githubEnabled}
                    onChange={(e) => setGithubEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                  />
                  <span>Tự động phân tích GitHub bổ trợ nếu phát hiện tài khoản trong CV</span>
                </label>
              </div>

              <div className="pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={handleFilesSelected}
                  disabled={uploading}
                  className="hidden"
                  id="screening-file-input"
                />
                <label
                  htmlFor="screening-file-input"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition cursor-pointer ${
                    uploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải tệp lên...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Chọn danh sách CV</span>
                    </>
                  )}
                </label>
              </div>

              {uploadProgress && (
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 animate-pulse">
                  {uploadProgress}
                </p>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Screenings Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Kết quả sàng lọc & Xếp hạng CV ({runs.length})</span>
                </h3>
                <button
                  onClick={loadScreenings}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Làm mới danh sách"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>Đang tải danh sách sàng lọc...</span>
                </div>
              ) : runs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-slate-100 dark:border-slate-800 rounded-2xl">
                  Chưa có CV nào được sàng lọc cho tin này. Tải lên CV ở khung phía trên để bắt đầu.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Tên tệp / Hồ sơ</th>
                        <th className="py-3 px-4">Trạng thái AI</th>
                        <th className="py-3 px-4">Điểm Match</th>
                        <th className="py-3 px-4">Độ phủ tiêu chí</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#111C38]">
                      {runs.map((r) => {
                        const isReady = r.processing_state === 'SUCCEEDED' || (r.score != null && r.score > 0);
                        const isProcessing = r.processing_state === 'RUNNING' || r.processing_state === 'QUEUED';
                        const isFailed = r.processing_state === 'FAILED';

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[220px]" title={r.filename || r.title}>
                                {r.filename || r.title}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {isProcessing ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  {r.processing_state || 'PROCESSING'}
                                </span>
                              ) : isReady ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-mono">
                                  <CheckCircle2 className="w-3 h-3" />
                                  READY
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-mono">
                                  <AlertCircle className="w-3 h-3" />
                                  {r.error_code || 'FAILED'}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 font-mono font-bold">
                              {r.score != null ? (
                                <span className="text-blue-600 dark:text-blue-400 text-sm">
                                  {Number(r.score).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">—</span>
                              )}
                            </td>

                            <td className="py-3 px-4 font-mono">
                              {r.coverage != null ? (
                                <span className="text-slate-700 dark:text-slate-300">
                                  {Number(r.coverage).toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">—</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right space-x-2">
                              {isReady && (
                                <button
                                  type="button"
                                  onClick={() => handleViewDetail(r.id)}
                                  disabled={detailLoading}
                                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                                >
                                  Xem chi tiết
                                </button>
                              )}

                              {isFailed && (
                                <button
                                  type="button"
                                  onClick={() => handleRematch(r.id)}
                                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
                                >
                                  Thử lại
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>

      {/* Child Detailed Match Result Modal */}
      {selectedDetail && (
        <DetailedMatchResultModal
          isOpen={true}
          onClose={() => setSelectedDetail(null)}
          result={selectedDetail.result}
          candidateTitle={selectedDetail.cv?.filename || 'Hồ sơ đã sàng lọc'}
          jobTitle={job.title}
        />
      )}
    </>
  );
}
