const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto("file:///D:/Documents/WorkBuddy/Interest/织见-思维关系板.html");
  await page.evaluate(()=>localStorage.removeItem('board-state'));
  await page.reload();
  await page.waitForTimeout(4000);

  // canvas rect vs w2s 计算
  const rect=await page.evaluate(()=>{
    const r=document.querySelector('canvas').getBoundingClientRect();
    const n=state.items.find(i=>i.type==='mindNode'&&i.text==='火箭');
    const b=itemBounds(n);
    const c=w2s(b.x+b.w/2,b.y+b.h/2);
    return {rect:{left:r.left,top:r.top,w:r.width,h:r.height},w2s:c,clientX:r.left+c.x,clientY:r.top+c.y};
  });
  console.log("RECT+POS:",JSON.stringify(rect));

  // 用 clientX/clientY 拖动
  await page.mouse.move(rect.clientX,rect.clientY);
  await page.mouse.down();
  await page.waitForTimeout(100);
  const dragState=await page.evaluate(()=>({mode:drag?.mode,itemText:drag?.item?.text}));
  console.log("DRAG:",JSON.stringify(dragState));
  await page.mouse.move(rect.clientX+150,rect.clientY+80,{steps:10});
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after=await page.evaluate(()=>{
    const n=state.items.find(i=>i.type==='mindNode'&&i.text==='火箭');
    return n?{x:n.x,y:n.y}:null;
  });
  console.log("AFTER:",JSON.stringify(after));
  await browser.close();
})();
