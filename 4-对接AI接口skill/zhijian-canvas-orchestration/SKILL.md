---
name: zhijian-canvas-orchestration
description: "Turn one or more user-provided files into a structured 织见思维关系板 canvas, or operate the canvas through its local AI command interface. Use for source-to-whiteboard synthesis, hierarchy extraction, and 织见 canvas automation."
---

# 织见 Canvas Orchestration

Use this skill when the user wants to turn files, notes, or research into a 织见画布, or asks an AI to read or operate an existing 织见思维关系板.

## 使用宗旨

织见是一个**本地优先**的思维关系板应用。AI 的角色是**画布操作者**——通过 `window.ZhijianAI` 接口创建、编辑、组织画布内容。AI 应像一个有经验的助手：理解用户的研究意图，把信息结构化地呈现在画布上，而不是机械地堆砌。

**好的使用方式**：
- 先 `snapshot` 看懂当前画布结构，再决定操作
- 用 `build_canvas` 一次性构建有层级的结构，而非逐条 `create_node`
- 不确定的信息放进便签或解释，不要臆造父子关系
- 附件只登记元数据（来源/摘要），不碰文件字节
- 操作后返回结构摘要，标出需要用户确认的不确定性

**不好的使用方式**：
- 把所有信息都堆成节点，没有层级和语义关系
- 在没有明确用户意图时删除或替换内容
- 混用多种布局（一个画布用一种布局即可）

## 操作边界（严格）

AI 通过织见接口操作画布时，**必须遵守以下边界**：

1. **只使用 `window.ZhijianAI` 接口**。不得直接操作 DOM、修改 localStorage、读写 IndexedDB、或通过其他方式篡改应用状态。
2. **不得修改应用源代码**（HTML/CSS/JS 文件）。AI 是操作者，不是开发者——不要尝试"修复"或"优化"应用的代码。
3. **不得自行持久化数据**。应用的自动保存机制负责持久化；AI 只管操作内存中的画布数据。
4. **删除操作需用户明确指示**。`delete_item`、`delete_relation`、`delete_project`、`delete_canvas` 以及 `replace: true` 的 `build_canvas` 只在用户明确要求时使用。
5. **不臆造内容**。没有在用户提供的材料中找到的信息，不要编造。不确定的内容标为便签或解释，注明"待确认"。
6. **不触碰文件二进制**。`create_attachment` 只登记元数据；要导入真实文件，走应用的文件导入流程。
7. **操作范围限于画布内容**。不得操作浏览器设置、修改页面 URL、注入外部脚本、或访问非织见页面的资源。

## Source-to-canvas workflow

1. 识别画布的核心问题：用户看完画布后应该能理解或决定什么？
2. 从用户提供的材料中提取层级结构。只有当子项是父项的**组成部分、子类型、阶段、机制或必要分解**时，才建立父子关系。
3. 把证据、权衡、例子、假设、开放性问题放到对应的支持面（便签/解释/附件），而非强行塞进层级。
4. 构建 `build_canvas` 计划。使用 [references/api.md](references/api.md) 中描述的本地 API。
5. 选择合适的布局：`right`（解释/流程）、`left`（逆向树）、`org`（组织架构）、`u`（平衡结构）、`fishbone`（因果分析）、`timeline`（时间轴）、`brace`（总分结构）。可选设置视觉样式 `set_style`。
6. **完成后验证无重叠。** `build_canvas` 跳过拖拽自动避让路径，生成的元素可能重叠。完成后确认布局无重叠，必要时重新规划坐标。
7. 返回结构摘要，标出需要用户确认的不确定性。

## 可用视觉样式（7 种）

| 样式 | 说明 |
|---|---|
| `clear` | 默认——清晰层级，统一卡片语言 |
| `glass` | 磨砂玻璃与冷光连线 |
| `neumorph` | 新拟态——连续表面，双向柔影 |
| `minimal` | 简约——极简边框，字号/颜色分层 |
| `colorful` | 多彩拟态——彩色表面与柔和阴影 |
| `bento` | 多彩圆角——超圆角卡片与悬浮微交互 |
| `editorial` | 多彩矩形——小圆角与杂志排版 |

`fluent` 是 `glass` 的旧别名（兼容旧存档）。`paper` 已移除。

## 内容编排规则

阅读 [references/mapping.md](references/mapping.md) 后再创建计划。它定义了什么内容应该放在节点、解释、便签、附件和语义关系中。

## 操作现有画布

当织见页面已打开时，在页面的 JavaScript 上下文中调用 `window.ZhijianAI.execute(command)`。先用 `{"op":"snapshot"}` 获取项目、画布、元素和附件 ID。用 `build_canvas` 批量生成，用单条命令做小规模精细编辑。

阅读 [references/api.md](references/api.md) 了解支持的命令和计划结构。不要发明不存在的命令，不要直接操作 `localStorage`。

## 形变与展开控制

织见的两大差异化交互现在完全开放给 AI：

- **形变**：附件卡片（fileCard）可就地展开为预览面板。用 `toggle_morph` / `set_morph` 控制，或在 `build_canvas` 的附件 spec 中设置 `previewOpen: true`。
- **展开**：导图节点（mindNode）可就地展开为详情阅读区。用 `toggle_detail` / `set_detail` 控制。展开是单实例——展开新节点会自动收起前一个。
- **线权重**：`normal`（普通）/ `emphasis`（加粗）/ `highlight`（高亮）。用 `set_link_level` 控制，或在 `build_canvas` 的关系 spec 中设置 `level`。
- **线型**：`auto`（跟随布局）/ `curve`（曲线）/ `polyline`（折线）/ `straight`（直线）。用 `set_link_shape` 控制，或在 `build_canvas` 的关系 spec 中设置 `shape`。
- **跃迁**：任何元素可设置 `jumpTo`（跳转到指定画布），通过 `update_item` 的 `patch.jumpTo` 设置，或在 `build_canvas` 的 spec 中设置。

这些控制让 AI 能构建出丰富的展示状态：展开关键证据的附件预览、展开核心节点的详情、用高亮线标注关键论证路径——用户打开画布即可直接看到完整的分析叙事，无需手动逐个展开。
