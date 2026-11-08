import type { DisplayMode } from '@/types';
import { findMatchingRule } from '../services/siteRules';
import { resolveColors } from '../services/colors';
import type { TranslationColorTheme } from '../types';

const TRANSLATION_TAG = 'ft-translation';
const STYLE_ID = 'ft-translation-global-styles';

let activeTheme: TranslationColorTheme = 'blue';
let activeCustomHex = '#2563eb';

export function buildGlobalCss(
  url: string = typeof window !== 'undefined' ? window.location?.href || '' : '',
  theme: TranslationColorTheme = activeTheme,
  customHex: string = activeCustomHex
): string {
  const matchingRule = url ? findMatchingRule(url) : null;
  const siteCustomCss = matchingRule?.injectedCss ? matchingRule.injectedCss.join('\n') : '';
  const { textColor, borderColor, darkTextColor, darkBorderColor } = resolveColors(theme, customHex);

  return `
    ${TRANSLATION_TAG} {
      display: block !important;
      margin-top: 4px !important;
      margin-bottom: 4px !important;
      color: ${textColor} !important;
      font-size: 0.95em !important;
      line-height: 1.6 !important;
      opacity: 0.92 !important;
      border-left: 2px solid ${borderColor} !important;
      padding-left: 6px !important;
      box-sizing: border-box !important;
    }
    @media (prefers-color-scheme: dark) {
      ${TRANSLATION_TAG} {
        color: ${darkTextColor} !important;
        border-left-color: ${darkBorderColor} !important;
      }
    }
    [data-color-mode="dark"] ${TRANSLATION_TAG},
    [data-theme="dark"] ${TRANSLATION_TAG},
    .dark ${TRANSLATION_TAG} {
      color: ${darkTextColor} !important;
      border-left-color: ${darkBorderColor} !important;
    }
    /* Global layout protection: unclamp truncated text containers */
    [class*="line-clamp"],
    [style*="-webkit-line-clamp"] {
      -webkit-line-clamp: unset !important;
      max-height: unset !important;
    }
    /* Site-specific injected CSS rules */
    ${siteCustomCss}
    .ft-hide-original > *:not(${TRANSLATION_TAG}) {
      display: none !important;
    }
    .ft-hide-original {
      font-size: 0 !important;
    }
    .ft-hide-original > ${TRANSLATION_TAG} {
      font-size: 1rem !important;
      border-left: none !important;
      padding-left: 0 !important;
      color: inherit !important;
    }
  `;
}

export function ensureGlobalStyles(
  url: string = typeof window !== 'undefined' ? window.location?.href || '' : '',
  theme: TranslationColorTheme = activeTheme,
  customHex: string = activeCustomHex
): void {
  if (document.getElementById(STYLE_ID)) return;
  activeTheme = theme;
  activeCustomHex = customHex;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = buildGlobalCss(url, theme, customHex);
  document.head.appendChild(style);
}

export function updateGlobalTranslationColor(
  theme: TranslationColorTheme,
  customHex?: string
): void {
  activeTheme = theme;
  if (customHex) activeCustomHex = customHex;
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    ensureGlobalStyles(undefined, theme, customHex);
  } else {
    style.textContent = buildGlobalCss(undefined, theme, customHex || activeCustomHex);
  }
}

export function injectTranslation(
  element: HTMLElement,
  translatedText: string,
  mode: DisplayMode = 'dual',
): void {
  ensureGlobalStyles();

  // Check if translation already exists
  let transEl = element.querySelector<HTMLElement>(TRANSLATION_TAG);
  if (!transEl) {
    transEl = document.createElement(TRANSLATION_TAG);
    element.appendChild(transEl);
  }

  transEl.textContent = translatedText;
  element.dataset.ftTranslated = 'true';

  if (mode === 'translation-only') {
    element.classList.add('ft-hide-original');
  } else {
    element.classList.remove('ft-hide-original');
  }
}

export function switchDisplayMode(mode: DisplayMode): void {
  const translatedElements = document.querySelectorAll<HTMLElement>('[data-ft-translated="true"]');
  translatedElements.forEach((el) => {
    if (mode === 'translation-only') {
      el.classList.add('ft-hide-original');
    } else {
      el.classList.remove('ft-hide-original');
    }
  });
}

export function restoreOriginalPage(): void {
  const transElements = document.querySelectorAll(TRANSLATION_TAG);
  transElements.forEach((el) => el.remove());

  const translatedElements = document.querySelectorAll<HTMLElement>('[data-ft-translated="true"]');
  translatedElements.forEach((el) => {
    delete el.dataset.ftTranslated;
    delete el.dataset.ftTranslating;
    el.classList.remove('ft-hide-original');
  });
}
