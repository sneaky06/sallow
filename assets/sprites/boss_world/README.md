# assets/sprites/boss_world/

Drop the files below here, then add each path to `assets/assets.js`. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## boss_world

- **Group:** C. Bosses — C1 Boss sheets
- **Cell:** 192×192 · **Frames:** I8 W10 A12 C12 H3 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** important · **Loader:** Yes · **Paint over:** `assets_templates/sprites/boss_world`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 1536 × 960 | 8 frames × 5 dirs |
| `walk.png` | 1920 × 960 | 10 frames × 5 dirs |
| `attack.png` | 2304 × 960 | 12 frames × 5 dirs |
| `cast.png` | 2304 × 960 | 12 frames × 5 dirs |
| `hit.png` | 576 × 960 | 3 frames × 5 dirs |
| `die.png` | 2688 × 960 | 14 frames × 5 dirs |
- Oswin Marrow, the Hearthking — The founder. The hearth. The wound. Act III, depth 30 (world boss). Phases: Oswin Marrow, the Hearthking: I tired clean swordsman (human, founder's coat) → II roots tear him open, a red Ember beats inside (exposed 3 s windows) → III "the thing itself": the Ember stands up. Palette #5a3a2a / accent #ff8a2b; scale ×2.

## sprites/boss_world/{idle,walk,attack,die}_p2.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_world/{idle,walk,attack,die}_p2.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_world` (base sheet)
- Oswin Marrow, the Hearthking phase variant p2 (roots, Ember exposed): same pose/frames as the base sheet, changed look (damage, glow, silhouette).

## sprites/boss_world/{idle,walk,attack,die}_p3.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_world/{idle,walk,attack,die}_p3.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_world` (base sheet)
- Oswin Marrow, the Hearthking phase variant p3 (the thing itself): same pose/frames as the base sheet, changed look (damage, glow, silhouette).
