# Items team (G.items) — hand-over notes

Status: R5 complete. `tests/items.html` (launch config `items`, port 8383): 483 assertions pass, no console errors from src/items (also checked in the real index.html with the R5 game/engine/ui code).
Loads cleanly through the real `index.html` loader and works with the game team's `createPlayer` / `recomputeStats`.

## Things other teams should know

- `item.value` IS the gold sell price (per unit; stacks pay `value * qty`). Vendors charge 4x: `G.items.buyPrice(item)`.
- `getEquipmentMods(player)` returns EVERY key of `G.C.STATS` (0 when absent), so `mods.armor + x` is always safe.
  Includes armour/shield base (armor, block), all mods, socketed gems, set bonuses. Weapon base damage is only in `getWeapon`.
- `getWeapon` unarmed default: `{ dmgMin: 1, dmgMax: 3, attackSpeed: 1.2, weaponType: 'none', twoHanded: false }`.
- `item.mods` entries may carry `implicit: true` (base-type implicits such as dagger crit, staff skill damage). Same shape otherwise.
- Extra plain-data fields that can appear on items: `plus` (blacksmith upgrade level 0-5), `base0` (pre-upgrade base), `sockets: [gemItem|null]`.
- Gold, belt potions (`potion_hp`/`potion_mp`) and materials (`mat_dust`/`mat_shard`/`mat_essence`) never occupy a bag cell:
  `addToInventory`/`pickup` route them to `player.gold`, `player.potions`, `player.materials = { dust, shard, essence }`.
  Belt cap is 20 per kind; overflow potions are auto-sold for a few gold.
- `G.items.data.ensure(player)` is called by every entry point: it pads `inventory` to INV_SIZE, fills `equipment` slots, and creates
  `potions` / `materials` if missing. `state.stash` is padded to STASH_SIZE on first stash use.
- Equip does NOT block weapons by class (contract doesn't say to). `isUpgrade` returns false for weapon types outside
  `G.game.CLASSES[classId].weaponTypes`, and the tooltip adds a red "Not a weapon of your class" line.
- `dropLoot` plays ONE sfx per call (best rarity: `loot` / `loot_rare` / `loot_legendary`), emits `fx:spawn lootbeam` for rare+ and a
  `ui:toast` for legendary/set/mythic. `pickup` plays `gold` / `potion` / `click`.
- Vendor stock lives in module memory (not in `G.state`, not saved); `refreshVendors(level)` rebuilds it. `buy()` splices bought
  entries out, so re-read `getVendorStock(role)` after `inventory:changed`. Entries with `infinite: true` stay.
  merchant = general gear + flask/tome/chisel, blacksmith = weapons + armour, mystic = jewellery + orbs/tomes + gems, healer = flask.
  elder / stashkeeper = [].

## Non-contract helpers (additive; UI may use them)

- `G.items.equip(invIndex, 'ring1'|'ring2')` — optional second arg picks the ring slot (default: empty slot, else the weaker ring).
- `G.items.rollItem({ uniqueId })`, `rollItem({ baseId: 'gem_ruby_3' | 'flask_rejuv' | 'mat_dust', qty })`.
- `G.items.gambleCost()`, `upgradeCost(item)` → `{gold,dust,shard,essence}|null`, `salvageYield(item)`, `buyPrice(item)`.
- `G.items.socketGem(gemInvIndex, invIndexOrSlot)`, `combineGems(invIndex)` (3 → next tier), `sortStash()`.
  `useItem(gemIndex)` auto-sockets into the first equipped item with an empty socket.
- `G.items.statLabel(stat)`, `formatStat(stat, value)` → "+15% Critical Chance". `compare()` may also return a `dps` key (weapon swaps).
- `G.items.rarityChances(magicFind, boost)` → probability per rarity.
- Tables: `G.items.data.UNIQUES`, `.SETS`, `.BASES`, `.GEM_KINDS`, `.CONSUMABLES`.

## Revision 2 (items) — what changed for other teams

- Mythics carry `effects: [effectId]` (exactly one). `G.items.EFFECTS[id] = { name, desc }`, `G.items.getActiveEffects(player)`.
  Elites (rarity key `legendary`) and set pieces never have `effects`.
- Gems: cut gems `gem_<kind>_<1-5>` (removable) and bloodstones `blood_<kind>_<1-3>` (item has `permanent: true`).
  `unsocketCost(item, i)` → gold, or null for empty socket / bloodstone. `unsocketGem(invIndexOrSlot, i)` → bool.
  NOTE for UI: `socketGem` and `useItem(gem)` do NOT ask for confirmation themselves — check `gem.permanent` and confirm first.
  `combineGems` refuses bloodstones. Vendors never stock bloodstones.
- Buyback: `getBuyback()` → live array `[{ item, price }]` newest first (max 12), `buyback(index)`. Cleared on `scene:changed` to 'dungeon'.
  Both `sell` and `sellAllBelow` feed it. A sold stack comes back whole.
- Tooltip: weapons show a grey "Favoured by <Class, …>" line; the red off-class line is gone. `isUpgrade` only refuses an off-class
  weapon when an on-class weapon is already equipped.
- Numbers: vendors now charge 6x `item.value` (was 4x); `gambleCost()` = 60 + 6·level²; `reqLevel` = round(0.75·ilvl), capped at 60.
- Observed while testing (not mine): at the time of the R2 run `src/game/combat.js` (line 10, "Illegal return statement") and
  `src/game/skills.js` (line 212, "Unexpected end of input") failed to parse in the real index.html — presumably mid-edit.

## Revision 3 (items) — API for the UI / game teams

- `verdict(item)` → 'up' | 'down' | 'same' | null (null: not equipment, above your level, or the item is worn). `isUpgrade(item)` = verdict === 'up'.
  Weapons are judged on offence first (whatever class favours them); filling an empty slot is always 'up'.
- `getTooltip(item).headline` → `{ label, value, delta, pct, stat? }` | null. label 'DPS' (weapons, base + item flat dmg x item %dmg),
  'Armor' (armour pieces / shields), else the item's best stat for the class (`stat` = its key). `delta` vs what it would replace,
  null for worn items. Tooltip lines are shorter (req + item level on one line, set piece list dropped — count + bonuses kept).
- Junk: `isJunk(item)`, `processJunk()` → `{ count, gold, materials: { dust, shard, essence, gemdust } }` (sell = town only; salvage anywhere).
  auto+salvage: junk is salvaged on pickup (no bag space needed) and `item:picked` carries `{ item, salvaged: true, materials }`, no toast.
  auto+sell: sold on `scene:changed` → 'town' with one summary toast. Sets and Legendary Elite/Mythic are never junk / never bulk-sold.
- Gem dust: `player.materials.gemdust`. `salvagePreview(invIndex)` → `{ materials, gems, gemdust }` (warn if gems > 0; valid before a sale).
  Blacksmith: `gemUpgradeCost(invIndex)` → `{ gemdust, gold }` | null, `upgradeGem(invIndex)` (cuts ONE gem of a stack, cut gems only).
  Mystic: `rerollCost(invIndexOrSlot, modIndex)` → `{ gemdust, gold }` | null, `rerollAffix(invIndexOrSlot, modIndex)` (rare+;
  implicits and a unique's authored mods are fixed; cost grows per reroll; `item.rerolls` counts them).
- Bloodstones: `useItem` refuses; `socketGem(gemIndex, target, { confirmPermanent: true })` — R3.3's (target, gemIndex, opts) order also works.
- `dropLoot` / `rollLoot` accept source 'legendary' and a public `opts.floor` (rarity key for the best item).

## Revision 4 (items)

- Legendary Elite base chance 0.125% per item (was 0.25%); source multipliers unchanged; odds are stateless (no pity anywhere).
- Lore pages: `{ id, baseId: 'lore', type: 'lore', loreIndex, name (G.meta.LORE[i].title or 'Torn Page'), rarity: 'rare', icon: scroll, value: 0 }`.
  Drop chance per kill/open: boss 30%, legendary monster 15%, rare monster 4%, chest 4%; never normal/champion/barrel.
  Index is drawn from pages not in `state.flags.loreFound` and not already on the floor; range = G.meta.LORE.length or 16.
  `pickup`/`addToInventory` never use a bag slot: emits `lore:found { loreIndex }` then `item:picked { item }`. Since R5.5 items also
  writes `flags.loreFound` as a safety net (the UI still marks it). `rollItem({ baseId: 'lore', loreIndex })` builds one (e.g. quest rewards).
- `G.items.data.GAME_NAME` ('Sallow', or `G.C.GAME_NAME` if core defines it) — the mythic `emberdeep_heart` is now "Heart of Sallow".

## Revision 5 (items)

New files: `looks.js` (look families + Matched), `pallor.js` (bleached drops), `awaken.js` (kill tallies + awakening). Manifest order:
bases, affixes, uniques, looks, generate, info, inventory, economy, pallor, awaken.

- **Piles (R5.6).** Ground entry = `{ id, x, y, item, pileId }`. Everything from one `dropLoot` lands on ONE point: the centre of
  `G.world.findFreeTileNear(map, x, y, 4)` (raw x, y without a world). A drop within 0.75 tiles of an existing pile joins it (same
  pileId and x, y); gold is one entry per pile (merged gold just grows `qty`, no new `loot:dropped`). `dropItemAt` piles too.
  `getPile(id)` → ground entries best first (by rarity, equipment before misc of the same rarity, gold last).
  `pickupPile(id, { minRarity? })` → `{ taken, left, full, items }`; gold / potions / materials / lore are always taken. It is QUIET
  (no sfx/toast) — the caller presents it; `item:picked` etc. still fire per item. `dropLoot` returns `loot.pileId`.
  `pickup(groundId, quiet)` has an optional quiet flag.
- **Sorting (R5.7).** `sortInventory(mode)` / `sortStash(mode)`, mode ∈ rarity | level (ilvl) | slot | value (value×qty) | upgrades
  (▲, =, ▼, then non-gear) | newest (`foundAt`). Stable; ties → rarity, ilvl, previous order. No mode = `state.settings.sort`, else 'slot'.
  `item.foundAt = state.time` on pickup, and on any `addToInventory` when missing (buy, gamble, quest reward).
- **Mass sell + lock (R5.8).** `previewSellAtOrBelow(r)` → `{ count, gold, gems }`; `sellAtOrBelow(r)` → `{ count, gold }` (feeds
  buyback). Equipment only; never sets, Legendary Elite/Mythic, locked, or unrevealed bleached items. `toggleLock(target)` /
  `setLocked(target, bool)`, target = item | bag index | slot name | `{ stash: i }`. Locked = refused by `sell` and `salvage`, never
  junk, never bulk-sold. `getTooltip(item).locked` mirrors it (also `.bleached` while a secret is hidden).
- **Looks (R5.9).** Weapons, off-hands, armour and belts carry `item.look = { family, palette: { main, trim, accent, glow? }, material }`
  (material: plate | mail | leather | cloth | bone; glow only on emissive families). Armour items also carry `item.armorClass`.
  Every base has a default `def.look`; `G.items.getLook(item)` falls back to it for old saves. A new drop picks any family of its
  kind in its band (15% from the band below). Family table: `G.items.LOOKS[id] = { id, kind, band, name, palette, desc, material,
  matched? }`. **Matched:** 2 / 4 of helm, chest, gloves, boots in one family (set and unique families never match) adds
  `matched[2]` (+ `matched[4]`) in `getEquipmentMods`; `getMatched(player)` → `{ family, name, count, bonuses } | null`.
  Tooltip: "<Family> look · Matched n/4", plus one bonus line once n ≥ 2 (unworn pieces preview the count they would make).
- **Awakening (R5.3).** On `monster:killed` every worn item gets `kills++` and `tally = { theme, dtype, body }` counters (victim info
  from `G.game.MONSTERS[monsterId]`, falling back to the entity / map theme). At 250 / 1000 / 5000 it awakens one affix into
  `item.awakened = [{ stat, value, at, name, key }]` (counted in getEquipmentMods / verdict / DPS). Theme: a dominant element (≥ 35%
  of kills) first, else the most-killed body type, else the theme; weapon → offence, armour → defence, jewellery → mixed; never the
  same stat twice. Toast + `loot_legendary` sfx + recompute. `G.items.AWAKEN_AT = [250, 1000, 5000]`, `G.items.recordKill(monster)`.
- **Pallor / bleached (R5.2).** `dropLoot`/`rollLoot` accept `pallor`: the 0-100 value (tiers from `G.game.PALLOR_TIERS[i].min`,
  default 10/30/60/90) or `{ value, tier }`. Per tier t: rare & epic odds ×(1 + 0.2t) (Legendary Elite, Mythic and set odds
  untouched), one extra-item chance per tier (8% trash, 25% elites/chests/bosses), gold +10%·t. From tier 2, 10% / 16% / 24% of
  equipment drops are `bleached: true` with `hidden: [{ stat, value }]` (one affix, top half of its range, a stat the item lacks).
  Arriving in town (`scene:changed` → town) reveals bag + worn + stash: mods appended with `bleached: true`, `item.revealed = true`,
  one toast. `player:died`: worn bleached secrets fade (`item.faded`); the backpack follows the corpse (a retrievable death leaves
  it intact — reclaim it and carry it home to reveal), a noRetrieve death fades the backpack's too. Unrevealed bleached items are
  never junk. `G.items.revealBleached()` is public.
- **Lore (R5.5).** Items now also pushes `loreIndex` into `state.flags.loreFound` on pickup (never twice).

Measured drop feel (normal monster, depth 40, 0 MF, 12k kills per row):

| Pallor tier | items / kill | rare+ share of gear | bleached share | gold / kill |
|---|---|---|---|---|
| 0 | 0.47 | 11.3% | 0% | 38 |
| 1 | 0.56 | 14.9% | 0% | 41 |
| 2 | 0.63 | 17.0% | 9.6% | 45 |
| 3 | 0.72 | 19.6% | 16.5% | 49 |
| 4 | 0.79 | 21.6% | 24.2% | 54 |

### Look families (for the hand-drawn overlays)

Bands follow the base tier: band 0 = tiers 1-3 (item level 1-19), band 1 = tiers 4-6 (20-47), band 2 = tiers 7-8 (48+).
Palette = main / trim / accent (✦ = the accent glows).

| family | kind · band | name | main · trim · accent | what it looks like | Matched (2) / (4) |
|---|---|---|---|---|---|
| rusted_mail | heavy · 0 | Rusted Mail | #7a5a44 #4a3a2e #c26a3a | pitted ring-mail, rust blooms, dented kettle helm | +3% all res / +4% block, +5% dmg |
| gravewarden | heavy · 0 | Gravewarden | #8a7a4a #3e5a4a #7fc8a0 | verdigris bronze scales, crypt-guard tabard, grilled visor | +10% poison res / +1% life steal, +5% dmg |
| tallow_iron | heavy · 0 | Tallow-Iron | #9aa3ad #e8dcb0 #ff9a3c | wax-stained militia plate, candle stub on the helm | +10% fire res / +10% crit dmg, +3% block |
| ash_plate | heavy · 1 | Ash Plate | #3a3636 #6a6260 #ff6a2a ✦ | soot-black plate, glowing ember seams | +12% fire res / +8% dmg, +4% all res |
| bellfounder | heavy · 1 | Bellfounder's | #b8862a #5a3a1a #ffe08a | ridged cast bronze, bell-shaped helm with a slit | +5% block / +6% all res, +4% atk speed |
| chainpriest | heavy · 1 | Chainpriest | #5a5a66 #8a1a22 #c8c8d0 | plates hung on chains over red cloth, padlock buckles | +1% life steal / +8% dmg, +2% crit |
| pallbearer | heavy · 2 | Pallbearer | #e0dccb #1e1c22 #b8a060 | bleached enamel over black iron, coffin-nail rivets, veil | +6% all res / +10% dmg, +4% CDR |
| cinder_king | heavy · 2 | Cinderking | #2a1a16 #d9a63a #ff5b2b ✦ | charred plate split by molten-gold seams, slag crown | +15% fire res / +10% dmg, +15% crit dmg |
| abyss_carapace | heavy · 2 | Abyss Carapace | #2a2238 #6a4a9a #b98cff ✦ | violet-sheened chitin plates, mandibled helm | +15% poison res / +6% block, +2% life steal |
| grave_wrap | light · 0 | Grave Wraps | #8a7e66 #4a3a2a #a8a08a | burial linen bound in leather thongs, muddy | +10% poison res / +3% dodge, +4% move |
| ratcatcher | light · 0 | Ratcatcher | #6e5a44 #3a2e24 #c8b070 | patched leathers, belt of tails, wide-brim hood | +10% gold find / +4% atk speed, +6% MF |
| mosshide | light · 0 | Mosshide | #4f6a3a #3a2e1e #9ac860 | damp hide overgrown with cave moss | +8% poison res / +3% dodge, +2% crit |
| hollowmoth | light · 1 | Hollowmoth | #7a7062 #4a4238 #d8d0b0 | dust-grey leathers, moth-wing capelet | +3% dodge / +5% move, +12% crit dmg |
| cinderfox | light · 1 | Cinderfox | #a8542a #3a2418 #ffd08a ✦ | rust-red fox fur over scorched leather, fox-mask hood | +12% fire res / +5% atk speed, +2% crit |
| nightjar | light · 1 | Nightjar | #2a3048 #1a1a24 #8fa8ff | midnight-blue leather fletched with dark feathers | +4% move / +4% dodge, +3% crit |
| sallowskin | light · 2 | Sallowskin | #d8cc98 #6a5a3a #f0e8c0 | pale yellowed sunless hide, still warm | +8% MF / +4% dodge, +18% crit dmg |
| wyrmscale | light · 2 | Wyrmscale | #2a3a2a #0e1a12 #7be04a | oily green-black scales, frilled hood | +5% all res / +6% atk speed, +8% dmg |
| veilrunner | light · 2 | Veilrunner | #9aa4b0 #4a5260 #e8f4ff | grey gauze over leather, smoke-like edges | +4% dodge / +6% move, +3% crit |
| candlewick | cloth · 0 | Candlewick | #e0d8c0 #4a3a2a #ffb347 | wax-white vestments, sooty hem, wick-cord cuffs | +8% fire res / +4% cast, +5% skill dmg |
| penitent | cloth · 0 | Penitent | #8a7a5a #5a4a32 #c8b890 | hessian sackcloth, rope belt, low hood | +3% all res / +3% CDR, +5% skill dmg |
| ossuary | cloth · 0 | Ossuary Linen | #b8b2a0 #5a5448 #e8e0c8 | grey linen strung with knucklebone beads, skull-cap | +10% poison res / +6% skill dmg, +1% mana steal |
| ashen_choir | cloth · 1 | Ashen Choir | #6a6668 #8a1a22 #e8dcc8 | ash-grey choir robes, blood-red stoles, high collar | +4% cast / +8% skill dmg, +4% all res |
| starless | cloth · 1 | Starless Silk | #1e2448 #9aa8c8 #e8f0ff ✦ | navy silk with silver false constellations | +12% lightning res / +3% crit, +4% CDR |
| rookmask | cloth · 1 | Rookmask | #1a1a1e #4a4440 #c8a060 | black waxed cloth, beaked plague cowl, brass spectacles | +12% poison res / +8% skill dmg, +4% cast |
| pale_court | cloth · 2 | Pale Court | #ece6d6 #c8a040 #ffffff | ivory court robes, gold trim, pearl face-veil | +6% all res / +10% skill dmg, +5% CDR |
| voidweave | cloth · 2 | Voidweave | #1a1028 #5a2f8a #d0a0ff ✦ | black-violet cloth folding inward, drifting pinpricks | +15% cold res / +6% cast, +3% crit |
| emberhymn | cloth · 2 | Emberhymn | #8a1a1a #d9bd6a #ff8a2b ✦ | crimson vestments with gold flame-hymns, smouldering hem | +15% fire res / +10% skill dmg, +15% crit dmg |
| pitted_iron | weapon · 0 | Pitted Iron | #8d7b68 #5a4632 #c26a3a | old pitted iron, leather-wrapped grips | — |
| bonecarved | weapon · 0 | Bonecarved | #d9d4c0 #6b6455 #8a1a22 | grips, hafts and guards of yellowed bone | — |
| hearthwood | weapon · 0 | Hearthwood | #7a5a3a #3a2a1e #ffb347 | scorched dark oak banded with copper | — |
| blackiron | weapon · 1 | Blackiron | #2e2e34 #6a6a78 #c8d0e0 | blued black iron, bright edges | — |
| gravesilver | weapon · 1 | Gravesilver | #c0c4cc #3a3a48 #7fd4ff | tarnished silver etched with funeral prayers | — |
| emberforged | weapon · 1 | Emberforged | #5a2a1a #d9a63a #ff6a2a ✦ | forge-quenched, the fuller still glows | — |
| pallid | weapon · 2 | Pallid | #e8e2cc #8a8070 #f8f4e0 | bleached like old teeth, drinks the light | — |
| abyssal | weapon · 2 | Abyssal | #1a1028 #6a4a9a #b98cff ✦ | grown not forged, ridged violet-black | — |
| starfallen | weapon · 2 | Starfallen | #3a4a6a #c8d8ff #fff06a ✦ | meteoric metal flecked with light | — |
| juggernaut | unique | Juggernaut | #4a4a58 #2a2a30 #ff5b2b ✦ | slab plate, furnace-grille visor (Juggernaut Plate) | — |
| shadowstep | unique | Shadowstep | #2a2a3a #1a1a22 #8a5fd0 | leather blurred like a double shadow (Shadowstep Jerkin) | — |
| pale_king | unique | Pale King | #c8c8d8 #5a2f8a #e8e0ff | frost-white and violet grave-clothes (Shroud of the Pale King) | — |
| archmagi | unique | Archmagi | #d9bd6a #2a2a6a #5b8cff | tall gold crown-cowl, seven blue stones (Crown of the Archmagi) | — |
| lich_emperor | unique | Lich Emperor | #e8e0c8 #2a1a22 #ff3b4e ✦ | bone crown fused to a hood, red eye-light | — |
| cinderlord | unique | Cinderlord | #ff5b2b #2a1a16 #ffe45b ✦ | mantle of living embers over a charred robe | — |
| rimewalkers | unique | Rimewalkers | #d8f4ff #6a8aa8 #ffffff ✦ | frost-rimed boots trailing ice crystals | — |
| ironbound, nightstalker, cinderweave, gravecaller | set | set name | see looks.js | each set's visible pieces share one family | — (set bonuses instead) |

Weapons and off-hands (shields, orbs, tomes) use the weapon lines; belts use the light lines (not drawn, never matched). Uniques
without a family of their own join a line of their band (picked by id hash) with `palette.main/accent` = the unique's own colours.

## Revision 6 (Loot & Economy)

- **Echo reward (R6.2).** New loot source `echo` in `D.SOURCES` (generate.js): 2-4 items, first one guaranteed rare-or-better, 2.5x boost,
  gold x8, a few gems/materials. Game calls `G.items.dropLoot(x, y, { source: 'echo', level: depth, magicFind, pallor })`; `opts.floor`
  (e.g. 'epic') still raises the guaranteed rarity for any source. Legendary Elite / Mythic / set odds are untouched (boost ignored by mythic,
  no `elite` on echo). Corpse items are plain JSON: a corpse holding bleached and corrupted gear round-trips through save/load and back
  into `addToInventory` (test: "R6.2 Echo reward & corpse save round trip").
- **Corrupted items and cleansing (R6.5)** — new `src/items/corrupt.js`, loaded after pallor.js.
  - Chance per equipment drop (rare/epic only, never uniques/sets): 0 below item level 8, then +1.2% per level up to 35% (`D.CORRUPT`),
    times a per-source factor (boss/legendary/echo 1.5, rare 1.2, barrel 0.2). `opts.corruption` (0..1) on `dropLoot`/`rollLoot` replaces
    the depth curve — the game can use it for rift floors or world-gen "corrupted" modifiers. Corruption wins over bleaching on the same drop.
  - A corrupted item gets: an **upside** affix (`mod.corrupt='up'`, top-quality roll x1.5, `mod.pure` keeps the normal value), a
    **drawback** (`mod.corrupt='down'`, negative: all res, life, armor, move speed, mana, gold find, magic find, life regen) and a hidden
    **latent** affix in `item.latent` (not counted; tooltip shows `???`). Name gets a "Corrupted" prefix, `item.corrupted = true`.
    All mods are normal `item.mods` entries, so stats, DPS, verdict and saves need no changes. Sell value +25%. Corrupted mods cannot be rerolled at the mystic.
  - **Cleansing:** `G.items.cleanseCost(target)` -> `{ gemdust, shard, gold }` (target = item, bag index or equipment slot; null if not corrupted),
    `G.items.cleanse(target)` -> bool. Removes the drawback, reveals the latent affix (`mod.cleansed`), settles the upside to normal strength
    (`corrupt='pure'`), renames "Cleansed ...", `item.cleansed = true`, recomputes stats if worn. Uncleansed = raw power with a cost;
    cleansed = safe and a bit more varied. **UI needs a Cleanse button at the blacksmith** (tooltip has `tip.corrupted`; lines are purple
    for corrupted power, red for the drawback).
  - Not done / ideas: corrupted uniques ("Rift-touched" variants with an extra effect), a dedicated rift material from corrupted monsters
    (cleanse currently uses gem dust + Ember Shards so it works with today's economy), Pallor as the rift seeping in (corruption chance
    could scale with Pallor tier — one line in `D.corruptChance`), corrupted gems.
- **Where player-facing names live (for the one-pass rename).**
  - Base item names + tier names: `bases.js` (`family(...)` calls, `D.TYPE_NAME` for family labels, `D.GEM_TIERS` / `D.GEM_KINDS`,
    `D.BLOOD_TIERS` / `D.BLOOD_KINDS`, `D.CONSUMABLES`, `D.MATERIALS`, `D.GAME_NAME`, new `D.MISC_NAMES` = Gold / Torn Page fallback).
  - Affix names (prefix/suffix, three tiers each) and rare-name words: `affixes.js` (`A(...)` rows, `D.RARE_FIRST`, `D.RARE_SECOND`).
  - Uniques, Legendary Elite, Mythic, set names, flavor text, set definitions, mythic effect names: `uniques.js` (`U(...)`, `D.SETS`, `EFFECTS`).
  - Look families (Rusted Mail, Ash Plate ...) names/descriptions: `looks.js` (`I.LOOKS`).
  - Awakening affix names (Emberbane ...): `awaken.js` top table. Corruption words and drawback list: `corrupt.js` `D.CORRUPT`, `D.CORRUPT_DRAWBACKS`.
  - Rarity names/colours belong to core (`G.C.RARITY`). Remaining literals in logic are toasts/UI sentences only (Sold / Salvaged / Gambled ...
    in economy.js, tooltip sentences in info.js), not names of things.

## Revision 7 (Loot & Economy) — APIs for the UI and combat teams

**Rarity ladder (R7.1).** `C.RARITY` (src/core/constants.js) is now `common, uncommon, rare, magic, legendary, mythic, unique, rift` (orders 0-7), each with
`glow` (0-4: 0 common/uncommon/rare, 1 magic, 2 Legendary Elite, 2.5 mythic, 3 unique, 4 rift) and rift also `pulse: true`. Colours: grey, green, blue, purple,
yellow, orange, red, pink. **Old keys are gone: `epic` and `set` no longer exist, and the *meaning* of `magic` moved (old magic = `uncommon`, old epic = `magic`).**
Any code outside src/items that compares rarity strings must change (`src/ui/quests.js:13` uses `'epic'`; `src/ui/menus.js:88` filters `'set'`).
- Set pieces are `rarity: 'legendary'` with `item.setId` (tooltip type line reads "Legendary Elite · Set ..."; `D.MISC_NAMES.setTag`). Test sets with `item.setId`.
- Corrupted items (R6) are `rarity: 'unique'` (`item.corrupted`). `rift` items are 6 hand-authored pieces in uniques.js (`rift_*`), item level 21+, about 1 in 25 000
  drops (`D.RIFT_P`, `D.RIFT_MIN_ILVL`); Elite / Mythic / set odds unchanged (`D.BASE_P` untouched, rarityChances keeps its internal `set` bucket).
- **Save migration:** every new item has `rv: 7`. Items without it are migrated once (magic→uncommon, epic→magic, set→legendary, corrupted→unique) by
  `G.items.migrateState()` (runs on every `scene:changed` and, for the player's gear, inside `D.ensure`). Call `G.items.migrateState()` right after loading a save if you
  render before the first scene change. The saved junk rule (`settings.junk.maxRarity`) migrates too. Junk / sell-up-to-rarity keys are the new keys.
- `rollItem({rarity:'set'})` still works as "a set piece".

**Power (R7.2).** `G.items.power(item, classId?)` -> integer (0 for non-equipment); class defaults to the current player. Formula: 0.35 x class-weighted stat score
(weapon DPS, base armour, every counted mod) x (1 + 4% per +upgrade) + 3 x item level x slot weight + sockets (4 empty / 14 filled) + 60 per effect + 20 for a set piece.
Tunables in `D.POWER`. Average warrior weapon: common@1 12, uncommon@10 89, rare@20 242, rare@30 385, magic@40 623, Elite@40 695, Mythic@40 961, Rift@40 1080.
`getTooltip(item).headline` is now `{ label: 'Power', value, delta, pct: false }` (delta vs everything it would displace, null when worn); the old DPS/armour/best-stat
headline lives on `tip.detail`. `I.verdict` compares total Power of the loadout (set bonuses included). `tip.wanted` and `tip.corrupted` are new booleans.

**Sockets (R7.3).** `D.SOCKET_MAX(item)` grows with level: chest and two-handers 2 (+1 at ilvl 25, +1 at 45), one-hand weapon / shield / helm 1 (+1 at 30, +1 at 50), others 1 (+1 at 40).
Each extra socket is rarer (`D.SOCKET_MORE`: 2nd 30%, 3rd 8%, 4th 2%); about 3.5% of socketed drops are pre-filled with cut gems (`D.SOCKET_PREFILL`, never bloodstones).
`item.sockets` is `[null | gem]` as before; the UI draws pips from it. The chisel still adds one up to the maximum.

**New drops and materials (R7.4).** All names in `D.MATERIALS` / `D.CONSUMABLES` (bases.js).
- Class materials `mat_cls_warrior|ranger|sorcerer|necromancer` (Warbrand Ore, Hawkfeather, Star Salt, Grave Ash), counters `p.materials.forge_<class>`; only the current class's
  drops (rare 40%, boss always 2-4). `I.upgradeCost(item)` gains `classMat` (the counter key) and `[classMat]: n + 1` for weapons and the class's armour weight; `I.upgrade` pays it.
- **Tome of Insight** (`tome_skill`, legendary-coloured consumable, 1 skill point): ~0.2-0.4% from champions/rares, 5% bosses, 8% Echo. Use it, or call
  **`G.items.grantTome(n = 1)`** directly for guaranteed boss / fallen rewards (adds `p.skillPoints`, toast, `player:stats` + `skills:changed`). The old XP item is renamed Tome of Lessons.
- **Rift Shard** `mat_rift` (`p.materials.riftshard`): from depth 8, champions 4% up to bosses 100%; the currency of **cleansing** (cleanse cost is now gem dust + Rift Shards + gold).
- **Champion's Trophy** `trophy`: a stackable that only sells (value 60 + 12 x level); champions 6%, rares 25%, bosses 50%.
- Loot sources `echo` (R6.2) and the `corruption` option are unchanged from the R6 notes.

**Collection Book / Curator (R7.11)** — `G.items.collection` (src/items/collection.js; state in `state.flags.collection`, plain JSON):
`getPages()` -> `[{ id, name, kind, hint, count, total, done, reward: { buff: [[stat, value]], title? }, entries: [{ key, label, have, item }] }]` (one page per look family and set, 47 pages;
armour pages = helm/chest/gloves/boots, weapon pages = 13 weapon and off-hand types, set pages = their five pieces, unique-family pages = the unique);
`getProgress()` -> `{ pages, total, tiers: [{ at, need, name, claimed, mats, buff, stash }], titles, stash }`; `register(bagIndex[, 'stash'])` -> `{ ok, page, entry, completed, tiers }` (consumes the item);
`registerAll()`; `isWanted(item)` (the book mark; wanted items are never junk and never bulk-sold while `D.COLLECTION.protect` is true); `entryOf(item)`;
`setAuto(bool)` / `isAuto()` (auto-register when `scene:changed` -> town; skips locked items). Events: `collection:registered`, `collection:page`, `collection:tier`.
Rewards are data in `D.COLLECTION` (`buffs` rotated per page, set pages x3 and a title; tiers at 5 / 15 / all = materials + bigger buff + stash rows + title). Permanent buffs
flow through `getEquipmentMods`. **Meta/UI to build:** apply `getProgress().stash` extra stash rows, show titles, the Curator NPC and book screen. `D.COLLECTION.protect = false` turns the junk protection off.

**Relics of the Fallen (R7.10)** — `G.items.RELICS` (10: `fallen_1`..`fallen_10`, depths 3, 6, 9, 13, 16, 19, 21, 24, 28, 35; Brannoc = `fallen_2`, Wren = `fallen_4`,
Varr = `fallen_8`, Crane = `fallen_9`; the rest are placeholder names), `I.RELIC_IDS`, `I.RELICS_COMBINED`. API: `grantRelic(id)` (combat calls this on the fight's end; ids stored in
`state.flags.relics`), `hasRelic`, `getRelics`, `relicCount`, `canCombineRelics()`, `combineRelics()` (at the Elder; sets `flags.relicsCombined`), `getRelicMods()` (already inside
`getEquipmentMods`), `getRelicEffects()` -> `{ dash_shield_bash, dash_reload, ramping_fire, extra_minion, ember_heir }` for the combat team to implement. Events: `relic:granted`, `relic:combined`.

Names to rename later (extra since R6): relic names/stories in relics.js, collection words in `D.COLLECTION`, rarity names in `C.RARITY`, material names in `D.MATERIALS`.

**R7.1 correction (unique / rift rarity).** Corruption is now a frequent "tainted" modifier that does NOT change rarity (`item.corrupted`, name prefix, upside/drawback/latent as before; a corrupted Rare stays Rare). Only `D.CORRUPT.uniqueP` (0.003%) of corrupted drops are promoted to the red `unique` tier, so Unique overall is at most ~1.6e-5 per item, below the Mythic rate (2e-5); `D.RIFT_P` is now 2e-6 (below Unique). Old corrupted saves keep their migrated tier.

## Revision 8 (Loot & Economy)
- **Chute / surface (R8.1).** `state.surface = []` (plain JSON; **meta must save and load `state.surface`** and bump the id counter past its items). `G.items.chuteSend(index | [indices])` -> count sent; `sendJunk()` -> `{ count }` (sends every bag item `isJunk` says is junk; junk "auto" no longer sells/salvages in the field and pickup no longer auto-salvages); `previewSendJunk()` -> `{ count }`; `getSurface()`; `surfaceTake(i)` (anywhere); town-only `surfaceSell(i)`, `surfaceSalvage(i)`, `surfaceRegister(i)`, `surfaceStash(i)`. Event `surface:changed { count }`. **Sell, salvage, mass-sell, junk processing and `collection.register` return false/0 with a red toast outside `state.scene === 'town'`.** Selling on arrival in town (auto + sell) is unchanged.
- **Out-of-class weapons (R8.7).** `G.items.classPenalty(item, classId?)` -> `{ dmgPct: -35, text }` or null (weapon type not in `G.game.CLASSES[classId].weaponTypes`, else the built-in profile). Tooltip: `tip.penalty` plus a red line. Power and the verdict apply x0.65 to that weapon's damage; combat should read the same function. Tunable: `D.PENALTY`. Armour weight carries no penalty yet.
- **Auto-sort (R8.5).** `G.items.autoSort()` sorts bag and stash by `state.settings.sort` when `settings.autoSort !== false` and a mode has been chosen; it runs whenever an item enters the bag or stash (pickup, stash moves, `surfaceTake`). Returns whether it sorted.
