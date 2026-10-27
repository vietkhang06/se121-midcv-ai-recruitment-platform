'use client';

import React from 'react';

/**
 * Bespoke SVG Illustration System
 * Non-generic, editorial, clean vectors designed specifically for AI Recruitment Matching Platform.
 */

export const HeroIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-auto max-w-lg' }) => (
  <svg
    viewBox="0 0 600 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="gridGrad" x1="0" y1="0" x2="600" y2="400" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--primary)" stopOpacity="0.15" />
        <stop offset="0.5" stopColor="var(--primary)" stopOpacity="0.1" />
        <stop offset="1" stopColor="var(--heading)" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="glowLine" x1="100" y1="200" x2="500" y2="200" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--primary)" />
        <stop offset="0.5" stopColor="var(--primary)" />
        <stop offset="1" stopColor="var(--success)" />
      </linearGradient>
      <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
        <stop stopColor="var(--primary)" stopOpacity="0.4" />
        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Subtle Architectural Grid */}
    <rect width="600" height="400" rx="24" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1" />
    <path d="M50 80 H550 M50 160 H550 M50 240 H550 M50 320 H550" stroke="var(--heading)" strokeWidth="1" strokeDasharray="4 4" />
    <path d="M120 40 V360 M240 40 V360 M360 40 V360 M480 40 V360" stroke="var(--heading)" strokeWidth="1" strokeDasharray="4 4" />

    {/* Left Node: Candidate CV Embedding Vector */}
    <rect x="70" y="110" width="160" height="180" rx="16" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    <rect x="90" y="130" width="80" height="12" rx="4" fill="var(--primary)" fillOpacity="0.8" />
    <rect x="90" y="152" width="120" height="6" rx="3" fill="var(--text-primary)" />
    <rect x="90" y="166" width="100" height="6" rx="3" fill="var(--text-primary)" />
    <rect x="90" y="180" width="110" height="6" rx="3" fill="var(--text-primary)" />
    <rect x="90" y="202" width="50" height="18" rx="6" fill="var(--primary)" fillOpacity="0.5" stroke="var(--primary)" strokeWidth="1" />
    <text x="115" y="215" fill="var(--primary)" fontSize="9" fontWeight="600" textAnchor="middle">Java 21</text>
    <rect x="148" y="202" width="62" height="18" rx="6" fill="var(--heading)" stroke="var(--primary)" strokeWidth="1" />
    <text x="179" y="215" fill="var(--primary)" fontSize="9" fontWeight="600" textAnchor="middle">PostgreSQL</text>
    <rect x="90" y="230" width="120" height="36" rx="8" fill="var(--heading)" stroke="var(--heading)" />
    <text x="100" y="246" fill="var(--text-secondary)" fontSize="8" fontFamily="monospace">Vector (1536D):</text>
    <text x="100" y="258" fill="var(--primary)" fontSize="8" fontFamily="monospace">[0.082, -0.41, 0.92...]</text>

    {/* Right Node: Job Description (JD) Target */}
    <rect x="370" y="110" width="160" height="180" rx="16" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    <rect x="390" y="130" width="90" height="12" rx="4" fill="var(--primary)" fillOpacity="0.8" />
    <rect x="390" y="152" width="120" height="6" rx="3" fill="var(--text-primary)" />
    <rect x="390" y="166" width="110" height="6" rx="3" fill="var(--text-primary)" />
    <rect x="390" y="180" width="95" height="6" rx="3" fill="var(--text-primary)" />
    <rect x="390" y="202" width="60" height="18" rx="6" fill="var(--heading)" stroke="var(--success)" strokeWidth="1" />
    <text x="420" y="215" fill="var(--success)" fontSize="9" fontWeight="600" textAnchor="middle">Required</text>
    <rect x="458" y="202" width="52" height="18" rx="6" fill="var(--heading)" stroke="var(--primary)" strokeWidth="1" />
    <text x="484" y="215" fill="var(--primary)" fontSize="9" fontWeight="600" textAnchor="middle">Preferred</text>
    <rect x="390" y="230" width="120" height="36" rx="8" fill="var(--heading)" stroke="var(--heading)" />
    <text x="400" y="246" fill="var(--text-secondary)" fontSize="8" fontFamily="monospace">Target Vector:</text>
    <text x="400" y="258" fill="var(--success)" fontSize="8" fontFamily="monospace">[0.079, -0.39, 0.89...]</text>

    {/* Vector Match Connecting Ray */}
    <path d="M230 200 C 270 200, 330 200, 370 200" stroke="url(#glowLine)" strokeWidth="3" />
    <circle cx="300" cy="200" r="32" fill="url(#nodeGlow)" />
    <circle cx="300" cy="200" r="24" fill="var(--heading)" stroke="var(--primary)" strokeWidth="2" />
    <text x="300" y="196" fill="var(--retro-cream)" fontSize="10" fontWeight="bold" textAnchor="middle">Cosine</text>
    <text x="300" y="212" fill="var(--primary)" fontSize="11" fontWeight="bold" textAnchor="middle">90.5%</text>

    {/* Metric Chips */}
    <g transform="translate(180, 310)">
      <rect width="240" height="34" rx="10" fill="var(--heading)" stroke="var(--heading)" />
      <circle cx="20" cy="17" r="4" fill="var(--success)" />
      <text x="32" y="21" fill="var(--text-secondary)" fontSize="10">85% Core JD-CV + 15% GitHub Evidence</text>
    </g>
  </svg>
);

export const CandidateOnboardingIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="60" cy="60" r="56" fill="var(--heading)" stroke="var(--heading)" strokeWidth="2" />
    <rect x="36" y="30" width="48" height="60" rx="8" fill="var(--heading)" stroke="var(--primary)" strokeWidth="1.5" />
    <circle cx="60" cy="46" r="8" fill="var(--primary)" fillOpacity="0.2" stroke="var(--primary)" strokeWidth="1.5" />
    <path d="M48 64 C48 58, 72 58, 72 64" stroke="var(--primary)" strokeWidth="1.5" />
    <rect x="44" y="70" width="32" height="4" rx="2" fill="var(--text-primary)" />
    <rect x="48" y="78" width="24" height="4" rx="2" fill="var(--primary)" />
  </svg>
);

export const CompanyVerificationIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="60" cy="60" r="56" fill="var(--heading)" stroke="var(--heading)" strokeWidth="2" />
    <path
      d="M60 26 L86 38 V62 C86 78 74 91 60 96 C46 91 34 78 34 62 V38 L60 26 Z"
      fill="var(--heading)"
      fillOpacity="0.5"
      stroke="var(--success)"
      strokeWidth="2"
    />
    <path d="M48 60 L56 68 L74 48" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EmptyJobsIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="60" cy="60" r="56" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    <rect x="35" y="35" width="50" height="50" rx="8" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    <path d="M45 50 H75 M45 60 H65 M45 70 H70" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="76" cy="76" r="14" fill="var(--heading)" stroke="var(--primary)" strokeWidth="2" />
    <line x1="86" y1="86" x2="96" y2="96" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const EmptyCVIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="60" cy="60" r="56" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    <rect x="38" y="32" width="44" height="56" rx="6" fill="var(--heading)" stroke="var(--primary)" strokeWidth="1.5" />
    <rect x="46" y="42" width="28" height="4" rx="2" fill="var(--primary)" />
    <rect x="46" y="50" width="20" height="4" rx="2" fill="var(--text-primary)" />
    <rect x="46" y="58" width="24" height="4" rx="2" fill="var(--text-primary)" />
    <circle cx="74" cy="76" r="12" fill="var(--primary)" />
    <path d="M74 70 V82 M68 76 H80" stroke="var(--retro-cream)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const EmptyApplicationsIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="60" cy="60" r="56" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    <path d="M30 42 L60 62 L90 42 L60 28 Z" fill="var(--heading)" stroke="var(--primary)" strokeWidth="1.5" />
    <path d="M30 46 V76 L60 94 L90 76 V46 L60 64 Z" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    <line x1="60" y1="64" x2="60" y2="94" stroke="var(--primary)" strokeWidth="1.5" />
  </svg>
);

export const EmptyCandidatesIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="60" cy="60" r="56" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    {/* Podium */}
    <rect x="46" y="44" width="28" height="48" rx="4" fill="var(--heading)" stroke="var(--warning)" strokeWidth="1.5" />
    <rect x="22" y="56" width="24" height="36" rx="4" fill="var(--heading)" stroke="var(--text-secondary)" strokeWidth="1.5" />
    <rect x="74" y="64" width="24" height="28" rx="4" fill="var(--heading)" stroke="var(--warning)" strokeWidth="1.5" />
    <text x="60" y="60" fill="var(--warning)" fontSize="12" fontWeight="bold" textAnchor="middle">1</text>
    <text x="34" y="70" fill="var(--text-secondary)" fontSize="10" fontWeight="bold" textAnchor="middle">2</text>
    <text x="86" y="78" fill="var(--warning)" fontSize="10" fontWeight="bold" textAnchor="middle">3</text>
  </svg>
);

export const AiProcessingIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="60" cy="60" r="56" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    <circle cx="60" cy="60" r="28" stroke="var(--primary)" strokeWidth="2" strokeDasharray="6 6" className="animate-spin origin-center" />
    <circle cx="60" cy="60" r="16" fill="var(--heading)" stroke="var(--primary)" strokeWidth="2" />
    <circle cx="60" cy="60" r="6" fill="var(--primary)" />
    <circle cx="36" cy="40" r="4" fill="var(--primary)" />
    <circle cx="84" cy="40" r="4" fill="var(--primary)" />
    <circle cx="84" cy="80" r="4" fill="var(--success)" />
    <circle cx="36" cy="80" r="4" fill="var(--warning)" />
    <line x1="36" y1="40" x2="60" y2="60" stroke="var(--heading)" strokeWidth="1" />
    <line x1="84" y1="40" x2="60" y2="60" stroke="var(--heading)" strokeWidth="1" />
    <line x1="84" y1="80" x2="60" y2="60" stroke="var(--heading)" strokeWidth="1" />
    <line x1="36" y1="80" x2="60" y2="60" stroke="var(--heading)" strokeWidth="1" />
  </svg>
);

export const GitHubNeutralIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="60" cy="60" r="56" fill="var(--heading)" stroke="var(--heading)" strokeWidth="1.5" />
    <path d="M40 36 V84 M80 52 V84" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
    <path d="M40 52 C40 64, 80 52, 80 64" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="40" cy="36" r="6" fill="var(--heading)" stroke="var(--primary)" strokeWidth="2" />
    <circle cx="40" cy="84" r="6" fill="var(--heading)" stroke="var(--primary)" strokeWidth="2" />
    <circle cx="80" cy="52" r="6" fill="var(--heading)" stroke="var(--primary)" strokeWidth="2" />
    <circle cx="80" cy="84" r="6" fill="var(--heading)" stroke="var(--primary)" strokeWidth="2" />
  </svg>
);
