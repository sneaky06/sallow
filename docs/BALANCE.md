# Sallow — balance pass R18

Owner: balance session, 2026-10-17. Scope: numbers and damage/stat formulas in `src/game` and `src/items` (no content removed, no save
fields removed). Harness: `tests/balance.html`. Design summary: `docs/DESIGN.md` §5 "Difficulty curves" and "Damage pipeline".

## 1. Result in one table

Typical on-level gear, average play, mean over the 4 classes × 3 auto-build styles, 6 kits per row (see §2 for what that means).
"Hits" = casts of the build's main skill to kill a normal monster; fight times include the average player's uptime.

| depth = level | hits normal | pack of 6 | 3 champions | rare | legendary | act boss | careless death in a pack |
|---|---|---|---|---|---|---|---|
| **target** | **3–5** | a few s | **10–20 s** | **10–20 s** | **30–45 s** | **45–90 s** (Hearthking 2–3 min) | **a few seconds** |
| 10 before → after | 2.1 → **5.0** | 3.1 → 7.6 s | 5.6 → **14.0 s** | 4.4 → **14.0 s** | 10.6 → **36.8 s** | 117 → **82 s** | 25.0 → **4.5 s** |
| 20 before → after | 1.5 → **3.4** | 1.8 → 4.1 s | 3.3 → **9.7 s** | 4.7 → **15.4 s** | 9.0 → **34.9 s** | 138 → **64 s** | 25.1 → **4.3 s** |
| 30 before → after | 4.1 → **4.9** | 3.7 → 4.8 s | 7.4 → **15.3 s** | 6.3 → **13.7 s** | 12.6 → **35.5 s** | 383 → **161 s** (Hearthking) | 17.7 → **6.3 s** |
| 40 before → after | 6.3 → **4.9** | 4.7 → 4.4 s | 10.3 → **15.0 s** | 9.4 → **14.4 s** | 18.1 → **36.8 s** | 513 → **80 s** | 13.6 → **6.5 s** |
| 50 before → after | 8.3 → **4.9** | 6.1 → 4.2 s | 14.9 → **16.1 s** | 14.2 → **16.2 s** | 24.3 → **36.7 s** | 925 → **92 s** | 3.8 → **3.8 s** |

- **Skill reward:** a skilled player (Heat 7, a Close Call every 2.5 s with Flow, more time attacking) clears packs 42–46%, elites
  47–49% and bosses 46–49% faster (the Hearthking 55%: skilled players use the exposed Ember). Before: 39–64%.
- **Parity** (each build against the mean of its own style; single-target builds on a single target, group builds on a pack of 6,
  balanced builds on a mixed encounter): 37 of 60 class × style × level cells within ±15%, 55 within ±25%, worst 38% (before: 16 of 60
  within ±15%, worst +213%). §6 lists the remaining outliers.
- **The lead dev's case** (a geared Warrior from level 20): the "strong" kit below is a late, diligent save — Elite uniques in every
  slot, best gems, +15–45% permanent damage. Before it one-shot normals at 20 (0.5 hits), killed legendary monsters in 3 s and bosses in
  46 s while standing in a pack for 57 s. After: 1.8 hits, 16 s legendaries, 29 s bosses — and that kit is ~2× a typical one, not 3–4×.

## 2. Method (`tests/balance.html`)

- **Real code.** The page loads the real `src/items` and `src/game` modules (via their manifests) on a flat stub arena (no props, no
  floor modifiers, Pallor off). Fights run through `game.update` at 30 steps/s with real skills, projectiles, zones, minions, perks,
  mythics, Heat embers and Close Calls.
- **Characters.** For each class × auto-build plan (`single`, `aoe`, `balanced`) × level: a new hero levelled with the plan (skills,
  attributes 2 primary : 1 vitality, perks), at depth = level (monsters are depth-only since R14).
- **Kits (synthetic best-of-N).** Per slot the best by Power of N real `rollItem` drops at item level = character level, weapons and
  off-hands of the class's types, a 2-hander when it beats 1-hander + off-hand, two rings. *typical*: N = 15, magic find 40, sockets
  filled with gems one tier below the best for the level — what an ordinary player wears on-level. *strong*: N = 80, magic find 150,
  8 Elite uniques per slot in the pool, best gems, +15/30/45% permanent damage at 20/30/40+ (collection, milestones, awakening).
  Every row averages 6 kits (different seeds); the kit does not depend on the build.
- **Stand-in player.** Holds attack, uses cooldown skills first, then the spammable skills (AoE ones when 3+ foes are up, single-target
  ones otherwise), weaving between equally suited ones; keeps one summon squad up; drinks mana potions below 30%. Never moves.
- **Measurements.** Main-skill damage per cast (direct hits only) against a normal dummy; DPS over 20 s (after a 4 s warm-up) against
  one elite dummy (rare, no resistances), one boss dummy (the floor boss's armour and resistances, `rarity: 'boss'` rules) and a pack of
  6 normal dummies (with 1-hp fodder dying every 2.5 s so corpses, embers and on-kill rules happen). Time to death: standing still,
  fighting back, no potions, among 6 real monsters of the depth's pool (or next to the floor's real boss) that cannot die.
- **Fight times.** Monster life from `createMonster` (60 pool-weighted samples per rarity, affixes included) and `createBoss`, divided
  by DPS × uptime (average 0.7 on elites/bosses, 0.8 on packs; skilled 0.85 / 0.9). Champions come as a pack of 3: time = 3 × life /
  max(ST, pack DPS / 2). Bosses: the Choir's Discord third (only the wrong-note voice can be hurt, it moves every 6 s) counts at 55%
  damage for average and 75% for skilled play; the Hearthking's phases II–III at 90% / 115% (the exposed Ember).
- **Skill profiles.** *average*: Heat 2, a Close Call every 15 s. *skilled*: Heat 7, a Close Call every 2.5 s (Flow chains, refunds).

**Limits of the model** (what to playtest rather than trust): the stand-in never moves, so perks that need movement (Ranger *Running
Shot*) never fire and perks that need standing still (*Steady Draw*, *Sniper's Nest*) always do; dummies never hit minions, so Necromancer
armies never die; boss mechanics other than the two above (adds, telegraphs you must leave) are folded into the uptime factor; the
"careless death" measure lets the hero fight back (life steal, on-hit effects) because that is what a careless player does.

## 3. BEFORE (R17, measured with the same harness)

Typical gear, average play:

| lvl | hits normal | pack(6) s | champs(3) s | rare s | legend s | boss s | TTD pack s | TTD boss s | blend spread | ST spread (single builds) | pack spread (group builds) |
|-----|-------------|-----------|-------------|--------|----------|--------|------------|------------|--------------|---------------------------|----------------------------|
| 10  | 2.1         | 3.1       | 5.6         | 4.4    | 10.6     | 117    | 25.0       | 17.2       | -46% / +65%  | -19% / +35%               | -45% / +67%                |
| 20  | 1.5         | 1.8       | 3.3         | 4.7    | 9.0      | 138    | 25.1       | 24.2       | -37% / +31%  | -13% / +7%                | -29% / +26%                |
| 30  | 4.1         | 3.7       | 7.4         | 6.3    | 12.6     | 383    | 17.7       | 5.6        | -61% / +163% | -25% / +30%               | -52% / +32%                |
| 40  | 6.3         | 4.7       | 10.3        | 9.4    | 18.1     | 513    | 13.6       | 5.9        | -72% / +285% | -57% / +53%               | -59% / +43%                |
| 50  | 8.3         | 6.1       | 14.9        | 14.2   | 24.3     | 925    | 3.8        | 2.7        | -85% / +352% | -66% / +128%              | -76% / +106%               |

Typical gear, skilled play:

| lvl | hits normal | pack(6) s | champs(3) s | rare s | legend s | boss s | TTD pack s |
|-----|-------------|-----------|-------------|--------|----------|--------|------------|
| 10  | 2.1         | 1.6       | 2.7         | 2.1    | 5.0      | 55     | 25.0       |
| 20  | 1.5         | 0.8       | 1.5         | 2.2    | 4.2      | 64     | 25.1       |
| 30  | 4.1         | 1.7       | 3.2         | 2.9    | 5.7      | 149    | 17.7       |
| 40  | 6.3         | 2.3       | 4.7         | 4.1    | 7.9      | 235    | 13.6       |
| 50  | 8.3         | 2.9       | 6.1         | 6.0    | 10.3     | 394    | 3.8        |

Strong gear (late save), average play:

| lvl | hits normal | pack(6) s | champs(3) s | rare s | legend s | boss s | TTD pack s | TTD boss s |
|-----|-------------|-----------|-------------|--------|----------|--------|------------|------------|
| 10  | 1.5         | 2.0       | 3.4         | 2.9    | 7.2      | 89     | 36.1       | 34.4       |
| 20  | 0.5         | 0.7       | 1.2         | 1.6    | 3.0      | 46     | 57.2       | 83.7       |
| 30  | 1.2         | 1.0       | 2.1         | 1.7    | 3.4      | 99     | 56.3       | 80.8       |
| 40  | 1.7         | 1.2       | 2.7         | 2.3    | 4.5      | 127    | 49.4       | 32.5       |
| 50  | 2.8         | 1.9       | 4.8         | 4.6    | 7.8      | 296    | 27.4       | 27.2       |

Per level (typical, average; `balCurve`): hits to kill, fight times, median time to death and the Warrior / Ranger+Sorcerer / Necromancer
spread of it:

| L | cast | hits | pack s | champs s | rare s | legend s | boss s | TTD median | Warrior | Ranger / Sorcerer | Necro |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 20 | 1.4 | 2.6 | 7.9 | 6.8 | 15.5 | 121 | 18.0 | 46.5/42.9/46.5 | 17.8/18.6/17.8/17.9/17.8/17.9 | 18.1/17.7/18.1 |
| 10 | 202 | 1.9 | 2.1 | 4.3 | 4.3 | 10.4 | 112 | 20.0 | 39.0/35.2/34.9 | 15.8/13.3/12.4/26.8/20.3/19.7 | 52.8/15.8/15.3 |
| 20 | 942 | 1.3 | 1.3 | 2.9 | 4.3 | 8.1 | 132 | 19.9 | 25.5/57.5/41.1 | 8.0/8.4/7.9/20.6/18.8/25.4 | 54.8/16.6/19.1 |
| 30 | 1772 | 3.4 | 2.3 | 5.2 | 4.3 | 8.6 | 305 | 12.8 | 7.6/54.5/14.2 | 3.2/12.9/6.8/3.7/12.8/9.9 | 42.3/23.2/26.9 |
| 40 | 3890 | 5.2 | 2.5 | 5.4 | 4.1 | 7.8 | 303 | 6.8 | 11.1/52.8/44.4 | 1.6/0.7/1.4/2.6/1.6/2.1 | 14.4/21.7/21.9 |
| 50 | 8370 | 6.3 | 2.2 | 4.7 | 3.4 | 5.8 | 393 | 1.0 | 2.5/7.2/7.8 | 1.1/0.9/1.0/0.9/0.6/0.6 | 0.6/1.5/8.0 |
| 60 | 14921 | 11.7 | 2.3 | 3.3 | 2.3 | 4.2 | 352 | 1.0 | 1.0/4.2/2.3 | 0.6/1.2/0.6/0.6/1.1/1.1 | 0.6/1.0/11.2 |

Bosses (typical gear, character level = depth; min / mean / max over class × build, seconds):

| depth | boss | life | avg hit | average | skilled |
|---|---|---|---|---|---|
| 5 | Morgrath the Gravelord | 12k | 65 | 67 / 95 / 144 | 29 / 43 / 62 |
| 10 | Skarn the Broodmother | 28k | 90 | 74 / 111 / 163 | 35 / 52 / 90 |
| 15 | Azgalor | 57k | 111 | 74 / 129 / 260 | 35 / 59 / 117 |
| 20 | Xal'thuun | 158k | 210 | 72 / 127 / 210 | 32 / 58 / 89 |
| 25 | The Choir | 361k | 383 | 107 / 238 / 395 | 53 / 93 / 144 |
| 30 | Oswin Marrow, the Hearthking | 932k | 742 | 117 / 328 / 655 | 72 / 129 / 243 |
| 35 | Morgrath II | 1.94M | 1,059 | 107 / 335 / 714 | 57 / 147 / 300 |
| 40 | Skarn II | 4.05M | 1,759 | 81 / 481 / 1,020 | 63 / 222 / 438 |
| 50 | Xal'thuun II | 14.66M | 4,969 | 132 / 938 / 2,290 | 92 / 413 / 980 |

Parity (like-for-like, % vs the mean of the same style; w r s n = Warrior Ranger Sorcerer Necromancer):

| lvl | single (elite dps) | group (pack dps) | balanced (mixed encounter) |
|---|---|---|---|
| 10 | w-4 r-21 s19 n6 | w19 r-35 s65 n-48 | w7 r-21 s42 n-27 |
| 20 | w-15 r3 s1 n11 | w28 r-30 s1 n1 | w-12 r6 s-10 n16 |
| 30 | w-40 r-27 s16 n51 | w-11 r-52 s38 n24 | w-49 r-42 s-9 n99 |
| 40 | w-62 r-51 s-3 n116 | w-25 r-58 s42 n41 | w-74 r-61 s-39 n175 |
| 50 | w-76 r-75 s-27 n178 | w-43 r-75 s9 n109 | w-82 r-83 s-48 n213 |

**Reading.** Typical gear one-shot trash to depth 20 and needed 6–12 hits past 40; elites were 2–5 s fights; a hero standing in a pack
lived 20–25 s at depths 1–25 (Warriors and Necromancers 35–60 s) and under a second past 45; bosses took 2–15 minutes. The audit's
stacking (§4) made strong gear 3–4× typical gear; the deep curve (R17 `DEEP_HP` ×4.6 at 50) overshot what typical gear can do.
Necromancer minions followed monster life, so the Necromancer doubled every other class past 30. Casters' skill damage multiplied on top
of damage %, so Sorcerers out-scaled the martial classes.

## 4. What changed and why

### 4.1 Stacking limits (structure before numbers)

| Change | Where | Why |
|---|---|---|
| **One permanent % bucket.** `dmgPct` and `skillDmgPct` are summed (skills) and soft-capped together: full to `100 + 3 × level`, half for the next 200, a quarter beyond (`game.SOFT`, `softCap`, `softKnees`). Elemental masteries (Fire Mastery, Withering) add into the same bucket for their damage type. | `stats.js` `recomputeStats`, `combat.js` `playerHit` | Gear, primary stat, uniques (60–150% each, not item-level scaled), relics, collection, milestones, awakenings all add here; a unique kit reached 670%. Skill damage was a second multiplier only casters could fill (Sorcerer ×2 deep). The knee rises with level because the primary stat alone adds ~2% a level. |
| **Crit damage** soft cap 150 / 250; **attack / cast speed** 50 / 100. | `stats.js` | Crit damage was uncapped (diamonds +45/socket, Fury +90, uniques). |
| **"+N to all skills" ≤ +3 ranks**; **cooldown reduction ≤ 40%**; no cooldown below half its rank-1 value. | `stats.js` `ALL_SKILLS_CAP`, `CDR_CAP`, `CD_FLOOR` | Measured ranks 18–20 (Bash 312% → 732%); negative per-rank cooldowns reached 0 s. |
| **Flat elemental is added damage**: it takes `min(skill%, 100%)` instead of the full skill %. | `combat.js` | +177–635 flat elemental at 40 was multiplied by a 300% skill, crit and every buff. |
| **One temporary bucket ≤ +100%**: all positive `dealt` effects (Heat, Close Call, Warlord, Tactician, Rotation, Glass Heart…), perk damage rules (`perkDmgParts`: excess over 1 adds, penalties stay multiplicative), Blood Price, ramping fire, vs-chilled. | `combat.js`, `perks.js` | Each multiplied separately (×2.5–3.5 typical, ×6 all-in, perk hooks ×1.5–3 on top). |
| **Additive within a category on the defence side too**: `taken` effects on a target sum; monster / minion / Echo `dealt` effects sum (`game.dealtMult`). | `combat.js`, `monsters.js`, `campaign.js`, `deep.js`, `echo.js` | Shock + curses + exposed Ember multiplied. |
| **Sustain limits**: life steal heals at most 2% of max life per second (`LEECH_CAP`); permanent regeneration soft-capped at 1% / 2% of max life per second (`REGEN_SOFT`; potions and shrines on top); armour cap 65% (was 75%); a blocked hit lands for 35% (was 30%); Warrior innate damage reduction 10% (was 15%). | `combat.js`, `stats.js`, `data_skills.js` | A strong Warrior out-healed a pack at any depth (regen 3% of life/s from stacked flat regen, leech scaling with AoE damage, armour at the cap): "enemies don't hit hard enough". |
| **Minions use your spell power**: `MINION_DMG × minionPower(p)` (weapon damage/s × 0.75 + flat, × your damage bucket). | `monsters.js` `createMinion` | Minion damage followed monster life, so every life retune moved the Necromancer with it (Necro +100–200% past 30). |
| **`corpse_blast`** deals 90% of your hit, not 25% of the victim's life. | `combat.js` | Audit GM-9: it never went out of date and chained. |
| **Close Call +10% per stack** (was 15%; Glory Hound 18%, was 25%). | `deep.js`, `perks.js` | With the bucket in place, skilled play was still ~55% faster; target 30–50%. |
| Items' upgrade verdict reads the uncapped sums (`player.bonus.raw`) and caps them the same way. | `items/info.js` | Upgrade arrows would otherwise over-rate rolls past the knee. |

Flow's retrigger and refund limits (`FLOW_GAP`, `REFILL_CD`) and the Wager/Shoulder Through fixes were already in from the audit round.
Heat is unchanged (4%/stack, inside the temporary bucket).

### 4.2 Curves refitted to the measured hero

- **Monster life** (`DEEP_HP`): the R17 steepening (`1 + 0.035 (L − 15)^1.3`) is replaced by ×1.8 easing to ×1.62 between depths 25
  and 40. Measured: on-level typical damage grows a little slower than the R5 life shape deep down, so the old steepening produced 6–12
  hits past 40 while trash took 1–2 hits to depth 20. Now 3 hits at depth 1–5, 4–5 from 30, ~5 at 55 and 6 at 60 (endgame).
- **Monster damage** (`DMG_CURVE`, log-linear anchors): fitted so a careless hero dies in about 4 s at every depth (3 s past 45). That is
  3.3× R17's hits at depth 10 and 2.5× at 20 (enemies hit much harder through the campaign), about the same at 30, and *softer* than R17
  past 35, where R17 killed Rangers and Sorcerers in 0.6–1 s (a coin flip, not a fight). Average monster hit, before → after: d10 31 → 103,
  d20 73 → 185, d30 292 → 336, d40 759 → 446, d50 1,901 → 936.
- **Elites** (`RARITY_MULT`): rare ×4.4 (was 3.5), legendary ×7.8 (was 6), and a depth term reaching +70% / +40% / +85% (champion /
  rare / legendary) by depth 32, because deeper heroes kill single targets faster relative to trash (more skills, procs).
- **Bosses**: `createBoss` life × `BOSS_HP` 0.5 (was ×1.35 × (1 + 3%/depth)), × `WORLD_BOSS_HP` 1.75 for the Hearthking; tier bosses keep
  +40% per tier, so the endgame bosses grow from ~65 s (35) to ~100 s (50).

### 4.3 Class and skill numbers (parity)

| Skill | Before | After | Reason |
|---|---|---|---|
| Bash | 200 +28 | 205 +30 | Warrior single/balanced trailed at 40 |
| Charge | 220 +32 | 260 +40 | same (few points in it from the plans) |
| Execute | 340 +50 | 400 +60 | Warrior single at 40 |
| Cleave | 150 +22 | 120 +17 | Warrior group build led all group builds |
| Battle Shout | +15 +5% | +20 +6% | Warrior balanced at 40 |
| Weapon Mastery | +8 +8% | +10 +10% | Warrior single deep |
| Aimed Shot | 170 +25 | 150 +15 | Ranger single/balanced led at 20–30 |
| Multishot | 85 +10 | 125 +16 | Ranger group build trailed |
| Rain of Arrows | 60 +10 | 70 +12 | same |
| Arrow Storm | 130 +20 | 240 +36 | same (group-only skill) |
| Fireball | 150 +22 | 140 +22 | Sorcerer group led early |
| Incinerate | 100 +15 | 80 +12 | Sorcerer single led at 40 |
| Glacial Spike | 360 +55 | 320 +48 | same |
| Overcharge | +5 +5% skill dmg, +3 +3% cast | +3 +3%, +2 +2% | same |
| Frost Nova | 110 +20 | 170 +30 | Sorcerer balanced trailed |
| Chain Lightning | 125 +18 | 150 +22 | same |
| Bone Nova | 95 +14 | 140 +18 | Necromancer group/balanced trailed early |
| Bone Spirit | 400 +60 | 440 +66 | Necromancer single deep |
| Skeletal Mage power | 100 +15 | 55 +9 | mages carried Necro balanced (+175% at 40) |
| `MINION_DMG` | (followed monster life) | 1.2 × spell power | see 4.1 |

## 5. AFTER

Typical gear, average play:

| lvl | hits normal | pack(6) s | champs(3) s | rare s | legend s | boss s | TTD pack s | TTD boss s | blend spread | ST spread (single builds) | pack spread (group builds) |
|-----|-------------|-----------|-------------|--------|----------|--------|------------|------------|--------------|---------------------------|----------------------------|
| 10  | 5.0         | 7.6       | 14.0        | 14.0   | 36.8     | 82     | 4.5        | 5.1        | -43% / +34%  | -14% / +13%               | -45% / +26%                |
| 20  | 3.4         | 4.1       | 9.7         | 15.4   | 34.9     | 64     | 4.3        | 6.5        | -32% / +52%  | -13% / +16%               | -14% / +20%                |
| 30  | 4.9         | 4.8       | 15.3        | 13.7   | 35.5     | 161    | 6.3        | 5.3        | -33% / +31%  | -18% / +16%               | -17% / +7%                 |
| 40  | 4.9         | 4.4       | 15.0        | 14.4   | 36.8     | 80     | 6.5        | 8.2        | -32% / +37%  | -19% / +34%               | -17% / +19%                |
| 50  | 4.9         | 4.2       | 16.1        | 16.2   | 36.7     | 92     | 3.8        | 4.6        | -32% / +36%  | -8% / +13%                | -29% / +13%                |

("blend spread" mixes single-target and group builds on one mixed encounter, so it is wide by design; the like-for-like table below is
the parity measure.)

Typical gear, skilled play:

| lvl | hits normal | pack(6) s | champs(3) s | rare s | legend s | boss s | TTD pack s |
|-----|-------------|-----------|-------------|--------|----------|--------|------------|
| 10  | 5.0         | 4.4       | 7.4         | 7.4    | 19.5     | 44     | 4.5        |
| 20  | 3.4         | 2.2       | 5.0         | 8.1    | 18.3     | 34     | 4.3        |
| 30  | 4.9         | 2.6       | 7.9         | 7.0    | 18.3     | 72     | 6.3        |
| 40  | 4.9         | 2.5       | 8.2         | 7.5    | 19.1     | 42     | 6.5        |
| 50  | 4.9         | 2.4       | 8.4         | 8.5    | 19.3     | 47     | 3.8        |

Strong gear (late save), average play:

| lvl | hits normal | pack(6) s | champs(3) s | rare s | legend s | boss s | TTD pack s | TTD boss s |
|-----|-------------|-----------|-------------|--------|----------|--------|------------|------------|
| 10  | 4.0         | 5.4       | 9.5         | 10.2   | 26.9     | 65     | 7.3        | 8.7        |
| 20  | 1.8         | 1.9       | 4.5         | 7.0    | 15.8     | 29     | 9.4        | 13.4       |
| 30  | 2.4         | 2.1       | 6.6         | 5.7    | 14.9     | 67     | 23.5       | 13.8       |
| 40  | 2.5         | 1.8       | 6.7         | 6.1    | 15.6     | 34     | 21.9       | 26.8       |
| 50  | 2.7         | 2.0       | 7.9         | 7.8    | 17.8     | 45     | 11.9       | 19.8       |

Per level (typical, average):

| L | cast | hits | pack s | champs s | rare s | legend s | boss s | TTD median | Warrior | Ranger / Sorcerer | Necro |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 16 | 3.1 | 6.0 | 18.4 | 19.9 | 46.7 | 102 | 6.7 | 15.7/13.9/15.7 | 6.7/6.1/6.7/6.4/6.1/6.4 | 6.7/6.7/6.7 |
| 5 | 60 | 2.7 | 3.6 | 11.9 | 15.4 | 33.7 | 77 | 4.3 | 8.5/8.0/7.2 | 3.1/3.5/3.7/2.3/3.0/2.4 | 5.7/4.8/5.7 |
| 10 | 142 | 4.8 | 5.3 | 11.1 | 13.7 | 36.1 | 81 | 3.4 | 8.4/7.0/7.3 | 3.3/3.4/3.0/4.0/3.3/3.0 | 5.2/3.4/3.1 |
| 15 | 279 | 4.0 | 4.2 | 14.0 | 14.7 | 37.1 | 73 | 3.2 | 6.1/6.2/6.2 | 3.0/2.8/2.3/2.8/2.2/2.4 | 4.2/3.3/3.8 |
| 20 | 550 | 3.0 | 2.9 | 8.3 | 13.9 | 31.5 | 61 | 3.8 | 6.0/7.4/7.1 | 2.9/2.6/2.2/3.4/2.3/2.5 | 8.6/4.2/4.6 |
| 25 | 806 | 3.6 | 2.8 | 9.5 | 10.2 | 27.6 | 65 | 3.3 | 5.3/5.6/6.5 | 1.7/2.2/2.1/3.5/1.7/1.9 | 3.5/3.2/8.9 |
| 30 | 1065 | 4.5 | 3.4 | 13.2 | 12.9 | 33.5 | 146 | 3.6 | 6.7/6.0/7.4 | 2.8/3.1/2.3/3.3/3.1/3.4 | 32.4/3.7/7.9 |
| 35 | 1634 | 4.5 | 3.2 | 10.7 | 15.7 | 33.5 | 61 | 2.4 | 7.0/5.6/8.6 | 2.7/2.0/2.0/1.5/0.9/0.8 | 2.9/2.1/5.9 |
| 40 | 2197 | 4.5 | 3.1 | 12.9 | 13.5 | 34.5 | 73 | 3.5 | 8.1/8.1/8.6 | 2.3/1.8/3.4/3.4/2.1/2.4 | 23.2/3.5/7.0 |
| 45 | 3231 | 4.6 | 3.1 | 13.0 | 12.2 | 35.4 | 76 | 3.2 | 7.4/7.0/7.2 | 3.3/3.2/2.9/1.9/0.7/1.1 | 7.2/2.3/4.1 |
| 50 | 4242 | 4.4 | 2.9 | 13.6 | 15.0 | 34.1 | 90 | 2.2 | 4.3/4.3/4.0 | 1.8/1.8/2.1/2.0/1.5/1.4 | 2.7/2.4/3.2 |
| 55 | 5701 | 5.1 | 3.2 | 13.9 | 14.9 | 43.2 | 97 | 3.2 | 5.2/4.4/5.3 | 2.0/2.1/2.4/3.9/1.5/1.7 | 11.2/3.4/3.0 |
| 60 | 7647 | 6.2 | 4.2 | 14.8 | 16.3 | 40.3 | 122 | 2.7 | 4.6/4.6/4.5 | 2.7/2.2/2.6/2.5/0.7/0.8 | 3.1/2.7/18.1 |

(The "boss s" column here is whichever boss `bossForDepth` gives at that depth; boss floors are every 5 depths.)

Bosses:

| depth | boss | life | avg hit | average | skilled |
|---|---|---|---|---|---|
| 5 | Morgrath the Gravelord | 6.7k | 175 | 41 / 80 / 124 | 23 / 41 / 61 |
| 10 | Skarn the Broodmother | 14k | 286 | 45 / 82 / 116 | 24 / 44 / 64 |
| 15 | Azgalor | 24k | 352 | 50 / 88 / 204 | 26 / 46 / 110 |
| 20 | Xal'thuun | 46k | 446 | 42 / 58 / 80 | 23 / 30 / 43 |
| 25 | The Choir | 72k | 549 | 56 / 76 / 112 | 26 / 34 / 48 |
| 30 | Oswin Marrow, the Hearthking | 228k | 740 | 101 / 152 / 257 | 42 / 67 / 112 |
| 35 | Morgrath II | 197k | 751 | 41 / 64 / 88 | 22 / 32 / 42 |
| 40 | Skarn II | 312k | 990 | 45 / 78 / 149 | 25 / 41 / 83 |
| 50 | Xal'thuun II | 729k | 2,197 | 80 / 103 / 148 | 42 / 53 / 69 |

Parity (like-for-like):

| lvl | single (elite dps) | group (pack dps) | balanced (mixed encounter) |
|---|---|---|---|
| 10 | w8 r-24 s1 n15 | w18 r-2 s22 n-38 | w15 r-4 s12 n-24 |
| 20 | w-1 r17 s-10 n-6 | w21 r1 s-11 n-10 | w11 r35 s-33 n-13 |
| 30 | w-7 r2 s8 n-3 | w3 r-17 s8 n5 | w-3 r17 s-17 n3 |
| 40 | w-16 r2 s12 n2 | w-1 r-17 s21 n-3 | w-19 r27 s-21 n13 |
| 50 | w-10 r-16 s10 n16 | w6 r-33 s21 n5 | w-6 r-5 s-9 n20 |

## 6. Known gaps (honest list)

- **Parity outliers beyond ±25%:** Necromancer group build at level 10 (−38%: its plan buys Corpse Explosion / curses / mastery before
  Bone Nova ranks, and Poison Nova only opens at 14); Ranger group build at 50 (−33%) and Ranger balanced at 20 / 40 (+35 / +27%) —
  partly the standing-still model (*Running Shot* never active for the group plan, *Steady Draw* always active for the balanced one);
  Sorcerer balanced at 20 (−33%: the plan has Chain Lightning and Frost Nova at rank 1 until ~25). These are plan-order effects more than
  skill numbers; fixing them means reordering `BUILDS` / `PERK_PLANS`, which I left to the lead.
- **Warriors are 2–3× harder to kill than casters** standing in a pack (by design: armour, block, innate reduction), so a careless Warrior
  lives 6–8 s on-level where a Sorcerer lives 2–3 s. One Necromancer build (summons tanking) lives 20–30 s in some bands.
- **Strong gear is still ~2× typical** (hits 1.8–2.7, bosses 29–67 s) and a strong Warrior lives 20+ s in a pack at 30–40 (life + block +
  resist caps). That is "forgiving on the grind"; if it still feels soft, the next levers are `ARMOR_CAP`, `BLOCK_TAKEN`, `REGEN_SOFT`.
- **Endgame squishies** (Sorcerer/Ranger past 45) can still die in about a second in a pack of 6 — the endgame is meant to be very hard.
- **Not covered by the harness:** Pallor (+10–50% monster life and +5–24% damage on top), floor modifiers, Fallen fights (their life
  follows `hpScale`, so they got ~1.8× longer), the Echo (sized from your life and a legendary's — GM-7 is still open), lockdown waves,
  potion economy.

## 7. What the lead dev should playtest

1. **Warrior, levels 18–30, your own save.** Trash should take 2–4 hits with your gear (it was 1), legendary monsters ~15–20 s, a boss
   30–60 s. Stand in a pack once on purpose: you should be in trouble within ~10 s (it was 30–60 s).
2. **Depths 1–10 on a fresh character** — enemies now hit ~3× harder than R17 there; check that the first boss (depth 5) and the first
   Fallen (Brannoc, depth 9) are hard but fair, and that potions (40% + regen) keep up.
3. **The Hearthking** (depth 30): target 2–3 minutes; check the Ember window still matters (miss 8% in 3 s → he heals 6%).
4. **The Choir** (depth 25) Discord phase: the harness can only guess how much of it you spend chasing the wrong-note voice.
5. **Close Call / Flow feel** at +10%/stack: still worth chasing?
6. **Necromancer** army: minions now scale with your weapon and damage %, not with the floor; check a fresh Necro with a poor wand is
   not stranded, and that late summons still matter.
7. **Endgame 45–60 as Sorcerer/Ranger**: deadly by design; check it is learnable rather than random.
8. **Character sheet**: Damage / Crit damage / speeds now show the effective (soft-capped) values; items' upgrade arrows read the raw sums.

## 8. How to rerun

1. Serve the folder: `powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8377` (or the `game` entry in `.claude/launch.json`).
2. Open `http://localhost:8377/tests/balance.html` and press **Run** (about a minute; `?auto` starts it). The page prints every table in
   this document (typical/average, typical/skilled, strong/average, stat lines, skill reward, bosses).
3. Narrow it with the query box: `levels=20,30&classes=warrior&modes=single&gear=typical&skill=avg&reps=6`.
4. Console helpers on that page: `await balQuick()` (like-for-like parity digest), `await balCurve('1,5,10,20,30,40,50,60')` (the
   per-level fit quantities used for `DEEP_HP` / `DMG_CURVE`), `balSkills(40)` (each skill of each plan alone).
5. To retune: monster life `game.DEEP_HP`, damage `game.DMG_CURVE` anchors, elites `RARITY_MULT` (`monsters.js`), bosses
   `BOSS_HP` / `WORLD_BOSS_HP`, stacking limits `SOFT`, `ALL_SKILLS_CAP`, `CDR_CAP`, `CD_FLOOR`, `REGEN_SOFT` (`stats.js`),
   `TEMP_CAP`, `LEECH_CAP`, `ARMOR_CAP`, `BLOCK_TAKEN` (`combat.js`), `CC_PER` (`deep.js`), `MINION_DMG` (`monsters.js`).
   For a before/after comparison, serve an untouched copy (`git archive HEAD | tar -x -C <dir>`, plus this page) on another port.

## 9. Test-suite changes (tests/all.html stays the gate)

Assertions updated because a number legitimately changed: `tests/combat.html` — armour cap (75% → `ARMOR_CAP`, 1000 → 350 through
infinite armour), block (70% → `1 − BLOCK_TAKEN`), Bash text (312% → 325%), Close Call (+15%/+30% → `CC_PER` / 2 × `CC_PER`),
`corpse_blast` (25% of the victim's life → 90% of your hit; the chain victim now has 30 life so the smaller blast still kills it), the
R14 depth-curve check (`DEEP_HP(30) > 2` → the R18 fit's shape), the hold-attack windows (8/12 s → 16/24 s) and the save-round-trip fight window (10 → 20 s; depth-1/3 skeletons have
~2× the life), and the minion fight (the stub hero gets an on-level weapon, since minions now hit with your spell power).
`tests/all.html` — the scripted run's "portal out and back" stage re-enters the floor first if the careless scripted hero died there
(it now dies more often, as intended). Result on this machine: 10/11 — the one failure is `ui-smoke.html` "holding a finger on a
pile opens its list", which fails identically on an untouched full copy of HEAD here (3 of 3 runs), so it predates R18.
