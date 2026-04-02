# Ollama Translator

Chrome浏览器扩展，使用本地Ollama大模型进行英译汉翻译。

## 功能特性

- **选中翻译**: 选中文本后右键菜单或快捷键翻译
- **全文翻译**: 一键翻译整个页面内容
- **智能翻译**: 自动识别主要内容区域翻译
- **段落翻译**: 鼠标悬停段落显示翻译按钮

## 安装步骤

### 1. 安装Ollama

从 [ollama.ai](https://ollama.ai) 下载并安装Ollama。

安装翻译模型：
```bash
ollama pull qwen2
```

### 2. 安装扩展

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目目录

### 3. 配置扩展

1. 点击扩展图标打开设置面板
2. 确认Ollama地址（默认 `http://localhost:11434`）
3. 选择翻译模型
4. 根据需要调整其他设置

## 使用方法

### 快捷键

| 功能 | Windows/Linux | Mac |
|------|---------------|-----|
| 翻译选中内容 | Ctrl+Shift+T | Command+Shift+T |
| 翻译整个页面 | Ctrl+Shift+P | Command+Shift+P |

可在 `chrome://extensions/shortcuts` 自定义快捷键。

### 右键菜单

- 选中文本后右键 → "翻译选中内容"
- 页面空白处右键 → "智能翻译主要内容"

### Popup操作

点击扩展图标：
- "翻译当前页面" - 翻译整个页面
- "智能翻译" - 只翻译主要内容区域

## 设置说明

| 设置项 | 说明 |
|-------|------|
| Ollama地址 | Ollama服务地址，支持本地和远程 |
| 翻译模型 | 选择Ollama已安装的模型 |
| 翻译触发方式 | 启用/禁用不同翻译方式 |
| 启用缓存 | 缓存翻译结果减少重复请求 |

## 技术架构

- Manifest V3 Chrome扩展
- Background Service Worker处理API调用
- Content Script处理页面DOM
- Popup提供设置界面

## 开发说明

### 文件结构

```
trans/
├── manifest.json          # 扩展配置
├── background/
│   └── service-worker.js  # API调用中心
├── content/
│   ├── content.js         # 页面交互
│   └── content.css        # 译文样式
├── popup/
│   ├── popup.html         # 设置界面
│   ├── popup.js           # Popup逻辑
│   └── popup.css          # Popup样式
├── utils/
│   ├── api.js             # Ollama API封装
│   ├── cache.js           # 缓存工具
│   └── content-detector.js # 内容检测
└── icons/                  # 扩展图标
```

### 本地测试

1. 修改代码后，在 `chrome://extensions/` 点击刷新按钮
2. 打开任意英文页面测试功能

## 许可证

MIT License