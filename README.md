# Ollama Translator

> 使用本地或云端大模型进行英汉翻译的 Chrome 浏览器扩展

## 功能特性

- **选中翻译** — 选中文本后右键或快捷键翻译
- **全文翻译** — 翻译整个页面的所有内容
- **智能翻译** — 自动识别页面主要内容区域后翻译
- **段落悬停翻译** — 鼠标悬停段落时显示翻译按钮
- **翻译缓存** — 缓存翻译结果，减少重复 API 请求
- **支持多种 API 格式** — Ollama 本地 / OpenAI 兼容的云端大模型

## 支持的 API 类型

| 类型 | 适用场景 | 模型获取 |
|------|---------|---------|
| **Ollama** | 本地运行的大模型 | 自动获取已安装模型 |
| **OpenAI 兼容** | 云端大模型（阿里百炼、火山引擎等） | 手动输入模型名称 |

### 常见云厂商 Base URL

> OpenAI 兼容模式下，Base URL 需包含版本前缀（如 `/v1` 或 `/api/v3`）。

| 云厂商 | Base URL |
|--------|----------|
| 阿里百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 火山引擎 | `https://ark.cn-beijing.volces.com/api/v3` |
| 标准 OpenAI | `https://api.openai.com/v1` |
| 本地 Ollama | `http://localhost:11434` |

## 安装方式

### 开发者模式安装

1. 打开 Chrome，访问 `chrome://extensions/`
2. 右上角开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择本项目根目录
4. 扩展图标出现在浏览器工具栏即安装成功

### 重新加载

修改代码后，在 `chrome://extensions/` 找到该扩展，点击 **刷新** 按钮即可重新加载。

## 配置说明

点击扩展图标打开 Popup 面板，进行以下配置：

### 使用本地 Ollama

1. 从 [ollama.ai](https://ollama.ai) 下载并安装 Ollama
2. 拉取翻译模型：
   ```bash
   ollama pull qwen2
   ```
3. Popup 中选择 **Ollama** 模式（默认）
4. 确认地址为 `http://localhost:11434`
5. 从下拉框选择模型

### 使用云端大模型

#### 阿里百炼

1. 在 [阿里云百炼](https://bailian.console.aliyun.com/) 开通服务并获取 API Key
2. Popup 中选择 **OpenAI 兼容** 模式
3. API 地址填写：`https://dashscope.aliyuncs.com/compatible-mode/v1`
4. 输入你的 API Key（以 `sk-` 开头）
5. 手动输入模型名称，如 `qwen-plus`、`qwen-max`、`qwen-turbo` 等

#### 火山引擎

1. 在 [火山引擎](https://console.volcengine.com/ark) 开通方舟服务并获取 API Key
2. Popup 中选择 **OpenAI 兼容** 模式
3. API 地址填写：`https://ark.cn-beijing.volces.com/api/v3`
4. 输入你的 API Key
5. 手动输入模型名称（Endpoint ID），如 `ep-xxxxx`

### 翻译触发方式

- **选中翻译**：选中文本后右键或快捷键翻译
- **全文翻译**：翻译整个页面内容
- **段落翻译**：鼠标悬停段落时显示翻译按钮

### 翻译缓存

- 启用/关闭缓存
- 一键清除所有缓存

## 快捷键

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 选中翻译 | `Ctrl+Shift+T` | `Cmd+Shift+T` |
| 全文翻译 | `Ctrl+Shift+P` | `Cmd+Shift+P` |

可在 `chrome://extensions/shortcuts` 自定义。

## 右键菜单

- 选中文本后右键 → **翻译选中内容**
- 页面空白处右键 → **智能翻译主要内容**

## Popup 操作

点击扩展图标打开面板：
- **翻译当前页面** — 翻译整个页面
- **智能翻译** — 只翻译主要内容区域

## 技术架构

- **Manifest V3** — 最新 Chrome 扩展规范
- **纯原生 JavaScript** — 无第三方依赖，无构建工具
- **chrome.storage.sync** — 配置跨设备同步
- **chrome.storage.local** — 翻译缓存本地存储
- **并发翻译** — 长文本自动分块并发请求，提升翻译速度

## 文件结构

```
trans/
├── manifest.json              # 扩展配置
├── background/
│   └── service-worker.js      # 消息中枢，处理 API 调用与缓存
├── content/
│   ├── content.js             # Content Script 主逻辑
│   └── content.css            # 译文展示样式
├── popup/
│   ├── popup.html             # Popup 设置面板
│   ├── popup.js               # 面板逻辑
│   └── popup.css              # 面板样式
├── utils/
│   ├── api.js                 # API 客户端（Ollama / OpenAI 兼容）
│   ├── cache.js               # 翻译缓存
│   └── content-detector.js    # 页面内容检测
└── icons/                     # 扩展图标
```

## 开发说明

1. 修改代码后，在 `chrome://extensions/` 点击刷新按钮
2. 打开任意英文页面测试功能

## 许可证

Apache License 2.0
