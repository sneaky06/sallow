# Audit — items (`src/items`, `G.items`)

Read-only outside review, 2026-10-15, against `main` @ cd5dc23. Method: read every file in the manifest, grepped every other
directory for calls into `G.items`, listed every public `I.*` and checked runtime existence in the live game, and ran probes in
the in-app browser (probes never wrote a save: `meta._noSave` set). Severity: critical / high / medium / low.
"Verified" = reproduced at runtime, not just read.

## 1. Correctness bugs and edge cases

| # | Sev | Where | Finding | Fix |
|---|---|---|---|---|
| IT-1 | **high** | `r16.js:24-28`, `ui/filter.js:26-42`, `engine/render.js:382-394`, `game/player.js:577-580` | **The ground loot filter does nothing.** Items reads `settings.lootFilterRules` as a flat `{ enabled, maxRarity, … }`; the UI saves `{ cur: {enabled, rarity, …}, presets: [...] }` under the same key. `rules()` sees `r.enabled === undefined`, so `lootFilterAllows` is always `true` (verified). Engine hiding, tap/LOOT/auto-pickup blocking and the "hidden items cannot be picked up" promise all depend on it. `ui._lootHides` (filter.js:37) has no caller. | Pick one shape. Smallest change: `rules()` returns `(s.lootFilterRules && s.lootFilterRules.cur) || null`, and map UI fields to `matchFilter` fields (`rarity→maxRarity`, `ilvl→maxItemLevel` (UI means *below*, items means *at or below*), `power→maxPower`, `upgrades→!excludeUpgrades`, `socketed/wanted/corrupted/sets` likewise). Better: delete UI `matches()` and call `G.items.matchFilter` everywhere. Add a test that sets the UI-shaped rules and asserts a grey item is refused. |
| IT-2 | **high** | `economy.js:853-868` (`surfaceTakeAll`), `inventory.js:324-332` | **Item duplication.** `D.sortItems(tmp, …)` re-inserts via `putInto`, which *merges stacks in place* (`o.qty += take`). `tmp` holds the same item objects as the crate, so a merged-away stack stays in the crate while its quantity now also sits in the survivor. Verified: crate `[ruby ×1, ruby ×2]` → bag has 3, crate still holds 2. Affects every stackable (gems, tomes, socket tools, chisels, flasks) once two stacks of one base are in the crate. The UI does not call this function today (the UI has its own "Take all"), so it is latent. | Sort references only: `order = sf.slice().sort(cmpByKey)` without merging, or give `sortItems` a `{merge:false}` flag. Then delete or wire the function; do not leave a dup bug dormant. |
| IT-3 | medium | `economy.js:213-215`, `ui/inventory.js:916` | **Junk "Queue for the chute" never runs.** `I.chuteOpened()` is documented as "the UI calls it when the chute panel opens"; no UI code calls it. The toggle saves `junk.auto` and nothing reads it. | Items owns it: `G.on('object:interact', e => e.type==='chute' && I.chuteOpened())`, or have `ui/chute.js` call it on open. |
| IT-4 | medium | `economy.js:57`, `collection.js:103-107` | **Collection protection makes every filter nearly inert for new heroes.** With an empty Collection Book 76 % of fresh drops (88 % of commons) count as "Curator-wanted" (verified over 2000 rolls) and `protectedItem` exempts them from junk rules, "sell ≤ rarity", sell filters (default `wanted:false`) and loot hiding. A new hero's "Sell ≤ Common" sells ~1 in 8 commons. | Protect a wanted item only if it is `rare+` or the player opted in (`D.COLLECTION.protect` default off, or a toggle in the Curator panel); or show the "kept for the Book" count in every sell preview. |
| IT-5 | medium | `economy.js:159`, `info.js:264`, `reqs.js:75-80` | `isJunk` honours `keepUpgrades` through `I.verdict`, which returns `null` for gear you cannot equip yet. A piece that would be an upgrade at level N+3 is therefore junk and gets chuted/sold. `verdictSoon` exists but only the UI tooltip uses it. | `I.verdict(item, true)` inside `isJunk` (ignoreReq). |
| IT-6 | medium | `collection.js:137-146` | **Page rewards depend on page position.** `pg.index % buffs.length` where `index` comes from `Object.keys(I.LOOKS)` order. Adding, removing or reordering a look family or set silently changes the permanent stat of every already-completed page in existing saves (no migration). Planned content (new classes, new weapon types) will do exactly that. | Store the buff in the page definition (id → buff table) or hash the page id; keep a frozen legacy table for the 47 existing pages. |
| IT-7 | medium | `inventory.js:342-349`, `:103`, `:387`, `:400`, `:417` | `autoSort` runs on **every** `addToInventory` and stash move and sorts both the bag (60) and the stash (120). `pickupPile` of 30 items = 30 sorts; in "upgrades" mode each sort calls `verdict` per item. Measured 1.1 ms on desktop (≈5-8 ms on an old iPhone), and it **reorders cells under the player's finger**. | Mark dirty and sort once (end of `pickupPile`, panel open, or next frame); never sort the stash outside the stash panel. |
| IT-8 | medium | `r16.js:14-18`, `quests.js:311` | Crate size is now `25 + crateBonus`, default 0. Existing saves with a larger crate keep their items but `surfaceSpace()` is 0, and nothing grants the old capacity. For the lead's late save this is a silent regression until challenge quests are done. | One-time migration in `meta.load`: `flags.crateBonus = max(crateBonus|0, surface.length - 25)`. |
| IT-9 | medium | `reqs.js:55-73`, `game/stats.js:268` | Requirements are checked only at equip time, against *base* attributes. `game.respec` refunds every attribute point; the worn Str-heavy gear stays on and stays active. Equip → respec → re-spend is a free way past the requirement the R16.9 system exists to impose. | Re-check worn items in `D.equipChanged`/after respec and unequip (or disable) those whose requirement fails. |
| IT-10 | medium | `economy.js:484-512`, `core/scenes.js:80` | Vendor stock is rerolled from the unseeded `G.rng.global` on every town entry and is never saved. Portal out/in (free) refreshes stock; a reload also does. Fine for gambling-style shops, an exploit for "wait for the good base". | Seed stock from `S.seed + flags.visits` (+ day bucket) so it is stable per visit and per reload. |
| IT-11 | low | `economy.js:543-546` | `gamble` ignores `addToInventory`'s return value and pays regardless; it relies on `inventory.indexOf(null) >= 0` as the room check (holes that are `undefined` would defeat it; `D.ensure` and `meta.load` normalise them today). | Check the return value, refund and abort on failure. |
| IT-12 | low | `inventory.js:206`, `:116-125` | `socketGem` copies the gem with `Object.assign` (shallow: `icon`, `mods`, `base` objects shared with the source stack). `pickup` carries dead `rules`/`salvaged` locals. | `JSON.parse(JSON.stringify(gem))` for the copy; delete the dead locals. |
| IT-13 | low | `inventory.js:262-267` vs `r16.js:90-106` | Three socket ceilings: drop/chisel use `D.SOCKET_MAX(item)` (1-4 by slot/ilvl), blacksmith and Socket Tool use `SOCKET_HARD_MAX 6`. Intended (R16.8) but undocumented in DESIGN §8 and the tooltip does not say which cap applies. | Document; show "n / max" in the item menu. |
| IT-14 | low | `economy.js:269-282` | Salvage yield for `unique`, `rift` and sets falls into the `default` branch (5 shards + 1 essence), identical to Elite. A Rift item salvages for the same as a set piece. | Add explicit rows or forbid salvaging Unique/Rift (they are "never bulk" already). |
| IT-15 | low | `generate.js:348`, `economy.js:544` | `gamble` passes `_boost:3` which also doubles the Rift roll (`Math.min(2,_boost)`) and triples Elite odds, contradicting "no pity, purely chance" only mildly; cost curve `60+6·L²` is cheap against late gold. | Review in the balance pass; gold sink should scale with item level, not player level squared. |

## 2. Cross-team mismatches (calls / events / shapes)

Confirmed by grepping every directory and testing `typeof` at runtime (only names that matter are listed).

| Caller | Call | Result |
|---|---|---|
| `ui/inventory.js:482` | `G.items.canEquip` | does not exist (guarded, dead; remove). This is the call that caused the previous tooltip bug. |
| `ui/npc.js:281` | `G.items.gamblePrice` | does not exist (guarded; `I.gambleCost()` is the real one; the branch never runs). |
| `ui/inventory.js:315,338` | `G.items.LOOK_FAMILIES` | does not exist (falls back to `LOOKS`). |
| `ui/milestones.js:112` | `G.game.grantMark` | does not exist; fallback increments `p.marks`, which nothing reads, so **milestone Marks are lost** (see ui.md UI-7). |
| UI filter ↔ items | `settings.lootFilterRules`, `settings.sellFilter` | same keys, incompatible shapes (IT-1; items `{current, presets:{name:f}}` vs UI `{cur, presets:[{name,f}]}`). First caller of `I.getSellFilter()/setSellFilter()` corrupts the other's data. |
| UI "sell/salvage filter", "Take all" | own implementations | The R12.3/R12.4 API (`matchFilter`, `previewSellFilter`, `sellFilter`, `previewSalvageFilter`, `salvageFilter`, `surfaceTakeAll`, `getSellFilter`, `setSellFilter`, `getFilterPresets`, `saveFilterPreset`, `deleteFilterPreset`) was built and is **unused by the UI**; the UI duplicates matching in `filter.js:69-122`, with different protections (UI allows sets via `f.sets`; items never). Two sources of truth for "what is safe to sell". |
| game → items | `G.items.dropLoot` etc. | all present. `loot:dropped` is emitted (generate.js:555) and nobody listens (the engine reads `groundItems` directly): drop the emit or document it as optional. |
| items → others | `socket:failed`, `relic:combined`, `item:cleansed`(UI emits it, items never does though quests.js:434 says "and by items when it learns to") | `socket:failed` and `relic:combined` have no listener. |
| items events consumed | `item:sold`, `item:salvaged`, `gold:spent`, `item:picked` | consumed by UI quests/milestones. `item:sold` has no `count`, UI assumes `|| 1` (fine). |

Documented-but-unused public API (no caller outside `src/items`): `deleteFilterPreset, deleteLootFilterPreset, getFilterPresets, getLeftBehind, getLootFilterPresets, getMatched, getRelics, getSellFilter, getSurface, previewSalvageFilter, previewSellFilter, previewSendJunk, salvageFilter, saveFilterPreset, saveLootFilterPreset, setLootFilter, setSellFilter, surfaceTakeAll, BULK_BASE, buyPrice, chuteOpened, getLootFilter, getRelicMods, isGroundVisible, rarityChances, recordKill (event-driven), revealBleached (event-driven), verdictSoon, matchFilter (r16 only)`. Either wire or delete; each is a place a team can "call something that exists" and get the wrong behaviour.

## 3. Save safety

- Item JSON is plain; no functions, no cycles. `D.ensure` pads the bag; `meta.load` pads again. Good.
- `rv:7` migration only covers the rarity ladder; there is **no migration for settings shapes** (`lootFilterRules`, `sellFilter`, `lootFilterPresets`), for `flags.crateBonus` (IT-8) or for collection page index drift (IT-6).
- Growth: `item.tally`/`awakened` bounded; crate ≤ 300; stash ≤ 120 (+10/row, ≤ 20 rows); `lootFilterPresets` ≤ 5; `buybackList` not saved. Nothing unbounded found.
- Measured: a bag of 60 + stash of 100 + crate of 25 rares = **95 KB** of JSON (~0.45 KB per item). A full 300-item crate + 320-item stash would be ≈ 350 KB; the save ring stores up to 7 copies (see ui.md UI-4).

## 4. Performance (old iPhones)

- Nothing per-frame lives in items (good). Per-event costs: `I.verdict` ≈ 7 µs/item hot on desktop; `getEquipmentMods` allocates a 41-key object per call and is called by every `recomputeStats` (also via `PERM_MODS`: `collection.getMods` rebuilds `pageReward` for every completed page each time; `getMilestoneMods` rebuilds its table). Every `addEffect` with `mods` (Heat, Midas, Close Call, tactician…) triggers it. Cache the PERM_MODS sum and invalidate on `collection:*`/`relic:*`/`milestone:reached`.
- IT-7 (autoSort) is the one avoidable hitch. `pileAt` (generate.js:536) scans all ground items per drop: O(n) per item, fine below ~200 entries; `groundItems` has no cap.
- O(n²) over big crates: `surfaceTakeAll` `sf.indexOf(it)` + `splice` per item (n ≤ 300 → 90 k ops, fine); `UI filter.run` splices high index first (fine).

## 5. Hard-coded class assumptions (2 new classes at a time)

Add to this list when adding a class; anything missed silently becomes "warrior":
- `bases.js:259-281` `D.CLASS_MATERIAL`, `D.CLASS` (weights, weapons, armour, offhand, starter), `BY_PRIMARY` (unknown class → falls back to warrior or by `primaryStat` str/dex/int/vit only).
- `reqs.js:21` `classTag`, `reqs.js:42` class-armour roll (`heavy→warrior, light→ranger, cloth→random of sorcerer/necromancer`): new classes never roll class armour; `D.REQ.armorStat/weaponStat/offhandStat` assume the existing 13 weapon/offhand types.
- `info.js:240-243` `isMartial` fallback list; `info.js:161` `favouredBy` uses game classes (good) while `classPenalty` (`:114`) uses `D.classProfile` weapons (two sources; they agree only because `classProfile` overrides weapons from `G.game.CLASSES`).
- Stats vocabulary is `str/dex/int/vit`; a class whose primary stat is anything else breaks `dmgPct` (+1 per primary point), requirements, affix tags.
- Weapon families are a closed list (`bases.js:74-95`); a new weapon type needs bases, `TYPE_NAME`, `D.REQ.weaponStat`, collection `weaponEntries/entryLabels`, engine `WEAPON_TYPES` + gear overlays, `C.WEAPON_LOOKS`.
- `uniques.js` carries a `cls` tag used only for drop weighting ×2.5; new classes get no uniques.

## 6. Damage-relevant item numbers (input for the balance session)

- Percent stats on uniques are **not** scaled by item level (`D.FLAT` scales only flat stats): Oathkeeper (min ilvl 8) rolls `dmgPct 60-90`; Gorehowl (ilvl 18) `dmgPct 90-140` + `critDmg 60-100`; The Anvil's Verdict (26) `dmgPct 100-150`. A level 10 character can hold +90 % where a rare weapon gives ~+12 %.
- Flat elemental (`fireDmg` etc.) is on weapons, rings, amulets, gloves, gems (36 per perfect gem, 4-6 sockets), awakenings (24-64), uniques (60-110), relic (+25). It is multiplied by the full skill/dmgPct/crit scale downstream (see game.md) — at ilvl 40 the flat elemental sum (250-400) exceeds the weapon's own average hit (260-320).
- `allSkills` (affix 1-2, uniques 2-3 each, relics +2, perks) is uncapped and extends skill ranks past 5 linearly (see game.md).
- Awakening: +8/14/22 `dmgPct` (and `critDmg 15/25/40`, `attackSpeed 4/6/10`…) per worn item at 250/1000/5000 kills; the lead's late save has 5000+ kills per item on its main pieces.
- Gems: perfect diamond +45 `critDmg` per socket, Bloodstone of Fury (greater) +90 `critDmg`; weapons hold up to 4 sockets (6 via blacksmith/tool).
- Corruption: upside is 1.5× a top-quality roll on one affix (+ a latent affix) — uncleansed corrupted rares are the raw-power ceiling.

## 7. Dead code, duplication, methodology gaps

- Dead: `inventory.js:116-125` locals; `economy.js:85` `sellAllBelow` vs `:125` `sellAtOrBelow` (near duplicate); everything under "documented-but-unused API" above.
- Duplication: filter matching (items vs UI), bulk-rate math in three functions (`sellFor`, `salvageFor`, `salvageWithRate`), three "get the item from a target" helpers (`targetItem` inventory.js:187, `socketHost` economy.js:242, `hostOf` r16.js:94 and corrupt.js:104).
- `tests/items.html` (2268 lines) drives the module with stubs; it never exercises the UI-shaped settings, so IT-1/IT-4/IT-3 cannot be caught there. The `all.html` contract check lists unguarded missing calls but **only notes guarded ones** (`canEquip`, `gamblePrice`, `grantMark` all pass). Add a "guarded calls to names that do not exist" failure list.
- Docs drift: DESIGN §8 still describes `I.matchFilter` family as the filter API; open question 7 (`C.SURFACE_SIZE`) is stale (`surfaceSize()` is dynamic).
