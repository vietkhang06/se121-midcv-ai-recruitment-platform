'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MOCK_CANDIDATE } from '@/lib/api';
import { Industry, CandidateProfile } from '@/types';
import { User, Mail, Phone, MapPin, Globe, Briefcase, Award, CheckCircle2, Save, GitBranch } from 'lucide-react';

export default function CandidateProfilePage() {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<CandidateProfile>(MOCK_CANDIDATE);
  const [newSkill, setNewSkill] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skillToRemove) });
  };

  const handleIndustryToggle = (ind: Industry) => {
    const current = profile.additionalIndustries || [];
    if (current.includes(ind)) {
      setProfile({ ...profile, additionalIndustries: current.filter(i => i !== ind) });
    } else {
      setProfile({ ...profile, additionalIndustries: [...current, ind] });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          <User className="w-4 h-4" />
          <span>Candidate Profile Management</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Hồ Sơ Cá Nhân Ứng Viên</h1>
        <p className="text-sm text-slate-400">Quản lý định hướng nghề nghiệp đa ngành, bộ kỹ năng và minh chứng GitHub/Portfolio</p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Hồ sơ cá nhân đã được lưu thành công!</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Personal Details Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Thông tin Cơ bản</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Họ và Tên</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email liên hệ</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tuổi</label>
              <input
                type="number"
                value={profile.age || 24}
                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 24 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Chức danh / Headline</label>
            <input
              type="text"
              value={profile.headline || ''}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Giới thiệu bản thân (Bio)</label>
            <textarea
              rows={3}
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Multi-Industry Target Roles Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Định hướng Nghề nghiệp Đa ngành</h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Ngành nghề Mục tiêu Chính (Primary Industry)</label>
            <select
              value={profile.primaryIndustry}
              onChange={(e) => setProfile({ ...profile, primaryIndustry: e.target.value as Industry })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="Technology">Technology</option>
              <option value="Marketing">Marketing</option>
              <option value="Design">Design</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Các Ngành phụ quan tâm (Additional Target Industries)</label>
            <div className="flex flex-wrap gap-2">
              {(['Technology', 'Marketing', 'Design', 'Finance', 'HR'] as Industry[]).map((ind) => {
                const isSelected = (profile.additionalIndustries || []).includes(ind);
                return (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => handleIndustryToggle(ind)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {ind} {isSelected ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Skills & External Proof Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Bộ Kỹ năng & Minh chứng</h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Kỹ năng Chuyên môn</label>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="Thêm kỹ năng mới (e.g. Java, Spring Boot, GA4, Figma)..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition"
              >
                + Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-lg text-xs bg-slate-950 border border-slate-800 text-slate-200 flex items-center gap-1.5"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-rose-400 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                <span>Đường dẫn GitHub Profile</span>
              </label>
              <input
                type="url"
                value={profile.githubUrl || ''}
                onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                placeholder="https://github.com/username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Trang cá nhân / Portfolio URL</span>
              </label>
              <input
                type="url"
                value={profile.portfolioUrl || ''}
                onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                placeholder="https://myportfolio.dev"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Save CTA */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-500/25 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Hồ Sơ Cá Nhân</span>
          </button>
        </div>
      </form>
    </div>
  );
}
