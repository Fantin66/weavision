const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  // 在页面加载前注入旧色数据（避免 beforeunload saveState 覆盖）
  await context.addInitScript(()=>{
    const old={projects:[{id:'p1',name:'测试',files:[],folders:[],canvases:[{id:'c1',name:'主',items:[{id:'n1',type:'mindNode',text:'旧节点',x:100,y:100,w:130,h:40,color:'#4a9a5a',children:[]},{id:'nt1',type:'note',text:'旧便签',x:300,y:300,w:160,h:90,color:'#fde68a'}],camera:{x:0,y:0,zoom:1},previews:[],links:[{id:'lnk1',aId:'n1',bId:'nt1',color:'#8a5a9a',annotation:'测试'}]}]}],activeProjectId:'p1',activeCanvasId:'c1',ui:{dark:false,bgPattern:'grid',bgColorName:'default',mindMode:'manual',layoutType:'right'}};
    localStorage.setItem('board-state',JSON.stringify(old));
  });
  const page = await context.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e).slice(0,200)));
  await page.goto("file:///D:/Documents/WorkBuddy/Interest/织见-思维关系板.html");
  await page.waitForTimeout(3000);
  const r=await page.evaluate(()=>{
    const n=state.items.find(i=>i.id==='n1');
    const nt=state.items.find(i=>i.id==='nt1');
    const lk=state.links.find(i=>i.id==='lnk1');
    return JSON.stringify({nodeColor:n&&n.color,noteColor:nt&&nt.color,linkColor:lk&&lk.color,cnt:state.items.length,projects:state.projects.length});
  });
  console.log("MIGRATION RESULT:",r);
  const parsed=JSON.parse(r);
  const ok=parsed.nodeColor==='#1fa06a'&&parsed.noteColor==='#fef3c7'&&parsed.linkColor==='#7a55c0'&&parsed.cnt===2;
  console.log(ok?"✅ OK":"❌ FAIL");
  console.log("ERRORS:",errors.length?errors.join("\n"):"无");
  await browser.close();
})();
