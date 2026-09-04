; G9: 用户选择安装目录后，自动追加"织见"子目录
; 例如用户选 D:\MyApps，实际安装到 D:\MyApps\织见
!define MUI_PAGECUSTOMFUNCTION_LEAVE OnDirLeave

Function OnDirLeave
  Push $0
  ; 取路径最后 2 个字符（"织见"是 2 个中文字符）
  StrCpy $0 "$INSTDIR" 2 -2
  StrCmp $0 "织见" skip_append 0
    ; 末尾不是"织见"，追加子目录
    StrCpy $INSTDIR "$INSTDIR\织见"
  skip_append:
  Pop $0
FunctionEnd
