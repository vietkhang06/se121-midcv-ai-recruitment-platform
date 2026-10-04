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
    <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] pb-5 mb-6 space-y-3">
      {backLink && (
        <Link
          href={backLink.href}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>{backLink.label}</span>
        </Link>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {categoryTag && (
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#3B82F6] bg-[#EFF6FF] dark:bg-[#152342] px-2 py-0.5 rounded-md border border-[#2563EB]/20">
                {categoryTag}
              </span>
            )}

            {companyName && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E3A5F] dark:text-[#D6E4E1] bg-[#F8FAFC] dark:bg-[#111C38] px-2 py-0.5 rounded-md border border-[#E2E8F0] dark:border-[#1E293B]">
                {isCompanyVerified ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00B14F]" />
                ) : null}
                <span>{companyName}</span>
                {isCompanyVerified && (
                  <span className="text-[10px] text-[#00B14F] font-bold">✓ Xác minh</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 rounded-xl bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] border border-[#2563EB]/20 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-[#0F2A52] dark:text-white tracking-tight">
              {title}
            </h1>
          </div>

          {subtitle && (
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed max-w-3xl">
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
