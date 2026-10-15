# assets/sprites/imp/

Drop the files below here, then add each path to `assets/assets.js`. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## imp

- **Group:** B. Monsters — B-inferno
- **Cell:** 96×96 · **Frames:** I4 W8 A6 H2 D6 × 5 dirs · **Anchor:** (48, 84)
- **Priority:** important · **Loader:** Yes · **Paint over:** `assets_templates/sprites/imp`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 384 × 480 | 4 frames × 5 dirs |
| `walk.png` | 768 × 480 | 8 frames × 5 dirs |
| `attack.png` | 576 × 480 | 6 frames × 5 dirs |
| `hit.png` | 192 × 480 | 2 frames × 5 dirs |
| `die.png` | 576 × 480 | 6 frames × 5 dirs |
- Imp — Cackling sparks with teeth. Airborne (hover bob in idle/walk); palette #c94a2a / accent #ffb347; scale ×0.75. Draw it hovering ~10 px above the anchor.
