# assets/sprites/boss_tyrant/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## boss_tyrant

- **Group:** C. Bosses — C1 Boss sheets
- **Cell:** 192×192 · **Frames:** I8 W10 A12 C12 H3 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** important · **Loader:** Yes · **Paint over:** `assets_templates/sprites/boss_tyrant`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 1536 × 960 | 8 frames × 5 dirs |
| `walk.png` | 1920 × 960 | 10 frames × 5 dirs |
| `attack.png` | 2304 × 960 | 12 frames × 5 dirs |
| `cast.png` | 2304 × 960 | 12 frames × 5 dirs |
| `hit.png` | 576 × 960 | 3 frames × 5 dirs |
| `die.png` | 2688 × 960 | 14 frames × 5 dirs |
- Azgalor, the Ember Tyrant — Sits a throne of slag and waits for kindling. Act II, depth 15. Phases: demon on a clean-fire vein, sword; I Hoard (heals on the vein) → II Molten (slag cracks, floor lines of fire) → III The Promise (burning, roaring). Palette #7a1a1a / accent #ffb347; scale ×2.

## sprites/boss_tyrant/{idle,walk,attack,die}_p2.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_tyrant/{idle,walk,attack,die}_p2.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_tyrant` (base sheet)
- Azgalor, the Ember Tyrant phase variant p2 (Molten): same pose/frames as the base sheet, changed look (damage, glow, silhouette).

## sprites/boss_tyrant/{idle,walk,attack,die}_p3.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_tyrant/{idle,walk,attack,die}_p3.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_tyrant` (base sheet)
- Azgalor, the Ember Tyrant phase variant p3 (The Promise): same pose/frames as the base sheet, changed look (damage, glow, silhouette).
