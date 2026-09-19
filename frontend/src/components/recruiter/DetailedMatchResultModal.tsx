'use client';

import React from 'react';
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  GitBranch,
  ExternalLink,
  BookOpen,
  Briefcase,
  GraduationCap,
  FolderGit2,
  FileText,
  ShieldCheck,
  Quote
} from 'lucide-react';

interface DetailedMatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    base_score?: number;
    github_bonus?: number;
    score: number;
    coverage?: number;
    semantic_score?: number;
    algorithm_version?: string;
    details?: any;
    github?: any;
    created_at?: string;
  } | null;
  candidateTitle?: string;
  jobTitle?: string;
}

export function DetailedMatchResultModal({
  isOpen,
  onClose,
  result,
  candidateTitle = 'Hồ sơ ứng viên',
  jobTitle = 'Tin tuyển dụng',
}: DetailedMatchResultModalProps) {
  if (!isOpen || !result) return null;

  const details = result.details || {};
  const criteria: any[] = details.criteria || [];
  const githubEvidence = details.github_evidence || [];
  const githubStatus = result.github?.status;
  const overallScore = Number(result.score || 0);
  const baseScore = Number(result.base_score != null ? result.base_score : overallScore);
  const githubBonus = Number(result.github_bonus || 0);
  const semanticScore = Number(result.semantic_score || 0);
  const coverage = Number(result.coverage || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#0F1A36] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono">
                {details.algorithm || 'midcv-score-v1'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Độ phủ tiêu chí: {coverage.toFixed(0)}%
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              Chi tiết Đối sánh: {candidateTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đối chiếu theo yêu cầu công việc: <strong className="text-slate-700 dark:text-slate-300">{jobTitle}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 3-Tier Official Scores Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            {/* Overall Match */}
            <div className="bg-[#111C38] border border-[#1E293B] rounded-2xl p-4 text-white shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider block font-mono">
                Overall Match
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white font-mono">{overallScore.toFixed(1)}%</span>
                <span className="text-xs text-blue-200/80">/ 100</span>
              </div>
              <p className="text-[10px] text-slate-300">Điểm tổng hợp cuối cùng</p>
            </div>

            {/* Core Score */}
            <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">
                Core JD–CV Score
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {baseScore.toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Trọng số tiêu chí đánh giá</p>
            </div>

            {/* GitHub Bonus */}
            <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block font-mono flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                <span>GitHub Bonus</span>
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                  +{githubBonus.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400">/ tối đa 5%</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Cộng điểm minh chứng thực tế</p>
            </div>

            {/* Pgvector Semantic */}
            <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Ngữ nghĩa Vector</span>
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {semanticScore.toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Cosine pgvector BGE-M3</p>
            </div>
          </div>

          {/* GitHub Policy Note */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-white">Chính sách trung lập GitHub: </strong>
              <span>
                Không trừ điểm nếu ứng viên không có GitHub hoặc ngành phi kỹ thuật. Điểm cộng tối đa 5% khi phát hiện repository công khai minh chứng cho kỹ năng JD.
              </span>
            </div>
          </div>

          {/* Breakdown Criteria Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>Minh chứng trích dẫn theo từng tiêu chí (Line-by-Line Evidence)</span>
            </h3>

            <div className="space-y-3">
              {criteria.map((c, i) => (
                <div
                  key={c.id || i}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">
                        {c.id}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        Trọng số: {c.weight}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md font-mono ${
                          c.status === 'MET'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : c.status === 'PARTIAL'
                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {c.status}
                      </span>
                      {c.score != null && (
                        <span className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
                          {Number(c.score).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Criteria Evidence Details */}
                  {Array.isArray(c.evidence) && c.evidence.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {c.evidence.map((ev: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs space-y-1.5 border border-slate-100 dark:border-slate-800/60"
                        >
                          {ev.name && (
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-slate-900 dark:text-white font-mono">{ev.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  ev.status === 'MET'
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {ev.status}
                              </span>
                            </div>
                          )}

                          {ev.jd_evidence && (
                            <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
                              <Quote className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                              <span>
                                <strong className="text-blue-600 dark:text-blue-400 font-semibold">JD: </strong>
                                {ev.jd_evidence}
                              </span>
                            </div>
                          )}

                          {ev.cv_evidence ? (
                            <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                              <Quote className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                              <span>
                                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">CV: </strong>
                                {ev.cv_evidence}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 italic pl-4.5">
                              Không tìm thấy dòng minh chứng tương ứng trong CV.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Non-array evidence (experience years or method notes) */}
                  {!Array.isArray(c.evidence) && typeof c.evidence === 'object' && c.evidence !== null && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                      {c.evidence.note && <p>{c.evidence.note}</p>}
                      {c.evidence.method && <p className="font-mono text-[11px] text-slate-400">{c.evidence.method}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* GitHub Supporting Evidence Details */}
          {Array.isArray(githubEvidence) && githubEvidence.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-500" />
                <span>Minh chứng mã nguồn GitHub đã xác thực</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {githubEvidence.map((ge: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 font-mono uppercase">
                        {ge.skill}
                      </span>
                      {ge.url && (
                        <a
                          href={ge.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 flex items-center gap-1 font-semibold text-[11px]"
                        >
                          <span>{ge.repo}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Nguồn: {ge.source}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            Algorithm: {details.algorithm || 'midcv-score-v1'} · Kết luận: Cần HR duyệt
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm"
          >
            Đóng bảng chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}
