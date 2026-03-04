/**
 * i18next configuration for scalable internationalization.
 * Uses JSON locale files - add new languages by creating src/locales/{locale}.json
 * and adding to supportedLngs.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

const STORAGE_KEY = 'core_code_language';
const SUPPORTED_LANGS = ['en', 'ar'] as const;

function getStoredLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && SUPPORTED_LANGS.includes(stored as any) ? stored : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'ar'],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

function applyDirAndLang(lng: string) {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem(STORAGE_KEY, lng);
}

i18n.on('initialized', () => applyDirAndLang(i18n.language));
i18n.on('languageChanged', applyDirAndLang);

export { STORAGE_KEY, SUPPORTED_LANGS };
