# Sallow — current design

This is the game as it is now (folded from CONTRACT.md Revisions 1–10; the full history is in
`docs/history/CONTRACT-r1-r10.md`). **If code and this file disagree, tell the lead; where a rule is flagged `(?)`, see
[Open questions](#open-questions).** Detail per team lives in `docs/handover/*.md`; the story in `docs/STORY.md`
(player-facing text is data in `src/ui/story_data.js`); art/sound formats in `ART_SPEC.md`.

Sallow is an isometric, loot-first dungeon crawler (Diablo-like) for iPhone, a zero-dependency PWA: vanilla JS, Canvas 2D,
no build step, no external assets. 60 fps on old phones. The game's internal ids, save key (`emberdeep.save`) and cache prefix
(`emberdeep-`) keep the old name on purpose; the town is **Emberdeep**, the game **Sallow** (read from one constant,
`G.ui.GAME_NAME`, `G.items.data.GAME_NAME`, `meta.STORY.NAMES`).

## Contents
1. Pillars and direction · 2. Ground rules for teams · 3. Core · 4. World · 5. Combat, classes, skills · 6. Monsters, bosses,
Fallen, Echo, Scavenger · 7. Events and floor flow · 8. Loot and economy · 9. Pallor · 10. Campaign, acts, town · 11. UI,
HUD, tips, saves · 12. Engine, art, sound · 13. Event index · 14. Changelog · 15. Open questions

---

## 1. Pillars and direction

**Pillars (R9.0 — decide every ambiguity in their favour):**
1. **Push your luck.** Constant, readable gambles — go deeper, carry more, wait longer, take the bargain. Greed pays, misjudgement costs.
2. **Speed and precision.** Well-timed movement, dashes and precise taps decide outcomes; fast, accurate play clears more and earns more.
3. **High skill ceiling, high reward.** An average player progresses; a great player is visibly and materially rewarded.
4. **Unlike anything else.** Prefer the strange, original idea. Every team keeps pitching (end each report with 1–3 pitches) and builds small bold ideas without asking.

**Older pillars that still hold:** loot is the game (constant drops, clear rarity colours/sounds, instant "is this an upgrade?",
deep chase items); one-thumb friendly (auto-target, auto-build, auto-pickup gold, junk handling); runs on a potato; dark,
gothic, old-school mood with terse flavour text. Direction: harder than Diablo but forgiving on the grind — death is the
punishment (corpse run + your Echo), not lost progress; easy to play, hard to master; no spreadsheets, few menus.

**Standing rulings:** any class may equip any weapon, with an off-class penalty (§8). Legendary Elite is rare and purely chance-based:
no pity timers or quotas anywhere (the one guaranteed Elite is the story reward). Depth 50+ outscaling gear is the intended endgame wall.
Sets are never junk and never bulk-sold. Item/NPC/place names are data, never logic.

## 2. Ground rules for teams

- **Classic scripts**, no ES modules. Each file: `(function(){ 'use strict'; const G = window.G; ... })();`, attaches to `G`.
- **File ownership.** Edit only your own directory: `src/engine` (G.engine), `src/world` (G.world), `src/items` (G.items), `src/game`
  (G.game), `src/ui` (G.ui, G.meta; also `manifest.webmanifest`, `sw.js`, `icons/`). `src/core/*`, `index.html`, `CONTRACT.md`/`DESIGN.md`
  and `tests/` harnesses outside your team are the lead's. Need a contract change? Work within the contract and list the request in your report.
- **Manifests.** `src/<team>/manifest.js` is only `G.manifest.<team> = ['a.js', …];` (paths relative, in load order). Load order:
  core → engine → world → items → game → ui → `core/main.js`. Add new top-level scripts to `SHELL` in `sw.js` if not in a manifest.
- **Never reference another team's namespace at file load time** — only inside functions run later. Guard optional calls (`G.items && G.items.x`).
- **No assets, no network.** Art is procedural to cached offscreen canvases (hand-drawn PNGs override, §12); audio is WebAudio synthesis (mp3 overrides).
- **State is plain JSON** on `G.state` (no functions, cycles, DOM/canvas refs; typed arrays only on the map, never saved). Behaviour lives in tables keyed by id.
- **Performance:** no per-frame allocation in hot loops, no per-frame DOM writes unless a value changed, cache sprites, cull to viewport, ≤ ~80 live monsters.
- **Testing.** No Node/Python. Use the preview launch config for your team in `.claude/launch.json` (`engine` 8381, `world` 8382, `items` 8383,
  `combat` 8384, `ui` 8385, plus `game`) and open `/tests/<team>.html` (a harness you own that loads `src/core/*` + your files + stubs; `?real=1` on
  combat loads the real world/items). `tests/ui-smoke.html` drives the real game headless; `tests/assets.html` regenerates ART_LIST/SOUND_LIST/`assets_templates/`.
  Never rely on other teams' code; verify no console errors before reporting done.
- **Style:** modern JS (Safari 15+), 2-space indent, semicolons. Match surrounding density and idiom.
- **Coordination:** sessions edit in parallel; **do not `git commit` unless your task says so** (the lead integrates); never stash/reset/switch branches.
- **Releases:** bump `VERSION` in `sw.js` (currently `emberdeep-v29`; the audit flagged forgetting it as the top release risk, so bump it with every `src/` change) on every deploy; it is the only release switch.
- **Model use (R7.9):** design-heavy work on the strongest model, well-specified implementation on a mid model, mechanical upkeep on the smallest; ≤ 2–3 sessions at once.

## 3. Core (`src/core/*`, lead-owned)

**Files:** `constants.js`, `events.js`, `rng.js`, `state.js`, `scenes.js`, `main.js`.

**`G.C`:** `TILE_W 32`, `TILE_H 16`; `TILE` = `VOID 0, FLOOR 1, WALL 2, DOOR 3, STAIRS_DOWN 4, STAIRS_UP 5, WATER 6, GRASS 7, PATH 8, LAVA 9, BRIDGE 10, RUBBLE 11,
DEEP_WATER 12, DEEP_LAVA 13, CHASM 14`; `WALKABLE[]`, `OPAQUE[]` (indexed by tile; only VOID and WALL are opaque). WATER and LAVA are shallow
(walkable, `SLOW_TILE_SPEED 0.6`; lava also `LAVA_DPS_PCT 4` % max HP/s fire). DEEP_*/CHASM are impassable, see-through. `THEMES = ['crypt','caves','inferno','abyss']`,
`themeForDepth(d)` (one theme per 5 depths, last repeats), `BOSS_EVERY 5`. `RARITY` (§8). `EQUIP_SLOTS` = weapon, offhand, helm, chest, gloves, boots, belt, amulet, ring1, ring2.
`INV_SIZE 60`, `STASH_SIZE 120`, `SKILL_SLOTS 4`. `STATS` (all computed stat keys): str dex int vit · hpMax mpMax hpRegen mpRegen · dmgMin dmgMax dmgPct attackSpeed castSpeed
critChance critDmg · fireDmg coldDmg lightningDmg poisonDmg skillDmgPct cdr allSkills · armor dodge block resFire resCold resLightning resPoison resAll thorns · moveSpeed lifeSteal
manaSteal lifeOnKill manaOnKill · magicFind goldFind xpGain pickupRadius. Vocabularies (unknown values must fall back, never throw): `BODY_TYPES`, `WEAPON_LOOKS`,
`ICON_SHAPES`, `PROP_TYPES` (incl. `gate corpse chute surface_crate`), `NPC_ROLES` (merchant blacksmith mystic healer elder stashkeeper), `PROJECTILE_SHAPES`, `FX_TYPES`.
Stat conventions: crit/dodge/block/res/dmgPct/skillDmgPct/cdr/steal/find/xpGain/critDmg are **whole percents**; weapon `base.attackSpeed` = attacks/s while stat `attackSpeed`/`castSpeed`/`moveSpeed`
are percent bonuses; resist cap 75.

**`G.on/off/emit`** — synchronous bus; a throwing listener never breaks the emitter. **`G.rng.create(seed)`** (mulberry32): `next range int chance pick weighted shuffle`; `G.rng.global`.
**`G.newId()`**, `G.bumpId(min)` (after loading a save). **`G.input = { move:{x,y}, attackHeld }`**.

**`G.state`:** `scene ('menu'|'town'|'dungeon')`, `paused`, `timeScale` (0.2–1; main loop multiplies dt — used by Flow), `time`, `seed`, `depth`, `map`, `player`, `entities`,
`projectiles`, `groundItems`, `stash`, `surface`, `quests`, `targetId`, `flags`, `settings`. Default `flags`: `maxDepth, waypoints, portalDepth, visits, kills, deaths, corpse, sealed`
(plus many more owned by teams, §11 lists the saved ones). Default `settings`: `sfx, autoPickupGold, lootFilter, showDamage, junk`; others are added by teams (§11).

**`G.scenes`:** `startNewGame(classId, name)`, `continueGame() → bool`, `enterTown()`, `enterDungeon(depth)`, `descend()`, `ascend()`, `townPortal()`, `usePortal()`,
`unlockWaypoint(depth)`, `quitToMenu()`, `getDeathPenalty()`, `respawn()`, `reclaimCorpse()`. Dungeon seed = `S.seed + depth*7919 + visits*104729`, except the corpse floor
reuses its original seed. Core handles `object:interact` types `stairs_down | stairs_up | portal | corpse`; `dungeon_entrance` / `waypoint` open the UI depth picker. A boss kill unlocks the waypoint at depth+1.

**Death (R2.4/R8.2):** `player:died { noRetrieve }` (true while a boss is awake or inside a sealed room). `getDeathPenalty() → { retrievable, gold /* on corpse */, goldLost, items }`.
Any dungeon death leaves a corpse (`flags.corpse = { depth, seed, x, y, gold, items, echo?, echoSlain? }`) holding the whole backpack; equipment, belt potions, materials are kept. Ordinary death: all carried
gold also goes on the corpse. Boss/sealed death: flat 10% gold lost, the bag still drops. Returning to that depth rebuilds the floor with a `corpse` prop and your **Echo** guards it (§6). A second death abandons the old corpse.

**Main loop (`main.js`):** per frame `dt = min(0.05, real dt) × timeScale`; if not menu and not paused: `state.time += dt`, `G.game.update(dt)`; then `G.engine.update/render`, `G.ui.update`.
Boot: `engine.init(canvas)`, `ui.init(#ui)`; autosave on `visibilitychange`; registers `sw.js` on http(s).

**Coordinates:** world units are tiles; tile `(tx,ty)` covers `[tx,tx+1)²`; entities have float `x,y` (centre = `tx+0.5`). Iso: `sx = (x−y)·16`, `sy = (x+y)·8`. Facing = `atan2(dy,dx)`.

**Shared shapes** (stable since R1; see the contract history for full field lists): GameMap `{ w,h,kind,depth,theme,seed,tiles,explored,visible,spawn,rooms,spawns,props }` plus the
fields §4 adds; sprite descriptor `{ body, color, accent, scale, weapon? }`; icon descriptor `{ shape, color, accent? }`; Entity `{ id,type,name,x,y,radius,facing,sprite,anim,animT,hitFlash,dead,level,hp,mp,stats,effects,faction }`
(+ monster fields `monsterId, rarity, affixes`; npc `role`); Player adds `classId, xp, xpNext, attrs, attrPoints, skillPoints, skills, skillBar, cooldowns, autoBuild, gold, inventory[60], equipment{}, potions{hp,mp}, materials{}, style, bonus`;
Item see §8; ground item `{ id, x, y, item, pileId }`. Reset `animT = 0` on every anim change.

## 4. World (`src/world`, `G.world`)

**API:** `generateTown(seed)`, `generateDungeon(depth, seed, { cleansed }?)` (deterministic), `tileAt`, `isWalkable` (tile + no solid prop), `canMoveTo(map,x,y,r)`, `moveWithCollision(map,ent,dx,dy)`,
`hasLineOfSight`, `findPath(map,sx,sy,tx,ty,maxNodes=2000)` (A*, smoothed, shallow water ×2 / lava ×6; blocked goal → nearest free neighbour; `null` if unreachable), `updateVisibility(map,px,py,r=9)`,
`findFreeTileNear(map,x,y,maxR=6)` (dry first), `propAt`, `invalidate(map)` (**call after adding/removing solid props**), `VARIANTS`, `pickVariant(depth,seed)`, `ACTS`, `actForDepth(d)`, `CORE_DEPTH = 30`.
Test hooks: `G.world._force = { variant, layout }` (leave null), `_lastAttempts`.

**Generation.** Rooms + corridors (crypt/inferno), cellular caves, floating abyss platforms (everything not platform is CHASM; only the 1-tile border is VOID). Whole floor is connected over **dry ground**
(floor/door/bridge); water/lava are shortcuts only. Boss floors (every 5th): start room → boss arena → 5×5 exit room reachable only through the arena. Dungeon maps ~48–80 tiles, town ~40. Corridors and
walkways are 1 tile: monster radius ≤ 0.45. Spawns: packs `count 2–7`, singles, `elite`, one `boss` at the arena centre; total 28 at depth 1 → cap ~68; nothing within 2 tiles of start or 10 steps of spawn.
One prop per tile, never on stairs/doors/bridges, never sharing a tile with a spawn.

**Props.** Solid interactables: `chest`, `shrine`, `barrel`/`crate` (`interact:'barrel'`), `chute` (`interact:'chute'`, exactly one per floor near the centre, never in start/exit/arena/lockdown/landmark rects),
`stash`, `dungeon_entrance`; town `surface_crate` (`interact:'surface_crate'`, at (23,20)). Non-solid: `waypoint`, `portal`, torches. `light` = radius in tiles. Optional extras: `secret` (hidden-cache crate),
`corrupt` 0..1, `tint`, `look` (`growth vein rift_shrine rift_crystal rift_core rift_shard capped`), `shrineKind` (`'corrupt'` | `'bargain'`), `bargain`, `gradeFloor`, `lockReward`, `event`, `brazier`. Breaking a barrel/crate:
splice from `map.props` or set `solid=false`.

**Lockdown rooms (R2.5):** from depth 2 on non-boss floors, 0/1/2 rooms (25/50/25%) `{ type:'lockdown', doors:[{x,y}] (1–3 DOOR tiles just outside the rect), waves }` with waves 2 (d2–7), 3 (8–15), 4 (16+),
a locked `chest` near the centre, no spawns inside. Game seals/unseals with `gate` props (§7).

**Floor identity (R5.10).** `map.floorName` (3 names per variant), `map.variant = { id, name, layout, palette{tint,amount,saturation,brightness,accent,liquid}, light{color,radius,ambient,torch,torchRadius,flicker},
ambient{particles,density,color,fog,darkness,sound}, blend, corruption, monsterBias }` (field names follow `docs/handover/engine-r5-shapes.md`; ignored fields are harmless). 3+ variants and 3 layouts per theme; deep-only variants
(`fallen_cathedral`, `cinder_drift`, `overgrown_dark` from 21; `unmaking` 31; `pale_end` 41; `the_wound` 24+; `rift_core` at 30). `map.landmarks = [{ id,name,x,y,w,h }]` (flooded_crypt, forge_island, collapsed_bridge, bone_garden,
chained_arena (guaranteed `elite`), crystal_grotto, pyre_court, hidden_cache ~40% of floors, **The Leap** `dash_gap` ~4% of floors from depth 4 with `gap:[{x,y},{x,y}]`: a corridor cut by a 2-tile CHASM gap a dash can cross).

**Rift and acts (R6.5/R7.7).** `map.act` = `town|shallows (1–10)|deep (11–20)|hellscape (21–30)|endless (31+)`; `map.corruption` 0..1 (0.03 at depth 1, linear to 1.0 at depth 30; halved on cleansed floors);
`map.rift = { tier 0–4, name, glow, vein, pulse }`; `map.fissures`; `map.taint` (Uint8Array, not saved); `map.core` on the world-boss floor (arena 17×17 ringed by six pits, 8 `rift_crystal`, one boss spawn, 5×5 exit with stairs and the
`rift_core` heart prop 2 tiles from them). Terrain corruption from ~depth 8 (rubble, pits, fissures). **Cleansed acts:** `generateDungeon(..., { cleansed })` (or `flags.cleansed`: act ids and/or boss ids `boss_broodmother`, `boss_hollow`,
`boss_world`) → monster budget ×0.5, one fewer elite, corruption ×0.5, 1–2 **camps** (`map.camps`; campfire + `kind:'npc'` `role:'refugee'` ×2 / `camp_merchant` 40%, `camp:true`). The **town** has a 5-tile CHASM rift fissure in the plaza ringed by
`rift_shard` crystals (`map.fissures[0].kind === 'rift'`); the old well stays (`look:'capped'`).

**Monster bias (R9.1):** every variant carries `monsterBias` (§6 for shapes). **Bargain shrines:** `prop.bargain:true` + `shrineKind:'bargain'` on ~1/3 of floors from depth 3 (never the core floor): one per floor, in the room furthest from both stairs.



**Map extras the game attaches (R18 note; not produced by `generateDungeon`):** `map.mods` (floor modifier ids, rolled in `monsters.js` from `map.seed`; `m._reward` caches the summed `{magicFind, goldFind, xpGain}`), `map.revealed` (`true` or a `Uint8Array` the length of `tiles`; set by the Wren relic, drawn on the minimap only — never on `explored`), `map.pallorUp` (`{from,to,value}` set by `deep.js` when the Pallor tier rises, cleared when the toast is shown), `map.inputs` (the generator inputs the world recorded — `cleansed`, version — stored with a corpse so the floor rebuilds identically; read by `scenes.js`). `map.events` is **not** set by anyone; the engine's event markers on the map therefore never appear until the game exposes beacon/vault positions.

## 5. Combat, classes, skills (`src/game`, `G.game`)

**Files:** `base stats combat player skills monsters data_skills data_monsters mods deep lockdown campaign bosses fallen events echo pillars` (manifest order).

**Classes:** Warrior, Ranger, Sorcerer, Necromancer. `G.game.CLASSES[id] = { id, name, desc, sprite, icon, baseAttrs, primaryStat, weaponTypes, trees:[{id,name,desc,skills}], action }`, 3 trees each; 76 skills in `G.game.SKILLS[id]`
(`{ id,name,classId,tree,icon,desc,maxRank 5,reqLevel,requires?,kind 'active'|'passive',tags,row,col,synergies:[{from,desc,key?,pct?,combo?}] }`). Level cap 60 (`LEVEL_CAP`); XP ×1.8 (`XP_MULT`).
Auto-build modes `null|'single'|'aoe'|'balanced'` pick points by `tags` and take the strongest synergies and one dash augment per class.

**Player API:** `createPlayer`, `revivePlayer`, `spawnMapEntities(map)`, `update(dt)`, `recomputeStats(ent)` (base + attrs + `G.items.getEquipmentMods` + passives + effects → `ent.stats`, emits `player:stats`; mythic effects land in `player.bonus.fx`),
`gainXp`, `spendAttr`, `canLearn → { ok, reason }`, `learnSkill`, `setSkillSlot`, `respec` / `getRespecCost`, `setAutoBuild`, `getSkillInfo(id) → { ...SKILLS[id], rank, nextRankDesc, mpCost, cooldown, cdRemaining, learnable, lockedReason, disabled?, synergies:[{from,name,desc,active,combo}] }`,
`useSkill(slot)`, `usePotion(kind)`, `getPotionCooldown(kind)`, `getXpForLevel`, `getMonsterInfo(id)`, `healPlayer(full)`, `getStyle()`, `getActionMode()`.
Controller: joystick (`G.input.move`) overrides tap-to-move; `input:tap` on/near a monster = attack-move; ground item/pile = walk + pick up; NPC = walk + `npc:interact`; interactable prop or stairs = walk + `object:interact`; elsewhere = pathfind.
Unresolved props are forwarded as `object:interact { type: prop.interact, prop }` (chute, surface_crate, corpse, rift_core, waypoint, …). Auto-target the nearest enemy (`state.targetId`, refreshed every 0.15 s). Auto-pickup gold within `pickupRadius`.
Base speed `BASE_SPEED 5.0`; on-screen speed is equal in all directions (`screenSpeedScale`).

**Damage model:** weapon-based for warrior/ranger skills; casters = weapon dmg × attacks/s × 0.75. Statuses: burn, chill/freeze, shock, poison, stun, slow, bleach (Pallid). Basic melee **cleaves** (1.7 tiles, ±0.85 rad, others take 60%); Eagle Eye 3+ gives `bonus.pierce`.
Melee/self AoE skills flash a 2.4-tile ring. Lava/water slow per core. `SPEED_SCALE 1.2`; `monsterLevel(depth) = depth` (R14).
**Difficulty curves (R18, fitted with `tests/balance.html`, see `docs/BALANCE.md`):** monster life `hpScale(L) = (1 + 0.25(L−1)) × 1.06^(L−1) × ramp × HPM(L) × DEEP_HP(L)` where
`DEEP_HP` (×1.8, easing to ×1.62 from depth 25 to 40) makes normal monsters take about 3 main-skill hits at depth 1–5, 4–5 from depth 30, for an on-level hero in
ordinary gear; damage `dmgScale(L) = 1.12 × curve(DMG_CURVE, L)` (log-linear anchors, extrapolated) so a hero who stands in a pack without dodging or drinking dies
in about 4 s (3 s past depth 45). Elite life `RARITY_MULT[r].hp × (1 + deep × ramp(depth 12→32))`: champion 2.2 (+70%), rare 4.4 (+40%), legendary 7.8 (+85%).
Bosses: `createBoss` life × `BOSS_HP 0.5` (× `WORLD_BOSS_HP 1.75` for the Hearthking), tier bosses +40% per tier; boss hits keep 70% of `DMM`. Targets: packs of 6 in
~3–6 s, champion packs and rares 10–20 s, legendary monsters 30–45 s, act bosses 45–90 s, the Hearthking 2–3 min; skilled play (Close Calls, Flow, Heat, dashing
instead of standing) 30–50% faster.
**Damage pipeline (R18; `playerHit`, stats in `recomputeStats`):** one hit =
`[(weapon roll + flat min/max) × skill% + flat elemental × min(skill%, 100%)] × (1 + damage% + skill damage%[skills] + elemental mastery[that damage type]) × off-class ×
combo (shatter ×1.5) × crit (1 + crit damage%) × (1 + temporary bucket) × penalties`, then the target's armour/resistance and its summed `taken` effects. Casters' weapon roll
is × attacks/s × 0.75 for skills. Each factor appears once; within a category bonuses add:
- **Permanent % bucket** (primary stat 1%/pt, gear, passives, uniques, relics, collection, milestones, Battle Shout, Hoarder…): `dmgPct` and `skillDmgPct` are summed and
  soft-capped together — full value to `100 + 3 × level`, half for the next 200, a quarter beyond (`game.SOFT`, `softCap`, `softKnees`). `player.stats` holds the
  effective values (the sheet shows them); `player.bonus.raw` the uncapped sums (items' upgrade verdict reads them and caps the same way).
- **Crit damage** soft-capped at 150 / 250; **attack and cast speed** at 50 / 100; **cooldown reduction** capped at 40% (`CDR_CAP`) and no cooldown below half its
  rank-1 value (`CD_FLOOR`); **"+N to all skills"** raises a learned skill at most 3 ranks (`ALL_SKILLS_CAP`).
- **Flat elemental** (fire/cold/lightning/poison from gear and gems) is added damage: it takes `min(skill%, 100%)`, so a 300% skill no longer triples it.
- **Temporary bucket** (`TEMP_CAP` +100%): every positive `dealt` effect (Heat, Close Call, Warlord, Tactician, Rotation, Glass Heart…), perk damage rules
  (`perkDmgParts`: rules above 1 add their excess, rules below 1 stay multiplicative), Blood Price +40, Varr's ramping fire, vs-chilled bonuses — summed, then capped.
- **Defence side:** `taken` effects on a target add up (shock + curses + exposed Ember are one factor); monster/minion/Echo `dealt` effects add up (`dealtMult`);
  armour mitigation caps at 65% (`ARMOR_CAP`, was 75%), a blocked hit lands for 35% (`BLOCK_TAKEN`, was 30%); life steal heals at most 2% of maximum life per second (`LEECH_CAP`); permanent life regeneration is
  soft-capped at 1% / 2% of maximum life per second (`REGEN_SOFT`; potions and shrines come on top).
- **Minions** hit for `MINION_DMG × game.minionPower(p)` (your weapon damage per second × 0.75 + flat damage, × your damage bucket) instead of following monster life.
  Mythic `corpse_blast` deals 90% of your hit (was 25% of the victim's life).
Balance targets (R18): see "Difficulty curves" above and `docs/BALANCE.md`; every class × auto-build style within about ±15% of the others in its style (single-target builds on single targets, group builds on packs).

**Off-class gear (R8.7):** `player.bonus.offClass` = `G.items.classPenalty(item, classId)` (`{ dmgPct −35 }`) else −35. Warrior swing skills and Ranger arrow skills (`SKILL_NEEDS_CLASS_WEAPON`) are `disabled` with an off-class weapon (`lockedReason`); spells keep working.
Any weapon may be wielded; armour weight carries no penalty yet.

**Dash / class action (R4.4/R6.3):** every class has `CLASSES[c].action = { id:'dash', kind:'charge'|'roll'|'blink', name, desc, icon, cd, d, inv, charges }`. Warrior Shoulder Charge (1 charge, 60% dmg + 0.4 s stun + shove), Ranger Dash (2), Sorcerer Blink (2, teleports, cannot pass walls),
Necromancer Grave Step (2). Invulnerable ~0.35 s. `getClassAction() → { id, kind, name, desc, icon, cooldown, cdRemaining, recharge, charges, maxCharges, ready }`; `useClassAction()` is what `input:classaction` calls (Shift / right mouse; the UI dash button).
Augments (passives → `player.bonus.dash*`): Ground Slam, Tumble Shot, Rime Step, Grave Swap, Acrobatics (`dodge_roll`, passive, never on the skill bar). A dash may pass over CHASM/DEEP tiles but never end on one nor pass walls (R10, The Leap).
Charges refill on revive and scene change.

**Close Call (R7.5):** standing in an enemy telegraph (r ≥ 1.2) in its last 0.6 s and being outside when it lands → effect `close_call` (+10% damage per stack (R18, was 15; `CC_PER`), max 3, 5 s), every cooldown −1 s, text + ring + sfx. Hooks: `game.closeCall`, `onCloseCall`.
**Flow chain (R9.1):** Close Calls within 8 s chain; 3 → `state.timeScale = 0.35` for 0.45 s game time + `flow_crit` (next hit guaranteed crit); 4 → also all dash charges; 5+ → also all cooldowns. `getFlow() → { chain, slow }`, `endFlow()`;
timeScale resets by timer, a real-time fallback, `player:died`, and every `scene:changed`.
**Ember Heat (pitch, built):** 35% of kills shed an ember (`game.embers`, 4 s); sweeping through one (0.8 tiles) = +1 Heat (max 10, effect `heat`): +4% damage and +5% magic find per stack; −1 every 6 s without a pickup; a single hit > 8% life knocks half out. `heatStacks()`.
**Shrine bargains (R9.1):** ~35% of dungeon shrines emit `shrine:offer { id, name, cost, reward }` instead of a buff; `acceptBargain(id)` / `declineBargain(id)` / `getBargainOffer()`; `BARGAINS`, `game.bargain` (active, cleared with the floor).
Deals: Blood Tithe (−25% max life → kills drop loot twice), Dry Vow (no health potions → +200% MF), The Hunt (a legendary hunts you → its best drop ≥ Legendary Elite), Glass Heart (double damage taken → +60% damage, +50% XP). `lootBonus(monster) → { rolls, magicFind, floor? }` feeds every kill's dropLoot.
**Mythic effects (R2.2):** all 12 (`split_shot corpse_blast chain_spark second_wind echo_cast blood_price midas frozen_wake legion thunderstep executioner hoarder`) read from `G.items.getActiveEffects(player)`; see `docs/handover/combat-handover.md` for the tuned numbers.

## 6. Monsters, bosses, Fallen, Echo, Scavenger

**Rarity tiers:** `normal | champion | rare | legendary | boss`. Champion packs of 2–4 share one modifier; rares have 2–3 modifiers + 3 minions; legendaries have 4–5 incl. one from `LEGEND_AFFIXES`, a generated title, orange name,
are announced once (`ui:toast` + sfx `shrine`), ×6 life, drop like a small boss. Elites are champions at depths 1–3, rares from 4; legendary about one per 2–3 floors from depth 3, guaranteed in the last lockdown wave from depth 8. `G.game.AFFIXES[name] = { color, tell, legendary?, deep?, min? }` (≥ 20).
Deep-only pools (never above their depth): monster modifiers Gravewalker, Siphoning, Devouring (21+), Arcing, Hexing (31+), Duplicating, Undying Pact, Time Warp (41+) (`DEEP_AFFIX_IDS`, `deepAffixes`, `affixPool(depth)`); floor mods Restless Ground, Hexed Glyphs, Warded (21+), Restless Dead, Riven (31+), Blood Moon, Thin Veil (41+).
**Floor modifiers (R3.7):** from depth 4, 0–2 per floor (more deeper; ≥ 1 past 30, up to 3 past 40), `map.mods = [modId]`, rolled in `spawnMapEntities` from `map.seed`. `G.game.FLOOR_MODS[id] = { name, desc, reward:{ magicFind, goldFind, xpGain }, min, deep? }`; the game toasts them.
**Caster pressure:** shooters target whoever stands furthest back and mark a still target (red ring) at 5+ tiles; modifier **Siege**; bosses mark still targets every 3 s; `G.game.stillT`, `wisps`, enemy `zones` (`glyph`, `trap`).
**Entity extras:** `faction ('player'|'enemy'|'neutral')`, `summon`, `summonOf`, `ai`, `speed`, `xp`, `noLoot`, `bossAdd`, `lockdown`, `fly`, `lavaProof`, `cloaked`, `ghost`, `echo`, `fallen`, `adventurerId`, `camp`, `campRole`, `lines`. Dead monsters remain ~8 s as corpses (`dead:true`). Hook: `MONSTERS[id].special` → `G.game.SPECIAL[special](e, def, target, dist, dt, player)` (return true to skip default logic).
**Variant bias (R9.1):** `spawnMapEntities` reads `map.variant.monsterBias` (or `.monsters`): `{ ids:{id:mult}|[id], arch:{…}, dtype:{…}, body:{…} }` or a plain id array (×3 each); the world's own shape `{ tags, monsterIds, weight }` is also in use (? Q3).

**Act bosses** (`game.ACT_BOSSES`): 5 Morgrath the Gravelord (`boss_gravelord`), 10 Skarn "Mother" (`boss_broodmother`), 15 Azgalor the Ember Tyrant (`boss_tyrant`), 20 Xal'thuun the Hollow Star (`boss_hollow`), 25 the Choir (`boss_choir`),
30 Oswin Marrow the Hearthking (`boss_world`, phases at 60%/25%: swordsman → rooted Ember windows → "The Ember" with inward/outward floor pulses and the Factor counting dashes). From 35 the first four repeat with a tier. Boss mechanics per fight: combat handover R7r2 and `docs/STORY.md`.
Bosses take half damage from summons; Life Drain is 20% as strong on bosses; phase changes run every frame before any special mechanic. `rift_core` after the Hearthking: combat emits `object:interact` for the UI's finale (R10). Kill → `G.items.grantTome(1)`, `flags.worldBossKilled = true`.

**The Fallen (R7.6/R7.10):** ten corrupted ex-adventurers (`G.game.FALLEN[adventurerId] = { depth, name, classId, story }`, monster defs `adv_<id>`, entity `fallen:true`, rarity legendary, never leash): fallen_1 Hob Garrow d3, fallen_3 Sefa Lind d6, fallen_2 Brannoc d9,
fallen_5 Odile Marr d13, fallen_4 Wren d16, fallen_6 Brother Ashby d19, fallen_7 Corwin Dask d21, fallen_8 Varr d24, fallen_9 Crane d28, fallen_10 Ivo Marrow d35 (waits at 36 because 35 is a boss floor). One per depth, never on boss floors, in the room furthest from the stairs,
each visit until slain (`flags.fallenSlain` / `G.items.hasRelic(id)`); a fallen at depth ≤ 6 has half life. Kill → `G.items.grantRelic(adventurerId)`. Files: `fallen.js` (1,3,5,6,7,10), `campaign.js` (2,4,8,9).

**The Echo (R6.2 → R8.2):** `player.style = { attack, dash, potion, [skillId]: decaying counts, hpAt, open }`, `G.game.getStyle() → { shares, hpAt, opener, potions }`. On death the corpse stores `corpse.echo` (snapshot: class, name, sprite, equipment, ranks, bar, defences, style); every return to that depth until killed spawns the Echo
(`monsterId:'echo'`, `echo:true`, `ghost:true`, `guardCorpse:true`, rarity legendary, "Echo of <name>") lying at the corpse; it rises (`echo:rise { entity }`) within 7 tiles, never chases beyond 9 tiles from home. Life max(2.5× yours, 0.9× a legendary), damage 0.8× a legendary swing;
fights with your skill proportions, dashes if you do, up to 3 potions. Kill → `corpse.echoSlain = true`, a rare-or-better drop (source `legendary`, floor `rare`); the bag stays on the corpse. Legacy R6 `flags.echo` saves still spawn the old way; none are created now.
**The Scavenger (R9.1):** one floor in five from depth 4 (not boss floors). When a rare-or-better item lies on the ground he announces it (`scavenger:race { entity, ground }`) and runs for it at 80% base player speed; first to it wins; if he takes it he flees 14 s then escapes. Kill him → stolen items + a rare-floor stash.
`monsterId:'scavenger'`, `stash:[items]`, `noLeash`; `spawnScavenger(map)` for tests. **Camp NPCs** (`kind:'npc'`, `camp:true`, roles `refugee`/`camp_merchant`) are mapped to the story's camp characters (`meta.STORY.CAMP`).

## 7. Events and floor flow

**Lockdown (R2.5):** stepping inside the room (not on a door, > 1.3 tiles from every door) pushes `gate` props, `G.world.invalidate`, `state.flags.sealed = true`, emits `room:locked { room }`, spawns waves (next when the previous is dead; last wave includes a rare, a legendary from depth 8), removes gates, unlocks the chest (two `chest` rolls with `floor:'rare'` + one guaranteed rare-or-better), emits `room:cleared { room }`.
`G.game.getLockdown() → { room, wave, waves } | null`. Town portal is disabled while sealed; blink/leap/teleport cannot leave; fail-safe lifts it unrewarded if the player is outside 3 s. Death inside = `noRetrieve`.
**Explored % (R7.5/R8.4):** `getExplored() → { value, low, high, label, hint? }` (depths 1–3 exact; 4–10 "~60%"; 11–20 a range 20–38 pts wide placed by the floor seed; 21+ `{ value:null, label:'?' }`); `exploredExact()`.
**Clear grade (R7.5/R8.8):** measured when you take the stairs down, awarded on arrival below (`floor:graded { grade, score, explored, time, par, depth, chest }`, chest beside the arrival point). score = explored × min(1.3, par/time), par = 45 s + 1 s per 10 walkable tiles; S ≥ 0.85, A ≥ 0.65, B ≥ 0.45, C ≥ 0.25, else D (`CLEAR_GRADES`).
Reward: XP (12/8/5/3% of the level), dust/shards, a chest (`gradeFloor`). `getClearGrade() → { grade:null, explored, time, par, last }`.
**Timed events (R7.5):** 40% of non-boss floors from depth 2 (deterministic from `map.seed`), starting 5 s after arrival. `getEvent() → { id, name, timer, goal, progress } | null`, `startEvent(id)` (dev), `EVENTS[id] = { name, goal }`; events `event:start`, `event:update` (4×/s), `event:end { success, reward }`. Ids: `gauntlet` (reach a beacon 16–26 tiles away while monsters spawn every 3.5 s),
`keyhunt` (key in one of 5 crates in 60 s, vault seals on timeout), `collapse` (25 s of falling rocks), `thief` (the Magpie, a fleeing goblin that sheds gold). **Hidden caches** are plain world content (breaking the `secret` crate opens the closet). **The Leap** (§4/§5).
**Go deeper (R6.1):** with Pallor unlocked and `G.ui` loaded the stairs emit `stairs:confirm { depth, nextValue }` and wait for `G.game.confirmDescend()` (same floor, alive, within 2.5 tiles) or `cancelDescend()`; `previewPallor(v)`, `nextPallorValue(depth)`.

## 8. Loot and economy (`src/items`, `G.items`) — "the heart of the game"

**Files:** `bases affixes uniques looks generate info inventory economy pallor awaken corrupt relics collection` (see manifest; `rarity.js`, `bases.js`…).

**Rarity ladder (R7.1, in `G.C.RARITY`, order 0–7):** `common` (grey) < `uncommon` (green) < `rare` (blue) < `magic` (purple, slight glow) < `legendary` = **Legendary Elite** (yellow) < `mythic` = **Legendary Mythic** (orange) < `unique` = Unique/Corrupted (red) < `rift` (pink, pulsing).
Elite and Mythic share `tier:'legendary'` (filters show one "Legendary" entry; names show the full label). Set pieces are `legendary` with `item.setId` (green "Set" tag). Corruption is a "tainted" modifier that does not change rarity; ~0.003% of corrupted drops are promoted to `unique`. Never hard-code rarity names.
Indicative odds per item at 0 MF: Elite ≈ 0.125%, Mythic ≈ 0.002% (bosses ≤ ~0.03% per kill), Unique ≤ ~1.6e-5, Rift ≈ 2e-6 (item level ≥ 21). Rare and purely chance-based; no pity. Saves migrate by `item.rv` (`G.items.migrateState()` on every `scene:changed`).
**Item shape:** `{ id, baseId, name, type 'weapon|armor|jewelry|consumable|gem|material|lore', slot, weaponType?, twoHanded?, rarity, ilvl, reqLevel (= round(0.75·ilvl), cap 60), icon, base, mods:[{stat,value,implicit?}], value (gold sell price per unit; vendors charge 6×), qty?, setId?, uniqueId?, effects?, look?, armorClass?, sockets?, plus (0–5), foundAt, locked, kills, tally, awakened, bleached, hidden, latent, corrupted, cleansed, rv }`.
`G.items.data` = tables (`BASES UNIQUES SETS GEM_KINDS CONSUMABLES MATERIALS`…), `G.items.EFFECTS[id] = { name, desc }`, `G.items.LOOKS`, `RELICS`, `AWAKEN_AT [250,1000,5000]`.

**Core API:** `rollItem({ level, rarity?, slot?, baseId?, uniqueId?, qty?, loreIndex?, magicFind, rng? })`, `rollLoot({ source, level, magicFind, goldFind, floor?, pallor?, corruption?, rarityFloor? }) → { items, gold }`, `dropLoot(x,y,opts)` (sources: `monster champion rare legendary boss chest barrel quest echo`), `dropItemAt`, `pickup(groundId, quiet?)`, `addToInventory`,
`equip(invIndex, ringSlot?)`, `unequip(slot)`, `useItem`, `dropFromInventory`, `getEquipmentMods(player)` (all STATS keys; includes base armour/block, mods, gems, set bonuses, Matched, relics, collection buffs, awakened; **not** weapon base damage), `getWeapon(player)` (unarmed default `{1,3,1.2}`), `getTooltip(item) → { name, color, lines, headline:{label:'Power',value,delta}, detail, locked, bleached, wanted, corrupted, penalty }`,
`compare`, `power(item, classId?)`, `verdict(item) → 'up'|'down'|'same'|null` (uses Power; no auto-equip ever except starter gear), `isUpgrade`, `grantStarterGear`, `sortInventory(mode)` / `sortStash(mode)` (`rarity level slot value upgrades newest`; last choice `settings.sort`; `autoSort()` runs on every bag/stash entry unless `settings.autoSort === false`),
`stashDeposit/Withdraw`, vendors: `getVendorStock(role)`, `buy`, `buyPrice`, `refreshVendors(level)`, `potionPrice/buyPotion`; `gamble(slot)`, `gambleCost`; `upgrade`, `upgradeCost`; `getBuyback()`, `buyback(i)` (last 12, cleared on entering a dungeon; price 2.5×).
**Power (R7.2):** `0.35 × class-weighted stat score × (1 + 4%/upgrade) + 3 × ilvl × slot weight + sockets (4 empty / 14 filled) + 60 per effect + 20 set piece`; off-class weapons ×0.65. Tunables `D.POWER`.
**Potions/materials** never occupy bag cells: belt potions `player.potions` (cap 20), `player.materials = { dust, shard, essence, gemdust, riftshard, forge_<class> }`. Class materials (`mat_cls_<class>`, current class only) feed weapon/armour upgrades; **Tome of Insight** (`tome_skill`, `grantTome(n)`) = a skill point; `trophy` sells only; `lore` items (`rollItem({baseId:'lore', loreIndex})`) never take a bag slot (emit `lore:found { loreIndex }` then `item:picked`).
**Gems/sockets (R2.6/R3.2/R3.3/R7.3):** cut gems `gem_<kind>_<1–5>` (removable: `unsocketGem(target, i)`, `unsocketCost`), bloodstones `blood_<kind>_<1–3>` (`permanent`; `useItem` refuses; only `socketGem(gemIndex, target, { confirmPermanent:true })`; the UI must confirm). `combineGems` (3 → next tier, cut only), `gemUpgradeCost/upgradeGem`, `rerollCost/rerollAffix` (mystic, rare+; corrupted mods and unique authored mods fixed), `salvagePreview → { materials, gems, gemdust }` (gems in sold/salvaged gear are ground to gem dust).
Sockets: max by slot/ilvl (`D.SOCKET_MAX`), extra sockets rarer (30/8/2%), ~3.5% of socketed drops pre-filled; UI draws pips.
**Junk (R3.1/R8.1):** `state.settings.junk = { maxRarity:'none'|'common'|'uncommon'|'rare'…, action, auto, keepUpgrades, keepSocketed }`; `isJunk(item)` (equipment only; never sets, Legendary Elite/Mythic, gems, locked, collection-wanted, unrevealed bleached); `sendJunk() → { count }`, `previewSendJunk()`. `sellAtOrBelow(rarity)` / `previewSellAtOrBelow` (never sets, Legendary tier, gems, lore, locked; feeds buyback), `toggleLock/setLocked`.
**The chute and the surface crate (R8.1/R8.13):** one chute per dungeon floor; `chuteSend(index | [indices])` → count, `getSurface()`, `surfaceTake(i)` (anywhere), town-only `surfaceSell/surfaceSalvage/surfaceRegister/surfaceStash`; `state.surface[]`; capacity `G.items.SURFACE_SIZE = 300` (not in `G.C`), `surfaceSpace()`; refused when full ("The crate up top is full"). **Sell, salvage, mass-sell, junk processing and Curator registration work only in town** (red toast otherwise). Event `surface:changed { count }`. Auto junk = auto-queue for the next chute use.
**Looks and Matched (R5.9):** every weapon/armour/belt has `look = { family, palette, material }`; `G.items.LOOKS[id]` (≈ 45 families by weight × depth band, plus unique/set families); 2 or 4 of helm/chest/gloves/boots of one family add `matched[2]`/`matched[4]` (`getMatched(player)`); set and unique families never match. Hand-drawn overlay format: §12.
**Awakening (R5.3):** worn items count `kills` and a victim `tally`; at 250/1000/5000 an item awakens a themed affix (`item.awakened`, toast + sfx). `recordKill(monster)`.
**Corruption (R6.5/R7.1):** from item level 8, +1.2%/level to 35% of rare/magic-tier equipment drops (`D.CORRUPT`; `opts.corruption` overrides) carry an upside, a drawback and a hidden latent affix. `cleanseCost(target) → { gemdust, riftshard, gold }`, `cleanse(target)` (blacksmith; emits `item:cleansed { item }`). `rift`-tier items: 6 hand-authored pieces.
**Relics of the Fallen (R7.10):** `RELICS` fallen_1..10 (depths 3,6,9,13,16,19,21,24,28,35), `grantRelic(id)`, `hasRelic`, `getRelics`, `relicCount`, `canCombineRelics()`, `combineRelics()` (at the Elder; `flags.relicsCombined`; title "Heir of the Fallen"), `getRelicMods()` (inside `getEquipmentMods`), `getRelicEffects() → { dash_shield_bash, dash_reload, ramping_fire, extra_minion, ember_heir }` (combat implements; see Q8). Events `relic:granted`, `relic:combined`. A relic is permanent and never a bag item.
**Collection and the Curator (R7.11, `G.items.collection`):** `getPages()` (47: one per look family and set), `getProgress()` (tiers 5/15/all: mats, buff, stash rows, title), `register(bagIndex[, 'stash'])`, `registerAll()`, `isWanted(item)` (book mark; protected from junk while `D.COLLECTION.protect`), `entryOf`, `setAuto/isAuto` (auto-register on reaching town). Events `collection:registered`, `collection:page`, `collection:tier`. The UI applies `getProgress().stash` extra stash rows.
**Drop feel:** most kills drop something; loot from one kill or chest lands on one **pile** (`pileId`; piles within 0.75 tiles merge; gold one entry per pile); `getPile(id)`, `pickupPile(id, { minRarity? }) → { taken, left, full, items }` (quiet). `dropLoot` plays one sfx by best rarity and a lootbeam for rare+.

## 9. Pallor (the signature push-your-luck, R5.2)

Unlocks when `state.flags.pallorUnlocked` is set (UI, after the finale, §10). `flags.pallor` 0–100, owned by game: +10 per floor entered **by stairs down** without visiting town (+15 past depth 30, +20 past 40), cap 100; waypoint/portal/corpse-run entries add nothing; any `scene:changed` to town (including death) resets it.
`G.game.getPallor() → { value, tier 0..4, effects:[text] }` (0 until unlocked); tiers at 10/30/60/90: monsters +10/20/35/50% life, +5/10/16/24% damage; II+ rares/legendaries +1 modifier (IV +2); III+ 12%/25% of normals are **Pallid** (`bleach`: no regen, half healing); IV a legendary on every non-boss floor.
Loot: `dropLoot` opts carry `pallor`; per tier rare/magic odds ×(1+0.2t), extra-item chances, gold +10%·t; from tier 2 some equipment drops are **bleached** (`hidden` affix shown as "???") that reveal when brought to town alive; a death fades worn secrets and (noRetrieve) the bag's; the corpse keeps them. `revealBleached()`.
Engine desaturates by tier (loot colours stay saturated); UI shows a Pallor meter and the "Go deeper?" prompt. Suggested (not built): the combined relics make Pallor build 25% slower.

## 10. Campaign, acts, town revival

**Premise** (full outline `docs/STORY.md`, text in `src/ui/story_data.js` = `G.meta.STORY`: `NAMES, OPENING, ACTS, STEPS, FINALE, BOSS_LINES, ECHO, ADVENTURERS, SIDE, TOWN, LORE, CAMP, CURATOR…`): the player's village is burned; a man in grey sends them to Emberdeep, whose heat source (a rift) is rotting from the bottom up; the founder Oswin Marrow
bound the giant's heart (the Ember) into himself; ten earlier candidates (the Fallen) failed; the player ends up carrying the Ember; Pallor is it feeding on them. Approved as-is by the lead dev (R10): the story, the Hearthking and the man-in-grey twist.
**Acts:** I The Shallows 1–10, II The Deep 11–20, III Hellscape 21–30, IV The Roots / endless 31+. **Main chain: 12 steps** (`main_1..12`; ids 1–8 kept for old saves; boss steps match `monsterId`; `orDepth` lets any boss at ≥ depth count; steps 10 = depth 25, 12 = `boss_world`). Reward rarities are preference lists (`meta._rarityPick`).
Endgame unlock after the finale (post step 12): `flags.pallorUnlocked`, title **Bearer of the Ember**, deeper floors; old heroes keep their unlock. The opening plays once on first arrival (`storySeen 'premise'`); boss banners per `monsterId`; Fallen/Echo banners; lore pages `G.meta.LORE` (`state.flags.loreFound`).
**Town revival (R7.7):** `flags.act` (1–4), `flags.cleansed`, `flags.warmth` (0–3) are derived from main-chain progress on every town arrival; `town:warmed { act, warmth }` on change; TOWN stages swap NPC greetings and gate services (`ui._serviceOpen(role, tab)`: mystic Reroll opens in act 2); the engine draws the warmth (lit windows, smoke, lanterns). Camps on cleansed floors are Lamp Camp (3–9) and Fever Camp (12–19).
**NPCs:** roles `merchant blacksmith mystic healer elder stashkeeper` + `curator` (UI-defined, not in `C.NPC_ROLES`), `refugee`, `camp_merchant`. **Side lines** (`state.quests.side[lineId] = { step, status, progress }`, offered by the Elder/Isra/Jory once `flags.act >= line.act`): six lines in `STORY.SIDE`.
**Quests (`G.meta`):** `initQuests`, `getQuests() → [{ id,name,desc,giver,status,progress,goal,rewards }]`, `acceptQuest`, `turnInQuest`; bounty kinds kill/depth/rares/chests/`lockdown`/`collect`/`collectPage`/`cleanse`; events `quest:updated`, `quest:completed`. "Marked for Death" counts champion/rare/legendary/boss.

## 11. UI, HUD, tips, saves (`src/ui`, `G.ui` / `G.meta`)

**Files:** `core style hud hudedit inventory menus meta skills npc quests story story_data tips title chute curator deeper pile risk savecode pwa` (see manifest). **API:** `G.ui.init(root)`, `update(dt)`, `open(panel, arg?)`, `close()`, `isOpen()`, `toast(text, color?)`; internal `ui._*` helpers are not contract. `G.meta`: `save() load() hasSave() deleteSave()`, `initQuests`, `getQuests`, `acceptQuest`, `turnInQuest`,
`exportCode()/parseCode()/applyImport()` (save-code backup), `listBackups()/restoreBackup()`, `LORE`, `STORY`. Full-screen panels set `state.paused`. Layout: portrait and landscape at 375 px wide, safe-area insets, ≥ 44 px targets, pixel-art look, icons via `G.engine.getIconURL`.
**HUD:** orbs, XP bar, level, 4 skill buttons (cooldown sweep), a **context-aware action button** (attack/LOOT via `getActionMode()`; Take-all at the bottom of the pile sheet within thumb reach; long-press opens the popup), potions, town-portal button (disabled while sealed), minimap, quest tracker, pickup feed (a ▲ verdict line is tappable), toasts, boss/target/Echo bars with tier + modifier names, depth label "Act · depth · floor name" (e.g. "Hellscape · 28 · The Throat of the Deep"), floor mods, explored %, Pallor meter, event timer, clear-grade banner, dash button with charge pips, Heat stacks (R10), Flow/Close Call pills (`risk.js`).
**Panels:** title/class select, inventory + paper doll (`G.engine.getPlayerPreview`) + stats, item tooltips (Power headline, ▲/▼, Details toggle, lock, Matched/awakening lines, off-class warning), skills (three auto-build buttons front and centre, synergies, respec), vendors per role (Sell tab with buyback strip, "Sell all ≤ <rarity>", Junk rules, sort picker), blacksmith (Forge, gem Improve, Cleanse), mystic (gamble, Reroll), healer, elder (quests, relic combining), stash, **chute panel** ("Send", "Send junk", "Crate n / 300"), **surface crate panel** (town actions), Curator book, depth picker (waypoints, corpse marker), journal (lore), quest log, death screen (from `getDeathPenalty()`), "Go deeper?" prompt (`deeper.js`, "don't ask again this run" = `flags.deeperNoAsk`), shrine-bargain two-button prompt, rift-core finale (R10), settings, pause menu, HUD editor.
**First-time tips (R8.6):** the first time something new appears (rarity tiers, sockets, gems/bloodstones, corrupted items, materials, tomes, chute, surface crate, Curator, relics, Fallen, events, Pallor, Echo, shrines, lockdowns, dash, Close Call…) a pausing card (queued, with a short tap guard); `flags.tipsSeen`, a Tips toggle, "Reset tips". Text is data (`tips.js`).
**Settings** (`G.state.settings`): `sfx, autoPickupGold, lootFilter, showDamage, junk{}, sort, autoSort, ambience, graphics ('auto'|'high'|'low'), sfxVolume, musicVolume, ambienceVolume, music, hud{ size, opacity, layouts{portrait,landscape}, joystick{ mode, x, y, size } }`; R10 adds `lowFx` and `showFps` (not yet in code at the time of writing). `settings:changed { key }` is emitted by the UI.
**HUD layout (R5.1):** joystick `'floating'` or `'fixed'`; "Edit HUD" drags every piece (ids `atk skills vitals dash portal mm tracker joy`), sizes S/M/L, opacity, 16 px snap, per orientation, Reset; the engine reads `settings.hud.joystick` (size = diameter / short side).
**Saves:** localStorage key `emberdeep.save` (versioned); previous copy `emberdeep.save.prev` before the first write of a page load; an unreadable save is copied to `.unreadable`, never overwritten. `load()` forces `flags.sealed=false`, validates `flags.corpse`, resets transient player fields, pads inventory/stash, restores `state.surface`, `flags.echo`, `flags.corpse`, `flags.collection`, relics, `tipsSeen`, `loreFound`, `storySeen`, `titles/title`.
Persisted flags in use: `maxDepth waypoints portalDepth visits kills deaths corpse sealed pallor pallorUnlocked deeperNoAsk act cleansed warmth titles title storySeen loreFound tipsSeen fallenSlain relics relicsCombined collection worldBossKilled echo reviewedAt` (+ team-private ones).
**PWA:** `manifest.webmanifest` (name "Sallow"), `sw.js` cache-first offline (network-first on localhost/*.test), precaches shell + manifests + `assets/assets.js` listings; "Update now" activates a waiting update; offline status in the menu.

## 12. Engine, art, sound (`src/engine`, `G.engine`)

**Files:** `core render tiles sprites gear props icons fx input audio assets manifest variant rift` (see manifest for order). **API:** `init(canvas)`, `update(dt)`, `render()` (no-op without map/player), `worldToScreen`/`screenToWorld` (CSS px), `getIcon(desc,size)`, `getIconURL(desc,size)`, `getPortrait(desc,size)` (use `id: classId|monsterId|'npc_<role>'`), `drawMinimap(ctx,w,h)`,
`sfx(name)` (also via the `sfx` event), `getPlayerPreview(player,size=96)`, `gearKey`, `rarityGlow(key)`, `getPallorLevel()`.
**Rendering:** canvas backing store = `V.R` × logical px (`settings.graphics`: auto R = 2 / 1.5, auto-drops to 1 after 4 s above ~24 ms); 64×32 tiles, 96×96 character cells with 8 directions (5 drawn + 3 mirrored), smooth coloured lights and soft contact shadows; fog from `map.explored/visible`; walls fade when occluding.
Entities: rim/aura/plate by rarity (R18: plates are placed in priority order — bosses/Fallen, target, nearest — and slide up to clear each other and the player; modifier lines only for bosses, the Fallen, the target and the two nearest elites; the rest shorten their name and fade); Echo drawn ghostly from its own `equipment`; Fallen violet; world boss ember rim; ground loot glow by `C.RARITY[k].glow` with beams for rare+, legendary tier double beam + screen-edge glint; piles drawn as heaps ("Best Name +N"); Pallor desaturation; dash pips; embers (Heat); town warmth; Hellscape wrongness (eyes, hue drift); `map.variant` drives palette, light, fog, particles, sound bed.
**Input:** touch starting in the stick zone is a joystick (Touch Events on touch devices), taps → `input:tap`; WASD/arrows, Space (`input:attack`), keys 1–4 (`input:skill`), Q/E (`input:potion`), I K J M Esc (`input:ui`), Shift/right-click (`input:classaction`); keys ignored while an input is focused.
**Pipeline (R2.9/R6.4/R7.8):** hand-drawn PNGs in `assets/` listed in `assets/assets.js` override procedural art; missing/wrong-size files silently fall back. `ART_SPEC.md` (high-res format) and `ART_LIST.md`/`SOUND_LIST.md` (generated by `tests/assets.html` from the code) list every file; `assets_templates/` holds every procedural sprite in final format for painting over.
Character sheets: one file per animation (`sprites/<id>/<anim>.png`, 5 or 8 rows); player base bodies `sprites/<class>_base.png` plus **gear overlays** `gear/<family>_<slot>.png` (640×80 grid, draw order and rules in `docs/handover/engine-handover.md` "Gear overlays"). Sound: `sound/<sfx>[_n].mp3`, `sound/amb_<bed>.mp3`, `sound/music_<track>.mp3`; buses read the volume settings;
beds `wind drone drip water fire heart choir hearth flesh none`. **SFX names:** hit swing cast fire ice bolt arrow hurt die loot loot_rare loot_legendary gold levelup equip potion click error door stairs quest buy sell chest shrine (+ more in `SOUND_LIST.md`; identical names throttle to 50 ms).
**Art direction:** dark Diablo II mood, painterly, desaturated bases with saturated loot colours; rarity colours are the brightest things on screen. The ART_SPEC hex values for rarities are out of date (the game reads colours from `C.RARITY`).

## 13. Event index

Payload shapes; "—" = `{}`. Emitter in brackets.

| Event | Payload |
|---|---|
| `scene:changed` [core] | `{ scene, depth, map }` (map may be null on menu) |
| `input:tap` [engine] | `{ x, y }` world |
| `input:skill` | `{ slot }` · `input:potion { kind }` · `input:attack` · `input:classaction` · `input:ui { panel }` |
| `player:damaged` | `{ amount, source }` · `player:died { noRetrieve }` · `player:levelup { level }` · `player:stats` · `player:xp { xp, xpNext, gained }` |
| `monster:killed` | `{ monster, x, y }` |
| `object:interact` | `{ type, prop? }` — types `stairs_down stairs_up portal dungeon_entrance waypoint stash shrine chest chute surface_crate corpse rift_core` + any prop `interact` |
| `npc:interact` | `{ role, entity }` |
| `loot:dropped { ground }` · `item:picked { item, salvaged?, materials? }` · `inventory:changed` · `equipment:changed` · `gold:changed { gold, delta }` · `surface:changed { count }` · `pile:open { pileId }` · `lore:found { loreIndex }` | items/ui |
| `skills:changed` · `skill:learned { skillId, rank, auto }` | game |
| `quest:updated { quest }` · `quest:completed { quest }` | meta |
| `room:locked { room }` · `room:cleared { room }` (UI also tolerates optional `room:wave`) | game |
| `floor:graded { grade, score, explored, time, par, depth, chest }` · `event:start` · `event:update` · `event:end { success, reward }` | game |
| `stairs:confirm { depth, nextValue }` | game → UI |
| `shrine:offer { id, name, cost, reward }` · `shrine:accepted { id, name }` | game |
| `flow:chain { count }` · `flow:trigger { chain }` · `flow:start { chain }` (see Q5) | game |
| `scavenger:appear { entity }` · `scavenger:race { entity, ground }` · `scavenger:grab { item, entity }` | game |
| `echo:rise { entity }` · `boss:blackout { boss, t }` | game |
| `relic:granted` · `relic:combined` · `collection:registered` · `collection:page` · `collection:tier` · `item:cleansed { item }` | items |
| `town:warmed { act, warmth }` · `settings:changed { key }` | ui |
| `fx:spawn { type, x, y, color?, radius?, angle?, duration? }` · `fx:text { x, y, text, color?, crit? }` · `fx:shake { amount (logical px), duration }` · `sfx { name }` · `ui:toast { text, color? }` | anyone |

## 14. Changelog

Newest last. **Append new revisions here** (one short block each: what changed, which sections of this file to update). Detailed pre-R11 history: `docs/history/CONTRACT-r1-r10.md`.

- **R1** five-team contract (engine, world, items, game, ui). **R2** shallow/deep tiles, Legendary Elite/Mythic, lockdown rooms, gems, buyback, art override loader. **R3** junk rules, upgrade arrows, monster tiers, floor mods, synergies. **R4** story, Elite rate halved, class dash, "Sallow".
- **R5** Pallor, awakening, piles, sorting, visible gear/looks, floor variants, HUD layout editor. **R6** difficulty pass, Echo, dash for all classes, high-res art/sound pipeline, the corrupted-rift campaign. **R7** rarity ladder + Power, sockets, drops, speed rewards/events, Fallen + relics, collection/Curator, acts and town revival.
- **R8** chute and surface crate, death drops the bag and the Echo guards it, tips, off-class penalty, context-aware action button. **R9** pillars; Flow chain, bargains, Scavenger, monster bias. **R10** polish and verify; leap crossing; Heat/low-FX/FPS; this document.
- **R11 (queued, not started):** per-class perk trees, beginning with cross-class perks that let a class use off-class gear without the R8.7 penalty. Design round (combat + story) first. Will add a perks subsection to §5 and revise §8 "off-class gear".
- **R18** balance pass (`docs/BALANCE.md`, harness `tests/balance.html`): stacking limits in the damage pipeline (one soft-capped permanent % bucket incl. skill
  damage and elemental mastery, flat elemental at ≤ 100% of the skill, one temporary bucket capped at +100%, soft caps on crit damage / attack / cast speed,
  "+all skills" ≤ +3 ranks, cdr ≤ 40%, cooldown floor, additive `taken`/`dealt`, leech ≤ 2% life/s, regen soft cap, armour cap 65%), minions on spell power,
  `corpse_blast` on your hit, monster life/damage refitted to the measured on-level hero (`DEEP_HP`, `DMG_CURVE`), elites tougher with depth, bosses `BOSS_HP`,
  Close Call +10%/stack, Warrior innate DR 10%, skill-number parity pass. §5 "Difficulty curves" and "Damage pipeline" describe the result.

## 15. Open questions

Contradictions or gaps found while folding the revisions. Nothing below was guessed in the sections above unless noted.

1. **Town name.** R4.6 kept "Emberfall"; R7.7 renamed it **Emberdeep**, which is also the old game name and the save-key prefix. `src/game/mods.js`, `src/items/looks.js`, `src/items/uniques.js` and `src/world/town.js` still say "Emberfall"; R10's UI sweep covers only the UI. Needs a one-pass sweep and a decision on whether the old internal ids stay.
2. **Rarity ids in old code.** `src/ui/quests.js:13` still lists `'epic'` (no longer a key; harmless because `magic` follows it). ART_SPEC.md still shows the pre-R7.1 rarity hex table.
3. **RESOLVED (R18).** **Monster-bias shape differs between teams.** World emits `monsterBias = { tags, monsterIds, weight }`; combat documents `{ ids, arch, dtype, body }` or an id array (and `variant.monsters`). `monsters.js` accepts several shapes but only the combat ones are specified. Pick one canonical shape.
4. **Bargain shrines are decided twice.** World places a `prop.bargain:true` / `shrineKind:'bargain'` shrine on ~1/3 of floors from depth 3; combat independently turns ~35% of all dungeon shrines into offers and honours `prop.bargain = id` as a force. Unclear whether a world bargain shrine always offers (and whether `bargain:true` is understood) or the two rolls stack; `shrineKind:'corrupt'` (rift shrines) is "the game's decision" with no owner.
5. **Flow events.** Handover documents `flow:start { chain }`; `pillars.js` also emits `flow:chain { count }` and `flow:trigger { chain }`, which the UI listens to. All three are listed in §13; decide which are canonical and whether `flow:start` is redundant.
6. **Title.** The "Warden of the Well" (R5) title is replaced by "Bearer of the Ember" (R7, `OLD_TITLES` are swapped in); the combined-relic title is "Heir of the Fallen". `flags.title` is a single string selectable in the Curator panel; confirm that is the intended model.
7. **RESOLVED (R18).** **Surface cap constant.** R8.13 said `C.SURFACE_SIZE`; the code defines `G.items.SURFACE_SIZE = 300` only (the contract permitted this). No `C.SURFACE_SIZE` exists.
8. **RESOLVED (R18).** **Relic effects.** The items team lists `ember_heir` (the combined-relic effect) in `getRelicEffects()`; the combat notes implement only `dash_shield_bash`, `dash_reload`, `ramping_fire`, `extra_minion`. Unverified whether `ember_heir` does anything in combat, and the story's "Pallor 25% slower" is only a suggestion.
9. **RESOLVED (R18).** **`G.C.NPC_ROLES` is incomplete.** `curator`, `refugee`, `camp_merchant` (and a `waypoint` camp role) are used by game/UI/world but not in the core constant.
10. **Pallor tier thresholds are duplicated.** Combat and items use 10/30/60/90; the engine's fallback uses `value/20`. Only matters when `G.game.getPallor` is absent.
11. **Elite/Set odds in R1 text vs R4.2.** R1 listed epic/legendary/set percentages for a different ladder; the current numbers are those in §8 (R4.2, R7.1). The old R2.2 "~0.25%" Elite rate is superseded (0.125%).
12. **`getExplored` return type.** R7.5 specified a number, R8.4 an object; the object is current, but `getClearGrade().explored` and some UI code may still treat explored as 0–100 numbers. Verify.
13. **Corpse and Echo overlap.** R2.4 said a retrievable death keeps gold+bag on the corpse and R6.2 made abandoned corpses rise as an Echo; R8.2 replaced both (Echo guards the corpse on return). The R6 `flags.echo` path is kept only for old saves. Confirm legacy support can be dropped.
14. **Junk rules.** R3.1 said junk is sold on arrival (`auto` + `sell`) or salvaged on pickup; R8.1 changed `auto` to "queue for the chute". The settings schema (`action`, `auto`) is unchanged and some ui/items notes still describe the old behaviour; the items handover R8 says auto-sell on arrival "is unchanged". Which is current?
15. **RESOLVED (R18).** **R10 items partly in code (at time of writing).** Heat pips on the HUD (`hud.js`) and the rift-core finale screen (`story.js`) exist; `settings.lowFx` and `settings.showFps` had no references in `src/` yet (other sessions were still editing). Re-check §11/§12 once R10 lands.
16. **Fallen placement vs. R7.10.** "Roughly three per act plus one endgame" — actual depths 3/6/9, 13/16/19, 21/24/28, 35. Act II has no fallen between 10 and 12, and fallen_10 waits at depth 36 (35 is a boss floor). Fine as built; flagging because the rule says "never two close together" and depths 19–21 are close.
17. **Spec gaps.** Armour-weight penalty for off-class armour ("if the combat team agrees", R8.7) was never decided; R11 perks are expected to replace this whole system.



**Resolutions (R18):** 3 — the canonical shape is World's `map.variant.monsterBias = { tags, monsterIds, weight }`; `monsters.js` reads that first. 7 — `G.items.SURFACE_SIZE` (getter over `surfaceSize()`, crate bonus included) is the constant; there is no `C.SURFACE_SIZE`. 8 — `ember_heir` is implemented in `campaign.js` (a shade of the ten fights beside you). 9 — `C.NPC_ROLES` now lists `curator`, `refugee`, `camp_merchant`. 15 — `settings.lowFx` / `showFps` exist and the engine reads both.

### R12 — lead dev feedback (2026-10-15)
Core (done by the lead): climbing stairs up arrives beside the previous floor's STAIRS_DOWN (town: beside the dungeon entrance) —
`G.scenes.enterDungeon(depth, arrive)` / `enterTown(arrive)` with `arrive === 'below'`; `'bloodstone'` added to `C.ICON_SHAPES`.
1. **Quest markers over NPCs.** `G.meta.npcQuestState(roleOrNpcId) → null | 'available' | 'active' | 'ready'`. Engine draws a marker
   above the NPC: `!` (gold) when a quest is available, a dim `?` while active, a bright pulsing `?` (green) when ready to turn in.
2. **Quests from every vendor.** Each townsperson (merchant, blacksmith, mystic, healer, stashkeeper, Curator, camp NPCs) gives 1–3
   quests that fit their trade and personality (story writes them as data; UI wires `giver` per NPC; the vendor panel gets a Quests tab
   when that NPC has any).
3. **Surface crate bulk actions.** Sell or salvage straight from the crate at a bulk rate (lead default: 60% of the trader's price; salvage
   yields 60% materials); full price only by carrying items to a trader. A first-time tip explains this. Plus "Take all" (fills the bag
   in sort order, leaves the rest).
4. **Custom sell filter.** Replace the fixed "≤ White/Blue/Yellow" buttons with a filter the player builds and the game remembers:
   rarity at or below, item level / Power below, slot types, include/exclude upgrades (▲), locked, socketed, sets, Curator-wanted,
   corrupted. Preview count and gold before confirming. `G.items.matchFilter(item, filter)`, `previewSellFilter(filter, { bulk })`,
   `sellFilter(filter, { bulk })`, same for salvage. Saved in `state.settings.sellFilter` (a few named presets).
5. **Piles.** Tapping a pile (or the LOOT button) always takes everything that fits, best first; the pile list opens only on long-press.
6. **Bloodstones look different.** Icon shape `bloodstone` (jagged, dark-veined, with a red outline) for every bloodstone; cut gems keep `gem`.
7. **Your gear inside shop screens.** Every vendor panel has a quick toggle between the vendor's stock and the player's bag + equipped
   gear (paper doll), with equip/compare available without leaving the shop.
8. **Milestones.** Lifetime counters (`state.flags.stats`: kills, elites, bosses, gold earned/spent, items sold/salvaged/sent up the
   chute, chests opened, floors cleared, S grades, Close Calls, Flow chains, deaths…) with tiers (e.g. 10/50/100/500/1000…). Each tier
   gives a reward: gold, materials, a Mark at big tiers, and small permanent bonuses (e.g. kills → +1% damage per tier, chests →
   +2% magic find). `G.meta.getMilestones()`, `milestone:reached { id, tier, reward }`, permanent bonuses via
   `G.meta.getMilestoneMods() → { [stat]: value }`, which combat adds in recomputeStats. A Milestones page in the Journal.

### R13 — bulk rate grows with loyalty (lead dev, 2026-10-15)
The surface crate's bulk rate is no longer a flat 60%. It starts at **50%** and rises through **loyalty quests** that unlock as the
story progresses: one per act from the merchant (bulk *sell* rate +10% each) and one per act from the blacksmith (bulk *salvage*
yield +10% each), so a player who has finished all three acts' loyalty quests sells and salvages from the crate at **80%** — never
full price (carrying items to a trader stays the only way to get 100%).
- **Items:** `G.items.bulkRate('sell'|'salvage') → 0.5 + state.flags.loyalty.{sell|salvage}`, capped at 0.8; every bulk path uses it.
- **Story:** six short loyalty quests (merchant ×3, blacksmith ×3), one unlocking per act, grim and in character ("good customers"
  in a dying town), with a goal tied to that trader (sell N items to them, bring them a material, gold spent with them, …).
- **UI:** reward type `loyalty: { kind: 'sell'|'salvage', amount: 0.1 }`; the crate shows the current rate ("Bulk rate 60% · raise it
  by helping Orlen and Brakka") and the trader's panel shows their loyalty level.

### R14 — depth drives difficulty, not player level (lead dev, 2026-10-15)
Replaces the R6 out-level rule `monsterLevel = max(depth, playerLevel − 3)`. Monsters scale with **depth only** (lead default: no
player-level scaling at all), and the depth curve gets steeper so the last floors are very challenging and the deepest reachable floor
is where a strong player wants to be. Out-levelling a floor makes it easier but pays less: when the player is more than 5 levels above
the floor's level, XP per kill falls off (−15% per level beyond 5, floor 10%) and item level / rarity of drops follow the floor, not the
player — so delving deeper is always the better reward. Shallow farming stays possible for gold, materials and Curator pieces.

### R15 — return trips and the lead dev's writing pass (2026-10-15)
- **Return quests:** a few quests per act send the player back to earlier floors after they have moved on (e.g. carry something to a
  refugee camp on a cleansed floor, recover an item left at depth 3 during Act III, read a grave the player passed at the start), so they
  feel how far they have come: shallow monsters melt, the camps have grown, NPCs remark on the change. Story writes; UI tracks (goal
  kinds `visit { depth, after }`, `retrieve { depth, item }`).
- **Writing pass:** the lead dev will rewrite every player-facing text (dialogue, UI labels, item names and descriptions). All text must
  be easy to find and edit without reading code: story text stays in `src/ui/story_data.js`; UI labels move into one table
  `src/ui/strings.js`; item, monster and skill names stay in their data tables. `docs/WRITING_GUIDE.md` lists every place text lives.

### R16 — lead dev playtest batch (2026-10-15). Wave A = features and fixes; Wave B = balance session afterwards.
**Map**
1. **Left-behind loot markers:** when a pickup fails because the bag is full, the pile gets `pile.leftBehind = true` and a marker on the
   minimap and full map until it's picked up or the floor is left (items sets the flag; engine draws; UI lists them).
2. **Tap the map to identify:** tapping the minimap opens the full map; tapping a discovered thing there (stairs, chute, shrine, chest,
   camp, corpse, marked pile, event, landmark, NPC) shows what it is. `G.engine.mapPick(sx, sy) → { kind, name, x, y } | null` on the map
   canvas; UI shows a small label card. Only explored tiles.
3. **Fog-of-war bug:** on some shallow floors the whole map shows unexplored areas. Find and fix (engine/world).

**Loot, selling, salvage**
4. **Chute capacity grows with the story:** the surface crate starts at **25** and rises through challenge quests (like loyalty) up to 300
   (`G.items.surfaceSize()` = 25 + `state.flags.crateBonus`). Story writes the quests; UI wires the reward `crate: n`.
5. **No auto-sell / auto-salvage on reaching town.** Selling needs a trader, salvaging needs the blacksmith (by hand, full price), except the
   surface crate's bulk actions. Junk "auto" only queues junk for the chute.
6. **Buyback is a collapsed dropdown** at the top of the Sell tab ("Buy back (4) ▾"), so the bag is visible without scrolling.
7. **Loot filter like the sell filter:** the ground loot filter uses the same builder as selling (rarity, item level/Power, slots, upgrades,
   sockets, sets, Curator-wanted, corrupted…) with presets. Filtered-out items are **not shown and cannot be picked up** until the filter
   is loosened (gold, lore, quest items, Legendary tiers and sets always pass).
8. **Sockets:** the blacksmith adds a socket to a chosen item for gold, price rising exponentially per socket up to **6**. A rare
   **Socket Tool** drop lets the player add one anywhere; the chance it fails (destroying the tool, never the item) grows with the item's
   rarity. `G.items.addSocket(target, { tool })`, `socketCost(item)`, `socketFailChance(item)`.
9. **Requirements:** every item has a level requirement and stat requirements (Str/Dex/Int scaled by item level and weight class).
   **Class armour:** each class gets its own armour lines whose stat requirement is the class's primary stat, so other classes rarely
   meet it. Attribute points per level come back as a visible choice (auto-build still spends them when on). Off-class gear that meets
   requirements still has the R8.7 weapon penalty unless a Crossroads licence lifts it.
10. **Upgrade badge:** the Bag button shows a ▲ badge whenever the bag holds an upgrade for any slot.
11. **Auto-compare:** selecting an item always shows it side by side with what's equipped in that slot (both rings for rings).

**Combat and floors**
12. **Packs grow with depth** toward the corruption's centre (pack size and density scale with depth and act).
13. **Pathing:** fix monsters stuck on terrain/props (unstick logic, repath, nudge around solid props, never spawn wedged).
14. **Class goals:** per-class achievements (finish a perk branch, put N points into a tree, class-flavoured feats — e.g. Warrior: stun
    50 enemies with Shoulder Charge; Ranger: 100 kills from 8+ tiles; Sorcerer: shatter 50 frozen enemies; Necromancer: 1,000 minion
    kills) with Marks, titles and cosmetic rewards. Combat tracks; story names them; UI shows them in the Journal.
15. **Level design:** a mix of **linear** floors (clear path, set pieces along it) and **open** floors with more variation; **boss floors
    become static set pieces** (fixed arena layout per boss, little exploration). Paths must read clearly (lit routes, clearer floor
    contrast for walkable ground, door/opening markers).

**Meta**
16. **Stats everywhere + the inn:** track every lifetime stat we can (kills by type, damage dealt/taken, potions, distance walked, dashes,
    gold by source, items by rarity found, deaths by cause, time played…). A town **inn** with a seat by the fire opens the full stats book.
17. **Shorter save codes:** compress (strip derived data, deflate via CompressionStream where available, base64url) — aim for at least
    5× shorter; old codes still import.

**Wave B — balance session (after Wave A lands)**
- The lead dev reports one-shotting everything from about level 20, including legendary monsters, and bosses dying in 3–4 hits.
- Targets: normal monsters 3–5 hits at every depth with on-level gear; elites and legendary monsters real fights; bosses 30–60 s; enemies
  hit harder throughout. Balance every class and every build style (single target, group, balanced) to comparable DPS. Fix item power
  growth (weapon scaling, affix stacking, sockets, perks, Heat/Flow stacking) where that's the cause.

### R17 — fidelity pass "B" and smooth animation (lead dev, 2026-10-15). Queued after R16 Wave A.
Option B chosen: improve everything that survives the lead dev's hand-drawn art — not the procedural sprites themselves.
- **Lighting:** smooth coloured light with soft falloff, soft shadows/contact shadows under entities and props, light from spells,
  fire and loot; per-act colour grading; subtle bloom on fire, loot beams and spells; vignette; all cheap with a `lowFx` fallback.
- **Motion:** smooth movement (sub-pixel positions, eased camera follow), animation timing tied to movement speed (walk cycle
  matches ground speed, no foot sliding), short blend/hold frames between animations, hit-stop and knockback easing, death physics
  (bodies settle), weapon trails on swings.
- **Art pipeline for smooth animation:** the loader accepts **any frame count** per animation file (frames = width ÷ cell) and plays
  them over the animation's duration, so the lead dev can draw 12–16-frame walks and 10–12-frame attacks for smooth, realistic motion;
  optional per-file timing in `assets/assets.js` (e.g. `{ file, fps }`). ART_SPEC.md gets a "smooth animation" section recommending
  frame counts and the Blender 3D-render route for characters.
- Verified on phone sizes with frame-cost numbers per act, normal and lowFx.

### New class checklist (R18; from docs/audits/game.md §5 and items.md §5)

Anything missed silently behaves as "warrior". Add classes two at a time and walk this list; add a row whenever you find a new break-point.
1. **Id and prefixes.** Use the full class id everywhere. `classgoals.js` and the perk tables build ids from `classId[0]` (`w_ r_ s_ n_`): a class sharing a first letter (Rogue/Ranger, Shaman/Sorcerer, Warlock/Warrior) silently overwrites perks in the global `PERKS` table and collides in `flags.classGoals`.
2. **Game.** `CLASSES[c]` (stats, `primaryStat`, `action` of kind `charge|roll|blink` only — no `action` hides the dash button); `stats.js` `MARTIAL` (attack-speed GCD, weapon-based damage) and `RANGED`; `SKILL_NEEDS_CLASS_WEAPON` and Echo `KIT` (skill-id lists); `data_skills.js` `BUILDS` and `perks.js` `PLANS`/`ELEM`; `classgoals.js` has `warrior`/`necromancer` special cases; Fallen/campaign carry the four classes' `classId`.
3. **Items.** `bases.js` `D.CLASS_MATERIAL`, `D.CLASS` (weights, weapons, armour, offhand, starter), `BY_PRIMARY`; `reqs.js` `classTag` and the class-armour roll (`heavy→warrior, light→ranger, cloth→sorcerer/necromancer`: a new class never rolls class armour until added); `info.js` `isMartial` fallback; `favouredBy` (reads game classes) vs `classPenalty` (reads `D.classProfile`) must agree; `uniques.js` `cls` tag (drop weighting ×2.5 — new classes have no uniques).
4. **Stat vocabulary.** Only `str/dex/int/vit`; a different primary stat breaks `dmgPct` (+1 per primary point), requirements and affix tags.
5. **Weapons.** The weapon family list is closed: a new type needs bases, `TYPE_NAME`, `D.REQ.weaponStat`, collection `weaponEntries/entryLabels`, engine `WEAPON_TYPES` + gear overlays, `C.WEAPON_LOOKS`.
6. **UI and story.** Class picker, `story_data.js` class goals/titles (ids must match the game's), ui.md §2 lists.
7. **Assets.** `sprites/<classId>_base`, `portraits/<classId>`, class icons, `mat_cls_<class>`.
8. **Tests.** Run `tests/all.html`; `contract.json` / `contract-allow.json` need new shared names.

### Standing process: audits (lead dev, 2026-10-17)
- **Every push:** `tests/all.html` (via `tests/run-headless.ps1`) must pass, the sw.js VERSION is bumped, and `#boot-error` is empty.
- **After every big update** (any round touching 2+ team directories, a new class pair, a balance round) and before it ships: a
  read-only **diff audit** of everything changed since the previous audit (`git diff <last-audit-commit>..HEAD`), on the mid model,
  written to `docs/audits/YYYY-MM-DD.md` with the base commit noted. It checks correctness, cross-team names/shapes against
  tests/contract.json, save safety, performance, untested paths, text outside strings.js/story_data.js, the new-class checklist and the
  art/sound formats. Critical/high findings are fixed before the push; the rest go on the next round's list.

### First ten minutes (onboarding, 2026-10-17)
New heroes only (`flags.fte = { v, floor, town, upgrade, kills, flasks, quiet }`, set at creation; old saves never get it): auto-build
Balanced on, 5 flasks, the Elder's first step accepted; depths 1–2 softened until depth 3 is reached (short depth 1, no elites,
×0.75 monster damage, a guaranteed ▲ weapon on the second kill; `map.inputs.first`); a "faint" Echo for corpse runs at depth ≤ 3
(`game.faintEcho`); coach hints beside HUD buttons that never pause (`src/ui/coach.js`, `flags.coachSeen`). Game: `game.fte`,
`game.beginOnboarding`. Events: `fte:flasks` (game → ui, belt topped up after an early death), `story:opening` (ui, opening scene
start/end). For everyone: Skip on every story scene; at most one pausing tip per 20 s of play (resets for a new hero); auto-learned
rank-ups are toasts. `tests/firstrun.html` prints a scripted new player's timeline (not part of the gate).
