import type { TranslateResult } from '@/types';
import { getSettings } from '@/utils/storage';

const HOST_ID = 'ft-selection-popup-root';
const TRIGGER_ID = 'ft-selection-trigger-icon';
let activeHost: HTMLElement | null = null;
let triggerIcon: HTMLElement | null = null;

export function removePopup(): void {
  if (activeHost) {
    activeHost.remove();
    activeHost = null;
  }
  if (triggerIcon) {
    triggerIcon.remove();
    triggerIcon = null;
  }
}

export function initSelectionTranslator(): void {
  // 1. Dismiss popups when clicking anywhere outside
  document.addEventListener('mousedown', (e) => {
    const target = e.target as Node;
    if (activeHost && (activeHost === target || activeHost.contains(target))) {
      return;
    }
    if (triggerIcon && (triggerIcon === target || triggerIcon.contains(target))) {
      return;
    }
    removePopup();
  });

  // 2. Detect text selection on mouseup
  document.addEventListener('mouseup', (e) => {
    const target = e.target as Node;
    if (activeHost && (activeHost === target || activeHost.contains(target))) {
      return;
    }
    if (triggerIcon && (triggerIcon === target || triggerIcon.contains(target))) {
      return;
    }

    setTimeout(async () => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';

      if (!text || text.length < 1 || text.length > 2500) {
        return;
      }

      // Must contain at least one readable alphanumeric or CJK character
      if (!/[a-zA-Z0-9\u4e00-\u9fa5\u3040-\u30ff]/.test(text)) {
        return;
      }

      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (!range) return;
      const rects = range.getClientRects();
      const lastRect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();
      if (!lastRect || (lastRect.width === 0 && lastRect.height === 0)) return;

      showTriggerIcon(lastRect.right + 6, lastRect.bottom + 6, text);
    }, 20);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removePopup();
    }
  });
}

function showTriggerIcon(x: number, y: number, text: string): void {
  removePopup();

  triggerIcon = document.createElement('div');
  triggerIcon.id = TRIGGER_ID;
  const posX = Math.max(10, Math.min(x, window.innerWidth - 38));
  const posY = Math.max(10, Math.min(y, window.innerHeight - 38));
  triggerIcon.style.cssText = `
    all: initial;
    position: fixed;
    left: ${posX}px;
    top: ${posY}px;
    width: 28px;
    height: 28px;
    background: #2563eb;
    color: white;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    z-index: 2147483647;
    transition: transform 0.15s ease;
    user-select: none;
  `;
  triggerIcon.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  `;
  triggerIcon.title = 'Free Translate - 划词翻译';

  // Intercept mousedown & mouseup to prevent clearing selection
  triggerIcon.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  triggerIcon.addEventListener('mouseup', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  triggerIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    showTranslationCard(x, y, text);
  });

  document.body.appendChild(triggerIcon);
}

export async function showTranslationCard(
  x: number,
  y: number,
  text: string,
): Promise<void> {
  removePopup();

  const host = document.createElement('div');
  host.id = HOST_ID;
  const cardWidth = 320;
  const cardHeight = 240;
  const posX = Math.max(16, Math.min(x, window.innerWidth - cardWidth - 16));
  const posY = Math.max(16, Math.min(y, window.innerHeight - cardHeight - 16));
  host.style.cssText = `
    all: initial;
    position: fixed;
    left: ${posX}px;
    top: ${posY}px;
    z-index: 2147483647;
  `;
  host.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  document.body.appendChild(host);
  activeHost = host;

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    .card {
      width: 320px;
      max-height: 380px;
      background: #ffffff;
      color: #1e293b;
      border-radius: 10px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
    }
    @media (prefers-color-scheme: dark) {
      .card {
        background: #0f172a;
        color: #f8fafc;
        border-color: #334155;
      }
      .header { border-bottom-color: #334155; }
      .source { background: #1e293b; color: #94a3b8; }
      .footer { border-top-color: #334155; }
    }
    .header {
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      font-weight: 600;
      font-size: 12px;
    }
    .engine-tag {
      font-size: 11px;
      color: #2563eb;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
    }
    .close-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .source {
      padding: 8px 12px;
      background: #f8fafc;
      color: #64748b;
      font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
      max-height: 80px;
      overflow-y: auto;
      word-break: break-word;
    }
    .result {
      padding: 12px;
      flex: 1;
      overflow-y: auto;
      line-height: 1.6;
      word-break: break-word;
      min-height: 60px;
    }
    .footer {
      padding: 6px 12px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
    }
    .copy-btn {
      background: #f1f5f9;
      border: none;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
      color: #334155;
    }
    .copy-btn:hover {
      background: #e2e8f0;
    }
    .loading {
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `;
  shadow.appendChild(style);

  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <div class="header">
      <span class="engine-tag">翻译中...</span>
      <button class="close-btn">✕</button>
    </div>
    <div class="source">${escapeHtml(text.slice(0, 150))}${text.length > 150 ? '...' : ''}</div>
    <div class="result"><span class="loading">正在获取翻译...</span></div>
    <div class="footer">
      <button class="copy-btn">复制译文</button>
    </div>
  `;

  shadow.appendChild(card);

  card.querySelector('.close-btn')?.addEventListener('click', removePopup);

  const settings = await getSettings();
  const targetLang = settings.targetLanguage || 'zh-CN';

  chrome.runtime.sendMessage(
    {
      type: 'TRANSLATE',
      payload: {
        texts: [text],
        from: 'auto',
        to: targetLang,
      },
    },
    (response) => {
      const tagEl = card.querySelector<HTMLElement>('.engine-tag');
      const resultEl = card.querySelector<HTMLElement>('.result');
      const copyBtn = card.querySelector<HTMLButtonElement>('.copy-btn');

      if (response?.success && response.data) {
        const res = response.data as TranslateResult;
        if (tagEl) tagEl.textContent = res.serviceUsed;
        const translation = res.translations[0] || text;
        if (resultEl) resultEl.textContent = translation;

        copyBtn?.addEventListener('click', () => {
          const onCopied = () => {
            if (copyBtn) {
              copyBtn.textContent = '已复制!';
              setTimeout(() => {
                copyBtn.textContent = '复制译文';
              }, 1500);
            }
          };
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(translation).then(onCopied).catch(() => {});
          } else {
            const ta = document.createElement('textarea');
            ta.value = translation;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch {}
            ta.remove();
            onCopied();
          }
        });
      } else {
        if (tagEl) tagEl.textContent = '错误';
        if (resultEl) {
          resultEl.textContent = response?.error || '翻译失败，请稍后重试';
          resultEl.style.color = '#ef4444';
        }
      }
    },
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
