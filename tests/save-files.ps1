# Receiver for tests/assets.html: lets the page write ART_LIST.md, SOUND_LIST.md and assets_templates/** into the repo.
# Usage: powershell -ExecutionPolicy Bypass -File tests/save-files.ps1   (then press the Save buttons on tests/assets.html)
# Listens on http://localhost:8399/ only; accepts POST with ?p=<path> (or header X-Path); writes nothing outside the allowed paths.
param([int]$Port = 8399)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Saving into $root (POST http://localhost:$Port/ with X-Path). Ctrl+C to stop."

function Allowed([string]$rel) {
  if ($rel -match '\.\.' -or $rel -match '^[\\/]') { return $false }
  return ($rel -eq 'ART_LIST.md' -or $rel -eq 'SOUND_LIST.md' -or $rel -match '^assets_templates/[a-z0-9_/]+\.png$')
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
        if (-not $rel) { $rel = $ctx.Request.Headers['X-Path'] }
        if (-not (Allowed $rel)) { $res.StatusCode = 403 }
        else {
          $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
          [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path)) | Out-Null
          $ms = New-Object IO.MemoryStream
          $ctx.Request.InputStream.CopyTo($ms)
          [IO.File]::WriteAllBytes($path, $ms.ToArray())
          $res.StatusCode = 200
        }
      } else { $res.StatusCode = 204 }
    } catch { $res.StatusCode = 500 } finally { $res.Close() }
  }
} finally { $listener.Stop() }
