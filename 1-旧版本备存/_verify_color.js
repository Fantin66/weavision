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

  // 1. 种子节点颜色
  const seedColors=await page.evaluate(()=>{
    const nodes=state.items.filter(i=>i.type==='mindNode');
    return nodes.map(n=>n.color);
  });
  console.log("SEED NODE COLORS:",JSON.stringify(seedColors));
  const ok1=seedColors.every(c=>!/#(2a8a9a|4a9a5a|8a5a9a|d48840|c5483a)/.test(c));
  console.log("1.SEED COLORS NEW:",ok1?"OK":"FAIL");

  // 2. 便签颜色
  const noteColors=await page.evaluate(()=>state.items.filter(i=>i.type==='note').map(n=>n.color));
  console.log("NOTE COLORS:",JSON.stringify(noteColors));

  // 3. 模拟旧数据迁移
  await page.evaluate(()=>{
    // 注入旧色数据并重新加载
    const old={projects:[{id:'p1',name:'测试',files:[],folders:[],canvases:[{id:'c1',name:'主',items:[{id:'n1',type:'mindNode',text:'旧节点',x:100,y:100,w:130,h:40,color:'#4a9a5a',children:[]},{id:'nt1',type:'note',text:'旧便签',x:300,y:300,w:160,h:90,color:'#fde68a'}],camera:{x:0,y:0,zoom:1},previews:[],links:[]}]}],activeProjectId:'p1',activeCanvasId:'c1',ui:{dark:false,bgPattern:'grid',bgColorName:'default',mindMode:'manual',layoutType:'right'}};
    localStorage.setItem('board-state',JSON.stringify(old));
  });
  await page.reload();
  await page.waitForTimeout(3000);
  const migrated=await page.evaluate(()=>{
    const n=state.items.find(i=>i.id==='n1');
    const nt=state.items.find(i=>i.id==='nt1');
    return {nodeColor:n?.color,noteColor:nt?.color};
  });
  console.log("MIGRATED:",JSON.stringify(migrated));
  const ok2=migrated.nodeColor==='#1fa06a'&&migrated.noteColor==='#fef3c7';
  console.log("2.MIGRATION:",ok2?"OK":"FAIL");

  // 4. 右键调色板
  await page.evaluate(()=>{localStorage.removeItem('board-state');});
  await page.reload();
  await page.waitForTimeout(3000);
  const palette=await page.evaluate(()=>{
    // 触发右键菜单看MIND_COLORS新值
    return MIND_COLORS.join(',');
  });
  console.log("3.MIND_COLORS:",palette);

  console.log("ERRORS:",errors.length?errors.join("\n"):"无");
  await browser.close();
})();
