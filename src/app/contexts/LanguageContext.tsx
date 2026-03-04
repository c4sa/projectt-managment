/**
 * Language context - thin wrapper over react-i18next.
 * Preserves the same API (useLanguage, t, setLanguage, dir) for backward compatibility.
 * Translations are loaded from src/locales/*.json via i18next.
 */
import React, { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'ar' ? 'ar' : 'en') as Language;
  const dir: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';

  const setLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
