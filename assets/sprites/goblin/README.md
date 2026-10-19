# assets/sprites/goblin/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## goblin

- **Group:** B. Monsters — B-caves
- **Cell:** 96×96 · **Frames:** I4 W8 A6 H2 D6 × 5 dirs · **Anchor:** (48, 84)
- **Priority:** core · **Loader:** Yes · **Paint over:** `assets_templates/sprites/goblin`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 384 × 480 | 4 frames × 5 dirs |
| `walk.png` | 768 × 480 | 8 frames × 5 dirs |
| `attack.png` | 576 × 480 | 6 frames × 5 dirs |
| `hit.png` | 192 × 480 | 2 frames × 5 dirs |
| `die.png` | 576 × 480 | 6 frames × 5 dirs |
- Cave Goblin — Vicious, quick, cowardly in ones. Humanoid, carries a dagger (paint it in); palette #5f8a3a / accent #8a5a2a; scale ×0.85.
