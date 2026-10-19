# Generates (or refreshes) every art and sound placeholder under assets/ from docs/ART_CATALOG.md and docs/SOUND_DESIGN.md:
# one PNG / WAV per catalog file at its exact path, then assets/placeholders.json, then assets/assets.js (via tools/scan-assets.ps1).
#   powershell -ExecutionPolicy Bypass -File tools/make-placeholders.ps1 [-What both|art|sound] [-Only sprites/skeleton/] [-Force]
# It never overwrites a file of yours (a file that no longer equals its recorded placeholder is kept); -Force overwrites anyway.
# Needs Chrome or Edge (headless) and no Node/Python. Silent: the browser is started with --mute-audio.
param([ValidateSet('both', 'art', 'sound')][string]$What = 'both', [string]$Only = '', [switch]$Force, [int]$Port = 8377, [int]$RecvPort = 8398, [int]$DebugPort = 9334, [int]$TimeoutSec = 1800)

$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Write-Host "No Chrome/Edge found"; exit 2 }

$server = $null
$up = $false
try { $null = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/index.html" -TimeoutSec 3; $up = $true } catch { }
if (-not $up) { $server = Start-Process powershell -ArgumentList @('-ExecutionPolicy', 'Bypass', '-File', "$repo\serve.ps1", '-Port', "$Port") -PassThru -WindowStyle Hidden; Start-Sleep -Seconds 2 }
$rargs = @('-ExecutionPolicy', 'Bypass', '-File', "$repo\tools\placeholders\receiver.ps1", '-Port', "$RecvPort"); if ($Force) { $rargs += '-Force' }
$recv = Start-Process powershell -ArgumentList $rargs -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
$profile = Join-Path $env:TEMP ('sallow-ph-' + [guid]::NewGuid().ToString('N'))
$url = "http://localhost:$Port/tools/placeholders/gen.html?auto=$What&port=$RecvPort" + $(if ($Only) { '&only=' + [uri]::EscapeDataString($Only) } else { '' })
$proc = Start-Process $chrome -ArgumentList @('--headless=new', '--mute-audio', "--remote-debugging-port=$DebugPort", "--user-data-dir=$profile", '--window-size=1100,800', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required', $url) -PassThru -WindowStyle Hidden
$started = Get-Date
$code = 2
try {
  $ws = $null; $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline -and -not $ws) {
    try { $t = Invoke-RestMethod "http://127.0.0.1:$DebugPort/json" -TimeoutSec 2; $ws = ($t | Where-Object { $_.type -eq 'page' -and $_.url -like '*gen.html*' } | Select-Object -First 1).webSocketDebuggerUrl } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $ws) { Write-Host "Could not attach to Chrome's debugger"; exit 2 }
  $sock = New-Object System.Net.WebSockets.ClientWebSocket
  $null = $sock.ConnectAsync([Uri]$ws, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $id = 0
  function Eval([string]$expr) {
    $script:id++
    $msg = @{ id = $script:id; method = 'Runtime.evaluate'; params = @{ expression = $expr; returnByValue = $true } } | ConvertTo-Json -Compress -Depth 5
    $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
    $null = $sock.SendAsync([ArraySegment[byte]]$bytes, 'Text', $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $buf = New-Object byte[] 65536; $sb = New-Object Text.StringBuilder
    while ($true) {
      $sb.Clear() | Out-Null
      do { $r = $sock.ReceiveAsync([ArraySegment[byte]]$buf, [Threading.CancellationToken]::None).GetAwaiter().GetResult(); $null = $sb.Append([Text.Encoding]::UTF8.GetString($buf, 0, $r.Count)) } until ($r.EndOfMessage)
      $o = $sb.ToString() | ConvertFrom-Json
      if ($o.id -eq $script:id) { return $o.result.result.value }
    }
  }
  $end = (Get-Date).AddSeconds($TimeoutSec); $last = ''
  while ((Get-Date) -lt $end) {
    Start-Sleep -Seconds 5
    $v = Eval "window.__PH && window.__PH.done ? 'DONE' : (document.getElementById('out') ? document.getElementById('out').textContent.slice(0, 60) : 'LOADING')"
    if ($v -ne $last -and $v -ne 'DONE') { Write-Host $v; $last = $v }
    if ($v -eq 'DONE') { break }
  }
  $summary = Eval "document.getElementById('out').textContent"
  $fatal = Eval "window.__PH && window.__PH.fatal"
  Write-Host $summary
  if ($fatal) { Write-Host "FATAL: $fatal" } else { $code = 0 }
} finally {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$profile*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($recv) { Stop-Process -Id $recv.Id -Force -ErrorAction SilentlyContinue }
  if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
}
if ($code -eq 0) {
  & "$repo\tools\placeholders\record-hashes.ps1" -Since $started.AddSeconds(-2)
  & "$repo\tools\scan-assets.ps1"
}
exit $code
