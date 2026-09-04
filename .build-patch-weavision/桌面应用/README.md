# 织见桌面应用

在项目根目录执行：

```powershell
npm install
npm run start
```

生成 Windows 安装包：

```powershell
npm run package:win
```

安装包会输出到项目根目录的 `发行版` 文件夹。Electron 负责窗口、默认应用打开和外部链接；画布、浏览器预览和现有本地存储逻辑仍由原应用页面保持。
