// 提取品牌图标主色
const fs=require('fs');
// 用 node 读取 PNG 头部信息并采样像素
const files=['D:/Documents/WorkBuddy/Interest/织见-品牌图标-v2.png','D:/Documents/WorkBuddy/Interest/织见-品牌图标.png'];
for(const f of files){
  try{
    const buf=fs.readFileSync(f);
    console.log(f.split('/').pop(), 'size:', buf.length, 'bytes');
    // PNG header check
    if(buf.slice(0,8).toString('hex')!=='89504e470d0a1a0a'){console.log('  not png');continue;}
    // IHDR width/height
    const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);
    console.log('  dimensions:',w+'x'+h);
  }catch(e){console.log(f,'ERR',e.message);}
}
