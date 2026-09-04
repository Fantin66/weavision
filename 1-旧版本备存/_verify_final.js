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

  // 验证 bothSidesLayout 完整运行，检查节点位置合理
  const r=await page.evaluate(()=>{
    state.layoutType='both';
    bothSidesLayout();
    render();
    const nodes=state.items.filter(i=>i.type==='mindNode');
    // 检查所有节点位置是否有限
    const bad=nodes.filter(n=>!isFinite(n.x)||!isFinite(n.y)||n.x===undefined||n.y===undefined);
    // 检查是否有重叠（粗略）
    let overlaps=0;
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=itemBounds(nodes[i]),b=itemBounds(nodes[j]);
        const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
        const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
        if(ox>4&&oy>4)overlaps++;
      }
    }
    return {total:nodes.length,bad:bad.length,overlaps};
  });
  console.log("BOTH LAYOUT:",JSON.stringify(r));

  // 再验证 radial
  const r2=await page.evaluate(()=>{
    state.layoutType='radial';
    radialLayout();
    render();
    const nodes=state.items.filter(i=>i.type==='mindNode');
    const bad=nodes.filter(n=>!isFinite(n.x)||!isFinite(n.y));
    let overlaps=0;
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=itemBounds(nodes[i]),b=itemBounds(nodes[j]);
        const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
        const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
        if(ox>4&&oy>4)overlaps++;
      }
    }
    return {total:nodes.length,bad:bad.length,overlaps};
  });
  console.log("RADIAL LAYOUT:",JSON.stringify(r2));

  // 恢复到右侧布局
  const r3=await page.evaluate(()=>{
    state.layoutType='right';
    autoLayout();
    render();
    return 'restored';
  });
  console.log("RIGHT LAYOUT:",r3);
  console.log("ERRORS:",errors.length?errors.join("\n"):"无");
  await browser.close();
})();
