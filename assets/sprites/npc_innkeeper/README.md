# assets/sprites/npc_innkeeper/

Drop the files below here, then add each path to `assets/assets.js`. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## npc_innkeeper

- **Group:** E. NPCs and townsfolk — E2 Missing roles
- **Cell:** 96×96 · **Frames:** I8 × 5 dirs · **Anchor:** (48, 84)
- **Priority:** polish · **Loader:** ENGINE E9 · **Paint over:** `assets_templates/sprites/npc_merchant`

| File | Canvas (px) | Frames |
|---|---|---|
| `idle.png` | 768 × 480 | 8 frames × 5 dirs |
- The innkeeper: no NPC role exists in the code yet (the inn is the prop pair inn + inn_fire). Warm, stout, apron and rag, tankard in hand. Needs the role to be added before it appears.
