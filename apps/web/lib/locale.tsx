'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createTranslator, type Locale, type Translate } from './i18n';

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void; t: Translate } | null>(null);
const LOCALE_KEY = 'ow_locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('vi');
  useEffect(() => {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(LOCALE_KEY)) as Locale | null;
    if (saved === 'vi' || saved === 'en') setLocaleState(saved);
  }, []);
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_KEY, l);
  };
  const t = createTranslator(locale);
  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
