# Perk trees (R11) — approved design, as built

Skills stay as they are; perks change *how you play*. Every perk is a rule, not a stat step. Source: `src/game/perks.js`.

## 1. Earning
- **Perk points:** 1 every 6 levels (10 by level 60).
- **Marks** (feats, once each per character, 16 in all): first, fifth and fifteenth S-grade clear · Flow chain ×5, ×8, ×12 ·
  each act boss killed without drinking a health potion (6) · hold Heat 10 for 20 s · catch the Scavenger before he grabs anything
  (1st, 5th) · reach the stairs of a bargain floor at Pallor III+. Points and Marks spend the same way; auto-build never spends Marks.
- **Wagers:** once per act, take any legal perk for free with your life as the stake. Reach town alive and it is won for good;
  die first and it is lost (`perk:lost`). One open wager at a time; the HUD can show a candle while `player.wager` is set.

Budget: tiers 1–2 cost 1, tiers 3–4 cost 2, Keystones (tier 5) cost 3 → a full branch is 9. An average player (≈ level 45–55,
a few Marks) completes about 1.5 branches; a skilled one (most Marks, a won wager or two) about 2 plus their Keystones.

## 2. Layout
Per class: **Craft** (class fantasy), **Edge** (dash, Close Call, Flow, Heat), **Crossroads** (off-class weapons). Five tiers, each a
**choice of two** — taking one locks the other until respec. Tier n needs a choice in tier n−1 of the same branch. Tier 5 is a
Keystone: a rule change with a drawback. Crossroads tier 1 is a pair of **Licences**: the licensed weapon types carry no R8.7 penalty
and unlock the class skills that need a class weapon. (The armour-weight penalty idea is closed: there is none.)

## 3. The choices
Legend: **A** / **B** per tier. "Basic" = basic attack.

### Warrior
| Tier | Craft | Edge | Crossroads |
|---|---|---|---|
| 1 | A **Edge Discipline**: +12% damage with swords, axes, maces · B **Brute Force**: basic +30% damage, −10% attack speed | A **Shoulder Through**: being untouchable in a telegraph as it lands = Close Call · B **Steel Nerves**: Close Call lasts 8 s (not 5) | A **Hunter's Grip**: licence bows, daggers · B **Pit Fighter**: licence staves, wands |
| 2 | A **Second Swing**: cleave splash 90% (was 60%) · B **Executioner's Eye**: +30% vs foes below 35% life | A **Iron Tempo**: each Close Call halves the dash recharge left · B **Counterweight**: Close Call → next basic +100% | A **Point Blank**: bow basics within 2.5 tiles +40% and shove; −15% armour with a bow · B **Quarterstaff**: staff basics hit everything around you (60%) |
| 3 | A **Unyielding**: below 30% life take 30% less · B **Bloodrush**: kills heal 3% and +5% attack speed 4 s (×3) | A **Avalanche**: Flow → 2.5-tile slam 150%, stun 1 s · B **Unbroken Flow**: the Flow chain window is 12 s | A **Borrowed Arrow**: every dash ends with a free basic at the nearest foe · B **Shield Line**: with a shield, frontal shots are stopped 50% |
| 4 | A **Warlord**: shouts refill Shoulder Charge and give +15% damage 6 s · B **Crushing Blows**: stunned foes take +40% | A **Forge Heat**: −2% damage taken per Heat; hard hits knock out a third · B **Ember Hunger**: embers fly to you from 2.5 tiles | A **Spoils of War**: elites you kill roll loot twice · B **Tactician**: each skill different from the last +8% damage (×4) |
| 5 | A **Juggernaut**: 2 Shoulder Charge charges, you cannot be stunned; −10% life · B **Berserker's Oath**: +40% damage, +20% attack speed; no health potions | A **Last Stand**: once per floor a lethal hit leaves you at 1 life, untouchable 3 s; Heat max 5 · B **Glory Hound**: Close Call +25%/stack (not 15); take +15% damage | A **Weapon Master**: every weapon licensed, off-class +10%; class weapons −10% · B **Colossus**: +30% life, +20% armour; −15% move speed, dash recharge +50% |

### Ranger
| Tier | Craft | Edge | Crossroads |
|---|---|---|---|
| 1 | A **Steady Draw**: +15% crit chance after standing still 0.5 s · B **Running Shot**: +15% damage while moving | A **Reload Roll**: a dash that passes within 1.5 tiles of a foe refunds a charge (once per 4 s) · B **Evasive Roll**: dash → +30% dodge 2 s | A **Duellist's Hand**: licence swords, maces · B **Staff and Wand**: licence staves, wands |
| 2 | A **Volley Tempo**: Multishot +1 arrow per 3 Heat · B **Long Draw**: +2% damage per tile beyond 4 (max +20%) | A **Kite Rhythm**: Close Call → +10% attack speed 4 s (×3) · B **Second Chance**: Close Call heals 4% | A **Riposte**: Close Call → next melee hit stuns 1 s · B **Spell Arrows**: staff/wand basics burst for 70% in 1.5 tiles |
| 3 | A **Hunter's Mark**: your first hit on an elite marks it: +12% damage from you 8 s · B **Pinning Shot**: basics slow 30% for 2 s | A **Bullet Time**: Flow slow-motion 50% longer, basics pierce everything during it · B **Flow Volley**: Flow → an arrow at every foe within 8 tiles (130%) | A **Brawler's Roll**: every dash ends in a 1.6-tile sweep (100%) · B **Arcane Quiver**: +20% skill damage with an off-class weapon |
| 4 | A **Trapper**: traps deal +40% · B **Poison Tips**: basics poison for 20% of the hit over 4 s | A **Ember Fletching**: at Heat 6+, basics +20% · B **Hot Pursuit**: +2% move speed per Heat | A **Trophy Hunter**: elites you kill roll loot twice · B **Field Medic**: health potions heal 50% more |
| 5 | A **Ghost Step**: 3 dash charges, +0.15 s untouchable; dash recharge +1 s · B **Deadeye**: crits on foes 8+ tiles away deal double again; −20% damage within 3 tiles | A **Wind Dancer**: +20% move speed, dash recharge −1 s; no block, take +15% · B **Sniper's Nest**: still for 1 s → +40% damage; moving → −15% | A **Weapon Master** (as Warrior) · B **Lone Wolf**: +30% damage with no foe within 4 tiles; melee hits on you +25% |

### Sorcerer
| Tier | Craft | Edge | Crossroads |
|---|---|---|---|
| 1 | A **Kindling**: fire skills +15% vs burning foes · B **Cold Snap**: Frost Nova freezes 0.6 s longer | A **Rime Blink**: Blink leaves a 2-tile frost nova (80%) where you were · B **Phase Shift**: Blink → take 50% less for 1.5 s | A **Battle-Mage**: licence swords, maces, daggers · B **Hexbow**: licence bows |
| 2 | A **Overload**: every 5th spell within 6 s is free and +30% · B **Static Field**: lightning hits always shock | A **Arcane Rhythm**: Close Call returns 10% mana · B **Spell Echo**: Close Call makes your next spell free | A **Spellblade**: every 3rd basic fires a free Fire Bolt (100%); −20% mana regen with an off-class weapon · B **Arcane Arrows**: bow basics +30% |
| 3 | A **Pyromania**: burning foes you kill set foes within 2 tiles burning · B **Permafrost**: chilled foes take +15% from you | A **Time Thief**: cooldowns run 3× during Flow slow-motion · B **Singularity**: Flow pulls foes within 5 tiles 2 tiles in and chills them | A **Blood Magic**: without mana, spells cost life · B **Mana Thief**: basics restore 2% mana |
| 4 | A **Arcane Battery**: up to +10% skill damage while above half mana · B **Elemental Rotation**: a spell of a different element than the last +15% damage 3 s | A **Conflagration**: +4% fire damage per Heat, Heat cools every 8 s · B **Heat Shield**: −2% damage taken per Heat | A **Spell-Charged**: each spell charges your next basic +40% (×3) · B **Ward**: every 10 s a shield worth 15% life |
| 5 | A **Glass Cannon**: +35% skill damage; take +25% · B **Archmage**: cooldowns −30%; mana costs +50% | A **Event Horizon**: 3 Blink charges; each Blink costs 8% mana · B **Pyre Heart**: Heat max 15; it cools every 3 s | A **Weapon Master** · B **Unbound Mind**: mana costs −40%; −30% max mana |

### Necromancer
| Tier | Craft | Edge | Crossroads |
|---|---|---|---|
| 1 | A **Hollow Bones**: minions move and attack 25% faster · B **Bone Wall**: skeleton warriors +40% life, −15% damage | A **Swap Tempo**: every dash hastes your minions 30% for 3 s · B **Bone Step**: Grave Step leaves a bone burst (80%) where you were | A **Grave Archer**: licence bows, axes · B **Gravedigger**: licence swords, maces |
| 2 | A **Marrow Feast**: Corpse Explosion +30% · B **Corpse Hoarder**: corpses last twice as long | A **Death March**: Close Call → minions 25% faster 4 s · B **Soul Sip**: Close Call heals minions 20% | A **Bone Arrows**: basic kills raise a skeleton (15 s, max 2); minions take +15% · B **Reaper's Swing**: melee basics heal 5% of their damage |
| 3 | A **Grave Pact**: a minion's death heals you 3% · B **Death's Due**: minion kills restore 2 mana | A **Black Flow**: Flow detonates corpses within 6 tiles (60%) · B **Army of Flow**: Flow raises 2 skeletons for 10 s | A **Curse Ink**: basics curse (+10% damage taken) 3 s · B **Withering Touch**: basics poison for 30% over 4 s |
| 4 | A **Plague Bearer**: poison skills +20%; poisoned foes spread poison on death · B **Bone Lord**: bone skills +20% | A **Pyre**: embers a minion walks through count as yours · B **Cold Hands**: +3% poison damage per Heat | A **Corpse Lantern**: +4% damage per corpse within 4 tiles (max 5) · B **Bone Ward**: every 12 s a shield worth 12% life |
| 5 | A **Legion Unbound**: +2 skeleton warriors; minions −25% life · B **Lone Lich**: no summons; +50% skill damage | A **Lich Bargain**: Lich Form lasts until a hit over 10% of your life; its cooldown doubles · B **Hungering Dark**: kills heal 2%; no life regeneration | A **Weapon Master** · B **Master of Puppets**: minions +40% damage; you deal −25% |

## 4. Auto-build, respec, APIs
- **Auto-build** buys a per-class, per-mode plan with perk points only: never Marks, Keystones or Wagers. It re-plans when the mode
  changes and takes the Crossroads licence only when the equipped weapon is off-class (else Craft and Edge).
- **Respec:** free once per act, otherwise 40 × level gold (`G.game.getPerkRespecCost()`). Points and Marks refund; won wagers
  become wager credits (free points). An open wager cannot be respecced.
- **APIs:** `G.game.PERKS[id] = { id, classId, branch, tier, opt, name, text, cost, keystone, licence }` · `getPerkTree(classId)`
  → `[{ id, name, tiers: [{ tier, cost, options: [perkInfo, perkInfo], chosen }] }]` · `getPerkInfo(id)` → `{ …, owned, how, locked,
  lockedReason, canBuy }` · `buyPerk(id, { mark?, wager? }) → bool` · `getPerkPoints() → { points, marks, wagerOpen, wagerAvailable }`
  · `respecPerks() → bool` · `getPerkRespecCost()`.
- **Events:** `perk:bought { id, how }` (point / mark / wager) · `perk:mark { feat, marks }` · `perk:lost { id }` · `perk:won { id }`.
- **State:** `player.perks = { [id]: 'point'|'mark'|'wager'|'won' }`, `player.feats = { [featId]: true }`, `player.wager`,
  `player.wagerCredits`, `state.flags.perkWagerAct`, `state.flags.perkRespecAct`.
