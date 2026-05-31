# Chrome英译汉扩展设计文档

## 概述

开发一个Chrome浏览器扩展，通过调用本地Ollama大模型实现英译汉功能，译文以简洁样式显示在原文下方。

## 一、整体架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Popup       │     │    Background   │     │  Content Script │
│   (设置/操作)    │────▶│    Service     │◀────│   (页面交互)     │
└─────────────────┘     │    Worker      │     └─────────────────┘
                        └────────┬───────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    Ollama API   │
                        │  (本地/远程)     │
                        └─────────────────┘
```

- **Manifest V3** 标准
- Background作为消息中转和API调用中心
- Content Script处理页面DOM和用户交互
- Popup提供设置面板和快捷操作

## 二、核心功能模块

### 2.1 选中翻译
- 用户选中文本后，右键菜单显示"翻译选中内容"
- 支持快捷键触发（默认 `Ctrl+Shift+T`，可自定义）
- 译文以浅色/斜体显示在选中文字下方

### 2.2 全文翻译
- 点击扩展图标或快捷键翻译整个页面
- 遍历所有文本节点，逐段翻译
- 显示翻译进度（如"正在翻译 3/10 段"）

### 2.3 智能选择翻译
- 使用内容检测算法识别主要内容区域（article、main、或文本密度最高的区域）
- 忽略导航栏、侧边栏、广告等非核心内容
- 一键翻译识别到的主要内容

### 2.4 段落级翻译
- 鼠标悬停在段落上时显示翻译按钮
- 点击翻译按钮翻译该段落
- 译文显示在段落下方

## 三、设置模块

Popup界面提供以下设置选项：

| 设置项 | 说明 |
|-------|------|
| Ollama地址 | 输入框，默认 `http://localhost:11434` |
| 模型选择 | 下拉列表，自动获取Ollama已安装模型 |
| 翻译触发方式 | 多选：选中翻译、全文翻译、段落翻译 |
| 快捷键设置 | 显示当前快捷键，引导用户到Chrome扩展快捷键设置页 |
| 缓存策略 | 开关：启用/禁用翻译缓存 |
| 清除缓存 | 按钮：清除已缓存的翻译结果 |

设置保存在 `chrome.storage.sync`，跨设备同步。

## 四、API调用与消息通信

### 4.1 Ollama API调用
- 调用 `GET /api/tags` 获取已安装模型列表
- 调用 `POST /api/generate` 进行翻译
- 请求体示例：
```json
{
  "model": "qwen2",
  "prompt": "将以下英文翻译成中文，只返回译文：\nHello world",
  "stream": false
}
```

### 4.2 消息通信协议
Content Script与Background之间使用 `chrome.runtime.sendMessage`：

```javascript
// 请求翻译
{ action: "translate", text: "...", targetLang: "zh" }

// 获取模型列表
{ action: "getModels" }

// 清除缓存
{ action: "clearCache" }
```

### 4.3 缓存机制（用户可选）
- 启用时使用 `chrome.storage.local` 存储
- Key格式：`hash(text) + model`
- 用户可在设置中一键清除

## 五、译文展示样式（简洁模式）

- **字体**：继承原文字体，略小（0.9em）
- **颜色**：灰色（#666）+ 斜体
- **位置**：原文正下方，左对齐
- **间距**：margin-top: 4px
- **容器**：译文包裹在 `<span class="ollama-translation">` 中，不破坏原有DOM结构

示例效果：
```
原文内容（正常样式）
译文内容（灰色斜体，在原文下方）
```

### 状态反馈
- 翻译中：显示"翻译中..."动画
- 翻译失败：显示"翻译失败"（红色），点击可重试
- 翻译成功：直接显示译文

## 六、错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| Ollama服务未启动 | 提示"无法连接Ollama服务，请确认服务已启动" |
| 地址配置错误 | 提示"Ollama地址无效，请检查设置" |
| 模型不存在 | 提示"模型不存在，请重新选择模型" |
| 网络超时 | 30秒超时，提示"翻译超时，请重试" |
| 翻译内容过长 | 分段翻译，每段不超过500字符 |

错误信息显示在译文位置，支持点击重试。

## 七、项目文件结构

```
trans/
├── manifest.json          # 扩展配置
├── background/
│   └── service-worker.js  # Background Service Worker
├── content/
│   ├── content.js         # Content Script主逻辑
│   └── content.css        # 译文样式
├── popup/
│   ├── popup.html         # Popup界面
│   ├── popup.js           # Popup逻辑
│   └── popup.css          # Popup样式
├── utils/
│   ├── api.js             # Ollama API封装
│   ├── cache.js           # 缓存工具
│   └── content-detector.js # 智能内容检测
├── icons/                  # 扩展图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # 使用说明
```

## 八、技术要点

1. **Manifest V3兼容**：使用Service Worker替代Background Page
2. **跨域请求**：在manifest中声明host_permissions允许访问Ollama地址
3. **文本提取**：使用TreeWalker遍历文本节点，保留DOM结构
4. **智能检测**：基于标签名（article/main）和文本密度算法识别主内容
5. **性能优化**：批量翻译时使用队列控制并发，避免过多请求

## 九、成功标准

- 选中文本后能在2秒内显示译文（取决于Ollama响应）
- 全文翻译支持进度显示，可随时取消
- 智能检测能准确识别文章正文区域
- 设置更改即时生效，无需刷新页面