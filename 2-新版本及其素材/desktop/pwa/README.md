# 织见 PWA 安装指南

## 使用方法

1. 需要通过 HTTP 服务器加载（PWA 不支持 file:// 协议）
2. 在应用目录启动简单服务器：

```bash
# 方式一：Python
python -m http.server 8080

# 方式二：Node.js (npx)
npx serve -p 8080
```

3. 在浏览器打开 `http://localhost:8080/织见-思维关系板-C6.html`
4. 在 C6 HTML 的 `<head>` 中加入（手动或通过脚本）：
```html
<link rel="manifest" href="desktop/pwa/manifest.json">
<script>
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("desktop/pwa/sw.js");
  }
</script>
```
5. 浏览器地址栏会出现"安装"按钮，点击后即作为独立窗口运行

## 注意事项
- PWA 需要 HTTPS 或 localhost
- 安装后是独立窗口，无浏览器地址栏
- 支持离线（Service Worker 缓存所有 JS/CSS/图片）
- 本质上还是浏览器引擎在运行
