// utils/api.js - Ollama API 封装

/**
 * Ollama API 客户端
 */
class OllamaAPI {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.timeout = 30000; // 30 秒超时
  }

  /**
   * 设置 API 地址
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
      throw new Error(`获取模型列表失败：${error.message}`);
    }
  }

  /**
   * 翻译文本
   * @param {string} text - 待翻译文本
   * @param {string} model - 模型名称
   * @returns {string} - 翻译结果
   */
  async translate(text, model) {
    // 输入验证
    if (!text || !text.trim()) {
      throw new Error('翻译内容不能为空');
    }
    if (!model || !model.trim()) {
      throw new Error('请先选择翻译模型');
    }

    // 添加超时处理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const prompt = `将以下英文翻译成中文，只返回译文，不要解释：\n${text}`;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        clearTimeout(timeoutId);
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      clearTimeout(timeoutId);
      return data.response || '';
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('翻译超时，请重试');
      }
      throw new Error(`翻译失败：${error.message}`);
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
