# assets/

Hand-drawn art overrides. Anything listed in `assets/assets.js` replaces the generated version of that piece; everything else keeps its generated art.

Start with `docs/ART_CATALOG.md` (the full checklist, canvas sizes, frames, anchors, priorities and the drawing order). Formats: `ART_SPEC.md`. Paint-over templates: `assets_templates/` (same paths, same sizes).

| Folder | Contents |
|---|---|
| `sprites/<id>/` | character animation sheets: class, monster, boss, Fallen, NPC, `player_base` |
| `gear/<key>/` | gear overlays (armour, weapons, off-hands) on the player_base grid |
| `tiles/` | 256 × 1344 tile sheets per theme and floor variant |
| `props/` | props, 96 × 128 per frame |
| `icons/` | 64 × 64 icons (shapes, then keyed sub-folders) |
| `projectiles/` | 32 × 32 shots pointing right |
| `fx/` | effect strips of 128 × 128 frames |
| `ui/` | interface art, markers, title, app icon, splash |
| `portraits/` | 96 × 96 portraits |

Folders marked ENGINE in the catalog (e.g. `icons/items/`, `ui/frames/`) are accepted by the folder tree but need an engine/UI change before the game reads them.
