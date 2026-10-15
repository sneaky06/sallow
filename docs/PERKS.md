# Perk trees — proposal (R11, combat team, for the lead dev's approval)

Design only; nothing here is built. Skills (data_skills.js) stay as they are — perks sit beside them and change *how you play*,
not just numbers. Every perk below has exact values so it can be built as written.

## 1. How perks are earned — two currencies

**Perk points (steady):** 1 at level 5 and every 5 levels after (12 by level 60). An average player fills the core of one tree.

**Marks (skill):** earned by feats, each feat once per character. Marks buy the same perks as points, and are the only way to
afford the top tier of two trees. A great player ends with roughly twice the perks of an average one — visible, material reward.

| Feat (once each) | Marks |
|---|---|
| Clear a floor with grade S (1st, 5th, 15th S) | 1 each |
| Flow ×5, Flow ×8, Flow ×12 in one chain | 1 each |
| Kill an act boss without drinking a health potion (each of the 6) | 1 each |
| Hold Heat 10 for 20 s | 1 |
| Kill a Fallen without being hit by its signature move (each) | 1 each (up to 10) |
| Catch the Scavenger before he grabs anything (1st, 5th) | 1 each |
| Win a bargain floor (reach the stairs with the deal active) at Pallor III+ | 1 |

**Wagers (push your luck):** any perk can be *wagered* instead of bought — it costs nothing now but carries a stake: die before
the next town visit and it is lost (refunded as nothing). Reach town alive and it becomes permanent. One wager at a time;
the HUD shows a small candle while one is lit. This turns "one more floor?" into "one more floor with my new perk on the line?"

## 2. Layout (same for every class)

Each class has **three branches**, five tiers each, 3 perks per tier (one costs 1, two cost 2). A tier unlocks after spending
0 / 3 / 6 / 10 / 15 points+marks in that branch. A branch's tier-5 perk is a **Keystone**: a rule change with a drawback.

- **Craft** — the class fantasy, deeper (one skill tree's identity per tier).
- **Edge** — skill-ceiling perks keyed to dash, Close Call, Flow and Heat. Shared shape across classes, class-flavoured effects.
- **Crossroads** — cross-class gear and borrowed tricks (§3). Starts with the off-class weapon licence.

Readable in one screen: 15 nodes per branch, 45 per class, icons from the existing skill icon set.

## 3. Crossroads: off-class gear without the R8.7 penalty

Tier 1 of Crossroads is a **Licence** (cost 1): the class uses the listed weapon family with no −35% and its locked skills work
with it (`G.game.weaponLock` returns null). Tier 2+ adds tricks that only work while holding off-class gear — the trade-off is
that the class's own weapon-favoured perks (e.g. Warrior "Edge Discipline") switch off while you do.

| Class | Licence (tier 1) | Signature trick (tier 3) | Trade-off |
|---|---|---|---|
| Warrior | **Hunter's Grip** — bows and daggers | *Point Blank*: bow basic attacks within 2 tiles hit for +40% and knock back | −15% armour while a bow is held |
| Ranger | **Duellist's Hand** — swords and maces | *Riposte*: a dash through an enemy swing (Close Call) makes the next melee hit stun 1 s | melee basic attacks do not cleave |
| Sorcerer | **Battle-Mage** — swords, maces, daggers | *Spellblade*: every 3rd basic hit fires a free Fire Bolt (100%) | −20% mana regen while holding one |
| Necromancer | **Grave Archer** — bows, axes | *Bone Arrows*: basic shots that kill raise a skeleton (max +2, 15 s) | your summons take 15% more damage |

Armour: **no armour-weight penalty** (closes §15 #17). Instead each class has one Crossroads tier-2 perk about armour feel
(e.g. Sorcerer *Plated Robes*: chest armour +40% but −5% cast speed).

## 4. Notable perks per class (exact numbers)

### Warrior — "the wall that charges"
1. **Edge Discipline** (Craft 1): +10% damage with swords/axes/maces.
2. **Second Swing** (Craft 2): cleave secondary targets take 75% instead of 60%.
3. **Unyielding** (Craft 3): below 30% life, +30% damage reduction for 4 s (60 s cooldown).
4. **Juggernaut** (Craft 5, Keystone): Shoulder Charge has 2 charges and breaks stuns on use; your max life −10%.
5. **Shoulder Through** (Edge 1): Shoulder Charge passing through a telegraph that lands this instant counts as a Close Call.
6. **Iron Tempo** (Edge 2): each Close Call refunds 50% of Shoulder Charge's recharge.
7. **Avalanche** (Edge 3): during Flow, Ground Slam radius +1.5 tiles and it stuns 1 s.
8. **Forge Heat** (Edge 4): Heat stacks also give +3% armour each; a hard hit only knocks out a third (not half).
9. **Last Stand** (Edge 5, Keystone): at 1 life you get 3 s of invulnerability once per floor; Heat cannot exceed 5.
10. **Hunter's Grip** (Crossroads 1, licence) and **Point Blank** (Crossroads 3) — see §3.
11. **Shield Line** (Crossroads 4): holding a shield, frontal ranged hits are blocked 50% of the time.

### Ranger — "never where the claws land"
1. **Steady Draw** (Craft 1): Aimed Shot +15% crit chance if you have not moved for 0.5 s (rewards planting — then moving).
2. **Volley Tempo** (Craft 2): Multishot fires 1 extra arrow per 3 Heat.
3. **Hunter's Mark** (Craft 3): the first hit on an elite marks it: +12% damage taken from you for 8 s.
4. **Ghost Step** (Craft 5, Keystone): Dash has 3 charges and 0.15 s more invulnerability; Dash cooldown +1 s.
5. **Reload Roll** (Edge 1): a Dash that passes within 1 tile of an enemy attack refunds 1 charge (once per 4 s).
6. **Kite Rhythm** (Edge 2): each Close Call adds +10% attack speed for 4 s (stacks 3).
7. **Bullet Time** (Edge 3): Flow lasts 50% longer for you and basic shots during it pierce all.
8. **Ember Fletching** (Edge 4): at Heat 6+, basic shots deal +20% as fire.
9. **Deadeye** (Edge 5, Keystone): crits on enemies 8+ tiles away deal triple damage; you deal −20% within 3 tiles.
10. **Duellist's Hand** (Crossroads 1, licence) and **Riposte** (Crossroads 3) — see §3.
11. **Snare Craft** (Crossroads 4): Spike/Frost Traps can be thrown 5 tiles instead of placed.

### Sorcerer — "enormous damage behind paper robes"
1. **Kindling** (Craft 1): Fire Bolt's burn lasts 4 s instead of 3.
2. **Cold Snap** (Craft 2): Frost Nova on a chilled target freezes 0.5 s longer.
3. **Overload** (Craft 3): every 5th spell within 6 s costs no mana and hits +30%.
4. **Glass Cannon** (Craft 5, Keystone): +35% skill damage; you take +25% damage (stacks with Glass Heart — for the brave).
5. **Rime Blink** (Edge 1): a Blink that ends a Close Call leaves a 2-tile frost nova (80%).
6. **Arcane Rhythm** (Edge 2): each Close Call returns 10% mana.
7. **Time Thief** (Edge 3): while Flow slows time, your cooldowns tick at full speed (net: ~3× faster during slow motion).
8. **Conflagration** (Edge 4): each Heat stack adds +4% fire damage instead of +4% damage; Heat cools in 8 s, not 6.
9. **Event Horizon** (Edge 5, Keystone): Blink has 3 charges; every Blink costs 8% max mana.
10. **Battle-Mage** (Crossroads 1, licence) and **Spellblade** (Crossroads 3) — see §3.
11. **Plated Robes** (Crossroads 2): chest armour +40%, −5% cast speed.

### Necromancer — "lets bone and curse do the dying"
1. **Hollow Bones** (Craft 1): skeletons +15% move speed.
2. **Marrow Feast** (Craft 2): Corpse Explosion radius +0.8 tiles.
3. **Grave Pact** (Craft 3): when a minion dies, you heal 3% life.
4. **Legion Unbound** (Craft 5, Keystone): +2 skeleton cap; every minion has −25% life.
5. **Swap Tempo** (Edge 1): Grave Swap into a telegraph that then lands on the minion counts as your Close Call.
6. **Death March** (Edge 2): each Close Call makes your minions attack 25% faster for 4 s.
7. **Black Flow** (Edge 3): when Flow triggers, every corpse within 6 tiles detonates (Corpse Explosion at 60%).
8. **Pyre** (Edge 4): your minions picking up embers grant you Heat (one per ember, they path to embers within 4 tiles).
9. **Lich Bargain** (Edge 5, Keystone): Lich Form lasts until you take a hit over 10% of your life; its cooldown doubles.
10. **Grave Archer** (Crossroads 1, licence) and **Bone Arrows** (Crossroads 3) — see §3.
11. **Curse Ink** (Crossroads 4): your basic attacks apply Amplify Damage (rank 1) for 3 s.

(Each class's other ~30 nodes are small, readable steps — +4% damage with a tree's skills, +1 s duration, +5% move speed — in
the same 1-point / 2-point rhythm; the list above is what defines each tree.)

## 5. Auto-build

Auto-build buys perks on the same rules as skills: a per-class, per-mode **perk plan** (Craft first, then the Crossroads licence
only if the equipped weapon is off-class, then Edge tiers 1–2). It never buys Keystones or Wagers, never spends Marks (those are the
skilled player's to place — the tree glows when a Mark is unspent), and refunds/re-plans for free when the mode changes. One-thumb
players get a sound build; skilled players out-build them with Marks and Keystones.

## 6. Respec

- Perk respec is separate from skill respec: **free once per act** (the Elder's hearth), otherwise `40 × level` gold.
- Marks and points are fully refunded; Wagers cannot be respecced (they are already at stake).
- Licences refund too — taking off-class gear again brings the R8.7 penalty back, shown in red before you confirm.

## 7. APIs (for the build round)
`G.game.PERKS[id] = { classId, branch, tier, cost, keystone, text, values }` · `getPerkInfo(id)` · `buyPerk(id, { mark?, wager? })` ·
`getPerkPoints() → { points, marks }` · `respecPerks()` · events `perk:bought { id, wager }`, `perk:mark { feat }`, `perk:lost { id }`.
`state.player.perks = { [id]: 1 }`, `player.marks`, `player.wager = id|null`, `player.feats = { [featId]: true }`.
