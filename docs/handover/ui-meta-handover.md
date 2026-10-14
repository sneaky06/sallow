# UI & Meta — hand-over notes (from the ui-meta session)

Status (2026-10-13, Revision 2 pass): section 5 + R2.2–R2.7 implemented and verified in `tests/ui.html` (stubs) and the real
`index.html` at 375x667 and 667x375. Art is frozen: no further visual work. No git repo in the folder, so nothing is committed.

## What the UI reads / calls from Revision 2 (all guarded)
- `G.scenes.getDeathPenalty()`, `state.flags.corpse`, `state.flags.sealed`, `object:interact { type:'corpse' }` (core handles it).
- `room:locked { room }`, `room:cleared { room }`. **Wave counter:** there is no per-wave event in the contract, so the banner reads
  `room.wave` (1-based, polled 5x/s) and also listens for an optional `room:wave { room, wave }`. With neither it shows "N waves".
- `G.items.getBuyback()`, `buyback(i)`, `unsocketGem(target, socketIndex)`, `unsocketCost(item, socketIndex)`, `EFFECTS`, item `effects`.
- Bloodstone test before socketing: `G.items.data.isPermanentGem(gem)` if present, else `gem.permanent`, else baseId containing "blood".

## Behaviour other teams may trip over
- `G.ui` stops propagation of pointer/touch/mouse/click/wheel events at `#ui`, and of key events whose target is an `<input>`.
- Mythic effect lines: any `getTooltip` line containing an `EFFECTS[id].name` or `.desc` of the item is shown on a dark plate in full
  mythic colour; if no line matches, the UI appends name + desc itself. Other tooltip line colours are darkened to ink on the bone page.
- New bounty kind `lockdown` ("Break the Seal"), counted on `room:cleared`, only offered once `flags.maxDepth >= 2`.
- Kill/elite/boss quest counters and the boss bar ignore entities whose `faction` is set and is not `'enemy'`.
- `state.settings.junkRarity` (`'common'|'magic'|'rare'`): Sell Junk calls `sellAllBelow` with the next rarity up; the items module toasts the sale.
- `meta.load()` forces `flags.sealed = false`, validates `flags.corpse`, resets transient player fields, pads inventory/stash.
- Saves: before the first write of a page load the previous save is copied to `emberdeep.save.prev`; a save this build cannot read is
  copied to `emberdeep.save.unreadable` instead of being overwritten. Delete Save removes the save and `.prev`.
- Failure feedback: when a `G.items.*` action returns false the UI only plays `sfx error`; the items module toasts the reason.

## Offline / releases (sw.js)
- **Bump `VERSION` in sw.js on every deploy** (now `emberdeep-v3`). That is the only release switch.
- Install precaches: shell + icons + `src/core/*` + every file in each `src/<team>/manifest.js` + `assets/assets.js` + every path it lists
  (comments ignored). Missing files are skipped and reported; the menu shows "Offline ready" or "N files missing" with a retry button.
- First install takes control at once. An update downloads into its own cache and waits; it activates on the next cold launch, or
  immediately when the player taps "Update now" in the menu (saves, then reloads). Old caches are deleted on activation.
- Network-first on localhost / 127.0.0.1 / *.localhost / *.test so dev edits always show; cache-first everywhere else.
- If a team adds a top-level script that is not listed in a manifest (or a new core file), add it to `SHELL` in sw.js.

## Revision 3 (2026-10-14)
- Uses: items.verdict / isJunk / processJunk / salvagePreview / gemUpgradeCost+upgradeGem / rerollCost+rerollAffix,
  getTooltip().headline {label,value,delta,pct}; socketGem(gemIndex, target, { confirmPermanent: true }) only after the UI confirm;
  item:picked { salvaged: true, materials } -> one grey feed line; state.targetId drives the target bar; map.mods + game.FLOOR_MODS
  listed next to the gold line (no toast — the game toasts); getSkillInfo().synergies.
- Old settings.junkRarity is deleted on load; settings.junk comes from state.js defaults when a save has none.
- Vendors: Buyback is now a strip at the top of every Sell tab (one tap = bought back); the separate Buyback tab is gone.
  Mystic has a "Reroll" tab; blacksmith Forge also lists cut gems ("Improve" with gem dust).
- An 'up'-verdict pickup is a 44px tappable feed line that opens the item tooltip directly.
- sw.js VERSION is emberdeep-v4.

## Revision 4 (2026-10-14)
- New src/ui/story.js: premise, Elder lines per main step (played on accept / turn-in via quest:updated / quest:completed),
  boss intro/death banners keyed by monsterId, ending after main_8, G.meta.LORE (16 pages), Journal panel ('journal').
  state.flags.storySeen = [keys], state.flags.loreFound = [indices]; both validated on load.
- Lore: listens to lore:found { loreIndex } and item:picked with item.type 'lore' (deduped); shows the page once.
- Main boss steps match monster.monsterId (boss_gravelord / boss_broodmother / boss_tyrant / boss_hollow); names from getMonsterInfo.
  "Marked for Death" counts champion, rare, legendary and boss kills.
- Dash button from G.game.getClassAction(), emits input:classaction; lockdown counter reads G.game.getLockdown().
- Player-facing name comes from G.ui.GAME_NAME (style.js) = 'Sallow'. Save key 'emberdeep.save' and cache prefix 'emberdeep-' unchanged.
  sw.js VERSION emberdeep-v5. manifest.webmanifest name/short_name are 'Sallow' (static JSON cannot read the constant).

## Revision 5 (2026-10-14)
- New src/ui/hudedit.js (R5.1). state.settings.hud = { size 'S'|'M'|'L', opacity 0.4..1, layouts: { portrait|landscape: { [id]: {x,y} } },
  joystick: { mode, x, y, size } }. Piece ids: atk, skills, vitals (orbs + potions), dash, portal, mm, tracker = centre as a fraction of
  the safe-area HUD box; 'joy' = fraction of the window. A piece with no entry keeps its CSS default, so Reset deletes entries.
  hud.joystick is mirrored from the current orientation for the engine (size = stick DIAMETER / short side, engine input.js).
  Opened from the pause menu ("Edit HUD layout"); Controls section also toggles Floating/Fixed. Snap grid 16 px, clamped to the safe area,
  grabs are ≥44 px. Button size is the CSS var --bs (all action sizes are calc()s with a 44 px floor), opacity is --hop on .ed-mv.
  The old .ed-cluster grid is gone: .ed-vitals / .ed-skills / .ed-atk / .ed-portal are absolutely placed; the portal left the top row.
- New src/ui/pile.js: pile popup on pile:open (getPile / pickup / pickupPile, upgrades first, "?" opens the tooltip with Take), and the
  "New N" review button in the bag (pitch): cards for every bag item with foundAt > state.flags.reviewedAt — Equip / Sell (town) or
  Salvage / Keep, one tap each. Items from one pile share foundAt; the mark only moves past a timestamp once all its items are done.
- Sort picker (R5.7) in bag, vendor Sell tab and stash: state.settings.sort; sortInventory(mode) / sortStash(mode).
- Sell tab (R5.8): "Sell all ≤ Common / Magic / Rare" with live count + gold from previewSellAtOrBelow, confirm, sellAtOrBelow.
  Tooltip Lock/Unlock (items.setLocked(item, bool), falls back to item.locked); padlock mark on cells (replaces the junk tag).
- Tooltip extras (inventory.js extraLines): look family + Matched n/4 (+bonus lines once a match is in reach) via items.getLook / LOOKS,
  awakened affixes + "Awakening k / next kills" (items.AWAKEN_AT), bleached "???" plate. In Details view an items-team line wins.
- Paper doll + Stats tab use G.engine.getPlayerPreview(player, size) (portrait fallback).
- story.js: ending onDone → flags.pallorUnlocked, flags.titles/title = 'Warden of the Well' (shown after the name in the bag and Stats),
  a 3-line Pallor explanation. Heroes who saw the ending before get the unlock silently on the next scene change.
- hud.js: floor name (map.floorName → variant.floorName → map.name → variant.name) under the depth label + arrival banner;
  Pallor meter (game.getPallor, fallback flags.pallor) once unlocked. Quest tracker top follows the label height (--trk-top).
- sw.js VERSION emberdeep-v6, ui._VERSION 0.6.0.

## Revision 6 + 7 (2026-10-14)
- **Story is data:** src/ui/story_data.js (meta.STORY: NAMES, OPENING, ACTS, STEPS, FINALE, BOSS_LINES, ECHO, ADVENTURERS, SIDE, TOWN, LORE).
  story.js only plays it. Outline for the lead: docs/STORY.md. Town name comes from NAMES.town via ui._townName() (now 'Emberdeep').
- Main chain is 12 steps to depth 30 (main_1..8 ids unchanged, so old saves keep their place; a 'done' chain reopens at main_9).
  Boss steps accept `orDepth` (any boss at >= depth counts): main_10 (depth 25) and main_12 (world boss, id 'boss_world' expected).
  Reward rarities are preference lists resolved by meta._rarityPick (survives the R7.1 ladder change).
- Side lines: state.quests.side = { [lineId]: { step, status, progress } }, offered by the Elder once flags.act >= line.act;
  steps reuse bounty kinds (+ optional minDepth). Views carry side, lineId, step, giverName.
- Town revival: flags.act / cleansed / warmth derived from the main step on every town arrival; 'town:warmed' { act, warmth }
  on change. TOWN stages swap NPC greetings and gate services ('mystic:enchant' opens in act 2) via ui._serviceOpen(role, tab).
- Opening plays for heroes without storySeen 'premise' (old heroes skip it). Endgame unlock (Pallor + title 'Bearer of the
  Ember') now follows the finale after main_12; old titles are swapped; old heroes keep pallorUnlocked.
- R6.1 deeper.js: 'stairs:confirm' -> prompt (getPallor / previewPallor / pallorGain), Descend -> game.confirmDescend().
  "Don't ask again this run" = flags.deeperNoAsk, cleared in town (the UI auto-confirms while set).
- R6.2 Echo: entity.echo -> boss-style bar (cold blue), first-sight + death banners, tracker reads flags.echo.depth,
  death screen says the abandoned remains rise as your Echo. Corrupted adventurers: banner on adventurerId / monsterId 'adv_<id>'.
- R6.3 dash: pips from getClassAction().charges/maxCharges (shown when max > 1); faint sweep while charges remain.
- R6.4 volume sliders: settings.sfxVolume / musicVolume / ambienceVolume (0..1, missing = 1); emits 'settings:changed' { key }.
- tests/ui-smoke.html drives the REAL game headless (no free preview slot this round):
  chrome --headless=new --allow-file-access-from-files --window-size=375,667 --virtual-time-budget=30000 --dump-dom tests/ui-smoke.html
- sw.js VERSION emberdeep-v8, ui._VERSION 0.8.0.
