import * as Speech from 'expo-speech';

import { stripMarkdown } from '@/lib/markdown';

// Android's TTS engine resolves voices by BCP-47 region tag; a bare base
// language code (e.g. 'sw', 'ur') more often fails to match an installed
// voice than a fully-qualified one does. Voice availability itself is an
// OS/device concern outside our control — if the tag has no installed
// voice, expo-speech's onError fires and we just don't produce audio,
// nothing to recover from at the app level.
const LANGUAGE_TAGS: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-CN',
  pt: 'pt-BR',
  bn: 'bn-BD',
  id: 'id-ID',
  sw: 'sw-KE',
  vi: 'vi-VN',
  fr: 'fr-FR',
  ur: 'ur-PK',
};

export type SpeakCallbacks = {
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

export function speakText(text: string, language: string, callbacks?: SpeakCallbacks): void {
  Speech.speak(stripMarkdown(text), {
    language: LANGUAGE_TAGS[language] ?? language,
    onDone: callbacks?.onDone,
    onStopped: callbacks?.onStopped,
    onError: callbacks?.onError,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
