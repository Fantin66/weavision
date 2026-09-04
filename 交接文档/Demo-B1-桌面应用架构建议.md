# 织见 Demo B1：桌面应用架构建议

## 结论

首选 **Electron + TypeScript + 保留现有 Canvas/DOM 渲染核心**。

这不是体积最小的方案，但它最符合织见当前的优先级：完整保留 Chromium 浏览器行为，并稳定接入本地文件系统、拖拽和剪贴板、默认应用打开、附件预览与独立网页渲染。现阶段不建议为了“框架化”重写画布核心，也不建议把 Tauri 作为第一版封装底座。

## 为什么选 Electron

1. **渲染环境固定**：Electron 随应用携带 Chromium，用户电脑上的浏览器版本不会改变画布、CSS、文档解析和交互表现。
2. **迁移风险最低**：当前单页应用可以先原样作为 Renderer 运行，Canvas、IndexedDB、Blob、File、拖拽、粘贴和浏览器解析逻辑都可继续使用。
3. **系统能力完整**：主进程可安全处理文件夹导入、文件移动、默认应用打开、最近项目、自动保存和窗口管理。
4. **网页预览更可控**：远程网页附件使用独立、沙箱化的 `WebContentsView`，避免普通 iframe 常见的 `X-Frame-Options`、CSP、403 和页面权限问题。
5. **跨平台一致性更好**：Windows、macOS、Linux 都使用随 Electron 发布的 Chromium；这对织见这种高度依赖画布和浏览器解析的应用比安装包体积更重要。

## 为什么 Tauri 暂不作为首选

Tauri 在 Windows 上使用 WebView2，安装包和内存更小，作为仅面向 Windows 的轻量版很有吸引力。但它在 macOS 和 Linux 使用 WebKit 系列 WebView，跨平台时会出现不同的排版、文件 API、拖拽、媒体和网页兼容边界。织见目前正在大量复用浏览器行为，优先固定 Chromium 更稳妥。

如果未来确认只支持 Windows，且经过完整回归测试后仍希望显著缩小体积，可以再做一条 Tauri 试验分支，不应直接替换 Electron 主线。

## 推荐进程分层

```text
Electron 主进程
├─ 窗口与生命周期
├─ 文件/文件夹选择、移动、复制、保存
├─ 调用默认应用打开文件
├─ 自定义 app:// 协议与本地资源访问
├─ 独立网页预览 WebContentsView 管理
└─ 自动更新、日志、崩溃恢复

Preload 安全桥
├─ files.chooseFiles / chooseFolder
├─ files.openDefault / reveal / move
├─ project.load / save / autosave
└─ preview.openWeb / closeWeb / setBounds

Renderer（现有织见界面）
├─ Canvas 图形、布局、选择、连线、批注
├─ 顶栏、侧栏、Dock、编辑器、资源库 UI
├─ 浏览器内附件解析与 Markdown 预览
└─ 通过窄接口调用系统能力，不直接访问 Node.js
```

## 安全边界

- Renderer 保持 `nodeIntegration: false`。
- 开启 `contextIsolation` 和 Renderer sandbox。
- Preload 只暴露按业务命名的窄接口，不能把整个 IPC 对象交给页面。
- 本地界面使用自定义 `app://` 协议，不继续依赖 `file://`。
- 远程网页预览单独隔离，禁用 Node.js，限制新窗口、导航和权限请求。
- `默认应用打开`、文件移动和删除都由主进程校验绝对路径后执行。

## 工程组织建议

```text
apps/desktop/
├─ src/main/          # Electron 主进程
├─ src/preload/       # 安全桥
├─ src/renderer/
│  ├─ canvas/         # 当前画布核心，先迁移不重写
│  ├─ features/       # 批注、聚焦、布局、预览、资源库
│  ├─ ui/             # 顶栏、侧栏、Dock、弹层
│  ├─ styles/         # Demo B1 设计令牌和主题
│  └─ app.html
├─ tests/
└─ forge.config.*
```

打包优先采用 Electron Forge。Renderer 可以使用 TypeScript 和模块化构建，但第一阶段不需要引入 React；先把当前单文件按功能拆成模块并保持行为不变。后续若侧栏和弹窗状态复杂度继续增长，可以只在 UI 外壳引入组件框架，Canvas 核心仍保持原生渲染。

## 数据与附件存储

第一阶段沿用当前浏览器数据并加迁移器，避免用户存档丢失；桌面版稳定后，建议改为：

- 项目结构、画布状态和资源索引：项目目录中的版本化 JSON。
- 大型附件：保留原路径或复制进项目的 `assets/`，由用户在导入时选择策略。
- 缩略图和临时解析结果：应用缓存目录，可安全重建。
- 搜索索引和历史记录：数据量增大后再引入 SQLite，不作为第一阶段前置条件。

## 分阶段迁移

### 阶段 1：兼容封装

- 把当前 Demo B1 原样装入 Electron Renderer。
- 增加文件选择、默认应用打开、路径保留和项目保存桥接。
- 不改变 Canvas 数据结构和附件解析方式。

### 阶段 2：解除浏览器限制

- 网页附件改为 `WebContentsView`。
- 文件夹导入直接使用真实目录树，不再依赖 `webkitdirectory` 返回值。
- 为拖拽、剪贴板和默认应用打开补桌面端回归测试。

### 阶段 3：模块化和可靠存储

- 将单文件拆分为 Canvas、资源库、预览、编辑器、布局和主题模块。
- 加入项目格式版本号、自动保存、崩溃恢复与旧存档迁移。
- 最后再评估是否需要组件框架或 Tauri 轻量版。

## Demo B1 视觉更新原则

- **设计令牌**：颜色、圆角、阴影、间距和动效由统一变量控制，亮/暗主题同构。
- **画布优先**：画布保持安静；顶栏、侧栏、Dock 和预览浮层通过边界和阴影形成层级。
- **状态明确**：激活、悬停、聚焦和键盘焦点不再只依赖很淡的背景色。
- **减少装饰噪声**：不增加新的功能入口，避免用大面积渐变和高强度玻璃效果遮蔽内容。
- **动效克制**：短促、可解释，并遵守系统的“减少动态效果”设置。

## 参考资料

- Electron 安全建议：https://www.electronjs.org/docs/latest/tutorial/security
- Electron Context Isolation：https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron `shell.openPath`：https://www.electronjs.org/docs/latest/api/shell
- Tauri WebView 版本说明：https://tauri.app/reference/webview-versions/
- Electron Forge：https://www.electronforge.io/

