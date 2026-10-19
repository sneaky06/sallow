# tools/

Scripts for the art and sound pipeline. Windows PowerShell only, no Node/Python; the generator uses headless Chrome or Edge (silent, `--mute-audio`).

| Script | What it does |
|---|---|
| `scan-assets.ps1` | **The one you use.** Regenerates `assets/assets.js` from the files under `assets/`, leaving out every placeholder. `-Check` only compares (exit 1 when out of date). |
| `make-placeholders.ps1` | Generates every placeholder (PNG and WAV) at its exact catalog path from `docs/ART_CATALOG.md` and `docs/SOUND_DESIGN.md`, writes `assets/placeholders.json`, runs the scanner. Never overwrites a file of yours. |
| `placeholders/` | The generator's parts: `gen.html` (page), `catalog.js` (catalog parsers), `art.js` (PNG sketches + guides + indexed-PNG writer), `sound.js` (stand-ins, WAV writer), `run.js` (driver), `receiver.ps1` (localhost writer), `record-hashes.ps1` (writes `assets/placeholders.json`), `report.json` (the last run). |

## Replacing a placeholder

1. Save your finished file over the placeholder **with the same name** (art `.png`; sound `.m4a`, `.mp3` or `.wav`).
2. It goes live on the next push, or run `powershell -ExecutionPolicy Bypass -File tools/scan-assets.ps1` to test locally and reload the game.

Enable the pre-commit hook once (`git config core.hooksPath .githooks`) and step 2 happens by itself on every commit.

## How placeholders are told from your files

`assets/placeholders.json` maps every placeholder path to the SHA-1 it was generated with. A file under `assets/` that still has that hash is a placeholder and is never listed in `assets/assets.js` (so the game never loads it and the service worker never caches it).
Any other file is yours: a changed placeholder, a new file beside it with another extension (`name.m4a` beside `name.wav`), or a path that was never a placeholder.
`tests/all.html` section 5 fails when `assets/assets.js` is not what the scanner would write.
