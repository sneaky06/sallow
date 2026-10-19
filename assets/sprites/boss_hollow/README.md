# assets/sprites/boss_hollow/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## boss_hollow

- **Group:** C. Bosses — C1 Boss sheets
- **Cell:** 192×192 · **Frames:** I8 W10 A12 C12 H3 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** important · **Loader:** Yes · **Paint over:** `assets_templates/sprites/boss_hollow`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 1536 × 960 | 8 frames × 5 dirs |
| `walk.png` | 1920 × 960 | 10 frames × 5 dirs |
| `attack.png` | 2304 × 960 | 12 frames × 5 dirs |
| `cast.png` | 2304 × 960 | 12 frames × 5 dirs |
| `hit.png` | 576 × 960 | 3 frames × 5 dirs |
| `die.png` | 2688 × 960 | 14 frames × 5 dirs |
- Xal'thuun, the Hollow Star — A hole where a god used to be. Act II, depth 20. Phases: hollow wraith star with one great eye; I Gaze → II Hollow (shell splits; inside pulls, shards orbit) → III Blink (eye closed, darkness). Palette #3a1a6a / accent #d8c8ff; scale ×2.1.

## sprites/boss_hollow/{idle,walk,attack,die}_p2.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_hollow/{idle,walk,attack,die}_p2.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_hollow` (base sheet)
- Xal'thuun, the Hollow Star phase variant p2 (shell split): same pose/frames as the base sheet, changed look (damage, glow, silhouette).

## sprites/boss_hollow/{idle,walk,attack,die}_p3.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_hollow/{idle,walk,attack,die}_p3.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_hollow` (base sheet)
- Xal'thuun, the Hollow Star phase variant p3 (eye closed): same pose/frames as the base sheet, changed look (damage, glow, silhouette).
