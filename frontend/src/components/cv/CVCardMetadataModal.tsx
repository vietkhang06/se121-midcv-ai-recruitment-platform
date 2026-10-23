'use client';

import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { AnimatedModalShell } from '@/components/motion';
import { useLanguage } from '@/context/LanguageContext';
import { updateCVMetadata } from '@/lib/api';
import { CV } from '@/types';

interface CVCardMetadataModalProps {
  cv: CV | null;
  onClose: () => void;
  onSaved: (cv: CV) => void;
}

export const CVCardMetadataModal: React.FC<CVCardMetadataModalProps> = ({ cv, onClose, onSaved }) => {
  const { locale } = useLanguage();
  const isVi = locale === 'vi';
  const [title, setTitle] = useState(cv?.title ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (isSaving) return;
    if (title.trim() !== (cv?.title ?? '').trim()
      && !window.confirm(isVi ? 'Bạn có thay đổi chưa lưu. Đóng mà không lưu?' : 'You have unsaved changes. Close without saving?')) return;
    onClose();
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cv || isSaving) return;
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError(isVi ? 'Hãy nhập tên hồ sơ.' : 'Enter a CV name.');
      return;
    }
    if (normalizedTitle === cv.title.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updatedCv = await updateCVMetadata(cv.id, { title: normalizedTitle });
      onSaved(updatedCv);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error
        ? saveError.message
        : (isVi ? 'Không thể cập nhật tên hồ sơ.' : 'Could not update the CV name.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatedModalShell
      isOpen={cv !== null}
      onRequestClose={close}
      titleId="cv-card-metadata-title"
      descriptionId="cv-card-metadata-description"
      testId="cv-card-metadata-modal"
      overlayClassName="p-4 bg-slate-950/70 backdrop-blur-sm"
      panelClassName="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      {cv && (
        <form onSubmit={save}>
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 id="cv-card-metadata-title" className="text-base font-semibold">
                {isVi ? 'Thông tin thẻ CV' : 'CV card details'}
              </h2>
              <p id="cv-card-metadata-description" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isVi ? 'Đổi tên hiển thị trong thư viện. Nội dung và phiên bản CV không thay đổi.' : 'Rename this library card. CV content and versions stay unchanged.'}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              aria-label={isVi ? 'Đóng' : 'Close'}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="space-y-2 px-5 py-5">
            <label htmlFor="cv-card-title" className="block text-sm font-medium">
              {isVi ? 'Tên hồ sơ' : 'CV name'}
            </label>
            <input
              id="cv-card-title"
              data-autofocus="true"
              autoComplete="off"
              maxLength={255}
              required
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError(null);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
            />
            {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          </div>

          <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || title.trim() === cv.title.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? (isVi ? 'Đang lưu…' : 'Saving…') : (isVi ? 'Lưu tên hồ sơ' : 'Save name')}
            </button>
          </footer>
        </form>
      )}
    </AnimatedModalShell>
  );
};
