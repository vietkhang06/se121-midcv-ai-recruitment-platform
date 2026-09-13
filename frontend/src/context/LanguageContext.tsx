'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '@/locales/en';
import { vi } from '@/locales/vi';

export type Locale = 'en' | 'vi';

interface LanguageContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  toggleLocale: () => void;
  t: (path: string, fallback?: string) => string;
}

const dictionaries: Record<Locale, any> = { en, vi };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('vi');

  useEffect(() => {
    const stored = (localStorage.getItem('midcv_lang') || localStorage.getItem('matchjd_lang') || localStorage.getItem('matchproof_lang')) as Locale | null;
    if (stored === 'en' || stored === 'vi') {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('midcv_lang', newLocale);
  };

  const toggleLocale = () => {
    setLocale(locale === 'vi' ? 'en' : 'vi');
  };

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current = dictionaries[locale];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English dictionary
        let enCurrent = dictionaries['en'];
        for (const enKey of keys) {
          if (enCurrent && typeof enCurrent === 'object' && enKey in enCurrent) {
            enCurrent = enCurrent[enKey];
          } else {
            return fallback || path;
          }
        }
        return typeof enCurrent === 'string' ? enCurrent : (fallback || path);
      }
    }

    return typeof current === 'string' ? current : (fallback || path);
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
