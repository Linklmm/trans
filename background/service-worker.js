// background/service-worker.js - Background Service Worker

importScripts('/utils/api.js', '/utils/cache.js');

// 初始化
const api = new OllamaAPI();
const cache = new TranslationCache();

// 默认配置
const defaultSettings = {
  apiType: 'ollama',
  baseUrl: 'http://localhost:11434',
  apiKey: '',
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

  // 移除现有菜单，防止重复
  await chrome.contextMenus.removeAll();

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
    if (changes.apiType) {
      api.setApiType(changes.apiType.newValue);
    }
    if (changes.baseUrl) {
      api.setBaseUrl(changes.baseUrl.newValue);
    }
    if (changes.apiKey) {
      api.setApiKey(changes.apiKey.newValue);
    }
    if (changes.cacheEnabled) {
      cache.setEnabled(changes.cacheEnabled.newValue);
    }
  }
});

// 右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === 'translate-selection') {
      const text = info.selectionText;
      if (text) {
        // 发送消息到 Content Script
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
  } catch (err) {
    console.error('Context menu action failed:', err);
  }
});

// 快捷键命令
chrome.commands.onCommand.addListener(async (command, tab) => {
  try {
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
  } catch (err) {
    console.error('Command action failed:', err);
  }
});

// 监听来自 Content Script 和 Popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理异步响应
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(err => sendResponse({ error: err.message }));
  return true; // 保持消息通道开启
});

async function handleMessage(message, sender) {
  const settings = await chrome.storage.sync.get(null);
  api.setApiType(settings.apiType || defaultSettings.apiType);
  api.setBaseUrl(settings.baseUrl || defaultSettings.baseUrl);
  api.setApiKey(settings.apiKey || defaultSettings.apiKey);
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
  const maxChunkSize = 2000;
  const chunks = splitText(text, maxChunkSize);

  try {
    const results = await Promise.all(
      chunks.map(chunk => api.translate(chunk, model))
    );
    const result = results.join('');

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
    const apiType = (await chrome.storage.sync.get('apiType')).apiType || 'ollama';
    const modelIds = apiType === 'openai'
      ? models.map(m => m.id)
      : models.map(m => m.name);
    return { models: modelIds };
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
