import type { UserCredentials, UserSettings } from '../types';

export const DEFAULT_SETTINGS: UserSettings = {
  targetLanguage: 'zh-CN',
  defaultService: 'chrome-local',
  displayMode: 'dual',
  translationColorTheme: 'blue',
  customColorHex: '#2563eb',
  enableFallback: true,
  enableAIContext: true,
  enableFloatButton: true,
  enableSelectionTranslate: true,
  alwaysTranslateDomains: [],
  neverTranslateDomains: [],
};

export const DEFAULT_CREDENTIALS: UserCredentials = {
  deeplApiKey: '',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
  baiduAppId: '',
  baiduSecretKey: '',
  openaiBaseUrl: 'https://api.deepseek.com/v1',
  openaiApiKey: '',
  openaiModel: 'deepseek-chat',
};

const SETTINGS_KEY = 'free_translate_settings';
const CREDENTIALS_KEY = 'free_translate_credentials';

const memoryStore: Record<string, unknown> = {};

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage);
}

export async function getSettings(): Promise<UserSettings> {
  if (!hasChromeStorage()) {
    const saved = memoryStore[SETTINGS_KEY] as Partial<UserSettings> | undefined;
    return { ...DEFAULT_SETTINGS, ...saved };
  }
  return new Promise((resolve) => {
    const storageArea = chrome.storage.sync || chrome.storage.local;
    storageArea.get(SETTINGS_KEY, (result) => {
      const saved = result?.[SETTINGS_KEY] as Partial<UserSettings> | undefined;
      resolve({ ...DEFAULT_SETTINGS, ...saved });
    });
  });
}

export async function saveSettings(
  updates: Partial<UserSettings>,
): Promise<UserSettings> {
  const current = await getSettings();
  const next: UserSettings = { ...current, ...updates };
  if (!hasChromeStorage()) {
    memoryStore[SETTINGS_KEY] = next;
    return next;
  }
  return new Promise((resolve) => {
    const storageArea = chrome.storage.sync || chrome.storage.local;
    storageArea.set({ [SETTINGS_KEY]: next }, () => resolve(next));
  });
}

export async function getCredentials(): Promise<UserCredentials> {
  if (!hasChromeStorage()) {
    const saved = memoryStore[CREDENTIALS_KEY] as Partial<UserCredentials> | undefined;
    return { ...DEFAULT_CREDENTIALS, ...saved };
  }
  return new Promise((resolve) => {
    chrome.storage.local.get(CREDENTIALS_KEY, (result) => {
      const saved = result?.[CREDENTIALS_KEY] as Partial<UserCredentials> | undefined;
      resolve({ ...DEFAULT_CREDENTIALS, ...saved });
    });
  });
}

export async function saveCredentials(
  updates: Partial<UserCredentials>,
): Promise<UserCredentials> {
  const current = await getCredentials();
  const next: UserCredentials = { ...current, ...updates };
  if (!hasChromeStorage()) {
    memoryStore[CREDENTIALS_KEY] = next;
    return next;
  }
  return new Promise((resolve) => {
    chrome.storage.local.set({ [CREDENTIALS_KEY]: next }, () => resolve(next));
  });
}
