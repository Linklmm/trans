// popup/popup.js - Popup 逻辑

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // 加载当前设置
  await loadSettings();

  // 检查连接状态
  await checkConnection();

  // 绑定事件
  bindEvents();
}

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

/**
 * 检查 Ollama 连接状态
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
    modelSelect.innerHTML = '<option value="">请先连接 Ollama</option>';
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

  // baseUrl 输入框失焦时检查连接
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
