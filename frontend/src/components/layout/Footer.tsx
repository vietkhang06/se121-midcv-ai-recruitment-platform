'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-sm py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center gap-2 font-bold text-lg text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span>AI Recruitment</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nền tảng tuyển dụng thông minh thế hệ mới hỗ trợ đối sánh tự động JD & CV bằng Vector Embedding 1536 chiều và LLM.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Dành cho Ứng viên</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="/jobs" className="hover:text-cyan-400 transition">Tìm kiếm việc làm</a></li>
            <li><a href="/candidate/cvs" className="hover:text-cyan-400 transition">Tạo CV AI & Thư viện CV</a></li>
            <li><a href="/candidate/profile" className="hover:text-cyan-400 transition">Cập nhật Hồ sơ Đa ngành</a></li>
            <li><a href="/candidate/applications" className="hover:text-cyan-400 transition">Lịch sử nộp đơn Quick Apply</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Ngành nghề Nổi bật</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="/jobs?industry=Technology" className="hover:text-cyan-400 transition">Công nghệ Thông tin (Technology)</a></li>
            <li><a href="/jobs?industry=Marketing" className="hover:text-cyan-400 transition">Digital Marketing</a></li>
            <li><a href="/jobs?industry=Design" className="hover:text-cyan-400 transition">UI/UX Product Design</a></li>
            <li><a href="/jobs?industry=Finance" className="hover:text-cyan-400 transition">Tài chính - Kế toán</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Bảo mật & Công nghệ</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hệ thống tuân thủ nghiêm ngặt bảo mật dữ liệu, phân tách minh bạch dữ liệu minh chứng ứng viên và đánh giá GitHub độc lập.
          </p>
          <p className="text-xs font-mono text-indigo-400 mt-3">
            Powered by OpenAI GPT-4o-mini & Pgvector
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-900 text-center text-xs text-slate-400">
        © 2026 AI Recruitment Platform. All rights reserved. Designed for Candidate Experience.
      </div>
    </footer>
  );
};
