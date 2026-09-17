// ggml-tiny (multilingual, not the .en-suffixed variant — this app ships 11
// languages) — same "small enough for an opt-in download" tradeoff as the
// chat LLM. See lib/llm/config.ts.
export const STT_MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';
export const STT_MODEL_FILENAME = 'ggml-tiny.bin';
export const STT_MODEL_APPROX_BYTES = 77_700_000;

// whisper.cpp's file loader expects mono 16-bit PCM WAV; 16kHz matches the
// model's own training sample rate (upsampling further gains nothing).
export const STT_SAMPLE_RATE = 16000;
export const STT_CHANNELS = 1;
export const STT_BITS_PER_SAMPLE = 16;
