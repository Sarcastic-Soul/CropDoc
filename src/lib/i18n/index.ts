import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bn from './locales/bn.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import id from './locales/id.json';
import pt from './locales/pt.json';
import sw from './locales/sw.json';
import ur from './locales/ur.json';
import vi from './locales/vi.json';
import zh from './locales/zh.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'zh', label: 'Mandarin Chinese', nativeLabel: '中文' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'sw', label: 'Swahili', nativeLabel: 'Kiswahili' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const RTL_LANGUAGES: LanguageCode[] = ['ur'];

export function isSupportedLanguage(value: string | null): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === value);
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      es: { translation: es },
      zh: { translation: zh },
      pt: { translation: pt },
      bn: { translation: bn },
      id: { translation: id },
      sw: { translation: sw },
      vi: { translation: vi },
      fr: { translation: fr },
      ur: { translation: ur },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
