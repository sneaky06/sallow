# assets/sprites/gazer/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## gazer

- **Group:** B. Monsters — B-abyss
- **Cell:** 96×96 · **Frames:** I6 W10 A8 C8 H3 D8 × 5 dirs · **Anchor:** (48, 84)
- **Priority:** important · **Loader:** Yes · **Paint over:** `assets_templates/sprites/gazer`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 576 × 480 | 6 frames × 5 dirs |
| `walk.png` | 960 × 480 | 10 frames × 5 dirs |
| `attack.png` | 768 × 480 | 8 frames × 5 dirs |
| `cast.png` | 768 × 480 | 8 frames × 5 dirs |
| `hit.png` | 288 × 480 | 3 frames × 5 dirs |
| `die.png` | 768 × 480 | 8 frames × 5 dirs |
- Gazer — An eye that hates what it sees. Airborne (hover bob in idle/walk); palette #3a2a5a / accent #fff06a; scale ×1. Ranged/caster: cast.png = its shot/spell animation. Draw it hovering ~10 px above the anchor.
