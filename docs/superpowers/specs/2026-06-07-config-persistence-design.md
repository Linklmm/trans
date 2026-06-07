# 配置持久化设计文档

## 问题背景

当前扩展使用 `chrome.storage.sync` 保存用户配置，但在开发模式或未登录 Chrome 账户的情况下，`storage.sync` 数据不会真正持久化到磁盘，导致浏览器重启后配置丢失。

## 设计方案

### 存储架构

采用双存储策略：
- **`storage.local`**：主存储，始终在本地磁盘持久化，不依赖 Chrome 账户
- **`storage.sync`**：备份存储，用于跨设备同步（如果可用）

```
保存：用户点击"保存" → 同时写入 storage.local 和 storage.sync
读取：优先 storage.local → 若无数据则 fallback 到 storage.sync（兼容旧数据）
```

### UI 改动

在 popup 底部添加显式"保存配置"按钮：
- 按钮文字：**保存配置**
- 点击后显示 toast 提示：**配置已保存**
- 移除当前的自动保存逻辑（change 事件触发保存）

### 代码改动清单

#### 1. popup/popup.html
- 添加"保存配置"按钮，样式与现有按钮一致

#### 2. popup/popup.js
- `saveSettings()`：同时写入 `storage.local` 和 `storage.sync`
- 移除 `bindEvents()` 中的自动保存逻辑
- 添加保存按钮点击事件，保存后显示 toast 提示

#### 3. background/service-worker.js
- `onInstalled`：检查是否已有配置，若无才写入默认配置（不覆盖用户配置）
- `handleMessage()`：读取配置时优先从 `storage.local` 获取，fallback 到 `storage.sync`

### 兼容性考虑

- 读取时优先 `local`，若无数据则读取 `sync`，确保旧版本用户升级后数据不丢失
- 保存时同时写入两个存储，保证未来切换存储策略时数据完整