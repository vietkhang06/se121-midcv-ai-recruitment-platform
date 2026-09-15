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
      className={`inline-flex items-center gap-2.5 font-bold tracking-tight select-none group transition-all duration-200 hover:scale-[1.02] cursor-pointer ${className}`}
      onClick={onClick}
    >
      {showIcon && (
        <div className={`${iconSizes[size]} relative shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-105`}>
          {/* 3D Stacked Cards Icon with Golden Sparkle Star */}
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <linearGradient id="bgCard1" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#A5F3FC" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
              <linearGradient id="bgCard2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
              <linearGradient id="frontCard" x1="10" y1="12" x2="52" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="60%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
              <linearGradient id="starGrad" x1="42" y1="4" x2="58" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="40%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#EAB308" />
              </linearGradient>
              <filter id="starGlow" x="36" y="0" width="28" height="28" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Back Card (Cyan - tilted left) */}
            <rect
              x="6"
              y="18"
              width="36"
              height="38"
              rx="9"
              transform="rotate(-14 6 18)"
              fill="url(#bgCard1)"
              opacity="0.85"
            />

            {/* Middle Card (Sky Blue - tilted slight right) */}
            <rect
              x="12"
              y="12"
              width="36"
              height="38"
              rx="9"
              transform="rotate(6 12 12)"
              fill="url(#bgCard2)"
              opacity="0.9"
            />

            {/* Front Main Card (Deep Royal Blue) */}
            <rect
              x="14"
              y="14"
              width="36"
              height="38"
              rx="9"
              fill="url(#frontCard)"
            />

            {/* Subtle card highlight border */}
            <rect
              x="14.5"
              y="14.5"
              width="35"
              height="37"
              rx="8.5"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1"
            />

            {/* User Avatar Silhouette */}
            {/* Head */}
            <circle cx="32" cy="27" r="4.5" fill="#FFFFFF" />
            {/* Body */}
            <path
              d="M24 43C24 38.5 27.5 35 32 35C36.5 35 40 38.5 40 43"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Golden 4-Pointed Sparkle Star at Top Right */}
            <g filter="url(#starGlow)">
              <path
                d="M50 4C50.5 10 51.5 11.5 56 12C51.5 12.5 50.5 14 50 20C49.5 14 48.5 12.5 44 12C48.5 11.5 49.5 10 50 4Z"
                fill="url(#starGrad)"
              />
              <circle cx="50" cy="12" r="1.5" fill="#FFFFFF" opacity="0.9" />
            </g>
          </svg>
        </div>
      )}

      {/* Brand Text: midCV® with Smooth Theme Transitions */}
      <div className="flex flex-col">
        <span
          className={`font-sans font-extrabold ${sizeClasses[size]} tracking-tight inline-flex items-baseline leading-none`}
        >
          {/* "mid": Navy (#173B73) on Light, Bright White (#F8FAFC) on Dark */}
          <span className="text-[#173B73] dark:text-[#F8FAFC] transition-colors duration-300 ease-in-out">
            mid
          </span>

          {/* "CV": Primary Blue (#2563EB) on Light, Bright Blue (#3B82F6) on Dark */}
          <span className="text-[#2563EB] dark:text-[#3B82F6] transition-colors duration-300 ease-in-out">
            CV
          </span>

          {/* "®": Matching CV color */}
          <sup className="text-[0.52em] font-bold text-[#2563EB] dark:text-[#3B82F6] ml-0.5 -top-1.5 relative transition-colors duration-300 ease-in-out">
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
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
};

