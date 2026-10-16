# Runs tests/all.html in headless Chrome and prints the report. Exit code 0 = PASS, 1 = FAIL, 2 = could not run.
# Usage: powershell -ExecutionPolicy Bypass -File tests/run-headless.ps1 [-Query "only=load,contract"] [-Port 8377] [-TimeoutSec 900]
# Starts serve.ps1 on -Port when nothing is listening there. Needs Chrome (or Edge) installed; no Node/Python.
param([string]$Query = "", [int]$Port = 8377, [int]$TimeoutSec = 900, [int]$DebugPort = 9333)

$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Write-Host "No Chrome/Edge found"; exit 2 }

$server = $null
$up = $false
try { $null = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/index.html" -TimeoutSec 3; $up = $true } catch { }
if (-not $up) {
  $server = Start-Process powershell -ArgumentList @("-ExecutionPolicy", "Bypass", "-File", "$repo\serve.ps1", "-Port", "$Port") -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 2
}
$profile = Join-Path $env:TEMP ("sallow-headless-" + [guid]::NewGuid().ToString("N"))
$url = "http://localhost:$Port/tests/all.html" + $(if ($Query) { "?$Query" } else { "" })
$proc = Start-Process $chrome -ArgumentList @("--headless=new", "--remote-debugging-port=$DebugPort", "--user-data-dir=$profile", "--window-size=1100,800", "--no-first-run", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required", $url) -PassThru -WindowStyle Hidden
$code = 2
try {
  $ws = $null; $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline -and -not $ws) {
    try { $t = Invoke-RestMethod "http://127.0.0.1:$DebugPort/json" -TimeoutSec 2; $ws = ($t | Where-Object { $_.type -eq "page" -and $_.url -like "*all.html*" } | Select-Object -First 1).webSocketDebuggerUrl } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $ws) { Write-Host "Could not attach to Chrome's debugger"; exit 2 }
  $sock = New-Object System.Net.WebSockets.ClientWebSocket
  $null = $sock.ConnectAsync([Uri]$ws, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $id = 0
  function Eval([string]$expr) {
    $script:id++
    $msg = @{ id = $script:id; method = "Runtime.evaluate"; params = @{ expression = $expr; returnByValue = $true } } | ConvertTo-Json -Compress -Depth 5
    $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
    $null = $sock.SendAsync([ArraySegment[byte]]$bytes, "Text", $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $buf = New-Object byte[] 65536; $sb = New-Object Text.StringBuilder
    while ($true) {
      $sb.Clear() | Out-Null
      do { $r = $sock.ReceiveAsync([ArraySegment[byte]]$buf, [Threading.CancellationToken]::None).GetAwaiter().GetResult(); $null = $sb.Append([Text.Encoding]::UTF8.GetString($buf, 0, $r.Count)) } until ($r.EndOfMessage)
      $o = $sb.ToString() | ConvertFrom-Json
      if ($o.id -eq $script:id) { return $o.result.result.value }
    }
  }
  $end = (Get-Date).AddSeconds($TimeoutSec); $last = ""
  while ((Get-Date) -lt $end) {
    Start-Sleep -Seconds 3
    $v = Eval "window.__ALL ? (window.__ALL.done ? 'DONE' : 'RUNNING ' + document.getElementById('elapsed').textContent) : 'LOADING'"
    if ($v -ne $last -and $v -ne "DONE") { $last = $v }
    if ($v -eq "DONE") { break }
  }
  $report = Eval "window.__ALL.report"
  $verdict = Eval "window.__ALL.verdict"
  if ($verdict -ne "PASS" -and $verdict -ne "FAIL") { Write-Host "Timed out after $TimeoutSec s; partial report:"; $code = 2 } else { $code = if ($verdict -eq "PASS") { 0 } else { 1 } }
  Write-Host $report
} finally {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$profile*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
}
exit $code
