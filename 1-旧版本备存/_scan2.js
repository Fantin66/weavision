const fs=require('fs');
const h=fs.readFileSync('D:/Documents/WorkBuddy/Interest/织见-思维关系板.html','utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);
const js=m[1];

// 1. 提取所有函数定义名
const defined=new Set();
for(const mm of js.matchAll(/(?:function|const|let|var)\s+(\w+)\s*(?::\s*function|=|\()/g)){
  // 只取 function 声明和 const 箭头/普通
}
// 更精确：function name / const name = / const name: 
for(const mm of js.matchAll(/function\s+(\w+)\s*\(/g))defined.add(mm[1]);
for(const mm of js.matchAll(/const\s+(\w+)\s*=/g))defined.add(mm[1]);
for(const mm of js.matchAll(/let\s+(\w+)\s*=/g))defined.add(mm[1]);
for(const mm of js.matchAll(/var\s+(\w+)\s*=/g))defined.add(mm[1]);

// 2. 找所有函数调用（排除定义处的括号）
const calls=new Map();
for(const mm of js.matchAll(/(?<![.\w$])(\w+)\s*\(/g)){
  const f=mm[1];
  if(defined.has(f))continue;
  if(['if','for','while','switch','catch','return','typeof','function','new','case','in','of','do','else','delete','void','throw'].includes(f))continue;
  if(!calls.has(f))calls.set(f,0);
  calls.set(f,calls.get(f)+1);
}
console.log("=== 可能未定义的函数调用 ===");
for(const [f,c] of calls)console.log(`  ${f}: ${c}次`);

// 3. 检查 addEventListener 里引用的 DOM ID 是否存在
const htmlBefore=js; // 不适用，另查
