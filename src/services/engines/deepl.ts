import type { TranslationEngine } from './base';
import { toDeepLLang } from '../languages';
import { getCredentials } from '../../utils/storage';

export const deeplEngine: TranslationEngine = {
  id: 'deepl',
  name: 'DeepL 翻译',
  async translate(texts: string[], from: string, to: string): Promise<string[]> {
    if (texts.length === 0) return [];
    const creds = await getCredentials();
    const apiKey = creds.deeplApiKey.trim();
    if (!apiKey) {
      throw new Error('未配置 DeepL API Key，请在扩展设置中填写');
    }

    const isFree = apiKey.endsWith(':fx');
    const endpoint = isFree
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const targetLang = toDeepLLang(to);
    const body: Record<string, unknown> = {
      text: texts,
      target_lang: targetLang,
    };
    if (from && from !== 'auto') {
      body.source_lang = toDeepLLang(from);
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`DeepL 接口错误 [${res.status}]: ${errText.slice(0, 100)}`);
    }

    const data = (await res.json()) as {
      translations?: Array<{ text: string }>;
    };

    return (
      data.translations?.map((item, idx) => item.text || texts[idx]) || texts
    );
  },
};
