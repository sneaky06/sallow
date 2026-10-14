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
