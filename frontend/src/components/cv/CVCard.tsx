'use client';

import React from 'react';
import { CV } from '@/types';
import { FileText, Calendar, CheckCircle2, Eye, Edit3, Copy, Download, Trash2 } from 'lucide-react';

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
    <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
              {cv.targetIndustry}
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
              cv.creationPath === 'BUILDER' ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30' : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
            }`}>
              {cv.creationPath === 'BUILDER' ? 'Template Builder' : 'Uploaded PDF/DOCX'}
            </span>
          </div>
          {cv.isDefault && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CV Mặc định</span>
            </span>
          )}
        </div>

        {/* Title & Target Role */}
        <div>
          <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
            {cv.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Vị trí nhắm tới: <strong className="text-slate-200">{cv.targetRole || 'Chưa chỉ định'}</strong>
          </p>
        </div>

        {/* Info Line */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Cập nhật: {cv.updatedAt}</span>
          </span>
          <span className="font-mono text-indigo-400 text-[11px]">v{cv.currentVersionNumber}.0</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-5 gap-1.5 pt-4 mt-4 border-t border-slate-800/80 text-xs">
        <button
          onClick={() => onPreview(cv)}
          title="Xem trước CV"
          className="flex items-center justify-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          <Eye className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={() => onEdit(cv)}
          title="Chỉnh sửa CV"
          className="flex items-center justify-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          <Edit3 className="w-4 h-4 text-indigo-400" />
        </button>

        <button
          onClick={() => onDuplicate(cv)}
          title="Nhân bản CV"
          className="flex items-center justify-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          <Copy className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={() => onExport(cv)}
          title="Xuất PDF"
          className="flex items-center justify-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          <Download className="w-4 h-4 text-amber-400" />
        </button>

        <button
          onClick={() => onDelete(cv)}
          title="Xóa CV"
          className="flex items-center justify-center py-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
