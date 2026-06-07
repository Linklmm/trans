# 配置持久化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解决浏览器重启后配置丢失的问题，使用双存储策略持久化用户配置

**Architecture:** `storage.local` 作为主存储保证持久化，`storage.sync` 作为备份支持跨设备同步；添加显式保存按钮和成功提示

**Tech Stack:** Chrome Extension Manifest V3, chrome.storage API, 原生 JavaScript

---

## 文件结构

| 文件 | 改动 |
|------|------|
| `popup/popup.html` | 添加"保存配置"按钮 |
| `popup/popup.js` | 修改 saveSettings()、移除自动保存、添加保存按钮事件 |
| `background/service-worker.js` | 修改 onInstalled 不覆盖已有配置、读取时优先 local |

---

### Task 1: 修改 popup.html，添加保存按钮

**Files:**
- Modify: `popup/popup.html:125-129`

- [ ] **Step 1: 在 footer 前添加保存按钮区域**

在 `<footer class="popup-footer">` 前添加保存按钮：

```html
      <!-- 保存配置 -->
      <section class="settings-section">
        <div class="save-actions">
          <button class="action-btn primary" id="saveSettingsBtn">
            保存配置
          </button>
        </div>
      </section>
    </main>

    <footer class="popup-footer">
      <p>版本 1.0.0</p>
    </footer>
```

- [ ] **Step 2: 手动验证**

在 `chrome://extensions/` 点击刷新按钮重新加载扩展，打开 popup，确认底部有"保存配置"按钮。

---

### Task 2: 修改 popup.js saveSettings()，同时写入 local 和 sync

**Files:**
- Modify: `popup/popup.js:48-68`

- [ ] **Step 1: 修改 saveSettings() 函数**

将原来的 `chrome.storage.sync.set(settings)` 改为同时写入两个存储：

```javascript
/**
 * 保存设置
 */
async function saveSettings() {
  const apiType = document.getElementById('apiType').value;
  const model = apiType === 'openai'
    ? document.getElementById('modelInput').value.trim()
    : document.getElementById('modelSelect').value;

  const settings = {
    apiType: apiType,
    baseUrl: document.getElementById('baseUrl').value.trim(),
    apiKey: document.getElementById('apiKey').value.trim(),
    model: model,
    cacheEnabled: document.getElementById('cacheEnabled').checked,
    triggers: {
      selection: document.getElementById('triggerSelection').checked,
      page: document.getElementById('triggerPage').checked,
      paragraph: document.getElementById('triggerParagraph').checked
    }
  };

  // 同时写入 storage.local 和 storage.sync，保证持久化
  await chrome.storage.local.set(settings);
  await chrome.storage.sync.set(settings);

  // 显示保存成功提示
  showToast('配置已保存');
}
```

---

### Task 3: 修改 popup.js，移除自动保存逻辑，添加保存按钮事件

**Files:**
- Modify: `popup/popup.js:217-240`

- [ ] **Step 1: 移除 bindEvents() 中的自动保存逻辑**

删除以下代码（第 218-226 行的自动保存相关代码）：

```javascript
  // 设置变更自动保存
  const settingInputs = ['apiType', 'baseUrl', 'apiKey', 'modelSelect', 'modelInput', 'cacheEnabled', 'triggerSelection', 'triggerPage', 'triggerParagraph'];
  settingInputs.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('change', saveSettings);
  });

  // modelInput 输入时也自动保存
  document.getElementById('modelInput').addEventListener('input', saveSettings);
```

保留 baseUrl blur 和 apiType change 时的连接检查逻辑（但不再调用 saveSettings）。

- [ ] **Step 2: 修改 baseUrl blur 事件**

将第 229-232 行改为：

```javascript
  // baseUrl 输入框失焦时检查连接
  document.getElementById('baseUrl').addEventListener('blur', async () => {
    await checkConnection();
  });
```

- [ ] **Step 3: 修改 apiType change 事件**

将第 235-240 行改为：

```javascript
  // apiType 切换时更新控件并检查连接
  document.getElementById('apiType').addEventListener('change', async () => {
    updateModelInputMode();
    await checkConnection();
  });
```

- [ ] **Step 4: 添加保存按钮点击事件**

在 `bindEvents()` 函数末尾添加：

```javascript
  // 保存配置按钮
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
```

- [ ] **Step 5: 手动验证**

刷新扩展，打开 popup，修改配置但不点击保存，关闭 popup 再打开，确认配置未改变。点击保存按钮，确认显示"配置已保存"提示。

---

### Task 4: 修改 service-worker.js onInstalled，不覆盖已有配置

**Files:**
- Modify: `background/service-worker.js:24-45`

- [ ] **Step 1: 修改 onInstalled 监听器**

将第 24-26 行改为先检查已有配置：

```javascript
// 扩展安装时初始化
chrome.runtime.onInstalled.addListener(async () => {
  // 检查是否已有配置（优先从 storage.local 读取）
  const existingSettings = await chrome.storage.local.get(null);

  // 只有当没有任何配置时才设置默认值，不覆盖用户配置
  if (Object.keys(existingSettings).length === 0) {
    await chrome.storage.local.set(defaultSettings);
    await chrome.storage.sync.set(defaultSettings);
  }

  // 移除现有菜单，防止重复
  await chrome.contextMenus.removeAll();
```

- [ ] **Step 2: 手动验证**

刷新扩展，确认已有配置未被覆盖。可通过先保存一个自定义配置，刷新扩展后再打开 popup 验证。

---

### Task 5: 修改 service-worker.js，读取配置时优先 local

**Files:**
- Modify: `background/service-worker.js:122-128`

- [ ] **Step 1: 创建 getSettings() 辅助函数**

在 `handleMessage` 函数前添加：

```javascript
/**
 * 获取配置，优先从 storage.local 读取，fallback 到 storage.sync
 */
async function getSettings() {
  const localSettings = await chrome.storage.local.get(null);
  if (Object.keys(localSettings).length > 0) {
    return localSettings;
  }
  // fallback 到 storage.sync（兼容旧版本数据）
  return await chrome.storage.sync.get(null);
}
```

- [ ] **Step 2: 修改 handleMessage() 中的配置读取**

将第 123 行改为使用新的 getSettings()：

```javascript
async function handleMessage(message, sender) {
  const settings = await getSettings();
  api.setApiType(settings.apiType || defaultSettings.apiType);
  api.setBaseUrl(settings.baseUrl || defaultSettings.baseUrl);
  api.setApiKey(settings.apiKey || defaultSettings.apiKey);
  cache.setEnabled(settings.cacheEnabled ?? defaultSettings.cacheEnabled);
```

- [ ] **Step 3: 手动验证**

刷新扩展，打开一个英文网页，测试翻译功能是否正常使用已保存的配置。关闭浏览器，重新打开，确认配置仍然存在，翻译功能正常。

---

### Task 6: 最终集成测试

- [ ] **Step 1: 完整流程测试**

1. 打开 popup，填写配置（API 类型、地址、Key、模型）
2. 点击"保存配置"按钮，确认显示"配置已保存"
3. 测试翻译功能，确认正常工作
4. 关闭 Chrome 浏览器
5. 重新打开 Chrome 浏览器
6. 打开 popup，确认配置仍然存在（无需重新填写）
7. 再次测试翻译功能，确认正常工作

- [ ] **Step 2: 提交代码**

```bash
git add popup/popup.html popup/popup.js background/service-worker.js
git commit -m "feat: add config persistence with dual storage and save button"
```