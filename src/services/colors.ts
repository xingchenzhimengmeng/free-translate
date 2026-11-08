import type { TranslationColorTheme } from '../types';

export interface ColorPalette {
  id: TranslationColorTheme;
  name: string;
  primary: string;
  border: string;
  darkPrimary: string;
  darkBorder: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'blue',
    name: '经典科技蓝',
    primary: '#2563eb',
    border: '#93c5fd',
    darkPrimary: '#60a5fa',
    darkBorder: '#1d4ed8',
  },
  {
    id: 'emerald',
    name: '极客森林绿',
    primary: '#059669',
    border: '#6ee7b7',
    darkPrimary: '#34d399',
    darkBorder: '#065f46',
  },
  {
    id: 'purple',
    name: '优雅神秘紫',
    primary: '#7c3aed',
    border: '#c4b5fd',
    darkPrimary: '#a78bfa',
    darkBorder: '#5b21b6',
  },
  {
    id: 'amber',
    name: '暖金琥珀橙',
    primary: '#d97706',
    border: '#fcd34d',
    darkPrimary: '#fbbf24',
    darkBorder: '#92400e',
  },
  {
    id: 'rose',
    name: '活力玫瑰粉',
    primary: '#e11d48',
    border: '#fda4af',
    darkPrimary: '#fb7185',
    darkBorder: '#9f1239',
  },
  {
    id: 'slate',
    name: '低调素雅灰',
    primary: '#475569',
    border: '#cbd5e1',
    darkPrimary: '#94a3b8',
    darkBorder: '#334155',
  },
  {
    id: 'indigo',
    name: '沉浸靛青蓝',
    primary: '#4f46e5',
    border: '#a5b4fc',
    darkPrimary: '#818cf8',
    darkBorder: '#3730a3',
  },
];

export function resolveColors(
  theme: TranslationColorTheme = 'blue',
  customHex: string = '#2563eb'
): {
  textColor: string;
  borderColor: string;
  darkTextColor: string;
  darkBorderColor: string;
} {
  if (theme === 'custom' && customHex) {
    return {
      textColor: customHex,
      borderColor: customHex,
      darkTextColor: customHex,
      darkBorderColor: customHex,
    };
  }

  const found = COLOR_PALETTES.find((p) => p.id === theme) || COLOR_PALETTES[0];
  return {
    textColor: found.primary,
    borderColor: found.border,
    darkTextColor: found.darkPrimary,
    darkBorderColor: found.darkBorder,
  };
}
