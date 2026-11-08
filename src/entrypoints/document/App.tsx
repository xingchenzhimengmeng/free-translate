import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  Play,
  Pause,
  Download,
  Printer,
  FileDown,
  BookOpen,
  Columns,
  Layers,
  Eye,
  Check,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { TranslationServiceId, TranslationColorTheme } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/services/languages';
import { getSettings } from '@/utils/storage';
import { resolveColors } from '@/services/colors';
import { parsePdfDocument } from '@/services/document/pdfParser';
import {
  buildBilingualEpub,
  parseEpubDocument,
  type EpubDocument,
} from '@/services/document/epubParser';
import {
  downloadBlob,
  generateBilingualHtml,
  generateBilingualMarkdown,
  type BilingualParagraph,
} from '@/services/document/exportDoc';

const DEMO_PARAGRAPHS: BilingualParagraph[] = [
  {
    section: '第 1 章：人工智能与现代认知架构',
    original:
      'Artificial intelligence systems have transitioned from rule-based symbolic reasoning toward deep neural representation learning.',
    translation: '',
  },
  {
    section: '第 1 章：人工智能与现代认知架构',
    original:
      'Large language models synthesize vast multimodal corpora to perform complex reasoning, contextual summarization, and cross-lingual translation with unprecedented fluency.',
    translation: '',
  },
  {
    section: '第 1 章：人工智能与现代认知架构',
    original:
      'The core challenge lies in aligning autonomous generative models with human intentionality, ethical boundaries, and factual verification.',
    translation: '',
  },
  {
    section: '第 2 章：分布式计算与网络共识',
    original:
      'Distributed computing architectures achieve fault tolerance and scalability by partitioning computational workloads across heterogeneous server clusters.',
    translation: '',
  },
  {
    section: '第 2 章：分布式计算与网络共识',
    original:
      'Consensus algorithms such as Raft and Paxos ensure state machine replication even under hostile network partitioning and arbitrary message latency.',
    translation: '',
  },
];

export default function App() {
  const [docTitle, setDocTitle] = useState<string>('');
  const [docType, setDocType] = useState<'pdf' | 'epub' | 'text' | null>(null);
  const [paragraphs, setParagraphs] = useState<BilingualParagraph[]>([]);
  const [originalEpub, setOriginalEpub] = useState<EpubDocument | null>(null);
  const [layoutMode, setLayoutMode] = useState<'dual' | 'split' | 'translation-only'>('dual');
  const [targetLang, setTargetLang] = useState<string>('zh-CN');
  const [selectedEngine, setSelectedEngine] = useState<TranslationServiceId>('chrome-local');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [colorTheme, setColorTheme] = useState<TranslationColorTheme>('blue');
  const [customHex, setCustomHex] = useState<string>('#2563eb');
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      if (s.translationColorTheme) setColorTheme(s.translationColorTheme);
      if (s.customColorHex) setCustomHex(s.customColorHex);
      if (s.targetLanguage) setTargetLang(s.targetLanguage);
      if (s.defaultService) setSelectedEngine(s.defaultService);
    });
  }, []);

  // Handle File Upload
  const handleFileUpload = async (file: File) => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase();

    try {
      const arrayBuffer = await file.arrayBuffer();
      setDocTitle(name.replace(/\.[^/.]+$/, ''));

      if (ext === 'pdf') {
        setDocType('pdf');
        const pages = await parsePdfDocument(arrayBuffer);
        const items: BilingualParagraph[] = [];
        pages.forEach((p) => {
          p.paragraphs.forEach((text) => {
            items.push({
              section: `第 ${p.pageNumber} 页`,
              original: text,
              translation: '',
            });
          });
        });
        if (items.length === 0) {
          throw new Error('未从该 PDF 中提取到可翻译的文本，可能是纯图片扫描件。');
        }
        setParagraphs(items);
        setProgress({ current: 0, total: items.length });
      } else if (ext === 'epub') {
        setDocType('epub');
        const epub = await parseEpubDocument(arrayBuffer);
        setOriginalEpub(epub);
        setDocTitle(epub.title);
        const items: BilingualParagraph[] = [];
        epub.chapters.forEach((ch) => {
          ch.paragraphs.forEach((text) => {
            items.push({
              section: ch.title,
              original: text,
              translation: '',
            });
          });
        });
        setParagraphs(items);
        setProgress({ current: 0, total: items.length });
      } else if (ext === 'html' || ext === 'htm') {
        setDocType('text');
        const textContent = new TextDecoder().decode(arrayBuffer);
        const parser = new DOMParser();
        const doc = parser.parseFromString(textContent, 'text/html');
        const items: BilingualParagraph[] = [];
        doc.querySelectorAll('p, h1, h2, h3, h4, blockquote, li').forEach((el) => {
          const t = el.textContent?.trim() || '';
          if (t.length > 2 && /[^\d\s\W]/.test(t)) {
            items.push({ original: t, translation: '' });
          }
        });
        if (items.length === 0) {
          throw new Error('未能从该 HTML 文件中提取到正文段落。');
        }
        setParagraphs(items);
        setProgress({ current: 0, total: items.length });
      } else {
        // Plain text or markdown
        setDocType('text');
        const textContent = new TextDecoder().decode(arrayBuffer);
        let lines = textContent
          .split(/\r?\n\s*\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (lines.length <= 1 && textContent.length > 100) {
          lines = textContent
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 1);
        }
        if (lines.length === 0) {
          throw new Error('所选文件为空或无可读取文本。');
        }
        const items: BilingualParagraph[] = lines.map((l) => ({
          original: l,
          translation: '',
        }));
        setParagraphs(items);
        setProgress({ current: 0, total: items.length });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || '读取文件失败，请确保格式正确且未损坏。');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const loadDemoDocument = () => {
    setErrorMessage(null);
    setDocTitle('Artificial Intelligence & Systems Overview');
    setDocType('text');
    setParagraphs([...DEMO_PARAGRAPHS]);
    setProgress({ current: 0, total: DEMO_PARAGRAPHS.length });
  };

  // Start Translation Loop
  const handleStartTranslation = async () => {
    if (paragraphs.length === 0 || isTranslating) return;
    setIsTranslating(true);

    const updated = [...paragraphs];
    const batchSize = 5;
    const contextBuffer: Array<{ text: string; trans: string }> = [];

    for (let i = 0; i < updated.length; i += batchSize) {
      const slice = updated.slice(i, i + batchSize);
      const missingTexts = slice.map((item) => (item.translation ? '' : item.original));
      const hasMissing = missingTexts.some((t) => t.length > 0);

      if (hasMissing) {
        await new Promise<void>((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: 'TRANSLATE',
              payload: {
                texts: slice.map((item) => item.original),
                from: 'auto',
                to: targetLang,
                service: selectedEngine,
                context: {
                  pageTitle: docTitle,
                  previousTexts: contextBuffer.map((c) => c.text),
                  previousTranslations: contextBuffer.map((c) => c.trans),
                },
              },
            },
            (res) => {
              if (res?.success && res.data?.translations) {
                const trans = res.data.translations as string[];
                slice.forEach((item, idx) => {
                  if (trans[idx]) {
                    item.translation = trans[idx];
                    contextBuffer.push({ text: item.original, trans: trans[idx] });
                    if (contextBuffer.length > 3) contextBuffer.shift();
                  }
                });
                setParagraphs([...updated]);
              }
              resolve();
            },
          );
        });
      }

      setProgress({
        current: Math.min(i + batchSize, updated.length),
        total: updated.length,
      });
    }

    setIsTranslating(false);
  };

  // Export Handlers
  const handleExportHtml = () => {
    const html = generateBilingualHtml(docTitle || 'Bilingual_Document', paragraphs, layoutMode);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${docTitle || 'document'}_bilingual.html`);
    setIsExportMenuOpen(false);
  };

  const handleExportMarkdown = () => {
    const md = generateBilingualMarkdown(docTitle || 'Bilingual_Document', paragraphs);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, `${docTitle || 'document'}_bilingual.md`);
    setIsExportMenuOpen(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const html = generateBilingualHtml(docTitle || 'Bilingual_Document', paragraphs, layoutMode);
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
    setIsExportMenuOpen(false);
  };

  const handleExportEpub = async () => {
    if (!originalEpub) {
      alert('当前文档不是 EPUB 文件，请选择导出为 HTML 或 PDF。');
      return;
    }
    const translatedMap = new Map<string, string[]>();
    originalEpub.chapters.forEach((ch) => {
      const chTrans = paragraphs
        .filter((p) => p.section === ch.title)
        .map((p) => p.translation || p.original);
      translatedMap.set(ch.href, chTrans);
    });
    const epubBlob = await buildBilingualEpub(originalEpub.zipData, translatedMap, originalEpub.chapters);
    downloadBlob(epubBlob, `${docTitle || 'book'}_bilingual.epub`);
    setIsExportMenuOpen(false);
  };

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navigation & Controls Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={22} color="#2563eb" />
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Free Translate 文档双语排版中心
            </h1>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {docTitle ? `当前文档：${docTitle}` : '支持 PDF、EPUB 电子书与 Markdown 双语排版导出'}
            </div>
          </div>
        </div>

        {/* Center Control Group */}
        {paragraphs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Target Language */}
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                background: '#ffffff',
              }}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  目标：{l.name}
                </option>
              ))}
            </select>

            {/* Layout Mode Segmented Control */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setLayoutMode('dual')}
                title="双语对照（逐段排版）"
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  background: layoutMode === 'dual' ? '#ffffff' : 'transparent',
                  fontWeight: layoutMode === 'dual' ? 600 : 400,
                  boxShadow: layoutMode === 'dual' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                逐段双语
              </button>
              <button
                onClick={() => setLayoutMode('split')}
                title="双栏分屏（左右对照）"
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  background: layoutMode === 'split' ? '#ffffff' : 'transparent',
                  fontWeight: layoutMode === 'split' ? 600 : 400,
                  boxShadow: layoutMode === 'split' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                双栏分屏
              </button>
              <button
                onClick={() => setLayoutMode('translation-only')}
                title="纯译文模式"
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  background: layoutMode === 'translation-only' ? '#ffffff' : 'transparent',
                  fontWeight: layoutMode === 'translation-only' ? 600 : 400,
                  boxShadow: layoutMode === 'translation-only' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                仅看译文
              </button>
            </div>

            {/* Start Translation Button */}
            <button
              onClick={handleStartTranslation}
              disabled={isTranslating}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: isTranslating ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isTranslating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
              }}
            >
              <Play size={14} />
              <span>{isTranslating ? `排版中 (${percent}%)` : '开始双语排版'}</span>
            </button>
          </div>
        )}

        {/* Right Action Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <label
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#334155',
            }}
          >
            <UploadCloud size={14} />
            <span>打开新文件</span>
            <input
              type="file"
              accept=".pdf,.epub,.txt,.md,.markdown,.html,.htm"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
          </label>

          {/* Export Dropdown */}
          {paragraphs.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={14} /> 导出双语排版
              </button>

              {isExportMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    width: '180px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                    padding: '6px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 200,
                  }}
                >
                  {docType === 'epub' && (
                    <button
                      onClick={handleExportEpub}
                      style={{
                        padding: '8px 14px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <BookOpen size={14} /> 导出双语 EPUB
                    </button>
                  )}
                  <button
                    onClick={handleExportHtml}
                    style={{
                      padding: '8px 14px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FileDown size={14} /> 导出双语 HTML
                  </button>
                  <button
                    onClick={handlePrint}
                    style={{
                      padding: '8px 14px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Printer size={14} /> 打印 / 保存为 PDF
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    style={{
                      padding: '8px 14px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FileText size={14} /> 导出双语 Markdown
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      {isTranslating && (
        <div style={{ height: '3px', background: '#e2e8f0', width: '100%' }}>
          <div
            style={{
              height: '100%',
              background: '#2563eb',
              width: `${percent}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px 24px', maxWidth: '960px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {errorMessage && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {isLoadingFile && (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <RefreshCw size={28} color="#2563eb" className="animate-spin" />
            <div style={{ fontSize: '14px', color: '#475569', fontWeight: 600 }}>
              正在解析本地文档，请稍候...
            </div>
          </div>
        )}

        {paragraphs.length === 0 ? (
          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              marginTop: '40px',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
            }}
          >
            <UploadCloud size={48} color="#94a3b8" />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                拖拽或选择文件进入双语排版中心
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                支持 PDF 原版文献、EPUB 电子书、Markdown 与纯文本文件
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', color: '#475569' }}>
                📄 PDF 文档
              </span>
              <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', color: '#475569' }}>
                📖 EPUB 电子书
              </span>
              <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', color: '#475569' }}>
                📝 Markdown / TXT / HTML
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <label
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                选择本地文件
                <input
                  type="file"
                  accept=".pdf,.epub,.txt,.md,.markdown,.html,.htm"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
              </label>

              <button
                onClick={loadDemoDocument}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={15} color="#d97706" /> 载入演示文档体验
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '36px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              {docTitle}
            </h2>

            {paragraphs.map((item, idx) => {
              const showSection = item.section && (idx === 0 || paragraphs[idx - 1]?.section !== item.section);

              return (
                <div key={idx}>
                  {showSection && (
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', marginTop: '28px', marginBottom: '14px', borderLeft: '3px solid #2563eb', paddingLeft: '8px' }}>
                      {item.section}
                    </h3>
                  )}

                  {layoutMode === 'split' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px', borderBottom: '1px solid #f8fafc', paddingBottom: '12px' }}>
                      <div style={{ color: '#475569', fontSize: '14px', lineHeight: 1.7 }}>{item.original}</div>
                      <div style={{ color: resolveColors(colorTheme, customHex).textColor, fontSize: '14px', lineHeight: 1.7 }}>
                        {item.translation || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>待排版翻译...</span>}
                      </div>
                    </div>
                  ) : layoutMode === 'translation-only' ? (
                    <div style={{ fontSize: '15px', color: '#0f172a', marginBottom: '16px', lineHeight: 1.8 }}>
                      {item.translation || item.original}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.7 }}>
                        {item.original}
                      </p>
                      {item.translation ? (
                        <p style={{
                          margin: '6px 0 0',
                          color: resolveColors(colorTheme, customHex).textColor,
                          fontSize: '14px',
                          lineHeight: 1.7,
                          borderLeft: `2px solid ${resolveColors(colorTheme, customHex).borderColor}`,
                          paddingLeft: '10px'
                        }}>
                          {item.translation}
                        </p>
                      ) : (
                        <p style={{ margin: '4px 0 0', color: '#cbd5e1', fontSize: '12px', fontStyle: 'italic' }}>
                          待排版翻译...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
