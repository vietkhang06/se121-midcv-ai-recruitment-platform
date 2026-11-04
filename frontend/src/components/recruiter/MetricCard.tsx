'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'neutral';
  badge?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  loading?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  primary: {
    bg: 'bg-white dark:bg-[var(--surface)]',
    border: 'border-[var(--border-soft)] dark:border-[var(--border)]',
    iconBg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface)]',
    iconColor: 'text-[var(--primary)] dark:text-[var(--retro-sky)]',
    valueColor: 'text-[var(--heading)] dark:text-white',
  },
  success: {
    bg: 'bg-white dark:bg-[var(--surface)]',
    border: 'border-[var(--border-soft)] dark:border-[var(--border)]',
    iconBg: 'bg-[var(--surface-secondary)] dark:bg-[var(--success)]/15',
    iconColor: 'text-[var(--success)] dark:text-[var(--success)]',
    valueColor: 'text-[var(--heading)] dark:text-white',
  },
  warning: {
    bg: 'bg-white dark:bg-[var(--surface)]',
    border: 'border-[var(--border-soft)] dark:border-[var(--border)]',
    iconBg: 'bg-[var(--surface-secondary)] dark:bg-[var(--warning)]/15',
    iconColor: 'text-[var(--warning)] dark:text-[var(--warning)]',
    valueColor: 'text-[var(--heading)] dark:text-white',
  },
  neutral: {
    bg: 'bg-white dark:bg-[var(--surface)]',
    border: 'border-[var(--border-soft)] dark:border-[var(--border)]',
    iconBg: 'bg-[var(--surface)] dark:bg-[var(--surface)]',
    iconColor: 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)]',
    valueColor: 'text-[var(--heading)] dark:text-white',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'primary',
  badge,
  trend,
  loading = false,
  onClick,
}) => {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <div className={`p-5 rounded-xl border ${styles.border} ${styles.bg} shadow-xs animate-pulse space-y-3 min-w-0 w-full`}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
        <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`p-5 rounded-xl border ${styles.border} ${styles.bg} shadow-xs text-left transition-all min-w-0 w-full ${
        onClick
          ? 'cursor-pointer hover:border-[var(--border)] dark:hover:border-[var(--border)] hover:shadow-md active:scale-[0.99]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block truncate">
          {label}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {badge}
            </span>
          )}
          <div className={`p-2 rounded-xl ${styles.iconBg} ${styles.iconColor} shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-2xl sm:text-3xl font-editorial font-bold ${styles.valueColor} tracking-tight`}>
          {value}
        </span>

        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold font-sans ${
              trend.isPositive
                ? 'text-[var(--success)] dark:text-[var(--success)]'
                : 'text-[var(--danger)] dark:text-[var(--danger)]'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{trend.value}</span>
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-tight truncate">
          {subtext}
        </p>
      )}
    </Component>
  );
};
