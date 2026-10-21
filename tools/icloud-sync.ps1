# Moves art and sound between the project's assets/ folder and iCloud Drive\Sallow Art (for drawing/recording on the iPad).
#   powershell -ExecutionPolicy Bypass -File tools/icloud-sync.ps1 -Out   # project -> iCloud: placeholders and READMEs you don't have yet
#   powershell -ExecutionPolicy Bypass -File tools/icloud-sync.ps1 -In    # iCloud -> project: every file you changed (not a placeholder)
# -Out never overwrites a file in iCloud that differs from its placeholder (your work is never replaced).
# -In copies only files whose content is not their placeholder (assets/placeholders.json) and differs from the project's copy,
# then runs tools/scan-assets.ps1 so assets/assets.js lists them. Nothing is ever deleted on either side.
param([switch]$Out, [switch]$In, [string]$ICloud = '', [switch]$WhatIf)

$repo   = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$assets = Join-Path $repo 'assets'
if (-not $ICloud) {
  $k = 'HKCU:\Software\Classes\CLSID\{DCFF24B0-A658-4CF6-B132-8A4DEFAC6695}\Instance\InitPropertyBag'
  $root = $null
  if (Test-Path $k) { $root = (Get-ItemProperty $k).TargetFolderPath }
  if (-not $root -or -not (Test-Path $root)) { $root = @("$env:USERPROFILE\iCloudDrive", 'T:\iCloud\Files\iCloudDrive') | Where-Object { Test-Path $_ } | Select-Object -First 1 }
  if (-not $root) { Write-Host 'iCloud Drive folder not found. Pass -ICloud <path>.'; exit 2 }
  $ICloud = Join-Path $root 'Sallow Art'
}
if (-not ($Out -or $In)) { Write-Host 'Use -Out (project -> iCloud) or -In (iCloud -> project).'; exit 2 }

# placeholder hashes: relative path (forward slashes) -> sha1
$ph = @{}
$phFile = Join-Path $assets 'placeholders.json'
if (Test-Path $phFile) {
  $json = Get-Content $phFile -Raw | ConvertFrom-Json
  $map = if ($json.files) { $json.files } else { $json }
  foreach ($p in $map.PSObject.Properties) { $ph[$p.Name.ToLower()] = [string]$p.Value }
}
function Sha1($path) { (Get-FileHash -Algorithm SHA1 -LiteralPath $path).Hash.ToLower() }
function Rel($base, $full) { $full.Substring($base.Length).TrimStart('\').Replace('\', '/') }
function IsPlaceholder($rel, $full) {
  $key = $rel.ToLower()
  if (-not $ph.ContainsKey($key)) { return $false }
  return (Sha1 $full) -eq $ph[$key].ToLower()
}
$skip = @('assets.js', 'placeholders.json', 'timing.json')

if ($Out) {
  $n = 0; $kept = 0
  Get-ChildItem $assets -Recurse -File | ForEach-Object {
    $rel = Rel $assets $_.FullName
    if ($skip -contains $rel) { return }
    $dest = Join-Path $ICloud $rel
    if (Test-Path -LiteralPath $dest) {
      if ((IsPlaceholder $rel $dest) -or $_.Name -eq 'README.md') {
        if ((Sha1 $dest) -ne (Sha1 $_.FullName)) { if (-not $WhatIf) { Copy-Item -LiteralPath $_.FullName $dest -Force }; $n++ }
      } else { $kept++ }
      return
    }
    if (-not $WhatIf) { New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null; Copy-Item -LiteralPath $_.FullName $dest }
    $n++
  }
  Write-Host "Out: $n file(s) copied to $ICloud; $kept of your own file(s) there left untouched."
}

if ($In) {
  if (-not (Test-Path $ICloud)) { Write-Host "Nothing at $ICloud"; exit 0 }
  $copied = @()
  Get-ChildItem $ICloud -Recurse -File | ForEach-Object {
    $rel = Rel $ICloud $_.FullName
    if ($skip -contains $rel -or $_.Name -eq 'README.md' -or $_.Name -eq 'desktop.ini' -or $_.Name.StartsWith('.')) { return }
    if (IsPlaceholder $rel $_.FullName) { return }
    $dest = Join-Path $assets $rel
    if ((Test-Path -LiteralPath $dest) -and (Sha1 $dest) -eq (Sha1 $_.FullName)) { return }
    if (-not $WhatIf) { New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null; Copy-Item -LiteralPath $_.FullName $dest -Force }
    $copied += $rel
  }
  Write-Host "In: $($copied.Count) file(s) of yours copied into assets/:"
  $copied | ForEach-Object { Write-Host "  $_" }
  if ($copied.Count -and -not $WhatIf) { & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'tools\scan-assets.ps1') }
}
