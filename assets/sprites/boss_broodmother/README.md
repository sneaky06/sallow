# assets/sprites/boss_broodmother/

Drop the files below here, then add each path to `assets/assets.js`. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## boss_broodmother

- **Group:** C. Bosses — C1 Boss sheets
- **Cell:** 192×192 · **Frames:** I8 W10 A12 C12 H3 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** core · **Loader:** Yes · **Paint over:** `assets_templates/sprites/boss_broodmother`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 1536 × 960 | 8 frames × 5 dirs |
| `walk.png` | 1920 × 960 | 10 frames × 5 dirs |
| `attack.png` | 2304 × 960 | 12 frames × 5 dirs |
| `cast.png` | 2304 × 960 | 12 frames × 5 dirs |
| `hit.png` | 576 × 960 | 3 frames × 5 dirs |
| `die.png` | 2688 × 960 | 14 frames × 5 dirs |
- Skarn the Broodmother — Every spider in the dark is hers. Act I, depth 10. Phases: giant spider, hangs from the roof in phase I (no ground contact) → II Hungry, drops and charges → III Mother, starving; bloated abdomen, egg sacs. Palette #2a1a2a / accent #7be04a; scale ×2.

## sprites/boss_broodmother/{idle,walk,attack,die}_p2.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_broodmother/{idle,walk,attack,die}_p2.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_broodmother` (base sheet)
- Skarn the Broodmother phase variant p2 (dropped, Hungry): same pose/frames as the base sheet, changed look (damage, glow, silhouette).

## sprites/boss_broodmother/{idle,walk,attack,die}_p3.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_broodmother/{idle,walk,attack,die}_p3.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_broodmother` (base sheet)
- Skarn the Broodmother phase variant p3 (starving Mother): same pose/frames as the base sheet, changed look (damage, glow, silhouette).
