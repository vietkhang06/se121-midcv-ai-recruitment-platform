'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, LucideIcon } from 'lucide-react';

export interface RecruiterPageHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  categoryTag?: string;
  icon?: LucideIcon;
  backLink?: {
    href: string;
    label: string;
  };
  actions?: React.ReactNode;
  companyName?: string;
  isCompanyVerified?: boolean;
}

export const RecruiterPageHeader: React.FC<RecruiterPageHeaderProps> = ({
  title,
  subtitle,
  categoryTag,
  icon: Icon,
  backLink,
  actions,
  companyName,
  isCompanyVerified,
}) => {
  return (
    <div className="border-b border-[var(--border-soft)] dark:border-[var(--border)] pb-5 mb-6 space-y-3">
      {backLink && (
        <Link
          href={backLink.href}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--primary)] dark:hover:text-[var(--retro-sky)] transition group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>{backLink.label}</span>
        </Link>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {categoryTag && (
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[var(--primary)] dark:text-[var(--retro-sky)] bg-[var(--surface-secondary)] dark:bg-[var(--surface)] px-2 py-0.5 rounded-xl border border-[var(--border)]/20">
                {categoryTag}
              </span>
            )}

            {companyName && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--heading)] dark:text-[var(--text-secondary)] bg-[var(--surface)] dark:bg-[var(--surface)] px-2 py-0.5 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)]">
                {isCompanyVerified ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
                ) : null}
                <span>{companyName}</span>
                {isCompanyVerified && (
                  <span className="text-[10px] text-[var(--success)] font-bold">✓ Xác minh</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] border border-[var(--border)]/20 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-[var(--heading)] dark:text-white tracking-tight">
              {title}
            </h1>
          </div>

          {subtitle && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
