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
