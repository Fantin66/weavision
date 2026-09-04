"use strict";
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
        id:p.id,name:p.name,tutorialVersion:p.tutorialVersion||null,isBuiltin:p.isBuiltin||false,
        files:p.files.map(f=>({id:f.id,name:f.name,kind:f.kind,size:f.size,mime:f.mime,url:f.url||null,created:f.created,folderId:f.folderId||null})),
        folders:p.folders.map(f=>({id:f.id,name:f.name,parentId:f.parentId||null})),
        canvases:p.canvases.map(c=>({id:c.id,name:c.name,items:c.items,camera:c.camera,previews:c.previews||[],links:c.links||[]})),
      })),
      activeProjectId:state.activeProjectId,
      activeCanvasId:state.activeCanvasId,
      ui:{sideCollapsed:state.sideCollapsed,dark:state.dark,bgPattern:state.bgPattern,bgColorName:state.bgColorName,mindMode:state.mindMode,mindColorMode:state.mindColorMode,layoutType:state.layoutType,fontPreset:state.fontPreset,stylePreset:state.stylePreset,reducedMotion:state.reducedMotion,autoTheme:state.autoTheme,saveInterval:state.saveInterval,storagePath:state.storagePath},
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
      if(d.ui.reducedMotion!==undefined)state.reducedMotion=d.ui.reducedMotion;
      if(d.ui.autoTheme!==undefined)state.autoTheme=d.ui.autoTheme;
      if(d.ui.saveInterval!==undefined)state.saveInterval=d.ui.saveInterval;
      if(d.ui.storagePath)state.storagePath=d.ui.storagePath;
      if(d.ui.bgColorName&&["default","eye","cream","blue","kraft"].includes(d.ui.bgColorName))state.bgColorName=d.ui.bgColorName;
      if(d.ui.mindMode)state.mindMode=d.ui.mindMode;
      if(d.ui.mindColorMode==="single"||d.ui.mindColorMode==="auto")state.mindColorMode=d.ui.mindColorMode;
      if(d.ui.layoutType){
        const legacyLayout={right:"logic",left:"logic",u:"logic",brace:"logic"};
        state.layoutType=legacyLayout[d.ui.layoutType]||d.ui.layoutType;
      }
      if(d.ui.stylePreset){let sp=d.ui.stylePreset;if(STYLE_ALIAS[sp])sp=STYLE_ALIAS[sp];if(STYLE_PRESETS[sp])state.stylePreset=sp;}
      if(d.ui.fontPreset&&FONT_PRESETS[d.ui.fontPreset])state.fontPreset=d.ui.fontPreset;
    }
    /* 强制刷新一次 bgColor（确保和 bgColorName 一致） */
    state.bgColor=getBgColor(state.bgColorName,state.dark);
    applyTheme();
    applyFontPreset();
    cleanupProjectReferences();
    syncUid();
    return true;
  }catch(e){ return false; }
}
/* 预览内容缓存：避免每次渲染重复读取 */
const previewCache=new Map();   /* fileId -> {kind,img,text,loading,err} */
function getPreviewContent(fileId){
  if(previewCache.has(fileId))return previewCache.get(fileId);
  const f=state.files.find(x=>x.id===fileId);
  if(!f)return null;
  const rec={kind:f.kind,img:null,text:"",url:null,loading:true,err:false};
  previewCache.set(fileId,rec);
  getBlob(fileId).then(async b=>{
    if(!b){rec.loading=false;rec.err=true;requestRender();return;}
    try{
      if(f.kind==="img"){
        /* 图片：加载原图（比缩略图清晰，真正实时预览） */
        rec.img=await createImageBitmap(b);
      }else if(f.kind==="media"&&/video/i.test(f.mime||"")){
        /* 视频：提取首帧作为静态预览（画布内无法内嵌播放器，用首帧+时长标注） */
        rec.kind="video";
        rec.url=(f._url)||URL.createObjectURL(b);
        if(!f._url)f._url=rec.url;
        const v=document.createElement("video");
        v.preload="metadata";v.muted=true;v.src=rec.url;
        await new Promise(res=>{
          v.onloadeddata=()=>res();
          setTimeout(res,3000);
        });
        if(v.videoWidth){
          const cv=document.createElement("canvas");
          cv.width=v.videoWidth;cv.height=v.videoHeight;
          cv.getContext("2d").drawImage(v,0,0,cv.width,cv.height);
          rec.img=await createImageBitmap(cv);
          rec.dur=v.duration||0;
        }
      }else if(f.kind==="text"||f.kind==="code"||/\.(md|txt|csv|json|log)$/i.test(f.name)){
        rec.text=(await b.text()).slice(0,4000);
      }else{
        rec.text="";   /* PDF/二进制：显示文件信息卡 */
      }
    }catch(e){rec.err=true;}
    rec.loading=false;
    requestRender();
  }).catch(()=>{rec.loading=false;rec.err=true;requestRender();});
  return rec;
}
/* 文件内容变更/删除时清缓存 */
function clearPreviewCache(fileId){
  if(fileId)previewCache.delete(fileId);
  else previewCache.clear();
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
   状态栏 → 画布 HUD
   —— 数据计算与绘制分离：
   updateStatusBar 仅缓存最新 HUD 数据（轻量，render 内每帧调用）；
   drawStatusHUD 在 render 尾部用 canvas 直接绘制（无白底框、亮度自适应）
============================================================ */
let HUD=null;
function updateStatusBar(){
  const sel=selectedItem();
  const cnt={mindNode:0,note:0,fileCard:0,stroke:0,connector:0};
  for(const it of state.items){if(cnt[it.type]!==undefined)cnt[it.type]++;}
  /* 彩点计数段：保留原色点语义 */
  const dots={mindNode:"#3a4a6b",note:"#c48840",fileCard:"#c48840",stroke:"#6e7080",connector:"#2a7a6a"};
  const segs=[];
  for(const [type,n] of Object.entries(cnt)){
    if(!n)continue;
    segs.push({dot:dots[type],txt:String(n),strong:true});
  }
  if(state.links.length)segs.push({txt:"线 "+state.links.length,strong:true});
  if(sel){
    const selLabel=sel.type==="mindNode"?(sel.text||"节点").slice(0,12):sel.type==="note"?(sel.text||"").slice(0,12):sel.type==="fileCard"?(state.files.find(f=>f.id===sel.fileId)?.name||"材料").slice(0,12):SEL_LABEL[sel.type]||"";
    segs.push({k:"选中",txt:(SEL_LABEL[sel.type]||"")+" · "+selLabel});
  }
  HUD={
    segs,
    zoom:Math.round(state.camera.zoom*100),
    mx:Math.round(state.mouseWorld.x),my:Math.round(state.mouseWorld.y),
  };
}
/* 在画布左下角直接绘制数据面板（无白框，背景亮度自适应 + 阴影增强可读）：
   - 背景取 render 已同步的 state.bgColor，按亮度(>0.58)选深/浅文字
   - 缩放段可点击重置 100%（命中区记录在 HUD.resetZoomRect）
   - 左下角固定锚点，天然避开底部刻度线（刻度线更靠内/下方） */
function drawStatusHUD(){
  if(!HUD)return;
  ctx.save();
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const bg=state.bgColor||(state.dark?"#1a1a2e":"#ffffff");
  const m=/^#?([0-9a-f]{6})$/i.exec(bg);
  let lum=1;
  if(m){
    const r=parseInt(m[1].slice(0,2),16),g=parseInt(m[1].slice(2,4),16),b=parseInt(m[1].slice(4,6),16);
    lum=(0.299*r+0.587*g+0.114*b)/255;
  }
  const light=lum>0.58;
  const fg=light?"rgba(26,30,44,.88)":"rgba(236,240,248,.94)";
  const faint=light?"rgba(26,30,44,.56)":"rgba(236,240,248,.6)";
  ctx.font="500 11px "+FONT;
  ctx.textBaseline="alphabetic";
  ctx.textAlign="left";
  const x=14,y=H-14,sep=16;
  let cx=x,rects=[];
  ctx.shadowColor=light?"rgba(0,0,0,.32)":"rgba(0,0,0,.55)";
  ctx.shadowBlur=4;ctx.shadowOffsetY=1;
  for(const s of HUD.segs){
    const str=(s.k?s.k+" ":"")+s.txt;
    const tw=ctx.measureText(str).width;
    if(s.dot){
      ctx.fillStyle=s.dot;
      ctx.beginPath();ctx.arc(cx-6,y-5,3.2,0,7);ctx.fill();
    }
    ctx.fillStyle=s.strong?fg:faint;
    ctx.fillText(str,cx+(s.dot?5:0),y);
    rects.push({x:cx-2,y:y-15,w:tw+(s.dot?12:4),h:20});
    cx+=tw+(s.dot?12:4)+sep-4;
  }
  cx+=6;
  const zx=cx;
  const zstr="缩放 "+HUD.zoom+"%";
  ctx.fillStyle=fg;
  ctx.fillText(zstr,zx,y);
  rects.push({x:zx-2,y:y-15,w:ctx.measureText(zstr).width+6,h:20});
  cx+=ctx.measureText(zstr).width+sep;
  const cstr="坐标 "+HUD.mx+", "+HUD.my;
  ctx.fillStyle=faint;
  ctx.fillText(cstr,cx,y);
  ctx.shadowColor="transparent";ctx.shadowBlur=0;
  HUD.rects=rects;
  HUD.resetZoomRect=rects[rects.length-2];
  ctx.restore();
}
/* 画布左下的 HUD 命中检测：返回 "zoom"（重置缩放）/ "hud"（整个面板） */
function statusHUDHit(sx,sy){
  if(!HUD||!HUD.rects)return null;
  if(HUD.resetZoomRect&&sx>=HUD.resetZoomRect.x&&sx<=HUD.resetZoomRect.x+HUD.resetZoomRect.w&&sy>=HUD.resetZoomRect.y&&sy<=HUD.resetZoomRect.y+HUD.resetZoomRect.h)return "zoom";
  for(const r of HUD.rects){
    if(sx>=r.x&&sx<=r.x+r.w&&sy>=r.y&&sy<=r.y+r.h)return "hud";
  }
  return null;
}
/* 暗色/亮色主题切换：只切换 data-theme 属性，变量覆盖由 CSS 负责 */
function applyTheme(){
  /* G2/G3: autoTheme 跟随系统——桌面用 electronAPI，网页用 matchMedia */
  if(state.autoTheme){
    if(window.electronAPI&&window.electronAPI.getSystemTheme){
      /* Electron 桌面：异步读取系统主题，回调中补 render+saveState 确保画布同步 */
      window.electronAPI.getSystemTheme().then(function(t){
        var prev=state.dark;
        state.dark=(t==="dark");
        _applyThemeInner();
        if(prev!==state.dark){render();saveState();}
      });
      return;
    }
    var sys=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)");
    if(sys){state.dark=sys.matches;}
  }
  _applyThemeInner();
}
function _applyThemeInner(){
  document.documentElement.setAttribute("data-theme",state.dark?"dark":"light");
  document.documentElement.dataset.style=state.stylePreset||DEFAULT_STYLE;
  document.documentElement.dataset.variant=variantOf(state.stylePreset||DEFAULT_STYLE);
  document.documentElement.dataset.bgfamily=driftFamilyOf(state.bgColorName||"default");
  if(typeof updateBgLayers==="function")updateBgLayers();
  if(typeof applyLogo==="function"){var sl=parseInt(localStorage.getItem("zhijian-logo"))||3;applyLogo(sl);}
}
/* G2/G3: 系统主题变化监听——网页用 matchMedia，桌面用 nativeTheme IPC（main.js 已处理） */
if(window.matchMedia&&!window.electronAPI){
  var _mq=window.matchMedia("(prefers-color-scheme: dark)");
  var _mqCb=function(){if(state.autoTheme){state.dark=_mq.matches;applyTheme();render();saveState();}};
  if(_mq.addEventListener){_mq.addEventListener("change",_mqCb);}
  else if(_mq.addListener){_mq.addListener(_mqCb);}
}
function applyFontPreset(){
  /* 字体分离原则：只改画布字体 FONT，不动 UI 字体变量(--font/--brand-font)。
     UI 界面字体恒为系统默认（Satoshi/雅黑），由 CSS :root 定义；画布内节点/便签/连线
     字体随 fontPreset 切换。 */
  /* 旧版本的 elegant 指向 Montserrat；该字体已从产品选项中移除，
     读取旧存档时无缝迁移到中文艺术手写。 */
  if(state.fontPreset==="elegant")state.fontPreset="artistic";
  for(const project of state.projects||[]){
    for(const canvas of project.canvases||[]){
      for(const item of canvas.items||[]){
        if(item.fontFamily==="elegant")item.fontFamily="artistic";
      }
    }
  }
  const preset=FONT_PRESETS[state.fontPreset]||FONT_PRESETS.serif;
  FONT=preset.stack;
}
/* 整体样式切换：仅切换画布视觉风格；画布字体内在联动（可被后续独立切换覆盖）
   —— paper 拟物自动切手写字体（节点/便签/连线质感一致）
   —— minimal 简约自动切宋体（干净正文字体层级）
   —— UI 字体不受任何样式切换影响 */

/* E5: Logo system — 3 icon sets. G1: paths use g1/ prefix (HTML is in parent dir) */
const LOGO_PRESETS={
  1:{label:"穿线元素",light:"g6/assets/logos/logo1-light.png",dark:"g6/assets/logos/logo1-dark.png",
     cnLight:"g6/assets/logos/logo01-中文字标-light.png",cnDark:"g6/assets/logos/logo01-中文字标-dark.png",
     enLight:"g6/assets/logos/logo01-英文字标-light.png",enDark:"g6/assets/logos/logo01-英文字标-dark.png",
     comboLight:"g6/assets/logos/logo01-横版组合-light.png",comboDark:"g6/assets/logos/logo01-横版组合-dark.png"},
  2:{label:"聚焦轨道",light:"g6/assets/logos/logo2-light.png",dark:"g6/assets/logos/logo2-dark.png",
     cnLight:"g6/assets/logos/logo02-中文字标-light.png",cnDark:"g6/assets/logos/logo02-中文字标-dark.png",
     enLight:"g6/assets/logos/logo02-英文字标-light.png",enDark:"g6/assets/logos/logo02-英文字标-dark.png",
     comboLight:"g6/assets/logos/logo02-横版组合-light.png",comboDark:"g6/assets/logos/logo02-横版组合-dark.png"},
  3:{label:"叠合元素",light:"g6/assets/logos/logo3-light.png",dark:"g6/assets/logos/logo3-dark.png",
     cnLight:"g6/assets/logos/logo03-中文字标-light.png",cnDark:"g6/assets/logos/logo03-中文字标-dark.png",
     enLight:"g6/assets/logos/logo03-英文字标-light.png",enDark:"g6/assets/logos/logo03-英文字标-dark.png",
     comboLight:"g6/assets/logos/logo03-横版组合-light.png",comboDark:"g6/assets/logos/logo03-横版组合-dark.png"},
};
let logoPreset=3;
function applyLogo(n){
  logoPreset=n;
  var preset=LOGO_PRESETS[n]||LOGO_PRESETS[1];
  var isDark=document.documentElement.getAttribute("data-theme")==="dark";
  var comboSrc=isDark?preset.comboDark:preset.comboLight;
  document.querySelectorAll(".brand-combo").forEach(function(img){img.src=comboSrc;});
  var bfSrc=isDark?preset.comboDark:preset.comboLight;
  document.querySelectorAll(".bf-cn").forEach(function(img){img.src=bfSrc;});
  localStorage.setItem("zhijian-logo",String(n));
  toast("图标："+preset.label);
}
(function bindSettingsButton(){
  var btn=document.querySelector(".bf-settings");
  if(!btn)return;
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  btn.addEventListener("click",showSettings);
})();
/* removed unreliable keydown pointer-events toggle — Ctrl+click now handled in el capture phase */

function applyStyle(key){
  if(STYLE_ALIAS[key])key=STYLE_ALIAS[key];    /* 兼容旧值：fluent → glass */
  if(!STYLE_PRESETS[key])return;
  state.stylePreset=key;
  document.documentElement.dataset.style=key;
  document.documentElement.dataset.variant=variantOf(key);  /* F1: 变体驱动 chrome */
  if(key==="neumorph"||key==="minimal"||key==="editorial"){state.fontPreset="serif";applyFontPreset();}
  /* 字体联动规则：仅"自带字体配置"的样式切换时同步恢复其专属字体；
     其余样式（默认/玻璃）不碰字体，保持用户当前独立选择。 */
  render();saveState();
  toast("样式："+STYLE_PRESETS[key].label);
}
/* Canvas 暗黑模式颜色适配 */
function dc(light,dark){return state.dark?dark:light;}
/* F1 材质系统：更新 L1–L4 背景层 data 属性，CSS 驱动实际渲染。
   - data-bgpattern: grid/dots/lines/kraft/blank → L4 图案层显隐 + 类型
   - data-bgfamily: neutral/warm/cool/green → L1 漂移色族
   - data-variant: fluent/neumorph/minimal → 各层开关（由 applyStyle/applyTheme 设置）
   - #board 背景 = 用户底色（L2 Mica 半透明，底色透出）
   调用时机：applyTheme / applyStyle / bgBtn / bgColorBtn */
function updateBgLayers(){
  const de=document.documentElement;
  de.dataset.bgpattern=state.bgPattern||"grid";
  de.dataset.bgfamily=driftFamilyOf(state.bgColorName||"default");
  /* F2: 先重算 bgColor（主题切换时 render() 尚未跑到，需确保同步） */
  state.bgColor=getBgColor(state.bgColorName,state.dark);
  const board=document.getElementById("board");
  if(board){board.style.background=state.bgColor;}
  /* F3: 拟态/简约变体 L2 = 用户底色（固定实色会盖住底色，导致切换无效） */
  const l2=document.getElementById("bg-l2-mica");
  if(l2){
    const v=variantOf(state.stylePreset||DEFAULT_STYLE);
    if(v==="neumorph"||v==="minimal"){
      l2.style.background=state.bgColor;
    }else{
      l2.style.background=""; /* 让 CSS 渐变规则接管 */
    }
  }
}
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
      /* 规范：Enter = 建立同级（与选中态一致）。Ctrl/Cmd+Enter = 仅确认不新建 */
      if(editingMindId!==null){
        const n=state.items.find(i=>i.id===editingMindId);
        closeMindEditor(false);
        if(n&&(e.ctrlKey||e.metaKey)){render();saveState();}
        else if(n)addSiblingMind(n);
      }
      else if(editingNoteId!==null){
        /* 便签：Enter 换行（默认行为），Ctrl/Cmd+Enter 才完成编辑 */
        if(e.ctrlKey||e.metaKey){e.preventDefault();closeEditor(false);}
        /* 否则不拦截，让 textarea 正常换行 */
      }
    }
    /* 规范：Tab = 建立子级（与选中态一致） */
    if(e.key==="Tab"&&!e.altKey){
      if(editingMindId!==null){
        e.preventDefault();
        const n=state.items.find(i=>i.id===editingMindId);
        closeMindEditor(false);
        if(n)addChildMind(n);
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
    /* 全屏预览优先退出 */
    const fv=document.getElementById("fullscreenView");
    if(fv&&!fv.hidden){closeFullscreen();return;}
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
  if(e.key==="n"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(state.tempTool==="note"){state.tempTool="";renderToolOptions();toast("已退出便签模式");}else{setTool("select");state.tempTool="note";renderToolOptions();toast("便签模式：点击空白添加");}return;}
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
  /* 全屏预览/编辑：Alt+F */
  if(e.altKey&&e.key.toLowerCase()==="f"){
    e.preventDefault();
    const s=selectedItem();
    if(s&&s.type==="fileCard"){
      const f=state.files.find(x=>x.id===s.fileId);
      if(f){openFullscreen(f);toast("全屏预览："+f.name);}
    }else if(s&&s.type==="note"){
      openFullscreenNote(s);
    }else if(s&&s.type==="mindNode"){
      openDetailFullscreen(s);
      toast("全屏编辑："+(s.text||"节点"));
    }
    return;
  }
  /* 沉浸模式：F11 切换（隐藏/恢复辅助元素） */
  if(e.key==="F11"){
    e.preventDefault();
    toggleImmersive();
    return;
  }
  /* A 键：添加批注 */
  if(e.key==="a"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();openAnnotation();return;}
  /* E 键：编辑展开内容 */
  if(e.key==="e"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    e.preventDefault();
    const s=selectedItem();
    if(!s)return;
    if(s.type==="mindNode")toggleDetailInPlace(s);
    else if(s.type==="fileCard"){console.log("E5 E: calling togglePreviewMorph");togglePreviewMorph(s);}
    return;
  }
  /* E5: Alt+E = delete detail content (mindNode only) */
  if(e.altKey&&!e.ctrlKey&&!e.metaKey&&(e.key==="e"||e.key==="Æ")){
    e.preventDefault();
    const s=selectedItem();
    if(!s||s.type!=="mindNode"||!s.detail)return;
    pushHistory("delete detail");
    s.detail="";collapseDetailInPlace();
    render();saveState();toast("deleted detail content");
    return;
  }
  /* F 键：聚焦模式 */
      /* C8: Shift+1/2/3/4 = add standalone node at that depth level */
  if(e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!isTyping()){
    var lvl=parseInt(e.code.replace("Digit",""));
    if(lvl>=1&&lvl<=4){
      e.preventDefault();
      pushHistory("添加"+lvl+"级节点");
      var wpt=state.mouseWorld||{x:W/2/state.camera.zoom+state.camera.x,y:H/2/state.camera.zoom+state.camera.y};
      var n=addMindNode(defaultNodeName(null),null,state.mindColor,wpt.x,wpt.y);
      n._forcedDepth=lvl-1;
      state.selected=n.id;
      render();saveState();
      setTimeout(function(){openTextEditor(n);},50);
      return;
    }
  }
  if(e.key==="b"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(state.tool==="marquee"){state.tool="select";board.className="mode-select";renderToolOptions();toast("已退出框选");}else{state.tool="marquee";board.className="mode-marquee";renderToolOptions();toast("框选模式");}return;}
  if(e.key==="g"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();gazeAtSelection();return;}
  if(e.key==="y"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();fitAll();return;}
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
  /* 侧栏唯一突出部件：常驻展开显示 <（收起），收起态显示 >（展开）——由 applySide 统一维护 */

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
  document.getElementById("fitBtn").title="纵览全部内容";
  document.getElementById("helpBtn").addEventListener("click",e=>{
    helpPop.style.display=helpPop.style.display==="block"?"none":"block";
    if(helpPop.style.display==="block"){
      const r=e.currentTarget.getBoundingClientRect();
      helpPop.style.right="44px";
      helpPop.style.top="40px";
    }
  });
  document.getElementById("bgBtn").addEventListener("click",()=>{
    const pats=["grid","dots","lines","blank"];
    const labels={grid:"方格",dots:"点阵",lines:"横格",blank:"纯色无纹理"};
    const idx=pats.indexOf(state.bgPattern||"grid");
    /* F4: kraft 已移除，旧值迁移到 blank */
    if(idx===-1)state.bgPattern="grid";
    state.bgPattern=pats[(idx+1)%pats.length]||"grid";
    if(typeof updateBgLayers==="function")updateBgLayers();
    render();saveState();
    toast("纹理："+labels[state.bgPattern]);
  });
  document.getElementById("bgColorBtn").addEventListener("click",()=>{
    const cols=["default","eye","cream","blue","kraft"];
    const idx=cols.indexOf(state.bgColorName||"default");
    state.bgColorName=cols[(idx+1)%cols.length];
    state.bgColor=getBgColor(state.bgColorName,state.dark);
    document.documentElement.dataset.bgfamily=driftFamilyOf(state.bgColorName);
    if(typeof updateBgLayers==="function")updateBgLayers();
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
  document.getElementById("exportBtn").addEventListener("click",showExportOptions);
  document.getElementById("importBtn").addEventListener("click",showImportOptions);
  document.getElementById("libImportBtn").addEventListener("click",function(e){
    showFloatMenu(e.currentTarget,[
      {icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/></svg>',label:"本地文件",onClick:()=>fileInput.click()},
      {icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',label:"整个文件夹",onClick:()=>document.getElementById("folderInput").click()},
      {icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',label:"网页链接",onClick:()=>showLinkPrompt(function(url,name){if(url&&/^https?:\/\//i.test(url))addLinkFile(url,name);})}
    ]);
  });
  fileInput.addEventListener("change",async()=>{
    const files=Array.from(fileInput.files||[]);
    fileInput.value="";
    if(files.length)await importFiles(files);
  });
  document.getElementById("newProjectBtn").addEventListener("click",function(e){
    showFloatMenu(e.currentTarget,[
      {icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',label:"新建空白项目",onClick:()=>showPrompt("新建项目","项目名称","新项目",function(name){if(name)createProject(name);})},
      {icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',label:"导入项目包",onClick:function(){var inp=document.createElement("input");inp.type="file";inp.accept=".json";inp.onchange=function(){if(inp.files&&inp.files[0])importProject(inp.files[0]);};inp.click();}}
    ]);
  });
  document.getElementById("newCanvasBtn").addEventListener("click",function(e){
    showFloatMenu(e.currentTarget,[
      {icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',label:"新建空白画布",onClick:()=>showPrompt("新建画布","画布名称","新画布",function(name){if(name)createCanvas(name);})}
    ]);
  });

  function toggleSidePersistent(){
    /* 显式点把手是固定状态的意图，不让任何临时 peek 残留干扰这次切换。 */
    if(peekTimer){clearTimeout(peekTimer);peekTimer=0;}
    if(peekEnterTimer){clearTimeout(peekEnterTimer);peekEnterTimer=0;}
    sidePanel.classList.remove("peek");
    state.sideCollapsed=!state.sideCollapsed;state._respAuto=false;
    applySide();saveState();
  }
  /* Logo 是第二个显式入口：不依赖贴边悬停，键盘也可以完成同一操作。 */
  if(brandEl){
    brandEl.setAttribute("role","button");
    brandEl.tabIndex=0;
    const toggleFromBrand=()=>{
      brandEl.classList.remove("side-switch");
      void brandEl.offsetWidth; /* 重启动画，连续点击也有状态反馈 */
      brandEl.classList.add("side-switch");
      toggleSidePersistent();
    };
    brandEl.addEventListener("click",toggleFromBrand);
    brandEl.addEventListener("keydown",e=>{
      if(e.key==="Enter"||e.key===" "){e.preventDefault();toggleFromBrand();}
    });
  }

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
  /* 下拉菜单栏（WPS风格） */
  const menuDrop=document.getElementById("menuDrop");
  const MENUS={
    layout:[
      {sep:true},
      {icon:"",label:"重新排版",key:"",fn:()=>relayoutCanvas()},
      {sep:true},
      {icon:"",label:"逻辑图",key:"",fn:()=>applyLayout("logic")},
      {icon:"",label:"组织架构图",key:"",fn:()=>applyLayout("org")},
      {icon:"",label:"鱼骨图（因果分析）",key:"",fn:()=>applyLayout("fishbone")},
      {icon:"",label:"时间轴（横向）",key:"",fn:()=>applyLayout("timeline")},
    ],
    style:[
      {icon:"",label:"样式：默认",key:"",fn:()=>applyStyle("clear")},
      {icon:"",label:"样式：玻璃",key:"",fn:()=>applyStyle("glass")},
      {icon:"",label:"样式：新拟态",key:"",fn:()=>applyStyle("neumorph")},
      {icon:"",label:"样式：简约",key:"",fn:()=>applyStyle("minimal")},
      {icon:"",label:"样式：多彩拟态",key:"",fn:()=>applyStyle("colorful")},
      {icon:"",label:"样式：多彩圆角",key:"",fn:()=>applyStyle("bento")},
      {icon:"",label:"样式：多彩矩形",key:"",fn:()=>applyStyle("editorial")},
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
    font:[
      {icon:"",label:"字体 · 界面雅黑",key:"",fn:()=>{state.fontPreset="clear";applyFontPreset();render();saveState();toast("字体：界面雅黑");}},
      {icon:"",label:"字体 · 书卷宋体",key:"",fn:()=>{state.fontPreset="serif";applyFontPreset();render();saveState();toast("字体：书卷宋体");}},
      {icon:"",label:"字体 · 手写楷体",key:"",fn:()=>{state.fontPreset="handwritten";applyFontPreset();render();saveState();toast("字体：手写楷体");}},
      {icon:"",label:"字体 · 艺术手写",key:"",fn:()=>{state.fontPreset="artistic";applyFontPreset();render();saveState();toast("字体：艺术手写（Xmind 素材）");}},
      {sep:true},
      {icon:"",label:"字体 · Manrope",key:"",fn:()=>{state.fontPreset="manrope";applyFontPreset();render();saveState();toast("字体：Manrope");}},
      {icon:"",label:"字体 · Bricolage",key:"",fn:()=>{state.fontPreset="bricolage";applyFontPreset();render();saveState();toast("字体：Bricolage Grotesque");}},
      {icon:"",label:"字体 · Sora",key:"",fn:()=>{state.fontPreset="sora";applyFontPreset();render();saveState();toast("字体：Sora");}},
      {icon:"",label:"字体 · Outfit",key:"",fn:()=>{state.fontPreset="outfit";applyFontPreset();render();saveState();toast("字体：Outfit");}},
      {icon:"",label:"字体 · Archivo",key:"",fn:()=>{state.fontPreset="archivo";applyFontPreset();render();saveState();toast("字体：Archivo");}},
      {icon:"",label:"字体 · Space Mono",key:"",fn:()=>{state.fontPreset="spaceMono";applyFontPreset();render();saveState();toast("字体：Space Mono");}},
      {icon:"",label:"字体 · IBM Plex",key:"",fn:()=>{state.fontPreset="ibm";applyFontPreset();render();saveState();toast("字体：IBM Plex Sans");}},
      {icon:"",label:"字体 · Syne",key:"",fn:()=>{state.fontPreset="syne";applyFontPreset();render();saveState();toast("字体：Syne");}},
      {icon:"",label:"字体 · Epilogue",key:"",fn:()=>{state.fontPreset="epilogue";applyFontPreset();render();saveState();toast("字体：Epilogue");}},
    ],
    view:[
      {icon:ICON.focus,label:"聚焦模式",key:"F",fn:()=>toggleFocus()},
      {icon:"",label:"凝视（100%居中）",key:"G",fn:()=>gazeAtSelection()},
      {icon:"",label:"纵览（全部内容）",key:"Y",fn:()=>fitAll()},
      {icon:"",label:"沉浸模式",key:"F11",fn:()=>toggleImmersive()},
      {sep:true},
      {icon:"",label:"重置织见学堂",key:"",fn:()=>resetTutorial()},
      {icon:"",label:"设置",key:"",fn:()=>showSettings()},
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

/* E5: Float menu — positioned next to anchor element, not at cursor */
const floatMenu=document.getElementById("floatMenu");
function showFloatMenu(anchorEl,items){
  if(!anchorEl||!items||!items.length)return;
  floatMenu.innerHTML="";
  for(const it of items){
    if(it.sep){const s=document.createElement("div");s.className="fm-sep";floatMenu.appendChild(s);continue;}
    const el=document.createElement("div");
    el.className="fm-item"+(it.danger?" danger":"");
    el.innerHTML='<span class="fm-icon">'+(it.icon||"")+'</span><span>'+it.label+'</span>';
    el.addEventListener("click",()=>{hideFloatMenu();if(it.onClick)it.onClick();});
    floatMenu.appendChild(el);
  }
  var r=anchorEl.getBoundingClientRect();
  var mw=floatMenu.offsetWidth||180,mh=floatMenu.offsetHeight||100;
  var left=r.right+4;
  if(left+mw>window.innerWidth)left=Math.max(4,r.left-mw-4);
  var top=r.top;
  if(top+mh>window.innerHeight)top=Math.max(4,window.innerHeight-mh-4);
  floatMenu.style.left=left+"px";
  floatMenu.style.top=top+"px";
  floatMenu.classList.add("show");
  /* F7: 修复 pointerdown 过早关闭菜单 — 原代码在 document 上加 {once:true} 的 pointerdown 监听，
     点击菜单项时 pointerdown 先于 click 触发，菜单被清空后 click 找不到目标 → 按钮无反应。
     修复：只在外部点击时关闭，内部点击放行让 click 正常执行。 */
  setTimeout(()=>{
    function fmOutsideHandler(e){
      if(!floatMenu.contains(e.target)){
        hideFloatMenu();
        document.removeEventListener("pointerdown",fmOutsideHandler);
      }
    }
    document.addEventListener("pointerdown",fmOutsideHandler);
  },0);
}
function hideFloatMenu(){floatMenu.classList.remove("show");floatMenu.innerHTML="";}
/* F8/F9: 原地内联重命名 — 替代 showPrompt 居中弹窗，名字在哪就在哪改 */
function startInlineRename(el,nameSelector,currentName,onConfirm){
  const nameEl=el.querySelector(nameSelector);
  if(!nameEl)return;
  const input=document.createElement("input");
  input.type="text";
  input.value=currentName;
  input.className="inline-rename-input";
  /* F9: 阻止 click/pointerdown 冒泡到父元素，否则触发 switchProject/switchCanvas/openPreview
     导致 re-render 把 input 清掉 + 可能产生异常 DOM 状态（项目重复） */
  input.addEventListener("click",e=>e.stopPropagation());
  input.addEventListener("pointerdown",e=>e.stopPropagation());
  nameEl.replaceWith(input);
  input.focus();input.select();
  let done=false;
  function finish(save){
    if(done)return;done=true;
    if(save&&input.value.trim()){
      onConfirm(input.value.trim()); /* 回调会 re-render，input 自动被替换 */
    }else{
      /* 取消：把原始元素原样放回（保留 icon 等子元素） */
      if(input.parentNode)input.replaceWith(nameEl);
    }
  }
  input.addEventListener("keydown",e=>{
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();finish(true);}
    else if(e.key==="Escape"){e.preventDefault();finish(false);}
  });
  input.addEventListener("blur",()=>finish(true));
}
/* F8: 轻量移动文件 — 替代 showMoveFile 的居中弹窗，用 showFloatMenu 列文件夹 */
function showMoveFileMenu(fileId,anchorEl){
  const items=[{icon:ICON.folder,label:"未分类（根级）",onClick:()=>moveLibraryFile(fileId,null)}];
  for(const folder of state.folders){
    items.push({icon:ICON.folder,label:folderPathName(folder),onClick:()=>moveLibraryFile(fileId,folder.id)});
  }
  showFloatMenu(anchorEl,items);
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
  const list=opts.map(o=>`<div class="opt-item" data-id="${escapeHtml(o.id)}"><div class="opt-ic">${o.icon||""}</div><div class="opt-tx"><div class="opt-name">${escapeHtml(o.label)}</div><div class="opt-desc">${escapeHtml(o.desc||"")}</div></div></div>`).join("");
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
  showModal(title,`<input class="modal-input" type="text" placeholder="${escapeHtml(placeholder||"")}" value="${escapeHtml(defaultValue||"")}">`,[
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
function showExportOptions(){
  var opts=[
    {id:"png",label:"导出图片 PNG",desc:"导出画布为图片",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L9 20"/></svg>',onClick:()=>exportPNG()},
  ];
  var isDesktop=window.electronAPI&&window.electronAPI.isDesktop;
  if(isDesktop){
    opts.push({id:"canvasFantin",label:"导出当前画布",desc:".fantin 文件（含附件）",onClick:()=>doExport("canvas","fantin")});
    opts.push({id:"canvasFolder",label:"导出当前画布",desc:"文件夹（含附件，可直接看原始资料）",onClick:()=>doExport("canvas","folder")});
    opts.push({id:"projFantin",label:"导出整个项目",desc:".fantin 文件（含全部画布 + 附件）",onClick:()=>doExport("project","fantin")});
    opts.push({id:"projFolder",label:"导出整个项目",desc:"文件夹（含全部画布 + 附件）",onClick:()=>doExport("project","folder")});
  }
  showOptions("导出",opts);
}
function showImportOptions(){
  var opts=[
    {id:"opml",label:"从 OPML 导入",desc:"OPML 格式（多数思维导图通用）",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M8 13h8M8 17h5"/></svg>',onClick:()=>{var inp=document.createElement("input");inp.type="file";inp.accept=".opml,.xml";inp.onchange=function(){if(inp.files&&inp.files[0])importOPML(inp.files[0]);};inp.click();}},
    {id:"md",label:"从 Markdown 导入",desc:"Markdown 大纲转节点",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M7 13l2 2 2-2M13 17h4"/></svg>',onClick:()=>{var inp=document.createElement("input");inp.type="file";inp.accept=".md,.markdown,.txt";inp.onchange=function(){if(inp.files&&inp.files[0])importMarkdown(inp.files[0]);};inp.click();}},
  ];
  var isDesktop=window.electronAPI&&window.electronAPI.isDesktop;
  if(isDesktop){
    opts.push({id:"fantin",label:"从 .fantin 导入",desc:"织见专属格式（含附件，自动检测项目/画布）",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',onClick:()=>doImport("fantin")});
    opts.push({id:"folder",label:"从文件夹导入",desc:"织见文件夹格式（含附件，自动检测项目/画布）",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 1 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/></svg>',onClick:()=>doImport("folder")});
  }
  showOptions("导入",opts);
}
/* G4: 统一导出 — scope=canvas/project, format=fantin/folder */
function doExport(scope,format){
  var cp=curProject();
  if(!cp){toast("无当前项目");return;}
  var canvasesToExport=scope==="project"?cp.canvases:[curCanvas()];
  if(!canvasesToExport||!canvasesToExport.length){toast("无可导出的画布");return;}
  var fileMeta=[],fileCardIds=[],canvases=[];
  for(var c of canvasesToExport){
    var cCopy=JSON.parse(JSON.stringify(c));
    canvases.push(cCopy);
    for(var it of c.items){
      if(it.type==="fileCard"&&it.fileId){
        var f=state.files.find(function(x){return x.id===it.fileId;});
        if(f&&!fileCardIds.includes(it.fileId)){
          fileCardIds.push(it.fileId);
          fileMeta.push({oldId:it.fileId,name:f.name,mime:f.mime||"application/octet-stream"});
        }
      }
    }
  }
  var structure={version:"G4",type:scope,exportedAt:Date.now(),projectName:cp.name,fileMeta:fileMeta,canvases:canvases};
  var attPromises=fileCardIds.map(function(fid,idx){
    var fileName=fileMeta[idx].name;
    return getBlob(fid).then(function(b){if(!b)return null;return b.arrayBuffer().then(function(buf){return{id:fid,name:fileName,buffer:buf};});}).catch(function(){return null;});
  });
  Promise.all(attPromises).then(function(results){
    var attachments=results.filter(function(r){return r!==null;});
    var pkgName=(cp.name||"织见画布")+(scope==="project"?"":"-"+(curCanvas().name||"画布"));
    var data={projectName:pkgName,structure:structure,attachments:attachments};
    var apiFn=format==="fantin"?"exportFantin":"exportFolder";
    window.electronAPI[apiFn](data).then(function(res){
      if(res.ok)toast("已导出："+res.path+"（含 "+res.attachments+" 个附件）");
      else toast("导出失败："+(res.error||"未知错误"));
    });
  });
}
/* G4: 统一导入 — format=fantin/folder，自动检测项目/画布 */
function doImport(format){
  var apiFn=format==="fantin"?"importFantin":"importFolder";
  window.electronAPI[apiFn]().then(function(res){
    if(!res.ok){toast("导入失败："+(res.error||"未知错误"));return;}
    var structure=res.structure;
    var attachments=res.attachments||[];
    var srcCanvases=structure.canvases;
    if(!srcCanvases||!srcCanvases.length){toast("数据格式不正确：缺少画布数据");return;}
    var fileIdMap={},restoredFiles=0;
    var attachByName={};
    for(var att of attachments)attachByName[att.name]=att;
    var newProj={id:"p"+(uid++),name:(structure.projectName||"导入")+(structure.type==="project"?"":"（单画布）"),files:[],folders:[],canvases:[],isBuiltin:false};
    for(var fm of (structure.fileMeta||[])){
      var att=attachByName[fm.name];if(!att)continue;
      var newFid="f"+(uid++);
      var blob=new Blob([att.buffer],{type:fm.mime||"application/octet-stream"});
      newProj.files.push({id:newFid,name:fm.name,kind:kindOf(fm.name),mime:fm.mime||"application/octet-stream",size:blob.size,created:Date.now(),folderId:null,blob:blob});
      if(blob&&idb){try{var tx=idb.transaction("files","readwrite");tx.objectStore("files").put(blob,newFid);}catch(_){}}
      fileIdMap[fm.oldId]=newFid;restoredFiles++;
    }
    var canvasIdMap={};
    for(var srcCanvas of srcCanvases){
      var itemIdMap={};
      var newCanvas={id:"c"+(uid++),name:srcCanvas.name||"导入的画布",items:[],camera:srcCanvas.camera||{x:0,y:0,zoom:1},previews:[],links:[],layoutVersion:srcCanvas.layoutVersion||3};
      canvasIdMap[srcCanvas.id]=newCanvas.id;
      for(var it of (srcCanvas.items||[])){
        var newItem=JSON.parse(JSON.stringify(it));
        var oldId=newItem.id;newItem.id=uid++;itemIdMap[oldId]=newItem.id;
        if(newItem.parentId)newItem.parentId=itemIdMap[newItem.parentId]||null;
        if(newItem.children)newItem.children=newItem.children.map(function(c){return itemIdMap[c]||c;});
        if(newItem.attachIds)newItem.attachIds=newItem.attachIds.map(function(a){return itemIdMap[a]||a;});
        if(newItem.type==="fileCard"&&newItem.fileId)newItem.fileId=fileIdMap[newItem.fileId]||newItem.fileId;
        if(newItem.type==="connector"){if(newItem.a)newItem.a=itemIdMap[newItem.a]||newItem.a;if(newItem.b)newItem.b=itemIdMap[newItem.b]||newItem.b;}
        if(newItem.jumpTo&&newItem.jumpTo.canvasId)newItem.jumpTo.canvasId=canvasIdMap[newItem.jumpTo.canvasId]||newItem.jumpTo.canvasId;
        if(newItem.type==="note"&&!newItem.fontFamily)newItem.fontFamily=state.fontPreset||"clear";
        newCanvas.items.push(newItem);
      }
      for(var lnk of (srcCanvas.links||[])){
        var newLink=JSON.parse(JSON.stringify(lnk));newLink.id="lnk"+(uid++);
        newLink.aId=itemIdMap[lnk.aId]||lnk.aId;newLink.bId=itemIdMap[lnk.bId]||lnk.bId;
        newCanvas.links.push(newLink);
      }
      newProj.canvases.push(newCanvas);
    }
    state.projects.push(newProj);
    state.activeProjectId=newProj.id;
    state.activeCanvasId=newProj.canvases[0].id;
    state.selected=null;syncUid();
    renderSidePanel();render();fitAll();saveState();
    toast("已导入："+newProj.name+"（"+newProj.canvases.length+" 张画布，"+restoredFiles+" 个附件）");
  });
}
function offerImport(){
  showOptions("导入材料",[
    {id:"file",label:"本地文件",desc:"选择一个或多个文件",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/></svg>',onClick:()=>fileInput.click()},
    {id:"folder",label:"整个文件夹",desc:"导入文件夹，保留目录结构",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',onClick:()=>document.getElementById("folderInput").click()},
    {id:"link",label:"网页链接",desc:"粘贴一个 URL",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',onClick:()=>showLinkPrompt((url,name)=>{if(url&&/^https?:\/\//i.test(url))addLinkFile(url,name);})},
  ]);
}
async function resolveLinkTitle(url){
  /* 安全：仅对 http/https URL 发起请求，阻止内网/回环地址的请求伪造。 */
  if(!isSafePreviewUrl(url))return "";
  /* 仅在网页允许跨域读取时提取标题；被站点拦截时安静降级为域名。 */
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{Accept:"text/html"}});
    if(!res.ok)throw new Error("HTTP "+res.status);
    const type=res.headers.get("content-type")||"";
    if(type&&!/html|xhtml/i.test(type))return "";
    const html=(await res.text()).slice(0,180000);
    const doc=new DOMParser().parseFromString(html,"text/html");
    return (doc.querySelector("title")?.textContent||"").replace(/\s+/g," ").trim().slice(0,100);
  }catch(e){return "";}finally{clearTimeout(timer);}
}
async function addLinkFile(url,name){
  if(!name){
    toast("正在读取网页标题…");
    name=await resolveLinkTitle(url);
  }
  if(!name){try{name=new URL(url).hostname;}catch(e){name=url;}}
  const f={id:"f"+(uid++),name:name||url,kind:"link",url,size:0,mime:"",created:Date.now()};
  state.files.push(f);
  renderFileGroups();saveState();
  toast("已添加链接");
}
/* 文件夹上传 */
document.getElementById("folderInput").addEventListener("change",async()=>{
  const fi=document.getElementById("folderInput");
  const files=Array.from(fi.files||[]);
  fi.value="";
  if(files.length) await importFiles(files);
});
function isEditingTarget(target){
  return !!(target&&target.closest&&target.closest("input,textarea,select,[contenteditable='true'],.fv-md-editor,#detailPanel"));
}
/* 系统文件复制粘贴与网址粘贴：编辑文本时保持原生粘贴，不抢输入。 */
document.addEventListener("paste",e=>{
  if(isEditingTarget(e.target))return;
  const files=[...(e.clipboardData&&e.clipboardData.files||[])];
  if(files.length){e.preventDefault();importFiles(files);return;}
  const text=(e.clipboardData&&e.clipboardData.getData("text/plain")||"").trim();
  if(!/^https?:\/\/\S+$/i.test(text))return;
  e.preventDefault();
  let host=text;try{host=new URL(text).hostname;}catch(err){}
  showModal("添加网页到资源库",'<p style="font-size:12px;color:var(--ink-dim);line-height:1.7;margin:0">检测到网址：<strong style="color:var(--ink)">'+escapeHtml(host)+'</strong><br>添加后会自动尝试读取网页标题。</p>',[
    {label:"取消"},{label:"添加",primary:true,onClick:()=>addLinkFile(text,"")}
  ]);
});
/* 外部文件拖到应用任意区域都进入资源库；内部资源拖拽不受影响。 */
document.addEventListener("dragover",e=>{
  if(e.dataTransfer&&Array.from(e.dataTransfer.types||[]).includes("Files")){e.preventDefault();dropOverlay.style.display="flex";}
},true);
document.addEventListener("drop",e=>{
  if(!(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length))return;
  e.preventDefault();e.stopImmediatePropagation();dropOverlay.style.display="none";importFiles(e.dataTransfer.files);
},true);
/* 文件拖到资源库区域：直接导入；资源库内部拖拽仍由文件夹整理逻辑接管。 */
fileGroups.addEventListener("dragover",e=>{if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length){e.preventDefault();dropOverlay.style.display="flex";}});
fileGroups.addEventListener("drop",e=>{
  if(!(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length))return;
  e.preventDefault();e.stopPropagation();dropOverlay.style.display="none";importFiles(e.dataTransfer.files);
});
function applySide(){
  sidePanel.classList.toggle("collapsed",state.sideCollapsed);
  board.classList.toggle("side-collapsed",state.sideCollapsed);
  ["lib-head","file-groups","project-section","canvas-section"].forEach(id=>{
    const el=document.getElementById(id);if(el)el.classList.toggle("side-hidden",state.sideCollapsed);
  });
  if(brandEl){
    const action=state.sideCollapsed?"展开左侧栏":"收起左侧栏";
    brandEl.classList.toggle("side-is-collapsed",state.sideCollapsed);
    brandEl.title="织见 · "+action;
    brandEl.setAttribute("aria-label",brandEl.title);
    brandEl.setAttribute("aria-pressed",String(!state.sideCollapsed));
  }
  /* 已移除侧栏把手与贴边浮出热区；Logo 是唯一明确的常驻/收起入口。 */
  sidePanel.classList.remove("peek");
  if(peekTimer){clearTimeout(peekTimer);peekTimer=0;}
  if(peekEnterTimer){clearTimeout(peekEnterTimer);peekEnterTimer=0;}
  /* 全屏窗口即时适配：Dock 收起/展开状态变化后立刻重算全屏边界，
     避免边界错位/残留间距/延迟（此前仅打开或沉浸时布局，切换后不再重算） */
  layoutFullscreen();
  requestAnimationFrame(resize);
  setTimeout(resize,60);
  setTimeout(resize,150);
  setTimeout(resize,300);
}
/* ============================================================
   左 Dock 浮出/弹回（收起态下的临时展开）
   —— 触发：鼠标进入左边缘 10px 热区（或聚焦到面板内）
   —— 浮出：transform 平移 .34s var(--ease-snap)，叠加阴影表现"浮在画布上"
   —— 弹回：鼠标离开面板后延迟 320ms（避免掠过误触）
   —— 吸附：浮出时左边缘严格贴 0；弹回后完全移出屏幕（translateX(-100%)），
             不残留任何白框/白条
============================================================ */
let peekTimer=0,peekEnterTimer=0,peekLocked=false;
const PEEK_DELAY=300,PEEK_ENTER_DELAY=180;   /* 边缘停留后再弹出；离开时再留一点缓冲 */
function sidePeek(on,source="edge",pointerY=lastPointer&&lastPointer.y){
  if(!state.sideCollapsed){sidePanel.classList.remove("peek");return;}
  /* 统一缓冲：无论 on/off 都先清旧计时器，避免竞态 */
  if(peekTimer){clearTimeout(peekTimer);peekTimer=0;}
  if(!on&&peekEnterTimer){clearTimeout(peekEnterTimer);peekEnterTimer=0;}
  if(on&&source==="edge"){
    if(peekEnterTimer)clearTimeout(peekEnterTimer);
    peekEnterTimer=setTimeout(()=>{
      peekEnterTimer=0;
      if(state.sideCollapsed&&isPointerOverHoverZone())sidePanel.classList.add("peek");
    },PEEK_ENTER_DELAY);
    return;
  }
  if(on){if(peekEnterTimer){clearTimeout(peekEnterTimer);peekEnterTimer=0;}sidePanel.classList.add("peek");return;}
  /* 离开：延迟 PEEK_DELAY 后再真正收回；期间若有鼠标回到热区/面板，
     由 mouseenter 再次 sidePeek(true) 清掉本计时器，形成"停留缓冲" */
  peekTimer=setTimeout(()=>{
    if(!peekLocked&&!sidePanel.matches(":hover")&&!isPointerOverHoverZone())sidePanel.classList.remove("peek");
    peekTimer=0;
  },PEEK_DELAY);
}
/* 指针是否悬停在侧栏区域内 */
function isPointerOverHoverZone(){
  if(!lastPointer)return false;
  const sp=sidePanel.getBoundingClientRect();
  if(lastPointer.x>=sp.left&&lastPointer.x<=sp.right&&lastPointer.y>=sp.top&&lastPointer.y<=sp.bottom)return true;
  return false;
}
(function initSidePeek(){
  /* 鼠标移入面板 → 保持浮出（锁定，防止移开即刻收起） */
  sidePanel.addEventListener("mouseenter",()=>{peekLocked=true;sidePeek(true,"panel");});
  /* 鼠标离开面板 → 解除锁定并延迟弹回（300ms 滞后） */
  sidePanel.addEventListener("mouseleave",()=>{peekLocked=false;sidePeek(false);});
  /* 键盘可达：Tab 聚焦到面板内也浮出 */
  sidePanel.addEventListener("focusin",()=>{peekLocked=true;sidePeek(true,"panel");});
  /* 在画布上移动时，若面板处于浮出且鼠标不在其内 → 走滞后缓冲收回 */
  document.addEventListener("pointermove",e=>{
    lastPointer={x:e.clientX,y:e.clientY};
    if(!state.sideCollapsed)return;
    if(!sidePanel.classList.contains("peek"))return;
    if(peekLocked)return;
    const r=sidePanel.getBoundingClientRect();
    const inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
    if(!inside&&e.clientX>14)sidePeek(false);
  },{passive:true});
})();

/* ============================================================
   临时回归测试模式（本轮排障专用）
   首次载入会清除 board-state 与附件 Blob，只生成一份很小的测试项目。
   后续刷新保留测试中的操作结果，便于观察重排、跳转和展开。
============================================================ */
/* 发布版必须关闭临时回归测试模式；该模式会刻意只保留一份小型测试项目，
   从而跳过“织见学堂”及正常项目初始化。 */
const SIMPLE_TEST_MODE=false;
const SIMPLE_TEST_RESET_VERSION="20260830-simple-regression-v1";
function resetLocalArchiveForSimpleTest(){
  try{
    if(localStorage.getItem("zhijian-simple-test-reset")===SIMPLE_TEST_RESET_VERSION)return false;
    localStorage.removeItem("board-state");
    localStorage.setItem("zhijian-simple-test-reset",SIMPLE_TEST_RESET_VERSION);
    if(idb){
      const tx=idb.transaction("files","readwrite");
      tx.objectStore("files").clear();
    }
    return true;
  }catch(e){return false;}
}
function seedSimpleRegressionTest(){
  const project=createProject("回归测试");
  const canvas=curCanvas();canvas.name="01-基础交互";
  state.layoutType="logic";
  const root=addMindNode("织见 · 回归测试",null,"#2d5fd3",-120,70);
  const layout=addMindNode("布局与重排",root.id,"#1fa06a",190,-80);
  const reading=addMindNode("批注与展开",root.id,"#7a55c0",190,80);
  const jump=addMindNode("跃迁验证",root.id,"#e0882a",190,240);
  const childA=addMindNode("子节点 A",layout.id,"#1fa06a",470,-125);
  const childB=addMindNode("子节点 B",layout.id,"#1fa06a",470,-35);
  const detailChild=addMindNode("完整内容不裁切",reading.id,"#7a55c0",470,85);
  reading.annotation="选中节点后，这条批注应当清晰；未选中时保持弱化。";
  reading.detail="# 展开阅读区\n\n这里用于检查文字对比度、留白与完整显示。\n\n- 内容可读\n- 背景稳定\n- 不应裁切";
  detailChild.annotation="这是子节点批注，用来验证归属与避让。";
  state.links.push({id:"l"+(uid++),aId:layout.id,bId:reading.id,relationType:"supports",annotation:"验证关系线的选择聚焦",directional:true});
  addNote(20,355,"测试顺序：\n1. 选中关系线或节点\n2. 展开“批注与展开”\n3. 点击“跃迁验证”中的跳转\n4. 点击重新排版后再撤销",NOTE_COLORS[0]);
  const target=createCanvas("02-跃迁目标");
  const targetNode=addMindNode("已抵达目标节点",null,"#e0882a",120,80);
  addMindNode("可继续编辑",targetNode.id,"#1fa06a",390,80);
  jump.jumpTo={canvasId:target.id,itemId:targetNode.id};
  state.activeCanvasId=canvas.id;
  state.selected=root.id;
  syncUid();renderSidePanel();fitAll();
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

/* 织见学堂：内嵌教程 seed（无存档时自动生成，含内联附件） *//* 仅升级内置教程的历史坐标：用户自行创建的画布绝不自动改位。 */
function upgradeTutorLayouts(){
  const tutor=state.projects.find(p=>p.name==="织见学堂");
  if(!tutor)return false;
  const legacy=(tutor.canvases||[]).filter(c=>c.layoutVersion!==3);
  if(!legacy.length)return false;
  const projectId=state.activeProjectId,canvasId=state.activeCanvasId;
  for(const canvas of legacy){
    state.activeProjectId=tutor.id;state.activeCanvasId=canvas.id;
    applyAutoLayout();canvas.layoutVersion=3;
  }
  state.activeProjectId=projectId;state.activeCanvasId=canvasId;
  return true;
}



function init(){
  buildToolbar();
  setTool("select");
  syncHistoryBtns();
  mountControls();
  applySide();
  applyTheme();
  applyFontPreset();
  resize();
  openDB().then(()=>{
    const resetForTest=SIMPLE_TEST_MODE&&resetLocalArchiveForSimpleTest();
    const has=resetForTest?false:loadState();
    /* G4 fix: loadState 后重新 applyTheme，确保 autoTheme 生效 */
    applyTheme();
    if(!has){
      if(SIMPLE_TEST_MODE)seedSimpleRegressionTest();
      /* 发布版的首次打开只建立内置学堂，不再生成开发期“回归测试”数据。 */
      else{ensureTutorProject();}
      saveState();
      fitAll();
    }else{
      /* 内置学堂有独立版本号；只升级它，不影响用户自己的项目与画布。 */
      if(!SIMPLE_TEST_MODE&&ensureTutorProject())saveState();
      restoreFiles().then(()=>{
        renderSidePanel();
        render();fitAll();
        syncPvDom();
      });
    }
    renderSidePanel();
    render();
  }).catch(function(e){
    console.error("init error:",e);
    try{renderSidePanel();render();}catch(_){}
  }).finally(function(){
    /* G1: 启动动画收尾 — 最低展示 1.5s 后淡出（放 finally 确保即使出错也消失） */
    var el=document.getElementById("splashScreen");
    if(el){
      setTimeout(function(){
        el.classList.add("hide");
        setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},600);
      },1500);
    }
  });
  window.addEventListener("resize",resize);
  window.addEventListener("beforeunload",saveState);
  /* G3: 可配置自动保存间隔 */
  var _saveTimer=null;
  function setupAutoSave(){
    if(_saveTimer){clearInterval(_saveTimer);_saveTimer=null;}
    var sec=state.saveInterval;
    if(sec>0){_saveTimer=setInterval(saveState,sec*1000);}
  }
  setupAutoSave();
  /* E5: load saved logo preference. G1: default 3 (叠合元素) */
  var savedLogo=parseInt(localStorage.getItem("zhijian-logo"))||3;
  applyLogo(savedLogo);
}
init();
/* G1: 启动动画 — 尽早设置 Logo src，在 init 之前就显示 */
(function(){
  var sl=parseInt(localStorage.getItem("zhijian-logo"))||3;
  var preset=LOGO_PRESETS[sl]||LOGO_PRESETS[3];
  var img=document.querySelector(".splash-logo");
  if(img)img.src="g6/assets/logos/splash-"+sl+".png";  /* G1: 用透明母版 icon */
})();
/* ResizeObserver 持续监听 board 尺寸变化（CSS transition/窗口变化/响应式折叠都覆盖） */

/* E5: Settings modal */
/* E10: 重写设置面板 — 左侧分类栏 + 右侧内容区
   原则：只列主界面没有的功能，不重复主题/样式/底色/纹理（这些在顶栏按钮和菜单里） */
const SETTINGS_CATEGORIES=[
  {id:"general",label:"通用",icon:"⚙"},
  {id:"data",label:"数据",icon:"💾"},
  {id:"appearance",label:"外观",icon:"🎨"},
  {id:"shortcuts",label:"快捷键",icon:"⌨"},
  {id:"ai",label:"AI",icon:"🤖"},
  {id:"about",label:"关于",icon:"ℹ"},
];
function showSettings(){
  showModal("设置",null,[
    {label:"关闭",onClick:function(){}}
  ]);
  var box=document.querySelector(".modal-box");
  if(!box)return;
  box.style.maxWidth="680px";
  /* E10: 白天模式强制不透明白底 + 关掉毛玻璃模糊，用 !important 覆盖 CSS */
  if(!state.dark){
    box.style.setProperty("background","rgba(255,255,255,.98)","important");
    box.style.setProperty("backdrop-filter","none","important");
    box.style.setProperty("-webkit-backdrop-filter","none","important");
  }
  var body=box.querySelector(".modal-body");
  body.innerHTML='<div style="display:flex;min-height:380px"><div id="settingsNav" style="width:140px;flex:none;border-right:1px solid var(--card-border);padding:8px 0"></div><div id="settingsContent" style="flex:1;padding:16px 20px;overflow-y:auto;max-height:380px"></div></div>';
  var nav=body.querySelector("#settingsNav");
  var content=body.querySelector("#settingsContent");
  SETTINGS_CATEGORIES.forEach(function(cat){
    var item=document.createElement("div");
    item.textContent=cat.icon+"  "+cat.label;
    item.dataset.cat=cat.id;
    item.style.cssText="padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;color:var(--ink-dim);border-radius:8px;transition:all .12s ease";
    item.addEventListener("click",function(){
      nav.querySelectorAll("[data-cat]").forEach(function(n){n.style.background="transparent";n.style.color="var(--ink-dim)";});
      item.style.background="var(--accent-soft)";item.style.color="var(--accent)";
      renderSettingsContent(cat.id,content);
    });
    nav.appendChild(item);
  });
  nav.firstChild.click();
}
function renderSettingsContent(catId,content){
  if(catId==="general"){
    content.innerHTML=
      '<h4 style="margin:0 0 16px;font-size:14px">通用设置</h4>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">主题模式</div>'+
      '<div style="display:flex;gap:8px;align-items:center">'+
      '<button id="setAutoTheme" style="padding:8px 14px;border:1px solid '+(state.autoTheme?"var(--accent)":"var(--card-border)")+';border-radius:8px;background:'+(state.autoTheme?"var(--accent-soft)":"var(--surface)")+';color:'+(state.autoTheme?"var(--accent)":"var(--ink)")+';cursor:pointer;font:600 12px var(--font)">'+(state.autoTheme?"跟随系统 ✓":"手动切换")+'</button>'+
      '<button id="setLight" style="padding:8px 14px;border:1px solid '+(!state.dark?"var(--accent)":"var(--card-border)")+';border-radius:8px;background:'+(!state.dark?"var(--accent-soft)":"var(--surface)")+';color:'+(!state.dark?"var(--accent)":"var(--ink)")+';cursor:pointer;font:600 12px var(--font)">☀ 亮色</button>'+
      '<button id="setDark" style="padding:8px 14px;border:1px solid '+(state.dark?"var(--accent)":"var(--card-border)")+';border-radius:8px;background:'+(state.dark?"var(--accent-soft)":"var(--surface)")+';color:'+(state.dark?"var(--accent)":"var(--ink)")+';cursor:pointer;font:600 12px var(--font)">☾ 暗色</button>'+
      '</div><div style="font-size:11px;color:var(--ink-faint);margin-top:4px">跟随系统时手动切换仅当前会话生效，重启后恢复跟随</div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">沉浸模式</div>'+
      '<button id="setImmersive" style="padding:8px 16px;border:1px solid var(--card-border);border-radius:8px;background:var(--surface);color:var(--ink);cursor:pointer;font:600 12px var(--font)">切换沉浸 (F11)</button>'+
      '<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">隐藏顶栏和侧栏，专注画布</div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">全屏窗口</div>'+
      '<button id="setFullscreen" style="padding:8px 16px;border:1px solid var(--card-border);border-radius:8px;background:var(--surface);color:var(--ink);cursor:pointer;font:600 12px var(--font)">'+(document.fullscreenElement||document.webkitFullscreenElement?"退出全屏":"进入全屏")+'</button>'+
      '<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">使用浏览器/桌面应用的全屏模式（独立于沉浸）</div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">启动行为</div>'+
      '<div style="font-size:12px;color:var(--ink)">当前：自动加载上次项目</div>'+
      '<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">未来可选：打开上次项目 / 打开新建项目 / 打开教程</div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">自动保存间隔</div>'+
      '<div style="display:flex;gap:6px">'+
      [{v:0,l:"关闭"},{v:10,l:"10秒"},{v:30,l:"30秒"},{v:60,l:"60秒"}].map(function(o){
        var on=state.saveInterval===o.v;
        return '<button class="saveIntBtn" data-v="'+o.v+'" style="padding:6px 12px;border:1px solid '+(on?"var(--accent)":"var(--card-border)")+';border-radius:8px;background:'+(on?"var(--accent-soft)":"var(--surface)")+';color:'+(on?"var(--accent)":"var(--ink-dim)")+';cursor:pointer;font:600 11px var(--font)">'+o.l+'</button>';
      }).join("")+
      '</div><div style="font-size:11px;color:var(--ink-faint);margin-top:4px">关闭页面时无论设置如何都会自动保存</div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">动画效果</div>'+
      '<button id="setReducedMotion" style="padding:8px 16px;border:1px solid var(--card-border);border-radius:8px;background:var(--surface);color:var(--ink);cursor:pointer;font:600 12px var(--font)">'+(state.reducedMotion?"已启用减弱动画":"正常动画")+'</button>'+
      '<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">减弱漂移动画和过渡效果</div></div>';
    var at=content.querySelector("#setAutoTheme");
    if(at)at.onclick=function(){state.autoTheme=!state.autoTheme;saveState();if(state.autoTheme){applyTheme();render();}showSettings();};
    var sl=content.querySelector("#setLight");
    /* G4: 手动切换不关闭 autoTheme，下次启动仍跟随系统 */
    if(sl)sl.onclick=function(){state.dark=false;applyTheme();render();saveState();showSettings();};
    var sd=content.querySelector("#setDark");
    if(sd)sd.onclick=function(){state.dark=true;applyTheme();render();saveState();showSettings();};
    var im=content.querySelector("#setImmersive");if(im)im.onclick=function(){toggleImmersive();};
    var fsw=content.querySelector("#setFullscreen");
    if(fsw)fsw.onclick=function(){
      /* G3: 桌面用 electronAPI，网页用 Fullscreen API */
      if(window.electronAPI&&window.electronAPI.toggleFullscreen){
        window.electronAPI.toggleFullscreen().then(function(fs){toast(fs?"已进入全屏":"已退出全屏");});
      }else{
        var el=document.documentElement;
        if(document.fullscreenElement||document.webkitFullscreenElement){
          if(document.exitFullscreen){document.exitFullscreen();}
          else if(document.webkitExitFullscreen){document.webkitExitFullscreen();}
        }else{
          if(el.requestFullscreen){el.requestFullscreen();}
          else if(el.webkitRequestFullscreen){el.webkitRequestFullscreen();}
          else{toast("此环境不支持全屏 API");}
        }
      }
    };
    var rm=content.querySelector("#setReducedMotion");
    if(rm)rm.onclick=function(){state.reducedMotion=!state.reducedMotion;saveState();showSettings();toast(state.reducedMotion?"已启用减弱动画":"已恢复正常动画");};
    /* G3: 自动保存间隔按钮 */
    content.querySelectorAll(".saveIntBtn").forEach(function(btn){
      btn.onclick=function(){state.saveInterval=parseInt(btn.dataset.v);saveState();setupAutoSave();showSettings();toast("自动保存："+(state.saveInterval>0?state.saveInterval+"秒":"已关闭"));};
    });
  }
  else if(catId==="data"){
    var isDesktop=window.electronAPI&&window.electronAPI.isDesktop;
    var storageCurrent=state.storagePath||(isDesktop?"（未设置，使用默认）":"浏览器 localStorage（网页版）");
    content.innerHTML=
      '<h4 style="margin:0 0 16px;font-size:14px">数据管理</h4>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">存储方式</div>'+
      '<div style="font-size:12px;color:var(--ink)">'+(isDesktop?"桌面应用（Electron）":"浏览器 localStorage（网页版）")+'</div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">文件存储位置</div>'+
      '<div style="display:flex;gap:8px"><input id="storagePath" style="flex:1;height:34px;padding:0 10px;border:1px solid var(--card-border);border-radius:8px;background:var(--surface);color:var(--ink);font:12px var(--font)" value="'+storageCurrent+'" readonly>'+
      (isDesktop?'<button id="setStoragePath" style="padding:0 12px;border:1px solid var(--card-border);border-radius:8px;background:var(--surface);color:var(--ink-dim);cursor:pointer;font:12px var(--font)">选择…</button>':'')+'</div>'+
      '<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">附件、导出文件、备份将存到此目录'+(isDesktop?'':'（桌面版可用）')+'</div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">数据备份</div>'+
      '<button id="setExportAll" style="padding:8px 16px;border:1px solid var(--accent);border-radius:8px;background:var(--accent-soft);color:var(--accent);cursor:pointer;font:600 12px var(--font)">导出全部数据</button>'+
      '<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">包含所有项目、画布、附件的完整备份（JSON）</div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">清理</div>'+
      '<button id="setClearCache" style="padding:8px 16px;border:1px solid var(--danger);border-radius:8px;background:var(--danger-soft);color:var(--danger);cursor:pointer;font:600 12px var(--font)">清除预览缓存</button>'+
      '<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">清理文件预览的临时缓存，不影响数据</div></div>';
    var ea=content.querySelector("#setExportAll");if(ea)ea.onclick=function(){exportUserData();toast("已导出全部用户数据");};
    var cc=content.querySelector("#setClearCache");if(cc)cc.onclick=function(){if(confirm("清除预览缓存？数据不受影响。")){try{Object.keys(localStorage).filter(function(k){return k.startsWith("pv_");}).forEach(function(k){localStorage.removeItem(k);});toast("预览缓存已清除");}catch(e){toast("清除失败");}}};
    var sp=content.querySelector("#setStoragePath");
    if(sp)sp.onclick=function(){
      if(window.electronAPI&&window.electronAPI.selectDirectory){
        window.electronAPI.selectDirectory().then(function(p){
          if(p){state.storagePath=p;saveState();showSettings();toast("存储位置已设置："+p);}
        });
      }
    };
  }
  else if(catId==="appearance"){
    content.innerHTML=
      '<h4 style="margin:0 0 16px;font-size:14px">外观</h4>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:8px">应用图标</div><div style="display:flex;gap:12px" id="logoChoices"></div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">默认样式（新建项目时）</div>'+
      '<div style="font-size:12px;color:var(--ink-faint)">未来可选：默认使用哪种视觉样式</div></div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">默认字体（新建项目时）</div>'+
      '<div style="font-size:12px;color:var(--ink-faint)">未来可选：默认使用哪种画布字体</div></div>';
    var choices=content.querySelector("#logoChoices");
    for(var n=1;n<=3;n++)(function(num){
      var preset=LOGO_PRESETS[num];var isDark=document.documentElement.getAttribute("data-theme")==="dark";
      var item=document.createElement("div");
      item.style.cssText="flex:1;cursor:pointer;padding:12px;border:2px solid "+(logoPreset===num?"var(--accent)":"var(--card-border)")+";border-radius:12px;text-align:center;transition:all .15s ease";
      item.innerHTML='<img src="'+(isDark?preset.comboDark:preset.comboLight)+'" style="width:48px;height:48px;object-fit:contain;margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:'+(logoPreset===num?"var(--accent)":"var(--ink-dim)")+'">'+preset.label+'</div>';
      item.onclick=function(){applyLogo(num);showSettings();};
      choices.appendChild(item);
    })(n);
  }
  else if(catId==="shortcuts"){
    var rows=[
      ["节点操作","",""],
      ["加子节点","Tab","选中节点后按"],
      ["加同级","Enter","选中节点后按"],
      ["加根/二/三/四级","Shift+1/2/3/4",""],
      ["折叠/展开","− / +","选中节点"],
      ["同级排序","Alt+↑↓",""],
      ["提级/降级","Alt+←→",""],
      ["删除选中","Delete",""],
      ["","",""],
      ["编辑","",""],
      ["撤销/重做","Ctrl+Z / Ctrl+Shift+Z",""],
      ["编辑文字","双击节点","或Enter选中后"],
      ["形变展开","E","选中节点/卡片"],
      ["删除展开","Alt+E","选中节点"],
      ["","",""],
      ["工具","",""],
      ["便签","N",""],
      ["画笔","P",""],
      ["框选","B",""],
      ["连接/断开","C","选中两元素"],
      ["添加批注","A","选中元素"],
      ["","",""],
      ["视图","",""],
      ["聚焦模式","F",""],
      ["凝视(100%)","G",""],
      ["纵览全部","Y",""],
      ["沉浸模式","F11",""],
      ["跃迁到画布","J",""],
      ["搜索","Ctrl+F",""],
      ["","",""],
      ["画布","",""],
      ["平移","空白拖动 / 空格+拖",""],
      ["缩放","滚轮",""],
      ["新建节点","空白双击",""],
    ];
    var html='<h4 style="margin:0 0 16px;font-size:14px">快捷键</h4><div style="font-size:11px;color:var(--ink-dim);margin-bottom:12px">以下为当前快捷键，未来版本支持自定义</div><table style="width:100%;border-collapse:collapse;font-size:12px">';
    rows.forEach(function(r){
      if(r[0]&&!r[1]){html+='<tr><td colspan="3" style="padding:8px 0 4px;font-weight:700;color:var(--ink)">'+r[0]+'</td></tr>';}
      else if(!r[0]){html+='<tr style="height:8px"></tr>';}
      else{html+='<tr><td style="padding:4px 8px;color:var(--ink-dim)">'+r[0]+'</td><td style="padding:4px 8px;font-weight:600;font-family:var(--font)"><kbd style="background:var(--accent-soft);padding:2px 6px;border-radius:4px;border:1px solid var(--card-border);font-size:11px">'+r[1]+'</kbd></td><td style="padding:4px 8px;color:var(--ink-faint);font-size:11px">'+r[2]+'</td></tr>';}
    });
    html+='</table>';
    content.innerHTML=html;
  }
  else if(catId==="ai"){
    content.innerHTML=
      '<h4 style="margin:0 0 16px;font-size:14px">AI 设置</h4>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">AI Skill 导出</div>'+
      '<div style="font-size:12px;color:var(--ink);margin-bottom:8px">导出当前应用的 AI 接口工具包，供外部 AI 调用织见的功能。</div>'+
      '<button id="exportAISkill" style="padding:8px 16px;border:1px solid var(--accent);border-radius:8px;background:var(--accent-soft);color:var(--accent);cursor:pointer;font:600 12px var(--font)">导出 AI Skill</button>'+
      '</div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">AI 接口</div>'+
      '<div style="font-size:12px;color:var(--ink)">当前接口：ZhijianAI（~25 个操作，支持批量+回滚）</div>'+
      '</div>'+
      '<div style="margin-bottom:20px"><div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">未来功能（预留）</div>'+
      '<div style="font-size:11px;color:var(--ink-faint)">· 自主建图（AI 自主构建思维关系板）<br>· 关系类型自动标注<br>· 投资建议书一键导出<br>· 多模型接入配置</div></div>';
    var eb=content.querySelector("#exportAISkill");
    if(eb)eb.onclick=function(){
      /* G3: 生成 AI Skill 文件并下载 */
      var skill="# 织见 AI 接口 (G3)\n\n";
      skill+="页面加载后提供 `window.ZhijianAI`：\n\n";
      skill+="```js\nwindow.ZhijianAI.snapshot()\nwindow.ZhijianAI.execute({ op: \"snapshot\" })\nwindow.ZhijianAI.buildCanvas(plan)\n```\n\n";
      skill+="接口版本："+(window.ZhijianAI?window.ZhijianAI.version:"1.2")+"。接口只在页面自身 JavaScript 上下文中可用。\n\n";
      skill+="## 操作边界\n\n- AI 只能通过 `window.ZhijianAI.execute()` 操作画布\n- 不得直接修改 DOM、localStorage、应用源代码\n- 删除类操作需用户明确指示\n- 不臆造内容，不确定的标为便签\n\n";
      skill+="## 可用样式\n\n";
      Object.keys(STYLE_PRESETS).forEach(function(k){skill+="- `"+k+"`："+STYLE_PRESETS[k].label+"（"+STYLE_PRESETS[k].desc+"）\n";});
      skill+="\n## 可用布局\n\n- `right`（逻辑图）、`org`（组织架构）、`u`（U型）、`fishbone`（鱼骨图）、`timeline`（时间轴）、`brace`（总分）\n";
      skill+="\n## 关系类型\n\n- `related`（关联，无向）、`supports`（支撑）、`causes`（导致）、`contradicts`（反证）、`evidence`（证据）\n";
      skill+="\n## 样式切换\n\n```js\nwindow.ZhijianAI.execute({op:\"set_style\",style:\"glass\"})\n```\n\n";
      skill+="## Slogan\n\n织连万象，见聚一隅。\n\nWeave the many, See the one.\n";
      var blob=new Blob([skill],{type:"text/markdown;charset=utf-8"});
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.download="织见-AI-Skill.md";a.href=url;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(url);},1000);
      toast("AI Skill 已导出");
    };
  }
  else if(catId==="about"){
    content.innerHTML=
      '<h4 style="margin:0 0 16px;font-size:14px">关于织见</h4>'+
      '<div style="text-align:center;padding:20px 0">'+
      '<img src="'+(document.documentElement.getAttribute("data-theme")==="dark"?LOGO_PRESETS[logoPreset].comboDark:LOGO_PRESETS[logoPreset].comboLight)+'" style="width:64px;height:64px;object-fit:contain;margin-bottom:12px">'+
      '<div style="font-size:18px;font-weight:700;color:var(--ink)">织见 WEAVISION</div>'+
      '<div style="font-size:12px;color:var(--ink-dim);margin-top:4px">思维关系板 · '+(window.electronAPI&&window.electronAPI.isDesktop?"桌面版 ":"Demo ")+(window.electronAPI&&window.electronAPI.getVersion?"v"+window.electronAPI.getVersion():"G3")+'</div>'+
      '<div style="font-size:11px;color:var(--ink-faint);margin-top:8px;font-style:italic">织连万象，见聚一隅</div>'+
      '</div>'+
      '<div style="font-size:12px;color:var(--ink);text-align:center;margin-top:12px;font-weight:600">Designed by Fantin</div>'+
      '<div style="font-size:11px;color:var(--ink-dim);text-align:center;margin-top:12px">本地优先 · '+(window.electronAPI&&window.electronAPI.isDesktop?"数据存储于本地文件系统":"数据存储于浏览器 localStorage")+'</div>';
  }
}

if(typeof ResizeObserver!=="undefined"){
  new ResizeObserver(()=>{resize();}).observe(board);
}
