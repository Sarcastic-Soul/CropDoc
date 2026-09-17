import { initLlama, type LlamaContext } from 'llama.rn';

import { getModelFile } from './model-file';

let contextPromise: Promise<LlamaContext> | null = null;

export function isLlmReady(): boolean {
  return contextPromise !== null;
}

export async function setupLlm(onProgress?: (fraction: number) => void): Promise<void> {
  if (contextPromise) {
    await contextPromise;
    return;
  }
  const modelFile = getModelFile();
  if (!modelFile.exists) {
    throw new Error('Model file not downloaded yet');
  }

  const promise = initLlama(
    {
      model: modelFile.uri,
      n_ctx: 2048,
      n_threads: 4,
      use_mlock: true,
    },
    (progress) => onProgress?.(progress / 100)
  );
  contextPromise = promise;

  try {
    await promise;
  } catch (error) {
    contextPromise = null;
    throw error;
  }
}

export async function releaseLlm(): Promise<void> {
  const promise = contextPromise;
  contextPromise = null;
  if (!promise) return;
  const context = await promise;
  await context.release();
}

const SYSTEM_PROMPT_BASE =
  'You are an offline assistant helping a farmer with crop and plant disease questions. ' +
  'Answer in plain, simple, non-technical language in 3-5 short sentences. ' +
  "If none of the provided diagnosis data is relevant, say so and answer from general knowledge instead of guessing it's one of the listed diseases.";

// A 360M model has no published "reliable before it hallucinates" number, but its
// architectural ceiling is 8192 tokens and its reasoning benchmarks are weak
// (MMLU ~33%, GSM8K ~7%) — so we keep well clear of that ceiling rather than
// trusting it. History and grounding are both capped to keep total prompt size
// in the few-hundred-token range, not the low thousands.
const MAX_HISTORY_TURNS = 6;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

function buildSystemPrompt(groundingBlocks: string[]): string {
  if (groundingBlocks.length === 0) return SYSTEM_PROMPT_BASE;
  return `${SYSTEM_PROMPT_BASE}\n\nOn-device diagnosis data that may be relevant:\n\n${groundingBlocks.join('\n\n')}`;
}

export async function askLlm(history: ChatTurn[], groundingBlocks: string[] = []): Promise<string> {
  if (!contextPromise) {
    throw new Error('LLM is not set up yet');
  }
  const context = await contextPromise;

  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS);
  const result = await context.completion({
    messages: [{ role: 'system', content: buildSystemPrompt(groundingBlocks) }, ...trimmedHistory],
    n_predict: 220,
  });

  return result.text.trim();
}
