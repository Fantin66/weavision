const { app, BrowserWindow, shell, nativeTheme, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");

let win = null;
let pendingFantinPath = null;  /* G8: 文件关联 — 双击 .fantin 时暂存路径 */

/* G8: 从 argv 中提取 .fantin 文件路径 */
function extractFantinFromArgv(argv) {
  for (var i = 1; i < argv.length; i++) {
    if (argv[i] && argv[i].toLowerCase().endsWith(".fantin")) return argv[i];
  }
  return null;
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
      webviewTag: true,
    },
  });

  /* G9: 打包后用 extraResources 路径，开发时用相对路径 */
  const htmlPath = app.isPackaged
    ? path.join(process.resourcesPath, "index.html")
    : path.join(__dirname, "../../织见-思维关系板-G9.html");
  win.loadFile(htmlPath);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.setMenuBarVisibility(false);

  /* G3: 初始图标按系统主题设置 */
  const iconLight = path.join(__dirname, "icon-light.png");
  const iconDark = path.join(__dirname, "icon-dark.png");
  win.setIcon(nativeTheme.shouldUseDarkColors ? iconDark : iconLight);

  nativeTheme.on("updated", () => {
    /* 系统主题变化：切换任务栏图标 + 通知页面（如果 autoTheme 开启） */
    win.setIcon(nativeTheme.shouldUseDarkColors ? iconDark : iconLight);
    win.webContents.executeJavaScript(
      `if(typeof state!=="undefined"&&state.autoTheme){state.dark=${nativeTheme.shouldUseDarkColors};applyTheme();render();saveState();}`
    );
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
ipcMain.handle("is-fullscreen", () => {
  return win ? win.isFullScreen() : false;
});

// 获取系统主题（亮色/暗色）——页面启动时读取初始值
ipcMain.handle("get-system-theme", () => {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
});

// 获取应用版本
ipcMain.handle("get-version", () => {
  return app.getVersion();
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
ipcMain.handle("is-desktop", () => true);

// 获取用户数据目录（Electron 默认存储路径）
ipcMain.handle("get-user-data-path", () => {
  return app.getPath("userData");
});

// 获取文档目录
ipcMain.handle("get-documents-path", () => {
  return app.getPath("documents");
});

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
      attachments.push({ name: fname, buffer: buf.buffer });
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
  var filePath = presetPath || pendingFantinPath;
  pendingFantinPath = null;
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
ipcMain.handle("save-to-file", (event, data) => {
  if (!data || !data.path) return { ok: false, error: "no path" };
  try {
    const dir = data.path;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "zhijian-state.json"), data.json, "utf-8");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* G8: 单实例锁 — 已运行时双击 .fantin 发给已有窗口 */
var gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv, workingDir) => {
    var fantinPath = extractFantinFromArgv(argv);
    if (fantinPath) {
      pendingFantinPath = fantinPath;
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
        win.webContents.send("open-fantin-file");
      }
    } else if (win) {
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
