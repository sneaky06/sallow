# Combat & Classes — Revision 5 hand-over (append to docs/handover/combat-handover.md)

Status: tests/combat.html → 379/379, 0 console errors. Real index.html driven 2,400+ frames at depth 41 / Pallor 100 with
every deep modifier live: 0 errors from src/game. New file: src/game/deep.js (manifest: after mods.js).

## R5.2 Pallor
- `G.game.getPallor() → { value, tier 0..4, effects: [text] }`; reads 0 while `state.flags.pallorUnlocked` is not true.
- Gain: +10 per floor entered **by the stairs down** (+15 past depth 30, +20 past 40), cap 100. Waypoint/portal/corpse-run
  entries add nothing. Town (any `scene:changed` to town, incl. respawn) resets to 0.
- Mechanism: player.js sets `G.game.pallorStairs = 'stairs_down'` around the stairs `object:interact` emit; spawnMapEntities
  calls `game.notePallorFloor(map)` first, so the new floor's monsters already see the new value.
- Tiers (min value): I 10, II 30, III 60, IV 90. Monsters +10/20/35/50% life, +5/10/16/24% damage. II+: rares and legendaries
  +1 modifier (IV: +2; champions unchanged so packs still share one). III+: 12%/25% of normal monsters are **Pallid**
  (hits apply `bleach` 4 s: no life regen, healing halved). IV: a legendary on every non-boss floor.
- Tier-up toast on arrival ("Pallor II — the colour drains. …"). `dropLoot` opts carry `pallor` (0–100) from kills, chests,
  barrels and the lockdown reward. Loot quantity/quality/bleaching is the items team's.

## R5.5 Deep-only pools and caster pressure
- Monster modifiers (`AFFIXES[k].deep`, `.min`): Gravewalker, Siphoning, Devouring (21+), Arcing, Hexing (31+), Duplicating,
  Undying Pact, Time Warp (41+). `G.game.DEEP_AFFIX_IDS`, `deepAffixes(depth)`, `affixPool(depth)`. Not in AFFIX_IDS.
  Rares/legendaries lead with a deep one 60% of the time from 21; champion packs draw from the full pool.
- Floor modifiers (`FLOOR_MODS[k].deep`): Restless Ground, Hexed Glyphs, Warded (21+), Restless Dead, Riven (31+), Blood Moon,
  Thin Veil (41+). Past 20 a deep one usually leads; past 30 every floor has ≥ 1; past 40 up to 3.
- `G.game.wisps` = [{ x, y, t, … }] — remains of Gravewalker / Restless Dead kills; walk over within 3 s to lay them to rest
  (+3% life/mana) or they rise (60% life, no loot). Announced with pulsing `ring` fx; engine may draw them.
- Hexed Glyphs are enemy trap zones in `G.game.zones` (`glyph: true, trap: true, faction: 'enemy'`); stepping near flares
  them (0.75 s telegraph) then they burst.
- Caster pressure (all depths, never at melee range): shooters target whoever stands furthest back (summoners behind
  skeletons); from depth 3 a shooter marks a target that has stood still 1.2 s at 5+ tiles (red ring) and fires a heavy
  shot at the spot; new common modifier **Siege** shells a still target at 4+ tiles. Bosses: mark a still target at 5+
  tiles every 3 s and fire a fast 3-orb volley at the spot; abilities go for the player even while a golem taunts (the
  golem still holds the swings); boss adds hunt the player; bosses deal 2.5× damage to summons; Life Drain heals 20%
  (was 40%) as much on bosses.
- `G.game.stillT` = seconds the player has stayed within ~0.8 tiles.

## R5.6 Piles
- Tapping any ground item that has a `pileId` walks to it; on arrival: one item (gold aside) → everything picked up; several →
  the pile's gold is taken and `pile:open { pileId }` is emitted. Attack button with nothing to fight does the same for the
  nearest pile. Auto-pickup of gold is unchanged (gold is its own ground entry).

## Close Call (pitch, built)
- Standing in an enemy telegraph (r ≥ 1.2) during its last 0.6 s and being outside when it lands: effect `close_call`
  (+15% damage per stack, max 3, 5 s), every skill cooldown −1 s, "CLOSE CALL" text + teal ring + sfx swing.

## Small fix
- A hit fully soaked by an absorb (Bone Armor, Warded) no longer chips 1 damage; shows "Absorbed".

## Harness
- `runMatrix({ reps, maxDepth, pallorFrom })` in tests/combat.html?real=1 → window.__matrix.text (class × mode table incl.
  hp-only potion split). `runProgression` takes `pallorFrom` (unlock at that depth, later floors count as stairs, death resets).

## Balance (runMatrix, real world + items, after the movement change) — final build
Depths 1–20, 24 runs per class × mode; potions per boss kill (hp + mana; "hp" = hp only):
warrior/single 3.4 (hp 1.7) · aoe 5.5 (1.4) · balanced 4.9 (2.0)  → warrior 4.6 (hp 1.7)
ranger/single 4.7 (2.8) · aoe 4.4 (2.9) · balanced 5.0 (3.1)      → ranger 4.7 (hp 3.0)
sorcerer/single 2.6 (1.6) · aoe 3.6 (2.9) · balanced 3.1 (2.6)    → sorcerer 3.1 (hp 2.4)
necromancer/single 2.2 (1.6) · aoe 3.4 (3.0) · balanced 2.6 (2.3) → necromancer 2.7 (hp 2.3)
Noise: identical code moves a class average by ±0.5 at 12 runs; use ≥ 24.
Warriors' total is mostly mana potions (≈3 of 4.6); on hp potions alone casters now drink more than warriors.
Depths 21–30 with Pallor from 21 (4 runs each): every class reaches 30 (one sorcerer/aoe run walled at the depth-10 boss);
Pallor tops out at 90 by depth 30; most deaths are at the depth-30 boss at Pallor IV (by design: push your luck).
