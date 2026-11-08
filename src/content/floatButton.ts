import { getPageTranslationState, togglePageTranslation } from './pageTranslator';

const CONTAINER_ID = 'ft-float-button-root';

export function createFloatButton(): void {
  if (document.getElementById(CONTAINER_ID)) return;

  const host = document.createElement('div');
  host.id = CONTAINER_ID;
  host.style.cssText = `
    all: initial;
    position: fixed;
    right: 20px;
    bottom: 90px;
    z-index: 2147483646;
  `;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    .ft-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #2563eb;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      border: none;
      outline: none;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease;
      user-select: none;
    }
    .ft-btn:hover {
      transform: scale(1.08);
      background: #1d4ed8;
    }
    .ft-btn:active {
      transform: scale(0.95);
    }
    .ft-btn.translated {
      background: #059669;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);
    }
    .ft-btn.translating {
      background: #475569;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    svg {
      width: 20px;
      height: 20px;
      stroke-width: 2;
      stroke: currentColor;
      fill: none;
    }
  `;
  shadow.appendChild(style);

  const button = document.createElement('button');
  button.className = 'ft-btn';
  button.title = 'Free Translate - 双语翻译此页 (Alt+A)';

  const translateIconSvg = `
    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  `;

  const restoreIconSvg = `
    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  `;

  function updateButtonState(): void {
    const { isTranslating, isTranslated } = getPageTranslationState();
    button.className = 'ft-btn';
    if (isTranslating) {
      button.classList.add('translating');
      button.innerHTML = '<div class="spinner"></div>';
      button.title = '正在翻译网页...';
    } else if (isTranslated) {
      button.classList.add('translated');
      button.innerHTML = restoreIconSvg;
      button.title = '点击恢复网页原文';
    } else {
      button.innerHTML = translateIconSvg;
      button.title = '点击双语翻译此页 (Alt+A)';
    }
  }

  button.addEventListener('click', () => {
    togglePageTranslation();
    updateButtonState();
    // Check again shortly in case translation takes time
    const interval = setInterval(() => {
      updateButtonState();
      const state = getPageTranslationState();
      if (!state.isTranslating) {
        clearInterval(interval);
      }
    }, 400);
  });

  updateButtonState();
  shadow.appendChild(button);
}
