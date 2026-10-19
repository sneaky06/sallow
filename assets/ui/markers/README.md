# assets/ui/markers/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## ui/markers/target_{normal,champion,boss}.png

- **Group:** K. UI art — K5 Markers in the world
- **File(s):** `ui/markers/target_{normal,champion,boss}.png` · **Canvas:** 3 × (64 × 32) · **Cell:** iso ellipse, centre (32,16) · **Frames:** 3 images · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Ground ring under the current target: normal white, champion gold, boss red.

## ui/markers/player_ring.png

- **Group:** K. UI art — K5 Markers in the world
- **File(s):** `ui/markers/player_ring.png` · **Canvas:** 64 × 32 · **Cell:** iso ellipse · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Soft ring under the player (selection).

## ui/markers/stairs_{down,up}.png

- **Group:** K. UI art — K5 Markers in the world
- **File(s):** `ui/markers/stairs_{down,up}.png` · **Canvas:** 2 × (24 × 24) · **Cell:** bobbing arrow · **Frames:** 2 images · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- The orange (down) and blue (up) arrows that float over the stairs (today procedural arrowDown/arrowUp).

## ui/markers/quest_{available,active,ready}.png

- **Group:** K. UI art — K5 Markers in the world
- **File(s):** `ui/markers/quest_{available,active,ready}.png` · **Canvas:** 3 × (24 × 32) · **Cell:** above the NPC head · **Frames:** 3 images · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Quest markers over NPCs: gold "!" (available), grey "…" (active), gold "?" (ready to hand in).

## ui/markers/interact_{chest,shrine,talk,loot}.png

- **Group:** K. UI art — K5 Markers in the world
- **File(s):** `ui/markers/interact_{chest,shrine,talk,loot}.png` · **Canvas:** 4 × (32 × 32) · **Cell:** single · **Frames:** 4 images · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Floating interact prompts shown near things you can use.

## ui/markers/loot_label.png

- **Group:** K. UI art — K5 Markers in the world
- **File(s):** `ui/markers/loot_label.png` · **Canvas:** 64 × 24 · **Cell:** 9-slice horizontal · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Plate behind ground-loot names (rarity colour is the text).
