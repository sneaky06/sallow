# Regenerates assets/assets.js from what is really in assets/: your own files, never the placeholders.
#
#   powershell -ExecutionPolicy Bypass -File tools/scan-assets.ps1            regenerate assets/assets.js
#   powershell -ExecutionPolicy Bypass -File tools/scan-assets.ps1 -Check     only compare: exit 1 when assets/assets.js is out of date
#
# Workflow: save your finished file over the placeholder with the same name (art: .png; sound: any of .m4a .mp3 .wav ...), then run this
# (or just push: it goes live on the next push because this runs on the files you committed - run it before you commit).
#
# How a placeholder is told from your file: assets/placeholders.json holds the SHA-1 of every placeholder as it was generated.
#   * a file whose hash still matches its placeholder is ignored (the game keeps its procedural art / synthesized sound);
#   * any other file (different content, or a path that was never a placeholder) is yours and is listed;
#   * a sound with a differently-extensioned file next to its placeholder (name.m4a beside name.wav) lists only your file.
#     If you have several real extensions of one sound the preference is m4a, mp3, aac, ogg, wav.
# Optional assets/timing.json keeps per-file playback settings: { "sprites/goblin/walk.png": { "fps": 12, "loop": false, "stride": 80 } }.
param([switch]$Check, [switch]$Quiet)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$assets = Join-Path $repo 'assets'
$out = Join-Path $assets 'assets.js'
function Say([string]$m) { if (-not $Quiet) { Write-Host $m } }

# --- placeholder hashes -------------------------------------------------------------------------------------------------------
$ph = @{}
$phFile = Join-Path $assets 'placeholders.json'
if (Test-Path $phFile) {
  $json = [IO.File]::ReadAllText($phFile) | ConvertFrom-Json
  foreach ($p in $json.files.PSObject.Properties) { $ph[$p.Name] = $p.Value }
} else { Write-Host "note: assets/placeholders.json not found - every file under assets/ will be listed" }

$timing = @{}
$tFile = Join-Path $assets 'timing.json'
if (Test-Path $tFile) { foreach ($p in ([IO.File]::ReadAllText($tFile) | ConvertFrom-Json).PSObject.Properties) { $timing[$p.Name] = $p.Value } }

# --- walk assets/ ---------------------------------------------------------------------------------------------------------------
$sha = [Security.Cryptography.SHA1]::Create()
$artRe = '^(tiles|sprites|props|icons|projectiles|portraits|gear|fx|ui)/(?:[a-z0-9_]+/)*[a-z0-9_]+\.png$'
$sndRe = '^sound/(?:[a-z0-9_]+/)*[a-z0-9_]+\.(m4a|mp3|aac|ogg|wav)$'
$pref = @{ m4a = 0; mp3 = 1; aac = 2; ogg = 3; wav = 4 }
$base = (Resolve-Path $assets).Path.TrimEnd('\') + '\'
$art = New-Object Collections.Generic.List[string]
$snd = @{}          # key (path without extension) -> list of real files
$nPlaceholders = 0; $warn = 0
foreach ($f in Get-ChildItem $assets -Recurse -File) {
  if ($f.Extension -notmatch '^\.(png|m4a|mp3|aac|ogg|wav)$') { continue }
  $rel = $f.FullName.Substring($base.Length).Replace('\', '/')
  if ($rel -cnotmatch $artRe -and $rel -cnotmatch $sndRe) { Write-Host "warning: $rel is not a valid asset path (lower-case snake_case, see ART_SPEC.md) - ignored"; $warn++; continue }
  if ($ph.ContainsKey($rel)) {
    $hash = ([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($f.FullName))) -replace '-', '').ToLower()
    if ($hash -eq $ph[$rel]) { $nPlaceholders++; continue }
  }
  if ($rel -cmatch $sndRe) {
    $key = $rel.Substring(0, $rel.LastIndexOf('.'))
    if (-not $snd.ContainsKey($key)) { $snd[$key] = New-Object Collections.Generic.List[string] }
    $snd[$key].Add($rel)
  } else { $art.Add($rel) }
}

# one file per sound: the preferred extension
$chosen = New-Object Collections.Generic.List[string]
foreach ($key in $snd.Keys) {
  $c = @($snd[$key] | Sort-Object { $pref[$_.Substring($_.LastIndexOf('.') + 1)] })
  if ($c.Count -gt 1) { Write-Host ("warning: " + $key + " has several real files (" + (($c | ForEach-Object { $_.Substring($_.LastIndexOf('.')) }) -join ' ') + "); listing " + $c[0]); $warn++ }
  $chosen.Add($c[0])
}
# the loader keys sounds on the file name alone: names must be unique across folders
$names = @{}
foreach ($s in ($chosen | Sort-Object)) {
  $n = [IO.Path]::GetFileNameWithoutExtension($s)
  if ($names.ContainsKey($n)) { Write-Host "warning: sound name '$n' is used by $($names[$n]) and $s - the game keeps the first"; $warn++ } else { $names[$n] = $s }
}

# --- assets.js ------------------------------------------------------------------------------------------------------------------
function Entry([string]$p) {
  if ($timing.ContainsKey($p)) {
    $t = $timing[$p]; $parts = @("file: '$p'")
    if ($null -ne $t.fps) { $parts += "fps: $($t.fps)" }
    if ($null -ne $t.loop -and -not [bool]$t.loop) { $parts += 'loop: false' }
    if ($null -ne $t.stride) { $parts += "stride: $($t.stride)" }
    if ($parts.Count -gt 1) { return "  { " + ($parts -join ', ') + " }," }
  }
  return "  '$p',"
}
$all = New-Object 'Collections.Generic.List[string]'; $all.AddRange($art); $all.AddRange($chosen); $all.Sort([StringComparer]::Ordinal)
$sb = New-Object Text.StringBuilder
[void]$sb.Append("// GENERATED by tools/scan-assets.ps1 - do not edit by hand. It lists only the files YOU made: a file that still equals its placeholder`n")
[void]$sb.Append("// (assets/placeholders.json) is left out, so the game keeps its procedural art and synthesized sound until you save over it.`n")
[void]$sb.Append("// Per-file fps / loop / stride go in assets/timing.json. See ART_SPEC.md.`n")
[void]$sb.Append("window.G.assetList = [`n")
foreach ($p in $all) { [void]$sb.Append((Entry $p) + "`n") }
[void]$sb.Append("];`n")
$text = $sb.ToString()

$current = if (Test-Path $out) { ([IO.File]::ReadAllText($out)) -replace "`r`n", "`n" } else { '' }
$same = ($current -eq $text)
if ($Check) {
  if ($same) { Say "assets/assets.js is up to date ($($art.Count) art + $($chosen.Count) sound files of yours; $nPlaceholders placeholders ignored)"; exit 0 }
  Write-Host "assets/assets.js is OUT OF DATE: run tools/scan-assets.ps1 (it would list $($art.Count) art + $($chosen.Count) sound files)"; exit 1
}
[IO.File]::WriteAllText($out, $text, (New-Object Text.UTF8Encoding $false))
Say ("assets/assets.js: " + ($(if ($same) { 'unchanged' } else { 'rewritten' })) + " - $($art.Count) art + $($chosen.Count) sound files listed; $nPlaceholders placeholders ignored; $warn warning(s)")
