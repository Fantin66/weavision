const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e).slice(0,150)));
  await page.goto("file:///D:/Documents/WorkBuddy/Interest/织见-思维关系板.html");
  await page.evaluate(()=>localStorage.removeItem('board-state'));
  await page.reload();
  await page.waitForTimeout(4000);
  const r=await page.evaluate(()=>{
    const nodes=state.items.filter(i=>i.type==='mindNode').map(n=>n.color);
    return JSON.stringify({MIND:MIND_COLORS, LINE:LINE_COLORS, seedNodes:[...new Set(nodes)], hasTeal:!!nodes.find(c=>c==='#0f8aa0'), hasBlue:!!nodes.find(c=>c==='#2d5fd3')});
  });
  console.log("RESULT:",r);
  console.log("ERRORS:",errors.length?errors.join("\n"):"无");
  await browser.close();
})();
