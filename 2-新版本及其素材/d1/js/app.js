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
      ui:{sideCollapsed:state.sideCollapsed,dark:state.dark,bgPattern:state.bgPattern,bgColorName:state.bgColorName,mindMode:state.mindMode,mindColorMode:state.mindColorMode,layoutType:state.layoutType,fontPreset:state.fontPreset,stylePreset:state.stylePreset},
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
      if(d.ui.mindColorMode==="single"||d.ui.mindColorMode==="auto")state.mindColorMode=d.ui.mindColorMode;
      if(d.ui.layoutType){
        const legacyLayout={right:"logic",left:"logic",u:"logic",brace:"logic"};
        state.layoutType=legacyLayout[d.ui.layoutType]||d.ui.layoutType;
      }
      if(d.ui.stylePreset){let sp=d.ui.stylePreset;if(STYLE_ALIAS[sp])sp=STYLE_ALIAS[sp];if(STYLE_PRESETS[sp])state.stylePreset=sp;}
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
  document.documentElement.setAttribute("data-theme",state.dark?"dark":"light");
  document.documentElement.dataset.style=state.stylePreset||DEFAULT_STYLE;
  /* D1: refresh logo on theme change */
  if(typeof applyLogo==="function"){var sl=parseInt(localStorage.getItem("zhijian-logo"))||1;applyLogo(sl);}
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

/* D1: Logo system — 3 icon sets */
const LOGO_PRESETS={
  1:{label:"穿线元素",light:"c12/assets/logos/logo1-light.png",dark:"c12/assets/logos/logo1-dark.png",
     cnLight:"c12/assets/logos/logo01-中文字标-light.png",cnDark:"c12/assets/logos/logo01-中文字标-dark.png",
     enLight:"c12/assets/logos/logo01-英文字标-light.png",enDark:"c12/assets/logos/logo01-英文字标-dark.png",
     comboLight:"c12/assets/logos/logo01-横版组合-light.png",comboDark:"c12/assets/logos/logo01-横版组合-dark.png"},
  2:{label:"聚焦轨道",light:"c12/assets/logos/logo2-light.png",dark:"c12/assets/logos/logo2-dark.png",
     cnLight:"c12/assets/logos/logo02-中文字标-light.png",cnDark:"c12/assets/logos/logo02-中文字标-dark.png",
     enLight:"c12/assets/logos/logo02-英文字标-light.png",enDark:"c12/assets/logos/logo02-英文字标-dark.png",
     comboLight:"c12/assets/logos/logo02-横版组合-light.png",comboDark:"c12/assets/logos/logo02-横版组合-dark.png"},
  3:{label:"叠合元素",light:"c12/assets/logos/logo3-light.png",dark:"c12/assets/logos/logo3-dark.png",
     cnLight:"c12/assets/logos/logo03-中文字标-light.png",cnDark:"c12/assets/logos/logo03-中文字标-dark.png",
     enLight:"c12/assets/logos/logo03-英文字标-light.png",enDark:"c12/assets/logos/logo03-英文字标-dark.png",
     comboLight:"c12/assets/logos/logo03-横版组合-light.png",comboDark:"c12/assets/logos/logo03-横版组合-dark.png"},
};
let logoPreset=1;
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
  if(key==="neumorph"||key==="minimal"||key==="editorial"){state.fontPreset="serif";applyFontPreset();}
  /* 字体联动规则：仅"自带字体配置"的样式切换时同步恢复其专属字体；
     其余样式（默认/玻璃）不碰字体，保持用户当前独立选择。 */
  render();saveState();
  toast("样式："+STYLE_PRESETS[key].label);
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
    const s=selectedItem();if(!s)return;
    if(s.type==="mindNode")toggleDetailInPlace(s);
    else if(s.type==="fileCard")togglePreviewMorph(s);
    return;
  }
  /* D1: Alt+E = delete detail content (mindNode only) */
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
  document.getElementById("exportBtn").addEventListener("click",showExportOptions);
  document.getElementById("importBtn").addEventListener("click",showImportOptions);
  document.getElementById("libImportBtn").addEventListener("click",()=>offerImport());
  fileInput.addEventListener("change",async()=>{
    const files=Array.from(fileInput.files||[]);
    fileInput.value="";
    if(files.length)await importFiles(files);
  });
  document.getElementById("newProjectBtn").addEventListener("click",()=>showPrompt("新建项目","项目名称","新项目",name=>{if(name)createProject(name);}));
  document.getElementById("newCanvasBtn").addEventListener("click",()=>showPrompt("新建画布","画布名称","新画布",name=>{if(name)createCanvas(name);}));

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
    bg:[
      {icon:ICON.bgColor,label:"背景底色",key:"",fn:()=>{
        const cols=["default","eye","cream","blue","kraft"];
        const idx=cols.indexOf(state.bgColorName||"default");
        state.bgColorName=cols[(idx+1)%cols.length];
        render();saveState();requestAnimationFrame(()=>render());
        toast("背景底色："+((BG_COLORS.find(c=>c[0]===state.bgColorName)||["",""])[1]||state.bgColorName));
      }},
      {icon:ICON.grid,label:"背景纹理",key:"",fn:()=>{
        const pats=["grid","dots","paper","blank"];
        const idx=pats.indexOf(state.bgPattern||"grid");
        state.bgPattern=pats[(idx+1)%pats.length];
        render();saveState();
        toast("背景纹理："+((BG_PATTERNS.find(p=>p[0]===state.bgPattern)||["",""])[1]||state.bgPattern));
      }},
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
  showOptions("导出",[
    {id:"userData",label:"导出数据包",desc:"全部用户项目（JSON）",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',onClick:()=>exportUserData()},
    {id:"canvas",label:"导出当前画布",desc:"画布结构 + 材料索引",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>',onClick:()=>exportProject()},
    {id:"png",label:"导出图片 PNG",desc:"导出画布为图片",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L9 20"/></svg>',onClick:()=>exportPNG()},
  ]);
}
function showImportOptions(){
  showOptions("导入",[
    {id:"json",label:"导入数据/画布包",desc:".json 格式，织见自身导出",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',onClick:()=>{
      var inp=document.createElement("input");
      inp.type="file";inp.accept=".json,.board.json";
      inp.onchange=function(){
        if(inp.files&&inp.files[0])importProject(inp.files[0]);
      };
      inp.click();
    }},
    {id:"opml",label:"从 OPML 导入",desc:"OPML 格式（多数思维导图通用）",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M8 13h8M8 17h5"/></svg>',onClick:()=>{
      var inp=document.createElement("input");
      inp.type="file";inp.accept=".opml,.xml";
      inp.onchange=function(){
        if(inp.files&&inp.files[0])importOPML(inp.files[0]);
      };
      inp.click();
    }},
    {id:"md",label:"从 Markdown 导入",desc:"Markdown 大纲转节点",icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M7 13l2 2 2-2M13 17h4"/></svg>',onClick:()=>{
      var inp=document.createElement("input");
      inp.type="file";inp.accept=".md,.markdown,.txt";
      inp.onchange=function(){
        if(inp.files&&inp.files[0])importMarkdown(inp.files[0]);
      };
      inp.click();
    }},
  ]);
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

/* 织见学堂：内嵌教程 seed（无存档时自动生成，含内联附件） */
function seedTutor(){
  const ATT=[
    {n:"AI-Quick-Ref.pdf",d:"JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA1IDAgUiA+PiA+PiAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCAyNTYgPj4Kc3RyZWFtCkJUIC9GMSAxNiBUZiA2MCA3ODAgVGQgKFpoaWppYW4gQUkgUXVpY2sgUmVmKSBUaiBFVApCVCAvRjEgMTUgVGYgNjAgNzU2IFRkICgxLiBzbmFwc2hvdCgpIC0gcmVhZCBzdGF0ZSkgVGogRVQKQlQgL0YxIDE0IFRmIDYwIDczMiBUZCAoMi4gZXhlY3V0ZSh7b3AsLi4ufSkpIFRqIEVUCkJUIC9GMSAxMyBUZiA2MCA3MDggVGQgKDMuIGJ1aWxkQ2FudmFzKHBsYW4pKSBUaiBFVApCVCAvRjEgMTIgVGYgNjAgNjg0IFRkIChWZXJzaW9uIDEuMSkgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQxIDAwMDAwIG4gCjAwMDAwMDA1NDggMDAwMDAgbiAKMHVuZGVmaW5lZCAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjYxOAolJUVPRg=="},
    {n:"shortcut-table.xlsx",d:"UEsDBBQAAAAIAL1rHl1uYbgN/gAAAC0CAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbK2RzU7DMBCEX8XytYqdckAIJe2BnyNwKA+w2JvEiv/kdUv69jhp4YAKXDit7JnZb2Q328lZdsBEJviWr0XNGXoVtPF9y193j9UNZ5TBa7DBY8uPSHy7aXbHiMRK1lPLh5zjrZSkBnRAIkT0RelCcpDLMfUyghqhR3lV19dSBZ/R5yrPO/imuccO9jazh6lcn3oktMTZ3ck4s1oOMVqjIBddHrz+RqnOBFGSi4cGE2lVDFxeJMzKz4Bz7rk8TDIa2Quk/ASuuORk5XtI41sIo/h9yYWWoeuMQh3U3pWIoJgQNA2I2VmxTOHA+NXf/MVMchnrfy7ytf+zh1y+e/MBUEsDBBQAAAAIAL1rHl2dbEO9uQAAABsBAAAPAAAAeGwvd29ya2Jvb2sueG1sjU9LrsIwDLxK5D2kZYGeqrZsEBJr4AChcWlEY1d2+LzbE357VjPWaMYz9eoeR3NF0cDUQDkvwCB17AOdGjjsN7M/MJoceTcyYQP/qLBq6xvL+ch8NtlO2sCQ0lRZq92A0emcJ6Ss9CzRpXzKyeok6LwOiCmOdlEUSxtdIHgnVPJLBvd96HDN3SUipXeI4OhSLq9DmBTa+vVBP2jIxVx69+RlHvLErc87wUgVMpGtL8G2tf3a7HdZ+wBQSwMEFAAAAAgAvWseXZI30RPkAAAAwwIAABgAAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWyVkk1OAzEMRq8SZU89sEAIJemiVTegbigHCInpRE2cUWIovT1hFgjEX1jafraepU8tX1IUz1hqyKTl+WKQAsllH2iv5f1uc3YlRWVL3sZMqOUJq1wadczlUEdEFm2fqpYj83QNUN2IydZFnpDa5DGXZLmVZQ91Kmj9vJQiXAzDJSQbSBo199aWrVElH41ygrUMFAPhHZcGhGoUmw1afiqogI2Ctxa4H9kbPHVxa6zuMwizwm8e2+z7JHb2oYtbjSH6/1twn8W2j2rnRPry2d8et4EOfV/2UZkIHX9nAR9yAu8BNK9QSwMEFAAAAAgAvWseXVr9gmuxAAAAKAEAAAsAAABfcmVscy8ucmVsc43PyQrCQAwG4FcZcrdpPYhIp15E6FXqAwzTdKGdhcm49O0dPIgFD55C8pMvpDw+zSzuFHh0VkKR5SDIateOtpdwbc6bPQiOyrZqdpYkLMRwrMoLzSqmFR5GzyIZliUMMfoDIuuBjOLMebIp6VwwKqY29OiVnlRPuM3zHYZvA9amqFsJoW4LEM3i6R/bdd2o6eT0zZCNP07gw4WJB6KYUBV6ihI+I8Z3KbKkAlYlrj6sXlBLAQIUABQAAAAIAL1rHl1uYbgN/gAAAC0CAAATAAAAAAAAAAAAAAC2gQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQAFAAAAAgAvWseXZ1sQ725AAAAGwEAAA8AAAAAAAAAAAAAALaBLwEAAHhsL3dvcmtib29rLnhtbFBLAQIUABQAAAAIAL1rHl2SN9ET5AAAAMMCAAAYAAAAAAAAAAAAAAC2gRUCAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWxQSwECFAAUAAAACAC9ax5dWv2Ca7EAAAAoAQAACwAAAAAAAAAAAAAAtoEvAwAAX3JlbHMvLnJlbHNQSwUGAAAAAAQABAD9AAAACQQAAAAA"},
    {n:"weavision-intro.docx",d:"UEsDBBQAAAAIAL1rHl15bjPX6AAAAK0BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU7DMBD9FWuuKHHggBCK0wPLETiUDxjZk8SqN3nc0v49Tlt6QIXjzFv1+tXeO7GjzDYGBbdtB4KCjsaGScHn+rV5AMEFg0EXAyk4EMNq6NeHRCyqNrCCuZT0KCXrmTxyGxOFiowxeyz1zJNMqDc4kbzrunupYygUSlMWDxj6Zxpx64p42df3qUcmxyCeTsQlSwGm5KzGUnG5C+ZXSnNOaKvyyOHZJr6pBJBXExbk74Cz7r0Ok60h8YG5vKGvLPkVs5Em6q2vyvZ/mys94zhaTRf94pZy1MRcF/euvSAebfjpL49zD99QSwMEFAAAAAgAvWseXW0Krd/cAAAAgAEAABEAAAB3b3JkL2RvY3VtZW50LnhtbIWQQUvEMBCF/8qQk4I21YNIabsHYW97Uxa8ZZPZbZZmJkxi6/57E0EEEfbyhuHxPeZNv/kMMywoyTMN6qFpFSBZdp5Og3p73d4/K0jZkDMzEw7qgkltxn7tHNuPgJShBFDq1kFNOcdO62QnDCY1HJGKd2QJJpdVTnplcVHYYkolP8z6sW2fdDCeVI08sLvUGatIlTzu0Sy+Hgc375M/e0O3va5GVfnW+JfZeXKgQXA2uZIHNuKaq9gLE6HNsHqHd3As/RI4xHid3JdeEAUXj2tBAv+H6J+C+vd54xdQSwMEFAAAAAgAvWseXZv9N+qtAAAAKQEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4KtE3mlaBoRQ0y4IqSsqB7ASN61oHkrCo7cnAwNFDIy2f3+W6/ZpZnanECdnBVRFCYysdGqyWsClP232wGJCq3B2lgQsFKFt6jPNmPJKHCcfWTZsFDCm5A+cRzmSwVg4TzZPBhcMplwGzT3KK2ri27Lc8fBpwNpknRIQOlUB6xdP/9huGCZJRydvhmz6ceIrkWUMmpKAhwuKq3e7yCzwpuarF5sXUEsBAhQAFAAAAAgAvWseXXluM9foAAAArQEAABMAAAAAAAAAAAAAALaBAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAUAAAACAC9ax5dbQqt39wAAACAAQAAEQAAAAAAAAAAAAAAtoEZAQAAd29yZC9kb2N1bWVudC54bWxQSwECFAAUAAAACAC9ax5dm/036q0AAAApAQAACwAAAAAAAAAAAAAAtoEkAgAAX3JlbHMvLnJlbHNQSwUGAAAAAAMAAwC5AAAA+gIAAAAA"},
    {n:"layout-map.png",d:"iVBORw0KGgoAAAANSUhEUgAAAoAAAAFoCAIAAABIUN0GAAAQfElEQVR4nO3VxXIQVhiAUd6kT9C36b77PkG9hQoQJB5iQIDgGuIhhrsGiIcYrnWXBTPMP3fNcLnDmfke4NudFe9/OCZJkt5wK7IfSJL0DgZgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMgRgSZIyBGBJkjIEYEmSMrTixa//Pf/l39izn/+JPf3p76QnP/4Ve/zDn7FHL/5Ievj899iDZ7/F7j/9Nenek19idx//HFt+9FPS0sMfY4sPfogt3H+RNH/veezO3WexueWnSbNLT2Izi49j0wuPkqbmH8Ym7zyITczdTxqfvRe7PXM3dmt6Oenm1FJsbHIxdmNiIen6+Hzs2u07sau35pKu3JyNXR6biV26MZ108fpU7MK1ydj5qxNJ566Mx85evh07c+lW0umLN2OnLozFTp6/kXTi3PXY8bPXYqNnriaNnL4SGz51OTZ08lLS4ImLsWPHL8QGRs8n9Y+ci/UNn431Dp1J6hk8Hes+dirWNXAyqbP/ROxo3/FYR+9o0pGekdjh7uHYoa6hpIOdg7EDR4/F9ncMJO070h/be7gvtudQb9Lugz2xXQe6Yzv3dyW17+uM7dh7NLZ9T0fStt1HYm27Dse27jyUtKX9YGzzjgOx1u37k1q27Ys1t+2NNW3dk9S4ZXds0+ZdsYbWnUn1Le2xuuYdsdqm7Uk1jdti1ZvaYlUNW5Mq67fENtZtjm2obU1aX9MSW1fdHKuoakpaW9kYW7NxU2z1hoak79fXx75bVxf7tqI26Zu1NbFVa6pjK1dXJX39fWXsq+82xr78dkPSF9+sj32+al3ss5UVSZ9+vTb2yVdrYh9/uToGYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEM4Lcb4Pc/HHt3AvBrB/jTD0bfnQD82gF+r+2jdycAAxjAAAYwgAEMYAADGMAALicAAxjAAAYwgAEMYAAXFoABDGAAAxjAAAYwgAEMYACXE4ABDGAAAxjAAAYwgAsLwAAGMIABDGAAAxjAAAYwgMsJwAAGMIABDGAAAxjAhQVgAAMYwAAGMIABDGAAAxjA5QRgAAMYwAAGMIABDODCAjCAAQxgAAMYwAAGMIABDOByAjCAAQxgAAMYwAAGcGEBGMAABjCAAQxgAAMYwAAGcDkBGMAABjCAAQxgAAO4sAAMYAADGMAABjCAAQxgAAO4nAAMYAADGMAABjCAAVxYAAYwgAEMYAADGMAABjCAAVxOAAYwgAEMYAADGMAALiwAAxjAAAYwgAEMYAADGMAALicAAxjAAAYwgAEMYAAXFoABDGAAAxjAAAYwgAEMYACXE4ABDGAAAxjAAAYwgAsLwAAGMIABDGAAAxjAAAYwgMsJwAAGMIABDGAAAxjAhQVgAAMYwAAGMIABDGAAAxjA5QRgAAMYwAAGMIABDODCAjCAAQxgAAMYwAAGMIABDOByAjCAAQxgAAMYwAAGcGEBGMAABjCAAQxgAAMYwAAGcDkBGMAABjCAAQxgAAO4sAAMYAADGMAABjCAAQxgAAO4nAAMYAADGMAABjCAAVxYAAYwgAEMYAADGMAABjCAAVxOAAYwgAEMYAADGMAALiwAAxjAAAYwgAEMYAADGMAALicAAxjAAAYwgAEMYAAXFoABDGAAAxjAAAYwgAEMYACXE4ABDGAAAxjAAAYwgAsLwAAGMIABDGAAAxjAAAYwgMsJwAAGMIABDGAAAxjAhQVgAAMYwAAGMIABDOC3AOCXzS0/TZpdehKbWXwcm154lDQ1/zA2eedBbGLuftL47L3Y7Zm7sVvTy0k3p5ZiY5OLsRsTC0nXx+djr+gF8OsF+GUDo+eT+kfOxfqGz8Z6h84k9QyejnUfOxXrGjiZ1Nl/Ina073iso3c06UjPSOxw93DsUNdQ0sHOwdgregH8egF+WUPrzqT6lvZYXfOOWG3T9qSaxm2x6k1tsaqGrUmV9VtiG+s2xzbUtiatr2mJratujlVUNSWtrWyMvaIXwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDGAAAxjAAAYwgAEMYAADGMAABjCAAQxgAAMYwAAGMIABDOA3C/D/ymC7sia6gA8AAAAASUVORK5CYII="},
    {n:"shortcuts.txt",d:"WmhpamlhbiBzaG9ydGN1dCBxdWljayByZWYKRiBmb2N1cyB8IEUgZWRpdCB8IEEgYW5ub3RhdGUgfCBDIGNvbm5lY3QgfCBKIGp1bXAKVGFiIGNoaWxkIHwgRW50ZXIgc2libGluZyB8IFAgcGVuIHwgTiBub3RlCkN0cmwrRiBzZWFyY2ggfCBDdHJsK1ogdW5kbyB8IEN0cmwrRCBkdXAgfCBEZWwgZGVsZXRl"},
    {n:"ai-quickref.md",d:"IyBaaGlqaWFuQUkgcXVpY2sgcmVmCgp8IG1ldGhvZCB8IHVzZSB8CnwtLS18LS0tfAp8IHNuYXBzaG90IHwgcmVhZCBzdGF0ZSB8CnwgZXhlY3V0ZSB8IHJ1biBvbmUgY29tbWFuZCB8CnwgYnVpbGRDYW52YXMgfCBidWlsZCBjYW52YXMgZnJvbSBwbGFuIHwKCmBgYGpzClpoaWppYW5BSS5leGVjdXRlKHtvcDonc2V0X3N0eWxlJyxzdHlsZToncGFwZXInfSkKYGBgCgooYykgdmVyc2lvbiAxLjE="}
  ];
  function putBlob(id,blob){return new Promise((res,rej)=>{const tx=idb.transaction("files","readwrite");tx.objectStore("files").put(blob,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
    const proj=createProject("织见学堂");
    proj.canvases.splice(0,1);
    const mk=n=>{const c={id:"c"+(uid++),name:n,items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[]};proj.canvases.push(c);return c;};
    const c1=mk("01-设计理念与功能全览");
    const c2=mk("02-基础功能讲解");
    const c3=mk("03-AI协作与skill");
    const c4=mk("04-端到端示例合集");
    const kindOf=n=>n.endsWith(".pdf")?"pdf":n.endsWith(".xlsx")?"sheet":n.endsWith(".docx")?"doc":n.endsWith(".png")?"img":"text";
    const mimeOf=n=>n.endsWith(".pdf")?"application/pdf":n.endsWith(".xlsx")?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":n.endsWith(".docx")?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":n.endsWith(".png")?"image/png":"text/plain";
    const fid={};
    ATT.forEach(f=>{
      const id="f"+(uid++);
      const bytes=atob(f.d);const arr=new Uint8Array(bytes.length);
      for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
      const blob=new Blob([arr],{type:mimeOf(f.n)});
      proj.files.push({id,name:f.n,kind:kindOf(f.n),mime:mimeOf(f.n),size:arr.length,created:Date.now(),url:null,folderId:null,blob});
      fid[f.n]=id;putBlob(id,blob);
    });
    // ===== 画布01 =====
    state.activeProjectId=proj.id; state.activeCanvasId=c1.id;
    const root=addMindNode("织见 · 聚焦 × 连接",null,"#2d5fd3",0,0);
    root.detail="## 先讲个小比喻\n\n想象桌上散落一叠便签：每张写一个想法。\n\n光有便签，它们只是「一堆」。\n**你在两张便签之间画一条线，想法之间才有了关系**——这就是织见的全部秘密。\n\n- **连接 · 织宽**：把便签连成网，看清全局\n- **聚焦 · 钻深**：只看某张便签和它紧邻的那几张，把一点想透\n\n这张画布本身就是示范：你看到的每一条彩色连线，都是真实的「语义连接」。\n\n> 试试看：选中任意节点按 **F** 聚焦，只留下它和它直接相关的东西；再按 **F** 退出。";
    root.annotation="根节点：双击编辑→E 看展开内容→F 聚焦";
    const connT=addMindNode("连接 · 织宽",root.id,"#31a06a",-380,0);
    connT.detail="## 连接：给网以宽度\n\n回到那个比喻——两张便签之间画一条线，上面写一句话：「A 支撑了 B」「C 反驳了 D」。\n\n线不再是装饰，而是**观点**：\n\n- 一条线五种说法：关联 / 支撑 / 导致 / 反证 / 证据\n- 便签可以连便签、想法可以连材料、这一张画布连到另一张画布\n- 线旁边还能贴一句话批注：「我为什么这么连」\n\n织见里，**连线就是思考本身**。";
    connT.annotation="本分支即\u201c连接\u201d的当场示范";
    ["语义连接（C）","批注（A）","跃迁（J）","关联挂接（attach）"].forEach((t,i)=>addMindNode(t,connT.id,undefined,-380,(i-1.5)*80));
    const focusT=addMindNode("聚焦 · 钻深",root.id,"#c04a2a",380,0);
    focusT.detail="## 聚焦：给点以深度\n\n网越织越大，反而看不清了——没关系，**把一盏灯对准一张便签**。\n\n按 F，画布上只留下这张便签和与它直接相连的那几张：\n\n- 无关的东西退到背景里，不被删除、随时回来\n- 便签背后还能藏一页「展开内容」（按 E），把定义、理由、结论写在里面\n- 想找什么？Ctrl+F 像招手，直接把你带到那张便签面前\n\n**先看清全局（连接），再钻透一点（聚焦）**——这就是织见的左右手。";
    focusT.annotation="\u201c聚焦\u201d的说明本身可被聚焦";
    ["聚焦模式（F）","展开内容（E）","批注即结论","搜索（Ctrl+F）"].forEach((t,i)=>addMindNode(t,focusT.id,undefined,380,(i-1.5)*80));
    const grid=addMindNode("功能全览（一张图）",root.id,"#7a55c0",0,460);
    grid.detail="## 功能全览：一张图看懂\n\n下面 4 组，把所有功能摆在一张画布上。\n\n每个功能节点都有一根线，连到它服务的那个理念——**「支撑」连到连接、「支撑」连到聚焦**。\n\n> 顺着线读一遍，你就明白了：基础组打底，结构组织网，进阶组调味，AI 组请外援。\n\n没有一根线是多余的——**线本身就是教学**。";
    const g1=addMindNode("基础组",grid.id,"#2d5fd3",-520,460);
    ["画布操作与缩放","节点与层级","便签与文本","材料卡片与附件"].forEach((t,i)=>addMindNode(t,g1.id,undefined,-520,460+(i-1.5)*90));
    const g2=addMindNode("结构组",grid.id,"#31a06a",-180,460);
    ["语义连接","批注与展开","关联挂接","跃迁导航"].forEach((t,i)=>addMindNode(t,g2.id,undefined,-180,460+(i-1.5)*90));
    const g3=addMindNode("进阶组",grid.id,"#e0902a",180,460);
    ["布局与样式","聚焦与搜索","项目管理","导出与备份"].forEach((t,i)=>addMindNode(t,g3.id,undefined,180,460+(i-1.5)*90));
    const g4=addMindNode("AI 协作组",grid.id,"#c04a2a",520,460);
    const ai1=addMindNode("AI 接口（v1.1）",g4.id,undefined,520,460); ai1.jumpTo={canvasId:c3.id}; ai1.annotation="↗ 跃迁到 03 画布";
    const ai2=addMindNode("zhijian skill",g4.id,undefined,520,540); ai2.jumpTo={canvasId:c3.id}; ai2.annotation="↗ 跃迁到 03";
    const ai3=addMindNode("端到端示例",g4.id,undefined,520,620); ai3.jumpTo={canvasId:c4.id}; ai3.annotation="↗ 跃迁到 04";
    const path=addMindNode("学习路径",root.id,"#5b8def",0,-300);
    ["01 理念全览","02 基础功能","03 AI 协作","04 端到端示例"].forEach((t,i)=>{const n=addMindNode(t,path.id,undefined,0,-300-(i+1)*70);if(i===1)n.jumpTo={canvasId:c2.id};if(i===2)n.jumpTo={canvasId:c3.id};if(i===3)n.jumpTo={canvasId:c4.id};});
    const byT=(c,t)=>c.items.find(i=>i.text===t);
    const link=(c,a,b,t,ann)=>{const na=byT(c,a),nb=byT(c,b);if(!na||!nb)return;const l={id:"lnk"+(uid++),aId:na.id,bId:nb.id,relationType:t,directional:!!(t==="supports"||t==="causes"||t==="contradicts"),annotation:ann||""};c.links.push(l);return l;};
    link(c1,"语义连接（C）","连接 · 织宽","supports","连接类功能支撑\u201c织宽\u201d");
    link(c1,"批注（A）","连接 · 织宽","supports","批注让连接有语义");
    link(c1,"跃迁（J）","连接 · 织宽","supports","跨画布延伸网");
    link(c1,"聚焦模式（F）","聚焦 · 钻深","supports","聚焦服务\u201c钻深\u201d");
    link(c1,"展开内容（E）","聚焦 · 钻深","supports","展开让点可看透");
    link(c1,"搜索（Ctrl+F）","聚焦 · 钻深","supports","搜索定位钻深入口");
    const note=(x,y,t,col,detail)=>{const n=addNote(x,y,t,col);if(detail)n.detail=detail;return n;};
    note(0,-520,"💡 提示：教程即作品\n\n这些节点之间的彩色连线，就是你要学的\u201c语义连接\u201d。把鼠标移到线上按 A 可加批注。","#fef3c7","**便签示范**：便签承载发散性想法。本教程的便签都是\u201c学习提示\u201d，不占用节点层级。");
    const fcPNG=addFileCard(0,760,fid["layout-map.png"]); fcPNG.annotation="PNG 附件：理念布局示意图";
    note(0,860,"📎 附件示范：下方是 PNG 图片，点击卡片即可形变展开预览。","#e3f2fd");
    // ===== 画布02 =====
    state.activeCanvasId=c2.id;
    const r2=addMindNode("基础功能讲解",null,"#2d5fd3",0,0);
    r2.detail="## 上手指南：一张画布讲透基础\n\n这里不列说明书，只带你走一遍日常动作：\n\n- 左边分支：**怎么摆画布**（平移、缩放、看清全貌）\n- 中间分支：**怎么搭结构**（节点、便签、材料）\n- 右边分支：**怎么连关系、怎么调布局**\n- 最右：**快捷键速查**用附件承载，随取随看\n\n每个分支根部都有一句蓝字批注——先读批注，再看细节。\n\n> 边看边试最有效：照分支顺序点一遍，你就是熟手了。";
    r2.annotation="五段式模板：功能简介→操作步骤→参数→FAQ→示例";
    const mk2=(t,x,ann,detail)=>{const n=addMindNode(t,r2.id,"#5b8def",x,0);if(ann)n.annotation=ann;if(detail)n.detail=detail;return n;};
    const b1=mk2("画布操作",-680,"平移/缩放/适应全部","左键拖动平移；滚轮缩放；触控板双指平移。左上角缩放区可点击重置 100%。");
    ["平移画布","滚轮/双指缩放","适应全部内容","左下角 HUD"].forEach((t,i)=>addMindNode(t,b1.id,undefined,-680,(i-1.5)*90));
    const b2=mk2("节点与层级",-430,"Tab 子级 / Enter 同级","导图是网的骨架：4 级视觉降级、折叠处理大分支。");
    ["Tab 新建子级","Enter 新建同级","Alt+↑↓ 排序","Alt+←→ 提降级","折叠/展开子树"].forEach((t,i)=>addMindNode(t,b2.id,undefined,-430,(i-2)*80));
    const b3=mk2("便签与文本",-180,"N 便签模式","便签承载发散想法：支持 Markdown 富文本。");
    ["便签模式（N）","7 色便签","Markdown 富文本","便签形变编辑"].forEach((t,i)=>addMindNode(t,b3.id,undefined,-180,(i-1.5)*90));
    const b4=mk2("材料与附件",70,"导入→预览→外部打开","材料库接收文件/文件夹/链接；卡片点击形变预览。");
    ["材料库导入","卡片形变预览","PDF/Word/表格/图片","网页预览工具栏","外部应用打开"].forEach((t,i)=>addMindNode(t,b4.id,undefined,70,(i-2)*85));
    const b5=mk2("连接与批注",320,"C 连接 · A 批注 · E 展开","5 种语义关系类型，元素自带展开内容。");
    ["C 键语义连接","关联挂接（attach）","A 键批注","E 展开内容（detail）"].forEach((t,i)=>addMindNode(t,b5.id,undefined,320,(i-1.5)*90));
    const b6=mk2("布局样式背景",570,"7 布局 / 5 样式 / 背景独立","布局管结构，样式管质感，背景管环境——三件事分开调。");
    ["7 种布局","5 套全局样式","背景颜色与纹理","沉浸模式（F11）"].forEach((t,i)=>addMindNode(t,b6.id,undefined,570,(i-1.5)*90));
    const b7=mk2("快捷键速查",820,"附件承载快捷键表","全量快捷键以附件呈现——点击卡片形变预览。");
    const kbF=state.files.find(f=>f.name==="shortcuts.txt");
    const kb=addFileCard(820,80,kbF.id); kb.annotation="TXT 附件：快捷键速查";
    note(820,180,"📄 其他附件：shortcut-table.xlsx / weavision-intro.docx 可自行拖入画布试预览。","#e3f2fd");
    const b8=mk2("常见问题 FAQ",1070,"反证 → 易错点","常见问题用「反证」连接标出易错处。");
    const q1=addMindNode("卡顿/预览白屏怎么办",b8.id,undefined,1070,0); q1.detail="**预览白屏**：多为 CDN 组件未加载（docx/pdf 预览需联网或 assets/vendor）。";
    const q2=addMindNode("图片加载不出",b8.id,undefined,1070,90); q2.detail="远程图片被防盗链时，织见会用携带 Referer 的策略加载；仍失败可在新窗口打开。";
    const q3=addMindNode("如何备份",b8.id,undefined,1070,180); q3.detail="顶栏导出 .board.json 即可完整备份画布结构、关系与材料索引。";
    link(c2,"Tab 新建子级","Alt+↑↓ 排序","supports","先建结构再调顺序");
    link(c2,"Alt+↑↓ 排序","折叠/展开子树","supports","大分支先折叠再浏览");
    link(c2,"材料库导入","卡片形变预览","causes","导入后即得预览");
    link(c2,"卡顿/预览白屏怎么办","快捷键速查","contradicts","遇到问题先查速查表");
    // ===== 画布03 =====
    state.activeCanvasId=c3.id;
    const r3=addMindNode("AI 协作与 skill",null,"#7a55c0",0,0);
    r3.detail="## AI 协作：把画布交给 AI 去搭\n\n场景：你有一份材料，懒得自己一个个节点敲——**让 AI 来**。\n\n织见给同页面的 AI 留了个后门：\n\n```js\nwindow.ZhijianAI\n```\n\n按一、二、三、四步走：\n\n1. **看一眼现状**：snapshot()\n2. **把材料喂给它**：你的源文件\n3. **下订单**：buildCanvas(plan) 一句话生成\n4. **补两根线**：用返回的 aliases 加连接\n\n就像雇了个懂行的助手——它不动你的本地文件，只在这张画布上干活。\n\n> 命令速查在附件里（PDF 和 Markdown 各一份），卡片点击即可预览。";
    r3.annotation="复杂功能单独一张画布讲透";
    const mk3=(t,x,ann,detail)=>{const n=addMindNode(t,r3.id,"#7a55c0",x,0);if(ann)n.annotation=ann;if(detail)n.detail=detail;return n;};
    const s1=mk3("1 功能简介",-620,"ZhijianAI 是什么","本地命令接口，不读本地路径，只操作画布数据模型。");
    ["对象：snapshot/execute/buildCanvas","版本 v1.1","skill 四件套"].forEach((t,i)=>addMindNode(t,s1.id,undefined,-620,(i-1)*80));
    const s2=mk3("2 操作步骤",-360,"四步接入","snapshot→读源→build→aliases 补关系");
    ["Step1 snapshot() 读快照","Step2 读取授权源文件","Step3 buildCanvas(plan)","Step4 用 aliases 补 relate"].forEach((t,i)=>{const n=addMindNode(t,s2.id,undefined,-360,(i-1.5)*85);n.annotation=i===0?"F12 控制台执行":i===3?"返回的 aliases 映射 key→真实 id":"";});
    link(c3,"Step1 snapshot() 读快照","Step2 读取授权源文件","supports","先看清再动手");
    link(c3,"Step2 读取授权源文件","Step3 buildCanvas(plan)","supports","材料齐备再生成");
    link(c3,"Step3 buildCanvas(plan)","Step4 用 aliases 补 relate","supports","生成后再细化连接");
    const s3=mk3("3 关键参数",-100,"27 命令 + plan schema","附件承载命令速查与 plan 结构。");
    const fPdf=addFileCard(-100,80,fid["AI-Quick-Ref.pdf"]); fPdf.annotation="PDF 附件：AI 命令速查";
    const fMd=addFileCard(-100,180,fid["ai-quickref.md"]); fMd.annotation="MD 附件：接口速查（Markdown 渲染）";
    addMindNode("execute 27 命令",s3.id,undefined,-100,0); addMindNode("buildCanvas plan schema",s3.id,undefined,-100,280);
    const s4=mk3("4 常见问题",160,"{ok:false} 排查","命令返回 {ok:false,error} 时按此排查。");
    const q31=addMindNode("命令拼写/大小写",s4.id,undefined,160,0); q31.detail="op 是命令名如 set_style，注意下划线与大小写。";
    const q32=addMindNode("ID 解析失败",s4.id,undefined,160,90); q32.detail="先 snapshot() 拿到真实 id 再引用，不要臆造。";
    const q33=addMindNode("接口不可用",s4.id,undefined,160,180); q33.detail="请确认页面已完整加载（window.ZhijianAI 在脚本尾部挂载）。";
    link(c3,"ID 解析失败","Step1 snapshot() 读快照","contradicts","先快照再引用");
    const s5=mk3("5 使用示例",420,"控制台三连","在 F12 控制台依次执行。");
    const ex1=addMindNode("snapshot() → 看输出",s5.id,undefined,420,0);
    const ex2=addMindNode("set_style paper",s5.id,undefined,420,90); ex2.detail="ZhijianAI.execute({op:\u0027set_style\u0027,style:\u0027paper\u0027}) → 拟物手作风格+手写字体";
    const ex3=addMindNode("buildCanvas(小计划)",s5.id,undefined,420,180); ex3.detail="plan.nodes/notes/relations 一键生成画布";
    link(c3,"set_style paper","buildCanvas(小计划)","supports","AI 也能切样式与建画布");
    // ===== 画布04 =====
    state.activeCanvasId=c4.id;
    const r4=addMindNode("端到端示例合集",null,"#c04a2a",0,0);
    r4.detail="## 三个实战：看别人怎么用\n\n理论讲完了，来看看真实场景怎么落地：\n\n- **示例A · 零基础上手**：从打开画布到做出第一张小网，十分钟\n- **示例B · AI 生成思维导图**：一份报告，AI 自动搭好结构，你负责验收\n- **示例C · 多材料因果链**：把研报、访谈、数据拖进来，连成一条证据链（投资人的工作方式）\n\n每条路线都用「支撑」箭头串联——**顺着箭头走，一步都不会迷路**。";
    r4.annotation="示例即验收：跟着走一遍等于会用了";
    const mk4=(t,x,ann,detail)=>{const n=addMindNode(t,r4.id,"#c04a2a",x,0);if(ann)n.annotation=ann;if(detail)n.detail=detail;return n;};
    const eA=mk4("示例A 零基础上手",-560,"入口→动手→收尾","从理念到做出第一张小网。");
    const eA_steps=["打开教程 01 画布","看理念双分支","动手：双击建 5 个节点","Tab 加子级","C 键连接成网","F 聚焦查看","Ctrl+Z 撤销体验"];
    eA_steps.forEach((t,i)=>{const n=addMindNode(t,eA.id,undefined,-560,(i-3)*78);n.annotation=i===0?"F12 也可以：ZhijianAI.snapshot()":i===4?"选中两个节点按 C":"F 再按 F 退出";});
    for(let i=0;i<eA_steps.length-1;i++)link(c4,eA_steps[i],eA_steps[i+1],"supports","步骤推进");
    const eB=mk4("示例B AI 生成思维导图",-160,"报告 → AI 建画布","把一份报告交给 AI，几分钟得到结构化画布。");
    ["准备报告附件（见 03）","snapshot 确认环境","写 buildCanvas plan","执行并得到 aliases","结果截图对比手建"].forEach((t,i)=>addMindNode(t,eB.id,undefined,-160,(i-2)*85));
    link(c4,"准备报告附件（见 03）","snapshot 确认环境","supports","先看再看手");
    link(c4,"snapshot 确认环境","写 buildCanvas plan","supports","环境就绪再规划");
    link(c4,"写 buildCanvas plan","执行并得到 aliases","supports","计划即命令");
    link(c4,"执行并得到 aliases","结果截图对比手建","supports","产出对比验收");
    const eC=mk4("示例C 多材料因果链",240,"研报/访谈/数据 → 证据链","投资研判式用法：多材料汇成因果链。");
    ["拖入研报/访谈/数据卡片","E 展开写判断","C 连接证据/反证","F 聚焦单个因子","J 跃迁到 AI 总览对照"].forEach((t,i)=>addMindNode(t,eC.id,undefined,240,(i-2)*85));
    link(c4,"拖入研报/访谈/数据卡片","E 展开写判断","supports","材料先落画布再判断");
    link(c4,"E 展开写判断","C 连接证据/反证","supports","判断连成证据");
    link(c4,"F 聚焦单个因子","J 跃迁到 AI 总览对照","supports","局部→全局切换");
    // ===== 收尾 =====
    state.activeCanvasId=c1.id;
    syncUid();
    renderSidePanel();
    saveCurrentCanvas();
    /* 教程是结构化导图，不能只做“碰撞后推开”。逐画布走同一套树形排版，
       为分支、批注和连线留出通道，避免步骤节点继续堆在母节点上下。 */
    for(const c of [c1,c2,c3,c4]){
      state.activeCanvasId=c.id;
      applyAutoLayout();
      c.layoutVersion=3;
    }
    state.activeCanvasId=c1.id;
    saveState();
    fitAll();
}
/* 仅升级内置教程的历史坐标：用户自行创建的画布绝不自动改位。 */
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
  });
  window.addEventListener("resize",resize);
  window.addEventListener("beforeunload",saveState);
  setInterval(saveState,30000);
  /* D1: load saved logo preference */
  var savedLogo=parseInt(localStorage.getItem("zhijian-logo"))||1;
  applyLogo(savedLogo);
}
init();
/* ResizeObserver 持续监听 board 尺寸变化（CSS transition/窗口变化/响应式折叠都覆盖） */

/* D1: Settings modal */
function showSettings(){
  showModal("设置",null,[
    {label:"关闭",onClick:function(){}}
  ]);
  var box=document.querySelector(".modal-box");
  var body=box.querySelector(".modal-body");
  body.innerHTML='<div style="padding:8px 0"><div style="font-size:11px;font-weight:700;color:var(--ink-dim);margin-bottom:12px;letter-spacing:.08em;text-transform:uppercase;font-family:var(--font)">应用图标</div><div style="display:flex;gap:12px" id="logoChoices"></div></div>';
  var choices=document.getElementById("logoChoices");
  for(var n=1;n<=3;n++){
    (function(num){
      var preset=LOGO_PRESETS[num];
      var isDark=document.documentElement.getAttribute("data-theme")==="dark";
      var item=document.createElement("div");
      item.style.cssText="flex:1;cursor:pointer;padding:12px;border:2px solid "+(logoPreset===num?"var(--accent)":"var(--card-border)")+";border-radius:12px;text-align:center;transition:all .15s ease";
      item.innerHTML='<img src="'+(isDark?preset.dark:preset.light)+'" style="width:48px;height:48px;object-fit:contain;margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:'+(logoPreset===num?"var(--accent)":"var(--ink-dim)")+'">'+preset.label+'</div>';
      item.addEventListener("click",function(){applyLogo(num);showSettings();});
      item.addEventListener("mouseenter",function(){if(logoPreset!==num){item.style.borderColor="rgba(45,95,211,.2)";item.style.background="var(--accent-soft)";}});
      item.addEventListener("mouseleave",function(){if(logoPreset!==num){item.style.borderColor="var(--card-border)";item.style.background="transparent";}});
      choices.appendChild(item);
    })(n);
  }
}

if(typeof ResizeObserver!=="undefined"){
  new ResizeObserver(()=>{resize();}).observe(board);
}
