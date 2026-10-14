# Regenerates the home-screen icons from the 16x16 emblem (same pixels as EMBLEM in src/ui/core.js).
# Usage: powershell -ExecutionPolicy Bypass -File icons/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rows = @(
  '................', '.......e........', '......ee...e....', '......eye..e....',
  '.....eeye.ee....', '....eeyyeeee....', '....eyyyyyee....', '...eeywwyyee....',
  '...eeywwwyee....', '...reywwwyer....', '...reeywwyer....', '....reeyyer.....',
  '..ssssssssssss..', '...sddddddddd...', '....sdddddds....', '.....ssssss.....'
)
$pal = @{ '.' = '#0b0a0f'; 'e' = '#ff8a2b'; 'y' = '#ffd94a'; 'w' = '#fff6d0'; 'r' = '#b3202a'; 's' = '#7a708a'; 'd' = '#3a3442' }

# $inset: fraction of the canvas left as plain background on every side (maskable icons need a safe zone).
function Make-Png([int]$size, [double]$inset, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml($pal['.']))
  $o = [math]::Floor($size * $inset)
  $inner = $size - 2 * $o
  for ($y = 0; $y -lt 16; $y++) {
    for ($x = 0; $x -lt 16; $x++) {
      $ch = [string]$rows[$y][$x]
      if ($ch -eq '.') { continue }
      $x0 = $o + [math]::Floor($x * $inner / 16); $x1 = $o + [math]::Floor(($x + 1) * $inner / 16)
      $y0 = $o + [math]::Floor($y * $inner / 16); $y1 = $o + [math]::Floor(($y + 1) * $inner / 16)
      $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($pal[$ch]))
      $g.FillRectangle($brush, $x0, $y0, $x1 - $x0, $y1 - $y0)
      $brush.Dispose()
    }
  }
  $g.Dispose()
  $bmp.Save((Join-Path $dir $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Make-Png 180 0.06 'icon-180.png'
Make-Png 192 0.06 'icon-192.png'
Make-Png 512 0.06 'icon-512.png'
Make-Png 512 0.18 'icon-maskable-512.png'

$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 18 18" shape-rendering="crispEdges"><rect x="-1" y="-1" width="18" height="18" fill="#0b0a0f"/>'
for ($y = 0; $y -lt 16; $y++) {
  for ($x = 0; $x -lt 16; $x++) {
    $ch = [string]$rows[$y][$x]
    if ($ch -ne '.') { $svg += '<rect x="' + $x + '" y="' + $y + '" width="1" height="1" fill="' + $pal[$ch] + '"/>' }
  }
}
$svg += '</svg>'
[IO.File]::WriteAllText((Join-Path $dir 'icon.svg'), $svg)
Get-ChildItem $dir | Select-Object Name, Length
