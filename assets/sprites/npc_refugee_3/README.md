# assets/sprites/npc_refugee_3/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## npc_refugee_3

- **Group:** E. NPCs and townsfolk — E2 Missing roles
- **Cell:** 96×96 · **Frames:** I8 × 5 dirs · **Anchor:** (48, 84)
- **Priority:** polish · **Loader:** ENGINE E9 · **Paint over:** `assets_templates/sprites/npc_refugee`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 768 × 480 | 8 frames × 5 dirs |
- Refugee look 3: all refugees share one sprite today; extra looks (child / hooded elder / old woman) stop a camp from being a row of clones.
