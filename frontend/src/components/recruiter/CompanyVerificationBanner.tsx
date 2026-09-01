'use client';

import React from 'react';
import { CompanyVerificationState } from '@/types';
import { ShieldCheck, ShieldAlert, Clock, AlertTriangle } from 'lucide-react';

interface CompanyVerificationBannerProps {
  status: CompanyVerificationState;
  companyName: string;
  reason?: string;
}

export const CompanyVerificationBanner: React.FC<CompanyVerificationBannerProps> = ({
  status,
  companyName,
  reason
}) => {
  if (status === 'VERIFIED') {
    return (
      <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="font-bold text-white text-sm block">Doanh nghiệp đã được Xác minh (Verified Company)</span>
            <span className="text-slate-300">{companyName} có đầy đủ quyền hạn lưu bản nháp và Xuất bản (Publish) bài tuyển dụng.</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 flex-shrink-0">
          ✓ Ready to Publish
        </span>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-white text-sm block">Doanh nghiệp đang chờ Xác minh (Pending Verification)</span>
              <span className="text-amber-200">{companyName} hiện chưa được xác minh tài khoản doanh nghiệp chính thức.</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-900/60 border border-amber-500/40 text-amber-300 flex-shrink-0">
            Publish Blocked
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-center gap-2 text-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Quyền hạn hiện tại:</strong> Bạn có thể tạo và lưu bài tuyển dụng dạng <strong>DRAFT (Nháp)</strong>. Thao tác <strong>PUBLISH (Xuất bản)</strong> bị khóa cho tới khi doanh nghiệp hoàn tất xác minh.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>
            <span className="font-bold text-white text-sm block">Xác minh Doanh nghiệp Bị Từ Chối (Verification Rejected)</span>
            <span className="text-rose-200">{reason || 'Thông tin doanh nghiệp không khớp với Giấy phép ĐKKD.'}</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-900/60 border border-rose-500/40 text-rose-300 flex-shrink-0">
          Publish Forbidden
        </span>
      </div>
    </div>
  );
};
