import { getAllTreatments, type Treatment } from '@/lib/model/treatments';

// Deterministic keyword overlap, not semantic search. Used as the instant
// fallback before the embedding index (see ./embeddings.ts) has finished
// warming, or if an embedding call errors — always available, never blocks.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'my', 'our', 'your', 'their',
  'this', 'that', 'these', 'those', 'i', 'you', 'we', 'they', 'it', 'on', 'in', 'of',
  'for', 'and', 'or', 'to', 'with', 'has', 'have', 'had', 'do', 'does', 'what', 'why',
  'how', 'when', 'can', 'should', 'will', 'would', 'about', 'plant', 'leaf', 'leaves',
  'crop', 'plants', 'get', 'got', 'from',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

export type RetrievedTreatment = { label: string; treatment: Treatment; score: number };

export function retrieveTreatments(question: string, language: string, limit = 2): RetrievedTreatment[] {
  const queryTokens = new Set(tokenize(question));
  if (queryTokens.size === 0) return [];

  const scored = getAllTreatments(language).map(([label, treatment]) => {
    let score = 0;
    for (const token of tokenize(treatment.displayName)) {
      if (queryTokens.has(token)) score += 2;
    }
    for (const token of tokenize(treatment.description)) {
      if (queryTokens.has(token)) score += 1;
    }
    return { label, treatment, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
