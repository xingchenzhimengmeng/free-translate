import type { TranslationEngine } from './base';
import type { TranslateContext } from '@/types';
import { getCredentials } from '../../utils/storage';
import { normalizeLanguageCode } from '../languages';

function extractJsonArray(raw: string): string[] | null {
  let str = raw.trim();
  if (str.startsWith('```json')) {
    str = str.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (str.startsWith('```')) {
    str = str.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  str = str.trim();
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? ''));
    }
  } catch {
    // Regex fallback to find bracketed array [...]
    const match = str.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) {
          return arr.map((item) => String(item ?? ''));
        }
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export const openaiEngine: TranslationEngine = {
  id: 'openai-compatible',
  name: 'OpenAI 兼容接口',
  async translate(
    texts: string[],
    from: string,
    to: string,
    context?: TranslateContext,
  ): Promise<string[]> {
    if (texts.length === 0) return [];
    const creds = await getCredentials();
    const baseUrl = (creds.openaiBaseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
    const apiKey = creds.openaiApiKey.trim();
    const model = creds.openaiModel.trim() || 'deepseek-chat';

    const targetLang = normalizeLanguageCode(to);
    const sourceLang = from === 'auto' ? 'original language' : normalizeLanguageCode(from);

    let contextBlock = '';
    if (context?.pageTitle) {
      contextBlock += `\nDocument / Page Subject: "${context.pageTitle}"\n`;
    }
    if (context?.previousTexts && context.previousTexts.length > 0) {
      contextBlock += `\nPreceding Context (Reference ONLY for terminology consistency & pronoun resolution; DO NOT output these):\n`;
      context.previousTexts.forEach((prev, i) => {
        const prevTrans = context.previousTranslations?.[i];
        contextBlock += `- Prior text: "${prev}"\n`;
        if (prevTrans) {
          contextBlock += `  Prior translation: "${prevTrans}"\n`;
        }
      });
    }

    const systemPrompt = `You are a professional website translator. Translate the provided JSON array of strings from ${sourceLang} to ${targetLang}.
Rules:
1. Retain all HTML entities, formatting placeholders, and technical terms when appropriate.
2. Return ONLY a valid JSON array of strings.
3. The output array must contain exactly ${texts.length} elements matching the input order.
4. Do NOT output markdown code fences or any conversational text.${contextBlock ? '\n5. Use the provided Context to ensure consistent character names, technical jargon, and pronoun references.' : ''}`;

    const userPrompt = `${contextBlock ? contextBlock + '\nTarget texts to translate:\n' : ''}${JSON.stringify(texts)}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`大模型接口错误 [${res.status}]: ${errText.slice(0, 100)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const array = extractJsonArray(content);

    if (array && array.length === texts.length) {
      return array;
    }

    // Fallback: If array length didn't match, return content or original
    return texts;
  },
};
