# Web 工具应用集合

零依赖、纯浏览器运行的小工具集合。每个工具 1-3 个文件，打开 HTML 即可使用。

## 工具列表

| 工具 | 说明 | 文件 |
|------|------|------|
| 番茄钟 | 专注计时器（专注/计时/闹钟/秒表/世界时钟） | `index.html` + `script.js` + `style.css` |
| 公众号排版 | Markdown 编辑器，实时预览，一键复制公众号格式 | `index.html` + `script.js` + `style.css` |
| 记账反思 | 记账 + 消费反思 + 统计图表 | `index.html` |
| 阅读器 | TXT/MD 文件阅读器，拖拽打开，主题切换 | `index.html` |
| 灵感收集 | 灵感节点画布，拖拽连线，深度挖掘 | `case.httl` |
| laonianr | 老年人健康管家（血压/血糖/用药/饮食） | `index.html` |
| yduq2 | 本地阅读应用（TXT/EPUB/PDF） | `index.html` + `style.css` + `epub.js` + `reader.js` + `indexeddb.js` |

## 技术栈

- 纯 HTML/CSS/JavaScript，无构建步骤
- 仅使用 CDN: `marked.js`（Markdown 渲染）、`epub.js`（EPUB 解析）
- 数据存储: localStorage / IndexedDB

## 使用方式

直接用浏览器打开对应的 `index.html` 文件即可。

---

*最后更新: 2026-06-14*
