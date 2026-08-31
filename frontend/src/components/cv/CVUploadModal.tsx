'use client';

import React, { useState } from 'react';
import { Industry, CV } from '@/types';
import { X, UploadCloud, FileText, CheckCircle2, Loader2, AlertCircle, RefreshCw, Edit3 } from 'lucide-react';

interface CVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (cv: CV) => void;
}

type ProcessingStatus = 'IDLE' | 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'REVIEW' | 'FAILED';

export const CVUploadModal: React.FC<CVUploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [targetIndustry, setTargetIndustry] = useState<Industry>('Technology');
  const [status, setStatus] = useState<ProcessingStatus>('IDLE');
  
  // Extracted fields editable during REVIEW step
  const [cvTitle, setCvTitle] = useState<string>('');
  const [extractedSkills, setExtractedSkills] = useState<string>('Java, Spring Boot, PostgreSQL, Docker, REST API');
  const [extractedSummary, setExtractedSummary] = useState<string>('3.5 năm kinh nghiệm Java Backend');
  const [extractedExp, setExtractedExp] = useState<string>('2023 - Nay: Senior Java Backend Engineer tại FPT Software');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type === 'application/pdf' || selected.name.endsWith('.docx') || selected.name.endsWith('.pdf')) {
        setFile(selected);
        setCvTitle(selected.name.replace(/\.[^/.]+$/, ''));
      } else {
        alert('Chỉ hỗ trợ tập tin định dạng PDF hoặc DOCX');
      }
    }
  };

  const handleStartProcessing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus('UPLOADING');

    setTimeout(() => {
      setStatus('QUEUED');
      setTimeout(() => {
        setStatus('PROCESSING');
        setTimeout(() => {
          setStatus('COMPLETED');
          setTimeout(() => {
            setStatus('REVIEW'); // Candidate review step before final save
          }, 800);
        }, 1500);
      }, 800);
    }, 800);
  };

  const handleSaveParsedCV = () => {
    const newCv: CV = {
      id: `cv-uploaded-${Date.now()}`,
      title: cvTitle || (file ? file.name.replace(/\.[^/.]+$/, '') : 'Uploaded CV'),
      targetIndustry: targetIndustry,
      targetRole: 'Software Engineer',
      creationPath: 'UPLOAD',
      isDefault: false,
      currentVersionNumber: 1,
      updatedAt: new Date().toISOString().split('T')[0],
      versions: [
        {
          id: `ver-${Date.now()}`,
          versionNumber: 1,
          summaryText: extractedSummary,
          createdAt: new Date().toISOString().split('T')[0],
          sections: [
            { sectionType: 'SUMMARY', title: 'Tóm tắt bản thân', content: extractedSummary },
            { sectionType: 'SKILLS', title: 'Kỹ năng chuyên môn', content: extractedSkills },
            { sectionType: 'EXPERIENCE', title: 'Kinh nghiệm làm việc', content: extractedExp }
          ]
        }
      ]
    };

    onUploadSuccess(newCv);
    onClose();
    setStatus('IDLE');
    setFile(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-500/30 text-indigo-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Tải lên & Phân tích CV (PDF / DOCX)</h3>
            <p className="text-xs text-slate-400">Theo dõi trạng thái xử lý AI Worker và kiểm tra dữ liệu trước khi lưu</p>
          </div>
        </div>

        {status === 'IDLE' && (
          <form onSubmit={handleStartProcessing} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Ngành nghề nhắm tới</label>
              <select
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value as Industry)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Technology">Technology</option>
                <option value="Marketing">Marketing</option>
                <option value="Design">Design</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-950/50 transition cursor-pointer">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="cv-file-input"
              />
              <label htmlFor="cv-file-input" className="cursor-pointer block space-y-2">
                <FileText className="w-10 h-10 mx-auto text-indigo-400" />
                <span className="block text-sm font-semibold text-white">
                  {file ? file.name : 'Nhấp để chọn file CV (PDF hoặc DOCX)'}
                </span>
                <span className="block text-xs text-slate-400">Dung lượng tối đa 10MB</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!file}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition active:scale-95 shadow-md shadow-indigo-500/25"
            >
              Phân tích & Tải lên CV
            </button>
          </form>
        )}

        {(status === 'UPLOADING' || status === 'QUEUED' || status === 'PROCESSING' || status === 'COMPLETED') && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 mx-auto text-cyan-400 animate-spin" />
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono uppercase">
                {status}
              </span>
              <h4 className="text-base font-bold text-white pt-1">
                {status === 'UPLOADING' && 'Đang tải file lên máy chủ...'}
                {status === 'QUEUED' && 'Đã vào hàng chờ xử lý...'}
                {status === 'PROCESSING' && 'Đang phân tích CV qua Python AI Worker...'}
                {status === 'COMPLETED' && 'Phân tích xong! Đang chuyển sang màn hình Đánh giá...'}
              </h4>
            </div>
          </div>
        )}

        {status === 'REVIEW' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Đã phân tích xong! Hãy kiểm tra & điều chỉnh thông tin trước khi lưu.
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tên lưu trữ CV</label>
                <input
                  type="text"
                  value={cvTitle}
                  onChange={(e) => setCvTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tóm tắt bản thân trích xuất</label>
                <textarea
                  rows={2}
                  value={extractedSummary}
                  onChange={(e) => setExtractedSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Kỹ năng chuyên môn trích xuất</label>
                <input
                  type="text"
                  value={extractedSkills}
                  onChange={(e) => setExtractedSkills(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStatus('IDLE')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lên file khác</span>
              </button>
              <button
                type="button"
                onClick={handleSaveParsedCV}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition active:scale-95 shadow-md shadow-emerald-500/25"
              >
                Xác nhận & Lưu vào Thư viện CV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
