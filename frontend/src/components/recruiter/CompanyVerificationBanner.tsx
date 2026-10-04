'use client';

import React from 'react';
import { CompanyVerificationState } from '@/types';
import { ShieldCheck, ShieldAlert, Clock, AlertTriangle, Eye, FileEdit, Ban } from 'lucide-react';

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
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-white text-sm block">Doanh nghiệp đã được Xác minh (Verified Company)</span>
            <span className="text-slate-300">{companyName} có đầy đủ quyền hạn lưu bản nháp và Xuất bản (Publish) bài tuyển dụng.</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 shrink-0">
          ✓ Ready to Publish
        </span>
      </div>
    );
  }

  if (status === 'UNDER_REVIEW') {
    return (
      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-blue-300 text-xs space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <span className="font-bold text-white text-sm block">Đang trong tiến trình Thẩm định (Under Review)</span>
              <span className="text-blue-200">Hồ sơ pháp lý của {companyName} đang được Quản trị viên trực tiếp kiểm tra.</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-900/60 border border-blue-500/40 text-blue-300 shrink-0">
            Publish Blocked
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center gap-2 text-blue-100">
          <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Quyền hạn hiện tại:</strong> Bạn có thể lưu bản nháp (DRAFT). Thao tác đăng tin (PUBLISH) sẽ mở ngay khi Quản trị viên phê duyệt.
          </span>
        </div>
      </div>
    );
  }

  if (status === 'CHANGES_REQUESTED') {
    return (
      <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-purple-300 text-xs space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FileEdit className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <span className="font-bold text-white text-sm block">Yêu cầu Bổ sung Hồ sơ (Changes Requested)</span>
              <span className="text-purple-200">{reason || 'Quản trị viên yêu cầu cập nhật hoặc bổ sung tài liệu pháp lý của công ty.'}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-900/60 border border-purple-500/40 text-purple-300 shrink-0">
            Cần cập nhật
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center gap-2 text-purple-100">
          <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            Vui lòng vào mục Cài đặt Doanh nghiệp để chỉnh sửa và gửi lại thẩm định.
          </span>
        </div>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white text-sm block">Doanh nghiệp đang chờ Thẩm định (Pending Verification)</span>
              <span className="text-amber-200">{companyName} hiện chưa được xác minh tài khoản doanh nghiệp chính thức.</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-900/60 border border-amber-500/40 text-amber-300 shrink-0">
            Publish Blocked
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-center gap-2 text-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Quyền hạn hiện tại:</strong> Bạn có thể tạo và lưu bài tuyển dụng dạng <strong>DRAFT (Nháp)</strong>. Thao tác <strong>PUBLISH (Xuất bản)</strong> bị khóa cho tới khi doanh nghiệp hoàn tất xác minh.
          </span>
        </div>
      </div>
    );
  }

  if (status === 'SUSPENDED') {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-500/50 text-rose-300 text-xs space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Ban className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <span className="font-bold text-white text-sm block">Doanh nghiệp Đang Bị Đình Chỉ (Suspended)</span>
              <span className="text-slate-300">{reason || 'Doanh nghiệp bị tạm đình chỉ do có báo cáo vi phạm hoặc vấn đề pháp lý.'}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950 border border-rose-600 text-rose-300 shrink-0">
            Publish Forbidden
          </span>
        </div>
        <p className="text-slate-400 text-[11px]">
          Mọi bài đăng tuyển dụng hiện thời đã được ẩn khỏi bảng tin chung. Vui lòng liên hệ ban quản trị để giải quyết.
        </p>
      </div>
    );
  }

  // REJECTED
  return (
    <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <span className="font-bold text-white text-sm block">Xác minh Doanh nghiệp Bị Từ Chối (Verification Rejected)</span>
            <span className="text-rose-200">{reason || 'Thông tin doanh nghiệp không khớp với Giấy phép ĐKKD hoặc vi phạm điều khoản.'}</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-900/60 border border-rose-500/40 text-rose-300 shrink-0">
          Publish Forbidden
        </span>
      </div>
    </div>
  );
};
