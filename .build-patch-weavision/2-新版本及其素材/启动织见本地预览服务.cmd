@echo off
setlocal
cd /d "%~dp0"
start "织见 Office 预览服务" /min node "%~dp0织见-office-preview-server.js"
echo 织见本地 Office 预览服务已在后台启动。
timeout /t 2 /nobreak >nul
