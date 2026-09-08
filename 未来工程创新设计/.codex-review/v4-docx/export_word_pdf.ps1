param([string]$InputDocument,[string]$OutputPdf)
$ErrorActionPreference = 'Stop'
$documentInstance = $null
$wordInstance = $null
try {
  $wordInstance = New-Object -ComObject Word.Application
  $wordInstance.Visible = $false
  $wordInstance.DisplayAlerts = 0
  $documentInstance = $wordInstance.Documents.Open($InputDocument, $false, $true)
  $documentInstance.Repaginate()
  $documentInstance.ExportAsFixedFormat($OutputPdf, 17)
  Write-Output $OutputPdf
}
finally {
  if ($null -ne $documentInstance) { $documentInstance.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($documentInstance) }
  if ($null -ne $wordInstance) {
    try { $wordInstance.Quit() } catch [Runtime.InteropServices.COMException] { if ($_.Exception.HResult -ne -2147023174) { throw } }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wordInstance)
  }
}
