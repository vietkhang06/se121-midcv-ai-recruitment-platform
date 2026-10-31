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

  const noWrapStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    overflowWrap: 'normal',
    wordBreak: 'normal',
    flexShrink: 0,
  };

  const content = (
    <div
      data-retro-brand="true"
      className={`inline-flex shrink-0 items-center gap-2.5 font-bold tracking-tight select-none group transition-all duration-200 hover:scale-[1.02] cursor-pointer ${className}`}
      onClick={onClick}
    >
      {showIcon && (
        <div
          className={`${iconSizes[size]} relative shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-105`}
        >
          <svg
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className="h-full w-full"
          >
            <rect
              x="7"
              y="7"
              width="27"
              height="29"
              rx="7"
              fill="var(--studio-butter, #F7E7BD)"
              stroke="var(--retro-deep, #274256)"
              strokeWidth="1.5"
            />
            <rect
              x="3"
              y="3"
              width="27"
              height="29"
              rx="7"
              fill="var(--retro-mint, #C8DFDB)"
              stroke="var(--retro-deep, #274256)"
              strokeWidth="1.5"
            />
            <path
              d="M10 12h13M10 18h13M10 24h8"
              stroke="var(--retro-blue, #3368A0)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      <div className="flex shrink-0 flex-col">
        <span
          className={`inline-flex shrink-0 flex-nowrap items-baseline whitespace-nowrap font-sans font-extrabold ${sizeClasses[size]} tracking-[-0.045em] leading-none`}
          style={{
            ...noWrapStyle,
            width: 'max-content',
            maxWidth: 'none',
          }}
        >
          <span
            className="shrink-0 whitespace-nowrap text-[var(--heading)] dark:text-[var(--retro-cream)] transition-colors duration-300 ease-in-out"
            style={noWrapStyle}
          >
            mid
          </span>
          <span
            className="shrink-0 whitespace-nowrap text-[var(--primary)] dark:text-[var(--retro-sky)] transition-colors duration-300 ease-in-out"
            style={noWrapStyle}
          >
            CV
          </span>
          <sup
            className="relative -top-1.5 ml-0.5 shrink-0 text-[0.52em] font-bold text-[var(--primary)] dark:text-[var(--retro-sky)] transition-colors duration-300 ease-in-out"
            style={noWrapStyle}
          >
            ®
          </sup>
        </span>

        {tagline && (
          <span className="mt-0.5 block text-[9px] sm:text-[10px] font-normal tracking-tight leading-tight text-slate-500 dark:text-slate-400 transition-colors duration-300">
            {tagline}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]"
      >
        {content}
      </Link>
    );
  }

  return content;
};