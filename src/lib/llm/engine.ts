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
      // Enables context.embedding() for the semantic retrieval index — same
      // loaded model, no second model needed. mean pooling is the standard
      // choice for sentence-level embeddings (vs. last-token/cls).
      embedding: true,
      pooling_type: 'mean',
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

// Room for a short numbered list, which is how the model tends to answer. The
// prompt asks for 3-5 sentences; this cap is only the backstop.
const MAX_ANSWER_TOKENS = 384;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

function buildSystemPrompt(groundingBlocks: string[]): string {
  if (groundingBlocks.length === 0) return SYSTEM_PROMPT_BASE;
  return `${SYSTEM_PROMPT_BASE}\n\nOn-device diagnosis data that may be relevant:\n\n${groundingBlocks.join('\n\n')}`;
}

// L2-normalized (embd_normalize: 2, see common_embd_normalize in llama.cpp) so
// downstream dot products already equal cosine similarity — no separate norm step.
export async function embedText(text: string): Promise<number[]> {
  if (!contextPromise) {
    throw new Error('LLM is not set up yet');
  }
  const context = await contextPromise;
  const { embedding } = await context.embedding(text, { embd_normalize: 2 });
  return embedding;
}

export async function askLlm(history: ChatTurn[], groundingBlocks: string[] = []): Promise<string> {
  if (!contextPromise) {
    throw new Error('LLM is not set up yet');
  }
  const context = await contextPromise;

  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS);
  const result = await context.completion({
    messages: [{ role: 'system', content: buildSystemPrompt(groundingBlocks) }, ...trimmedHistory],
    n_predict: MAX_ANSWER_TOKENS,
  });

  const text = result.text.trim();
  return result.stopped_limit ? trimToLastSentence(text) : text;
}

// The model often ignores the "3-5 short sentences" instruction and runs into
// the token cap mid-sentence. Rather than show a dangling fragment, cut back to
// the last complete sentence (or list item) when that keeps most of the answer.
function trimToLastSentence(text: string): string {
  const sentenceEnds = [...text.matchAll(/[.!?](?=\s|$)/g)];
  const lastSentenceEnd = sentenceEnds.length > 0 ? (sentenceEnds[sentenceEnds.length - 1].index ?? -1) + 1 : 0;
  const lastLineBreak = text.lastIndexOf('\n');
  const cut = Math.max(lastSentenceEnd, lastLineBreak);
  if (cut < text.length * 0.5) return `${text}…`;
  return text.slice(0, cut).trim();
}
