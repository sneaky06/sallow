# World team — integration notes (src/world, G.world)

Status: done. `tests/world.html` (launch config `world`, port 8382) → "Run automated checks" passes
(400 dungeons depth 1–25 + 10 towns, 0 failures). API is exactly CONTRACT.md §2.

## Things other teams should know

**Props (game / engine)**
- Solid + interactable: `chest` (`interact:'chest'`), `shrine` (`interact:'shrine'`), `barrel` and `crate`
  (both `interact:'barrel'`), all with `used:false`. Town: `stash`, `dungeon_entrance` are solid; `waypoint` and the
  core-placed `portal` are not.
- Breaking a barrel/crate: either splice it out of `map.props` or set `prop.solid = false`. World reads `solid`
  live (lookup refreshes on list-length change and at most every 80 ms); call `G.world.invalidate(map)` if you
  need it the same frame. Swapping `type` chest → chest_open in place is fine.
- Town barrels/crates/stalls are plain decor (no `interact`).
- `light` is a radius in tiles: torches 4, crystals/shrines/campfires 3. Torches are non-solid and sit on the floor
  tile next to a wall.
- One prop per tile, never on stairs/doors/bridges. No prop ever shares a tile with a spawn.

**Collision / movement (game)**
- `isWalkable`, `canMoveTo`, `moveWithCollision`, `findPath`, `findFreeTileNear` all treat solid props as blocked.
- Corridors and abyss walkways are 1 tile wide: keep monster radius ≤ 0.45 or it cannot leave its room.
  `moveWithCollision` uses `ent.radius` (0.3 if missing).
- `findPath` returns tile centres *after* the start tile, ending on the goal tile. If the goal tile is blocked
  (chest, stall, wall) it paths to the nearest free tile next to it — so "walk to chest then interact" works by
  passing the prop's own tile. Returns `null` when unreachable. If `maxNodes` runs out first it returns the path
  to the explored tile closest to the goal (never observed with the default 2000 on our maps).
- `hasLineOfSight` ignores the two end tiles, so you can "see" a wall tile or a monster standing in a doorway.

**Spawns (game)**
- `kind:'pack'` has `count` 2–7; `'monster'` is a single; `'elite'` has no count (I budget it as 3, so a small
  retinue is fine); exactly one `'boss'` at the arena centre on boss floors.
- Total (pack counts + singles + elites + boss) is 28 at depth 1 rising to a cap of 68 (max seen: 64), leaving headroom under the
  80-monster cap for elite retinues and boss summons.
- Nothing spawns within 2 tiles of the start room or within 10 walking steps of the player spawn.

**Visibility (engine / game)**
- Opacity comes straight from `G.C.OPAQUE` (the old abyss-only "VOID is see-through" special case is gone).
- `updateVisibility` on a town map just sets everything visible. `generateDungeon` already runs it once at the spawn.
- In crypt/caves/inferno only walls that face something are WALL; solid rock behind them is VOID.

**Rooms**
- Caves have no real rooms: `map.rooms` there are 7×7 boxes around the widest clearings. Abyss room rects are
  bounding boxes of irregular chambers (contain VOID).
- Boss floors: start room on the far side, then `boss` arena (15 × 13–15), then a 5×5 `exit` room that connects
  only to the arena.

## Revision 2 (done — check passes: 600 dungeons + 10 towns, 563,101 assertions, 0 failed)

**Tiles (R2.1)**
- WATER / LAVA are shallow and walkable; the interior of every water/lava body becomes DEEP_WATER / DEEP_LAVA
  (a deep tile's 8 neighbours are always deep, its own shallow, or BRIDGE). Small pools and thin river bends
  stay fully shallow = natural fords. Inferno rivers are 4-5 wide with a deep channel.
- Generation still joins the whole floor on DRY ground (floor, doors, bridges): spawn -> stairs, every prop,
  every spawn and every chest is reachable without touching water or lava. Wading is only ever a shortcut.
- No prop or spawn is ever on a liquid tile (FLOOR / RUBBLE only). Stairs are never on a bridge or door.
- Abyss: everything inside the map that is not platform is CHASM (see-through, impassable); only the 1-tile
  map border is VOID. No walkable tile anywhere touches VOID.
- `findPath`: step cost x2 into shallow WATER, x6 into shallow LAVA. Path straightening never drags a dry leg
  across liquid. A path still wades lava when the dry detour is more than ~6x longer (29 of 600 spawn->stairs
  paths touched lava).
- `findFreeTileNear` returns dry tiles first, shallow liquid only if nothing dry is in range.

**Lockdown rooms (R2.5)**
- Non-boss floors from depth 2: 0/1/2 rooms at 25/50/25 % (fewer if no room qualifies; ~0.76 per eligible floor).
  `{ x, y, w, h, type: 'lockdown', doors: [{x,y}] (1-3), waves }`; waves = 2 (depth 2-7), 3 (8-15), 4 (16+).
- Door tiles sit on the ring just OUTSIDE the room rect (x = r.x-1 or r.x+r.w, or y likewise) and are DOOR tiles.
  "Inside" for the trigger = inside the rect. Gating exactly `doors` seals the rect both ways (asserted, also
  through `isWalkable` / `findPath` with real `gate` props + `G.world.invalidate`).
- One `chest` with `locked: true` at/near the room centre; no spawns in the rect or on its doors.
- In caves/abyss the room is made sealable by walling up (caves) or dropping to chasm (abyss) every opening
  except one door per opening, so it reads as a built vault. Doors are 1 tile wide: radius <= 0.45 to pass.

**Other**
- `G.world.invalidate(map)` is contract now; call it after pushing/removing gate or corpse props.
- `generateDungeon(depth, seed)` is deterministic (asserted on every map in the check); the corpse rebuild via
  `G.scenes.enterDungeon` gives identical tiles/rooms and `propAt` finds the corpse.

## Open questions for the lead
1. Lava x6 is a cost, not a ban: tap-to-move can route through shallow lava when the dry way is much longer. OK?
2. Lockdown frequency and wave counts by depth - tune?

## Revision 5 — floor variants, layout styles, landmarks (R5.10)

Check: `tests/world.html` → "Run automated checks": **PASS — 682 dungeons (depth 1–40, 10 seeds each, plus every variant × every layout it can use, boss floors included) + 10 towns, 682,403 assertions, 0 failed**. Generation avg 0.67 ms/map, p95 1.2 ms, max 2.5 ms. No map needed a retry or the fallback layout.

### map fields added (dungeons only)
```js
map.floorName   // 'The Drowned Ossuary' — one of 3 names per variant, picked from the seed
map.variant = {
  id, name,          // 'drowned_vaults', 'Drowned Vaults'
  layout,            // layout actually used: see below ('fallback' if everything failed — never seen)
  palette: { tint: '#rrggbb', tintAmount: 0..1,   // colour multiplied over lit tiles+walls; amount 0 = no tint
             saturation: 0.1..1.6, brightness: 0.6..1.3,   // 1 = unchanged
             accent: '#rrggbb',                    // magic glow: crystals, runes, shrines
             liquid: '#rrggbb' | null },           // water/lava body override, null = theme default
  light:   { color: '#rrggbb', radius: 0.6..1.4,   // player light colour, multiplier on the default radius
             torch: '#rrggbb', torchRadius: 0.6..1.5, // torch/campfire colour, multiplier on prop.light
             flicker: 0..1 },
  ambient: { darkness: 0..0.8,                     // extra darkening on top of the theme (0 = theme default)
             fog: 0..1, fogColor: '#rrggbb',       // distance haze density and colour
             particles: { kind: 'dust'|'ember'|'ash'|'spore'|'drip'|'mote'|'snow'|'bubble'|'rune'|'none', color, density: 0..1 },
             sound: 'drip'|'wind'|'hum'|'crackle'|'whisper'|'rumble'|'chime'|'silence' },   // ambient bed
  blend:   null | { theme: 'crypt'|'caves'|'inferno', amount: 0..1 },   // deep abyss floors: which theme is bleeding in
}
map.landmarks = [{ id, name, x, y, w, h }]   // 0-3 per floor; rect in tiles. Not a room type — map.rooms is unchanged.
```
All plain JSON, a fresh copy per map. `G.world.VARIANTS` (data table incl. depth ranges) and `G.world.pickVariant(depth, seed)` are public; the UI can read `map.floorName` directly.

### Variants (depth range → pool; chosen deterministically from the seed, weighted)
- crypt: restless_graves 1–4, forgotten_cellars 1–3, ossuary 2–5, drowned_vaults 3–5, gravelord_approach 5
- caves: mossy_caverns 6–10, fungal_warrens 6–9, crystal_lake 7–10, amber_hollows 6–8
- inferno: smouldering_halls 11–14, magma_flows 12–15, ash_wastes 11–15, forgeworks 13–15
- abyss 16–20 (and up to 26–30): starless_isles, shattered_spire, glasswork_drift
- **deep-only (never above depth 20)**: fallen_cathedral (crypt blend), cinder_drift (inferno blend), overgrown_dark (caves blend) from 21; unmaking from 31; pale_end from 41. Each has `blend` set and its own layout that really mixes in the other theme's tiles (walls, lava, water), so the blend shows even if the engine ignores `blend`.

### Layouts (3 per theme, 3 more deep)
crypt: ossuary_halls · collapsed_catacomb (rubble, ragged breaches, few doors) · flooded_crypt (half the rooms drowned, plank walkways) —
caves: caverns · warrens (many small chambers, wobbly tunnels) · underground_lake (one huge lake) —
inferno: broken_halls · magma_flows (3–4 lava rivers) · ash_fields (no lava, rubble, open ground) —
abyss: floating_chambers · scattered_isles (a dozen small islands) · shattered_spire (central platform + ring of satellites) —
abyss 21+: fallen_cathedral (floating rooms with chancel walls) · cinder_isles (platforms with lava pits) · hollow_grove (cave blobs over the void).
The variant picks the layout; if a layout fails validation its retries fall back to the theme's plain layout (`ossuary_halls`, `caverns`, `broken_halls`, `floating_chambers`), then `fallback`.

### Landmarks
Stamped before liquids are deepened, each validated: the floor's dry ground must stay one piece, else rolled back and another room tried. ~50% of floors from depth 3 get one, ~12% two (fewer on depth 1–2); variants bias which.
flooded_crypt (crypt: pool, island, chest(s) behind a plank walkway) · forge_island (inferno/abyss: same with lava and a campfire) · collapsed_bridge (ravine across a room, two broken bridge stubs facing each other, a deep gap, a ledge along one wall, chest at the far stub) · bone_garden (dead trees, tombstones, bones in a lattice, chest in the middle) · chained_arena (elite room: ring of pillars, **a guaranteed `elite` spawn on the central tile**, a chest) · crystal_grotto (crystal ring + shrine + chests) · pyre_court (campfire ring + shrine + chest) · hidden_cache (below).
Uses only existing prop types; `tree` (dead tree) and `campfire` now also appear in dungeons.

### Hidden cache (the world team's own pitch)
~40% of floors from depth 2 (not abyss): a one-tile gap in a room wall holds a lone `crate` with `secret: true` (`interact:'barrel'`, solid). Behind it a short passage and a 3×3 closet with a chest, two barrels and bones. The closet is only reachable once the crate is broken (the generator and checks treat secret crates as non-blocking for connectivity, like any breakable). No spawns are placed inside. **Game:** nothing to do — breaking the crate as a barrel opens it; optionally toast "A hidden cache!" when a `secret` prop is broken.

### Other notes
- Props rule additions: `secret: true` crate (above). Chained-arena elite is in `map.spawns` as an ordinary `kind:'elite'`.
- Determinism: variant, name and landmarks derive only from (depth, seed) and are in the determinism check.
- Test hook: `G.world._force = { variant, layout }` forces a variant/layout (used by tests/world.html); leave it null in the game. `G.world._lastAttempts` = attempts used by the last map.
- Palette/light/ambient values are decisions only; the engine reads them. Values were picked for a dark Sallow look (tints at 0.22–0.45).

### R5.10 format correction (aligned to the engine's reader — this supersedes the field list above)
`map.variant` fields as actually emitted (names/units follow `engine-r5-shapes.md`):
```js
palette: { tint, amount: 0..1, saturation, brightness, accent, liquid|null }
light:   { color, radius: tiles (player light, default 7), ambient: '#hex' (gloom colour), torch, torchRadius (× prop.light), flicker: 0..1 }
ambient: { particles: 'mist|ash|ember|spore|drip|snow|motes|void', density: 0..2, color, fog: 0..1, darkness: 0..0.8, sound: 'wind|drone|drip|fire|heart|choir|water|none' }
blend:   null | { theme, amount }
```
`map.floorName` holds the floor name (the UI reads it); `palette.accent` is the banner colour. Fields the engine ignores today (saturation, brightness, accent, liquid, torch*, flicker, darkness, blend) are there for later.
