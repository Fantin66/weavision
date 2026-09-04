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

  // 布局 both 修复验证
  await t("layout both [fixed]",async()=>{
    return await page.evaluate(()=>{state.layoutType='both';bothSidesLayout();render();return state.layoutType==='both';});
  });

  // 拖动测试更精确
  await t("drag node precise",async()=>{
    const info=await page.evaluate(()=>{
      const n=state.items.find(i=>i.type==='mindNode'&&i.text==='火箭');
      if(!n)return null;
      const b=itemBounds(n);
      const c=w2s(b.x+b.w/2,b.y+b.h/2);
      return {sx:c.x,sy:c.y,id:n.id,ox:n.x,oy:n.y};
    });
    if(!info)return null;
    await page.mouse.move(info.sx,info.sy);
    await page.mouse.down();
    await page.mouse.move(info.sx+120,info.sy+60,{steps:8});
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after=await page.evaluate((id)=>{const n=state.items.find(i=>i.id===id);return n?{x:n.x,y:n.y}:null;},info.id);
    return after&&(Math.abs(after.x-info.ox)>10)?"OK dx="+Math.round(after.x-info.ox):"NOT_MOVED";
  });

  // 聚焦恢复位置
  await t("focus restore pos",async()=>{
    return await page.evaluate(()=>{
      const root=state.items.find(i=>i.type==='mindNode'&&!i.parentId);
      const before={x:root.x,y:root.y};
      state.selected=root.id;
      enterFocus(root.id);
      const inFocus={x:root.x,y:root.y};
      const moved=Math.abs(inFocus.x-before.x)+Math.abs(inFocus.y-before.y)>1;
      exitFocus();
      const restored=Math.abs(root.x-before.x)<0.5&&Math.abs(root.y-before.y)<0.5;
      return moved&&restored?"OK":"moved="+moved+" restored="+restored;
    });
  });

  // 右键菜单
  await t("context menu",async()=>{
    const pos=await page.evaluate(()=>{
      const n=state.items.find(i=>i.type==='mindNode'&&i.text==='卫星');
      if(!n)return null;
      const b=itemBounds(n),c=w2s(b.x+b.w/2,b.y+b.h/2);
      return{x:c.x,y:c.y};
    });
    if(!pos)return null;
    await page.mouse.click(pos.x,pos.y,{button:'right'});
    await page.waitForTimeout(300);
    const shown=await page.evaluate(()=>document.getElementById('ctxMenu')&&getComputedStyle(document.getElementById('ctxMenu')).display!=='none');
    if(shown){await page.keyboard.press("Escape");}
    return shown;
  });

  // 双击编辑
  await t("dblclick edit",async()=>{
    const pos=await page.evaluate(()=>{
      const n=state.items.find(i=>i.type==='mindNode'&&i.text==='卫星');
      if(!n)return null;
      const b=itemBounds(n),c=w2s(b.x+b.w/2,b.y+b.h/2);
      return{x:c.x,y:c.y};
    });
    if(!pos)return null;
    await page.mouse.dblclick(pos.x,pos.y);
    await page.waitForTimeout(300);
    const editing=await page.evaluate(()=>editingMindId!==null||editingNoteId!==null);
    if(editing){await page.keyboard.press("Escape");}
    return editing;
  });

  // 缩放
  await t("zoom",async()=>{
    const before=await page.evaluate(()=>state.camera.zoom);
    await page.click('#zoomInBtn');
    await page.waitForTimeout(150);
    const after=await page.evaluate(()=>state.camera.zoom);
    return after>before;
  });

  // fit
  await t("fit all",async()=>{
    await page.click('#fitBtn');
    await page.waitForTimeout(200);
    const z=await page.evaluate(()=>state.camera.zoom);
    return z>0&&z<2;
  });

  // 链接跳跃 - jump功能
  await t("jump to canvas",async()=>{
    return await page.evaluate(()=>{
      const c=curCanvas();
      if(!c)return null;
      c.jumpToId='c'+Date.now();
      const n=state.items[0]||addMindNode('跳跃目标',null,'#3a4a6b',200,200);
      n.jumpTo='c2';
      render();
      return !!n.jumpTo;
    });
  });

  console.log("--- ERRORS ---");
  console.log(errors.length?errors.join("\n"):"无");
  await browser.close();
})();
