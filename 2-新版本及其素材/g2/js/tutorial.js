"use strict";
/* ============================================================
   织见学堂 · Demo G2 教学项目
   三张画布：设计核心原则 → 操作方法 → 案例
   内容基于设计理念文档（元素与线、聚焦与连接）
============================================================ */
const TUTORIAL_VERSION=14;
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
  state.projects=state.projects.filter(p=>p.name!=="回归测试");
  const removedRegression=state.projects.length!==state.projects.length+0;
  const countBefore=state.projects.length;
  state.projects=state.projects.filter(p=>p.name!=="回归测试");
  const existing=state.projects.find(p=>p.name==="织见学堂");
  if(existing&&existing.tutorialVersion===TUTORIAL_VERSION&&(existing.canvases||[]).length===3){
    if(!state.projects.some(p=>p.id===previousProject)){state.activeProjectId=existing.id;state.activeCanvasId=existing.canvases[0].id;state.selected=null;}
    return removedRegression||(countBefore!==state.projects.length);
  }
  const project=existing||{id:"p"+(uid++),name:"织见学堂",files:[],folders:[],canvases:[]};
  if(!existing)state.projects.push(project);
  project.files=[];project.folders=[];project.canvases=[];project.tutorialVersion=TUTORIAL_VERSION;project.isBuiltin=true;
  const makeCanvas=(name,layout)=>({id:"c"+(uid++),name,items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[],layoutVersion:TUTORIAL_VERSION,tutorialLayout:layout||"right"});
  const makeNode=(canvas,text,x,y,color,parent=null,detail="",annotation="")=>{
    const item={id:uid++,type:"mindNode",text,parentId:parent?parent.id:null,children:[],x,y,w:156,h:44,color,collapsed:false,attachIds:[],detail,annotation,birth:performance.now()};
    if(parent)parent.children.push(item.id);canvas.items.push(item);return item;
  };
  const makeNote=(canvas,text,x,y,color,w=260,h=118,annotation="")=>{
    const item={id:uid++,type:"note",x,y,w,h,text,color,fontFamily:state.fontPreset,fontSize:13,underline:false,bold:false,annotation,birth:performance.now()};
    canvas.items.push(item);return item;
  };
  const relate=(canvas,a,b,type,annotation)=>canvas.links.push({id:"lnk"+(uid++),aId:a.id,bId:b.id,relationType:type,directional:type!=="related",annotation});
  const makeBuiltinFile=(name,kind,mime,content="",url="")=>{
    const id="tutor-file-"+(uid++);const blob=content?new Blob([content],{type:mime}):null;
    const file={id,name,kind,mime,size:blob?blob.size:0,created:Date.now(),folderId:null,url:url||null};
    project.files.push(file);if(blob)storeBuiltinTutorBlob(id,blob);return file;
  };
  const makeFileCard=(canvas,file,x,y,w=190,h=58,annotation="")=>{
    const item={id:uid++,type:"fileCard",x,y,w,h,fileId:file.id,kind:file.kind,thumb:null,tw:1,th:1,annotation,birth:performance.now()};
    canvas.items.push(item);return item;
  };

  const conceptSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#eff6ff"/><stop offset="1" stop-color="#ecfdf5"/></linearGradient></defs><rect width="720" height="420" rx="32" fill="url(#g)"/><g fill="none" stroke="#8ba9e8" stroke-width="8" stroke-linecap="round"><path d="M170 210C250 100 330 105 360 210S490 320 570 210"/><path d="M170 210C250 320 330 315 360 210S490 100 570 210"/></g><circle cx="170" cy="210" r="34" fill="#2d5fd3"/><circle cx="360" cy="210" r="48" fill="#5e75d9"/><circle cx="570" cy="210" r="34" fill="#319b77"/><g fill="white" font-family="Arial, sans-serif" text-anchor="middle"><text x="170" y="218" font-size="22">织</text><text x="360" y="220" font-size="30">连接</text><text x="570" y="218" font-size="22">见</text></g><text x="360" y="354" fill="#45536f" font-size="28" font-family="Arial, sans-serif" text-anchor="middle">把线索编在一起，把重要处看清</text></svg>`;
  const conceptFile=makeBuiltinFile("织见-连接与聚焦.svg","img","image/svg+xml",conceptSvg);
  const quickstartFile=makeBuiltinFile("织见-一分钟上手.md","text","text/markdown;charset=utf-8",`# 织见一分钟上手\n\n1. 空白处双击建节点\n2. 选中两个元素按 C 连接\n3. 按聚焦只看直接关系\n4. 按 E 展开完整内容\n5. 按 A 添加批注\n\n> 先织成一张网，再在需要的地方"见"。\n\n织连万象，见聚一隅。`);
  const relationFile=makeBuiltinFile("五种语义关系.md","text","text/markdown;charset=utf-8",`# 织见的五种语义关系\n\n| 关系 | 方向 | 用途 |\n|---|---|---|\n| 关联 | 无向 | 两者有关，暂不确定方向 |\n| 支撑 | 有向 | A 支持 B 的判断 |\n| 导致 | 有向 | A 促使 B 发生 |\n| 反证 | 有向 | A 与 B 矛盾 |\n| 证据 | 有向 | A 是 B 的来源/依据 |\n\n> 线不是装饰，要有语义。`);
  const industryFile=makeBuiltinFile("商业航天-公开研究口径.md","text","text/markdown;charset=utf-8",`# 商业航天公开研究口径\n\n仅使用公开来源：\n\n- 政府公开政策与统计\n- 企业公告和公开访谈\n- 已公开的行业研究报告\n\n不纳入：会议纪要、上会材料、交易条款、项目专属资料。`);

  /* ─── 画布一：设计核心原则 — 元素与线、聚焦与连接 ─── */
  const c1=makeCanvas("01-设计核心：元素与线","radial");project.canvases.push(c1);
  const root=makeNode(c1,"织见",-20,-10,"#2d5fd3",null,
    "# 织见\n\n它不是一张定型的图，而是一台随时可以动手改的机器：新元件装得进去，线接得上来，想拆就拆，想重连就重连。\n\n**元素与线，随意排列组合。**",
    "从这里开始：双击编辑，E 展开，A 看批注，F 聚焦。");
  const elements=makeNode(c1,"元素：任何可以放上画布的事物",-430,-170,"#319b77",root,
    "元素承载信息：\n- **节点**：一行判断或标题\n- **便签**：一段 Markdown 说明\n- **附件**：文件、网页、表格\n\n元素不只是标题——内容密度远大于普通导图。",
    "三种元素，各自承担不同密度。");
  const lines=makeNode(c1,"线：带方向，方向带来逻辑",-430,170,"#319b77",root,
    "每条线有语义：\n- **关联**：有关，暂不确定方向\n- **支撑**：A 支持 B\n- **导致**：A 促使 B 发生\n- **反证**：A 与 B 矛盾\n- **证据**：A 是 B 的来源\n\n线不是装饰，要有语义。",
    "选中两个元素按 C 创建连接。");
  const focus=makeNode(c1,"聚焦：全貌与单点",380,-5,"#6b73cc",root,
    "## 聚焦\n\n图越大，越需要聚焦——只留下与这一点直接相关的内容，其余退为背景。\n\n不是把视野变小，是把噪音切掉。",
    "选中后按 F，再按 F 回到全景。");
  const expand=makeNode(c1,"展开 E：让内容完整出现",380,120,"#6b73cc",focus,
    "## 展开\n\n文字多时，展开区域会完整呈现内容，而不是裁断中间。节点上按 E 展开/收起。",
    "E 键展开，再按 E 收起。");
  const annotate=makeNode(c1,"批注 A：留下一句为什么",380,-130,"#6b73cc",focus,
    "每条线、每个元素都可以被批注。批注让未来的自己知道为什么做出这个连接。",
    "A 键添加批注。");
  const source=makeNode(c1,"附件：一个公开来源",-730,-175,"#319b77",elements,
    "附件先以轻量卡片存在；阅读时按 E 形变展开，不一开始占满画布。",
    "附件兼顾总览与阅读。");
  const jump=makeNode(c1,"跃迁 J：跨画布继续",-730,175,"#319b77",lines,
    "把一条未完的线索，带到下一张画布继续研究。",
    "按 J 跃迁到其他画布。");
  makeNote(c1,"# 这不是一棵树\n\n它是会继续生长的网。\n\n织：把线索编在一起\n见：把重要处看清",30,-330,"#fef3c7",300,130,"从理念到动作：放入元素、建立连接、聚焦一处。");
  const conceptCard=makeFileCard(c1,conceptFile,270,195,220,145,"用一张概念图把织与见的关系先看清。");
  const startCard=makeFileCard(c1,quickstartFile,-110,375,210,58,"可展开阅读的 Markdown 入门卡。");
  relate(c1,source,focus,"supports","附件经形变预览，成为可阅读的证据");
  relate(c1,lines,focus,"related","清晰关系帮助聚焦");
  relate(c1,jump,focus,"causes","跨画布后继续看清局部");
  relate(c1,conceptCard,root,"evidence","概念图：连接与聚焦");
  relate(c1,startCard,elements,"evidence","Markdown 是可读、可展开的附件");
  relate(c1,expand,annotate,"related","展开和批注共同服务内容的完整性");

  /* ─── 画布二：操作方法 — 键盘快捷键与工作模式 ─── */
  const c2=makeCanvas("02-操作方法","columns");project.canvases.push(c2);
  const opRoot=makeNode(c2,"织见的操作方法",-25,-330,"#2d5fd3",null,
    "# 三种工作模式\n\n下 Dock 把操作分成画布级、元素级、Markdown 编辑级。先判断你在哪一层工作。",
    "先判断：组织空间、关系，还是理由？");
  const canvasMode=makeNode(c2,"画布级：组织整个视野",-520,-150,"#2d5fd3",opRoot,
    "布局、样式、背景、画笔、框选、沉浸——处理整张网。","从下 Dock 左侧进入。");
  const elementMode=makeNode(c2,"元素级：做扎实一条线索",-65,-150,"#5270d8",opRoot,
    "选中元素后才出现：连接、聚焦、展开、批注、跃迁、复制、删除。","先选中，再行动。");
  const editMode=makeNode(c2,"Markdown 编辑级：把理由写清楚",390,-150,"#7890e5",opRoot,
    "编辑便签与展开内容：标题、列表、待办、表格、链接、代码与预览。","把判断写成可回看的说明。");
  ["布局：逻辑图/组织图/鱼骨/时间轴","样式与背景：统一阅读氛围","框选 B 与画笔 P：补充空间结构","沉浸 F11：无干扰浏览"].forEach((t,i)=>makeNode(c2,t,-520,-55+i*74,"#2d5fd3",canvasMode,"","画布级操作。"));
  ["Tab：加子节点；Enter：加同级","Shift+1-4：加根到四级节点","C：连接并标记语义关系","F：聚焦；E：展开；A：批注","J：跃迁画布；Del：删除"].forEach((t,i)=>makeNode(c2,t,-65,-55+i*66,"#5270d8",elementMode,"","元素级操作。"));
  ["双击节点或便签进入编辑","# 标题建立层级","- [ ] 待办：记录下一步","| 表格 |：对比数据","[链接](url)：保留出处"].forEach((t,i)=>makeNode(c2,t,390,-55+i*66,"#7890e5",editMode,"","Markdown 编辑。"));
  makeNote(c2,"## 推荐工作顺序\n\n1. **画布级**：定结构与视野\n2. **元素级**：补连接与判断\n3. **编辑级**：把理由写完整\n\n画布 → 关系 → 表达，从空间到理由。",-205,-515,"#dbeafe",330,128,"从空间到关系再到表达。");
  const relationCard=makeFileCard(c2,relationFile,390,340,220,58,"五种语义关系的速查表。");
  relate(c2,canvasMode,elementMode,"supports","先有空间结构，再补关系");
  relate(c2,elementMode,editMode,"causes","展开后进入完整表达");
  relate(c2,relationCard,elementMode,"evidence","语义关系速查");

  /* ─── 画布三：案例 — 投资分析场景（公开信息） ─── */
  const c3=makeCanvas("03-案例：商业航天行业研究","fishbone");project.canvases.push(c3);
  const industry=makeNode(c3,"商业航天 · 公开行业研究",-850,-15,"#d78f36",null,
    "# 商业航天行业研究示例\n\n展示织见如何组织公开信息做行业研究。\n\n**只使用公开来源，不含项目专属资料。**","教学示例，不含保密材料。");
  const question=makeNode(c3,"研究问题：增长从哪里来？",-560,-15,"#d78f36",industry,
    "先定研究问题，再找证据。\n\n不是堆资料，而是回答一个问题。","研究始于问题。");
  const chain=makeNode(c3,"产业链：卫星 · 运载 · 地面应用",-170,-15,"#c97728",industry,
    "卫星制造、发射服务、地面应用共同构成行业链条。\n\n把产业位置和价值环节分开看。","产业拆解。");
  const drivers=makeNode(c3,"驱动：需求 · 技术 · 政策",220,-15,"#d78f36",industry,
    "应用需求、技术成熟和政策支持共同驱动行业。","注意公开信息的时间边界。");
  const risk=makeNode(c3,"风险：进度 · 成本 · 监管",610,-15,"#c04a2a",industry,
    "行业判断必须与发射节奏、资本开支和监管边界一起看。\n\n**风险不等于否定，而是决定要验证什么。**","风险定义验证方向。");
  ["通信、遥感、导航服务","客户、频次、单位经济"].forEach((t,i)=>makeNode(c3,t,-560,[-185,155][i],"#d78f36",question,"","需求端拆解。"));
  ["卫星制造","运载与发射","地面站与数据服务"].forEach((t,i)=>makeNode(c3,t,-170,[-200,155,285][i],"#c97728",chain,"","产业链环节。"));
  ["低轨星座部署","遥感数据产品化"].forEach((t,i)=>makeNode(c3,t,220,[-185,155][i],"#d78f36",drivers,"","技术驱动。"));
  ["发射成功率与供给节奏","资本开支与商业闭环"].forEach((t,i)=>makeNode(c3,t,610,[-185,155][i],"#c04a2a",risk,"","风险因子。"));
  makeNote(c3,"### 公开信息口径\n\n只引用公开政策、企业公告、行业报告与公开访谈。\n\n**不使用：**会议纪要、上会材料、条款、项目专属资料。",-315,325,"#fef3c7",350,128,"教学示例与真实项目材料严格隔离。");
  const industryCard=makeFileCard(c3,industryFile,70,470,235,58,"教学示例的数据边界与公开来源说明。");
  relate(c3,question,drivers,"supports","应用需求牵引行业投入");
  relate(c3,chain,risk,"contradicts","供给节奏约束产业链兑现节奏");
  relate(c3,drivers,risk,"related","驱动与风险互为验证对象");
  relate(c3,industryCard,industry,"evidence","公开信息研究口径");

  /* 首次打开自动框选全部内容 */
  const frameCanvas=canvas=>{
    const items=canvas.items||[];if(!items.length)return;
    const left=Math.min(...items.map(i=>i.x)),top=Math.min(...items.map(i=>i.y));
    const right=Math.max(...items.map(i=>i.x+(i.w||156))),bottom=Math.max(...items.map(i=>i.y+(i.h||44)));
    const pad=100,wWorld=Math.max(1,right-left),hWorld=Math.max(1,bottom-top);
    const z=clamp(Math.min((Math.max(900,W)-pad*2)/wWorld,(Math.max(620,H)-pad*2)/hWorld),.32,.9);
    canvas.camera={x:left-(Math.max(900,W)/z-wWorld)/2,y:top-(Math.max(620,H)/z-hWorld)/2,zoom:z};
  };
  [c1,c2,c3].forEach(frameCanvas);

  state.activeProjectId=state.projects.some(p=>p.id===previousProject)?previousProject:project.id;
  const ap=curProject();
  state.activeCanvasId=ap&&ap.canvases.some(c=>c.id===previousCanvas)?previousCanvas:(ap&&ap.canvases[0]&&ap.canvases[0].id);
  state.selected=null;syncUid();return true;
}
