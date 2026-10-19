# assets/sprites/boss_gravelord/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## boss_gravelord

- **Group:** C. Bosses — C1 Boss sheets
- **Cell:** 192×192 · **Frames:** I8 W10 A12 C12 H3 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** core · **Loader:** Yes · **Paint over:** `assets_templates/sprites/boss_gravelord`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 1536 × 960 | 8 frames × 5 dirs |
| `walk.png` | 1920 × 960 | 10 frames × 5 dirs |
| `attack.png` | 2304 × 960 | 12 frames × 5 dirs |
| `cast.png` | 2304 × 960 | 12 frames × 5 dirs |
| `hit.png` | 576 × 960 | 3 frames × 5 dirs |
| `die.png` | 2688 × 960 | 14 frames × 5 dirs |
- Morgrath the Gravelord — First king buried here. Last one still ruling. Act I, depth 5. Phases: skeleton king in a cracked crown with a great axe; I Sermon (calm) → II The Count, ring of names (crown glows) → III Last Rites (crown cracked, glowing eyes). Palette #e8e0c8 / accent #7a3bd0; scale ×1.9.

## sprites/boss_gravelord/{idle,walk,attack,die}_p2.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_gravelord/{idle,walk,attack,die}_p2.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_gravelord` (base sheet)
- Morgrath the Gravelord phase variant p2 (The Count): same pose/frames as the base sheet, changed look (damage, glow, silhouette).

## sprites/boss_gravelord/{idle,walk,attack,die}_p3.png

- **Group:** C. Bosses — C2 Boss phase variants
- **File(s):** `sprites/boss_gravelord/{idle,walk,attack,die}_p3.png` · **Canvas:** 1536/1920/2304/2688 × 960 · **Cell:** 192×192 · **Frames:** I8 W10 A12 D14 × 5 dirs · **Anchor:** (96, 168)
- **Priority:** polish · **Loader:** ENGINE E7 · **Paint over:** `assets_templates/sprites/boss_gravelord` (base sheet)
- Morgrath the Gravelord phase variant p3 (Last Rites, cracked crown): same pose/frames as the base sheet, changed look (damage, glow, silhouette).
