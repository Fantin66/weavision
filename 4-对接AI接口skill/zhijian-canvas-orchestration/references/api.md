# 织见 AI 接口

页面加载后提供 `window.ZhijianAI`：

```js
window.ZhijianAI.snapshot()
window.ZhijianAI.execute({ op: "snapshot" })
window.ZhijianAI.buildCanvas(plan)
```

接口版本：`window.ZhijianAI.version` 返回 `"1.3"`。接口只在页面自身 JavaScript 上下文中可用。它不读取本地路径或附件二进制；外部 AI 应先在获授权的环境读取用户提供的材料，再把结构化结果交给接口。

**持久化前提（重要）**：
- 本接口操作的内存数据由应用自动持久化（localStorage 存结构、IndexedDB 存附件 blob）。外部 AI 若在无头浏览器/独立上下文中调用，**需自行负责应用加载后的数据持久化**（页面关闭即丢失，除非该环境共享同一 localStorage/IndexedDB）。
- `create_attachment` 仅登记附件元数据（来源名/摘要/定位），**不接收文件字节**；要有真实可预览的文件内容，须先经应用的文件导入流程（或扩展接口支持字节）。

**操作边界（重要）**：
- AI 只能通过 `window.ZhijianAI.execute()` 操作画布。不得直接修改 DOM、localStorage、IndexedDB 或应用源代码。
- 删除类操作（`delete_item`、`delete_relation`、`delete_project`、`delete_canvas`、`replace: true`）需用户明确指示。
- 不得发明不存在的命令或参数。

每条命令返回 `{ ok: true, value }` 或 `{ ok: false, error }`。

当前共有 37 条唯一操作命令。

## 基础命令

- `snapshot`：读取项目、画布、元素、关系、附件元数据和偏好（`preferences` 含 `dark / fontPreset / bgPattern / bgColorName / layoutType / stylePreset / immersive`）。
- `activate`：`{ projectId, canvasId }` 切换工作画布。
- `create_project`：`{ name }`。
- `rename_project`；`delete_project`（必须附 `confirm: true`）。
- `create_canvas`：`{ projectId?, name }`。
- `rename_canvas`；`delete_canvas`（删除必须附 `confirm: true`）。
- `create_node`：`{ projectId?, canvasId?, title, parentId?, detail?, color?, x?, y? }`。
- `create_note`：`{ projectId?, canvasId?, markdown, detail?, color?, x?, y? }`。
- `create_attachment`：`{ source: { fileId? | name, summary?, locator?, excerpt? }, attachTo?, x?, y? }`。
- `create_stroke`：`{ points: [{x, y}, ...], color?, size? }`；`create_connector`：`{ a, b, color?, width? }`。
- `update_item`：`{ itemId, patch }`；允许更新文字、颜色、解释、批注、位置、尺寸、折叠状态、便签文字格式、`previewOpen`（附件卡片形变开关）、`jumpTo`（跃迁目标）。
- `duplicate_item`、`reparent_node`：复制元素或调整节点父子关系；后者会拒绝循环引用。
- `delete_item`、`delete_relation`：仅在用户明确要求删除时使用。
- `relate`、`update_relation`：创建或更新语义关系；`update_relation` 还可设置 `level`（`normal`/`emphasis`/`highlight`，线权重）和 `shape`（`auto`/`curve`/`polyline`/`straight`，线型覆盖）。关系类型见内容编排规则。
- `attach`、`detach`：显式关联或取消关联便签/材料与导图节点。
- `set_layout`：`{ layout: "right" | "left" | "org" | "u" | "fishbone" | "timeline" | "brace" }`（兼容旧值 `radial`/`both`，会落到 `right`）。
- `set_style`：`{ style: "clear" | "glass" | "neumorph" | "minimal" | "colorful" | "bento" | "editorial", fontPreset? }`。`fluent` 仅作为旧值别名，实际映射为 `glass`；`paper` 已移除。`neumorph`/`minimal`/`editorial` 会自动切换对应字体，其余样式保留当前字体。返回 `{ stylePreset, fontPreset }`。
- `focus`、`exit_focus`、`undo`、`redo`。
- `set_preferences`：亮暗主题、字体、背景纹理/颜色、`stylePreset`。
- `batch`：`{ commands: [...] }`；最多 60 条，任一命令失败会还原整个批次，不能嵌套 batch。

## 形变与展开控制（v1.3 新增）

织见的两大核心交互——**形变**（附件卡片就地展开预览）和**展开**（导图节点就地展开详情）——现在可通过 AI 直接控制。同时新增线权重和线型的独立设置命令。

- `toggle_morph`：`{ itemId }`；切换附件卡片的形变展开/收起。仅适用于 `fileCard` 类型元素。返回 `{ itemId, previewOpen }`。
- `set_morph`：`{ itemId, open }`（或 `previewOpen`）；显式设置附件卡片的形变状态为目标值，已是目标值则不操作。返回 `{ itemId, previewOpen }`。
- `toggle_detail`：`{ itemId }`；切换导图节点的详情展开/收起。仅适用于 `mindNode` 类型元素。返回 `{ itemId, expanded }`。
- `set_detail`：`{ itemId, expand }`；显式设置导图节点的展开状态为目标值。会自动收起其他已展开节点（单实例展开）。返回 `{ itemId, expanded }`。
- `set_link_level`：`{ linkId, level }`；设置关系线的权重等级。`level` 取值 `normal` / `emphasis` / `highlight`。返回 `{ linkId, level }`。
- `set_link_shape`：`{ linkId, shape }`；设置关系线的线型。`shape` 取值 `auto` / `curve` / `polyline` / `straight`。返回 `{ linkId, shape }`。

`build_canvas` 计划中也支持这些属性：附件 spec 可含 `previewOpen: true`；关系 spec 可含 `level` 和 `shape`；节点 spec 可含 `collapsed: true` 和 `jumpTo`；便签/附件 spec 可含 `jumpTo`。

## build_canvas

```js
window.ZhijianAI.buildCanvas({
  title: "商业航天产业链",
  projectId: "p1",                 // 可选
  canvasId: "c1",                  // 可选；缺省时新建画布
  replace: false,                   // true 会替换目标画布
  confirmReplace: false,            // replace=true 时必须为 true
  layout: "right",                 // right | left | org | u | fishbone | timeline | brace
  nodes: [
    { key: "root", title: "商业航天", explanation: "..." },
    { key: "sat", parentKey: "root", title: "卫星", explanation: "..." }
  ],
  notes: [
    { key: "risk", markdown: "## 待确认\n- 发射窗口", attachTo: "sat" }
  ],
  attachments: [
    { key: "report", name: "行业报告.pdf", summary: "发射市场数据", locator: "用户提供的报告", attachTo: "sat", previewOpen: true }
  ],
  relations: [
    { from: "report", to: "sat", type: "evidence", annotation: "市场数据", level: "emphasis", shape: "auto" }
  ]
})
```

`key` 是本次计划内部引用；返回值中的 `aliases` 给出它对应的实际元素 ID。节点必须在父节点之前出现，且不能形成循环。`order` 可指定同级呈现顺序；未指定时保留计划中的书写顺序。若计划包含多个根节点，应用会按 `rootTitle` 或 `title` 自动补一个主题根，确保布局稳定。每次计划最多 240 个节点、120 条便签、120 个附件和 480 条关系；超过时请拆分画布。

## 推荐调用顺序

1. `snapshot`：查看可复用的项目、画布和已导入附件。
2. 读取用户授权的源文件，形成计划；先把不确定内容标为便签或解释，不要臆造层级。
3. 用户同意新建或替换策略后，调用 `build_canvas`。
4. 读取返回的 `aliases`，按需补充 `relate`、`update_item`、`set_link_level`、`set_link_shape`、`toggle_morph`、`set_detail` 或 `set_style` 微调视觉与交互状态。

## 布局指南

| 布局 | 适用场景 | 线条形状 |
|---|---|---|
| `right` | 解释/流程/因果（默认） | S形曲线 |
| `left` | 逆向推导 | S形曲线 |
| `org` | 组织架构/层级 | 折线（圆角正交） |
| `u` | 平衡结构 | S形曲线 |
| `fishbone` | 因果分析（鱼骨图） | 斜向骨刺折线 |
| `timeline` | 时间轴/历史沿革 | 水平主干+垂直支线 |
| `brace` | 总分结构 | 括号弧线 |

## 可用关系类型

| 类型 | 说明 | 方向性 |
|---|---|---|
| `related` | 关联 | 无向 |
| `supports` | 支撑 | 有向 |
| `causes` | 导致 | 有向 |
| `contradicts` | 反证 | 有向 |
| `evidence` | 证据 | 有向 |
