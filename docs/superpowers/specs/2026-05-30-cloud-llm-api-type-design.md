---
name: Cloud LLM API Type Support
description: 浏览器插件同时支持 Ollama 格式和 OpenAI 兼容格式的 API，通过下拉框切换
type: project
---

# 设计：云厂商大模型支持 - API 类型切换

## 概述
在现有 Ollama 翻译插件基础上，新增 OpenAI 兼容 API 格式支持，用户通过下拉框选择 API 类型。

## 核心变更

### 1. API 类型配置
- popup 新增 "API 类型" 下拉框：Ollama / OpenAI 兼容
- 配置项 `apiType` 存入 `chrome.storage.sync`
- 切换类型时，模型获取和翻译请求使用对应 API 格式

### 2. API 格式差异

| 项目 | Ollama | OpenAI 兼容 |
|------|--------|------------|
| 模型列表 | `GET /api/tags` | `GET /v1/models` |
| 翻译请求 | `POST /api/generate` | `POST /v1/chat/completions` |
| 请求体 | `{model, prompt, stream: false}` | `{model, messages: [{role, content}], stream: false}` |
| 响应解析 | `data.response` | `data.choices[0].message.content` |

### 3. 文件变更

- **utils/api.js**: `OllamaAPI` 类增加 `apiType` 参数，内部根据类型路由到不同 API 调用
- **popup/popup.html**: 新增 API 类型下拉框
- **popup/popup.js**: 加载/保存 `apiType`，切换时检查连接
- **background/service-worker.js**: 保存/恢复 `apiType` 配置
