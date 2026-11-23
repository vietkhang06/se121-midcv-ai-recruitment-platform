'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import {
  fetchApplicationCVPreview, fetchApplicationCVSourcePage,
  fetchApplicationCVSourcePages, fetchApplicationOriginalCV,
} from '@/lib/api';
import type { Application } from '@/types';

type FilePreview = { url: string; filename: string; type: string; text?: string };
type Source =
  | { kind: 'loading' | 'missing' | 'error' }
  | { kind: 'file'; file: FilePreview }
  | { kind: 'pages'; pages: { order: number; filename: string; imageUrl?: string }[] };

const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const controls = 'inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--heading)]';

export function SubmittedCvViewer({ applicationId, snapshot, locale }: {
  applicationId: string;
  snapshot: NonNullable<Application['snapshot']>;
  locale: 'vi' | 'en';
}) {
  const vi = locale === 'vi';
  const [source, setSource] = useState<Source>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [wordRequested, setWordRequested] = useState(false);
  const [wordPdf, setWordPdf] = useState<string | 'loading' | 'error' | null>(null);
  const raw = snapshot.rawTextSnapshot;
  const hasRaw = Boolean(raw?.trim());

  useEffect(() => {
    const request = new AbortController();
    const urls: string[] = [];
    const objectUrl = (blob: Blob) => {
      if (request.signal.aborted) return '';
      const url = URL.createObjectURL(blob);
      urls.push(url);
      return url;
    };
    async function load() {
      try {
        const original = await fetchApplicationOriginalCV(applicationId, request.signal);
        if (request.signal.aborted) return;
        if (original) {
          const { blob, filename } = original;
          const type = blob.type.split(';')[0].toLowerCase();
          const text = type.startsWith('text/') ? await blob.text() : undefined;
          if (!request.signal.aborted) {
            setSource({ kind: 'file', file: { url: objectUrl(blob), filename, type, text } });
          }
          return;
        }

        const list = await fetchApplicationCVSourcePages(applicationId, request.signal);
        const pages = await Promise.all(list.map(async page => {
          const metadata = { order: page.page_order, filename: page.filename };
          try {
            const image = await fetchApplicationCVSourcePage(applicationId, page.page_order, request.signal);
            if (image && imageTypes.has(image.blob.type)) return { ...metadata, imageUrl: objectUrl(image.blob) };
          } catch {
            // Keep available pages visible when one image fails.
          }
          return metadata;
        }));
        if (!request.signal.aborted) setSource(pages.length ? { kind: 'pages', pages } : { kind: 'missing' });
      } catch {
        if (!request.signal.aborted) setSource({ kind: 'error' });
      }
    }
    void load();
    return () => {
      request.abort();
      urls.forEach(URL.revokeObjectURL);
    };
  }, [applicationId, attempt]);

  useEffect(() => {
    if (!wordRequested) return;
    const request = new AbortController();
    let url: string | undefined;
    fetchApplicationCVPreview(applicationId, request.signal).then(file => {
      if (request.signal.aborted) return;
      if (file?.blob.type !== 'application/pdf') throw new Error('PDF preview unavailable');
      url = URL.createObjectURL(file.blob);
      setWordPdf(url);
    }).catch(() => {
      if (!request.signal.aborted) setWordPdf('error');
    });
    return () => {
      request.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [applicationId, wordRequested]);

  function downloadRaw() {
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cv-van-ban-trich-xuat.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const file = source.kind === 'file' ? source.file : null;
  const isWord = file && (
    /\.(docx?)$/i.test(file.filename)
    || ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
  );
  const pdf = file?.type === 'application/pdf' ? file.url : wordPdf?.startsWith('blob:') ? wordPdf : null;
  const date = snapshot.snapshotCreatedAt ? new Date(snapshot.snapshotCreatedAt) : null;

  return (
    <section id="submitted-cv" className="min-w-0 scroll-mt-40 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--heading)]">
            <FileText className="size-5 shrink-0 text-[var(--primary)]" />
            {vi ? 'CV tại thời điểm nộp hồ sơ' : 'CV at submission'}
          </h2>
          <p className="break-words text-sm text-[var(--text-secondary)]">
            {snapshot.cvTitle || (vi ? 'CV ứng tuyển' : 'Submitted CV')}
            {date && Number.isFinite(date.valueOf()) && ` · ${date.toLocaleDateString(vi ? 'vi-VN' : 'en-GB')}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {file && <a className={controls} href={file.url} download={file.filename}>
            <Download className="size-4 shrink-0" /> {vi ? 'Tải CV gốc' : 'Download original'}
          </a>}
          {hasRaw && <button type="button" className={controls} onClick={downloadRaw}>
            <Download className="size-4 shrink-0" /> {vi ? 'Tải văn bản trích xuất (.txt)' : 'Download extracted text (.txt)'}
          </button>}
        </div>
      </div>

      {source.kind === 'loading' && <p role="status">{vi ? 'Đang tải CV…' : 'Loading CV…'}</p>}
      {source.kind === 'missing' && <p className="text-sm text-[var(--text-secondary)]">
        {vi ? 'Hồ sơ này không có tệp CV gốc để xem.' : 'No original CV file is available for this application.'}
      </p>}
      {source.kind === 'error' && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
        <span>{vi ? 'Chưa tải được bản gốc CV.' : 'Could not load the original CV.'}</span>
        <button type="button" className={controls} onClick={() => {
          setSource({ kind: 'loading' });
          setAttempt(value => value + 1);
        }}>{vi ? 'Thử lại' : 'Retry'}</button>
      </div>}

      {pdf && <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="min-w-0 break-all text-[var(--text-secondary)]">{file?.filename}</span>
          <a href={pdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--primary)]">
            {vi ? 'Mở PDF ở tab mới' : 'Open PDF in a new tab'} <ExternalLink className="size-4" />
          </a>
        </div>
        <iframe src={pdf} title={vi ? 'Trình đọc PDF của CV' : 'CV PDF reader'}
          className="h-[min(75vh,56rem)] min-h-96 w-full rounded-xl border border-[var(--border)] bg-white" />
      </div>}

      {isWord && !pdf && (
        <div className="space-y-2 rounded-xl bg-[var(--surface-secondary)] p-4 text-sm">
          <p className="break-all font-semibold">{file.filename}</p>
          {wordPdf === 'loading' ? <p role="status">{vi ? 'Đang tạo bản xem PDF…' : 'Preparing PDF preview…'}</p>
            : wordPdf === 'error' ? <p role="status">{vi
              ? 'Chưa tạo được bản xem Word. Bạn có thể tải CV gốc để mở.'
              : 'The Word preview is unavailable. You can download the original.'}</p>
              : <button type="button" className={controls} onClick={() => { setWordPdf('loading'); setWordRequested(true); }}>
                {vi ? 'Xem bản Word' : 'Preview Word document'}
              </button>}
        </div>
      )}

      {file && imageTypes.has(file.type) && (
        <a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={vi ? 'Mở ảnh CV ở tab mới' : 'Open CV image in a new tab'}>
          {/* The original is a private, authenticated blob. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.url} alt={file.filename} className="mx-auto max-h-[75vh] max-w-full rounded-xl border border-[var(--border)] object-contain" />
        </a>
      )}
      {file?.text !== undefined && <pre className="whitespace-pre-wrap break-words rounded-xl bg-[var(--surface-secondary)] p-4 text-sm">{file.text}</pre>}
      {file && !pdf && !isWord && !imageTypes.has(file.type) && file.text === undefined && (
        <p className="text-sm text-[var(--text-secondary)]">{vi
          ? 'Định dạng này có thể xem bằng cách tải CV gốc.'
          : 'Download the original CV to open this format.'}</p>
      )}

      {source.kind === 'pages' && <ol className="space-y-4">
        {source.pages.map(page => <li key={page.order} className="space-y-2 rounded-xl border border-[var(--border)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="break-all">{vi ? 'Trang' : 'Page'} {page.order} · {page.filename}</span>
            {page.imageUrl && <a className={controls} href={page.imageUrl} download={page.filename}>
              <Download className="size-4" /> {vi ? 'Tải ảnh gốc' : 'Download original image'}
            </a>}
          </div>
          {page.imageUrl ? <a href={page.imageUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.imageUrl} alt={`${vi ? 'Trang CV' : 'CV page'} ${page.order}`}
              className="mx-auto max-h-[75vh] max-w-full object-contain" />
          </a> : <p role="status" className="text-sm">{vi ? 'Chưa tải được ảnh trang này.' : 'This page image could not be loaded.'}</p>}
        </li>)}
      </ol>}

      {hasRaw && <details className="rounded-xl border border-[var(--border-soft)] p-3 text-sm">
        <summary className="cursor-pointer font-semibold">{vi ? 'Văn bản trích xuất từ CV' : 'Extracted CV text'}</summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words font-sans">{raw}</pre>
      </details>}
    </section>
  );
}
