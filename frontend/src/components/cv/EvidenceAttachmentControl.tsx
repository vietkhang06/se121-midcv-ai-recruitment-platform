'use client';

import React, { useState, useRef } from 'react';
import { Upload, Eye, Trash2, FileText, Loader2, AlertCircle, X, ExternalLink } from 'lucide-react';
import { uploadCVEvidence, deleteCVEvidence, downloadCVEvidence } from '@/lib/api';
import { CVEvidenceAttachmentItem } from '@/types';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side quick validation (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Tệp quá lớn. Giới hạn dung lượng tối đa là 10 MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext || '')) {
      setErrorMessage('Định dạng tệp không được hỗ trợ. Chỉ chấp nhận PDF, PNG, JPG, JPEG.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const res = await uploadCVEvidence(cvId, file, itemType, itemId);
      onAttachmentChange({
        attachmentId: res.attachment_id || res.id,
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Tải minh chứng thất bại.');
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Xóa minh chứng thất bại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!attachment) return;
    try {
      await downloadCVEvidence(cvId, attachment.attachmentId, attachment.fileName);
    } catch (err: any) {
      setErrorMessage(err.message || 'Tải tệp thất bại.');
    }
  };

  const isPdf = attachment?.fileType?.includes('pdf') || attachment?.fileName?.toLowerCase().endsWith('.pdf');

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
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-slate-50/80 dark:bg-[#111C38]/80 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                {attachment.fileName}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>{(attachment.fileSize / 1024).toFixed(1)} KB</span>
                <span className="px-1.5 py-0.2 rounded-full font-mono font-medium text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {attachment.status || 'UNVERIFIED'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#18294E] transition flex items-center gap-1 text-xs cursor-pointer"
              title="Xem nhanh"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem</span>
            </button>

            {isEditable && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-xs cursor-pointer disabled:opacity-50"
                title="Xóa minh chứng"
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
            className="px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-600 dark:text-slate-400 hover:text-blue-500 text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{isUploading ? 'Đang tải lên...' : 'Tải minh chứng (PDF, PNG, JPG)'}</span>
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-[#1E293B] rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1E293B] flex items-center justify-between bg-slate-50 dark:bg-[#111C38]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  Minh chứng: {attachment.fileName}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Tải về</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-2 bg-slate-100/50 dark:bg-[#070D1E] overflow-auto flex items-center justify-center">
              {isPdf ? (
                <iframe
                  src={`/api/v1/candidate/cvs/${cvId}/attachments/${attachment.attachmentId}`}
                  title={attachment.fileName}
                  className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api/v1/candidate/cvs/${cvId}/attachments/${attachment.attachmentId}`}
                  alt={attachment.fileName}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
