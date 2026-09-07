const { app, BrowserWindow, shell, nativeTheme, ipcMain, dialog, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const { execFile } = require("child_process");

let win = null;
let pendingFantinPath = null;  /* G8: 文件关联 — 双击 .fantin 时暂存路径 */
let isQuitting = false;  /* G11: 退出确认标志 */
let quitFallbackTimer = null;  /* I5-fix: 关闭兜底定时器 */

/* G8: 从 argv 中提取 .fantin 文件路径 */
function extractFantinFromArgv(argv) {
  for (var i = 1; i < argv.length; i++) {
    if (argv[i] && argv[i].toLowerCase().endsWith(".fantin")) return argv[i];
  }
  return null;
}

/* G11: 任务栏图标风格 — 扁平化(带框,分亮暗) vs 轻拟物(无框透明,单一) */
let taskbarPreset = 3, taskbarStyle = "flat";
function applyTaskbarIcon() {
  if (!win) return;
  const isDark = nativeTheme.shouldUseDarkColors;
  /* I5-fix: 打包后 __dirname 在 app.asar 内没有 icons，必须读 extraResources 的 resourcesPath/icons（与 set-fantin-icon 同一分支） */
  const iconsDir = app.isPackaged ? path.join(process.resourcesPath, "icons") : path.join(__dirname, "icons");
  let iconPath;
  if (taskbarStyle === "clean") {
    iconPath = path.join(iconsDir, "clean-" + taskbarPreset + ".png");
  } else {
    iconPath = path.join(iconsDir, "flat-" + taskbarPreset + "-" + (isDark ? "dark" : "light") + ".png");
  }
  /* G11: 裁掉透明边距让图标内容填满画布，再 resize。
     getBitmap() 可能返回 DPI 缩放后的数据，从 buffer 长度推算实际像素宽度 */
  const img = nativeImage.createFromPath(iconPath);
  if (!img.isEmpty()) {
    const size = img.getSize();
    const bmp = img.getBitmap();
    const bpp = 4;
    /* 推算 bitmap 实际宽度（可能因 DPI 与 getSize 不同） */
    var bmpW = Math.round(bmp.length / bpp / size.height);
    if (bmpW <= 0 || bmpW * size.height * bpp !== bmp.length) {
      /* 不整除，尝试从宽高比推算 */
      bmpW = Math.round(Math.sqrt(bmp.length / bpp));
    }
    var bmpH = Math.round(bmp.length / bpp / bmpW);
    /* 坐标比例：bitmap 像素 → image 逻辑坐标（crop 用逻辑坐标） */
    var sx = size.width / bmpW, sy = size.height / bmpH;
    var minX = bmpW, minY = bmpH, maxX = -1, maxY = -1;
    for (var y = 0; y < bmpH; y++) {
      for (var x = 0; x < bmpW; x++) {
        var a = bmp[(y * bmpW + x) * bpp + 3];
        if (a > 10) { /* 跳过半透明边缘 */
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      win.setIcon(img.resize({ width: 256 }));
    } else {
      /* 裁掉透明边距，以内容中心为基准取正方形，保证居中不偏移 */
      var cw = maxX - minX + 1, ch = maxY - minY + 1;
      var sq = Math.max(cw, ch);  /* 正方形边长取宽高较大值 */
      var ccx = (minX + maxX) / 2, ccy = (minY + maxY) / 2;  /* 内容中心 */
      var half = sq / 2;
      var bx = Math.max(0, Math.min(bmpW - sq, Math.round(ccx - half)));
      var by = Math.max(0, Math.min(bmpH - sq, Math.round(ccy - half)));
      var bs = Math.round(sq);
      var cropped = img.crop({ x: Math.round(bx * sx), y: Math.round(by * sy), width: Math.round(bs * sx), height: Math.round(bs * sy) });
      win.setIcon(cropped.resize({ width: 256, height: 256 }));
    }
  } else {
    /* I5-fix: 找不到图标文件时绝不调 win.setIcon(字符串路径)——Electron 28 对加载失败的路径会同步抛异常，直接崩主进程 */
    console.error("taskbar icon file missing:", iconPath);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "织见 · 思维关系板",
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false, /* H2 任务10: 代码统一用 <iframe> 不用 <webview>，关闭以省一个潜在独立进程路径 */
    },
  });

  /* G9: 打包后用 extraResources 路径，开发时用相对路径 */
  const htmlPath = app.isPackaged
    ? path.join(process.resourcesPath, "index.html")
    : path.join(__dirname, "../../织见-思维关系板-I6.html");
  win.loadFile(htmlPath);

  /* I5-fix: 外链只放行 http(s)（file://、ms-msdt: 等协议一律不开），页内顶层导航一律拦下转外开 */
  const ALLOWED_URL = /^https?:\/\//i;
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (ALLOWED_URL.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    e.preventDefault();
    if (ALLOWED_URL.test(url)) shell.openExternal(url);
  });

  win.setMenuBarVisibility(false);

  /* G11: 任务栏图标按风格+预设+系统主题设置 */
  applyTaskbarIcon();

  nativeTheme.on("updated", () => {
    /* 系统主题变化：切换任务栏图标 + 通知页面（如果 autoTheme 开启） */
    applyTaskbarIcon();
    if (win && !win.isDestroyed()) win.webContents.executeJavaScript(
      `if(typeof state!=="undefined"&&state.autoTheme){state.dark=${nativeTheme.shouldUseDarkColors};applyTheme();requestRender();saveStateDebounced();}`
    );
  });

  win.on("closed", () => { win = null; });

  /* G11: 关闭确认 — 用应用内自定义 modal 替代系统对话框 */
  /* I5-fix: 兜底——渲染层 3 秒无响应（卡死/白屏）时改用主进程原生对话框，保证窗口永远关得掉 */
  win.on("close", function (e) {
    if (!isQuitting) {
      e.preventDefault();
      if (win.webContents && !win.webContents.isDestroyed()) win.webContents.send("show-quit-modal");
      if (quitFallbackTimer) clearTimeout(quitFallbackTimer);
      quitFallbackTimer = setTimeout(() => {
        quitFallbackTimer = null;
        if (isQuitting || !win || win.isDestroyed()) return;
        const choice = dialog.showMessageBoxSync(win, {
          type: "question",
          buttons: ["退出", "取消"],
          defaultId: 0,
          cancelId: 1,
          title: "织见",
          message: "页面没有响应，确定退出织见吗？",
        });
        if (choice === 0) { isQuitting = true; app.quit(); }
      }, 3000);
    }
  });
}

/* ===== IPC 处理器 ===== */

// 切换原生全屏
ipcMain.handle("toggle-fullscreen", () => {
  if (!win) return false;
  const isFs = win.isFullScreen();
  win.setFullScreen(!isFs);
  return !isFs;
});

// 获取全屏状态
// I5-fix: is-fullscreen 死通道删除

// 获取系统主题（亮色/暗色）——页面启动时读取初始值
ipcMain.handle("get-system-theme", () => {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
});

// 获取应用版本
ipcMain.handle("get-version", () => {
  return app.getVersion();
});

// H4: 设置 .fantin 文件图标——运行时写注册表 HKCU\...\.fantin\DefaultIcon + SHChangeNotify 刷新缓存（像 WPS 那样实时改，不用重装）。n=1/2/3
// 安全：icoName 取白名单 + safeJoin 边界校验（防穿越）；reg/powershell 用 execFile 参数数组 shell=false（防注入）；刷新脚本为常量无动态数据。
const FANTIN_ICONS = ["fantin-1.ico", "fantin-2.ico", "fantin-3.ico"];
/* I5-fix: 可执行程序一律用代码内字面量绝对路径，不读 SystemRoot 等环境变量——
   防止环境变量被篡改后 execFile 启动攻击者放置的同名假程序。
   （极端的非 C:\Windows 安装会导致图标刷新功能静默降级，不影响应用其它功能） */
const REG_EXE = "C:\\Windows\\System32\\reg.exe";
const PS_EXE = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
ipcMain.handle("set-fantin-icon", async (event, n) => {
  try {
    n = parseInt(n) || 2;
    if (n < 1 || n > 3) n = 2;
    const icoName = FANTIN_ICONS[n - 1];
    const srcDir = app.isPackaged ? path.join(process.resourcesPath, "icons") : path.join(__dirname, "icons");
    const src = safeJoin(srcDir, icoName);
    if (!fs.existsSync(src)) return { ok: false, error: "icon not found: " + src };
    /* 拷到 userData/icons（ASCII 路径，注册表值不含中文，Windows 读图标路径才稳） */
    const dstDir = path.join(app.getPath("userData"), "icons");
    if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
    const dst = safeJoin(dstDir, icoName);
    fs.copyFileSync(src, dst);
    /* 写注册表——reg.exe + execFile 参数数组，dst 作参数（不拼命令） */
    await new Promise((res) => {
      execFile(REG_EXE, ["add", "HKCU\\Software\\Classes\\.fantin\\DefaultIcon", "/ve", "/d", dst, "/f"], { shell: false, windowsHide: true }, () => res());
    });
    /* 刷新图标缓存——常量 PS 脚本（无动态数据）走临时 .ps1 + execFile -File */
    const ps = "$sig='[System.Runtime.InteropServices.DllImport(\"shell32.dll\")] public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr d1, IntPtr d2);'\r\ntry { Add-Type -Namespace ZJN -Name S -MemberDefinition $sig } catch {}\r\n[ZJN.S]::SHChangeNotify(134217728, 0, [IntPtr]::Zero, [IntPtr]::Zero)\r\n";
    const tmp = safeJoin(app.getPath("temp"), "zhijian-fantin-icon-" + Date.now() + ".ps1");
    fs.writeFileSync(tmp, ps, "utf-8");
    await new Promise((res) => {
      execFile(PS_EXE, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp], { shell: false, windowsHide: true }, () => res());
    });
    fs.rmSync(tmp, { force: true });
    return { ok: true, path: dst };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// G8: 使用系统默认应用打开文件
ipcMain.handle("open-path", async (event, filePath) => {
  if (!filePath || typeof filePath !== "string") return false;
  try {
    await shell.openPath(filePath);
    return true;
  } catch (e) {
    console.error("open-path failed:", e);
    return false;
  }
});


// G8: blob to temp file then open with system default app
ipcMain.handle("open-blob", async (event, data) => {
  if (!data || !data.bytes) return false;
  var ext = path.extname(String(data.name || "file"));
  if (ext.indexOf("..") >= 0) ext = "";
  var tmp = app.getPath("temp");
  var fp = tmp + require("path").sep + "zhijian-" + Date.now() + ext;
  try {
    fs.writeFileSync(fp, Buffer.from(data.bytes));
    await shell.openPath(fp);
    return true;
  } catch (e) {
    console.error("open-blob failed:", e);
    return false;
  }
});

// G8: 文件关联 — 渲染器查询是否有待导入的 .fantin 文件
ipcMain.handle("get-open-file", () => {
  var p = pendingFantinPath;
  pendingFantinPath = null;
  return p;
});

// 选择文件夹对话框
ipcMain.handle("select-directory", async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory", "createDirectory"],
    title: "选择织见数据存储位置",
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 检查是否在桌面环境
// I5-fix: is-desktop / get-user-data-path / get-documents-path / is-fullscreen / save-to-file 均为无调用方的死通道，已删除


/* G4: 路径安全校验——防止路径穿越 */
function safeJoin(root, sub) {
  const target = path.resolve(root, sub);
  const rootResolved = path.resolve(root);
  if (target !== rootResolved && !target.startsWith(rootResolved + path.sep)) {
    throw new Error("path traversal blocked");
  }
  return target;
}

/* G4: 写 data.json + attachments 到临时目录（供 .fantin 打包或文件夹导出共用） */
function writePackageToDir(dir, data) {
  const attDir = path.join(dir, "attachments");
  fs.mkdirSync(attDir, { recursive: true });
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify(data.structure, null, 2), "utf-8");
  let attCount = 0;
  for (const att of (data.attachments || [])) {
    if (!att.buffer) continue;
    const safeName = (att.name || "unnamed").replace(/[\\/:*?"<>|]/g, "_");
    fs.writeFileSync(safeJoin(attDir, safeName), Buffer.from(att.buffer));
    attCount++;
  }
  return attCount;
}

/* G4: 从目录读取 data.json + attachments（供 .fantin 解压和文件夹导入共用） */
function readPackageFromDir(dir) {
  const dataPath = path.join(dir, "data.json");
  if (!fs.existsSync(dataPath)) return { ok: false, error: "未找到 data.json" };
  const structure = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const attachments = [];
  const attDir = path.join(dir, "attachments");
  if (fs.existsSync(attDir)) {
    for (const fname of fs.readdirSync(attDir)) {
      const buf = fs.readFileSync(path.join(attDir, fname));
      /* I5-fix: readFileSync 的 buffer 挂在 64KB 共享内存池上，必须 slice 出精确区间，
         否则小附件经 IPC 传给渲染层会带上整块 64KB 的堆垃圾，预览/再导出全部损坏 */
      attachments.push({ name: fname, buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
    }
  }
  return { ok: true, structure, attachments };
}

/* ===== 导出：.fantin 文件 ===== */
ipcMain.handle("export-fantin", async (event, data) => {
  if (!win) return { ok: false, error: "no window" };
  const result = await dialog.showSaveDialog(win, {
    title: "导出为 .fantin 文件",
    defaultPath: (data.projectName || "织见画布").replace(/[\\/:*?"<>|]/g, "_") + ".fantin",
    filters: [{ name: "Fantin 文件", extensions: ["fantin"] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, error: "cancelled" };
  try {
    /* 写临时目录 → 打包 ZIP → 重命名 .fantin */
    const tmpDir = path.join(app.getPath("temp"), "fantin-export-" + Date.now());
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    const attCount = writePackageToDir(tmpDir, data);
    const zip = new AdmZip();
    zip.addLocalFolder(tmpDir);
    zip.writeZip(result.filePath);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { ok: true, path: result.filePath, attachments: attCount };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ===== 导出：文件夹 ===== */
ipcMain.handle("export-folder", async (event, data) => {
  if (!win) return { ok: false, error: "no window" };
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory", "createDirectory"],
    title: "选择导出位置",
  });
  if (result.canceled) return { ok: false, error: "cancelled" };
  const outDir = result.filePaths[0];
  const pkgName = (data.projectName || "织见画布").replace(/[\\/:*?"<>|]/g, "_");
  const pkgDir = safeJoin(outDir, pkgName);
  try {
    fs.rmSync(pkgDir, { recursive: true, force: true });
    fs.mkdirSync(pkgDir, { recursive: true });
    const attCount = writePackageToDir(pkgDir, data);
    return { ok: true, path: pkgDir, attachments: attCount };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ===== 导入：.fantin 文件 ===== */
ipcMain.handle("import-fantin", async (event, presetPath) => {
  if (!win) return { ok: false, error: "no window" };
  /* I5-fix: 用户主动导入不再吞掉 pendingFantinPath——那条路径专属于双击文件关联流程（get-open-file 消费） */
  var filePath = presetPath;
  if (!filePath) {
    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      title: "选择 .fantin 文件",
      filters: [{ name: "Fantin 文件", extensions: ["fantin"] }],
    });
    if (result.canceled || !result.filePaths.length) return { ok: false, error: "cancelled" };
    filePath = result.filePaths[0];
  }
  try {
    const zip = new AdmZip(filePath);
    const tmpDir = path.join(app.getPath("temp"), "fantin-import-" + Date.now());
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    zip.extractAllTo(tmpDir, true);
    const res = readPackageFromDir(tmpDir);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return res;
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ===== 导入：文件夹 ===== */
ipcMain.handle("import-folder", async () => {
  if (!win) return { ok: false, error: "no window" };
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    title: "选择要导入的织见文件夹",
  });
  if (result.canceled) return { ok: false, error: "cancelled" };
  try {
    return readPackageFromDir(result.filePaths[0]);
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ===== 自动保存到文件系统 ===== */
// I5-fix: save-to-file 死通道删除（持久化实际走 localStorage/IndexedDB + .fantin 导出）

/* G11: 设置任务栏图标 (preset=1/2/3, style="flat"|"clean") */
/* I5-fix: 参数白名单校验——异常值不再拼进图标文件名 */
ipcMain.handle("set-taskbar-icon", (event, data) => {
  if (!data || typeof data !== "object") return;
  const p = parseInt(data.preset);
  if (p >= 1 && p <= 3) taskbarPreset = p;
  if (data.style === "flat" || data.style === "clean") taskbarStyle = data.style;
  applyTaskbarIcon();
});

/* G11: 用户确认退出 */
ipcMain.handle("confirm-quit", () => {
  isQuitting = true;
  if (quitFallbackTimer) { clearTimeout(quitFallbackTimer); quitFallbackTimer = null; }
  app.quit();
});

/* I5-fix: 渲染层取消退出时清掉兜底定时器 */
ipcMain.handle("cancel-quit", () => {
  if (quitFallbackTimer) { clearTimeout(quitFallbackTimer); quitFallbackTimer = null; }
});

/* I5-fix: 任何 app.quit() 路径（含 macOS Cmd+Q）都先置退出标志，避免被 close 拦截 */
app.on("before-quit", () => { isQuitting = true; });

/* G8: 单实例锁 — 已运行时双击 .fantin 发给已有窗口 */
var gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv, workingDir) => {
    var fantinPath = extractFantinFromArgv(argv);
    if (fantinPath) {
      pendingFantinPath = fantinPath;
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.focus();
        win.webContents.send("open-fantin-file");
      }
    } else if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    /* G8: 检查 argv 中是否有 .fantin 文件 */
    pendingFantinPath = extractFantinFromArgv(process.argv);
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
