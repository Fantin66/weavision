const fs=require('fs');
const p='D:/Documents/WorkBuddy/Interest/织见-思维关系板.html';
let lines=fs.readFileSync(p,'utf8').split(/\r?\n/);
const la=fs.readFileSync('D:/Documents/WorkBuddy/Interest/_fn_localAvoid.txt','utf8').replace(/^const GAP=12;$/m,'const GAP=18;');
// 找到 bothSidesLayout 行（兼容旧名第二行）
const anchorIdx=lines.findIndex(l=>l.trim()==='function bothSidesLayout(){applyAutoLayout();}');
console.log('anchor(bothSidesLayout) at line:',anchorIdx+1);
console.log('next line:',JSON.stringify(lines[anchorIdx+1]));
// 在 anchor 之后插入 localAvoid + updateSelBar 头部
const head='function updateSelBar(){\n  if(editingNoteId!==null||editingMindId!==null){selbar.style.display="none";return;}\n  const sel=selectedItem();\n  if(!sel){selbar.style.display="none";return;}\n';
const insert=la.split(/\r?\n/).concat(head.split(/\r?\n/).slice(0,-1));
const out=lines.slice(0,anchorIdx+1).concat(insert,lines.slice(anchorIdx+1));
fs.writeFileSync(p,out.join('\n'),'utf8');
console.log('RESTORED. new len:',out.length);
