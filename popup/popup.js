// popup/popup.js - Popup 逻辑

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // 加载当前设置
  await loadSettings();

  // 使用已保存的配置检查连接状态（配置已保存，不会有循环依赖）
  await checkConnectionWithSavedSettings();

  // 绑定事件
  bindEvents();
}

/**
 * 获取当前选中的 API 类型（从按钮组读取）
 */
function getApiType() {
  const activeBtn = document.querySelector('.api-type-btn.active');
  return activeBtn ? activeBtn.dataset.type : 'ollama';
}

/**
 * 更新连接状态显示
 */
function updateConnectionStatus(text, state) {
  const statusEl = document.getElementById('connectionStatus');
  statusEl.className = 'connection-status' + (state ? ' ' + state : '');
  const textEl = statusEl.querySelector('.status-text');
  if (textEl) {
    textEl.textContent = text;
  }
}

/**
 * 使用已保存的配置检查连接状态（popup 打开时调用）
 */
async function checkConnectionWithSavedSettings() {
  updateConnectionStatus('检查连接...', '');

  // 使用 storage 中很保存的配置
  const connected = await chrome.runtime.sendMessage({ action: 'checkConnection' });

  if (connected) {
    updateConnectionStatus('已连接', 'connected');
    // 连接成功后刷新模型列表（仅 Ollama）
    const apiType = getApiType();
    if (apiType === 'ollama') {
      await loadModels(document.getElementById('modelSelect').value);
    }
  } else {
    updateConnectionStatus('未连接', 'error');
  }

  // 更新翻译按钮状态（保存按钮不受影响）
  updateTranslateButtonStates(connected);
}

/**
 * 加载设置
 */
async function loadSettings() {
  // 优先从 storage.local 读取，fallback 到 storage.sync
  let settings = await chrome.storage.local.get(null);
  const hasSettings = ['apiType', 'baseUrl', 'apiKey', 'model', 'cacheEnabled', 'triggers']
    .some(key => settings.hasOwnProperty(key));
  if (!hasSettings) {
    settings = await chrome.storage.sync.get(null);
  }

  // 填充表单 — API 类型通过按钮组设置
  const apiType = settings.apiType || 'ollama';
  document.querySelectorAll('.api-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === apiType);
  });

  document.getElementById('baseUrl').value = settings.baseUrl || 'http://localhost:11434';
  document.getElementById('apiKey').value = settings.apiKey || '';
  document.getElementById('cacheEnabled').checked = settings.cacheEnabled ?? true;
  document.getElementById('triggerSelection').checked = settings.triggers?.selection ?? true;
  document.getElementById('triggerPage').checked = settings.triggers?.page ?? true;
  document.getElementById('triggerParagraph').checked = settings.triggers?.paragraph ?? true;

  // 根据 API 类型切换模型控件
  updateModelInputMode();

  // 加载模型列表（仅 Ollama）
  if (apiType === 'ollama') {
    await loadModels(settings.model);
  } else {
    document.getElementById('modelInput').value = settings.model || '';
  }

  // 加载缓存大小
  await loadCacheSize();
}

/**
 * 保存设置
 */
async function saveSettings() {
  const apiType = getApiType();
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

/**
 * 根据 API 类型切换模型控件显示模式
 */
function updateModelInputMode() {
  const apiType = getApiType();
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
    baseUrlLabel.textContent = 'Ollama / Open WebUI 地址';
    baseUrlInput.placeholder = 'http://localhost:11434';
  }
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

/**
 * 测试连接（使用当前输入的值）
 */
async function testConnection() {
  updateConnectionStatus('测试连接...', '');

  // 使用当前输入的值，而非 storage 中保存的值
  const apiType = getApiType();
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!baseUrl) {
    updateConnectionStatus('请填写 API 地址', 'error');
    return;
  }

  if (apiType === 'openai' && !apiKey) {
    updateConnectionStatus('请填写 API Key', 'error');
    return;
  }

  // 发送当前输入值给 service-worker 进行连接测试
  const connected = await chrome.runtime.sendMessage({
    action: 'checkConnection',
    apiType: apiType,
    baseUrl: baseUrl,
    apiKey: apiKey
  });

  if (connected) {
    updateConnectionStatus('连接成功', 'connected');
    showToast('连接成功');
  } else {
    updateConnectionStatus('连接失败', 'error');
    showToast('连接失败，请检查配置');
  }

  // 更新翻译按钮状态（保存按钮不受影响）
  updateTranslateButtonStates(connected);
}

/**
 * 更新翻译按钮状态（保存按钮始终可点击）
 */
function updateTranslateButtonStates(connected) {
  const translateBtns = document.querySelectorAll('#translatePageBtn, #translateSmartBtn');
  const apiType = getApiType();

  translateBtns.forEach(btn => {
    btn.disabled = !connected;
  });

  // 模型选择也依赖连接
  if (!connected) {
    if (apiType === 'ollama') {
      document.getElementById('modelSelect').innerHTML = '<option value="">请先连接 Ollama</option>';
    } else {
      document.getElementById('modelInput').placeholder = '请先连接服务';
    }
  } else if (apiType === 'openai') {
    // 恢复 OpenAI 模式下的 placeholder
    document.getElementById('modelInput').placeholder = '输入模型名称，如 qwen-plus';
  }
}

/**
 * 加载缓存大小
 */
async function loadCacheSize() {
  const allData = await chrome.storage.local.get(null);
  const cacheCount = Object.keys(allData).filter(k => k.startsWith('trans_')).length;
  document.getElementById('cacheSize').textContent = `缓存：${cacheCount} 条`;
}

/**
 * 清除缓存
 */
async function clearCache() {
  await chrome.runtime.sendMessage({ action: 'clearCache' });
  document.getElementById('cacheSize').textContent = '缓存：0 条';

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
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

/**
 * 绑定事件
 */
function bindEvents() {
  // Tab 切换
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      // 切换 active tab
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // 切换对应 panel
      const targetTab = tab.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.panel === targetTab);
      });
    });
  });

  // API 类型按钮切换
  document.querySelectorAll('.api-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.api-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateModelInputMode();
    });
  });

  // 刷新模型列表按钮
  document.getElementById('refreshModels').addEventListener('click', async () => {
    const apiType = getApiType();
    if (apiType === 'ollama') {
      // 使用当前输入的 baseUrl 进行刷新
      const baseUrl = document.getElementById('baseUrl').value.trim();
      const apiKey = document.getElementById('apiKey').value.trim();
      const response = await chrome.runtime.sendMessage({
        action: 'getModels',
        apiType: apiType,
        baseUrl: baseUrl,
        apiKey: apiKey
      });
      if (response.models && response.models.length > 0) {
        const select = document.getElementById('modelSelect');
        const currentModel = select.value;
        select.innerHTML = response.models.map(m =>
          `<option value="${m}" ${m === currentModel ? 'selected' : ''}>${m}</option>`
        ).join('');
      } else {
        document.getElementById('modelSelect').innerHTML = '<option value="">未找到模型</option>';
      }
    }
  });

  // 测试连接按钮
  document.getElementById('testConnectionBtn').addEventListener('click', testConnection);

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

  // 保存配置按钮
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

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
