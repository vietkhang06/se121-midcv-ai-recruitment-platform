'use client';

import React from 'react';
import { AlertTriangle, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { CompanyVerificationState } from '@/types';

interface SuspensionBannerProps {
  companyVerificationStatus?: CompanyVerificationState;
  companyName?: string;
  onOpenAppealModal?: () => void;
}

export const SuspensionBanner: React.FC<SuspensionBannerProps> = ({
  companyVerificationStatus,
  companyName,
  onOpenAppealModal,
}) => {
  const { user } = useAuth();

  const isUserSuspended = user?.accountStatus === 'SUSPENDED' || user?.isActive === false;
  const isCompanySuspended = companyVerificationStatus === 'SUSPENDED';

  if (!isUserSuspended && !isCompanySuspended) {
    return null;
  }

  const title = isUserSuspended
    ? 'Tài khoản của bạn đang bị tạm đình chỉ'
    : `Doanh nghiệp "${companyName || ''}" đang bị tạm đình chỉ hoạt động`;

  const description = isUserSuspended
    ? 'Tài khoản của bạn đã bị khóa do vi phạm chính sách hoặc theo yêu cầu quản trị. Mọi tính năng đăng tin, quản lý ứng viên và chấm điểm matching tạm thời bị vô hiệu hóa.'
    : 'Doanh nghiệp của bạn đang trong trạng thái đình chỉ. Tất cả tin tuyển dụng đã bị ẩn và các thao tác tuyển dụng bị tạm khóa để bảo vệ ứng viên.';

  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 sm:p-5 backdrop-blur-sm text-red-700 dark:text-red-300"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 mt-0.5 shrink-0">
            {isUserSuspended ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-base text-red-800 dark:text-red-200">
              {title}
            </h3>
            <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/90 max-w-3xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          {onOpenAppealModal ? (
            <button
              onClick={onOpenAppealModal}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Gửi khiếu nại
            </button>
          ) : (
            <Link
              href="/recruiter/company?tab=appeals"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Gửi khiếu nại
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
