
"use strict";
/* ============================================================
   常量
============================================================ */
const FONT_PRESETS={
  clear:{label:"界面雅黑",stack:'"Microsoft YaHei UI","PingFang SC","Noto Sans SC","Segoe UI",sans-serif'},
  serif:{label:"书卷宋体",stack:'"Noto Serif SC","Source Han Serif SC","Songti SC","SimSun",serif'},
  handwritten:{label:"手写楷体",stack:'"LXGW WenKai","KaiTi","STKaiti",serif'},
};
let FONT=FONT_PRESETS.clear.stack;
const BRAND_FONT='"STKaiti","KaiTi","Noto Serif SC","Source Han Serif SC",serif';
const TOPBAR_H=50;
const NOTE_COLORS=["#fef3c7","#d1fadf","#dbeafe","#fde2e2","#ede4ff","#ccfbf1","#f5f5f4"];
const LINE_COLORS=["#3a4a6b","#c94a3e","#e0882a","#1fa06a","#2d5fd3","#7a55c0","#9090a0"];
const MIND_COLORS=["#3a4a6b","#2d5fd3","#1fa06a","#7a55c0","#e0882a","#c94a3e"];
const DEFAULT_NOTE_COLOR="#fef3c7";
const DEFAULT_LINE_COLOR="#6e7080";
const RELATION_TYPES={
  related:{label:"关联",color:"#1fa06a",directional:false,dash:[]},
  supports:{label:"支撑",color:"#3a4a6b",directional:true,dash:[]},
  causes:{label:"导致",color:"#e0882a",directional:true,dash:[]},
  contradicts:{label:"反证",color:"#c94a3e",directional:true,dash:[6,4]},
  evidence:{label:"证据",color:"#7a55c0",directional:true,dash:[2,3]},
};

function kindOf(name){
  const ext=(name.split(".").pop()||"").toLowerCase();
  if(["png","jpg","jpeg","gif","svg","webp","bmp","ico","avif"].includes(ext)) return "img";
  if(ext==="pdf") return "pdf";
  if(["txt","md","csv","json","log","html","htm","xml","js","css","py","ts","mdx"].includes(ext)) return "text";
  if(["doc","docx"].includes(ext)) return "doc";
  if(["xls","xlsx"].includes(ext)) return "sheet";
  if(["ppt","pptx"].includes(ext)) return "slide";
  if(["mp3","wav","ogg","mp4","webm","mov"].includes(ext)) return "media";
  return "other";
}
const FILE_ICONS={
  img:'<svg class="ficon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L10 19"/></svg>',
  pdf:'<svg class="ficon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8.5 15.5h.01M12 15.5h2.5M8.5 12.5h.01M12 12.5h2.5"/></svg>',
  doc:'<svg class="ficon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h8"/></svg>',
  sheet:'<svg class="ficon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
  slide:'<svg class="ficon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M3 4h18v12H3z"/><path d="m9 19 3-3 3 3"/></svg>',
  text:'<svg class="ficon" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
  link:'<svg class="ficon" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  media:'<svg class="ficon" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/></svg>',
  other:'<svg class="ficon" viewBox="0 0 24 24" fill="none" stroke="#6e7080" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/></svg>',
};
const KIND_LABEL={img:"图片",pdf:"PDF",doc:"Word",sheet:"表格",slide:"演示",text:"文本",link:"链接",media:"音视频",other:"文件"};
/* CDN 预览组件配置（免费 CDN，非商用） */
const CDN={
  jszip:{url:"https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"},
  docx:{url:"https://cdn.jsdelivr.net/npm/docx-preview@0.3.3/dist/docx-preview.min.js",dep:"jszip"},
  xlsx:{url:"https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"},
  pdfjs:{url:"https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"},
  pdfjsWorker:{url:"https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"},
};

/* ============================================================
   DOM / 状态
============================================================ */
const board=document.getElementById("board");
const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d");
const selbar=document.getElementById("selbar");
const noteEd=document.getElementById("noteEditor");
const noteFormatBar=document.getElementById("noteFormatBar");
const notePreview=document.getElementById("notePreview");
const noteFontSelect=document.getElementById("noteFontSelect");
const noteFontSize=document.getElementById("noteFontSize");
const ctxMenu=document.getElementById("ctxMenu");
const helpPop=document.getElementById("helpPop");
const statBar=document.getElementById("statusbar");
const focusHud=document.getElementById("focusHud");
const toolOptions={innerHTML:"",appendChild:()=>{}}; /* 兼容旧引用 */
const zoomPctEl=document.getElementById("zoomPct");
const sidePanel=document.getElementById("side-panel");
const sideToggle=document.getElementById("side-toggle");
const previewLayer=document.getElementById("previewLayer");
const fileGroups=document.getElementById("file-groups");
const fileInput=document.getElementById("fileInput");
const dropOverlay=document.getElementById("dropOverlay");
const toastEl=document.getElementById("toast");

const TOOLS=[
  {id:"select",label:"选择",key:"V",icon:"select"},
];
const ICON={
  select:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/></svg>',
  hand:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
  mind:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="5" r="2.6"/><circle cx="18" cy="5" r="2.6"/><circle cx="12" cy="13" r="2.6"/><circle cx="6" cy="21" r="2.6"/><circle cx="18" cy="21" r="2.6"/><path d="m8.2 6.6 2.4 4M15.8 6.6l-2.4 4"/><path d="m8.6 19.4 2.6-4.6M15.4 19.4l-2.6-4.6"/></svg>',
  note:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>',
  pen:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>',
  connector:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M9 12h6"/></svg>',
  undo:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5A5.5 5.5 0 0 1 14.5 20H11"/></svg>',
  redo:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/></svg>',
  zoomIn:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>',
  zoomOut:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M8 11h6"/></svg>',
  fit:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  help:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
  copy:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="16" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  trash:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  plus:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  expand:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>',
  collapse:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>',
  folder:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  view:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  close:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  import:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M12 3v12M8 11l4 4 4-4"/></svg>',
  export:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m8 8 4-4 4 4"/><path d="M12 4v12"/></svg>',
  focus:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',
  annotate:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z"/><path d="M9 8h6M9 11h4"/></svg>',
  palette:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="9" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="17" cy="13" r="1.5" fill="currentColor" stroke="none"/></svg>',
  jump:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/><path d="M14 4h6v6"/><path d="m10 14 10-10"/></svg>',
};

let W=0,H=0,dpr=1;
const state={
  tool:"select",
  projects:[],            // [{id,name,files:[],folders:[],canvases:[{id,name,items:[],camera:{},previews:[]}]}]
  activeProjectId:null,
  activeCanvasId:null,
  selected:null,
  spaceDown:false,mouseWorld:{x:0,y:0},
  penSize:3,penColor:LINE_COLORS[0],lineColor:LINE_COLORS[6],noteColor:DEFAULT_NOTE_COLOR,
  mindColor:MIND_COLORS[0],mindMode:"manual",
  hover:null,
  multiSel:[],           /* Shift+点击多选的元素 id 列表 */
  links:[],              /* 自由连接：[{id, aId, bId}] 元素之间的连接线 */
  focusMode:null,        /* 聚焦模式：{id, collapsedBackup:{id:bool}} */
  layoutType:"right",    /* 布局形态：right/radial/both */
  tempTool:null,
  hoveredNodeId:null,
  sideCollapsed:false,
  _respAuto:false,_applyingResize:false,
  filter:"all",
  search:null,
  bgColor:"#fbfbfd",
  bgPattern:"grid",      /* 纹理版式 */
  bgColorName:"default", /* 背景颜色 */
  dark:false,
  fontPreset:"clear",
};
let uid=1,drag=null,renderQueued=false,focusTransition=1,linkPointHover=null;
/* 代理属性：items/camera/files/folders/previews 始终指向当前项目/画布 */
function curProject(){return state.projects.find(p=>p.id===state.activeProjectId)||state.projects[0];}
function curCanvas(){
  const p=curProject();if(!p)return null;
  return p.canvases.find(c=>c.id===state.activeCanvasId)||p.canvases[0]||null;
}
Object.defineProperty(state,"items",{get(){const c=curCanvas();return c?c.items:[];},set(v){const c=curCanvas();if(c)c.items=v;}});
Object.defineProperty(state,"camera",{get(){const c=curCanvas();return c?c.camera:{x:0,y:0,zoom:1};},set(v){const c=curCanvas();if(c)c.camera=v;}});
Object.defineProperty(state,"files",{get(){const p=curProject();return p?p.files:[];},set(v){const p=curProject();if(p)p.files=v;}});
Object.defineProperty(state,"folders",{get(){const p=curProject();return p?p.folders:[];},set(v){const p=curProject();if(p)p.folders=v;}});
Object.defineProperty(state,"previews",{get(){const c=curCanvas();return c?c.previews:[];},set(v){const c=curCanvas();if(c)c.previews=v;}});
Object.defineProperty(state,"links",{get(){const c=curCanvas();return c?c.links||[]:[];},set(v){const c=curCanvas();if(c)c.links=v;}});
/* 确保 uid 大于所有已有 item/file 的 id（避免 id 冲突） */
function syncUid(){
  let max=0;
  const observe=id=>{const n=parseInt(String(id||"").replace(/\D/g,"")||"0");if(n>max)max=n;};
  for(const p of state.projects){
    observe(p.id);
    for(const f of p.files||[])observe(f.id);
    for(const folder of p.folders||[])observe(folder.id);
    for(const c of p.canvases||[]){
      observe(c.id);
      for(const it of c.items||[])observe(it.id);
      for(const link of c.links||[])observe(link.id);
    }
  }
  uid=max+1;
}
/* 项目/画布 CRUD */
function createProject(name){
  const p={id:"p"+(uid++),name:name||"新项目",files:[],folders:[],canvases:[]};
  p.canvases.push({id:"c"+(uid++),name:"主画布",items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[]});
  state.projects.push(p);
  state.activeProjectId=p.id;
  state.activeCanvasId=p.canvases[0].id;
  state.selected=null;
  renderSidePanel();render();saveState();
  return p;
}
function deleteProject(id){
  if(state.projects.length<=1){toast("至少保留一个项目");return;}
  const idx=state.projects.findIndex(p=>p.id===id);if(idx<0)return;
  state.projects.splice(idx,1);
  const np=state.projects[0];
  state.activeProjectId=np.id;
  state.activeCanvasId=np.canvases[0].id;
  state.selected=null;state.search=null;
  renderSidePanel();render();saveState();syncPvDom();
}
function switchProject(id){
  saveCurrentCanvas();
  state.activeProjectId=id;
  const p=curProject();
  state.activeCanvasId=p.canvases[0].id;
  state.selected=null;state.search=null;
  renderSidePanel();render();saveState();syncPvDom();
}
function createCanvas(name){
  const p=curProject();if(!p)return;
  const c={id:"c"+(uid++),name:name||"新画布",items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[]};
  p.canvases.push(c);
  state.activeCanvasId=c.id;
  state.selected=null;
  renderSidePanel();render();saveState();
  return c;
}
function deleteCanvas(id){
  const p=curProject();if(!p)return;
  if(p.canvases.length<=1){toast("至少保留一张画布");return;}
  p.canvases=p.canvases.filter(c=>c.id!==id);
  cleanupProjectReferences();
  state.activeCanvasId=p.canvases[0].id;
  state.selected=null;
  renderSidePanel();render();saveState();syncPvDom();
}
function switchCanvas(id){
  saveCurrentCanvas();
  state.activeCanvasId=id;
  state.selected=null;state.search=null;
  renderSidePanel();render();saveState();syncPvDom();
}
function renameCanvas(id,name){
  const p=curProject();if(!p)return;
  const c=p.canvases.find(c=>c.id===id);
  if(c&&name){c.name=name;renderSidePanel();saveState();}
}
function saveCurrentCanvas(){
  /* items/camera/previews 是代理属性，数据已直接写入 canvas 对象，无需额外操作 */
  /* 清理预览 DOM */
  if(previewLayer)previewLayer.innerHTML="";
}
let editingNoteId=null,editingMindId=null,editingNoteDraftStyle=null;
const undoStack=[],redoStack=[];
const MAX_HISTORY=60;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cloneCanvasState=()=>JSON.parse(JSON.stringify({
  items:state.items,links:state.links,camera:state.camera,previews:state.previews,
}));
function restoreCanvasState(snapshot){
  state.items=snapshot.items||[];
  state.links=snapshot.links||[];
  state.camera=snapshot.camera||{x:0,y:0,zoom:1};
  state.previews=snapshot.previews||[];
  cleanupReferences();
}

function pushHistory(label){
  undoStack.push({state:cloneCanvasState(),label:label||"操作"});
  if(undoStack.length>MAX_HISTORY) undoStack.shift();
  redoStack.length=0;
  syncHistoryBtns();
}
function undo(){
  if(!undoStack.length) return;
  const entry=undoStack.pop();
  redoStack.push({state:cloneCanvasState(),label:entry.label});
  restoreCanvasState(entry.state);
  state.selected=null;
  closeEditor(true);closeMindEditor(true);
  syncHistoryBtns();render();saveState();
  toast("撤销："+entry.label);
}
function redo(){
  if(!redoStack.length) return;
  const entry=redoStack.pop();
  undoStack.push({state:cloneCanvasState(),label:entry.label});
  restoreCanvasState(entry.state);
  state.selected=null;
  closeEditor(true);closeMindEditor(true);
  syncHistoryBtns();render();saveState();
  toast("重做："+entry.label);
}
function syncHistoryBtns(){
  document.getElementById("undoBtn").style.opacity=undoStack.length?1:.4;
  document.getElementById("redoBtn").style.opacity=redoStack.length?1:.4;
}
/* 视口坐标 → 画布内坐标（canvas 定位在 left:sidebar / top:topbar 内） */
function boardXY(clientX,clientY){
  const r=canvas.getBoundingClientRect();
  return {x:clientX-r.left, y:clientY-r.top};
}

/* 坐标变换 */
const s2w=(sx,sy)=>({x:state.camera.x+sx/state.camera.zoom,y:state.camera.y+sy/state.camera.zoom});
const w2s=(wx,wy)=>({x:(wx-state.camera.x)*state.camera.zoom,y:(wy-state.camera.y)*state.camera.zoom});

function resize(){
  dpr=window.devicePixelRatio||1;
  W=board.clientWidth;H=board.clientHeight;
  if(W<=0||H<=0){W=window.innerWidth-(state.sideCollapsed?44:270);H=window.innerHeight-52;}
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  canvas.style.width=W+"px";canvas.style.height=H+"px";
  applyResponsive();
  render();
}
/* 多长宽比适配：窄屏/竖屏自动折叠侧栏，宽且充足时恢复 */
function applyResponsive(){
  if(state._applyingResize) return;
  state._applyingResize=true;
  const vw=window.innerWidth,vh=window.innerHeight;
  const narrow=vw<900||(vw<vh&&vw<1000);
  if(narrow&&!state.sideCollapsed){
    state.sideCollapsed=true;
    applySide();
  }else if(!narrow&&state.sideCollapsed&&state._respAuto){
    /* 仅在"自动折叠"恢复范围内放开，用户手动折叠不受影响 */
    state.sideCollapsed=false;
    state._respAuto=false;
    applySide();
  }
  if(narrow) state._respAuto=true;
  state._applyingResize=false;
}
function zoomAt(sx,sy,factor){
  const nz=clamp(state.camera.zoom*factor,0.15,4);
  const wx=state.camera.x+sx/state.camera.zoom;
  const wy=state.camera.y+sy/state.camera.zoom;
  state.camera.zoom=nz;state.camera.x=wx-sx/nz;state.camera.y=wy-sy/nz;
  if(zoomPctEl) zoomPctEl.textContent=Math.round(nz*100)+"%";
  render();
}
function fitAll(){
  const b=boundsOfItems();if(!b) return;
  const pad=80;
  const z=clamp(Math.min((W-pad*2)/Math.max(1,b.w),(H-pad*2)/Math.max(1,b.h)),0.15,1.6);
  state.camera.zoom=z;
  state.camera.x=b.x-(W/z-b.w)/2;
  state.camera.y=b.y-(H/z-b.h)/2;
  zoomPctEl.textContent=Math.round(z*100)+"%";
  render();
}
function boundsOfItems(){
  let b=null;
  for(const it of state.items){const ib=itemBounds(it);if(!ib) continue;b=b?union(b,ib):ib;}
  if(!b) b={x:-320,y:-240,w:640,h:480};
  return b;
}
function union(a,b){
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
  const x2=Math.max(a.x+a.w,b.x+b.w),y2=Math.max(a.y+a.h,b.y+b.h);
  return{x,y,w:x2-x,h:y2-y};
}
function itemBounds(it){
  if(!it) return null;
  if(it.type==="link"){
    /* 连接线 bounds = 两端中点合并 */
    const a=state.items.find(i=>i.id===it.aId),b=state.items.find(i=>i.id===it.bId);
    if(!a||!b)return null;
    const ab=itemBounds(a),bb=itemBounds(b);
    const x1=Math.min(ab.x+ab.w/2,bb.x+bb.w/2);
    const x2=Math.max(ab.x+ab.w/2,bb.x+bb.w/2);
    const y1=Math.min(ab.y+ab.h/2,bb.y+bb.h/2);
    const y2=Math.max(ab.y+ab.h/2,bb.y+bb.h/2);
    return{x:x1,y:y1,w:x2-x1,h:y2-y1};
  }
  if(it.type==="note") return{x:it.x,y:it.y,w:it.w,h:it.h};
  if(it.type==="mindNode"){
    let w=it.w||130,h=it.h||40;
    const depth=nodeDepth(it);
    const fontSz=depth===0?"14px ":depth===1?"13px ":"12.5px ";
    const fontW=depth===0?"700 ":depth===1?"600 ":"500 ";
    ctx.font=fontW+fontSz+FONT;
    w=Math.max(w,ctx.measureText(it.text||"").width+42);
    return{x:it.x,y:it.y,w,h};
  }
  if(it.type==="fileCard"){
    let w=it.w||160,h=it.h||52;
    /* 形变预览态：直接用当前动画尺寸（不做缩略图自适应覆盖） */
    if(it.previewOpen) return{x:it.x,y:it.y,w,h};
    if(it.kind==="img"&&it.tw&&it.th){
      /* 图片按实际长宽比自适应 */
      const maxW=200,maxH=160;
      const asp=it.tw/it.th;
      if(asp>1){w=maxW;h=Math.min(maxH,maxW/asp);}
      else{h=maxH;w=Math.min(maxW,maxH*asp);}
    }
    return{x:it.x,y:it.y,w,h};
  }
  if(it.type==="stroke"){
    if(!it.points.length) return null;
    let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
    for(const p of it.points){if(p.x<x1)x1=p.x;if(p.x>x2)x2=p.x;if(p.y<y1)y1=p.y;if(p.y>y2)y2=p.y;}
    return{x:x1-it.size,y:y1-it.size,w:x2-x1+it.size*2,h:y2-y1+it.size*2};
  }
  if(it.type==="connector"){
    const a=resolveEnd(it.a),b=resolveEnd(it.b);
    return{x:Math.min(a.x,b.x)-12,y:Math.min(a.y,b.y)-12,w:Math.abs(b.x-a.x)+24,h:Math.abs(b.y-a.y)+24};
  }
  return null;
}
function requestRender(){
  if(renderQueued) return;
  renderQueued=true;
  requestAnimationFrame(()=>{renderQueued=false;render();});
}

/* ============================================================
   渲染
============================================================ */
function render(){
  if(W<=0||H<=0){W=board.clientWidth||1;H=board.clientHeight||1;}
  const z=state.camera.zoom;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);
  /* 先算出 bgColor（确保和 bgColorName 同步） */
  const _dark=state.dark;
  const _BCM={default:_dark?"#1a1a2e":"#ffffff",eye:_dark?"#1a2a1e":"#c8e6c9",cream:_dark?"#2a2a20":"#fff8e1",blue:_dark?"#1a2030":"#e3f2fd",kraft:_dark?"#2a2218":"#f4ecd8"};
  state.bgColor=_BCM[state.bgColorName]||(_dark?"#1a1a2e":"#ffffff");
  ctx.fillStyle=state.bgColor;ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.translate(-state.camera.x*z,-state.camera.y*z);
  ctx.scale(z,z);
  drawGrid(z);
  /* 聚焦模式：计算分层 */
  let focusPrimary=null,focusSecondary=null,focusId=null;
  if(state.focusMode){
    focusId=state.focusMode.id;
    focusPrimary=getRelated(focusId);
    focusSecondary=getSecondary(focusId,focusPrimary);
  }
  drawMindConnections(focusPrimary);
  drawLinks(focusPrimary);
  const sel=selectedItem();
  const filterOk=it=>{
    if(state.filter==="all") return true;
    const f=state.filter;
    if(f==="mind") return it.type==="mindNode";
    if(f==="note") return it.type==="note";
    if(f==="file") return it.type==="fileCard";
    if(f==="pen") return it.type==="stroke"||it.type==="connector";
    return true;
  };
  /* 聚焦模式：过渡期间非关联元素渐隐，完成后不画 */
  if(focusId!==null){
    /* 过渡期间：非关联元素用淡出 alpha 绘制 */
    if(focusTransition<1){
      ctx.save();
      ctx.globalAlpha=1-focusTransition;
      for(const it of state.items){
        if(!focusPrimary.has(it.id)&&it.id!==focusId&&filterOk(it)){
          drawItem(it);
        }
      }
      ctx.restore();
    }
    /* 直接关联：正常显示，但只给轻量关联光晕。 */
    ctx.save();
    for(const it of state.items){
      if(focusPrimary.has(it.id)&&it.id!==focusId&&filterOk(it)){
        drawItem(it);
        /* 高亮边框 */
        const b=itemBounds(it);if(b){
          ctx.save();
          ctx.lineWidth=3/z;ctx.strokeStyle=it.type==="mindNode"?"rgba(58,74,107,.6)":"rgba(52,199,89,.6)";
          ctx.shadowColor="rgba(58,74,107,.3)";ctx.shadowBlur=12/z;
          roundRectPath(ctx,b.x-2/z,b.y-2/z,b.w+4/z,b.h+4/z,10);ctx.stroke();
          ctx.restore();
        }
      }
    }
    ctx.restore();
    /* 焦点：放大+发光 */
    ctx.save();
    const focusIt=state.items.find(i=>i.id===focusId);
    if(focusIt&&filterOk(focusIt)){
      const fb=itemBounds(focusIt);
      if(fb){
        ctx.save();
        const cx=fb.x+fb.w/2,cy=fb.y+fb.h/2;
        ctx.translate(cx,cy);
        ctx.scale(1.15,1.15);
        ctx.translate(-cx,-cy);
        drawItem(focusIt);
        ctx.restore();
        /* 发光描边 */
        ctx.save();
        ctx.lineWidth=4/z;ctx.strokeStyle="#3a4a6b";
        ctx.shadowColor="rgba(58,74,107,.5)";ctx.shadowBlur=20/z;
        roundRectPath(ctx,fb.x-3/z,fb.y-3/z,fb.w+6/z,fb.h+6/z,10);ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    /* 与焦点直接关联的画笔/锚定连线才保留。 */
    for(const it of state.items){
      if(it.type==="stroke"||it.type==="connector"){
        if(focusPrimary.has(it.id)&&filterOk(it)) drawItem(it);
      }
    }
  }else{
    /* 普通模式 */
    /* 空画布引导 */
    if(state.items.length===0&&!state.focusMode){
      const cx=state.camera.x+W/(2*z),cy=state.camera.y+H/(2*z);
      ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";
      /* 织纹背景 — 交织斜线隐喻纺织 */
      const weave=200/z;
      ctx.save();ctx.globalAlpha=state.dark?.04:.035;
      ctx.strokeStyle=state.dark?"#5b7bc4":"#3a4a6b";ctx.lineWidth=1/z;
      for(let i=-3;i<=3;i++){
        ctx.beginPath();
        ctx.moveTo(cx+i*weave*.7-50/z,cy-50/z);
        ctx.lineTo(cx+i*weave*.7+50/z,cy+50/z);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx-i*weave*.7-50/z,cy-50/z);
        ctx.lineTo(cx-i*weave*.7+50/z,cy+50/z);
        ctx.stroke();
      }
      ctx.restore();
      /* 装饰圆环 */
      ctx.save();ctx.globalAlpha=state.dark?.1:.08;
      ctx.strokeStyle=state.dark?"#5b7bc4":"#3a4a6b";ctx.lineWidth=1.5/z;
      ctx.beginPath();ctx.arc(cx,cy-28/z,38/z,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=state.dark?.05:.04;ctx.lineWidth=1/z;
      ctx.beginPath();ctx.arc(cx,cy-28/z,52/z,0,Math.PI*2);ctx.stroke();
      ctx.restore();
      /* 大号品牌字 — 用楷体增强文化感 */
      ctx.font="700 42px "+BRAND_FONT;
      ctx.globalAlpha=state.dark?.22:.18;
      ctx.fillStyle=state.dark?"#7b9bd4":"#3a4a6b";
      ctx.fillText("织",cx,cy-28/z);
      /* 提示文字 */
      ctx.font="600 14px "+FONT;ctx.globalAlpha=state.dark?.55:.45;
      ctx.fillStyle=state.dark?"#98989d":"#6e6e73";
      ctx.fillText("双击任意位置开始织网",cx,cy+22/z);
      ctx.font="400 11px "+FONT;ctx.globalAlpha=state.dark?.4:.35;
      ctx.fillStyle=state.dark?"#98989d":"#a0a2b0";
      ctx.fillText("或从左侧材料库拖入文件 · 导入材料后拖到画布",cx,cy+42/z);
      ctx.restore();
    }
    for(const it of state.items){
      if(it.type!=="mindNode"&&filterOk(it)) drawItem(it);
    }
    for(const it of state.items){
      if(it.type==="mindNode"&&isMindNodeVisible(it)&&filterOk(it)) drawItem(it);
    }
  }
  /* 选中框/手柄叠加在内容之上 */
  if(sel&&filterOk(sel)&&(sel.type!=="mindNode"||isMindNodeVisible(sel))) drawSelection(sel);
  if(state.multiSel.length) drawMultiSel();
  /* 拖动/缩放期间不画 hover 框，避免框停在旧位置造成"漂移"观感 */
  if(state.hover && state.hover.id&&(!sel||state.hover.id!==sel.id)&&!drag){
    const hov=state.items.find(x=>x.id===state.hover.id);
    if(hov&&filterOk(hov)&&(hov.type!=="mindNode"||isMindNodeVisible(hov))){
      const hb=itemBounds(hov);
      if(hb){
        ctx.save();
        /* hover 预发光：极淡背景光晕 */
        if(hov.type==="mindNode"||hov.type==="note"){
          ctx.shadowColor=hov.type==="mindNode"?"rgba(58,74,107,.15)":"rgba(255,255,255,.3)";
          ctx.shadowBlur=14/z;
          ctx.fillStyle="rgba(58,74,107,.04)";
          roundRectPath(ctx,hb.x,hb.y,hb.w,hb.h,hov.type==="mindNode"?10:6);ctx.fill();
          ctx.shadowColor="transparent";
        }
        ctx.lineWidth=2/z;
        ctx.strokeStyle=hov.type==="mindNode"?"#3a4a6b":"rgba(60,60,67,.45)";
        if(hov.type==="mindNode"){ctx.setLineDash([]);ctx.shadowColor="rgba(58,74,107,.35)";ctx.shadowBlur=10/z;}
        else ctx.setLineDash([5/z,4/z]);
        roundRectPath(ctx,hb.x-3/z,hb.y-3/z,hb.w+6/z,hb.h+6/z,hov.type==="mindNode"?10:8);
        ctx.stroke();
        ctx.restore();
        /* hover 到含 detail 的元素时，在右上角显示文档图标提示 */
        if(hov.detail&&!state.focusMode){
          ctx.save();
          ctx.font=(10/z)+"px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
          ctx.fillStyle="rgba(58,74,107,.5)";
          ctx.fillText("📄",hb.x+hb.w-6/z,hb.y-10/z);
          ctx.restore();
        }
      }
    }
  }
  /* 搜索高亮 */
  if(state._hlIds){
    const curId=state.search?state.search.results[state.search.idx]:null;
    /* 聚焦模式下的非关联元素，淡出且不画搜索高亮 */
    const focusRel=state.focusMode?getRelated(state.focusMode.id):null;
    for(const id of state._hlIds){
      const it=state.items.find(x=>x.id===id);
      if(!it||!filterOk(it)) continue;
      if(state.focusMode&&focusRel&&!focusRel.has(id))continue;
      const hb=itemBounds(it);
      if(!hb) continue;
      ctx.save();
      if(id===curId){
        ctx.strokeStyle="#c48840";ctx.lineWidth=2.6/z;
        ctx.shadowColor="rgba(255,159,10,.6)";ctx.shadowBlur=16/z;
      }else{
        ctx.strokeStyle="rgba(255,159,10,.55)";ctx.lineWidth=1.8/z;
      }
      ctx.setLineDash([5/z,4/z]);
      roundRectPath(ctx,hb.x-4/z,hb.y-4/z,hb.w+8/z,hb.h+8/z,12);
      ctx.stroke();
      ctx.restore();
    }
  }
  /* hover 节点时，高亮其关联物（便签/材料） */
  if(state.hover&&state.hover.type==="mindNode"){
    const n=state.items.find(x=>x.id===state.hover.id);
    /* （已移除：hover 节点时高亮其关联物的虚线框） */
  }
  if(drag){
    /* （已移除：拖动便签时的所有节点可挂接虚线提示） */
    if(drag.mode==="pen"&&drag.points.length>1){
      ctx.strokeStyle=state.penColor;ctx.lineWidth=state.penSize;
      ctx.lineCap="round";ctx.lineJoin="round";
      ctx.beginPath();
      drag.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.stroke();
    }
    if(drag.mode==="connector"){
      const a=resolveEnd(drag.a),b=resolveEnd(drag.b);
      drawConnectorLine(ctx,a,b,state.lineColor,Math.max(1.5,state.penSize),true);
    }
    /* （已移除：拖入节点时的 ⊕ 关联角标提示） */
    if(drag.mode==="mindLink"){
      const fb=itemBounds(drag.from);
      const fa={x:fb.x+fb.w,y:fb.y+fb.h/2};
      const tb=drag.to;
      ctx.save();
      ctx.strokeStyle="#3a4a6b";ctx.lineWidth=2/z;ctx.lineCap="round";
      ctx.setLineDash([8/z,5/z]);
      ctx.beginPath();ctx.moveTo(fa.x,fa.y);
      const mx=(fa.x+tb.x)/2;
      ctx.bezierCurveTo(mx,fa.y,mx,tb.y,tb.x,tb.y);
      ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle="#3a4a6b";
      ctx.beginPath();ctx.arc(tb.x,tb.y,5/z,0,7);ctx.fill();
      ctx.restore();
      if(drag.target){
        const tgb=itemBounds(drag.target);
        ctx.save();
        ctx.lineWidth=2.5/z;ctx.strokeStyle="#3a4a6b";
        ctx.shadowColor="rgba(58,74,107,.5)";ctx.shadowBlur=12/z;
        roundRectPath(ctx,tgb.x-4/z,tgb.y-4/z,tgb.w+8/z,tgb.h+8/z,12);ctx.stroke();
        ctx.fillStyle="#3a4a6b";ctx.font=(11/z)+"px sans-serif";ctx.textAlign="center";
        ctx.fillText("设为子节点",tgb.x+tgb.w/2,tgb.y-8/z);
        ctx.restore();
      }
    }
  }
  ctx.restore();
  /* 连接点 hover tooltip */
  if(linkPointHover){
    const node=state.items.find(i=>i.id===linkPointHover);
    if(node){
      const b=itemBounds(node);
      const lx=b.x+b.w,ly=b.y+b.h/2;
      ctx.save();
      ctx.font="600 "+(10/z)+"px "+FONT;
      const label="拖出建立子节点";
      const tw=ctx.measureText(label).width;
      const pad=6/z,lh=16/z;
      ctx.fillStyle=state.dark?"rgba(28,28,30,.92)":"rgba(255,255,255,.92)";
      ctx.shadowColor="rgba(0,0,0,.15)";ctx.shadowBlur=6/z;
      roundRectPath(ctx,lx+8/z,ly-lh/2,tw+pad*2,lh,lh/2);ctx.fill();
      ctx.shadowColor="transparent";
      ctx.fillStyle="#3a4a6b";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(label,lx+8/z+tw/2+pad,ly);
      ctx.restore();
    }
  }
  updateSelBar();updateStatusBar();updateFocusHud();
  syncPvDom();
}
function updateFocusHud(){
  if(!state.focusMode){focusHud.classList.remove("show");return;}
  const item=state.items.find(i=>i.id===state.focusMode.id);
  if(!item){focusHud.classList.remove("show");return;}
  const related=getRelated(item.id);
  focusHud.querySelector("strong").textContent=item.text||"未命名元素";
  focusHud.querySelector(".focus-meta").textContent="直接关系 "+Math.max(0,related.size-1)+" 个";
  focusHud.classList.add("show");
}
focusHud.querySelector("button").addEventListener("click",()=>exitFocus());
function drawGrid(z){
  const dark=state.dark;
  const pat=state.bgPattern||"grid";
  /* 背景颜色：独立于纹理，用户可选 */
  const BG_COLOR_MAP={
    default:dark?"#1a1a2e":"#ffffff",
    eye:dark?"#1a2a1e":"#c8e6c9",
    cream:dark?"#2a2a20":"#fff8e1",
    blue:dark?"#1a2030":"#e3f2fd",
    kraft:dark?"#2a2218":"#f4ecd8",
  };
  /* 纯色背景不需要纹理 */
  if(pat==="blank") return;
  let step=20;while(step*z<16) step*=2;
  const i0x=Math.floor(state.camera.x/step),i0y=Math.floor(state.camera.y/step);
  const i1x=Math.ceil((state.camera.x+W/z)/step),i1y=Math.ceil((state.camera.y+H/z)/step);
  const fine=dark?"rgba(120,140,180,.06)":"rgba(58,74,107,.04)";
  const bold=dark?"rgba(120,140,180,.1)":"rgba(58,74,107,.08)";
  if(pat==="grid"||pat==="dots"){
    if(pat==="dots"){
      ctx.fillStyle=fine;
      for(let i=i0x;i<=i1x;i++)for(let j=i0y;j<=i1y;j++){
        if(i%5===0&&j%5===0) continue;
        ctx.beginPath();ctx.arc(i*step,j*step,0.8,0,7);ctx.fill();
      }
      ctx.fillStyle=bold;
      for(let i=Math.floor(i0x/5)*5;i<=i1x;i+=5)for(let j=Math.floor(i0y/5)*5;j<=i1y;j+=5){
        ctx.beginPath();ctx.arc(i*step,j*step,1.2,0,7);ctx.fill();
      }
    }else{
      ctx.lineWidth=1;ctx.strokeStyle=fine;
      ctx.beginPath();
      for(let i=i0x;i<=i1x;i++){if(i%5===0)continue;ctx.moveTo(i*step,i0y*step);ctx.lineTo(i*step,i1y*step);}
      for(let j=i0y;j<=i1y;j++){if(j%5===0)continue;ctx.moveTo(i0x*step,j*step);ctx.lineTo(i1x*step,j*step);}
      ctx.stroke();
      ctx.strokeStyle=bold;
      ctx.beginPath();
      for(let i=Math.floor(i0x/5);i<=Math.ceil(i1x/5);i++){ctx.moveTo(i*step*5,i0y*step);ctx.lineTo(i*step*5,i1y*step);}
      for(let j=Math.floor(i0y/5);j<=Math.ceil(i1y/5);j++){ctx.moveTo(i0x*step,j*step*5);ctx.lineTo(i1x*step,j*step*5);}
      ctx.stroke();
    }
  }else if(pat==="lines"){
    /* 横格线 */
    ctx.lineWidth=1;ctx.strokeStyle=fine;
    ctx.beginPath();
    for(let j=i0y;j<=i1y;j++){ctx.moveTo(i0x*step,j*step);ctx.lineTo(i1x*step,j*step);}
    ctx.stroke();
  }else if(pat==="kraft"||pat==="paper"){
    /* 草稿纸/牛皮纸：横格 + 左侧红色竖线 */
    ctx.lineWidth=1;ctx.strokeStyle=fine;
    ctx.beginPath();
    for(let j=i0y;j<=i1y;j++){ctx.moveTo(i0x*step,j*step);ctx.lineTo(i1x*step,j*step);}
    ctx.stroke();
    /* 左侧茜红竖线 — 染料色系 */
    ctx.strokeStyle=dark?"rgba(180,100,110,.35)":"rgba(138,74,90,.2)";
    ctx.lineWidth=1.5;
    const marginX=Math.ceil(state.camera.x/step)*step;
    ctx.beginPath();ctx.moveTo(marginX,i0y*step);ctx.lineTo(marginX,i1y*step);ctx.stroke();
  }
  /* 径向晕影：中心明亮、边缘渐暗，营造空间感 */
  const cx=state.camera.x+W/(2*z),cy=state.camera.y+H/(2*z);
  const rmax=Math.max(W,H)/(2*z)*1.3;
  const vg=ctx.createRadialGradient(cx,cy,0,cx,cy,rmax);
  vg.addColorStop(0,dark?"rgba(80,100,140,.025)":"rgba(58,74,107,.02)");
  vg.addColorStop(.6,dark?"rgba(0,0,0,0)":"rgba(0,0,0,0)");
  vg.addColorStop(1,dark?"rgba(0,0,0,.15)":"rgba(0,0,0,.04)");
  ctx.fillStyle=vg;
  ctx.fillRect(state.camera.x,state.camera.y,W/z,H/z);
}

/* 导图连线（柔色 + 渐变生长动画） */
function drawMindConnections(scope){
  const z=state.camera.zoom;
  const now=performance.now();
  const nodes=state.items.filter(it=>it.type==="mindNode"&&it.parentId);
  for(const ch of nodes){
    const p=state.items.find(it=>it.type==="mindNode"&&it.id===ch.parentId);
    if(!p||!isMindNodeVisible(ch)||!isMindNodeVisible(p)) continue;
    if(scope&&(!scope.has(ch.id)||!scope.has(p.id))) continue;
    const pa=nodeAnchorR(p),cb=nodeAnchorL(ch);
    const isSel=state.selected===ch.id||state.selected===p.id;
    /* 生长动画 */
    let grow=1;
    if(ch.birth){
      const t=(now-ch.birth)/420;
      if(t<1){ grow=Math.max(.02,1-Math.pow(1-t,3)); }else{ ch.birth=null; }
    }
    if(grow<1){
      const ex=pa.x+(cb.x-pa.x)*grow, ey=pa.y+(cb.y-pa.y)*grow;
      ctx.save();
      const g=ctx.createLinearGradient(pa.x,pa.y,ex,ey);
      g.addColorStop(0,p.color);g.addColorStop(1,ch.color);
      ctx.strokeStyle=g;
      ctx.globalAlpha=isSel?.7:.45;
      ctx.lineWidth=2/z;ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(pa.x,pa.y);
      const mx=(pa.x+ex)/2;
      ctx.bezierCurveTo(mx,pa.y,mx,ey,ex,ey);
      ctx.stroke();
      ctx.restore();
    }else{
      ctx.save();
      const g=ctx.createLinearGradient(pa.x,pa.y,cb.x,cb.y);
      g.addColorStop(0,p.color);g.addColorStop(1,ch.color);
      ctx.strokeStyle=g;
      ctx.globalAlpha=isSel?.75:.48;
      ctx.lineWidth=(isSel?2.2:1.8)/z;ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(pa.x,pa.y);
      const mx=(pa.x+cb.x)/2;
      ctx.bezierCurveTo(mx,pa.y,mx,cb.y,cb.x,cb.y);
      ctx.stroke();
      /* 丝质高光 — 在主线上叠加一层极细白光，模拟丝线光泽 */
      ctx.globalAlpha=isSel?.25:.15;
      ctx.strokeStyle=dc("#ffffff","#ffffff");
      ctx.lineWidth=0.6/z;
      ctx.stroke();
      ctx.restore();
      /* 选中节点的连线上画流动光点 — "织"的视觉隐喻 */
      if(isSel&&!state.focusMode){
        const t=(now%2000)/2000;
        const mt=1-t;
        const bx=mt*mt*mt*pa.x+3*mt*mt*t*mx+3*mt*t*t*mx+t*t*t*cb.x;
        const by=mt*mt*mt*pa.y+3*mt*mt*t*pa.y+3*mt*t*t*cb.y+t*t*t*cb.y;
        ctx.save();
        ctx.fillStyle=ch.color;ctx.globalAlpha=.6*(1-t);
        ctx.shadowColor=ch.color;ctx.shadowBlur=8/z;
        ctx.beginPath();ctx.arc(bx,by,3/z,0,7);ctx.fill();
        ctx.fillStyle="#fff";ctx.globalAlpha=.8*(1-t*.5);
        ctx.beginPath();ctx.arc(bx,by,1.5/z,0,7);ctx.fill();
        ctx.restore();
        if(t>.1)requestRender();
      }
    }
  }
}
function nodeAnchorR(n){const b=itemBounds(n);return{x:b.x+b.w,y:b.y+detailBaseHeight(n,b)/2};}
function nodeAnchorL(n){const b=itemBounds(n);return{x:b.x,y:b.y+detailBaseHeight(n,b)/2};}
/* 子树节点总数（含自身） */
function subtreeCount(n){
  let cnt=0;
  (function walk(x){
    cnt++;
    (x.children||[]).forEach(c=>{const ci=state.items.find(i=>i.id===c);if(ci)walk(ci);});
  })(n);
  return cnt;
}
/* 节点层级深度：根=0，子=1，孙=2... */
function nodeDepth(n){
  let d=0,p=n;
  while(p&&p.parentId){d++;p=state.items.find(i=>i.id===p.parentId);}
  return d;
}
/* 折叠的是一个子树：节点本身保留，所有后代都不参与绘制和命中。 */
function isMindNodeVisible(n){
  if(!n||n.type!=="mindNode")return true;
  const seen=new Set();let parentId=n.parentId;
  while(parentId&&!seen.has(parentId)){
    seen.add(parentId);
    const parent=state.items.find(it=>it.type==="mindNode"&&it.id===parentId);
    if(!parent)return true;
    if(parent.collapsed)return false;
    parentId=parent.parentId;
  }
  return true;
}

function drawItem(it){
  /* 编辑态由 DOM 编辑器接管，避免画布中的原便签与预览重叠。 */
  if((it.type==="note"&&it.id===editingNoteId)||(it.type==="mindNode"&&it.id===editingMindId)) return;
  /* 拖拽时元素半透明（幽灵效果） */
  const isDragging=drag&&drag.mode==="move"&&drag.item&&(drag.item.id===it.id||state.multiSel.includes(it.id));
  if(isDragging) ctx.globalAlpha=.6;
  /* 出生弹入动画：新元素 380ms 内从 0.6 弹性放大到 1 */
  let popScale=1;
  if(it.birth){
    const t=(performance.now()-it.birth)/380;
    if(t<1){
      const e=1-Math.pow(1-t,3);
      popScale=0.6+0.4*e+(t<0.6?Math.sin(t*Math.PI*2.5)*0.06:0);
    }else{ it.birth=null; }
  }
  if(popScale!==1){
    const b=itemBounds(it);
    if(b){
      ctx.save();
      ctx.translate(b.x+b.w/2,b.y+b.h/2);
      ctx.scale(popScale,popScale);
      ctx.translate(-(b.x+b.w/2),-(b.y+b.h/2));
    }
  }
  if(it.type==="note") drawNote(it);
  else if(it.type==="stroke") drawStroke(it);
  else if(it.type==="connector") drawConnector(it);
  else if(it.type==="mindNode") drawMindNode(it);
  else if(it.type==="fileCard") drawFileCard(it);
  if(popScale!==1) ctx.restore();
  if(isDragging) ctx.globalAlpha=1;
}
function roundRectPath(c,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  c.beginPath();
  c.moveTo(x+rr,y);c.arcTo(x+w,y,x+w,y+h,rr);c.arcTo(x+w,y+h,x,y+h,rr);c.arcTo(x,y+h,x,y,rr);c.arcTo(x,y,x+w,y,rr);
  c.closePath();
}
function wrapLines(c,text,maxW){
  const lines=[];
  for(const para of String(text).split("\n")){
    let line="";
    for(const ch of para){
      const t=line+ch;
      if(c.measureText(t).width>maxW&&line){lines.push(line);line=ch;}
      else line=t;
    }
    if(line) lines.push(line);
  }
  return lines.length?lines:[""];
}
function truncateStr(s,maxW){
  if(!s) return "";
  ctx.font="600 12px "+FONT;
  if(ctx.measureText(s).width<=maxW) return s;
  let out=s;
  while(out.length>1&&ctx.measureText(out+"…").width>maxW) out=out.slice(0,-1);
  return out+"…";
}
function hostOf(u){try{const x=new URL(u);return x.hostname;}catch(e){return u;}}
function isSafePreviewUrl(value){try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:";}catch(e){return false;}}
function cameraZ(){return state.camera.zoom;}
function escapeHtml(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function markdownInlineText(s){return String(s).replace(/!\[([^\]]*)\]\([^)]*\)/g,"$1").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/(\*\*|__|`|\*|_)/g,"");}
function markdownInlineHtml(s){return escapeHtml(s).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/__([^_]+)__/g,"<u>$1</u>").replace(/\*([^*]+)\*/g,"<em>$1</em>");}
function markdownLines(text){
  return String(text||"").split("\n").map(raw=>{
    let m=raw.match(/^(#{1,3})\s+(.*)$/);if(m)return{text:markdownInlineText(m[2]),kind:"h"+m[1].length};
    m=raw.match(/^\s*[-*+]\s+(?:\[([ xX])\]\s*)?(.*)$/);if(m)return{text:(m[1]?"☑ ":"• ")+markdownInlineText(m[2]),kind:"bullet"};
    m=raw.match(/^>\s?(.*)$/);if(m)return{text:"│ "+markdownInlineText(m[1]),kind:"quote"};
    return{text:markdownInlineText(raw),kind:"text"};
  });
}
function markdownToHtml(text){
  return String(text||"").split("\n").map(raw=>{
    let m=raw.match(/^(#{1,3})\s+(.*)$/);if(m)return"<h"+m[1].length+">"+markdownInlineHtml(m[2])+"</h"+m[1].length+">";
    m=raw.match(/^\s*[-*+]\s+(?:\[([ xX])\]\s*)?(.*)$/);if(m)return"<ul><li>"+(m[1]?(m[1].toLowerCase()==="x"?"☑ ":"☐ "):"")+markdownInlineHtml(m[2])+"</li></ul>";
    m=raw.match(/^>\s?(.*)$/);if(m)return"<blockquote>"+markdownInlineHtml(m[1])+"</blockquote>";
    return raw?"<p>"+markdownInlineHtml(raw)+"</p>":"<p>&nbsp;</p>";
  }).join("");
}
function noteTypography(it){
  const family=(it.fontFamily&&FONT_PRESETS[it.fontFamily]?FONT_PRESETS[it.fontFamily].stack:FONT);
  return{family,size:clamp(Number(it.fontSize)||13,10,28),underline:!!it.underline,bold:!!it.bold};
}
function formatSize(n){if(!n)return"";if(n<1024)return n+" B";if(n<1048576)return(n/1024).toFixed(1)+" KB";return(n/1048576).toFixed(1)+" MB";}

/* ---------- 便签 ---------- */
function drawNote(it,cc){
  const c=cc||ctx;const{x,y,w,h}=it;
  const coreH=detailBaseHeight(it,{x,y,w,h});
  const z=state.camera.zoom;
  const sel=it.id===state.selected;
  /* 立体感：外层柔和投影（纸感悬浮）+ 内层接触阴影 */
  c.save();
  c.shadowColor=sel?"rgba(58,74,107,.38)":"rgba(15,23,42,.18)";
  c.shadowBlur=(sel?16:10)/z;c.shadowOffsetY=(sel?4:3)/z;
  roundRectPath(c,x,y,w,h,7);
  c.fillStyle=state.dark?darkenColor(it.color,0.4):it.color;
  c.fill();
  c.restore();
  /* 描边：显著提升与背景的区分度 */
  c.save();
  roundRectPath(c,x,y,w,h,7);
  c.strokeStyle=state.dark?"rgba(255,255,255,.16)":"rgba(0,0,0,.13)";
  c.lineWidth=1/z;c.stroke();
  c.restore();
  /* 顶部高光：纵向渐变模拟自然光线 */
  c.save();
  roundRectPath(c,x,y,w,h,7);c.clip();
  const hg=c.createLinearGradient(x,y,x,y+Math.min(14,coreH/3));
  hg.addColorStop(0,"rgba(255,255,255,.24)");
  hg.addColorStop(1,"rgba(255,255,255,0)");
  c.fillStyle=hg;c.fillRect(x,y,w,Math.min(14,coreH/3));
  /* 底部微暗：纸张厚度感 */
  const bg=c.createLinearGradient(x,y+h-8,x,y+h);
  bg.addColorStop(0,"rgba(0,0,0,0)");
  bg.addColorStop(1,"rgba(0,0,0,.06)");
  c.fillStyle=bg;c.fillRect(x,y+h-8,w,8);
  c.restore();
  /* 选中态描边 */
  if(sel){
    c.save();
    /* 立体高亮：外圈柔光 + 品牌亮色细描边（不再用深色实线） */
    const HL=state.dark?"#8fb0e8":"#2d5fd3";
    c.shadowColor=state.dark?"rgba(143,176,232,.75)":"rgba(45,95,211,.55)";
    c.shadowBlur=14/z;
    c.strokeStyle=HL;c.lineWidth=2/z;
    roundRectPath(c,x-2/z,y-2/z,w+4/z,h+4/z,8.5);c.stroke();
    c.shadowColor="transparent";
    c.strokeStyle="rgba(255,255,255,.55)";c.lineWidth=1/z;
    roundRectPath(c,x+.5/z,y+.5/z,w-1/z,h-1/z,6.5);c.stroke();
    c.restore();
  }
  if(w>34&&h>22){
    const style=noteTypography(it),base=style.size,lh=Math.round(base*1.42),lines=[];
    c.fillStyle=dc("rgba(29,29,31,.86)","rgba(255,255,255,.92)");c.textBaseline="top";
    for(const token of markdownLines(it.text)){
      const scale=token.kind==="h1"?1.25:token.kind==="h2"?1.14:token.kind==="h3"?1.05:1;
      const weight=style.bold||token.kind.startsWith("h")?700:500;
      c.font=weight+" "+Math.round(base*scale)+"px "+style.family;
      const wrapped=wrapLines(c,token.text,w-20);for(const line of wrapped)lines.push({line,scale,weight,quote:token.kind==="quote"});
    }
    const maxL=Math.max(1,Math.floor((coreH-14)/lh));
    lines.slice(0,maxL).forEach((row,i)=>{c.font=row.weight+" "+Math.round(base*row.scale)+"px "+style.family;c.fillText(row.line,x+10,y+12+i*lh);if(style.underline){const tw=c.measureText(row.line).width;c.fillRect(x+10,y+12+i*lh+base*1.16,tw,Math.max(1,base*.07));}});
    if(lines.length>maxL){c.font="600 "+base+"px "+style.family;c.fillText("…",x+10,y+12+(maxL-1)*lh+12);}
  }
  /* （已移除：关联到节点时便签右上角的橙色角标） */
  drawDetail(it,{x,y,w,h});
  drawAnnotation(it,{x,y,w,h});
}
/* ---------- 画笔 ---------- */
function drawStroke(it,cc){
  const c=cc||ctx;if(!it.points.length)return;
  const z=state.camera.zoom;
  const sel=it.id===state.selected;
  c.save();
  if(sel){c.shadowColor="rgba(58,74,107,.35)";c.shadowBlur=8/z;}
  c.strokeStyle=it.color;c.lineWidth=it.size;
  c.lineCap="round";c.lineJoin="round";
  c.beginPath();it.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
  c.restore();
  /* 选中态：叠加品牌色描边光晕 */
  if(sel){
    c.save();
    c.strokeStyle="rgba(58,74,107,.3)";c.lineWidth=it.size+3/z;
    c.lineCap="round";c.lineJoin="round";
    c.beginPath();it.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
    c.restore();
  }
  /* 画笔批注：中点 */
  if(it.annotation){
    const mid=it.points[Math.floor(it.points.length/2)];
    c.save();
    c.font="600 10px "+FONT;c.textAlign="center";c.textBaseline="middle";
    c.fillStyle="#d4624a";
    c.fillText(it.annotation,mid.x,mid.y-10/state.camera.zoom);
    c.restore();
  }
}
/* ---------- 连线 ---------- */
function resolveEnd(p){
  if(p.noteId){
    const n=state.items.find(i=>i.id===p.noteId);
    if(n) return{x:n.x+p.ox,y:n.y+p.oy};
    return{x:0,y:0,free:true};
  }
  return{x:p.x,y:p.y,free:true};
}
/* edgePoint 统一定义在文件后段，此处原本是重复定义，已移除 */
function drawConnectorLine(c,a,b,color,width,arrowEnd){
  c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";
  c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
  if(arrowEnd){
    const ang=Math.atan2(b.y-a.y,b.x-a.x),L=8,spread=0.45;
    c.fillStyle=color;
    c.beginPath();c.moveTo(b.x,b.y);
    c.lineTo(b.x-L*Math.cos(ang-spread),b.y-L*Math.sin(ang-spread));
    c.lineTo(b.x-L*Math.cos(ang+spread),b.y-L*Math.sin(ang+spread));
    c.closePath();c.fill();
  }
}
function drawConnector(it,cc){
  const c=cc||ctx;
  const z=state.camera.zoom;
  const sel=it.id===state.selected;
  let a=resolveEnd(it.a),b=resolveEnd(it.b);
  if(!it.a.free&&!a.free){
    const n=state.items.find(i=>i.id===it.a.noteId);
    if(n) a=edgePoint(n.x+n.w/2,n.y+n.h/2,b.x,b.y,n);
  }
  if(!it.b.free&&!b.free){
    const n=state.items.find(i=>i.id===it.b.noteId);
    if(n) b=edgePoint(n.x+n.w/2,n.y+n.h/2,a.x,a.y,n);
  }
  /* 选中态：品牌色光晕 */
  if(sel){
    c.save();
    c.strokeStyle="rgba(58,74,107,.25)";c.lineWidth=Math.max(1.5,it.width||2)+3/z;
    c.lineCap="round";
    c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    c.restore();
  }
  drawConnectorLine(c,a,b,it.color,Math.max(1.5,it.width||2),true);
}
/* ---------- 导图节点 ---------- */
function drawMindNode(it,cc){
  const c=cc||ctx;const b=itemBounds(it);
  const depth=nodeDepth(it);
  const sel=it.id===state.selected;
  const z=state.camera.zoom;
  const coreH=detailBaseHeight(it,b);
  /* 层级视觉降级 + 质感提升：
     d0(根) = 纵向渐变填充+白字+大圆角+强投影
     d1(二级) = 白底+极淡同色渐变+2px 彩色边+彩色文字+中投影
     d2(三级) = 白底+1px 灰边+左侧 3px 彩色竖条+深灰字+轻投影
     d3+     = 透明灰底+1px 浅灰边+浅灰字+无投影 */
  c.save();
  if(sel){c.shadowColor="rgba(58,74,107,.4)";c.shadowBlur=14/z;c.shadowOffsetY=2/z;}
  else if(depth===0){c.shadowColor="rgba(0,0,0,.22)";c.shadowBlur=12/z;c.shadowOffsetY=4/z;}
  else if(depth===1){c.shadowColor="rgba(0,0,0,.12)";c.shadowBlur=8/z;c.shadowOffsetY=2/z;}
  else if(depth===2){c.shadowColor="rgba(0,0,0,.08)";c.shadowBlur=5/z;c.shadowOffsetY=1.5/z;}
  else{c.shadowColor="transparent";}
  const r=depth===0?14:depth===1?11:depth===2?9:8;
  roundRectPath(c,b.x,b.y,b.w,b.h,r);
  if(depth===0){
    /* 根节点：纵向渐变模拟微弧面光线 */
    const g=c.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
    const baseCol=it.color;
    g.addColorStop(0,shadeColor(baseCol,1.12));
    g.addColorStop(.5,baseCol);
    g.addColorStop(1,shadeColor(baseCol,.88));
    c.fillStyle=g;c.fill();
    /* 底部1px内阴影模拟厚度 */
    c.save();c.shadowColor="transparent";
    c.fillStyle="rgba(0,0,0,.12)";c.fillRect(b.x+2,b.y+b.h-1.5/z,b.w-4,1.5/z);
    c.restore();
  }else if(depth===1){
    /* 一级节点：白色底 + 极淡同色系色调 */
    const g=c.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
    g.addColorStop(0,dc("#ffffff","#2c2c2e"));
    g.addColorStop(1,dc(hexToRgba(it.color,.06),"#252527"));
    c.fillStyle=g;c.fill();
    c.lineWidth=2/z;c.strokeStyle=it.color;c.stroke();
  }else if(depth===2){
    c.fillStyle=dc("#fafbfc","#2c2c2e");c.fill();
    c.lineWidth=1/z;c.strokeStyle=dc("rgba(0,0,0,.1)","rgba(255,255,255,.1)");c.stroke();
    /* 左侧彩色竖条 */
    c.save();c.shadowColor="transparent";
    roundRectPath(c,b.x,b.y,4/z,b.h,2);c.clip();
    c.fillStyle=it.color;c.fillRect(b.x,b.y,4/z,b.h);
    c.restore();
  }else{
    c.fillStyle=dc("rgba(0,0,0,.02)","rgba(255,255,255,.04)");c.fill();
    c.lineWidth=1/z;c.strokeStyle="rgba(0,0,0,.08)";c.stroke();
  }
  c.restore();
  /* 非选中根/二级节点的顶部内高光 — 微妙光照感 */
  if(!sel&&(depth===0||depth===1)){
    c.save();c.shadowColor="transparent";
    roundRectPath(c,b.x+1/z,b.y+1/z,b.w-2/z,b.h-2/z,r-1);c.clip();
    c.strokeStyle="rgba(255,255,255,"+(state.dark?.06:depth===0?.14:.18)+")";
    c.lineWidth=1/z;
    c.beginPath();c.moveTo(b.x+3/z,b.y+1/z);c.lineTo(b.x+b.w-3/z,b.y+1/z);c.stroke();
    c.restore();
  }
  if(sel){
    /* 选中态：品牌亮色外发光环 + 亮色描边（不再用深色实线） */
    c.save();
    const HL=state.dark?"#8fb0e8":"#2d5fd3";
    /* 外发光 */
    c.shadowColor=state.dark?"rgba(143,176,232,.75)":"rgba(45,95,211,.55)";
    c.shadowBlur=16/z;
    c.strokeStyle=HL;c.lineWidth=2.5/z;
    roundRectPath(c,b.x-2/z,b.y-2/z,b.w+4/z,b.h+4/z,r+2);c.stroke();
    c.shadowColor="transparent";
    /* 内描边（亮色细线） */
    c.strokeStyle="rgba(255,255,255,.6)";c.lineWidth=1/z;
    roundRectPath(c,b.x+.5/z,b.y+.5/z,b.w-1/z,b.h-1/z,r);c.stroke();
    /* 顶光 — 节点顶部内 1px 白光，模拟光从上方照入 */
    if(depth<=1){
      c.strokeStyle="rgba(255,255,255,"+(state.dark?.15:.22)+")";c.lineWidth=1/z;
      roundRectPath(c,b.x+1.5/z,b.y+1.5/z,b.w-3/z,b.h-3/z,r-1);c.clip();
      c.beginPath();c.moveTo(b.x+2/z,b.y+1.5/z);c.lineTo(b.x+b.w-2/z,b.y+1.5/z);c.stroke();
    }
    c.restore();
  }
  /* 文字样式降级 + 暗黑模式加亮加粗 */
  const fontSz=depth===0?"14px ":depth===1?"13px ":"12.5px ";
  const fontW=state.dark?(depth===0?"700 ":depth===1?"700 ":depth===2?"600 ":"600 "):(depth===0?"700 ":depth===1?"600 ":"500 ");
  c.font=fontW+fontSz+FONT;
  c.textBaseline="middle";
  const padL=depth===2?16:14;
  if(depth===0) c.fillStyle="#ffffff";
  else if(depth===1) c.fillStyle=dc(it.color,"#ffffff");
  else if(depth===2) c.fillStyle=dc("#3c3c43","#e0e0e3");
  else c.fillStyle=dc("#6e7080","#a8a8ad");
  const ty=b.y+coreH/2;
  /* 连接点（右侧边缘，用于拖拽建立父子关系）— 选中/hover时高亮放大 */
  if(depth<3){
    const lx=b.x+b.w,ly=ty;
    const dotHover=state.hover&&state.hover.id===it.id;
    const dotR=(sel?5:dotHover?4.5:3.5)/z;
    const dotA=sel?.85:dotHover?.7:.25;
    c.save();
    if(sel||dotHover){c.shadowColor="rgba(58,74,107,.5)";c.shadowBlur=8/z;}
    c.fillStyle="rgba(58,74,107,"+dotA+")";
    c.beginPath();c.arc(lx,ly,dotR,0,7);c.fill();
    c.restore();
  }
  c.textAlign="left";
  /* 给右侧的展开内容和子树控制留出专属空间，文字不会再压住控件。 */
  const collapseBox=mindCollapseBounds(it,b);
  const detailBox=it.detail?detailToggleBounds(it,b):null;
  const controlStart=Math.min(collapseBox?collapseBox.x:Infinity,detailBox?detailBox.x:Infinity);
  c.save();
  c.beginPath();
  c.rect(b.x+padL,b.y+2/z,Math.max(12/z,(isFinite(controlStart)?controlStart:b.x+b.w)-b.x-padL-4/z),b.h-4/z);
  c.clip();
  c.fillText(it.text||"(空)",b.x+padL,ty+0.5);
  c.restore();
  drawMindCollapseControl(it,b,c);
  /* （已移除：节点的附件数量角标） */
  c.textBaseline="alphabetic";c.textAlign="start";
  drawDetail(it,b);
  drawAnnotation(it,b);
}
/* 右侧的功能把手：展开内容与批注/跃迁信息 */
function detailToggleBounds(it,b){
  const z=state.camera.zoom;
  const coreH=detailBaseHeight(it,b),w=18/z,h=Math.max(18/z,coreH-10/z);
  return{x:b.x+b.w-w-5/z,y:b.y+(coreH-h)/2,w,h};
}
function mindCollapseBounds(it,b){
  if(it.type!=="mindNode"||!(it.children&&it.children.length))return null;
  const z=state.camera.zoom;
  const coreH=detailBaseHeight(it,b),w=25/z,h=Math.max(18/z,coreH-10/z);
  const detailSpace=it.detail?27/z:0;
  return{x:b.x+b.w-w-detailSpace-5/z,y:b.y+(coreH-h)/2,w,h};
}
function drawMindCollapseControl(it,b,c){
  const box=mindCollapseBounds(it,b);if(!box)return;
  const depth=nodeDepth(it),z=state.camera.zoom;
  const hover=state.hover&&state.hover.id===it.id&&state.hover.area==="collapse";
  c.save();
  c.shadowColor="transparent";
  /* 背景：hover 时微亮 */
  const bgA=hover?.16:depth===0?"rgba(255,255,255,.2)":"rgba(58,74,107,.08)";
  c.fillStyle=depth===0?(hover?"rgba(255,255,255,.28)":"rgba(255,255,255,.2)"):dc(hover?"rgba(58,74,107,.14)":"rgba(58,74,107,.08)","rgba(255,255,255,.1)");
  roundRectPath(c,box.x,box.y,box.w,box.h,box.h/2);c.fill();
  c.lineWidth=1/z;c.strokeStyle=depth===0?"rgba(255,255,255,.24)":dc("rgba(58,74,107,.16)","rgba(255,255,255,.13)");c.stroke();
  const hidden=Math.max(0,subtreeCount(it)-1);
  c.fillStyle=depth===0?"#fff":dc(it.color,"#f5f5f7");
  c.font="700 10px "+FONT;c.textAlign="center";c.textBaseline="middle";
  c.fillText(it.collapsed?"+"+hidden:"−",box.x+box.w/2,box.y+box.h/2+.5/z);
  c.restore();
}
/* 绘制批注 + 展开内容把手 */
function drawAnnotation(it,b){
  const z=state.camera.zoom;
  ctx.save();
  /* 有展开内容：嵌入节点右缘的竖向把手，与节点作为一个整体。 */
  if(it.detail){
    const box=detailToggleBounds(it,b);
    const expanded=detailItemId===it.id;
    ctx.save();
    ctx.shadowColor=expanded?"rgba(58,74,107,.28)":"transparent";
    ctx.shadowBlur=expanded?8/z:0;
    /* 展开态用渐变背景 */
    if(expanded){
      const g=ctx.createLinearGradient(box.x,box.y,box.x,box.y+box.h);
      g.addColorStop(0,"#4a5a7b");g.addColorStop(1,"#2a3a5b");
      ctx.fillStyle=g;
    }else{
      ctx.fillStyle="rgba(58,74,107,.12)";
    }
    roundRectPath(ctx,box.x,box.y,box.w,box.h,box.h/2);
    ctx.fill();
    ctx.lineWidth=1/z;ctx.strokeStyle=expanded?"rgba(255,255,255,.35)":"rgba(58,74,107,.24)";ctx.stroke();
    /* 顶部内高光 */
    if(!expanded){
      ctx.save();roundRectPath(ctx,box.x+1/z,box.y+1/z,box.w-2/z,box.h-2/z,box.h/2-1);ctx.clip();
      ctx.strokeStyle="rgba(255,255,255,"+(state.dark?.06:.14)+")";ctx.lineWidth=1/z;
      ctx.beginPath();ctx.moveTo(box.x+3/z,box.y+1/z);ctx.lineTo(box.x+box.w-3/z,box.y+1/z);ctx.stroke();
      ctx.restore();
    }
    const cx=box.x+box.w/2,cy=box.y+box.h/2;
    ctx.strokeStyle=expanded?"#fff":"#3a4a6b";ctx.lineWidth=1.35/z;ctx.lineCap="round";ctx.lineJoin="round";
    if(expanded){
      /* 收起内容：上箭头，和子树的“− / +数字”明确区分。 */
      ctx.beginPath();ctx.moveTo(cx-3.2/z,cy+1.6/z);ctx.lineTo(cx,cy-1.5/z);ctx.lineTo(cx+3.2/z,cy+1.6/z);ctx.stroke();
    }else{
      /* 展开内容：小文档图标，表达“阅读内容”而非“展开子树”。 */
      roundRectPath(ctx,cx-3.5/z,cy-5/z,7/z,10/z,1.2/z);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-1.6/z,cy-1.5/z);ctx.lineTo(cx+1.8/z,cy-1.5/z);ctx.moveTo(cx-1.6/z,cy+1.6/z);ctx.lineTo(cx+1.8/z,cy+1.6/z);ctx.stroke();
    }
    ctx.restore();
  }
  /* 有跃迁：元素左下角画跳转标记 */
  if(it.jumpTo){
    const jx=b.x+4,jy=b.y+b.h-8;
    ctx.fillStyle="#2a6a8a";
    ctx.font="700 9px sans-serif";
    ctx.textAlign="left";ctx.textBaseline="middle";
    ctx.fillText("↗",jx,jy);
  }
  /* 批注小字 */
  if(it.annotation){
    ctx.font="600 11px "+FONT;
    ctx.textAlign="center";
    ctx.textBaseline="top";
    const text=it.annotation;
    const tw=ctx.measureText(text).width;
    const cx=b.x+b.w/2;
    /* 展开内容已并入元素本体，批注自然跟随扩展后的底边。 */
    const ay=b.y+b.h+4;
    ctx.fillStyle="#d4624a";
    ctx.fillText(text,cx,ay);
    ctx.beginPath();ctx.arc(cx-tw/2-5,ay+5,2/z,0,7);ctx.fill();
  }
  ctx.restore();
}
/* ============================================================
   附件形变预览（morph）：同一元素尺寸动画，卡片 ⇄ 预览一体
   —— 不再是覆盖式独立窗口，元素本体就是预览本体
============================================================ */
let previewMorphFrame=0;
const PV_HEAD_H=30;   /* 预览态顶部标题栏高度（点击可退回卡片） */
function previewTargetSize(it){
  let w=420,h=300;
  if(it.kind==="img"&&it.tw&&it.th){
    const maxW=460,maxH=340,asp=it.tw/it.th;
    if(asp>1){w=maxW;h=Math.min(maxH,maxW/asp);}
    else{h=maxH;w=Math.min(maxW,maxH*asp);}
  }
  return {w,h:h+PV_HEAD_H};
}
/* 预览态顶部标题栏命中区（点击退回卡片） */
function previewHeadBounds(it){
  const b=itemBounds(it);if(!b)return null;
  return {x:b.x,y:b.y,w:b.w,h:PV_HEAD_H};
}
function animatePreviewMorph(it,from,to,done){
  if(previewMorphFrame)cancelAnimationFrame(previewMorphFrame);
  const t0=performance.now(),dur=280;
  function step(now){
    const p=Math.min(1,(now-t0)/dur);
    const e=1-Math.pow(1-p,3);
    it.w=from.w+(to.w-from.w)*e;
    it.h=from.h+(to.h-from.h)*e;
    render();
    if(p<1)previewMorphFrame=requestAnimationFrame(step);
    else{previewMorphFrame=0;it.w=to.w;it.h=to.h;if(done)done();}
  }
  previewMorphFrame=requestAnimationFrame(step);
}
function togglePreviewMorph(it){
  if(!it||it.type!=="fileCard")return;
  if(it._cardW===undefined){it._cardW=160;it._cardH=it.kind==="img"&&it.tw&&it.th?160:52;}
  const from={w:it.w||it._cardW,h:it.h||it._cardH};
  const to=it.previewOpen?{w:it._cardW,h:it._cardH}:previewTargetSize(it);
  it.previewOpen=!it.previewOpen;
  pushHistory(it.previewOpen?"展开预览":"收起预览");
  animatePreviewMorph(it,from,to,()=>{render();saveState();});
}
function drawFileCard(it,cc){
  const c=cc||ctx;const b=itemBounds(it);
  const f=state.files.find(x=>x.id===it.fileId);
  const z=state.camera.zoom;
  const sel=it.id===state.selected;
  c.save();
  c.shadowColor=sel?"rgba(58,74,107,.35)":"rgba(0,0,0,.12)";
  c.shadowBlur=(sel?10:8)/z;c.shadowOffsetY=2/z;
  roundRectPath(c,b.x,b.y,b.w,b.h,10);
  c.fillStyle=dc("#ffffff","#2c2c2e");c.fill();
  c.lineWidth=1/z;c.strokeStyle=dc("rgba(0,0,0,.08)","rgba(255,255,255,.1)");c.stroke();
  c.restore();
  /* 顶部内高光 */
  c.save();
  roundRectPath(c,b.x+1/z,b.y+1/z,b.w-2/z,b.h-2/z,9);c.clip();
  c.strokeStyle="rgba(255,255,255,"+(state.dark?.06:.2)+")";c.lineWidth=1/z;
  c.beginPath();c.moveTo(b.x+3/z,b.y+1/z);c.lineTo(b.x+b.w-3/z,b.y+1/z);c.stroke();
  c.restore();
  /* 选中态描边：品牌亮色 + 外发光（不再用深色实线） */
  if(sel){
    c.save();
    const HL=state.dark?"#8fb0e8":"#2d5fd3";
    c.shadowColor=state.dark?"rgba(143,176,232,.75)":"rgba(45,95,211,.55)";
    c.shadowBlur=14/z;
    c.strokeStyle=HL;c.lineWidth=2/z;
    roundRectPath(c,b.x-2/z,b.y-2/z,b.w+4/z,b.h+4/z,11.5);c.stroke();
    c.shadowColor="transparent";
    c.strokeStyle="rgba(255,255,255,.55)";c.lineWidth=1/z;
    roundRectPath(c,b.x+.8/z,b.y+.8/z,b.w-1.6/z,b.h-1.6/z,9.5);c.stroke();
    c.restore();
  }
  const pad=10;
  if(!f){c.fillStyle=dc("#a1a1a6","#636366");c.font="12px "+FONT;c.textAlign="center";c.textBaseline="middle";c.fillText("文件已移除",b.x+b.w/2,b.y+b.h/2);return;}
  /* ===== 预览态（形变展开后）：顶部标题栏 + 大内容区，元素本体即预览 ===== */
  if(it.previewOpen){
    const headH=PV_HEAD_H,cy=b.y+headH,ch=Math.max(10,b.h-headH);
    /* 标题栏 */
    c.save();
    roundRectPath(c,b.x,b.y,b.w,headH,10,10,0,0);c.clip();
    c.fillStyle=dc("rgba(58,74,107,.09)","rgba(255,255,255,.09)");c.fill();
    c.restore();
    c.save();
    c.fillStyle=dc("#1a1a2e","#f5f5f7");c.font="600 12px "+FONT;c.textAlign="left";c.textBaseline="middle";
    c.fillText(truncateStr(f.name,b.w-84),b.x+10,b.y+headH/2);
    c.fillStyle=dc("#6e7080","#98989d");c.font="10px "+FONT;c.textAlign="right";
    c.fillText("点击此处收起",b.x+b.w-10,b.y+headH/2);
    c.strokeStyle=dc("rgba(0,0,0,.08)","rgba(255,255,255,.12)");c.lineWidth=1/z;
    c.beginPath();c.moveTo(b.x,b.y+headH);c.lineTo(b.x+b.w,b.y+headH);c.stroke();
    c.restore();
    /* 内容区 */
    c.save();
    roundRectPath(c,b.x,cy,b.w,ch,0,0,10,10);c.clip();
    if(it.kind==="img"&&it.thumb){
      c.drawImage(it.thumb,b.x,cy,b.w,ch);
    }else{
      c.fillStyle=dc("#f5f6f8","#22222a");c.fillRect(b.x,cy,b.w,ch);
      c.fillStyle=dc("#3a4a6b","#6a7a9b");c.font="600 14px "+FONT;c.textAlign="center";c.textBaseline="middle";
      c.fillText(KIND_LABEL[f.kind]||"文件",b.x+b.w/2,cy+ch/2-10);
      c.fillStyle=dc("#6e7080","#98989d");c.font="11px "+FONT;
      c.fillText(truncateStr(f.name,b.w-24),b.x+b.w/2,cy+ch/2+12);
    }
    c.restore();
    c.textAlign="start";c.textBaseline="alphabetic";
    return;
  }
  if(it.kind==="img"&&it.thumb){
    /* 图片整张填充卡片 */
    c.save();
    roundRectPath(c,b.x,b.y,b.w,b.h,10);c.clip();
    c.drawImage(it.thumb,b.x,b.y,b.w,b.h);
    c.restore();
    /* 底部文件名条 */
    c.save();
    c.fillStyle="rgba(0,0,0,.5)";
    roundRectPath(c,b.x,b.y+b.h-20,b.w,20,0,0,10,10);c.fill();
    c.fillStyle="#fff";c.font="10px "+FONT;c.textAlign="left";c.textBaseline="middle";
    c.fillText(truncateStr(f.name,b.w-12),b.x+6,b.y+b.h-10);
    c.restore();
  }else if(it.kind==="link"){
    const tx=b.x+pad;
    c.fillStyle=dc("#3a4a6b","#6a7a9b");c.font="600 11.5px "+FONT;c.textAlign="left";c.textBaseline="middle";
    c.fillText(truncateStr(it.title||f.name,b.w-pad*2),tx,b.y+b.h/2-6);
    c.fillStyle=dc("#a1a1a6","#636366");c.font="10px "+FONT;
    c.fillText(truncateStr(hostOf(f.url),b.w-pad*2),tx,b.y+b.h/2+10);
  }else{
    const tx=b.x+pad;
    c.fillStyle=dc("#1d1d1f","#f5f5f7");c.font="600 11.5px "+FONT;c.textAlign="left";c.textBaseline="middle";
    c.fillText(truncateStr(f.name,b.w-pad*2),tx,b.y+b.h/2-6);
    c.fillStyle=dc("#a1a1a6","#636366");c.font="10px "+FONT;
    c.fillText(KIND_LABEL[f.kind]||"文件",tx,b.y+b.h/2+10);
  }
  /* （已移除：文件卡片右上角的关联角标） */
  c.textAlign="start";c.textBaseline="alphabetic";
  drawDetail(it,b);
  drawAnnotation(it,b);
}
function selectedItem(){
  if(!state.selected) return null;
  /* 先找 items */
  const it=state.items.find(i=>i.id===state.selected);
  if(it)return it;
  /* 再找 links */
  const l=state.links.find(l=>l.id===state.selected);
  if(l)return {type:"link",...l,annotation:l.annotation||""};
  return null;
}
/* 聚焦模式：F键进入/退出 */
function toggleFocus(){
  if(state.focusMode){exitFocus();return;}
  const s=selectedItem();
  if(!s||s.type==="link"){toast("请先选中一个内容元素");return;}
  enterFocus(s.id);
}
function enterFocus(id){
  const it=state.items.find(i=>i.id===id);
  if(!it)return;
  /* 记住哪些节点是之前折叠的 */
  const collapsedBackup={};
  for(const n of state.items){
    if(n.type==="mindNode"&&n.collapsed){collapsedBackup[n.id]=true;n.collapsed=false;}
  }
  state.focusMode={id,collapsedBackup,cameraBackup:{...state.camera}};
  /* 聚焦过渡帧：非关联元素渐隐 */
  focusTransition=0;
  const tStart=performance.now();
  function focusAnimStep(now){
    const p=Math.min(1,(now-tStart)/280);
    focusTransition=1-Math.pow(1-p,3);
    if(p<1){requestAnimationFrame(focusAnimStep);}
    else{focusTransition=1;}
    requestRender();
  }
  requestAnimationFrame(focusAnimStep);
  /* camera 平滑居中到焦点 */
  const b=itemBounds(it);
  const targetX=b.x+b.w/2-W/2/state.camera.zoom;
  const detailLift=it.detail?Math.min(78,26+renderMarkdownPlain(it.detail).length*8)/state.camera.zoom:0;
  const targetY=b.y+b.h/2-H/2/state.camera.zoom-detailLift;
  animateCamera(targetX,targetY,state.camera.zoom);
  /* 焦点有 detail → 自动展开阅读层 */
  if(it.detail){
    expandDetailInPlace(it);
  }
  render();
  toast("聚焦模式：F退出");
}
function exitFocus(){
  if(!state.focusMode)return;
  /* 恢复折叠状态与原视角 */
  const bak=state.focusMode.collapsedBackup||{};
  for(const id in bak){
    const n=state.items.find(i=>i.id==id);
    if(n)n.collapsed=true;
  }
  /* 关闭自动展开的阅读层 */
  if(detailItemId!==null&&state.focusMode&&detailItemId===state.focusMode.id){
    collapseDetailInPlace();
  }
  const cameraBak=state.focusMode.cameraBackup;
  state.focusMode=null;
  focusTransition=1; /* 重置过渡帧 */
  if(cameraBak) state.camera=cameraBak;
  render();
}
/* 获取一级关联 */
function getRelated(id){
  const ids=new Set([id]);
  const it=state.items.find(i=>i.id===id);
  if(!it)return ids;
  /* 聚焦邻域：只保留直接上下游和显式关系；同级节点不是关联。 */
  /* 直接子节点 */
  if(it.children)for(const cid of it.children)ids.add(cid);
  /* 直接父节点（提供来源语境） */
  if(it.parentId)ids.add(it.parentId);
  /* 自由关系线的端点 */
  for(const l of state.links){
    if(l.aId===id)ids.add(l.bId);
    if(l.bId===id)ids.add(l.aId);
  }
  /* 便签、材料的显式挂接 */
  if(it.attachIds)for(const aid of it.attachIds)ids.add(aid);
  /* 被谁 attach */
  for(const n of state.items){
    if(n.type==="mindNode"&&(n.attachIds||[]).includes(id))ids.add(n.id);
  }
  return ids;
}
/* 二级关联 */
function getSecondary(id,primary){
  /* 关系邻域阅读模式不自动扩散到二跳，避免焦点被稀释。 */
  return new Set();
}
/* camera 平滑动画 */
function animateCamera(tx,ty,tz){
  const sx=state.camera.x,sy=state.camera.y,sz=state.camera.zoom;
  const start=performance.now();const dur=110;
  function step(){
    const t=Math.min(1,(performance.now()-start)/dur);
    const e=1-Math.pow(1-t,3); /* easeOutCubic */
    state.camera.x=sx+(tx-sx)*e;
    state.camera.y=sy+(ty-sy)*e;
    state.camera.zoom=sz+(tz-sz)*e;
    render();
    if(t<1)requestAnimationFrame(step);
  }
  step();
}
/* 跃迁：给元素设置跳转目标画布，或跳转到已设的画布 */
function openJump(){
  const s=selectedItem();
  if(!s||s.type==="link"){toast("请先选中一个内容元素");return;}
  /* 兼容旧数据 jumpTo: canvasId，同时支持精确的 {canvasId, itemId}。 */
  if(s.jumpTo){
    const targetRef=typeof s.jumpTo==="string"?{canvasId:s.jumpTo}:s.jumpTo;
    const target=curProject().canvases.find(c=>c.id===targetRef.canvasId);
    if(target){
      switchCanvas(target.id);
      const targetItem=targetRef.itemId&&target.items.find(i=>i.id===targetRef.itemId);
      if(targetItem){
        state.selected=targetItem.id;
        const b=itemBounds(targetItem);
        state.camera.x=b.x+b.w/2-W/2/state.camera.zoom;
        state.camera.y=b.y+b.h/2-H/2/state.camera.zoom;
      }
      render();toast("已跃迁到「"+target.name+"」"+(targetItem?"的「"+(targetItem.text||"元素")+"」":""));return;
    }
  }
  const cp=curProject();
  const opts=cp.canvases.filter(c=>c.id!==state.activeCanvasId).map(c=>({
    id:c.id,label:c.name,desc:"选择该画布中的目标元素",onClick:()=>{
      const targetItems=c.items.filter(i=>i.type!=="connector"&&i.type!=="stroke").slice(0,40);
      if(!targetItems.length){pushHistory("设置跃迁");s.jumpTo={canvasId:c.id,itemId:null};saveState();render();toast("已设置画布跃迁目标："+c.name);return;}
      showOptions("选择跃迁目标",targetItems.map(i=>({
        id:String(i.id),label:i.text||KIND_LABEL[i.kind]||"元素",desc:i.type==="mindNode"?"导图节点":"定位到该元素",
        onClick:()=>{pushHistory("设置跃迁");s.jumpTo={canvasId:c.id,itemId:i.id};saveState();render();toast("已设置跃迁："+c.name+" · "+(i.text||"元素"));}
      })));
    }
  }));
  if(!opts.length){toast("当前项目只有一张画布，请先新建画布");return;}
  showOptions("跃迁到画布",opts);
}
/* 多选连接：选中两个元素→C键连接/断开 */
/* 展开内容：E 键编辑，Canvas 内绘制阅读层 */
let detailItemId=null;  /* 当前展开内容的元素 id */
let detailEditId=null;  /* 当前正在编辑的元素 id */
let detailLayout=null,detailMotionFrame=0;
const detailPanel=document.getElementById("detailPanel");
const detailTextarea=document.querySelector("#detailPanel .dp-ta");
document.querySelector("#detailPanel .dp-done").addEventListener("click",()=>{
  if(detailEditId!==null){
    const it=state.items.find(i=>i.id===detailEditId);
    if(it&&it.detail!==detailTextarea.value){pushHistory("编辑展开内容");it.detail=detailTextarea.value;saveState();}
  }
  detailPanel.classList.remove("show");
  detailEditId=null;
  render();
});
document.querySelector("#detailPanel .dp-close").addEventListener("click",()=>{
  detailPanel.classList.remove("show");
  detailEditId=null;
  render();
});
detailTextarea.addEventListener("input",()=>{
  if(detailEditId!==null){
    const it=state.items.find(i=>i.id===detailEditId);
    if(it){it.detail=detailTextarea.value;render();}
  }
});
detailTextarea.addEventListener("keydown",e=>{
  if(e.ctrlKey&&e.key==="Enter"){e.preventDefault();document.querySelector("#detailPanel .dp-done").click();}
  if(e.key==="Escape"){e.preventDefault();detailPanel.classList.remove("show");detailEditId=null;render();}
});
/* 批注：A键，选中元素后添加常驻小字 */
function openAnnotation(){
  const s=selectedItem();
  if(!s){toast("请先选中一个元素");return;}
  const label=s.type==="link"?"连接线":s.text||(s.type==="connector"?"连线":s.type==="stroke"?"画笔":"元素");
  showPrompt("添加批注","一句话批注…",s.annotation||"",text=>{
    if((s.annotation||"")!==(text||""))pushHistory("批注");
    if(s.type==="link"){const l=state.links.find(l=>l.id===s.id);if(l)l.annotation=text||"";}
    else s.annotation=text||"";
    render();saveState();
    if(text)toast("已添加批注");else toast("已清除批注");
  });
}
function openDetail(){
  const s=selectedItem();
  if(!s){toast("请先选中一个元素");return;}
  /* 编辑前先让元素本体自然展开；编辑器只是输入界面，不是展开内容本身。 */
  if(detailItemId!==s.id) expandDetailInPlace(s,true);
  detailEditId=s.id;
  /* 定位编辑面板 */
  const b=itemBounds(s);
  if(b){
    const sp=w2s(b.x,b.y+b.h+6);
    detailPanel.style.left=sp.x+"px";
    detailPanel.style.top=sp.y+"px";
    detailPanel.style.width=Math.max(300,b.w*state.camera.zoom)+"px";
  }
  detailTextarea.value=s.detail||"";
  detailPanel.classList.add("show");
  detailTextarea.focus();
  render();
}
function closeDetail(){
  detailEditId=null;
  detailPanel.classList.remove("show");
  collapseDetailInPlace();
}
function renderMarkdownPlain(md){
  /* 渲染 Markdown 为纯文本行（Canvas 用） */
  if(!md)return[];
  const lines=md.split("\n");
  const out=[];
  for(let line of lines){
    if(/^### (.+)$/.test(line)){out.push({t:line.replace(/^### /,""),h:3});}
    else if(/^## (.+)$/.test(line)){out.push({t:line.replace(/^## /,""),h:2});}
    else if(/^# (.+)$/.test(line)){out.push({t:line.replace(/^# /,""),h:1});}
    else if(/^- (.+)$/.test(line)){out.push({t:"• "+line.replace(/^- /,""),h:0,indent:1});}
    else if(/^\d+\. (.+)$/.test(line)){out.push({t:line.replace(/^\d+\. /,"")+".",h:0,indent:1});}
    else if(/^> (.+)$/.test(line)){out.push({t:line.replace(/^> /,""),h:0,quote:true});}
    else if(line.trim()===""){continue;}
    else{out.push({t:line,h:0});}
  }
  return out;
}
/* 展开是临时的“形变布局”，不写入用户的原始排布或撤销记录。 */
function detailBaseHeight(it,b){
  if(detailLayout&&detailLayout.id===it.id)return detailLayout.baseH;
  return it.type==="mindNode"?(it.h||40):(it.h||b.h);
}
function detailFont(ln){return(ln.h===1?"700 13px ":(ln.h===2?"600 12px ":(ln.h===3?"600 11px ":"12px ")))+FONT;}
function detailPreferredWidth(it){
  const base=itemBounds(it);let widest=0;
  ctx.save();
  for(const ln of renderMarkdownPlain(it.detail||"")){ctx.font=detailFont(ln);widest=Math.max(widest,ctx.measureText(ln.t).width+(ln.indent?12:0));}
  ctx.restore();
  return clamp(Math.max(base.w,widest+38),Math.min(base.w,190),360);
}
function detailRows(it,width){
  const rows=[],available=Math.max(80,width-28);
  ctx.save();
  for(const ln of renderMarkdownPlain(it.detail||"")){
    ctx.font=detailFont(ln);
    const maxW=Math.max(48,available-(ln.indent?12:0));
    for(const text of wrapLines(ctx,ln.t,maxW))rows.push({...ln,t:text});
  }
  ctx.restore();
  return rows.length?rows:[{t:"",h:0}];
}
function detailContentHeight(it,width){
  return clamp(24+detailRows(it,width).length*16,52,176);
}
function movableDetailItems(){return state.items.filter(it=>it.type==="note"||it.type==="mindNode"||it.type==="fileCard");}
function captureDetailGeometry(){
  const snapshot=new Map();
  for(const it of movableDetailItems())snapshot.set(it.id,{x:it.x,y:it.y,w:it.w,h:it.h});
  return snapshot;
}
function copyDetailGeometry(source){return new Map([...source].map(([id,box])=>[id,{...box}]));}
function applyDetailGeometry(geometry){
  for(const [id,box] of geometry){
    const it=state.items.find(x=>x.id===id);if(!it)continue;
    it.x=box.x;it.y=box.y;it.w=box.w;it.h=box.h;
  }
}
function detailRectsOverlap(a,b,gap){
  return a.x<b.x+b.w+gap&&a.x+a.w>b.x-gap&&a.y<b.y+b.h+gap&&a.y+a.h>b.y-gap;
}
function makeExpandedGeometry(it,backup,baseH,contentH,width){
  const target=copyDetailGeometry(backup);
  const owner=target.get(it.id);if(!owner)return target;
  owner.w=width;owner.h=baseH+contentH;
  applyDetailGeometry(target);
  const gap=18;
  const occupied=[itemBounds(it)];
  const candidates=movableDetailItems().filter(x=>x.id!==it.id).sort((a,b)=>{
    const ab=itemBounds(a),bb=itemBounds(b);return ab.y-bb.y||ab.x-bb.x;
  });
  for(const candidate of candidates){
    let box=itemBounds(candidate),shift=0;
    for(const used of occupied){
      if(detailRectsOverlap(box,used,gap))shift=Math.max(shift,used.y+used.h+gap-box.y);
    }
    if(shift>0){candidate.y+=shift;box={...box,y:box.y+shift};}
    occupied.push(box);
  }
  return captureDetailGeometry();
}
function animateDetailGeometry(from,to,onDone){
  if(detailMotionFrame)cancelAnimationFrame(detailMotionFrame);
  const start=performance.now(),duration=230;
  function step(now){
    const p=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-p,4);
    const current=new Map();
    for(const [id,end] of to){
      const begin=from.get(id)||end;
      current.set(id,{x:begin.x+(end.x-begin.x)*ease,y:begin.y+(end.y-begin.y)*ease,w:begin.w+(end.w-begin.w)*ease,h:begin.h+(end.h-begin.h)*ease});
    }
    applyDetailGeometry(current);render();
    if(p<1)detailMotionFrame=requestAnimationFrame(step);
    else{detailMotionFrame=0;onDone&&onDone();}
  }
  detailMotionFrame=requestAnimationFrame(step);
}
function expandDetailInPlace(it,allowEmpty=false){
  if(!it||(!it.detail&&!allowEmpty))return;
  if(detailLayout&&detailLayout.id===it.id)return;
  if(detailLayout){
    if(detailMotionFrame)cancelAnimationFrame(detailMotionFrame);
    applyDetailGeometry(detailLayout.backup);detailLayout=null;detailItemId=null;
  }
  const backup=captureDetailGeometry();
  const baseH=it.h||itemBounds(it).h,width=detailPreferredWidth(it),contentH=detailContentHeight(it,width);
  detailLayout={id:it.id,backup,baseH,width,contentH,closing:false};
  detailItemId=it.id;
  const target=makeExpandedGeometry(it,backup,baseH,contentH,width);
  applyDetailGeometry(backup);
  animateDetailGeometry(backup,target);
}
function collapseDetailInPlace(){
  if(!detailLayout){detailItemId=null;render();return;}
  const layout=detailLayout;
  const current=captureDetailGeometry();
  layout.closing=true;
  animateDetailGeometry(current,layout.backup,()=>{
    if(detailLayout!==layout)return;
    applyDetailGeometry(layout.backup);detailLayout=null;detailItemId=null;render();
  });
}
function toggleDetailInPlace(it){
  if(detailItemId===it.id)collapseDetailInPlace();
  else expandDetailInPlace(it);
}
/* 绘制展开内容：作为元素下半部分的延展阅读区，而不是外挂卡片。 */
function drawDetail(it,b){
  if(detailItemId!==it.id||!it.detail)return;
  const z=state.camera.zoom;
  const baseH=detailBaseHeight(it,b),bodyH=b.h-baseH;
  if(bodyH<4)return;
  const padX=12/z,padY=10/z,lineH=16/z;
  const lines=detailRows(it,b.w);
  const dx=b.x,dy=b.y+baseH,dw=b.w,dh=bodyH;
  ctx.save();
  const reveal=clamp(bodyH/(20/z),0,1);
  ctx.globalAlpha=reveal;
  /* 详情区背景 — 微渐变 */
  const dbg=ctx.createLinearGradient(dx,dy,dx,dy+dh);
  dbg.addColorStop(0,dc("rgba(58,74,107,.06)","rgba(58,74,107,.14)"));
  dbg.addColorStop(1,dc("rgba(58,74,107,.03)","rgba(58,74,107,.08)"));
  ctx.fillStyle=dbg;ctx.fillRect(dx+1/z,dy,dw-2/z,dh-1/z);
  ctx.strokeStyle=dc("rgba(58,74,107,.18)","rgba(130,180,255,.25)");ctx.lineWidth=1/z;
  ctx.beginPath();ctx.moveTo(dx+10/z,dy+.5/z);ctx.lineTo(dx+dw-10/z,dy+.5/z);ctx.stroke();
  /* 左侧品牌色条 — 渐变 */
  const lg=ctx.createLinearGradient(dx,dy,dx,dy+dh);
  lg.addColorStop(0,"#4a5a7b");lg.addColorStop(1,"#2a3a5b");
  ctx.fillStyle=lg;ctx.fillRect(dx,dy,2/z,dh);
  ctx.save();ctx.beginPath();ctx.rect(dx+padX,dy+padY,dw-padX*2,Math.max(0,dh-padY));ctx.clip();
  ctx.textAlign="left";
  ctx.textBaseline="top";
  let ty=dy+padY;
  for(const ln of lines){
    const tx=dx+padX+(ln.indent?12/z:0);
    ctx.font=detailFont(ln);
    ctx.fillStyle=ln.h>0?dc("#1d1d1f","#f5f5f7"):ln.quote?dc("#6e7080","#636366"):dc("#3a3a3c","#aeaeb2");
    ctx.fillText(ln.t.slice(0,80),tx,ty);
    ty+=lineH;
  }
  ctx.restore();
  ctx.restore();
}
/* 检测点击是否命中展开把手或展开层 */
function hitDetail(it,b,wx,wy){
  if(!it.detail)return false;
  const z=state.camera.zoom;
  const box=detailToggleBounds(it,b);
  const pad=3/z;
  if(wx>=box.x-pad&&wx<=box.x+box.w+pad&&wy>=box.y-pad&&wy<=box.y+box.h+pad) return "toggle";
  /* 展开状态：展开层内容区 */
  if(detailItemId===it.id){
    const baseH=detailBaseHeight(it,b);
    if(wx>=b.x&&wx<=b.x+b.w&&wy>=b.y+baseH&&wy<=b.y+b.h) return "body";
  }
  return false;
}
function hitMindCollapse(it,b,wx,wy){
  const box=mindCollapseBounds(it,b);if(!box)return false;
  const pad=3/state.camera.zoom;
  return wx>=box.x-pad&&wx<=box.x+box.w+pad&&wy>=box.y-pad&&wy<=box.y+box.h+pad;
}
/* 控件要先于连接点命中：否则点击把手会被当作拖拽父子连线。 */
function hitNodeControl(wx,wy){
  for(let i=state.items.length-1;i>=0;i--){
    const it=state.items[i];
    if(["note","mindNode","fileCard","connector","stroke"].indexOf(it.type)<0)continue;
    if(it.type==="mindNode"&&!isMindNodeVisible(it))continue;
    const b=itemBounds(it);if(!b)continue;
    const detailHit=hitDetail(it,b,wx,wy);
    if(detailHit)return{item:it,kind:"detail",hit:detailHit};
    if(hitMindCollapse(it,b,wx,wy))return{item:it,kind:"collapse"};
  }
  return null;
}
document.addEventListener("keydown",e=>{
  if(detailEditId!==null){
    if(e.key==="Escape"){e.preventDefault();closeDetail();return;}
  }else if(detailItemId!==null){
    if(e.key==="Escape"&&!isTyping()){closeDetail();return;}
    if(e.ctrlKey&&e.key==="e"){e.preventDefault();closeDetail();return;}
  }
});
function toggleLink(){
  const selectedContentIds=state.multiSel.filter(id=>state.items.some(it=>it.id===id));
  if(selectedContentIds.length<2){
    toast("请按住 Ctrl 点击两个以上元素（点击即自动连接）");
    return;
  }
  pushHistory("连接/断开");
  const parentId=selectedContentIds[0];
  let connected=0,disconnected=0;
  for(let i=1;i<selectedContentIds.length;i++){
    const childId=selectedContentIds[i];
    const exist=state.links.find(l=>(l.aId===parentId&&l.bId===childId)||(l.aId===childId&&l.bId===parentId));
    if(exist){
      state.links=state.links.filter(l=>l!==exist);
      disconnected++;
    }else{
      state.links.push({id:"lnk"+(uid++),aId:parentId,bId:childId,annotation:"",relationType:"related",directional:false});
      connected++;
    }
  }
  render();saveState();
  if(connected>0)toast("已连接 "+connected+" 个元素");
  else if(disconnected>0)toast("已断开 "+disconnected+" 个连接");
}
function setLinkRelation(linkId){
  const link=state.links.find(l=>l.id===linkId);
  if(!link)return;
  showOptions("设置关系语义",Object.entries(RELATION_TYPES).map(([type,meta])=>({
    id:type,label:meta.label,desc:meta.directional?"带方向的关系":"双向关系",
    onClick:()=>{pushHistory("设置关系语义");link.relationType=type;link.directional=meta.directional;render();saveState();toast("关系已设为「"+meta.label+"」");}
  })));
}
/* 获取元素之间的所有连接线 */
function linksOf(it){
  if(!it)return[];
  return state.links.filter(l=>l.aId===it.id||l.bId===it.id);
}
/* 绘制自由连接线 */
function linkCurve(l){
  const a=state.items.find(i=>i.id===l.aId),b=state.items.find(i=>i.id===l.bId);
  if(!a||!b)return null;
  const ab=itemBounds(a),bb=itemBounds(b);
  if(!ab||!bb)return null;
  const ax=ab.x+ab.w/2,ay=ab.y+ab.h/2,bx=bb.x+bb.w/2,by=bb.y+bb.h/2;
  /* 锚点吸附到四边正中间，避免射线交点导致的歪斜随机感 */
  const ea=anchorMid(ax,ay,bx,by,ab),eb=anchorMid(bx,by,ax,ay,bb);
  const horizontal=Math.abs(eb.x-ea.x)>=Math.abs(eb.y-ea.y);
  return{ea,eb,mx:(ea.x+eb.x)/2,my:(ea.y+eb.y)/2,horizontal};
}
function strokeLinkCurve(c,curve){
  /* 水平连线走横向 S 曲线，垂直连线走纵向 S 曲线，避免歪斜 */
  if(curve.horizontal){
    c.beginPath();c.moveTo(curve.ea.x,curve.ea.y);
    c.bezierCurveTo(curve.mx,curve.ea.y,curve.mx,curve.eb.y,curve.eb.x,curve.eb.y);
  }else{
    c.beginPath();c.moveTo(curve.ea.x,curve.ea.y);
    c.bezierCurveTo(curve.ea.x,curve.my,curve.eb.x,curve.my,curve.eb.x,curve.eb.y);
  }
}
function drawLinks(scope){
  const z=state.camera.zoom;
  for(const l of state.links){
    if(scope&&(!scope.has(l.aId)||!scope.has(l.bId)))continue;
    const a=state.items.find(it=>it.id===l.aId),b=state.items.find(it=>it.id===l.bId);
    if((a&&a.type==="mindNode"&&!isMindNodeVisible(a))||(b&&b.type==="mindNode"&&!isMindNodeVisible(b)))continue;
    const curve=linkCurve(l);if(!curve)continue;
    const {ea,eb,mx}=curve;
    ctx.save();
    const rel=RELATION_TYPES[l.relationType]||RELATION_TYPES.related;
    const linkColor=rel.color;
    const active=state.selected===l.id;
    ctx.strokeStyle=linkColor;ctx.globalAlpha=active?.9:.48;
    /* 线型编码：关联/支撑=实线，导致=粗实线，反证=虚线，证据=点划线 */
    const baseW=l.relationType==="causes"?3.2:2.5;
    ctx.lineWidth=(active?baseW+0.7:baseW)/z;ctx.lineCap="round";
    if(active){ctx.shadowColor=linkColor;ctx.shadowBlur=11/z;}
    const dash=rel.dash||[];
    ctx.setLineDash(dash.map(d=>d/z));
    /* 贝塞尔曲线 */
    strokeLinkCurve(ctx,curve);
    ctx.stroke();ctx.setLineDash([]);
    /* 丝质高光 — 关系线叠加极细白光 */
    if(active){ctx.globalAlpha=.2;ctx.strokeStyle=dc("#ffffff","#ffffff");ctx.lineWidth=0.7/z;ctx.stroke();}
    /* 端点：带白边圆环（外环=关系色，内白）+ 内高光 */
    ctx.globalAlpha=.88;
    const ep_r=4.5/z;
    for(const ep of [ea,eb]){
      /* 外阴影 */
      if(active){ctx.shadowColor=linkColor;ctx.shadowBlur=6/z;}
      ctx.beginPath();ctx.arc(ep.x,ep.y,ep_r,0,7);
      ctx.fillStyle=dc("#ffffff","#2c2c2e");ctx.fill();
      ctx.shadowColor="transparent";
      ctx.lineWidth=2/z;ctx.strokeStyle=linkColor;ctx.stroke();
      /* 内点高光 */
      ctx.beginPath();ctx.arc(ep.x-1/z,ep.y-1/z,1.5/z,0,7);
      ctx.fillStyle="rgba(255,255,255,"+(state.dark?.3:.4)+")";ctx.fill();
    }
    /* 有向关系：流线型箭头（尾部略凹）+ 阴影 */
    if(l.directional||rel.directional){
      /* 箭头方向 = 曲线末端切线方向（水平曲线取横向，垂直曲线取纵向） */
      const angle=curve.horizontal
        ?Math.atan2(0,eb.x-curve.mx)
        :Math.atan2(eb.y-curve.my,0);
      const size=9/z;
      ctx.fillStyle=linkColor;ctx.globalAlpha=.92;
      if(active){ctx.shadowColor=linkColor;ctx.shadowBlur=5/z;}
      ctx.beginPath();ctx.moveTo(eb.x,eb.y);
      ctx.lineTo(eb.x-size*Math.cos(angle-Math.PI/6.5),eb.y-size*Math.sin(angle-Math.PI/6.5));
      ctx.lineTo(eb.x-size*0.6*Math.cos(angle),eb.y-size*0.6*Math.sin(angle));
      ctx.lineTo(eb.x-size*Math.cos(angle+Math.PI/6.5),eb.y-size*Math.sin(angle+Math.PI/6.5));
      ctx.closePath();ctx.fill();
      ctx.shadowColor="transparent";
    }
    ctx.restore();
    /* 关系标签：callout 样式（左侧色条 + 半透明背景 + 内高光） */
    if(l.annotation||l.relationType!=="related"){
      const midX=(ea.x+eb.x)/2,midY=(ea.y+eb.y)/2;
      const label=rel.label+(l.annotation?" · "+l.annotation:"");
      ctx.save();ctx.font="600 10px "+FONT;
      ctx.textAlign="center";ctx.textBaseline="middle";
      const tw=ctx.measureText(label).width,pad=7/z,lh=17/z;
      const lbX=midX-tw/2-pad,lbY=midY-8/z-lh/2,lbW=tw+pad*2,lbH=lh;
      /* 背景：关系色 10% 透明 + 品牌色边框 */
      ctx.fillStyle=hexToRgba(linkColor,state.dark?.2:.1);
      roundRectPath(ctx,lbX,lbY,lbW,lbH,lbH/2);ctx.fill();
      /* 顶部内高光 */
      ctx.save();roundRectPath(ctx,lbX+1/z,lbY+1/z,lbW-2/z,lbH-2/z,lbH/2-1);ctx.clip();
      ctx.strokeStyle="rgba(255,255,255,"+(state.dark?.06:.16)+")";ctx.lineWidth=1/z;
      ctx.beginPath();ctx.moveTo(lbX+3/z,lbY+1/z);ctx.lineTo(lbX+lbW-3/z,lbY+1/z);ctx.stroke();
      ctx.restore();
      /* 左侧 3px 色条 */
      ctx.fillStyle=linkColor;ctx.fillRect(lbX,lbY,3/z,lbH);
      /* 文字 */
      ctx.fillStyle=linkColor;ctx.fillText(label,midX+1.5/z,midY-8/z);
      ctx.restore();
    }
  }
}
function hitRelationLink(wx,wy){
  const tolerance=Math.max(3,4.5/state.camera.zoom);
  for(let i=state.links.length-1;i>=0;i--){
    const l=state.links[i],a=state.items.find(it=>it.id===l.aId),b=state.items.find(it=>it.id===l.bId);
    if((a&&a.type==="mindNode"&&!isMindNodeVisible(a))||(b&&b.type==="mindNode"&&!isMindNodeVisible(b)))continue;
    const curve=linkCurve(l);if(!curve)continue;
    let prev=curve.ea,nearest=Infinity;
    for(let step=1;step<=28;step++){
      const t=step/28,u=1-t;
      const p={x:u*u*u*curve.ea.x+3*u*u*t*curve.mx+3*u*t*t*curve.mx+t*t*t*curve.eb.x,y:u*u*u*curve.ea.y+3*u*u*t*curve.ea.y+3*u*t*t*curve.eb.y+t*t*t*curve.eb.y};
      nearest=Math.min(nearest,distToSegment(wx,wy,prev,p));prev=p;
    }
    if(nearest<=tolerance)return{type:"link",id:l.id,...l,annotation:l.annotation||""};
  }
  return null;
}
function drawLinkSelection(l){
  const curve=linkCurve(l);if(!curve)return;
  const z=state.camera.zoom;
  ctx.save();ctx.strokeStyle="#3a4a6b";ctx.lineWidth=5/z;ctx.globalAlpha=.26;ctx.lineCap="round";strokeLinkCurve(ctx,curve);ctx.stroke();
  ctx.globalAlpha=1;ctx.strokeStyle="#3a4a6b";ctx.lineWidth=1.5/z;ctx.setLineDash([4/z,3/z]);strokeLinkCurve(ctx,curve);ctx.stroke();ctx.restore();
}
function edgePoint(cx,cy,px,py,r){
  let dx=px-cx,dy=py-cy;
  const d2=dx*dx+dy*dy;
  if(d2<1e-6) return{x:cx,y:cy};
  const tx=dx>0?(r.x+r.w-cx)/dx:dx<0?(r.x-cx)/dx:Infinity;
  const ty=dy>0?(r.y+r.h-cy)/dy:dy<0?(r.y-cy)/dy:Infinity;
  const t=Math.min(Math.max(tx,0),Math.max(ty,0));
  if(t===Infinity||t<=0) return{x:cx,y:cy};
  return{x:cx+dx*t,y:cy+dy*t};
}
/* 锚点：吸附到矩形四边正中间（而非射线交点的任意位置），连线横平竖直更美观 */
function anchorMid(cx,cy,px,py,r){
  const dx=px-cx,dy=py-cy;
  if(dx===0&&dy===0) return{x:cx,y:cy};
  const gapX=Math.abs(dx)-(r.w/2);
  const gapY=Math.abs(dy)-(r.h/2);
  /* 水平间距更大 → 走左右边中点；否则走上下边中点 */
  if(gapX>=gapY){
    return dx>0?{x:r.x+r.w,y:r.y+r.h/2}:{x:r.x,y:r.y+r.h/2};
  }else{
    return dy>0?{x:r.x+r.w/2,y:r.y+r.h}:{x:r.x+r.w/2,y:r.y};
  }
}
const HANDLES=["nw","n","ne","e","se","s","sw","w"];
function handlePos(b,h){
  const cx=b.x+b.w/2,cy=b.y+b.h/2;
  return{nw:{x:b.x,y:b.y},n:{x:cx,y:b.y},ne:{x:b.x+b.w,y:b.y},e:{x:b.x+b.w,y:cy},se:{x:b.x+b.w,y:b.y+b.h},s:{x:cx,y:b.y+b.h},sw:{x:b.x,y:b.y+b.h},w:{x:b.x,y:cy}}[h];
}
function drawSelection(it){
  if(it.type==="link"){drawLinkSelection(it);return;}
  const c=ctx,z=state.camera.zoom,b=itemBounds(it);
  if(!b) return;
  const r=it.type==="mindNode"?12:Math.min(10,b.h/4);
  const AC=state.dark?"#7b9bd4":"#3a4a6b";
  const pad=3/z;
  c.save();
  /* 第1层：外围柔光晕（立体感） */
  c.shadowColor=state.dark?"rgba(123,155,212,.55)":"rgba(58,74,107,.45)";
  c.shadowBlur=18/z;c.shadowOffsetY=0;
  c.strokeStyle=state.dark?"rgba(123,155,212,.35)":"rgba(58,74,107,.28)";
  c.lineWidth=(5/z);
  roundRectPath(c,b.x-pad,b.y-pad,b.w+pad*2,b.h+pad*2,r+pad);c.stroke();
  /* 第2层：主描边（清晰实线，严格贴合元素 bounds） */
  c.shadowColor="transparent";
  c.strokeStyle=AC;c.lineWidth=2/z;c.setLineDash([]);
  roundRectPath(c,b.x-pad*0.5,b.y-pad*0.5,b.w+pad,b.h+pad,r+pad*0.5);c.stroke();
  /* 第3层：内侧高光（顶部一条白光，增强立体） */
  c.save();
  roundRectPath(c,b.x-pad*0.5,b.y-pad*0.5,b.w+pad,b.h+pad,r+pad*0.5);c.clip();
  c.strokeStyle="rgba(255,255,255,"+(state.dark?.28:.5)+")";c.lineWidth=1/z;
  c.beginPath();c.moveTo(b.x+2/z,b.y-pad*0.5+1/z);c.lineTo(b.x+b.w-2/z,b.y-pad*0.5+1/z);c.stroke();
  c.restore();
  /* 缩放手柄（便签/卡片） */
  if(it.type==="note"||it.type==="fileCard"){
    const hr=3.3/z,inset=3.5/z;
    for(const h of HANDLES){
      const p=handlePos(b,h);
      p.x=clamp(p.x,b.x+inset,b.x+b.w-inset);p.y=clamp(p.y,b.y+inset,b.y+b.h-inset);
      c.fillStyle="#fff";c.strokeStyle=AC;c.lineWidth=2/z;
      c.beginPath();c.arc(p.x,p.y,hr,0,7);c.fill();c.stroke();
    }
  }
  c.restore();
}
/* 绘制多选元素的框 */
function drawMultiSel(){
  const z=state.camera.zoom;
  for(const id of state.multiSel){
    if(id===state.selected) continue;
    /* links 类型 */
    const l=state.links.find(l=>l.id===id);
    if(l){
      const a=state.items.find(i=>i.id===l.aId),b=state.items.find(i=>i.id===l.bId);
      if(a&&b){
        const ab=itemBounds(a),bb=itemBounds(b);
        ctx.save();
        ctx.strokeStyle="#3a4a6b";ctx.lineWidth=4/z;ctx.lineCap="round";
        ctx.globalAlpha=.3;
        ctx.beginPath();ctx.moveTo(ab.x+ab.w/2,ab.y+ab.h/2);ctx.lineTo(bb.x+bb.w/2,bb.y+bb.h/2);ctx.stroke();
        ctx.restore();
      }
      continue;
    }
    const it=state.items.find(i=>i.id===id);
    if(!it) continue;
    if(it.type==="mindNode"&&!isMindNodeVisible(it))continue;
    const b=itemBounds(it);if(!b)continue;
    ctx.save();
    /* 次选中：虚线灰色，区别于主选中的实线蓝色 */
    ctx.setLineDash([6/z,4/z]);ctx.lineWidth=1.5/z;ctx.strokeStyle="rgba(60,60,67,.5)";
    roundRectPath(ctx,b.x-2/z,b.y-2/z,b.w+4/z,b.h+4/z,10);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle="rgba(60,60,67,.5)";
    ctx.beginPath();ctx.arc(b.x-2/z,b.y-2/z,5/z,0,7);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="700 9px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("✓",b.x-2/z,b.y-2/z+0.5);
    ctx.restore();
  }
}
/* 检测鼠标是否在 mindNode 右侧连接点附近（用于拖出连线建立父子关系） */
function hitMindLinkPoint(wx,wy){
  const tol=12/state.camera.zoom;
  for(let i=state.items.length-1;i>=0;i--){
    const it=state.items[i];
    if(it.type!=="mindNode"||!isMindNodeVisible(it)||nodeDepth(it)>=3) continue;
    const b=itemBounds(it);
    const lx=b.x+b.w,ly=b.y+b.h/2;
    if(Math.hypot(wx-lx,wy-ly)<=tol) return it;
  }
  return null;
}
function hitTest(wx,wy){
  /* 内容元素优先；关系线只在精准命中真实曲线时才被选中。 */
  for(let i=state.items.length-1;i>=0;i--){
    const it=state.items[i];
    if(it.type==="note"){
      if(wx>=it.x&&wx<=it.x+it.w&&wy>=it.y&&wy<=it.y+it.h) return it;
    }else if(it.type==="mindNode"){
      if(!isMindNodeVisible(it))continue;
      const b=itemBounds(it);
      if(wx>=b.x&&wx<=b.x+b.w&&wy>=b.y&&wy<=b.y+b.h) return it;
    }else if(it.type==="fileCard"){
      const b=itemBounds(it);
      if(wx>=b.x&&wx<=b.x+b.w&&wy>=b.y&&wy<=b.y+b.h) return it;
    }else if(it.type==="stroke"){
      const tol=Math.max(6,it.size)/state.camera.zoom+3/state.camera.zoom;
      if(segDistToPoint(it.points,wx,wy)<=tol) return it;
    }else if(it.type==="connector"){
      const a=resolveEnd(it.a),b=resolveEnd(it.b);
      if(distToSegment(wx,wy,a,b)<=10/state.camera.zoom) return it;
    }
  }
  return hitRelationLink(wx,wy);
}
/* 悬停预览只跟随元素本体，避免选中元素时边框在邻近节点间漂移。 */
function hoverHit(wx,wy){
  for(let i=state.items.length-1;i>=0;i--){
    const it=state.items[i];
    if(it.type==="note"){
      const m=2/state.camera.zoom;
      if(wx>=it.x-m&&wx<=it.x+it.w+m&&wy>=it.y-m&&wy<=it.y+it.h+m) return it;
    }else if(it.type==="mindNode"){
      if(!isMindNodeVisible(it))continue;
      const b=itemBounds(it);
      const m=2/state.camera.zoom;
      if(wx>=b.x-m&&wx<=b.x+b.w+m&&wy>=b.y-m&&wy<=b.y+b.h+m) return it;
    }else if(it.type==="fileCard"){
      const b=itemBounds(it);
      const m=2/state.camera.zoom;
      if(wx>=b.x-m&&wx<=b.x+b.w+m&&wy>=b.y-m&&wy<=b.y+b.h+m) return it;
    }else if(it.type==="stroke"){
      const tol=Math.max(3,it.size*.6)/state.camera.zoom+2/state.camera.zoom;
      if(segDistToPoint(it.points,wx,wy)<=tol) return it;
    }else if(it.type==="connector"){
      const a=resolveEnd(it.a),b=resolveEnd(it.b);
      if(distToSegment(wx,wy,a,b)<=5/state.camera.zoom) return it;
    }
  }
  return null;
}
function isConnectionItem(it){ return it&&(it.type==="connector"||it.type==="stroke"); }
function isResizableItem(it){ return it&&(it.type==="note"||it.type==="fileCard"); }
/* 导图拖放目标：优先取节点，排除自身及其后代，避免拖到自己子树上 */
function mindDropTarget(wx,wy,selfId){
  let best=null,bestDist=Infinity;
  for(const it of state.items){
    if(it.type!=="mindNode"||it.id===selfId) continue;
    const b=itemBounds(it);
    if(wx>=b.x&&wx<=b.x+b.w&&wy>=b.y&&wy<=b.y+b.h) return it;
    const d=Math.hypot(wx-(b.x+b.w/2),wy-(b.y+b.h/2));
    if(d<bestDist&&d<120/state.camera.zoom){best=it;bestDist=d;}
  }
  return best;
}
function segDistToPoint(pts,x,y){
  if(pts.length<2) return Infinity;
  let best=Infinity;
  for(let i=1;i<pts.length;i++){const d=distToSegment(x,y,pts[i-1],pts[i]);if(d<best)best=d;}
  return best;
}
function distToSegment(px,py,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
  let t=l2?((px-a.x)*dx+(py-a.y)*dy)/l2:0;t=clamp(t,0,1);
  const x=a.x+dx*t,y=a.y+dy*t;
  return Math.hypot(px-x,py-y);
}
function hitHandle(sel,sx,sy){
  const b=itemBounds(sel);if(!b) return null;
  for(const h of HANDLES){
    const p=w2s(handlePos(b,h).x,handlePos(b,h).y);
    if(Math.hypot(sx-p.x,sy-p.y)<=9) return h;
  }
  return null;
}

/* ============================================================
   创建元素
============================================================ */
function addNote(x,y,text,color){
  const it={id:uid++,type:"note",x:Math.round(x-80),y:Math.round(y-40),w:160,h:90,text:text===undefined?"双击编辑":text,color:color||DEFAULT_NOTE_COLOR,fontFamily:state.fontPreset,fontSize:13,underline:false,bold:false,detail:"",annotation:"",birth:performance.now()};
  state.items.push(it);
  return it;
}
function addStroke(wx,wy){
  const it={id:uid++,type:"stroke",points:[{x:wx,y:wy}],color:state.penColor,size:state.penSize,detail:"",annotation:"",birth:performance.now()};
  state.items.push(it);
  return it;
}
function anchorFor(wx,wy){
  for(let i=state.items.length-1;i>=0;i--){
    const it=state.items[i];
    if(it.type==="note"&&wx>=it.x&&wx<=it.x+it.w&&wy>=it.y&&wy<=it.y+it.h){
      return{noteId:it.id,ox:wx-it.x,oy:wy-it.y,free:false};
    }
    if(it.type==="mindNode"||it.type==="fileCard"){
      const b=itemBounds(it);
      if(wx>=b.x&&wx<=b.x+b.w&&wy>=b.y&&wy<=b.y+b.h){
        return{noteId:it.id,ox:wx-b.x,oy:wy-b.y,free:false};
      }
    }
  }
  return{x:wx,y:wy,free:true};
}
function addConnector(a,b){
  const it={id:uid++,type:"connector",a,b,color:state.lineColor,width:Math.max(1.5,state.penSize),detail:"",annotation:"",birth:performance.now()};
  state.items.push(it);
  return it;
}
function addMindNode(text,parentId,color,x,y){
  /* 自动选色：子节点按兄弟数量轮换色板，避免全同色 */
  if(!color&&parentId){
    const p=state.items.find(i=>i.id===parentId);
    if(p&&p.children)color=MIND_COLORS[p.children.length%MIND_COLORS.length];
  }
  const it={
    id:uid++,type:"mindNode",text:text||"新节点",
    parentId:parentId||null,children:[],
    x:x!==undefined?x:0,y:y!==undefined?y:0,
    w:130,h:40,color:color||state.mindColor,collapsed:false,
    attachIds:[],detail:"",annotation:"",
    birth:performance.now(),
  };
  if(parentId){
    const p=state.items.find(i=>i.id===parentId);
    if(p) p.children.push(it.id);
  }
  state.items.push(it);
  return it;
}
function addFileCard(x,y,fileId){
  const f=state.files.find(x=>x.id===fileId);
  const it={id:uid++,type:"fileCard",x:x-80,y:y-24,w:160,h:52,fileId,kind:f?f.kind:"other",thumb:f&&f.thumb?f.thumb:null,tw:f&&f.tw?f.tw:1,th:f&&f.th?f.th:1,detail:"",annotation:"",birth:performance.now()};
  if(f&&f.kind==="img"&&f.thumb&&f.tw){it.thumb=f.thumb;it.tw=f.tw;it.th=f.th;it.h=Math.max(52,f.thumb.height?Math.round(f.thumb.height*(100/f.thumb.width))+26:52);}
  state.items.push(it);
  return it;
}
function deleteItem(id){
  const linkIndex=state.links.findIndex(l=>l.id===id);
  if(linkIndex>=0){
    pushHistory("删除连接");state.links.splice(linkIndex,1);
    state.selected=null;state.multiSel=state.multiSel.filter(x=>x!==id);
    render();saveState();toast("已删除连接");return;
  }
  const idx=state.items.findIndex(i=>i.id===id);
  if(idx<0) return;
  pushHistory("删除元素");
  const removeIds=new Set();
  const collect=itemId=>{
    if(removeIds.has(itemId))return;removeIds.add(itemId);
    const node=state.items.find(i=>i.id===itemId);
    if(node&&node.type==="mindNode") for(const childId of node.children||[]) collect(childId);
  };
  collect(id);
  state.items=state.items.filter(it=>{
    if(removeIds.has(it.id))return false;
    if(it.type==="connector")return !removeIds.has(it.a.noteId)&&!removeIds.has(it.b.noteId);
    return true;
  });
  state.links=state.links.filter(l=>!removeIds.has(l.aId)&&!removeIds.has(l.bId));
  for(const it of state.items){
    if(it.type!=="mindNode")continue;
    it.children=(it.children||[]).filter(c=>!removeIds.has(c));
    it.attachIds=(it.attachIds||[]).filter(a=>!removeIds.has(a));
  }
  if(removeIds.has(state.selected))state.selected=null;
  state.multiSel=state.multiSel.filter(x=>!removeIds.has(x));
  cleanupProjectReferences();
  render();saveState();
}
function duplicateItem(id){
  const src=state.items.find(i=>i.id===id);
  if(!src) return;
  pushHistory("复制");
  const cp=JSON.parse(JSON.stringify(src));
  cp.id=uid++;
  cp.birth=performance.now();
  if(cp.type==="note"){cp.x+=24;cp.y+=24;}
  if(cp.type==="stroke") cp.points=cp.points.map(p=>({x:p.x+24,y:p.y+24}));
  if(cp.type==="connector"){cp.a.free&&(cp.a.x+=24);cp.a.free&&(cp.a.y+=24);cp.b.free&&(cp.b.x+=24);cp.b.free&&(cp.b.y+=24);}
  if(cp.type==="mindNode"){cp.x+=24;cp.y+=24;cp.children=[];cp.parentId=null;}
  if(cp.type==="fileCard"){cp.x+=24;cp.y+=24;const f=state.files.find(x=>x.id===cp.fileId);if(f){cp.thumb=f.thumb||null;}}
  state.items.push(cp);
  state.selected=cp.id;
  render();
}
/* 导图操作 */
/* 节点自动命名：根=总节点，1级=一级节点A/B/C，2级=二级节点A/B/C */
function defaultNodeName(parentId){
  if(!parentId){
    /* 根节点 */
    const roots=state.items.filter(i=>i.type==="mindNode"&&!i.parentId);
    return roots.length===0?"总节点":"总节点 "+String.fromCharCode(65+roots.length-1);
  }
  const depth=nodeDepthById(parentId);
  const levelNames=["总节点","一级节点","二级节点","三级节点"];
  const baseName=levelNames[depth+1]||"节点";
  /* 统计同父同级已有节点数 */
  const parent=state.items.find(i=>i.id===parentId);
  const siblings=(parent?.children||[]).map(cid=>state.items.find(i=>i.id===cid)).filter(Boolean);
  const letter=String.fromCharCode(65+siblings.length);
  return baseName+" "+letter;
}
/* 通过 parentId 计算深度（不依赖 nodeDepth 避免循环） */
function nodeDepthById(id){
  let d=0;
  let it=state.items.find(i=>i.id===id);
  const seen=new Set();
  while(it&&it.parentId&&!seen.has(it.id)){
    seen.add(it.id);
    d++;
    it=state.items.find(i=>i.id===it.parentId);
  }
  return d;
}
function addChildMind(n){
  if(!n||n.type!=="mindNode") return;
  pushHistory("添加子节点");
  const b=itemBounds(n);
  const child=addMindNode(defaultNodeName(n.id),n.id,null,b.x+b.w+60,b.y);
  /* 自动找不遮挡位置 */
  smartPlace(child);
  state.selected=child.id;
  if(state.mindMode==="auto") autoLayout();
  render();saveState();
  setTimeout(()=>openTextEditor(child),50);
}
function addSiblingMind(n){
  if(!n||n.type!=="mindNode"||!n.parentId) return;
  const p=state.items.find(i=>i.id===n.parentId);
  if(!p) return;
  pushHistory("添加同级");
  const pb=itemBounds(p);
  const b=itemBounds(n);
  const idx=(p.children||[]).indexOf(n.id);
  const sib=addMindNode(defaultNodeName(n.parentId),p.id,n.color,b.x,b.y+b.h+12);
  p.children=(p.children||[]).slice(0,idx+1).concat(sib.id,(p.children||[]).slice(idx+1));
  /* 自动找不遮挡位置 */
  smartPlace(sib);
  state.selected=sib.id;
  if(state.mindMode==="auto") autoLayout();
  render();saveState();
  setTimeout(()=>openTextEditor(sib),50);
}
/* smartPlace：给新元素找一个不遮挡其他元素的位置 */
function smartPlace(it){
  const GAP=18;
  let tries=0;
  while(tries<20){
    const b=itemBounds(it);if(!b)return;
    let overlap=false;
    for(const other of state.items){
      if(other===it) continue;
      const ob=itemBounds(other);if(!ob)continue;
      const ox=Math.min(b.x+b.w,ob.x+ob.w)-Math.max(b.x,ob.x);
      const oy=Math.min(b.y+b.h,ob.y+ob.h)-Math.max(b.y,ob.y);
      if(ox>4&&oy>4){
        /* 有重叠，向下移 */
        it.y=ob.y+ob.h+GAP;
        overlap=true;break;
      }
    }
    if(!overlap)break;
    tries++;
  }
}
function toggleCollapse(n){
  if(!n||!(n.children&&n.children.length))return;
  pushHistory("折叠/展开");
  n.collapsed=!n.collapsed;
  render();saveState();
  toast(n.collapsed?"已收起 "+Math.max(0,subtreeCount(n)-1)+" 个子节点":"已展开子节点");
}
/* 显式改父级（替代拖拽误触）：将 node 移到 newParent 下，或移到根级 */
function reparentNode(node,newParent){
  if(!node||node.type!=="mindNode") return;
  if(newParent&&node.id===newParent.id) {toast("不能设为自己的子节点");return;}
  /* 环检测：禁止移到自己的后代下 */
  if(newParent){
    let p=newParent;
    while(p){
      if(p.id===node.id){toast("不能移到自己的后代下（会形成环）");return;}
      p=p.parentId?state.items.find(i=>i.id===p.parentId):null;
    }
  }
  pushHistory("改父级");
  /* 从旧父级的 children 移除 */
  if(node.parentId){
    const oldP=state.items.find(i=>i.id===node.parentId);
    if(oldP) oldP.children=(oldP.children||[]).filter(c=>c!==node.id);
  }
  if(newParent){
    node.parentId=newParent.id;
    if(!newParent.children.includes(node.id)) newParent.children.push(node.id);
    toast("已设为「"+newParent.text+"」的子节点");
  }else{
    node.parentId=null;
    toast("已移到根级");
  }
  if(state.mindMode==="auto") autoLayout();
  render();saveState();
}
/* 同级排序：上移/下移 */
function moveSibling(dir){
  const n=selectedItem();
  if(!n||n.type!=="mindNode"||!n.parentId) return;
  const p=state.items.find(i=>i.id===n.parentId);
  if(!p||!p.children) return;
  const idx=p.children.indexOf(n.id);
  const ni=idx+dir;
  if(ni<0||ni>=p.children.length) return;
  pushHistory("同级排序");
  [p.children[idx],p.children[ni]]=[p.children[ni],p.children[idx]];
  if(state.mindMode==="auto") autoLayout();
  render();saveState();
  toast(dir<0?"已上移":"已下移");
}
/* 提级：将当前节点移到其父级的同级（父级的父级下） */
function promoteNode(){
  const n=selectedItem();
  if(!n||n.type!=="mindNode"||!n.parentId) {toast("已在根级");return;}
  const p=state.items.find(i=>i.id===n.parentId);
  if(!p) return;
  if(!p.parentId){ /* 父是根，移到根级 */ reparentNode(n,null); return; }
  const gp=state.items.find(i=>i.id===p.parentId);
  if(!gp){ reparentNode(n,null); return; }
  reparentNode(n,gp);
  /* 提级后放在原父级后面 */
  const gi=gp.children.indexOf(n.id);
  const pi=gp.children.indexOf(p.id);
  if(gi>=0&&pi>=0&&gi!==pi+1){
    gp.children.splice(gi,1);
    gp.children.splice(pi+1,0,n.id);
  }
  if(state.mindMode==="auto") autoLayout();
  render();saveState();
  toast("已提级");
}
/* 降级：将当前节点移到前一个同级节点下 */
function demoteNode(){
  const n=selectedItem();
  if(!n||n.type!=="mindNode"||!n.parentId) {toast("无法降级：已在根级");return;}
  const p=state.items.find(i=>i.id===n.parentId);
  if(!p||!p.children) return;
  const idx=p.children.indexOf(n.id);
  if(idx<=0){toast("无前驱同级节点可降入");return;}
  const prev=state.items.find(i=>i.id===p.children[idx-1]);
  if(!prev){return;}
  reparentNode(n,prev);
  toast("已降级");
}

/* ============================================================
   便签/材料 ↔ 导图节点 关联（attachIds）— 已按需求整体移除
   ------------------------------------------------------------
   拖动便签到节点建立关联、节点/便签右上角角标均已删除。
   以下保留空实现，仅为兼容遗留调用点，不再产生任何关联行为。
============================================================ */
function attachToNode(){ return false; }
function detachAll(){}
function attachedItems(){ return []; }
function nodeOf(){ return null; }
/* 导入、撤销和删除之后统一清理悬空引用，避免“看不见但还存在”的关系。 */
function cleanupCanvasReferences(canvas){
  const ids=new Set((canvas.items||[]).map(it=>it.id));
  canvas.links=(canvas.links||[]).filter(l=>ids.has(l.aId)&&ids.has(l.bId)).map(l=>({
    ...l,relationType:RELATION_TYPES[l.relationType]?l.relationType:"related",
    directional:l.directional===undefined?!!RELATION_TYPES[l.relationType]?.directional:!!l.directional,
  }));
  for(const it of canvas.items||[]){
    if(it.type!=="mindNode")continue;
    it.children=(it.children||[]).filter(id=>ids.has(id));
    it.attachIds=(it.attachIds||[]).filter(id=>ids.has(id));
    if(it.parentId&&!ids.has(it.parentId))it.parentId=null;
  }
}
function cleanupProjectReferences(){
  const project=curProject();if(!project)return;
  for(const canvas of project.canvases){cleanupCanvasReferences(canvas);}
  for(const canvas of project.canvases){
    for(const item of canvas.items||[]){
      if(!item.jumpTo)continue;
      const ref=typeof item.jumpTo==="string"?{canvasId:item.jumpTo}:item.jumpTo;
      const target=project.canvases.find(c=>c.id===ref.canvasId);
      if(!target){item.jumpTo=null;continue;}
      if(ref.itemId&&!target.items.some(i=>i.id===ref.itemId))item.jumpTo={canvasId:target.id,itemId:null};
    }
  }
}
function cleanupReferences(){cleanupProjectReferences();}
/* 自动树布局：根在左，向右逐层展开（手动模式下不调用） */
function autoLayout(){
  /* 切换布局时先展开所有折叠节点，避免隐藏子树干扰布局计算 */
  for(const it of state.items){
    if(it.type==="mindNode"&&it.collapsed)it.collapsed=false;
  }
  /* 统一走新布局分发（radial 大爆炸 / both 双列 已删除） */
  applyAutoLayout();
  return;
  const root=state.items.find(it=>it.type==="mindNode"&&!it.parentId);
  if(!root) return;
  const GAP_Y=12;          /* 同级节点垂直间距 */
  const GAP_X=60;          /* 父子水平间距 */
  const MIN_NODE_W=160;
  /* 递归计算子树高度 + 布局 */
  function subtreeH(n){
    const b=itemBounds(n);
    if(n.collapsed||!(n.children||[]).length) return b.h;
    let total=0;
    for(const cid of n.children){
      const c=state.items.find(i=>i.id===cid);if(!c)continue;
      total+=subtreeH(c)+GAP_Y;
    }
    return Math.max(b.h, total-GAP_Y);
  }
  function place(n,x,centerY){
    const b=itemBounds(n);
    n.x=x;
    n.y=centerY-b.h/2;
    if(n.collapsed||!(n.children||[]).length) return b.h;
    const kids=n.children.map(c=>state.items.find(i=>i.id===c)).filter(Boolean);
    if(!kids.length) return b.h;
    /* 子节点 x 位置：父节点右边 + GAP_X，但至少离父节点右边沿 GAP_X */
    const childX=x+Math.max(b.w,MIN_NODE_W)+GAP_X;
    /* 计算每个子树高度，从父节点中心向上/向下分配 */
    const subs=kids.map(k=>({node:k,h:subtreeH(k)}));
    let totalH=0;subs.forEach(s=>totalH+=s.h+GAP_Y);
    totalH-=GAP_Y;
    let startY=centerY-totalH/2;
    for(const s of subs){
      const childCenterY=startY+s.h/2;
      place(s.node,childX,childCenterY);
      startY+=s.h+GAP_Y;
    }
    return Math.max(b.h,totalH);
  }
  place(root,root.x||80,root.y+b_height(root)/2);
  /* 避免便签/卡片与节点重叠：自动微调便签和卡片位置 */
  avoidOverlap();
  function b_height(n){const b=itemBounds(n);return b.h;}
}
/* ---------------- 通用工具 ---------------- */
function layoutRoot(){
  return state.items.find(it=>it.type==="mindNode"&&!it.parentId);
}
function kidsOf(n){
  if(!n||n.collapsed)return [];
  return (n.children||[]).map(id=>state.items.find(it=>it.id===id)).filter(Boolean);
}
function subTreeH(n,GAP_Y){
  const b=itemBounds(n),ks=kidsOf(n);
  if(!ks.length)return b.h;
  return Math.max(b.h,ks.reduce((s,k)=>s+subTreeH(k,GAP_Y),0)+GAP_Y*(ks.length-1));
}
/* ---------------- 1. 逻辑图（向右） ---------------- */
function logicRightLayout(){
  const root=layoutRoot();if(!root)return;
  const GAP_X=64,GAP_Y=14;
  const rb=itemBounds(root);root.x=-rb.w/2;root.y=-rb.h/2;
  function place(node,x,cursor){
    const b=itemBounds(node),ks=kidsOf(node);
    const total=subTreeH(node,GAP_Y);
    node.x=x;node.y=cursor+total/2-b.h/2;
    if(!ks.length)return;
    let cy=cursor;
    for(const k of ks){
      const kh=subTreeH(k,GAP_Y);
      place(k,x+b.w+GAP_X,cy);
      cy+=kh+GAP_Y;
    }
  }
  let cy=-subTreeH(root,GAP_Y)/2;
  for(const k of kidsOf(root)){
    const kh=subTreeH(k,GAP_Y);
    place(k,-rb.w/2+rb.w+GAP_X,cy);
    cy+=kh+GAP_Y;
  }
}
/* ---------------- 2. 组织结构图（向下） ---------------- */
function orgDownLayout(){
  const root=layoutRoot();if(!root)return;
  const GAP_Y=58,GAP_X=16;
  const rb=itemBounds(root);root.x=-rb.w/2;root.y=-rb.h/2;
  function subTreeW(n){
    const b=itemBounds(n),ks=kidsOf(n);
    if(!ks.length)return b.w;
    return Math.max(b.w,ks.reduce((s,k)=>s+subTreeW(k),0)+GAP_X*(ks.length-1));
  }
  function place(node,cx,y){
    const b=itemBounds(node),ks=kidsOf(node);
    node.x=cx-b.w/2;node.y=y;
    if(!ks.length)return;
    const totalW=ks.reduce((s,k)=>s+subTreeW(k),0)+GAP_X*(ks.length-1);
    let x=cx-totalW/2;
    for(const k of ks){
      const kw=subTreeW(k);
      place(k,x+kw/2,y+b.h+GAP_Y);
      x+=kw+GAP_X;
    }
  }
  place(root,0,-rb.h/2);
}
/* ---------------- 3. 鱼骨图（因果分析） ---------------- */
function fishboneLayout(){
  const root=layoutRoot();if(!root)return;
  const ks=kidsOf(root);
  const rb=itemBounds(root);
  const SPINE_LEN=520;
  root.x=SPINE_LEN;root.y=-rb.h/2;
  if(!ks.length)return;
  let upIdx=0,downIdx=0;
  ks.forEach((k,i)=>{
    const up=i%2===0;
    const slot=up?upIdx++:downIdx++;
    const b=itemBounds(k);
    const x=SPINE_LEN-120-slot*130-b.w;
    const y=up?-(90+slot*46)-b.h:(90+slot*46);
    k.x=x;k.y=y;
    kidsOf(k).forEach((g,j)=>{
      const gb=itemBounds(g);
      g.x=x-16-j*14;
      g.y=up?y-(j+1)*(gb.h+8):y+b.h+8+j*(gb.h+8);
    });
  });
}
/* ---------------- 4. 时间轴（横向） ---------------- */
function timelineLayout(){
  const root=layoutRoot();if(!root)return;
  const ks=kidsOf(root);
  const rb=itemBounds(root);
  root.x=-rb.w/2;root.y=-rb.h/2;
  const GAP=190,AXIS_Y=150;
  if(!ks.length)return;
  const totalW=ks.length*GAP;
  let x=-totalW/2+GAP/2;
  for(const k of ks){
    const b=itemBounds(k);
    k.x=x-b.w/2;k.y=AXIS_Y;
    let gy=AXIS_Y+b.h+34;
    for(const g of kidsOf(k)){
      const gb=itemBounds(g);
      g.x=x-gb.w/2;g.y=gy;gy+=gb.h+12;
    }
    x+=GAP;
  }
}
/* ---------------- 5. 括号图（向右，大括号连接） ---------------- */
function braceLayout(){
  logicRightLayout();
}
/* 布局分发（radial 大爆炸 / both 双列 已按需求删除） */
function applyAutoLayout(){
  for(const it of state.items){
    if(it.type==="mindNode"&&it.collapsed)it.collapsed=false;
  }
  const t=state.layoutType||"right";
  if(t==="org")orgDownLayout();
  else if(t==="fishbone")fishboneLayout();
  else if(t==="timeline")timelineLayout();
  else if(t==="brace")braceLayout();
  else logicRightLayout();
  avoidOverlap();
}
/* 兼容旧名 */
function radialLayout(){applyAutoLayout();}
function bothSidesLayout(){applyAutoLayout();}
function localAvoid(dragged){
  if(!dragged)return;
  const GAP=18;
  const queue=[dragged.id];
  const visited=new Set();
  for(let iter=0;iter<10;iter++){
    while(queue.length>0){
      const id=queue.shift();
      if(visited.has(id))continue;
      visited.add(id);
      const cur=state.items.find(i=>i.id===id);
      if(!cur)continue;
      const db=itemBounds(cur);if(!db)continue;
      for(const other of state.items){
        if(other===cur||other.type==="stroke"||other.type==="connector")continue;
        const ob=itemBounds(other);if(!ob)continue;
        const ox=Math.min(db.x+db.w,ob.x+ob.w)-Math.max(db.x,ob.x);
        const oy=Math.min(db.y+db.h,ob.y+ob.h)-Math.max(db.y,ob.y);
        if(ox>4&&oy>4){
          if(ox<oy){
            const push=ox/2+GAP;
            if(other.x+ob.w/2>db.x+db.w/2) other.x+=push;
            else other.x-=push;
          }else{
            const push=oy/2+GAP;
            if(other.y+ob.h/2>db.y+db.h/2) other.y+=push;
            else other.y-=push;
          }
          /* 被推开的元素加入队列，检查连锁碰撞 */
          if(!visited.has(other.id))queue.push(other.id);
        }
      }
    }
    if(queue.length===0)break;
    visited.clear();
  }
}
function updateSelBar(){
  if(editingNoteId!==null||editingMindId!==null){selbar.style.display="none";return;}
  const sel=selectedItem();
  if(!sel){selbar.style.display="none";return;}
function localAvoid(dragged){
  if(!dragged)return;
  const GAP=18;
  const queue=[dragged.id];
  const visited=new Set();
  for(let iter=0;iter<10;iter++){
    while(queue.length>0){
      const id=queue.shift();
      if(visited.has(id))continue;
      visited.add(id);
      const cur=state.items.find(i=>i.id===id);
      if(!cur)continue;
      const db=itemBounds(cur);if(!db)continue;
      for(const other of state.items){
        if(other===cur||other.type==="stroke"||other.type==="connector")continue;
        const ob=itemBounds(other);if(!ob)continue;
        const ox=Math.min(db.x+db.w,ob.x+ob.w)-Math.max(db.x,ob.x);
        const oy=Math.min(db.y+db.h,ob.y+ob.h)-Math.max(db.y,ob.y);
        if(ox>4&&oy>4){
          if(ox<oy){
            const push=ox/2+GAP;
            if(other.x+ob.w/2>db.x+db.w/2) other.x+=push;
            else other.x-=push;
          }else{
            const push=oy/2+GAP;
            if(other.y+ob.h/2>db.y+db.h/2) other.y+=push;
            else other.y-=push;
          }
          /* 被推开的元素加入队列，检查连锁碰撞 */
          if(!visited.has(other.id))queue.push(other.id);
        }
      }
    }
    if(queue.length===0)break;
    visited.clear();
  }
}
function updateSelBar(){
  if(editingNoteId!==null||editingMindId!==null){selbar.style.display="none";return;}
  const sel=selectedItem();
  if(!sel){selbar.style.display="none";return;}
function localAvoid(dragged){
  if(!dragged)return;
  const GAP=12;
  const queue=[dragged.id];
  const visited=new Set();
  for(let iter=0;iter<10;iter++){
    while(queue.length>0){
      const id=queue.shift();
      if(visited.has(id))continue;
      visited.add(id);
      const cur=state.items.find(i=>i.id===id);
      if(!cur)continue;
      const db=itemBounds(cur);if(!db)continue;
      for(const other of state.items){
        if(other===cur||other.type==="stroke"||other.type==="connector")continue;
        const ob=itemBounds(other);if(!ob)continue;
        const ox=Math.min(db.x+db.w,ob.x+ob.w)-Math.max(db.x,ob.x);
        const oy=Math.min(db.y+db.h,ob.y+ob.h)-Math.max(db.y,ob.y);
        if(ox>4&&oy>4){
          if(ox<oy){
            const push=ox/2+GAP;
            if(other.x+ob.w/2>db.x+db.w/2) other.x+=push;
            else other.x-=push;
          }else{
            const push=oy/2+GAP;
            if(other.y+ob.h/2>db.y+db.h/2) other.y+=push;
            else other.y-=push;
          }
          /* 被推开的元素加入队列，检查连锁碰撞 */
          if(!visited.has(other.id))queue.push(other.id);
        }
      }
    }
    if(queue.length===0)break;
    visited.clear();
  }
}
function updateSelBar(){
  if(editingNoteId!==null||editingMindId!==null){selbar.style.display="none";return;}
  const sel=selectedItem();
  if(!sel){selbar.style.display="none";return;}
  const b=itemBounds(sel);
  if(!b){selbar.style.display="none";return;}
  /* 元素变化时重建按钮（只重建一次，不在定位过程中重建） */
  if(selbar.dataset.id!==String(sel.id)){
    renderSelBar(sel);
  }
  /* 位置计算：元素顶边中心 → 屏幕坐标 */
  const sp=w2s(b.x+b.w/2,b.y);
  /* 用 fixed 像素值定位，不依赖 offsetHeight */
  const barH=40; /* selbar 固定高度约40px */
  selbar.style.display="flex";
  selbar.style.left=clamp(sp.x,10,W-10)+"px";
  selbar.style.top=Math.max(58,sp.y-barH-8)+"px";
  selbar.style.transform="translateX(-50%)";
}
function sbtn(html,title,fn,danger){
  const b=document.createElement("button");
  b.className="sbtn"+(danger?" danger":"");b.title=title;b.innerHTML=html;
  b.addEventListener("pointerdown",e=>{e.stopPropagation();e.preventDefault();fn();});
  return b;
}
function renderSelBar(sel){
  selbar.dataset.id=String(sel.id);
  selbar.innerHTML="";
  /* 左段：类型标签 + 色板 */
  const label=document.createElement("span");label.className="stype";label.textContent=SEL_LABEL[sel.type]||"";
  selbar.appendChild(label);
  const palette=sel.type==="note"?NOTE_COLORS:sel.type==="mindNode"?MIND_COLORS:null;
  if(palette){
    for(const col of palette){
      const b=document.createElement("button");
      b.className="swatch"+(col===sel.color?" on":"");
      b.style.background=col;b.title="颜色";
      b.addEventListener("pointerdown",e=>{
        e.stopPropagation();e.preventDefault();
        pushHistory("改颜色");sel.color=col;
        if(sel.type==="note") state.noteColor=col;
        if(sel.type==="mindNode"&&!sel.parentId) state.mindColor=col;
        renderSelBar(sel);render();saveState();
      });
      selbar.appendChild(b);
    }
    const sep1=document.createElement("span");sep1.className="ssep";selbar.appendChild(sep1);
  }
  /* 中段：上下文操作 — 聚焦/展开内容/批注/跃迁 */
  if(sel.type!=="link"){
    selbar.appendChild(sbtn(ICON.focus,"聚焦 (F)",()=>enterFocus(sel.id)));
    selbar.appendChild(sbtn("📄",sel.detail?"编辑展开内容 (E)":"添加展开内容 (E)",()=>{state.selected=sel.id;openDetail();}));
    selbar.appendChild(sbtn(ICON.annotate,sel.annotation?"编辑批注 (A)":"添加批注 (A)",()=>{state.selected=sel.id;openAnnotation();}));
    selbar.appendChild(sbtn(ICON.jump,sel.jumpTo?"跳转/修改跃迁 (J)":"设置跃迁 (J)",()=>{state.selected=sel.id;openJump();}));
    const sep2=document.createElement("span");sep2.className="ssep";selbar.appendChild(sep2);
  }
  /* 类型特定操作 */
  if(sel.type==="fileCard"){
    const f=state.files.find(x=>x.id===sel.fileId);
    if(f) selbar.appendChild(sbtn(ICON.view,"预览/打开",()=>openPreview(f.id)));
    const sep3=document.createElement("span");sep3.className="ssep";selbar.appendChild(sep3);
  }
  if(sel.type==="mindNode"){
    selbar.appendChild(sbtn(ICON.plus,"添加子节点 (Tab)",()=>addChildMind(sel)));
    selbar.appendChild(sbtn(sel.collapsed?"+":"−","折叠/展开子树",()=>toggleCollapse(sel)));
    const sep3=document.createElement("span");sep3.className="ssep";selbar.appendChild(sep3);
  }
  /* 右段：连接选中（多选时）/ 复制 / 删除 */
  if(state.multiSel.length>=1&&sel.type!=="link"){
    selbar.appendChild(sbtn(ICON.connector,"连接选中 (C)",()=>toggleLink()));
  }
  selbar.appendChild(sbtn(ICON.copy,"复制 (Ctrl+D)",()=>duplicateItem(sel.id)));
  selbar.appendChild(sbtn(ICON.trash,"删除 (Delete)",()=>deleteItem(sel.id),true));
}

/* ============================================================
   文本编辑（便签/导图共用 textarea）
============================================================ */
function openTextEditor(it){
  const isMind=it.type==="mindNode";
  if((isMind?editingMindId:editingNoteId)===it.id) return;
  closeEditor(true);closeMindEditor(true);
  const z=state.camera.zoom,b=itemBounds(it);
  const tl=w2s(b.x,b.y),br=w2s(b.x+b.w,b.y+b.h);
  noteEd.style.display="block";
  noteEd.style.left=tl.x+"px";noteEd.style.top=tl.y+"px";
  noteEd.style.width=(br.x-tl.x)+"px";noteEd.style.height=(br.y-tl.y)+"px";
  const style=noteTypography(it);
  noteEd.style.fontFamily=style.family;
  noteEd.style.fontWeight=style.bold?"700":"500";
  noteEd.style.textDecoration=style.underline?"underline":"none";
  noteEd.style.fontSize=(isMind?13:style.size)*z+"px";
  noteEd.style.lineHeight=(isMind?20:Math.round(style.size*1.42))*z+"px";
  noteEd.style.background=!isMind?it.color:(it.parentId?"#ffffff":"#3a4a6b");
  noteEd.style.color=isMind&&!it.parentId?"#fff":"#1d1d1f";
  noteEd.value=it.text;
  if(isMind){
    editingMindId=it.id;noteFormatBar.style.display="none";notePreview.style.display="none";
  }else{
    editingNoteId=it.id;
    editingNoteDraftStyle={fontFamily:it.fontFamily||state.fontPreset,fontSize:style.size,underline:style.underline,bold:style.bold};
    showNoteEditorChrome(it,tl,br);
  }
  noteEd.focus();noteEd.setSelectionRange(noteEd.value.length,noteEd.value.length);
}
function showNoteEditorChrome(it,tl,br){
  for(const [id,preset] of Object.entries(FONT_PRESETS)){
    if(!noteFontSelect.querySelector('option[value="'+id+'"]')){const o=document.createElement("option");o.value=id;o.textContent=preset.label;noteFontSelect.appendChild(o);}
  }
  const style=editingNoteDraftStyle||noteTypography(it);
  noteFontSelect.value=style.fontFamily||state.fontPreset;
  noteFontSize.textContent=style.fontSize;
  document.getElementById("noteUnderline").classList.toggle("on",!!style.underline);
  document.getElementById("noteBold").classList.toggle("on",!!style.bold);
  noteFormatBar.style.display="flex";
  noteFormatBar.style.left=clamp(tl.x,8,Math.max(8,W-noteFormatBar.offsetWidth-8))+"px";
  noteFormatBar.style.top=Math.max(8,tl.y-noteFormatBar.offsetHeight-8)+"px";
  /* （已移除：编辑便签时的 Markdown 预览浮窗，用途不明且干扰编辑） */
  notePreview.style.display="none";
}
function updateNotePreview(){
  if(editingNoteId===null)return;
  if(editingNoteId===null)return;
  const style=editingNoteDraftStyle||{};
  notePreview.innerHTML=markdownToHtml(noteEd.value);
  notePreview.style.fontFamily=(FONT_PRESETS[style.fontFamily]||FONT_PRESETS[state.fontPreset]).stack;
  notePreview.style.fontSize=(style.fontSize||13)+"px";
  notePreview.style.textDecoration=style.underline?"underline":"none";
  notePreview.style.fontWeight=style.bold?"700":"500";
}
function changeNoteFormat(patch){
  if(editingNoteId===null)return;
  editingNoteDraftStyle={...editingNoteDraftStyle,...patch};
  const it=state.items.find(i=>i.id===editingNoteId);if(!it)return;
  const style=editingNoteDraftStyle,z=state.camera.zoom;
  noteEd.style.fontFamily=(FONT_PRESETS[style.fontFamily]||FONT_PRESETS[state.fontPreset]).stack;
  noteEd.style.fontSize=style.fontSize*z+"px";
  noteEd.style.lineHeight=Math.round(style.fontSize*1.42)*z+"px";
  noteEd.style.fontWeight=style.bold?"700":"500";noteEd.style.textDecoration=style.underline?"underline":"none";
  const b=itemBounds(it),tl=w2s(b.x,b.y),br=w2s(b.x+b.w,b.y+b.h);showNoteEditorChrome(it,tl,br);
}
noteEd.addEventListener("input",updateNotePreview);
noteFontSelect.addEventListener("change",()=>changeNoteFormat({fontFamily:noteFontSelect.value}));
document.getElementById("noteFontDown").addEventListener("pointerdown",e=>{e.preventDefault();changeNoteFormat({fontSize:clamp(((editingNoteDraftStyle&&editingNoteDraftStyle.fontSize)||13)-1,10,28)});});
document.getElementById("noteFontUp").addEventListener("pointerdown",e=>{e.preventDefault();changeNoteFormat({fontSize:clamp(((editingNoteDraftStyle&&editingNoteDraftStyle.fontSize)||13)+1,10,28)});});
document.getElementById("noteUnderline").addEventListener("pointerdown",e=>{e.preventDefault();changeNoteFormat({underline:!editingNoteDraftStyle.underline});});
document.getElementById("noteBold").addEventListener("pointerdown",e=>{e.preventDefault();changeNoteFormat({bold:!editingNoteDraftStyle.bold});});
function closeEditor(cancel){
  if(editingNoteId===null) return;
  const it=state.items.find(i=>i.id===editingNoteId);
  if(it){
    const v=noteEd.value;
    const draft=editingNoteDraftStyle||{};
    const changed=v!==it.text||it.fontFamily!==draft.fontFamily||Number(it.fontSize||13)!==Number(draft.fontSize)||!!it.underline!==!!draft.underline||!!it.bold!==!!draft.bold;
    if(!cancel&&changed){pushHistory("编辑便签");it.text=v;it.fontFamily=draft.fontFamily;it.fontSize=draft.fontSize;it.underline=!!draft.underline;it.bold=!!draft.bold;}
    saveState();
  }
  editingNoteId=null;
  editingNoteDraftStyle=null;
  noteEd.style.display="none";
  noteFormatBar.style.display="none";notePreview.style.display="none";
  requestRender();
}
function closeMindEditor(cancel){
  if(editingMindId===null) return;
  const it=state.items.find(i=>i.id===editingMindId);
  if(it){
    const v=noteEd.value;
    if(!cancel&&v!==it.text){pushHistory("编辑节点");it.text=v;if(state.mindMode==="auto")autoLayout();}
    saveState();
  }
  editingMindId=null;
  noteEd.style.display="none";
  noteFormatBar.style.display="none";notePreview.style.display="none";
  requestRender();
}
function isTyping(){const tag=(document.activeElement&&document.activeElement.tagName)||"";return tag==="TEXTAREA"||tag==="INPUT";}

/* ---------- 右键菜单（内容编辑 / 空白添加） ---------- */
let ctxTarget=null;
function showCtxMenu(e,item){
  ctxTarget=item;
  ctxMenu.innerHTML="";
  const bxy=boardXY(e.clientX,e.clientY);
  const mw=s2w(bxy.x,bxy.y);
  const sec=document.createElement("div");
  sec.style.cssText="padding:6px 10px 4px;font-size:var(--text-xs);color:#9aa3b2;letter-spacing:.4px;font-weight:700";
  const body=document.createElement("div");
  ctxMenu.appendChild(sec);ctxMenu.appendChild(body);

  if(item&&item.type==="link"){
    const rel=RELATION_TYPES[item.relationType]||RELATION_TYPES.related;
    sec.textContent="关系线 · "+rel.label;
    const semantic=mkItem(ICON.connector,"设置关系语义",null,false);semantic.onclick=()=>{hideCtxMenu();setLinkRelation(item.id);};
    const ann=mkItem("",item.annotation?"编辑批注 (A)":"添加批注 (A)",null,false);ann.onclick=()=>{hideCtxMenu();state.selected=item.id;openAnnotation();};
    const del=mkItem(ICON.trash,"删除连接",null,true);del.onclick=()=>{hideCtxMenu();deleteItem(item.id);};
    body.appendChild(semantic);body.appendChild(ann);
    const sep=document.createElement("div");sep.className="csep";body.appendChild(sep);body.appendChild(del);
    ctxMenu.style.display="block";
    let mx=e.clientX,my=e.clientY;ctxMenu.style.left=mx+"px";ctxMenu.style.top=my+"px";
    requestAnimationFrame(()=>{const w=ctxMenu.offsetWidth,h=ctxMenu.offsetHeight;let nx=mx,ny=my;if(nx+w>window.innerWidth-8)nx=Math.max(8,mx-w);if(ny+h>window.innerHeight-8)ny=Math.max(TOPBAR_H+6,my-h);ctxMenu.style.left=nx+"px";ctxMenu.style.top=ny+"px";});
    return;
  }

  if(item){
    const t=item.type;
    const label=t==="mindNode"?(item.text||"节点"):t==="note"?"便签":t==="fileCard"?(state.files.find(f=>f.id===item.fileId)?.name||"材料"):"元素";
    sec.textContent=label;
    /* 第一段：钻探 — 聚焦、展开内容、批注、跃迁 */
    const grp1=document.createElement("div");grp1.className="cgrp-title";grp1.textContent="钻探";body.appendChild(grp1);
    const focus=mkItem(ICON.focus,"聚焦","F",false);focus.onclick=()=>{hideCtxMenu();state.selected=item.id;enterFocus(item.id);};
    const expl=mkItem("📄",""+(item.detail?"编辑展开内容":"添加展开内容"),"E",false);expl.onclick=()=>{hideCtxMenu();state.selected=item.id;openDetail();};
    const ann=mkItem(ICON.annotate,""+(item.annotation?"编辑批注":"添加批注"),"A",false);ann.onclick=()=>{hideCtxMenu();state.selected=item.id;openAnnotation();};
    body.appendChild(focus);body.appendChild(expl);body.appendChild(ann);
    const jmp=mkItem(ICON.jump,""+(item.jumpTo?"跳转/修改跃迁":"设置跃迁"),"J",false);jmp.onclick=()=>{hideCtxMenu();state.selected=item.id;openJump();};
    body.appendChild(jmp);
    if(state.multiSel.length>=1){
      const link=mkItem(ICON.connector,"连接选中","C",false);link.onclick=()=>{hideCtxMenu();toggleLink();};
      body.appendChild(link);
    }
    const s1=document.createElement("div");s1.className="csep";body.appendChild(s1);
    /* 第二段：结构 — 加子/同级/折叠/颜色 */
    const grp2=document.createElement("div");grp2.className="cgrp-title";grp2.textContent="结构";body.appendChild(grp2);
    if(t==="mindNode"){
      const chi=mkItem(ICON.plus,"加子节点","Tab",false);chi.onclick=()=>{hideCtxMenu();addChildMind(item);};
      const sib=mkItem("","加同级","Enter",false);sib.onclick=()=>{hideCtxMenu();addSiblingMind(item);};
      const col=mkItem("",item.collapsed?"展开子树":"折叠子树","",false);col.onclick=()=>{hideCtxMenu();toggleCollapse(item);};
      body.appendChild(chi);body.appendChild(sib);body.appendChild(col);
      /* 颜色选择：内联一行 */
      const colr=document.createElement("div");colr.className="cswatch-row";colr.style.padding="4px 8px 8px";
      MIND_COLORS.forEach(c=>{const s=document.createElement("button");s.className="swatch";s.style.background=c;s.onclick=()=>{pushHistory("改颜色");item.color=c;hideCtxMenu();render();saveState();};colr.appendChild(s);});
      body.appendChild(colr);
    }else if(t==="note"){
      const edit=mkItem("","编辑文字","",false);edit.onclick=()=>{hideCtxMenu();openTextEditor(item);render();};
      body.appendChild(edit);
      const colr=document.createElement("div");colr.className="cswatch-row";colr.style.padding="4px 8px 8px";
      NOTE_COLORS.forEach(c=>{const s=document.createElement("button");s.className="swatch";s.style.background=c;s.onclick=()=>{pushHistory("改颜色");item.color=c;hideCtxMenu();render();saveState();};colr.appendChild(s);});
      body.appendChild(colr);
    }else if(t==="fileCard"){
      const pv=mkItem(ICON.view,"打开预览","",false);pv.onclick=()=>{hideCtxMenu();openPreview(item.fileId);};
      body.appendChild(pv);
    }
    const s3=document.createElement("div");s3.className="csep";body.appendChild(s3);
    /* 第三段：操作 — 复制、删除 */
    const cp=mkItem(ICON.copy,"复制","Ctrl+D",false);cp.onclick=()=>{hideCtxMenu();duplicateItem(item.id);};
    const del=mkItem(ICON.trash,"删除","Del",true);del.onclick=()=>{hideCtxMenu();deleteItem(item.id);};
    body.appendChild(cp);body.appendChild(del);
  }else{
    sec.textContent="添加";
    const addM=mkItem(ICON.mind,"导图节点",null,false);addM.onclick=()=>{hideCtxMenu();pushHistory("添加节点");const n=addMindNode(defaultNodeName(null),null,state.mindColor,mw.x,mw.y);smartPlace(n);state.selected=n.id;render();saveState();};
    const addN=mkItem(ICON.note,"便签 (B)",null,false);addN.onclick=()=>{hideCtxMenu();pushHistory("添加便签");const n=addNote(mw.x,mw.y);smartPlace(n);state.selected=n.id;render();saveState();};
    body.appendChild(addM);body.appendChild(addN);
    const s2=document.createElement("div");s2.className="csep";body.appendChild(s2);
    if(state.files.length){
      const fn=mkItem(ICON.plus,"放入文件…",null,false);
      const items=state.files.slice(-6).reverse();
      const sub=document.createElement("div");
      sub.style.cssText="padding:2px 6px 6px 16px;display:flex;flex-direction:column;gap:2px";
      items.forEach(f=>{
        const fi=document.createElement("div");
        fi.className="citem";fi.style.cssText="font-size:var(--text-sm);padding:5px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
        fi.innerHTML='<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escapeHtml(f.name)+'</span>';
        fi.addEventListener("click",()=>{hideCtxMenu();pushHistory("添加材料卡片");const fc=addFileCard(mw.x,mw.y,f.id);smartPlace(fc);state.selected=fc.id;render();saveState();});
        sub.appendChild(fi);
      });
      body.appendChild(fn);body.appendChild(sub);
    }
  }
  ctxMenu.style.display="block";
  /* 先设 left/top 为鼠标位置，再修正不超出边界 */
  let mx=e.clientX,my=e.clientY;
  ctxMenu.style.left=mx+"px";
  ctxMenu.style.top=my+"px";
  /* 等 DOM 渲染后修正边界 */
  requestAnimationFrame(()=>{
    const w=ctxMenu.offsetWidth,h=ctxMenu.offsetHeight;
    let nx=mx,ny=my;
    if(nx+w>window.innerWidth-8)nx=Math.max(8,mx-w);
    if(ny+h>window.innerHeight-8)ny=Math.max(TOPBAR_H+6,my-h);
    ctxMenu.style.left=nx+"px";
    ctxMenu.style.top=ny+"px";
  });
}
function hideCtxMenu(){ctxMenu.style.display="none";ctxTarget=null;}
function mkItem(icon,label,key,danger){
  const d=document.createElement("div");
  d.className="citem"+(danger?" danger":"");
  d.innerHTML=(icon?'<span class="ci-ic">'+icon+"</span>":"")+'<span class="ci-label">'+label+"</span>"+(key?'<span class="ci-key">'+key+"</span>":"");
  return d;
}

/* ============================================================
   指针交互
============================================================ */
canvas.addEventListener("pointerdown",onPointerDown);
canvas.addEventListener("pointermove",onPointerMove);
canvas.addEventListener("pointerup",onPointerUp);
canvas.addEventListener("pointercancel",onPointerUp);
canvas.addEventListener("contextmenu",e=>{
  e.preventDefault();
  const bxy=boardXY(e.clientX,e.clientY);
  const wpt=s2w(bxy.x,bxy.y);
  const hit=hitTest(wpt.x,wpt.y);
  if(hit) state.selected=hit.id;
  showCtxMenu(e,hit);
  render();
});
canvas.addEventListener("dblclick",e=>{
  const bxy=boardXY(e.clientX,e.clientY);
  const wpt=s2w(bxy.x,bxy.y);
  const hit=hitTest(wpt.x,wpt.y);
  if(hit&&(hit.type==="note"||hit.type==="mindNode")){ state.selected=hit.id; openTextEditor(hit); render(); }
  else if(hit&&hit.type==="fileCard"){
    const f=state.files.find(x=>x.id===hit.fileId);
    if(f){
      if(f.kind==="link"){ window.open(f.url,"_blank"); }
      else openPreview(f.id);
    }
  }
  else{
    /* 双击空白处：按当前工具/临时工具建对应元素 */
    if(state.tempTool==="note"){
      pushHistory("添加便签");const n=addNote(wpt.x,wpt.y);state.selected=n.id;render();saveState();
    }else{
      /* 默认建导图节点（不管是不是 M 工具） */
      pushHistory("添加节点");const n=addMindNode(defaultNodeName(null),null,state.mindColor,wpt.x,wpt.y);state.selected=n.id;render();saveState();
      setTimeout(()=>{const s=selectedItem();if(s&&s.type==="mindNode")openTextEditor(s);},50);
    }
  }
});
/* 悬停：高亮 + 光标反馈（mousemove 驱动，CDP 下也稳定派发） */
canvas.addEventListener("mousemove",e=>{
  const bxy=boardXY(e.clientX,e.clientY);
  const wpt=s2w(bxy.x,bxy.y);
  state.mouseWorld=wpt;
  const hit=hoverHit(wpt.x,wpt.y);
  const linkPt=hitMindLinkPoint(wpt.x,wpt.y);
  const hkey=hit?hit.type+":"+hit.id:linkPt?"linkpt:"+linkPt.id:null;
  const prev=state.hover?state.hover.type+":"+state.hover.id:state.linkPointHover?"linkpt:"+state.linkPointHover:null;
  if(hkey!==prev){
    state.hover=hit?{id:hit.id,type:hit.type}:null;
    state.linkPointHover=linkPt?linkPt.id:null;
    requestRender();
  }
  const htype=hit?hit.type:null;
  let cur="default";
  if(state.tempTool==="pen") cur="crosshair";
  else if(state.tempTool==="note") cur="copy";
  else if(linkPt) cur="crosshair";
  else if(htype==="mindNode") cur="pointer";
  else if(htype==="fileCard") cur="pointer";
  else if(htype==="note") cur="move";
  else if(isConnectionItem(hit)) cur="move";
  canvas.style.cursor=cur;
});
canvas.addEventListener("mouseleave",()=>{if(state.hover){state.hover=null;}if(linkPointHover){linkPointHover=null;}requestRender();});
board.addEventListener("wheel",e=>{
  if(isTyping()) return;
  e.preventDefault();
  const bxy=boardXY(e.clientX,e.clientY);
  /* 触控板适配：区分捏合缩放 vs 双指滚动平移
     - ctrlKey=true → 触控板双指捏合缩放（macOS/Windows 触控板自动设置）
     - ctrlKey=false 且 |deltaY| 较小 → 触控板双指滚动，应平移画布
     - ctrlKey=false 且 |deltaY| 较大 → 鼠标滚轮，应缩放画布 */
  if(e.ctrlKey){
    /* 触控板捏合缩放 */
    const factor=Math.exp(-e.deltaY*0.01);
    zoomAt(bxy.x,bxy.y,factor);
  }else if(Math.abs(e.deltaY)<40&&!e.deltaX){
    /* 触控板双指滚动 → 平移画布 */
    const z=state.camera.zoom;
    state.camera.x-=e.deltaX/z;
    state.camera.y-=e.deltaY/z;
    if(zoomPctEl) zoomPctEl.textContent=Math.round(z*100)+"%";
    render();updateStatusBar();
  }else{
    /* 鼠标滚轮 → 缩放 */
    const factor=Math.exp(-e.deltaY*0.0016);
    zoomAt(bxy.x,bxy.y,factor);
  }
},{passive:false});

function onPointerDown(e){
  hideCtxMenu();
  if(editingNoteId!==null) closeEditor(false);
  if(editingMindId!==null) closeMindEditor(false);
  if(e.button===2) return;
  const bxy=boardXY(e.clientX,e.clientY);
  const sx=bxy.x,sy=bxy.y;
  const wpt=s2w(sx,sy);
  state.mouseWorld=wpt;
  /* 平移：中键 / 空格 / 空白拖拽统一走 select 分支 */
  if(e.button===1||state.spaceDown){
    drag={mode:"pan",lastX:sx,lastY:sy,pointer:e.pointerId};
    board.classList.add("panning");
    canvas.setPointerCapture(e.pointerId);
    return;
  }
  if(e.button!==0) return;
  const cur=selectedItem();
  /* 手柄优先（选中便签/文件卡片的 8 个手柄） */
  if(cur&&isResizableItem(cur)){
    const h=hitHandle(cur,sx,sy);
    if(h){
      pushHistory();
      drag={mode:"resize",handle:h,item:cur,startW:cur.w,startH:cur.h,startX:cur.x,startY:cur.y,start:wpt,pointer:e.pointerId};
      canvas.setPointerCapture(e.pointerId);
      return;
    }
  }
  /* 右侧功能把手优先：避免连接点把普通点击截获。 */
  const nodeControl=hitNodeControl(wpt.x,wpt.y);
  if(nodeControl){
    state.selected=nodeControl.item.id;state.multiSel=[];
    if(nodeControl.kind==="detail"){
      if(nodeControl.hit==="toggle"){
        toggleDetailInPlace(nodeControl.item);
      }
      return; /* 展开内容的阅读区不触发拖动 */
    }
    toggleCollapse(nodeControl.item);
    return;
  }
  /* 连接点检测：鼠标在 mindNode 右侧连接点附近 → 拖出连线建立父子关系 */
  const linkHit=hitMindLinkPoint(wpt.x,wpt.y);
  if(linkHit){
    pushHistory();
    drag={mode:"mindLink",from:linkHit,to:{x:wpt.x,y:wpt.y},pointer:e.pointerId};
    canvas.setPointerCapture(e.pointerId);
    return;
  }
  const hit=hitTest(wpt.x,wpt.y);
  if(hit){
    if(hit.type==="link"){state.selected=hit.id;state.multiSel=[];render();return;}
    /* 预览态附件：点击顶部标题栏 => 形变退回卡片 */
    if(hit.type==="fileCard"&&hit.previewOpen){
      const hd=previewHeadBounds(hit);
      if(hd&&wpt.x>=hd.x&&wpt.x<=hd.x+hd.w&&wpt.y>=hd.y&&wpt.y<=hd.y+hd.h){
        togglePreviewMorph(hit);
        return;
      }
    }
    /* Ctrl/Cmd+点击：多选并自动连接（第一个=父项，后续点击即自动连线） */
    if(e.ctrlKey||e.metaKey){
      const idx=state.multiSel.indexOf(hit.id);
      if(idx>=0){
        /* 再次点击已选项 = 取消选择，并断开它与父项的连接 */
        const parentId=state.multiSel[0];
        if(idx>0&&parentId){
          const exist=state.links.find(l=>(l.aId===parentId&&l.bId===hit.id)||(l.aId===hit.id&&l.bId===parentId));
          if(exist){pushHistory("断开连接");state.links=state.links.filter(l=>l!==exist);toast("已断开连接");}
        }
        state.multiSel.splice(idx,1);
        render();saveState();return;
      }
      state.multiSel.push(hit.id);state.selected=hit.id;
      /* 第二个及之后：自动与首个元素建立连接 */
      if(state.multiSel.length>=2){
        const parentId=state.multiSel[0];
        const exist=state.links.find(l=>(l.aId===parentId&&l.bId===hit.id)||(l.aId===hit.id&&l.bId===parentId));
        if(!exist){
          pushHistory("自动连接");
          state.links.push({id:"lnk"+(uid++),aId:parentId,bId:hit.id,annotation:"",relationType:"related",directional:false});
          toast("已连接（Ctrl+点击可继续添加）");
        }
      }
      render();saveState();return;
    }
    /* 非 Ctrl：单选，清空多选 */
    if(state.multiSel.length){state.multiSel=[];}
    if(state.selected!==hit.id){state.selected=hit.id;render();}
    /* 所有元素统一用 move：拖动 = 纯移动，不再自动改父级（消除误触） */
    pushHistory();
    /* 记录所有选中元素及后代节点的起始位置 */
    const startPosMap={};const startPtsMap={};
    const ids=state.multiSel.length>1?state.multiSel:[hit.id];
    /* 收集所有需要联动的元素ID（含后代） */
    const allIds=new Set(ids);
    for(const mid of ids){
      const mi=state.items.find(i=>i.id===mid);
      if(mi&&mi.type==="mindNode"){
        const collectKids=(node)=>{
          if(!node.children)return;
          for(const cid of node.children){allIds.add(cid);const c=state.items.find(i=>i.id===cid);if(c)collectKids(c);}
        };
        collectKids(mi);
      }
    }
    for(const mid of allIds){
      const mi=state.items.find(i=>i.id===mid);
      if(mi){startPosMap[mid]={x:mi.x,y:mi.y};if(mi.type==="stroke")startPtsMap[mid]=mi.points.map(p=>({x:p.x,y:p.y}));}
    }
    drag={
      mode:"move",item:hit,start:wpt,
      startX:hit.x,startY:hit.y,
      movedDist:0,
      startPosMap,startPtsMap,
      startPts:hit.type==="stroke"?hit.points.map(p=>({...p})):null,
      startA:hit.type==="connector"?{ax:hit.a.x,ay:hit.a.y,bx:hit.b.x,by:hit.b.y,af:!!hit.a.free,bf:!!hit.b.free}:null,
      pointer:e.pointerId,
    };
    canvas.setPointerCapture(e.pointerId);
    return;
  }
  /* —— 空白处 —— */
  if(state.tool==="connector"){
    pushHistory();
    const a=anchorFor(wpt.x,wpt.y);
    const b=a.free?{x:wpt.x+1,y:wpt.y+1,free:true}:{...a};
    drag={mode:"connector",a,b,pointer:e.pointerId};
    canvas.setPointerCapture(e.pointerId);
    render();
    return;
  }
  /* M 工具下空白单击不再自动建节点（改由双击触发），统一走默认平移 */
  if(state.tempTool==="pen"){
    pushHistory();
    const s=addStroke(wpt.x,wpt.y);
    drag={mode:"pen",item:s,points:s.points,last:wpt,pointer:e.pointerId};
    canvas.setPointerCapture(e.pointerId);
    return;
  }
  if(state.tempTool==="note"){
    pushHistory();
    const n=addNote(wpt.x,wpt.y,undefined,state.noteColor);
    state.selected=n.id;
    /* 记录所有选中元素的起始位置（多选拖动） */
    const startPosMap={};
    const startPtsMap={};
    const ids=state.multiSel.length>1?state.multiSel:[n.id];
    for(const mid of ids){
      const mi=state.items.find(i=>i.id===mid);
      if(mi){startPosMap[mid]={x:mi.x,y:mi.y};if(mi.type==="stroke")startPtsMap[mid]=mi.points.map(p=>({x:p.x,y:p.y}));}
    }
    drag={mode:"move",item:n,start:wpt,startX:n.x,startY:n.y,startPosMap,startPtsMap,pointer:e.pointerId};
    canvas.setPointerCapture(e.pointerId);
    render();
    return;
  }
  /* 默认：空白拖拽 = 平移画布 */
  state.selected=null;state.multiSel=[];
  helpPop.style.display="none";
  if(detailEditId!==null)closeDetail(); /* 编辑面板打开时点空白关闭 */
  hideCtxMenu();
  drag={mode:"pan",lastX:sx,lastY:sy,pointer:e.pointerId};
  board.classList.add("panning");
  canvas.setPointerCapture(e.pointerId);
  render();
}
function onPointerMove(e){
  const bxy=boardXY(e.clientX,e.clientY);
  const sx=bxy.x,sy=bxy.y;
  const wpt=s2w(sx,sy);
  state.mouseWorld=wpt;
  if(!drag) return;
  if(drag.mode==="pan"){
    state.camera.x-=(sx-drag.lastX)/state.camera.zoom;
    state.camera.y-=(sy-drag.lastY)/state.camera.zoom;
    drag.lastX=sx;drag.lastY=sy;
    render();
    return;
  }
  if(drag.mode==="move"){
    const dx=wpt.x-drag.start.x,dy=wpt.y-drag.start.y;
    drag.movedDist=(drag.movedDist||0)+Math.abs(dx)+Math.abs(dy);
    const it=drag.item;
    /* 多选拖动：所有选中元素一起移动 */
    const moveIds=(state.multiSel.length>1?state.multiSel:[it.id]);
    /* 收集需要联动的所有元素（选中元素+其后代节点） */
    const allMoveIds=new Set(moveIds);
    for(const mid of moveIds){
      const mi=state.items.find(i=>i.id===mid);
      if(mi&&mi.type==="mindNode"){
        /* 递归收集所有后代节点 */
        const collectKids=(node)=>{
          if(!node.children)return;
          for(const cid of node.children){
            allMoveIds.add(cid);
            const child=state.items.find(i=>i.id===cid);
            if(child)collectKids(child);
          }
        };
        collectKids(mi);
      }
    }
    for(const mid of allMoveIds){
      const mi=state.items.find(i=>i.id===mid);
      if(!mi)continue;
      if(mi.type==="stroke"&&drag.startPtsMap&&drag.startPtsMap[mid]){
        mi.points.forEach((p,i)=>{const sp=drag.startPtsMap[mid][i];if(sp){p.x=sp.x+dx;p.y=sp.y+dy;}});
      }else if(mi.type==="connector"){
        /* connector 拖动端点，跳过 */
      }else{
        const sp=drag.startPosMap&&drag.startPosMap[mid];
        if(sp){mi.x=sp.x+dx;mi.y=sp.y+dy;}
      }
    }
    /* 单元素的旧逻辑保留兼容 */
    if(it.type==="stroke"&&drag.startPts&&!state.multiSel.length){
      it.points.forEach((p,i)=>{if(drag.startPts[i]){p.x=drag.startPts[i].x+dx;p.y=drag.startPts[i].y+dy;}});
    }else if(it.type==="connector"&&drag.startA){
      if(drag.startA.af){it.a.x=drag.startA.ax+dx;it.a.y=drag.startA.ay+dy;}
      if(drag.startA.bf){it.b.x=drag.startA.bx+dx;it.b.y=drag.startA.by+dy;}
    }
    /* 拖动便签/材料时：实时推开周围重叠元素，保持空隙并即时可见 */
    if(drag.item.type==="note"||drag.item.type==="fileCard"){
      localAvoid(drag.item);
    }
    /* （已移除：拖动便签/材料到节点上的关联目标检测） */
    render();return;
  }
  if(drag.mode==="resize"){
    const dx=wpt.x-drag.start.x,dy=wpt.y-drag.start.y;
    const h=drag.handle,it=drag.item;
    if(h.includes("w")){const nw=clamp(drag.startW-dx,60,800);it.x=drag.startX+(drag.startW-nw);it.w=nw;}
    else if(h.includes("e")){it.w=clamp(drag.startW+dx,60,800);}
    if(h.includes("n")){const nh=clamp(drag.startH-dy,40,600);it.y=drag.startY+(drag.startH-nh);it.h=nh;}
    else if(h.includes("s")){it.h=clamp(drag.startH+dy,40,600);}
    render();
    return;
  }
  if(drag.mode==="pen"){
    const last=drag.points[drag.points.length-1];
    if(Math.hypot(wpt.x-last.x,wpt.y-last.y)>0.6/state.camera.zoom){
      drag.points.push(wpt);
      render();
    }
    return;
  }
  if(drag.mode==="connector"){
    drag.b=anchorFor(wpt.x,wpt.y);
    render();
    return;
  }
  if(drag.mode==="mindLink"){
    drag.to={x:wpt.x,y:wpt.y};
    /* 检测是否悬停在目标节点上 */
    drag.target=hitTest(wpt.x,wpt.y);
    if(drag.target===drag.from) drag.target=null;
    render();
    return;
  }
}
function onPointerUp(e){
  if(!drag) return;
  const d=drag;
  drag=null;
  board.classList.remove("panning");
  if(d.mode==="pen"){ render(); }
  else if(d.mode==="connector"){
    const a=resolveEnd(d.a),b=resolveEnd(d.b);
    if(Math.hypot(b.x-a.x,b.y-a.y)>4/state.camera.zoom){
      addConnector(d.a,d.b);
      render();
    }
  }
  /* （已移除：便签/材料拖到节点上松手建立关联） */
  else if(d.mode==="move"&&d.item.type==="fileCard"&&d.movedDist<6){
    /* 点击（无位移）文件卡片 => 本体形变为预览 / 预览态点击标题栏退回卡片 */
    togglePreviewMorph(d.item);
  }
  /* 拖动松手后：局部避让（被拖元素推开周围重叠元素，不全局重排） */
  else if(d.mode==="move"){
    localAvoid(d.item);
    render();saveState();
  }
  else if(d.mode==="mindLink"){
    if(d.target&&d.target.id!==d.from.id){
      if(d.target.type==="mindNode"){
        /* 拖到节点上 → 建立父子关系 */
        reparentNode(d.from,d.target);
      }else{
        /* 拖到便签/卡片上 → 自由连接 */
        const exist=state.links.find(l=>(l.aId===d.from.id&&l.bId===d.target.id)||(l.aId===d.target.id&&l.bId===d.from.id));
        if(!exist){
          state.links.push({id:"lnk"+(uid++),aId:d.from.id,bId:d.target.id,annotation:"",relationType:"related",directional:false});
          toast("已连接");
        }
      }
    }
    render();saveState();
  }
  syncHistoryBtns();
}

/* ============================================================
   文件系统：导入 / 资源库 / .board 链接
============================================================ */
function getBlob(fileId){
  return new Promise((res,rej)=>{
    const f=state.files.find(x=>x.id===fileId);
    if(!f){rej(new Error("no file"));return;}
    if(f.blob){res(f.blob);return;}
    const tx=idb.transaction("files","readonly");
    const rq=tx.objectStore("files").get(fileId);
    rq.onsuccess=()=>res(rq.result||null);
    rq.onerror=()=>rej(rq.error);
  });
}
function makeBlobURL(f){
  getBlob(f.id).then(b=>{
    if(!b){toast("文件不存在");return;}
    if(f._url) URL.revokeObjectURL(f._url);
    f._url=URL.createObjectURL(b);
    /* 若有预览窗口则刷新其内容 */
    const pvs=state.previews.filter(p=>p.fileId===f.id);
    if(pvs.length) syncPvDom();
  }).catch(()=>toast("读取文件失败"));
}
async function importFiles(fileList,folderId){
  let added=0;
  for(const file of fileList){
    const kind=kindOf(file.name);
    /* 从 webkitRelativePath 提取路径信息 */
    let relPath=file.webkitRelativePath||"";
    let actualFolderId=folderId;
    if(relPath&&relPath.includes("/")){
      /* 文件夹上传：自动创建/复用文件夹结构 */
      const parts=relPath.split("/");
      parts.pop(); /* 去掉文件名 */
      let curFolderId=folderId||null;
      for(const p of parts){
        let folder=state.folders.find(f=>f.name===p&&f.parentId===curFolderId);
        if(!folder){
          folder={id:"fld"+(uid++),name:p,parentId:curFolderId};
          state.folders.push(folder);
        }
        curFolderId=folder.id;
      }
      actualFolderId=curFolderId;
    }
    const f={id:"f"+(uid++),name:file.name,kind,size:file.size,mime:file.type,created:Date.now(),thumb:null,tw:1,th:1,folderId:actualFolderId||null};
    state.files.push(f);
    /* 存 blob */
    if(kind!=="link"){
      try{
        const tx=idb.transaction("files","readwrite");
        tx.objectStore("files").put(file,f.id);
        await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
      }catch(err){console.warn("idb put fail",err);}
    }
    /* 图片生成缩略图 */
    if(kind==="img"){
      try{
        const blob=await getBlob(f.id);
        const bmp=await createImageBitmap(blob);
        const max=300;
        const sc=Math.min(1,max/Math.max(bmp.width,bmp.height));
        f.tw=Math.max(1,Math.round(bmp.width*sc));
        f.th=Math.max(1,Math.round(bmp.height*sc));
        f.thumb=bmp;
      }catch(err){console.warn("thumb fail",err);}
    }
    added++;
  }
  renderFileGroups();
  render();
}
function removeFile(id){
  state.files=state.files.filter(f=>f.id!==id);
  /* 资源库在项目级：所有画布中的材料卡片及其关系都必须同时清理。 */
  const project=curProject();
  if(project){
    for(const canvas of project.canvases){
      const removedIds=new Set((canvas.items||[]).filter(it=>it.type==="fileCard"&&it.fileId===id).map(it=>it.id));
      canvas.items=(canvas.items||[]).filter(it=>!removedIds.has(it.id));
      canvas.links=(canvas.links||[]).filter(link=>!removedIds.has(link.aId)&&!removedIds.has(link.bId));
      for(const node of canvas.items){if(node.type==="mindNode")node.attachIds=(node.attachIds||[]).filter(a=>!removedIds.has(a));}
    }
  }
  cleanupProjectReferences();
  removePreviewsOf(id);
  try{
    const tx=idb.transaction("files","readwrite");
    tx.objectStore("files").delete(id);
  }catch(e){}
  renderFileGroups();render();saveState();
  toast("已删除文件");
}
/* 新建文件夹 */
function createFolder(name){
  const f={id:"fld"+(uid++),name:name||"新文件夹",parentId:null};
  state.folders.push(f);
  renderFileGroups();saveState();
  return f;
}
/* 删除文件夹（文件移到根级） */
function removeFolder(id){
  const removed=new Set([id]);
  let changed=true;
  while(changed){
    changed=false;
    for(const folder of state.folders){
      if(removed.has(folder.parentId)&&!removed.has(folder.id)){removed.add(folder.id);changed=true;}
    }
  }
  for(const f of state.files){if(removed.has(f.folderId))f.folderId=null;}
  state.folders=state.folders.filter(f=>!removed.has(f.id));
  renderFileGroups();saveState();
}
function renderSidePanel(){
  const projectList=document.getElementById("project-list");
  const canvasList=document.getElementById("canvas-list");
  projectList.innerHTML="";
  canvasList.innerHTML="";
  /* 项目列表 */
  for(const p of state.projects){
    const el=document.createElement("div");
    el.className="proj-item"+(p.id===state.activeProjectId?" active":"");
    el.innerHTML='<span class="pi-name"></span><span class="pi-del" title="删除项目">✕</span>';
    el.querySelector(".pi-name").textContent=p.name;
    el.addEventListener("click",()=>switchProject(p.id));
    el.querySelector(".pi-del").addEventListener("click",e=>{
      e.stopPropagation();
      showModal("删除项目",`<p style="font-size:var(--text-base);color:var(--ink-dim);line-height:1.7;margin:0">删除项目「${escapeHtml(p.name)}」及其所有画布和材料？<br>此操作不可撤销。</p>`,[
        {label:"取消"},{label:"删除",primary:true,onClick:()=>deleteProject(p.id)}
      ]);
    });
    projectList.appendChild(el);
  }
  /* 画布列表 */
  const cp=curProject();if(!cp)return;
  for(const c of cp.canvases){
    const el=document.createElement("div");
    el.className="canvas-item"+(c.id===state.activeCanvasId?" active":"");
    el.innerHTML='<svg class="ci-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg><span class="ci-name"></span><span class="ci-del" title="删除画布">✕</span>';
    el.querySelector(".ci-name").textContent=c.name;
    el.addEventListener("click",()=>switchCanvas(c.id));
    el.addEventListener("dblclick",e=>{
      e.stopPropagation();
      showPrompt("重命名画布","画布名称",c.name,name=>{if(name)renameCanvas(c.id,name);});
    });
    el.querySelector(".ci-del").addEventListener("click",e=>{
      e.stopPropagation();
      showModal("删除画布",`<p style="font-size:var(--text-base);color:var(--ink-dim);line-height:1.7;margin:0">删除画布「${escapeHtml(c.name)}」？</p>`,[
        {label:"取消"},{label:"删除",primary:true,onClick:()=>deleteCanvas(c.id)}
      ]);
    });
    canvasList.appendChild(el);
  }
  /* 更新区标题数量徽章 */
  const pc=document.getElementById("proj-count");if(pc)pc.textContent=state.projects.length;
  const cc=document.getElementById("canvas-count");if(cc)cc.textContent=cp?cp.canvases.length:0;
  const fc=document.getElementById("file-count");if(fc)fc.textContent=state.files.length;
  renderFileGroups();
}
function renderFileGroups(){
  /* 先渲染文件夹列表，再渲染根级文件 */
  fileGroups.innerHTML="";
  if(!state.files.length&&!state.folders.length){
    fileGroups.innerHTML='<div id="lib-empty"><div class="big">📁</div>尚未导入任何材料<br>点击右上角「+」导入文件或文件夹<br>或直接拖入文件</div>';
    return;
  }
  /* 顶部操作栏 */
  const actionBar=document.createElement("div");
  actionBar.style.cssText="display:flex;gap:6px;padding:4px 2px 8px";
  const newFolderBtn=document.createElement("button");
  newFolderBtn.className="tbtn";newFolderBtn.style.cssText="flex:1;font-size:11px;height:28px;border:1px solid var(--card-border);background:var(--surface);color:var(--ink-dim)";
  newFolderBtn.innerHTML=ICON.folder+"新建文件夹";
  newFolderBtn.addEventListener("click",()=>{showPrompt("新建文件夹","文件夹名称","新文件夹",name=>{if(name)createFolder(name);});});
  actionBar.appendChild(newFolderBtn);
  fileGroups.appendChild(actionBar);
  /* 渲染文件夹 */
  const topFolders=state.folders.filter(f=>!f.parentId);
  for(const folder of topFolders){
    const fwrap=renderFolderItem(folder);
    fileGroups.appendChild(fwrap);
  }
  /* 渲染根级文件（无 folderId 的） */
  const rootFiles=state.files.filter(f=>!f.folderId);
  if(rootFiles.length){
    const wrap=document.createElement("div");wrap.className="fgroup";
    const head=document.createElement("button");head.className="fgroup-head open";
    head.innerHTML='<span class="chev">▾</span><span>未分类</span><span class="cnt">'+rootFiles.length+'</span>';
    head.addEventListener("click",()=>head.classList.toggle("open"));
    wrap.appendChild(head);
    const list=document.createElement("div");list.className="fgroup-list";
    for(const f of rootFiles){ list.appendChild(renderFileItem(f)); }
    wrap.appendChild(list);
    fileGroups.appendChild(wrap);
  }
}
function renderFolderItem(folder){
  const wrap=document.createElement("div");wrap.className="fgroup";
  const head=document.createElement("button");head.className="fgroup-head open";
  /* 计算文件夹下文件数（含子文件夹） */
  let cnt=countFilesInFolder(folder.id);
  head.innerHTML='<span class="chev">▾</span><span>'+ICON.folder.replace(/width="14"/,'width="12"').replace(/height="14"/,'height="12"')+' '+escapeHtml(folder.name)+'</span><span class="cnt">'+cnt+'</span>';
  head.addEventListener("click",()=>head.classList.toggle("open"));
  /* 右键删除文件夹 */
  head.addEventListener("contextmenu",e=>{
    e.preventDefault();e.stopPropagation();
    showModal("删除文件夹",`<p style="font-size:var(--text-base);color:var(--ink-dim);line-height:1.7;margin:0">删除文件夹「${escapeHtml(folder.name)}」？<br>文件会移到根级，不会丢失。</p>`,[
      {label:"取消"},
      {label:"删除",primary:true,onClick:()=>removeFolder(folder.id)}
    ]);
  });
  wrap.appendChild(head);
  const list=document.createElement("div");list.className="fgroup-list";
  /* 子文件夹 */
  const subFolders=state.folders.filter(f=>f.parentId===folder.id);
  for(const sf of subFolders){ list.appendChild(renderFolderItem(sf)); }
  /* 文件 */
  const files=state.files.filter(f=>f.folderId===folder.id);
  for(const f of files){ list.appendChild(renderFileItem(f)); }
  wrap.appendChild(list);
  return wrap;
}
function countFilesInFolder(folderId){
  let cnt=state.files.filter(f=>f.folderId===folderId).length;
  for(const sf of state.folders.filter(f=>f.parentId===folderId)){
    cnt+=countFilesInFolder(sf.id);
  }
  return cnt;
}
function renderFileItem(f){
  const item=document.createElement("div");
  item.className="fitem";
  item.draggable=true;
  item.innerHTML=(FILE_ICONS[f.kind]||FILE_ICONS.other)+'<span class="fname"></span><span class="fdel" title="删除"></span>';
  item.querySelector(".fname").textContent=f.name;
  item.querySelector(".fdel").innerHTML=ICON.trash;
  item.querySelector(".fdel").addEventListener("click",ev=>{ev.stopPropagation();removeFile(f.id);});
  item.addEventListener("click",()=>{f.kind==="link"?window.open(f.url,"_blank"):openPreview(f.id);});
  item.addEventListener("dragstart",ev=>{
    ev.dataTransfer.setData("application/x-board-file",f.id);
    item.classList.add("dragging");
  });
  item.addEventListener("dragend",()=>item.classList.remove("dragging"));
  return item;
}
/* 拖拽文件放到画布 */
board.addEventListener("dragover",e=>{e.preventDefault();dropOverlay.style.display="flex";});
board.addEventListener("dragleave",e=>{dropOverlay.style.display="none";});
board.addEventListener("drop",e=>{
  e.preventDefault();
  dropOverlay.style.display="none";
  const fid=e.dataTransfer.getData("application/x-board-file");
  const bxy=boardXY(e.clientX,e.clientY);
  const wpt=s2w(bxy.x,bxy.y);
  if(fid&&state.files.find(x=>x.id===fid)){
    pushHistory();
    const fc=addFileCard(wpt.x,wpt.y,fid);
    state.selected=fc.id;
    render();saveState();
    return;
  }
  /* 系统文件拖入 */
  if(e.dataTransfer.files&&e.dataTransfer.files.length){
    importFiles(e.dataTransfer.files);
  }
});
/* 添加链接 */
/* promptAddLink 已被 showLinkPrompt 替代，删除 */

/* 导出/导入项目 */
function exportProject(){
  const c=curCanvas();if(!c){toast("无画布");return;}
  const p=curProject();
  const data={
    v:3,
    app:"织见",
    canvasName:c.name,
    items:c.items,
    camera:c.camera,
    links:c.links||[],
    previews:c.previews||[],
    files:p.files.map(f=>({id:f.id,name:f.name,kind:f.kind,size:f.size,mime:f.mime,url:f.url||null,created:f.created,folderId:f.folderId||null})),
    folders:p.folders.map(f=>({id:f.id,name:f.name,parentId:f.parentId||null})),
    exportedAt:new Date().toISOString(),
    assetNote:"画布 JSON 包含材料索引；本地文件内容保留在原浏览器的材料库中。",
  };
  const blob=new Blob([JSON.stringify(data)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=(c.name||"canvas")+".board.json";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  toast("画布已导出");
}
function importProject(file){
  const reader=new FileReader();
  reader.onload=async()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!data.items||!Array.isArray(data.files)) throw new Error("bad");
      const incomingItems=data.items.map(it=>({...it}));
      const existingFiles=new Map(state.files.map(f=>[f.id,f]));
      const fileIdMap=new Map();
      for(const imported of data.files){
        const existing=existingFiles.get(imported.id);
        if(existing&&existing.name===imported.name&&existing.size===imported.size){fileIdMap.set(imported.id,existing.id);continue;}
        const id=existing?"imp-"+(uid++):imported.id;
        fileIdMap.set(imported.id,id);
        existingFiles.set(id,{...imported,id,thumb:null,tw:1,th:1,url:imported.url||null});
      }
      for(const it of incomingItems){if(it.type==="fileCard"&&fileIdMap.has(it.fileId))it.fileId=fileIdMap.get(it.fileId);}
      state.items=incomingItems;
      state.links=(data.links||[]).map(l=>({...l,relationType:l.relationType||"related",directional:!!l.directional}));
      state.previews=(data.previews||[]).map(p=>({...p,fileId:fileIdMap.get(p.fileId)||p.fileId}));
      state.files=[...existingFiles.values()];
      const foldersById=new Map(state.folders.map(f=>[f.id,f]));
      for(const folder of data.folders||[]){if(!foldersById.has(folder.id))foldersById.set(folder.id,{...folder});}
      state.folders=[...foldersById.values()];
      state.camera=data.camera||state.camera;
      cleanupReferences();syncUid();
      /* 尝试重建缩略图（若有 idb 里的 blob） */
      for(const f of state.files){
        if(f.kind==="img"){
          try{const b=await getBlob(f.id);const bmp=await createImageBitmap(b);const max=300;const sc=Math.min(1,max/Math.max(bmp.width,bmp.height));f.thumb=bmp;f.tw=bmp.width*sc;f.th=bmp.height*sc;}catch(e){}
        }
      }
      render();renderFileGroups();saveState();
      toast("画布已导入；缺失的本地材料可在资源库重新导入");
    }catch(err){toast("导入失败：文件格式不正确");}
  };
  reader.readAsText(file);
}

/* ============================================================
   画布内预览窗口（替代右侧面板）
============================================================ */
const PV_W=380,PV_H=300,PV_PAD=24;
let pvUid=1;
function openPreview(fileId){
  const c=curCanvas();if(!c)return;
  const exist=c.previews.find(p=>p.fileId===fileId);
  /* 再次点击=关闭预览（原地变回元素） */
  if(exist){closePreview(exist.id);return;}
  const f=state.files.find(x=>x.id===fileId);
  if(!f) return;
  const card=state.items.find(i=>i.type==="fileCard"&&i.fileId===fileId);
  let px,py,pw,ph;
  if(card){
    /* 原地变身：预览窗口定位在 fileCard 位置，宽度扩展以适应内容 */
    px=card.x-(PV_W-card.w)/2;py=card.y-(PV_H-card.h)/2;
    pw=PV_W;ph=PV_H;
  }else{
    const cx=state.camera.x+W/2/state.camera.zoom, cy=state.camera.y+H/2/state.camera.zoom;
    px=cx-PV_W/2;py=cy-PV_H/2;
    pw=PV_W;ph=PV_H;
  }
  /* 避让已有预览窗口 */
  for(let pass=0;pass<6;pass++){
    let overlap=false;
    for(const op of c.previews){
      const ox=Math.min(px+pw,op.x+op.w)-Math.max(px,op.x);
      const oy=Math.min(py+ph,op.y+op.h)-Math.max(py,op.y);
      if(ox>4&&oy>4){
        px=op.x+op.w+PV_PAD;
        overlap=true;break;
      }
    }
    if(!overlap)break;
  }
  const pv={id:"pv"+(pvUid++),fileId,x:px,y:py,w:pw,h:ph};
  c.previews.push(pv);
  renderPreviewWindows();
}
function closePreview(pvId){
  const c=curCanvas();if(!c)return;
  c.previews=c.previews.filter(p=>p.id!==pvId);
  syncPvDom();
  render();
}
function bringPreviewFront(pv){
  const c=curCanvas();if(!c)return;
  c.previews=c.previews.filter(p=>p.id!==pv.id);
  c.previews.push(pv);
  syncPvDom();
  render();
}
/* 把画布内预览窗口渲染到 DOM 层（跟随相机变换） */
function renderPreviewWindows(){
  /* 先占位：在对应文件卡片旁打开，若有 card 跟随 */
  syncPvDom();
  render();
}
function syncPvDom(){
  const z=state.camera.zoom;
  const existing=new Map();
  for(const child of previewLayer.children){ existing.set(child.dataset.pv,child); }
  const seen=new Set();
  for(const pv of state.previews){
    seen.add(pv.id);
    let el=existing.get(pv.id);
    if(!el){
      const f=state.files.find(x=>x.id===pv.fileId);
      el=document.createElement("div");
      el.className="pv-win";
      el.dataset.pv=pv.id;
      el.innerHTML='<div class="pv-head"><span class="pv-fname"></span><span class="pv-size"></span><div class="pv-zoom"><button class="pv-zo" title="缩小">−</button><span class="pv-zoom-val">100%</span><button class="pv-zi" title="放大">+</button></div><span class="pv-close">×</span></div><div class="pv-body"></div><div class="pv-resize"></div>';
      /* 缩放按钮：独立于画布缩放的内容缩放 */
      let pvZoom=1;
      const zoomVal=el.querySelector(".pv-zoom-val");
      const pvBody=el.querySelector(".pv-body");
      const applyZoom=()=>{
        pvBody.style.transform="scale("+pvZoom+")";
        pvBody.style.transformOrigin="top center";
        zoomVal.textContent=Math.round(pvZoom*100)+"%";
      };
      el.querySelector(".pv-zo").addEventListener("click",()=>{pvZoom=Math.max(0.3,pvZoom-0.2);applyZoom();});
      el.querySelector(".pv-zi").addEventListener("click",()=>{pvZoom=Math.min(3,pvZoom+0.2);applyZoom();});
      el.querySelector(".pv-zoom-val").addEventListener("click",()=>{pvZoom=1;applyZoom();});
      const head=el.querySelector(".pv-head");
      head.addEventListener("pointerdown",e=>{
        if(e.button!==0) return;
        e.preventDefault();e.stopPropagation();
        const sx=e.clientX,sy=e.clientY,wsx=pv.x,wsy=pv.y;
        const mv=ev=>{
          const bxy=boardXY(ev.clientX,ev.clientY);
          pv.x=wsx+(bxy.x-(sx-board.offsetLeft))/state.camera.zoom;
          pv.y=wsy+(bxy.y-(sy-board.offsetTop))/state.camera.zoom;
          syncPvDom();
        };
        const up=()=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);render();saveState();};
        window.addEventListener("pointermove",mv);
        window.addEventListener("pointerup",up);
      });
      el.querySelector(".pv-close").addEventListener("click",e=>{e.stopPropagation();closePreview(pv.id);});
      const rz=el.querySelector(".pv-resize");
      rz.addEventListener("pointerdown",e=>{
        e.preventDefault();e.stopPropagation();
        const sx=e.clientX,sy=e.clientY,sw=pv.w,sh=pv.h;
        const mv=ev=>{
          const bxy=boardXY(ev.clientX,ev.clientY);
          pv.w=Math.max(220,sw+(bxy.x-(sx-board.offsetLeft))/state.camera.zoom);
          pv.h=Math.max(160,sh+(bxy.y-(sy-board.offsetTop))/state.camera.zoom);
          syncPvDom();
        };
        const up=()=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);render();saveState();};
        window.addEventListener("pointermove",mv);
        window.addEventListener("pointerup",up);
      });
      el.addEventListener("pointerdown",()=>{
        const card=state.items.find(i=>i.type==="fileCard"&&i.fileId===pv.fileId);
        if(card&&state.selected!==card.id){state.selected=card.id;render();}
        bringPreviewFront(pv);
      },true);
      previewLayer.appendChild(el);
    }
    const f=state.files.find(x=>x.id===pv.fileId);
    if(f){
      const fname=el.querySelector(".pv-fname");
      const fsize=el.querySelector(".pv-size");
      if(fname.textContent!==f.name) fname.textContent=f.name;
      const sizeTxt=KIND_LABEL[f.kind]||"";
      if(fsize.textContent!==sizeTxt) fsize.textContent=sizeTxt;
    }
    const spX=(pv.x-state.camera.x)*z,spY=(pv.y-state.camera.y)*z;
    const spW=pv.w*z,spH=pv.h*z;
    el.style.left=spX+"px";el.style.top=spY+"px";
    el.style.width=spW+"px";el.style.height=spH+"px";
    /* 内容体只在首次创建时渲染（滚动位置保留） */
    if(!el.dataset.rendered){
      el.dataset.rendered="1";
      const f=state.files.find(x=>x.id===pv.fileId);
      renderPvContent(pv,f,el.querySelector(".pv-body"));
    }
  }
  /* 移除已关闭的 */
  for(const [k,el] of existing){
    if(!seen.has(k)) el.remove();
  }
}
function renderPvContent(pv,f,body){
  if(!f){body.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>文件不存在</div>';return;}
  const kick=(url,type)=>{
    if(type==="img"){
      body.innerHTML='<img src="'+url+'" style="max-width:100%;max-height:100%;object-fit:contain;display:block;margin:0 auto">';
    }else if(type==="media"){
      /* 视频预览 */
      const v=document.createElement("video");
      v.style.cssText="width:100%;height:100%;object-fit:contain;background:#000";
      v.src=url;v.controls=true;v.autoplay=false;
      body.innerHTML="";body.appendChild(v);
    }else if(type==="text"){
      fetch(url).then(r=>r.text()).then(t=>{body.innerHTML='<pre class="pv-text"></pre>';body.firstChild.textContent=t;})
        .catch(()=>{body.innerHTML='<div class="pv-msg">无法读取文本</div>';});
    }else if(type==="link"){
      const wrap=document.createElement("div");
      wrap.style.cssText="display:flex;flex-direction:column;height:100%";
      const bar=document.createElement("div");
      bar.style.cssText="display:flex;gap:4px;padding:4px;border-bottom:1px solid var(--card-border);flex:none";
      const pcBtn=document.createElement("button");pcBtn.textContent="🖥 PC";pcBtn.style.cssText="padding:3px 8px;border:1px solid var(--card-border);border-radius:6px;cursor:pointer;font-size:11px";
      const mbBtn=document.createElement("button");mbBtn.textContent="📱 手机";mbBtn.style.cssText="padding:3px 8px;border:1px solid var(--card-border);border-radius:6px;cursor:pointer;font-size:11px";
      bar.appendChild(pcBtn);bar.appendChild(mbBtn);
      const fw=document.createElement("div");fw.style.cssText="flex:1;overflow:hidden;display:flex;justify-content:center;align-items:flex-start";
      const iframe=document.createElement("iframe");iframe.className="pv-html";iframe.src=f.url;iframe.sandbox="allow-forms allow-scripts allow-popups";iframe.referrerPolicy="no-referrer";iframe.title="网页材料预览";
      /* 用预览窗口的世界坐标宽度判断模式：<380世界单位=手机 */
      const isMobile=pv.w<380;
      const setPC=()=>{iframe.style.cssText="border:none;flex:1;width:100%;height:100%";fw.style.alignItems="flex-start";pcBtn.style.background="var(--accent)";pcBtn.style.color="#fff";mbBtn.style.background="transparent";mbBtn.style.color="var(--ink-dim)";};
      const setMB=()=>{iframe.style.cssText="border:none;width:375px;height:667px";fw.style.alignItems="center";mbBtn.style.background="var(--accent)";mbBtn.style.color="#fff";pcBtn.style.background="transparent";pcBtn.style.color="var(--ink-dim)";};
      if(isMobile)setMB();else setPC();
      fw.appendChild(iframe);
      pcBtn.addEventListener("click",setPC);
      mbBtn.addEventListener("click",setMB);
      wrap.appendChild(bar);wrap.appendChild(fw);
      body.innerHTML="";body.appendChild(wrap);
      return;
    }else{
      body.innerHTML='<div class="pv-msg"><span class="big">📄</span>'+KIND_LABEL[f.kind]+' 文件<br><a href="'+url+'" target="_blank" download>下载文件</a></div>';
    }
  };
  if(f._url&&(f.kind==="img"||f.kind==="text"||f.kind==="link"||f.kind==="media"||f.kind==="other")){kick(f._url,f.kind);return;}
  if(f.kind==="link"){
    if(!isSafePreviewUrl(f.url)){body.innerHTML='<div class="pv-msg">链接地址无效，未加载预览</div>';return;}
    kick(f.url,"link");return;
  }
  body.innerHTML='<div class="pv-loading"><div class="spinner"></div>加载中…</div>';
  getBlob(pv.fileId).then(b=>{
    if(!b){body.innerHTML='<div class="pv-msg">文件不存在</div>';return;}
    if(!f._url) f._url=URL.createObjectURL(b);
    if(f.kind==="doc") renderDocx(b,body);
    else if(f.kind==="sheet") renderSheet(b,body);
    else if(f.kind==="pdf") renderPdf(b,body);
    else if(f.kind==="slide") renderPptx(b,body);
    else if(f.kind==="media") kick(f._url,"media");
    else kick(f._url,f.kind);
  }).catch(()=>{body.innerHTML='<div class="pv-msg">读取失败</div>';});
}
function removePreviewsOf(fileId){
  for(const p of state.projects){
    for(const c of p.canvases){
      c.previews=c.previews.filter(p=>p.fileId!==fileId);
    }
  }
  syncPvDom();
}
async function ensureCdn(kind){
  const map={doc:"docx",sheet:"xlsx",pdf:"pdfjs"};
  const key=map[kind];
  if(!key) return true;
  if(window[key+"_loaded"]) return true;
  const kindLabel=kind==="pdf"?"PDF":kind==="doc"?"Word":kind==="sheet"?"表格":"演示";
  toast("正在加载"+kindLabel+"预览组件…");
  try{
    const lib=CDN[key];
    /* 先加载依赖（如 docx-preview 依赖 jszip） */
    if(lib.dep){
      const depKey=lib.dep;
      if(!window[depKey+"_loaded"]){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src=CDN[depKey].url;s.onload=res;s.onerror=()=>rej(new Error(depKey+" cdn fail"));
          document.head.appendChild(s);
        });
        window[depKey+"_loaded"]=true;
      }
    }
    if(key==="pdfjs"){
      await new Promise((res,rej)=>{
        const s=document.createElement("script");
        s.src=lib.url;s.onload=res;s.onerror=()=>rej(new Error("pdfjs cdn fail"));
        document.head.appendChild(s);
      });
      if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=CDN.pdfjsWorker.url;}
      window.pdfjs_loaded=true;
    }else{
      await new Promise((res,rej)=>{
        const s=document.createElement("script");
        s.src=lib.url;s.onload=res;s.onerror=()=>rej(new Error("cdn fail"));
        document.head.appendChild(s);
      });
      window[key+"_loaded"]=true;
    }
    return true;
  }catch(e){ console.warn("CDN load fail:",e); return false; }
}
async function renderDocx(b,bodyEl){
  const ok=await ensureCdn("doc");
  if(!ok){bodyEl.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>加载 Word 预览组件失败<br>请检查网络连接</div>';return;}
  bodyEl.innerHTML='<div class="pv-loading"><div class="spinner"></div>渲染中…</div>';
  try{
    await window.docx.renderAsync(b,bodyEl,null,{className:"docx-container",inWrapper:true,ignoreWidth:false,ignoreHeight:false,breakPages:true});
  }catch(e){bodyEl.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>Word 渲染失败<br>'+escapeHtml(e.message||"")+'</div>';}
}
async function renderPdf(b,bodyEl){
  const ok=await ensureCdn("pdf");
  if(!ok){bodyEl.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>加载 PDF 预览组件失败</div>';return;}
  bodyEl.innerHTML='<div class="pv-loading"><div class="spinner"></div>加载 PDF…</div>';
  try{
    const buf=await b.arrayBuffer();
    const pdf=await window.pdfjsLib.getDocument({data:buf}).promise;
    const container=document.createElement("div");
    container.style.cssText="padding:8px";
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      const viewport=page.getViewport({scale:1.2});
      const canvas=document.createElement("canvas");
      canvas.width=viewport.width;canvas.height=viewport.height;
      canvas.style.cssText="display:block;margin:0 auto 12px;box-shadow:0 2px 12px rgba(0,0,0,.12)";
      const ctx2=canvas.getContext("2d");
      await page.render({canvasContext:ctx2,viewport}).promise;
      container.appendChild(canvas);
    }
    bodyEl.innerHTML="";bodyEl.appendChild(container);
  }catch(e){bodyEl.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>PDF 渲染失败<br>'+escapeHtml(e.message||"")+'</div>';}
}
async function renderSheet(b,bodyEl){
  const ok=await ensureCdn("sheet");
  if(!ok){bodyEl.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>加载表格预览组件失败<br><a href="#" download>下载文件</a></div>';return;}
  bodyEl.innerHTML='<div class="pv-loading"><div class="spinner"></div>解析中…</div>';
  try{
    const wb=XLSX.read(b,{type:"array"});
    const html=wb.SheetNames.map(n=>'<h4 style="padding:8px 12px;margin:0;color:#1d1d1f;font-size:13px;border-bottom:1px solid rgba(0,0,0,.06)">'+escapeHtml(n)+'</h4>'+XLSX.utils.sheet_to_html(wb.Sheets[n],{header:"",footer:""})).join("");
    bodyEl.innerHTML='<div style="padding:0 12px 20px">'+html+'</div>';
    bodyEl.querySelectorAll("table").forEach(t=>{t.style.cssText="border-collapse:collapse;margin:10px 0;font-size:12px;min-width:60%";t.querySelectorAll("td,th").forEach(c=>{c.style.cssText="border:1px solid rgba(0,0,0,.08);padding:4px 8px;font-weight:400";});});
  }catch(e){bodyEl.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>表格解析失败</div>';}
}
async function renderPptx(b,bodyEl){
  const ok=await ensureCdn("slide");
  if(!ok){bodyEl.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>加载 PPT 预览组件失败<br><a href="#" download>下载文件</a></div>';return;}
  bodyEl.innerHTML='<div class="pv-loading"><div class="spinner"></div>渲染中…</div>';
  try{
    /* pptxjs 需要 FileReader 读为 binary string */
    const fr=new FileReader();
    fr.onload=async()=>{
      try{
        const pptx=window.PptxGenJS;
        const res=await pptx.api.PptxGenJS?null:null;
        /* 简化降级：提示下载 */
        bodyEl.innerHTML='<div class="pv-msg"><span class="big">📊</span>PPT 预览组件与当前文件不兼容<br>建议下载后本地打开</div>';
      }catch(e){bodyEl.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>PPT 渲染失败</div>';}
    };
    fr.readAsArrayBuffer(b);
  }catch(e){bodyEl.innerHTML='<div class="pv-msg"><span class="big">⚠️</span>PPT 渲染失败</div>';}
}
function exportBranch(node){
  /* 以该节点为根的子树 PNG 导出：离屏渲染到独立 canvas */
  const subtree=new Set();
  (function collect(n){
    subtree.add(n.id);
    (n.children||[]).forEach(c=>{const ci=state.items.find(i=>i.id===c);if(ci)collect(ci);});
  })(node);
  const members=state.items.filter(i=>subtree.has(i.id));
  /* 计算包围盒 */
  let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  for(const it of members){
    const b=itemBounds(it);
    if(!b) continue;
    x1=Math.min(x1,b.x);y1=Math.min(y1,b.y);
    x2=Math.max(x2,b.x+b.w);y2=Math.max(y2,b.y+b.h);
  }
  if(!isFinite(x1)){toast("没有可导出的内容");return;}
  const pad=40;
  const w=Math.ceil(x2-x1+pad*2),h=Math.ceil(y2-y1+pad*2);
  const oc=document.createElement("canvas");
  oc.width=w*2;oc.height=h*2; // 2x 清晰度
  const o=oc.getContext("2d");
  o.scale(2,2);
  o.fillStyle="#ffffff";o.fillRect(0,0,w,h);
  o.translate(pad-x1,pad-y1);
  /* 画连线 */
  for(const it of members){
    if(it.type==="mindNode"&&it.parentId&&members.some(m=>m.id===it.parentId)){
      const p=members.find(m=>m.id===it.parentId);
      const pa=nodeAnchorR(p),cb=nodeAnchorL(it);
      o.strokeStyle=it.color;o.globalAlpha=.35;o.lineWidth=1.8;o.lineCap="round";
      o.beginPath();o.moveTo(pa.x,pa.y);const mx=(pa.x+cb.x)/2;
      o.bezierCurveTo(mx,pa.y,mx,cb.y,cb.x,cb.y);o.stroke();o.globalAlpha=1;
    }
  }
  /* 画元素本体 */
  for(const it of members){
    if(it.type==="mindNode") drawMindNode(it,o);
    else if(it.type==="note") drawNote(it,o);
    else if(it.type==="fileCard") drawFileCard(it,o);
    else if(it.type==="connector") drawConnector(it,o);
    else if(it.type==="stroke") drawStroke(it,o);
  }
  const a=document.createElement("a");
  a.href=oc.toDataURL("image/png");
  a.download="分支-"+node.text+".png";
  a.click();
  toast("分支已导出 PNG");
}

/* ============================================================
   IndexedDB / 持久化
============================================================ */
const DB_NAME="boardlib",DB_VER=1;
let idb=null;
function openDB(){
  return new Promise((res,rej)=>{
    const rq=indexedDB.open(DB_NAME,DB_VER);
    rq.onupgradeneeded=()=>{
      const db=rq.result;
      if(!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    rq.onsuccess=()=>{idb=rq.result;res();};
    rq.onerror=()=>{idb=null;res();};  // 降级：无 IDB 时文件仅会话内
  });
}
function saveState(){
  try{
    const data={
      projects:state.projects.map(p=>({
        id:p.id,name:p.name,
        files:p.files.map(f=>({id:f.id,name:f.name,kind:f.kind,size:f.size,mime:f.mime,url:f.url||null,created:f.created,folderId:f.folderId||null})),
        folders:p.folders.map(f=>({id:f.id,name:f.name,parentId:f.parentId||null})),
        canvases:p.canvases.map(c=>({id:c.id,name:c.name,items:c.items,camera:c.camera,previews:c.previews||[],links:c.links||[]})),
      })),
      activeProjectId:state.activeProjectId,
      activeCanvasId:state.activeCanvasId,
      ui:{sideCollapsed:state.sideCollapsed,dark:state.dark,bgPattern:state.bgPattern,bgColorName:state.bgColorName,mindMode:state.mindMode,layoutType:state.layoutType,fontPreset:state.fontPreset},
      savedAt:Date.now(),
    };
    localStorage.setItem("board-state",JSON.stringify(data));
  }catch(e){
    console.warn("save board state failed",e);
    toast("保存失败：本地存储空间不足或被浏览器限制");
  }
}
function loadState(){
  try{
    const raw=localStorage.getItem("board-state");
    if(!raw) return false;
    const d=JSON.parse(raw);
    if(d.projects&&d.projects.length){
      state.projects=d.projects.map(p=>({
        ...p,
        files:(p.files||[]).map(f=>({...f,thumb:null,tw:1,th:1})),
        canvases:(p.canvases||[]).map(c=>({...c,items:c.items||[],camera:c.camera||{x:0,y:0,zoom:1},previews:c.previews||[],links:c.links||[]})),
      }));
      state.activeProjectId=d.activeProjectId||state.projects[0].id;
      state.activeCanvasId=d.activeCanvasId||curProject().canvases[0].id;
      /* 旧配色 → 新配色迁移（保证已保存内容的观感更新） */
      const COLOR_MIGRATE={"#2a8a9a":"#2d5fd3","#4a9a5a":"#1fa06a","#8a5a9a":"#7a55c0","#d48840":"#e0882a","#c5483a":"#c94a3e","#fde68a":"#fef3c7","#dcfce7":"#dbeafe","#f5e6c8":"#fef3c7","#f0d690":"#fef3c7","#e8c5c0":"#fde2e2","#c5c0e0":"#ede4ff","#b8c8e0":"#dbeafe","#a8d0c0":"#ccfbf1","#e8e8ea":"#f5f5f4","#0f8aa0":"#2d5fd3","#7a7a82":"#9090a0"};
      if(COLOR_MIGRATE[state.noteColor])state.noteColor=COLOR_MIGRATE[state.noteColor];
      for(const canvas of state.projects.flatMap(p=>p.canvases||[])){
        for(const item of canvas.items||[]){
          if(item.color&&COLOR_MIGRATE[item.color])item.color=COLOR_MIGRATE[item.color];
          if(item.type==="note"&&item.color&&COLOR_MIGRATE[item.color])item.color=COLOR_MIGRATE[item.color];
        }
        for(const link of canvas.links||[]){
          if(link.annotation&&link.color&&COLOR_MIGRATE[link.color])link.color=COLOR_MIGRATE[link.color];
        }
      }
    }else{
      return false; /* projects 为空，需要 seed */
    }
    if(d.ui){
      state.sideCollapsed=!!d.ui.sideCollapsed;
      if(d.ui.dark!==undefined)state.dark=!!d.ui.dark;
      if(d.ui.bgPattern)state.bgPattern=d.ui.bgPattern;
      if(d.ui.bgColorName&&["default","eye","cream","blue","kraft"].includes(d.ui.bgColorName))state.bgColorName=d.ui.bgColorName;
      if(d.ui.mindMode)state.mindMode=d.ui.mindMode;
      if(d.ui.layoutType)state.layoutType=d.ui.layoutType;
      if(d.ui.fontPreset&&FONT_PRESETS[d.ui.fontPreset])state.fontPreset=d.ui.fontPreset;
    }
    /* 强制刷新一次 bgColor（确保和 bgColorName 一致） */
    const _dark=state.dark;
    const _BCM={default:_dark?"#1a1a2e":"#ffffff",eye:_dark?"#1a2a1e":"#c8e6c9",cream:_dark?"#2a2a20":"#fff8e1",blue:_dark?"#1a2030":"#e3f2fd",kraft:_dark?"#2a2218":"#f4ecd8"};
    state.bgColor=_BCM[state.bgColorName]||(_dark?"#1a1a2e":"#ffffff");
    applyTheme();
    applyFontPreset();
    cleanupProjectReferences();
    syncUid();
    return true;
  }catch(e){ return false; }
}
/* 恢复文件 blob 到内存 map（fileCard 的 thumb 从 files 恢复） */
async function restoreFiles(){
  const f=state.files.find(x=>x.kind==="img");
  for(const file of state.files){
    if(file.kind==="img"){
      try{
        const b=await getBlob(file.id);
        const bmp=await createImageBitmap(b);
        const max=300,sc=Math.min(1,max/Math.max(bmp.width,bmp.height));
        file.thumb=bmp;file.tw=bmp.width*sc;file.th=bmp.height*sc;
        for(const it of state.items){
          if(it.type==="fileCard"&&it.fileId===file.id){it.thumb=bmp;it.tw=file.tw;it.th=file.th;}
        }
      }catch(e){}
    }
  }
  render();
}

/* ============================================================
   状态栏
============================================================ */
function updateStatusBar(){
  statBar.innerHTML="";
  const sel=selectedItem();
  /* 元素分类计数 */
  const cnt={mindNode:0,note:0,fileCard:0,stroke:0,connector:0};
  for(const it of state.items){if(cnt[it.type]!==undefined)cnt[it.type]++;}
  const links=state.links.length;
  const dots={mindNode:"#3a4a6b",note:"#c48840",fileCard:"#c48840",stroke:"#6e7080",connector:"#2a7a6a"};
  const ecnt=document.createElement("span");ecnt.className="sb-group";
  for(const [type,n] of Object.entries(cnt)){
    if(n===0)continue;
    const dot=document.createElement("span");dot.className="sb-dot";dot.style.background=dots[type];
    const lbl=document.createElement("b");lbl.textContent=n;
    ecnt.appendChild(dot);ecnt.appendChild(lbl);
  }
  if(links>0){ecnt.appendChild(document.createTextNode(" 线 "));const lb=document.createElement("b");lb.textContent=links;ecnt.appendChild(lb);}
  statBar.appendChild(ecnt);
  /* 筛选 */
  statBar.appendChild(makeStatSpan("筛选",FILTERS.find(f=>f.id===state.filter)?.label||"全部"));
  /* 选中信息 */
  if(sel){
    const selLabel=sel.type==="mindNode"?(sel.text||"节点").slice(0,12):sel.type==="note"?(sel.text||"").slice(0,12):sel.type==="fileCard"?(state.files.find(f=>f.id===sel.fileId)?.name||"材料").slice(0,12):SEL_LABEL[sel.type]||"";
    statBar.appendChild(makeStatSpan("选中",SEL_LABEL[sel.type]+" · "+selLabel));
  }
  /* 缩放（可点击重置） */
  const zoomSpan=document.createElement("span");zoomSpan.className="sb-group sb-clickable";zoomSpan.title="点击重置100%";
  zoomSpan.innerHTML="缩放 <b>"+Math.round(state.camera.zoom*100)+"%</b>";
  zoomSpan.addEventListener("click",()=>{
    const oldZoom=state.camera.zoom;
    const cx=state.camera.x+W/(2*oldZoom),cy=state.camera.y+H/(2*oldZoom);
    state.camera.zoom=1;state.camera.x=cx-W/2;state.camera.y=cy-H/2;
    render();updateStatusBar();
  });
  statBar.appendChild(zoomSpan);
  /* 坐标（相对画布中心） */
  const rx=Math.round(state.mouseWorld.x),ry=Math.round(state.mouseWorld.y);
  statBar.appendChild(makeStatSpan("坐标",rx+", "+ry));
}
function makeStatSpan(k,v){
  const s=document.createElement("span");s.className="sb-group";
  s.innerHTML=k+" <b>"+v+"</b>";
  return s;
}
/* 暗色/亮色主题切换：只切换 data-theme 属性，变量覆盖由 CSS 负责 */
function applyTheme(){
  document.documentElement.setAttribute("data-theme",state.dark?"dark":"light");
}
function applyFontPreset(){
  const preset=FONT_PRESETS[state.fontPreset]||FONT_PRESETS.clear;
  FONT=preset.stack;
  const root=document.documentElement;
  root.style.setProperty("--font",preset.stack);
  root.style.setProperty("--brand-font",state.fontPreset==="handwritten"?FONT_PRESETS.handwritten.stack:FONT_PRESETS.serif.stack);
}
/* Canvas 暗黑模式颜色适配 */
function dc(light,dark){return state.dark?dark:light;}
function darkenColor(hex,factor){
  if(!hex||!hex.startsWith("#"))return hex;
  const r=Math.round(parseInt(hex.slice(1,3),16)*factor);
  const g=Math.round(parseInt(hex.slice(3,5),16)*factor);
  const b=Math.round(parseInt(hex.slice(5,7),16)*factor);
  return"#"+r.toString(16).padStart(2,"0")+g.toString(16).padStart(2,"0")+b.toString(16).padStart(2,"0");
}
/* 提亮(>1)或调暗(<1)十六进制颜色，结果 clamp 到 0-255 */
function shadeColor(hex,factor){
  if(!hex||!hex.startsWith("#"))return hex;
  const cl= v=>Math.max(0,Math.min(255,Math.round(v)));
  const r=cl(parseInt(hex.slice(1,3),16)*factor);
  const g=cl(parseInt(hex.slice(3,5),16)*factor);
  const b=cl(parseInt(hex.slice(5,7),16)*factor);
  return"#"+r.toString(16).padStart(2,"0")+g.toString(16).padStart(2,"0")+b.toString(16).padStart(2,"0");
}
/* 十六进制色转 rgba 字符串 */
function hexToRgba(hex,alpha){
  if(!hex||!hex.startsWith("#"))return hex;
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return"rgba("+r+","+g+","+b+","+alpha+")";
}

/* ============================================================
   键盘
============================================================ */
document.addEventListener("keydown",e=>{
  if(isTyping()){
    if(e.key==="Escape"){closeEditor(true);closeMindEditor(true);}
    if(e.key==="Enter"&&!e.shiftKey){
      if(editingMindId!==null){const n=state.items.find(i=>i.id===editingMindId);closeMindEditor(false);if(n&&e.ctrlKey)addSiblingMind(n);else if(n)addChildMind(n);}
      else if(editingNoteId!==null){
        /* 便签：Enter 换行（默认行为），Ctrl/Cmd+Enter 才完成编辑 */
        if(e.ctrlKey||e.metaKey){e.preventDefault();closeEditor(false);}
        /* 否则不拦截，让 textarea 正常换行 */
      }
    }
    return;
  }
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&(e.key==="z"||e.key==="Z")){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(mod&&(e.key==="y"||e.key==="Y")){e.preventDefault();redo();return;}
  if(mod&&e.key.toLowerCase()==="d"){e.preventDefault();const s=selectedItem();if(s)duplicateItem(s.id);return;}
  if(e.key==="Delete"||e.key==="Backspace"){
    if((document.activeElement&&document.activeElement.tagName)==="INPUT") return;
    const s=selectedItem();if(s)deleteItem(s.id);
    return;
  }
  if(e.key==="Escape"){
    if(state.focusMode){exitFocus();return;}
    if(state.tempTool){state.tempTool=null;setTool("select");toast("已退出临时工具");return;}
    state.selected=null;state.multiSel=[];hideCtxMenu();helpPop.style.display="none";render();return;
  }
  if(e.key===" "){state.spaceDown=true;board.classList.add("space-pan");e.preventDefault();return;}
  const k=e.key.toLowerCase();
  const t=TOOLS.find(t=>t.key===k.toUpperCase());
  if(t&&!e.ctrlKey&&!e.metaKey&&!e.altKey) setTool(t.id);
  /* 临时工具：P 画笔 / N 便签（所见即所得，用完自动退出） */
  if(e.key==="p"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){setTool("select");state.tempTool=state.tempTool==="pen"?"": "pen";renderToolOptions();toast(state.tempTool==="pen"?"画笔模式：按住左键涂鸦":"已退出");return;}
  if(e.key==="n"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){setTool("select");state.tempTool=state.tempTool==="note"?"": "note";renderToolOptions();toast(state.tempTool==="note"?"便签模式：点击空白添加":"已退出");return;}
  /* 导图快捷键（选中节点即可，不限工具） */
  if(e.key==="Tab"&&!e.altKey&&!e.ctrlKey){e.preventDefault();const s=selectedItem();if(s&&s.type==="mindNode")addChildMind(s);return;}
  if(e.key==="Enter"&&!e.altKey&&!e.ctrlKey&&!isTyping()){e.preventDefault();const s=selectedItem();if(s&&s.type==="mindNode")addSiblingMind(s);else if(s&&(s.type==="note"||s.type==="mindNode"))openTextEditor(s);return;}
  if(e.key==="-"&&!e.altKey&&!e.ctrlKey){e.preventDefault();const s=selectedItem();if(s&&s.type==="mindNode")toggleCollapse(s);}
  if((e.key==="+"||e.key==="=")&&!e.altKey&&!e.ctrlKey){e.preventDefault();const s=selectedItem();if(s&&s.type==="mindNode"){s.collapsed=false;render();saveState();}}
  /* Alt+方向键：同级排序 / 提级 / 降级 */
  if(e.altKey&&!e.ctrlKey){
    if(e.key==="ArrowUp"){e.preventDefault();moveSibling(-1);return;}
    if(e.key==="ArrowDown"){e.preventDefault();moveSibling(1);return;}
    if(e.key==="ArrowLeft"){e.preventDefault();promoteNode();return;}
    if(e.key==="ArrowRight"){e.preventDefault();demoteNode();return;}
  }
  /* Shift+方向键：空间导航到最近节点 */
  if(e.shiftKey&&!e.ctrlKey&&!e.altKey&&!isTyping()){
    const dirs={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
    const d=dirs[e.key];
    if(d){
      e.preventDefault();
      const sel=selectedItem();
      if(!sel)return;
      const sb=itemBounds(sel);
      if(!sb)return;
      const cx=sb.x+sb.w/2,cy=sb.y+sb.h/2;
      let best=null,bestDist=Infinity;
      for(const it of state.items){
        if(it.id===sel.id)continue;
        if(it.type!=="mindNode"&&it.type!=="note"&&it.type!=="fileCard")continue;
        if(it.type==="mindNode"&&!isMindNodeVisible(it))continue;
        const b=itemBounds(it);if(!b)continue;
        const dx=(b.x+b.w/2)-cx,dy=(b.y+b.h/2)-cy;
        /* 方向投影必须为正（在目标方向上） */
        const proj=dx*d.x+dy*d.y;
        if(proj<=0)continue;
        const dist=Math.hypot(dx,dy);
        if(dist<bestDist){bestDist=dist;best=it;}
      }
      if(best){state.selected=best.id;state.multiSel=[];render();updateSelBar();}
      return;
    }
  }
  /* C 键：连接/断开（需多选两个元素） */
  /* C 键：连接/断开 */
  if(e.key==="c"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();toggleLink();return;}
  /* A 键：添加批注 */
  if(e.key==="a"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();openAnnotation();return;}
  /* E 键：编辑展开内容 */
  if(e.key==="e"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();openDetail();return;}
  /* F 键：聚焦模式 */
  if(e.key==="f"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();toggleFocus();return;}
  /* J 键：跃迁 */
  if(e.key==="j"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();openJump();return;}
});
document.addEventListener("keyup",e=>{
  if(e.key===" "){state.spaceDown=false;board.classList.remove("space-pan");}
});

/* ============================================================
   工具栏
============================================================ */
function setTool(id){
  state.tool=id;
  board.className="mode-"+id+(state.spaceDown?" space-pan":"");
  renderToolOptions();
  requestRender();
}
function buildToolbar(){
  /* 选择按钮已移除，保留空函数避免 init 报错 */
}
function renderToolOptions(){
  /* 布局已移到下拉菜单，此函数保留空避免报错 */
}

function toast(msg){
  toastEl.textContent=msg;
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t=setTimeout(()=>toastEl.classList.remove("show"),2200);
}

/* 底部筛选工具 */
const FILTERS=[
  {id:"all",label:"全部",icon:"#",type:"all"},
  {id:"mind",label:"导图",icon:"mind",type:"mind"},
  {id:"note",label:"便签",icon:"note",type:"note"},
  {id:"file",label:"材料",icon:"file",type:"file"},
  {id:"pen",label:"涂鸦/连线",icon:"pen",type:"pen"},
];
/* 底部筛选栏：已按需求移除（快速操作+筛选按钮全部删除） */
function buildFilterBar(){
  const bar=document.getElementById("filterbar");
  if(!bar)return;
  bar.innerHTML="";
  bar.style.display="none";
}
function renderFilterBar(){
  /* 筛选栏已移除，保留空实现以免调用点报错 */
  const bar=document.getElementById("filterbar");
  if(bar){bar.innerHTML="";bar.style.display="none";}
}

/* ============================================================
   初始化
============================================================ */
function mountControls(){
  document.getElementById("undoBtn").innerHTML=ICON.undo;
  document.getElementById("redoBtn").innerHTML=ICON.redo;
  document.getElementById("zoomInBtn").innerHTML=ICON.zoomIn;
  document.getElementById("zoomOutBtn").innerHTML=ICON.zoomOut;
  document.getElementById("fitBtn").innerHTML=ICON.fit;
  document.getElementById("helpBtn").innerHTML=ICON.help;
  document.getElementById("bgBtn").innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>';
  document.getElementById("bgColorBtn").innerHTML=ICON.palette;
  document.getElementById("themeBtn").innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
  document.getElementById("exportBtn").innerHTML=ICON.export+"导出";
  document.getElementById("importBtn").innerHTML=ICON.import+"导入";
  document.getElementById("libImportBtn").innerHTML=ICON.plus;
  document.getElementById("newProjectBtn").innerHTML=ICON.plus;
  document.getElementById("newCanvasBtn").innerHTML=ICON.plus;
  sideToggle.innerHTML=ICON.expand;

  document.getElementById("undoBtn").addEventListener("click",undo);
  document.getElementById("redoBtn").addEventListener("click",redo);
  document.getElementById("zoomInBtn").addEventListener("click",()=>zoomAt(W/2,H/2,1.25));
  document.getElementById("zoomOutBtn").addEventListener("click",()=>zoomAt(W/2,H/2,0.8));
  document.getElementById("zoomPct").addEventListener("click",()=>{
    /* 重置到100%：保持视口中心不变 */
    const oldZoom=state.camera.zoom;
    const cx=state.camera.x+W/(2*oldZoom);
    const cy=state.camera.y+H/(2*oldZoom);
    state.camera.zoom=1;
    state.camera.x=cx-W/2;
    state.camera.y=cy-H/2;
    if(zoomPctEl)zoomPctEl.textContent="100%";
    render();updateStatusBar();
  });
  document.getElementById("fitBtn").addEventListener("click",fitAll);
  document.getElementById("helpBtn").addEventListener("click",e=>{
    helpPop.style.display=helpPop.style.display==="block"?"none":"block";
    if(helpPop.style.display==="block"){
      const r=e.currentTarget.getBoundingClientRect();
      helpPop.style.right=(window.innerWidth-r.right+10)+"px";
      helpPop.style.top=(r.bottom+10)+"px";
    }
  });
  document.getElementById("bgBtn").addEventListener("click",()=>{
    const pats=["grid","dots","lines","kraft","blank"];
    const labels={grid:"方格",dots:"点阵",lines:"横格",kraft:"牛皮纸纹理",blank:"纯色无纹理"};
    const idx=pats.indexOf(state.bgPattern||"grid");
    state.bgPattern=pats[(idx+1)%pats.length];
    render();saveState();
    toast("纹理："+labels[state.bgPattern]);
  });
  document.getElementById("bgColorBtn").addEventListener("click",()=>{
    const cols=["default","eye","cream","blue","kraft"];
    const idx=cols.indexOf(state.bgColorName||"default");
    state.bgColorName=cols[(idx+1)%cols.length];
    render();saveState();
    requestAnimationFrame(()=>render());
  });
  document.getElementById("themeBtn").addEventListener("click",()=>{
    state.dark=!state.dark;
    applyTheme();
    render();saveState();
    toast(state.dark?"暗色模式":"亮色模式");
    /* 强制再绘一帧，确保 Canvas 和 DOM 同步 */
    requestAnimationFrame(()=>render());
  });
  document.getElementById("exportBtn").addEventListener("click",exportProject);
  document.getElementById("importBtn").addEventListener("click",()=>offerImport());
  document.getElementById("libImportBtn").addEventListener("click",()=>offerImport());
  fileInput.addEventListener("change",()=>{if(fileInput.files.length)importFiles(fileInput.files);fileInput.value="";});
  document.getElementById("newProjectBtn").addEventListener("click",()=>showPrompt("新建项目","项目名称","新项目",name=>{if(name)createProject(name);}));
  document.getElementById("newCanvasBtn").addEventListener("click",()=>showPrompt("新建画布","画布名称","新画布",name=>{if(name)createCanvas(name);}));

  sideToggle.addEventListener("click",()=>{state.sideCollapsed=!state.sideCollapsed;applySide();saveState();});

  /* 侧栏三区可折叠 */
  function toggleSection(id){
    const el=document.getElementById(id);
    if(el) el.classList.toggle("section-collapsed");
  }
  document.getElementById("project-head").addEventListener("click",e=>{
    if(e.target.closest(".icon-btn"))return;
    toggleSection("project-section");
  });
  document.getElementById("canvas-head").addEventListener("click",e=>{
    if(e.target.closest(".icon-btn"))return;
    toggleSection("canvas-section");
  });
  document.getElementById("lib-head").addEventListener("click",e=>{
    if(e.target.closest(".icon-btn"))return;
    const fg=document.getElementById("file-groups");
    if(fg){const hidden=fg.style.display==="none";fg.style.display=hidden?"block":"none";document.getElementById("lib-head").classList.toggle("collapsed",!hidden);}
  });
  document.getElementById("libToggleBtn").addEventListener("click",()=>{
    const fg=document.getElementById("file-groups");
    if(fg){const hidden=fg.style.display==="none";fg.style.display=hidden?"block":"none";document.getElementById("lib-head").classList.toggle("collapsed",!hidden);}
  });

  /* 下拉菜单栏（WPS风格） */
  const menuDrop=document.getElementById("menuDrop");
  const MENUS={
    layout:[
      {icon:"",label:"重新排版",key:"",fn:()=>{autoLayout();avoidOverlap();render();saveState();toast("已重新排版");}},
      {sep:true},
      {icon:"",label:"逻辑图（向右）",key:"",fn:()=>{state.layoutType="right";autoLayout();render();saveState();toast("逻辑图（向右）");}},
      {icon:"",label:"组织结构图（向下）",key:"",fn:()=>{state.layoutType="org";autoLayout();render();saveState();toast("组织结构图（向下）");}},
      {icon:"",label:"鱼骨图（因果分析）",key:"",fn:()=>{state.layoutType="fishbone";autoLayout();render();saveState();toast("鱼骨图");}},
      {icon:"",label:"时间轴（横向）",key:"",fn:()=>{state.layoutType="timeline";autoLayout();render();saveState();toast("时间轴（横向）");}},
      {icon:"",label:"括号图（总分）",key:"",fn:()=>{state.layoutType="brace";autoLayout();render();saveState();toast("括号图");}},
    ],
    add:[
      {icon:ICON.mind,label:"节点",key:"Tab",fn:()=>{const s=selectedItem();if(s&&s.type==="mindNode"){addChildMind(s);}else{pushHistory("添加节点");const n=addMindNode(defaultNodeName(null),null,state.mindColor,W/2/state.camera.zoom+state.camera.x,H/2/state.camera.zoom+state.camera.y);smartPlace(n);state.selected=n.id;render();saveState();}}},
      {icon:ICON.note,label:"便签",key:"N",fn:()=>{setTool("select");state.tempTool=state.tempTool==="note"?"":"note";renderToolOptions();toast(state.tempTool==="note"?"便签模式":"已退出");}},
      {icon:ICON.pen,label:"画笔",key:"P",fn:()=>{setTool("select");state.tempTool=state.tempTool==="pen"?"":"pen";renderToolOptions();toast(state.tempTool==="pen"?"画笔模式":"已退出");}},
      {icon:ICON.plus,label:"放入文件",key:"",fn:()=>{offerImport();}},
      {sep:true},
      {icon:ICON.annotate,label:"添加批注",key:"A",fn:()=>openAnnotation()},
    ],
    relate:[
      {icon:ICON.connector,label:"连接选中",key:"C",fn:()=>toggleLink()},
      {icon:ICON.jump,label:"跃迁到画布",key:"J",fn:()=>openJump()},
    ],
    view:[
      {icon:ICON.focus,label:"聚焦",key:"F",fn:()=>toggleFocus()},
      {sep:true},
      {icon:"",label:"字体 · 界面雅黑",key:"",fn:()=>{state.fontPreset="clear";applyFontPreset();render();saveState();toast("字体：界面雅黑");}},
      {icon:"",label:"字体 · 书卷宋体",key:"",fn:()=>{state.fontPreset="serif";applyFontPreset();render();saveState();toast("字体：书卷宋体");}},
      {icon:"",label:"字体 · 手写楷体",key:"",fn:()=>{state.fontPreset="handwritten";applyFontPreset();render();saveState();toast("字体：手写楷体");}},
    ],
  };
  function showMenuDrop(key,btn){
    const items=MENUS[key];if(!items)return;
    menuDrop.innerHTML="";
    for(const it of items){
      if(it.sep){const s=document.createElement("div");s.className="sep";menuDrop.appendChild(s);continue;}
      const mi=document.createElement("button");
      mi.className="mi";
      mi.innerHTML='<span class="mi-ic">'+(it.icon||"")+'</span><span class="mi-label">'+it.label+'</span>'+(it.key?'<span class="mi-key">'+it.key+'</span>':'');
      mi.addEventListener("click",()=>{hideMenuDrop();it.fn();});
      menuDrop.appendChild(mi);
    }
    const r=btn.getBoundingClientRect();
    menuDrop.style.left=r.left+"px";
    menuDrop.style.top=(r.bottom+4)+"px";
    menuDrop.classList.add("show");
  }
  function hideMenuDrop(){menuDrop.classList.remove("show");}
  document.querySelectorAll(".menu-tab").forEach(tab=>{
    tab.addEventListener("click",e=>{
      e.stopPropagation();
      const key=tab.dataset.menu;
      const isActive=tab.classList.contains("active");
      document.querySelectorAll(".menu-tab").forEach(t=>t.classList.remove("active"));
      if(isActive){hideMenuDrop();return;}
      tab.classList.add("active");
      showMenuDrop(key,tab);
    });
  });
  document.addEventListener("click",e=>{
    if(!menuDrop.contains(e.target)&&!e.target.classList.contains("menu-tab"))hideMenuDrop();
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape")hideMenuDrop();});

  mountSearch();
}
/* ============================================================
   全局搜索（Ctrl+F / 顶栏输入框）
============================================================ */
function mountSearch(){
  const input=document.getElementById("searchInput");
  const wrap=document.getElementById("searchWrap");
  const resBox=document.getElementById("searchResults");
  const cnt=document.getElementById("searchCount");

  function itemLabel(it){
    if(it.type==="mindNode") return it.text||"(空)";
    if(it.type==="note") return it.text||"" ;
    if(it.type==="fileCard"){
      const f=state.files.find(x=>x.id===it.fileId);
      return f?f.name:"材料";
    }
    return "";
  }
  function itemTypeLabel(it){
    return it.type==="mindNode"?"节点":it.type==="note"?"便签":it.type==="fileCard"?"材料":"图形";
  }
  function runSearch(){
    const q=input.value.trim().toLowerCase();
    if(!q){ state.search=null; resBox.style.display="none"; cnt.textContent=""; hideSearchHighlights(); render(); return; }
    const results=[];
    for(const it of state.items){
      const label=itemLabel(it);
      if(label.toLowerCase().includes(q)||(it.detail||"").toLowerCase().includes(q)){
        results.push(it.id);
      }
    }
    state.search={q,results:results,idx:results.length?0:-1};
    renderResults();
    if(results.length){highlightResults();gotoResult(0);}
    else render();
  }
  function renderResults(){
    const s=state.search;
    if(!s){resBox.style.display="none";cnt.textContent="";return;}
    cnt.textContent=s.results.length?s.results.length+" 条":"0";
    resBox.innerHTML="";
    if(!s.results.length){
      const e=document.createElement("div");e.className="sr-empty";e.textContent="无匹配结果";
      resBox.appendChild(e);resBox.style.display="block";
      return;
    }
    const maxShow=30;
    s.results.slice(0,maxShow).forEach((id,i)=>{
      const it=state.items.find(x=>x.id===id);
      if(!it) return;
      const row=document.createElement("div");
      row.className="sr-item"+(i===s.idx?" sr-active":"");
      row.innerHTML='<span class="sr-type">'+itemTypeLabel(it)+'</span><span class="sr-txt"></span>';
      row.querySelector(".sr-txt").textContent=itemLabel(it);
      row.addEventListener("mousedown",e=>{e.preventDefault();gotoResult(i);});
      resBox.appendChild(row);
    });
    resBox.style.display="block";
  }
  function gotoResult(i){
    const s=state.search;
    if(!s||i<0||i>=s.results.length) return;
    s.idx=i;
    const id=s.results[i];
    const it=state.items.find(x=>x.id===id);
    if(it){
      const b=itemBounds(it);
      if(b){
        state.camera.x=b.x+b.w/2-W/state.camera.zoom/2;
        state.camera.y=b.y+b.h/2-H/state.camera.zoom/2;
      }
      state.selected=id;
    }
    highlightResults();
    renderResults();
    render();
  }
  function highlightResults(){
    const s=state.search;
    if(!s) return;
    state._hlIds=s.results;
    requestRender();
  }
  function hideSearchHighlights(){ state._hlIds=null; }

  input.addEventListener("input",runSearch);
  input.addEventListener("focus",()=>{if(state.search)renderResults();});
  input.addEventListener("keydown",e=>{
    if(e.key==="Escape"){input.blur();resBox.style.display="none";hideSearchHighlights();render();}
    if(e.key==="Enter"||e.key==="ArrowDown"){e.preventDefault();const s=state.search;if(s)gotoResult(Math.min(s.idx+1,s.results.length-1));}
    if(e.key==="ArrowUp"){e.preventDefault();const s=state.search;if(s)gotoResult(Math.max(s.idx-1,0));}
    e.stopPropagation();
  });
  document.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="f"){
      e.preventDefault();
      input.focus();input.select();
    }
  });
  /* 点击外部关闭 */
  document.addEventListener("pointerdown",e=>{
    if(!wrap.contains(e.target)){resBox.style.display="none";hideSearchHighlights();render();}
  });
}
/* 自定义弹层（替代浏览器原生 prompt/confirm） */
const modal=document.getElementById("modal");
function showModal(title,bodyHtml,actions){
  const box=modal.querySelector(".modal-box");
  box.querySelector(".modal-title").textContent=title;
  box.querySelector(".modal-body").innerHTML=bodyHtml;
  const actEl=box.querySelector(".modal-actions");
  actEl.innerHTML="";
  for(const a of actions){
    const b=document.createElement("button");
    b.className="modal-btn "+(a.primary?"primary":"secondary");
    b.textContent=a.label;
    b.addEventListener("click",()=>{if(a.onClick)a.onClick();hideModal();});
    actEl.appendChild(b);
  }
  /* 绑定关闭按钮 */
  const closeBtn=box.querySelector(".modal-close");
  if(closeBtn)closeBtn.onclick=hideModal;
  modal.classList.add("show");
  setTimeout(()=>{const inp=box.querySelector(".modal-input");if(inp)inp.focus();},50);
}
function hideModal(){modal.classList.remove("show");}
modal.addEventListener("click",e=>{if(e.target===modal)hideModal();});
/* 选项弹层 */
function showOptions(title,opts){
  const list=opts.map(o=>`<div class="opt-item" data-id="${o.id}"><div class="opt-ic">${o.icon||""}</div><div class="opt-tx"><div class="opt-name">${o.label}</div><div class="opt-desc">${o.desc||""}</div></div></div>`).join("");
  showModal(title,`<div class="opt-list">${list}</div>`,[{label:"取消"}]);
  modal.querySelectorAll(".opt-item").forEach(el=>{
    el.addEventListener("click",()=>{
      const id=el.dataset.id;
      const opt=opts.find(o=>o.id===id);
      hideModal();
      if(opt&&opt.onClick)opt.onClick();
    });
  });
}
/* 输入弹层 */
function showPrompt(title,placeholder,defaultValue,onConfirm){
  showModal(title,`<input class="modal-input" type="text" placeholder="${placeholder||""}" value="${defaultValue||""}">`,[
    {label:"取消"},
    {label:"确定",primary:true,onClick:()=>{const inp=modal.querySelector(".modal-input");if(inp&&onConfirm)onConfirm(inp.value);}}
  ]);
  const inp=modal.querySelector(".modal-input");
  if(inp){
    inp.addEventListener("keydown",e=>{
      if(e.key==="Enter"){e.preventDefault();if(onConfirm)onConfirm(inp.value);hideModal();}
      if(e.key==="Escape")hideModal();
    });
    inp.select();
  }
}
/* 链接导入弹层 */
function showLinkPrompt(onConfirm){
  showModal("添加链接",`<input class="modal-input" type="url" placeholder="https://…" style="margin-bottom:10px"><input class="modal-input" type="text" placeholder="显示名称（可选）">`,[
    {label:"取消"},
    {label:"添加",primary:true,onClick:()=>{const inputs=modal.querySelectorAll(".modal-input");if(inputs&&onConfirm)onConfirm(inputs[0].value,inputs[1].value);}}
  ]);
  const inp=modal.querySelector(".modal-input");
  if(inp){inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const inputs=modal.querySelectorAll(".modal-input");if(inputs&&onConfirm)onConfirm(inputs[0].value,inputs[1].value);hideModal();}});}
}
function offerImport(){
  showOptions("导入材料",[
    {id:"file",label:"本地文件",desc:"选择一个或多个文件",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/></svg>',onClick:()=>fileInput.click()},
    {id:"folder",label:"整个文件夹",desc:"导入文件夹，保留目录结构",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',onClick:()=>document.getElementById("folderInput").click()},
    {id:"link",label:"网页链接",desc:"粘贴一个 URL",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',onClick:()=>showLinkPrompt((url,name)=>{if(url&&/^https?:\/\//i.test(url))addLinkFile(url,name);})},
  ]);
}
function addLinkFile(url,name){
  if(!name){try{name=new URL(url).hostname;}catch(e){name=url;}}
  const f={id:"f"+(uid++),name:name||url,kind:"link",url,size:0,mime:"",created:Date.now()};
  state.files.push(f);
  renderFileGroups();saveState();
  toast("已添加链接");
}
/* 文件夹上传 */
document.getElementById("folderInput").addEventListener("change",()=>{
  const fi=document.getElementById("folderInput");
  if(fi.files.length) importFiles(fi.files);
  fi.value="";
});
function applySide(){
  sidePanel.classList.toggle("collapsed",state.sideCollapsed);
  board.classList.toggle("side-collapsed",state.sideCollapsed);
  ["lib-head","file-groups","project-section","canvas-section"].forEach(id=>{
    const el=document.getElementById(id);if(el)el.classList.toggle("side-hidden",state.sideCollapsed);
  });
  sideToggle.style.top="45%";
  requestAnimationFrame(resize);
  setTimeout(resize,60);
  setTimeout(resize,150);
  setTimeout(resize,300);
}

/* 种子数据：商业航天总纲 */
function seed(){
  /* 创建默认项目 */
  const p=createProject("商业航天总纲");
  const root=addMindNode("商业航天总纲",null,MIND_COLORS[0],80,200);
  const a=addMindNode("火箭",root.id,MIND_COLORS[1],320,120);
  const b=addMindNode("卫星",root.id,MIND_COLORS[2],320,220);
  const c=addMindNode("发射场",root.id,MIND_COLORS[3],320,320);
  const d=addMindNode("应用场景",root.id,MIND_COLORS[4],320,420);
  const a1=addMindNode("液氧甲烷发动机",a.id,MIND_COLORS[1],540,90);
  const a2=addMindNode("可回收复用",a.id,MIND_COLORS[1],540,150);
  const a3=addMindNode("核心配套",a.id,MIND_COLORS[1],540,210);
  const b1=addMindNode("低轨宽带星座",b.id,MIND_COLORS[2],540,190);
  const b2=addMindNode("通导遥一体化",b.id,MIND_COLORS[2],540,250);
  const b3=addMindNode("卫星制造",b.id,MIND_COLORS[2],540,310);
  state.selected=root.id;
  addNote(860,60,"交互提示\n· 空白拖动 = 平移画布\n· 双击内容 = 编辑文字\n· 节点蓝点拖出 = 建立父子\n· 便签拖到节点 = 关联\n· P 画笔 · N 便签",NOTE_COLORS[0]);
  addNote(860,250,"把 BP、投决书、招股书导入资源库\n拖到画布变成材料卡片\n点击卡片 → 画布内预览\n左侧可新建多个画布和项目",NOTE_COLORS[2]);
  /* 重命名主画布 */
  curCanvas().name="商业航天总纲";
  if(state.mindMode==="auto") autoLayout();
  syncUid();
  renderSidePanel();
}

/* ============================================================
   AI 编排接口（同页上下文调用，不读取或传出本地文件内容）
============================================================ */
const ZHIJIAN_AI_API_VERSION="1.0";
function aiFail(message){throw new Error(message);}
function aiProject(projectId){
  const project=state.projects.find(p=>p.id===projectId);
  if(!project)aiFail("未找到项目："+projectId);return project;
}
function aiActivate(projectId,canvasId){
  const project=aiProject(projectId||state.activeProjectId);
  const canvas=project.canvases.find(c=>c.id===canvasId)||project.canvases[0];
  if(!canvas)aiFail("项目中没有可用画布");
  state.activeProjectId=project.id;state.activeCanvasId=canvas.id;state.selected=null;return{project,canvas};
}
function aiItem(ref,aliases){
  const id=aliases&&aliases.get(String(ref))||ref;
  const item=state.items.find(it=>String(it.id)===String(id));
  if(!item)aiFail("未找到元素："+ref);return item;
}
function aiSnapshot(){
  return JSON.parse(JSON.stringify({
    version:ZHIJIAN_AI_API_VERSION,
    activeProjectId:state.activeProjectId,activeCanvasId:state.activeCanvasId,
    projects:state.projects.map(p=>({id:p.id,name:p.name,files:(p.files||[]).map(f=>({id:f.id,name:f.name,kind:f.kind,size:f.size,mime:f.mime,folderId:f.folderId||null,aiSource:f.aiSource||null})),canvases:(p.canvases||[]).map(c=>({id:c.id,name:c.name,items:c.items||[],links:c.links||[]}))})),
    preferences:{dark:state.dark,fontPreset:state.fontPreset,bgPattern:state.bgPattern,bgColorName:state.bgColorName,layoutType:state.layoutType},
  }));
}
function aiCommit(){cleanupProjectReferences();syncUid();renderSidePanel();render();saveState();}
function aiRelation(aId,bId,type,annotation){
  const relationType=RELATION_TYPES[type]?type:"related";
  const existing=state.links.find(l=>(l.aId===aId&&l.bId===bId)||(l.aId===bId&&l.bId===aId));
  if(existing){existing.relationType=relationType;existing.directional=!!RELATION_TYPES[relationType].directional;existing.annotation=annotation||existing.annotation||"";return existing;}
  const link={id:"lnk"+(uid++),aId,bId,annotation:annotation||"",relationType,directional:!!RELATION_TYPES[relationType].directional};
  state.links.push(link);return link;
}
function aiRegisterSource(source){
  if(source.fileId){const file=state.files.find(f=>f.id===source.fileId);if(!file)aiFail("未找到附件："+source.fileId);return file;}
  const file={id:"ai-file-"+(uid++),name:source.name||"AI 来源材料",kind:"other",size:Number(source.size)||0,mime:source.mime||"text/plain",url:null,created:Date.now(),folderId:null,aiSource:{summary:source.summary||"",locator:source.locator||"",excerpt:source.excerpt||""}};
  state.files.push(file);return file;
}
function aiBuildCanvas(plan){
  if(!plan||typeof plan!=="object")aiFail("画布计划必须是对象");
  let project=curProject();
  if(plan.projectId)project=aiProject(plan.projectId);
  if(plan.projectName&&!plan.projectId){const found=state.projects.find(p=>p.name===plan.projectName);if(found)project=found;else{project=createProject(plan.projectName);}}
  state.activeProjectId=project.id;
  let canvas=plan.canvasId?project.canvases.find(c=>c.id===plan.canvasId):null;
  if(!canvas){canvas=createCanvas(plan.canvasName||plan.title||"AI 生成画布");}
  state.activeCanvasId=canvas.id;
  pushHistory();
  if(plan.replace){state.items=[];state.links=[];state.previews=[];}
  const aliases=new Map(),nodes=[...(plan.nodes||[])],notes=plan.notes||[],attachments=plan.attachments||[];
  let unresolved=nodes.slice();
  while(unresolved.length){
    const before=unresolved.length;
    unresolved=unresolved.filter(spec=>{
      const parentRef=spec.parentKey||spec.parentId||null;
      if(parentRef&&!aliases.has(String(parentRef)))return true;
      const parentId=parentRef?aliases.get(String(parentRef)):null;
      const node=addMindNode(spec.title||spec.text||"未命名主题",parentId,spec.color||state.mindColor,spec.x,spec.y);
      node.detail=spec.explanation||spec.detail||"";node.annotation=spec.annotation||"";
      aliases.set(String(spec.key||spec.id||node.id),node.id);return false;
    });
    if(unresolved.length===before)aiFail("节点父级不存在或存在循环引用");
  }
  for(const spec of notes){
    const note=addNote(spec.x||0,spec.y||0,spec.markdown||spec.text||"",spec.color||state.noteColor);
    note.detail=spec.explanation||spec.detail||"";note.annotation=spec.annotation||"";
    if(spec.fontFamily)note.fontFamily=spec.fontFamily;if(spec.fontSize)note.fontSize=spec.fontSize;if(spec.underline)note.underline=true;if(spec.bold)note.bold=true;
    aliases.set(String(spec.key||spec.id||note.id),note.id);
  }
  for(const spec of attachments){
    const file=aiRegisterSource(spec);const card=addFileCard(spec.x||0,spec.y||0,file.id);
    card.detail=spec.explanation||spec.detail||"";card.annotation=spec.annotation||"";
    aliases.set(String(spec.key||spec.id||card.id),card.id);
    if(spec.attachTo||spec.nodeKey){const node=aiItem(spec.attachTo||spec.nodeKey,aliases);if(node.type!=="mindNode")aiFail("附件只能关联到导图节点");node.attachIds=Array.from(new Set([...(node.attachIds||[]),card.id]));}
  }
  for(const spec of plan.relations||[]){
    const a=aiItem(spec.from||spec.a||spec.aId,aliases),b=aiItem(spec.to||spec.b||spec.bId,aliases);
    aiRelation(a.id,b.id,spec.type||spec.relationType,spec.annotation);
  }
  for(const spec of notes){
    if(spec.attachTo||spec.nodeKey){const node=aiItem(spec.attachTo||spec.nodeKey,aliases),note=aiItem(spec.key||spec.id,aliases);if(node.type!=="mindNode")aiFail("便签只能关联到导图节点");node.attachIds=Array.from(new Set([...(node.attachIds||[]),note.id]));}
  }
  const mode=plan.layout||"right";state.layoutType=mode==="radial"?"radial":mode==="both"?"both":"right";
  if(plan.arrange!==false)autoLayout();
  aiCommit();
  return{projectId:project.id,canvasId:canvas.id,aliases:Object.fromEntries(aliases)};
}
function aiUpdateItem(ref,patch){
  const item=aiItem(ref);const allowed=["text","color","detail","annotation","x","y","w","h","collapsed","fontFamily","fontSize","underline","bold","jumpTo"];
  for(const key of allowed)if(Object.prototype.hasOwnProperty.call(patch||{},key))item[key]=patch[key];
  aiCommit();return item;
}
function aiExecute(command){
  try{
    if(!command||typeof command!=="object")aiFail("命令必须是对象");
    const op=command.op||command.action;
    let value;
    switch(op){
      case "snapshot":value=aiSnapshot();break;
      case "activate":value=aiActivate(command.projectId,command.canvasId).canvas;aiCommit();break;
      case "create_project":value=createProject(command.name||"AI 项目");break;
      case "rename_project":{const project=aiProject(command.projectId||state.activeProjectId);if(!command.name)aiFail("项目名称不能为空");project.name=command.name;aiCommit();value={id:project.id,name:project.name};break;}
      case "create_canvas":aiActivate(command.projectId||state.activeProjectId);value=createCanvas(command.name||"AI 画布");break;
      case "rename_canvas":aiActivate(command.projectId||state.activeProjectId,command.canvasId);renameCanvas(command.canvasId,command.name);value={id:command.canvasId,name:command.name};break;
      case "delete_project":if(command.confirm!==true)aiFail("删除项目需要 confirm: true");deleteProject(command.projectId||state.activeProjectId);value={};break;
      case "delete_canvas":if(command.confirm!==true)aiFail("删除画布需要 confirm: true");aiActivate(command.projectId||state.activeProjectId,command.canvasId);deleteCanvas(command.canvasId);value={};break;
      case "create_node":aiActivate(command.projectId||state.activeProjectId,command.canvasId||state.activeCanvasId);pushHistory();value=addMindNode(command.title||command.text||"未命名主题",command.parentId||null,command.color||state.mindColor,command.x,command.y);value.detail=command.detail||command.explanation||"";aiCommit();break;
      case "create_note":aiActivate(command.projectId||state.activeProjectId,command.canvasId||state.activeCanvasId);pushHistory();value=addNote(command.x||0,command.y||0,command.markdown||command.text||"",command.color||state.noteColor);value.detail=command.detail||command.explanation||"";aiCommit();break;
      case "create_attachment":aiActivate(command.projectId||state.activeProjectId,command.canvasId||state.activeCanvasId);pushHistory();{const file=aiRegisterSource(command.source||command);value=addFileCard(command.x||0,command.y||0,file.id);if(command.attachTo){const node=aiItem(command.attachTo);if(node.type!=="mindNode")aiFail("附件只能关联到导图节点");node.attachIds=Array.from(new Set([...(node.attachIds||[]),value.id]));}aiCommit();}break;
      case "create_stroke":{const points=command.points||[];if(points.length<2)aiFail("画笔至少需要两个坐标点");pushHistory();value={id:uid++,type:"stroke",points:points.map(p=>({x:Number(p.x),y:Number(p.y)})),color:command.color||state.penColor,size:Number(command.size)||state.penSize,detail:command.detail||"",annotation:command.annotation||"",birth:performance.now()};state.items.push(value);aiCommit();break;}
      case "create_connector":{if(!command.a||!command.b)aiFail("连接线需要 a 和 b 两个端点");pushHistory();value=addConnector(command.a,command.b);value.color=command.color||value.color;value.width=Number(command.width)||value.width;aiCommit();break;}
      case "build_canvas":value=aiBuildCanvas(command.plan||command);break;
      case "update_item":pushHistory();value=aiUpdateItem(command.itemId||command.id,command.patch);break;
      case "duplicate_item":duplicateItem(command.itemId||command.id);value={};break;
      case "delete_item":deleteItem(command.itemId||command.id);value={id:command.itemId||command.id};break;
      case "relate":pushHistory();value=aiRelation(aiItem(command.from).id,aiItem(command.to).id,command.type,command.annotation);aiCommit();break;
      case "update_relation":{const link=state.links.find(l=>l.id===(command.linkId||command.id));if(!link)aiFail("未找到关系线");pushHistory();if(command.type&&RELATION_TYPES[command.type]){link.relationType=command.type;link.directional=!!RELATION_TYPES[command.type].directional;}if(Object.prototype.hasOwnProperty.call(command,"annotation"))link.annotation=command.annotation||"";aiCommit();value=link;break;}
      case "attach":{const node=aiItem(command.nodeId),item=aiItem(command.itemId);if(node.type!=="mindNode"||item.type==="mindNode")aiFail("只能将非节点元素关联到导图节点");pushHistory();node.attachIds=Array.from(new Set([...(node.attachIds||[]),item.id]));aiCommit();value={nodeId:node.id,itemId:item.id};break;}
      case "detach":{const node=aiItem(command.nodeId),item=aiItem(command.itemId);if(node.type!=="mindNode")aiFail("关联目标必须是导图节点");pushHistory();node.attachIds=(node.attachIds||[]).filter(id=>id!==item.id);aiCommit();value={nodeId:node.id,itemId:item.id};break;}
      case "reparent_node":{const node=aiItem(command.nodeId),parent=command.parentId?aiItem(command.parentId):null;if(node.type!=="mindNode"||(parent&&parent.type!=="mindNode"))aiFail("父子关系只能用于导图节点");let cursor=parent;while(cursor){if(cursor.id===node.id)aiFail("不能把节点移动到自己的子树中");cursor=cursor.parentId&&state.items.find(it=>it.id===cursor.parentId);}pushHistory();const old=node.parentId&&state.items.find(it=>it.id===node.parentId);if(old)old.children=(old.children||[]).filter(id=>id!==node.id);node.parentId=parent?parent.id:null;if(parent)parent.children=Array.from(new Set([...(parent.children||[]),node.id]));aiCommit();value={nodeId:node.id,parentId:node.parentId};break;}
      case "delete_relation":deleteItem(command.linkId||command.id);value={id:command.linkId||command.id};break;
      case "set_layout":state.layoutType=command.layout==="radial"?"radial":command.layout==="both"?"both":"right";autoLayout();aiCommit();value={layout:state.layoutType};break;
      case "focus":enterFocus(aiItem(command.itemId||command.id).id);value={id:command.itemId||command.id};break;
      case "exit_focus":exitFocus();value={};break;
      case "set_preferences":Object.assign(state,{dark:command.dark??state.dark,fontPreset:FONT_PRESETS[command.fontPreset]?command.fontPreset:state.fontPreset,bgPattern:command.bgPattern||state.bgPattern,bgColorName:command.bgColorName||state.bgColorName});applyTheme();applyFontPreset();aiCommit();value=aiSnapshot().preferences;break;
      case "undo":undo();value={};break;
      case "redo":redo();value={};break;
      case "batch":value=(command.commands||[]).map(aiExecute);break;
      default:aiFail("不支持的 AI 命令："+op);
    }
    return{ok:true,value};
  }catch(error){return{ok:false,error:error.message||String(error)};}
}
window.ZhijianAI=Object.freeze({version:ZHIJIAN_AI_API_VERSION,snapshot:aiSnapshot,execute:aiExecute,buildCanvas:plan=>aiExecute({op:"build_canvas",plan})});
window.addEventListener("zhijian:command",event=>{const result=aiExecute(event.detail&&event.detail.command||event.detail);if(event.detail&&typeof event.detail.respond==="function")event.detail.respond(result);});

function init(){
  buildToolbar();
  buildFilterBar();
  setTool("select");
  syncHistoryBtns();
  mountControls();
  applySide();
  applyTheme();
  applyFontPreset();
  resize();
  openDB().then(()=>{
    const has=loadState();
    if(!has){
      seed();
      saveState();
      fitAll();
    }else{
      restoreFiles().then(()=>{
        renderSidePanel();
        render();fitAll();
        syncPvDom();
      });
    }
    renderSidePanel();
    render();
  });
  window.addEventListener("resize",resize);
  window.addEventListener("beforeunload",saveState);
  setInterval(saveState,15000);
}
init();
/* ResizeObserver 持续监听 board 尺寸变化（CSS transition/窗口变化/响应式折叠都覆盖） */
if(typeof ResizeObserver!=="undefined"){
  new ResizeObserver(()=>{resize();}).observe(board);
}
