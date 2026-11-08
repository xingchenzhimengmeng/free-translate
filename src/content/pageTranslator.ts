import type { DisplayMode, TranslateResult } from '@/types';
import { getSettings } from '@/utils/storage';
import { scanTranslatableElements, type ScanTarget } from './domScanner';
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
  batchTargets: ScanTarget[],
  targetLang: string,
  mode: DisplayMode,
  enableAIContext = true,
): Promise<void> {
  if (batchTargets.length === 0) return;

  const elements = batchTargets.map((b) => b.element);
  const texts = batchTargets.map((b) => b.text);

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
            const target = batchTargets[idx];
            if (target && target.element) {
              injectTranslation(target.element, trans, mode, target.formulaNodes);
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

    // Pre-calculate viewport visibility once to prevent forced synchronous layout thrashing
    const inViewportSet = new Set<HTMLElement>();
    for (const t of targets) {
      if (isElementInViewport(t.element)) {
        inViewportSet.add(t.element);
      }
    }

    // Sort targets: elements in viewport first
    targets.sort((a, b) => {
      const aIn = inViewportSet.has(a.element);
      const bIn = inViewportSet.has(b.element);
      if (aIn && !bIn) return -1;
      if (!aIn && bIn) return 1;
      return 0;
    });

    // Group into batches (max 15 items or 3000 chars per batch)
    const batches: ScanTarget[][] = [];
    let currentBatch: ScanTarget[] = [];
    let currentCharCount = 0;

    for (const item of targets) {
      const len = item.text.length;
      if (
        currentBatch.length >= 15 ||
        (currentCharCount + len > 3000 && currentBatch.length > 0)
      ) {
        batches.push(currentBatch);
        currentBatch = [];
        currentCharCount = 0;
      }
      currentBatch.push(item);
      currentCharCount += len;
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    // Concurrent translation pool with max 3 workers
    const queue = [...batches];
    const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length > 0) {
        const batch = queue.shift();
        if (!batch) break;
        await translateBatch(batch, targetLang, mode, enableAIContext);
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

function isDynamicFeedSite(): boolean {
  if (typeof window === 'undefined') return false;
  const url = window.location.href.toLowerCase();
  return (
    url.includes('youtube.com') ||
    url.includes('/view/youtube') ||
    url.includes('twitter.com') ||
    url.includes('x.com') ||
    url.includes('reddit.com')
  );
}

function setupMutationWatcher(): void {
  if (mutationObserver) return;
  if (!isDynamicFeedSite()) {
    // Static pages (GitHub, Codeforces, articles, docs) do not need continuous DOM mutation observation
    return;
  }
  mutationObserver = new MutationObserver((mutations) => {
    if (!isTranslated || isTranslating) return;

    // Strict filter: Ignore any mutations that only add/modify our own extension nodes
    let hasExternalNewNodes = false;
    for (const m of mutations) {
      if (m.type === 'childList') {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const node = m.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (
              el.tagName === 'FT-TRANSLATION' ||
              el.id === 'ft-float-button-root' ||
              el.id === 'ft-selection-popup-root' ||
              el.classList?.contains('ft-btn') ||
              el.closest?.('ft-translation') ||
              el.closest?.('#ft-float-button-root')
            ) {
              continue;
            }
            hasExternalNewNodes = true;
            break;
          }
        }
      }
      if (hasExternalNewNodes) break;
    }

    if (!hasExternalNewNodes) return;

    if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(async () => {
      if (!isTranslated || isTranslating) return;
      isTranslating = true;
      try {
        if (mutationObserver) {
          mutationObserver.disconnect();
          mutationObserver = null;
        }
        const settings = await getSettings();
        const targets = scanTranslatableElements(document.body, window.location.href);
        if (targets.length === 0) return;

        const batches: ScanTarget[][] = [];
        let currentBatch: ScanTarget[] = [];
        let currentCharCount = 0;

        for (const item of targets) {
          const len = item.text.length;
          if (
            currentBatch.length >= 15 ||
            (currentCharCount + len > 3000 && currentBatch.length > 0)
          ) {
            batches.push(currentBatch);
            currentBatch = [];
            currentCharCount = 0;
          }
          currentBatch.push(item);
          currentCharCount += len;
        }
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
        }

        for (const batch of batches) {
          await translateBatch(batch, settings.targetLanguage, settings.displayMode, settings.enableAIContext ?? true);
        }
      } finally {
        isTranslating = false;
        if (isTranslated) {
          setupMutationWatcher();
        }
      }
    }, 800);
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
