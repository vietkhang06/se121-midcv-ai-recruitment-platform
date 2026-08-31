'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CV } from '@/types';
import { MOCK_CVS } from '@/lib/api';
import { CVCard } from '@/components/cv/CVCard';
import { CVUploadModal } from '@/components/cv/CVUploadModal';
import { FileText, Plus, Upload, Sparkles, FolderOpen } from 'lucide-react';

export default function CVLibraryPage() {
  const [cvList, setCvList] = useState<CV[]>(MOCK_CVS);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [previewCv, setPreviewCv] = useState<CV | null>(null);

  const handleDuplicate = (targetCv: CV) => {
    const duplicated: CV = {
      ...targetCv,
      id: `cv-dup-${Date.now()}`,
      title: `${targetCv.title} (Bản sao)`,
      isDefault: false,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    setCvList([...cvList, duplicated]);
  };

  const handleDelete = (targetCv: CV) => {
    if (confirm(`Bạn có chắc chắn muốn xóa CV "${targetCv.title}"?`)) {
      setCvList(cvList.filter(c => c.id !== targetCv.id));
    }
  };

  const handleExport = (targetCv: CV) => {
    alert(`Đã xuất PDF thành công cho CV "${targetCv.title}" (v${targetCv.currentVersionNumber}.0)`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            <FolderOpen className="w-4 h-4" />
            <span>Multi-CV Management Library</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Thư Viện CV Cá Nhân</h1>
          <p className="text-sm text-slate-400">Quản lý nhiều mẫu CV cho từng ngành nghề mục tiêu, tùy chỉnh phiên bản và xuất PDF</p>
        </div>

        {/* Dual Path CTA Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Tải lên CV (PDF/DOCX)</span>
          </button>

          <Link
            href="/candidate/cvs/builder"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-md shadow-indigo-500/25 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo CV AI Mới</span>
          </Link>
        </div>
      </div>

      {/* CV Grid */}
      {cvList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cvList.map((cv) => (
            <CVCard
              key={cv.id}
              cv={cv}
              onPreview={(c) => setPreviewCv(c)}
              onEdit={(c) => window.location.href = `/candidate/cvs/builder?edit=${c.id}`}
              onDuplicate={handleDuplicate}
              onExport={handleExport}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <FileText className="w-12 h-12 mx-auto text-slate-400" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Chưa có CV nào trong thư viện</h3>
            <p className="text-xs text-slate-400">Tải lên tập tin CV sẵn có hoặc sử dụng công cụ CV Builder chuẩn AI</p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700"
            >
              Tải file PDF/DOCX
            </button>
            <Link
              href="/candidate/cvs/builder"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500"
            >
              Tạo CV mới bằng AI Builder
            </Link>
          </div>
        </div>
      )}

      {/* CV Preview Modal */}
      {previewCv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-4 relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setPreviewCv(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              ×
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{previewCv.title}</h3>
              <p className="text-xs text-slate-400">Ngành: {previewCv.targetIndustry} • Phiên bản: v{previewCv.currentVersionNumber}.0</p>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 text-xs">
              {previewCv.versions[0]?.sections.map((sec, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">{sec.title}</h4>
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">{sec.content}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewCv(null)}
                className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  handleExport(previewCv);
                  setPreviewCv(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Xuất PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CV Upload Modal */}
      <CVUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(newCv) => setCvList([...cvList, newCv])}
      />
    </div>
  );
}
