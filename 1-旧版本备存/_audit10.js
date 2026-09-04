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

  // detail 展开-收起细节
  const r=await page.evaluate(()=>{
    const n=state.items.find(i=>i.type==='mindNode');
    n.detail='# 标题\n- 列表1\n- 列表2\n\n正文内容测试';
    expandDetailInPlace(n);
    render();
    const afterExpand={id:detailItemId, hasFn:typeof expandDetailInPlace==='function'};
    collapseDetailInPlace();
    render();
    const afterCollapse={id:detailItemId};
    return {afterExpand,afterCollapse,animExists:typeof animateDetailGeometry!=='undefined'};
  });
  console.log("DETAIL:",JSON.stringify(r));
  console.log("ERRORS:",errors.length?errors.join("\n"):"无");
  await browser.close();
})();
