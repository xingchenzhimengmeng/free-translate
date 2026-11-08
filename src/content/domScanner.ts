import { findMatchingRule, type SiteRule } from '../services/siteRules';

export const IGNORED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'BUTTON',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'VAR',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'IFRAME',
  'MATH',
  'MJX-CONTAINER',
  'MJX-MATH',
  'FT-TRANSLATION',
]);

export const CANDIDATE_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'BLOCKQUOTE',
  'FIGCAPTION',
  'DD',
  'DT',
  'TD',
  'TH',
  'SUMMARY',
]);

export interface ScanTarget {
  element: HTMLElement;
  text: string;
  formulaNodes?: HTMLElement[];
}

export const MATH_SELECTOR = '.MathJax, .tex-span, .tex-formula, math, mjx-container, .katex';

export function extractTopLevelMath(el: HTMLElement): HTMLElement[] {
  const all = Array.from(el.querySelectorAll<HTMLElement>(MATH_SELECTOR));
  return all.filter((item) => {
    let parent = item.parentElement;
    while (parent && parent !== el) {
      if (parent.matches && parent.matches(MATH_SELECTOR)) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  });
}

export function isElementTranslatable(el: HTMLElement): boolean {
  if (IGNORED_TAGS.has(el.tagName)) return false;
  if (el.getAttribute('translate') === 'no') return false;
  if (el.classList.contains('notranslate')) return false;
  if (el.isContentEditable) return false;
  if (el.dataset.ftTranslated === 'true') return false;
  if (el.dataset.ftTranslating === 'true') return false;
  return true;
}

function getDirectTextContent(el: HTMLElement): string {
  let text = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childEl = node as HTMLElement;
      if (
        childEl.tagName === 'SPAN' ||
        childEl.tagName === 'A' ||
        childEl.tagName === 'B' ||
        childEl.tagName === 'STRONG' ||
        childEl.tagName === 'I' ||
        childEl.tagName === 'EM' ||
        childEl.tagName === 'MARK'
      ) {
        text += childEl.textContent || '';
      }
    }
  }
  return text.trim();
}

export function extractCleanText(el: HTMLElement): string {
  // Fast path if element contains no MathJax, KaTeX or assistive duplicates
  const hasDuplicates = el.querySelector(
    '.MJX_Assistive_MathML, mjx-assistive-mml, .katex-mathml, .MathJax_Preview, script[type^="math/tex"], .annotation, ft-translation'
  );
  if (!hasDuplicates) {
    return (el.innerText || el.textContent || '').trim();
  }

  // Clone node to safely remove duplicate math markup without mutating the real page DOM
  const clone = el.cloneNode(true) as HTMLElement;
  const duplicates = clone.querySelectorAll(
    '.MJX_Assistive_MathML, mjx-assistive-mml, .katex-mathml, .MathJax_Preview, script[type^="math/tex"], .annotation, ft-translation'
  );
  duplicates.forEach((node) => node.remove());

  const clean = (clone.innerText || clone.textContent || '').trim();
  return clean;
}

function hasCandidateChild(el: HTMLElement, prioritySelectors: string[] = []): boolean {
  // If an element contains child block tags, translate those child blocks instead of the container
  const standardChild = el.querySelector(
    'p, h1, h2, h3, h4, h5, h6, blockquote, li, dd, dt, #content-text, .section-title, .title, [data-testid="tweetText"]'
  );
  if (standardChild) return true;

  for (const sel of prioritySelectors) {
    try {
      if (el.querySelector(sel)) return true;
    } catch {}
  }
  return false;
}

export function scanTranslatableElements(
  root: HTMLElement = document.body,
  url: string = typeof window !== 'undefined' ? window.location?.href || '' : ''
): ScanTarget[] {
  const targets: ScanTarget[] = [];
  if (!root) return targets;

  const matchedRule: SiteRule | null = url ? findMatchingRule(url) : null;
  const excludeSelectors = matchedRule?.excludeSelectors || [];
  const prioritySelectors = matchedRule?.selectors || [];

  const filter: NodeFilter = {
    acceptNode(node: Node) {
      const el = node as HTMLElement;
      if (
        IGNORED_TAGS.has(el.tagName) ||
        el.getAttribute('translate') === 'no' ||
        el.classList.contains('notranslate') ||
        el.isContentEditable ||
        el.dataset.ftTranslated === 'true' ||
        el.dataset.ftTranslating === 'true'
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      // Check site-specific exclude selectors
      for (const sel of excludeSelectors) {
        try {
          if (el.matches(sel)) {
            return NodeFilter.FILTER_REJECT;
          }
        } catch {}
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter);
  let el = walker.nextNode() as HTMLElement | null;

  while (el) {
    if (el.dataset.ftTranslated !== 'true' && el.dataset.ftTranslating !== 'true') {
      // Don't scan children inside an element that will be / is translated as #content-text
      if (el.closest('#content-text') && el.id !== 'content-text') {
        el = walker.nextNode() as HTMLElement | null;
        continue;
      }

      // Don't scan descendant children inside a priority container that is already translated as a single unit
      if (prioritySelectors.length > 0) {
        const currentEl = el;
        const isInsideLeafPriorityTarget = prioritySelectors.some((sel) => {
          try {
            const parent = currentEl.closest(sel);
            return parent && parent !== currentEl && !hasCandidateChild(parent as HTMLElement);
          } catch {
            return false;
          }
        });
        if (isInsideLeafPriorityTarget) {
          el = walker.nextNode() as HTMLElement | null;
          continue;
        }
      }

      let isCandidate = CANDIDATE_TAGS.has(el.tagName);

      // Check site-specific priority selectors first
      if (!isCandidate && prioritySelectors.length > 0) {
        for (const sel of prioritySelectors) {
          try {
            if (el.matches(sel)) {
              if (!hasCandidateChild(el, prioritySelectors)) {
                isCandidate = true;
              }
              break;
            }
          } catch {}
        }
      }

      // Fallback for YouTube comments and video title
      if (!isCandidate && (el.id === 'content-text' || (el.classList.contains('yt-core-attributed-string') && !el.closest('#content-text')))) {
        isCandidate = true;
      }

      // Codeforces & general section titles / headings
      if (
        !isCandidate &&
        (el.classList.contains('section-title') ||
          el.classList.contains('title') ||
          el.classList.contains('property-title') ||
          el.getAttribute('role') === 'heading')
      ) {
        if (!hasCandidateChild(el, prioritySelectors)) {
          isCandidate = true;
        }
      }

      // If it is a container like BLOCKQUOTE or LI or DIV, ensure it doesn't contain nested candidate tags that will be translated separately
      if (isCandidate && (el.tagName === 'BLOCKQUOTE' || el.tagName === 'TD' || el.tagName === 'TH' || el.tagName === 'LI' || el.tagName === 'DIV')) {
        if (hasCandidateChild(el, prioritySelectors)) {
          isCandidate = false;
        }
      }

      if (!isCandidate && (el.tagName === 'DIV' || el.tagName === 'SPAN')) {
        if (!hasCandidateChild(el, prioritySelectors)) {
          const directText = getDirectTextContent(el);
          if (directText.length >= 20 && /[a-zA-Z\u4e00-\u9fa5]{2,}/.test(directText)) {
            isCandidate = true;
          }
        }
      }

      if (isCandidate) {
        // Filter out paragraphs that only contain images (like shields badges)
        const hasOnlyImages = el.querySelectorAll('img, svg').length > 0 && getDirectTextContent(el).length === 0;
        if (!hasOnlyImages) {
          const topMath = extractTopLevelMath(el);
          if (topMath.length > 0) {
            // Formula-rich element: preserve exact rendered math nodes and replace with [#i#] tokens
            const clone = el.cloneNode(true) as HTMLElement;
            const cloneMath = extractTopLevelMath(clone);
            const formulaNodes: HTMLElement[] = [];

            cloneMath.forEach((node, i) => {
              if (topMath[i]) {
                formulaNodes.push(topMath[i].cloneNode(true) as HTMLElement);
                const placeholder = document.createTextNode(` [#${i}#] `);
                node.parentNode?.replaceChild(placeholder, node);
              }
            });

            // Remove any assistive or preview duplicates left in the clone
            clone.querySelectorAll(
              '.MJX_Assistive_MathML, mjx-assistive-mml, .katex-mathml, .MathJax_Preview, script[type^="math/tex"], .annotation, ft-translation'
            ).forEach((n) => n.remove());

            const fullText = (clone.innerText || clone.textContent || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (fullText.length >= 2 && /[^\d\s\W]/.test(fullText)) {
              targets.push({ element: el, text: fullText, formulaNodes });
            }
          } else {
            const fullText = extractCleanText(el);
            if (fullText.length >= 2 && /[^\d\s\W]/.test(fullText)) {
              targets.push({ element: el, text: fullText });
            }
        }
        }
      }
    }

    el = walker.nextNode() as HTMLElement | null;
  }

  return targets;
}
