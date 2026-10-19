# Receiver for tools/placeholders/gen.html: lets the page write the placeholder PNG / WAV files into assets/ (and its own report.json).
# Usage: powershell -ExecutionPolicy Bypass -File tools/placeholders/receiver.ps1 [-Port 8398] [-Force]   (tools/make-placeholders.ps1 starts it for you)
# Listens on http://localhost:<Port>/ only; POST ?p=<path>; writes nothing outside assets/**.png|wav and tools/placeholders/report.json.
# It never overwrites YOUR work: an existing file under assets/ is only replaced when it still equals its recorded placeholder
# (assets/placeholders.json); -Force overwrites everything.
param([int]$Port = 8398, [switch]$Force)

$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$known = @{}
$phFile = Join-Path $root 'assets/placeholders.json'
if (Test-Path $phFile) { foreach ($p in ([IO.File]::ReadAllText($phFile) | ConvertFrom-Json).files.PSObject.Properties) { $known[$p.Name] = $p.Value } }
$sha = [Security.Cryptography.SHA1]::Create()
$kept = 0
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Writing into $root (POST http://localhost:$Port/?p=assets/...). Ctrl+C to stop."

function Allowed([string]$rel) {
  if (-not $rel -or $rel -match '\.\.' -or $rel -match '^[\\/]') { return $false }
  return ($rel -match '^assets/[a-z0-9_/]+\.(png|wav)$' -or $rel -eq 'tools/placeholders/report.json')
}
function IsYours([string]$rel, [string]$path) {
  if ($Force -or $rel -notlike 'assets/*' -or -not (Test-Path $path)) { return $false }
  $h = ([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($path))) -replace '-', '').ToLower()
  $k = $rel.Substring(7)
  return (-not $known.ContainsKey($k) -or $known[$k] -ne $h)
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    $res.Headers.Add('Access-Control-Allow-Origin', '*')
    $res.Headers.Add('Access-Control-Allow-Headers', 'X-Path, Content-Type')
    $res.Headers.Add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    try {
      if ($ctx.Request.HttpMethod -eq 'POST') {
        $rel = $ctx.Request.QueryString['p']
        if (-not (Allowed $rel)) { $res.StatusCode = 403 }
        else {
          $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
          if (IsYours $rel $path) { $kept++; Write-Host "kept (not a placeholder): $rel"; $res.StatusCode = 200 }
          else {
            [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path)) | Out-Null
            $ms = New-Object IO.MemoryStream
            $ctx.Request.InputStream.CopyTo($ms)
            [IO.File]::WriteAllBytes($path, $ms.ToArray())
            $res.StatusCode = 200
          }
        }
      } else { $res.StatusCode = 204 }
    } catch { $res.StatusCode = 500 } finally { $res.Close() }
  }
} finally { $listener.Stop() }
