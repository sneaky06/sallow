# assets/ui/inventory/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## ui/inventory/cell.png

- **Group:** K. UI art — K2 Inventory, equipment and rarity
- **File(s):** `ui/inventory/cell.png` · **Canvas:** 64 × 64 · **Cell:** single (tiles in a grid) · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Empty inventory/stash slot: dark inset square with a bevel.

## ui/inventory/cell_{hover,selected}.png

- **Group:** K. UI art — K2 Inventory, equipment and rarity
- **File(s):** `ui/inventory/cell_{hover,selected}.png` · **Canvas:** 2 × (64 × 64) · **Cell:** single · **Frames:** 2 images · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Hover / selected highlight.

## ui/inventory/slot_<slot>.png (9 files)

- **Group:** K. UI art — K2 Inventory, equipment and rarity
- **File(s):** `ui/inventory/slot_<slot>.png (9 files)` · **Canvas:** 9 × (64 × 64) · **Cell:** single · **Frames:** 9 images · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Paper-doll silhouettes (grey, low contrast): weapon, offhand, helm, chest, gloves, boots, belt, amulet, ring (shared by ring1/ring2).

## ui/inventory/doll_bg.png

- **Group:** K. UI art — K2 Inventory, equipment and rarity
- **File(s):** `ui/inventory/doll_bg.png` · **Canvas:** 256 × 320 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Background of the paper-doll area (the live player preview is drawn over it).

## ui/inventory/socket_{empty,filled}.png

- **Group:** K. UI art — K2 Inventory, equipment and rarity
- **File(s):** `ui/inventory/socket_{empty,filled}.png` · **Canvas:** 2 × (16 × 16) · **Cell:** single · **Frames:** 2 images · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Socket pips on items (empty ring / filled hole).

## ui/inventory/badges.png

- **Group:** K. UI art — K2 Inventory, equipment and rarity
- **File(s):** `ui/inventory/badges.png` · **Canvas:** 8 × (16 × 16) · **Cell:** sheet 128 × 16 · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Small corner badges, in order: locked, junk, new, upgrade-up arrow, downgrade arrow, set piece, corrupted, wanted-for-collection.

## ui/inventory/gold.png

- **Group:** K. UI art — K2 Inventory, equipment and rarity
- **File(s):** `ui/inventory/gold.png` · **Canvas:** 24 × 24 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Gold counter coin glyph.

## ui/inventory/sort_icons.png

- **Group:** K. UI art — K2 Inventory, equipment and rarity
- **File(s):** `ui/inventory/sort_icons.png` · **Canvas:** 4 × (24 × 24) · **Cell:** sheet 96 × 24 · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Sort, auto-sort, junk-clear, filter buttons.

## ui/inventory/stash_bg.png

- **Group:** K. UI art — K2 Inventory, equipment and rarity
- **File(s):** `ui/inventory/stash_bg.png` · **Canvas:** 256 × 256 · **Cell:** tiles · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Stash/chute backdrop (wood and rope).
