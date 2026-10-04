'use client';

import React from 'react';
import { Check, Dot } from 'lucide-react';

interface PasswordStrengthBarProps {
  password: string;
  locale: string;
}

export function evaluatePasswordStrength(pwd: string): {
  score: number;
  hasLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
} {
  const hasLength = pwd.length >= 8;
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  if (!pwd) {
    return { score: 0, hasLength: false, hasLower: false, hasUpper: false, hasNumber: false, hasSpecial: false };
  }

  let criteriaCount = 0;
  if (hasLength) criteriaCount++;
  if (hasLower && hasUpper) criteriaCount++;
  if (hasNumber) criteriaCount++;
  if (hasSpecial) criteriaCount++;

  // score from 1 to 4
  const score = Math.max(1, criteriaCount);

  return {
    score,
    hasLength,
    hasLower,
    hasUpper,
    hasNumber,
    hasSpecial,
  };
}

export function PasswordStrengthBar({ password, locale }: PasswordStrengthBarProps) {
  if (!password) return null;

  const isVi = locale === 'vi';
  const { score, hasLength, hasLower, hasUpper, hasNumber, hasSpecial } = evaluatePasswordStrength(password);

  const getLabelAndColor = () => {
    switch (score) {
      case 1:
        return {
          label: isVi ? 'Yếu' : 'Weak',
          textColor: 'text-rose-500 dark:text-rose-400',
          barColor: 'bg-rose-500',
        };
      case 2:
        return {
          label: isVi ? 'Trung bình' : 'Fair',
          textColor: 'text-amber-500 dark:text-amber-400',
          barColor: 'bg-amber-500',
        };
      case 3:
        return {
          label: isVi ? 'Khá' : 'Good',
          textColor: 'text-blue-500 dark:text-blue-400',
          barColor: 'bg-blue-500',
        };
      case 4:
      default:
        return {
          label: isVi ? 'Mạnh' : 'Strong',
          textColor: 'text-emerald-500 dark:text-emerald-400',
          barColor: 'bg-emerald-500',
        };
    }
  };

  const { label, textColor, barColor } = getLabelAndColor();

  return (
    <div className="space-y-1.5 pt-1 select-none" data-testid="password-strength-container">
      {/* Label and Level */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          {isVi ? 'Độ mạnh mật khẩu:' : 'Password strength:'}
        </span>
        <span className={`font-bold transition-colors ${textColor}`} data-testid="password-strength-label">
          {label}
        </span>
      </div>

      {/* 4-Segment Progress Bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => {
          const isActive = score >= step;
          return (
            <div
              key={step}
              className={`h-full rounded-full transition-all duration-300 ${
                isActive ? barColor : 'bg-slate-200 dark:bg-slate-700/80'
              }`}
            />
          );
        })}
      </div>

      {/* Requirement Hints */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
        <div className={`flex items-center gap-1 ${hasLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
          {hasLength ? <Check className="w-3 h-3 shrink-0" /> : <Dot className="w-3 h-3 shrink-0" />}
          <span>{isVi ? 'Tối thiểu 8 ký tự' : '8+ characters'}</span>
        </div>
        <div className={`flex items-center gap-1 ${hasUpper && hasLower ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
          {hasUpper && hasLower ? <Check className="w-3 h-3 shrink-0" /> : <Dot className="w-3 h-3 shrink-0" />}
          <span>{isVi ? 'Chữ hoa & thường' : 'Upper & lowercase'}</span>
        </div>
        <div className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
          {hasNumber ? <Check className="w-3 h-3 shrink-0" /> : <Dot className="w-3 h-3 shrink-0" />}
          <span>{isVi ? 'Có chữ số (0-9)' : 'Number (0-9)'}</span>
        </div>
        <div className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
          {hasSpecial ? <Check className="w-3 h-3 shrink-0" /> : <Dot className="w-3 h-3 shrink-0" />}
          <span>{isVi ? 'Ký tự đặc biệt (!@#$)' : 'Symbol (!@#$)'}</span>
        </div>
      </div>
    </div>
  );
}
