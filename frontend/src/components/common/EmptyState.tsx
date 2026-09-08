'use client';

import React from 'react';
import Link from 'next/link';
import {
  Inbox,
  FilterX,
  AlertCircle,
  Loader2,
  FolderPlus,
  Briefcase,
  Users,
  FileQuestion,
  RotateCcw
} from 'lucide-react';

export type EmptyStateType = 'EMPTY' | 'NO_MATCH' | 'ERROR' | 'LOADING';

export interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: React.ReactNode;
  title: string;
  description: string;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  onPrimaryCtaClick?: () => void;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  onSecondaryCtaClick?: () => void;
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'EMPTY',
  icon,
  title,
  description,
  primaryCtaText,
  primaryCtaHref,
  onPrimaryCtaClick,
  secondaryCtaText,
  secondaryCtaHref,
  onSecondaryCtaClick,
  className = '',
  compact = false
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'NO_MATCH':
        return <FilterX className="w-8 h-8 text-amber-600 dark:text-amber-400" />;
      case 'ERROR':
        return <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />;
      case 'LOADING':
        return <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />;
      case 'EMPTY':
      default:
        return <Inbox className="w-8 h-8 text-slate-400 dark:text-slate-500" />;
    }
  };

  const getContainerBg = () => {
    switch (type) {
      case 'NO_MATCH':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40';
      case 'ERROR':
        return 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40';
      case 'LOADING':
        return 'bg-white dark:bg-[#0E241E] border-slate-200 dark:border-[#1B3D34]';
      case 'EMPTY':
      default:
        return 'bg-white dark:bg-[#0E241E] border-slate-200 dark:border-[#1B3D34]';
    }
  };

  const getIconBadgeBg = () => {
    switch (type) {
      case 'NO_MATCH':
        return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
      case 'ERROR':
        return 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300';
      case 'LOADING':
        return 'bg-emerald-50 dark:bg-[#133E34] text-emerald-600 dark:text-emerald-300';
      case 'EMPTY':
      default:
        return 'bg-slate-100 dark:bg-[#14332B] text-slate-500 dark:text-slate-400';
    }
  };

  return (
    <div
      data-testid={`empty-state-${type.toLowerCase()}`}
      className={`rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
        compact ? 'p-6 sm:p-8 space-y-3' : 'py-16 px-6 sm:px-12 space-y-4'
      } ${getContainerBg()} ${className}`}
    >
      <div className={`rounded-2xl p-4 flex items-center justify-center shadow-xs ${getIconBadgeBg()}`}>
        {icon || getDefaultIcon()}
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-base sm:text-lg font-bold font-editorial text-slate-900 dark:text-white tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
          {description}
        </p>
      </div>

      {(primaryCtaText || secondaryCtaText) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {primaryCtaText && (
            primaryCtaHref ? (
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#040D0A] transition shadow-xs cursor-pointer active:scale-95"
              >
                <span>{primaryCtaText}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onPrimaryCtaClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#040D0A] transition shadow-xs cursor-pointer active:scale-95"
              >
                <span>{primaryCtaText}</span>
              </button>
            )
          )}

          {secondaryCtaText && (
            secondaryCtaHref ? (
              <Link
                href={secondaryCtaHref}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1B3D34] hover:bg-slate-100 dark:hover:bg-[#14332B] transition cursor-pointer"
              >
                <span>{secondaryCtaText}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSecondaryCtaClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1B3D34] hover:bg-slate-100 dark:hover:bg-[#14332B] transition cursor-pointer"
              >
                <span>{secondaryCtaText}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
