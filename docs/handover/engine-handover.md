# Engine & Art — hand-over notes (src/engine/, tests/engine.html)

Status: done. `G.engine` API matches CONTRACT.md section 1. Verified in tests/engine.html and once in the real
index.html (all five teams loaded, new game → town rendered, zero console errors).

## Things other teams may want to know (no contract changes, just how the engine behaves)

- **Canvas**: ~216–340 logical px on the short axis (250x542 on a 375x812 @2x phone). The engine sets the canvas's inline
  `style.width/height` itself. `worldToScreen` / `screenToWorld` are CSS px.
- **Menu**: when `state.scene === 'menu'` or `state.map` is null the engine draws an animated ember-gate backdrop.
  The UI title screen currently paints an opaque background over it — make it transparent/semi-transparent to see it.
- **Entity animation** is driven only by `anim` + `animT` (seconds since the anim started): idle 2 fps, walk 8 fps,
  attack 3 frames @ 0.09 s, cast 3 @ 0.11 s, hit 1 frame, die 3 @ 0.13 s then holds. `dead: true` with any other anim
  shows the corpse frame. Reset `animT = 0` when you change `anim`.
- **Facing** is world radians (`atan2(dy, dx)`); 4 sheet rows are picked from it.
- **Sprite descriptor**: unknown body → humanoid, unknown weapon → none, bad colours → grey, scale clamped 0.5–4.
  One sheet (~2 ms) is built per distinct descriptor and cached, so keep descriptors to a fixed palette per monster type
  (don't randomise colours per instance).
- **Rarity**: `champion` / `rare` / `boss` monsters get a coloured rim + ground aura + name plate; a health bar shows
  for any monster with `hp < stats.hpMax` (always for elites). NPCs always show their `name`.
- **Fog**: tiles need `map.explored[i]` to be drawn at all; `map.visible[i]` = lit, otherwise dimmed. Monsters and
  projectiles on non-visible tiles are hidden. Town maps ignore `visible` (everything lit). If nothing is explored
  the screen is black — the game must call `G.world.updateVisibility` before the first frame matters.
- **Walls**: in dungeons, walls with open ground right behind them are drawn low so they never hide the room; any
  remaining tall wall in front of the player is cut away. Town walls are always full height (roofed houses).
- **Props**: drawn at tile centre. `prop.light` (tiles) adds/overrides a light radius; torch, campfire, portal, crystal,
  waypoint, shrine, dungeon_entrance glow by default. `used: true` turns a shrine dark and removes its light.
- **Ground items**: label = `item.name` (gold: `"<qty> GOLD"`), colour from `item.rarity`; beam for rare+; sparkles
  for epic+. `state.settings.lootFilter` hides labels below that rarity (never gold); icons always stay visible.
- **fx:shake `amount`** is treated as logical pixels, clamped 0.5–10 (3–6 feels right). `fx:spawn` `radius` is tiles.
- **fx:text**: `crit: true` draws double size with a "!" suffix. Text is caps-only bitmap font, max 28 chars.
- **sfx**: all 25 contract names exist; identical names are throttled to one per 50 ms. Audio unlocks on the first
  touchend / click / keydown anywhere in the page.
- **Input**: mouse clicks are always `input:tap` (the joystick is touch/pen only). Space repeats `input:attack` while
  held (key auto-repeat). Keys are ignored while an input/textarea is focused.
- **drawMinimap(ctx, w, h)**: iso-rotated; follows the player when `w < 220`, otherwise fits the whole map.

## Art pass 2 (grim/grimy direction) — behaviour other teams may notice
- Sprite colours darker than ~luma 86 are lifted automatically so bodies read against the dark floors; hue is kept.
  Monster eyes use a brightened version of `sprite.accent` — pick the accent as the eye colour you want.
- Player light radius is now ~7 tiles (was 8.5) and ambient is darker; torches flicker harder.
- A red vignette pulses when `player.hp < 30%` of `player.stats.hpMax` (engine reads those two fields only).
- Every ground item now has a small rarity-coloured glow; rare+ still adds the beam.
- The `tree` prop is now a dead tree with a crow, `bush` a thorn bramble, `fountain` holds stagnant water.
- Corpse frames include a blood / ichor / ash mark (by body type), so the game need not spawn one.

## Revision 2 (engine side)
- `src/engine/assets.js` is the art override loader (R2.9). It loads `assets/assets.js` then each listed PNG; wrong size /
  missing / broken files are ignored. Overrides arrive asynchronously a moment after boot.
- Sprite override lookup: `entity.classId`, then `entity.monsterId`, then `'npc_' + entity.role`. `sprite.scale` is ignored
  for hand-drawn sheets. Undrawn frames fall back to idle frame 0; an empty back row falls back to the front row.
- Icon tiers need `tier: 2 | 3` on the icon descriptor (items team) to pick `<shape>_2/_3.png`. `potion_hp` / `potion_mp`
  are chosen when a `potion` icon's colour is red- or blue-dominant.
- `getPortrait` finds the portrait name by matching the descriptor against `G.game.CLASSES[*].sprite` or a live NPC's
  sprite; passing `id: 'warrior'` / `id: 'npc_healer'` in the descriptor is the reliable way (UI team).
- New tiles DEEP_WATER / DEEP_LAVA / CHASM are drawn; shallow WATER / LAVA show the floor through them.
- New props: `gate` (picks its orientation from the door tile it stands on) and `corpse` (cyan glow, cyan minimap mark).

## Revision 3 (engine side)
- Ground loot: rare+ gets a pulsing halo + beam and its icon is redrawn after lighting so it stays bright; items whose
  `C.RARITY[...].tier === 'legendary'` get a taller double beam, orbiting sparkles (Mythic: a second counter-orbit) and a
  brief screen-edge glint when first seen. Gold twinkles. Common/magic drops have no glow (label + icon only).
- Monster `rarity: 'legendary'`: orange rim, double pulsing aura, orange plate, wider bar. For `rare` / `legendary`,
  `entity.affixes` are listed under the plate (2 names + "+N" when more than 3) when the monster is within 6 tiles of the
  player, or when `player.targetId` / `state.targetId` equals its id (neither field exists yet — see question to lead).
- Icon overrides are 16x16 now; tier files are gone. `getPortrait` honours `desc.id` (classId, monsterId, `npc_<role>`).

## Revision 5 (engine side)
New files: `gear.js` (visible gear, paper doll), `variant.js` (floor variants). Manifest order: … sprites, gear, … assets, variant, render.
- **Loot piles (R5.6)**: ground items sharing `pileId` draw as one heap: best item on top (rarity, then equipment over
  consumables, gold lowest), two lesser icons peeking out, a count badge, one label "Best Name +N", and the best item's
  glow/beam. Items without `pileId`, and piles of one, look as before. New drops "spill": they burst out of the pile
  point and settle into it (cosmetic, 0.5 s, fixed pool of 24); the heap hops when each one lands; Legendary-tier drops
  flash the screen edge when they spawn (moved here from first draw).
- **Visible gear (R5.9)**: the player's weapon/off-hand/helm/chest/gloves/boots are drawn from `item.look`
  ({ family, palette, material?, glow? }). `look.material` (plate|mail|leather|cloth|bone) wins; otherwise words in
  the family / baseId / name or `armorClass` decide. Palette: name, [main, trim, glow], or { main, trim, accent, glow }.
  Family words add horns / crown / spikes, ember / void / frost glows. One sheet per equipment combination (cache 24),
  ~1.5 ms to build; per frame only a numeric signature check of the 6 item ids. Weapon look = `item.weaponType`;
  off-hand = `offhandType` (shield / orb / tome / quiver). `G.engine.getPlayerPreview(player, size = 96)` → transparent
  canvas, idle front frame scaled by whole pixels; a new canvas when the gear changes (redraw on `equipment:changed`).
  Hand-drawn overlay format: see "Gear overlays" below (for ART_SPEC.md).
- **Floor variants (R5.10)**: `map.variant` is resolved once per map (`U.variant.get`): tileset tinted / desaturated /
  brightened (canvas composites, once per floor, ~2.5 ms; water/lava take `palette.liquid`), `blend` mixes the other
  theme's floor and wall tiles in as noise patches, `light.color/radius` = player light, `light.ambient` gives the
  darkness its hue, `ambient.darkness` how deep it is, `ambient.fog` how dark explored-unseen ground gets,
  `light.torch/torchRadius/flicker` restyle every warm prop light, particles mist|ash|ember|spore|drip|snow|motes|void
  with density 0–2, and a WebAudio sound bed wind|drone|drip|water|fire|heart|choir|none (theme default when absent:
  town wind, crypt drip, caves water, inferno fire, abyss heart). Beds crossfade over ~1.5 s, are off when
  `settings.sfx === false` or `settings.ambience === false`.
- **Pallor (R5.2)**: tier from `G.game.getPallor().tier` (else `flags.pallor / 20`), 0 in town. One composite fill
  ('saturation' blend, grey) over the lit world, eased ~2 s per tier, plus a pale wash at tier 4. Loot beams, loot icons,
  spell fx, labels, plates and bars are drawn after it and stay saturated. Tier ≥ 3 adds a faint high beating tone to the
  sound bed. `G.engine.getPallorLevel()` = current eased amount 0..0.85.
- **Joystick (R5.1)**: `settings.hud.joystick = { mode, x, y, size }` (x, y = centre as fractions of the viewport, size =
  diameter as a fraction of the short side, radius clamped 24–80 px); `hud.portrait/landscape.joystick` override per
  orientation; `hud.opacity` dims it. Fixed: drawn at the anchor (55% alpha idle), grabbed by a touch within 1.6 radii,
  knob clamps at the rim. Floating: zone = left 40% (x < 0.5) or right 40% (x ≥ 0.5).
- `U.dim` now follows `U.fogA` (rebuilt lazily when a floor's fog differs). `U.lightSprite` accepts '#hex' keys.

### Gear overlays (hand-drawn) — proposed ART_SPEC text
**Gear overlays — `assets/gear/<family>_<slot>.png`** (slot = weapon, offhand, helm, chest, gloves, boots; family = the
item's `look.family`, e.g. `gear/rusted_mail_chest.png`). Listed in `assets/assets.js` like every other file.
- They are worn by a **base body**: `assets/sprites/<classId>_base.png` (e.g. `warrior_base.png`), or one shared
  `assets/sprites/player_base.png`. The base is a normal character sheet (640 × 80, same grid, anchor x 20 / y 34, same 16
  columns and 2 rows as section 2) drawn in plain underclothes, **no weapon, no armour**. Draw every class base on the same
  body template (same height, same poses frame by frame) so one overlay fits every class.
- **Overlay sheet: 640 × 80 px**, exactly the base sheet's grid: 16 columns × 2 rows of 40 × 40 cells, feet anchor
  x 20 / y 34, row 0 front-right, row 1 back-right, columns as in section 2 (idle 0–1, walk 2–5, attack 6–8, cast 9–11,
  hit 12, die 13–15). Draw only the piece itself, on transparent pixels, sitting exactly where it covers the base body in
  that frame. Include the piece's own 1 px dark outline. No ground shadow.
- **Draw order** (the game composes it): front-facing rows: base → boots → chest → gloves → helm → offhand → weapon.
  Back-facing rows: offhand → weapon → base → boots → chest → gloves → helm (held items go behind the body when you see
  the back). So a weapon overlay only needs the weapon and the hand gripping it; a helm only the helm.
- Empty frames reuse that sheet's frame 0 of the same row; an empty back row reuses the front row (same as characters).
- Without a base sheet, overlays are not used: the procedural figure shows procedural gear, and a hand-drawn full class
  sheet (`sprites/<classId>.png`) is shown as drawn with no gear. Slots whose family has no overlay show nothing on a
  hand-drawn base, so draw a family's pieces together.
- Big bodies (80 px cells) are not supported for the player.

## Revision 6 (engine side)
- **Render scale (R6.4).** World code still works in logical px (tile 32 × 16); the canvas backing store is `V.R` × logical.
  `settings.graphics`: `'auto'` (default; R = 2 on 4×-scale phones, 1.5 on iPhone 6–8 class, always a whole number of device
  px per backing px), `'high'` (native resolution), `'low'` (R 1, the old look). Auto drops to low for the session if frames
  stay above ~24 ms for 4 s. `worldToScreen` / `screenToWorld` are unchanged (CSS px).
- **2× art** (ART_SPEC.md): hand-drawn canvases carry `hd = 2` and are drawn with `U.blit` at half size. Characters are one
  file per animation (`sprites/<id>/<anim>.png`, 5 or 8 direction rows); old 1× files still load. `U.dir8(facing)` gives the
  screen direction (0 s … 4 n … 7 se). Procedural art keeps rendering through the old path; `U.sprites.toHD(sheet)` produces the
  exact 2× files (used for `assets_templates/`).
- **Lighting:** smooth radial lights and a filtered light map when R > 1; soft contact shadows. Stepped look at R 1.
- **Audio files:** `sound/<sfx>[_n].mp3`, `sound/amb_<bed>.mp3`, `sound/music_<track>.mp3` via `assets/assets.js`. Buses read
  `settings.sfxVolume / ambienceVolume / musicVolume` (0–1, defaults 1 / 1 / 0.6) and `settings.music === false`;
  `settings.sfx === false` still mutes everything. Music: title, town, theme, rift (depth > 20), boss / echo when one is alive
  within ~16 tiles; 2 s crossfades through two streamed `<audio>` elements blessed on the first gesture (iOS).
- **Echo (R6.2):** any entity with `echo: true` (also `isEcho`, `monsterId 'echo'`, `kind 'echo'`) is drawn from its own
  `equipment` (+ `classId`, `sprite`) through the gear path, or from the player's look if it has none: desaturated, cold-tinted,
  ~65% alpha with a flicker, 4 additive after-images, pale-blue plate.
- **Dash pips (R6.3):** under the player while a charge recharges; reads `getClassAction()` → `charges` + `maxCharges`
  (or `charges: { cur, max }`), else a single pip from `cdRemaining / cooldown`.
- **Rarity glow (R7.1):** by rarity key — none for common/uncommon/rare, slight for magic, then legendary < mythic < unique <
  rift (rift pulses slowly). `C.RARITY[key].glow` (0–5) overrides. `G.engine.rarityGlow(key)` for the UI's inventory cells.
- **Joystick (lead playtest bug):** touch devices track the stick with Touch Events (iOS sent `pointercancel` to the stick when
  a second finger landed). Fixed stick is the default on touch devices when no layout is saved; floating still follows drift.
- **Tools:** `tests/assets.html` regenerates ART_LIST.md / SOUND_LIST.md and writes `assets_templates/` through
  `tests/save-files.ps1` (a localhost:8399 receiver that only writes those paths).

## Revision 7 (engine side) — `src/engine/rift.js`
- **Taint:** `map.taint` 1–3 draws sinew decals on floor tiles in `map.rift.vein` (flesh red in the Hellscape, breathing with a
  55 bpm heartbeat). `map.fissures` cells glow (rift glow; in town the fissure goes violet → gold with warmth).
- **Town warmth** (`flags.warmth` 0–3): 0 = frost wash, dead campfires, torches at 60%; 1+ lit windows (3/8/14), chimney smoke
  (1/3/6 roofs), 2+ warm wash and the `hearth` sound bed, 3 lanterns on paths and birds. Points are picked once per map.
- **Hellscape** (`map.act` hellscape/endless): hue wash drifting through wrong colours, breathing sinew vignette, eyes that open
  in unlit cells and track the player, the player light warps, ambient pulses red, `flesh` sound bed.
- **Entities:** Fallen (`fallen` / `adv_fallen_*`) violet rim, aura, light, plate + "THE FALLEN"; world boss (`boss_world` or
  `MONSTERS[id].worldBoss`) ember rim, pulsing Ember light, 40 px bar, "HEART OF THE RIFT"; NPC roles the game has no look for
  (refugee, camp_merchant, curator) get engine looks and a role name when the game falls back to the merchant's.
- **Props:** `prop.look` → `props/<look>.png` if drawn, else the base type recoloured toward `prop.tint` (by `prop.corrupt`).
- **Templates:** gear overlays are isolated from the procedural rig by diffing the body with and without one item, then
  converted to 2x (`assets_templates/gear/<key>/<anim>.png`); `<class>_base` bodies too. 2,185 templates in all.
