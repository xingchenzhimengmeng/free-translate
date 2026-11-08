import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface PdfPageContent {
  pageNumber: number;
  paragraphs: string[];
}

interface TextItemWithPos {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function parsePdfDocument(
  data: ArrayBuffer,
  onProgress?: (current: number, total: number) => void,
): Promise<PdfPageContent[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(data),
      disableFontFace: false,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const results: PdfPageContent[] = [];

    for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const items: TextItemWithPos[] = [];
    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const transform = item.transform;
        // transform: [scaleX, skewY, skewX, scaleY, transX, transY]
        items.push({
          str: item.str,
          x: transform[4],
          y: transform[5],
          width: item.width,
          height: item.height,
        });
      }
    }

    // Sort items by Y (top to bottom), then by X (left to right)
    // Note: PDF coordinate system has Y=0 at bottom, so larger Y is higher up
    items.sort((a, b) => {
      const diffY = b.y - a.y;
      if (Math.abs(diffY) > 5) {
        return diffY;
      }
      return a.x - b.x;
    });

    // Group items into lines and paragraphs
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];
    let lastY = -1;
    let lastHeight = 12;

    for (const item of items) {
      if (lastY !== -1) {
        const verticalDistance = lastY - item.y;
        // If vertical gap is larger than 1.5 * line height, treat as paragraph break
        if (verticalDistance > lastHeight * 1.6) {
          if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join(' ').trim());
            currentParagraph = [];
          }
        }
      }
      currentParagraph.push(item.str);
      lastY = item.y;
      lastHeight = item.height || 12;
    }

    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' ').trim());
    }

    results.push({
      pageNumber: i,
      paragraphs: paragraphs.filter((p) => p.length > 1),
    });

    if (onProgress) {
      onProgress(i, totalPages);
    }
  }

  return results;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.toLowerCase().includes('password')) {
      throw new Error('此 PDF 文件受到密码保护，请移除密码后重试。');
    }
    throw new Error(`PDF 解析失败: ${msg}`);
  }
}
