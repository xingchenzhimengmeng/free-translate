import type { DisplayMode, TranslateResult } from '@/types';
import { getSettings } from '@/utils/storage';
import { scanTranslatableElements } from './domScanner';
import {
  ensureGlobalStyles,
  injectTranslation,
  restoreOriginalPage,
  switchDisplayMode,
} from './domTranslator';

let isTranslating = false;
let isTranslated = false;
let mutationObserver: MutationObserver | null = null;
let mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let fallbackNotified = false;
const slidingContextBuffer: Array<{ text: string; trans: string }> = [];

export function getPageTranslationState(): {
  isTranslating: boolean;
  isTranslated: boolean;
} {
  return { isTranslating, isTranslated };
}

function showFallbackNotification(serviceUsed: string): void {
  if (fallbackNotified) return;
  fallbackNotified = true;

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: #f8fafc;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: opacity 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  toast.textContent = `默认引擎故障，已自动降级至 [${serviceUsed}]`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function isElementInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top < (window.innerHeight || document.documentElement.clientHeight) + 300 &&
    rect.bottom > -300
  );
}

async function translateBatch(
  elements: HTMLElement[],
  texts: string[],
  targetLang: string,
  mode: DisplayMode,
  enableAIContext = true,
): Promise<void> {
  if (elements.length === 0) return;

  // Mark elements as currently translating to prevent duplicate scanning
  elements.forEach((el) => {
    el.dataset.ftTranslating = 'true';
  });

  const contextPayload = enableAIContext
    ? {
        pageTitle: document.title || '',
        previousTexts: slidingContextBuffer.map((c) => c.text),
        previousTranslations: slidingContextBuffer.map((c) => c.trans),
      }
    : undefined;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'TRANSLATE',
        payload: {
          texts,
          from: 'auto',
          to: targetLang,
          context: contextPayload,
        },
      },
      (response) => {
        elements.forEach((el) => {
          delete el.dataset.ftTranslating;
        });
        if (response?.success && response.data) {
          const result = response.data as TranslateResult;
          if (result.fallbackOccurred) {
            showFallbackNotification(result.serviceUsed);
          }
          result.translations.forEach((trans, idx) => {
            if (elements[idx]) {
              injectTranslation(elements[idx], trans, mode);
              if (enableAIContext && texts[idx] && trans) {
                slidingContextBuffer.push({ text: texts[idx], trans });
                if (slidingContextBuffer.length > 3) {
                  slidingContextBuffer.shift();
                }
              }
            }
          });
        }
        resolve();
      },
    );
  });
}

export async function translateCurrentPage(): Promise<void> {
  if (isTranslating) return;
  isTranslating = true;

  const settings = await getSettings();
  const targetLang = settings.targetLanguage || 'zh-CN';
  const mode = settings.displayMode || 'dual';
  const enableAIContext = settings.enableAIContext ?? true;
  ensureGlobalStyles(undefined, settings.translationColorTheme, settings.customColorHex);

  try {
    const targets = scanTranslatableElements(document.body);
    if (targets.length === 0) {
      isTranslating = false;
      return;
    }

    // Sort targets: elements in viewport first
    targets.sort((a, b) => {
      const aIn = isElementInViewport(a.element);
      const bIn = isElementInViewport(b.element);
      if (aIn && !bIn) return -1;
      if (!aIn && bIn) return 1;
      return 0;
    });

    // Group into batches (max 15 items or 3000 chars per batch)
    const batches: Array<{ elements: HTMLElement[]; texts: string[] }> = [];
    let currentBatch: { elements: HTMLElement[]; texts: string[] } = {
      elements: [],
      texts: [],
    };
    let currentCharCount = 0;

    for (const item of targets) {
      const len = item.text.length;
      if (
        currentBatch.elements.length >= 15 ||
        (currentCharCount + len > 3000 && currentBatch.elements.length > 0)
      ) {
        batches.push(currentBatch);
        currentBatch = { elements: [], texts: [] };
        currentCharCount = 0;
      }
      currentBatch.elements.push(item.element);
      currentBatch.texts.push(item.text);
      currentCharCount += len;
    }
    if (currentBatch.elements.length > 0) {
      batches.push(currentBatch);
    }

    // Concurrent translation pool with max 3 workers
    const queue = [...batches];
    const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length > 0) {
        const batch = queue.shift();
        if (!batch) break;
        await translateBatch(batch.elements, batch.texts, targetLang, mode, enableAIContext);
      }
    });

    await Promise.all(workers);
    isTranslated = true;
    setupMutationWatcher();
  } finally {
    isTranslating = false;
  }
}

export function togglePageTranslation(): void {
  if (isTranslated) {
    restoreOriginalPage();
    isTranslated = false;
    slidingContextBuffer.length = 0;
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
  } else {
    translateCurrentPage();
  }
}

export function setDisplayMode(mode: DisplayMode): void {
  switchDisplayMode(mode);
}

function setupMutationWatcher(): void {
  if (mutationObserver) return;
  mutationObserver = new MutationObserver(() => {
    if (!isTranslated) return;
    if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(async () => {
      const settings = await getSettings();
      const targets = scanTranslatableElements(document.body);
      if (targets.length === 0) return;
      const elements = targets.map((t) => t.element);
      const texts = targets.map((t) => t.text);
      await translateBatch(
        elements,
        texts,
        settings.targetLanguage,
        settings.displayMode,
        settings.enableAIContext ?? true,
      );
    }, 400);
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
