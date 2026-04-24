# Codex / AI 迭代约束

本项目是一个无构建流程的纯静态 PWA。除非用户明确要求，不要引入 React、Vite、npm build、后端服务、数据库服务器或外部登录系统。

## 不得擅自改变

- 不要改变现有视觉风格、配色、间距、字体、底部导航、卡片样式或整体布局。
- 不要改变默认饮食目标、BMR、目标体重、目标日期、训练日/休息日宏量设置等业务设定。
- 不要重命名现有 localStorage key、IndexedDB DB_NAME、object store 或 CSV header，除非同时提供向后兼容迁移。
- 不要移除旧版本导入、旧版本迁移或本地草稿恢复逻辑。

## 推荐修改方式

- 小步提交，每次只处理一个明确问题。
- 视觉修改集中在 `styles.css`。
- 功能修改集中在 `app.js`。
- GitHub Pages、离线缓存和 PWA 兼容修改集中在 `sw.js` 与 `manifest.json`。
- 修改前先搜索相关函数，避免复制出第二套相似逻辑。

## 发布兼容要求

- 所有静态资源路径必须保持相对路径，兼容 GitHub Pages 的 repository 子路径，例如 `/repo-name/`。
- 不要依赖绝对根路径 `/app.js`、`/styles.css` 或 `/manifest.json`。
- Service Worker 必须在 GitHub Pages 子路径下正常缓存资源。
- 新版本必须支持刷新后加载最新文件，并在离线时回退到缓存。

## 数据兼容要求

- CSV 导出字段新增时，必须保证旧 CSV 仍可导入。
- IndexedDB 版本升级必须写 `onupgradeneeded` 迁移逻辑。
- 任何数据字段新增都应提供默认值。
- 不能因为 UI 文案调整导致历史记录、常用餐、设置或草稿失效。

## 验收检查

- `index.html` 可直接加载。
- 今日页、历史页、总览页可切换。
- 设置弹窗可打开并保存。
- 常用餐可新增、编辑、删除、套用。
- CSV 可导出，旧 CSV 可导入。
- GitHub Pages 子路径部署后，刷新页面不出现 404。
- 离线打开时，核心页面仍可访问。
