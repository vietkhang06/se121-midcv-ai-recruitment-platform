'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Eye, Trash2, FileText, Loader2, AlertCircle, X, ExternalLink } from 'lucide-react';
import { uploadCVEvidence, deleteCVEvidence, downloadCVEvidence, fetchCVEvidenceBlob } from '@/lib/api';
import { CVEvidenceAttachmentItem } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface EvidenceAttachmentControlProps {
  cvId: string;
  itemType: 'CERTIFICATION' | 'LANGUAGE';
  itemId: string;
  attachment?: CVEvidenceAttachmentItem | null;
  onAttachmentChange: (attachment: CVEvidenceAttachmentItem | null) => void;
  isEditable?: boolean;
}

export const EvidenceAttachmentControl: React.FC<EvidenceAttachmentControlProps> = ({
  cvId,
  itemType,
  itemId,
  attachment,
  onAttachmentChange,
  isEditable = true
}) => {
  const { locale } = useLanguage();
  const vi = locale === 'vi';
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<{ attachmentId: string; status: 'loading' | 'loaded' | 'failed' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentId = attachment?.attachmentId;

  useEffect(() => {
    if (!previewModalOpen || !attachmentId) return;
    let active = true;
    let objectUrl: string | null = null;
    fetchCVEvidenceBlob(cvId, attachmentId).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewObjectUrl(objectUrl);
      setPreviewStatus({ attachmentId, status: 'loaded' });
    }).catch((error: unknown) => {
      if (!active) return;
      setErrorMessage(error instanceof Error ? error.message : 'Không thể mở tệp minh chứng.');
      setPreviewStatus({ attachmentId, status: 'failed' });
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [previewModalOpen, attachmentId, cvId]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side quick validation (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(vi ? 'Tệp quá lớn. Giới hạn dung lượng tối đa là 10 MB.' : 'File is too large. The maximum size is 10 MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext || '')) {
      setErrorMessage(vi ? 'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận PDF, PNG, JPG, JPEG.' : 'Unsupported file type. Use PDF, PNG, JPG, or JPEG.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const res = await uploadCVEvidence(cvId, file, itemType, itemId);
      onAttachmentChange({
        attachmentId: res.attachment_id,
        cvId: cvId,
        itemType: itemType,
        itemId: itemId,
        fileName: res.file_name || file.name,
        fileSize: res.file_size || file.size,
        fileType: res.file_type || file.type,
        status: res.status || 'UNVERIFIED',
        previewUrl: res.preview_url || `/api/v1/candidate/cvs/${cvId}/attachments/${res.attachment_id}`,
        createdAt: res.created_at || new Date().toISOString()
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : (vi ? 'Tải minh chứng thất bại.' : 'Evidence upload failed.'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!attachment?.attachmentId) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteCVEvidence(cvId, attachment.attachmentId);
      onAttachmentChange(null);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : (vi ? 'Xóa minh chứng thất bại.' : 'Evidence removal failed.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!attachment) return;
    try {
      await downloadCVEvidence(cvId, attachment.attachmentId, attachment.fileName);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : (vi ? 'Tải tệp thất bại.' : 'File download failed.'));
    }
  };

  const isPdf = attachment?.fileType?.includes('pdf') || attachment?.fileName?.toLowerCase().endsWith('.pdf');
  const isPreviewLoading = Boolean(attachment && previewModalOpen && (!previewStatus || previewStatus.attachmentId !== attachment.attachmentId || previewStatus.status === 'loading'));

  return (
    <div className="space-y-1.5 pt-1">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        onChange={handleFileSelected}
        className="hidden"
      />

      {attachment ? (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border border-slate-200 dark:border-[var(--border)] bg-slate-50/80 dark:bg-[var(--surface)]/80 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                {attachment.fileName}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>{(attachment.fileSize / 1024).toFixed(1)} KB</span>
                <span className="px-1.5 py-0.2 rounded-xl font-sans font-medium text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {attachment.status || 'UNVERIFIED'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[var(--surface)] transition flex items-center gap-1 text-xs cursor-pointer"
              title={vi ? 'Xem nhanh' : 'Preview'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{vi ? 'Xem' : 'View'}</span>
            </button>

            {isEditable && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-xs cursor-pointer disabled:opacity-50"
                title={vi ? 'Xóa minh chứng' : 'Remove evidence'}
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      ) : (
        isEditable && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-2.5 py-1 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-600 dark:text-slate-400 hover:text-blue-500 text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{isUploading ? (vi ? 'Đang tải lên...' : 'Uploading…') : (vi ? 'Tải minh chứng (PDF, PNG, JPG)' : 'Upload evidence (PDF, PNG, JPG)')}</span>
          </button>
        )
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Safe Preview Modal */}
      {previewModalOpen && attachment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true" aria-label={`Minh chứng: ${attachment.fileName}`}>
          <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-[var(--border)] flex items-center justify-between bg-slate-50 dark:bg-[var(--surface)]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {vi ? 'Minh chứng' : 'Evidence'}: {attachment.fileName}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{vi ? 'Tải về' : 'Download'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-2 bg-slate-100/50 dark:bg-[var(--surface)] overflow-auto flex items-center justify-center">
              {isPreviewLoading ? <p role="status" className="text-sm text-slate-600">{vi ? 'Đang mở tệp…' : 'Opening file…'}</p> : isPdf && previewObjectUrl ? (
                <iframe
                  src={previewObjectUrl}
                  title={attachment.fileName}
                  className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800"
                />
              ) : previewObjectUrl && attachment.fileType?.startsWith('image/') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewObjectUrl}
                  alt={attachment.fileName}
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              ) : !isPreviewLoading ? <div className="text-center"><p className="mb-3 text-sm text-slate-600">{vi ? 'Không thể xem trước định dạng này.' : 'Preview is unavailable for this file type.'}</p><button type="button" onClick={handleDownload} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">{vi ? 'Tải tệp xuống' : 'Download file'}</button></div> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
