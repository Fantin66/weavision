"use strict";
/* ============================================================
   常量
============================================================ */
const FONT_PRESETS={
  clear:{label:"界面雅黑",stack:'"Microsoft YaHei UI","PingFang SC","Noto Sans SC","Segoe UI",sans-serif'},
  serif:{label:"书卷宋体",stack:'"Noto Serif SC","Source Han Serif SC","Songti SC","SimSun",serif'},
  handwritten:{label:"手写楷体",stack:'"LXGW WenKai","WX-Kalam","WX-Indie","KaiTi","STKaiti",serif'},
  artistic:{label:"艺术手写",stack:'"STXingkai","FZShuTi","STKaiti","KaiTi",cursive'},
};
let FONT=FONT_PRESETS.serif.stack;
const BRAND_FONT='"STKaiti","KaiTi","Noto Serif SC","Source Han Serif SC",serif';
const MONO_STACK='"Geist Mono","SF Mono","Cascadia Mono","Consolas",ui-monospace,monospace';
const TOPBAR_H=50;
const NOTE_COLORS=["#fef3c7","#d1fadf","#dbeafe","#fde2e2","#ede4ff","#ccfbf1","#f5f5f4"];
const LINE_COLORS=["#3a4a6b","#c94a3e","#e0882a","#1fa06a","#2d5fd3","#7a55c0","#9090a0"];
const MIND_COLORS=["#2d5fd3","#3a4a6b","#1fa06a","#7a55c0","#e0882a","#c94a3e"];
const DEFAULT_NOTE_COLOR="#fef3c7";
const DEFAULT_LINE_COLOR="#6e7080";
/* ============================================================
   全局样式系统 — 4 套风格（思维导图节点 + 附件卡片统一）
   依据 2025 设计趋势：玻璃拟态 / 拟物纸感 / 新拟态 / 清晰扁平
============================================================ */
const STYLE_PRESETS={
  clear:{label:"默认",desc:"清晰层级，统一卡片语言"},
  glass:{label:"玻璃",desc:"带厚度的磨砂玻璃与冷光连线"},
  paper:{label:"拟物",desc:"不透明纸张、墨水线与自然纸边"},
  minimal:{label:"简约",desc:"极简边框，字号/颜色分层"},
};
const STYLE_ALIAS={fluent:"glass"};   /* 兼容旧存档：Fluent 质感 → 玻璃 */
const DEFAULT_STYLE="clear";
/* 返回当前风格的关键视觉参数（统一供节点/卡片/连线查询） */
function styleCfg(){
  const s=state.stylePreset||DEFAULT_STYLE;
  const dark=state.dark;
  if(s==="glass")return{
    id:"glass",
    nodeAlpha:1,
    nodeBlur:0,
    borderAlpha:dark?.5:.4, /* 玻璃厚边 */
    borderColor:dark?"rgba(255,255,255,.6)":"rgba(255,255,255,.95)",
    shadowBlur:dark?30:26, shadowAlpha:dark?.5:.2,
    innerGlow:dark?.22:.6,  /* 强顶部高光，玻璃反光 */
    radius:16,              /* 大圆角 */
    linkStyle:"glass",
    linkAlpha:.66,
    linkWidth:1.05,
    fontScale:1,
    outlined:true,
    glass:true,             /* 玻璃专属：底部反光条 */
  };
  if(s==="paper")return{
    id:"paper",
    nodeAlpha:1,
    nodeBlur:0,
    borderAlpha:dark?.46:.62, /* 纸板切边：远景也保持完整轮廓 */
    borderColor:dark?"rgba(255,242,211,.62)":"rgba(101,70,30,.62)",
    shadowBlur:dark?19:17, shadowAlpha:dark?.58:.48, /* 纸堆落影 */
    innerGlow:dark?.16:.28, /* 纸面受光 */
    radius:3,
    linkStyle:"pen",
    linkAlpha:.9,
    linkWidth:1.5,          /* 笔触更粗更手写 */
    fontScale:1.05,         /* 手写阅读加大 */
    fontPreset:"handwritten", /* 手写字体（LWGW/Kalam/楷体） */
    outlined:true,
    paper:true,
  };
  if(s==="minimal")return{
    id:"minimal",
    nodeAlpha:.96,           /* 近实底，无装饰干扰 */
    nodeBlur:0,
    /* 简约不等于无边界：低层节点仍需在缩小时保持可辨识的轮廓。 */
    borderAlpha:dark?.18:.22,
    borderColor:dark?"rgba(255,255,255,.28)":"rgba(45,74,128,.26)",
    shadowBlur:5, shadowAlpha:dark?.12:.10,
    innerGlow:0,
    radius:4,                /* 微圆角，不喧宾夺主 */
    linkStyle:"clean",
    linkAlpha:.38,           /* 连线最淡，弱化装饰 */
    linkWidth:.75,           /* 更细线条 */
    fontScale:1.14,          /* 强字号分层：靠字体大小/粗细/颜色区分层级 */
    outlined:true,
    minimal:true,            /* 极简：细边框 + 字体层级 */
  };
  return{ /* clear 默认 */
    id:"clear",
    nodeAlpha:1,
    nodeBlur:0,
    borderAlpha:dark?.22:.28,
    borderColor:dark?"rgba(255,255,255,.3)":"rgba(45,74,128,.3)",
    shadowBlur:dark?12:10, shadowAlpha:dark?.22:.16,
    innerGlow:dark?.06:.12,
    radius:8,               /* 小圆角=利落 */
    linkStyle:"clean",
    linkAlpha:.55,
    linkWidth:1,
    fontScale:1,
    outlined:true,
  };
}
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
  /* 纯浏览器 PPTX → HTML 渲染器；仅解析本地文件，不上传文件内容。 */
  pptx:{url:"https://cdn.jsdelivr.net/npm/pptx-preview@1.0.7/dist/pptx-preview.umd.js"},
  pdfjsWorker:{url:"https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"},
};

