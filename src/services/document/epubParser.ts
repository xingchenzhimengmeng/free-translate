import JSZip from 'jszip';

export interface EpubChapter {
  id: string;
  href: string;
  title: string;
  html: string;
  paragraphs: string[];
}

export interface EpubDocument {
  title: string;
  author: string;
  chapters: EpubChapter[];
  zipData: ArrayBuffer;
}

export async function parseEpubDocument(fileData: ArrayBuffer): Promise<EpubDocument> {
  const zip = await JSZip.loadAsync(fileData);

  // Helper to find file in zip case-insensitively and slash-independently
  function findFileInZip(targetPath: string) {
    const clean = targetPath.replace(/\\/g, '/').replace(/^\//, '');
    const direct = zip.file(clean);
    if (direct) return direct;
    const lower = clean.toLowerCase();
    for (const [name, entry] of Object.entries(zip.files)) {
      if (name.toLowerCase() === lower && !entry.dir) {
        return entry;
      }
    }
    return null;
  }

  // 1. Find rootfile from META-INF/container.xml
  const containerEntry = findFileInZip('META-INF/container.xml');
  const containerXml = containerEntry ? await containerEntry.async('text') : null;
  if (!containerXml) {
    throw new Error('无效的 EPUB 文件：缺少 META-INF/container.xml');
  }

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfileEl = containerDoc.getElementsByTagName('rootfile')[0] || containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');
  if (!opfPath) {
    throw new Error('无法解析 EPUB rootfile 路径');
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const opfEntry = findFileInZip(opfPath);
  const opfXml = opfEntry ? await opfEntry.async('text') : null;
  if (!opfXml) {
    throw new Error('无法读取 EPUB OPF 文件: ' + opfPath);
  }

  const opfDoc = parser.parseFromString(opfXml, 'application/xml');
  const title =
    opfDoc.getElementsByTagName('dc:title')[0]?.textContent ||
    opfDoc.getElementsByTagName('title')[0]?.textContent ||
    '未命名电子书';
  const author =
    opfDoc.getElementsByTagName('dc:creator')[0]?.textContent ||
    opfDoc.getElementsByTagName('creator')[0]?.textContent ||
    '未知作者';

  // 2. Parse manifest and spine
  const manifestItems = new Map<string, string>();
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) {
      manifestItems.set(id, opfDir + href);
    }
  });

  const spineItems: string[] = [];
  opfDoc.querySelectorAll('spine > itemref').forEach((itemref) => {
    const idref = itemref.getAttribute('idref');
    if (idref && manifestItems.has(idref)) {
      // Strip any query parameters or fragment anchors from the manifest href
      const rawHref = manifestItems.get(idref)!;
      const cleanHref = rawHref.split('#')[0].split('?')[0];
      spineItems.push(cleanHref);
    }
  });

  // 3. Extract chapters
  const chapters: EpubChapter[] = [];
  let chapterIndex = 1;

  for (const href of spineItems) {
    const file = findFileInZip(href);
    if (!file) continue;

    const html = await file.async('text');
    const doc = parser.parseFromString(html, 'text/html');

    // Extract chapter title
    const headingEl = doc.querySelector('h1, h2, h3, title');
    const chapterTitle = headingEl?.textContent?.trim() || `第 ${chapterIndex} 章`;

    // Extract candidate paragraphs
    const paragraphs: string[] = [];
    const elements = doc.querySelectorAll('p, h1, h2, h3, h4, blockquote, li');
    elements.forEach((el) => {
      const text = el.textContent?.trim() || '';
      if (text.length > 2 && /[^\d\s\W]/.test(text)) {
        paragraphs.push(text);
      }
    });

    if (paragraphs.length > 0) {
      chapters.push({
        id: `ch_${chapterIndex}`,
        href,
        title: chapterTitle,
        html,
        paragraphs,
      });
      chapterIndex++;
    }
  }

  // Fallback: If spine parsing returned 0 chapters, extract all HTML/XHTML files in the zip
  if (chapters.length === 0) {
    for (const [name, entry] of Object.entries(zip.files)) {
      if (!entry.dir && (name.endsWith('.html') || name.endsWith('.xhtml') || name.endsWith('.htm'))) {
        const html = await entry.async('text');
        const doc = parser.parseFromString(html, 'text/html');
        const headingEl = doc.querySelector('h1, h2, h3, title');
        const chapterTitle = headingEl?.textContent?.trim() || `第 ${chapterIndex} 节`;
        const paragraphs: string[] = [];
        doc.querySelectorAll('p, h1, h2, h3, h4, blockquote, li').forEach((el) => {
          const text = el.textContent?.trim() || '';
          if (text.length > 2 && /[^\d\s\W]/.test(text)) paragraphs.push(text);
        });
        if (paragraphs.length > 0) {
          chapters.push({
            id: `ch_${chapterIndex}`,
            href: name,
            title: chapterTitle,
            html,
            paragraphs,
          });
          chapterIndex++;
        }
      }
    }
  }

  if (chapters.length === 0) {
    throw new Error('未能从该 EPUB 电子书中提取到可读文本段落');
  }

  return {
    title,
    author,
    chapters,
    zipData: fileData,
  };
}

export async function buildBilingualEpub(
  originalZipData: ArrayBuffer,
  translatedMap: Map<string, string[]>,
  chapters: EpubChapter[],
): Promise<Blob> {
  const zip = await JSZip.loadAsync(originalZipData);
  const parser = new DOMParser();

  for (const ch of chapters) {
    const translations = translatedMap.get(ch.href);
    if (!translations || translations.length === 0) continue;

    const file = zip.file(ch.href);
    if (!file) continue;

    const originalHtml = await file.async('text');
    const doc = parser.parseFromString(originalHtml, 'text/html');

    // Inject bilingual CSS style
    const styleEl = doc.createElement('style');
    styleEl.textContent = `
      .ft-bilingual-trans {
        display: block !important;
        margin-top: 6px !important;
        margin-bottom: 8px !important;
        color: #2563eb !important;
        font-size: 0.95em !important;
        line-height: 1.6 !important;
        border-left: 2px solid #93c5fd !important;
        padding-left: 8px !important;
      }
    `;
    doc.head.appendChild(styleEl);

    // Find paragraphs and attach translations
    const elements = Array.from(doc.querySelectorAll('p, h1, h2, h3, h4, blockquote, li'));
    let transIndex = 0;

    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      if (text.length > 2 && /[^\d\s\W]/.test(text) && transIndex < translations.length) {
        const transText = translations[transIndex];
        if (transText) {
          const transDiv = doc.createElement('div');
          transDiv.className = 'ft-bilingual-trans';
          transDiv.textContent = transText;
          el.appendChild(transDiv);
        }
        transIndex++;
      }
    }

    const serializer = new XMLSerializer();
    const updatedXhtml = serializer.serializeToString(doc);
    zip.file(ch.href, updatedXhtml);
  }

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}
