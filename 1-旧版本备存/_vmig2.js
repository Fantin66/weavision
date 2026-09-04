const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e).slice(0,200)));
  await page.goto("file:///D:/Documents/WorkBuddy/Interest/织见-思维关系板.html");
  await page.evaluate(()=>{
    const old={projects:[{id:'p1',name:'测试',files:[],folders:[],canvases:[{id:'c1',name:'主',items:[{id:'n1',type:'mindNode',text:'旧节点',x:100,y:100,w:130,h:40,color:'#4a9a5a',children:[]},{id:'nt1',type:'note',text:'旧便签',x:300,y:300,w:160,h:90,color:'#fde68a'}],camera:{x:0,y:0,zoom:1},previews:[],links:[{id:'lnk1',aId:'n1',bId:'nt1',color:'#8a5a9a',annotation:'测试'}]}]}],activeProjectId:'p1',activeCanvasId:'c1',ui:{dark:false,bgPattern:'grid',bgColorName:'default',mindMode:'manual',layoutType:'right'}};
    localStorage.setItem('board-state',JSON.stringify(old));
  });
  await page.reload();
  await page.waitForTimeout(3000);
  const r=await page.evaluate(()=>{
    const n=state.items.find(i=>i.id==='n1');
    const nt=state.items.find(i=>i.id==='nt1');
    const lk=state.links.find(i=>i.id==='lnk1');
    return JSON.stringify({nodeColor:n&&n.color,noteColor:nt&&nt.color,linkColor:lk&&lk.color,cnt:state.items.length,errs:window.__errs||0});
  });
  console.log("RESULT:",r);
  console.log("ERRORS:",errors.length?errors.join("\n"):"无");
  await browser.close();
})();
