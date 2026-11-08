import type { TranslateContext } from '@/types';

export interface TranslationEngine {
  id: string;
  name: string;
  translate(
    texts: string[],
    from: string,
    to: string,
    context?: TranslateContext,
  ): Promise<string[]>;
}

export function chunkTexts(
  texts: string[],
  maxCount = 20,
  maxChars = 4000,
): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentChars = 0;

  for (const text of texts) {
    const len = text.length;
    if (
      currentChunk.length >= maxCount ||
      (currentChars + len > maxChars && currentChunk.length > 0)
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChars = 0;
    }
    currentChunk.push(text);
    currentChars += len;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
