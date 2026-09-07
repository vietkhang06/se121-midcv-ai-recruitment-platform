'use client';

import React, { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export type StrengthLevel = 'VERY_WEAK' | 'WEAK' | 'FAIR' | 'GOOD' | 'STRONG';

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { t } = useLanguage();

  const assessment = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        level: 'VERY_WEAK' as StrengthLevel,
        checks: {
          length: false,
          hasUpper: false,
          hasLower: false,
          hasNumber: false,
          hasSpecial: false,
          notCommon: true
        }
      };
    }

    const length = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    // Common weak patterns penalty
    const lowerPass = password.toLowerCase();
    const commonPatterns = ['password', '12345678', 'admin123', 'qwerty', 'abcdefgh', 'letmein'];
    const hasCommonPattern = commonPatterns.some(p => lowerPass.includes(p));

    let score = 0;
    if (length) score += 1;
    if (hasUpper) score += 1;
    if (hasLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;
    if (hasCommonPattern) score = Math.max(0, score - 2);

    let level: StrengthLevel = 'VERY_WEAK';
    if (score <= 1) level = 'VERY_WEAK';
    else if (score === 2) level = 'WEAK';
    else if (score === 3) level = 'FAIR';
    else if (score === 4) level = 'GOOD';
    else if (score >= 5) level = 'STRONG';

    return {
      score,
      level,
      checks: {
        length,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial,
        notCommon: !hasCommonPattern
      }
    };
  }, [password]);

  const levelColor = {
    VERY_WEAK: 'bg-rose-500 text-rose-600 dark:text-rose-400',
    WEAK: 'bg-orange-500 text-orange-600 dark:text-orange-400',
    FAIR: 'bg-amber-500 text-amber-600 dark:text-amber-400',
    GOOD: 'bg-teal-500 text-teal-600 dark:text-teal-400',
    STRONG: 'bg-emerald-600 text-emerald-700 dark:text-emerald-400',
  }[assessment.level];

  const levelLabel = {
    VERY_WEAK: t('auth.veryWeak', 'Very Weak'),
    WEAK: t('auth.weak', 'Weak'),
    FAIR: t('auth.fair', 'Fair'),
    GOOD: t('auth.good', 'Good'),
    STRONG: t('auth.strong', 'Strong'),
  }[assessment.level];

  const barWidth = {
    VERY_WEAK: '20%',
    WEAK: '40%',
    FAIR: '60%',
    GOOD: '80%',
    STRONG: '100%',
  }[assessment.level];

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-400">
          {t('auth.passwordStrengthLabel', 'Password strength')}
        </span>
        <span className={`font-bold uppercase tracking-wider ${levelColor.split(' ')[1]}`}>
          {levelLabel}
        </span>
      </div>

      {/* Strength Progress Bar */}
      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${levelColor.split(' ')[0]}`}
          style={{ width: password ? barWidth : '0%' }}
        />
      </div>

      {/* Requirement Criteria Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          {assessment.checks.length ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <span className={assessment.checks.length ? 'text-slate-800 dark:text-slate-200 font-medium' : ''}>
            {t('auth.criteriaLength', 'At least 8 characters')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {assessment.checks.hasUpper ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <span className={assessment.checks.hasUpper ? 'text-slate-800 dark:text-slate-200 font-medium' : ''}>
            {t('auth.criteriaUpper', 'Uppercase letter')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {assessment.checks.hasLower ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <span className={assessment.checks.hasLower ? 'text-slate-800 dark:text-slate-200 font-medium' : ''}>
            {t('auth.criteriaLower', 'Lowercase letter')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {assessment.checks.hasNumber ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <span className={assessment.checks.hasNumber ? 'text-slate-800 dark:text-slate-200 font-medium' : ''}>
            {t('auth.criteriaNumber', 'At least one number')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {assessment.checks.hasSpecial ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <span className={assessment.checks.hasSpecial ? 'text-slate-800 dark:text-slate-200 font-medium' : ''}>
            {t('auth.criteriaSpecial', 'Special character')}
          </span>
        </div>
      </div>
    </div>
  );
};
