# assets/

Hand-drawn art and sound overrides. A file you save here replaces the generated version of that piece; everything still a placeholder keeps the generated art and synthesized sound.

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

## Workflow: replace a placeholder

Every file in the catalogs already exists here as a **placeholder** at its exact path, name and format (a PNG of the right size with cell borders, the feet-anchor cross, frame/direction labels and, where the game has procedural art, a rough sketch of it; a tiny WAV of the right length class). To deliver a file:

1. **Save your finished file over the placeholder with the same name** (art: `.png`; sound: any of `.m4a` / `.mp3` / `.wav`, same base name - the placeholder `.wav` may stay next to your `.m4a`, it is ignored).
2. **It goes live on the next push** (the pre-commit hook in `.githooks/` runs `tools/scan-assets.ps1`), **or run `tools/scan-assets.ps1` to test it locally** and reload the game.

How it works: `assets/assets.js` is generated and lists only files that are *not* placeholders. `assets/placeholders.json` holds the SHA-1 of every placeholder; a file whose content still matches is skipped, so the game never loads a placeholder and keeps its procedural art / synthesized sound for everything you have not replaced yet (the service worker never caches a placeholder either). Do not edit `assets.js` by hand. Per-file animation timing (`fps`, `loop`, `stride`) goes in `assets/timing.json`: `{ "sprites/goblin/walk.png": { "fps": 12 } }`.

Placeholders are regenerated from the catalogs by `tools/make-placeholders.ps1` (it never overwrites a file of yours).
Folders marked ENGINE in the catalog (e.g. `icons/items/`, `ui/frames/`) are accepted by the folder tree but need an engine/UI change before the game reads them.
