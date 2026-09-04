const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file:///D:/Documents/WorkBuddy/Interest/织见-品牌图标-v2.png");
  await page.waitForTimeout(1000);
  const colors = await page.evaluate(async () => {
    const img = document.querySelector('img');
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const counts = {};
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i+3];
      if (a < 200) continue;
      const r = data[i], g = data[i+1], b = data[i+2];
      const key = (Math.round(r/16)*16) + ',' + (Math.round(g/16)*16) + ',' + (Math.round(b/16)*16);
      counts[key] = (counts[key]||0) + 1;
    }
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12);
    function hex(r,g,b){
      return '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
    }
    return sorted.map(function(x){
      var p = x[0].split(',');
      return {hex:hex(+p[0],+p[1],+p[2]), count:x[1]};
    });
  });
  console.log("TOP COLORS:", JSON.stringify(colors));
  await browser.close();
})();
