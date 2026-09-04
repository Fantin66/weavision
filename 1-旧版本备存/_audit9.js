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

  // 1. detail 动画: 展开-收起连续操作
  await t("detail anim toggle",async()=>{
    return await page.evaluate(()=>{
      const n=state.items.find(i=>i.type==='mindNode');
      n.detail='# 标题\n- 列表1\n- 列表2\n\n正文内容测试';
      expandDetailInPlace(n);
      render();
      const open1=detailItemId===n.id;
      collapseDetailInPlace();
      render();
      const open2=detailItemId===null;
      return open1&&open2;
    });
  });

  // 2. 缩放控件值显示一致
  await t("zoom pct display",async()=>{
    await page.click('#zoomInBtn');
    await page.waitForTimeout(200);
    const z=await page.evaluate(()=>state.camera.zoom);
    const pct=await page.evaluate(()=>document.getElementById('zoomPct')?.textContent);
    const expect=Math.round(z*100)+'%';
    return pct===expect?"OK "+pct:"FAIL "+pct+" vs "+expect;
  });

  // 3. 菜单 Esc 后状态清理
  await t("menu esc cleanup",async()=>{
    await page.click('[data-menu="add"]');
    await page.waitForTimeout(150);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const still=await page.evaluate(()=>document.getElementById('menuDrop').classList.contains('show'));
    return !still;
  });

  // 4. Ctrl+Z 撤销移动
  await t("undo move",async()=>{
    const info=await page.evaluate(()=>{
      const n=state.items.find(i=>i.type==='mindNode'&&i.text==='卫星');
      if(!n)return null;
      const b=itemBounds(n),c=w2s(b.x+b.w/2,b.y+b.h/2);
      const r=document.querySelector('canvas').getBoundingClientRect();
      return {sx:r.left+c.x,sy:r.top+c.y,id:n.id,ox:n.x,oy:n.y};
    });
    if(!info)return null;
    await page.mouse.move(info.sx,info.sy);
    await page.mouse.down();
    await page.mouse.move(info.sx+80,info.sy+40,{steps:5});
    await page.mouse.up();
    await page.waitForTimeout(200);
    const moved=await page.evaluate((id)=>{const n=state.items.find(i=>i.id===id);return{x:n.x,y:n.y};},info.id);
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);
    const afterUndo=await page.evaluate((id)=>{const n=state.items.find(i=>i.id===id);return{x:n.x,y:n.y};},info.id);
    return Math.abs(moved.x-info.ox)>5&&Math.abs(afterUndo.x-info.ox)<1?"OK":"movedX="+Math.round(moved.x-info.ox)+" undoX="+Math.round(afterUndo.x-info.ox);
  });

  // 5. 画布切换后 items 正确
  await t("canvas switch items",async()=>{
    return await page.evaluate(()=>{
      const p=curProject();
      const c2={id:'c'+(++uid),name:'空画布',items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[]};
      p.canvases.push(c2);
      const old=state.activeCanvasId;
      switchCanvas(c2.id);
      const empty=state.items.length===0;
      switchCanvas(old);
      const restored=state.items.length>0;
      return empty&&restored;
    });
  });

  // 6. 批注编辑弹窗取消
  await t("annotation cancel",async()=>{
    await page.evaluate(()=>{const n=state.items.find(i=>i.type==='mindNode');state.selected=n.id;});
    await page.keyboard.press("a");
    await page.waitForTimeout(200);
    const shown=await page.evaluate(()=>document.getElementById('modal')?.classList.contains('show'));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const closed=await page.evaluate(()=>!document.getElementById('modal')?.classList.contains('show'));
    return shown&&closed;
  });

  // 7. 文件卡片创建
  await t("file card",async()=>{
    return await page.evaluate(()=>{
      const fc=addFileCard(600,600,'file1');
      return !!fc&&fc.type==='fileCard';
    });
  });

  // 8. 多画布时状态隔离
  await t("state isolation",async()=>{
    return await page.evaluate(()=>{
      const p=curProject();
      if(p.canvases.length<2){
        const c={id:'c'+(++uid),name:'隔离测试',items:[],camera:{x:0,y:0,zoom:1},previews:[],links:[]};
        p.canvases.push(c);
      }
      const old=state.activeCanvasId;
      // 在旧画布加东西
      const oldCan=curCanvas();
      const marker={id:'m1',type:'note',x:1,y:1,w:50,h:50,text:'marker',color:'#fff'};
      oldCan.items.push(marker);
      switchCanvas(p.canvases[1].id);
      const hasMarker=state.items.some(i=>i.id==='m1');
      switchCanvas(old);
      return !hasMarker; // 新画布不应有旧画布的item
    });
  });

  console.log("--- ERRORS ---");
  console.log(errors.length?errors.join("\n"):"无");
  await browser.close();
})();
