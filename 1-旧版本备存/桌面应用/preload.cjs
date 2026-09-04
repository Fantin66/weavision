const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  openPath: (filePath) => ipcRenderer.invoke("weavision:open-path", filePath),
  openExternal: (url) => ipcRenderer.invoke("weavision:open-external", url)
});
