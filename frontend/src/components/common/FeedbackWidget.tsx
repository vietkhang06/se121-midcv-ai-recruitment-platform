'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquareText, LifeBuoy, X, Copy, Check, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export function FeedbackWidget() {
  const { locale } = useLanguage();
  const isVi = locale === 'vi';
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'choices' | 'feedback'>('choices');
  const [category, setCategory] = useState('PRODUCT');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const zaloUrl = process.env.NEXT_PUBLIC_ZALO_SUPPORT_URL;

  const copyFeedback = async () => {
    const content = `[midCV feedback]\nCategory: ${category}\nPage: ${window.location.href}\n\n${message.trim()}`;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2" aria-label={isVi ? 'Tiện ích hỗ trợ' : 'Support tools'}>
        <button type="button" onClick={() => { setOpen(true); setMode('choices'); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-100 bg-white text-[var(--primary)] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900" aria-label={isVi ? 'Góp ý và hỗ trợ' : 'Feedback and support'} title={isVi ? 'Góp ý và hỗ trợ' : 'Feedback and support'}>
          <MessageSquareText size={19} />
        </button>
        <Link href="/help" className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-100 bg-white text-[var(--primary)] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900" aria-label={isVi ? 'Trung tâm trợ giúp' : 'Help center'} title={isVi ? 'Trung tâm trợ giúp' : 'Help center'}>
          <LifeBuoy size={19} />
        </Link>
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title" className="w-full max-w-[430px] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--success)]">midCV support</p>
                <h2 id="feedback-dialog-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{isVi ? 'Bạn muốn làm gì?' : 'How can we help?'}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={isVi ? 'Đóng' : 'Close'}><X size={18} /></button>
            </div>

            {mode === 'choices' ? (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setMode('feedback')} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[var(--primary)] hover:bg-blue-50/60 dark:border-slate-700 dark:hover:bg-slate-800">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><MessageSquareText size={20} /></span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{isVi ? 'Góp ý sản phẩm' : 'Product feedback'}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Chia sẻ vấn đề hoặc đề xuất cải thiện.' : 'Report an issue or suggest an improvement.'}</span>
                </button>
                {zaloUrl ? (
                  <a href={zaloUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 p-4 transition hover:border-[var(--primary)] hover:bg-blue-50/60 dark:border-slate-700 dark:hover:bg-slate-800">
                    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><ExternalLink size={20} /></span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">{isVi ? 'Chat Zalo hỗ trợ' : 'Zalo support chat'}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Mở kênh hỗ trợ chính thức.' : 'Open the configured support channel.'}</span>
                  </a>
                ) : (
                  <Link href="/help" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 p-4 transition hover:border-[var(--primary)] hover:bg-blue-50/60 dark:border-slate-700 dark:hover:bg-slate-800">
                    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><LifeBuoy size={20} /></span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">{isVi ? 'Trung tâm trợ giúp' : 'Help center'}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Xem hướng dẫn và thông tin hỗ trợ.' : 'Browse guides and support information.'}</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{isVi ? 'Loại góp ý' : 'Feedback type'}
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    <option value="PRODUCT">{isVi ? 'Cải thiện sản phẩm' : 'Product improvement'}</option>
                    <option value="BUG">{isVi ? 'Báo lỗi' : 'Bug report'}</option>
                    <option value="UX">{isVi ? 'Góp ý giao diện / trải nghiệm' : 'UI / UX feedback'}</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{isVi ? 'Nội dung góp ý' : 'Your feedback'}
                  <textarea value={message} onChange={(event) => { setMessage(event.target.value); setCopied(false); setCopyFailed(false); }} rows={5} maxLength={2000} placeholder={isVi ? 'Mô tả góp ý hoặc lỗi bạn gặp phải…' : 'Describe your idea or the issue you encountered…'} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Góp ý hiện được sao chép để bạn gửi qua kênh hỗ trợ; biểu mẫu chưa kết nối API lưu trữ.' : 'Feedback is copied so you can send it through a support channel; this form is not connected to a storage API.'}</p>
                {copyFailed && <p role="alert" className="text-xs text-rose-600 dark:text-rose-300">{isVi ? 'Trình duyệt không cho phép sao chép tự động. Vui lòng chọn và sao chép nội dung thủ công.' : 'Clipboard access was blocked. Please select and copy the text manually.'}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode('choices')} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{isVi ? 'Quay lại' : 'Back'}</button>
                  <button type="button" disabled={!message.trim()} onClick={() => void copyFeedback()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? (isVi ? 'Đã sao chép' : 'Copied') : (isVi ? 'Sao chép góp ý' : 'Copy feedback')}</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
