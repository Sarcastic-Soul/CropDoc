// whisper.rn's package.json `exports` map has no "." entry and orders the
// "react-native" condition before "types", so TypeScript (correctly mirroring
// Metro's own resolution here) resolves bare `whisper.rn` imports to its
// untranspiled `src/index.ts` instead of the compiled `lib/typescript/*.d.ts`
// output — which doesn't type-check standalone outside the package's own
// tsconfig (missing RN globals). Ambient declarations here bypass that
// resolution entirely for the exact specifiers this app imports; Metro still
// bundles the real package at runtime regardless of how tsc types it.
declare module 'whisper.rn' {
  export type TranscribeResult = {
    result: string;
    language: string;
    segments: { text: string; t0: number; t1: number }[];
    isAborted: boolean;
  };

  export type TranscribeOptions = {
    language?: string;
  };

  export class WhisperContext {
    transcribe(
      filePathOrBase64: string,
      options?: TranscribeOptions
    ): { stop: () => Promise<void>; promise: Promise<TranscribeResult> };
    release(): Promise<void>;
  }

  export function initWhisper(options: { filePath: string }): Promise<WhisperContext>;
}

declare module 'whisper.rn/realtime-transcription/adapters' {
  export type AudioStreamData = {
    data: Uint8Array;
    sampleRate: number;
    channels: number;
    timestamp: number;
  };

  export type AudioStreamConfig = {
    sampleRate?: number;
    channels?: number;
    bitsPerSample?: number;
    bufferSize?: number;
    audioSource?: number;
  };

  export class AudioPcmStreamAdapter {
    initialize(config: AudioStreamConfig): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRecording(): boolean;
    onData(callback: (data: AudioStreamData) => void): void;
    onError(callback: (error: string) => void): void;
    onStatusChange(callback: (isRecording: boolean) => void): void;
    release(): Promise<void>;
  }
}
