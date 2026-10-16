# Audit — game (`src/game`, `G.game`)

Read-only outside review, 2026-10-15, `main` @ cd5dc23. Read: base, stats, combat, skills, player, monsters, pillars, deep, perks,
classgoals, echo, lockdown, parts of campaign/mods, data tables. §6 contains a **measured** damage model built by driving the real
`rollItem`/`recomputeStats` code (no save touched); the raw numbers are in the shared notes folder
(`side-session-notes/local_731a289d-…/audit-notes.md`, with the method).

## 1. Correctness bugs and edge cases

| # | Sev | Where | Finding | Fix |
|---|---|---|---|---|
| GM-1 | **high** | `perks.js:404`, `combat.js:389-400` | **Two keystone-tier-4 perks do nothing.** `game.perkLootRolls` ("Spoils of War" Warrior, "Trophy Hunter" Ranger: *elites roll their loot twice*) is defined and never called. `kill()` only honours `lootBonus().rolls`. | In `kill()`: `rolls += game.perkLootRolls(p, t)` (and add a test that enumerates every perk hook name and asserts a caller exists). |
| GM-2 | **high** | `combat.js:187-244`, `stats.js:111`, `data_skills.js:427` | **Player damage is a product of ≥ 10 uncapped factors** (details and numbers in §6). Highlights: flat elemental damage is multiplied by the skill % and the whole scale; `allSkills` extends skill ranks past 5 linearly; `dmgPct` (stat + gear + uniques that ignore item level) and `critDmg` are uncapped; every `dealt` buff and every perk `dmg` hook multiplies separately. Measured per-hit damage over an ungeared character: ×40-100 at level 20 and ×70-160 (rare gear) to ×1,300-1,650 (uniques in every slot) at level 40, before temporary buffs; monster HP grows only ×15 between depth 20 and 40. | Balance session: §6 "Recommended structural changes". |
| GM-3 | medium | `deep.js:366-379`, `pillars.js:24-42`, `perks.js:62` | **Flow/Close Call is farmable.** `ccCd` is 0.75 s; from chain 5 every Close Call resets *all cooldowns and all dash charges* and re-arms a guaranteed crit and slow-motion. The Warrior perk "Shoulder Through" counts being invulnerable inside a telegraph as a Close Call (`combat.js:581`), so dash-standing in a boss circle chains Flow indefinitely. | Cap cooldown reset to once per ~8 s, require ≥ 1 s between Flow retriggers, and forbid invuln-based Close Calls from chaining. |
| GM-4 | medium | `perks.js:279-287`, `:226-231` | **Wagers cost nothing.** A Wager ("take one for free with your life as the stake") is converted to a permanent perk on *any* `scene:changed` to town. Buy the wager, walk into the dungeon, open a town portal: won. One per act. | Resolve only after a depth gain / boss kill / N kills; or on the next *stairs-down* from the wager depth. |
| GM-5 | medium | `data_skills.js:427-431`, `stats.js:81-85,191-194` | `allSkills` (affix 1-2, uniques 2-3, relics +2 combined, perks) is added to the rank and `skillValues` is linear in rank with no clamp, so a rank-5 skill becomes rank 13-20 (measured 18-20 on a unique-heavy level-40 kit: Bash 312 % → 676-732 %). Cooldown `cd[1]` is negative for some skills and the result is only clamped at 0 — the skill can reach 0 s cooldown. | Clamp `rank + allSkills` to `maxRank + K` (K≈3-5) or use diminishing returns; clamp cooldown at a floor (≥ 25 % of base). |
| GM-6 | medium | `player.js:892-894` | **Taps are discarded while the stick is held** (`ctl.intent = null` every frame the stick is active). The engine forwards taps made with the other thumb (`input.js:59-73`) and the game wipes the intent the same frame, so tap-to-loot, tap-an-NPC, tap-a-chest only work with the stick released — against pillar 2 (speed). | Keep `item/prop/npc/stairs` intents while the stick is held (clear only `move`/`attack`), and execute them when within reach. |
| GM-7 | medium | `echo.js:131-149`, `:139` | **Echo is a speed bump late.** Life is `max(2.5 × your hpMax, 0.9 × a legendary)` (≈ 7-9 k at level 40 vs a normal monster's 19 k at depth 40) and its damage is a fixed 0.8× legendary swing; one unique-kit hit kills it. It also only has a kit for the 4 existing classes (`KIT`, `echo.js:78-96`: skill ids): a new class's Echo can only auto-attack. | Size Echo's life from *your damage output* (time-to-kill target ~ 15-20 s), use the player's real weapon DPS and skills; build the KIT from skill metadata (`sk.tg`, tags) instead of a hand table. |
| GM-8 | medium (perf) | `lockdown.js:50-53`, `:140` | A wave spawns up to ~10 monsters and each tries up to 12 candidate tiles with `W.path(p→spot, 800)`: ≈ 100 A* runs in one frame at every wave start, then another per live wave monster every 2 s. On an old phone that is a visible hitch exactly when the fight starts. | One flood fill from the player over the collision grid, then pick candidates from the reachable set. |
| GM-9 | medium | `combat.js:375-377` | **`corpse_blast` (mythic) deals 25 % of the dead monster's own max HP** to everything within 2.5 tiles (`raw: t.stats.hpMax * 0.25`). Damage scales with monster HP, so it never goes out of date with depth and chains: a 4-corpse pile deletes anything beside it. Same shape in the Necromancer perk chain (`n_black_flow`: 144 % per corpse). | Cap at a multiple of the player's hit (e.g. 100 % of an average hit) or of the *killer's* damage, not of the victim's life. |
| GM-10 | low | `pillars.js:239`, `perks.js:60,141` | Heat: 35 % of kills drop an ember, cap 10 (15 with Pyre Heart), worth ×1.40/×1.60 damage and +50-75 % magic find. In any dense fight it sits at cap permanently; the "knock out half on a big hit" rule (`> 8 %` of life) rarely triggers late because hits are small relative to life. | Make Heat decay faster with damage dealt; or fold it into the temporary-damage cap (§6). |
| GM-11 | low | `player.js:625`, `:598-611` | `input:longpress` listener and `game.openPileAt` are dead (nothing emits it; the LOOT button hold in `hud.js` replaced it). | Delete. |
| GM-12 | low | `campaign.js:254,582` | `game.dashCount` is `undefined` until the first `scene:changed`, so `dashCount++` is `NaN` for a freshly loaded module (harmless: reset on scene change). | Initialise at definition. |

Verified OK (no action): perk stat application is idempotent (`recomputeStats` rebuilds from `p.perks` each time; `stats`/`statsPost` run once each); respec clears `p.perks` and recomputes (lingering timed effects such as `tactician`/`kite` expire in ≤ 8 s); `endSlow()` runs on `scene:changed`, `player:died` and by a real-time fallback (verified the timer also survives a pause); module-level state (`flow`, `heat`, `embers`, `wisps`, `rifts`, `zones`, `bargain`, perk `state`, `ctl`, `stillT`, lockdown `lock`) is reset on every scene change; the load path resets `effects`, `cooldowns`, `sealed`, `dead`.

## 2. Cross-team mismatches

- Calls that exist and work: `items.getEquipmentMods/getWeapon/classPenalty/getActiveEffects/getRelicEffects/dropLoot/grantTome/grantRelic/hasRelic/pickup/pickupPile/getPile/lootFilterAllows/migrate`, `world.*` (11 functions), `meta.getMilestoneMods`.
- `game.grantMark` — called by `ui/milestones.js:112`, **does not exist** (Marks come from `perkFeat`); milestone Marks are lost.
- `STORY.CLASS_GOALS` ids (`warrior_stagger` …) vs `game.CLASS_GOALS` ids (`w_charge_stun` …): different sets, no consumer (ui.md §2).
- `player:died { noRetrieve }` carries no cause; UI wants `cause` (`ui/r16.js:23`).
- Events with no listener: `boss:blackout`, `echo:rise`, `scavenger:race`, `flow:start` (deprecated alias, DESIGN Q5), `loot:dropped`; listened but never emitted: `input:longpress`, `room:wave`. DESIGN §13 documents `boss:blackout` for the engine/audio (ducking) — no consumer.
- Shapes: `getClassAction()` is read by three consumers with three tolerant parsers (hud, render, tips); `getLockdown()`/`getExplored()`/`getEvent()` are read defensively by hud with many alternative field names (`hud.js:807-824`) — the "tolerant reader" habit is what lets real mismatches (`canEquip`, `grantMark`) survive.
- `map._reward`, `map.mods`, `map.pallorUp`, `map.campUsed`, `map.revealed` are attached to the map object by game code; fine (maps are not saved) but undocumented in DESIGN's map shape.

## 3. Save safety

- Player save fields added by game: `perks, feats, wager, wagerCredits, style, minions, featCount, marks(UI fallback), bonus (derived), stats (derived)`; flags: `classGoals, fallenSlain, perkWagerAct, perkRespecAct, relics, worldBossKilled, riftCoreTouched`. All plain JSON.
- Growth: `p.style` has one decaying number per skill id (bounded) but every action multiplies *every* numeric key by 0.99 (`echo.js:20`) — values drift to denormals, harmless. `flags.classGoals` bounded; `corpse.echo` embeds a full equipment snapshot (≈ 5-10 KB) in the save (unneeded once the Echo is slain: clear it).
- `p.minions` (counts) persists; minions are re-raised on dungeon entry from counts — consistent with `skills`.
- Missing migration: the writing pass may rename perk and class-goal ids (`flags.classGoals`, `p.perks`, `p.feats` are keyed by id; class-goal ids are first-letter-derived, §5). There is no perks version; an unknown perk id in a save is silently ignored by `perkStats` (`d && d.classId === p.classId`) but still occupies its tier slot in `legal()`.

## 4. Performance on old iPhones

- Update loop is disciplined: `game.live.foes/allies` reused arrays; monsters beyond 17 tiles are not simulated; repaths budgeted at 3/frame; LOS cached 0.25 s.
- Hot spots: (a) each hit emits `fx:spawn`, `fx:text`, `sfx` (three `G.emit` → three listener-array copies, plus a canvas per damage number in the engine, engine.md EN-5); AoE casts on 50 targets ⇒ 150 events; DoT ticks every 0.5 s per afflicted monster. (b) `recomputeStats` runs on every `addEffect` with `mods` and on expiry (Heat/Midas/Close Call/stacks): measured 0.02 ms on desktop but allocates two 41-key objects plus the milestone/collection tables each time, and emits `player:stats` (UI dirty flags). (c) `K.around`/`arc` allocate per swing. (d) GM-8. (e) `getActionMode` scans foes + all ground items every 0.1 s (fine).
- `MAX_MONSTERS = 80` counts corpses for 8 s (`ents` loop includes them); mass-kill AoE keeps the entity array and engine draw list large for 8 s — shorten corpse life when `ents.length > 120`.

## 5. Hard-coded class assumptions (new classes, two at a time)

Break-points found (add a row to your class checklist for each):
- `stats.js:10` `MARTIAL = { warrior, ranger }` (decides cast-speed vs attack-speed GCD, weapon-based vs `aps×0.75` damage, `info.js:240` verdict maths); `stats.js:13` `RANGED` (bow/staff/wand) — a crossbow/spear class needs both.
- `stats.js:401-402` `SKILL_NEEDS_CLASS_WEAPON` is a list of *skill ids*; `echo.js:78-96` `KIT` is a list of skill ids; `data_skills.js:531+` `BUILDS` (auto-build) and `perks.js:344-357` `PLANS` are per class; `perks.js:121` `ELEM` regex over skill ids.
- **`classgoals.js:39,77` builds ids from `classId[0]`**, and perk ids are hand-prefixed (`w_`, `r_`, `s_`, `n_`). Any new class sharing a first letter with an existing one (Rogue/Ranger, Shaman/Sorcerer, Warlock/Warrior, Ninja/Necromancer…) collides in `PERKS` (global table: silent overwrite) and in `flags.classGoals`. Use the full class id.
- `classgoals.js:100,111` special-case `warrior`/`necromancer`; `fallen.js`/`campaign.js` Fallen carry a `classId` of the four classes; `core`/`items`/`story_data` as listed in items.md §5 and ui.md §2.
- `player.js:313` `CLASSES[c].action` has kinds `charge|roll|blink` only; `K.leapTo`/`graveSwap` are special-cased by class perks; a class with no `action` hides the dash button (`getClassAction` returns `null`; the UI handles it).
- Assets: `sprites/<classId>_base`, `portraits/<classId>`, class icons, `mat_cls_<class>` (items) — see engine/items.

## 6. Damage: every multiplicative source, and where it stacks without limit

Final player hit (`combat.js:187-244`):

`hit = (weaponRoll + flat dmgMin/Max) × [casters: aps×0.75] × pct/100 × (1+dmgPct) × offClass × (1+skillDmgPct)[skills] × Π(effect.dealt) × vsChilled × shatter ×1.5 × rampingFire × crit(1+critDmg) × Π(perk.dmg) × (1+elem_type)` **plus** `Σ flat elemental (fire/cold/lightning/poison) × pct/100 × the same scale` (so flat elemental is also multiplied by skill %, crit and every factor above).

| Source | Where | Cap? | Level 20 (measured kit) | Level 40 (measured kit) |
|---|---|---|---|---|
| Weapon curve | `bases.js:20` | no | avg hit 88-102 | 210-305 |
| `dmgPct` bucket (additive inside): primary stat +1 %/pt (3 pts/level), weapon/jewel/glove affixes, **uniques (60-150 % each, not ilvl-scaled)**, Battle Shout 15-35, shrine +40, Midas ≤ +50, Hoarder ≤ +60, Berserker's Oath +40, milestones/collection/relics (+1…+25), awakenings +8/14/22 per item | `stats.js:111` | **none** | naked 48 % → rare kit 77-169 % → unique kit 84-306 % | naked 88 % → rare kit 191-320 % → unique kit 282-670 % |
| `skillDmgPct` (skills only; all classes) | affixes (caster/focus), staff/wand/orb implicits, uniques 25-90, Glass Cannon +35, Lone Lich +50 | none | 0-140 % | 0-169 % (warrior) / 116-122 % rare kit, **413-425 % unique kit (sorcerer)** |
| Crit: chance cap 75 %, `critDmg` = 50 + gear, **uncapped** (affix 60, uniques 60-100, perfect diamond +45/socket, Fury bloodstone +90, awakenings +40, relic +10) | `stats.js:114-115` | chance only | critDmg 79-241 | 85-299 (×1.9-4.0 on a crit; Flow makes it guaranteed) |
| Flat elemental ×(pct × scale) | `combat.js:213-217` | none | +46-247 (weapon avg 53-102) | **+177-635 (weapon avg 157-305)** |
| `allSkills` → rank extension | `stats.js:81`, `data_skills.js:427` | none | +0-1 | **+13-15 ⇒ rank 18-20; pct ×1.8-2.2** |
| Attack/cast speed % | `player.js:112` | none | +10-38 % | +42-56 % attack, +27-50 % cast |
| `dealt` effects (each multiplies): Heat ×1.4 (10) / ×1.6 (15); Close Call ×1.45 (3×15) / ×1.75 (Glory Hound); Warlord ×1.15; Tactician ×1.32; Rotation ×1.15; hunter_mark ×1.12; Glass Heart bargain ×1.6; mythic blood_price ×1.4 (skills); ramping fire +45 % | `combat.js:200` | none | typical ×2-2.5 | typical ×2.5-3.5; all-in ×6 |
| Perk `dmg` hooks (each multiplies): Warrior Edge Discipline ×1.12, Executioner's Eye ×1.3, Crushing Blows ×1.4, Brute Force ×1.3 (basics), Counterweight ×2; Ranger Deadeye ×2 (far crits), Sniper's Nest ×1.4, Lone Wolf ×1.3, Long Draw ×1.2, Fletching ×1.2, Running ×1.15, Mark ×1.12, Quiver ×1.2; Sorcerer Kindling/Permafrost ×1.15, Battery ×1.1, Overload ×1.3; Necromancer Lantern ×1.2 | `perks.js:392` | none | ×1.1-1.6 | ×1.5-3 conditional |
| Status riders: shock +20 % taken, Curse Ink +10 %, Amplify +15 %, Hexing, class combos (shatter ×1.5), DoTs inherit the (already scaled) hit | `combat.js:160` | per effect | ×1.1-1.3 | ×1.2-1.6 |
| Mythic chains: `corpse_blast` 25 % of victim max HP (GM-9), `chain_spark`, `thunderstep` 200 % zone every 4th basic, `legion` double, `echo_cast` 25 % free recast, `executioner` kills < 15 % life (5 % bosses), Midas +5 %×10 stacks | `combat.js`, `player.js` | none | — | — |
| Permanent extras (milestones, 47 collection pages, 10 relics, 12 class goals, tier bonuses) | `PERM_MODS` | none | +5-15 % dmgPct | +30-60 % dmgPct |

Measured per-hit damage of a level-appropriate active skill at rank 5 (Bash / Fire Bolt / Aimed Shot), gear = best-by-Power of 500-900 magic-quality rolls per slot (a diligent but human gear set). Columns 2-4 are one hit without crit; the last column is expected value including crit chance/damage:

| Class, level | Naked | Rare kit | Rare kit + perfect gems | + best unique in every slot (EV) |
|---|---|---|---|---|
| Warrior 20 | 51 | 2,097 (×41) | 1,863 | **3,726** (×73) |
| Sorcerer 20 | 38 | 2,093 (×55) | 2,609 | 3,790 (×100) |
| Ranger 20 | 50 | 1,576 (×32) | 2,132 | 2,877 (×58) |
| Warrior 40 | 111 | 7,887 (×71) | 9,306 | **143,706** (×1,295) |
| Sorcerer 40 | 78 | 12,425 (×159) | 13,156 | 127,914 (×1,640); 182,821 with crit gems |
| Ranger 40 | 104 | 8,688 (×84) | 5,646 | 202,533 (×1,950); 266,578 with crit gems (crit chance hits the 75 % cap) |

Monster life at depth = level (`createMonster`, normal/champion/rare/legendary/boss): d20 1.25 k / 2.75 k / 6.6 k / 7.5 k / 158 k; d30 5.5 k / 12 k / 19 k / 33 k / 932 k; d40 19 k / 42 k / 67 k / 116 k / 4.05 M; d50 59 k / 129 k / 206 k / 353 k / 14.7 M. Monster hit (avg): d20 60 (boss 210), d40 595 (boss 1,759), d50 1,555 (boss 4,969) against 1.3-1.7 k life at level 20 and 2.7-3.7 k at level 40.

Reading: on-level, a level-20 character with ordinary rares one-shots normals (1.25 k) and needs ~75 hits for a boss; with uniques in every slot plus Heat/Close Call it one-shots champions and rares and kills a boss in ~15-20 hits. At level 40 a rare kit needs 460 hits for a boss but a unique kit 28 (≈ 9 with buffs) while normals/champions/legendaries die in 1 hit. The lead's "bosses in 3-4 hits" is ≈ 2-3× above this model, i.e. real saves also stack awakenings (+44 % `dmgPct`/item at 5,000 kills), corrupted upside rolls (1.5×), bloodstones, relics and collection/milestone buffs on top. Defence is capped (resists 75, armour 75 %, dodge/block 60) but boss hits at depth 40 (≈ 1.8 k ×1.9 for telegraphed moves) against 3.6 k life make bosses lethal while trash is irrelevant — the asymmetry to fix.

**Recommended structural changes (for the balance session)**
1. Make flat elemental an *added-damage* term applied at 100 % of the basic hit (or √pct), not × skill %, ×crit × every buff.
2. Clamp `rank + allSkills` to `maxRank + 3`; floor cooldowns at 25 %.
3. Soft-cap `dmgPct` and `critDmg` (e.g. diminishing above 300 %/250 %); scale unique percent stats with item level the way `D.flatScale` scales flat ones, or raise the unique `min` levels (Oathkeeper 60-90 % at ilvl 8).
4. Replace per-effect `dealt` multipliers with one "temporary damage" bucket (sum, cap +100 %); make perk `dmg` hooks add into the same bucket or cap their product at ×2.
5. Remove victim-HP-based damage (`corpse_blast`, Black Flow).
6. Rate-limit Flow retriggers/cooldown resets (GM-3); decide whether Heat should persist at cap.
7. Re-fit monster HP/damage growth to the new budget: today HP ≈ ×15 from d20 to d40 (`hpScale` 62→ 963 per base HP) while the gear-driven hit grows ×30-60 for unique kits.
8. Add the missing sinks: potions heal 40 % + 12 % regen per 3 s (≈ 17 %/s of max life) for 8+3L gold with a 20-potion belt — effectively unlimited sustain when gold is plentiful.

## 7. Dead code, duplication, methodology gaps

- Dead: `input:longpress` handler, `game.openPileAt`, `perkLootRolls` caller (GM-1), `STORY` keys without consumers (ui.md), `flow:start`.
- Duplication: three damage-spec shapes (`playerHit` spec, `addZone` player zone with `pct`, projectile `spec`) copy-modified in `echo.js`/`bosses.js`/`campaign.js`; every perk re-implements `heat()`/`classWeapon()`; `heatStacks` reads `bonus.heatMax` in two places.
- `tests/combat.html` bot differs from a human in ways that hide exactly the problems above: it picks the nearest enemy and holds attack, uses skills in rotation off cooldown, **sells all loot** and equips by `isUpgrade` (no sockets/gems/corruption/awakening/relics/collection/milestones/perks beyond auto-build), has perfect telegraph avoidance (high Close Call/Flow rate for free) or none (`slow` bot), sets `unstick` after 8 s ("the bot is not a pathing test"), steps at fixed 1/30 s with no input latency, never uses the chute/stash/gamble/forge, caps at depth 20 by default, and balances at "gear that really dropped" — not the 5,000-kill, fully-socketed late save that produces the reported one-shots. Use §6's synthetic kit builder (50 lines) as a second harness: best-of-N gear per slot at levels 20/30/40/50, report hits-to-kill per rarity.
- `tests/all.html` verifies save → reload → Continue equality on a fresh build only; no old-save fixtures (perk ids, classGoals ids, `corpse.echo`).
