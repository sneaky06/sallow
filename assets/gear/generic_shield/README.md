# assets/gear/generic_shield/

Drop the files below here, then add each path to `assets/assets.js`. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## generic_shield

- **Group:** A. Player bodies and gear layers — A2 Generic overlays
- **Cell:** 96×96 · **Frames:** I8 W12 A10 C10 H4 D10 × 5 dirs · **Anchor:** (48, 84)
- **Priority:** core · **Loader:** Yes · **Paint over:** `assets_templates/gear/generic_shield`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 768 × 480 | 8 frames × 5 dirs |
| `walk.png` | 1152 × 480 | 12 frames × 5 dirs |
| `attack.png` | 960 × 480 | 10 frames × 5 dirs |
| `cast.png` | 960 × 480 | 10 frames × 5 dirs |
| `hit.png` | 384 × 480 | 4 frames × 5 dirs |
| `die.png` | 960 × 480 | 10 frames × 5 dirs |
- Generic round/kite shield on the off arm. In back-view rows it is drawn BEHIND the body.
