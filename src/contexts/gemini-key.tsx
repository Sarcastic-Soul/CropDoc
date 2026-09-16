import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'cropdoc.geminiApiKey';

type GeminiKeyContextValue = {
  apiKey: string | null;
  isLoaded: boolean;
  setApiKey: (key: string | null) => Promise<void>;
};

const GeminiKeyContext = createContext<GeminiKeyContextValue | null>(null);

export function GeminiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((value) => {
      setApiKeyState(value);
      setIsLoaded(true);
    });
  }, []);

  const setApiKey = useCallback(async (key: string | null) => {
    if (key) {
      await SecureStore.setItemAsync(STORAGE_KEY, key);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
    setApiKeyState(key);
  }, []);

  const value = useMemo(() => ({ apiKey, isLoaded, setApiKey }), [apiKey, isLoaded, setApiKey]);

  return <GeminiKeyContext.Provider value={value}>{children}</GeminiKeyContext.Provider>;
}

export function useGeminiKey() {
  const context = useContext(GeminiKeyContext);
  if (!context) {
    throw new Error('useGeminiKey must be used within a GeminiKeyProvider');
  }
  return context;
}
