# assets/sprites/player_base/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## player_base

- **Group:** A. Player bodies and gear layers — A1 Base body
- **Cell:** 96×96 · **Frames:** I8 W12 A10 C10 H4 D10 × 5 dirs · **Anchor:** (48, 84)
- **Priority:** core · **Loader:** Yes · **Paint over:** `assets_templates/sprites/player_base`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 768 × 480 | 8 frames × 5 dirs |
| `walk.png` | 1152 × 480 | 12 frames × 5 dirs |
| `attack.png` | 960 × 480 | 10 frames × 5 dirs |
| `cast.png` | 960 × 480 | 10 frames × 5 dirs |
| `hit.png` | 384 × 480 | 4 frames × 5 dirs |
| `die.png` | 960 × 480 | 10 frames × 5 dirs |
- THE shared player body. Human body in plain underclothes (shirt, trousers, bare head and hands), NO weapon, NO armour. Height 56–60 px, neutral stance, same pose in every frame as every other class base. Every gear overlay is drawn on this body.
