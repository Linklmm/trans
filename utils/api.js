// utils/api.js - Ollama / OpenAI 兼容 API 封装
// 注意：使用 importScripts() 加载时，类会自动暴露到全局作用域

/**
 * Ollama / OpenAI 兼容 API 客户端
 */
class OllamaAPI {
  constructor(baseUrl = 'http://localhost:11434', apiKey = '', apiType = 'ollama') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.apiType = apiType; // 'ollama' | 'openai'
    this.timeout = 60000; // 60 秒超时
  }

  /**
   * 设置 API 地址
   */
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * 设置 API Key
   */
  setApiKey(key) {
    this.apiKey = key;
  }

  /**
   * 设置 API 类型
   */
  setApiType(type) {
    this.apiType = type;
  }

  /**
   * 获取请求头
   */
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * 获取模型列表
   * 注意：云厂商（如阿里百炼）通常不支持 /v1/models 接口
   * OpenAI 模式下返回空数组，模型需手动输入
   */
  async getModels() {
    if (this.apiType === 'openai') {
      // 云厂商大多不支持 models 接口，直接返回空
      return [];
    }

    // Ollama 格式
    const paths = [
      `${this.baseUrl.replace(/\/$/, '')}/ollama/api/tags`,  // Open WebUI 格式
      `${this.baseUrl.replace(/\/$/, '')}/api/tags`          // 原生 Ollama 格式
    ];

    for (const path of paths) {
      try {
        const response = await fetch(path, {
          method: 'GET',
          headers: this.getHeaders()
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            if (data.models && data.models.length > 0) {
              return data.models;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error('获取模型列表失败');
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

    const prompt = `翻译为中文：\n${text}`;

    try {
      let result;
      if (this.apiType === 'openai') {
        result = await this.translateOpenAI(prompt, model, controller.signal);
      } else {
        result = await this.translateOllama(prompt, model, controller.signal);
      }
      clearTimeout(timeoutId);
      return result;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('翻译超时，请重试');
      }
      throw e;
    }
  }

  /**
   * Ollama 格式翻译
   */
  async translateOllama(prompt, model, signal) {
    const paths = [
      `${this.baseUrl.replace(/\/$/, '')}/ollama/api/generate`,  // Open WebUI 格式
      `${this.baseUrl.replace(/\/$/, '')}/api/generate`          // 原生 Ollama 格式
    ];

    for (const path of paths) {
      try {
        const response = await fetch(path, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false
          }),
          signal: signal
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            if (data.response) {
              let result = data.response;
              result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
              result = result.replace(/^[🤔💭🧠][\s\S]*?(?=\n\n|\n[^🤔💭🧠]|$)/g, '');
              result = result.trim();
              return result;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error('翻译失败');
  }

  /**
   * OpenAI 兼容格式翻译
   */
  async translateOpenAI(prompt, model, signal) {
    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: '专业翻译助手，只返回译文。' },
          { role: 'user', content: prompt }
        ],
        stream: false
      }),
      signal: signal
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMsg = errorBody?.error?.message || `HTTP ${response.status}`;
      throw new Error(`翻译失败: ${errorMsg}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('翻译失败');
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      let result = data.choices[0].message.content;
      result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
      result = result.replace(/^[🤔💭🧠][\s\S]*?(?=\n\n|\n[^🤔💭🧠]|$)/g, '');
      result = result.trim();
      return result;
    }

    throw new Error('翻译失败');
  }

  /**
   * 检查服务是否可用
   * Ollama: 请求 /api/tags
   * OpenAI 兼容: 发送一个极小的测试翻译请求验证连接和 apiKey
   */
  async checkConnection() {
    if (this.apiType === 'openai') {
      // 云厂商大多不支持 /v1/models，用实际翻译接口验证连接
      if (!this.apiKey) {
        return false;
      }
      const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: 'test',
            messages: [{ role: 'user', content: 'ok' }],
            max_tokens: 1,
            stream: false
          })
        });

        // 401/403 表示认证失败，说明地址可达但 key 无效
        if (response.status === 401 || response.status === 403) {
          return false;
        }
        // 其他任何响应（包括 400 模型不存在）都说明地址和 key 有效
        return true;
      } catch (e) {
        return false;
      }
    }

    // Ollama 格式
    const paths = [
      `${this.baseUrl.replace(/\/$/, '')}/ollama/api/tags`,  // Open WebUI 格式
      `${this.baseUrl.replace(/\/$/, '')}/api/tags`          // 原生 Ollama 格式
    ];

    for (const path of paths) {
      try {
        const response = await fetch(path, {
          method: 'GET',
          headers: this.getHeaders()
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            return true;
          }
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  }
}
// 类定义在全局作用域，importScripts() 后可直接使用 new OllamaAPI()
