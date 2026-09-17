// SmolLM2-360M-Instruct, Q8_0 GGUF. Small enough for a quick opt-in download,
// weak on open-ended reasoning but fine for short answers grounded in the
// treatment text we already ship — see askLlm() in ./engine.ts.
export const LLM_MODEL_URL =
  'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf';
export const LLM_MODEL_FILENAME = 'smollm2-360m-instruct-q8_0.gguf';
export const LLM_MODEL_APPROX_BYTES = 386_000_000;
