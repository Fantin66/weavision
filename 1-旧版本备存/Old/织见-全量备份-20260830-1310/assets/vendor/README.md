# 打包资源目录说明（assets/vendor）

本项目为单文件 + 外置资源结构。打包为桌面应用（Electron / Tauri / NW.js 等）时，
请保持以下目录结构，**所有引用均为相对路径**，打包后路径依然有效：

```
你的应用目录/
├── 织见-思维关系板.html      ← 主入口（应用窗口加载此文件）
├── 织见-品牌图标-v2.png      ← 顶部 Logo 图片
├── assets/
│   └── vendor/               ← 可选：离线预览组件（文档/PDF/表格）
│       ├── jszip.min.js          （docx-preview 依赖）
│       ├── docx-preview.min.js   （Word 预览）
│       ├── xlsx.full.min.js      （Excel 表格预览）
│       └── pdf.min.js            （PDF 预览，含 pdf.worker.min.js 可选）
```

## 获取 vendor 文件（可选但推荐）

打包为桌面应用后若需**离线**渲染 Word/Excel/PDF，请将以下文件下载到
`assets/vendor/` 下（与 `index.html` 相对路径匹配）：

- jszip:      https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
- docx-preview: https://cdn.jsdelivr.net/npm/docx-preview@0.3.3/dist/docx-preview.min.js
- xlsx:       https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
- pdf:        https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js
- pdf.worker: https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js

> 若未放置本地文件，应用会自动回退到 CDN 在线加载（需联网）；
> 若联网也失败，预览区会显示明确的错误提示 + 「下载文件」降级入口，不会白屏。

## 打包配置建议

### Electron
```json
// electron-builder 配置示例
{
  "files": ["**/*.html", "**/*.png", "assets/**/*"],
  "extraResources": [
    { "from": "assets", "to": "assets" }
  ]
}
```
主窗口加载 `织见-思维关系板.html`，`webPreferences` 建议关闭 `nodeIntegration`、
开启 `contextIsolation`；若需回退 CDN，允许该窗口访问网络即可。

### Tauri
将 `assets/`、`*.png`、`*.html` 全部放入 tauri.conf.json 的 `dist` 目录（前端产物），
保持相对路径即可。

## 避免同类问题（空白预览）的注意事项

1. **所有资源必须用相对路径**（`./xxx.png`、`assets/vendor/xxx.js`），
   不要用 `file:///` 绝对路径或 `C:\...` 硬编码。
2. 文件预览的 blob 数据存于 IndexedDB，打包后仍可用（不依赖磁盘目录）；
   但若清空了应用数据目录，已导入文件会丢失，属预期行为。
3. 预览异步渲染时（文档/PDF 走 CDN 或本地 vendor 脚本），添加了令牌（token）防竞态：
   快速切换/收起再展开不会再出现"卡在加载中"的空白。
4. 文本/图片预览走 canvas 直接渲染，不依赖外部脚本，离线可用。