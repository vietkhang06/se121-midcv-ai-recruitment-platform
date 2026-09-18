'use client';

import React, { useState, useEffect } from 'react';
import { Industry, CV } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { SkillAutocomplete } from '@/components/common/SkillAutocomplete';
import { uploadCandidateCV } from '@/lib/api';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface CVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (cv: CV) => void;
  onSuccess?: () => void;
}

type ProcessingStatus = 'IDLE' | 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'REVIEW' | 'FAILED';

export const CVUploadModal: React.FC<CVUploadModalProps> = ({ isOpen, onClose, onUploadSuccess, onSuccess }) => {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [targetIndustry, setTargetIndustry] = useState<Industry>('Technology');
  const [targetRole, setTargetRole] = useState<string>('Software Engineer');
  const [status, setStatus] = useState<ProcessingStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Extracted fields editable
  const [cvTitle, setCvTitle] = useState<string>('');
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [extractedSummary, setExtractedSummary] = useState<string>('');
  const [extractedExp, setExtractedExp] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validExtensions = ['.pdf', '.docx'];
      const hasValidExt = validExtensions.some(ext => selected.name.toLowerCase().endsWith(ext));
      
      if (hasValidExt || selected.type === 'application/pdf') {
        setFile(selected);
        setCvTitle(selected.name.replace(/\.[^/.]+$/, ''));
        setErrorMessage('');
      } else {
        setErrorMessage(t('common.error', 'Only PDF or DOCX file formats are supported.'));
      }
    }
  };

  const handleStartProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus('UPLOADING');
    setErrorMessage('');

    try {
      const savedCv = await uploadCandidateCV(
        file,
        cvTitle || file.name.replace(/\.[^/.]+$/, ''),
        targetIndustry,
        false
      );
      setStatus('COMPLETED');
      if (onUploadSuccess) onUploadSuccess(savedCv);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setStatus('IDLE');
        setFile(null);
      }, 800);
    } catch (err: any) {
      setStatus('FAILED');
      setErrorMessage(err.message || 'Lỗi khi tải lên và phân tích CV.');
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveParsedCV = async () => {
    if (!file) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      const savedCv = await uploadCandidateCV(
        file,
        cvTitle || file.name.replace(/\.[^/.]+$/, ''),
        targetIndustry,
        false
      );
      if (onUploadSuccess) onUploadSuccess(savedCv);
      if (onSuccess) onSuccess();
      onClose();
      setStatus('IDLE');
      setFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lưu CV thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = (skill: string) => {
    if (!extractedSkills.includes(skill)) {
      setExtractedSkills([...extractedSkills, skill]);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setExtractedSkills(extractedSkills.filter(s => s !== skill));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-800 dark:text-slate-100 relative transition-colors max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          id="close-cv-upload-modal-btn"
          onClick={onClose}
          aria-label={t('common.close', 'Đóng')}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#18294E] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#13233F] border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6] shadow-sm flex-shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#3B82F6] block">
              {t('cvUpload.badge', 'MIDCV PARSER PIPELINE')}
            </span>
            <h3 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
              {t('cvUpload.title', 'Tải Lên & Phân Tích CV (PDF / DOCX)')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('cvUpload.subtitle', 'Trích xuất kỹ năng, kinh nghiệm và cấu trúc thực thể qua AI Worker trước khi lưu vào Thư Viện.')}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP: IDLE */}
        {status === 'IDLE' && (
          <form onSubmit={handleStartProcessing} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('cvUpload.industry', 'Ngành nghề định hướng')}
                </label>
                <select
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value as Industry)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#2563EB] transition"
                >
                  <option value="Technology">Technology (Công nghệ thông tin)</option>
                  <option value="Marketing">Marketing & Truyền thông</option>
                  <option value="Design">Design (Thiết kế đồ họa / UX)</option>
                  <option value="Finance">Finance (Tài chính - Ngân hàng)</option>
                  <option value="HR">Human Resources (Nhân sự)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('cvUpload.role', 'Vị trí mong muốn')}
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder={t('cvUpload.rolePlaceholder', 'Ví dụ: Backend Software Engineer')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#2563EB] transition"
                />
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div className="border-2 border-dashed border-slate-300 dark:border-[#1E3A5F] hover:border-[#2563EB] dark:hover:border-[#3B82F6] rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-[#13233F]/40 transition cursor-pointer group">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="cv-file-modal-input"
              />
              <label htmlFor="cv-file-modal-input" className="cursor-pointer block space-y-2.5">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6] group-hover:scale-110 transition">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-slate-800 dark:text-white">
                    {file ? file.name : t('cvUpload.dropzoneText', 'Nhấp hoặc kéo thả file CV tại đây')}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('cvUpload.dropzoneHint', 'Hỗ trợ định dạng PDF hoặc DOCX (Tối đa 10MB)')}
                  </span>
                </div>
                {file && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] dark:text-[#3B82F6] bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('cvUpload.fileReady', 'Đã chọn sẵn sàng')}: {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={!file}
              className="w-full py-3 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>{t('cvUpload.startParse', 'Bắt Đầu Phân Tích & Trích Xuất AI')}</span>
            </button>
          </form>
        )}

        {/* STEP: PROCESSING PIPELINE STATES */}
        {(status === 'UPLOADING' || status === 'QUEUED' || status === 'PROCESSING' || status === 'COMPLETED') && (
          <div className="py-12 text-center space-y-5">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-[#1E293B] border-t-[#2563EB] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6]">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5 max-w-sm mx-auto">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-[#2563EB] dark:text-[#3B82F6] text-[10px] font-mono font-bold uppercase tracking-wider">
                PIPELINE STATUS: {status}
              </span>
              <h4 className="text-base font-editorial font-bold text-slate-900 dark:text-white pt-1">
                {status === 'UPLOADING' && t('cvUpload.statusUploading', 'Đang tải file an toàn lên máy chủ...')}
                {status === 'QUEUED' && t('cvUpload.statusQueued', 'Đang phân phối vào hàng đợi AI Worker...')}
                {status === 'PROCESSING' && t('cvUpload.statusProcessing', 'AI đang trích xuất thực thể, kỹ năng & kinh nghiệm...')}
                {status === 'COMPLETED' && t('cvUpload.statusCompleted', 'Trích xuất hoàn tất! Chuẩn bị chuyển sang màn hình Đánh giá...')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                {t('cvUpload.normalizationHint', 'Chuẩn hóa các kỹ năng đồng nghĩa (JS → JavaScript, Postgres → PostgreSQL) và vector embedding.')}
              </p>
            </div>
          </div>
        )}

        {/* STEP: REVIEW & REFINEMENT */}
        {status === 'REVIEW' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0" />
                {t('cvUpload.reviewSuccess', 'Trích xuất thành công! Kiểm tra và tinh chỉnh thông tin trước khi lưu.')}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('cvUpload.cvTitleLabel', 'Tên hiển thị CV')}
                </label>
                <input
                  type="text"
                  value={cvTitle}
                  onChange={(e) => setCvTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('cvUpload.summaryLabel', 'Tóm tắt bản thân (Extracted Professional Summary)')}
                </label>
                <textarea
                  rows={2}
                  value={extractedSummary}
                  onChange={(e) => setExtractedSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#2563EB] leading-relaxed"
                />
              </div>

              {/* Autocomplete Skill Selector */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('cvUpload.skillsLabel', 'Kỹ năng chuyên môn trích xuất (Technical Skills Index)')}
                </label>
                <SkillAutocomplete
                  skills={extractedSkills}
                  onSkillsChange={setExtractedSkills}
                  placeholder={t('cvUpload.skillsPlaceholder', 'Gõ để tìm kiếm và bổ sung kỹ năng (ví dụ: Spring Boot, Docker, React)...')}
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('cvUpload.experienceLabel', 'Kinh nghiệm làm việc trích xuất')}
                </label>
                <textarea
                  rows={3}
                  value={extractedExp}
                  onChange={(e) => setExtractedExp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#2563EB] font-mono text-[11px] leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-[#1E293B]">
              <button
                type="button"
                onClick={() => setStatus('IDLE')}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('cvUpload.uploadAnother', 'Tải file khác')}</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveParsedCV}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSaving ? 'Đang tải lên...' : t('cvUpload.confirmSave', 'Xác Nhận & Lưu Thư Viện CV')}</span>
                {!isSaving && <ArrowRight className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          </div>
        )}

        {/* STEP: FAILED */}
        {status === 'FAILED' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-editorial font-bold text-slate-900 dark:text-white">
                {t('cvUpload.failedTitle', 'Phân Tích Thất Bại')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('cvUpload.failedDesc', 'Định dạng tệp tin hoặc nội dung văn bản không thể nhận diện. Vui lòng kiểm tra lại file.')}
              </p>
            </div>
            <button
              onClick={() => setStatus('IDLE')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition cursor-pointer"
            >
              {t('cvUpload.retry', 'Thử Lại (Retry)')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
