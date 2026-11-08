import { defineBackground } from 'wxt/sandbox';
import type { TranslateRequest, TranslateResult } from '@/types';
import { clearCache } from '@/services/cache';
import { dispatchTranslate, ENGINES } from '@/services/engines/dispatcher';

export default defineBackground(() => {
  // Setup context menu
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'free-translate-selection',
      title: '翻译选中文本',
      contexts: ['selection'],
    });
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'free-translate-selection' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TRANSLATE_SELECTION',
        payload: { text: info.selectionText || '' },
      });
    }
  });

  // Handle keyboard commands (Alt+A)
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-translate') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, {
            type: 'TOGGLE_PAGE_TRANSLATION',
          });
        }
      });
    }
  });

  // Handle messages from content script or popup/options
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'TRANSLATE') {
      const req = message.payload as TranslateRequest;
      dispatchTranslate(req)
        .then((result: TranslateResult) => {
          sendResponse({ success: true, data: result });
        })
        .catch((err: Error) => {
          sendResponse({ success: false, error: err.message || '翻译失败' });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === 'TEST_SERVICE') {
      const { service } = message.payload as { service: string };
      const engine = ENGINES[service as keyof typeof ENGINES];
      if (!engine) {
        sendResponse({ success: false, error: '未知翻译引擎' });
        return true;
      }
      engine
        .translate(['Hello, welcome to Free Translate!'], 'en', 'zh-CN')
        .then((res) => {
          sendResponse({ success: true, data: res[0] });
        })
        .catch((err: Error) => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (message.type === 'CLEAR_CACHE') {
      clearCache()
        .then(() => sendResponse({ success: true }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      return true;
    }
  });
});
