export interface BilingualParagraph {
  original: string;
  translation: string;
  section?: string;
}

export function generateBilingualHtml(
  title: string,
  items: BilingualParagraph[],
  mode: 'dual' | 'split' | 'translation-only' = 'dual',
): string {
  const contentHtml = items
    .map((item, idx) => {
      const sectionHeader =
        item.section && (idx === 0 || items[idx - 1]?.section !== item.section)
          ? `<h2 class="section-title">${escapeHtml(item.section)}</h2>`
          : '';

      if (mode === 'split') {
        return `
          ${sectionHeader}
          <div class="split-row">
            <div class="split-col original">${escapeHtml(item.original)}</div>
            <div class="split-col translation">${escapeHtml(item.translation)}</div>
          </div>
        `;
      }

      if (mode === 'translation-only') {
        return `
          ${sectionHeader}
          <p class="translation-only-p">${escapeHtml(item.translation || item.original)}</p>
        `;
      }

      // Dual mode
      return `
        ${sectionHeader}
        <div class="dual-block">
          <p class="original-text">${escapeHtml(item.original)}</p>
          <p class="translation-text">${escapeHtml(item.translation)}</p>
        </div>
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} - 双语排版</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 0 32px;
      line-height: 1.8;
      color: #1e293b;
      background: #ffffff;
    }
    h1.doc-title {
      font-size: 26px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 28px;
      color: #0f172a;
    }
    h2.section-title {
      font-size: 18px;
      color: #334155;
      margin-top: 36px;
      margin-bottom: 16px;
      border-left: 4px solid #2563eb;
      padding-left: 10px;
    }
    .dual-block {
      margin-bottom: 20px;
    }
    .original-text {
      margin: 0;
      color: #475569;
      font-size: 15px;
    }
    .translation-text {
      margin: 6px 0 0 0;
      color: #2563eb;
      font-size: 15px;
      padding-left: 10px;
      border-left: 2px solid #93c5fd;
    }
    .split-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
    }
    .split-col.original { color: #475569; }
    .split-col.translation { color: #2563eb; }
    .translation-only-p {
      font-size: 15px;
      margin-bottom: 16px;
      color: #1e293b;
    }
    @media print {
      body {
        max-width: 100%;
        margin: 0;
        padding: 15mm;
      }
      .dual-block, .split-row {
        page-break-inside: avoid;
      }
      .translation-text {
        color: #1e293b !important;
        border-left-color: #cbd5e1 !important;
      }
    }
  </style>
</head>
<body>
  <h1 class="doc-title">${escapeHtml(title)}</h1>
  ${contentHtml}
</body>
</html>`;
}

export function generateBilingualMarkdown(
  title: string,
  items: BilingualParagraph[],
): string {
  let md = `# ${title}\n\n`;
  let lastSection = '';

  for (const item of items) {
    if (item.section && item.section !== lastSection) {
      md += `## ${item.section}\n\n`;
      lastSection = item.section;
    }
    md += `${item.original}\n\n`;
    if (item.translation) {
      md += `> ${item.translation}\n\n`;
    }
    md += `---\n\n`;
  }

  return md;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
