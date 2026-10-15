# assets/sprites/cave_bat/

Drop the files below here, then add each path to `assets/assets.js`. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## cave_bat

- **Group:** B. Monsters — B-caves
- **Cell:** 96×96 · **Frames:** I4 W8 A6 H2 D6 × 5 dirs · **Anchor:** (48, 84)
- **Priority:** core · **Loader:** Yes · **Paint over:** `assets_templates/sprites/cave_bat`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 384 × 480 | 4 frames × 5 dirs |
| `walk.png` | 768 × 480 | 8 frames × 5 dirs |
| `attack.png` | 576 × 480 | 6 frames × 5 dirs |
| `hit.png` | 192 × 480 | 2 frames × 5 dirs |
| `die.png` | 576 × 480 | 6 frames × 5 dirs |
- Gloom Bat — Erratic, fast, annoying. Airborne (hover bob in idle/walk); palette #4a3a4a / accent #c96a6a; scale ×0.7. Draw it hovering ~10 px above the anchor.
