'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMyActiveSuspension, submitSuspensionAppeal, cancelSuspensionAppeal } from '@/lib/api';
import { SuspensionNotice } from '@/types';
import { ConfirmActionDialog } from './ConfirmActionDialog';

export const SuspensionBanner: React.FC = () => {
  const [notice, setNotice] = useState<SuspensionNotice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAppealModal, setShowAppealModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [subject, setSubject] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');

  const fetchNotice = async () => {
    try {
      setIsLoading(true);
      const data = await getMyActiveSuspension();
      setNotice(data);
    } catch {
      setNotice(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotice();
  }, []);

  if (isLoading || !notice || !notice.hasActiveSuspension) {
    return null;
  }

  const handleOpenAppealModal = () => {
    setSubject(notice.companySuspended ? 'Khiếu nại tạm đình chỉ doanh nghiệp' : 'Khiếu nại tạm đình chỉ tài khoản');
    setContent('');
    setEvidenceUrl('');
    setErrorMsg(null);
    setShowAppealModal(true);
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('Vui lòng nhập nội dung giải trình khiếu nại.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await submitSuspensionAppeal({
        suspensionRecordId: notice.suspensionRecordId,
        targetType: notice.companySuspended ? 'COMPANY' : 'USER',
        subject: subject.trim(),
        content: content.trim(),
        evidenceAttachmentId: evidenceUrl.trim() || undefined,
      });

      setSuccessMsg('Đã gửi khiếu nại thành công! Ban quản trị sẽ sớm xem xét.');
      setShowAppealModal(false);
      await fetchNotice();
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi gửi khiếu nại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancelAppeal = async () => {
    if (!notice.appealId) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await cancelSuspensionAppeal(notice.appealId, 'Người dùng tự hủy khiếu nại qua portal');
      setShowCancelModal(false);
      await fetchNotice();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể hủy khiếu nại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAppealStatusBadge = () => {
    switch (notice.appealStatus) {
      case 'SUBMITTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Đã gửi khiếu nại</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Đang được xét duyệt</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">Khiếu nại bị từ chối</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Đã hủy khiếu nại</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 p-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {notice.companySuspended
                  ? 'Doanh nghiệp đang bị tạm đình chỉ hoạt động'
                  : 'Tài khoản của bạn đang bị tạm đình chỉ'}
              </h4>
              {getAppealStatusBadge()}
            </div>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">Lý do:</span> {notice.reason || 'Vi phạm điều khoản vận hành hệ thống'}
              {notice.startsAt && (
                <span className="ml-2 text-amber-700 dark:text-amber-400">
                  (Bắt đầu từ: {new Date(notice.startsAt).toLocaleDateString('vi-VN')})
                </span>
              )}
              {notice.expiresAt && (
                <span className="ml-1 text-amber-700 dark:text-amber-400">
                  - Hết hạn: {new Date(notice.expiresAt).toLocaleDateString('vi-VN')}
                </span>
              )}
            </p>
            {notice.appealResolutionNotes && (
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                <span className="font-semibold">Ghi chú phản hồi khiếu nại:</span> {notice.appealResolutionNotes}
              </p>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs font-medium text-amber-900 dark:text-amber-200">
              <Link href="/profile" className="underline hover:text-amber-700 transition-colors">
                Cập nhật thông tin hồ sơ
              </Link>
              {notice.companySuspended && (
                <Link href="/company" className="underline hover:text-amber-700 transition-colors">
                  Cập nhật minh chứng doanh nghiệp
                </Link>
              )}
              <Link href="mailto:support@midcv.io" className="underline hover:text-amber-700 transition-colors">
                Liên hệ hỗ trợ
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
          {(!notice.appealStatus || notice.appealStatus === 'NONE' || notice.appealStatus === 'CANCELLED' || notice.appealStatus === 'REJECTED') && (
            <button
              onClick={handleOpenAppealModal}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Gửi khiếu nại
            </button>
          )}

          {notice.appealStatus === 'SUBMITTED' && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-semibold transition-colors"
            >
              Hủy khiếu nại
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="max-w-7xl mx-auto mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Appeal Form Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Gửi đơn khiếu nại đình chỉ
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Vui lòng trình bày rõ lý do, bằng chứng hoặc cam kết khắc phục để ban quản trị xem xét gỡ bỏ trạng thái đình chỉ.
            </p>

            <form onSubmit={handleSubmitAppeal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề khiếu nại
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung giải trình chi tiết *
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Mô tả hoàn cảnh, căn cứ khiếu nại và các tài liệu liên quan..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Đường dẫn tài liệu / minh chứng bổ trợ (tùy chọn)
                </label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc liên kết minh chứng"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowAppealModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi khiếu nại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Appeal Dialog */}
      <ConfirmActionDialog
        isOpen={showCancelModal}
        title="Xác nhận hủy đơn khiếu nại"
        description="Bạn có chắc chắn muốn hủy đơn khiếu nại đang chờ xét duyệt này? Bạn vẫn có thể gửi lại khiếu nại mới sau đó."
        confirmLabel="Hủy khiếu nại"
        cancelLabel="Quay lại"
        variant="warning"
        isLoading={isSubmitting}
        errorMessage={errorMsg}
        onConfirm={handleConfirmCancelAppeal}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
};
