// 扫描JS中可能的未定义变量（粗略静态分析）
const fs=require('fs');
const h=fs.readFileSync('D:/Documents/WorkBuddy/Interest/织见-思维关系板.html','utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);
const js=m[1];

// 常见函数名列表（从文件提取）
const funcNames=new Set();
for(const match of js.matchAll(/function\s+(\w+)/g)){funcNames.add(match[1]);}
for(const match of js.matchAll(/const\s+(\w+)\s*=/g)){funcNames.add(match[1]);}
for(const match of js.matchAll(/let\s+(\w+)\s*=/g)){funcNames.add(match[1]);}
for(const match of js.matchAll(/var\s+(\w+)\s*=/g)){funcNames.add(match[1]);}

// 检查明显的错误：单字母变量引用模式（如 itemBounds(k) 但 k 未定义）
// 检查函数调用中参数名一致性（针对特定模式）
const patterns=[
  // 循环中的未定义变量（惯用模式检查）
  {re:/(\w+)\.forEach\(\((\w+)\)=>\{[\s\S]{0,120}?(itemBounds|branchHeight|leafCount)\(\1\)/g,desc:"forEach回调用了外层变量而非item参数"},
];

// 更实际的检查：找所有 itemBounds(X) 的调用，X 是否在某处定义
const itemBoundsArgs=new Map();
for(const match of js.matchAll(/itemBounds\((\w+)\)/g)){
  const arg=match[1];
  if(!itemBoundsArgs.has(arg))itemBoundsArgs.set(arg,0);
  itemBoundsArgs.set(arg,itemBoundsArgs.get(arg)+1);
}
console.log("=== itemBounds() 参数统计 ===");
for(const [arg,cnt] of itemBoundsArgs)console.log(`  ${arg}: ${cnt}次`);

// 同理检查 branchHeight / leafCount
for(const fn of ['branchHeight','leafCount','itemBounds','segDistToPoint','distToSegment','resolveEnd','itemLabel','itemTypeLabel','nodeDepth','subtreeCount']){
  const args=new Map();
  for(const match of js.matchAll(new RegExp(fn+'\\((\\w+)\\)','g'))){
    const arg=match[1];
    if(!args.has(arg))args.set(arg,0);
    args.set(arg,args.get(arg)+1);
  }
  console.log(`=== ${fn}() 参数 ===`);
  for(const [arg,cnt] of args)console.log(`  ${arg}: ${cnt}次`);
}
