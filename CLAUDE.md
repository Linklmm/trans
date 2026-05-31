# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ollama Translator** — Chrome 浏览器扩展，支持本地 Ollama 和云厂商大模型（阿里百炼、火山引擎等）进行英文到中文的网页翻译。

- Manifest V3，纯原生 JavaScript，无构建工具
- 开发方式：修改代码后在 `chrome://extensions/` 点击刷新按钮重新加载

## Architecture

### Message Flow

```
Popup / Context Menu / Keyboard Shortcut
    → chrome.runtime.sendMessage() → Background Service Worker
    → OllamaAPI.translate() → 云厂商/本地 API
    → 返回译文 → Content Script 插入到页面 DOM
```

### Component Breakdown

| Component | Role |
|-----------|------|
| `manifest.json` | 扩展配置，定义权限、content scripts、background service worker |
| `background/service-worker.js` | 消息中枢，处理来自 popup/content 的所有请求；维护 API 客户端和缓存实例 |
| `content/content.js` | Content Script，注入到所有页面，负责选中翻译、全文翻译、智能翻译、段落悬停翻译 |
| `content/content.css` | 译文展示样式（进度条、高亮等） |
| `popup/popup.html` + `popup/popup.js` | 扩展设置面板（API 类型、地址、Key、模型、触发方式、缓存） |
| `utils/api.js` | `OllamaAPI` 类，统一封装 Ollama 和 OpenAI 兼容两种 API 格式 |
| `utils/cache.js` | `TranslationCache` 类，基于 `chrome.storage.local` 的译文缓存 |
| `utils/content-detector.js` | `ContentDetector` 类，基于文本密度和语义标签检测页面主要内容区域 |

### Message Protocol

Background Service Worker 通过 `chrome.runtime.onMessage` 处理以下 action：

| Action | Direction | Description |
|--------|-----------|-------------|
| `translate` | Content/Popup → Background | 翻译请求，返回 `{translation, cached?}` 或 `{error}` |
| `getModels` | Popup → Background | 获取模型列表 |
| `checkConnection` | Popup → Background | 检查 API 连接状态 |
| `clearCache` | Popup → Background | 清除缓存 |
| `getSettings` | Popup → Background | 获取配置 |
| `updateSettings` | Popup → Background | 更新配置 |
| `translateSelection` | Background → Content | 翻译选中文本 |
| `translatePage` | Background → Content | 翻译整个页面 |
| `translateSmart` | Background → Content | 智能翻译主要内容区域 |
| `translateParagraph` | Background → Content | 翻译单个段落 |
| `cancelTranslation` | Background → Content | 取消当前翻译任务 |

### Storage Keys (`chrome.storage.sync`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `apiType` | `'ollama' \| 'openai'` | `'ollama'` | API 类型 |
| `baseUrl` | string | `'http://localhost:11434'` | API 地址 |
| `apiKey` | string | `''` | API Key |
| `model` | string | `''` | 模型名称 |
| `cacheEnabled` | boolean | `true` | 是否启用缓存 |
| `triggers` | object | `{selection, page, paragraph: true}` | 翻译触发方式 |

缓存 key 前缀为 `trans_`，存储在 `chrome.storage.local`。

### API Format Differences

| Item | Ollama | OpenAI Compatible |
|------|--------|-------------------|
| Model list | `GET /api/tags` | 不支持，返回空数组 |
| Translation | `POST /api/generate` | `POST /v1/chat/completions` |
| Request body | `{model, prompt, stream}` | `{model, messages, stream}` |
| Response | `data.response` | `data.choices[0].message.content` |
| Connection check | `GET /api/tags` | `POST /v1/chat/completions` (测试请求) |

云厂商（如阿里百炼）不支持 `/v1/models` 接口，OpenAI 模式下模型需手动输入。

常见云厂商 Base URL：
- **阿里百炼**：`https://dashscope.aliyuncs.com/compatible-mode`
- **火山引擎**：`https://ark.cn-beijing.volces.com/api/v3`

### Development Workflow

1. 修改代码
2. 打开 `chrome://extensions/`，找到扩展并点击刷新按钮
3. 打开任意英文页面测试功能

无构建步骤、无测试框架、无 lint 工具。
