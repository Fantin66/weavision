const { contextBridge, ipcRenderer } = require("electron");

/* 暴露桌面 API 给页面——页面通过 window.electronAPI 访问 */
contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,

  /* 原生全屏（不同于浏览器 Fullscreen API，用窗口级全屏） */
  toggleFullscreen: () => ipcRenderer.invoke("toggle-fullscreen"),
  isFullscreen: () => ipcRenderer.invoke("is-fullscreen"),

  /* 应用信息 */
  getVersion: () => ipcRenderer.invoke("get-version"),

  /* 系统主题（亮/暗）——autoTheme 启动时读取初始值 */
  getSystemTheme: () => ipcRenderer.invoke("get-system-theme"),

  /* G4: 导出/导入——4 个入口（.fantin 文件 × 2 + 文件夹 × 2） */
  exportFantin: (data) => ipcRenderer.invoke("export-fantin", data),
  exportFolder: (data) => ipcRenderer.invoke("export-folder", data),
  importFantin: (presetPath) => ipcRenderer.invoke("import-fantin", presetPath),
  importFolder: () => ipcRenderer.invoke("import-folder"),

  /* 文件/目录对话框 */
  selectDirectory: () => ipcRenderer.invoke("select-directory"),

  /* 系统路径 */
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),
  getDocumentsPath: () => ipcRenderer.invoke("get-documents-path"),

  /* 打开文件/路径 */
  openPath: (p) => ipcRenderer.invoke("open-path", p),

  /* G8: blob 写临时文件后用系统默认应用打开 */
  openBlob: (data) => ipcRenderer.invoke("open-blob", data),

  /* G8: 文件关联 — 查询待导入的 .fantin 路径 */
  getOpenFile: () => ipcRenderer.invoke("get-open-file"),

  /* G8: 文件关联 — 监听 second-instance 发来的打开事件 */
  onOpenFantinFile: (cb) => ipcRenderer.on("open-fantin-file", cb),
});

/* 页面加载后注入桌面标记 */
window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.desktop = "electron";
});
