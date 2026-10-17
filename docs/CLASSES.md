# Sallow: the launch roster (10 classes), for review

*Design proposal, 2026-10-17. Nothing here is built, and nothing in `src/` changes until the lead approves a class.
All names are placeholders. Each new class takes about two minutes to read. Sources: `docs/DESIGN.md` §1 and §5,
`docs/PERKS.md`, `docs/STORY.md`, `docs/ART_CATALOG.md`, the class audits (`docs/audits/game.md` §5, `items.md` §5) and
`src/game/data_skills.js`.*

## Contents
1. [The roster at a glance](#1-the-roster-at-a-glance)
2. [The four we have: fit, overlaps, re-angles](#2-the-four-we-have)
3. [Rules every new class follows](#3-rules-every-new-class-follows)
4. The six new classes: [Lamplighter](#41-the-lamplighter) · [Ropewalker](#42-the-ropewalker) · [Hewer](#43-the-hewer) ·
   [Tallyman](#44-the-tallyman) · [Salter](#45-the-salter) · [Bloodletter](#46-the-bloodletter)
5. [Alternatives for the less certain slots](#5-alternatives)
6. [Play-pattern matrix: nobody overlaps](#6-play-pattern-matrix)
7. [The Fallen: one per class](#7-the-fallen-one-per-class)
8. [Order of arrival, in pairs](#8-order-of-arrival-in-pairs)
9. [Risks: balance, UI, code, art](#9-risks)
10. [Decisions for the lead](#10-decisions-for-the-lead)

---

## 1. The roster at a glance

**The idea in one line:** the six new classes are **Emberdeep's own trades**. The man in grey did not only pick
fighters. He picked the people a freezing town could not spare: the man who lit the stair, the woman who salted
the doorsteps, the root-cutter, the bailiff, the ropewalker and the barber-surgeon. Each of these trades already died
once in the rift, as one of the Fallen (section 7). The four classic names stay as anchors that players already know.

| # | Class | Role | Primary | Weapons (class) | Armour | Resource / mechanic | Class action | In one line |
|---|---|---|---|---|---|---|---|---|
| 1 | Warrior *(exists)* | melee, tank | Str | sword, axe, mace (+ shield) | heavy | mana (rage-like on hit) | Shoulder Charge (1) | Wades in, holds the line, stuns |
| 2 | Ranger *(exists)* | long range | Dex | bow (dagger) | light | mana | Dash (2) | Stands far off and picks targets |
| 3 | Sorcerer *(exists)* | caster, elemental | Int | staff, wand | cloth | mana | Blink (2) | Fire, frost and storm, glass-fragile |
| 4 | Necromancer *(exists)* | caster, summons and curses | Int | wand, staff, dagger | cloth | mana + corpses | Grave Step (2) | Lets the dead and the curses do the work |
| 5 | **Lamplighter** | melee and fire hybrid | Str | axe (hook), mace + **lantern** | heavy | **Oil, which is your light**: spend it to hit harder, but you see less | Snuff (2) | Fights in the dark on purpose |
| 6 | **Ropewalker** | fast melee duellist | Dex | dagger, sword (one-handed) | light | **Poise**: it grows while you go untouched and is all lost on one hit | Swing (2, tethers to an anchor) | Never be touched |
| 7 | **Hewer** | heavy melee, burst | Str | greataxe, maul, greatsword (two-handed only) | heavy | **Restraint**: hold back, then land one enormous blow | Sidestep (1) | Waits, then fells the whole thing |
| 8 | **Tallyman** | mid-range thrown weapons, marking | Dex | hand axes (thrown), daggers (thrown) | light | **Hatchets in hand**: they stick in foes as marks and must be collected | Call In (2) | Notches the debt, then collects it |
| 9 | **Salter** | caster, positioning | Int | staff, wand + tome | cloth | **The Line**: walking pours salt, and a closed loop binds everything inside | Spill (2) | Draws circles round the pack |
| 10 | **Bloodletter** | melee and blood-magic hybrid | **Vit** | dagger, sword + tome | light | **Owed**: skills cost life, and hits pay it back if you are quick | Open a Vein (1 + paid) | Runs on their own life bar |

That gives 4 melee-led classes (Warrior, Ropewalker, Hewer, plus the Lamplighter hybrid), 2 ranged (Ranger long, Tallyman
mid), 3 casters (Sorcerer, Necromancer, Salter) and 2 hybrids (Lamplighter, Bloodletter). Primary stats come out
Str 3 · Dex 3 · Int 3 · Vit 1, and armour heavy 3 · light 4 · cloth 3.

---

## 2. The four we have

| Class | Fit in a 10-class roster | Overlaps once the six exist | Recommendation (later, optional) |
|---|---|---|---|
| **Warrior** | The generic "melee" today, owning every one-handed and two-handed melee weapon. It has no loop of its own: Shoulder Charge and the stun are its identity. | **Hewer** (two-handers, big hits), **Lamplighter** (str, heavy, axe and mace). | Re-angle as **the shield-bearer**: Guardian tree, block, shove, "holding the stair" (Brannoc is its Fallen). Keep two-handers usable, but tune two-handed burst to the Hewer. A small loop such as "block a hit, so the next swing stuns" would give it a verb. Name: keep it, or "Sellsword" if the lead wants every class to be a trade. |
| **Ranger** | Long range and stillness: Steady Draw, Sniper's Nest, Deadeye, Wren's Distance. | **Ropewalker** (daggers, "never where the claws land", Evasive Roll), **Tallyman** (ranged, dex). | Let **bow + quiver** be the whole identity and move daggers to a Crossroads licence. Lean the perks toward *distance and standing still*, not dodging (dodging becomes the Ropewalker's). Sefa Lind moves to the Ropewalker and Wren stays. |
| **Sorcerer** | The elemental generalist, clear and strong. | **Lamplighter** (fire), **Salter** (caster positioning). | No re-angle needed. Rename its material **Star Salt → Starglass** so salt belongs to the Salter (one data line in `bases.js`). Odile Marr moves to the Salter and Ilse Varr stays. |
| **Necromancer** | Minions plus curses: the only "others kill for you" class. | **Bloodletter** (Life Drain, blood), **Tallyman** (curses vs marks). | Keep. The Bloodletter's drain skill is called **Cup** and works on bleeds, not as a beam. Tallyman notches are physical stacks placed one by one, not area curses. Brother Ashby moves to the Bloodletter and Tobiah Crane stays. The name is the most on-the-nose of the four; "Sexton" would fit the trades theme if the lead wants it. |

**The names question.** Keeping Warrior, Ranger, Sorcerer and Necromancer gives new players four doors they already
understand, and the six trades read as "the strange ones". Renaming all four to trades (Sellsword, Poacher, ?, Sexton) is
more consistent but loses that onboarding. **Recommendation: keep the four names.**

---

## 3. Rules every new class follows

These come from the pillars and the R18 balance rules, so that ten classes stay balanced and readable on a phone.

1. **One verb on top of the shared game.** Every class still has auto-target, auto-build, the dash, Close Call, Flow,
   Heat and Pallor. Its mechanic adds one push-your-luck decision, never a second minigame.
2. **The decision can be read without the HUD.** The mechanic shows in the world (a ring at your feet, your light radius,
   hatchets stuck in foes, a salt line) or **replaces the mana orb** (Oil, Owed). No class adds a new HUD panel.
3. **Auto-build plays it safely and an expert plays it greedily.** Auto-build mode gets an average player through the
   campaign on a safe policy (release Restraint at stage 2, keep Oil above half). The 30–50% "skilled play" bonus from
   R18 lives in the greedy end.
4. **Damage goes through the existing buckets.** Mechanic bonuses go into skill % (a skill's own coefficient), the
   **temporary bucket** (capped at +100%) or the target's additive `taken`. Nothing becomes a new multiplicative factor
   (see risk B1).
5. **No new body animations.** Every class uses the six existing animations (idle, walk, attack, cast, hit, die). A
   new animation would have to be drawn for *every* gear overlay as well (section 9, A1). Wind-ups hold an attack frame,
   tethers and throws are drawn by the engine, and pours and lantern raises are `cast`.
6. **At most one new equipment type for all six:** the Lamplighter's **lantern** off-hand. Every other class uses the
   existing 10 weapon bases and 4 off-hands in a new combination.
7. **Ids are full class ids** (`ropewalker`, not `r`). Ropewalker collides with Ranger and Salter with Sorcerer on the
   first letter, so `goalPrefix` and perk ids must not use one letter (audit game §5).

Skill tags used below: **single · aoe · defense · mobility · summon · buff**. Each tree lists 6 skills, and one tree
also holds the dash augment (a passive, never on the bar), as the existing four do.

---

## 4. The six new classes

### 4.1 The Lamplighter
> *Kept the stair lit for a town that stopped paying.*
> *Down here the lantern is the only thing on your side, and the Lamplighter keeps turning it down.*

- **Role:** melee and fire hybrid; controls vision and burns pools. **Primary:** Str. **Weapons:** axe (the hook), mace;
  off-hand **lantern** (new; stats like an orb: fire damage, light radius). **Armour:** heavy (oilskin over mail).
- **Mechanic: Oil is your light.** Oil replaces mana *and* sets your light radius: full Oil lights 9 tiles, empty lights
  3. Skills burn Oil, and the screen visibly closes in. Below 30% Oil you are **Guttering**: +25% crit chance (+40% at 10%)
  and fire splash on every hit, but you see less, cloaked foes vanish and shooters fire from the dark. Oil comes back
  from Heat embers, from lighting torches and braziers (existing props) and from burning kills.
  **The gamble:** stay dark for damage, or relight to see.
- **Class action: Snuff** (roll, 3 tiles, **2 charges**, 3 s). The lamp goes out for 0.6 s: you are untouchable and
  monsters lose you (aggro drops for 1 s). Relighting bursts fire 1.5 tiles around you. A Snuff at under 30% Oil is free;
  above that it costs 5% Oil.

| The Hook (single) | The Flame (aoe) | The Watch (defense) |
|---|---|---|
| **Hook** *(single)*: pull one foe 4 tiles to you | **Swing the Lamp** *(aoe)*: an arc of burning oil | **Lamp Black** *(defense)*: soot armour, more while Guttering |
| **Gaff** *(single)*: a hook strike, +60% on a pulled foe | **Spill** *(aoe)*: pour an oil pool that slows | **Warm Hands** *(defense)*: life regen while above half Oil |
| **Trim the Wick** *(buff)*: spend 25% Oil, and the next 3 hits deal +fire | **Kindle** *(aoe)*: ignite every pool on screen | **Light the Stair** *(summon)*: plant a lamp-post for 20 s; it refills Oil and slows foes in its light |
| **Gutterflame** *(single, passive)*: crit damage rises as your light falls | **Lamplight** *(aoe)*: an aura; foes inside your light burn | **Keeper's Eye** *(buff)*: see traps and cloaked foes; +magic find in full light |
| **Hang the Lamp** *(single)*: hook a foe and hang the lantern on it; it burns, it is lit, it takes +20% from all | **Smoke** *(aoe)*: a cloud that blinds shooters | **Night Watch** *(defense, passive)*: Oil cannot fall below 15% unless you choose it |
| **Last Light** *(single)*: spend all Oil on one blow that scales with what you spent | **Wildfire Lantern** *(aoe)*: throw the lantern for a huge burst; you stay dark until you pick it up | *augment* **Flare** *(mobility)*: Snuff ends in a flash that stuns for 0.5 s |

- **Auto-build:** *single* Hook, Gaff, Hang the Lamp, Last Light · *group* Swing the Lamp, Spill, Kindle, Light the Stair
  · *balanced* Gaff, Swing the Lamp, Kindle, Trim the Wick. The bot keeps Oil above 50% and paths through embers.
- **Perks:** *Craft* "the flame" (Oil economy, pools, hook combos) · *Edge* "the dark" (Close Call relights 10%; Flow
  refills Oil; Snuff resets) · *Crossroads* licences **A Watchman's Pole**: staves (a lamp on a pole, the
  basic sweeps 270°) · **B Signal Bow**: bows (arrows lit from the lantern; each hit leaves a small pool). Keystone
  ideas: *Lightless* (light fixed at 3 tiles, always Guttering, +40% crit damage) / *Beacon* (light never shrinks, so
  skills cost life instead).
- **Material:** **Lamp Black**.
- **Fallen:** **Hob Garrow**, the First Lamplighter (fallen_1, depth 3). His fight is already this class turned against
  you: he snuffs braziers that heal him, sweeps a glowing hook and charges blind in the dark. Only his `classId` changes.
  He is the first Fallen every player meets, so every player sees the Lamplighter's verbs on depth 3.
- **Class goals:** *Lit the Stair*: light 100 braziers or torches · *Dark Work*: 300 kills while Guttering ·
  *Hob's Reach*: pull 500 foes with Hook · *Never Out*: kill an act boss without dropping below half Oil.
- **Art cost:** body reused (`player_base`); the hook uses the axe overlay; **lantern off-hand: 1 new generic overlay
  (6 animation files, recoloured per family)** plus later family versions. Pull, swing and pour use attack and cast.
  VFX: oil pool decal, burning oil (reuses Sorcerer fire strips), lantern projectile (1 image), lamp-post prop (1
  sprite). Engine: player light radius driven by Oil (the R17 lights already exist), and darkness that hides cloaked
  foes. Sound: lantern creak, wick hiss and a gutter loop. *Medium cost.*

### 4.2 The Ropewalker
> *Walked the rope over the rift for coins, and never once looked down.*
> *Fights the same way. One slip is the end.*

- **Role:** fast melee duellist and mobility. **Primary:** Dex. **Weapons:** dagger, sword (one-handed only).
  **Armour:** light.
- **Mechanic: Poise (0–10).** +1 for each second in combat without taking damage, +1 per Close Call, +1 per Swing that
  passes a foe. Each point gives +5% damage and +2% move speed (temporary bucket). At 10 you are **On the Rope**:
  every attack strikes twice. **Any hit you take sets Poise to 0** ("you fall"); dodged and blocked hits do not count.
  Finishers *spend* Poise for a burst. **The gamble:** cash in at 5, or ride to 10 and risk it all.
- **Class action: Swing** (new kind `tether`, **2 charges**, 2.8 s). Throw the rope at the nearest foe or wall within 5
  tiles in the stick's direction and swing a 120° arc around it, landing behind. With no anchor it is a plain roll.
  You are untouchable for the whole arc. The engine draws the rope as a line, so it needs no sprite.

| Knife (single) | Rope (aoe) | Balance (defense) |
|---|---|---|
| **Cut** *(single)*: a fast double stab | **Lash** *(aoe)*: a rope whip in a 150° arc | **Light Feet** *(defense)*: +dodge, more at high Poise |
| **Behind** *(single, passive)*: +30% damage and crit from behind | **Snare** *(aoe)*: a knot line that roots foes who cross it | **Counterweight** *(defense, passive)*: at 5+ Poise a hit halves Poise instead of zeroing it |
| **Needle** *(single)*: lunge 3 tiles and stab | **Reel** *(aoe)*: pull every foe in a cone into one knot | **Steady** *(buff)*: 6 s in which Poise cannot be lost (cd 30 s) |
| **Pendulum** *(single)*: spend all Poise on one strike, +X per point | **Cat's Cradle** *(aoe)*: tie 3 foes together so they share damage | **Sway** *(defense, passive)*: the Close Call window is 0.2 s wider |
| **Stitch** *(single)*: 5 stabs while circling the target | **Freefall** *(mobility)*: leap a gap or chasm and land with a ring | **Safety Line** *(defense)*: once per floor a lethal hit leaves you at 1 life (Poise to 0) |
| **Last Knot** *(single)*: tie yourself to one foe and orbit it automatically for 4 s while attacking | **Showman** *(buff)*: Poise builds twice as fast near 3+ foes | *augment* **Rigging** *(mobility)*: a 3rd Swing charge; Swing through a foe stuns it |

- **Auto-build:** *single* Cut, Needle, Pendulum, Last Knot · *group* Lash, Snare, Reel, Cat's Cradle · *balanced* Cut,
  Lash, Pendulum, Steady. The bot spends Poise at 5 and takes Counterweight early. Experts ride to 10.
- **Perks:** *Craft* "knots and knives" · *Edge* "the rope" (the class's natural home: Close Call and Swing perks; Flow
  sets Poise to 10) · *Crossroads* licences **A Circus Bow**: bows (shots from mid-Swing) · **B Sailor's
  Hatchet**: axes, maces (Poise also adds stun chance). Keystone ideas: *No Net* (Poise max 15; hits taken +15%) /
  *Tightrope* (cannot be slowed or rooted; Poise max 5).
- **Material:** **Tarred Hemp**.
- **Fallen:** **Sefa Lind**, the Ropewalker (fallen_3, depth 6). She is untargetable while she swings, which is the
  class's Swing. She moves from Ranger, and her fan volleys become a fan of knives. She counted the knots wrong, which
  is Poise lost.
- **Class goals:** *Never Looked Down*: clear a floor of depth 10+ without being hit · *On the Rope*: reach 10 Poise 200
  times · *Swing Low*: 500 Swings that pass a foe · *Sefa's Count*: kill an act boss while On the Rope.
- **Art cost:** **the cheapest class to draw.** Body reused; dagger and sword overlays exist; no new gear. VFX: rope line
  (engine), knot-snare decal (1 image), Poise pips at your feet (engine, like the Heat pips), a small "fall" puff.
  Engine: the `tether` arc movement. Sound: rope whip, creak, a knife set. *Low cost.*

### 4.3 The Hewer
> *A root-cutter from the founder's own line.*
> *Waits, breathes, and takes the whole thing down in one stroke.*

- **Role:** heavy two-handed melee, burst. **Primary:** Str. **Weapons:** greataxe, maul, greatsword (two-handed only;
  needs a `twoHandedOnly` class flag). **Armour:** heavy.
- **Mechanic: Restraint (3 stages).** While foes are within 4 tiles and you are *not* swinging, Restraint fills: one stage
  every 0.8 s, shown as a tightening ring at your feet. Your next swing spends all of it: stage 1 at 160% of the skill,
  stage 2 at 240%, stage 3 at 350%, and a stage-3 blow staggers everything in its arc. Unstored swings are slow and weak
  (75%). A hit over 8% of your life knocks out a stage. Moving and Sidestep keep Restraint.
  **On the phone:** *hold* the attack button to gather and *release* to strike. **The gamble:** wait in the telegraph for
  stage 3, or swing early and safe.
- **Class action: Sidestep** (roll, 2 tiles, **1 charge**, 3.5 s). It never spends Restraint, and a Sidestep that makes
  a Close Call fills a stage at once.

| Felling (single) | Clearing (aoe) | Stillness (defense) |
|---|---|---|
| **Fell** *(single)*: the Restraint strike; +1 crit chance per stage | **Wide Arc** *(aoe)*: a 270° swing | **Root** *(defense)*: take 15–35% less while gathering |
| **Notch the Bark** *(single)*: mark a foe; your next stage-3 hit on it crits | **Ground the Haft** *(aoe)*: slam the haft, a staggering ring | **Brace** *(defense)*: block frontal hits while gathering |
| **Heartwood Cut** *(single)*: an overhead split; the foe loses 35% armour for 6 s | **Windfall** *(aoe)*: on release, a shockwave runs 5 tiles in a line | **Bark** *(defense, passive)*: +armour per stage held |
| **Patience** *(buff, passive)*: +crit damage per stage | **Deadfall** *(aoe)*: a leap that lands with your stored stages | **Old Blood** *(defense, passive)*: life regen per stage held |
| **Headsman's Hour** *(single)*: a 4th stage; if the blow kills, keep one stage | **Timber** *(aoe)*: a felling stroke along 6 tiles that knocks foes down like trees | **Refusal** *(buff)*: you cannot swing for 5 s; Restraint fills twice as fast and you heal 2%/s |
| **Clean Stroke** *(single)*: a stage-3 blow executes non-bosses below 30% | **Splinters** *(aoe, passive)*: stage-3 kills burst into splinters | *augment* **Deep Breath** *(mobility)*: Sidestep grants a stage |

- **Auto-build:** *single* Fell, Heartwood Cut, Clean Stroke, Root · *group* Wide Arc, Windfall, Timber, Deadfall ·
  *balanced* Fell, Wide Arc, Timber, Refusal. The bot releases at stage 2, or at once when a telegraph is about to land.
  Experts hold to 3 or 4 inside telegraphs.
- **Perks:** *Craft* "the grain" (stages, release shapes) · *Edge* "the held breath" (Close Calls fill stages; Flow
  fills Restraint) · *Crossroads* licences **A Woodsman's Hand**: one-handed axes and maces (Restraint caps at 2,
  but you can carry a shield) · **B Pole and Line**: staves (quarterstaff sweeps that gather on hit). Keystone
  ideas: *Executioner's Patience* (always 4 stages; no unstored swings) / *Impatience* (stages fill twice as fast;
  max 2).
- **Material:** **Heartwood** (root wood cut from the giant).
- **Fallen:** **Ivo Marrow**, the Last Candidate (fallen_10, depth 35). Oswin's descendant, who refused the Ember. His
  *Refusal* (spare him for 5 s or he enrages) is the Hewer's own lesson turned on the player: impatience is punished.
  He swaps his bow for a root-axe, and his thorn lanes stay. He moves from Ranger.
- **Class goals:** *Measure Twice*: 200 kills with a stage-3 blow · *Felled*: kill a legendary monster with one blow ·
  *Held Breath*: 50 stage-3 blows landed as a Close Call · *Ivo's Way*: kill an act boss in under 40 swings.
- **Art cost:** body reused; two-handed weapons today reuse the sword, axe and mace overlays (catalog E10). Proper
  **two-handed overlays (3 generic, 6 animation files each)** are the one real cost, and they help the Warrior too. The
  wind-up holds frames 1–4 of `attack` (engine: hold a frame while a flag is set). VFX: the gathering ring in 3 stages,
  a stage-3 impact strip, the Timber line (reuses the Warrior's ground-slam and earthquake strips). *Low-to-medium cost.*

### 4.4 The Tallyman
> *Collected debts for the founder's bank, and the rift owes him a great deal.*
> *He notches what he is owed and comes back for it.*

- **Role:** mid-range (3–7 tiles) thrown weapons, marking. **Primary:** Dex. **Weapons:** hand axes (thrown;
  one-handed only), daggers (thrown). **Armour:** light. Martial (weapon damage) and ranged (add to `RANGED`).
- **Mechanic: hatchets in hand (3, up to 5).** A basic throw sends a hatchet that **sticks** in the foe as a **notch**:
  +8% damage taken from you per notch (additive `taken`, max 3). Hatchets come back when the foe dies (they drop at the
  corpse, and walking near picks them up) or by **Collect** (a recall that rips every notch out for damage). With none in
  hand you punch weakly. A foe killed at 3 notches is **Paid in Full**: it sheds gold and gets +25% magic find on its drop.
  **The gamble:** leave hatchets in to stack, or walk into the pack to fetch them back.
  **Precision:** tapping *which* foe to notch.
- **Class action: Call In** (charge, 3 tiles, **2 charges**, 3 s). Every hatchet on the ground within 2 tiles of the
  path flies back to hand. A Call In that ends next to a notched foe pulls one hatchet out of it for damage.

| The Ledger (single) | The Round (aoe) | The Bailiff (defense) |
|---|---|---|
| **Notch** *(single)*: an aimed throw that sticks two hatchets | **Fan** *(aoe)*: throw everything in hand in a fan | **Seize** *(defense)*: pin a notched foe in place for 2 s |
| **Collect** *(single)*: recall all hatchets, with damage per notch on the way out | **Ricochet** *(aoe)*: a hatchet that bounces 3 times, notching each foe | **Distrain** *(defense, passive)*: notched foes deal −8% per notch |
| **Writ** *(single)*: mark one foe; for 6 s every throw homes on it | **Knives** *(aoe)*: a cone of knives that never stick and cost no hatchets | **Quick Hands** *(buff, passive)*: +1 hatchet held; wider hatchet pickup |
| **Interest** *(single, passive)*: notches grow +3% per second they stay in (max +30%) | **Collection Day** *(aoe)*: every notched foe on screen takes Collect damage | **Strongbox** *(defense)*: a shield worth the gold you picked up in the last 5 s |
| **Foreclose** *(single)*: rip every notch from one foe; if it dies, all hatchets return | **Spinning Haft** *(aoe)*: a thrown axe that boomerangs back | **Bailiff's Coat** *(defense, passive)*: +armour and +block |
| **Bad Debt** *(single, passive)*: a Paid in Full kill bursts into coins that hit nearby foes | **Tithe** *(aoe)*: one notch on every foe in a 3-tile area | *augment* **Long Arm** *(mobility)*: Call In gets +1 tile and a 3rd charge |

- **Auto-build:** *single* Notch, Writ, Foreclose, Collect · *group* Fan, Ricochet, Collection Day, Tithe · *balanced*
  Notch, Ricochet, Collect, Seize. The bot notches the nearest foe, recalls at 3 notches or when its hands are empty,
  and paths over dropped hatchets.
- **Perks:** *Craft* "the books" (notches, interest, collecting) · *Edge* "the round" (a Close Call returns a hatchet;
  Flow returns every hatchet and notches everything in view) · *Crossroads* licences **A Bowman's Debt**: bows
  (arrows notch too) · **B Strongarm**: maces, swords (melee hits add notches). Keystone ideas: *Usury* (6 notches
  max; 2 hatchets) / *Cash Only* (no Collect; hatchets return only on kills; +40% throw damage).
- **Material:** **Clipped Coin**.
- **Fallen:** **Corwin Dask**, the Debt Collector (fallen_7, depth 21). He already knocks your gold loose so you have to
  grab it back, which mirrors collecting. His coin lines become hatchet lines and his locking zone stays. He moves from
  Warrior. His relic, *Dask's Ledger*, is the Tallyman's own book.
- **Class goals:** *Paid in Full*: 1,000 Paid in Full kills · *Foreclosure*: 50 elites killed by Foreclose · *Every
  Last One*: recall 10 hatchets with one Collect · *Dask's Ledger*: 25,000 gold shed by Paid in Full kills.
- **Art cost:** body reused; the hatchet uses the axe overlay, hidden while your hands are empty (engine). The throw is
  `attack`. New: a **spinning hatchet projectile** (1 image), a **stuck-hatchet marker** drawn on foes (1 small image),
  and a ground hatchet (1 image). Knives reuse the shard projectile, and coins reuse the gold FX. *Low-to-medium cost.*

### 4.5 The Salter
> *Salted the doorsteps of Emberdeep against what came up the stair.*
> *Paid for her passage down with her own name.*

- **Role:** caster, positioning and control. **Primary:** Int. **Weapons:** staff, wand; off-hand tome. **Armour:** cloth.
- **Mechanic: the Line.** While you move you pour a salt line behind you (up to ~14 tiles; old line fades after 8 s).
  When the line crosses itself, or your dash closes a loop, the inside becomes a **Circle** for 6 s. Foes inside are
  **bound**: slowed 40%, hurt if they cross the edge, +25% damage taken from you (additive `taken`). You take −20% while
  inside, and spells cast into a circle reach further. Salt **sears**: foes in a circle get the existing `bleach` status
  (no regen, half healing) and the rot-born take extra. **The gamble:** a big circle catches the whole pack but means a
  full lap round it while it chases you. **On the phone:** circling a pack with the joystick is the most natural thing a
  thumb can do. One button (**Salt Ring**) makes a small circle instantly, so nobody *has* to draw.
- **Class action: Spill** (roll, 3 tiles, **2 charges**, 3 s). It pours a thick line along its path. Closing a loop
  with a Spill is the expert move.

| Circles (aoe) | Brine (single) | Thresholds (defense) |
|---|---|---|
| **Salt Ring** *(aoe)*: pour a 2-tile circle around you at once | **Brine Bolt** *(single)*: a heavy bolt that bursts in a circle | **Doorstep** *(defense, passive)*: inside a circle, take another 10–25% less |
| **Rite** *(aoe)*: everything inside your circles takes damage over time, more for bigger circles | **Salt the Wound** *(single)*: the foe takes +15% from all sources and cannot heal | **Unnamed** *(defense)*: shooters lose you every 6 s while you are moving (Odile's lost name) |
| **Cinch** *(aoe)*: shrink a circle and drag everything inside to its centre | **Pillar of Salt** *(single)*: a slow channel that turns a foe to salt for 2 s; a hit shatters it for a bonus | **Long Pour** *(buff, passive)*: +50% line length, slower fading |
| **Ward** *(aoe)*: your next closed circle lasts 20 s | **Brine Push** *(aoe)*: a wave that shoves foes onto your line | **Salt Lick** *(defense, passive)*: walking on your own line restores mana |
| **Bind** *(aoe, passive)*: foes bound in a circle cannot attack across its edge | **Undertow** *(single)*: drag one foe 4 tiles toward you | **Hearth Ring** *(defense)*: your circles heal you 2% per second |
| **Ten Circles** *(aoe)*: every circle on the floor detonates | **Bitter Spring** *(single)*: a beam that runs along your line | *augment* **Spill** *(mobility)*: Spill leaves a line twice as thick that closes from further away |

- **Auto-build:** *single* Brine Bolt, Salt the Wound, Pillar of Salt, Salt Ring · *group* Salt Ring, Rite, Cinch, Brine
  Push · *balanced* Brine Bolt, Salt Ring, Rite, Hearth Ring. Auto-build only picks skills, since the player moves, and
  Salt Ring is always on the auto bar so a non-drawing player still gets circles.
- **Perks:** *Craft* "rites" (circle size, duration, sear) · *Edge* "the doorstep" (a Close Call inside your own circle
  extends it; Flow closes a circle round everything within 5 tiles) · *Crossroads* licences **A Pestle and
  Knife**: maces, daggers (melee hits pour salt) · **B Salt Arrows**: bows (arrows draw a line in flight).
  Keystone ideas: *Great Rite* (circles last twice as long; only one at a time) / *Nameless* (no circles; the line
  itself binds).
- **Material:** **Bitter Salt** (with Sorcerer's Star Salt renamed Starglass).
- **Fallen:** **Odile Marr**, the Salt Witch (fallen_5, depth 13). Her salt circles punish standing still, she pushes
  with brine and she opens a 3 s double-damage window: she *is* the class already. She moves from Sorcerer.
- **Class goals:** *A Wide Ring*: close a circle holding 10+ foes · *Pillars*: shatter 200 Pillars of Salt ·
  *Odile's Name*: clear a floor with every kill made inside a circle · *Salt the Earth*: pour 5,000 tiles of line.
- **Art cost:** body reused; the pour is `cast`; the tome overlay exists. New: a **salt line strip** (1 tileable image)
  and a **circle fill** (the engine tints the ground in the polygon), a **salt pillar** overlay on foes (1 image), and
  the brine projectile (recoloured orb or spit). Art is cheap. **Engine is the cost:** line storage, loop detection,
  polygon fill and point-in-polygon tests, all under the 60 fps budget. *Low art, high engine.*

### 4.6 The Bloodletter
> *The parish bled for its sins with a lancet and a bowl.*
> *The rift taught him that the blood was the prayer.*

- **Role:** melee and blood-magic hybrid; life as resource. **Primary:** **Vitality** (the only one; see risk B4).
  **Weapons:** dagger (lancet), sword; off-hand tome. **Armour:** light (a leather apron).
- **Mechanic: Owed.** There is no mana. Skills cost life, but spent life is first **owed**: a dark band on the life orb
  for 3 s. Every hit you land in that window repays part of it, and whatever is unpaid when the window closes is gone.
  Missing life powers you: +1% damage per 2% of life missing (up to +40%, temporary bucket). Potions heal only real
  life, never owed. **The gamble:** live at a quarter life for the damage, and stay alive by hitting fast and precisely.
- **Class action: Open a Vein** (roll, 3 tiles, **1 charge**, 4 s). With the charge spent you can still dash by paying
  8% life as owed. You can always dash, but each extra one is a bet.

| The Lancet (single) | The Bowl (aoe) | The Penance (defense) |
|---|---|---|
| **Lance** *(single)*: a quick stab that repays twice as much | **Splash** *(aoe)*: a cone of blood (costs 6%) | **Staunch** *(defense)*: turn everything owed into a shield for 4 s |
| **Let** *(single)*: open a bleed; a bleeding foe's hits on you are owed, not lost | **Clotting Pool** *(aoe)*: a pool that slows and repays you while foes stand in it | **Thick Blood** *(defense, passive)*: the owed window lasts 4.5 s |
| **Cup** *(single)*: draw from every bleed within 5 tiles; repays per bleed | **Fever** *(aoe)*: an aura; while you are below half life, foes near you bleed | **Scar Tissue** *(defense, passive)*: +armour per 10% life missing |
| **Deep Cut** *(single, passive)*: skill damage +X per 10% life missing | **Hemorrhage** *(aoe, passive)*: bleeds spread on death | **Mortify** *(buff)*: for 6 s life costs double and repayment doubles too |
| **Venesection** *(single)*: a big strike that costs 20%; a kill repays everything owed | **Toll** *(aoe)*: Ashby's bell, a stun ring that repays per foe hit | **Last Rites** *(defense)*: once per 60 s a lethal hit becomes owed instead |
| **Exsanguinate** *(single)*: rip every bleed out of one foe in one burst | **The Bowl Tipped** *(aoe)*: spend half your life on a great nova, repaid by kills | *augment* **Open Vein** *(mobility)*: a paid dash repays itself if you hit within 1 s |

- **Auto-build:** *single* Lance, Let, Cup, Venesection · *group* Splash, Fever, Hemorrhage, Toll · *balanced* Lance,
  Splash, Cup, Staunch. The bot stops spending below 50% life and Staunches below 35%. Experts live at 25%.
- **Perks:** *Craft* "the lancet" (bleeds, repayment) · *Edge* "penance" (a Close Call repays everything owed; Flow
  makes skills free for its slow-motion; embers repay 3%) · *Crossroads* licences **A Bell-Hammer**: maces (each hit
  tolls, and every 5th stuns) · **B Leech Wand**: wands, staves (spells repay at range). Keystone ideas: *Bled White*
  (no health potions; repayment doubled) / *Martyr* (damage bonus +1% per 1% missing, still inside the temporary cap;
  max life −20%).
- **Material:** **Black Leeches**.
- **Fallen:** **Brother Ashby**, the Penitent Sexton (fallen_6, depth 19). He bled into the bell's mouth so that it would
  ring for the dead, and the bell grew over his head. In his fight, the ghosts that heal him become his owed blood:
  kill them before he repays. His tolls speed up as he runs low. He moves from Necromancer, and Tobiah Crane stays there.
- **Class goals:** *In the Red*: 500 kills below 25% life · *Repaid*: repay 100,000 life by hits · *Close Shave*:
  survive 50 times with under 5% life · *Ashby's Toll*: kill an act boss without drinking a health potion.
- **Art cost:** body reused; dagger, sword and tome overlays exist. VFX: blood recolours of the existing nova, cone and
  pool strips, a bleed drip (1 small strip), and the owed band on the life orb (UI CSS). *Low cost.*

---

## 5. Alternatives

I am least sure about the **Bloodletter** (it brushes the Sorcerer's Blood Magic perk, the Necromancer's Life Drain and the
`blood_price` mythic), the **Salter** (the engine cost) and whether the Hewer and a rhythm class should both exist.
Here are swaps for those slots, each with the same shape as a full class.

| Swap for | Alternative | Loop | Why it might win | Why it might not |
|---|---|---|---|---|
| Hewer *or* Bloodletter | **Bellman** (caster; Int; mace + bell off-hand; Fallen: Brother Ashby) | A bell tolls on a visible beat (a ring pulse at your feet). A skill cast *on the toll* (a 0.25 s window) is empowered and refunds; off-beat it is weak. Chaining on-beat casts speeds the beat up. | It is the purest *speed and precision* class, it echoes the Choir boss fight, and sound design carries it. | A rhythm game is hard on a phone in a noisy place; auto-build plays off-beat; it needs a strong audio cue and a visual one (accessibility). |
| Bloodletter | **Kennelman** (Dex/Str; axe, dagger; Fallen: Corwin Dask, with the Tallyman taking Ashby) | One big hound with its own life and a dash. *Tap a foe* to set it on that foe; recall it to your side to guard. The hound brings back what it kills (loot and gold). | One companion is unlike the Necromancer's army: it is about *positioning two bodies*. | It overlaps the Necromancer's pet niche; it needs a full 8-direction quadruped sheet (a big art cost). |
| Salter | **Grafted** (Str/Int; staff, mace; Fallen: Odile reworded, or a new one) | Take the rot into yourself: corruption sources on the floor (veins, rift shrines, Pallid foes) fill a personal **Graft** meter of power and drawbacks (Pallor in miniature); purge it at a shrine or in town. | It ties straight into the story (the Ember feeding on its carrier) and push-your-luck; the art is cheap (veins on the body via tint). | It risks being "Pallor again"; it stacks with Pallor in the endgame (balance). |
| Tallyman | **Arbalest** (Dex; **crossbow**, a new weapon type) | Crank to load (hold) up to 3 bolts and fire them in one burst; reloading under pressure is the gamble. | A classic heavy-ranged fantasy; easy to read. | A new weapon type touches bases, requirements, overlays, sound and the collection book (items audit §5); it is less original than notches. |

**Recommendation:** keep the six above. Hold the **Bellman** in reserve as the first post-launch class (it would make
eleven, and it stays the best idea that did not make the cut).

---

## 6. Play-pattern matrix

The check: no two classes share the same *movement* **and** the same *risk loop*, and each pillar has at least two
classes that put it at the centre.

| Class | Range | How it moves | Resource | The risk you take | Precision input | Damage rhythm | Who kills |
|---|---|---|---|---|---|---|---|
| Warrior | touch | wade in, anchor | mana on hit | standing in the pack | Shoulder Charge stun line | steady cleave | you |
| Ranger | long (8+) | stand still, reposition | mana | letting them close | target pick, distance | steady volley | you |
| Sorcerer | far (6–8) | blink-kite | mana | paper-thin defences | aim, element order | burst (cooldowns) | you |
| Necromancer | mid | hang back | mana + corpses | minions dying | corpse timing | others hit for you | minions, curses |
| **Lamplighter** | touch–near | pull foes in, fight in your light | **Oil = vision** | **fighting blind** | hook pulls, when to relight | ramps as the light falls | you + pools |
| **Ropewalker** | touch | **orbit and dive** (tether) | **Poise** | **any hit resets you** | Swing anchors, dodging | ramps to doubled hits | you |
| **Hewer** | touch | step and **hold still** | **Restraint** | **waiting in the telegraph** | release timing | one huge blow | you |
| **Tallyman** | mid (3–7) | throw, then **walk in to fetch** | **hatchets in hand** | going in to collect | who to notch | stacks, then cash-in | you |
| **Salter** | mid | **laps round the pack** | mana + the line | a lap with the pack on your heels | drawing the loop | area held over time | the circle |
| **Bloodletter** | touch–near | hit and stay hitting | **life (owed)** | **your own life bar** | hitting inside the window | rises as you fall | you |

**Pillar coverage:** *Push your luck*: Lamplighter (dark), Hewer (wait), Bloodletter (life), Tallyman (fetch). *Speed
and precision*: Ropewalker (never hit), Hewer (release), Salter (draw), Tallyman (pick targets). *Skill ceiling*: every
new class has a safe auto policy and a greedy expert one (§3.3). *Unlike anything else*: light as resource, tethered
orbits, salt circles drawn with a thumb, hatchets as marks.

---

## 7. The Fallen: one per class

There are ten Fallen and there will be ten classes, so each class gets exactly one. Four stay where they are and six
change class. **Every one of the six already fights like its new class**, so names, depths, relics and story text
stay; only `classId` (in `fallen.js` and `campaign.js`) and a weapon swap in some fights change. The Fallen sheets in the
art catalog (D1) become each class's first art, and a player meets a preview of six classes during the campaign.

| Fallen | Depth | Today | Proposed | What changes in the fight |
|---|---|---|---|---|
| Hob Garrow, First Lamplighter | 3 | Warrior | **Lamplighter** | nothing (it is already the class) |
| Sefa Lind, the Ropewalker | 6 | Ranger | **Ropewalker** | fan volleys become a fan of knives |
| Brannoc the Unbent | 9 | Warrior | Warrior | none |
| Odile Marr, the Salt Witch | 13 | Sorcerer | **Salter** | none |
| Wren Halloway, the Cartographer | 16 | Ranger | Ranger | none |
| Brother Ashby, the Penitent Sexton | 19 | Necromancer | **Bloodletter** | the healing ghosts read as blood he is owed |
| Corwin Dask, the Debt Collector | 21 | Warrior | **Tallyman** | coin lines become hatchet lines |
| Ilse Varr, Magister | 24 | Sorcerer | Sorcerer | none |
| Tobiah Crane, gravedigger | 28 | Necromancer | Necromancer | none |
| Ivo Marrow, the Last Candidate | 35 | Ranger | **Hewer** | the bow becomes a root-axe; thorn lanes stay |

**Story hook (one optional line per class, for the opening).** Your village burned, but you were not a nobody there:
you were its lamplighter, its salter, its bailiff. The man in grey "needed someone who knew the trade". When you meet
the Fallen of your own class, they say one extra line (a new `ADVENTURERS[id].sameClass` string). The Elder's hook gains
a variant line for the six trades: *"A lamplighter? We had one. He went down in the spring."*

---

## 8. Order of arrival, in pairs

| Pair | Classes | Why this pair | Art (lead's hand) | Code |
|---|---|---|---|---|
| **1 (recommended first)** | **Lamplighter + Ropewalker** | Both Fallen are in Act I (depths 3 and 6), so every player meets them in the first hour. One is a hybrid and one a pure duellist, so they share nothing. They also cover the two most "unlike anything else" loops (light and the tether). | Ropewalker: almost nothing new. Lamplighter: 1 new off-hand overlay (6 files) and a few VFX. Plus the usual per-class set (portrait, emblem, dash icon, ~19 skill icons; perk icons later). | light radius from Oil, the `tether` action kind, Poise pips |
| 2 | **Hewer + Tallyman** | Melee burst and mid-range thrown fill the remaining gaps in range. Both Fallen are late (21 and 35), so they reward the endgame. | Two-handed overlays (3 × 6 files, and they help the Warrior too); hatchet projectile and markers (3 images). | hold-to-gather input, hold frame, ground hatchets, `twoHandedOnly`, `RANGED` for thrown weapons |
| 3 | **Salter + Bloodletter** | The two casters and life users. The Bloodletter carries the biggest balance risk and the Salter the biggest engine cost, so they come last, with the most time to tune and profile. | Very little: salt line and fill, pillar, blood recolours. | line and loop detection and polygon fill (profile on old iPhones); a Vit primary; the owed band on the orb |

**Cheapest alternative first pair:** Ropewalker + Hewer, if art time is the only limit. That puts two melee classes
first, though, and the first two new classes should differ as much as possible.

---

## 9. Risks

### Balance
- **B1. New factors.** Restraint (up to 350–500%), Poise, Owed missing-life, Guttering crit, notches and circles must use
  the R18 buckets: Restraint is skill %; Poise, Owed and Guttering go in the temporary bucket (+100% cap); notches and
  circles are additive `taken` alongside shock and curses. If any of them multiplies outside the pipeline, the ±15%
  parity target (§5) breaks at once.
- **B2. Auto-build parity.** `tests/balance.html` needs a *policy* per class (release at stage 2, keep Oil > 50%, spend
  Poise at 5, recall at 3 notches, no hand-drawn circles, stop spending below 50% life). The ±15% target is measured on
  those policies, and the greedy play gives the R18 +30–50% on top. Tune the policies first, then the numbers.
- **B3. One-hit wipes vs Poise.** At depth 45+ an unavoidable chip hit (auras, lava, DoTs) would zero Poise with nothing
  the player could have done. Rule: damage over time and terrain never reset Poise; only hits over 3% of life do.
- **B4. Vitality as a primary stat.** +1% damage per Vit point *and* life from Vit doubles up. Give the Bloodletter
  half the damage per point (0.5%), or let Vit count as the primary only for damage. Class armour requirements also
  assume str/dex/int (`D.REQ.armorStat`): give Bloodletter class armour a Vit requirement, or tag it light/dex.
- **B5. Mythics and uniques.** `legion`, `split_shot`, `frozen_wake` and `blood_price` do little or too much for some
  new classes (blood_price on a Bloodletter stacks with Owed). Each new class needs 3–5 class-tagged uniques and a pass
  over the 12 mythics.
- **B6. The Echo** must imitate the mechanic (a Hewer Echo that waits and then fells, a Salter Echo that circles). Echo
  `KIT` entries per class, plus a simple policy each.
- **B7. Darkness and Pallor IV.** The Lamplighter's Guttering on dark floor variants under heavy Pallor desaturation
  could be unreadable. Keep monsters' rim light visible at any Oil level; only cloaked foes vanish.

### UI and HUD
- **U1. No new HUD panels** (§3.2): Oil and Owed replace the mana orb; Restraint, Poise, notches and the salt line live
  in the world; the Tallyman's hatchet count sits on the attack button as pips. The HUD editor's ids (`atk skills
  vitals dash portal mm tracker joy`) stay the same.
- **U2. Hold-to-gather vs the action button.** The Hewer's hold-and-release clashes with `attackHeld` (auto-repeat) and
  with the context-aware LOOT mode. Rule: a Hewer holding the button never switches to LOOT, and a tap still makes an
  unstored swing.
- **U3. The class picker with 10 classes** at 375 px: a 2 × 5 grid of emblems with one line each, or a carousel with
  the portrait. It needs a design pass (`ui.md`).
- **U4. First-time tips:** one per new mechanic (Oil, Poise, Restraint, notches, the Line, Owed), each shown on the first
  use, not at character creation.
- **U5. Accessibility:** the salt line and the light radius must work with colour-blind settings and low-FX (the line
  as a pattern, not just a colour; the light radius as a vignette on low-FX). If the Bellman alternative is ever chosen,
  it needs a visual beat, not just audio.
- **U6. One-thumb drawing (Salter)** with the *floating* joystick in landscape: test that a lap round a pack is
  comfortable. Salt Ring is the fallback, so nothing *requires* drawing.

### Code (pointers for the build sessions; audit game §5 and items §5 list every break-point)
- New action kinds `tether` (Ropewalker) and a hold flag (Hewer); `RANGED` and `martial` for the Tallyman's thrown
  axes and daggers; a `twoHandedOnly` class flag; a new off-hand type `lantern` (bases, `offhandStat`, collection
  pages, overlay); ground hatchet objects (a cap on live ones); a light radius per player; a salt polyline (cap the
  points, and test loops only when a segment is added).
- `D.CLASS_MATERIAL`, `D.CLASS`, `classTag`, the class-armour roll (heavy → warrior *or* hewer *or* lamplighter, and so
  on), `BUILDS`, perk `PLANS`, Echo `KIT`, `weaponSkills`, `goalPrefix` (never one letter), `CLASS_GOALS`, Fallen
  `classId`. The "dummy class" test from the audit summary (#14) should land **before** pair 1.

### Art and sound (the lead's hand)
- **A1. New animations multiply.** One extra body animation means re-drawing it for every gear overlay, roughly
  60 generic or family overlays × 5 directions × its frames. That is why §3.5 forbids them. If one class ever truly
  needs one (say a Ropewalker mid-air pose), draw it on the body only and hide the overlays during it.
- **A2. Per-class fixed set** (independent of the class design): a portrait (L1), an emblem (I3), a dash icon (I2), ~19
  skill icons (I1), 30 perk icons (I4, polish), optionally a class base body (A1, polish), and voice: ~16 voice files,
  3–5 dash sounds and ~2.5 files per active skill (SOUND_DESIGN). That is roughly **55 images + ~50 sounds per class**
  before anything class-specific.
- **A3. Class-specific extras in this design:** the lantern overlay (6 files, Lamplighter), the two-handed overlays (18
  files, Hewer, shared), and about 10 single images across all six (hatchets, markers, pillar, salt line, lamp-post,
  knot). The Fallen sheets for these six already exist in the catalog (D1).

---

## 10. Decisions for the lead

1. **Approve the six** (or swap in an alternative from §5): Lamplighter, Ropewalker, Hewer, Tallyman, Salter,
   Bloodletter.
2. **Names:** keep Warrior, Ranger, Sorcerer and Necromancer (recommended) or move all ten to trades.
3. **The Fallen reshuffle** in §7 (six change class; their text stays).
4. **First pair:** Lamplighter + Ropewalker (recommended) or Ropewalker + Hewer (cheapest).
5. **The one new item type:** the lantern off-hand (yes / reuse the orb).
6. **Small re-angles** to the existing four (Warrior as the shield-bearer, Ranger with bow only, Star Salt → Starglass).
   These are optional and can wait until pair 1 is in.
