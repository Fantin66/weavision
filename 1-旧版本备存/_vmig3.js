const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e).slice(0,300)));
  page.on("console",m=>{if(m.type()==="error")errors.push("CONSOLE: "+m.text().slice(0,300));});
  await page.goto("file:///D:/Documents/WorkBuddy/Interest/织见-思维关系板.html");
  await page.evaluate(()=>{
    const old={projects:[{id:'p1',name:'测试',files:[],folders:[],canvases:[{id:'c1',name:'主',items:[{id:'n1',type:'mindNode',text:'旧节点',x:100,y:100,w:130,h:40,color:'#4a9a5a',children:[]},{id:'nt1',type:'note',text:'旧便签',x:300,y:300,w:160,h:90,color:'#fde68a'}],camera:{x:0,y:0,zoom:1},previews:[],links:[{id:'lnk1',aId:'n1',bId:'nt1',color:'#8a5a9a',annotation:'测试'}]}]}],activeProjectId:'p1',activeCanvasId:'c1',ui:{dark:false,bgPattern:'grid',bgColorName:'default',mindMode:'manual',layoutType:'right'}};
    localStorage.setItem('board-state',JSON.stringify(old));
  });
  await page.reload();
  await page.waitForTimeout(3000);
  // 手动检查loadState
  const manual=await page.evaluate(()=>{
    try{
      const r=loadState();
      return "OK:"+r+" items:"+state.items.length+" noteColor:"+state.noteColor;
    }catch(e){return "THROW:"+String(e).slice(0,300);}
  });
  console.log("MANUAL LOADSTATE:",manual);
  console.log("ERRORS:",errors.length?errors.slice(0,5).join("\n---\n"):"无");
  await browser.close();
})();
