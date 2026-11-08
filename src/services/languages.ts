export interface LanguageOption {
  code: string;
  name: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁体中文' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'it', name: '意大利语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'ar', name: '阿拉伯语' },
];

export function normalizeLanguageCode(code: string): string {
  if (!code) return 'en';
  const lower = code.toLowerCase().trim();
  if (lower.startsWith('zh-cn') || lower === 'zh' || lower === 'zh-hans') return 'zh-CN';
  if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower === 'zh-hant') return 'zh-TW';
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('ko')) return 'ko';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('it')) return 'it';
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('ar')) return 'ar';
  return lower.split('-')[0] || lower;
}

export function toBaiduLang(code: string): string {
  const norm = normalizeLanguageCode(code);
  if (norm === 'zh-CN') return 'zh';
  if (norm === 'zh-TW') return 'cht';
  if (norm === 'ja') return 'jp';
  if (norm === 'ko') return 'kor';
  if (norm === 'es') return 'spa';
  if (norm === 'fr') return 'fra';
  if (norm === 'ar') return 'ara';
  return norm;
}

export function toDeepLLang(code: string): string {
  const norm = normalizeLanguageCode(code);
  if (norm === 'zh-CN' || norm === 'zh-TW') return 'ZH';
  if (norm === 'en') return 'EN-US';
  return norm.toUpperCase();
}
