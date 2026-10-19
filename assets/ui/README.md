# assets/ui/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## ui/joystick_base.png

- **Group:** K. UI art — K5 Markers in the world
- **File(s):** `ui/joystick_base.png` · **Canvas:** 256 × 256 · **Cell:** ring, scaled to the stick size · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** Yes · **Paint over:** -
- Virtual joystick base (supported TODAY: loader name ui/joystick_base).

## ui/joystick_knob.png

- **Group:** K. UI art — K5 Markers in the world
- **File(s):** `ui/joystick_knob.png` · **Canvas:** 128 × 128 · **Cell:** knob · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** Yes · **Paint over:** -
- Virtual joystick knob (supported TODAY).

## ui/logo.png

- **Group:** K. UI art — K6 Title, branding, screens
- **File(s):** `ui/logo.png` · **Canvas:** 768 × 256 · **Cell:** transparent · **Frames:** 1 image · **Anchor:** -
- **Priority:** core · **Loader:** ENGINE E5 · **Paint over:** -
- SALLOW title logo: hand-lettered, cracked-iron/old-bone; works on a dark background (needs UI hookup, ENGINE E5).

## ui/title_bg_portrait.png

- **Group:** K. UI art — K6 Title, branding, screens
- **File(s):** `ui/title_bg_portrait.png` · **Canvas:** 1170 × 2532 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Title-screen backdrop for portrait phones: the Emberfall fissure at night, a lone lantern, no text. Keep the lower third dark for the menu.

## ui/title_bg_landscape.png

- **Group:** K. UI art — K6 Title, branding, screens
- **File(s):** `ui/title_bg_landscape.png` · **Canvas:** 2532 × 1170 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Same scene for landscape.

## ui/class_card_<class>.png (4 files)

- **Group:** K. UI art — K6 Title, branding, screens
- **File(s):** `ui/class_card_<class>.png (4 files)` · **Canvas:** 4 × (192 × 288) · **Cell:** single · **Frames:** 4 images · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Class-picker card art: full-height pose of each class with their signature weapon (replaces the live sprite on the card).

## ui/death_bg.png

- **Group:** K. UI art — K6 Title, branding, screens
- **File(s):** `ui/death_bg.png` · **Canvas:** 1170 × 2532 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- You-Died screen backdrop (the corpse and a dropped lantern from above).

## ui/act_card_<1..4>.png (4 files)

- **Group:** K. UI art — K6 Title, branding, screens
- **File(s):** `ui/act_card_<1..4>.png (4 files)` · **Canvas:** 4 × (1170 × 480) · **Cell:** single · **Frames:** 4 images · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Act title cards (Shallows, Deep, Hellscape, Endless) shown on first entering an act. Ties into docs/STORY.md.
