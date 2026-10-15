# Combat & Classes (src/game) — hand-over (Revision 2)

Status: Revision 2 items implemented. tests/combat.html → 291/291 assertions, 0 console errors.
Integration: tests/combat.html?real=1 loads the REAL world + items modules; `runProgression({ classes, mode, maxDepth })` plays
auto-build characters floor by floor on real loot (results in window.__prog).

Things other teams should know
- Entities carry extra fields: `faction`, `summon`, `summonOf`, `ai`, `dmgMin/dmgMax`, `speed`, `xp`, `noLoot`, `bossAdd`, `lockdown`,
  `fly` (flyer/wraith bodies: ignore water + lava), `lavaProof` (inferno natives).
- Dead monsters stay in state.entities ~8 s (`dead: true`, `anim: 'die'`) as corpses for Corpse Explosion.
- `G.game.zones` = plain data { x, y, r, delay, t, faction, color, trap }; also announced via `fx:spawn` type 'ring' (radius + duration).
- `player:damaged.source` is the attacking entity (null for DoTs / lava).
- `player:died { noRetrieve }` — true while any boss is awake and alive, or `state.flags.sealed`.

Lockdown rooms (R2.5)
- Trigger: player tile inside the room rect, not a DOOR tile, and > 1.3 tiles from every door.
- Progress is on the room object: `room.locked`, `room.wave` (1-based, current), `room.waves`, `room.cleared`. `G.game.getLockdown()` →
  `{ room, wave, waves } | null` for the UI wave counter (I also toast "Wave n / m").
- Gates are `{ type: 'gate', x, y, solid: true }` props; removed again with G.world.invalidate(map).
- Reward chest: prop gets `locked = false`, `lockReward = true`. I call dropLoot(source 'chest') twice, passing `rarityFloor: 'rare'` in opts
  (ignored today), and additionally drop one guaranteed rare-or-better via rollItem + dropItemAt.
- Fail-safe: if the player is outside the sealed room for 3 s the lockdown lifts unrewarded (re-entering restarts it).
- Blink/leap/teleport cannot leave a sealed room.

Mythic effects (R2.2): all 12 implemented, read from `G.items.getActiveEffects(player)` in recomputeStats → `player.bonus.fx`.
- legion's "+2 maximum summons" applies to Raise Skeleton (not mages/golem).
- executioner checks life AFTER the hit lands.
- second_wind cooldown is the effect `second_wind_cd` in player.effects (120 s; cleared by death/revive).
- midas is hooked where the game module calls G.items.pickup (auto-pickup + tap pickup), so vendor gold does not trigger it.

Weapons (R2.3): every skill works with every weapon. Arrow skills without a bow fire 'shard' projectiles; melee skills with a
ranged weapon walk in and strike. No weapon-based lockedReason exists.

Balance notes
- Casters' spell damage = weapon damage × attacks/sec × 0.75; warrior/ranger skills use per-hit weapon damage.
- Bosses: base life ×2.4 vs. revision 1, +3 % life per depth, damage growth softened past level 7, one hit per volley per target.
- Elite spawns are champions on depths 1–3 and rares from depth 4.

## Revision 3 additions (combat)
- Monster rarity 'legendary': 4–5 modifiers incl. one from G.game.LEGEND_AFFIXES, name "Name, Title", sprite.accent '#ff8a2b',
  announced once via ui:toast + sfx 'shrine' (e.seen = true). Loot source 'legendary'. Last lockdown wave from depth 8.
- G.game.AFFIXES[name] = { color, tell, legendary? } — `tell` is a short readable phrase the UI can show next to the modifier name.
- Champions spawn as packs of 2–4 sharing one modifier; rares get 2–3 modifiers and 3 minions.
- map.mods = [modId] rolled in spawnMapEntities (deterministic from map.seed). G.game.FLOOR_MODS[id] = { name, desc, reward:{magicFind,goldFind,xpGain}, min }.
  Rewards are applied to kills (XP multiplier, magicFind/goldFind added to dropLoot opts). Arrival toasts come from the game module.
- G.state.targetId = id of the current auto-target (null when none), refreshed every 0.15 s.
- SKILLS[id].synergies = [{ from, desc, key?, pct?, combo? }]; getSkillInfo(id).synergies = [{ from, name, desc, active, combo }].
- Lockdown reward chest uses dropLoot opts.floor = 'rare' (both rolls).

## Revision 4 additions (combat)
- G.game.getClassAction() → { id:'dash', name, desc, icon, cooldown, cdRemaining } for the Ranger, null otherwise; G.game.useClassAction()
  is what `input:classaction` calls. Base: 3 tiles, 0.35 s invulnerable, 3 s cooldown; the Acrobatics passive (id `dodge_roll`, formerly the
  Dodge Roll active) improves all three. `dodge_roll` is now `kind: 'passive'` — UI skill bars should no longer show it.
- Bosses take half damage from player summons; drain-skill healing (Life Drain) is 40% as strong against bosses; Bone Armor cooldown 30→26 s by rank.

## Revision 6 additions (combat)
Status: tests/combat.html → 399/399, 0 console errors. Real index.html: 0 errors from src/game (Echo fight driven end to end).
New file: src/game/echo.js (manifest: last). Harness: `runDifficulty({ reps })` in ?real=1 → window.__diff.text.

### Difficulty pass (lead playtest: far too easy)
- `game.HPM(L)` life ×1.6 (L1) → ×2.8 (L6+); `game.DMM(L)` damage ×1.8–2.3 at L1–5 tapering to ×1.15 from L17; the early damage ramp
  starts at 0.85 (was 0.65). Both are folded into `hpScale`/`dmgScale`, so minions, floor hazards and glyphs follow.
- Bosses take half the life multiplier (hits carry the full one). Legendary monsters ×6 life (was ×8). XP per kill ×1.8 (`game.XP_MULT`).
- Out-levelling: `game.monsterLevel(depth) = max(depth, playerLevel − 3)` for every spawn and the boss.
- Packs +1 from depth 3; aggro radius ×1.15; monsters ×1.2 speed (`game.SPEED_SCALE`); hostile projectiles ×1.1 speed (same reach).

### R6.3 dash for every class
- Base player speed 5.0 (was 4.2, `game.BASE_SPEED`).
- `CLASSES[c].action = { id:'dash', kind:'charge'|'roll'|'blink', name, desc, icon, cd, d, inv, charges }`: Warrior Shoulder Charge (1 charge,
  4.5 s, hits 60% + stun 0.4 s + shoves aside), Ranger Dash (2), Sorcerer Blink (2, teleports, no passing walls), Necromancer Grave Step (2).
- `getClassAction() → { id, kind, name, desc, icon, cooldown, cdRemaining, recharge, charges, maxCharges, ready }`. cdRemaining = recharge =
  seconds to the next charge (0 when full); `ready` = charges > 0. Charges refill on revive and on any scene change.
- Augments (passives, `player.bonus.dash*`): Ground Slam (warrior, slam at the end + shorter cd), Tumble Shot (ranger, free Multishot),
  Rime Step (sorcerer, frost trail + range), Grave Swap (necro, swaps with a minion; minion gets absorb + `tauntT` 2 s), plus Acrobatics.
  Every auto-build plan takes its class's augment. 76 skills.

### R6.2 the Echo (src/game/echo.js)
- `player.style = { attack, dash, potion, [skillId]: decaying counts, hpAt: potion threshold (moving avg), open: { opener counts } }`;
  `G.game.getStyle() → { shares, hpAt, opener, potions }`.
- Abandoned corpse: remembered on `player:died`; if `revivePlayer()` finds it replaced/cleared (core respawn), it becomes
  `state.flags.echo = { depth, seed, x, y, gold, items, snap }` (snap = class, name, sprite, equipment copy, ranks, bar, defences, style).
  One Echo at a time. Save/load must keep `flags.echo` (UI/meta).
- Entering that depth spawns monster `monsterId:'echo'`, `echo:true`, `ghost:true`, rarity 'legendary', name "Echo of <name>", `classId`,
  `equipment`, lying (`anim:'die'`) until you come within 7 tiles → `echo:rise { entity }`. Life max(2.5× your life, 0.9× a legendary),
  damage = a legendary's swing ×0.8, your armour/resists, dodge/block capped 25.
- AI: every bar skill maps to a telegraphed move (KIT table); picks moves in your style proportions, opens with your usual opener, dashes if
  you dash (charges like your class), drinks up to 3 potions (25%) at your threshold. Summons are enemy adds (`bossAdd = echo.id`).
- Kill: `game.onEchoKilled` → core `reclaimCorpse()` on the Echo's contents (your newer corpse on the floor is preserved) + dropLoot
  source 'legendary', `floor:'rare'`.

### R6.1 Go deeper
- `G.game.previewPallor(v) → { value, tier, effects, tierUp, loot: { rarity, quantity } }`, `G.game.nextPallorValue(depth)`.
- With Pallor unlocked and G.ui loaded, stairs down emit `stairs:confirm { depth, nextValue }` and wait; `G.game.confirmDescend()`
  (validates same floor, alive, within 2.5 tiles) / `G.game.cancelDescend()`.

### R6 balance (real world + items)
runDifficulty (balanced auto-build at level ≈ 1.15×depth+1, real items best-of-4 common–rare): main-skill hits to kill a normal
monster 1.1–2.3 at depth 1, 1.6–3.8 at depths 2–5, 2.1–6.2 from depth 8 (warrior lowest, ~2–3); champions 4–13, rares 10–37.
Standing still in a 5-pack: 6–28 s at depth 1, ~5–12 s at depths 3–10 (warrior 11–17 s), 2–9 s from depth 15. Before the pass the main
skill one-shot normals at almost every depth (0.7–1.9 hits) and a still player survived 10–60 s through depth 10.
runMatrix reps 4 (48 runs, depths 1–20), potions per boss kill (hp+mana / hp only): warrior 6.3 / 3.5, ranger 6.1 / 4.5,
sorcerer 5.2 / 3.3, necromancer 2.5 / 2.2. 15 of 48 runs stopped at a boss (6 deaths): 7× depth 5, 4× depth 10, 3× depth 15, 1× depth 20 —
mostly runs where the bot had equipped off-class weapons. Level at 20 ≈ 29–31 (XP ×1.8).
Dials: game.HPM / game.DMM (monsters.js), boss share of DMM (0.7) and of HPM (0.5) in createMonster.

## Revision 7 additions (combat) — new files src/game/campaign.js, src/game/events.js (manifest: after echo.js)
Status: tests/combat.html → 418/418, 0 console errors.

### R7.5 explored %, clear grade, timed events (events.js)
- `G.game.getExplored()` → 0–100 (explored walkable tiles / walkable tiles; cached 0.5 s; town = 100).
- Clear grade: on first coming within 2.5 tiles of a stairs-down tile. score = explored × min(1.3, par / time), par = 45 s + 1 s per
  10 walkable tiles. S ≥ 0.85, A ≥ 0.65, B ≥ 0.45, C ≥ 0.25, else D. Reward: XP (12/8/5/3% of the level), dust/shards, and a chest
  by the stairs (`prop.gradeFloor` = best item at least magic/rare/uncommon; none for D).
  `G.game.getClearGrade()` → `{ grade, score, explored, time, par, depth }` once graded, else `{ grade: null, explored, time, par }`.
  Event `floor:graded` with the same payload. `G.game.CLEAR_GRADES` is the table.
- Timed events: 40% of non-boss floors from depth 2 roll one (deterministic from map.seed), starting 5 s after arrival.
  `G.game.getEvent()` → `{ id, name, timer, goal, progress }` | null. Events `event:start` / `event:update` (4×/s) / `event:end`
  (`+ success, reward`). `G.game.startEvent(id)` starts one now (dev/tests). `G.game.EVENTS[id] = { name, goal }`.
  - `gauntlet` Run the Gauntlet: a beacon (torch prop, `event:'gauntlet'`) 16–26 tiles away; monsters spawn around you every 3.5 s;
    reach it in time → rare-floor loot at the beacon.
  - `keyhunt` Key Hunt: a locked vault chest (`event:'keyhunt'`) and 5 crates (barrels) around it, one holds the key; 60 s. Key found →
    vault unlocks (timer stops). Timeout → vault `sealed` for good.
  - `collapse` Cave-in (ours): 25 s of falling rocks (telegraphed circles) around you; survive → a cache (rare floor if never hit).
  - `thief` The Magpie (ours): a fleeing goblin (`magpie: true`) that drops gold as it is hurt and vanishes after 20 s; kill it → rare loot.

### R7 bosses (campaign.js)
- `game.ACT_BOSSES = { 5 Gravelord, 10 Broodmother, 15 Tyrant, 20 Hollow Star, 25 boss_choir, 30 boss_world }`; from 35 the first
  four repeat with a tier (35 = Gravelord II …). The UI's WORLD_BOSS_IDS already lists `boss_world`.
- The Choir (25): every ~11 s it sings for 2.5 s with a 5.5-tile ring; inside at the end = stunned + burned. Deal 5% of its life
  during the song to break it (it is stunned instead).
- Oswin Marrow, the Hearthking (30): I swordsman (fan, sweep, charge). II (66%): root lashes (telegraphed lines), lingering root pools,
  the Ember exposed every 12 s for 3 s (+100% damage taken; deal 8% in the window or he heals 6%). III (33%): becomes "The Ember"
  (sprite body → demon), floor pulse alternating INWARD / OUTWARD every 7 s, and the Factor counts your dashes ("One. Two. Three." as
  ui:toast) — on three the thing lands on you. Kill → `G.items.grantTome(1)`, `state.flags.worldBossKilled = true`. Title is UI's.
- Hook for other teams' designs: `MONSTERS[id].special` → `G.game.SPECIAL[special](e, def, target, dist, dt, player)`; return true
  to skip the default fight logic.

### R7.6 the Fallen (campaign.js)
- `G.game.FALLEN[adventurerId] = { depth, name, classId, story }`; monster defs `adv_<adventurerId>`. Entities: `fallen: true`,
  `adventurerId`, rarity 'legendary', never leash. One per depth; never on boss floors; spawns in the room furthest from the stairs
  each visit until slain (`state.flags.fallenSlain`, also skipped when `G.items.hasRelic(id)`); a toast on arrival, UI banners on sight.
- Kill → `G.items.grantRelic(adventurerId)`; their raised adds die with them.
- Built: Brannoc (fallen_2, 9) frontal shield (−85%, slow turn) + knockback charge that leaves him winded 1.6 s; Wren (fallen_4, 16)
  strafing archer, snare lines, stops to count for 2.5 s every 10 s (+60% taken); Varr (fallen_8, 24) growing novas, bottles bursting
  after 2.2 s, burns herself (1.2%/s); Crane (fallen_9, 28) raises corpses near him (2 / 4 s, ≤ 6), +8% dmg / −4% taken per servant,
  +40% taken with nothing to raise, and a slowing shovel line.
- Relic effects (read through `getRelicEffects` into `player.bonus.fx`): dash_shield_bash (dash ends in an 80% bash + 0.8 s stun),
  dash_reload (free 150% shot on dash + map revealed on arrival), ramping_fire (+3% fire per second of fighting, max +45%),
  extra_minion (+1 skeleton; your kills are never raised).

### Bot check after R7 (2 reps, depths 1–20)
Potions per boss kill (hp+mana / hp): warrior 5.2/3.3, ranger 5.7/4.0, sorcerer 6.4/5.1, necromancer 3.4/2.8 — same band as after the
R6 difficulty pass. 7 of 24 runs walled (5× at the depth-5 boss). No deaths to Brannoc (9) or Wren (16) for most runs; level at 20 ≈ 32–34
(grade XP adds ~2 levels by depth 20).

## Revision 7, round 2 — final story designs (new files src/game/bosses.js, src/game/fallen.js; manifest: campaign, bosses, fallen, events)
Status: tests/combat.html → 436/436, 0 console errors.

### Act bosses aligned with story_data.js BOSSES (bosses.js; the Choir and the Hearthking in campaign.js)
- Boss phase changes now run every frame before any special mechanic (`bossPhase` in monsters.js), so a fight's own logic can
  never stall a phase.
- **Morgrath the Gravelord (5)** — Sermon: slow axe sweeps; a name read every 6 s lights a grave (pulsing ring) that raises a
  skeleton after 4 s unless you stand on it. The Count (50%): a 2-tile ring of names orbits him at 4.5 tiles; each second inside
  it = a Named stack (+5% damage taken, 8 s, max 10; effect `named`). Last Rites (20%): no graves; three telegraphed lunges in a row.
- **Skarn the Broodmother, "Mother" (10)** — Nest: invulnerable on the roof; an egg sac (`boss_prop` entity, `sacOf`) every 10 s
  hatches 3 spiders unless popped; each sac popped costs her 10% (she drops at 60%, or after 45 s anyway). Web spit slows.
  Hungry (60%): every 7 s she charges the nearest minion (else you), leaving poison pools. Mother (25%): she walks to her brood
  and eats it (+5% each).
- **Azgalor, the Ember Tyrant (15)** — Hoard: +2%/s while within 1.5 tiles of the fire vein (his spawn spot, white rings); range
  pulls him off it. Molten (50%): fire lines in a grid around you every 4.5 s (rows, then columns; stand in the gaps). The
  Promise (20%): a meteor on your spot every second while he roars names ("… FORGOT ME").
- **Xal'thuun, the Hollow Star (20)** — Gaze: a cone beam sweeping at 0.45 rad/s (spark line); in it with line of sight =
  cold ticks + chill; walls block it. Hollow (55%): pulls you toward it within 10 tiles (dash breaks free) while shard rings
  orbit. Blink (20%): it vanishes (`e.cloaked = true`, invulnerable) and reopens 1.6 s later 2 tiles behind you with a blast;
  emits `boss:blackout { boss, t }` so engine/UI can darken the room.
- **The Choir (25)** — Hymn: a note every 1.5 s; rings at 2.5/4.5/6.5 tiles alternate safe (pale) and harmful (red; hits if you
  are within 1 tile of the ring). Discord (50%): two more singers (`choir_singer`, `bossAdd`); only the wrong note (cyan accent,
  pulsing ring) can be hurt, it moves every 6 s; damage to a wrong-note singer is the Choir's. Last Verse (20%): singers gone,
  notes every 1.0 s; every 8 s a 1.5 s inhale — hit it to silence it for 3 s, else a 5.5-tile stunning blast.
- **Oswin Marrow, the Hearthking (30)** — thresholds now 60% / 25%. Phase I adds the Founder's three-hit combo (glowing landing
  circles; being untouchable in a swing as it lands = Close Call). II and III as before.

### All ten Fallen (fallen.js for 1, 3, 5, 6, 7, 10; campaign.js for 2, 4, 8, 9)
- A Fallen listed on a boss-floor depth (Ivo, 35) waits one floor lower (36). Fallen at depth ≤ 6 have half the life of the others.
- **Hob Garrow (fallen_1, 3)**: 4 braziers (torch props, `brazier: e.id`, `lit`) heal him 0.3%/s each; walk through one to snuff
  it; he relights one every 8 s; lamp-hook sweep (1.2 s glow); all out → dark (+30% taken) and blind charges every 3 s.
- **Sefa Lind (fallen_3, 6)**: 3 Rope Anchors (`boss_prop`); untouchable and gliding between them while any stands; each cut
  drops her (stun); wide fan volleys; knotted snares (root-like slow traps).
- **Brannoc (fallen_2, 9)**: + below 50% he plants himself (no charges) with a spike ring every 4.5 s.
- **Odile Marr (fallen_5, 13)**: salt circles (7 s) crystallise you (stun) if you stand still in one; brine wave pushes you away;
  every 15 s her true face (effect `true_face`, +100% taken for 3 s).
- **Wren (fallen_4, 16)**: + vanishes for 3 s every 12 s (`e.cloaked`, invulnerable) and fires glinting arrows from the dark.
- **Brother Ashby (fallen_6, 19)**: a bell ring (3.5 tiles); toll every 3–8 s (faster as he weakens) stuns inside it and raises 3
  ghosts (`ashby_ghost`) that drift to him and heal him 6% if they arrive.
- **Corwin Dask (fallen_7, 21)**: his hits knock 4% of your gold (min 10) onto the floor 3 tiles away; he collects loose gold
  (heals 3%); coin barrages in three lines; Foreclosure: a 2.5-tile circle that locks after 1.5 s (hit + rooted) and stays
  hostile for 10 s.
- **Varr (fallen_8, 24)**: unchanged. **Crane (fallen_9, 28)**: + below 30% four Piled Dead shield him (invulnerable until broken).
- **Ivo Marrow (fallen_10, 35→36)**: thorn walls (lanes, 10 s); retreats through the roots when you close in; Refusal every 15 s
  (5 s, bow down): hit him and he enrages for good ("You chose."), leave him and he fights on cleanly.

### R7.7 cleansed acts
- World marks `map.cleansed` and halves spawn points; on top of that packs are 0.6× and no legendary rolls there.
- Camp spawns (`kind:'npc'`, `camp:true`, role `refugee`/`camp_merchant`) become the story's camp NPCs (`G.meta.STORY.CAMP`, the
  camp whose `band` holds the depth): `name`, `role` = the story NPC's vendor role (merchant / healer / stashkeeper / waypoint),
  `campRole` (world role), `look`, `lines`, `campName`, `camp: true`. Without story data they stay "Refugee"/"Camp Trader".
  npc:interact fires as usual; UI decides what a `waypoint` camp NPC opens.

## Revision 8 additions (combat)
Status: tests/combat.html → 445/445, 0 console errors; real index.html driven through death → guarded corpse → descend → grade: 0 errors.

- **R8.2 Echo guards the corpse.** `revivePlayer()` writes a snapshot of you into the new `state.flags.corpse.echo` (+ `echoSlain:false`).
  Every return to that depth (until it is killed) spawns the Echo lying at the corpse (`guardCorpse: true`, `home`); it rises
  (`echo:rise`) when you come within 7 tiles, never chases you more than 9 tiles from home, and walks back if you are 12+ tiles from
  the corpse. Killing it sets `corpse.echoSlain = true` and drops a rare-or-better item; the bag stays on the corpse (reclaim it as
  usual, or slip past the Echo to the corpse). An old save's R6 `flags.echo` still spawns the old way; no new ones are created.
- **R8.4** `G.game.getExplored() → { value, low, high, label, hint? }`: depths 1–3 exact ("62%"), 4–10 rounded ("~60%"), 11–20 a range
  20–38 points wide placed by the floor seed ("40–70%"), 21+ `{ value: null, label: '?', hint }`. Exact value: `G.game.exploredExact()`.
- **R8.7** `player.bonus.offClass` = damage % applied while wielding a weapon type outside `CLASSES[c].weaponTypes`: from
  `G.items.classPenalty(weaponItem, classId)` when it exists (number or `{ dmgPct }`; null/false = no penalty), else −35.
  Warrior swing skills and Ranger arrow skills (`G.game.SKILL_NEEDS_CLASS_WEAPON`) are disabled with an off-class weapon:
  `getSkillInfo(id).disabled = true`, `lockedReason` "Needs a sword or axe or mace (you hold a bow)"; useSkill refuses. Spells and
  non-attack skills keep working (with the damage penalty).
- **R8.8** The grade is measured when you take the stairs down and awarded on arriving below: `floor:graded { grade, score, explored,
  time, par, depth (of the floor graded), chest }` fires on the new floor, the chest stands beside the arrival point.
  `getClearGrade() → { grade: null, explored, time, par, last }` (`last` = the previous floor's grade).
- **R8.9** `G.game.getActionMode() → 'attack'|'loot'` (0.1 s cache): loot when an item (not loose gold) lies within 2.4 tiles, or within
  4 tiles in the stick direction, and no enemy is in melee reach. `input:attack` and the held button then loot it; a pile that opened the
  popup or an item that would not fit is skipped for 6 s. A tap within 0.55 tiles of a ground item always loots.
- **R8.10** `skill:learned { skillId, rank, auto }` on every learned rank (auto = auto-build).
- **R8.11** Basic melee cleaves: everyone else in a 1.7-tile, ±0.85 rad arc takes 60% (half the main 120% swing). Eagle Eye rank 3+ →
  `bonus.pierce = 1`: basic shots pierce one foe. Melee/self aoe skills flash a 2.4-tile ring in their colour on cast.

## Revision 9 additions (combat) — new file src/game/pillars.js (manifest: last)
Status: tests/combat.html → 460/460, 0 console errors; real index.html floors 4–9 driven with everything live: 0 errors.

- **Flow chain (R9.1).** Close Calls within 8 s chain. 3 → Flow: `G.state.timeScale = 0.35` for 0.45 s of game time + `flow_crit`
  effect (next hit is a guaranteed crit). 4 → also every dash charge back. 5+ → also every skill cooldown reset ("FLOW ×n").
  Event `flow:start { chain }`; `G.game.getFlow() → { chain, slow }`; `G.game.endFlow()`. timeScale returns to 1 by its timer, by a
  real-time setTimeout fallback (covers pause), on `player:died` and on every `scene:changed`.
- **Variant monster bias (R9.1).** spawnMapEntities reads `map.variant.monsterBias` (or `map.variant.monsters`):
  `{ ids: { monsterId: mult } | [monsterId], arch: { melee: mult }, dtype: { fire: mult }, body: { wraith: mult } }` or a plain id
  array (×3 each). Ids outside the theme pool join it (bosses, minions and event monsters are ignored). **World:** emit any of these.
- **Shrine bargains (R9.1).** ~35% of dungeon shrines (deterministic per shrine; a world prop may force one with `prop.bargain = id`)
  emit `shrine:offer { id, name, cost, reward }` instead of the buff and wait for `G.game.acceptBargain(id)` /
  `G.game.declineBargain(id)` (declined = dark shrine). `G.game.getBargainOffer()`, `G.game.BARGAINS`, `G.game.bargain` (active deal,
  cleared with the floor), event `shrine:accepted { id, name }`. Without G.ui the shrine stays an ordinary shrine.
  Deals: Blood Tithe (−25% max life → every kill drops loot twice), Dry Vow (no health potions → +200% magic find), The Hunt (a
  legendary is sent after you → its best drop is at least Legendary Elite), Glass Heart (double damage taken → +60% damage, +50% XP).
- **The Scavenger (R9.1).** One floor in five from depth 4 (not boss floors). When a rare-or-better item lies on the ground he
  announces it (`scavenger:race { entity, ground }`, toast, gold ring pulsing on the item) and runs for it at 80% of base player
  speed. First to it wins. If he takes it, he flees for 14 s and then escapes with it. Kill him: the stolen items drop plus a
  rare-floor stash. Entity `monsterId: 'scavenger'`, `stash: [items]`, `noLeash`. `G.game.spawnScavenger(map)` for tests.
- **Ember Heat (our pitch).** 35% of kills shed an ember (`G.game.embers`, 4 s, spark pulses). Sweep through one (0.8 tiles) for +1
  Heat (max 10): +4% damage and +5% magic find per stack (effect `heat` with `stacks`). Cools by one every 6 s without a pickup; a single
  hit for > 8% of your life knocks half of it out. `G.game.heatStacks()`. Engine may draw embers like wisps; UI may show Heat stacks.
- `game.lootBonus(monster) → { rolls, magicFind, floor? }` feeds every kill's dropLoot (bargains + Heat).

## Revision 10 (polish and verify)
Status: tests/combat.html → 465/465, 0 errors; real index.html with game + engine render + UI update driven through depths 3/9/16/25/30: 0 errors.
- **The Leap.** `K.leapTo(p, x, y)` (skills.js) is the dash movement for roll/charge kinds: it flies over CHASM / DEEP_WATER / DEEP_LAVA,
  stops at walls and solid props, never lands on a gap (carries on up to 2.4 tiles to the far edge, else back to the last solid
  ground) and returns true when it crossed one ("Leap!" text). Blink reaches up to 1 tile further when its line crosses a gap.
  Verified on 12 generated floors with The Leap per class: 48/48 crossed.
- **Rift core.** `interact:'rift_core'`: refused ("It is still beating inside him") while the world boss lives; afterwards sets
  `prop.used`, `state.flags.riftCoreTouched`, plays a nova and emits `object:interact { type:'rift_core', prop }` (every tap; UI
  plays the finale once).
- **Fixes from the bot run:** Fallen XP ×18 → ×6 and the Echo's ×6 → ×3 (bots hit the level cap by depth 25 and, through out-level
  scaling, made Hellscape a wall).
- **Harness:** `runMatrix({ …, allSystems: true })` = shrine bargains auto-accepted (bot visits shrines), real corpse runs
  (respawn → re-enter, Echo at the corpse), everything else live; `style: 'slow'` = no dodging, no dashes, skills every 0.9 s.
