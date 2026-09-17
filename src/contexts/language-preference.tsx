import { Storage } from 'expo-sqlite/kv-store';
import * as Updates from 'expo-updates';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { I18nManager } from 'react-native';

import i18n, { isSupportedLanguage, RTL_LANGUAGES, type LanguageCode } from '@/lib/i18n';

const STORAGE_KEY = 'cropdoc.language';

function readStoredLanguage(): LanguageCode | null {
  const value = Storage.getItemSync(STORAGE_KEY);
  return isSupportedLanguage(value) ? value : null;
}

// Sync i18n to the stored preference as soon as this module loads, so the
// very first render already uses the right language instead of flashing English.
const initialLanguage = readStoredLanguage();
if (initialLanguage) {
  i18n.changeLanguage(initialLanguage);
}

type LanguagePreferenceContextValue = {
  language: LanguageCode | null;
  setLanguage: (language: LanguageCode) => void;
};

const LanguagePreferenceContext = createContext<LanguagePreferenceContextValue | null>(null);

export function LanguagePreferenceProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode | null>(readStoredLanguage);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    Storage.setItemAsync(STORAGE_KEY, next);
    i18n.changeLanguage(next);

    const shouldBeRTL = RTL_LANGUAGES.includes(next);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      // RN only applies a writing-direction change to native layout after a reload.
      Updates.reloadAsync().catch(() => {});
    }
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguagePreferenceContext.Provider value={value}>{children}</LanguagePreferenceContext.Provider>;
}

export function useLanguagePreference() {
  const context = useContext(LanguagePreferenceContext);
  if (!context) {
    throw new Error('useLanguagePreference must be used within a LanguagePreferenceProvider');
  }
  return context;
}
