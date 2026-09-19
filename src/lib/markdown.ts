// Minimal markdown support for model-generated text (the Ask assistant and the
// Gemini second opinion). Both models answer with **bold**, bullet lists and the
// odd heading, which otherwise show up as literal asterisks and hashes. Only the
// handful of constructs these models actually emit are handled.

export type InlineSpan = { text: string; bold?: boolean; italic?: boolean };

// **bold** / __bold__ first, then *italic*. Single underscores are left alone:
// they turn up inside scientific and product names far more often than as italics.
const INLINE_PATTERN = /\*\*(.+?)\*\*|__(.+?)__|\*([^*\s](?:[^*]*[^*\s])?)\*/g;

export function parseInline(line: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let last = 0;
  for (const match of line.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) spans.push({ text: line.slice(last, index) });
    if (match[1] !== undefined || match[2] !== undefined) {
      spans.push({ text: match[1] ?? match[2], bold: true });
    } else {
      spans.push({ text: match[3], italic: true });
    }
    last = index + match[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last) });
  return spans;
}

// Rewrites block-level syntax line by line: headings become bold lines, "-"/"*"
// bullets become "•", and inline code loses its backticks.
export function normalizeBlocks(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
      if (heading) return `**${heading[1].replace(/\*\*/g, '')}**`;
      return line.replace(/^(\s*)[-*+]\s+/, '$1• ');
    })
    .join('\n')
    .replace(/`([^`]+)`/g, '$1');
}

// Plain text with all markdown removed, for text-to-speech.
export function stripMarkdown(text: string): string {
  return normalizeBlocks(text)
    .split('\n')
    .map((line) =>
      parseInline(line)
        .map((span) => span.text)
        .join('')
        .replace(/^(\s*)•\s+/, '$1'),
    )
    .join('\n');
}
