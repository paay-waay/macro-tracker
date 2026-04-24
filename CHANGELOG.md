# Changelog

## V16 GitHub-ready packaging

- 保留原有设定、业务逻辑与视觉外观。
- 增加 GitHub Pages 所需的 `.nojekyll`。
- 增加 `.gitignore`，避免上传系统文件、临时文件和构建缓存。
- 增加 `README.md`，说明 GitHub Pages 上传、文件结构、本地预览和发布检查。
- 增加 `AGENTS.md`，约束后续 Codex / AI 迭代不得擅自改变设定和外观。
- 优化 `sw.js`，提升 GitHub Pages 子路径兼容和反复上传后的缓存更新可靠性。
## 2026-04-24 · UI tweak (Morandi pending meal tabs)
- Only adjusted the visual style of unfilled meal tabs (`.meal-tab`) to a softer Morandi palette.
- Added explicit text color and appearance reset to avoid the default browser blue button text.
- No settings, logic, data structure, or layout were changed.

