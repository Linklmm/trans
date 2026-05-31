# Chrome Ollama英译汉扩展 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个Chrome扩展，通过调用本地Ollama大模型实现英译汉功能，译文以简洁样式显示在原文下方。

**Architecture:** Manifest V3架构，Background Service Worker作为API调用中心，Content Script处理页面DOM交互，Popup提供设置界面。消息通过chrome.runtime.sendMessage传递。

**Tech Stack:** Chrome Extension Manifest V3, vanilla JavaScript, CSS, Ollama API

---

## 文件结构总览

```
trans/
├── manifest.json              # 扩展配置文件
├── background/
│   └── service-worker.js      # Background Service Worker - API调用与消息路由
├── content/
│   ├── content.js             # Content Script - 页面交互与DOM操作
│   └── content.css            # 译文样式
├── popup/
│   ├── popup.html             # Popup HTML界面
│   ├── popup.js               # Popup逻辑
│   └── popup.css              # Popup样式
├── utils/
│   ├── api.js                 # Ollama API封装
│   ├── cache.js               # 缓存工具
│   └── content-detector.js    # 智能内容检测
├── icons/
│   ├── icon16.png             # 16x16图标
│   ├── icon48.png             # 48x48图标
│   └── icon128.png            # 128x128图标
└── README.md                  # 使用说明
```

---

## Task 1: 项目初始化与Manifest配置

**Files:**
- Create: `manifest.json`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p background content popup utils icons
```

- [ ] **Step 2: 创建manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Ollama Translator",
  "version": "1.0.0",
  "description": "使用本地Ollama大模型进行英译汉翻译",
  "permissions": [
    "storage",
    "activeTab",
    "contextMenus",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["utils/api.js", "utils/cache.js", "utils/content-detector.js", "content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "commands": {
    "translate-selection": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "mac": "Command+Shift+T"
      },
      "description": "翻译选中内容"
    },
    "translate-page": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "Command+Shift+P"
      },
      "description": "翻译整个页面"
    }
  }
}
```

- [ ] **Step 3: 验证manifest.json有效性**

在Chrome浏览器中：
1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择trans目录
5. 确认扩展显示无错误

- [ ] **Step 4: Commit**

```bash
git add manifest.json
git commit -m "feat: init Chrome extension manifest v3"
```

---

## Task 2: Ollama API封装

**Files:**
- Create: `utils/api.js`

- [ ] **Step 1: 创建api.js基础结构**

```javascript
// utils/api.js - Ollama API封装

/**
 * Ollama API客户端
 */
class OllamaAPI {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.timeout = 30000; // 30秒超时
  }

  /**
   * 设置API地址
   */
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * 获取已安装的模型列表
   */
  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      throw new Error(`获取模型列表失败: ${error.message}`);
    }
  }

  /**
   * 翻译文本
   * @param {string} text - 待翻译文本
   * @param {string} model - 模型名称
   * @returns {string} - 翻译结果
   */
  async translate(text, model) {
    const prompt = `将以下英文翻译成中文，只返回译文，不要解释：\n${text}`;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      throw new Error(`翻译失败: ${error.message}`);
    }
  }

  /**
   * 检查服务是否可用
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 导出（支持模块和全局两种方式）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OllamaAPI };
} else {
  window.OllamaAPI = OllamaAPI;
}
```

- [ ] **Step 2: 验证API模块**

在浏览器Console中测试（需先加载扩展）：
1. 打开任意页面
2. Console输入：`const api = new OllamaAPI(); api.checkConnection()`
3. 确认返回Promise<boolean>

- [ ] **Step 3: Commit**

```bash
git add utils/api.js
git commit -m "feat: add Ollama API wrapper"
```

---

## Task 3: 缓存工具

**Files:**
- Create: `utils/cache.js`

- [ ] **Step 1: 创建cache.js**

```javascript
// utils/cache.js - 翻译缓存工具

/**
 * 简单字符串哈希函数
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 翻译缓存管理器
 */
class TranslationCache {
  constructor() {
    this.enabled = true;
    this.storageKey = 'ollama_cache';
  }

  /**
   * 生成缓存key
   */
  _getKey(text, model) {
    return `trans_${hashString(text)}_${model}`;
  }

  /**
   * 获取缓存
   */
  async get(text, model) {
    if (!this.enabled) return null;

    try {
      const key = this._getKey(text, model);
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch {
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(text, model, translation) {
    if (!this.enabled) return;

    try {
      const key = this._getKey(text, model);
      await chrome.storage.local.set({ [key]: translation });
    } catch {
      // 缓存失败不影响翻译
    }
  }

  /**
   * 清除所有缓存
   */
  async clearAll() {
    try {
      const allData = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(allData).filter(k => k.startsWith('trans_'));
      await chrome.storage.local.remove(cacheKeys);
    } catch {
      // 清除失败静默处理
    }
  }

  /**
   * 启用/禁用缓存
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * 获取缓存状态
   */
  isEnabled() {
    return this.enabled;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TranslationCache, hashString };
} else {
  window.TranslationCache = TranslationCache;
  window.hashString = hashString;
}
```

- [ ] **Step 2: 验证缓存模块**

在浏览器Console测试：
1. `const cache = new TranslationCache(); cache.set('hello', 'qwen2', '你好')`
2. `cache.get('hello', 'qwen2')` 应返回 '你好'
3. `cache.clearAll()` 后 `cache.get('hello', 'qwen2')` 应返回 null

- [ ] **Step 3: Commit**

```bash
git add utils/cache.js
git commit -m "feat: add translation cache utility"
```

---

## Task 4: 智能内容检测

**Files:**
- Create: `utils/content-detector.js`

- [ ] **Step 1: 创建content-detector.js**

```javascript
// utils/content-detector.js - 智能内容检测

/**
 * 内容检测器 - 识别页面主要内容区域
 */
class ContentDetector {
  constructor() {
    // 优先检测的标签
    this.priorityTags = ['article', 'main', '[role="main"]', '.post-content', '.article-content'];
    // 需要忽略的标签
    this.ignoreTags = ['nav', 'header', 'footer', 'aside', 'script', 'style', 'iframe', 'noscript'];
    // 需要忽略的class/id关键词
    this.ignorePatterns = ['nav', 'menu', 'sidebar', 'footer', 'header', 'comment', 'ad', 'advertisement', 'banner'];
  }

  /**
   * 检测主要内容区域
   * @returns {Element|null} - 主要内容容器
   */
  detectMainContent() {
    // 优先检测特定标签
    for (const selector of this.priorityTags) {
      const element = document.querySelector(selector);
      if (element && this._isValidContent(element)) {
        return element;
      }
    }

    // 基于文本密度检测
    return this._findByTextDensity();
  }

  /**
   * 验证元素是否为有效内容
   */
  _isValidContent(element) {
    if (!element) return false;

    // 检查是否在忽略列表中
    const tagName = element.tagName.toLowerCase();
    if (this.ignoreTags.includes(tagName)) return false;

    // 检查class/id是否包含忽略关键词
    const className = element.className || '';
    const id = element.id || '';
    for (const pattern of this.ignorePatterns) {
      if (className.toLowerCase().includes(pattern) || id.toLowerCase().includes(pattern)) {
        return false;
      }
    }

    // 检查文本长度
    const textLength = element.textContent.trim().length;
    return textLength > 100;
  }

  /**
   * 基于文本密度查找主要内容
   */
  _findByTextDensity() {
    const candidates = document.querySelectorAll('div, section');
    let bestElement = null;
    let bestScore = 0;

    for (const element of candidates) {
      if (!this._isValidContent(element)) continue;

      const score = this._calculateDensityScore(element);
      if (score > bestScore) {
        bestScore = score;
        bestElement = element;
      }
    }

    return bestElement;
  }

  /**
   * 计算文本密度评分
   */
  _calculateDensityScore(element) {
    const text = element.textContent.trim();
    const textLength = text.length;

    // 计算链接密度（链接文本占比）
    const links = element.querySelectorAll('a');
    let linkTextLength = 0;
    for (const link of links) {
      linkTextLength += link.textContent.trim().length;
    }
    const linkDensity = linkTextLength / textLength;

    // 计算段落数量
    const paragraphs = element.querySelectorAll('p');
    const paragraphCount = paragraphs.length;

    // 评分公式：文本长度 * (1 - 链接密度) * 段落数权重
    const score = textLength * (1 - linkDensity) * (1 + paragraphCount * 0.1);

    return score;
  }

  /**
   * 获取所有可翻译的文本节点
   * @param {Element} container - 内容容器，为null时获取全页面
   * @returns {Array} - 文本节点数组
   */
  getTextNodes(container = null) {
    const root = container || document.body;
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 过滤空白文本
          if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;

          // 过滤忽略标签内的文本
          let parent = node.parentElement;
          while (parent && parent !== root) {
            const tagName = parent.tagName.toLowerCase();
            if (this.ignoreTags.includes(tagName)) return NodeFilter.FILTER_REJECT;

            const className = parent.className || '';
            const id = parent.id || '';
            for (const pattern of this.ignorePatterns) {
              if (className.toLowerCase().includes(pattern) || id.toLowerCase().includes(pattern)) {
                return NodeFilter.FILTER_REJECT;
              }
            }
            parent = parent.parentElement;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  /**
   * 将文本节点按段落分组
   */
  groupByParagraphs(textNodes) {
    const groups = [];
    const processedParents = new Set();

    for (const node of textNodes) {
      // 找到最近的段落级父元素
      let paragraphParent = node.parentElement;
      while (paragraphParent && !this._isParagraphElement(paragraphParent)) {
        paragraphParent = paragraphParent.parentElement;
      }

      if (paragraphParent && !processedParents.has(paragraphParent)) {
        processedParents.add(paragraphParent);
        const text = paragraphParent.textContent.trim();
        if (text.length > 10) {
          groups.push({
            element: paragraphParent,
            text: text,
            nodes: this.getTextNodes(paragraphParent)
          });
        }
      } else if (!paragraphParent) {
        // 无段落父元素，单独处理
        const text = node.textContent.trim();
        if (text.length > 10) {
          groups.push({
            element: node.parentElement,
            text: text,
            nodes: [node]
          });
        }
      }
    }

    return groups;
  }

  /**
   * 判断是否为段落级元素
   */
  _isParagraphElement(element) {
    const tag = element.tagName.toLowerCase();
    const paragraphTags = ['p', 'div', 'article', 'section', 'li', 'td', 'blockquote'];
    return paragraphTags.includes(tag);
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContentDetector };
} else {
  window.ContentDetector = ContentDetector;
}
```

- [ ] **Step 2: 验证内容检测模块**

在任意新闻/文章页面Console测试：
1. `const detector = new ContentDetector();`
2. `detector.detectMainContent()` 应返回主要内容区域元素
3. `detector.getTextNodes()` 应返回文本节点数组

- [ ] **Step 3: Commit**

```bash
git add utils/content-detector.js
git commit -m "feat: add smart content detector"
```

---

## Task 5: Background Service Worker

**Files:**
- Create: `background/service-worker.js`

- [ ] **Step 1: 创建service-worker.js**

```javascript
// background/service-worker.js - Background Service Worker

importScripts('utils/api.js', 'utils/cache.js');

// 初始化
const api = new OllamaAPI();
const cache = new TranslationCache();

// 默认配置
const defaultSettings = {
  baseUrl: 'http://localhost:11434',
  model: '',
  cacheEnabled: true,
  triggers: {
    selection: true,
    page: true,
    paragraph: true
  }
};

// 扩展安装时初始化
chrome.runtime.onInstalled.addListener(async () => {
  // 设置默认配置
  await chrome.storage.sync.set(defaultSettings);

  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: '翻译选中内容',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'translate-smart',
    title: '智能翻译主要内容',
    contexts: ['page']
  });

  console.log('Ollama Translator installed');
});

// 监听配置变化
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    if (changes.baseUrl) {
      api.setBaseUrl(changes.baseUrl.newValue);
    }
    if (changes.cacheEnabled) {
      cache.setEnabled(changes.cacheEnabled.newValue);
    }
  }
});

// 右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translate-selection') {
    const text = info.selectionText;
    if (text) {
      // 发送消息到Content Script
      chrome.tabs.sendMessage(tab.id, {
        action: 'translateSelection',
        text: text
      });
    }
  } else if (info.menuItemId === 'translate-smart') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateSmart'
    });
  }
});

// 快捷键命令
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'translate-selection') {
    // 需要先获取选中文本
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });
    const text = results[0].result;
    if (text) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'translateSelection',
        text: text
      });
    }
  } else if (command === 'translate-page') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'translatePage'
    });
  }
});

// 监听来自Content Script和Popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理异步响应
  handleMessage(message, sender).then(sendResponse);
  return true; // 保持消息通道开启
});

async function handleMessage(message, sender) {
  const settings = await chrome.storage.sync.get(null);
  api.setBaseUrl(settings.baseUrl || defaultSettings.baseUrl);
  cache.setEnabled(settings.cacheEnabled ?? defaultSettings.cacheEnabled);

  switch (message.action) {
    case 'translate':
      return await handleTranslate(message.text, settings.model);

    case 'getModels':
      return await handleGetModels();

    case 'checkConnection':
      return await api.checkConnection();

    case 'clearCache':
      await cache.clearAll();
      return { success: true };

    case 'getSettings':
      return settings;

    case 'updateSettings':
      await chrome.storage.sync.set(message.settings);
      return { success: true };

    default:
      return { error: 'Unknown action' };
  }
}

async function handleTranslate(text, model) {
  if (!model) {
    return { error: '请先选择翻译模型' };
  }

  // 检查缓存
  const cached = await cache.get(text, model);
  if (cached) {
    return { translation: cached, cached: true };
  }

  // 分段处理长文本
  const maxChunkSize = 500;
  const chunks = splitText(text, maxChunkSize);

  try {
    let result = '';
    for (const chunk of chunks) {
      const translation = await api.translate(chunk, model);
      result += translation;
    }

    // 存入缓存
    await cache.set(text, model, result);

    return { translation: result };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleGetModels() {
  try {
    const models = await api.getModels();
    return { models: models.map(m => m.name) };
  } catch (error) {
    return { error: error.message, models: [] };
  }
}

function splitText(text, maxSize) {
  if (text.length <= maxSize) return [text];

  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  let currentChunk = '';
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks;
}
```

- [ ] **Step 2: 验证Service Worker**

1. 在 `chrome://extensions/` 点击扩展的"Service Worker"链接
2. 确认无错误日志
3. 在Console发送测试消息：`chrome.runtime.sendMessage({action: 'checkConnection'}, console.log)`

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: add background service worker"
```

---

## Task 6: Content Script样式

**Files:**
- Create: `content/content.css`

- [ ] **Step 1: 创建content.css**

```css
/* content/content.css - 译文样式 */

/* 译文容器 */
.ollama-translation {
  display: block;
  font-size: 0.9em;
  color: #666;
  font-style: italic;
  margin-top: 4px;
  line-height: 1.4;
  clear: both;
}

/* 翻译中状态 */
.ollama-translation.loading {
  color: #888;
  font-style: normal;
}

.ollama-translation.loading::after {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: 8px;
  border: 2px solid #888;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 翻译失败状态 */
.ollama-translation.error {
  color: #c00;
  font-style: normal;
  cursor: pointer;
}

.ollama-translation.error:hover {
  color: #f00;
  text-decoration: underline;
}

/* 段落翻译按钮 */
.ollama-translate-btn {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #4a90d9;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  opacity: 0.7;
  transition: opacity 0.2s;
  z-index: 10000;
  margin-left: 4px;
}

.ollama-translate-btn:hover {
  opacity: 1;
}

.ollama-translate-btn.hidden {
  display: none;
}

/* 翻译进度条 */
.ollama-progress {
  position: fixed;
  top: 10px;
  right: 10px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 10001;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ollama-progress-bar {
  width: 100px;
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.ollama-progress-fill {
  height: 100%;
  background: #4a90d9;
  transition: width 0.3s;
}

.ollama-progress-close {
  cursor: pointer;
  color: #999;
  font-size: 18px;
}

.ollama-progress-close:hover {
  color: #333;
}

/* 高亮段落 */
.ollama-highlight {
  background-color: rgba(74, 144, 217, 0.1);
  border-radius: 2px;
}

/* 防止译文影响原有布局 */
.ollama-translation-wrapper {
  position: relative;
  display: inline;
}
```

- [ ] **Step 2: 验证样式加载**

1. 加载扩展后访问任意页面
2. 在元素检查器中确认content.css已加载
3. 手动添加 `<span class="ollama-translation">测试译文</span>` 验证样式

- [ ] **Step 3: Commit**

```bash
git add content/content.css
git commit -m "feat: add translation display styles"
```

---

## Task 7: Content Script主逻辑

**Files:**
- Create: `content/content.js`

- [ ] **Step 1: 创建content.js基础结构和工具函数**

```javascript
// content/content.js - Content Script主逻辑

(function() {
  'use strict';

  // 初始化工具
  const detector = new ContentDetector();
  let translationQueue = [];
  let isTranslating = false;
  let currentTranslationId = 0;

  /**
   * 创建译文元素
   */
  function createTranslationElement(originalText, showLoading = true) {
    const span = document.createElement('span');
    span.className = 'ollama-translation';
    span.dataset.original = originalText;
    if (showLoading) {
      span.classList.add('loading');
      span.textContent = '翻译中';
    }
    return span;
  }

  /**
   * 更新译文元素状态
   */
  function updateTranslationResult(element, result) {
    element.classList.remove('loading');

    if (result.error) {
      element.classList.add('error');
      element.textContent = result.error;
      element.onclick = () => retryTranslation(element);
    } else {
      element.classList.remove('error');
      element.textContent = result.translation;
      element.onclick = null;
    }
  }

  /**
   * 重试翻译
   */
  async function retryTranslation(element) {
    const originalText = element.dataset.original;
    element.classList.remove('error');
    element.classList.add('loading');
    element.textContent = '翻译中';

    const result = await sendTranslateRequest(originalText);
    updateTranslationResult(element, result);
  }

  /**
   * 发送翻译请求到Background
   */
  async function sendTranslateRequest(text) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'translate', text: text },
        resolve
      );
    });
  }

  /**
   * 在元素后插入译文
   */
  function insertTranslationAfter(element, translationElement) {
    // 确保不影响原有布局
    const wrapper = element.parentElement;
    if (wrapper && !wrapper.classList.contains('ollama-translation-wrapper')) {
      // 创建包装器保持inline结构
      const spanWrapper = document.createElement('span');
      spanWrapper.className = 'ollama-translation-wrapper';
      element.parentNode.insertBefore(spanWrapper, element);
      spanWrapper.appendChild(element);
    }
    element.parentNode.insertBefore(translationElement, element.nextSibling);
  }

  console.log('Ollama Translator Content Script loaded');
})();
```

- [ ] **Step 2: 添加选中翻译功能**

在content.js中追加：

```javascript
  /**
   * 处理选中翻译
   */
  function handleSelectionTranslation(selectedText) {
    // 获取选区范围
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 创建译文元素
    const translationElement = createTranslationElement(selectedText);

    // 创建浮动容器
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: ${rect.left + window.scrollX}px;
      top: ${rect.bottom + window.scrollY + 4}px;
      z-index: 10000;
      background: white;
      padding: 8px 12px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-width: 300px;
    `;
    container.appendChild(translationElement);
    document.body.appendChild(container);

    // 发送翻译请求
    sendTranslateRequest(selectedText).then(result => {
      updateTranslationResult(translationElement, result);
    });

    // 点击其他地方关闭
    const closeHandler = (e) => {
      if (!container.contains(e.target)) {
        container.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
  }

  // 监听来自Background的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'translateSelection') {
      handleSelectionTranslation(message.text);
    } else if (message.action === 'translatePage') {
      handlePageTranslation();
    } else if (message.action === 'translateSmart') {
      handleSmartTranslation();
    } else if (message.action === 'translateParagraph') {
      handleParagraphTranslation(message.elementId);
    } else if (message.action === 'cancelTranslation') {
      cancelCurrentTranslation();
    }
    return false;
  });
```

- [ ] **Step 3: 添加全文翻译功能**

在content.js中追加：

```javascript
  /**
   * 创建进度显示
   */
  function createProgressUI() {
    const progressDiv = document.createElement('div');
    progressDiv.className = 'ollama-progress';
    progressDiv.innerHTML = `
      <span class="ollama-progress-text">正在翻译 0/0</span>
      <div class="ollama-progress-bar">
        <div class="ollama-progress-fill" style="width: 0%"></div>
      </div>
      <span class="ollama-progress-close">×</span>
    `;

    progressDiv.querySelector('.ollama-progress-close').onclick = () => {
      cancelCurrentTranslation();
      progressDiv.remove();
    };

    document.body.appendChild(progressDiv);
    return progressDiv;
  }

  /**
   * 更新进度
   */
  function updateProgress(progressDiv, current, total) {
    progressDiv.querySelector('.ollama-progress-text').textContent =
      `正在翻译 ${current}/${total}`;
    progressDiv.querySelector('.ollama-progress-fill').style.width =
      `${(current / total) * 100}%`;
  }

  /**
   * 取消当前翻译
   */
  function cancelCurrentTranslation() {
    isTranslating = false;
    translationQueue = [];
  }

  /**
   * 处理全文翻译
   */
  async function handlePageTranslation() {
    if (isTranslating) {
      alert('已有翻译任务在进行中');
      return;
    }

    isTranslating = true;
    const paragraphs = detector.groupByParagraphs(detector.getTextNodes());

    if (paragraphs.length === 0) {
      alert('页面未找到可翻译的内容');
      isTranslating = false;
      return;
    }

    const progressDiv = createProgressUI();

    for (let i = 0; i < paragraphs.length && isTranslating; i++) {
      const para = paragraphs[i];
      updateProgress(progressDiv, i + 1, paragraphs.length);

      // 检查是否已翻译
      const existingTranslation = para.element.querySelector('.ollama-translation');
      if (existingTranslation && existingTranslation.textContent.trim()) {
        continue;
      }

      const translationElement = createTranslationElement(para.text);
      para.element.appendChild(translationElement);

      const result = await sendTranslateRequest(para.text);
      updateTranslationResult(translationElement, result);
    }

    progressDiv.remove();
    isTranslating = false;
  }
```

- [ ] **Step 4: 添加智能翻译功能**

在content.js中追加：

```javascript
  /**
   * 处理智能翻译
   */
  async function handleSmartTranslation() {
    if (isTranslating) {
      alert('已有翻译任务在进行中');
      return;
    }

    const mainContent = detector.detectMainContent();
    if (!mainContent) {
      alert('未识别到主要内容区域，将翻译整个页面');
      handlePageTranslation();
      return;
    }

    isTranslating = true;

    // 高亮主要内容区域
    mainContent.classList.add('ollama-highlight');

    const paragraphs = detector.groupByParagraphs(detector.getTextNodes(mainContent));
    const progressDiv = createProgressUI();

    for (let i = 0; i < paragraphs.length && isTranslating; i++) {
      const para = paragraphs[i];
      updateProgress(progressDiv, i + 1, paragraphs.length);

      const existingTranslation = para.element.querySelector('.ollama-translation');
      if (existingTranslation && existingTranslation.textContent.trim()) {
        continue;
      }

      const translationElement = createTranslationElement(para.text);
      para.element.appendChild(translationElement);

      const result = await sendTranslateRequest(para.text);
      updateTranslationResult(translationElement, result);
    }

    progressDiv.remove();
    mainContent.classList.remove('ollama-highlight');
    isTranslating = false;
  }
```

- [ ] **Step 5: 添加段落级翻译功能**

在content.js中追加：

```javascript
  /**
   * 创建段落翻译按钮
   */
  function createParagraphButton(paragraphElement) {
    const btn = document.createElement('span');
    btn.className = 'ollama-translate-btn';
    btn.textContent = '译';
    btn.style.display = 'none';

    btn.onclick = (e) => {
      e.stopPropagation();
      translateParagraph(paragraphElement);
      btn.remove();
    };

    return btn;
  }

  /**
   * 翻译单个段落
   */
  async function translateParagraph(paragraphElement) {
    const text = paragraphElement.textContent.trim();
    if (!text) return;

    const existingTranslation = paragraphElement.querySelector('.ollama-translation');
    if (existingTranslation) {
      existingTranslation.remove();
    }

    const translationElement = createTranslationElement(text);
    paragraphElement.appendChild(translationElement);

    const result = await sendTranslateRequest(text);
    updateTranslationResult(translationElement, result);
  }

  /**
   * 启用段落悬停翻译模式
   */
  function enableParagraphHoverMode() {
    const paragraphs = document.querySelectorAll('p, div.paragraph, article p');

    paragraphs.forEach(p => {
      const btn = createParagraphButton(p);
      p.style.position = 'relative';
      p.appendChild(btn);

      p.onmouseenter = () => {
        btn.style.display = 'inline-flex';
      };

      p.onmouseleave = () => {
        if (!btn.classList.contains('hidden')) {
          btn.style.display = 'none';
        }
      };
    });
  }

  /**
   * 处理段落翻译消息
   */
  function handleParagraphTranslation(elementId) {
    const element = document.querySelector(`[data-ollama-id="${elementId}"]`);
    if (element) {
      translateParagraph(element);
    }
  }

  // 初始化段落悬停模式（根据设置）
  chrome.storage.sync.get('triggers', (result) => {
    if (result.triggers?.paragraph) {
      enableParagraphHoverMode();
    }
  });
```

- [ ] **Step 6: 验证Content Script完整功能**

1. 选中页面文本，右键"翻译选中内容"，确认译文显示
2. 快捷键 `Ctrl+Shift+P` 触发全文翻译，确认进度条显示
3. 右键"智能翻译主要内容"，确认只翻译主内容区域
4. 鼠标悬停段落，确认翻译按钮显示并可点击

- [ ] **Step 7: Commit**

```bash
git add content/content.js
git commit -m "feat: add content script with all translation features"
```

---

## Task 8: Popup界面HTML

**Files:**
- Create: `popup/popup.html`

- [ ] **Step 1: 创建popup.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ollama Translator</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Ollama Translator</h1>
      <span class="connection-status" id="connectionStatus">检查连接...</span>
    </header>

    <main class="popup-main">
      <!-- API设置 -->
      <section class="settings-section">
        <h2>API设置</h2>

        <div class="setting-item">
          <label for="baseUrl">Ollama地址</label>
          <input type="text" id="baseUrl" placeholder="http://localhost:11434">
        </div>

        <div class="setting-item">
          <label for="modelSelect">翻译模型</label>
          <div class="model-select-wrapper">
            <select id="modelSelect">
              <option value="">请先连接Ollama</option>
            </select>
            <button class="refresh-btn" id="refreshModels" title="刷新模型列表">⟳</button>
          </div>
        </div>
      </section>

      <!-- 翻译触发方式 -->
      <section class="settings-section">
        <h2>翻译触发方式</h2>

        <div class="setting-item checkbox-group">
          <label>
            <input type="checkbox" id="triggerSelection" checked>
            <span>选中翻译</span>
          </label>
          <small class="hint">选中文本后右键或快捷键翻译</small>
        </div>

        <div class="setting-item checkbox-group">
          <label>
            <input type="checkbox" id="triggerPage" checked>
            <span>全文翻译</span>
          </label>
          <small class="hint">翻译整个页面内容</small>
        </div>

        <div class="setting-item checkbox-group">
          <label>
            <input type="checkbox" id="triggerParagraph" checked>
            <span>段落翻译</span>
          </label>
          <small class="hint">鼠标悬停段落时显示翻译按钮</small>
        </div>
      </section>

      <!-- 快捷操作 -->
      <section class="settings-section">
        <h2>快捷操作</h2>

        <div class="action-buttons">
          <button class="action-btn primary" id="translatePageBtn">
            翻译当前页面
          </button>
          <button class="action-btn primary" id="translateSmartBtn">
            智能翻译
          </button>
        </div>

        <div class="shortcut-info">
          <p>
            <strong>选中翻译:</strong>
            <span id="shortcutSelection">Ctrl+Shift+T</span>
          </p>
          <p>
            <strong>全文翻译:</strong>
            <span id="shortcutPage">Ctrl+Shift+P</span>
          </p>
          <a href="#" id="configureShortcuts">配置快捷键</a>
        </div>
      </section>

      <!-- 缓存设置 -->
      <section class="settings-section">
        <h2>缓存设置</h2>

        <div class="setting-item checkbox-group">
          <label>
            <input type="checkbox" id="cacheEnabled" checked>
            <span>启用翻译缓存</span>
          </label>
          <small class="hint">缓存翻译结果，减少重复请求</small>
        </div>

        <div class="cache-actions">
          <button class="action-btn secondary" id="clearCacheBtn">
            清除所有缓存
          </button>
          <span class="cache-size" id="cacheSize">缓存: 0 条</span>
        </div>
      </section>
    </main>

    <footer class="popup-footer">
      <p>版本 1.0.0</p>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: 验证HTML结构**

1. 点击扩展图标，确认Popup正常打开
2. 检查所有元素正确显示
3. 确认无console错误

- [ ] **Step 3: Commit**

```bash
git add popup/popup.html
git commit -m "feat: add popup HTML interface"
```

---

## Task 9: Popup样式

**Files:**
- Create: `popup/popup.css`

- [ ] **Step 1: 创建popup.css**

```css
/* popup/popup.css - Popup样式 */

* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  margin: 0;
  padding: 0;
  width: 320px;
}

.popup-container {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

/* Header */
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #4a90d9;
  color: white;
}

.popup-header h1 {
  font-size: 16px;
  margin: 0;
  font-weight: 500;
}

.connection-status {
  font-size: 12px;
  opacity: 0.9;
}

.connection-status.connected {
  color: #90EE90;
}

.connection-status.error {
  color: #ffcccc;
}

/* Main */
.popup-main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* Sections */
.settings-section {
  margin-bottom: 20px;
}

.settings-section h2 {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #666;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

/* Setting Items */
.setting-item {
  margin-bottom: 12px;
}

.setting-item label {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
  color: #333;
}

.setting-item input[type="text"] {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.setting-item input[type="text"]:focus {
  border-color: #4a90d9;
  outline: none;
}

.setting-item select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: white;
}

.model-select-wrapper {
  display: flex;
  gap: 8px;
}

.model-select-wrapper select {
  flex: 1;
}

.refresh-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 16px;
}

.refresh-btn:hover {
  background: #f5f5f5;
}

.refresh-btn:active {
  background: #eee;
}

/* Checkbox Groups */
.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-group small {
  display: block;
  margin-left: 24px;
  margin-top: 4px;
  color: #888;
  font-size: 11px;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.action-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn.primary {
  background: #4a90d9;
  color: white;
}

.action-btn.primary:hover {
  background: #3a80c9;
}

.action-btn.primary:active {
  background: #2a70b9;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.action-btn.secondary:hover {
  background: #eee;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Shortcut Info */
.shortcut-info {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
}

.shortcut-info p {
  margin: 0 0 8px 0;
  display: flex;
  justify-content: space-between;
}

.shortcut-info p:last-of-type {
  margin-bottom: 0;
}

.shortcut-info span {
  color: #4a90d9;
  font-weight: 500;
}

.shortcut-info a {
  display: block;
  text-align: center;
  margin-top: 12px;
  color: #4a90d9;
  text-decoration: none;
}

.shortcut-info a:hover {
  text-decoration: underline;
}

/* Cache Actions */
.cache-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cache-size {
  font-size: 12px;
  color: #888;
}

/* Footer */
.popup-footer {
  padding: 8px 16px;
  background: #f5f5f5;
  text-align: center;
  font-size: 11px;
  color: #888;
}
```

- [ ] **Step 2: 验证样式**

点击扩展图标，确认Popup样式正常显示，布局合理美观。

- [ ] **Step 3: Commit**

```bash
git add popup/popup.css
git commit -m "feat: add popup styles"
```

---

## Task 10: Popup逻辑

**Files:**
- Create: `popup/popup.js`

- [ ] **Step 1: 创建popup.js基础结构**

```javascript
// popup/popup.js - Popup逻辑

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // 加载当前设置
  await loadSettings();

  // 检查连接状态
  await checkConnection();

  // 绑定事件
  bindEvents();
}
```

- [ ] **Step 2: 添加设置加载和保存功能**

```javascript
/**
 * 加载设置
 */
async function loadSettings() {
  const settings = await chrome.storage.sync.get(null);

  // 填充表单
  document.getElementById('baseUrl').value = settings.baseUrl || 'http://localhost:11434';
  document.getElementById('cacheEnabled').checked = settings.cacheEnabled ?? true;
  document.getElementById('triggerSelection').checked = settings.triggers?.selection ?? true;
  document.getElementById('triggerPage').checked = settings.triggers?.page ?? true;
  document.getElementById('triggerParagraph').checked = settings.triggers?.paragraph ?? true;

  // 加载模型列表
  await loadModels(settings.model);

  // 加载缓存大小
  await loadCacheSize();
}

/**
 * 保存设置
 */
async function saveSettings() {
  const settings = {
    baseUrl: document.getElementById('baseUrl').value.trim(),
    model: document.getElementById('modelSelect').value,
    cacheEnabled: document.getElementById('cacheEnabled').checked,
    triggers: {
      selection: document.getElementById('triggerSelection').checked,
      page: document.getElementById('triggerPage').checked,
      paragraph: document.getElementById('triggerParagraph').checked
    }
  };

  await chrome.storage.sync.set(settings);

  // 更新连接状态
  await checkConnection();
}

/**
 * 加载模型列表
 */
async function loadModels(currentModel = '') {
  const select = document.getElementById('modelSelect');
  select.innerHTML = '<option value="">加载中...</option>';

  const response = await chrome.runtime.sendMessage({ action: 'getModels' });

  if (response.error) {
    select.innerHTML = '<option value="">获取模型失败</option>';
    return;
  }

  const models = response.models || [];
  if (models.length === 0) {
    select.innerHTML = '<option value="">未找到模型</option>';
    return;
  }

  select.innerHTML = models.map(m =>
    `<option value="${m}" ${m === currentModel ? 'selected' : ''}>${m}</option>`
  ).join('');
}
```

- [ ] **Step 3: 添加连接检查功能**

```javascript
/**
 * 检查Ollama连接状态
 */
async function checkConnection() {
  const statusEl = document.getElementById('connectionStatus');
  statusEl.textContent = '检查连接...';
  statusEl.className = 'connection-status';

  const connected = await chrome.runtime.sendMessage({ action: 'checkConnection' });

  if (connected) {
    statusEl.textContent = '已连接';
    statusEl.classList.add('connected');
    // 连接成功后刷新模型列表
    await loadModels();
  } else {
    statusEl.textContent = '连接失败';
    statusEl.classList.add('error');
  }

  // 更新按钮状态
  updateButtonStates(connected);
}

/**
 * 更新按钮状态
 */
function updateButtonStates(connected) {
  const translateBtns = document.querySelectorAll('.action-btn.primary');
  const modelSelect = document.getElementById('modelSelect');

  translateBtns.forEach(btn => {
    btn.disabled = !connected;
  });

  // 模型选择也依赖连接
  if (!connected) {
    modelSelect.innerHTML = '<option value="">请先连接Ollama</option>';
  }
}
```

- [ ] **Step 4: 添加缓存管理功能**

```javascript
/**
 * 加载缓存大小
 */
async function loadCacheSize() {
  const allData = await chrome.storage.local.get(null);
  const cacheCount = Object.keys(allData).filter(k => k.startsWith('trans_')).length;
  document.getElementById('cacheSize').textContent = `缓存: ${cacheCount} 条`;
}

/**
 * 清除缓存
 */
async function clearCache() {
  await chrome.runtime.sendMessage({ action: 'clearCache' });
  document.getElementById('cacheSize').textContent = '缓存: 0 条';

  // 显示提示
  showToast('缓存已清除');
}

/**
 * 显示提示消息
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}
```

- [ ] **Step 5: 添加事件绑定和操作功能**

```javascript
/**
 * 绑定事件
 */
function bindEvents() {
  // 设置变更自动保存
  const settingInputs = ['baseUrl', 'modelSelect', 'cacheEnabled', 'triggerSelection', 'triggerPage', 'triggerParagraph'];
  settingInputs.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('change', saveSettings);
  });

  // baseUrl输入框失焦时检查连接
  document.getElementById('baseUrl').addEventListener('blur', async () => {
    await saveSettings();
    await checkConnection();
  });

  // 刷新模型列表按钮
  document.getElementById('refreshModels').addEventListener('click', async () => {
    await loadModels();
  });

  // 翻译页面按钮
  document.getElementById('translatePageBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'translatePage' });
    window.close();
  });

  // 智能翻译按钮
  document.getElementById('translateSmartBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'translateSmart' });
    window.close();
  });

  // 清除缓存按钮
  document.getElementById('clearCacheBtn').addEventListener('click', clearCache);

  // 配置快捷键链接
  document.getElementById('configureShortcuts').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // 加载快捷键显示
  loadShortcuts();
}

/**
 * 加载快捷键信息
 */
async function loadShortcuts() {
  const commands = await chrome.commands.getAll();

  commands.forEach(cmd => {
    if (cmd.name === 'translate-selection') {
      document.getElementById('shortcutSelection').textContent =
        cmd.shortcut || '未设置';
    } else if (cmd.name === 'translate-page') {
      document.getElementById('shortcutPage').textContent =
        cmd.shortcut || '未设置';
    }
  });
}
```

- [ ] **Step 6: 验证Popup完整功能**

1. 点击扩展图标，确认设置加载正确
2. 修改Ollama地址，确认连接状态更新
3. 选择模型，确认保存
4. 点击"翻译当前页面"，确认触发翻译
5. 点击"清除缓存"，确认缓存清除

- [ ] **Step 7: Commit**

```bash
git add popup/popup.js
git commit -m "feat: add popup logic and event handlers"
```

---

## Task 11: 扩展图标

**Files:**
- Create: `icons/icon16.png`
- Create: `icons/icon48.png`
- Create: `icons/icon128.png`

- [ ] **Step 1: 创建SVG图标源文件**

由于无法直接创建PNG，使用简单色块作为占位图标：

```bash
# 使用ImageMagick创建简单图标（如果可用）
convert -size 16x16 xc:#4a90d9 icons/icon16.png
convert -size 48x48 xc:#4a90d9 icons/icon48.png
convert -size 128x128 xc:#4a90d9 icons/icon128.png
```

如果没有ImageMagick，手动创建：
1. 使用任意图像编辑工具
2. 创建16x16、48x48、128x128尺寸的蓝色方块图标
3. 保存到icons目录

- [ ] **Step 2: 验证图标加载**

在 `chrome://extensions/` 确认扩展图标正常显示。

- [ ] **Step 3: Commit**

```bash
git add icons/
git commit -m "feat: add extension icons"
```

---

## Task 12: README文档

**Files:**
- Create: `README.md`

- [ ] **Step 1: 创建README.md**

```markdown
# Ollama Translator

Chrome浏览器扩展，使用本地Ollama大模型进行英译汉翻译。

## 功能特性

- **选中翻译**: 选中文本后右键菜单或快捷键翻译
- **全文翻译**: 一键翻译整个页面内容
- **智能翻译**: 自动识别主要内容区域翻译
- **段落翻译**: 鼠标悬停段落显示翻译按钮

## 安装步骤

### 1. 安装Ollama

从 [ollama.ai](https://ollama.ai) 下载并安装Ollama。

安装翻译模型：
```bash
ollama pull qwen2
```

### 2. 安装扩展

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目目录

### 3. 配置扩展

1. 点击扩展图标打开设置面板
2. 确认Ollama地址（默认 `http://localhost:11434`）
3. 选择翻译模型
4. 根据需要调整其他设置

## 使用方法

### 快捷键

| 功能 | Windows/Linux | Mac |
|------|---------------|-----|
| 翻译选中内容 | Ctrl+Shift+T | Command+Shift+T |
| 翻译整个页面 | Ctrl+Shift+P | Command+Shift+P |

可在 `chrome://extensions/shortcuts` 自定义快捷键。

### 右键菜单

- 选中文本后右键 → "翻译选中内容"
- 页面空白处右键 → "智能翻译主要内容"

### Popup操作

点击扩展图标：
- "翻译当前页面" - 翻译整个页面
- "智能翻译" - 只翻译主要内容区域

## 设置说明

| 设置项 | 说明 |
|-------|------|
| Ollama地址 | Ollama服务地址，支持本地和远程 |
| 翻译模型 | 选择Ollama已安装的模型 |
| 翻译触发方式 | 启用/禁用不同翻译方式 |
| 启用缓存 | 缓存翻译结果减少重复请求 |

## 技术架构

- Manifest V3 Chrome扩展
- Background Service Worker处理API调用
- Content Script处理页面DOM
- Popup提供设置界面

## 开发说明

### 文件结构

```
trans/
├── manifest.json          # 扩展配置
├── background/
│   └── service-worker.js  # API调用中心
├── content/
│   ├── content.js         # 页面交互
│   └── content.css        # 译文样式
├── popup/
│   ├── popup.html         # 设置界面
│   ├── popup.js           # Popup逻辑
│   └── popup.css          # Popup样式
├── utils/
│   ├── api.js             # Ollama API封装
│   ├── cache.js           # 缓存工具
│   └── content-detector.js # 内容检测
└── icons/                  # 扩展图标
```

### 本地测试

1. 修改代码后，在 `chrome://extensions/` 点击刷新按钮
2. 打开任意英文页面测试功能

## 许可证

MIT License
```

- [ ] **Step 2: 验证README**

确认README内容完整，安装步骤清晰。

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with installation and usage guide"
```

---

## Task 13: 整体测试与验证

**Files:**
- 无新增文件

- [ ] **Step 1: 功能完整测试**

测试所有功能：

1. **选中翻译测试**
   - 访问英文网站（如CNN、BBC）
   - 选中文本，右键"翻译选中内容"
   - 确认译文在浮动框显示
   - 点击其他区域关闭

2. **快捷键测试**
   - 选中文本按 `Ctrl+Shift+T`
   - 确认触发翻译
   - 按 `Ctrl+Shift+P` 触发全文翻译

3. **全文翻译测试**
   - 点击Popup"翻译当前页面"
   - 确认进度条显示
   - 翻译完成后检查译文样式
   - 测试取消功能（点击×）

4. **智能翻译测试**
   - 访问新闻文章页面
   - 点击"智能翻译"
   - 确认只翻译正文区域

5. **段落翻译测试**
   - 启用段落翻译模式
   - 鼠标悬停段落
   - 确认翻译按钮出现
   - 点击按钮翻译

6. **设置测试**
   - 修改Ollama地址
   - 确认连接状态更新
   - 更换模型
   - 启用/禁用缓存

- [ ] **Step 2: 错误场景测试**

测试错误处理：

1. Ollama未启动时尝试翻译
2. 无效地址配置
3. 模型不存在
4. 超长文本翻译

- [ ] **Step 3: 最终Commit**

```bash
git add -A
git commit -m "feat: complete Ollama Translator Chrome extension"
```

---

## 自检清单

### Spec覆盖检查

| Spec需求 | 任务覆盖 |
|---------|---------|
| Manifest V3 | Task 1 |
| 选中翻译 | Task 7 |
| 全文翻译 | Task 7 |
| 智能翻译 | Task 7 |
| 段落翻译 | Task 7 |
| Popup设置界面 | Task 8, 9, 10 |
| Ollama API调用 | Task 2, 5 |
| 模型选择 | Task 10 |
| 缓存功能 | Task 3, 10 |
| 译文展示样式 | Task 6 |
| 错误处理 | Task 2, 5, 7 |
| 快捷键 | Task 1, 10 |

### Placeholder扫描

已检查：无TBD、TODO、"implement later"、"similar to"等占位符。

### 类型一致性检查

- `OllamaAPI` 类在Task 2定义，Task 5使用
- `TranslationCache` 类在Task 3定义，Task 5使用
- `ContentDetector` 类在Task 4定义，Task 7使用
- 消息action字段命名一致：`translate`, `getModels`, `checkConnection`, `clearCache`

---

**计划完成。**