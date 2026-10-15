# Emberdeep — team contract

Isometric, loot-first dungeon crawler (Diablo-like) for iPhone, shipped as a zero-dependency web app (PWA):
vanilla JS + Canvas 2D, no build step, no external assets. Must run at 60 fps on old phones.
Five teams build in parallel against this document. **If code and this file disagree, this file wins** —
implement your API exactly as written, and call other teams' APIs exactly as written.

## Ground rules

- **Classic scripts, no ES modules, no `import`/`export`.** Every file is an IIFE that reads `window.G` and
  attaches to it: `(function(){ 'use strict'; const G = window.G; ... })();`
- **File ownership.** You may only create/edit files inside your own directory. Never touch `index.html`,
  `src/core/*`, or another team's directory. If you need a contract change, don't make it — work within the
  contract and list the request in your final report.
- **Manifest.** `src/<team>/manifest.js` contains only `G.manifest.<team> = ['a.js', 'b.js', ...];` (paths
  relative to your directory, in load order). Load order across teams: core → engine → world → items → game → ui → `core/main.js`.
- **Never reference another team's namespace at file load time** — only inside functions called at runtime
  (after everything has loaded). Guard optional calls (`G.items && G.items.x`), because you'll be testing
  before the other teams land.
- **No assets, no network.** All art is drawn procedurally to offscreen canvases and cached. All audio is WebAudio synthesis.
- **State is plain data.** Anything on `G.state` (player, items, quests, map) must be JSON-able: no functions,
  no class instances with methods, no cycles, no DOM/canvas refs. Typed arrays on the map are fine (maps are not saved).
  Put behaviour in lookup tables keyed by id (`skillId`, `monsterId`, `baseId`), not on the objects.
- **Performance budget.** No per-frame allocation in hot loops where avoidable, no per-frame DOM writes
  unless a value changed, cache every sprite/tile to an offscreen canvas, cull to the viewport. ≤ ~80 live monsters.
- **Testing.** No Node/Python on this machine. To run in a browser use the preview launch config named for
  your team in `.claude/launch.json` (`engine`, `world`, `items`, `combat`, `ui` — each its own port) and open
  `/tests/<team>.html` — a harness page you own at `tests/<team>.html` that loads `src/core/*` + your files
  + whatever stubs you need. Do NOT rely on other teams' code being present or finished. Verify your module
  actually loads and runs with no console errors before reporting done.
- Code style: modern JS (const/let, arrow fns, optional chaining OK — target Safari 15+), 2-space indent, semicolons.

## Core (lead) — already written, read `src/core/*.js`

- `G.C` constants: `TILE`, `WALKABLE`, `OPAQUE`, `THEMES`, `themeForDepth(depth)`, `BOSS_EVERY`, `RARITY`,
  `EQUIP_SLOTS`, `INV_SIZE`, `STASH_SIZE`, `SKILL_SLOTS`, `STATS`, `BODY_TYPES`, `WEAPON_LOOKS`, `ICON_SHAPES`,
  `PROP_TYPES`, `NPC_ROLES`, `PROJECTILE_SHAPES`, `FX_TYPES`.
- `G.on(name, fn)`, `G.off(name, fn)`, `G.emit(name, payload)`.
- `G.rng.create(seed)` → `{ next, range(a,b), int(a,b), chance(p), pick(arr), weighted([{w}]), shuffle(arr) }`; `G.rng.global`.
- `G.state` (see `state.js`), `G.input = { move:{x,y}, attackHeld }`, `G.newId()`.
- `G.scenes`: `startNewGame(classId, name)`, `continueGame()`→bool, `enterTown()`, `enterDungeon(depth)`,
  `descend()`, `ascend()`, `townPortal()`, `usePortal()`, `unlockWaypoint(depth)`, `respawn()`.
- Main loop per frame: `G.game.update(dt)` (skipped when `state.paused` or scene is `'menu'`), `G.engine.update(dt)`,
  `G.engine.render()`, `G.ui.update(dt)`. Boot calls `G.engine.init(canvas)` then `G.ui.init(rootEl)`.

## Coordinates

World units are tiles. Tile `(tx, ty)` covers `[tx, tx+1) × [ty, ty+1)`; entities have float `x, y` (tile centre = `tx + 0.5`).
Iso projection: `sx = (x - y) * TILE_W/2`, `sy = (x + y) * TILE_H/2` (`TILE_W = 32`, `TILE_H = 16`). Distances, speeds
(tiles/second) and radii are always in world units.

## Shared data shapes

```js
// GameMap (world creates; engine renders; game reads)
{ w, h, kind: 'town'|'dungeon', depth, theme: 'town'|'crypt'|'caves'|'inferno'|'abyss', seed,
  tiles: Uint8Array(w*h),      // G.C.TILE, index = y*w + x
  explored: Uint8Array(w*h),   // 1 once seen (minimap / fog). Town maps: all 1.
  visible: Uint8Array(w*h),    // 1 if currently in sight
  spawn: { x, y },             // integer tile where the player arrives
  rooms: [{ x, y, w, h, type: 'start'|'normal'|'treasure'|'elite'|'boss'|'shrine'|'exit' }],
  spawns: [{ x, y, kind: 'monster'|'pack'|'elite'|'boss'|'npc', role? /* npc: G.C.NPC_ROLES */, count? /* pack size */ }],
  props:  [{ type /* G.C.PROP_TYPES */, x, y, solid: bool, interact?: 'chest'|'shrine'|'stash'|'portal'|'dungeon_entrance'|'waypoint'|'barrel', used?: bool, light?: number }],
  // props sit at tile centres (x+0.5,y+0.5 when drawn); integer x,y. STAIRS are tiles, not props.
}

// Sprite descriptor — engine draws entities procedurally from this
{ body /* G.C.BODY_TYPES */, color: '#rrggbb', accent: '#rrggbb', scale: 1, weapon?: /* G.C.WEAPON_LOOKS */ }

// Icon descriptor — engine draws item/skill icons from this
{ shape /* G.C.ICON_SHAPES */, color: '#rrggbb', accent?: '#rrggbb' }

// Entity (game team creates; lives in state.entities, or state.player)
{ id, type: 'player'|'monster'|'npc', name, x, y, radius, facing /* radians, world space: atan2(dy, dx) */,
  sprite, anim: 'idle'|'walk'|'attack'|'cast'|'hit'|'die', animT /* seconds in current anim */,
  hitFlash /* seconds remaining, engine tints white */, dead: bool,
  level, hp, mp, stats: { /* every key of G.C.STATS, computed totals */ },
  effects: [{ id, t /* remaining s */, ... }],          // buffs / debuffs
  // monster only:
  monsterId, rarity: 'normal'|'champion'|'rare'|'boss', affixes: [string],
  // npc only:
  role /* G.C.NPC_ROLES */,
}

// Player = Entity plus
{ classId, xp, xpNext, attrs: { str, dex, int, vit }, attrPoints, skillPoints,
  skills: { [skillId]: rank }, skillBar: [skillId|null × C.SKILL_SLOTS], cooldowns: { [skillId]: secondsRemaining },
  autoBuild: null|'single'|'aoe'|'balanced',
  gold, inventory: Array(C.INV_SIZE) of Item|null, equipment: { [slot of C.EQUIP_SLOTS]: Item|null },
  potions: { hp: n, mp: n } }                           // belt potions are counters, not inventory items

// Item (items team creates)
{ id, baseId, name, type: 'weapon'|'armor'|'jewelry'|'consumable'|'gem'|'material',
  slot: 'weapon'|'offhand'|'helm'|'chest'|'gloves'|'boots'|'belt'|'amulet'|'ring'|null,   // 'ring' fits ring1/ring2
  weaponType?: 'sword'|'axe'|'mace'|'dagger'|'bow'|'staff'|'wand', twoHanded?: bool,
  rarity /* key of C.RARITY */, ilvl, reqLevel, icon,
  base: { dmgMin?, dmgMax?, attackSpeed?, armor?, block? },     // implicit stats of the base type
  mods: [{ stat /* C.STATS */, value }],                        // rolled affixes; pct stats are whole percents (15 = 15%)
  value /* gold sell price */, qty?: n, setId?, uniqueId?, flavor?, sockets?: [gemItem|null] }

// Projectile (game team; engine renders) in state.projectiles
{ id, x, y, vx, vy, shape /* C.PROJECTILE_SHAPES */, color, radius, ... }

// Ground item in state.groundItems
{ id, x, y, item }       // gold piles: item = { type:'gold', qty, name:'Gold', rarity:'common', icon:{shape:'gold',color:'#ffd94a'} }
```

Stat conventions: `critChance`, `dodge`, `block`, `res*`, `dmgPct`, `skillDmgPct`, `cdr`, `lifeSteal`, `manaSteal`,
`magicFind`, `goldFind`, `xpGain` are whole percents. `attackSpeed`/`castSpeed` in `stats` are percent bonus
(weapon `base.attackSpeed` is attacks/second). `moveSpeed` is percent bonus. Resist cap 75. `dmgMin/dmgMax` flat added damage.

## Events (payloads)

| Event | Emitted by | Payload |
|---|---|---|
| `scene:changed` | core | `{ scene, depth, map }` |
| `input:tap` | engine | `{ x, y }` world coords of a tap/click on the playfield |
| `input:skill` | ui (buttons), engine (keys 1-4) | `{ slot }` 0-based |
| `input:potion` | ui, engine (Q/E) | `{ kind: 'hp'|'mp' }` |
| `input:attack` | ui, engine (Space) | `{}` — attack nearest enemy once (hold = `G.input.attackHeld`) |
| `input:ui` | engine (keys) | `{ panel: 'inventory'|'skills'|'quests'|'map'|'menu' }` (I, K, J, M, Esc) |
| `player:damaged` | game | `{ amount, source }` |
| `player:died` | game | `{}` — ui shows death screen → `G.scenes.respawn()` |
| `player:levelup` | game | `{ level }` |
| `player:stats` | game | `{}` — after any `recomputeStats` |
| `player:xp` | game | `{ xp, xpNext, gained }` |
| `monster:killed` | game | `{ monster, x, y }` |
| `object:interact` | game | `{ type: 'stairs_down'|'stairs_up'|'portal'|'dungeon_entrance'|'waypoint'|'stash'|'shrine'|'chest', prop? }` |
| `npc:interact` | game | `{ role, entity }` — ui opens the right panel |
| `loot:dropped` | items | `{ ground }` |
| `item:picked` | items | `{ item }` |
| `inventory:changed`, `equipment:changed` | items | `{}` (equipment change must also call `G.game.recomputeStats(player)`) |
| `gold:changed` | items, core | `{ gold, delta }` |
| `skills:changed` | game | `{}` |
| `quest:updated`, `quest:completed` | ui/meta | `{ quest }` |
| `fx:spawn` | anyone | `{ type /* C.FX_TYPES */, x, y, color?, radius?, angle?, duration? }` |
| `fx:text` | anyone | `{ x, y, text, color?, crit?: bool }` floating combat text |
| `fx:shake` | anyone | `{ amount, duration }` |
| `sfx` | anyone | `{ name }` — `hit, swing, cast, fire, ice, bolt, arrow, hurt, die, loot, loot_rare, loot_legendary, gold, levelup, equip, potion, click, error, door, stairs, quest, buy, sell, chest, shrine` |
| `ui:toast` | anyone | `{ text, color? }` |

## Team APIs

### 1. Engine & Art — `src/engine/`, namespace `G.engine`

```js
G.engine.init(canvas)             // set up canvas, sizing (devicePixelRatio-aware, low internal res scaled with nearest-neighbour), input, audio
G.engine.update(dt)               // camera follow, particles, floating text, screenshake
G.engine.render()                 // draw state.map, props, groundItems, entities, player, projectiles, fx. Must no-op cleanly if map/player is null (menu)
G.engine.worldToScreen(x, y) → { x, y }     // CSS pixels
G.engine.screenToWorld(sx, sy) → { x, y }   // CSS pixels → world
G.engine.getIcon(iconDesc, size = 32) → HTMLCanvasElement   // cached; UI uses this (copy with drawImage or toDataURL)
G.engine.getIconURL(iconDesc, size = 32) → string           // cached data URL for <img>/background-image
G.engine.getPortrait(spriteDesc, size = 48) → HTMLCanvasElement  // class select / NPC dialog
G.engine.drawMinimap(ctx, w, h)   // draws explored tiles, exits, player, npcs into a UI-owned canvas (UI calls ~5×/s)
G.engine.sfx(name)                // also triggered by the 'sfx' event; respects state.settings.sfx
```
Owns: iso renderer with depth sorting, tile art per theme (town/crypt/caves/inferno/abyss), walls with height that fade
when occluding the player, fog of war from `map.explored/visible`, dynamic-feeling lighting (cheap: radial darkness overlay
+ torch props), procedural pixel-art sprites for every `BODY_TYPES` × colours with idle/walk/attack/hit/die animation frames,
props, projectiles, particles for every `FX_TYPES`, floating text, ground-item rendering (icon + rarity-coloured name label,
loot beam for rare+ — honour `state.settings.lootFilter`), monster health bars (+ name plate for champion/rare/boss),
touch input, keyboard/mouse input for desktop testing, WebAudio sfx.
Input: a touch starting in the left ~40% of the screen is a floating virtual joystick → writes `G.input.move` (converted to
world-space direction). A tap/click elsewhere on the canvas emits `input:tap` with world coords. WASD/arrows also write
`G.input.move`. UI panels sit in DOM above the canvas and swallow their own touches. Art direction: chunky old-school pixel
art, SNES/Diablo-1 mood — dark palette, saturated loot colours, ~16–24 px tall characters.

### 2. World — `src/world/`, namespace `G.world`

```js
G.world.generateTown(seed) → GameMap            // the hub "Emberfall": fixed-feeling layout from seed, all explored
G.world.generateDungeon(depth, seed) → GameMap  // theme from G.C.themeForDepth(depth); boss arena when depth % BOSS_EVERY === 0
G.world.tileAt(map, x, y) → TILE (VOID out of bounds; x,y floored)
G.world.isWalkable(map, x, y) → bool            // tile walkable AND no solid prop
G.world.canMoveTo(map, x, y, radius) → bool     // circle vs. blocked tiles
G.world.moveWithCollision(map, ent, dx, dy)     // slide along walls; mutates ent.x/y; returns true if moved
G.world.hasLineOfSight(map, x0, y0, x1, y1) → bool
G.world.findPath(map, sx, sy, tx, ty, maxNodes = 2000) → [{x, y}] | null   // A*, tile centres, smoothed; cheap enough for ~10 calls/frame
G.world.updateVisibility(map, px, py, radius = 9) // recompute map.visible, OR into map.explored
G.world.findFreeTileNear(map, x, y, maxR = 6) → { x, y } | null
G.world.propAt(map, tx, ty) → prop | null
```
Owns: dungeon generation (rooms + corridors with loops, caves via cellular automata for the caves theme, lava/water hazards,
treasure rooms, shrine rooms, elite rooms, boss arenas, guaranteed connectivity start→exit), `spawns` placement scaled by
depth (packs, elites, 1 boss on boss floors — never inside the start room), props (chests, barrels, torches, shrines, decor),
town layout (central plaza with fountain + waypoint, one NPC spawn for every `NPC_ROLES`, stash prop, dungeon_entrance prop,
houses built from WALL tiles, trees, paths). Maps roughly 48–80 tiles a side for dungeons, ~40 for town. STAIRS_UP at spawn
(dungeon), STAIRS_DOWN in the exit room (on boss floors, reachable only through the boss arena).

### 3. Loot & Economy — `src/items/`, namespace `G.items`

```js
G.items.rollItem({ level, rarity?, slot?, baseId?, magicFind = 0, rng? }) → Item
G.items.rollLoot({ source: 'monster'|'champion'|'rare'|'boss'|'chest'|'barrel'|'quest', level, magicFind = 0, goldFind = 0 }) → { items: [Item], gold }
G.items.dropLoot(x, y, opts /* same as rollLoot */) // rolls, scatters into state.groundItems (incl. gold piles + potions), emits loot:dropped, fx lootbeam + sfx by rarity
G.items.dropItemAt(x, y, item)
G.items.pickup(groundId) → bool                 // gold → player.gold; potions → player.potions; else inventory. false + toast if full
G.items.addToInventory(item) → bool
G.items.equip(invIndex) → bool                  // swaps with current; handles ring1/ring2, two-handed vs offhand, reqLevel
G.items.unequip(slot) → bool
G.items.useItem(invIndex) → bool                // consumables / scrolls
G.items.dropFromInventory(invIndex)
G.items.sell(invIndex) → gold                   // only meaningful in town
G.items.sellAllBelow(rarity) → gold             // "sell junk" button
G.items.salvage(invIndex) → bool                // → crafting materials (essence counters on player.materials)
G.items.getVendorStock(role) → [{ item, price }]
G.items.buy(role, index) → bool
G.items.refreshVendors(level)
G.items.gamble(slot) → Item|null                // mystic: pay gold for an unidentified-rarity roll
G.items.upgrade(invIndexOrSlot) → bool          // blacksmith: spend gold+materials to reroll/boost an item (your design)
G.items.stashDeposit(invIndex) → bool, G.items.stashWithdraw(stashIndex) → bool
G.items.getEquipmentMods(player) → { [stat]: total }   // sums base (armor, block), mods, gems, active set bonuses. Weapon base dmg is NOT included:
G.items.getWeapon(player) → { dmgMin, dmgMax, attackSpeed, weaponType, twoHanded } // unarmed defaults if none
G.items.getTooltip(item) → { name, color, lines: [{ text, color? }] }   // includes base stats, mods, set bonuses, req level, sell value, flavor
G.items.compare(item) → { [stat]: delta } vs. currently equipped in that slot, and G.items.isUpgrade(item) → bool
G.items.grantStarterGear(player)                // class-appropriate common weapon + a few potions; equips directly
G.items.sortInventory()
G.items.potionPrice(kind), G.items.buyPotion(kind) → bool
```
Owns: base item table (every slot, several tiers by ilvl, weapon types matching class fantasies), prefix/suffix affix pools
with ilvl-scaled ranges, rarity weights — **this is the heart of the game**: loot should rain (most kills drop something,
elites/bosses/chests explode with loot) while the top end is brutally rare: indicative odds per item rolled at 0 MF —
common ~55%, magic ~33%, rare ~10%, epic ~1.7%, legendary ~0.25%, set ~0.08%, mythic ~0.01% (magicFind shifts weight
upward with diminishing returns; bosses get bonus rolls and a rarity floor). ≥ 25 hand-authored legendary/mythic uniques
with build-defining mods and flavour text, ≥ 4 item sets with 2/3/4-piece bonuses, gems + sockets, potions, town-portal
scroll is NOT an item (it's a free HUD button). Gold economy, vendor pricing, gambling, salvage/upgrade sink.
`player.materials = { dust, shard, essence }` is yours to define.

### 4. Combat & Classes — `src/game/`, namespace `G.game`

```js
G.game.CLASSES   // { [classId]: { id, name, desc, sprite, icon, baseAttrs, primaryStat, weaponTypes: [..], trees: [{ id, name, desc, skills: [skillId] }] } }
G.game.SKILLS    // { [skillId]: { id, name, classId, tree, icon, desc, maxRank, reqLevel, requires?: skillId, kind: 'active'|'passive',
                 //    tags: ['single'|'aoe'|'defense'|'mobility'|'summon'|'buff'], row, col /* layout hint in the tree grid */ } }
G.game.createPlayer(classId, name) → Player
G.game.revivePlayer()
G.game.spawnMapEntities(map)        // turn map.spawns into monsters/NPCs in state.entities (scaled by map.depth)
G.game.update(dt)                   // player controller, AI, projectiles, effects, regen, cooldowns, death, pickups in radius, visibility update
G.game.recomputeStats(ent)          // base + attrs + G.items.getEquipmentMods + passives + effects → ent.stats; emits player:stats
G.game.gainXp(n)
G.game.spendAttr(attr) → bool
G.game.canLearn(skillId) → { ok, reason? }
G.game.learnSkill(skillId) → bool   // spends a skill point, auto-slots new actives into an empty skillBar slot
G.game.setSkillSlot(slot, skillId|null)
G.game.respec() → bool              // refunds all skill + attr points for gold (cost scales with level)
G.game.setAutoBuild(mode)           // null|'single'|'aoe'|'balanced' — when set, points are spent automatically on level-up (and immediately for unspent points), and attrs follow the class's primary stat
G.game.getSkillInfo(skillId) → { ...SKILLS[id], rank, nextRankDesc, mpCost, cooldown, cdRemaining, learnable, lockedReason }
G.game.useSkill(slot) → bool
G.game.usePotion(kind) → bool
G.game.getXpForLevel(level) → n
G.game.getMonsterInfo(monsterId) → { name, sprite, ... }
G.game.healPlayer(full = true)      // healer NPC
```
Owns: 4 classes (suggested: **Warrior** melee/tank, **Ranger** bow/traps, **Sorcerer** elemental caster, **Necromancer**
summons/curses) each with 3 skill trees of ~6 skills (mix of actives and passives, prerequisites, 5 ranks each), every skill
tagged so auto-build can pick: `'single'` favours single-target/boss-killing, `'aoe'` favours group clearing, `'balanced'`
alternates. Stat formulas, damage types + resists, crits, dodge/block, status effects (burn, chill/freeze, shock, poison,
stun, slow), monster bestiary per theme (≥ 5 per theme, melee/ranged/caster/swarm/brute archetypes), champion/rare monster
affixes (fast, extra-strong, fire-enchanted, vampiric, teleporter, shielding…), 4 bosses (one per theme, reused deeper with
scaling) with telegraphed attack patterns, AI (aggro radius, leash, pathing via `G.world.findPath`, ranged kiting), XP
curve (level cap 60), infinite depth scaling. Player controller: joystick (`G.input.move`) overrides tap-to-move; `input:tap`
on/near a monster = attack-move, on a ground item = walk + `G.items.pickup`, on an NPC = walk + `npc:interact`, on an
interactable prop or stairs tile = walk + `object:interact` (chests/barrels/shrines are resolved by you: call
`G.items.dropLoot` / apply a shrine buff, set `prop.used`, swap chest → chest_open), elsewhere = pathfind there.
Auto-target nearest enemy for attack button and skills (mobile has no cursor). Auto-pickup gold within `pickupRadius`.
On monster death call `G.items.dropLoot(x, y, { source, level, magicFind, goldFind })`, emit `monster:killed`, grant XP.
NPCs are created from `map.spawns` with `kind:'npc'` — stationary, named, never attackable.

### 5. UI & Meta — `src/ui/`, namespaces `G.ui` and `G.meta`; also owns `manifest.webmanifest`, `sw.js`, `icons/` at the repo root

```js
G.ui.init(rootEl)                   // build DOM in #ui (pointer-events: none on root; enable on your widgets)
G.ui.update(dt)                     // cheap per-frame refresh (orbs, cooldown sweeps); only touch DOM when values change
G.ui.open(panel, arg?), G.ui.close(), G.ui.isOpen() → bool   // full-screen panels set state.paused = true
G.ui.toast(text, color?)
G.meta.save(), G.meta.load() → bool, G.meta.hasSave() → bool, G.meta.deleteSave()   // localStorage; versioned; restore into G.state (+ G.bumpId)
G.meta.initQuests()                 // fresh quest state for a new game
G.meta.getQuests() → [{ id, name, desc, giver, status: 'available'|'active'|'ready'|'done', progress, goal, rewards }]
G.meta.acceptQuest(id), G.meta.turnInQuest(id)
```
Owns: title screen (New Game → class select with portraits + name, Continue), HUD (HP/MP orbs, XP bar, level, 4 skill
buttons with cooldown sweep + mana check, attack button, HP/MP potion buttons with counts, town-portal button, minimap,
quest tracker, loot pickup feed, toasts, boss health bar, depth label), inventory + paper-doll equipment + character
sheet with attribute spending, item tooltips with compare-vs-equipped and Equip/Drop/Sell/Salvage actions, **skill tree
panel with the three auto-build buttons — "Single Target", "Group Damage", "Balanced" — front and centre plus manual
mode and respec**, vendor panel per NPC role (merchant: potions/general; blacksmith: weapons/armour + upgrade + salvage;
mystic: jewellery + gambling; healer: free heal + potions; elder: quests; stashkeeper: stash), dungeon-entrance/waypoint
depth picker (from `state.flags.waypoints`), quest log, death screen, settings (sfx, loot filter, delete save), pause menu.
Quest system: a main chain (kill the boss of each theme) + repeatable bounties generated per trip (kill N of X, reach
depth N, find N rares, open N chests) tracked through events; rewards are gold, XP (`G.game.gainXp`) and items
(`G.items.rollItem`). PWA: manifest, service worker (cache-first for offline), home-screen icon. Layout: must work in
portrait AND landscape on a 375 px-wide phone, respect safe-area insets, ≥ 44 px touch targets, pixel-art look (hard
edges, bitmap-ish font stack, no blur/rounded-glassy styling), all icons via `G.engine.getIconURL`
(fall back to a coloured square if the engine isn't loaded).

## Design pillars (decide ambiguities in favour of these)

1. **Loot is the game.** Constant drops, clear rarity colours and sounds, instant "is this an upgrade?" feedback, deep chase items.
2. **One-thumb friendly.** Everything playable without reading: auto-target, auto-build, auto-pickup gold, sell-junk button.
3. **Runs on a potato.** Small code, cached art, no frameworks.
4. **Old-school mood.** Dark gothic pixel art, terse flavour text.

---

# Revision 2 — lead dev decisions (overrides anything above that conflicts)

Core changes are already in `src/core/` — re-read `constants.js` and `scenes.js`.

## R2.1 Tiles: shallow vs deep
- `WATER` (6) and `LAVA` (9) are now **shallow and walkable**. New impassable, see-through tiles: `DEEP_WATER` (12),
  `DEEP_LAVA` (13), `CHASM` (14, bottomless pit — replaces walkway-adjacent VOID in the abyss; VOID stays opaque rock).
- **World:** use shallow tiles for crossable pools/rivers and deep tiles (visibly distinct, always edged by at least one ring
  of shallow) wherever the player must not cross. `findPath` treats shallow WATER as cost ×2 and LAVA as cost ×6 so paths
  avoid them when a dry route exists. Abyss uses CHASM, not VOID, around walkways.
- **Game:** an entity standing in shallow WATER or LAVA moves at `C.SLOW_TILE_SPEED`; in LAVA it also takes
  `C.LAVA_DPS_PCT` % of max HP per second as fire damage (resist applies; ticks twice a second with `fx:spawn` smoke/spark).
  Flyers and wraiths ignore both; inferno-native monsters ignore lava damage.
- **Engine:** draw the three new tiles; shallow must read as wadeable (floor visible through it), deep as dark and opaque.

## R2.2 Uniques: Legendary Elite and Legendary Mythic
**Correction from the lead dev:** Legendary is ONE tier split into two sub-tiers — "Legendary Elite" and "Legendary Mythic" —
not two separate tiers. Rarity keys stay `legendary` (Elite) and `mythic`; both carry `tier: 'legendary'` and `sub` in
`C.RARITY`. Anywhere tiers are listed or filtered (loot filter, sell-junk threshold, drop tables shown to the player, quests
counting "legendary" finds) show a single "Legendary" entry covering both; item names/tooltips show the full
"Legendary Elite" / "Legendary Mythic" label. Wherever the text below says "Elite" or "Mythic" read it as the sub-tier.
- Rarity key `legendary` is now displayed as **Elite** (`C.RARITY.legendary.name`); never hard-code the word "Legendary".
  Elite uniques = strong hand-authored stat combinations, no special effects. ~0.25% per item at 0 MF (unchanged).
- **Mythic** uniques each carry exactly one unique effect and are far rarer: target **0.002% per item at 0 MF** (1 in 50,000),
  under 0.01% at any magic find; bosses at most ~0.03% per kill. At least 10 mythics, every effect below used at least once.
- Item field: `effects: [effectId]`. `G.items.EFFECTS = { [effectId]: { name, desc } }` (tooltip text, shown in mythic colour).
  `G.items.getActiveEffects(player) → { [effectId]: true }` for equipped items — the game module calls this (guarded) and
  caches it on `player:stats`. Behaviour lives in the game module, keyed by id:

| effectId | Behaviour (game team implements) |
|---|---|
| `split_shot` | Your projectiles split into 2 extra projectiles (50% damage) on their first hit |
| `corpse_blast` | Enemies you kill explode for 25% of their max HP as fire in 2.5 tiles (chains) |
| `chain_spark` | Hits have a 25% chance to arc lightning to 3 nearby enemies for 40% of the hit |
| `second_wind` | Fatal damage instead heals you to 50% HP and stuns nearby enemies; 120 s cooldown |
| `echo_cast` | Active skills have a 25% chance to fire a second time for free |
| `blood_price` | Skills cost HP instead of mana and deal 40% more damage |
| `midas` | Picking up gold heals 2% HP and grants +5% damage for 6 s, stacking to 10 |
| `frozen_wake` | Moving leaves a frost trail (3 s) that chills and damages enemies standing in it |
| `legion` | +2 maximum summons; without summons, a spectral double repeats your basic attacks for 50% damage |
| `thunderstep` | Every 4th basic attack calls a lightning bolt on the target for 200% weapon damage in 1.5 tiles |
| `executioner` | Enemies below 15% HP (5% for bosses) die instantly when you hit them |
| `hoarder` | +1% damage per 100 gold carried, up to +60%; the gold is at risk on death like any other |

## R2.3 Class weapons
Any class may equip any weapon (no restriction, now or later). Skills that need a weapon type work for any class holding that
weapon type; the tooltip notes "favoured by <class>" instead of a red warning. Cross-class skills are a later feature.

## R2.4 Death and corpse retrieval (core owns)
- `player:died` payload is now `{ noRetrieve: bool }`. **Game:** `noRetrieve = true` when the player dies while a boss is
  aggroed and alive, or inside a sealed lockdown room; false otherwise.
- `G.scenes.getDeathPenalty() → { retrievable, gold, items }` — the **UI** death screen shows it: either "You lose N gold" or
  "Your gold (N) and backpack (M items) lie where you fell — Depth D. Die again and they are lost."
- `G.scenes.respawn()`: non-retrievable = flat 10% gold. Retrievable = all carried gold + backpack move to
  `state.flags.corpse = { depth, seed, x, y, gold, items }`; equipped gear, belt potions and materials are kept. Re-entering that
  depth rebuilds the same floor with a `corpse` prop (`interact: 'corpse'`); interacting emits `object:interact { type: 'corpse' }`
  → `G.scenes.reclaimCorpse()`. **Game:** emit `object:interact { type: prop.interact, prop }` for ANY interactable prop you
  don't resolve yourself. **UI:** show a corpse marker + depth in the depth picker and HUD while `state.flags.corpse` exists;
  save/load `flags.corpse`. **Engine:** draw `corpse` (slumped body + faint glow) and mark it on the minimap.

## R2.5 Lockdown rooms (new event)
- **World:** on non-boss floors from depth 2, 0–2 rooms get `type: 'lockdown'` with `doors: [{x, y}]` (every entrance tile, each a
  DOOR tile, max 3) and `waves: 2–4` (by depth). No `spawns` inside; a `chest` prop in the centre with `locked: true`.
- **Game:** when the player steps inside (not on a door tile): push solid `{ type: 'gate', x, y, solid: true }` props on each door,
  `G.world.invalidate(map)`, emit `room:locked { room }`, spawn waves (next wave when the previous is dead, last wave includes a
  rare monster), then remove the gates, unlock the chest (loot source `'chest'` rolled twice with a rare-or-better floor), emit
  `room:cleared { room }`. Death inside = `noRetrieve`. Town portal is disabled while sealed (`state.flags.sealed = true/false`).
- **UI:** banner on `room:locked` ("The doors slam shut") with wave counter, and on `room:cleared`; disable the portal button
  while sealed; lockdown rooms count toward a new bounty type. **Engine:** draw `gate` (iron portcullis, solid, tall).

## R2.6 Gems
Two families (items team designs the numbers): **cut gems** — modest power, removable at the blacksmith for gold, gem kept;
**bloodstones** — roughly double power with a small drawback or secondary stat, rarer, fused permanently (socketing asks for confirmation).
API: `G.items.unsocketGem(invIndexOrSlot, socketIndex) → bool`, `G.items.unsocketCost(item, socketIndex) → gold | null` (null = permanent).

## R2.7 Vendor buyback
`G.items.getBuyback() → [{ item, price }]` (last 12 items sold, newest first, kept until the player next enters a dungeon),
`G.items.buyback(index) → bool`. Price = 2.5 × what the vendor paid. UI: a Buyback tab on every vendor.

## R2.8 Blessed helpers (now part of the contract)
`G.scenes.quitToMenu()`; `G.game.getRespecCost()`, `G.game.getPotionCooldown(kind)`, `G.game.zones` (telegraphs/traps; engine may draw them);
entity `faction: 'player'|'enemy'|'neutral'`; `G.world.invalidate(map)`; prop `light` = radius in tiles; a broken barrel is removed from
`map.props`; `G.items.gambleCost/upgradeCost/salvageYield/buyPrice/socketGem/combineGems/sortStash/formatStat/statLabel`,
`equip(invIndex, ringSlot?)`; `critDmg` is a whole percent; `fx:shake.amount` is logical pixels; reset `animT = 0` on every anim change.

## R2.9 Art pipeline
The art budget is frozen: no further procedural art polish. The lead dev will hand-draw replacement art to `ART_SPEC.md`.
**Engine:** implement the override loader exactly as `ART_SPEC.md` describes (files listed in `assets/assets.js`; any missing or
failed image silently falls back to the existing procedural art). No other art work beyond the new tiles/props named above.

---

# Revision 3 — lead dev decisions (overrides anything above that conflicts)

Core changes already made: `C.INV_SIZE = 60`, `C.STASH_SIZE = 120`, `state.settings.junk` (see `state.js`).
Direction for everyone: **harder than Diablo, forgiving on the grind.** The player should feel powerful but never faceroll;
death is the punishment (corpse run), not lost progress. No class should need min-maxing to survive — easy to play, hard to master.
The interface must stay snappy and simple: no spreadsheets, few menus, one tap to the thing you want.

## R3.1 Junk rules (replaces the sell-junk threshold)
- `state.settings.junk = { maxRarity: 'none'|'common'|'magic'|'rare', action: 'sell'|'salvage', auto: bool, keepUpgrades: bool, keepSocketed: bool }`.
- **Items:** `G.items.isJunk(item) → bool` (equipment only; never set, Legendary Elite/Mythic, gems, consumables, or anything in
  the stash; respects keepUpgrades via `verdict` and keepSocketed). `G.items.processJunk() → { count, gold, materials }` sells
  (town only) or salvages (anywhere) every junk item in the backpack. When `auto` is on: action `salvage` → junk is salvaged the
  moment it is picked up (one quiet feed line, no toast spam); action `sell` → junk is sold automatically on arriving in town
  (one summary toast). Sold junk goes to buyback as usual.
- **UI:** a "Junk rules" block in settings and on every vendor: rarity threshold, Sell / Salvage, Auto on/off, the two keep toggles;
  one "Clear junk" button; junk items get a small dim marker in the grid. Remove the old sell-junk threshold setting.

## R3.2 Gems on sold or salvaged gear
Any gem socketed in an item that is sold, salvaged or auto-junked is destroyed and returns **gem dust**
(`player.materials.gemdust`), more for higher tiers and for bloodstones. Gem dust is a crafting material: the items team gives it
uses (at minimum: upgrading a cut gem one tier at the blacksmith, and rerolling one affix on a rare-or-better item at the mystic).
`G.items.salvagePreview(invIndex) → { materials, gems: n, gemdust: n }` (also valid before a sale). **UI:** if `gems > 0`, a
confirm popup: "N socketed gems will be ground to dust with this item." `keepSocketed` defaults to true so auto-junk never does this silently.

## R3.3 Bloodstones
Fusing a bloodstone always goes through a UI confirmation. `G.items.useItem` on a bloodstone must refuse (returns false);
only `socketGem(gemInvIndex, target, { confirmPermanent: true })` fuses one. Canonical signature: `socketGem(gemInvIndex, target, opts?)`.

## R3.4 Upgrade arrows, no auto-equip
The game never equips anything for the player except starter gear. `G.items.verdict(item) → 'up'|'down'|'same'|null`
(null = not equippable / nothing to compare; off-class weapons are compared honestly on damage). **UI:** green up arrow for
`'up'`, red down arrow for `'down'` on every backpack/vendor/stash cell and on ground-item pickup feed lines. Tooltip leads with
one headline number (weapon DPS, armour, or the top stat) with its delta vs equipped in green/red, then the affixes in plain
words; the full stat list lives behind a "Details" toggle.

## R3.5 Bigger bags
Backpack 60, stash 120. **Items/UI:** pad arrays from old saves; grids scroll or page (no tiny cells — keep ≥ 44 px targets).

## R3.6 Monster tiers and modifiers
- Monster `rarity` is now `'normal'|'champion'|'rare'|'legendary'|'boss'`.
  - **champion**: packs of 2–4, one modifier, blue name. **rare**: single with a few minions, 2–3 random modifiers, generated
    name, yellow name. **legendary** (new): uncommon (about one per 2–3 floors from depth 3, more often deeper, guaranteed in the
    last lockdown wave from depth 8), 4–5 modifiers including one from a legendary-only pool with a visible mechanic (e.g. splits
    on death, periodic nova, reflects projectiles, drags the player in, enrages at low life, summons shades), orange name, a
    generated title, much tougher, and announced with `ui:toast` + `sfx` when first seen.
  - Grow the modifier pool to ≥ 20, each with a readable tell, each listed by name in `entity.affixes`.
- Loot: `G.items.dropLoot` sources add `'legendary'`; and `opts.floor?: rarityKey` (minimum rarity for the best item rolled) is now public.
  Legendary monsters drop like a small boss with a meaningfully better Legendary Elite chance.
- **Engine (no art polish, effect only):** name colour + aura for `legendary`; modifiers shown under the name plate (max 3 lines + "+N").
- **UI:** target/boss bar shows tier and modifier names for rare and legendary monsters.

## R3.7 Floor modifiers (variety)
From depth 4, each newly generated floor rolls 0–2 modifiers (more and nastier deeper); the game team rolls them in
`spawnMapEntities` into `map.mods = [modId]` deterministically from `map.seed`. `G.game.FLOOR_MODS = { [id]: { name, desc, reward } }`.
Each mod makes the floor harder in a distinct way (e.g. monsters hasted, extra fire damage, darkness/short sight, more rares,
volatile corpses, no regen, cursed shrines) and pays for it with bonus magic find / gold find / XP. **UI:** show the mods under
the depth label and in the depth picker is not required (floors are rolled on entry); toast them on arrival.

## R3.8 Skill synergies
Every active skill gets 1–2 synergies: ranks in a named other skill (same class, usually another tree) add a stated bonus
(D2-style), plus at least one cross-tree combo per class that changes behaviour rather than numbers (e.g. frozen enemies shatter
for fire damage). `SKILLS[id].synergies = [{ from: skillId, desc }]`; `getSkillInfo` returns `synergies: [{ from, name, desc, active }]`.
Auto-build plans should take the strongest synergy pairs. **UI:** synergies listed in the skill details pane; active ones highlighted.

## R3.9 Tuning answers
- `executioner` stays as implemented (a hit that drops the enemy under the threshold kills it).
- `legion`: +2 skeleton warriors and +1 skeletal mage; golem stays at one.
- Warriors get sturdier (do not weaken casters): target similar potion use across classes on bosses, 3–6 per boss with auto-build.
- Depth 50+ outscaling gear is the intended endgame wall.
- Sets are never junk and never sold by any bulk action.
- Item stats: prune affixes to ones the player can feel; no affix should be a trap. Typical kill should still drop something often.

---

# Revision 4 — lead dev decisions (overrides anything above that conflicts)

## R4.1 Placeholder story (UI/meta owns the text)
Short, but it must give the general shape of a story. Owner: UI/meta team, as data in its own files.
- A premise (why Emberfall is dying, what lies at the bottom), the Elder's dialogue before and after each main-chain step,
  one intro line and one death line per boss (shown as a banner when the boss is first seen / killed; detect via entities with
  `rarity === 'boss'` and `monsterId`), and a short ending scene after step 8 that leaves a hook for "deeper still".
- Main-chain boss steps are tied to the actual boss of each theme by `monsterId` (`boss_gravelord`, `boss_broodmother` and the
  inferno/abyss ids in `src/game/data_monsters.js`), with names read from `G.game.getMonsterInfo(id).name`.
- **Lore pages:** `G.meta.LORE = [{ title, text }]` (12–20 entries, a few lines each, fleshing out the world). A journal panel lists found pages.
  `state.flags.loreFound = [index]`.
- **Items:** a new item `type: 'lore'` (`{ type:'lore', loreIndex, name, rarity: 'rare', icon: { shape:'scroll', ... } }`), dropped
  rarely by chests, rare/legendary monsters and bosses, choosing an index in `[0, (G.meta?.LORE?.length || 16))` not in
  `state.flags.loreFound`; never junk, no sell value, does not occupy a bag slot (pickup emits `item:picked` with the item and
  `lore:found { loreIndex }`). **UI** marks it found and shows the page.

## R4.2 Legendary Elite rate
Rare and purely chance-based: no per-floor guarantee, pity timer or quota anywhere. Halve the per-item Legendary Elite chance
(~0.125% at 0 MF), keep every source's relative bonus. The only guaranteed Elite stays the step-8 story reward.

## R4.3 Caster vs melee balance
The combat team has a free hand. Target: every class lands in the same band of potion use per boss (3–6 with auto-build) and
no class trivialises bosses — e.g. bosses that target summons, close distance, interrupt channels, punish standing still.

## R4.4 Ranger: squishy but mobile
Rangers stay squishy (no innate damage reduction). Instead they get an innate **class action**: a short-cooldown dash/roll.
- `G.game.getClassAction() → { id, name, desc, icon, cooldown, cdRemaining } | null` (null for classes without one — for now only Ranger).
- Triggered by the `input:classaction` event `{}`; dashes in the joystick direction, or away from the nearest enemy when idle,
  ~3 tiles, brief invulnerability frames, ~3 s cooldown (skills/passives in the Ranger trees may improve it).
- **UI:** a dash button next to the attack button when `getClassAction()` is non-null, with a cooldown sweep.
- **Engine:** Shift (and right mouse button) emit `input:classaction`.

## R4.5 Small rulings
- Buyback as a one-tap strip on each Sell tab is approved (no healer buyback). Legendary monsters count for "Marked for Death".
- Set drops get the same ground label/glow treatment as rare-and-above.
- Lockdown wave counter: UI reads `G.game.getLockdown()`.
- Any death abandons an unclaimed corpse (core now does this).
- A hand-bumped `VERSION` in `sw.js` is the release switch.

## R4.6 Working title: "Sallow" (tentative)
Every player-facing "Emberdeep" becomes "Sallow" (title screen, manifest name/short_name, app icon text if any, story text,
item names such as "Emberdeep's Heart" → reword to fit). Internal ids, file names, save keys and the `G` namespace stay as they
are, so existing saves keep loading. The town keeps the name Emberfall for now. Keep the name easy to change again: read it from one
constant in your own module rather than repeating it.

---

# Revision 5 backlog (queued for the next round — not yet assigned)

## R5.1 Player-controlled HUD layout
- Setting: joystick mode `'floating'` (default, current) or `'fixed'` (always visible in a chosen corner).
- An "Edit HUD" mode in settings: the player drags the joystick anchor, attack button, skill buttons, potions, dash, portal,
  minimap and quest tracker to where they want them, and can resize the action buttons (small / medium / large) and set HUD
  opacity. Snap to a coarse grid, keep everything inside the safe area, keep touch targets ≥ 44 px, separate layouts for portrait
  and landscape, "Reset to default" button. Stored in `state.settings.hud` and saved.
- **Engine:** reads `state.settings.hud.joystick = { mode, x, y, size }` (fractions of the screen) and draws/handles the fixed
  stick; the floating-stick zone follows the configured side. **UI:** the editor and button placement.

## R5.0 Standing direction: creative freedom
The lead dev wants every team to take creative leaps in art direction and mechanics, and to pitch original ideas rather than
wait for instructions. Each team's report should end with 1–3 pitches of its own (what, why it fits Sallow, rough cost).
Bold ideas are welcome; keep them cheap to run and easy to cut.

## R5.2 Signature mechanic: Pallor (push-your-luck)
Each floor descended without returning to town adds Pallor (0–100). The screen slowly drains of colour; monsters gain
strength and new modifiers; item quality and quantity rise. Some drops at high Pallor come "bleached": they carry an extra
hidden affix revealed only when you bring them back to town alive. Returning to town (portal or death) resets Pallor; dying
with high Pallor loses unrevealed bleached items. The core loop becomes "one more floor?"

## R5.3 Awakening gear
Equipped items keep a tally of what they killed. At milestones (e.g. 250 / 1000 / 5000 kills) an item awakens one dormant affix
themed on its victims (killed mostly fire demons → fire resistance or fire damage). Gives a reason to keep a favourite item.

## R5.4 Backlog pitches (build later if the first two land)
- **Your Echo:** an abandoned corpse rises as a hostile copy of you wearing a ghost of your gear; killing it returns part of the lost gold.
- **Shrine bargains:** some shrines offer a deal instead of a buff ("lose 25% max life on this floor, double loot").
- **The Scavenger:** a rival looter who appears on some floors and races you to the best drop on the ground.

## R5.5 Endgame and depth (lead dev answers, 2026-10-14)
- Finishing main-chain step 8 unlocks: "deeper floors open", a title shown next to the player's name, and Pallor (R5.2) switches on from then.
- Deep-only modifiers: from depth 21 (and more past 30, 40…) floor modifiers and monster modifiers draw from extra pools that never appear above those depths, so the endgame keeps producing new situations.
- The premise keeps playing on first arrival in town.
- Casters should feel danger on normal floors too: ranged monsters that target whoever is furthest back, modifiers that punish standing still. Per-mode spread of about 2–6 potions per boss is acceptable while each class averages 3–6.
- Items also records `state.flags.loreFound` as a safety net (never adding an index twice). Acrobatics (`dodge_roll`) is passive: UI must not offer it on the skill bar.
- Team handover notes now live in `docs/handover/` inside the repo; keep them updated there.

---

# Revision 5 — assigned (lead dev playtest feedback, 2026-10-14). Overrides anything above that conflicts.

Revision 5 consists of R5.0–R5.5 above (now assigned, no longer backlog; R5.4 stays backlog) plus R5.6–R5.10 below.
Already done by the lead: on-screen walking speed is now equal in every direction (`screenSpeedScale` in `src/game/player.js`).

## R5.2 Pallor — interface details
- Locked until the story ending: `state.flags.pallorUnlocked = true` is set by the UI when the ending scene finishes.
- `state.flags.pallor` 0–100. **Game** owns it: +10 per new floor entered by stairs without visiting town (more past depth 30),
  reset to 0 on `scene:changed` to town. `G.game.getPallor() → { value, tier: 0..4, effects: [text] }`. Tiers add monster
  modifiers/stats and raise item quantity/rarity (pass `pallor` in `dropLoot` opts).
- **Items:** at Pallor tier ≥ 2 some drops are `bleached: true` with one hidden extra affix in `item.hidden`; tooltip shows "???"
  until revealed; on `scene:changed` to town every bleached item in the bag/equipment reveals (toast). A death abandons them with the corpse as usual.
- **Engine:** desaturate the world by `pallor` (tier steps, cheap: a cached colour matrix/overlay, never per-pixel per frame on phones);
  loot colours stay saturated. **UI:** a small Pallor meter under the depth label when unlocked.

## R5.3 Awakening — interface details
**Items** owns it: listens to `monster:killed`, increments `item.kills` and a small per-victim tally (theme / damage type / body)
on every equipped item; milestones 250 / 1000 / 5000 awaken one themed affix into `item.awakened` (toast + sfx). Tooltip shows
progress to the next awakening as one short line.

## R5.6 Loot piles instead of scatter
- **Items:** all items and gold from one kill / chest land on one pile point (nearest free tile to the kill). Ground items keep
  their shape plus `pileId`; piles within 0.75 tiles merge. Gold in a pile is a single entry. `G.items.getPile(pileId) → [ground]`,
  `G.items.pickupPile(pileId, { minRarity? }) → { taken, left }`.
- **Engine:** draw a pile as a small heap: the best item's icon on top, a count badge, the best item's rarity glow/beam,
  and one label "Best Item Name +N". Single-item piles look like today.
- **Game:** tapping a pile walks to it; one item → pick up; several → emit `pile:open { pileId }`.
- **UI:** a compact pile popup listing the items (icon, name in rarity colour, ▲/▼ verdict) with tap-to-take and "Take all".

## R5.7 Sorting
`G.items.sortInventory(mode)` and `G.items.sortStash(mode)`, mode ∈ `'rarity' | 'level' | 'slot' | 'value' | 'upgrades' | 'newest'`
(stable; equal keys fall back to rarity then level). Item gains `foundAt` (`state.time` at pickup) for `'newest'`.
**UI:** a sort button with these options; the last choice is remembered in `state.settings.sort`.

## R5.8 Mass selling and locking
`G.items.sellAtOrBelow(rarityKey) → { count, gold }` and `G.items.previewSellAtOrBelow(rarityKey)`. Never sells sets, either
Legendary sub-tier, gems, lore or **locked** items (`item.locked`, toggled from the tooltip). Sold items go to buyback.
**UI:** on every vendor's Sell tab, one-tap buttons "Sell all ≤ White / ≤ Blue / ≤ Yellow" (rarity names from C.RARITY) with a
confirm showing count and gold; a lock toggle in the tooltip and a small lock mark on cells.

## R5.9 Visible gear and matching looks
- Equipped weapon, off-hand, helm, chest, gloves and boots appear on the player character.
- **Items:** every armour/weapon base gets `look: { family, palette }`. Families are appearance lines (about 3 per armour weight
  per depth band, e.g. `rusted_mail`, `grave_wrap`, `ash_plate`, …) shared across tiers so players can build a look. Wearing
  helm + chest + gloves + boots of one family grants a small **Matched** bonus (2 and 4 pieces), separate from named sets and
  visible in the tooltip. Unique items may have their own family.
- **Engine:** procedural gear overlays per family × slot layered on the player sheet (cached per equipment combo), visible in
  the paper doll via `G.engine.getPlayerPreview(player, size) → canvas`. Propose the hand-drawn overlay format (same 640×80 grid
  as character sheets, one file per `<family>_<slot>.png`) and document it in your report so the lead can add it to ART_SPEC.md.

## R5.10 More variance with depth
- **World:** every floor gets `map.variant = { id, name, palette, light, ambient, layout }` chosen from the theme's pool by depth
  band, plus a floor name ("The Drowned Ossuary"). Each theme has at least 3 layout styles and 3 variants; past depth 20 themes
  start blending and corrupting (variants unique to deep floors). Rare special rooms (flooded crypt, bone garden, chained arena,
  collapsed bridge…) give floors landmarks.
- **Engine:** render `map.variant` (palette shift, light colour/radius, fog density, ambient particles, sound bed). Keep it cheap.
- **UI:** show the floor name on arrival and under the depth label.

---

# Revision 6 — queued (approved by the lead dev, 2026-10-14; not yet assigned)

## R6.1 "Go deeper?" prompt
Once Pallor is unlocked, taking the stairs down asks "Go deeper?" and shows the current Pallor tier, what the next tier adds
(from `G.game.getPallor()` plus a new `G.game.previewPallor(nextValue)`), and the reward boost. Two big buttons: Descend /
Stay. A "don't ask again this run" tick. Game owns the data, UI owns the prompt.

## R6.2 Your Echo — fighting yourself
- When a corpse is abandoned (any death while `state.flags.corpse` exists, see R2.4), it is not simply lost: next time the
  player enters that depth, the corpse rises as **the Echo** — a hostile copy of the player at the moment of death: same class,
  sprite and visible gear (ghostly tint), stats scaled from the player's (life about 2.5×, damage about 0.8×), name
  "Echo of <name>".
- **It fights like the player.** The game keeps a rolling tally of how the player actually spends combat time
  (`player.style = { [skillId|'attack'|'dash'|'potion']: uses }`, decayed over time so it tracks the current build). The Echo picks
  its actions with the same proportions: if the player opens with Leap and spams Whirlwind 60% of the time, so does the Echo. It
  uses the player's skill ranks and synergies, dashes if the player dashes, and drinks a limited number of potions at the
  player's usual threshold.
- Killing it returns the abandoned gold and backpack items (the corpse contents), plus a guaranteed rare-or-better drop. Dying to
  it does not create a new Echo on top (one Echo at a time). Boss-floor/lockdown deaths still create no corpse and no Echo.
- Engine: ghostly rendering of the player sheet + gear (desaturated, slight transparency, trailing after-images). UI: boss-style
  bar "Echo of <name>" and a banner on first sight.

## R6.3 Every class dashes; movement feels faster
- Raise base movement speed (the lead dev finds every class sluggish) — try about +20% and tune by feel; keep monster
  speeds in proportion so the game doesn't get easier.
- Every class gets the class action (`getClassAction`, `input:classaction`): a dash with brief invulnerability. Squishier
  classes get more: Ranger and Sorcerer 2 charges, Necromancer 2, Warrior 1 charge but a shoulder-charge that knocks back.
  Each class gets dash-augmenting skills/passives in its trees (e.g. Sorcerer: Blink Dash leaves a frost trail; Ranger: dash
  reloads a free Multishot; Necromancer: dash swaps places with a minion; Warrior: dash ends in a ground slam). Make the dash
  button show charges. Auto-build should take one dash augment per class.

## R6.4 Graphics and sound overhaul — toward Diablo II, away from 8-bit
Direction from the lead dev: less 8-bit, more nostalgic Diablo II — higher resolution, painterly shading, 8 facing directions,
heavier atmosphere. The lead dev will draw the art (on iPad) and source/produce sound.
- **Engine** designs and builds the new pipeline: roughly double internal resolution, 64×32 floor tiles, larger character cells
  (proposal: 96×96, human ~60 px tall), 8 directions (5 drawn + 3 mirrored), D2-style smooth coloured lighting with soft
  shadows, and an audio-file loader (`assets/sound/*.mp3`) that overrides the synthesized sounds the same way PNGs override
  procedural art. Procedural art stays as the fallback, scaled to the new resolution. Keep 60 fps on old phones.
- **Engine also generates the complete art and sound list from the code** (every sprite key, monster, NPC, class, gear
  family × slot, prop, tile × theme × variant, icon, projectile, effect, portrait, UI element and every sound name), with
  file name, size, frame layout and a one-line description, written to `ART_LIST.md` / `SOUND_LIST.md` and kept in sync by a
  harness page so nothing is ever missing. ART_SPEC.md is rewritten for the new format.
- Item and equipment names will be renamed later by the lead dev to fit the story; keep names in data tables, never in logic.

## R6.5 Campaign: the corrupted rift
The town's heat source is a deep rift (today "the well") that used to warm Emberfall and has turned corrupt. The deeper you go,
the more corrupted everything is. The campaign is about cleansing the rift, delving deeper and deeper to uproot the source,
ending in a final boss at its core.
- **Every team: build on this and pitch how it changes your area** — story beats and the core's nature (UI/meta), how
  corruption shows in layouts, tiles, light and sound as depth increases (world + engine), corrupted monster variants,
  mid-bosses and the final boss fight (combat), corrupted/cleansed items and how cleansing could be a loot mechanic (loot).
  How Pallor ties in (is Pallor the rift's corruption seeping into you?). Pitch first in the report; build what is cheap.

---

# Revision 7 — the lead dev's design document (2026-10-14). Overrides anything above that conflicts.

## R7.1 Rarity ladder (most common → least common)
| Key | Name | Colour | Glow |
|---|---|---|---|
| `common` | Common | grey | none |
| `uncommon` | Uncommon | green | none |
| `rare` | Rare | blue | none |
| `magic` | Magic | purple | slight glow on ground and in inventory |
| `legendary` | Legendary Elite | yellow | a little bigger |
| `mythic` | Legendary Mythic | orange | slightly bigger, not by much |
| `unique` | Unique / Corrupted | red | bigger |
| `rift` | Rift | reddish pink | biggest, slowly pulsing |
- Core changes `C.RARITY`; items migrate old saves (old magic → uncommon, old rare → rare, old epic → magic, old legendary →
  legendary, old mythic → mythic). Set items keep their set bonus as a flag (`setId`) on top of their rarity tier instead of being a tier
  (lead default; set pieces drop as Legendary Elite with a green "Set" tag). Corrupted items from R6 become the `unique` tier.
  `rift` items are new: the rarest drops in the game, from deep in the rift, extremely powerful.
- Inventory cells and ground items both show the glow at the listed strength.

## R7.2 Item power level
Every equippable item shows one **Power** number for the current class, so better/worse is readable at a glance. Proposed formula (items
team refines): base power from item level × slot weight + for each affix (roll quality = where the roll sits in its min–max range,
0–1) × the affix's value to the current class (class stat weights) + sockets/gems + unique/mythic effect value. A high-level Rare can
outscore a low-level Magic item. The ▲/▼ verdict uses Power. Tooltip headline becomes "Power 412 ▲ +37".

## R7.3 Sockets
Items can drop with 2+ sockets at small and falling chances (max by slot and item level); an even smaller chance drops them with
sockets pre-filled with gems. The item icon shows small socket pips (filled or empty) in inventory, stash, vendor and ground label.

## R7.4 New drops
- **Class crafting materials:** one per class, used to upgrade weapons (and the class's armour) at the blacksmith. Dropped by enemies,
  biased to the current class. Plus shared materials as now.
- **Tome of Insight (skill point):** very rare drop; also a guaranteed reward from some bosses and the corrupted-adventurer fights.
- **Team decides other drops** that add variety: e.g. rift shards (currency for rift-only crafting), maps/keys that open special floors,
  trophies from champions, consumable elixirs, relic charms. Keep each one simple and useful.

## R7.5 Skill and speed matter
- Movement and precise tapping should pay off: faster movement and dashes, precise tap targeting, attack-move, and enemy patterns that
  reward dodging (Close Call exists).
- **Explored %:** a rough exploration percentage for the current floor in the HUD (from `map.explored` over walkable tiles).
- **Speed-clear reward:** on reaching the stairs, a clear grade from time weighted by explored % (fast + thorough = best); the grade
  gives bonus loot/XP/materials and a small chest by the stairs.
- **Timed events** (keep players on their toes): *Run the Gauntlet* — reach a marked point before the timer while enemies spawn;
  *Key Hunt* — break crates to find a key before a door locks; team adds more (escort, hold the line, chase a fleeing treasure goblin-
  like thief, collapse — outrun a crumbling floor, etc.).

## R7.6 Corrupted former adventurers
Optional, formidable named foes on deeper floors: adventurers who went down before and were corrupted. Each is tied to a class and a
short story. Defeating one grants a permanent buff or a special class-related skill. Rare, announced, skippable.

## R7.7 Campaign structure and story (story team expands)
- **Premise (the lead dev's):** you're an adventurer whose home was pillaged while you were away. With nothing left, you look for work.
  A mysterious figure hands you a note: go to **Emberdeep** — there is something only you can fix, and you'll be greatly rewarded. The
  town of Emberdeep is cold and desolate; the few frightened townsfolk are delighted to see you. The Elder explains: the town drew heat
  and energy from a rift beneath it. Recently the heat began to fade. Adventurers who went down never came back, or refused to go back.
  The rift runs thousands of miles down and is more corrupted the deeper it goes. The town is resource-barren; the Elder hopes you can
  cleanse the rift once and for all. *(The town is now called **Emberdeep**; the game is still **Sallow**.)*
- **Three acts:** **The Shallows** (first third), **The Deep** (second third), **Hellscape** (last third). At the bottom: the **world boss**
  (story team designs his character and story) — an extremely hard fight; after it, the endgame begins (Pallor etc.).
  Lead default for length: campaign depths 1–30 (Shallows 1–10, Deep 11–20, Hellscape 21–30), world boss at 30, endless below.
- **The world changes as you win:** as each milestone pushes the corruption down, the town warms and comes alive (more NPCs, lights,
  market stalls, new services and mechanics unlock), and the rift's earlier floors become less hostile — fewer enemies, friendly NPCs
  (refugees, a camp, a merchant) appear. The player must *see* their impact.
- **Environment by depth:** gets more gruesome with depth, ending almost abstract — horror, barely comprehensible, nothing like the
  world above, full of corruption.
- **Story team adds:** smaller details, side quest lines, named characters, the mysterious figure's identity, the corrupted adventurers'
  stories, lore — all grim and brutal. Keep text in data tables.

## R7.8 Art transition
Make the procedural art match the new high-res format exactly (same sheet sizes, directions, frames), and export every procedural
sprite as a PNG **template** in the final format to `assets_templates/` so the lead dev can paint over each one and drop it into
`assets/` as a direct replacement.

## R7.9 Model use (lead decision, to save usage)
Design-heavy work (story/narrative, combat balance and boss design, engine pipeline) runs on the strongest model; well-specified
implementation (loot mechanics, UI controls, events, world generation changes) on a mid model; mechanical work (asset list
regeneration, renames, harness upkeep) on the smallest model. Rounds are split across plan windows: at most 2–3 sessions at a time.

## R7.10 The Fallen: adventurer relics that combine (lead dev, 2026-10-14)
- Every corrupted former adventurer (R7.6, `docs/STORY.md`) drops a **relic unique to them**: a permanent power tied to their story
  and fight (e.g. Brannoc's dash-ends-in-shield-bash), kept forever once claimed and never a bag item that can be lost.
- Killing them one by one makes the player steadily stronger. Collect **all** relics and they combine at the Elder (or a shrine
  in town) into one far more powerful reward, the story's payoff for hunting them all. Partial sets give nothing extra; the
  combined reward is the prize.
- **10 fallen adventurers (lead dev decision)**, spread out across the whole descent: roughly three per act plus one in the endgame, never two close together, mixing all four classes. Story team
  writes them; combat builds fights; items/meta build relics and the combining.

## R7.11 Collection sets and the Curator (lead dev, 2026-10-14)
- Instead of salvaging most loot into junk, armour and weapons feed a **collection**. Every look family (R5.9) and named set is a
  collection page: one entry per slot (helm, chest, gloves, boots, plus weapon/off-hand lines).
- A new town NPC, **the Curator**, keeps the **Collection Book**: a checklist of every page showing which pieces you've turned in,
  which are missing, and roughly where they drop (act / depth band). Turning an item in registers it (the item is consumed).
- Completing a page grants a permanent reward: a small buff, a title, a cosmetic, materials, or a stash tab. Completing tiers of
  pages (e.g. 5 / 15 / all) grants larger rewards. Optional "gilded" pages for the same family at Rare-or-better.
- Loot UI: items that would fill a missing collection slot get a small book mark on the cell and ground label, and are **never
  junk**; a "Send to Curator" action and an option to auto-register on reaching town.
- This sits alongside the Matched bonus (R5.9), which is about *wearing* a family; collection is about *turning pieces in*.

---

# Revision 8 — lead dev playtest feedback (2026-10-15). Overrides anything above that conflicts.

## R8.1 The chute (replaces in-dungeon salvaging)
- **World:** every dungeon floor places one `chute` prop (solid, `interact: 'chute'`) on a walkable tile near the map's centre,
  reachable, never in the boss arena or a lockdown room. Town gets a `surface_crate` prop (`interact: 'surface_crate'`) by the
  rift fissure where sent items arrive. Core already added both prop types.
- **Items:** `state.surface = []` (items sent up, arrive instantly, no size cap but sorted by arrival). `G.items.chuteSend(invIndex | [indices])`,
  `G.items.surfaceTake(index)`, and the town actions on surface items: sell, salvage, register with the Curator, stash. **Salvage,
  sell and Curator registration are only possible in town** (from the bag or the surface crate). Junk "auto" now means: auto-send to
  the chute queue — junk is sent the next time the player uses a chute (one tap "Send junk").
- **Game:** interacting with a chute emits `object:interact { type: 'chute' }` (generic forwarding already does this).
- **UI:** chute panel (bag grid; tap to mark, "Send", "Send junk"); surface crate panel in town with the town actions. Remove the
  "Send to Curator" and in-dungeon salvage buttons from the bag.
- **Engine:** draw the chute (a rope-and-iron lift shaft / bucket chute down into the dark) and the surface crate.

## R8.2 Death drops the bag; your ghost guards it (core done)
Every dungeon death leaves a corpse holding the whole backpack (`getDeathPenalty() → { retrievable, gold /*on corpse*/, goldLost, items }`).
Ordinary death: all carried gold goes on the corpse too. Boss / sealed-room death: lose 10% gold, keep the rest, the bag still drops.
**Game:** when the player returns to the corpse's depth, the Echo (R6.2) now rises *at the corpse* on that first return and guards
it; reclaiming requires killing it or slipping past to the corpse. A second death still abandons the old corpse.
**UI:** death screen text from the new fields.

## R8.3 Smaller loot popup
The pile popup and pickup feed must never cover the play area the player needs: compact sheet anchored to a screen edge away from the
stick, max ~35% of the short side, collapsible.

## R8.4 Exploration % gets fuzzy with depth
`G.game.getExplored() → { value, low, high, label }`: exact in the Shallows' first floors, then increasingly uncertain (the village
never mapped the deep): show "~60%" then ranges like "40–70%", and in Hellscape "?" with a hint. Deterministic per floor (no flicker).

## R8.5 Sticky sorting
The chosen sort mode is applied automatically whenever items enter the bag/stash (`state.settings.autoSort: true` default). Double-tap
or long-press the sort button to pick a mode; single tap re-sorts. A settings toggle turns auto-sort off.

## R8.6 First-time tips (light tutorial)
The first time the player meets something new (each rarity tier, sockets, gems/bloodstones, corrupted items, materials, tomes, the
chute, the surface crate, Curator, relics, Fallen, events, Pallor, the Echo, shrines, lockdowns, dash, Close Call…), show a small
card (one or two sentences, icon) that **pauses the game** until dismissed (lead dev: players skip tips mid-fight); queued if several trigger at once; a short guard so a combat tap does not dismiss it instantly. `state.flags.tipsSeen`, a
"Tips" toggle in settings, a "Reset tips" button. Tips text as data.

## R8.7 Out-of-class gear has a penalty
Until cross-class perks exist: equipping a weapon type not in the class's `weaponTypes` (and armour weight the class doesn't favour, if
the combat team agrees) applies an intrinsic debuff (lead default: −35% damage with that weapon, skills that need another weapon type
disabled). Tooltip shows it in red; equipping asks for confirmation once per item; verdict treats it honestly (usually ▼).

## R8.8 Clear grade timing
The speed-clear grade and its bonus show on arriving at the next floor (as a banner there), not when entering the stairs room.

## R8.9 Attack vs. loot on one button
Problem: the attack button sometimes attacks when the player wants to loot. Team pitches; lead default to build: a context-aware
action button — when a pile is within reach and no enemy is within melee range (or the player is moving toward the pile), it shows a
loot icon and loots; otherwise it attacks. Tap on a pile always loots. Optional setting: auto-pickup Rare and better.

## R8.10 Explain auto-learned skills
When auto-build learns a skill for the first time, highlight it (skill button pulse + a tip card with name and one-line effect) instead
of learning silently. Event: `skill:learned { skillId, rank, auto }`.

## R8.11 Hitting several enemies
Make multi-target hits obvious: basic melee attacks cleave in a short arc (main target full damage, others ~50%), ranged basic attacks
can pierce once at higher ranks/with gear; every enemy hit gets its own hit flash and number. Skills already marked aoe should read as
aoe (wider swing/impact fx).

## R8.12 Depth label
The HUD depth label uses the act name and floor name (e.g. "Hellscape · 28 · The Throat of the Deep"), not the old theme names.

## R8.13 Surface crate capacity (lead dev, 2026-10-15)
The surface crate holds at most **300 items** (lead dev: big enough to delve for a long while, small enough to force a trip to town now and then) (`C.SURFACE_SIZE`, items team owns the constant via `G.items.SURFACE_SIZE` if core lacks it).
`chuteSend` refuses items once the crate is full (toast "The crate up top is full"); "Send junk" sends only what fits, best-value first.
The chute panel shows "Crate 214 / 300". Players must decide what is worth sending and what to drop.

## R8.14 Picking up a pile one-handed
The pile popup's "Take all" must sit at the bottom of the sheet, inside the thumb zone (same side as the action button), and be large.
Also: pressing the action button while in LOOT mode next to a pile takes everything that fits (best first) without opening the popup;
a long-press on the pile or on the LOOT button opens the popup to pick items individually.

---

# Revision 9 — design pillars and approved team pitches (lead dev, 2026-10-15)

## R9.0 The pillars (decide every ambiguity in their favour)
1. **Push your luck:** constant, readable gambles — go deeper, carry more, wait longer, take the bargain — where greed pays and
   misjudgement costs.
2. **Speed and precision:** well-timed movement, dashes and precise taps decide outcomes; fast, accurate play clears more and earns more.
3. **High skill ceiling, high reward:** an average player progresses; a great player is visibly and materially rewarded.
4. **Unlike anything else:** keep being creative and push boundaries; prefer the strange, original idea over the familiar one. Every
   team keeps pitching, and builds small bold ideas without asking.

## R9.1 Approved pitches
- **Flow chain** (combat): chaining Close Calls (e.g. 3 within ~8 s) triggers a brief slow-motion moment and a guaranteed crit on the
  next hit; longer chains escalate. Needs a time-scale hook: combat may add `G.state.timeScale` (core main loop multiplies dt by it —
  the lead adds that line).
- **Floors shape their monsters** (world → combat): `map.variant` carries a monster bias (e.g. drowned dead on flooded floors, fire
  creatures on forge floors); combat honours it in spawnMapEntities.
- **Shrine bargains** (combat + UI; world places): some shrines offer a deal instead of a buff — a clear cost for a clear reward on
  this floor (e.g. −25% max life → double loot; no potions → +2 rarity steps; hunted by a legendary → guaranteed Elite chance).
  UI shows a two-button prompt with the exact terms.
- **The Scavenger** (combat + items): a rival looter who appears on some floors and races the player to the best drop on the ground;
  if he reaches it he takes it and flees (kill him to get it back, plus his own stash). Readable, fair, beatable by fast players.
