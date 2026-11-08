import type {
  TranslateRequest,
  TranslateResult,
  TranslationServiceId,
} from '../../types';
import { getSettings } from '../../utils/storage';
import { getCachedTranslation, setCachedTranslation } from '../cache';
import type { TranslationEngine } from './base';
import { chunkTexts } from './base';
import { baiduEngine } from './baidu';
import { chromeLocalEngine } from './chromeLocal';
import { deeplEngine } from './deepl';
import { geminiEngine } from './gemini';
import { googleEngine } from './google';
import { microsoftEngine } from './microsoft';
import { openaiEngine } from './openai';

export const ENGINES: Record<TranslationServiceId, TranslationEngine> = {
  'chrome-local': chromeLocalEngine,
  'microsoft-free': microsoftEngine,
  'google-free': googleEngine,
  deepl: deeplEngine,
  gemini: geminiEngine,
  baidu: baiduEngine,
  'openai-compatible': openaiEngine,
};

export async function dispatchTranslate(
  req: TranslateRequest,
): Promise<TranslateResult> {
  const { texts, from, to, bypassCache, context } = req;
  if (texts.length === 0) {
    return {
      translations: [],
      serviceUsed: req.service || 'microsoft-free',
      fallbackOccurred: false,
    };
  }

  const settings = await getSettings();
  const requestedService: TranslationServiceId =
    req.service || settings.defaultService || 'microsoft-free';

  // Define fallback candidates in priority order
  const fallbackChain: TranslationServiceId[] = [
    requestedService,
    'chrome-local',
    'microsoft-free',
    'google-free',
  ].filter((v, i, a) => a.indexOf(v) === i) as TranslationServiceId[];

  const servicesToTry = settings.enableFallback
    ? fallbackChain
    : [requestedService];

  let lastError: Error | null = null;

  for (let i = 0; i < servicesToTry.length; i++) {
    const serviceId = servicesToTry[i];
    const engine = ENGINES[serviceId];
    if (!engine) continue;

    try {
      const translations: string[] = new Array(texts.length);
      const missingIndices: number[] = [];
      const missingTexts: string[] = [];

      // Check cache first
      if (!bypassCache) {
        for (let idx = 0; idx < texts.length; idx++) {
          const cached = await getCachedTranslation(
            serviceId,
            from,
            to,
            texts[idx],
          );
          if (cached !== null) {
            translations[idx] = cached;
          } else {
            missingIndices.push(idx);
            missingTexts.push(texts[idx]);
          }
        }
      } else {
        texts.forEach((t, idx) => {
          missingIndices.push(idx);
          missingTexts.push(t);
        });
      }

      // If some texts need translation
      if (missingTexts.length > 0) {
        const chunks = chunkTexts(missingTexts, 20, 4000);
        const translatedChunks: string[] = [];

        for (const chunk of chunks) {
          const res = await engine.translate(chunk, from, to, context);
          translatedChunks.push(...res);
        }

        // Populate results and cache
        for (let m = 0; m < missingTexts.length; m++) {
          const original = missingTexts[m];
          const translated = translatedChunks[m] || original;
          const fullIndex = missingIndices[m];
          translations[fullIndex] = translated;
          await setCachedTranslation(serviceId, from, to, original, translated);
        }
      }

      return {
        translations,
        serviceUsed: serviceId,
        fallbackOccurred: serviceId !== requestedService,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next service in fallback chain
    }
  }

  throw (
    lastError ||
    new Error(`所有翻译服务尝试均失败（包含备选自动降级引擎）`)
  );
}
