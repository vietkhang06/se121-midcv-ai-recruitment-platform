'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { deactivateAccount } from '@/lib/api';
import { ConfirmActionDialog } from './ConfirmActionDialog';

export const DeactivateAccountSection: React.FC = () => {
  const router = useRouter();
  const { logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeactivate = async () => {
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại để xác nhận.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await deactivateAccount(password, reason.trim() || undefined);
      setIsOpen(false);
      logout();
      router.push('/login?message=account_deactivated');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể vô hiệu hóa tài khoản. Vui lòng kiểm tra lại mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-red-200 dark:border-red-950/60">
      <div className="p-6 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-red-900 dark:text-red-300">
            Khu vực rủi ro cao: Vô hiệu hóa tài khoản
          </h4>
          <p className="mt-1 text-xs text-red-700 dark:text-red-400 leading-relaxed">
            Khi bạn vô hiệu hóa tài khoản, tất cả các phiên đăng nhập sẽ bị thu hồi ngay lập tức.
            Bạn sẽ không thể đăng nhập lại bằng mật khẩu thông thường trừ khi gửi yêu cầu khôi phục đến ban quản trị.
            Dữ liệu các đơn ứng tuyển và snapshot CV đã nộp trong quá khứ vẫn được bảo lưu theo quy định tuyển dụng.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPassword('');
            setReason('');
            setErrorMsg(null);
            setIsOpen(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
        >
          Vô hiệu hóa tài khoản của tôi
        </button>

        <ConfirmActionDialog
          isOpen={isOpen}
          title="Xác nhận vô hiệu hóa tài khoản"
          description="Hành động này sẽ tạm dừng hoạt động tài khoản của bạn ngay lập tức. Vui lòng nhập mật khẩu hiện tại để xác thực chính chủ."
          confirmLabel="Vô hiệu hóa vĩnh viễn"
          cancelLabel="Hủy bỏ"
          variant="danger"
          isLoading={isSubmitting}
          errorMessage={errorMsg}
          onConfirm={handleDeactivate}
          onCancel={() => setIsOpen(false)}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mật khẩu hiện tại *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lý do vô hiệu hóa (tùy chọn)
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Chia sẻ lý do bạn rời đi..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </ConfirmActionDialog>
      </div>
    </div>
  );
};
