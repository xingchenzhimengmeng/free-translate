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
      margin-top: 8px !important;
      margin-bottom: 6px !important;
      color: ${textColor} !important;
      font-size: 0.95em !important;
      line-height: 1.7 !important;
      opacity: 0.92 !important;
      border-left: 2px solid ${borderColor} !important;
      padding-left: 10px !important;
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
    /* MathJax & KaTeX typography and color protection inside translations */
    ${TRANSLATION_TAG} .MJX_Assistive_MathML,
    ${TRANSLATION_TAG} mjx-assistive-mml,
    ${TRANSLATION_TAG} .MathJax_Preview {
      display: none !important;
    }
    ${TRANSLATION_TAG} .MathJax,
    ${TRANSLATION_TAG} .tex-span,
    ${TRANSLATION_TAG} .tex-formula,
    ${TRANSLATION_TAG} mjx-container,
    ${TRANSLATION_TAG} .katex {
      color: inherit !important;
      display: inline-block !important;
      vertical-align: baseline !important;
      margin: 0 2px !important;
    }
    ${TRANSLATION_TAG} svg,
    ${TRANSLATION_TAG} svg path {
      fill: currentColor !important;
      stroke: currentColor !important;
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
      margin-top: 0 !important;
      margin-bottom: 0 !important;
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

export function cleanAndStyleFormulaNode(node: HTMLElement, targetColor: string): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;

  // 1. Remove all assistive MathML, previews, and scripts from clone to prevent ghost overlap
  clone
    .querySelectorAll(
      '.MJX_Assistive_MathML, mjx-assistive-mml, .katex-mathml, .MathJax_Preview, script, .annotation'
    )
    .forEach((n) => n.remove());

  // 2. Remove duplicate IDs to prevent stylesheet/math collision
  if (clone.id) clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));

  // 3. Set natural baseline flow on the root formula node
  clone.style.display = 'inline-block';
  clone.style.verticalAlign = 'baseline';
  clone.style.margin = '0 2px';

  // 4. Force uniform color matching the translation font
  clone.style.setProperty('color', targetColor, 'important');
  clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.setProperty('color', targetColor, 'important');
  });

  return clone;
}

export function injectTranslation(
  element: HTMLElement,
  translatedText: string,
  mode: DisplayMode = 'dual',
  formulaNodes?: HTMLElement[],
): void {
  ensureGlobalStyles();
  const activeColor = resolveColors(activeTheme, activeCustomHex).textColor;

  // Check if translation already exists
  let transEl = element.querySelector<HTMLElement>(TRANSLATION_TAG);
  if (!transEl) {
    transEl = document.createElement(TRANSLATION_TAG);
    element.appendChild(transEl);
  }

  // Clear previous contents
  transEl.textContent = '';

  if (formulaNodes && formulaNodes.length > 0) {
    const tokenRegex = /\[#\s*(\d+)\s*#\]/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(translatedText)) !== null) {
      const textBefore = translatedText.slice(lastIdx, match.index);
      if (textBefore) {
        transEl.appendChild(document.createTextNode(textBefore));
      }
      const formulaIdx = parseInt(match[1], 10);
      if (formulaNodes[formulaIdx]) {
        const renderedFormula = cleanAndStyleFormulaNode(formulaNodes[formulaIdx], activeColor);
        transEl.appendChild(renderedFormula);
      }
      lastIdx = match.index + match[0].length;
    }
    const textAfter = translatedText.slice(lastIdx);
    if (textAfter) {
      transEl.appendChild(document.createTextNode(textAfter));
    }
  } else {
    transEl.textContent = translatedText;
  }

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
