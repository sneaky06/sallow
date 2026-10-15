# assets/ui/appicon/

Drop the files below here, then add each path to `assets/assets.js`. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## ui/appicon/appicon_<size>.png

- **Group:** K. UI art — K7 App icon
- **File(s):** `ui/appicon/appicon_<size>.png` · **Canvas:** 1024 master + sizes below · **Cell:** single each · **Frames:** 17 images · **Anchor:** -
- **Priority:** core · **Loader:** Manual: copy the four web sizes to icons/ (manifest); ui/appicon.png needs hookup E5 · **Paint over:** -
- Export from one 1024 master: 1024 = App Store / master (no transparency, no rounded corners); 180 = apple-touch-icon — iPhone @3x, THE one the PWA uses today (icons/icon-180.png); 167 = iPad Pro @2x; 152 = iPad @2x; 120 = iPhone @2x; 87 = iPhone settings @3x; 80 = Spotlight @2x; 76 = iPad @1x; 60 = iPhone @1x; 58 = settings @2x; 40 = Spotlight @1x; 29 = settings @1x; 20 = notification @1x. Web-manifest copies used by index.html/manifest.webmanifest: icons/icon-180.png, icon-192.png, icon-512.png, icon-maskable-512.png (maskable: emblem inside the central 66% safe zone), icon.svg. Replaces the generated emblem (icons/make-icons.ps1).
