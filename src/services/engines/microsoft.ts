import type { TranslationEngine } from './base';
import { normalizeLanguageCode } from '../languages';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getEdgeToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }
  const res = await fetch('https://edge.microsoft.com/translate/auth');
  if (!res.ok) {
    throw new Error(`获取微软翻译凭据失败: ${res.status}`);
  }
  const token = await res.text();
  cachedToken = token;
  tokenExpiresAt = now + 9 * 60 * 1000; // 9 minutes cache
  return token;
}

export const microsoftEngine: TranslationEngine = {
  id: 'microsoft-free',
  name: 'Microsoft 免费翻译',
  async translate(texts: string[], from: string, to: string): Promise<string[]> {
    if (texts.length === 0) return [];
    const target = normalizeLanguageCode(to);

    // 1. First try direct Edge translation endpoint (zero-token, fast batching)
    try {
      let directUrl = `https://edge.microsoft.com/translate/translatetext?to=${encodeURIComponent(target)}&isEnterpriseClient=false`;
      if (from && from !== 'auto') {
        directUrl += `&from=${encodeURIComponent(normalizeLanguageCode(from))}`;
      }
      const res = await fetch(directUrl, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(texts),
      });
      if (res.ok) {
        const data = (await res.json()) as Array<{
          translations?: Array<{ text?: string }>;
        }>;
        if (Array.isArray(data) && data.length === texts.length) {
          return data.map((item, idx) => item.translations?.[0]?.text || texts[idx]);
        }
      }
    } catch {
      // Fall back to legacy cognitive token endpoint
    }

    // 2. Fallback to token-based cognitive service
    const token = await getEdgeToken();

    let url = `https://api-edge.cognitive.microsofttranslator.com/translate?to=${encodeURIComponent(target)}&api-version=3.0`;
    if (from && from !== 'auto') {
      const source = normalizeLanguageCode(from);
      url += `&from=${encodeURIComponent(source)}`;
    }

    const body = texts.map((t) => ({ Text: t }));
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      cachedToken = null; // Invalidate cached token on error
      const errText = await res.text().catch(() => '');
      throw new Error(`微软翻译接口错误 [${res.status}]: ${errText.slice(0, 100)}`);
    }

    const data = (await res.json()) as Array<{
      translations?: Array<{ text?: string }>;
    }>;

    return data.map((item, idx) => item.translations?.[0]?.text || texts[idx]);
  },
};
