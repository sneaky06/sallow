# Sallow: campaign outline (for review)

All the player-facing text lives in `src/ui/story_data.js`. Names come from one table (`NAMES`), so renaming people
and places takes one line each. This file is the readable summary. Where they differ, the data file wins.

## The shape in one breath
Your village is burned while you are away. A man in grey hands you a note: go to **Emberdeep**. The town is freezing,
because the rift under it has stopped giving heat and is rotting from the bottom up. You go down through three acts to
the core and kill its founder, **Oswin Marrow, the Hearthking**. He bound himself to the rift's heart 300 years ago,
and that bond is what rotted it. The heart, **the Ember**, ends up in your hands. The man in grey was the Hearthking's
servant all along. He burned your home so that nobody would miss you, because someone has to carry the heart. That is
the endgame, and Pallor is the Ember feeding on you.

## Opening (first arrival in town)
1. Narration: you come home from caravan work and find it burned, with no survivors. A man in a grey hood gives you a note.
2. The note (lore page 0): "Go to Emberdeep… you will be paid more than you lost… I will find you."
3. Arrival: frost on every roof and no chimney smoke. A woman cries because she is glad to see anyone.
4. The Elder explains the rift: thousands of miles deep, heat for 300 years, now fading, and it smells of meat. The
   adventurers never came back, or came back and would not go down again. Then the hook: *"A note? From a man in grey?
   Nobody here sent for you."*

## Acts and main chain (12 steps, `src/ui/quests.js`)
| Act | Depths | Steps | Boss | Outro |
|---|---|---|---|---|
| I · The Shallows | 1–10 | reach 3 · Gravelord (5) · reach 8 · Broodmother (10) | the crowned priest, then "Mother" | a chimney smokes; someone sings |
| II · The Deep | 11–20 | reach 13 · Ember Tyrant (15) · reach 18 · Hollow Star (20) | fever-heat; the missing adventurers' camps | the market opens; a grey note says "Further." |
| III · Hellscape | 21–30 | reach 23 · the Choir (25, any boss) · reach 28 · **the Hearthking (30)** | skin floors, a singing thing, a heartbeat | the finale |
| Roots (endgame) | 31+ | none | — | Pallor is on |

Each step has the Elder's lines before (on accept) and after (on claim). Each act has an intro card on its first floor.

## The world boss: Oswin Marrow, the Hearthking (depth 30)
- **Who:** Emberdeep's founder. In year one he went down the crack alone with a lamp and a knife. In the deep he found
  the Ember, the still-beating heart of something vast that died before the world had a sky. He opened his own chest,
  put it in, and became the town's hearth.
- **Why the rift is corrupt:** a heart wants its body back. For three centuries the dead thing has been regrowing
  around Oswin, root by root, and that growth is the rot. Every floor is closer to the body. The founders wrote this
  down, and the town later burned the book for warmth.
- **The man in grey (the Factor):** Oswin's last servant, made from the soot of his first hearth. Oswin wants to put the
  heart down. The Factor picks heirs who have nothing left above: he burns their homes, then sends them. Every
  adventurer before you was one of his picks. The ones who failed are the corrupted adventurers.
- **Fight pitch (for combat):** three phases. (1) Oswin on his throne, a tired swordsman who fights cleanly. (2) The
  roots tear him open: arena hazards, root lashes, the heart pulsing on a timer that rewards burst. (3) The thing
  itself: abstract, a pulse that inverts the floor, the Factor's voice counting your dashes. Drops a Tome of Insight
  and the title *Bearer of the Ember*.
- **Finale:** the Ember is still beating, and you are holding it. The Factor bows to you as his new master: "Someone has
  to carry the heart." The deeper floors open and Pallor switches on.

## Corrupted former adventurers (R7.6, for combat to build)
| Who | Class | Depth | Story | Fight | Reward idea |
|---|---|---|---|---|---|
| Brannoc the Unbent | Warrior | 9 | held the stair for 40 days; shield fused to arm | frontal block, knockback charge; flank him | dash ends in a shield bash |
| Wren Halloway, the Cartographer | Ranger | 16 | maps the Deep by counting steps; arrows of her own bone | always moving, snare lines; stops to count every 10 s | map revealed on arrival / dash reloads a shot |
| Magister Ilse Varr | Sorcerer | 24 | bottled rift heat to sell; drank the first bottle | growing novas, late-bursting bottles; she burns herself | fire skill or ramping fire damage |
| Old Tobiah Crane | Necromancer | 28 | the gravedigger who went to fetch the dead and stayed to lead them | raises corpses you left; clean floors weaken him | +1 minion / your kills can't be raised |

The UI shows a banner on first sight and on death when the entity has `adventurerId` (or `monsterId: 'adv_<id>'`).

## Side lines (named townsfolk, given by the Elder)
- **Marta Ell — Marta's Daughter** (Act I): find Lise's bedroll past depth 6, then kill what wears her red hair.
- **Sister Ada — Psalms for the Drowned** (Act I): lay 40 dead down, then leave her psalter open on depth 9.
- **Garrick Holt — Deep Iron** (Act II): chests and rare finds below depth 10; the iron is warm and nothing heated it.
- **Tam the lamplighter — The Grey Paper** (Act III): grey notes under doors lead to a hearth with a chair on depth 26;
  the man in grey leaves him a note: "Good."

## Town revival (R7.7)
`state.flags.act` (1–4), `state.flags.cleansed` ([boss ids]) and `state.flags.warmth` (0–3) are derived from main-chain
progress whenever the hero is in town, so old saves land in the right stage. When the act changes, a `town:warmed
{ act, warmth }` event fires. Each stage swaps every NPC's greeting and can open services:
- Act 1 (warmth 0): cold, bitter lines.
- Act 2 (warmth 1): chimneys smoke. **The mystic's Reroll opens.**
- Act 3 (warmth 2): the market is open; a grey note on the Elder's door.
- Act 4 (warmth 3): caravans arrive. NPCs are grateful, and afraid of what you carry.
World and engine can read `flags.warmth` for lights, smoke and extra NPCs.

## Lore
There are 19 pages, including the note, the founding, Brannoc's order, Wren's map, Varr's price list, the gravedigger's
prayer, a grey receipt ("One village, the hero's. Burned. Paid in full. — F."), words grown on skin, and the
Hearthking's last letter.
