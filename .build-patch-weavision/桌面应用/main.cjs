const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const APP_HTML = path.resolve(__dirname, "..", "2-新版本及其素材", "织见-思维关系板.html");
const APP_ICON = path.resolve(__dirname, "..", "2-新版本及其素材", "织见-品牌图标-v2.png");

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1080,
    minHeight: 700,
    title: "织见 Weavision",
    icon: APP_ICON,
    autoHideMenuBar: true,
    backgroundColor: "#f7f9fe",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadFile(APP_HTML);
}

ipcMain.handle("weavision:open-path", async (_event, candidate) => {
  if (typeof candidate !== "string" || !candidate.trim()) return { ok: false, error: "文件路径不可用" };
  const resolved = path.resolve(candidate);
  if (!fs.existsSync(resolved)) return { ok: false, error: "原文件已不存在" };
  const error = await shell.openPath(resolved);
  return error ? { ok: false, error } : { ok: true };
});

ipcMain.handle("weavision:open-external", async (_event, candidate) => {
  if (typeof candidate !== "string" || !/^https?:\/\//i.test(candidate)) return { ok: false, error: "链接地址无效" };
  await shell.openExternal(candidate);
  return { ok: true };
});

app.whenReady().then(() => {
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event, webPreferences, params) => {
      /* 预览页只获得普通网页能力，不继承宿主应用的 Node/预加载权限。 */
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      delete webPreferences.preload;
      if (!/^https?:\/\//i.test(params.src || "")) event.preventDefault();
    });
  });
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
