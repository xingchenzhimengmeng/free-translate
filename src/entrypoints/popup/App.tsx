import React, { useEffect, useState } from 'react';
import {
  Languages,
  Settings,
  RotateCcw,
  Globe,
  Cpu,
  Layers,
  Check,
  FileText,
} from 'lucide-react';
import type { LocalTranslatorStatus, TranslationServiceId, UserSettings } from '@/types';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '@/utils/storage';
import { SUPPORTED_LANGUAGES } from '@/services/languages';
import { checkChromeTranslatorStatus } from '@/services/engines/chromeLocal';

const SERVICE_NAMES: Record<TranslationServiceId, string> = {
  'chrome-local': 'Chrome 本地模型 (免费)',
  'microsoft-free': 'Microsoft (免费)',
  'google-free': 'Google (免费)',
  deepl: 'DeepL 翻译',
  gemini: 'Google Gemini',
  baidu: '百度翻译',
  'openai-compatible': 'OpenAI 兼容 / DeepSeek',
};

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [localStatus, setLocalStatus] = useState<LocalTranslatorStatus>('unknown');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
    checkChromeTranslatorStatus().then(setLocalStatus);

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url;
        if (url) {
          try {
            const domain = new URL(url).hostname;
            setCurrentDomain(domain);
          } catch {
            // Ignore invalid URLs (like chrome://)
          }
        }
      });
    }
  }, []);

  const handleToggleTranslate = () => {
    setIsTranslating(true);
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_PAGE_TRANSLATION' }, () => {
            setIsTranslating(false);
          });
        } else {
          setIsTranslating(false);
        }
      });
    } else {
      setTimeout(() => setIsTranslating(false), 500);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    saveSettings({ targetLanguage: newLang }).then(setSettings);
  };

  const handleServiceChange = (newService: TranslationServiceId) => {
    saveSettings({ defaultService: newService }).then(setSettings);
  };

  const handleModeChange = (newMode: 'dual' | 'translation-only') => {
    saveSettings({ displayMode: newMode }).then((updated) => {
      setSettings(updated);
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs[0]?.id;
          if (tabId) {
            chrome.tabs.sendMessage(tabId, {
              type: 'SWITCH_DISPLAY_MODE',
              payload: { mode: newMode },
            });
          }
        });
      }
    });
  };

  const isAlwaysTranslate = Boolean(
    currentDomain && settings.alwaysTranslateDomains.includes(currentDomain),
  );

  const handleToggleAlwaysTranslate = () => {
    if (!currentDomain) return;
    const next = isAlwaysTranslate
      ? settings.alwaysTranslateDomains.filter((d) => d !== currentDomain)
      : [...settings.alwaysTranslateDomains, currentDomain];
    saveSettings({ alwaysTranslateDomains: next }).then(setSettings);
  };

  const openOptions = () => {
    const url = typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('options.html')
      : '/options.html';
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const openDocumentStudio = () => {
    const url = typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('document.html')
      : '/document.html';
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Languages size={20} color="#2563eb" />
          <span style={{ fontWeight: 700, fontSize: '15px' }}>Free Translate</span>
        </div>
        <button
          onClick={openOptions}
          title="打开设置"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Main Action Button */}
      <button
        onClick={handleToggleTranslate}
        disabled={isTranslating}
        style={{
          background: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: isTranslating ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
        }}
      >
        {isTranslating ? (
          <span>正在处理...</span>
        ) : (
          <>
            <RotateCcw size={16} />
            <span>翻译 / 恢复当前网页 (Alt+A)</span>
          </>
        )}
      </button>

      {/* Document Typesetting Studio Entry */}
      <button
        onClick={openDocumentStudio}
        style={{
          background: '#f1f5f9',
          color: '#334155',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        <FileText size={15} color="#2563eb" />
        <span>PDF / EPUB 文档双语排版中心</span>
      </button>

      {/* Display Mode Segmented Control */}
      <div
        style={{
          display: 'flex',
          background: '#e2e8f0',
          borderRadius: '8px',
          padding: '2px',
          fontSize: '12px',
        }}
      >
        <button
          onClick={() => handleModeChange('dual')}
          style={{
            flex: 1,
            padding: '6px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: settings.displayMode === 'dual' ? '#ffffff' : 'transparent',
            fontWeight: settings.displayMode === 'dual' ? 600 : 400,
            color: '#0f172a',
            boxShadow: settings.displayMode === 'dual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          双语对照
        </button>
        <button
          onClick={() => handleModeChange('translation-only')}
          style={{
            flex: 1,
            padding: '6px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: settings.displayMode === 'translation-only' ? '#ffffff' : 'transparent',
            fontWeight: settings.displayMode === 'translation-only' ? 600 : 400,
            color: '#0f172a',
            boxShadow: settings.displayMode === 'translation-only' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          仅看译文
        </button>
      </div>

      {/* Target Language Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Globe size={14} /> 目标语言
        </label>
        <select
          value={settings.targetLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          style={{
            padding: '7px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontSize: '13px',
            outline: 'none',
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.code})
            </option>
          ))}
        </select>
      </div>

      {/* Translation Engine Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Layers size={14} /> 翻译服务引擎
        </label>
        <select
          value={settings.defaultService}
          onChange={(e) => handleServiceChange(e.target.value as TranslationServiceId)}
          style={{
            padding: '7px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontSize: '13px',
            outline: 'none',
          }}
        >
          {Object.entries(SERVICE_NAMES).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Local Model Status Chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          background: '#f1f5f9',
          borderRadius: '6px',
          fontSize: '11px',
          color: '#475569',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Cpu size={14} /> Chrome 本地大模型
        </span>
        <span
          style={{
            fontWeight: 600,
            color:
              localStatus === 'available'
                ? '#16a34a'
                : localStatus === 'downloadable'
                  ? '#d97706'
                  : '#94a3b8',
          }}
        >
          {localStatus === 'available'
            ? '本地可用'
            : localStatus === 'downloadable'
              ? '待下载模型'
              : '当前环境未启用'}
        </span>
      </div>

      {/* Site Rules Shortcut */}
      {currentDomain && (
        <div
          onClick={handleToggleAlwaysTranslate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#334155',
            cursor: 'pointer',
            paddingTop: '2px',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              border: '1px solid #94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isAlwaysTranslate ? '#2563eb' : 'transparent',
              borderColor: isAlwaysTranslate ? '#2563eb' : '#94a3b8',
              color: '#ffffff',
            }}
          >
            {isAlwaysTranslate && <Check size={12} strokeWidth={3} />}
          </div>
          <span>总是自动翻译 {currentDomain}</span>
        </div>
      )}
    </div>
  );
}
