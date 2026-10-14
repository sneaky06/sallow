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
