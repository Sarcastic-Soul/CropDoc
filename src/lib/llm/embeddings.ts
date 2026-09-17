import { getCachedEmbedding, setCachedEmbedding } from '@/lib/db';
import { getAllTreatments } from '@/lib/model/treatments';

import { LLM_MODEL_FILENAME } from './config';
import { embedText } from './engine';
import type { RetrievedTreatment } from './retrieval';

// Reuses the already-loaded chat model for embeddings (llama.rn's
// context.embedding()) instead of shipping a second model — see engine.ts's
// `embedding: true` context option. Vectors come back L2-normalized, so a
// plain dot product is already cosine similarity.
function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

// Sequential, not Promise.all — a single llama.cpp context processes one
// completion/embedding call at a time; firing 38 concurrently would just
// queue on the native side while burning JS-side memory for no speedup.
export async function warmTreatmentEmbeddings(language: string): Promise<void> {
  for (const [label, treatment] of getAllTreatments(language)) {
    const cached = await getCachedEmbedding(label, language, LLM_MODEL_FILENAME);
    if (cached) continue;
    const vector = await embedText(`${treatment.displayName}. ${treatment.description}`);
    await setCachedEmbedding(label, language, LLM_MODEL_FILENAME, vector);
  }
}

// Only reads what's already cached — never computes on the query path, so a
// question never blocks on indexing. Call warmTreatmentEmbeddings() first;
// this silently skips any label not yet indexed (partial index is fine, it
// just narrows what can be found).
export async function retrieveTreatmentsSemantic(
  question: string,
  language: string,
  limit = 2,
  minScore = 0.35
): Promise<RetrievedTreatment[]> {
  const questionVector = await embedText(question);
  const scored: RetrievedTreatment[] = [];

  for (const [label, treatment] of getAllTreatments(language)) {
    const vector = await getCachedEmbedding(label, language, LLM_MODEL_FILENAME);
    if (!vector) continue;
    scored.push({ label, treatment, score: dotProduct(questionVector, vector) });
  }

  return scored
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
