import type { Locale } from '@/context/LanguageContext';

/** Parse whole VND units using the active locale's grouping rules. */
export function parseVndAmount(raw: string, locale: Locale): number | null {
  const value = raw.trim().replace(/[\s₫đ]/gi, '');
  if (!value) return null;
  const grouped = locale === 'vi' ? /^\d{1,3}(?:\.\d{3})+$/ : /^\d{1,3}(?:,\d{3})+$/;
  const plain = /^\d+$/;
  if (!grouped.test(value) && !plain.test(value)) return null;
  const parsed = Number(value.replace(/[.,]/g, ''));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function formatVndAmount(value: number | string | null | undefined, locale: Locale): string {
  if (value === null || value === undefined || value === '') return '';
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return '';
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
