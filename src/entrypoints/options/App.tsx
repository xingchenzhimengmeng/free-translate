import React, { useEffect, useState } from 'react';
import {
  Key,
  Sliders,
  Globe,
  Database,
  Check,
  AlertCircle,
  RefreshCw,
  Cpu,
  Trash2,
  Plus,
  ExternalLink,
  Palette,
} from 'lucide-react';
import type {
  LocalTranslatorStatus,
  UserCredentials,
  UserSettings,
  TranslationColorTheme,
} from '@/types';
import {
  DEFAULT_CREDENTIALS,
  DEFAULT_SETTINGS,
  getCredentials,
  getSettings,
  saveCredentials,
  saveSettings,
} from '@/utils/storage';
import { SUPPORTED_LANGUAGES } from '@/services/languages';
import { checkChromeTranslatorStatus } from '@/services/engines/chromeLocal';
import { COLOR_PALETTES, resolveColors } from '@/services/colors';

type TabType = 'services' | 'general' | 'sites' | 'cache';

const OPENAI_PRESETS = [
  {
    name: 'DeepSeek (深度求索)',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  {
    name: 'SiliconFlow (硅基流动)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
  },
  {
    name: 'OpenRouter (聚合大模型)',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.0-flash-001',
  },
  {
    name: 'Ollama (本地私有部署)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [credentials, setCredentials] = useState<UserCredentials>(DEFAULT_CREDENTIALS);
  const [chromeStatus, setChromeStatus] = useState<LocalTranslatorStatus>('unknown');
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testingService, setTestingService] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [alwaysInput, setAlwaysInput] = useState('');
  const [neverInput, setNeverInput] = useState('');

  useEffect(() => {
    getSettings().then(setSettings);
    getCredentials().then(setCredentials);
    checkChromeTranslatorStatus().then(setChromeStatus);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const next = await saveSettings(updates);
    setSettings(next);
    showToast('设置已自动保存');
  };

  const updateCredentials = async (updates: Partial<UserCredentials>) => {
    const next = await saveCredentials(updates);
    setCredentials(next);
    showToast('API 凭证已保存');
  };

  const handleTestService = (service: string) => {
    setTestingService(service);
    chrome.runtime.sendMessage(
      { type: 'TEST_SERVICE', payload: { service } },
      (res) => {
        setTestingService(null);
        if (res?.success) {
          setTestResults((prev) => ({
            ...prev,
            [service]: { success: true, message: `连接成功！译文：${res.data}` },
          }));
        } else {
          setTestResults((prev) => ({
            ...prev,
            [service]: { success: false, message: res?.error || '连接失败，请检查配置' },
          }));
        }
      },
    );
  };

  const handleClearCache = () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, (res) => {
      if (res?.success) {
        showToast('本地翻译缓存已清空');
      }
    });
  };

  const addAlwaysDomain = () => {
    const d = alwaysInput.trim().toLowerCase();
    if (!d || settings.alwaysTranslateDomains.includes(d)) return;
    updateSettings({ alwaysTranslateDomains: [...settings.alwaysTranslateDomains, d] });
    setAlwaysInput('');
  };

  const removeAlwaysDomain = (domain: string) => {
    updateSettings({
      alwaysTranslateDomains: settings.alwaysTranslateDomains.filter((item) => item !== domain),
    });
  };

  const addNeverDomain = () => {
    const d = neverInput.trim().toLowerCase();
    if (!d || settings.neverTranslateDomains.includes(d)) return;
    updateSettings({ neverTranslateDomains: [...settings.neverTranslateDomains, d] });
    setNeverInput('');
  };

  const removeNeverDomain = (domain: string) => {
    updateSettings({
      neverTranslateDomains: settings.neverTranslateDomains.filter((item) => item !== domain),
    });
  };

  return (
    <div style={{ maxWidth: '860px', margin: '32px auto', padding: '0 20px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>
            Free Translate 设置
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
            管理您的自定义 API Key、翻译引擎链以及站点自动翻译规则
          </p>
        </div>
        {toastMsg && (
          <div
            style={{
              background: '#10b981',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}
          >
            <Check size={16} /> {toastMsg}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px',
          marginBottom: '24px',
        }}
      >
        {[
          { id: 'services', label: '翻译引擎与 API Key', icon: Key },
          { id: 'general', label: '通用偏好', icon: Sliders },
          { id: 'sites', label: '站点规则', icon: Globe },
          { id: 'cache', label: '缓存与维护', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? '#2563eb' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Services */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Chrome Local Translator Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={20} color="#2563eb" />
                <span style={{ fontWeight: 700, fontSize: '16px' }}>Chrome 本地大模型 (完全免费 / 零延迟)</span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: chromeStatus === 'available' ? '#dcfce7' : '#fef3c7',
                  color: chromeStatus === 'available' ? '#166534' : '#92400e',
                }}
              >
                状态：{chromeStatus === 'available' ? '本地可用' : chromeStatus === 'downloadable' ? '需下载模型' : '当前环境未支持'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              Chrome 138+ 内置原生端侧翻译模型。文本翻译完全在您本机执行，无需上传网络，无 API 额度限制。如不可用，扩展会自动无缝降级到微软免费在线接口。
            </p>
          </div>

          {/* Microsoft & Google Free Default Service Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Globe size={20} color="#059669" />
              <span style={{ fontWeight: 700, fontSize: '16px' }}>Microsoft & Google 免费在线接口 (开箱即用)</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              无需配置任何 API Key。扩展默认内置微软 Edge 官方免费通道与谷歌备用通道，作为默认兜底翻译。
            </p>
          </div>

          {/* DeepL API Key Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>DeepL 翻译</span>
              <button
                onClick={() => handleTestService('deepl')}
                disabled={testingService === 'deepl'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {testingService === 'deepl' ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                测试连接
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#64748b' }}>DeepL Authentication Key (支持 Free 与 Pro)</label>
              <input
                type="password"
                value={credentials.deeplApiKey}
                placeholder="例如：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx"
                onChange={(e) => updateCredentials({ deeplApiKey: e.target.value })}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>以 :fx 结尾的 Key 会自动请求 DeepL Free 端点</span>
            </div>
            {testResults.deepl && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: testResults.deepl.success ? '#ecfdf5' : '#fef2f2',
                  color: testResults.deepl.success ? '#047857' : '#b91c1c',
                }}
              >
                {testResults.deepl.message}
              </div>
            )}
          </div>

          {/* Google Gemini Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>Google Gemini 大模型</span>
              <button
                onClick={() => handleTestService('gemini')}
                disabled={testingService === 'gemini'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {testingService === 'gemini' ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                测试连接
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#64748b' }}>Gemini API Key</label>
                <input
                  type="password"
                  value={credentials.geminiApiKey}
                  placeholder="AIzaSy..."
                  onChange={(e) => updateCredentials({ geminiApiKey: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#64748b' }}>模型名称</label>
                <input
                  type="text"
                  value={credentials.geminiModel}
                  placeholder="gemini-1.5-flash"
                  onChange={(e) => updateCredentials({ geminiModel: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
            {testResults.gemini && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: testResults.gemini.success ? '#ecfdf5' : '#fef2f2',
                  color: testResults.gemini.success ? '#047857' : '#b91c1c',
                }}
              >
                {testResults.gemini.message}
              </div>
            )}
          </div>

          {/* Baidu Translate Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>百度翻译开放平台</span>
              <button
                onClick={() => handleTestService('baidu')}
                disabled={testingService === 'baidu'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {testingService === 'baidu' ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                测试连接
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#64748b' }}>App ID</label>
                <input
                  type="text"
                  value={credentials.baiduAppId}
                  placeholder="2023..."
                  onChange={(e) => updateCredentials({ baiduAppId: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#64748b' }}>密钥 (Secret Key)</label>
                <input
                  type="password"
                  value={credentials.baiduSecretKey}
                  placeholder="密钥字符串"
                  onChange={(e) => updateCredentials({ baiduSecretKey: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
            {testResults.baidu && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: testResults.baidu.success ? '#ecfdf5' : '#fef2f2',
                  color: testResults.baidu.success ? '#047857' : '#b91c1c',
                }}
              >
                {testResults.baidu.message}
              </div>
            )}
          </div>

          {/* OpenAI Compatible Card (DeepSeek, SiliconFlow, Ollama) */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '16px' }}>OpenAI 兼容接口</span>
                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                  (支持 DeepSeek、硅基流动、OpenRouter、本地 Ollama 等)
                </span>
              </div>
              <button
                onClick={() => handleTestService('openai-compatible')}
                disabled={testingService === 'openai-compatible'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {testingService === 'openai-compatible' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                测试连接
              </button>
            </div>

            {/* Fast Presets */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>快速填充预设:</span>
              {OPENAI_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() =>
                    updateCredentials({
                      openaiBaseUrl: p.baseUrl,
                      openaiModel: p.model,
                    })
                  }
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    color: '#334155',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#64748b' }}>Base URL (端点接口根地址)</label>
                <input
                  type="text"
                  value={credentials.openaiBaseUrl}
                  placeholder="https://api.deepseek.com/v1"
                  onChange={(e) => updateCredentials({ openaiBaseUrl: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#64748b' }}>API Key (Ollama 可留空)</label>
                  <input
                    type="password"
                    value={credentials.openaiApiKey}
                    placeholder="sk-..."
                    onChange={(e) => updateCredentials({ openaiApiKey: e.target.value })}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#64748b' }}>模型名称 (Model)</label>
                  <input
                    type="text"
                    value={credentials.openaiModel}
                    placeholder="deepseek-chat"
                    onChange={(e) => updateCredentials({ openaiModel: e.target.value })}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {testResults['openai-compatible'] && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: testResults['openai-compatible'].success ? '#ecfdf5' : '#fef2f2',
                  color: testResults['openai-compatible'].success ? '#047857' : '#b91c1c',
                }}
              >
                {testResults['openai-compatible'].message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: General Preferences */}
      {activeTab === 'general' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Target Language */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>默认目标翻译语言</label>
            <select
              value={settings.targetLanguage}
              onChange={(e) => updateSettings({ targetLanguage: e.target.value })}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                maxWidth: '300px',
                fontSize: '13px',
              }}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          {/* Display Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>默认展示模式</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={settings.displayMode === 'dual'}
                  onChange={() => updateSettings({ displayMode: 'dual' })}
                />
                双语对照（原文下方紧随译文）
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={settings.displayMode === 'translation-only'}
                  onChange={() => updateSettings({ displayMode: 'translation-only' })}
                />
                仅看译文
              </label>
            </div>
          </div>

          {/* Translation Font Color & Theme Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={16} color="#2563eb" />
              <label style={{ fontWeight: 600, fontSize: '14px' }}>译文字体颜色与主题</label>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              自定义网页翻译后的双语译文颜色与左侧标记边框，随时告别单一蓝色
            </p>

            {/* Preset Color Swatches */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
              {COLOR_PALETTES.map((palette) => {
                const isSelected = settings.translationColorTheme === palette.id;
                return (
                  <button
                    key={palette.id}
                    onClick={() => updateSettings({ translationColorTheme: palette.id })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: isSelected ? `2px solid ${palette.primary}` : '1px solid #cbd5e1',
                      background: isSelected ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      boxShadow: isSelected ? `0 0 0 2px ${palette.border}` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: palette.primary,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 500, color: '#1e293b' }}>
                      {palette.name}
                    </span>
                  </button>
                );
              })}

              {/* Custom Color Option */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: settings.translationColorTheme === 'custom' ? '2px solid #0f172a' : '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <input
                    type="color"
                    value={settings.customColorHex || '#2563eb'}
                    onChange={(e) =>
                      updateSettings({
                        translationColorTheme: 'custom',
                        customColorHex: e.target.value,
                      })
                    }
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                  <span>自定义取色</span>
                </label>
              </div>
            </div>

            {/* Live Bilingual Preview Box */}
            <div
              style={{
                marginTop: '10px',
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                实时双语排版渲染预览：
              </div>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                Modern artificial intelligence is transforming global communication across diverse scientific and creative sectors.
              </p>
              <div
                style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: resolveColors(settings.translationColorTheme, settings.customColorHex).textColor,
                  borderLeft: `2px solid ${resolveColors(settings.translationColorTheme, settings.customColorHex).borderColor}`,
                  paddingLeft: '8px',
                  fontWeight: 500,
                }}
              >
                现代人工智能正在跨不同科学与创意领域重塑全球交流与协同方式。
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>开启 AI 智能上下文（滑动窗口与篇章记忆）</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  向大模型注入网页标题与前序已翻译段落，确保代词指代（如 it/they）、专有名词和行文风格在整篇文章中前后连贯统一。
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAIContext}
                onChange={(e) => updateSettings({ enableAIContext: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>开启网页右侧浮动翻译球</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>在网页右下方显示一键翻译和恢复的悬浮按钮</div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableFloatButton}
                onChange={(e) => updateSettings({ enableFloatButton: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>开启划词即时翻译浮窗</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>选中文本时浮出轻量图标，点击即翻译</div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableSelectionTranslate}
                onChange={(e) => updateSettings({ enableSelectionTranslate: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>故障时自动降级至备用免费引擎 (推荐开启)</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  若选定的自定义大模型或 API Key 欠费、网络超时，自动按 Chrome本地 → 微软 → 谷歌 顺序兜底
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableFallback}
                onChange={(e) => updateSettings({ enableFallback: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
            </label>
          </div>
        </div>
      )}

      {/* TAB 3: Site Rules */}
      {activeTab === 'sites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Always Translate Domains */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0',
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>总是自动翻译的网站域名</h3>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>
              匹配以下域名的网页在页面载入完成后会自动触发双语翻译。
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={alwaysInput}
                placeholder="例如：github.com 或 en.wikipedia.org"
                onChange={(e) => setAlwaysInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAlwaysDomain()}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                onClick={addAlwaysDomain}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={16} /> 添加
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {settings.alwaysTranslateDomains.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>暂无配置</span>
              ) : (
                settings.alwaysTranslateDomains.map((d) => (
                  <span
                    key={d}
                    style={{
                      background: '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {d}
                    <button
                      onClick={() => removeAlwaysDomain(d)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Never Translate Domains */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0',
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>从不翻译的网站域名</h3>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>
              匹配以下域名的网页不会显示悬浮翻译按钮，也不会自动翻译。
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={neverInput}
                placeholder="例如：bilibili.com 或 zhihu.com"
                onChange={(e) => setNeverInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNeverDomain()}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                onClick={addNeverDomain}
                style={{
                  background: '#475569',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={16} /> 添加
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {settings.neverTranslateDomains.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>暂无配置</span>
              ) : (
                settings.neverTranslateDomains.map((d) => (
                  <span
                    key={d}
                    style={{
                      background: '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {d}
                    <button
                      onClick={() => removeNeverDomain(d)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Cache & Maintenance */}
      {activeTab === 'cache' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>翻译缓存管理</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              为了节省您的 API 费用并提升重复访问网页时的瞬时加载速度，扩展会在本地 IndexedDB 中缓存已翻译段落（保留 7 天）。
            </p>
          </div>

          <div>
            <button
              onClick={handleClearCache}
              style={{
                padding: '8px 16px',
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={16} /> 清空所有本地翻译缓存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
