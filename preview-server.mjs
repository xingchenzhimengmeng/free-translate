import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '.output/chrome-mv3');

const POLYFILL_SCRIPT = `
<script>
window.addEventListener('error', (e) => {
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'WINDOW_ERROR', message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error?.stack })
  }).catch(() => {});
});
window.addEventListener('unhandledrejection', (e) => {
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'UNHANDLED_REJECTION', reason: String(e.reason?.stack || e.reason) })
  }).catch(() => {});
});

if (typeof window.chrome === 'undefined') {
  window.chrome = {};
}
if (!window.chrome.runtime) {
  window.chrome.runtime = {};
}
Object.assign(window.chrome.runtime, {
  id: 'free-translate-local',
  getURL: (path) => '/' + path.replace(/^\\//, ''),
  openOptionsPage: () => { window.location.href = '/options.html'; }
});

const listeners = [];
window.chrome.runtime.onMessage = window.chrome.runtime.onMessage || {
  addListener: (fn) => listeners.push(fn),
  removeListener: (fn) => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  }
};

window.chrome.runtime.sendMessage = (msg, callback) => {
  fetch('/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg)
  })
  .then(res => res.json())
  .then(data => { if (callback) callback(data); })
  .catch(err => { if (callback) callback({ success: false, error: err.message }); });
};

function createStorage(prefix) {
  return {
    get: (key, cb) => {
      let data = {};
      try {
        const raw = localStorage.getItem(prefix + (typeof key === 'string' ? key : ''));
        if (raw) data = JSON.parse(raw);
      } catch {}
      if (typeof key === 'string') {
        setTimeout(() => cb({ [key]: data }), 0);
      } else {
        setTimeout(() => cb(data), 0);
      }
    },
    set: (items, cb) => {
      try {
        for (const [k, v] of Object.entries(items)) {
          localStorage.setItem(prefix + k, JSON.stringify(v));
        }
      } catch {}
      if (cb) setTimeout(cb, 0);
    }
  };
}

window.chrome.storage = {
  local: createStorage('local_'),
  sync: createStorage('sync_')
};

window.chrome.tabs = {
  query: (opts, cb) => {
    setTimeout(() => cb([{ id: 1, url: window.location.href }]), 0);
  },
  sendMessage: (tabId, msg, cb) => {
    for (const listener of listeners) {
      listener(msg, {}, cb || (() => {}));
    }
  }
};
</script>
`;

const DEMO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Free Translate - 网页翻译体验页面</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 820px;
      margin: 40px auto;
      padding: 0 24px;
      line-height: 1.7;
      color: #1e293b;
      background: #f8fafc;
    }
    header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-links { display: flex; gap: 12px; }
    .nav-btn {
      padding: 8px 14px;
      background: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .nav-btn.secondary { background: #64748b; }
    h1 { font-size: 26px; color: #0f172a; margin-top: 0; }
    h2 { font-size: 18px; color: #1e293b; margin-top: 32px; }
    p { font-size: 15px; margin: 16px 0; }
    blockquote {
      border-left: 4px solid #3b82f6;
      background: #eff6ff;
      margin: 20px 0;
      padding: 12px 18px;
      border-radius: 0 8px 8px 0;
      color: #1e40af;
      font-style: italic;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 13px;
    }
    .notice-card {
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 14px 18px;
      border-radius: 8px;
      margin-bottom: 24px;
      color: #92400e;
      font-size: 13px;
    }
  </style>
  ${POLYFILL_SCRIPT}
  <script type="module" src="/content-scripts/content.js"></script>
</head>
<body>
  <header>
    <div>
      <h2 style="margin:0; font-size: 20px;">Free Translate 网页实时体验中心</h2>
      <div style="font-size: 12px; color: #64748b;">支持右下角悬浮球翻译、划词即时翻译与控制面板</div>
    </div>
    <div class="nav-links">
      <a href="/popup.html" target="_blank" class="nav-btn">打开 Popup 面板</a>
      <a href="/options.html" target="_blank" class="nav-btn secondary">打开 Options 设置页</a>
    </div>
  </header>

  <div class="notice-card">
    <strong>💡 测试提示：</strong>
    1. 点击网页右下角的蓝色悬浮翻译球，可触发整页双语翻译与还原。<br/>
    2. 用鼠标选中任意一段英文文字，即可触发划词翻译小图标与翻译卡片。<br/>
    3. 下方包含代码块和 translate="no" 标签，它们会被自动保护不被篡改。
  </div>

  <h1>Artificial Intelligence and the Modern Web Architecture</h1>
  
  <p id="para1">Modern artificial intelligence is transforming software engineering, scientific inquiry, and global communication across diverse sectors. With on-device and cloud translation models, language is no longer a barrier to accessing humanity's shared knowledge.</p>

  <p id="para2">Deep neural translation models generate coherent and fluent translations in real-time, preserving context, idioms, and subtle linguistic nuances across multilingual web platforms.</p>

  <blockquote>
    "The future of translation belongs to zero-latency, privacy-preserving, on-device intelligence coupled with open web accessibility."
  </blockquote>

  <h2>Protected Code Example (Should NOT be translated)</h2>
  <pre><code>function calculateTotal(items) {
  // This code block is protected from translation
  return items.reduce((sum, item) => sum + item.price, 0);
}</code></pre>

  <h2>Global Collaboration</h2>
  <p id="para3">Developers around the globe collaborate on open-source software, documentation, and academic research papers. Breaking down language boundaries accelerates technical innovation and fosters international cooperation.</p>

  <div translate="no" style="background:#f1f5f9; padding: 12px; border-radius: 6px; margin-top: 16px;">
    <p style="margin:0; font-weight:600;">[translate="no"] This specialized brand text must stay in its original English form.</p>
  </div>
</body>
</html>`;

async function translateWithMicrosoft(texts, to = 'zh-CN') {
  const target = to.startsWith('zh') ? 'zh-Hans' : to;
  const res = await fetch(`https://edge.microsoft.com/translate/translatetext?to=${encodeURIComponent(target)}&isEnterpriseClient=false`, {
    method: 'POST',
    headers: {
      'Accept': '*/*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(texts)
  });
  if (!res.ok) throw new Error('微软翻译服务响应错误: ' + res.status);
  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((item, i) => item.translations?.[0]?.text || texts[i]);
  }
  return texts;
}

async function translateWithMagpie(texts, to = 'zh-CN') {
  const prompt = `Translate each item in the following JSON array of strings to Chinese (Simplified). Return ONLY a valid JSON array of translated strings with the exact same length and order. No markdown codeblocks.
Input: ${JSON.stringify(texts)}`;

  const res = await fetch('http://127.0.0.1:3425/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'copilot/auto',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) throw new Error('Local Gateway error: ' + res.status);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  try {
    const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr) && arr.length === texts.length) return arr;
  } catch {}
  return texts.map(() => content.slice(0, 100));
}

async function handleApiMessage(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  let msg = {};
  try { msg = JSON.parse(body); } catch {}

  console.log(`[API MESSAGE] type=${msg.type} timestamp=${new Date().toISOString()}`);

  if (msg.type === 'TRANSLATE') {
    const { texts, to } = msg.payload || {};
    console.log(`[TRANSLATE REQ] count=${texts?.length} first="${texts?.[0]?.slice(0, 30)}"`);
    try {
      const translations = await translateWithMicrosoft(texts || [], to || 'zh-CN');
      const serviceUsed = 'microsoft-free';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          translations,
          serviceUsed,
          fallbackOccurred: false
        }
      }));
    } catch (err) {
      try {
        // Fallback to Google
        const googleResults = await Promise.all((texts || []).map(async (t) => {
          const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(t)}`;
          const gRes = await fetch(gUrl);
          const gData = await gRes.json();
          return gData?.[0]?.[0]?.[0] || t;
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            translations: googleResults,
            serviceUsed: 'google-free',
            fallbackOccurred: true
          }
        }));
      } catch (gErr) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message || gErr.message }));
      }
    }
    return;
  }

  if (msg.type === 'TEST_SERVICE') {
    const { service } = msg.payload || {};
    try {
      let trans;
      try {
        trans = await translateWithMagpie(['Hello, welcome to Free Translate!']);
      } catch {
        trans = await translateWithMicrosoft(['Hello, welcome to Free Translate!']);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: trans[0] }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (msg.type === 'CLEAR_CACHE') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true }));
}

async function getGithubPageHtml() {
  let mdContent = '';
  try {
    const res = await fetch('https://raw.githubusercontent.com/xingchenzhimengmeng/org-viewer/main/README.md');
    mdContent = await res.text();
  } catch {
    mdContent = '# Org Viewer - Chrome Extension\\n\\nA modern, clean, and secure in-browser Org-mode document previewer for Google Chrome.';
  }

  return `<!DOCTYPE html>
<html lang="en" data-color-mode="light">
<head>
  <meta charset="UTF-8">
  <title>xingchenzhimengmeng/org-viewer: Chrome extension to preview Org-mode files</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown.min.css">
  <style>
    body { margin: 0; padding: 40px 20px; background: #ffffff; }
    .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; }
    .top-bar { max-width: 980px; margin: 0 auto 24px; padding: 12px 16px; background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
  </style>
  ${POLYFILL_SCRIPT}
  <script type="module" src="/content-scripts/content.js"></script>
</head>
<body>
  <div class="top-bar">
    <span>📦 <strong>GitHub 真实页面模拟</strong>: xingchenzhimengmeng / <strong>org-viewer</strong></span>
    <span style="color: #57606a;">请使用右下角悬浮球或 Alt+A 体验双语翻译</span>
  </div>
  <article class="markdown-body">
    <h1>Org Viewer - Chrome Extension</h1>
    <p>A modern, clean, and secure in-browser Org-mode (<code>.org</code>) document previewer for Google Chrome.</p>
    <p align="center">
      <a href="https://github.com/xingchenzhimengmeng/org-viewer/releases"><img src="https://img.shields.io/badge/Manifest-V3-blue.svg?style=flat-square" alt="Manifest-V3" /></a>
      <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License: MIT" /></a>
    </p>
    <h2>Overview</h2>
    <p>Org Viewer is a Google Chrome extension designed for Emacs enthusiasts, researchers, students, and productivity lovers who want to view Org-mode files directly inside their browser with beautiful typography, collapsible headlines, and interactive code blocks.</p>
    <h2>Key Features</h2>
    <ul>
      <li><strong>Native-like Org Rendering</strong>: Parses outlines, tags, priority marks, checkboxes, and property drawers faithfully.</li>
      <li><strong>LaTeX & Math Formula Support</strong>: Automatically renders math equations, inline matrices, and scientific notation with MathJax.</li>
      <li><strong>Syntax Highlighting</strong>: Supports syntax highlighting for over 30 programming languages inside source code blocks.</li>
      <li><strong>Local & Remote File Support</strong>: Preview local <code>file:///</code> documents as well as raw GitHub and GitLab Org files seamlessly.</li>
    </ul>
    <h2>Installation</h2>
    <p>To install the extension from source, clone the repository and run the build command:</p>
    <div class="highlight highlight-source-shell"><pre><code>git clone https://github.com/xingchenzhimengmeng/org-viewer.git
cd org-viewer
npm install
npm run build</code></pre></div>
    <h2>Security & Privacy</h2>
    <p>This extension runs completely client-side in an isolated sandbox. It never transmits your personal documents or telemetry data to any external server.</p>
  </article>
</body>
</html>`;
}

function getCodeforcesPageHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Problem - 478B - Codeforces</title>
  <style>
    body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background: #fff; color: #000; margin: 0; padding: 20px; line-height: 1.5; }
    .top-bar { max-width: 860px; margin: 0 auto 20px; padding: 10px 16px; background: #e8f4fd; border: 1px solid #b6d4fe; border-radius: 6px; font-size: 13px; color: #084298; display: flex; justify-content: space-between; }
    .problem-statement { max-width: 860px; margin: 0 auto; border: 1px solid #e1e1e1; padding: 24px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .header { text-align: center; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .time-limit, .memory-limit, .input-file, .output-file { font-size: 13px; color: #555; }
    .property-title { display: inline-block; }
    .section-title { font-weight: bold; font-size: 16px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    p { font-size: 14px; margin: 12px 0; }
    .sample-test { border: 1px solid #888; margin-top: 10px; font-family: monospace; }
    .sample-test .input, .sample-test .output { padding: 8px 12px; }
    .sample-test .title { font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; text-align: left; }
    .sample-test pre { margin: 0; background: #efefef; padding: 6px; border-radius: 4px; font-size: 13px; }
    .tex-span { font-style: italic; font-family: "Times New Roman", Times, serif; }
    .tex-formula { font-family: "Times New Roman", Times, serif; }
  </style>
  ${POLYFILL_SCRIPT}
  <script type="module" src="/content-scripts/content.js"></script>
</head>
<body>
  <div class="top-bar">
    <span>🏆 <strong>Codeforces 真实竞赛页面模拟</strong>: 478B - Random Teams</span>
    <span>请点击右下角悬浮球验证数学变量与题意双语排版</span>
  </div>
  <div class="problem-statement">
    <div class="header">
      <div class="title">B. Random Teams</div>
      <div class="time-limit"><div class="property-title">time limit per test: </div>1.0 s</div>
      <div class="memory-limit"><div class="property-title">memory limit per test: </div>256 MB</div>
      <div class="input-file"><div class="property-title">input: </div>standard input</div>
      <div class="output-file"><div class="property-title">output: </div>standard output</div>
    </div>
    <div>
      <p><span class="tex-span"><i>n</i></span> participants of the competition were split into <span class="tex-span"><i>m</i></span> teams in some manner so that each team consists of at least one participant.</p>
      <p>After the competition each pair of participants from the same team became friends.</p>
      <p>Your task is to write a program that will find the minimum and the maximum number of pairs of friends that could have formed by the end of the competition.</p>
    </div>
    <div class="input-specification">
      <div class="section-title">Input</div>
      <p>The single line contains two integers <span class="tex-span"><i>n</i></span> and <span class="tex-span"><i>m</i></span> (<span class="tex-span">1 ≤ <i>m</i> ≤ <i>n</i> ≤ 10<sup>9</sup></span>) — the number of participants and the number of teams respectively.</p>
    </div>
    <div class="output-specification">
      <div class="section-title">Output</div>
      <p>The only line should contain two integers <span class="tex-span"><i>k</i><sub><i>min</i></sub></span> and <span class="tex-span"><i>k</i><sub><i>max</i></sub></span> — the minimum and the maximum possible number of pairs of friends, respectively.</p>
    </div>
    <div class="sample-tests">
      <div class="section-title">Examples</div>
      <div class="sample-test">
        <div class="input">
          <div class="title">Input</div>
          <pre>5 1</pre>
        </div>
        <div class="output">
          <div class="title">Output</div>
          <pre>10 10</pre>
        </div>
      </div>
      <div class="sample-test">
        <div class="input">
          <div class="title">Input</div>
          <pre>3 2</pre>
        </div>
        <div class="output">
          <div class="title">Output</div>
          <pre>1 1</pre>
        </div>
      </div>
    </div>
    <div class="note">
      <div class="section-title">Note</div>
      <p>In the first sample all the participants gets into the single team, so there will be <span class="tex-span">(5 * 4) / 2 = 10</span> pairs of friends.</p>
      <p>In the second sample two participants gets into one team and the third participant into another team, so there will be only <span class="tex-span">1</span> pair of friends.</p>
    </div>
  </div>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/api/log' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    console.log('[BROWSER LOG]', body);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (urlPath === '/api/message' && req.method === 'POST') {
    return handleApiMessage(req, res);
  }

  if (urlPath === '/' || urlPath === '/demo.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(DEMO_HTML);
    return;
  }

  if (urlPath === '/view/github') {
    const html = await getGithubPageHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (urlPath === '/view/github-profile') {
    const html = getGithubProfileHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (urlPath === '/view/codeforces') {
    const html = getCodeforcesPageHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (urlPath === '/view/codeforces-2279d') {
    const html = getCodeforces2279DHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (urlPath === '/view/youtube') {
    const html = getYoutubePageHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  let filePath = path.join(distDir, urlPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    let content = fs.readFileSync(filePath);
    let contentType = 'application/octet-stream';
    if (filePath.endsWith('.html')) {
      contentType = 'text/html; charset=utf-8';
      // Inject polyfill
      let htmlStr = content.toString('utf-8');
      htmlStr = htmlStr.replace('<head>', '<head>' + POLYFILL_SCRIPT);
      content = Buffer.from(htmlStr, 'utf-8');
    } else if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      contentType = 'application/javascript; charset=utf-8';
    } else if (filePath.endsWith('.css')) {
      contentType = 'text/css; charset=utf-8';
    } else if (filePath.endsWith('.json')) {
      contentType = 'application/json; charset=utf-8';
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Preview server running at http://127.0.0.1:3000/');
});
function getYoutubePageHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Anne Hathaway Talks The Idea of You, Devil Wears Prada Trivia & Broadway - YouTube</title>
  <style>
    body {
      font-family: Roboto, Arial, sans-serif;
      background: #0f0f0f;
      color: #f1f1f1;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .nav-bar {
      max-width: 900px;
      margin: 0 auto 20px;
      padding: 12px 16px;
      background: #212121;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .nav-bar a { color: #3ea6ff; text-decoration: none; margin-left: 12px; font-weight: 500; }
    .video-container {
      max-width: 900px;
      margin: 0 auto;
      background: #181818;
      padding: 20px;
      border-radius: 12px;
    }
    h1.ytd-watch-metadata {
      font-size: 20px;
      font-weight: 600;
      line-height: 1.4;
      margin: 0 0 12px 0;
      color: #f1f1f1;
    }
    #description-inline-expander {
      background: #272727;
      padding: 14px 18px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 24px;
      color: #f1f1f1;
    }
    .comments-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .comments-count {
      font-size: 18px;
      font-weight: 600;
    }
    ytd-comment-thread-renderer {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #272727;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3f51b5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }
    .comment-main { flex: 1; }
    .comment-author {
      font-size: 13px;
      color: #aaa;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .comment-author strong { color: #f1f1f1; }
    yt-attributed-string#content-text {
      display: block;
      font-size: 14px;
      line-height: 1.45;
      color: #f1f1f1;
      white-space: pre-wrap;
    }
    .comment-actions {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 8px;
      font-size: 12px;
      color: #aaa;
    }
    .load-more-btn {
      display: block;
      width: 100%;
      padding: 12px;
      background: #272727;
      border: none;
      border-radius: 8px;
      color: #3ea6ff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
      text-align: center;
    }
    .load-more-btn:hover { background: #383838; }
  </style>
  ${POLYFILL_SCRIPT}
  <script type="module" src="/content-scripts/content.js"></script>
</head>
<body>
  <div class="nav-bar">
    <span>🎬 <strong>YouTube 真实视频评论区模拟</strong>: ocGJWc2F1Yk</span>
    <div>
      <a href="/view/codeforces">Codeforces 页面</a>
      <a href="/view/github">GitHub 页面</a>
      <a href="/options.html">扩展设置</a>
    </div>
  </div>

  <div class="video-container">
    <h1 class="ytd-watch-metadata">Anne Hathaway Talks The Idea of You, Devil Wears Prada Trivia & Broadway Cameo | The Tonight Show</h1>

    <div id="description-inline-expander">
      <p>Anne Hathaway chats with Jimmy Fallon about her new romantic comedy The Idea of You, reflects on working with Nicholas Galitzine, and gets tested on The Devil Wears Prada trivia!</p>
    </div>

    <div class="comments-header">
      <div class="comments-count">1,027 Comments</div>
      <div style="font-size: 13px; color: #aaa;">Sort by: Top comments</div>
    </div>

    <div id="comments-list">
      <ytd-comment-thread-renderer>
        <div class="avatar" style="background:#e91e63;">M</div>
        <div class="comment-main">
          <div class="comment-author"><strong>@lastminutesavior</strong> <span>2 years ago</span></div>
          <ytd-comment-view-model>
            <yt-attributed-string id="content-text">
              <span class="yt-core-attributed-string">It's not just her beauty. It's the charm.</span>
            </yt-attributed-string>
          </ytd-comment-view-model>
          <div class="comment-actions"><span>👍 3,240</span> <span>Reply</span></div>
        </div>
      </ytd-comment-thread-renderer>

      <ytd-comment-thread-renderer>
        <div class="avatar" style="background:#009688;">A</div>
        <div class="comment-main">
          <div class="comment-author"><strong>@abdiver12</strong> <span>2 years ago</span></div>
          <ytd-comment-view-model>
            <yt-attributed-string id="content-text">
              <span class="yt-core-attributed-string">I will never forget the late actress Misty Upham saying that when she attended the Oscars years ago, the only person who was nice to her was Anne Hathaway. What an absolutely lovely person she is.</span>
            </yt-attributed-string>
          </ytd-comment-view-model>
          <div class="comment-actions"><span>👍 1,437</span> <span>Reply</span></div>
        </div>
      </ytd-comment-thread-renderer>

      <ytd-comment-thread-renderer>
        <div class="avatar" style="background:#ff9800;">S</div>
        <div class="comment-main">
          <div class="comment-author"><strong>@ScarlettJ1221</strong> <span>2 years ago</span></div>
          <ytd-comment-view-model>
            <yt-attributed-string id="content-text">
              <span class="yt-core-attributed-string">Anne Hathaway is absolutely gorgeous and such a talented actress!</span>
            </yt-attributed-string>
          </ytd-comment-view-model>
          <div class="comment-actions"><span>👍 892</span> <span>Reply</span></div>
        </div>
      </ytd-comment-thread-renderer>

      <ytd-comment-thread-renderer>
        <div class="avatar" style="background:#673ab7;">P</div>
        <div class="comment-main">
          <div class="comment-author"><strong>@PrincessFanatic</strong> <span>1 year ago</span></div>
          <ytd-comment-view-model>
            <yt-attributed-string id="content-text">
              <span class="yt-core-attributed-string">Princess diaries and devil wears prada are classics, so iconic and they never get old!</span>
            </yt-attributed-string>
          </ytd-comment-view-model>
          <div class="comment-actions"><span>👍 615</span> <span>Reply</span></div>
        </div>
      </ytd-comment-thread-renderer>

      <ytd-comment-thread-renderer>
        <div class="avatar" style="background:#3f51b5;">D</div>
        <div class="comment-main">
          <div class="comment-author"><strong>@DavidK-99</strong> <span>1 year ago</span></div>
          <ytd-comment-view-model>
            <yt-attributed-string id="content-text">
              <span class="yt-core-attributed-string">Been a fan of Anne Hathaway since The Princess Diaries. I cannot believe The Princess Diaries came out over two decades ago!</span>
            </yt-attributed-string>
          </ytd-comment-view-model>
          <div class="comment-actions"><span>👍 420</span> <span>Reply</span></div>
        </div>
      </ytd-comment-thread-renderer>
    </div>

    <button class="load-more-btn" onclick="loadMoreComments()">➕ 加载更多新评论 (测试增量动态翻译)</button>
  </div>

  <script>
    function loadMoreComments() {
      const list = document.getElementById('comments-list');
      const newRenderer = document.createElement('ytd-comment-thread-renderer');
      newRenderer.innerHTML = \`
        <div class="avatar" style="background:#4caf50;">E</div>
        <div class="comment-main">
          <div class="comment-author"><strong>@ElenaWonders</strong> <span>Just now</span></div>
          <ytd-comment-view-model>
            <yt-attributed-string id="content-text">
              <span class="yt-core-attributed-string">She looks like a real life Disney princess. Forever stunning and humble!</span>
            </yt-attributed-string>
          </ytd-comment-view-model>
          <div class="comment-actions"><span>👍 12</span> <span>Reply</span></div>
        </div>
      \`;
      list.appendChild(newRenderer);
    }
  </script>
</body>
</html>`;
}
function getCodeforces2279DHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Problem - 2279D - Codeforces</title>
  <style>
    body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background: #fff; color: #000; margin: 0; padding: 20px; line-height: 1.5; }
    .top-bar { max-width: 860px; margin: 0 auto 20px; padding: 10px 16px; background: #e8f4fd; border: 1px solid #b6d4fe; border-radius: 6px; font-size: 13px; color: #084298; display: flex; justify-content: space-between; align-items: center; }
    .top-bar a { color: #0056b3; text-decoration: none; margin-left: 10px; font-weight: 600; }
    .problem-statement { max-width: 860px; margin: 0 auto; border: 1px solid #e1e1e1; padding: 24px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .header { text-align: center; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .time-limit, .memory-limit, .input-file, .output-file { font-size: 13px; color: #555; }
    .property-title { display: inline-block; font-weight: 500; }
    .section-title { font-weight: bold; font-size: 16px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    p { font-size: 14px; margin: 16px 0; line-height: 1.8; }
    ul { padding-left: 20px; margin: 12px 0; font-size: 14px; line-height: 1.8; }
    li { margin: 10px 0; }
    .sample-test { border: 1px solid #888; margin-top: 10px; font-family: monospace; }
    .sample-test .input, .sample-test .output { padding: 8px 12px; }
    .sample-test .title { font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; text-align: left; }
    .sample-test pre { margin: 0; background: #efefef; padding: 6px; border-radius: 4px; font-size: 13px; }
    .MathJax { font-family: "Times New Roman", Times, serif; font-style: italic; }
    .MJX_Assistive_MathML { position: absolute; clip: rect(1px, 1px, 1px, 1px); }
  </style>
  ${POLYFILL_SCRIPT}
  <script type="module" src="/content-scripts/content.js"></script>
</head>
<body>
  <div class="top-bar">
    <span>🏆 <strong>Codeforces 真实竞赛页面模拟</strong>: Contest 2279 Problem D (Meta Graph)</span>
    <div>
      <a href="/view/codeforces">478B 页面</a>
      <a href="/view/github">GitHub</a>
      <a href="/view/youtube">YouTube</a>
      <a href="/options.html">设置</a>
    </div>
  </div>
  <div class="problem-statement">
    <div class="header">
      <div class="title">D. Meta Graph</div>
      <div class="time-limit"><div class="property-title">time limit per test: </div>3 seconds</div>
      <div class="memory-limit"><div class="property-title">memory limit per test: </div>256 megabytes</div>
      <div class="input-file"><div class="property-title">input: </div>standard input</div>
      <div class="output-file"><div class="property-title">output: </div>standard output</div>
    </div>
    <div>
      <p>Given a connected, undirected, simple graph <span class="MathJax"><nobr><span class="math"><span class="mrow"><span class="mi">G</span></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>G</mi></math></span></span> with <span class="MathJax"><nobr><span class="math"><span class="mrow"><span class="mi">n</span></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>n</mi></math></span></span> vertices and <span class="MathJax"><nobr><span class="math"><span class="mrow"><span class="mi">m</span></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>m</mi></math></span></span> edges, define its meta-graph <span class="MathJax"><nobr><span class="math"><span class="mrow"><span class="mi">f</span><span class="mo">(</span><span class="mi">G</span><span class="mo">)</span></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></math></span></span> as follows:</p>
      <ul>
        <li><span class="MathJax"><nobr><span class="math"><span class="mrow"><span class="mi">f</span><span class="mo">(</span><span class="mi">G</span><span class="mo">)</span></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></math></span></span> has <span class="MathJax"><nobr><span class="math"><span class="mrow"><msup><mi>n</mi><mn>2</mn></msup></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>n</mi><mn>2</mn></msup></math></span></span> vertices, labelled <span class="MathJax"><nobr><span class="math"><span class="mrow"><msub><mi>a</mi><mi>b</mi></msub></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><msub><mi>a</mi><mi>b</mi></msub></math></span></span> for <span class="MathJax"><nobr><span class="math"><span class="mrow"><mn>1</mn><mo>≤</mo><mi>a</mi><mo>,</mo><mi>b</mi><mo>≤</mo><mi>n</mi></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mo>≤</mo><mi>a</mi><mo>,</mo><mi>b</mi><mo>≤</mo><mi>n</mi></math></span></span>.</li>
        <li>For every edge <span class="MathJax"><nobr><span class="math"><span class="mrow"><mo stretchy="false">(</mo><mi>a</mi><mo>,</mo><mi>b</mi><mo stretchy="false">)</mo></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mo stretchy="false">(</mo><mi>a</mi><mo>,</mo><mi>b</mi><mo stretchy="false">)</mo></math></span></span> in <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>G</mi></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>G</mi></math></span></span>, add the edges <span class="MathJax"><nobr><span class="math"><span class="mrow"><mo stretchy="false">(</mo><msub><mi>c</mi><mi>a</mi></msub><mo>,</mo><msub><mi>c</mi><mi>b</mi></msub><mo stretchy="false">)</mo></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mo stretchy="false">(</mo><msub><mi>c</mi><mi>a</mi></msub><mo>,</mo><msub><mi>c</mi><mi>b</mi></msub><mo stretchy="false">)</mo></math></span></span> for all <span class="MathJax"><nobr><span class="math"><span class="mrow"><mn>1</mn><mo>≤</mo><mi>c</mi><mo>≤</mo><mi>n</mi></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mo>≤</mo><mi>c</mi><mo>≤</mo><mi>n</mi></math></span></span> to <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></math></span></span>, and also add the edge <span class="MathJax"><nobr><span class="math"><span class="mrow"><mo stretchy="false">(</mo><msub><mi>a</mi><mi>b</mi></msub><mo>,</mo><msub><mi>b</mi><mi>a</mi></msub><mo stretchy="false">)</mo></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mo stretchy="false">(</mo><msub><mi>a</mi><mi>b</mi></msub><mo>,</mo><msub><mi>b</mi><mi>a</mi></msub><mo stretchy="false">)</mo></math></span></span> to <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></math></span></span>.</li>
      </ul>
      <p>Given two vertices <span class="MathJax"><nobr><span class="math"><span class="mrow"><msub><mi>w</mi><mi>x</mi></msub></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><msub><mi>w</mi><mi>x</mi></msub></math></span></span> and <span class="MathJax"><nobr><span class="math"><span class="mrow"><msub><mi>y</mi><mi>z</mi></msub></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><msub><mi>y</mi><mi>z</mi></msub></math></span></span>, determine the number of edges on the shortest path between them in <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></math></span></span>.</p>
    </div>
    <div class="input-specification">
      <div class="section-title">Input</div>
      <p>Each test contains multiple test cases. The first line contains the number of test cases <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>t</mi></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>t</mi></math></span></span> (<span class="MathJax"><nobr><span class="math"><span class="mrow"><mn>1</mn><mo>≤</mo><mi>t</mi><mo>≤</mo><msup><mn>10</mn><mn>4</mn></msup></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mo>≤</mo><mi>t</mi><mo>≤</mo><msup><mn>10</mn><mn>4</mn></msup></math></span></span>). The description of the test cases follows.</p>
      <p>The first line of each test case contains the two integers <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>n</mi></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>n</mi></math></span></span> and <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>m</mi></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>m</mi></math></span></span> (<span class="MathJax"><nobr><span class="math"><span class="mrow"><mn>2</mn><mo>≤</mo><mi>n</mi><mo>≤</mo><mn>2</mn><mo>⋅</mo><msup><mn>10</mn><mn>5</mn></msup></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn><mo>≤</mo><mi>n</mi><mo>≤</mo><mn>2</mn><mo>⋅</mo><msup><mn>10</mn><mn>5</mn></msup></math></span></span>, <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>n</mi><mo>−</mo><mn>1</mn><mo>≤</mo><mi>m</mi><mo>≤</mo><mn>2</mn><mo>⋅</mo><msup><mn>10</mn><mn>5</mn></msup></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>n</mi><mo>−</mo><mn>1</mn><mo>≤</mo><mi>m</mi><mo>≤</mo><mn>2</mn><mo>⋅</mo><msup><mn>10</mn><mn>5</mn></msup></math></span></span>) — the number of vertices and the number of edges in <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>G</mi></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>G</mi></math></span></span>.</p>
    </div>
    <div class="output-specification">
      <div class="section-title">Output</div>
      <p>For each test case, output a single integer: the number of edges on the shortest path from <span class="MathJax"><nobr><span class="math"><span class="mrow"><msub><mi>w</mi><mi>x</mi></msub></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><msub><mi>w</mi><mi>x</mi></msub></math></span></span> to <span class="MathJax"><nobr><span class="math"><span class="mrow"><msub><mi>y</mi><mi>z</mi></msub></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><msub><mi>y</mi><mi>z</mi></msub></math></span></span> in <span class="MathJax"><nobr><span class="math"><span class="mrow"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></mrow></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo stretchy="false">(</mo><mi>G</mi><mo stretchy="false">)</mo></math></span></span>.</p>
    </div>
    <div class="sample-tests">
      <div class="section-title">Example</div>
      <div class="sample-test">
        <div class="input">
          <div class="title">Input</div>
          <pre>3&#10;3 2&#10;1 2 2 1&#10;1 2&#10;2 3</pre>
        </div>
        <div class="output">
          <div class="title">Output</div>
          <pre>2</pre>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
function getGithubProfileHtml() {
  return `<!DOCTYPE html>
<html lang="en" data-color-mode="light">
<head>
  <meta charset="UTF-8">
  <title>felicityblueish - GitHub Profile</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #1f2328; margin: 0; padding: 20px; line-height: 1.5; }
    .top-bar { max-width: 900px; margin: 0 auto 24px; padding: 12px 16px; background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
    .top-bar a { color: #0969da; text-decoration: none; margin-left: 12px; font-weight: 600; }
    .profile-layout { max-width: 900px; margin: 0 auto; display: flex; gap: 32px; }
    .profile-sidebar { width: 280px; flex-shrink: 0; }
    .avatar { width: 260px; height: 260px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 72px; color: white; font-weight: bold; margin-bottom: 16px; }
    .vcard-names { margin-bottom: 16px; }
    .vcard-fullname { font-size: 24px; font-weight: 700; line-height: 1.25; margin: 0; }
    .vcard-username { font-size: 18px; color: #656d76; font-weight: 300; margin: 4px 0 0 0; }
    .user-profile-bio { font-size: 16px; margin-bottom: 16px; color: #1f2328; line-height: 1.5; }
    .profile-main { flex: 1; }
    .pinned-header { font-size: 16px; font-weight: 600; margin: 0 0 16px 0; }
    .pinned-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .pinned-card { border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; background: #ffffff; }
    .repo-name { font-weight: 600; color: #0969da; font-size: 14px; text-decoration: none; }
    .pinned-item-desc { font-size: 12px; color: #656d76; margin: 8px 0 0 0; line-height: 1.5; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    .calendar-cell { width: 10px; height: 10px; border-radius: 2px; }
  </style>
  ${POLYFILL_SCRIPT}
  <script type="module" src="/content-scripts/content.js"></script>
</head>
<body>
  <div class="top-bar">
    <span>👤 <strong>GitHub 真实个人主页模拟</strong>: felicityblueish</span>
    <div>
      <a href="/view/github">README 页面</a>
      <a href="/view/codeforces-2279d">Codeforces 2279D</a>
      <a href="/view/youtube">YouTube</a>
      <a href="/options.html">设置</a>
    </div>
  </div>

  <div class="profile-layout">
    <div class="profile-sidebar">
      <div class="avatar">F</div>
      <div class="vcard-names">
        <h1 class="vcard-fullname">Felicity Blueish</h1>
        <h2 class="vcard-username">felicityblueish</h2>
      </div>

      <!-- Exact GitHub profile bio elements -->
      <div class="p-note user-profile-bio tmp-mb-3 js-user-profile-bio f4" data-bio-text="Build your portfolio website in minutes. ">
        <div>Build your portfolio website in minutes. </div>
      </div>

      <div style="font-size: 13px; color: #656d76; margin-top: 16px;">
        📍 San Francisco, CA &nbsp;•&nbsp; 🔗 https://felicity.dev
      </div>
    </div>

    <div class="profile-main">
      <div class="pinned-header">Pinned Repositories</div>
      <div class="pinned-grid">
        <div class="pinned-card">
          <a class="repo-name" href="#">portfolio-builder</a>
          <p class="pinned-item-desc">A blazing-fast personal portfolio generator designed for software engineers and designers.</p>
        </div>
        <div class="pinned-card">
          <a class="repo-name" href="#">markdown-resume</a>
          <p class="pinned-item-desc">Clean, ATS-friendly markdown resume creator with instant PDF export and dark theme.</p>
        </div>
      </div>

      <!-- Exact GitHub contribution calendar (小绿图) -->
      <div class="js-yearly-contributions" style="margin-top: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #1f2328;">
          1,428 contributions in the last year
        </h2>
        <div class="border py-2 graph-before-activity-overview" style="border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; background: #ffffff;">
          <div class="js-calendar-graph">
            <table class="ContributionCalendar-grid js-calendar-graph-table" style="border-collapse: separate; border-spacing: 3px;">
              <tbody>
                <tr>
                  <td class="ContributionCalendar-label" style="font-size: 9px; color: #656d76; padding-right: 4px;">Mon</td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#40c463;" data-date="2026-05-04"><span class="sr-only">5 contributions on Monday, May 4, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#30a14e;" data-date="2026-05-11"><span class="sr-only">8 contributions on Monday, May 11, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#216e39;" data-date="2026-05-18"><span class="sr-only">12 contributions on Monday, May 18, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#9be9a8;" data-date="2026-05-25"><span class="sr-only">2 contributions on Monday, May 25, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#ebedf0;" data-date="2026-06-01"><span class="sr-only">No contributions on Monday, June 1, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#40c463;" data-date="2026-06-08"><span class="sr-only">6 contributions on Monday, June 8, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#30a14e;" data-date="2026-06-15"><span class="sr-only">9 contributions on Monday, June 15, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#216e39;" data-date="2026-06-22"><span class="sr-only">14 contributions on Monday, June 22, 2026</span></td>
                </tr>
                <tr>
                  <td class="ContributionCalendar-label" style="font-size: 9px; color: #656d76; padding-right: 4px;">Wed</td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#30a14e;" data-date="2026-05-06"><span class="sr-only">7 contributions on Wednesday, May 6, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#40c463;" data-date="2026-05-13"><span class="sr-only">4 contributions on Wednesday, May 13, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#9be9a8;" data-date="2026-05-20"><span class="sr-only">3 contributions on Wednesday, May 20, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#216e39;" data-date="2026-05-27"><span class="sr-only">11 contributions on Wednesday, May 27, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#40c463;" data-date="2026-06-03"><span class="sr-only">5 contributions on Wednesday, June 3, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#30a14e;" data-date="2026-06-10"><span class="sr-only">7 contributions on Wednesday, June 10, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#ebedf0;" data-date="2026-06-17"><span class="sr-only">No contributions on Wednesday, June 17, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#216e39;" data-date="2026-06-24"><span class="sr-only">13 contributions on Wednesday, June 24, 2026</span></td>
                </tr>
                <tr>
                  <td class="ContributionCalendar-label" style="font-size: 9px; color: #656d76; padding-right: 4px;">Fri</td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#9be9a8;" data-date="2026-05-08"><span class="sr-only">2 contributions on Friday, May 8, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#216e39;" data-date="2026-05-15"><span class="sr-only">15 contributions on Friday, May 15, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#40c463;" data-date="2026-05-22"><span class="sr-only">6 contributions on Friday, May 22, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#30a14e;" data-date="2026-05-29"><span class="sr-only">8 contributions on Friday, May 29, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#216e39;" data-date="2026-06-05"><span class="sr-only">10 contributions on Friday, June 5, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#9be9a8;" data-date="2026-06-12"><span class="sr-only">3 contributions on Friday, June 12, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#40c463;" data-date="2026-06-19"><span class="sr-only">5 contributions on Friday, June 19, 2026</span></td>
                  <td class="ContributionCalendar-day calendar-cell" style="background:#30a14e;" data-date="2026-06-26"><span class="sr-only">8 contributions on Friday, June 26, 2026</span></td>
                </tr>
              </tbody>
            </table>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 11px; color: #656d76;">
              <span style="color: #0969da;">Learn how we count contributions</span>
              <div class="contrib-legend" style="display: flex; align-items: center; gap: 4px;">
                <span>Less</span>
                <span class="calendar-cell" style="display:inline-block;background:#ebedf0;"></span>
                <span class="calendar-cell" style="display:inline-block;background:#9be9a8;"></span>
                <span class="calendar-cell" style="display:inline-block;background:#40c463;"></span>
                <span class="calendar-cell" style="display:inline-block;background:#30a14e;"></span>
                <span class="calendar-cell" style="display:inline-block;background:#216e39;"></span>
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
