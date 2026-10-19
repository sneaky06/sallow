# assets/tiles/

Save your finished file over the placeholder with the same name (PNG). It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally. Full specs: [`docs/ART_CATALOG.md`](../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## tiles/town.png

- **Group:** F. Tiles — F1 Theme sheets
- **File(s):** `tiles/town.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 cols × 14 rows · **Frames:** row table: variants / animation frames per row · **Anchor:** diamond bottom-centre; corners (0,80) (32,64) (63,80) (32,95)
- **Priority:** core · **Loader:** Yes · **Paint over:** `assets_templates/tiles/town.png`
- town: dying settlement, mud and ash, leaning timber, dead grass, cobbles and puddles; walls = house fronts and palisade

## tiles/crypt.png

- **Group:** F. Tiles — F1 Theme sheets
- **File(s):** `tiles/crypt.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 cols × 14 rows · **Frames:** row table: variants / animation frames per row · **Anchor:** diamond bottom-centre; corners (0,80) (32,64) (63,80) (32,95)
- **Priority:** core · **Loader:** Yes · **Paint over:** `assets_templates/tiles/crypt.png`
- crypt: cold damp stone, grave dirt, cracked flags, bones in the rubble, shallow drains for water

## tiles/caves.png

- **Group:** F. Tiles — F1 Theme sheets
- **File(s):** `tiles/caves.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 cols × 14 rows · **Frames:** row table: variants / animation frames per row · **Anchor:** diamond bottom-centre; corners (0,80) (32,64) (63,80) (32,95)
- **Priority:** important · **Loader:** Yes · **Paint over:** `assets_templates/tiles/caves.png`
- caves: wet black rock, pale fungus, stagnant water that glints; walls = raw rock

## tiles/inferno.png

- **Group:** F. Tiles — F1 Theme sheets
- **File(s):** `tiles/inferno.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 cols × 14 rows · **Frames:** row table: variants / animation frames per row · **Anchor:** diamond bottom-centre; corners (0,80) (32,64) (63,80) (32,95)
- **Priority:** important · **Loader:** Yes · **Paint over:** `assets_templates/tiles/inferno.png`
- inferno: scorched basalt, glowing cracks, chains, lava as the star; walls = fused black slag

## tiles/abyss.png

- **Group:** F. Tiles — F1 Theme sheets
- **File(s):** `tiles/abyss.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 cols × 14 rows · **Frames:** row table: variants / animation frames per row · **Anchor:** diamond bottom-centre; corners (0,80) (32,64) (63,80) (32,95)
- **Priority:** important · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png`
- abyss: flesh and void: pale tendrils, eyes in the walls, a chasm that is near-black; floor feels organic

## tiles/crypt_restless_graves.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/crypt_restless_graves.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/crypt.png` (paint over the theme template)
- Restless Graves (depth 1–4): theme sheet tinted #8aa0c8; ambient dust; layouts ossuary_halls, collapsed_catacomb.

## tiles/crypt_forgotten_cellars.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/crypt_forgotten_cellars.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/crypt.png` (paint over the theme template)
- Forgotten Cellars (depth 1–3): theme sheet tinted #b08a5a; ambient dust; layouts collapsed_catacomb, ossuary_halls.

## tiles/crypt_ossuary.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/crypt_ossuary.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/crypt.png` (paint over the theme template)
- Ossuary (depth 2–5): theme sheet tinted #d8d0a8; ambient dust; layouts ossuary_halls, collapsed_catacomb.

## tiles/crypt_drowned_vaults.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/crypt_drowned_vaults.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/crypt.png` (paint over the theme template)
- Drowned Vaults (depth 3–5): theme sheet tinted #4fb8b0; liquid #1f7f86; ambient bubble; layouts flooded_crypt, ossuary_halls.

## tiles/crypt_gravelord_approach.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/crypt_gravelord_approach.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/crypt.png` (paint over the theme template)
- Gravelord's Approach (depth 5–5): theme sheet tinted #7a3a9a; ambient mote; layouts ossuary_halls, collapsed_catacomb, flooded_crypt.

## tiles/caves_mossy_caverns.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/caves_mossy_caverns.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/caves.png` (paint over the theme template)
- Mossy Caverns (depth 6–10): theme sheet tinted #6ca860; ambient spore; layouts caverns, warrens.

## tiles/caves_fungal_warrens.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/caves_fungal_warrens.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/caves.png` (paint over the theme template)
- Fungal Warrens (depth 6–9): theme sheet tinted #7a5ad0; ambient spore; layouts warrens, caverns.

## tiles/caves_crystal_lake.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/caves_crystal_lake.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/caves.png` (paint over the theme template)
- Crystal Lake (depth 7–10): theme sheet tinted #5a9ae0; liquid #2a74c0; ambient mote; layouts underground_lake, caverns.

## tiles/caves_amber_hollows.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/caves_amber_hollows.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/caves.png` (paint over the theme template)
- Amber Hollows (depth 6–8): theme sheet tinted #c8883a; ambient dust; layouts caverns, underground_lake, warrens.

## tiles/inferno_smouldering_halls.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/inferno_smouldering_halls.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/inferno.png` (paint over the theme template)
- Smouldering Halls (depth 11–14): theme sheet tinted #e06a3a; liquid #ff5a1e; ambient ember; layouts broken_halls, ash_fields.

## tiles/inferno_magma_flows.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/inferno_magma_flows.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/inferno.png` (paint over the theme template)
- Magma Flows (depth 12–15): theme sheet tinted #ff4a1e; liquid #ff7a1e; ambient ember; layouts magma_flows, broken_halls.

## tiles/inferno_ash_wastes.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/inferno_ash_wastes.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/inferno.png` (paint over the theme template)
- Ash Wastes (depth 11–15): theme sheet tinted #a09a98; ambient ash; layouts ash_fields, broken_halls.

## tiles/inferno_forgeworks.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/inferno_forgeworks.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/inferno.png` (paint over the theme template)
- Forgeworks (depth 13–15): theme sheet tinted #ffa84a; liquid #ff9a2a; ambient ember; layouts broken_halls, magma_flows.

## tiles/abyss_starless_isles.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_starless_isles.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- Starless Isles (depth 16–20): theme sheet tinted #5a4ad0; ambient mote; layouts floating_chambers, scattered_isles.

## tiles/abyss_shattered_spire.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_shattered_spire.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- Shattered Spire (depth 16–20): theme sheet tinted #8a5ac8; ambient rune; layouts shattered_spire, floating_chambers.

## tiles/abyss_glasswork_drift.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_glasswork_drift.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- Glasswork Drift (depth 16–20): theme sheet tinted #5ad0c8; ambient mote; layouts scattered_isles, floating_chambers.

## tiles/abyss_fallen_cathedral.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_fallen_cathedral.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- Fallen Cathedral (depth 21–30): theme sheet tinted #7a6a98; ambient dust; layouts fallen_cathedral, shattered_spire.

## tiles/abyss_cinder_drift.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_cinder_drift.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- Cinder Drift (depth 21–30): theme sheet tinted #b04a5a; liquid #ff4a2a; ambient ember; layouts cinder_isles, floating_chambers.

## tiles/abyss_overgrown_dark.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_overgrown_dark.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- Overgrown Dark (depth 21–30): theme sheet tinted #4a9a7a; liquid #1f7a60; ambient spore; layouts hollow_grove, scattered_isles.

## tiles/abyss_unmaking.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_unmaking.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- The Unmaking (depth 21–∞): theme sheet tinted #c040a0; liquid #a02080; ambient rune; layouts fallen_cathedral, cinder_isles, hollow_grove, shattered_spire.

## tiles/abyss_pale_end.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_pale_end.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- The Pale End (depth 31–∞): theme sheet tinted #e8e8f0; liquid #c8d0e8; ambient snow; layouts scattered_isles, shattered_spire, hollow_grove.

## tiles/abyss_the_wound.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_the_wound.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- The Wound (depth 24–∞): theme sheet tinted #a02a8a; liquid #8a1a7a; ambient rune; layouts shattered_spire, cinder_isles, fallen_cathedral, scattered_isles.

## tiles/abyss_rift_core.png

- **Group:** F. Tiles — F2 Floor-variant sheets
- **File(s):** `tiles/abyss_rift_core.png` · **Canvas:** 256 × 1344 · **Cell:** 64×96 cells, 4 × 14 · **Frames:** same rows as the theme sheet; used untinted · **Anchor:** same as theme
- **Priority:** polish · **Loader:** Yes · **Paint over:** `assets_templates/tiles/abyss.png` (paint over the theme template)
- The Rift Core (depth 30–30): theme sheet tinted #c030b0; liquid #b01a9a; ambient ember; layouts shattered_spire, scattered_isles.
