// whisper.rn's own untranspiled source (which both Metro's "react-native"
// export condition and TS's "bundler" moduleResolution resolve bare
// `whisper.rn/**` imports to — see below) references the bare `global`
// object without any ambient type for it, and this project has no other
// source of one (React Native's own global.d.ts declares `require`,
// `console`, etc., never `global` itself). Without this, type-checking any
// whisper.rn subpath that happens to resolve to a real file (e.g. the
// AudioPcmStreamAdapter import further down) fails with "Cannot find name
// 'global'" — not a whisper.rn bug, just a real, accurate gap this fills.
declare const global: any;

// whisper.rn's package.json `exports` map has no "." entry, so TypeScript
// (correctly mirroring Metro's own resolution here) can't resolve a bare
// `whisper.rn` import to anything at all. This ambient declaration is the
// only thing making that import type-check; Metro still bundles the real
// package's compiled output at runtime regardless of how tsc types it here.
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

// No ambient declaration needed for
// 'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter' or
// '.../types': unlike the root 'whisper.rn' import above, these subpaths
// resolve to real files (see src/lib/stt/recorder.ts), so TS type-checks
// whisper.rn's actual source for them — which is what needs the `global`
// declaration above.
