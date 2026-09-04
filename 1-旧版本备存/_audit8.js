const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on("pageerror",e=>errors.push("PAGEERROR: "+String(e).slice(0,250)));
  await page.goto("file:///D:/Documents/WorkBuddy/Interest/织见-思维关系板.html");
  await page.evaluate(()=>localStorage.removeItem('board-state'));
  await page.reload();
  await page.waitForTimeout(4000);

  async function t(name,fn){
    try{const r=await fn();console.log(name+":",r===true?"OK":(r===false?"FAIL":JSON.stringify(r)));}
    catch(e){console.log(name+": EXCEPTION "+String(e).slice(0,200));}
  }

  // 聚焦重排细节 - 检查子节点是否移动
  await t("focus moves kids",async()=>{
    return await page.evaluate(()=>{
      const root=state.items.find(i=>i.type==='mindNode'&&!i.parentId);
      const kid=state.items.find(i=>i.type==='mindNode'&&i.parentId===root.id);
      if(!kid)return null;
      const before={x:kid.x,y:kid.y};
      state.selected=root.id;
      enterFocus(root.id);
      const after={x:kid.x,y:kid.y};
      const moved=Math.abs(after.x-before.x)+Math.abs(after.y-before.y)>1;
      exitFocus();
      const restored=Math.abs(kid.x-before.x)<1&&Math.abs(kid.y-before.y)<1;
      return moved&&restored?"OK moved="+moved:"moved="+moved+" restored="+restored;
    });
  });

  // 批注显示
  await t("annotation render",async()=>{
    return await page.evaluate(()=>{
      const n=state.items.find(i=>i.type==='mindNode');
      n.annotation='测试批注';
      render();
      return n.annotation==='测试批注';
    });
  });

  // detail 展开
  await t("detail toggle",async()=>{
    return await page.evaluate(()=>{
      const n=state.items.find(i=>i.type==='mindNode');
      n.detail='# 标题\n内容';
      toggleDetailInPlace(n);
      const open=detailItemId===n.id;
      toggleDetailInPlace(n);
      return open;
    });
  });

  // 资源库渲染
  await t("file sidebar",async()=>{
    const has=await page.evaluate(()=>{
      const sl=getSideLibrary();
      return !!sl;
    });
    return has;
  });

  // 画布切换
  await t("canvas switch",async()=>{
    return await page.evaluate(()=>{
      const p=curProject();
      if(!p||p.canvases.length<2){
        // 创建新画布
        const c={id:'c'+(++uid),name:'新画布',items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[]};
        p.canvases.push(c);
      }
      const old=state.activeCanvasId;
      switchCanvas(p.canvases[1].id);
      const sw=state.activeCanvasId!==old;
      // 切回
      switchCanvas(old);
      return sw;
    });
  });

  // 快捷键检查
  await t("hotkeys",async()=>{
    const keys=await page.evaluate(()=>{
      return Object.keys(KEYS||{}).join(',')||'no KEYS';
    });
    return keys;
  });

  // 导出/导入按钮
  await t("export btn",async()=>{
    const has=await page.evaluate(()=>!!document.getElementById('exportBtn'));
    return has;
  });

  // 检查拼写/未定义引用
  await t("undefined vars scan",async()=>{
    return await page.evaluate(()=>{
      // 尝试调用一组常见函数确认都存在
      const fns=['render','saveState','loadState','fitAll','smartPlace','addMindNode','addNote','addFileCard','toggleLink','openJump','openAnnotation','toggleFocus','openDetail','closeDetail','autoLayout','radialLayout','bothSidesLayout','avoidOverlap','localAvoid','hitTest','itemBounds','curProject','curCanvas','switchCanvas','renderSidePanel','syncUid','applyTheme','darkenColor','dc'];
      const missing=fns.filter(f=>typeof window[f]==='undefined'&&!eval('typeof '+f+'!=="undefined"'));
      return missing.length?missing.join(','):'all defined';
    });
  });

  console.log("--- ERRORS ---");
  console.log(errors.length?errors.join("\n"):"无");
  await browser.close();
})();
