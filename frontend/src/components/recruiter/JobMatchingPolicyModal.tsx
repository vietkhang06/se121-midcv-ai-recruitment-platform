'use client';

import React, { useState, useEffect } from 'react';
import { JobMatchingPolicy } from '@/types';
import { getJobMatchingPolicy, updateJobMatchingPolicy, recalculateJobMatching } from '@/lib/api';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';

interface JobMatchingPolicyModalProps {
  jobId: string;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onPolicyUpdated?: () => void;
}

export const JobMatchingPolicyModal: React.FC<JobMatchingPolicyModalProps> = ({
  jobId,
  jobTitle,
  isOpen,
  onClose,
  onPolicyUpdated,
}) => {
  const [policy, setPolicy] = useState<JobMatchingPolicy | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields (in percentage 0 - 100)
  const [reqWeight, setReqWeight] = useState<number>(32);
  const [prefWeight, setPrefWeight] = useState<number>(8);
  const [expWeight, setExpWeight] = useState<number>(25);
  const [eduWeight, setEduWeight] = useState<number>(10);
  const [projWeight, setProjWeight] = useState<number>(10);
  const [semWeight, setSemWeight] = useState<number>(15);

  const [isGithubActive, setIsGithubActive] = useState<boolean>(true);
  const [coreWeight, setCoreWeight] = useState<number>(85);
  const [githubWeight, setGithubWeight] = useState<number>(15);

  // Confirm Dialog states
  const [showConfirmSave, setShowConfirmSave] = useState<boolean>(false);
  const [showConfirmRecalc, setShowConfirmRecalc] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    const fetchPolicy = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
        const data = await getJobMatchingPolicy(jobId);
        setPolicy(data);
        setReqWeight(Math.round(data.skillRequiredWeight * 100));
        setPrefWeight(Math.round(data.skillPreferredWeight * 100));
        setExpWeight(Math.round(data.experienceWeight * 100));
        setEduWeight(Math.round(data.educationWeight * 100));
        setProjWeight(Math.round(data.projectWeight * 100));
        setSemWeight(Math.round(data.semanticWeight * 100));

        setIsGithubActive(data.isGithubActive ?? true);
        setCoreWeight(Math.round(data.coreWeight * 100));
        setGithubWeight(Math.round(data.githubWeight * 100));
      } catch (err: any) {
        setErrorMsg(err.message || 'Không thể tải cấu hình trọng số.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicy();
  }, [isOpen, jobId]);

  if (!isOpen) return null;

  const coreSum = reqWeight + prefWeight + expWeight + eduWeight + projWeight + semWeight;
  const isCoreSumValid = coreSum === 100;

  const overallSum = isGithubActive ? coreWeight + githubWeight : 100;
  const isOverallSumValid = isGithubActive ? overallSum === 100 : true;

  const canSave = isCoreSumValid && isOverallSumValid && !isSaving;

  const handleApplyPreset = (preset: 'BALANCED' | 'TECH_HEAVY' | 'EXPERIENCE_HEAVY') => {
    if (preset === 'TECH_HEAVY') {
      setReqWeight(45);
      setPrefWeight(10);
      setExpWeight(15);
      setEduWeight(5);
      setProjWeight(10);
      setSemWeight(15);
    } else if (preset === 'EXPERIENCE_HEAVY') {
      setReqWeight(25);
      setPrefWeight(5);
      setExpWeight(40);
      setEduWeight(10);
      setProjWeight(10);
      setSemWeight(10);
    } else {
      // Balanced default
      setReqWeight(32);
      setPrefWeight(8);
      setExpWeight(25);
      setEduWeight(10);
      setProjWeight(10);
      setSemWeight(15);
    }
  };

  const handleSavePolicy = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      await updateJobMatchingPolicy(jobId, {
        skillRequiredWeight: reqWeight / 100,
        skillPreferredWeight: prefWeight / 100,
        experienceWeight: expWeight / 100,
        educationWeight: eduWeight / 100,
        projectWeight: projWeight / 100,
        semanticWeight: semWeight / 100,
        coreWeight: coreWeight / 100,
        githubWeight: githubWeight / 100,
        isGithubActive,
      });

      setSuccessMsg('Đã lưu cấu hình trọng số đối sánh thành công!');
      setShowConfirmSave(false);
      onPolicyUpdated?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      setErrorMsg(null);
      const res = await recalculateJobMatching(jobId);
      setSuccessMsg(`Đã tính toán lại điểm đối sánh cho ${res.recalculatedCount} hồ sơ ứng viên.`);
      setShowConfirmRecalc(false);
      onPolicyUpdated?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tính toán lại điểm matching.');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Cấu hình trọng số đối sánh ứng viên
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Vị trí: <span className="font-semibold text-slate-700 dark:text-slate-200">{jobTitle}</span>
              {policy?.policyVersion && (
                <span className="ml-2 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                  v{policy.policyVersion}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Đang tải cấu hình trọng số...
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {/* Presets */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Gợi ý mẫu cấu hình:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('BALANCED')}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cân bằng
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('TECH_HEAVY')}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Ưu tiên kỹ năng (Tech)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('EXPERIENCE_HEAVY')}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Ưu tiên thâm niên
                </button>
              </div>
            </div>

            {/* Core Criteria Weights */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1. Trọng số 6 tiêu chí cốt lõi (Tổng: {coreSum}%)
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    isCoreSumValid
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {isCoreSumValid ? 'Hợp lệ (100%)' : `Cần điều chỉnh (${coreSum}%)`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Kỹ năng bắt buộc (Required Skills)</span>
                    <span className="font-bold">{reqWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={reqWeight}
                    onChange={(e) => setReqWeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Kỹ năng ưu tiên (Preferred Skills)</span>
                    <span className="font-bold">{prefWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={prefWeight}
                    onChange={(e) => setPrefWeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Kinh nghiệm làm việc (Experience)</span>
                    <span className="font-bold">{expWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={expWeight}
                    onChange={(e) => setExpWeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Học vấn & Bằng cấp (Education)</span>
                    <span className="font-bold">{eduWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={eduWeight}
                    onChange={(e) => setEduWeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Dự án thực tế (Projects)</span>
                    <span className="font-bold">{projWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={projWeight}
                    onChange={(e) => setProjWeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Đối sánh ngữ nghĩa (Semantic AI)</span>
                    <span className="font-bold">{semWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={semWeight}
                    onChange={(e) => setSemWeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* GitHub Assessment Weighting */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enable-github"
                    checked={isGithubActive}
                    onChange={(e) => {
                      setIsGithubActive(e.target.checked);
                      if (!e.target.checked) {
                        setCoreWeight(100);
                        setGithubWeight(0);
                      } else {
                        setCoreWeight(85);
                        setGithubWeight(15);
                      }
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="enable-github" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    2. Bật đánh giá bổ trợ qua GitHub công khai
                  </label>
                </div>
              </div>

              {isGithubActive && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Tỷ trọng Core CV: <strong className="text-slate-900 dark:text-white">{coreWeight}%</strong></span>
                    <span>Tỷ trọng GitHub: <strong className="text-slate-900 dark:text-white">{githubWeight}%</strong></span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={githubWeight}
                    onChange={(e) => {
                      const gh = Number(e.target.value);
                      setGithubWeight(gh);
                      setCoreWeight(100 - gh);
                    }}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    * Nếu ứng viên không cung cấp GitHub, hệ thống tự động áp dụng chính sách Fallback an toàn (Core CV 100%), không gây lạm phát hoặc trừ điểm oan uổng.
                  </p>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                {successMsg}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmRecalc(true)}
                disabled={isRecalculating || isSaving}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition disabled:opacity-50"
              >
                {isRecalculating ? 'Đang tính toán lại...' : '⚡ Tính lại điểm matching tất cả ứng viên'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={!canSave}
                  onClick={() => setShowConfirmSave(true)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Save Policy Dialog */}
        <ConfirmActionDialog
          isOpen={showConfirmSave}
          title="Xác nhận lưu cấu hình trọng số đối sánh"
          description="Việc thay đổi trọng số sẽ tạo phiên bản chính sách mới cho vị trí tuyển dụng này. Kết quả đối sánh của các hồ sơ trước đây sẽ được đối chiếu theo phiên bản tương ứng."
          confirmLabel="Lưu & Áp dụng"
          cancelLabel="Quay lại"
          variant="info"
          isLoading={isSaving}
          onConfirm={handleSavePolicy}
          onCancel={() => setShowConfirmSave(false)}
        />

        {/* Confirm Recalculate Dialog */}
        <ConfirmActionDialog
          isOpen={showConfirmRecalc}
          title="Tính toán lại toàn bộ điểm đối sánh"
          description="Hệ thống sẽ chạy lại giải thuật matching cho toàn bộ hồ sơ ứng tuyển của vị trí này theo chính sách trọng số hiện hành. Hành động này có thể mất vài giây."
          confirmLabel="Bắt đầu tính lại"
          cancelLabel="Hủy bỏ"
          variant="warning"
          isLoading={isRecalculating}
          onConfirm={handleRecalculate}
          onCancel={() => setShowConfirmRecalc(false)}
        />
      </div>
    </div>
  );
};
