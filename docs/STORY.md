# Sallow: campaign outline (for review)

All the player-facing text lives in `src/ui/story_data.js` (`G.meta.STORY`). People and places are named once in
`NAMES` or in their own entry, so a rename takes one line. This file is the readable summary. Where they differ, the
data file wins.

## The shape in one breath
Your village is burned while you are away. A man in grey hands you a note: go to **Emberdeep**. The town is freezing,
because the rift under it has stopped giving heat and is rotting from the bottom up. You go down through three acts to
the core and kill its founder, **Oswin Marrow, the Hearthking**. He bound the **Ember**, the heart of a dead giant, into
his own chest so the town could be warm. The giant has been growing back around him ever since, and that regrowth is
the rot. The man in grey is Oswin's last servant. He burned your home so that nobody would miss you, because someone
has to carry the heart. You were not the first he chose: ten others went before you, and the rot kept them. They are
**the Fallen**. You end up carrying the Ember, and Pallor is it feeding on you.

## Opening (first arrival in town)
1. Your home is ash and nobody survived. A man in a grey hood knows your name and gives you a note.
2. The note (lore page 0): "Go to Emberdeep… you will be paid more than you lost… I will find you."
3. Frost on every roof and no chimney smoke. A woman cries because she is glad to see anyone.
4. The Elder explains the rift: thousands of miles deep, heat for 300 years, now fading, and it smells of meat. Then the
   hook: *"A note? From a man in grey? Nobody here sent for you."*

## Acts and main chain (12 steps)
| Act | Depths | Steps (boss depth) | Outro |
|---|---|---|---|
| I · The Shallows | 1–10 | reach 3 · **Gravelord** (5) · reach 8 · **Mother** (10) | a chimney smokes; someone sings |
| II · The Deep | 11–20 | reach 13 · **Ember Tyrant** (15) · reach 18 · **Hollow Star** (20) | the market opens; a grey note: "Further." |
| III · Hellscape | 21–30 | reach 23 · **the Choir** (25) · reach 28 · **the Hearthking** (30) | the finale |
| The Roots | 31+ | endgame | Pallor on |

## Act bosses (designs for combat: `BOSSES` in story_data.js)
Each boss has a look, three phases with readable mechanics, and intro and death lines.
- **Morgrath the Gravelord** (5): the town priest, crowned by the rot. He keeps a ledger of every death in Emberdeep.
  - Mechanics: graves he names raise skeletons unless you stand on them; a ring of names stacks extra damage taken on you; a last flurry of three telegraphed lunges.
- **Skarn, "Mother"** (10): a bloated spider with a miner's lantern grown into her. She breeds on stolen heat.
  - Mechanics: she starts on the roof and her egg sacs hatch until popped; she charges the warmest target (summons first); finally she eats her own brood to heal.
- **Azgalor, the Ember Tyrant** (15): the forgotten Keeper of Embers. The rot promised he would be remembered.
  - Mechanics: he heals on the fire vein, so bait him off it; a grid of fire lines to stand between; meteors on you while he roars the names of those who forgot him.
- **Xal'thuun, the Hollow Star** (20): never a star. It is the dead giant's **eye**.
  - Mechanics: a sweeping gaze to break line of sight from; its inside pulls you in, so dash outward; a blackout where it reopens behind you, with an audio warning.
- **The Choir** (25, new id `boss_choir`): every swallowed voice fused into one pillar of mouths, singing the giant awake.
  - Mechanics: rhythm rings to dodge on the beat; it splits into three and only the "wrong note" singer can be hurt; interrupt its inhale to silence it.
- **Oswin Marrow, the Hearthking** (30, `boss_world`): the founder.
  - Phase 1: a clean, tired swordsman.
  - Phase 2: roots tear him open and the Ember pulses, giving burst windows.
  - Phase 3: the giant's body itself; the floor inverts on each heartbeat while the man in grey counts your dashes aloud.
  - Finale: you are left holding the Ember. The man in grey bows to his new master: "Someone has to carry the heart."

## The Fallen (R7.6 / R7.10): ten candidates who went before you
Each one was picked by the man in grey, who burned or bought out their life as he did yours. Each drops a permanent relic,
`fallen_N` in `G.items.RELICS`. The entity's `adventurerId` is the same id, which drives the UI banners.
| id | Depth | Who | Class | Fight (phone-readable) | Relic |
|---|---|---|---|---|---|
| fallen_1 | 3 | **Hob Garrow**, the First Lamplighter: his family burned; still lighting the stair | Warrior | snuff braziers that heal him · glowing hook sweep · blind charge when dark | Garrow's Wick (life regen) |
| fallen_3 | 6 | **Sefa Lind**, the Ropewalker: counted the knots wrong; the rope grew through her | Ranger | untargetable while swinging, cut anchors · fan volleys · knot snares | The Last Knot (move speed) |
| fallen_2 | 9 | **Brannoc the Unbent**: held the stair 40 days; shield fused to arm | Warrior | front-blocks, get behind · knockback charge · spike ring | Brannoc's Buckle (dash shield bash) |
| fallen_5 | 13 | **Odile Marr**, the Salt Witch: paid her passage with her name | Sorcerer | salt circles punish standing still · brine push · 3 s double-damage window | Odile's Name (mana) |
| fallen_4 | 16 | **Wren Halloway**, the Cartographer: bone arrows, still counting | Ranger | snare lines · arrows glint from the dark · stops to count | Wren's Count (dash reload, map) |
| fallen_6 | 19 | **Brother Ashby**, the Penitent Sexton: the bell grew over his head | Necromancer | kill ghosts before they heal him · stun ring on the toll · tolls speed up | Ashby's Clapper (poison res, vit) |
| fallen_7 | 21 | **Corwin Dask**, the Debt Collector: coin-scaled bailiff | Warrior | knocks your gold loose, grab it back · coin lines · locking zone | Dask's Ledger (gold, crit dmg) |
| fallen_8 | 24 | **Magister Ilse Varr**: drank the first bottle of rift heat | Sorcerer | growing novas · late-bursting bottles · she burns herself, so kite | Varr's Tincture (ramping fire) |
| fallen_9 | 28 | **Old Tobiah Crane**: the gravedigger who stayed with the dead | Necromancer | raises corpses you left · slow shovel line · shield of dead | Crane's Spade (+1 minion) |
| fallen_10 | 35 | **Ivo Marrow**, the Last Candidate: Oswin's descendant, who refused the Ember | Ranger | thorn-wall lanes · chase through roots · *Refusal*: spare him 5 s or he enrages | Ivo's Refusal (damage, XP) |

**All ten combined** at the Elder's hearth gives *The Ten Who Went Before* and the title *Heir of the Fallen*. The story
reason: each of them broke carrying the Ember alone, and laid in the founding hearth together they promise to carry it
with you. Suggested on top of the items team's stats: **Pallor builds 25% slower**.

## Town revival and friendly floors
`flags.act` (1–4), `flags.cleansed` and `flags.warmth` (0–3) follow main-chain progress. Each act swaps every NPC's
greeting (`TOWN`); the mystic's Reroll opens in Act 2.
- **Lamp Camp** (after Act I, depths 3–9):
  - Gammer Wick sells rat broth (healer).
  - Jory Tallow, who came back up one-armed, sells his dead party's things (merchant).
  - Pell the Ferryman runs a rope-lift (waypoint).
- **Fever Camp** (after Act II, depths 12–19):
  - The scavenger twins Ama and Odo (merchant).
  - Sister Ada (healer).
  - Tam guards a stash chest that the man in grey looked at but did not touch.

## The Curator: Isra Vell
- **Look:** tall and stooped, in a coat patched from a dozen mail shirts, with smoked-glass spectacles, needle and black thread, and chalk-white fingers.
- **Why she collects:** she was quartermaster to every party the man in grey sent down. She sold them their armour and wrote down every buckle. Now she buys their gear back from the dark and sews each set whole, so that someone is buried complete.
- **Voice:** a ledger read aloud. "Helm, ash plate, third issue. Returned. Thank you."
- **Her Act 4 line:** "There is one ledger I have not opened. It has your name in it. I did not write it."

## Side lines (given by the Elder; Isra and Jory give their own)
- **Marta Ell, Marta's Daughter** (Act I): find Lise's empty bedroll, then kill what wears her red hair.
- **Sister Ada, Psalms for the Drowned** (Act I): lay 40 dead down, then leave her psalter open on depth 9.
- **Isra Vell, The Quartermaster's Ledger** (Act I): register 4 pieces of gear, then complete one Collection Book page. She buries the empty set.
- **Garrick Holt, Deep Iron** (Act II): chests and rare finds below depth 10. The iron is warm and nothing heated it.
- **Jory Tallow, The Warm Blade** (Act II): cleanse 1 corrupted item, then 3 more, so he can hold his own sword again.
- **Tam the lamplighter, The Grey Paper** (Act III): grey notes lead to a hearth with a chair on depth 26. The man in grey leaves a note: "Good."

## What other teams need to build
- **Combat:**
  - the five act-boss designs above;
  - `boss_choir` (depth 25) and `boss_world` (depth 30) as monster ids;
  - the ten Fallen with `adventurerId: 'fallen_N'` at the listed depths, calling `G.items.grantRelic(id)` on death.
- **Items:**
  - relic names in `relics.js` should become the relic names above (person names are now in story_data);
  - re-flavour the old placeholder names of fallen_1, 3, 5, 6, 7 and 10;
  - optionally add the "Pallor 25% slower" effect to the combined reward;
  - emit `item:cleansed { item }` when cleansing.
- **UI / meta (quests.js logic):**
  - track the new side-quest kinds: `collect` on `collection:registered`, `collectPage` on `collection:page`, `cleanse` on `item:cleansed`;
  - a Curator panel that uses `CURATOR` lines;
  - the combine-relics scene at the Elder that plays `FALLEN_COMBINED.lines`.
- **Core / world:**
  - a `curator` NPC role and its spot in town;
  - camp NPCs on cleansed floors from `CAMP` (roles reuse existing vendor panels; `waypoint` is the rope-lift).
