'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { en } from '@/locales/en';
import { vi } from '@/locales/vi';

export type Locale = 'en' | 'vi';

interface LanguageContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  toggleLocale: () => void;
  t: (path: string, fallback?: string) => string;
}

type TranslationTree = { [key: string]: string | TranslationTree };
const dictionaries: Record<Locale, TranslationTree> = { en, vi };
const localeChangeEvent = 'midcv:locale-change';

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'vi';
  const stored = localStorage.getItem('midcv_lang')
    || localStorage.getItem('matchjd_lang')
    || localStorage.getItem('matchproof_lang');
  return stored === 'en' || stored === 'vi' ? stored : 'vi';
}

function subscribeToLocale(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(localeChangeEvent, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(localeChangeEvent, callback);
    window.removeEventListener('storage', callback);
  };
}

function persistLocale(locale: Locale): void {
  localStorage.setItem('midcv_lang', locale);
  window.dispatchEvent(new Event(localeChangeEvent));
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const locale: Locale = useSyncExternalStore(subscribeToLocale, readStoredLocale, () => 'vi');

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    persistLocale(newLocale);
  };

  const toggleLocale = () => {
    persistLocale(readStoredLocale() === 'vi' ? 'en' : 'vi');
  };

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    const lookup = (tree: TranslationTree): string | undefined => {
      let current: string | TranslationTree = tree;
      for (const key of keys) {
        if (typeof current === 'string' || !(key in current)) return undefined;
        current = current[key];
      }
      return typeof current === 'string' ? current : undefined;
    };
    return lookup(dictionaries[locale]) ?? lookup(dictionaries.en) ?? fallback ?? path;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
