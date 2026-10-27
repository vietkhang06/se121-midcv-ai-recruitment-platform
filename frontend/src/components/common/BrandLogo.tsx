'use client';

import React from 'react';
import Link from 'next/link';

interface BrandLogoProps {
  href?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  tagline?: string;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  href = '/',
  size = 'md',
  showIcon = true,
  tagline,
  className = '',
  onClick,
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  const content = (
    <div
      data-retro-brand="true"
      className={`inline-flex items-center gap-2.5 font-bold tracking-tight select-none group transition-all duration-200 hover:scale-[1.02] cursor-pointer ${className}`}
      onClick={onClick}
    >
      {showIcon && (
        <div className={`${iconSizes[size]} relative shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-105`}>
          <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className="w-full h-full">
            <rect x="7" y="7" width="27" height="29" rx="7" fill="var(--studio-butter)" stroke="var(--retro-deep)" strokeWidth="1.5" />
            <rect x="3" y="3" width="27" height="29" rx="7" fill="var(--retro-mint)" stroke="var(--retro-deep)" strokeWidth="1.5" />
            <path d="M10 12h13M10 18h13M10 24h8" stroke="var(--retro-blue)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Brand Text: midCV® with Smooth Theme Transitions */}
      <div className="flex flex-col">
        <span
          className={`font-sans font-extrabold ${sizeClasses[size]} tracking-[-0.045em] inline-flex items-baseline leading-none`}
        >
          {/* "mid": Navy (var(--heading)) on Light, Bright White (var(--retro-cream)) on Dark */}
          <span className="text-[var(--heading)] dark:text-[var(--retro-cream)] transition-colors duration-300 ease-in-out">
            mid
          </span>

          {/* "CV": Primary Blue (var(--primary)) on Light, Bright Blue (var(--primary)) on Dark */}
          <span className="text-[var(--primary)] dark:text-[var(--retro-sky)] transition-colors duration-300 ease-in-out">
            CV
          </span>

          {/* "®": Matching CV color */}
          <sup className="text-[0.52em] font-bold text-[var(--primary)] dark:text-[var(--retro-sky)] ml-0.5 -top-1.5 relative transition-colors duration-300 ease-in-out">
            ®
          </sup>
        </span>

        {tagline && (
          <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-normal tracking-tight mt-0.5 block leading-tight transition-colors duration-300">
            {tagline}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)] rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
};

