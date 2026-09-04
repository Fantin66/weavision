"use strict";
/* ============================================================
   织见学堂 · Demo G3 教学项目（完整重写）
   6 张画布：从理念到实战的完整学习路径
   内容基于设计理念文档 + 竞品分析 + 品牌宣言
============================================================ */
const TUTORIAL_VERSION=15;
function storeBuiltinTutorBlob(id,blob){
  if(!idb)return;
  try{const tx=idb.transaction("files","readwrite");tx.objectStore("files").put(blob,id);}catch(_){}
}
function ensureTutorV6(){
  const existing=state.projects.find(p=>p.name==="织见学堂");
  if(existing&&existing.tutorialVersion===TUTORIAL_VERSION)return false;
  return ensureTutorProject();
}
function ensureTutorProject(){
  const previousProject=state.activeProjectId,previousCanvas=state.activeCanvasId;
  const countBefore=state.projects.length;
  state.projects=state.projects.filter(p=>p.name!=="回归测试");
  const removedRegression=countBefore!==state.projects.length;
  const existing=state.projects.find(p=>p.name==="织见学堂");
  if(existing&&existing.tutorialVersion===TUTORIAL_VERSION&&(existing.canvases||[]).length===6){
    if(!state.projects.some(p=>p.id===previousProject)){state.activeProjectId=existing.id;state.activeCanvasId=existing.canvases[0].id;state.selected=null;}
    return removedRegression;
  }
  const project=existing||{id:"p"+(uid++),name:"织见学堂",files:[],folders:[],canvases:[]};
  if(!existing)state.projects.push(project);
  project.files=[];project.folders=[];project.canvases=[];project.tutorialVersion=TUTORIAL_VERSION;project.isBuiltin=true;
  const makeCanvas=(name,layout)=>({id:"c"+(uid++),name,items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[],layoutVersion:TUTORIAL_VERSION,tutorialLayout:layout||"right"});
  const makeNode=(canvas,text,x,y,color,parent=null,detail="",annotation="")=>{
    const item={id:uid++,type:"mindNode",text,parentId:parent?parent.id:null,children:[],x,y,w:156,h:44,color,collapsed:false,attachIds:[],detail,annotation,birth:performance.now()};
    if(parent)parent.children.push(item.id);canvas.items.push(item);return item;
  };
  const makeNote=(canvas,text,x,y,color,w=280,h=130,annotation="")=>{
    const item={id:uid++,type:"note",x,y,w,h,text,color,fontFamily:state.fontPreset,fontSize:13,underline:false,bold:false,annotation,birth:performance.now()};
    canvas.items.push(item);return item;
  };
  const relate=(canvas,a,b,type,annotation)=>canvas.links.push({id:"lnk"+(uid++),aId:a.id,bId:b.id,relationType:type,directional:type!=="related",annotation});
  const makeBuiltinFile=(name,kind,mime,content="",url="")=>{
    const id="tutor-file-"+(uid++);const blob=content?new Blob([content],{type:mime}):null;
    const file={id,name,kind,mime,size:blob?blob.size:0,created:Date.now(),folderId:null,url:url||null};
    project.files.push(file);if(blob)storeBuiltinTutorBlob(id,blob);return file;
  };
  const makeFileCard=(canvas,file,x,y,w=200,h=58,annotation="")=>{
    const item={id:uid++,type:"fileCard",x,y,w,h,fileId:file.id,kind:file.kind,thumb:null,tw:1,th:1,annotation,birth:performance.now()};
    canvas.items.push(item);return item;
  };

  /* ─── 附件文件 ─── */
  const conceptSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#eff6ff"/><stop offset="1" stop-color="#ecfdf5"/></linearGradient></defs><rect width="720" height="420" rx="32" fill="url(#g)"/><g fill="none" stroke="#8ba9e8" stroke-width="8" stroke-linecap="round"><path d="M170 210C250 100 330 105 360 210S490 320 570 210"/><path d="M170 210C250 320 330 315 360 210S490 100 570 210"/></g><circle cx="170" cy="210" r="34" fill="#2d5fd3"/><circle cx="360" cy="210" r="48" fill="#5e75d9"/><circle cx="570" cy="210" r="34" fill="#319b77"/><g fill="white" font-family="Arial, sans-serif" text-anchor="middle"><text x="170" y="218" font-size="22">织</text><text x="360" y="220" font-size="30">连接</text><text x="570" y="218" font-size="22">见</text></g><text x="360" y="354" fill="#45536f" font-size="28" font-family="Arial, sans-serif" text-anchor="middle">把线索编在一起，把重要处看清</text></svg>`;
  const conceptFile=makeBuiltinFile("织见-连接与聚焦.svg","img","image/svg+xml",conceptSvg);
  const quickstartFile=makeBuiltinFile("织见-一分钟上手.md","text","text/markdown;charset=utf-8",`# 织见一分钟上手\n\n1. 空白处双击 → 建节点\n2. Tab → 加子节点；Enter → 加同级\n3. 选中两个元素按 C → 连接并标语义\n4. 按 F 聚焦只看直接关系\n5. 按 E 展开完整内容\n6. 按 A 添加批注\n\n> 先织成一张网，再在需要的地方"见"。\n\n织连万象，见聚一隅。`);
  const relationFile=makeBuiltinFile("五种语义关系.md","text","text/markdown;charset=utf-8",`# 织见的五种语义关系\n\n| 关系 | 方向 | 用途 |\n|---|---|---|\n| 关联 | 无向 | 两者有关，暂不确定方向 |\n| 支撑 | 有向 | A 支持 B 的判断 |\n| 导致 | 有向 | A 促使 B 发生 |\n| 反证 | 有向 | A 与 B 矛盾，需要解决 |\n| 证据 | 有向 | A 是 B 的来源或依据 |\n\n> 线不是装饰，要有语义。给每条线一个名字，让网络变成可追溯的判断。`);
  const brandFile=makeBuiltinFile("织见-品牌宣言.md","text","text/markdown;charset=utf-8",`# 织见品牌宣言\n\n这里没有制式的层级，只有元素与线。\n\n元素是任何可以放上画布的事物——一行标题、一页文档、一张便签、一个网页。\n线带有方向，方向带来逻辑：父子、支撑、反驳、证据、因果。\n\n它们任意组合：并列，嵌套，成网。\n\n图越大，越需要聚焦——只留下与这一点相连的一切，其余退为背景。\n全貌与单点，俯视与沉浸，由同一次聚焦切换。\n\n**织连万象，见聚一隅。**`);
  const industryFile=makeBuiltinFile("商业航天-公开研究口径.md","text","text/markdown;charset=utf-8",`# 商业航天公开研究口径\n\n仅使用公开来源：\n\n- 政府公开政策与统计\n- 企业公告和公开访谈\n- 已公开的行业研究报告\n\n不纳入：会议纪要、上会材料、交易条款、项目专属资料。`);
  const ddFile=makeBuiltinFile("DD尽调-关系板模板.md","text","text/markdown;charset=utf-8",`# DD 尽调关系板\n\n织见的核心使用场景：把尽调材料组织成一张可追溯的关系网。\n\n## 节点 = 判断\n- 核心判断：行业增长驱动力\n- 支撑判断：财务指标改善\n- 风险判断：客户集中度过高\n\n## 线 = 判断之间的关系\n- 财务改善 → 支撑 → 增长驱动\n- 客户集中 → 反证 → 商业可持续\n- 行业报告 → 证据 → 增长驱动\n\n## 便签 = 不确定的内容\n- "大客户续约率未公开，待验证"\n- "技术路线切换的窗口期不确定"\n\n## 附件 = 来源\n- 行业研究报告\n- 企业公告\n- 公开访谈记录`);

  /* ═══════════════════════════════════════════════════════════
     画布一：为什么是织见？—— 不再是一棵树
  ═══════════════════════════════════════════════════════════ */
  const c1=makeCanvas("01-为什么是织见","radial");project.canvases.push(c1);
  const c1Root=makeNode(c1,"织见：不是一棵树，是一张会生长的网",-10,-10,"#2d5fd3",null,
    "# 织见\n\n普通思维导图是制式的树——一个总节点，向下逐层扩散成子节点；节点只能当标题，关系只能是父子，结构在动手前就被定死了，是死的图。\n\n**织见的世界里只有两样东西：元素和线。**\n\n元素与线可以随意排列组合。线带方向，就能创造无限的组合、无限的复杂多层归属关系。",
    "双击编辑文字，E 展开完整内容，A 看批注。");
  const c1Elements=makeNode(c1,"元素：任何可以放上画布的事物",-420,-180,"#319b77",c1Root,
    "## 元素\n\n不是只有标题。织见的元素有三种：\n\n- **节点**：一行判断。「卫星制造是重资产赛道」\n- **便签**：一段 Markdown 说明。可以写表格、列表、链接\n- **附件**：文件、网页、表格。以卡片形态存在，需要时形变展开\n\n标题只是入口，内容才是本体。",
    "元素内容密度远大于普通导图的纯标题。");
  const c1Lines=makeNode(c1,"线：带方向，方向带来逻辑",-420,170,"#319b77",c1Root,
    "## 线不是装饰\n\n每条线有五种语义之一：\n\n- **关联**：有关，暂不确定方向\n- **支撑**：A 支持 B 的判断\n- **导致**：A 促使 B 发生\n- **反证**：A 与 B 矛盾\n- **证据**：A 是 B 的来源\n\n方向带来逻辑。线可以跨层级、跨分支、跨画布。",
    "选中两个元素按 C 创建连接。");
  const c1Focus=makeNode(c1,"聚焦：图越大，越需要看清",400,-5,"#6b73cc",c1Root,
    "## 聚焦\n\n思维导图做大了有个真实痛点：东西越来越多，想找一个节点时，它旁边什么都有，人就乱了。\n\n聚焦只留下与这一点直接相关的内容，其余退为背景——**不是把视野变小，是把噪音切掉**。",
    "选中后按 F 聚焦，再按 F 回到全景。");
  const c1NoTree=makeNode(c1,"层级没有消失，但不再是制式",400,140,"#6b73cc",c1Focus,
    "层级只是「线的一种可能含义」，而非唯一结构。\n\n线可以是父子（有层级），也可以是支撑/反证/证据/因果（无层级语义关系）。\n\n**网络不是树。**",
    "织见的关系网可以表达比树复杂得多的结构。");
  const c1Slogan=makeNote(c1,"# 织连万象，见聚一隅\n\n织 ↔ 见（动词对仗）\n连 ↔ 聚（动作对仗）\n万象 ↔ 一隅（广度 ↔ 精微）\n\n**Weave the many, See the one.**\n\n品牌名 Weave & Vision = 织（连接）+ 见（聚焦）",40,-340,"#fef3c7",320,160,"Slogan 和品牌名的含义。");
  const c1Concept=makeFileCard(c1,conceptFile,280,200,230,145,"用一张概念图把织与见的关系先看清。");
  const c1Start=makeFileCard(c1,quickstartFile,-120,380,220,58,"一分钟上手的 Markdown 卡。");
  relate(c1,c1Elements,c1Lines,"related","元素通过连接，才会成为网的一部分");
  relate(c1,c1Lines,c1Focus,"causes","清晰关系帮助聚焦");
  relate(c1,c1Focus,c1NoTree,"supports","聚焦让复杂网络变得可读");
  relate(c1,c1Concept,c1Root,"evidence","概念图：连接与聚焦");
  relate(c1,c1Start,c1Elements,"evidence","快速上手指南");

  /* ═══════════════════════════════════════════════════════════
     画布二：五种语义关系 —— 线说什么
  ═══════════════════════════════════════════════════════════ */
  const c2=makeCanvas("02-五种语义关系","logic");project.canvases.push(c2);
  const c2Root=makeNode(c2,"五种语义关系：让线说话",-10,-250,"#2d5fd3",null,
    "# 线说什么\n\n普通导图的线只是「从属」——A 是 B 的子项。\n\n织见的线有五种语义。每一种都代表一种判断：A 和 B 到底是什么关系？",
    "线是判断，不是装饰。");
  const c2Relate=makeNode(c2,"关联：有关，暂不确定方向",-500,-80,"#319b77",c2Root,
    "## 关联（无向）\n\n「A 和 B 有关系，但现在还不确定是什么关系。」\n\n用在你还在探索、还没下判断的时候。",
    "关联是「待定」标签。");
  const c2Support=makeNode(c2,"支撑：A 支持 B",-500,60,"#319b77",c2Root,
    "## 支撑（有向）\n\n「财务指标改善」 →支撑→ 「增长驱动力」\n\nA 提供理由让你更相信 B。",
    "支撑是论证链条上的环节。");
  const c2Cause=makeNode(c2,"导致：A 促使 B 发生",180,-80,"#d78f36",c2Root,
    "## 导致（有向）\n\n「需求爆发」 →导致→ 「产能扩张」\n\n不只是相关，是因果——A 是 B 发生的原因。",
    "导致比支撑更强：不只是支持，是驱动力。");
  const c2Contradict=makeNode(c2,"反证：A 与 B 矛盾",180,60,"#c04a2a",c2Root,
    "## 反证（有向）\n\n「客户集中度过高」 →反证→ 「商业可持续」\n\nA 和 B 矛盾。不是否定 B，而是标出需要解决的张力。",
    "反证不等于否定——它标出需要验证的张力。");
  const c2Evidence=makeNode(c2,"证据：A 是 B 的来源",180,200,"#7a55c0",c2Root,
    "## 证据（有向）\n\n「行业研究报告」 →证据→ 「市场空间测算」\n\nA 是 B 这个判断的事实依据。",
    "证据是「出处」——让判断可追溯。");
  const c2Example=makeNote(c2,"## 实战示例\n\n「政策推动」 →导致→ 「低轨星座部署」\n「卫星需求」 →支撑→ 「运载市场增长」\n「发射失败率」 →反证→ 「供给可靠性」\n「公开数据」 →证据→ 「市场空间测算」\n\n> 每条线都是一句判断。",-500,220,"#fef3c7",300,140,"用真实语义连接，而非堆砌节点。");
  const c2RelationCard=makeFileCard(c2,relationFile,500,120,220,58,"五种关系的速查表。");
  relate(c2,c2Relate,c2Support,"related","关联可以细化为支撑");
  relate(c2,c2Support,c2Cause,"related","支撑是论证，导致是因果");
  relate(c2,c2Contradict,c2Support,"contradicts","反证与支撑形成张力");
  relate(c2,c2Evidence,c2Support,"evidence","证据支撑判断");
  relate(c2,c2RelationCard,c2Root,"evidence","语义关系速查表");

  /* ═══════════════════════════════════════════════════════════
     画布三：聚焦与展开 —— 看清与看全
  ═══════════════════════════════════════════════════════════ */
  const c3=makeCanvas("03-聚焦与展开","logic");project.canvases.push(c3);
  const c3Root=makeNode(c3,"聚焦：全貌与单点",-10,-220,"#2d5fd3",null,
    "# 全貌与单点\n\n看完总体俯视之后，可以直接沉浸进去看单个文件。\n\n全貌与单点，俯视与沉浸，由同一次聚焦切换。",
    "按 F 聚焦选中元素的直接关系。");
  const c3Whole=makeNode(c3,"看全貌：俯视整张网",-440,-60,"#319b77",c3Root,
    "## 看全貌\n\n默认状态——所有元素和关系都在视野中。\n\n适合：理解整体结构、发现意外连接、规划下一步研究。");
  const c3Focus=makeNode(c3,"聚焦单点：只留直接关系",240,-60,"#6b73cc",c3Root,
    "## 聚焦单点\n\n选中一个元素，按 F——只留下与它直接相关的节点、连线和批注，其余退为背景。\n\n**不是把视野变小，是把噪音切掉。**",
    "再按 F 回到全貌。");
  const c3Expand=makeNode(c3,"展开 E：让内容完整出现",240,80,"#6b73cc",c3Focus,
    "## 展开\n\n节点上按 E——文字多时，展开区域完整呈现内容，不裁断中间。\n\n节点和附件都支持形变展开。附件先以卡片存在，阅读时才展开为阅读区。",
    "E 键展开/收起。");
  const c3Annotate=makeNode(c3,"批注 A：留下一句为什么",-440,80,"#319b77",c3Root,
    "## 批注\n\n每个元素、每条线都可以被批注。\n\n批注让未来的自己知道：为什么做出这个连接？为什么把这个判断放在这里？",
    "A 键添加批注。");
  const c3Immersive=makeNode(c3,"沉浸 F11：无干扰浏览",240,220,"#7890e5",c3Focus,
    "## 沉浸\n\n隐藏顶栏和侧栏，画布占满窗口。\n\n适合：长时间阅读、展示汇报、专注梳理。",
    "F11 切换沉浸。");
  const c3Jump=makeNode(c3,"跃迁 J：跨画布继续",-440,220,"#319b77",c3Root,
    "## 跃迁\n\n一条线索在当前画布讲不完？按 J 跃迁到另一张画布继续。\n\n跃迁让知识不困在一张画布里。",
    "J 键跃迁。");
  makeNote(c3,"## 聚焦的使用场景\n\n1. 画布只有 10 个元素 → 不需要聚焦\n2. 画布有 50+ 元素 → 聚焦帮你快速定位\n3. 画布有 100+ 元素 → 聚焦是必需品\n\n> 图越大，聚焦越重要。",240,-220,"#dbeafe",300,130,"聚焦解决「东西多找人乱」的痛点。");
  relate(c3,c3Whole,c3Focus,"causes","全貌太复杂时需要聚焦");
  relate(c3,c3Focus,c3Expand,"supports","聚焦后展开看详情");
  relate(c3,c3Focus,c3Annotate,"related","聚焦保留相关批注");
  relate(c3,c3Expand,c3Immersive,"causes","展开后可沉浸阅读");
  relate(c3,c3Whole,c3Jump,"related","全貌中发现可跨画布的线索");

  /* ═══════════════════════════════════════════════════════════
     画布四：操作方法 —— 键盘速查
  ═══════════════════════════════════════════════════════════ */
  const c4=makeCanvas("04-操作方法","columns");project.canvases.push(c4);
  const c4Root=makeNode(c4,"织见操作方法",-25,-330,"#2d5fd3",null,
    "# 三层操作\n\n下 Dock 把操作分成三层。先判断你在哪一层：组织空间、处理关系、还是写理由？",
    "画布级 → 元素级 → 编辑级。");
  const c4Canvas=makeNode(c4,"画布级：组织整个视野",-520,-150,"#2d5fd3",c4Root,
    "## 画布级\n\n- 平移：空白拖动 / 空格+拖\n- 缩放：滚轮\n- 布局：逻辑图/组织图/鱼骨/时间轴\n- 样式与背景\n- 框选 B / 画笔 P / 沉浸 F11","处理整张网。");
  const c4Element=makeNode(c4,"元素级：做扎实一条线索",-65,-150,"#5270d8",c4Root,
    "## 元素级\n\n- Tab：加子节点\n- Enter：加同级\n- Shift+1-4：加根到四级\n- −/+：折叠/展开\n- Alt+↑↓：同级排序\n- Alt+←→：提级/降级\n- C：连接并标语义\n- F：聚焦 / E：展开 / A：批注\n- J：跃迁画布\n- Del：删除","先选中，再行动。");
  const c4Edit=makeNode(c4,"Markdown 编辑级",390,-150,"#7890e5",c4Root,
    "## 编辑级\n\n双击节点或便签进入编辑：\n\n- # 标题建立层级\n- - [ ] 待办\n- | 表格 |\n- [链接](url)\n- 代码与预览","把判断写成可回看的说明。");
  ["布局：逻辑图/组织图/鱼骨/时间轴","样式与背景：统一阅读氛围","框选 B / 画笔 P","沉浸 F11"].forEach((t,i)=>makeNode(c4,t,-520,-55+i*76,"#2d5fd3",c4Canvas,"","画布级。"));
  ["Tab 加子节点 / Enter 加同级","C 连接 / F 聚焦 / E 展开","A 批注 / J 跃迁 / Del 删除","−+ 折叠 / Alt+↑↓排序 / Alt+←→提降级"].forEach((t,i)=>makeNode(c4,t,-65,-55+i*74,"#5270d8",c4Element,"","元素级。"));
  ["双击进入编辑","# 标题 / - [ ] 待办","| 表格 | / [链接](url)"].forEach((t,i)=>makeNode(c4,t,390,-55+i*82,"#7890e5",c4Edit,"","编辑级。"));
  makeNote(c4,"## 推荐工作顺序\n\n1. **画布级**：定结构与视野\n2. **元素级**：补连接与判断\n3. **编辑级**：把理由写完整\n\n画布 → 关系 → 表达",-205,-515,"#dbeafe",330,130,"从空间到关系再到表达。");
  const c4Card=makeFileCard(c4,quickstartFile,390,310,220,58,"一分钟上手卡。");
  relate(c4,c4Canvas,c4Element,"supports","先有空间结构，再补关系");
  relate(c4,c4Element,c4Edit,"causes","展开后进入完整表达");
  relate(c4,c4Card,c4Root,"evidence","操作速查");

  /* ═══════════════════════════════════════════════════════════
     画布五：案例 — 商业航天行业研究（公开信息）
  ═══════════════════════════════════════════════════════════ */
  const c5=makeCanvas("05-案例：商业航天行业研究","fishbone");project.canvases.push(c5);
  const c5Industry=makeNode(c5,"商业航天 · 公开行业研究",-850,-15,"#d78f36",null,
    "# 商业航天行业研究\n\n展示织见如何组织公开信息做行业研究。\n\n**只使用公开来源，不含项目专属资料。**","教学示例。");
  const c5Q=makeNode(c5,"研究问题：增长从哪里来？",-560,-15,"#d78f36",c5Industry,
    "先定研究问题，再找证据。\n\n不是堆资料，而是回答一个问题。","研究始于问题。");
  const c5Chain=makeNode(c5,"产业链：卫星 · 运载 · 地面应用",-170,-15,"#c97728",c5Industry,
    "卫星制造、发射服务、地面应用共同构成行业链条。\n\n把产业位置和价值环节分开看。","产业拆解。");
  const c5Drivers=makeNode(c5,"驱动：需求 · 技术 · 政策",220,-15,"#d78f36",c5Industry,
    "应用需求、技术成熟和政策支持共同驱动行业。","注意时间边界。");
  const c5Risk=makeNode(c5,"风险：进度 · 成本 · 监管",610,-15,"#c04a2a",c5Industry,
    "行业判断必须与发射节奏、资本开支和监管边界一起看。\n\n**风险不等于否定，而是决定要验证什么。**","风险定义验证方向。");
  ["通信、遥感、导航服务","客户、频次、单位经济"].forEach((t,i)=>makeNode(c5,t,-560,[-185,155][i],"#d78f36",c5Q,"","需求端。"));
  ["卫星制造","运载与发射","地面站与数据服务"].forEach((t,i)=>makeNode(c5,t,-170,[-200,155,285][i],"#c97728",c5Chain,"","产业链环节。"));
  ["低轨星座部署","遥感数据产品化"].forEach((t,i)=>makeNode(c5,t,220,[-185,155][i],"#d78f36",c5Drivers,"","技术驱动。"));
  ["发射成功率与供给节奏","资本开支与商业闭环"].forEach((t,i)=>makeNode(c5,t,610,[-185,155][i],"#c04a2a",c5Risk,"","风险因子。"));
  makeNote(c5,"### 公开信息口径\n\n只引用公开政策、企业公告、行业报告与公开访谈。\n\n**不使用：**会议纪要、上会材料、条款、项目专属资料。",-315,325,"#fef3c7",350,128,"教学示例与真实项目材料严格隔离。");
  const c5Card=makeFileCard(c5,industryFile,70,470,235,58,"公开研究口径说明。");
  relate(c5,c5Q,c5Drivers,"supports","应用需求牵引行业投入");
  relate(c5,c5Chain,c5Risk,"contradicts","供给节奏约束产业链兑现");
  relate(c5,c5Drivers,c5Risk,"related","驱动与风险互为验证对象");
  relate(c5,c5Card,c5Industry,"evidence","公开信息研究口径");

  /* ═══════════════════════════════════════════════════════════
     画布六：DD 尽调 —— 织见的核心使用场景
  ═══════════════════════════════════════════════════════════ */
  const c6=makeCanvas("06-DD尽调：关系板实战","logic");project.canvases.push(c6);
  const c6Root=makeNode(c6,"DD 尽调关系板",-10,-280,"#2d5fd3",null,
    "# 为什么用织见做尽调\n\n传统尽调材料是一堆文件——报告、纪要、模型、清单。它们之间有关系吗？当然有。但传统工具让你自己记着。\n\n织见把判断、证据和不确定性放在同一张关系网上，**每条线都是可追溯的论证环节**。",
    "织见的 typed relations 就是投资论证语言。");
  const c6Thesis=makeNode(c6,"核心判断：行业增长驱动力",-430,-100,"#d78f36",c6Root,
    "## 核心判断\n\n「低轨星座部署驱动运载市场进入增长周期」\n\n一个判断。接下来要问：什么支撑它？什么反对它？证据在哪？","尽调的核心是判断，不是资料。");
  const c6Support=makeNode(c6,"支撑：财务指标改善",-430,60,"#319b77",c6Thesis,
    "## 支撑判断\n\n「头部企业发射成本下降 40%，订单量同比增长」\n\n→支撑→ 核心判断","支撑是论证链条的环节。");
  const c6Contradict=makeNode(c6,"反证：客户集中度过高",160,-100,"#c04a2a",c6Thesis,
    "## 反证\n\n「前三大客户占比 75%，续约率未公开」\n\n→反证→ 商业可持续性\n\n不是否定，是标出需要验证的张力。","反证标出需要验证的张力。");
  const c6Evidence=makeNode(c6,"证据：行业研究报告",160,60,"#7a55c0",c6Thesis,
    "## 证据\n\n「2024 行业报告：全球发射次数 260+，低轨占比 60%」\n\n→证据→ 增长驱动力","证据让判断可追溯。");
  const c6Uncertain=makeNode(c6,"不确定：大客户续约率",160,200,"#7a55c0",c6Thesis,
    "## 不确定\n\n「大客户续约率未公开，待验证」\n\n不确定的内容用便签标记，不混入判断。","不确定的内容用便签标记。");
  const c6Board=makeNote(c6,"## 板 → 文：投资建议书\n\n织见的终极能力：把关系板结构转化为 Markdown 投资建议书。\n\n- 节点结构 = 建议书框架\n- 形变内容 = 建议书段落\n- 语义关系 = 论证逻辑\n\n**画板即建议书骨架。**",430,-100,"#fef3c7",300,160,"板→文是织见的第四个定位轴。");
  const c6DDCard=makeFileCard(c6,ddFile,430,120,300,58,"DD 尽调关系板模板。");
  const c6BrandCard=makeFileCard(c6,brandFile,-430,220,240,58,"织见品牌宣言。");
  makeNote(c6,"## 织见的四个定位轴\n\n1. **就地形变**：节点展开变成阅读区（护城河）\n2. **语义连接**：typed relations = 投资论证语言\n3. **聚焦切换**：全貌与单点之间切换\n4. **板→文导出**：关系板 → 投资建议书\n\n> AI 是辅助，不是卖点。",-430,-300,"#dbeafe",350,150,"四个定位轴。");
  relate(c6,c6Support,c6Thesis,"supports","财务改善支撑增长判断");
  relate(c6,c6Contradict,c6Thesis,"contradicts","客户集中反证商业可持续");
  relate(c6,c6Evidence,c6Thesis,"evidence","行业报告是增长判断的来源");
  relate(c6,c6Uncertain,c6Contradict,"supports","续约率不确定加强反证力度");
  relate(c6,c6DDCard,c6Root,"evidence","DD 尽调模板");
  relate(c6,c6BrandCard,c6Root,"evidence","品牌宣言");

  /* 首次打开自动框选 */
  const frameCanvas=canvas=>{
    const items=canvas.items||[];if(!items.length)return;
    const left=Math.min(...items.map(i=>i.x)),top=Math.min(...items.map(i=>i.y));
    const right=Math.max(...items.map(i=>i.x+(i.w||156))),bottom=Math.max(...items.map(i=>i.y+(i.h||44)));
    const pad=100,wW=Math.max(1,right-left),hW=Math.max(1,bottom-top);
    const z=clamp(Math.min((Math.max(900,W)-pad*2)/wW,(Math.max(620,H)-pad*2)/hW),.32,.9);
    canvas.camera={x:left-(Math.max(900,W)/z-wW)/2,y:top-(Math.max(620,H)/z-hW)/2,zoom:z};
  };
  [c1,c2,c3,c4,c5,c6].forEach(frameCanvas);

  state.activeProjectId=state.projects.some(p=>p.id===previousProject)?previousProject:project.id;
  const ap=curProject();
  state.activeCanvasId=ap&&ap.canvases.some(c=>c.id===previousCanvas)?previousCanvas:(ap&&ap.canvases[0]&&ap.canvases[0].id);
  state.selected=null;syncUid();return true;
}
