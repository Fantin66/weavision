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

  // 检查"火箭"节点是否在视口内
  const info=await page.evaluate(()=>{
    const n=state.items.find(i=>i.type==='mindNode'&&i.text==='火箭');
    if(!n)return null;
    const b=itemBounds(n);
    const c=w2s(b.x+b.w/2,b.y+b.h/2);
    return {wx:n.x,wy:n.y,worldW:b.w,worldH:b.h,sx:c.x,sy:c.y,zoom:state.camera.zoom,camX:state.camera.x,camY:state.camera.y};
  });
  console.log("NODE INFO:",JSON.stringify(info));

  // 检查 hitTest 在此位置命中什么
  const hit=await page.evaluate(()=>{
    const n=state.items.find(i=>i.type==='mindNode'&&i.text==='火箭');
    const b=itemBounds(n);
    const h=hitTest(b.x+b.w/2,b.y+b.h/2);
    return h?{id:h.id,type:h.type,text:h.text}:null;
  });
  console.log("HITTEST:",JSON.stringify(hit));

  // 在屏幕坐标点击拖动
  if(info){
    await page.mouse.move(info.sx,info.sy);
    await page.mouse.down();
    await page.waitForTimeout(100);
    // 检查 drag 状态
    const dragState=await page.evaluate(()=>({mode:drag?.mode,itemId:drag?.item?.id,itemText:drag?.item?.text}));
    console.log("DRAG BEFORE:",JSON.stringify(dragState));
    await page.mouse.move(info.sx+150,info.sy+80,{steps:10});
    await page.waitForTimeout(200);
    const dragMid=await page.evaluate(()=>({mode:drag?.mode,itemId:drag?.item?.id}));
    console.log("DRAG MID:",JSON.stringify(dragMid));
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after=await page.evaluate(()=>{
      const n=state.items.find(i=>i.type==='mindNode'&&i.text==='火箭');
      return n?{x:n.x,y:n.y}:null;
    });
    console.log("AFTER:",JSON.stringify(after),"orig:",JSON.stringify({x:info.wx,y:info.wy}));
  }
  console.log("ERRORS:",errors.length?errors.join("\n"):"无");
  await browser.close();
})();
