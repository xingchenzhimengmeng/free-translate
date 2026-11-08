import { defineContentScript } from 'wxt/sandbox';
import { getSettings } from '@/utils/storage';
import { createFloatButton } from '@/content/floatButton';
import { initSelectionTranslator, showTranslationCard } from '@/content/selectionPopup';
import {
  setDisplayMode,
  togglePageTranslation,
  translateCurrentPage,
} from '@/content/pageTranslator';
import { ensureGlobalStyles, updateGlobalTranslationColor } from '@/content/domTranslator';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    const settings = await getSettings();
    ensureGlobalStyles(window.location.href, settings.translationColorTheme, settings.customColorHex);

    // Listen for storage changes to update translation color in real-time
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.free_translate_settings) {
          const next = changes.free_translate_settings.newValue;
          if (next?.translationColorTheme) {
            updateGlobalTranslationColor(next.translationColorTheme, next.customColorHex);
          }
        }
      });
    }
    const currentHost = window.location.hostname;

    // Check never-translate domains
    const isBlocked = settings.neverTranslateDomains.some((d) =>
      currentHost.includes(d),
    );
    if (isBlocked) {
      return;
    }

    // Mount float button if enabled
    if (settings.enableFloatButton) {
      createFloatButton();
    }

    // Mount selection translator if enabled
    if (settings.enableSelectionTranslate) {
      initSelectionTranslator();
    }

    // Auto-translate if on always-translate list
    const shouldAutoTranslate = settings.alwaysTranslateDomains.some((d) =>
      currentHost.includes(d),
    );
    if (shouldAutoTranslate) {
      setTimeout(() => {
        translateCurrentPage();
      }, 1000);
    }

    // Listen for extension messages
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'TOGGLE_PAGE_TRANSLATION') {
        togglePageTranslation();
        sendResponse({ success: true });
        return true;
      }

      if (message.type === 'SWITCH_DISPLAY_MODE') {
        setDisplayMode(message.payload.mode);
        sendResponse({ success: true });
        return true;
      }

      if (message.type === 'TRANSLATE_SELECTION') {
        const text = message.payload?.text;
        if (text) {
          showTranslationCard(window.innerWidth / 2 - 160, 100, text);
        }
        sendResponse({ success: true });
        return true;
      }
    });
  },
});
