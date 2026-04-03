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
  return (hash >>> 0).toString(36);  // Unsigned 32-bit
}

/**
 * 翻译缓存管理器
 */
class TranslationCache {
  constructor() {
    this.enabled = true;
  }

  /**
   * 生成缓存 key
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
    } catch (err) {
      console.warn('Cache operation failed:', err);
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
    } catch (err) {
      console.warn('Cache operation failed:', err);
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
    } catch (err) {
      console.warn('Cache operation failed:', err);
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

// 导出：importScripts 会自动将类暴露到全局作用域
// Content Script 中通过 window 访问
if (typeof window !== 'undefined') {
  window.TranslationCache = TranslationCache;
  window.hashString = hashString;
}
