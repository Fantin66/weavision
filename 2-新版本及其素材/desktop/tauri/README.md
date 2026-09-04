# 织见 Tauri 打包指南

## 前置条件
1. 安装 Rust 工具链：https://rustup.rs
2. Windows 需要 WebView2 运行时（Win10/11 大多已内置）
3. 安装 Tauri CLI：`npm install -g @tauri-apps/cli` 或 `cargo install tauri-cli`

## 使用方法

### 方式一：作为独立 Tauri 项目
```bash
cd desktop/tauri
tauri build
```
输出在 `desktop/tauri/target/release/` 目录下。

### 方式二：在现有项目中初始化
```bash
# 在项目根目录执行
npm create tauri-app

# 然后把 tauri.conf.json 复制到 src-tauri/
# 把 frontendDist 指向应用目录
```

## 配置说明
- `frontendDist`: 指向 `../../`（即应用根目录），Tauri 会加载该目录下的 HTML
- 入口文件需要在 `frontendDist` 目录下，即 `织见-思维关系板-C6.html`
- `csp: null` 允许加载外部 CDN 脚本（docx-preview, xlsx 等）
- 窗口大小 1280x800，最小 900x600

## 注意事项
- Tauri 使用系统 WebView（Windows: WebView2, macOS: WKWebView）
- `backdrop-filter` 在 WebView2 上可能行为略有不同
- 体积约 10-15MB（vs Electron 100MB+）
- 需要本地服务器（`python -m http.server 8080`）用于开发模式
- 生产构建直接加载文件，不需要服务器
