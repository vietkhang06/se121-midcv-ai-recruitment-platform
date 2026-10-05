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
    bg: 'bg-white dark:bg-[#111C38]',
    border: 'border-[#E2E8F0] dark:border-[#1E293B]',
    iconBg: 'bg-[#EFF6FF] dark:bg-[#152342]',
    iconColor: 'text-[#2563EB] dark:text-[#3B82F6]',
    valueColor: 'text-[#0F2A52] dark:text-white',
  },
  success: {
    bg: 'bg-white dark:bg-[#111C38]',
    border: 'border-[#E2E8F0] dark:border-[#1E293B]',
    iconBg: 'bg-[#E8F8EE] dark:bg-[#00B14F]/15',
    iconColor: 'text-[#00B14F] dark:text-[#10B981]',
    valueColor: 'text-[#0F2A52] dark:text-white',
  },
  warning: {
    bg: 'bg-white dark:bg-[#111C38]',
    border: 'border-[#E2E8F0] dark:border-[#1E293B]',
    iconBg: 'bg-[#FEF3C7] dark:bg-[#FACC15]/15',
    iconColor: 'text-[#F59E0B] dark:text-[#FACC15]',
    valueColor: 'text-[#0F2A52] dark:text-white',
  },
  neutral: {
    bg: 'bg-white dark:bg-[#111C38]',
    border: 'border-[#E2E8F0] dark:border-[#1E293B]',
    iconBg: 'bg-[#F8FAFC] dark:bg-[#13233F]',
    iconColor: 'text-[#64748B] dark:text-[#94A3B8]',
    valueColor: 'text-[#0F2A52] dark:text-white',
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
      <div className={`p-5 rounded-2xl border ${styles.border} ${styles.bg} shadow-xs animate-pulse space-y-3 min-w-0 w-full`}>
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
      className={`p-5 rounded-2xl border ${styles.border} ${styles.bg} shadow-xs text-left transition-all min-w-0 w-full ${
        onClick
          ? 'cursor-pointer hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-md active:scale-[0.99]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] block truncate">
          {label}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
            className={`inline-flex items-center gap-0.5 text-xs font-semibold font-mono ${
              trend.isPositive
                ? 'text-[#00B14F] dark:text-[#10B981]'
                : 'text-[#EF4444] dark:text-[#F87171]'
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
        <p className="text-[11px] text-[#94A3B8] dark:text-[#64748B] leading-tight truncate">
          {subtext}
        </p>
      )}
    </Component>
  );
};
