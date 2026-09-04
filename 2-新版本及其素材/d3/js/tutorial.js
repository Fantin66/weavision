"use strict";
/* ============================================================
   织见学堂 · Demo C2 教学项目
   三张画布采用可读的手工构图：不依赖用户项目材料，也不把教学内容
   自动排成一棵僵硬的思维树。版本升级只覆盖内置学堂项目。
============================================================ */
const TUTORIAL_VERSION=13;
function storeBuiltinTutorBlob(id,blob){
  if(!idb)return;
  try{
    const tx=idb.transaction("files","readwrite");
    tx.objectStore("files").put(blob,id);
  }catch(_){/* IndexedDB 不可用时，当前会话仍由文件对象保留 */}
}
function ensureTutorV6(){
  const existing=state.projects.find(p=>p.name==="织见学堂");
  if(existing&&existing.tutorialVersion===TUTORIAL_VERSION)return false;
  const previousProject=state.activeProjectId,previousCanvas=state.activeCanvasId;
  let project=existing;
  if(project){
    project.files=[];project.folders=[];project.canvases=[];
  }else{
    project={id:"p"+(uid++),name:"织见学堂",files:[],folders:[],canvases:[]};
    state.projects.push(project);
  }
  project.tutorialVersion=TUTORIAL_VERSION;
  const makeCanvas=name=>{const c={id:"c"+(uid++),name,items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[],layoutVersion:TUTORIAL_VERSION};project.canvases.push(c);return c;};
  const c1=makeCanvas("01-织见：连接与聚焦");
  const c2=makeCanvas("02-操作方法：三种工作模式");
  const c3=makeCanvas("03-示例：商业航天行业研究");
  const activate=c=>{state.activeProjectId=project.id;state.activeCanvasId=c.id;state.selected=null;};
  const node=(text,x,y,color,opt={})=>{const n=addMindNode(text,opt.parentId||null,color,x,y);n.detail=opt.detail||"";n.annotation=opt.annotation||"";if(opt.jumpTo)n.jumpTo=opt.jumpTo;return n;};
  const note=(text,x,y,color,opt={})=>{const n=addNote(x,y,text,color);n.w=opt.w||n.w;n.h=opt.h||n.h;n.annotation=opt.annotation||"";return n; /* D3: note.detail removed */};
  const relate=(canvas,a,b,type="related",annotation="")=>canvas.links.push({id:"lnk"+(uid++),aId:a.id,bId:b.id,relationType:type,directional:!!(RELATION_TYPES[type]&&RELATION_TYPES[type].directional),annotation});
  const addLearningFile=(name,content)=>{
    const id="tutor-file-"+(uid++),blob=new Blob([content],{type:"text/markdown;charset=utf-8"});
    project.files.push({id,name,kind:"text",mime:"text/markdown",size:blob.size,created:Date.now(),url:null,folderId:null,blob});
    storeBuiltinTutorBlob(id,blob);return id;
  };
  const playbookId=addLearningFile("织见-一分钟上手.md",`# 织见一分钟上手\n\n1. 在空白处右键，放入节点、便签或附件。\n2. 选中两个元素按 **C**，为连接选择语义。\n3. 对任一元素按 **F** 聚焦、按 **E** 展开、按 **A** 添加批注。\n4. 用 **J** 在画布之间跃迁。\n\n> 织的是关系，看见的是结构。`);
  const researchId=addLearningFile("商业航天-公开研究口径.md",`# 商业航天公开研究口径\n\n- 仅使用公开政策、企业公告、行业报告与公开访谈。\n- 不放入会议纪要、上会材料、投资条款或项目专属资料。\n- 研究重点：产业链、需求牵引、技术路径与风险边界。`);

  /* 01 设计理念：用真实节点、语义线、批注、展开、附件、跃迁来讲自己。 */
  activate(c1);
  const root=node("织见",-45,-28,"#2d5fd3",{detail:"# 织见\n\n它不是一张从中心向外发散的思维导图，而是一张可以不断补线、补证据、补解释的关系网。\n\n**先连接，再聚焦。**",annotation:"从这里开始：双击改名，E 展开，A 看批注，F 聚焦。"});
  const weaving=node("织 · 把线索编成网",-470,-26,"#2d5fd3",{parentId:root.id,detail:"## 织\n\n每个元素是经线，每条有语义的连接是纬线。它们交错后，不再只是信息清单，而是可以追溯的判断网络。"});
  const seeing=node("见 · 把重要处看清",370,-26,"#5d67c9",{parentId:root.id,detail:"## 见\n\n聚焦只保留选中元素与它直接相关的节点、连线和批注。局部看清，再回到全局。"});
  const elems=node("元素：节点 · 便签 · 附件",-760,-150,"#319b77",{parentId:weaving.id,annotation:"三种材料，各自承担不同的信息密度。"});
  const nodeLeaf=node("节点：一个判断",-980,-236,"#319b77",{parentId:elems.id});
  const noteLeaf=node("便签：一段说明",-980,-148,"#d78f36",{parentId:elems.id});
  const fileLeaf=node("附件：一个来源",-980,-60,"#6b73cc",{parentId:elems.id});
  const vectors=node("向量：连接线 · 跃迁",-760,105,"#319b77",{parentId:weaving.id,detail:"## 向量连接\n\n- **连接线**：关联、支撑、导致、反证、证据\n- **跃迁**：把一条线索带到另一张画布继续研究"});
  const lineLeaf=node("连接线：把关系说出来",-980,70,"#319b77",{parentId:vectors.id,annotation:"线不是装饰；请给它一个语义。"});
  const jumpLeaf=node("跃迁：跨画布继续",-980,165,"#319b77",{parentId:vectors.id,jumpTo:{canvasId:c2.id},annotation:"按 J，跳到第二张画布。"});
  const focusLeaf=node("聚焦 F：留下直接关系",650,-150,"#5d67c9",{parentId:seeing.id,annotation:"选中后按 F；再按 F 回到全景。"});
  const expandLeaf=node("展开 E：让解释完整出现",650,-55,"#5d67c9",{parentId:seeing.id,detail:"## 展开阅读区\n\n文字多时，展开区域会同时调整宽度和高度，完整呈现内容，而不是裁断中间。"});
  const previewLeaf=node("形变预览：材料变成阅读区",650,40,"#5d67c9",{parentId:seeing.id,detail:"附件在画布上先以紧凑卡片存在；需要阅读时，再形变展开，避免一开始占满画布。"});
  const annotationLeaf=node("批注 A：留下一句为什么",650,135,"#5d67c9",{parentId:seeing.id,annotation:"这是一条示例批注：让未来的自己知道为什么做出这个连接。"});
  const intro=note("# 这不是一棵树\n\n它是会继续生长的网。\n\n右键试着放入元素；选中两项按 C，把它们编在一起。",-35,-220,"#fef3c7",{w:280,h:118,annotation:"从理念到动作：试一次就能理解。"});
  const guide=addFileCard(55,220,playbookId);guide.annotation="可展开预览的教学附件：点击或双击试试看。";/* D3: guide.detail removed — fileCard no longer supports detail */
  relate(c1,nodeLeaf,lineLeaf,"supports","元素通过连接，才会成为网的一部分");
  relate(c1,fileLeaf,previewLeaf,"supports","附件以形变预览保持画布轻盈");
  relate(c1,focusLeaf,annotationLeaf,"related","聚焦时，相关批注也被保留下来");
  relate(c1,jumpLeaf,seeing,"causes","跨画布后，从连接继续走向看见");

  /* 02 操作方法：与下 Dock 的三种工作模式一一对应。 */
  activate(c2);
  const opRoot=node("织见的操作方法",-55,-185,"#2d5fd3",{detail:"# 三种工作模式\n\n底部 Dock 不是一排孤立按钮：它把操作分成**画布级**、**元素级**和 **Markdown 编辑级**三层。\n\n先决定在哪一层工作，再选择工具。"});
  const canvasMode=node("画布级：组织整个视野",-610,-8,"#2d5fd3",{parentId:opRoot.id,detail:"## 画布级操作\n\n适合处理整个网络：布局、样式、背景、画笔、框选、沉浸和材料导入。"});
  const elementMode=node("元素级：把一条线索做扎实",-60,-8,"#5270d8",{parentId:opRoot.id,detail:"## 元素级操作\n\n选中元素后才出现：移动、缩放、连接、聚焦、展开、批注、跃迁、复制、删除。"});
  const mdMode=node("Markdown 编辑级：把说明写清楚",500,-8,"#7890e5",{parentId:opRoot.id,detail:"## Markdown 编辑级\n\n编辑便签与展开内容：标题、列表、待办、表格、链接、代码与预览。"});
  const canvasOps=["画布：平移 / 缩放","布局：逻辑图、组织图、鱼骨、时间轴","样式与背景：统一阅读氛围","框选与画笔：补充空间结构","沉浸：进入无干扰浏览"];
  const elementOps=["点击：选择；拖拽：移动 / 调整大小","C：连接两个元素并标记关系","F：聚焦直接关系","E：展开完整内容","A：批注理由；J：跃迁画布"];
  const mdOps=["双击便签 / 节点，进入编辑","# 标题：建立层级","- [ ] 待办：记录下一步","| 表格 |：对比数据","[链接](https://example.com)：保留出处"];
  const makeOps=(parent,rows,color,startX)=>rows.map((text,i)=>node(text,startX,82+i*70,color,{parentId:parent.id,annotation:i===0?"从下 Dock 进入这一类工作。":""}));
  const cOps=makeOps(canvasMode,canvasOps,"#2d5fd3",-690);
  const eOps=makeOps(elementMode,elementOps,"#5270d8",-140);
  const mOps=makeOps(mdMode,mdOps,"#7890e5",420);
  const opNote=note("## 一个舒服的顺序\n\n1. 先在**画布级**定结构与视野\n2. 再在**元素级**补连接与判断\n3. 最后用 **Markdown** 把理由写完整",-45,-350,"#dbeafe",{w:320,h:126});
  relate(c2,cOps[1],eOps[1],"supports","先选布局，再编关系");
  relate(c2,eOps[3],mOps[0],"causes","展开后进入完整表达");
  relate(c2,mOps[4],cOps[2],"supports","出处与样式共同服务阅读");

  /* 03 行业示例：只使用公开信息的研究骨架，明确排除保密项目材料。 */
  activate(c3);
  const industry=node("商业航天 · 公开行业研究",-55,-175,"#d78f36",{detail:"# 商业航天行业研究示例\n\n这是一个展示织见如何组织**公开信息**的示例，不使用会议纪要、上会材料、投资条款或任何项目专属附件。"});
  const question=node("研究问题：增长从哪里来？",-650,-30,"#d78f36",{parentId:industry.id,annotation:"先定问题，再找证据。"});
  const chain=node("产业链：卫星 · 运载 · 地面应用",-160,-30,"#d78f36",{parentId:industry.id,detail:"## 产业链观察\n\n- 卫星制造：平台、载荷、总装\n- 运载服务：火箭、发射场、发射服务\n- 地面应用：通信、遥感、导航与数据服务"});
  const drivers=node("公开驱动：需求 · 技术 · 政策",340,-30,"#d78f36",{parentId:industry.id});
  const risks=node("风险边界：进度 · 成本 · 监管",740,-30,"#d78f36",{parentId:industry.id,detail:"## 研究边界\n\n用公开信息描述行业，不把尚未公开的项目判断当作行业事实。"});
  const q1=node("需求：通信、遥感、导航服务",-920,-110,"#d78f36",{parentId:question.id});
  const q2=node("验证：客户、频次、单位经济",-920,-15,"#d78f36",{parentId:question.id});
  const c1n=node("卫星制造",-340,68,"#c97728",{parentId:chain.id});
  const c2n=node("运载与发射",-140,68,"#c97728",{parentId:chain.id});
  const c3n=node("地面站与数据服务",70,68,"#c97728",{parentId:chain.id});
  const d1=node("低轨星座部署",250,68,"#d78f36",{parentId:drivers.id});
  const d2=node("遥感数据产品化",430,68,"#d78f36",{parentId:drivers.id});
  const r1=node("发射成功率与供给节奏",680,68,"#c04a2a",{parentId:risks.id});
  const r2=node("资本开支与商业闭环",860,68,"#c04a2a",{parentId:risks.id});
  const publicNote=note("### 公开信息口径\n\n只引用公开政策、企业公告、行业报告与公开访谈。\n\n**不使用：**会议纪要、上会材料、条款、项目专属资料。",-350,240,"#fef3c7",{w:330,h:118,annotation:"教学示例与真实项目材料严格隔离。"});
  const researchCard=addFileCard(270,250,researchId);researchCard.annotation="可展开查看：公开研究的材料边界。";
  relate(c3,q1,d1,"supports","应用需求牵引星座部署");
  relate(c3,c2n,r1,"related","供给节奏影响发射服务可得性");
  relate(c3,d2,c3n,"causes","数据产品化推动地面应用");
  relate(c3,r2,q2,"contradicts","资本投入不等于已验证的商业闭环");
  relate(c3,publicNote,researchCard,"evidence","材料边界写进研究过程");

  state.activeProjectId=state.projects.some(p=>p.id===previousProject)?previousProject:project.id;
  const activeProject=curProject();
  state.activeCanvasId=activeProject.canvases.some(c=>c.id===previousCanvas)?previousCanvas:activeProject.canvases[0].id;
  state.selected=null;syncUid();return true;
}
/* 内置教学项目必须先保证“可见、可进入”，不能依赖附件 Blob、渲染器或当前活动
   画布的临时状态。这里直接构造标准元素数据；旧版本无论处于何种本地保存状态都会升级。 */
function ensureTutorProject(){
  const previousProject=state.activeProjectId,previousCanvas=state.activeCanvasId;
  /* 发布态不保留开发期间的回归测试项目。用户第一次进入应直接看到可学习、
     可操作的“织见学堂”，而不是带有测试痕迹的工作区。 */
  const countBefore=state.projects.length;
  state.projects=state.projects.filter(p=>p.name!=="回归测试");
  const removedRegression=state.projects.length!==countBefore;
  const existing=state.projects.find(p=>p.name==="织见学堂");
  if(existing&&existing.tutorialVersion===TUTORIAL_VERSION&&(existing.canvases||[]).length===3){
    if(!state.projects.some(p=>p.id===previousProject)){
      state.activeProjectId=existing.id;
      state.activeCanvasId=existing.canvases[0]&&existing.canvases[0].id;
      state.selected=null;
    }
    return removedRegression;
  }
  const project=existing||{id:"p"+(uid++),name:"织见学堂",files:[],folders:[],canvases:[]};
  if(!existing)state.projects.push(project);
  project.files=[];project.folders=[];project.canvases=[];project.tutorialVersion=TUTORIAL_VERSION;project.isBuiltin=true;
  const makeCanvas=(name,tutorialLayout)=>({id:"c"+(uid++),name,items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[],layoutVersion:TUTORIAL_VERSION,tutorialLayout});
  const makeNode=(canvas,text,x,y,color,parent=null,detail="",annotation="")=>{
    const item={id:uid++,type:"mindNode",text,parentId:parent?parent.id:null,children:[],x,y,w:156,h:44,color,collapsed:false,attachIds:[],detail,annotation,birth:performance.now()};
    if(parent)parent.children.push(item.id);canvas.items.push(item);return item;
  };
  const makeNote=(canvas,text,x,y,color,w=260,h=118,detail="",annotation="")=>{
    const item={id:uid++,type:"note",x,y,w,h,text,color,fontFamily:state.fontPreset,fontSize:13,underline:false,bold:false,detail,annotation,birth:performance.now()};canvas.items.push(item);return item;
  };
  const relate=(canvas,a,b,type,annotation)=>canvas.links.push({id:"lnk"+(uid++),aId:a.id,bId:b.id,relationType:type,directional:type!=="related",annotation});
  const makeBuiltinFile=(name,kind,mime,content="",url="")=>{
    const id="tutor-file-"+(uid++);
    const blob=content?new Blob([content],{type:mime}):null;
    const file={id,name,kind,mime,size:blob?blob.size:0,created:Date.now(),folderId:null,url:url||null};
    project.files.push(file);
    if(blob)storeBuiltinTutorBlob(id,blob);
    return file;
  };
  const makeFileCard=(canvas,file,x,y,w=190,h=58,detail="",annotation="")=>{
    const item={id:uid++,type:"fileCard",x,y,w,h,fileId:file.id,kind:file.kind,thumb:null,tw:1,th:1,detail,annotation,birth:performance.now()};
    canvas.items.push(item);return item;
  };

  const conceptSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#eff6ff"/><stop offset="1" stop-color="#ecfdf5"/></linearGradient></defs><rect width="720" height="420" rx="32" fill="url(#g)"/><g fill="none" stroke="#8ba9e8" stroke-width="8" stroke-linecap="round"><path d="M170 210C250 100 330 105 360 210S490 320 570 210"/><path d="M170 210C250 320 330 315 360 210S490 100 570 210"/></g><circle cx="170" cy="210" r="34" fill="#2d5fd3"/><circle cx="360" cy="210" r="48" fill="#5e75d9"/><circle cx="570" cy="210" r="34" fill="#319b77"/><g fill="white" font-family="Arial, sans-serif" text-anchor="middle"><text x="170" y="218" font-size="22">织</text><text x="360" y="220" font-size="30">连接</text><text x="570" y="218" font-size="22">见</text></g><text x="360" y="354" fill="#45536f" font-size="28" font-family="Arial, sans-serif" text-anchor="middle">把线索编在一起，把重要处看清</text></svg>`;
  const conceptFile=makeBuiltinFile("织见-连接与聚焦.svg","img","image/svg+xml",conceptSvg);
  const quickstartFile=makeBuiltinFile("织见-一分钟上手.md","text","text/markdown;charset=utf-8",`# 织见的一分钟上手\n\n- 放入节点、便签或附件\n- 用连接线说明它们为什么相关\n- 用聚焦、展开和批注，把最重要的部分看清\n\n> 先织成一张网，再在需要的地方“见”。`);
  const workflowFile=makeBuiltinFile("三种工作模式速览.md","text","text/markdown;charset=utf-8",`# 三种工作模式\n\n1. **画布级**：布局、样式、背景和沉浸\n2. **元素级**：连接、聚焦、展开、批注与跃迁\n3. **Markdown 编辑级**：把判断与证据写完整\n\n每次操作先想清楚：我是在整理空间、关系，还是理由？`);
  const industryFile=makeBuiltinFile("商业航天-公开研究口径.md","text","text/markdown;charset=utf-8",`# 商业航天公开研究口径\n\n仅用于教学演示，可查证来源包括：\n\n- 政府公开政策与统计\n- 企业公告和公开访谈\n- 已公开的行业研究\n\n不纳入会议纪要、上会材料、交易条款或项目专属资料。`);
  /* 教学项目使用可稳定加载的公开来源，避免把第三方站点的证书/反爬限制误认为产品预览故障。 */
  const webFile=makeBuiltinFile("SpaceX · Commercial Space","link","text/uri-list","","https://www.spacex.com/");

  /* 画布一：中心向外的“关系星图”，展示织见不是单一方向的树。 */
  const c1=makeCanvas("01-织见：连接与聚焦","radial");project.canvases.push(c1);
  const root=makeNode(c1,"织见",-20,-10,"#2d5fd3",null,"# 连接，聚焦\n\n织见不是一棵只会向外发散的思维导图，而是一张能不断补线、补证据、补解释的关系网。","从这里开始：双击编辑，E 展开，A 看批注，F 聚焦。");
  const elements=makeNode(c1,"元素：节点 · 便签 · 附件",-410,-160,"#319b77",root,"元素承载信息密度：节点放判断，便签写说明，附件放来源。","三种元素可以被同一张网连接起来。");
  const vectors=makeNode(c1,"向量：连接线 · 跃迁",-410,155,"#319b77",root,"连接线说清关系；跃迁让一条线索跨画布继续。","线不是装饰，要有明确语义。");
  const focus=makeNode(c1,"见：聚焦 · 展开 · 形变预览 · 批注",365,-5,"#6b73cc",root,"## 见\n\n聚焦留下直接关系；展开显示完整内容；形变预览让材料在需要时变成阅读区；批注留下判断的原因。","F 聚焦，E 展开，A 批注。");
  const source=makeNode(c1,"附件：一个公开来源",-690,-175,"#319b77",elements,"附件先以轻量卡片存在；阅读时再形变展开，不一开始占满画布。","附件兼顾总览与阅读。");
  const line=makeNode(c1,"连接线：把关系说出来",-700,175,"#319b77",vectors,"支持、导致、反证、证据……每条线都有语义。","选中两个元素按 C，可以创建有方向的关系。");
  const jump=makeNode(c1,"跃迁：跨画布继续",-205,315,"#319b77",vectors,"把一条未完的研究线索，带到下一张画布继续。","按 J 可跃迁到其他画布。");
  const concept=makeNote(c1,"# 这不是一棵树\n\n它是会继续生长的网。\n\n**织**：把线索编在一起\n**见**：把重要处看清",30,-330,"#fef3c7",300,130,"从理念到动作：放入元素、建立连接、聚焦一处，再回到全局。","教学项目不含任何真实项目材料。");
  const conceptCard=makeFileCard(c1,conceptFile,270,195,220,145,"用一张概念图把“织”与“见”的关系先看清。","双击或展开，查看附件预览。");
  const startCard=makeFileCard(c1,quickstartFile,-110,375,210,58,"一份可展开阅读的 Markdown 入门卡。","附件不是孤岛，它可以成为关系网中的证据。");
  relate(c1,source,focus,"supports","附件经形变预览，成为可阅读的证据");relate(c1,line,focus,"related","清晰关系帮助聚焦");relate(c1,jump,focus,"causes","跨画布后继续看清局部");
  relate(c1,conceptCard,root,"evidence","概念图：连接与聚焦");relate(c1,startCard,elements,"evidence","Markdown 是可读、可展开的附件");

  /* 画布二：清晰的三栏工作流，分别对应下 Dock 的三种操作范围。 */
  const c2=makeCanvas("02-操作方法：三种工作模式","columns");project.canvases.push(c2);
  const opRoot=makeNode(c2,"织见的操作方法",-25,-330,"#2d5fd3",null,"# 三种工作模式\n\n下 Dock 不是一排孤立按钮：它把操作分成画布级、元素级、Markdown 编辑级。","先判断你要组织的是画布、元素，还是文字。");
  const canvasMode=makeNode(c2,"画布级：组织整个视野",-520,-150,"#2d5fd3",opRoot,"布局、样式、背景、画笔、框选、添加与沉浸，处理的是整张网。","从下 Dock 左侧进入。");
  const elementMode=makeNode(c2,"元素级：做扎实一条线索",-65,-150,"#5270d8",opRoot,"选择元素后，才会出现连接、聚焦、展开、批注、跃迁、复制与删除。","先选中，再行动。");
  const editMode=makeNode(c2,"Markdown 编辑级：把理由写清楚",390,-150,"#7890e5",opRoot,"编辑便签与展开内容：标题、列表、待办、表格、链接、代码与预览。","把判断写成可回看的说明。");
  ["布局：逻辑图 / 组织图 / 鱼骨 / 时间轴","样式与背景：统一阅读氛围","框选与画笔：补充空间结构","沉浸：进入无干扰浏览"].forEach((text,i)=>makeNode(c2,text,-520,-55+i*74,"#2d5fd3",canvasMode));
  ["拖拽：移动 / 调整大小","C：连接并标记关系","F：聚焦直接关系","E：展开完整内容","A：批注理由；J：跃迁画布"].forEach((text,i)=>makeNode(c2,text,-65,-55+i*66,"#5270d8",elementMode));
  ["双击节点或便签进入编辑","# 标题：建立层级","- [ ] 待办：记录下一步","| 表格 |：对比数据","[链接](https://example.com)：保留出处"].forEach((text,i)=>makeNode(c2,text,390,-55+i*66,"#7890e5",editMode));
  makeNote(c2,"## 一个舒服的顺序\n\n1. 先定结构与视野\n2. 再补连接与判断\n3. 最后把理由写完整",-205,-515,"#dbeafe",330,128,"画布级 → 元素级 → 编辑级，让信息从空间到关系再到表达。","这是推荐的工作节奏。");
  const workflowCard=makeFileCard(c2,workflowFile,390,340,220,58,"这份 Markdown 把下 Dock 的三种模式归到同一条工作流。","展开它，体验完整内容阅读。");
  relate(c2,canvasMode,elementMode,"supports","先有空间结构，再补关系");relate(c2,elementMode,editMode,"causes","展开后进入完整表达");
  relate(c2,workflowCard,opRoot,"evidence","操作说明附件");

  /* 画布三：沿水平主轴展开的鱼骨研究图，展示行业拆解可用的另一种阅读方式。 */
  const c3=makeCanvas("03-示例：商业航天行业研究","fishbone");project.canvases.push(c3);
  const industry=makeNode(c3,"商业航天 · 公开行业研究",-850,-15,"#d78f36",null,"# 商业航天行业研究示例\n\n只使用公开政策、企业公告、行业报告与公开访谈；不包含会议纪要、上会材料、条款或项目专属资料。","示例数据只作行业研究演示。");
  const question=makeNode(c3,"研究问题：增长从哪里来？",-560,-15,"#d78f36",industry,"先定研究问题，再找证据。","研究不是堆资料，而是回答一个问题。");
  const chain=makeNode(c3,"产业链：卫星 · 运载 · 地面应用",-170,-15,"#c97728",industry,"卫星制造、发射服务、地面应用共同构成行业链条。","把产业位置和价值环节分开看。");
  const drivers=makeNode(c3,"公开驱动：需求 · 技术 · 政策",220,-15,"#d78f36",industry,"应用需求、技术成熟和政策支持共同驱动行业。","注意公开信息的时间边界。");
  const risk=makeNode(c3,"风险边界：进度 · 成本 · 监管",610,-15,"#c04a2a",industry,"行业判断必须与发射节奏、资本开支和监管边界一起看。","风险并不等于否定，而是决定要验证什么。");
  ["通信、遥感、导航服务","客户、频次、单位经济"].forEach((text,i)=>makeNode(c3,text,-560,[-185,155][i],"#d78f36",question));
  ["卫星制造","运载与发射","地面站与数据服务"].forEach((text,i)=>makeNode(c3,text,-170,[-200,155,285][i],"#c97728",chain));
  ["低轨星座部署","遥感数据产品化"].forEach((text,i)=>makeNode(c3,text,220,[-185,155][i],"#d78f36",drivers));
  ["发射成功率与供给节奏","资本开支与商业闭环"].forEach((text,i)=>makeNode(c3,text,610,[-185,155][i],"#c04a2a",risk));
  makeNote(c3,"### 公开信息口径\n\n只引用公开政策、企业公告、行业报告与公开访谈。\n\n**不使用：**会议纪要、上会材料、条款、项目专属资料。",-315,325,"#fef3c7",350,128,"教学示例与真实项目材料严格隔离。","商业航天画布仅为公开行业研究示例。");
  const industryCard=makeFileCard(c3,industryFile,70,470,235,58,"教学示例的数据边界与可用公开来源。","这份 Markdown 说明为什么此画布不含保密资料。");
  const webCard=makeFileCard(c3,webFile,450,470,220,58,"公开网页材料示例：网页附件可以在画布中保留，并按需预览或用默认浏览器打开。","外部网页是否允许嵌入由网站自身安全策略决定。");
  relate(c3,question,drivers,"supports","应用需求牵引行业投入");relate(c3,chain,risk,"related","供给节奏影响产业链兑现");
  relate(c3,industryCard,industry,"evidence","公开信息研究口径");relate(c3,webCard,drivers,"evidence","公开网页来源示例");

  /* 新教学画布第一次打开也应直接看到完整结构，不能沿用 {0,0,1}
     而把负坐标元素裁到视口之外。 */
  const frameCanvas=canvas=>{
    const items=canvas.items||[];if(!items.length)return;
    const left=Math.min(...items.map(item=>item.x));
    const top=Math.min(...items.map(item=>item.y));
    const right=Math.max(...items.map(item=>item.x+(item.w||156)));
    const bottom=Math.max(...items.map(item=>item.y+(item.h||44)));
    const pad=100,worldW=Math.max(1,right-left),worldH=Math.max(1,bottom-top);
    const z=clamp(Math.min((Math.max(900,W)-pad*2)/worldW,(Math.max(620,H)-pad*2)/worldH),.32,.9);
    canvas.camera={x:left-(Math.max(900,W)/z-worldW)/2,y:top-(Math.max(620,H)/z-worldH)/2,zoom:z};
  };
  [c1,c2,c3].forEach(frameCanvas);

  state.activeProjectId=state.projects.some(p=>p.id===previousProject)?previousProject:project.id;
  const activeProject=curProject();
  state.activeCanvasId=activeProject&&activeProject.canvases.some(c=>c.id===previousCanvas)?previousCanvas:(activeProject&&activeProject.canvases[0]&&activeProject.canvases[0].id);
  state.selected=null;syncUid();return true;
}

