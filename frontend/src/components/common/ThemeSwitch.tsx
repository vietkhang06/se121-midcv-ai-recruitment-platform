'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] select-none ${
        isDark 
          ? 'bg-[#1E293B] border border-[#334155]' 
          : 'bg-blue-100/90 border border-blue-200'
      } ${className}`}
      title={isDark ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
      aria-label="Toggle Dark/Light Mode"
    >
      {/* Background Track Icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Sun className={`w-3.5 h-3.5 transition-opacity duration-200 ${isDark ? 'opacity-40 text-slate-500' : 'opacity-0'}`} />
        <Moon className={`w-3 h-3 transition-opacity duration-200 ${isDark ? 'opacity-0' : 'opacity-40 text-slate-400'}`} />
      </span>

      {/* Sliding Thumb Knob */}
      <span
        className={`pointer-events-none relative z-10 inline-flex h-5.5 w-5.5 transform items-center justify-center rounded-full shadow-md transition-transform duration-300 ease-in-out ${
          isDark
            ? 'translate-x-6 bg-[#0B1329] text-blue-400 border border-blue-900/50'
            : 'translate-x-0 bg-white text-amber-500 border border-slate-100'
        }`}
      >
        {isDark ? (
          <Moon className="w-3 h-3 fill-blue-400/20 text-blue-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 fill-amber-400/30 text-amber-500" />
        )}
      </span>
    </button>
  );
};
