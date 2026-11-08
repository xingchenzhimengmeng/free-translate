import type { TranslationEngine } from './base';
import type { LocalTranslatorStatus } from '@/types';
import { normalizeLanguageCode } from '../languages';

interface ChromeTranslatorInstance {
  translate(text: string): Promise<string>;
}

interface ChromeTranslatorFactory {
  availability?(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create?(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }): Promise<ChromeTranslatorInstance>;
}

interface WindowWithTranslation {
  Translator?: ChromeTranslatorFactory;
  translation?: {
    canTranslate?(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
    createTranslator?(options: {
      sourceLanguage: string;
      targetLanguage: string;
    }): Promise<ChromeTranslatorInstance>;
  };
  ai?: {
    translator?: ChromeTranslatorFactory;
  };
}

const translatorCache = new Map<string, ChromeTranslatorInstance>();

function getGlobalScope(): WindowWithTranslation | null {
  if (typeof window !== 'undefined') return window as unknown as WindowWithTranslation;
  if (typeof self !== 'undefined') return self as unknown as WindowWithTranslation;
  return null;
}

export async function checkChromeTranslatorStatus(
  source = 'en',
  target = 'zh-CN',
): Promise<LocalTranslatorStatus> {
  const scope = getGlobalScope();
  if (!scope) return 'unsupported';

  const src = source === 'auto' ? 'en' : normalizeLanguageCode(source).split('-')[0];
  const tgt = normalizeLanguageCode(target).split('-')[0];

  try {
    if (scope.Translator?.availability) {
      const res = await scope.Translator.availability({ sourceLanguage: src, targetLanguage: tgt });
      if (res === 'readily' || res === 'available') return 'available';
      if (res === 'after-download' || res === 'downloadable') return 'downloadable';
      return 'unsupported';
    }
    if (scope.translation?.canTranslate) {
      const res = await scope.translation.canTranslate({ sourceLanguage: src, targetLanguage: tgt });
      if (res === 'readily' || res === 'available') return 'available';
      if (res === 'after-download' || res === 'downloadable') return 'downloadable';
      return 'unsupported';
    }
    if (scope.ai?.translator?.availability) {
      const res = await scope.ai.translator.availability({ sourceLanguage: src, targetLanguage: tgt });
      if (res === 'readily' || res === 'available') return 'available';
      if (res === 'after-download' || res === 'downloadable') return 'downloadable';
      return 'unsupported';
    }
  } catch {
    return 'unsupported';
  }

  return 'unsupported';
}

export async function getChromeTranslator(
  source: string,
  target: string,
): Promise<ChromeTranslatorInstance> {
  const src = source === 'auto' ? 'en' : normalizeLanguageCode(source).split('-')[0];
  const tgt = normalizeLanguageCode(target).split('-')[0];
  const cacheKey = `${src}->${tgt}`;

  if (translatorCache.has(cacheKey)) {
    return translatorCache.get(cacheKey)!;
  }

  const scope = getGlobalScope();
  if (!scope) {
    throw new Error('当前环境不支持 Chrome 本地 Translator API');
  }

  let instance: ChromeTranslatorInstance | null = null;
  if (scope.Translator?.create) {
    instance = await scope.Translator.create({ sourceLanguage: src, targetLanguage: tgt });
  } else if (scope.translation?.createTranslator) {
    instance = await scope.translation.createTranslator({ sourceLanguage: src, targetLanguage: tgt });
  } else if (scope.ai?.translator?.create) {
    instance = await scope.ai.translator.create({ sourceLanguage: src, targetLanguage: tgt });
  }

  if (!instance) {
    throw new Error('无法创建本地 Translator 实例（可能需要 Chrome 138+）');
  }

  translatorCache.set(cacheKey, instance);
  return instance;
}

export const chromeLocalEngine: TranslationEngine = {
  id: 'chrome-local',
  name: 'Chrome 本地模型翻译',
  async translate(texts: string[], from: string, to: string): Promise<string[]> {
    if (texts.length === 0) return [];
    const translator = await getChromeTranslator(from, to);
    const results: string[] = [];
    for (const text of texts) {
      if (!text.trim()) {
        results.push(text);
        continue;
      }
      const res = await translator.translate(text);
      results.push(res || text);
    }
    return results;
  },
};
