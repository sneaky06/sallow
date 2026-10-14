# Items team (G.items) — hand-over notes

Status: complete. `tests/items.html` (launch config `items`, port 8383): 218 assertions pass, no console errors from src/items.
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
  `pickup`/`addToInventory` never use a bag slot: emits `lore:found { loreIndex }` then `item:picked { item }`. Items does NOT write
  `flags.loreFound` — the UI marks it (per R4.1). `rollItem({ baseId: 'lore', loreIndex })` builds one (e.g. quest rewards).
- `G.items.data.GAME_NAME` ('Sallow', or `G.C.GAME_NAME` if core defines it) — the mythic `emberdeep_heart` is now "Heart of Sallow".
