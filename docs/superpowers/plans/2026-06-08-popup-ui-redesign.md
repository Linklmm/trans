# Popup UI 重新设计实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Popup 和页面内翻译元素从基础蓝色扁平风格升级为靛紫渐变的现代视觉体验

**Architecture:** 
- 使用 CSS 变量统一管理配色
- Popup 结构重构：渐变头部 + 快捷操作 + Tab 切换 + 卡片内容
- 页面内翻译元素统一紫色系装饰
- 所有改动仅涉及样式和 UI 逻辑，不影响功能

**Tech Stack:** 
- 原生 HTML/CSS/JavaScript（无构建工具）
- Chrome Extension Manifest V3

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `popup/popup.html` | Popup 结构，新增 Tab 栏、重构 Header |
| `popup/popup.css` | 全部样式重写，CSS 变量定义 |
| `popup/popup.js` | Tab 切换逻辑、API 类型按钮组逻辑 |
| `content/content.css` | 翻译结果、进度条、段落按钮样式 |

---

### Task 1: 定义 CSS 变量和基础样式

**Files:**
- Modify: `popup/popup.css:1-20`

- [ ] **Step 1: 添加 CSS 变量定义**

在 `popup/popup.css` 文件开头添加：

```css
/* popup/popup.css - Popup 样式 */

/* 配色变量 */
:root {
  /* 主色渐变 */
  --primary-start: #818CF8;
  --primary: #6366F1;
  --primary-end: #4F46E5;
  
  /* 辅助色 */
  --primary-light: #C7D2FE;
  --primary-lighter: #A5B4FC;
  --primary-lightest: #E0E7FF;
  
  /* 背景色 */
  --bg-main: #F8F9FC;
  --bg-card: #FFFFFF;
  --bg-input: #FCFCFE;
  --bg-secondary: #F5F5F7;
  
  /* 边框 */
  --border-color: #E0E3EF;
  --border-light: #E8EAF0;
  
  /* 文字 */
  --text-primary: #333;
  --text-secondary: #666;
  --text-muted: #888;
  --text-light: #999;
  --text-lighter: #BBB;
  
  /* 阴影 */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 8px rgba(99,102,241,0.2);
  --shadow-lg: 0 4px 16px rgba(99,102,241,0.1);
  
  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 5px;
  --radius-lg: 6px;
  --radius-xl: 8px;
}

* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-primary);
  margin: 0;
  padding: 0;
  width: 340px;
  background: var(--bg-main);
}

.popup-container {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}
```

- [ ] **Step 2: 验证文件无语法错误**

在浏览器中打开 `chrome://extensions/`，刷新扩展，确认 popup 仍能正常打开（样式暂时会乱，这是正常的）。

- [ ] **Step 3: Commit**

```bash
git add popup/popup.css
git commit -m "feat(ui): add CSS variables for indigo color scheme"
```

---

### Task 2: 重构 Header 区域

**Files:**
- Modify: `popup/popup.html:11-14`
- Modify: `popup/popup.css` (添加 header 样式)

- [ ] **Step 1: 更新 Header HTML**

将 `popup/popup.html` 中的 `<header>` 部分替换为：

```html
<header class="popup-header">
  <div class="header-main">
    <div class="header-logo">
      <svg width="20" height="20" viewBox="0 0 128 128" fill="none">
        <path d="M24 44H56" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
        <path d="M24 58H48" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
        <path d="M52 54L64 64L52 74" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="82" y="44" width="16" height="16" rx="3" fill="#fff" opacity="0.8"/>
      </svg>
    </div>
    <div class="header-title">
      <h1>Ollama Translator</h1>
      <span class="header-subtitle">英译汉翻译助手</span>
    </div>
  </div>
  <div class="connection-status" id="connectionStatus">
    <span class="status-dot"></span>
    <span class="status-text">检查连接...</span>
  </div>
</header>
```

- [ ] **Step 2: 添加 Header CSS**

在 `popup/popup.css` 中添加（删除旧的 header 样式）：

```css
/* Header */
.popup-header {
  background: linear-gradient(135deg, var(--primary-start) 0%, var(--primary) 50%, var(--primary-end) 100%);
  padding: 16px;
  color: white;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.header-logo {
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.2);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title h1 {
  font-size: 15px;
  margin: 0;
  font-weight: 600;
  color: white;
}

.header-subtitle {
  font-size: 10px;
  opacity: 0.85;
}

.connection-status {
  background: rgba(255,255,255,0.18);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: var(--text-lighter);
  border-radius: 50%;
}

.connection-status.connected .status-dot {
  background: #a5f3a0;
}

.connection-status.error .status-dot {
  background: #fca5a5;
}

.status-text {
  color: white;
}
```

- [ ] **Step 3: 验证 Header 显示**

刷新扩展，打开 popup，确认：
- 渐变背景显示正常
- Logo 图标可见
- 连接状态胶囊显示

- [ ] **Step 4: Commit**

```bash
git add popup/popup.html popup/popup.css
git commit -m "feat(ui): redesign header with gradient and logo"
```

---

### Task 3: 添加快捷操作区和 Tab 栏

**Files:**
- Modify: `popup/popup.html:16-18`
- Modify: `popup/popup.css`

- [ ] **Step 1: 在 Header 后添加快捷操作区和 Tab 栏**

在 `<header>` 之后、`<main>` 之前插入：

```html
<!-- 快捷操作 -->
<div class="quick-actions">
  <button class="action-btn primary" id="translatePageBtn">🌐 翻译页面</button>
  <button class="action-btn outline" id="translateSmartBtn">✨ 智能翻译</button>
</div>

<!-- Tab 标签栏 -->
<div class="tab-bar">
  <button class="tab-item active" data-tab="api">API 设置</button>
  <button class="tab-item" data-tab="trigger">触发方式</button>
  <button class="tab-item" data-tab="cache">缓存</button>
</div>
```

- [ ] **Step 2: 添加快捷操作区和 Tab 栏 CSS**

```css
/* 快捷操作区 */
.quick-actions {
  padding: 12px 16px 8px;
  display: flex;
  gap: 8px;
}

/* Tab 标签栏 */
.tab-bar {
  padding: 0 16px;
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-light);
  margin-top: 4px;
}

.tab-item {
  padding: 10px 14px;
  font-size: 12px;
  color: var(--text-light);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-item:hover {
  color: var(--primary);
}

.tab-item.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 500;
}
```

- [ ] **Step 3: 验证布局**

刷新扩展，确认快捷操作按钮和 Tab 栏显示在正确位置。

- [ ] **Step 4: Commit**

```bash
git add popup/popup.html popup/popup.css
git commit -m "feat(ui): add quick actions and tab bar"
```

---

### Task 4: 重构 Main 内容为 Tab 面板

**Files:**
- Modify: `popup/popup.html:16-136`

- [ ] **Step 1: 用 Tab 面板包裹各 Section**

将 `<main>` 内的所有内容重构为：

```html
<main class="popup-main">
  <!-- API 设置 Tab -->
  <div class="tab-panel active" data-panel="api">
    <div class="settings-card">
      <div class="setting-item">
        <label class="setting-label">API 类型</label>
        <div class="api-type-group">
          <button class="api-type-btn active" data-type="ollama">Ollama</button>
          <button class="api-type-btn" data-type="openai">OpenAI</button>
        </div>
      </div>

      <div class="setting-item">
        <label class="setting-label" id="baseUrlLabel">API 地址</label>
        <input type="text" class="setting-input" id="baseUrl" placeholder="http://localhost:11434">
      </div>

      <div class="setting-item">
        <label class="setting-label">API Key <span class="label-hint">（可选）</span></label>
        <input type="password" class="setting-input" id="apiKey" placeholder="留空表示无认证">
      </div>

      <div class="setting-item">
        <label class="setting-label">翻译模型</label>
        <div class="model-select-wrapper">
          <select class="setting-input" id="modelSelect">
            <option value="">请先连接 Ollama</option>
          </select>
          <button class="refresh-btn" id="refreshModels" title="刷新模型列表">⟳</button>
        </div>
        <input type="text" class="setting-input" id="modelInput" placeholder="输入模型名称，如 qwen-plus" style="display: none;">
      </div>
    </div>
  </div>

  <!-- 触发方式 Tab -->
  <div class="tab-panel" data-panel="trigger">
    <div class="settings-card">
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
    </div>
  </div>

  <!-- 缓存 Tab -->
  <div class="tab-panel" data-panel="cache">
    <div class="settings-card">
      <div class="setting-item checkbox-group">
        <label>
          <input type="checkbox" id="cacheEnabled" checked>
          <span>启用翻译缓存</span>
        </label>
        <small class="hint">缓存翻译结果，减少重复请求</small>
      </div>

      <div class="cache-actions">
        <button class="action-btn secondary" id="clearCacheBtn">清除所有缓存</button>
        <span class="cache-size" id="cacheSize">缓存：0 条</span>
      </div>
    </div>
  </div>

  <!-- 底部操作栏 -->
  <div class="bottom-actions">
    <button class="action-btn secondary" id="testConnectionBtn">测试连接</button>
    <button class="action-btn primary" id="saveSettingsBtn">保存配置</button>
  </div>
</main>
```

- [ ] **Step 2: 更新 Footer**

```html
<footer class="popup-footer">
  <p>快捷键：Ctrl+Shift+T 选中翻译 · Ctrl+Shift+P 全文翻译</p>
</footer>
```

- [ ] **Step 3: Commit**

```bash
git add popup/popup.html
git commit -m "feat(ui): restructure main content with tab panels"
```

---

### Task 5: 添加卡片和表单样式

**Files:**
- Modify: `popup/popup.css`

- [ ] **Step 1: 添加 Main 区域和卡片样式**

删除旧的 `.settings-section` 相关样式，添加：

```css
/* Main */
.popup-main {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
}

/* Tab Panels */
.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
}

/* Settings Card */
.settings-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 14px;
  box-shadow: var(--shadow-sm);
}

/* Setting Items */
.setting-item {
  margin-bottom: 12px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
  font-weight: 500;
}

.label-hint {
  color: var(--text-lighter);
  font-weight: normal;
}

.setting-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 12px;
  background: var(--bg-input);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}

.setting-input:focus {
  border-color: var(--primary-light);
  outline: none;
}

.setting-input::placeholder {
  color: var(--text-lighter);
}

/* API Type Group */
.api-type-group {
  display: flex;
  gap: 6px;
}

.api-type-btn {
  flex: 1;
  padding: 7px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.api-type-btn.active {
  background: linear-gradient(135deg, var(--primary-start), var(--primary));
  color: white;
}

/* Model Select Wrapper */
.model-select-wrapper {
  display: flex;
  gap: 6px;
}

.model-select-wrapper .setting-input {
  flex: 1;
}

.refresh-btn {
  width: 32px;
  background: var(--bg-secondary);
  border: none;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.2s ease;
}

.refresh-btn:hover {
  background: var(--border-light);
}
```

- [ ] **Step 2: 验证表单显示**

刷新扩展，切换到 API 设置 Tab，确认表单卡片正常显示。

- [ ] **Step 3: Commit**

```bash
git add popup/popup.css
git commit -m "feat(ui): add card and form styles"
```

---

### Task 6: 添加按钮和 Checkbox 样式

**Files:**
- Modify: `popup/popup.css`

- [ ] **Step 1: 更新按钮样式**

删除旧的 `.action-btn` 样式，添加：

```css
/* Action Buttons */
.action-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--primary-start), var(--primary));
  color: white;
  box-shadow: var(--shadow-md);
}

.action-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99,102,241,0.3);
}

.action-btn.primary:active {
  transform: translateY(0);
}

.action-btn.outline {
  background: var(--bg-card);
  color: var(--primary);
  border: 1px solid var(--primary-light);
}

.action-btn.outline:hover {
  background: var(--primary-lightest);
}

.action-btn.secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.action-btn.secondary:hover {
  background: var(--border-light);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Bottom Actions */
.bottom-actions {
  padding: 8px 0 14px;
  display: flex;
  gap: 8px;
}
```

- [ ] **Step 2: 添加 Checkbox 样式**

```css
/* Checkbox Groups */
.checkbox-group {
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
}

.checkbox-group:first-child {
  padding-top: 0;
}

.checkbox-group:last-of-type {
  border-bottom: none;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}

.checkbox-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--primary);
}

.checkbox-group small.hint {
  display: block;
  margin-left: 24px;
  margin-top: 4px;
  color: var(--text-light);
  font-size: 11px;
}
```

- [ ] **Step 3: 验证按钮和 Checkbox**

刷新扩展，测试所有按钮和 checkbox 的样式和交互。

- [ ] **Step 4: Commit**

```bash
git add popup/popup.css
git commit -m "feat(ui): add button and checkbox styles"
```

---

### Task 7: 添加辅助组件样式

**Files:**
- Modify: `popup/popup.css`

- [ ] **Step 1: 添加快捷键信息样式**

```css
/* Shortcut Info */
.shortcut-info {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
  margin-top: 12px;
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
  color: var(--primary);
  font-weight: 500;
}

.shortcut-info a {
  display: block;
  text-align: center;
  margin-top: 12px;
  color: var(--primary);
  text-decoration: none;
}

.shortcut-info a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 2: 添加缓存操作样式**

```css
/* Cache Actions */
.cache-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.cache-actions .action-btn {
  flex: none;
}

.cache-size {
  font-size: 12px;
  color: var(--text-light);
}
```

- [ ] **Step 3: 添加 Footer 样式**

```css
/* Footer */
.popup-footer {
  padding: 8px 16px;
  background: var(--bg-card);
  text-align: center;
  font-size: 10px;
  color: var(--text-lighter);
  border-top: 1px solid #F0F0F0;
}

.popup-footer p {
  margin: 0;
}
```

- [ ] **Step 4: 添加 Toast 样式**

```css
/* Toast */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: linear-gradient(135deg, var(--primary-start), var(--primary));
  color: white;
  padding: 10px 20px;
  border-radius: var(--radius-lg);
  font-size: 12px;
  z-index: 1000;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.3s ease forwards;
}

@keyframes slideUp {
  to {
    transform: translateX(-50%) translateY(0);
  }
}
```

- [ ] **Step 5: 验证所有组件**

刷新扩展，测试所有 Tab 面板、Toast 提示、Footer 显示。

- [ ] **Step 6: Commit**

```bash
git add popup/popup.css
git commit -m "feat(ui): add auxiliary component styles"
```

---

### Task 8: 添加 Tab 切换和 API 类型切换逻辑

**Files:**
- Modify: `popup/popup.js`

- [ ] **Step 1: 添加 Tab 切换逻辑**

在 `bindEvents()` 函数中添加：

```javascript
// Tab 切换
document.querySelectorAll('.tab-item').forEach(tab => {
  tab.addEventListener('click', () => {
    // 更新 Tab 激活状态
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // 更新 Panel 显示
    const targetTab = tab.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
      if (panel.dataset.panel === targetTab) {
        panel.classList.add('active');
      }
    });
  });
});
```

- [ ] **Step 2: 替换 API 类型切换逻辑**

找到原来的：
```javascript
document.getElementById('apiType').addEventListener('change', () => {
  updateModelInputMode();
});
```

替换为：
```javascript
// API 类型按钮组切换
document.querySelectorAll('.api-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.api-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateModelInputMode();
  });
});
```

- [ ] **Step 3: 更新 updateModelInputMode 函数**

```javascript
function updateModelInputMode() {
  const activeBtn = document.querySelector('.api-type-btn.active');
  const apiType = activeBtn ? activeBtn.dataset.type : 'ollama';
  const selectWrapper = document.querySelector('.model-select-wrapper');
  const modelInput = document.getElementById('modelInput');
  const baseUrlLabel = document.getElementById('baseUrlLabel');
  const baseUrlInput = document.getElementById('baseUrl');

  if (apiType === 'openai') {
    selectWrapper.style.display = 'none';
    modelInput.style.display = 'block';
    baseUrlLabel.textContent = 'API 地址';
    baseUrlInput.placeholder = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  } else {
    selectWrapper.style.display = 'flex';
    modelInput.style.display = 'none';
    baseUrlLabel.textContent = 'API 地址';
    baseUrlInput.placeholder = 'http://localhost:11434';
  }
}
```

- [ ] **Step 4: 更新 loadSettings 函数**

找到加载 API 类型的部分：
```javascript
document.getElementById('apiType').value = settings.apiType || 'ollama';
```

替换为：
```javascript
// 设置 API 类型按钮
const apiType = settings.apiType || 'ollama';
document.querySelectorAll('.api-type-btn').forEach(btn => {
  btn.classList.toggle('active', btn.dataset.type === apiType);
});
```

- [ ] **Step 5: 更新 saveSettings 函数**

找到：
```javascript
const apiType = document.getElementById('apiType').value;
```

替换为：
```javascript
const activeBtn = document.querySelector('.api-type-btn.active');
const apiType = activeBtn ? activeBtn.dataset.type : 'ollama';
```

- [ ] **Step 6: 更新 checkConnectionWithSavedSettings 函数**

找到：
```javascript
const apiType = document.getElementById('apiType').value;
```

替换为：
```javascript
const activeBtn = document.querySelector('.api-type-btn.active');
const apiType = activeBtn ? activeBtn.dataset.type : 'ollama';
```

- [ ] **Step 7: 更新 testConnection 函数**

找到：
```javascript
const apiType = document.getElementById('apiType').value;
```

替换为：
```javascript
const activeBtn = document.querySelector('.api-type-btn.active');
const apiType = activeBtn ? activeBtn.dataset.type : 'ollama';
```

- [ ] **Step 8: 更新 refreshModels 事件处理**

找到：
```javascript
const apiType = document.getElementById('apiType').value;
```

替换为：
```javascript
const activeBtn = document.querySelector('.api-type-btn.active');
const apiType = activeBtn ? activeBtn.dataset.type : 'ollama';
```

- [ ] **Step 9: 验证 Tab 切换和 API 类型切换**

刷新扩展，测试：
1. 点击 Tab 标签切换面板
2. 点击 API 类型按钮切换模式
3. 确认模型输入框正确显示/隐藏

- [ ] **Step 10: Commit**

```bash
git add popup/popup.js
git commit -m "feat(ui): add tab switching and api type button group logic"
```

---

### Task 9: 更新页面内翻译元素样式

**Files:**
- Modify: `content/content.css`

- [ ] **Step 1: 更新译文样式**

替换整个文件内容为：

```css
/* content/content.css - 译文样式 */

/* 译文容器 */
.ollama-translation {
  display: block;
  font-size: 13px;
  color: #6366F1;
  margin-top: 6px;
  padding-left: 12px;
  border-left: 3px solid #C7D2FE;
  line-height: 1.5;
  clear: both;
}

/* 翻译中状态 */
.ollama-translation.loading {
  color: #A5B4FC;
  border-left-color: #E0E7FF;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ollama-translation.loading::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #C7D2FE;
  border-top-color: #6366F1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 翻译失败状态 */
.ollama-translation.error {
  color: #ef4444;
  border-left-color: #fecaca;
  cursor: pointer;
}

.ollama-translation.error:hover {
  color: #dc2626;
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
  background: linear-gradient(135deg, #818CF8, #6366F1);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  opacity: 0.9;
  transition: all 0.2s ease;
  z-index: 10000;
  margin-left: 4px;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}

.ollama-translate-btn:hover {
  opacity: 1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99,102,241,0.4);
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
  border: 1px solid #E0E3EF;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 4px 16px rgba(99,102,241,0.1);
  z-index: 10001;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ollama-progress-icon {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #818CF8, #6366F1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ollama-progress-icon::after {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.ollama-progress-info {
  flex: 1;
}

.ollama-progress-text {
  font-size: 12px;
  color: #333;
  margin-bottom: 4px;
}

.ollama-progress-bar {
  width: 100px;
  height: 4px;
  background: #E0E7FF;
  border-radius: 2px;
  overflow: hidden;
}

.ollama-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #818CF8, #6366F1);
  border-radius: 2px;
  transition: width 0.3s;
}

.ollama-progress-percent {
  font-size: 12px;
  color: #6366F1;
  font-weight: 500;
}

.ollama-progress-close {
  cursor: pointer;
  color: #ccc;
  font-size: 16px;
  transition: color 0.2s ease;
}

.ollama-progress-close:hover {
  color: #666;
}

/* 高亮段落 */
.ollama-highlight {
  background-color: rgba(99, 102, 241, 0.08);
  border-radius: 2px;
}

/* 防止译文影响原有布局 */
.ollama-translation-wrapper {
  position: relative;
  display: inline;
}
```

- [ ] **Step 2: 验证翻译元素样式**

在英文页面测试翻译功能，确认：
1. 译文有紫色左侧竖线
2. 加载动画正常显示
3. 段落翻译按钮有渐变效果
4. 进度条样式正确

- [ ] **Step 3: Commit**

```bash
git add content/content.css
git commit -m "feat(ui): redesign content script translation styles"
```

---

### Task 10: 最终验证和清理

**Files:**
- 无新增修改

- [ ] **Step 1: 完整功能测试**

1. 打开扩展 Popup
2. 测试所有 Tab 切换
3. 测试 API 类型切换
4. 测试保存配置
5. 测试翻译功能（选中翻译、全文翻译、段落翻译）
6. 检查所有样式和动画

- [ ] **Step 2: 清理临时文件**

```bash
# 清理视觉伴侣文件
rm -rf .superpowers/
```

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git status
# 确认没有未跟踪的文件需要提交
```

---

## 完成标准

1. ✅ Popup 使用靛紫渐变配色
2. ✅ Header 显示 Logo 和连接状态胶囊
3. ✅ Tab 切换正常工作
4. ✅ API 类型使用按钮组切换
5. ✅ 页面内翻译元素使用紫色装饰
6. ✅ 所有按钮有悬停动画
7. ✅ Toast 提示有滑入动画
8. ✅ 所有现有功能正常
