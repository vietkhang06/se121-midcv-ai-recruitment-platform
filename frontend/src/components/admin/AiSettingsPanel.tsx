'use client';

import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Cloud,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
  Zap,
  RotateCcw,
  Save,
  Server,
  Eye,
  EyeOff,
  ShieldAlert,
  Loader2,
  Clock
} from 'lucide-react';
import { AiSettings } from '@/types';
import { fetchAiSettings, updateAiSettings, testAiSettings, ApiError } from '@/lib/api';

const presets = [
  {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    desc: 'Tốc độ cao, chi phí rẻ, bóc tách chính xác.',
  },
  {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    desc: 'Hiệu năng phân tích vượt trội, tối ưu chi phí.',
  },
  {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-1.5-flash',
    desc: 'Tốc độ phản hồi cực nhanh qua OpenAI compatibility.',
  },
  {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    desc: 'Suy luận siêu tốc dựa trên kiến trúc phần cứng LPU.',
  },
];

export function AiSettingsPanel() {
  const [settings, setSettings] = useState<AiSettings>({
    provider: 'LOCAL_OLLAMA',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'dna5rm/granite4.2:3b-8k',
    cloudBaseUrl: 'https://api.openai.com/v1',
    cloudModel: 'gpt-4o-mini',
    embeddingModel: 'bge-m3',
  });
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ healthy: boolean; latencyMs?: number; message?: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetchAiSettings()
      .then((data) => {
        if (active) {
          setSettings(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setLoading(false);
          setMessage({
            type: 'error',
            text: err instanceof ApiError ? err.message : 'Không thể tải cấu hình AI.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Partial<AiSettings> & { cloudApiKey?: string } = {
        provider: settings.provider,
        ollamaUrl: settings.ollamaUrl,
        ollamaModel: settings.ollamaModel,
        cloudBaseUrl: settings.cloudBaseUrl,
        cloudModel: settings.cloudModel,
      };
      if (apiKey.trim()) {
        payload.cloudApiKey = apiKey.trim();
      }
      const updated = await updateAiSettings(payload);
      setSettings(updated);
      setApiKey('');
      setMessage({ type: 'success', text: 'Đã lưu cấu hình AI thành công.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Lỗi khi lưu cấu hình AI.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setMessage(null);
    try {
      const res = await testAiSettings({
        provider: settings.provider,
        ollamaUrl: settings.ollamaUrl,
        ollamaModel: settings.ollamaModel,
        cloudBaseUrl: settings.cloudBaseUrl,
        cloudModel: settings.cloudModel,
        cloudApiKey: apiKey.trim(),
      });
      setTestResult({
        healthy: res.healthy,
        latencyMs: res.latencyMs,
        message: res.message || (res.healthy ? 'Kết nối thành công.' : res.error || 'Kiểm tra thất bại.'),
      });
    } catch (err) {
      setTestResult({
        healthy: false,
        message: err instanceof ApiError ? err.message : 'Không thể kết nối đến máy chủ AI.',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-3 text-blue-500" />
        <span>Đang tải thông số cấu hình AI...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Provider Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Ollama Card */}
        <div
          onClick={() => setSettings({ ...settings, provider: 'LOCAL_OLLAMA' })}
          className={`cursor-pointer p-5 rounded-2xl border transition-all relative overflow-hidden ${
            settings.provider === 'LOCAL_OLLAMA'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-md ring-2 ring-blue-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38] hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  settings.provider === 'LOCAL_OLLAMA'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Local Ollama</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    Offline / Zero-Cost
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  dna5rm/granite4.2:3b-8k & bge-m3 1024d
                </p>
              </div>
            </div>
            {settings.provider === 'LOCAL_OLLAMA' && (
              <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
            Chạy hoàn toàn cục bộ trên máy chủ qua cổng 11434. Bảo mật dữ liệu 100%, không cần kết nối internet hay chi phí token.
          </p>
        </div>

        {/* Cloud OpenAI Compatible Card */}
        <div
          onClick={() => setSettings({ ...settings, provider: 'CLOUD_OPENAI_COMPATIBLE' })}
          className={`cursor-pointer p-5 rounded-2xl border transition-all relative overflow-hidden ${
            settings.provider === 'CLOUD_OPENAI_COMPATIBLE'
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38] hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  settings.provider === 'CLOUD_OPENAI_COMPATIBLE'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Cloud AI (OpenAI Compatible)</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    High Accuracy
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  OpenAI, DeepSeek, Google Gemini, Groq
                </p>
              </div>
            </div>
            {settings.provider === 'CLOUD_OPENAI_COMPATIBLE' && (
              <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
            Kết nối API đám mây tương thích chuẩn OpenAI. Cho tốc độ bóc tách nhanh và độ chính xác tối ưu trong các hồ sơ phức tạp.
          </p>
        </div>
      </div>

      {/* Configuration Details Box */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38] space-y-6">
        {settings.provider === 'LOCAL_OLLAMA' ? (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-500" />
              <span>Tham số máy chủ Ollama cục bộ</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ollama Base URL
                </label>
                <input
                  type="text"
                  value={settings.ollamaUrl}
                  onChange={(e) => setSettings({ ...settings, ollamaUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  LLM Model Name
                </label>
                <input
                  type="text"
                  value={settings.ollamaModel}
                  onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                  placeholder="dna5rm/granite4.2:3b-8k"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                Mô hình trích xuất khuyến nghị: <strong>dna5rm/granite4.2:3b-8k</strong> với ngữ cảnh 8,192 tokens.
                Mô hình embedding ngữ nghĩa cục bộ: <strong>bge-m3</strong> (1024 chiều) với HNSW vector index.
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-indigo-500" />
              <span>Thiết lập API Cloud OpenAI-Compatible</span>
            </h4>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Chọn nhà cung cấp mẫu (Presets)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {presets.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        cloudBaseUrl: p.baseUrl,
                        cloudModel: p.model,
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.cloudBaseUrl === p.baseUrl && settings.cloudModel === p.model
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{p.model}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Cloud Base URL
                </label>
                <input
                  type="text"
                  value={settings.cloudBaseUrl}
                  onChange={(e) => setSettings({ ...settings, cloudBaseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Model Name
                </label>
                <input
                  type="text"
                  value={settings.cloudModel}
                  onChange={(e) => setSettings({ ...settings, cloudModel: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Cloud API Key</span>
                {settings.hasCloudApiKey && (
                  <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                    Đã lưu key: {settings.cloudApiKeyMasked}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings.hasCloudApiKey ? 'Nhập key mới nếu muốn thay đổi' : 'sk-...'}
                  className="w-full pl-3.5 pr-10 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Result Indicator */}
        {testResult && (
          <div
            className={`p-4 rounded-xl flex items-start gap-3 text-xs transition-all ${
              testResult.healthy
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {testResult.healthy ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>{testResult.healthy ? 'Kết nối AI hoạt động tốt' : 'Lỗi kết nối AI'}</span>
                {testResult.latencyMs != null && (
                  <span className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    <Clock className="w-3 h-3" />
                    {testResult.latencyMs}ms
                  </span>
                )}
              </div>
              <p className="leading-relaxed">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || saving}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition flex items-center gap-2 disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Đang kiểm tra kết nối...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Kiểm tra kết nối (Test)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || testing}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu cấu hình hệ thống</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
