# Macro Tracker

一个纯静态、可离线使用的 iPhone PWA 饮食与体重记录工具。

当前版本：V16  
部署方式：GitHub Pages / Netlify / 任意静态文件托管  
构建要求：无构建步骤，直接上传根目录文件即可

## 文件结构

```text
.
├── index.html              # 页面入口，不需要构建
├── app.js                  # 核心逻辑、IndexedDB、本地草稿、CSV 导入导出
├── styles.css              # 现有视觉样式
├── manifest.json           # PWA 配置
├── sw.js                   # 离线缓存与 GitHub Pages 兼容逻辑
├── icon-192.png            # PWA 图标
├── icon-512.png            # PWA 图标
├── apple-touch-icon.png    # iOS 主屏幕图标
├── .nojekyll               # GitHub Pages 纯静态发布兼容文件
├── .gitignore              # Git 忽略规则
├── AGENTS.md               # Codex / AI 迭代约束
└── CHANGELOG.md            # 版本记录
```

## GitHub Pages 上传方式

1. 在 GitHub 创建一个新 repository。
2. 将本目录所有文件上传到 repository 根目录，不要只上传 `index.html`。
3. 进入 `Settings` → `Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，Folder 选择 `/root`。
6. 保存后等待 Pages 完成发布。

发布后，入口通常是：

```text
https://你的用户名.github.io/你的repo名/
```

## 本地预览

由于 Service Worker 需要通过服务器访问，建议使用本地静态服务器预览：

```bash
python3 -m http.server 8080
```

然后打开：

```text
http://localhost:8080/
```

直接双击 `index.html` 可以查看大部分界面，但 PWA、离线缓存和部分浏览器存储行为可能与正式部署不同。

## 迭代规则

- 不需要 npm、Vite、React 或构建流程。
- 每次迭代直接修改根目录静态文件，然后提交到 `main`。
- 修改视觉样式时只编辑 `styles.css`。
- 修改业务逻辑时优先编辑 `app.js`。
- 修改离线缓存或 GitHub Pages 路径兼容时编辑 `sw.js`。
- 修改 PWA 名称、图标、启动范围时编辑 `manifest.json`。

## 发布前检查清单

每次上传 GitHub 前，至少检查：

1. 根目录仍然包含 `index.html`、`app.js`、`styles.css`、`manifest.json`、`sw.js` 和三个图标文件。
2. `index.html` 里的资源路径保持相对路径，例如 `styles.css`、`app.js`、`manifest.json`。
3. 若改变数据结构，必须保留旧 CSV 和旧 IndexedDB 数据的兼容逻辑。
4. 若改变版本号，同时检查 `APP_VERSION`、页面副标题和缓存命名是否需要同步。
5. 在手机 Safari 上重新打开或从主屏幕重新进入，确认新版本已经生效。

## 数据说明

本工具的数据主要保存在浏览器本地 IndexedDB 中，不会自动同步到 GitHub。重新部署代码不会自动迁移或删除手机本地数据，但以下操作可能导致数据不可见或丢失：

- 更换域名或 GitHub repository 名称；
- 清除 Safari / Chrome 网站数据；
- 删除主屏幕 PWA 后同时清除相关网站数据；
- 手动改变数据库名称、object store 或迁移逻辑。

建议定期通过应用内 CSV 导出保留备份。

## Latest minor UI tweak
- Unfilled meal tabs now use a softer Morandi-style palette so they blend with the overall UI.
- This was a CSS-only visual change; no behavior or settings were changed.
