# Audit — world (`src/world`, `G.world`)

Read-only outside review, 2026-10-15, `main` @ cd5dc23. Read: base, vis, path, gen, boss, populate, dungeon, landmarks (Leap),
variants (`pickVariant`), plus the consumers in game/core. Then generated ≈ 800 floors in the running game (no saves written) to
measure determinism, connectivity, prop blocking, generation time and readability.

## 1. Correctness bugs and edge cases

| # | Sev | Where | Finding | Fix |
|---|---|---|---|---|
| WO-1 | **high** | `dungeon.js:291-294`, `core/scenes.js:89-97` | **Corpse floors are not reproducible.** The corpse floor is rebuilt from the stored seed, but `generateDungeon` also reads **live game state** (`G.state.flags.cleansed`, via the module global `activeCleansed`) and the **current code version**. Verified: with identical `(depth, seed)` the result is identical (70/70), but toggling `cleansed` (a boss kill changes it, DESIGN §10 derives it on every town arrival) changes the tiles on **86 % of floors** (60/70) and the signature on all of them. After you cleanse an act, a floor you died on rebuilds with different walls/pits/props/camps, so the stored `corpse.x,y` can sit in rock or a chasm and the Echo's `W.free(c.x,c.y,3)` lands somewhere arbitrary. The whole backpack lives on the corpse (`core/scenes.js:188`); if the prop is unreachable the bag is **permanently lost** on the next death. Any generator change shipped between death and return does the same. | Treat `cleansed` as an explicit input: store `corpse.cleansed` (the array in force at death) and a `W.GEN_VERSION` in the corpse, pass them via `opts`, and drop the global read. On version mismatch, place the corpse with `findFreeTileNear` and toast it. |
| WO-2 | medium | `base.js:100-145` | **An entity whose centre is inside a blocked tile can never move again.** `pushOut` returns `false` when the centre is inside (`d2 < 1e-12`, `:118`) and the per-axis fallback re-tests `circleFree` at the same overlapping spot, so `moveWithCollision` returns `false` forever. Anything that adds a solid prop onto an occupied tile does this: lockdown `gate` props on door tiles (`game/lockdown.js:32`) while a monster, minion or Echo stands in the doorway; `quest_item` crates (`ui/quests.js:523`); event beacons/vaults (`events.js:86-153`). Monsters have the R16 watchdog (`monsters.js:363-380`) but it only runs inside `moveToward`; casters in `engage` range logic, minions and the **player** have no rescue. | Generic rescue in `moveWithCollision`: if the start position fails `circleFree`, snap to `findFreeTileNear` (or push toward the nearest free tile) before moving. One function fixes every present and future caller. |
| WO-3 | medium | `path.js:139-163`, `monsters.js:339` | When the node cap (700 for monsters, 2000 default) is hit, `findPath` returns a path to the **closest explored tile to the goal** (`best`), not `null`. Chasers whose target is across a gap/deep water/lava (the Leap's lip, `deepen`ed pools) walk to the lip and stand there ("staring"), and ranged ones can still shoot across; the player can farm them. | If the best tile is within ~1.5 tiles of the start (no progress), return `null`; let AI fall back to leash/wander. |
| WO-4 | low | `populate.js:132-148` | The chute is placed only if some open tile passes `canSolid` and avoids start/exit/arena/lockdown/landmark rects; otherwise **no chute** (`if (best)`). In 360 probe floors (depths 2-42) every floor had one, so the risk is low, but a failure is silent and the chute is the loot pipeline. | Fallback: relax to any `canSolid` tile ≥ 8 from the stairs; log through `W._lastAttempts`-style telemetry. |
| WO-5 | low | `populate.js:296-300`, `monsters.js:10,214` | World budgets up to 68 spawn units; the game then multiplies packs (swarm ×1.6, +champions, +`depth/12`, Pallor, floor mods) and caps the **entity count** at `MAX_MONSTERS = 80` — later spawns (the plain `monster` singles and trailing packs) are silently skipped. Deep floors therefore have fewer, bigger clusters than the budget says, and which ones are dropped depends on spawn order. | Make the cap count only live non-corpse monsters and report the dropped count in a debug overlay; or scale pack size to fit the budget. |
| WO-6 | low | `vis.js:44-47` | Town `updateVisibility` re-fills `visible`/`explored` with 1 on every call; harmless (1,600 bytes) but it runs on every tile change. | Early-out with a map flag. |
| WO-7 | low | `dungeon.js:287-290` | `derive(seed, attempt)` makes retry seeds from `seed ^ attempt*K`; a floor that needed attempt 2+ is stable only while the failing predicate is. Fine today (probes: 1.0 average attempts, 0 fallbacks over 360 floors), but `MAX_ATTEMPTS` 8 + a fallback layout hides a generator regression: nothing alarms when `_lastAttempts` rises. | Log/emit when attempts > 2 in dev; add a CI-style sweep (the probe below takes 0.8 s for 360 floors). |

## 2. Determinism (incl. static boss floors and corpse floors)

- Same `(depth, seed, cleansed)` ⇒ identical map: 70/70 probes; `variant` objects are cloned per call (`variants.js:215`), so nothing leaks between floors.
- **Static boss floors work as designed**: `dungeon.js:298` replaces the seed with a per-depth constant; floors 10 generated with two unrelated seeds are tile-, prop- and spawn-identical (verified). `map.seed` stays the caller's seed, so *monster rolls* (`spawnMapEntities` seeds from `map.seed`) still vary per visit while terrain/props/spawn points are fixed. Boss floors ignore `cleansed` (`ctx.cleansed = !isBoss && …`), so they are immune to WO-1.
- Floors still depend on: `flags.cleansed` (WO-1), `G.rng.global` nowhere (good), `Date` nowhere (good), code version (WO-1).
- `core/scenes.js:91`: non-corpse seed `S.seed + depth*7919 + visits*104729` — `visits` increments on every `enterDungeon`, so a reload re-enters with the same `visits` only if it was saved after the increment (saved at `loadMap`); portal re-entry yields a **new** floor every time (by design) but a corpse-floor re-entry reuses the old seed and therefore the cost in WO-1.

## 3. Connectivity, prop blocking, chute, Leap (probe results)

Probe: 40 seeds × depths 2, 6, 9, 12, 17, 22, 28, 33, 42 (360 floors), flood-fill from the spawn over the real collision grid (props included, no corner cutting).

- **Stairs reachable: 360/360. Monster spawn points reachable: 0 unreachable of 4,500+.** Dry connectivity is sound; `connectAll`, `tryLockdown`'s before/after counts and `ringOK` (applied to both dry and wade tables) do their job.
- Chests with no reachable neighbour: 18/2,500 — **all are `hidden_cache` closets** (reached by breaking the `secret` crate, by design); no other chest was cut off.
- Chute present on 360/360 floors. Leap (`dash_gap`) frequency is theme-dependent, not the ~4 % of DESIGN §4: 1/30 floors at depth 8, **7/30 at depth 13** (inferno), 0 at depth 3 and in the abyss (excluded, `landmarks.js:219`). It is always a shortcut with ≥ 18 detour steps, never the only route (`dryIntactOf` check).
- Generation time (desktop): 1.3 ms (d2) to 2.8 ms (d33) average, max 7 ms. Even ×10 on an old iPhone it is a non-event.
- Corridors and clutter (30 floors per depth): see §5.

## 4. Where monsters and the player get stuck

1. Doorways at lockdown start (WO-2) — gates drop on whoever stands there.
2. Lips of gaps and pools when A* is capped (WO-3).
3. 1-tile corridors and bridges: monster radius is clamped to 0.44 (`monsters.js:89`) so they fit, but packs of up to 7 queue and body-block the way back; `separation()` pushes them sideways into walls. 13-16 % of deep-floor spawns are placed *on* corridor/bridge tiles (abyss walkways, depth 26+), which maximises this.
4. Solid props adjacent to walls forming pinches: `ringOK` prevents cutting the graph but not **narrowing a 2-wide passage to 1** next to a corridor mouth; barrel/crate clusters (`populate.js:93-106`) are built against walls and can make a 1-tile choke in front of a door.
5. Embedded entities (WO-2): a minion, the Echo, loot-dropping NPC camp characters when `corpse`/`quest_item` props are pushed after generation (`scenes.js:94`, `echo.js:444`).
6. The player: only (5) and A* returning `null` for unreachable taps (`player.js:707-709` silently ignores the tap).

## 5. What makes floors hard to read or traverse

Measured (30 floors per depth; walkable tiles / % in 1-wide corridors / solid props / solid decor):
d3 727 / 11.7 % / 26 / 8 · d8 1,648 / 3.0 % / 43 / 25 · d13 1,880 / 4.8 % / 50 / 25 (16 % shallow lava) · d18 881 / 11.6 % / 38 / 23 · d26 972 / 11.1 % / 48 / 31 · d38 898 / 13.7 % / 49 / 33.

- **Size swings**: caves/inferno floors are ~2× the walkable area of abyss floors (1.6-1.9 k vs 0.9 k tiles) at similar `w×h`; a 70×60 cave with 3 exits and no landmark is a long, featureless walk. The route glow (R16) helps only on explored tiles.
- **Clutter**: ~25-33 solid decor props per deep floor (pillars, tombstones, crystals) plus 15-20 barrels/crates, scattered inside rooms (`populate.js:204-211`, `:224-232`). They block projectiles (`blocksShot` ignores props, `isWalkable` does not → shots pass over what you cannot walk through, which reads inconsistent), occlude monsters in iso, and create the pinches in §4.4.
- **Doors**: depth 1-5 crypt floors have ~12 door tiles; every other theme has 1-2. Doors/mouths are lit by `drawRoute` only on the engine's route list (160 cap), so the "where do I go" signal differs wildly by theme.
- **Liquid**: 16 % of walkable tiles on inferno floors are shallow lava/water (slow ×0.6, lava 4 %/s) next to ~1.9 k-tile floors; with `deepen` rims the wade path is the only one in places.
- **Abyss**: everything not platform is CHASM; walkways are 1 tile with a chasm margin; the fog and the see-through chasm make "is that walkable?" depend on tile art (needs the art pass: ART_SPEC row 13).
- **Corruption terrain** from depth 8 (rubble, pits, fissures, taint veins) adds edge noise to the one thing players need to read (walkable vs not).
- **Linear vs open**: ~50 % of non-boss floors from depth 2 are "linear" (`dungeon.js:137`); the other half are open halls; there is no signal of which a floor is until explored (`map.flow` exists but the HUD does not show it).

## 6. Cross-team mismatches

- Produced and consumed correctly: `route`, `openings`, `landmarks[].gap`, `floorName`, `variant.*`, `taint`, `fissures`, `camps`, `core`, `rift`, `corruption`, `act`, `cleansed`, `flow`. Verified every `BIAS` monster id, `THEME_POOLS`, `BOSS_ORDER`, `MAIN` boss ids exist in `G.game.MONSTERS` (0 missing).
- `map.events` is read by `engine.mapPick` and never set (engine.md EN-8).
- World calls into game: none (good). Game calls `G.world.invalidate` after every prop mutation (checked 14 sites); `ui/quests.js:523-524` pushes a prop and invalidates (ok) but ignores `prot`.
- `monsterBias` shape question (DESIGN Q3) is resolved in code: game reads world's `{tags, monsterIds, weight}` (`monsters.js:161`); update DESIGN §4/§6 and delete the alternative shapes.

## 7. Performance, dead code, methodology

- No per-frame work in world. `grid(map)` rebuilds the blocked/cost/prop grids at most every 80 ms or when `props.length` changes (`base.js:20-50`): a 6,400-tile loop + props pass up to 12×/s while queried, negligible.
- `findPath` allocates its result array per call; budget is 3 repaths/frame (`monsters.js:285`). `lockdown.spawnWave` calls `W.path(p → spot, 800)` up to 12× per spawned monster (`lockdown.js:50-53`): ≈ 100 A* runs in one frame at every wave start (game.md GM-8).
- Dead: `W._force`, `_lastAttempts` are test hooks (fine); `gen.components` is called inside `connectAll` up to 120× per floor, each a full flood — fast today, quadratic if map sizes grow.
- Harness: `tests/world.html` (933 lines) is solid on structure; add the three sweeps used for this audit (determinism with/without `cleansed`, spawn/stairs reachability through the *collision grid*, chute presence) as assertions, plus a stuck-entity test: place a solid prop on an occupied tile and require that `moveWithCollision` frees the entity (WO-2).
