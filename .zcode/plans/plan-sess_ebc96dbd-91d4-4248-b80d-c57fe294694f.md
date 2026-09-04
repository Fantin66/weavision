## D5: 左栏功能增强 — 右键菜单 + 轻量加号菜单

### 基准
从 `d4/` 复制到 `d5/`，创建 `织见-思维关系板-D5.html`。

### 一、通用浮窗菜单系统

新建 `showFloatMenu(anchorEl, items)` 函数（app.js）：
- **定位**：基于 `anchorEl`（被点击的元素）的位置适配，不是鼠标位置
  - 取 `anchorEl.getBoundingClientRect()`
  - 菜单出现在元素右侧，垂直对齐元素顶部
  - 如果右侧空间不足，翻转到左侧
  - 如果底部超出视口，向上偏移
- **样式**：毛玻璃背景 + 圆角 + 弹出动画，与应用整体设计语言一致（不模仿 Windows）
- `items` 是数组：`[{icon, label, onClick, danger?}]`
- 外部点击关闭
- HTML 新增 `<div id="floatMenu">`（全局定位，`position:fixed`）

### 二、左栏右键菜单

给三类元素加 `contextmenu` 事件，菜单定位到**被右键的元素**旁边：

**项目（.proj-item）右键**：
- 重命名 → `showPrompt` → `renameProject(id, name)`（新增）
- 删除 → `showModal` 确认 → `deleteProject(id)`

**画布（.canvas-item）右键**：
- 重命名 → `showPrompt` → `renameCanvas(id, name)`（已有）
- 删除 → `showModal` 确认 → `deleteCanvas(id)`（已有）

**文件（.fitem）右键**（替换现有 `showMoveFile`）：
- 打开/预览
- 重命名 → `showPrompt` → `renameFile(id, name)`（新增）
- 移动到… → `showMoveFile(f)`（已有）
- 删除 → `removeFile(id)`（已有）

**文件夹（.fgroup-head）右键**（改用 `showFloatMenu`）：
- 新建子文件夹 / 重命名 / 删除

### 三、轻量加号菜单

三个加号按钮改为 `showFloatMenu`，定位到**按钮元素**旁边：

**项目加号（#newProjectBtn）**：新建空白项目 / 导入项目包
**画布加号（#newCanvasBtn）**：新建空白画布
**资源库加号（#libImportBtn）**：本地文件 / 整个文件夹 / 网页链接

### 四、新增函数

**state.js**：`renameProject(id, name)`、`renameFile(id, name)`
**app.js**：`showFloatMenu(anchorEl, items)`

### 五、文件改动

| 文件 | 改动 |
|------|------|
| `d5/js/app.js` | 新增 `showFloatMenu`；改三个加号按钮 |
| `d5/js/interaction.js` | `renderSidePanel`/`renderFileItem`/`renderFolderItem` 加右键 |
| `d5/js/state.js` | 新增 `renameProject`、`renameFile` |
| `d5/styles.css` | 新增 `#floatMenu` 样式 |
| `织见-思维关系板-D5.html` | 新增 `<div id="floatMenu">`；版本 D5 |