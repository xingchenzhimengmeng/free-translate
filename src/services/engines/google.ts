import type { TranslationEngine } from './base';
import { normalizeLanguageCode } from '../languages';

async function translateSingle(
  text: string,
  from: string,
  to: string,
): Promise<string> {
  if (!text.trim()) return text;
  const sl = from === 'auto' ? 'auto' : normalizeLanguageCode(from);
  const tl = normalizeLanguageCode(to);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google 翻译接口错误: ${res.status}`);
  }

  const data = await res.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const translatedParts = data[0].map((part: unknown) =>
      Array.isArray(part) && typeof part[0] === 'string' ? part[0] : '',
    );
    return translatedParts.join('') || text;
  }
  return text;
}

export const googleEngine: TranslationEngine = {
  id: 'google-free',
  name: 'Google 免费翻译',
  async translate(texts: string[], from: string, to: string): Promise<string[]> {
    if (texts.length === 0) return [];
    // Concurrency limit of 4 requests at a time
    const results: string[] = new Array(texts.length);
    const queue = texts.map((t, index) => ({ text: t, index }));
    const workers = Array.from({ length: Math.min(4, texts.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        results[item.index] = await translateSingle(item.text, from, to);
      }
    });
    await Promise.all(workers);
    return results;
  },
};
