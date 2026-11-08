import type { TranslationEngine } from './base';
import type { TranslateContext } from '@/types';
import { getCredentials } from '../../utils/storage';
import { normalizeLanguageCode } from '../languages';

function cleanJsonResponse(raw: string): string {
  let trimmed = raw.trim();
  if (trimmed.startsWith('```json')) {
    trimmed = trimmed.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return trimmed.trim();
}

export const geminiEngine: TranslationEngine = {
  id: 'gemini',
  name: 'Gemini 翻译',
  async translate(
    texts: string[],
    from: string,
    to: string,
    context?: TranslateContext,
  ): Promise<string[]> {
    if (texts.length === 0) return [];
    const creds = await getCredentials();
    const apiKey = creds.geminiApiKey.trim();
    const model = creds.geminiModel.trim() || 'gemini-1.5-flash';

    if (!apiKey) {
      throw new Error('未配置 Gemini API Key，请在扩展设置中填写');
    }

    const targetLang = normalizeLanguageCode(to);
    const sourceLang = from === 'auto' ? 'original language' : normalizeLanguageCode(from);

    let contextPrompt = '';
    if (context?.pageTitle) {
      contextPrompt += `Document Subject: "${context.pageTitle}"\n`;
    }
    if (context?.previousTexts && context.previousTexts.length > 0) {
      contextPrompt += `Preceding Context for Reference:\n${context.previousTexts.map((t, idx) => `- "${t}" => "${context.previousTranslations?.[idx] || ''}"`).join('\n')}\n`;
    }

    const prompt = `You are a professional website translator. Translate each item in the following JSON array of strings from ${sourceLang} to ${targetLang}.
Maintain exact punctuation and format. Return ONLY a valid JSON array of strings matching the exact length and order of the input. Do not include explanation.
${contextPrompt ? contextPrompt + '\n' : ''}
Input: ${JSON.stringify(texts)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini 接口错误 [${res.status}]: ${errText.slice(0, 100)}`);
    }

    const data = await res.json();
    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const cleaned = cleanJsonResponse(rawText);
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length === texts.length) {
        return parsed.map((item, idx) => (typeof item === 'string' ? item : texts[idx]));
      }
    } catch {
      // Fallback below
    }

    // If batch JSON parsing failed, return raw or original
    return texts;
  },
};
