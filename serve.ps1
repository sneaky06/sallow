# Static dev server (no Node/Python needed). Usage: powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8377
param([int]$Port = 8377)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'; '.png' = 'image/png'
  '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.md' = 'text/plain; charset=utf-8'
  '.wav' = 'audio/wav'; '.m4a' = 'audio/mp4'; '.mp3' = 'audio/mpeg'; '.aac' = 'audio/aac'; '.ogg' = 'audio/ogg'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($rel -eq '') { $rel = 'index.html' }
      if ($rel -eq '__scan-check') {          # tests/all.html: is assets/assets.js what tools/scan-assets.ps1 would write?
        $txt = (& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tools/scan-assets.ps1') -Check 2>&1 | Out-String)
        $bytes = [Text.Encoding]::UTF8.GetBytes((@{ code = $LASTEXITCODE; text = $txt } | ConvertTo-Json -Compress))
        $ctx.Response.ContentType = 'application/json'; $ctx.Response.Headers.Add('Cache-Control', 'no-store')
        $ctx.Response.ContentLength64 = $bytes.Length; $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        continue
      }
      $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if ($path.StartsWith($root) -and (Test-Path $path -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($path)
        $ext = [IO.Path]::GetExtension($path).ToLower()
        if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] } else { $ctx.Response.ContentType = 'application/octet-stream' }
        $ctx.Response.Headers.Add('Cache-Control', 'no-store')
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $ctx.Response.StatusCode = 404
      }
    } catch {
      $ctx.Response.StatusCode = 500
    } finally {
      $ctx.Response.Close()
    }
  }
} finally {
  $listener.Stop()
}
