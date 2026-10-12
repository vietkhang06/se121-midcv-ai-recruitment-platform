'use client';

import React from 'react';
import { CV } from '@/types';
import { Calendar, CheckCircle2, Eye, Edit3, Copy, Download, Trash2 } from 'lucide-react';

interface CVCardProps {
  cv: CV;
  onPreview: (cv: CV) => void;
  onEdit: (cv: CV) => void;
  onDuplicate: (cv: CV) => void;
  onExport: (cv: CV) => void;
  onDelete: (cv: CV) => void;
}

export const CVCard: React.FC<CVCardProps> = ({
  cv,
  onPreview,
  onEdit,
  onDuplicate,
  onExport,
  onDelete
}) => {
  return (
    <div className="motion-hover-lift bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#3B82F6] rounded-2xl p-5 shadow-xs hover:shadow-md flex flex-col justify-between group transition-colors">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EFF6FF] dark:bg-[#13233F] border border-[#BFDBFE] dark:border-[#1E3A5F] text-[#2563EB] dark:text-[#60A5FA]">
              {cv.targetIndustry}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${
              cv.creationPath === 'BUILDER'
                ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
            }`}>
              {cv.creationPath === 'BUILDER' ? 'Template Builder' : 'Uploaded PDF/DOCX'}
            </span>
          </div>
          {cv.isDefault && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#00B14F] dark:text-[#10B981] bg-[#E8F8EE] dark:bg-[#00B14F]/15 border border-[#00B14F]/30 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CV Mặc định</span>
            </span>
          )}
        </div>

        {/* Title & Target Role */}
        <div>
          <h3 className="text-base font-bold text-[#0F2A52] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors line-clamp-1">
            {cv.title}
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Vị trí nhắm tới: <strong className="text-[#1E3A5F] dark:text-slate-200">{cv.targetRole || 'Chưa chỉ định'}</strong>
          </p>
        </div>

        {/* Info Line */}
        <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Cập nhật: {cv.updatedAt}</span>
          </span>
          <span className="font-mono text-[#2563EB] dark:text-[#3B82F6] font-semibold text-[11px]">v{cv.currentVersionNumber}.0</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-5 gap-1.5 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <button
          onClick={() => onPreview(cv)}
          title="Xem trước CV"
          className="flex items-center justify-center py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-[#2563EB] dark:hover:text-[#60A5FA] border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer"
        >
          <Eye className="w-4 h-4 text-[#2563EB] dark:text-cyan-400" />
        </button>

        <button
          onClick={() => onEdit(cv)}
          title="Chỉnh sửa CV"
          className="flex items-center justify-center py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-[#2563EB] dark:hover:text-[#60A5FA] border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer"
        >
          <Edit3 className="w-4 h-4 text-[#2563EB] dark:text-indigo-400" />
        </button>

        <button
          onClick={() => onDuplicate(cv)}
          title="Nhân bản CV"
          className="flex items-center justify-center py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-600 dark:text-slate-300 hover:text-[#00B14F] dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer"
        >
          <Copy className="w-4 h-4 text-[#00B14F] dark:text-emerald-400" />
        </button>

        <button
          onClick={() => onExport(cv)}
          title="Xuất PDF"
          className="flex items-center justify-center py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer"
        >
          <Download className="w-4 h-4 text-amber-500 dark:text-amber-400" />
        </button>

        <button
          onClick={() => onDelete(cv)}
          title="Xóa CV"
          className="flex items-center justify-center py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
