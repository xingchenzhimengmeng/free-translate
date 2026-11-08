export type TranslationServiceId =
  | 'chrome-local'
  | 'microsoft-free'
  | 'google-free'
  | 'deepl'
  | 'gemini'
  | 'baidu'
  | 'openai-compatible';

export type DisplayMode = 'dual' | 'translation-only';

export type TranslationColorTheme =
  | 'blue'
  | 'emerald'
  | 'purple'
  | 'amber'
  | 'rose'
  | 'slate'
  | 'indigo'
  | 'custom';

export type LocalTranslatorStatus =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unsupported'
  | 'unknown';

export interface UserSettings {
  targetLanguage: string;
  defaultService: TranslationServiceId;
  displayMode: DisplayMode;
  translationColorTheme: TranslationColorTheme;
  customColorHex?: string;
  enableFallback: boolean;
  enableAIContext: boolean;
  enableFloatButton: boolean;
  enableSelectionTranslate: boolean;
  alwaysTranslateDomains: string[];
  neverTranslateDomains: string[];
}

export interface UserCredentials {
  deeplApiKey: string;
  geminiApiKey: string;
  geminiModel: string;
  baiduAppId: string;
  baiduSecretKey: string;
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;
}

export interface TranslateContext {
  pageTitle?: string;
  previousTexts?: string[];
  previousTranslations?: string[];
}

export interface TranslateRequest {
  texts: string[];
  from: string;
  to: string;
  service?: TranslationServiceId;
  bypassCache?: boolean;
  context?: TranslateContext;
}

export interface TranslateResult {
  translations: string[];
  serviceUsed: TranslationServiceId;
  fallbackOccurred: boolean;
  error?: string;
}

export interface RuntimeMessage<T = unknown> {
  type: string;
  payload?: T;
}
