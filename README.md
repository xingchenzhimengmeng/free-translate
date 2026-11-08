<div align="center">

# Free Translate 🌐

**免费、开放、无商业锁的双语网页与文档排版翻译扩展**
<br />
*Free, Open-Source Bilingual Web & Document Translation Extension for Chrome & Edge (Manifest V3)*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest: V3](https://img.shields.io/badge/Manifest-V3-success.svg)](#)
[![Framework: WXT](https://img.shields.io/badge/Framework-WXT-purple.svg)](https://wxt.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](#)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](#)

[简体中文](#简体中文) | [English](#english)

</div>

---

<h2 id="简体中文">📖 简体中文</h2>

### 项目简介

**Free Translate** 是一款从零独立研发、安全隐私、开箱即用的现代化浏览器双语翻译扩展。

旨在为所有用户提供长期稳定、免费无锁的对照阅读体验：
- 🚀 **零门槛开箱即用**：优先调用 Chrome 138+ 原生端侧 `Translator` 模型（离线无延迟），并内置 Microsoft Edge 官方通道与 Google 免费在线通道作为多级自动降级兜底。
- 🤖 **AI 智能上下文**：告别传统的无状态分批生硬机翻，自动提取篇章主题与前序段落滑动窗口记忆，让人称代词、专有名词与行文语调前后连贯一致。
- 🔑 **全开放自定义 API**：无任何会员墙或代理中转，直连 DeepL（Free/Pro 自动识别）、Google Gemini、百度翻译（含 1 QPS 互斥锁），以及 DeepSeek、硅基流动（SiliconFlow）、OpenRouter、本地私有 Ollama 等任意 OpenAI 兼容接口。
- 📚 **PDF / EPUB 文档双语排版中心**：纯本地解析与重构，支持双语排版阅读、双栏分屏对照，并支持导出双语 EPUB 电子书、导出排版 HTML 及一键另存为双语 PDF。

---

### 核心特性一览

| 功能模块 | 描述 |
| :--- | :--- |
| **网页双语对照** | 原文下方紧随高可读性译文，可随时一键切换为“仅看译文”或恢复原文；支持 `Alt+A` 快捷键 |
| **智能代码与标签保护** | 智能扫描 DOM，自动排除代码块（`pre`、`code`）、输入框与 `translate="no"` 区域 |
| **AI 智能上下文** | 维护篇章级滑动窗口，向大模型注入前序已译语境，彻底解决代词指代与专有名词漂移问题 |
| **轻量划词浮窗** | 选中文本即浮出操作图标，点击展开卡片，支持原文对照、当前引擎标注与一键复制 |
| **文档排版工作室** | 拖拽上传 PDF / EPUB / Markdown，支持逐段对照与双栏分屏，导出双语 EPUB / HTML / PDF |
| **故障自动降级链** | 自定义接口欠费或网络异常时，平滑降级至本地模型或免费在线通道，页面翻译不中断 |
| **域名黑白名单** | 支持设置特定域名“总是自动翻译”或“从不翻译”，按需按站点智能生效 |
| **安全与本地存储** | 所有 API Key 存储在本地 `chrome.storage.local`（永不上云），配置带 7 天 IndexedDB 索引缓存 |

---

### 📦 用户安装教程（无需配置开发环境）

#### 1. 下载安装包
前往项目的 [Releases 页面](../../releases) 下载最新版的发布包：
- **Chrome / Chromium 浏览器**：下载 `free-translate-x.x.x-chrome.zip`
- **Microsoft Edge 浏览器**：下载 `free-translate-x.x.x-edge.zip`

#### 2. 解压文件
将下载的 `.zip` 压缩包解压到本地任意目录（例如 `D:\tools\free-translate`）。解压后应包含 `manifest.json`、`popup.html` 等核心文件。

#### 3. 安装到 Chrome
1. 在 Chrome 地址栏输入 `chrome://extensions/` 并回车。
2. 打开右上角的 **“开发者模式”**（Developer Mode）开关。
3. 点击左上角的 **“加载已解压的扩展程序”**（Load unpacked）。
4. 在弹出的文件选择框中，选中刚才解压后的文件夹即可完成安装。
5. 点击浏览器右上角的拼图图标（扩展图标），找到 **Free Translate** 并点击图钉将其固定到工具栏。

#### 4. 安装到 Edge
1. 在 Edge 地址栏输入 `edge://extensions/` 并回车。
2. 开启左侧菜单栏下方的 **“开发人员模式”** 开关。
3. 点击页面右侧的 **“加载解压缩的扩展”**。
4. 选择解压后的文件夹即可立即启用。

---

### 💻 开发者指南

#### 环境依赖
- Node.js >= 18.0.0 (推荐 Node 20 / 22 / 26)
- pnpm >= 9.0.0 (或 npm)

#### 开发与构建步骤
```bash
# 1. 克隆项目仓库
git clone https://github.com/your-username/free-translate.git
cd free-translate

# 2. 安装依赖包
npm install

# 3. 启动实时热重载开发服务
npm run dev        # Chrome 开发模式
npm run dev:edge   # Edge 开发模式

# 4. 执行自动化测试与类型检查
npm test           # 运行全套 Vitest 单元与接口仿真测试 (28 项测试)
npm run compile    # TypeScript 严格类型检查

# 5. 编译生产构建包
npm run build      # 生成 Chrome 产物 (.output/chrome-mv3)
npm run build:edge # 生成 Edge 产物 (.output/edge-mv3)
npm run zip        # 打包生产发布 zip 包
```

---

<h2 id="english">📖 English</h2>

### Overview

**Free Translate** is an open-source, privacy-first, zero-paywall bilingual browser translation extension for Chrome and Edge (Manifest V3).

Built from the ground up with **WXT + TypeScript + React**, it delivers a seamless reading experience:
- 🚀 **Zero-Config Ready**: Uses Chrome 138+ built-in on-device `Translator` model by default (zero latency, offline), with multi-tiered automatic fallback to official Microsoft Edge and Google translation endpoints.
- 🤖 **AI Smart Context**: Solves the pitfalls of stateless batching by injecting document titles and a rolling window of preceding translated paragraphs to maintain terminology consistency and accurate pronoun resolution across the entire page.
- 🔑 **Full BYOK Freedom**: Direct connection without third-party gateways to DeepL (Free/Pro auto-detection), Google Gemini, Baidu Translate (with 1 QPS concurrency lock), and any OpenAI-compatible provider (DeepSeek, SiliconFlow, OpenRouter, local Ollama).
- 📚 **Bilingual Document Studio**: Complete local parsing and typesetting for PDF, EPUB, and Markdown documents. Features side-by-side split reading and one-click export to bilingual EPUB eBooks, standalone HTML, and print-ready PDFs.

---

### 📦 Installation for Users (No Coding Required)

#### 1. Download Release
Go to the [Releases](../../releases) tab and download the zip bundle:
- **For Google Chrome / Chromium**: `free-translate-x.x.x-chrome.zip`
- **For Microsoft Edge**: `free-translate-x.x.x-edge.zip`

#### 2. Unzip
Extract the archive to a local folder (e.g. `D:\tools\free-translate`). The folder should contain `manifest.json`, `popup.html`, etc.

#### 3. Load in Chrome
1. Navigate to `chrome://extensions/` in your Chrome address bar.
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked** on the top left.
4. Select the unzipped folder. Pin the extension to your toolbar.

#### 4. Load in Edge
1. Navigate to `edge://extensions/` in your Edge address bar.
2. Enable **Developer mode** on the left sidebar.
3. Click **Load unpacked** and choose the extracted directory.

---

### 💻 Developer Setup

```bash
# Clone the repository
git clone https://github.com/your-username/free-translate.git
cd free-translate

# Install dependencies
npm install

# Start development with hot reloading
npm run dev        # For Chrome
npm run dev:edge   # For Edge

# Run automated tests
npm test           # Vitest suite with Happy-DOM emulation
npm run compile    # Type checking with TypeScript

# Production build
npm run build
npm run zip
```

---

### 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.
