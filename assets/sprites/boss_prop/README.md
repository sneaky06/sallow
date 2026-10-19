# assets/sprites/boss_prop/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## boss_prop

- **Group:** B. Monsters — B-event
- **Cell:** 96×96 · **Frames:** I4 W8 A6 H2 D6 × 5 dirs · **Anchor:** (48, 84)
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/sprites/boss_prop`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 384 × 480 | 4 frames × 5 dirs |
| `walk.png` | 768 × 480 | 8 frames × 5 dirs |
| `attack.png` | 576 × 480 | 6 frames × 5 dirs |
| `hit.png` | 192 × 480 | 2 frames × 5 dirs |
| `die.png` | 576 × 480 | 6 frames × 5 dirs |
- Egg Sac — Warm. Amorphous; palette #e8d8a0 / accent #ffb347; scale ×0.9.

## sprites/boss_prop/{idle}.png

- **Group:** C. Bosses — C3 Boss-owned objects
- **File(s):** `sprites/boss_prop/{idle}.png` · **Canvas:** 576 × 480 · **Cell:** 96×96 · **Frames:** I6 × 5 dirs (a static object: 1 pose is fine, repeat it) · **Anchor:** (48, 84)
- **Priority:** important · **Loader:** Yes (one look) · **Paint over:** `assets_templates/sprites/boss_prop`
- Inert object a boss/Fallen owns: currently the Egg Sac (warm glowing sac, 20 HP) and Rope Anchor (Sefa Lind fight) share this one blob sprite with a colour override. Draw an egg sac.
