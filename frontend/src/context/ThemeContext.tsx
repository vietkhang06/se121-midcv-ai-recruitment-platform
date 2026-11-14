'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const themeChangeEvent = 'midcv:theme-change';

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('midcv_theme')
    || localStorage.getItem('matchjd_theme')
    || localStorage.getItem('matchproof_theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribeTheme(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  window.addEventListener(themeChangeEvent, callback);
  window.addEventListener('storage', callback);
  media.addEventListener('change', callback);
  return () => {
    window.removeEventListener(themeChangeEvent, callback);
    window.removeEventListener('storage', callback);
    media.removeEventListener('change', callback);
  };
}

function persistTheme(theme: Theme): void {
  localStorage.setItem('midcv_theme', theme);
  window.dispatchEvent(new Event(themeChangeEvent));
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useSyncExternalStore<Theme>(subscribeTheme, readTheme, () => 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const setTheme = (newTheme: Theme) => persistTheme(newTheme);
  const toggleTheme = () => persistTheme(readTheme() === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
