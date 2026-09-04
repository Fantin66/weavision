/* 织见本地 Office 预览服务
   将浏览器收到的 DOCX 交给本机 Microsoft Word 生成 PDF，再返给画布预览。
   这样保留 Word 的分页、字体、段落、表格和图文定位，而非浏览器近似重排。 */
"use strict";

const http=require("http");
const fs=require("fs");
const os=require("os");
const path=require("path");
const crypto=require("crypto");
const {spawn}=require("child_process");

const PORT=Number(process.env.WEAVISION_PREVIEW_PORT||34971);
const ROOT=__dirname;
const CONVERTER=path.join(ROOT,"织见-office-to-pdf.ps1");
const MAX_BYTES=80*1024*1024;

function cors(res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, X-File-Name");
  /* 允许 file:// 页面访问本机 127.0.0.1 服务（Chrome 的 Private Network Access 预检）。 */
  res.setHeader("Access-Control-Allow-Private-Network","true");
}
function reply(res,status,body,type="application/json; charset=utf-8"){
  cors(res);res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store"});res.end(body);
}
function readBody(req){
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0;
    req.on("data",chunk=>{
      size+=chunk.length;
      if(size>MAX_BYTES){reject(new Error("文件超过 80 MB 的本地预览上限"));req.destroy();return;}
      chunks.push(chunk);
    });
    req.on("end",()=>resolve(Buffer.concat(chunks)));
    req.on("error",reject);
  });
}
function runConverter(input,output){
  return new Promise((resolve,reject)=>{
    const child=spawn("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",CONVERTER,"-InputPath",input,"-OutputPath",output],{windowsHide:true});
    let stderr="";
    child.stderr.on("data",d=>{stderr+=d.toString();});
    child.on("error",reject);
    child.on("close",code=>{
      if(fs.existsSync(output)&&fs.statSync(output).size>1024)return resolve();
      reject(new Error(stderr.trim()||`Office 转换失败（退出码 ${code}）`));
    });
  });
}
async function convert(req,res){
  let job="";
  try{
    const bytes=await readBody(req);
    if(!bytes.length)throw new Error("没有收到 Word 文件");
    job=fs.mkdtempSync(path.join(os.tmpdir(),"weavision-office-"));
    const stem=crypto.randomUUID();
    const input=path.join(job,stem+".docx");
    const output=path.join(job,stem+".pdf");
    fs.writeFileSync(input,bytes);
    await runConverter(input,output);
    const pdf=fs.readFileSync(output);
    cors(res);
    res.writeHead(200,{"Content-Type":"application/pdf","Content-Length":pdf.length,"Cache-Control":"no-store","Content-Disposition":"inline; filename=word-preview.pdf"});
    res.end(pdf);
  }catch(error){
    reply(res,500,JSON.stringify({error:error&&error.message||"Word 预览转换失败"}));
  }finally{
    if(job)setTimeout(()=>fs.rm(job,{recursive:true,force:true},()=>{}),1500);
  }
}

http.createServer((req,res)=>{
  if(req.method==="OPTIONS"){cors(res);res.writeHead(204);res.end();return;}
  if(req.method==="GET"&&req.url==="/health"){
    reply(res,200,JSON.stringify({ok:true,engine:"Microsoft Word",port:PORT}));return;
  }
  if(req.method==="POST"&&req.url==="/api/docx-to-pdf"){convert(req,res);return;}
  reply(res,404,JSON.stringify({error:"Not found"}));
}).listen(PORT,"127.0.0.1",()=>{
  console.log(`织见 Office 预览服务已启动：http://127.0.0.1:${PORT}`);
});
