# Sallow Writing Guide

For the lead dev, who wants to rename and rewrite what the player reads without learning to code. Everything below is a **text file you can open in VS Code** (or Notepad). You only ever change the words *between the quote marks*.

Facts as of this writing: the UI label file `src/ui/strings.js` **does not exist yet** (a UI session is creating it). Until it lands, button/menu words are still inside the `src/ui/*.js` files. See section 3.

## Contents

1. [Safe editing in 60 seconds](#1-safe-editing-in-60-seconds)
2. [Story and dialogue: `src/ui/story_data.js`](#2-story-and-dialogue)
3. [Menus, buttons, labels](#3-menus-buttons-labels)
4. [Items](#4-items) (bases, rare names, affixes, uniques, mythics, sets, looks, gems, materials, potions, rarity)
5. [Monsters, bosses, Fallen, townsfolk](#5-monsters-bosses-the-fallen-townsfolk)
6. [Skills, perks, classes](#6-skills-perks-classes)
7. [Places: floors, landmarks, events, shrines](#7-places-floors-landmarks-events-shrines)
8. [Game title and town name](#8-game-title-and-town-name)
9. [Where do I find X?](#9-where-do-i-find-x)

---

## 1. Safe editing in 60 seconds

**Option A: just tell me in chat.** "Rename the Gravelord to Father Ashby; the Elder's first line should be ..." and the team applies it. No risk.

**Option B: edit yourself.**

1. Open the file in VS Code (`Ctrl+P`, type the file name, Enter). `Ctrl+F` finds the text you want.
2. Change only the words *inside* the quotes.
3. **Keep the quote marks and the comma at the end of the line.** A missing `'` or `,` breaks the whole game.
4. **Apostrophes:** text inside `'single quotes'` must write an apostrophe as `\'` (e.g. `Marta\'s`). Or wrap the line in "double quotes" instead. Typographic ’ also works.
5. **Never change these**, even if they look like text:
   - **ids / keys:** the word before a colon (`boss_gravelord:`), anything `id: '...'`, `kind:`, `classId:`, `effect:`, the first `'quoted_word'` in `U('oathkeeper', 'Oathkeeper', ...)` (the first one is the id, the second is the name).
   - **`{placeholders}`** like `{town}`, `{boss}`, `{name}`, `{depth}`, `{dmg}`, `{stun}`: the game fills them in. You may move them within a sentence, but spell them exactly and keep the braces.
   - **numbers, colours (`'#9aa3ad'`), `rarity`, `goal`, `rewards`**: these are game balance, not words.
   - `\n` inside text means "new line", leave it.
6. Save (`Ctrl+S`), reload the game (refresh the browser tab / re-open the app). If the screen is blank, you broke a quote or comma: `Ctrl+Z` back to your last save and try again, or tell me which file.
7. Old saves: items already in a player's inventory keep their old name; new drops use the new one.
8. Don't commit; the lead integrates.

Before/after example (a vendor line):

```js
// before
before: ['People pay more for a dead man\'s sword than a new one.'],
// after: same brackets, quotes, comma; only the words moved
before: ['A dead man\'s sword sells for double. Do not ask me why.'],
```

---

## 2. Story and dialogue

**File: `src/ui/story_data.js`** (the one file for almost everything the story says). The top comment lists the sections. Each section is a labelled block; here is what each one is.

| Section | What it is | Edit | Never touch |
|---|---|---|---|
| `NAMES` | the story's key words: `town` (Emberdeep), `rift`/`Rift`, `rot`, `figure` (the man in grey), `king`, `ember` | the words after the colon | the keys on the left. Lowercase and Capitalised twins (`rift`/`Rift`) are for mid-sentence vs sentence-start; change both |
| `TAGLINE`, `TITLE`, `OLD_TITLES` | title-screen tagline; the title earned at the end ("Bearer of the Ember") | the text | `{town}` |
| `OPENING` | first arrival: `home` (the burned home), `note` (the grey note), `arrival`, `elder` (the Elder's first speech) | each line in `[...]` is one screen of text | `home:`, `note:` etc. |
| `ACTS` | four acts: name, `intro`, `outro` (Act headings and narration) | `name`, lines in `intro`/`outro` | `n`, `from`, `to`, `endStep`, `after` |
| `STEPS` | the 12 main quests: what the Elder says when you **accept** (`before`) and **turn in** (`after`) | the lines | `main_1` ... `main_12`, `{boss}` |
| `FINALE`, `PALLOR_INTRO` | after the world boss; the Pallor (grey curse) intro | lines | |
| `BOSSES` | act bosses. `name`, `who`, `look`, `phases`, `intro` (banner when the fight starts), `death` (banner when it ends) | `name`, `intro`, `death`, `who` | `boss_gravelord:` keys, `act`, `depth`. `phases`/`look` are design notes for the team and the player doesn't see them. **Boss names also live in `src/game/data_monsters.js`**, see section 5 |
| `ECHO` | your Echo (your corpse returns as an enemy): title, banners, tracker | text | `{name}`, `{depth}` |
| `ADVENTURERS` | the ten Fallen: name, story, corruption, fight notes, `relic`, `relicText`, `intro`, `death` | `name`, `story`, `relic`, `relicText`, `intro`, `death` | `id`, `classId`, `depth`. **Fallen names are repeated in other files**, see section 5 |
| `FALLEN_COMBINED` | the "Ten Who Went Before" combine scene | text | |
| `CURATOR` | Isra Vell, who keeps the Collection Book: `greet`, `pageDone`, `tierDone` | name, lines | `role` |
| `CAMP` | refugee camps after Act 1 and 2: camp `name`, each NPC's `name`, `look`, `lines` | names + lines | `id: 'camp:gammer'`, `role`, `act`, `band` |
| `SIDE` | named side-quest lines (Marta's Daughter, Psalms for the Drowned...): `name`, each step's `desc` (quest log text), `before`/`after` | `giverName`-style words, `name`, `desc`, `before`, `after` | `id`, `kind`, `goal`, `rewards`, `act` |
| `VENDOR_QUESTS` (the big `VENDOR_RAW` list) | 1-3 quests per townsperson | `name`, `desc`, `before`, `after`, `giverName` | `id`, `giver` (a role like `'merchant'`), `goal`, `rewards`, `act`. A goal says what the player must do; if your new `desc` says "Find 5 Rare items" keep `goal` in step |
| `MILESTONES` | lifetime counters ("Butcher's Tally"): `name`, `flavour`, `tiers` (rank titles low to high) | name, flavour, each rank title | the key (`kills:`, `elites:` ...); keep the number of tiers (extra titles are just ignored, fewer repeat the last) |
| `TOWN` | how townsfolk's one-liners change as the town recovers (4 stages): `news` banner + a line per NPC | lines | `act`, `warmth`, `services`, `merchant:`/`blacksmith:` keys |
| `LORE` | collectible pages: `title` + `text` | both | |

**Typical edit.** The Elder's first line, in `OPENING.elder`:

```js
// before
elder: [
  'You came. Gods. Sit, if you can stand the cold.',
// after
elder: [
  'You came. Sit. The fire is a rumour, but the chair is real.',
```

Name that appears in many lines (the town, "the man in grey"): change it **once** in `NAMES` and everything using `{town}` / `{figure}` follows. Only lines where the old name was typed out directly need a manual search (`Ctrl+Shift+F` for "Emberdeep"); see section 8.

The outline of the story is in `docs/STORY.md`; keep it in step with what you write.

---

## 3. Menus, buttons, labels

**Planned home: `src/ui/strings.js`**, created by the UI session. It does not exist yet. When it lands, this section gets a 5-line "how to read it" and the rest below is the same: change the words in quotes, keep keys.

**Until then**, UI words are written directly inside the screens, in `src/ui/*.js` (menus.js, hud.js, inventory.js, quests.js, skills.js, perks.js, meta.js ...), looking like `text: 'Floor cleared'` or `h('div', { text: '...' })`. Those files are mixed with code, so for now **tell me the screen and the new words in chat** rather than hand-editing. Two small pieces are already pure data:

| What | File | Notes |
|---|---|---|
| First-time tip cards | `src/ui/tips.js`, table `TIPS` | each entry is `id: ['Title', 'Body text', icon]`; edit the two strings only |
| Floor-type names in the banner (`Emberdeep`, `The Crypt`, `Drowned Caves`, `The Inferno`, `The Abyss`) | `src/ui/hud.js` line 8 (`THEME_NAMES`) | edit the words after the colons |

---

## 4. Items

All item words live in `src/items/`. Rule of thumb: **the id never changes, the name does.**

| What | File / place | Example before → after |
|---|---|---|
| **Base item names** (Rusty Sword, Short Sword, ...): 8 names per weapon/off-hand/jewellery type, cheapest to best | `bases.js`, the lists after each `family('sword', ...)` | `['Rusty Sword', 'Short Sword', ...]` → `['Rusty Sword', 'Gravedigger\'s Blade', ...]` Keep **8 names in the same order** |
| **Armour names** are built as *material + piece*, so "Rusted Helm", "Iron Helm" | `bases.js`, `ARMOR_CLASSES`: `mats` (the 8 materials) and `pieces` (Helm/Plate/Gauntlets/Greaves ...) | change `'Rusted'` → `'Pitted'` and every Rusted piece follows. Keep 8 materials |
| **Item type labels** ("Two-Handed Sword", "Heavy Armor") | `bases.js`, `D.TYPE_NAME` | edit the right-hand words |
| **Stat names** in tooltips ("Strength", "Life per Second", "Magic Find") | `bases.js`, `D.STAT_INFO` | `hpMax: ['Life']` → `['Vitality Pool']`. Only the first word in the bracket; the `1` marks a % stat, leave it |
| **Affixes** (Jagged / Vicious / Merciless): each affix has 3 names for weak, mid, strong rolls | `affixes.js`, lines `A('p_dmgpct', ..., ['Jagged', 'Vicious', 'Merciless'], ...)` (prefixes first, suffixes below) | edit just the 3 words in the last `[...]` of text. Never `p_dmgpct`, `'prefix'`, numbers |
| **Rare item names** ("Doom Edge", "Ash Fang"): a random *first word + noun for the item type* | `affixes.js`, `D.RARE_FIRST` and `D.RARE_SECOND` | add or change words in the lists, same style |
| **Uniques** (Elite legendaries: Oathkeeper, Gorehowl ...): name and flavour line | `uniques.js`, `U('oathkeeper', 'Oathkeeper', L, 'sword', 'warrior', 8, [...stats...], 'Sworn on the ashes...', {...})` | change the **second** quoted word (name) and the line of flavour text after the stats. The first quoted word is the id: leave |
| **Mythics** (Worldsplitter, Skyhammer ...) | same file, `U(..., M, ...)`, lower in the list | same rule as uniques |
| **Mythic effect names and descriptions** (Split Shot, Executioner ...) | `uniques.js`, `G.items.EFFECTS` (above the mythics) | edit `name` and `desc`. Numbers in `desc` are the real values: if you change the wording keep them equal to what the effect does, or ask me |
| **Item sets** (Ironbound Oath, Gravecaller's Vestments...) | `uniques.js`, `S('ironbound', 'Ironbound Oath', ...)`, each piece `['ironbound_helm', 'Ironbound Visage', ...]` | the set name = second quoted word on the `S(` line; each piece name = second word in its row. First words are ids |
| **Look families** ("Rusted Mail", "Gravewarden", ...: the armour/weapon appearance lines, shown in the Collection Book) | `looks.js`, `L('rusted_mail', 'heavy', 0, 'Rusted Mail', '#7a5a44', ..., 'Pitted ring-mail...')` | the **fourth** item (display name, after the number) and the last text (description). Colours (`'#...'`) and the `[...]` bonus numbers stay |
| **Gems** (Ruby, Sapphire...; tiers Chipped / Flawed / ... / Perfect) | `bases.js`, `GEM_KINDS` (`name:`), `GEM_TIERS` (the 5 tier words; the empty `''` is the plain tier, leave it), `BLOOD_KINDS` (Bloodstone of Fury ...), `BLOOD_TIERS` | edit `name:` only |
| **Potions and tools** (Health Potion, Jeweler's Chisel, Tome of Insight ...) | `bases.js`, `D.CONSUMABLES`: `name:` and `desc:` | text only |
| **Crafting materials** (Arcane Dust, Ember Shard, Warbrand Ore, Rift Shard ...) | `bases.js`, `D.MATERIALS`: `name:` | not `key:` |
| **Rarity names** ("Uncommon", "Legendary Elite", "Legendary Mythic" ...) | `src/core/constants.js` near line 26: `name:` (and `sub:`) | text only; keys (`legendary:`, `mythic:`) stay |
| **Misc names** ("Gold", "Torn Page", "Set") | `bases.js`, `D.MISC_NAMES` | |
| **Awakening names** (Emberbane, Frostbane ...) | `awaken.js`, `name:` lines at the top | |
| **Collector ranks** ("Apprentice Collector", "Curator's Equal") | `collection.js`, the `name:` in the tier list near line 32 | |
| **The Fallen's relics** (Garrow's Wick ...) | `relics.js` list and `story_data.js` `ADVENTURERS` | see section 5, same text exists twice |

**Example (a unique):**

```js
// before
U('oathkeeper', 'Oathkeeper', L, 'sword', 'warrior', 8, [...],
  'Sworn on the ashes of Emberdeep. It remembers.', {...});
// after
U('oathkeeper', 'Ashvow', L, 'sword', 'warrior', 8, [...],
  'Sworn on the ashes of {town}... it still remembers.', {...});
```

Careful: flavour text in `uniques.js` is **not** run through `{town}`; write the real town name there. Same for `looks.js` descriptions mentioning Emberdeep.

---

## 5. Monsters, bosses, the Fallen, townsfolk

| What | File / place | Notes |
|---|---|---|
| **Monster names and one-line descriptions** (Skeleton, Grave Rat, Cave Goblin ...) | `src/game/data_monsters.js`, `mon('skeleton', 'melee', { n: 'Skeleton', ..., desc: '...' })` | edit `n:` (name) and `desc:`. Leave `'skeleton'` (id), `theme:`, `body:`, numbers |
| **Boss names** | `data_monsters.js`, `mon('boss_tyrant', 'boss', { n: 'Azgalor, the Ember Tyrant', ... })`, **and** `story_data.js` `BOSSES.boss_tyrant.name`, **and** `NAMES.king` for the final boss | rename in **both** places so they match (the data_monsters one is what the game shows) |
| **Boss lines mid-fight** ("Burn with me!") | `data_monsters.js` boss `phases`: `say: '...'`; **move names** (`id: 'Fire Nova'`) are shown as attack warnings | `say:` is safe text. Move names under `id:` are shown, but treat them as ids: ask me before renaming |
| **Elite monster affixes** (Fast, Extra Strong, Fire Enchanted...) | `data_monsters.js`, `game.AFFIXES` | ⚠ The word on the left **is** the id the combat code checks. **Don't rename; ask me**, it takes a small code change too |
| **Rare monster names** ("Gore**fang** the Cruel") | `data_monsters.js`, `game.RARE_NAMES` (`a` = first parts, `b` = endings, `t` = titles) | add or change words freely |
| **Townsfolk names** (Orlen the Peddler, Brakka Ironhand, Seer Ysolde, Sister Maren, Elder Thane, Old Wick) | `data_monsters.js`, `game.NPCS`, `name:` | Names also appear **typed out** in `story_data.js` (e.g. `giverName: 'Orlen the Peddler'`, MILESTONES flavour "Orlen calls you...", "Ysolde says..."). After renaming search for the old name with `Ctrl+Shift+F` |
| **The Fallen (ten former adventurers)** | names in **three** files: `story_data.js` `ADVENTURERS` (shown in banners/story), `src/game/fallen.js` (`fallen('fallen_1', { name: 'Hob Garrow, ...', story: ...`) and `src/items/relics.js` (short name like 'The First Lamplighter') | rename in all three. Ids like `fallen_1` stay |
| **Echo, Curator, camps** | `story_data.js` | section 2 |

---

## 6. Skills, perks, classes

| What | File / place | Notes |
|---|---|---|
| **Class names and descriptions** (Warrior, Ranger ...) | `src/game/data_skills.js`, top: `game.CLASSES` → `name:`, `desc:` | |
| **Class dash/action** ("Shoulder Charge") | same, inside the class: `action: { name: '...', desc: '...' }` | |
| **Skill tree names** (Arms, Berserker, Guardian ...) | same, `trees: [{ id: 'arms', name: 'Arms', desc: '...' }]` | `name`, `desc` only; `skills: [...]` lists ids |
| **A skill's name and description** | same file, `def('bash', { n: 'Bash', ..., text: 'Smash one foe for {dmg}% weapon damage. {stun}% chance to stun for 1.2s.' })`. `n:` = name, `text:` = description | `{dmg}`, `{stun}` etc. are filled with the real (rank-based) numbers; keep them. Plain numbers like `1.2s` in the text are typed by hand: if you change the wording, don't change a number unless the numbers in `v:` change too |
| **Perk names and descriptions** | `src/game/perks.js`, lines `def('w_edge_discipline', 'warrior', 'craft', 1, 0, 'Edge Discipline', '+12% damage with swords, axes and maces.', {...})`. The **4th quoted** piece is the name, the **5th** the description (after the two plain numbers). Everything before it, and the `{ ... }` after, is code | the numbers in the description are typed by hand and not tied to the code; if you reword, keep them true |
| **Perk branch names** (Craft, Edge, Crossroads) | `perks.js`, `BRANCHES` near the top | |
| Perk design intent | `docs/PERKS.md` | read-only reference |

```js
// before
def('w_brute_force', 'warrior', 'craft', 1, 1, 'Brute Force', 'Basic attacks deal 30% more damage; 10% slower attacks.', {...
// after
def('w_brute_force', 'warrior', 'craft', 1, 1, 'Heavy Hand', 'Basic attacks hit 30% harder; you swing 10% slower.', {...
```

---

## 7. Places: floors, landmarks, events, shrines

| What | File / place | Notes |
|---|---|---|
| **Floor variants** (Restless Graves, Mossy Caverns ...): `name:` is the label; `names: [...]` are 2-3 alternate titles | `src/world/variants.js`, each `{ id: 'restless_graves', name: '...', names: [...] }` | edit `name:` and the strings in `names:`. Keep `id`, `theme`, `min`/`max`, `layouts` |
| **Landmark names** (Flooded Crypt, The Forge, Bone Garden, Pyre Court, Hidden Cache, The Leap ...) | `src/world/landmarks.js`, `name:` after the id | the `id` on the left stays. The names "Hidden Cache" and "The Leap" also appear a second time further down in the file; change both |
| **Floor-type names** (The Crypt, Drowned Caves ...) | `src/ui/hud.js`, `THEME_NAMES` | |
| **Act names** (The Shallows, The Deep ...) | `story_data.js` `ACTS` | |
| **Floor events** (Run the Gauntlet, Key Hunt, Cave-in, The Magpie) | `src/game/events.js` ~line 105: `name:` and `goal:` | |
| **Shrine / pillar wagers** (Blood Tithe, Dry Vow, Glass Heart ...) | `src/game/pillars.js` ~line 56: `name:`, `cost:`, `reward:` | |
| **Deep-floor curses/modifiers** (Restless Ground, Hexed Glyphs, Warded ...) | `src/game/deep.js` ~line 223: `name:`, `desc:` | |
| **Floor modifiers** | `src/game/mods.js` | check for `name:` entries (same pattern) |
| **Town layout names** (landmark/building labels in town) | `src/world/town.js` | mixed with layout code; tell me in chat |

---

## 8. Game title and town name

**The game title "Sallow"** is a constant in a few places (all just the word):

| Place | What |
|---|---|
| `src/ui/style.js` line 12: `ui.GAME_NAME = 'Sallow';` | the name shown in-game (title screen, About) |
| `src/items/bases.js` line 14: `D.GAME_NAME = ... 'Sallow'` | used in an item name ("Heart of Sallow") |
| `index.html` lines 8 and 12 (`<title>`, iOS app title) | browser tab and home-screen name |
| `manifest.webmanifest`: `name`, `short_name` | installed-app name |

(Change all four so they agree. Icons and splash art are images; see `ART_LIST.md`.)

**The town "Emberdeep":**

| Place | What |
|---|---|
| `src/ui/story_data.js` → `NAMES.town` | **the main one**. Everything using `{town}` follows it |
| typed-out "Emberdeep" in: `src/ui/hud.js` (`THEME_NAMES.town`), `src/ui/title.js` (fallback tagline), `src/items/uniques.js` (Oathkeeper flavour, "Emberdeep Heirlooms" set), `src/items/looks.js` (Tallow-Iron and Emberforged descriptions), `story_data.js` (a few lines and flavour: `Ctrl+Shift+F "Emberdeep"`) | change by hand; searching the whole project for the old name finds every one |
| `docs/STORY.md`, `docs/DESIGN.md` | keep in step |

---

## 9. Where do I find X?

| I want to change... | Go to |
|---|---|
| The Elder's first line | `story_data.js` → `OPENING` → `elder` |
| The grey note | `story_data.js` → `OPENING.note` (also the first `LORE` page, "The Note") |
| What the Elder says before a main quest | `story_data.js` → `STEPS` → `main_N` → `before` |
| What the Elder says after turning one in | same → `after` |
| Act headings ("Act II · The Deep") and narration | `story_data.js` → `ACTS` |
| The ending | `story_data.js` → `FINALE` |
| A side quest's text | `story_data.js` → `SIDE` (named side lines) or `VENDOR_RAW` (townsperson quests) |
| What a shopkeeper says as the town heals | `story_data.js` → `TOWN` |
| A lore page | `story_data.js` → `LORE` |
| A milestone name / rank title | `story_data.js` → `MILESTONES` |
| A refugee camp NPC | `story_data.js` → `CAMP` |
| A boss's name / intro / death banner | `story_data.js` → `BOSSES` and `data_monsters.js` |
| A boss's in-fight shout | `data_monsters.js` → boss `say:` |
| A Fallen adventurer's name or story | `story_data.js` → `ADVENTURERS`, plus `fallen.js` and `relics.js` |
| A monster's name | `data_monsters.js` → `n:` |
| An NPC's name | `data_monsters.js` → `game.NPCS`, then search story_data.js |
| The name of a sword (base) | `bases.js` → `family('sword', ...)` |
| The name of a unique / mythic | `uniques.js` → `U(...)` (second quoted word) |
| The flavour text under a unique | `uniques.js` → last text on the `U(...)` |
| A mythic's special effect text | `uniques.js` → `G.items.EFFECTS` |
| A set's name or piece names | `uniques.js` → `S(...)` |
| Magic-item prefix/suffix words | `affixes.js` |
| "Doom Edge"-style rare item names | `affixes.js` → `RARE_FIRST` / `RARE_SECOND` |
| Armour material words (Rusted, Iron, ...) | `bases.js` → `ARMOR_CLASSES.mats` |
| A gem's or material's name | `bases.js` → `GEM_KINDS`, `BLOOD_KINDS`, `MATERIALS` |
| A potion's description | `bases.js` → `CONSUMABLES` |
| Rarity colour names (Uncommon, Rare, Legendary Mythic...) | `core/constants.js` |
| A skill's name or description | `data_skills.js` → `def('skill_id', { n:, text: })` |
| A perk's name or description | `perks.js` → `def(...)` (4th and 5th quoted) |
| A class's name | `data_skills.js` → `CLASSES` |
| A floor's name | `world/variants.js` |
| A landmark's name | `world/landmarks.js` |
| An event / shrine / curse name | `events.js` / `pillars.js` / `deep.js` |
| A first-time tip | `ui/tips.js` |
| A button, menu or screen word | `ui/strings.js` once it exists; for now, ask in chat |
| The game title / the town name | section 8 |

**If unsure: send me the exact words you see in the game and the words you want. I'll find the file.**
