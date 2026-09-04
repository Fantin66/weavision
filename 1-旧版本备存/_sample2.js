const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file:///D:/Documents/WorkBuddy/Interest/织见-品牌图标-v2.png");
  await page.waitForTimeout(1000);
  const result = await page.evaluate(async () => {
    const img = document.querySelector('img');
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    // 找蓝色系像素（B 明显高于 R 和 G）
    let sr=0,sg=0,sb=0,n=0;
    let all={r:0,g:0,b:0,cn:0};
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i+3];
      if (a < 200) continue;
      const r = data[i], g = data[i+1], b = data[i+2];
      all.r+=r; all.g+=g; all.b+=b; all.cn++;
      // 蓝色判定: b > r+15 且 b > g+15（排除灰阶）
      if (b > r+20 && b > g+20 && b > 80) { sr+=r; sg+=g; sb+=b; n++; }
    }
    function fmt(r,g,b){var h=function(x){return x.toString(16).padStart(2,'0');};return '#'+h(r)+h(g)+h(b);}
    const avg = n ? {hex: fmt(Math.round(sr/n),Math.round(sg/n),Math.round(sb/n)), count:n} : null;
    const overall = all.cn ? {hex: fmt(Math.round(all.r/all.cn),Math.round(all.g/all.cn),Math.round(all.b/all.cn)), count:all.cn} : null;
    return {blueAvg:avg, overallAvg:overall};
  });
  console.log("RESULT:", JSON.stringify(result));
  await browser.close();
})();
