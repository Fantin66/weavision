param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)

$ErrorActionPreference="Stop"
if(!(Test-Path -LiteralPath $InputPath)){throw "找不到待转换的 Word 文件"}
$word=$null
$document=$null
try {
  $word=New-Object -ComObject Word.Application
  $word.Visible=$false
  $word.DisplayAlerts=0
  $document=$word.Documents.Open($InputPath,$false,$true,$false)
  # 17 = wdExportFormatPDF。由 Word 自身负责字体、分页、表格和图文定位。
  $document.ExportAsFixedFormat($OutputPath,17)
  if(!(Test-Path -LiteralPath $OutputPath) -or (Get-Item -LiteralPath $OutputPath).Length -lt 1024){
    throw "Word 没有生成有效 PDF"
  }
} finally {
  if($document){try{$document.Close(0)}catch{}}
  if($word){try{$word.Quit(0)}catch{}}
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
