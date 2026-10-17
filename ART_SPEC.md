# Art and sound specification (Revision 6 high-res format)

Everything in the game is currently drawn and synthesized by code. Each file you add **replaces** one generated piece;
anything you haven't made keeps its generated version, so you can work one file at a time and see it in game.

- **What to make:** `ART_LIST.md` and `SOUND_LIST.md` list every file the game can use, with exact size, layout and a
  one-line brief, and mark what already exists. They are generated from the code by `tests/assets.html` — re-run it any time.
- **Where to start:** `assets_templates/` holds every generated sprite, tile, prop, icon, projectile and portrait already
  in the final format (same size, grid and anchor). Open one in Procreate / Pixquare, paint over it on a new layer, export,
  and drop it into `assets/` under the same path. It will sit exactly where the generated figure stood.

## How to add a file

1. Save it under `assets/` with the exact path from ART_LIST.md / SOUND_LIST.md (all lower case, e.g. `assets/sprites/warrior/walk.png`).
2. Add the path to `assets/assets.js`, e.g. `'sprites/warrior/walk.png',` or `'sound/sfx/weapons/wpn_sword_swing.m4a',`. There is no limit on the number of entries.
   An entry can also be an object to set the playback rate of that file's frames: `{ file: 'sprites/goblin/walk.png', fps: 14 }` (characters, props and
   fx strips; `loop: false` makes a normally looping idle/walk play once and hold its last frame; `stride` sets how much ground one loop of a walk covers). Without them the default timing below is used (section 2, "Smooth animation").
3. Reload the game. A listed file that is missing, mis-sized or in an unknown folder is ignored, the generated version stays, and the browser console prints
   **one warning that names the file and says what is wrong** (open the game with `?assetdebug=1` to also log every file as it loads or is released; with
   Settings → Show FPS on, the counter ends in `ART <loaded>/<listed>`, plus `X<n>` = how many were rejected).
4. Loading is lazy: a character, gear piece, prop, effect or tileset is fetched and decoded the first time the game needs it and released again when it has
   not been used for a while or you leave the floor, so painting the whole catalogue does not run a phone out of memory. Until a file is ready the generated
   art is drawn, so a brand-new sighting can pop in a frame late; icons, portraits and projectiles load in the background at start-up.

## The format in one paragraph

The game renders at about **double the old resolution**: a floor tile is **64 × 32 px**, a character cell **96 × 96 px**
with a normal human about **56–60 px** tall, **8 facing directions** of which you draw **5** (the other 3 are mirrored),
and smooth coloured lighting with soft shadows added by the game. Paint at exactly the sizes given — **1 file pixel = 1
screen pixel on most phones**. Painterly shading, soft edges and anti-aliasing are welcome now (this is not 8-bit any
more); keep a clean silhouette so characters read against dark floors.

## Rules for every image

- **PNG, 32-bit RGBA, transparent background.** Export at 100%, never upscaled. sRGB.
- **No ground shadows, no lighting baked across the scene.** The game adds a soft contact shadow under every creature and standing prop and lights the
  world with torches and the player's light. Paint form shading only (light from the **top-left**, like Diablo II).
- **Keep 2 px of empty margin** inside every cell, so nothing touches the cell edge.
- **Value contrast:** keep floors dark and in a narrow value range; characters, loot and props clearly lighter or darker.
  Base colours desaturated (cold stone, bruise purple, bog green, rust, bone, dried blood); saturated colour only as accents.
- Rarity colours are the brightest things on screen; avoid these exact hues elsewhere:
  `#c8c8c8` common, `#4ddc6a` uncommon, `#5b8cff` rare, `#b65bff` magic, `#ffe45b` legendary elite, `#ff8a2b` mythic, `#ff3b3b` unique, `#ff6aa8` rift
  (the values of `C.RARITY` in `src/core/constants.js`; the game reads colours from code, so no art changes are needed if they change again).

### Tools

- **Procreate:** canvas at the exact pixel size, 132 dpi or higher doesn't matter — only pixels count. Turn on *Drawing Guide → 2D grid*
  at the cell size (e.g. 96 px) so every frame sits in its cell. Use one layer per frame group or a single layer per strip;
  export *PNG* (flattened, transparent background: hide the background layer).
- **Pixquare / Aseprite-style:** use a grid of the cell size and the frame list as columns; export the sheet as one PNG.
- **Blender (3D render pipeline):** orthographic camera, rotation X = 60°, Z = 45° (true 2:1 isometric is X = 60°, Z = 45° with
  ortho scale tuned so a 1-unit floor square renders 64 px wide). Render each animation for the 5 directions by rotating the
  character (not the camera) to 0°, 45°, 90°, 135°, 180° — facing south/towards the viewer is 0° —, transparent film, no shadow
  catcher, then lay the frames out as below (an image-stack or a sheet addon). Put the feet origin on the anchor point.

---

## 1. Tilesets — `assets/tiles/<theme>.png`

Themes: `town`, `crypt`, `caves`, `inferno`, `abyss`. Optional per floor variant: `tiles/<theme>_<variantId>.png`
(ART_LIST.md lists them); without it the theme sheet is tinted to the variant's palette automatically.

- **Sheet: 256 × 1344 px** = 4 columns × 14 rows of **64 × 96 px cells**.
- The floor is an isometric diamond **64 × 32 px at the bottom of the cell** (rows y = 64…95). Corners: left (0, 80),
  top (32, 64), right (63, 80), bottom (32, 95). 2:1 line (2 px across, 1 px down).
- Flat tiles use only that diamond; the 64 px above it must stay transparent (it is cut off).
- **Walls and doors rise 48 px** above the diamond: top face y = 16…47, left and right faces 32 px wide, 48 px tall (right
  face darker). The game cuts walls down automatically when they would hide the player, so keep the top face readable alone.
- **Columns are 4 variants** (for floors about 56% / 12% / 19% / 12% — make column 0 the plainest). For water and lava the
  4 columns are **animation frames** (water ~3 fps, lava ~2 fps).

| Row | Tile | Notes |
|---|---|---|
| 0 | Floor | plain, cracked, stained, debris |
| 1 | Wall | tall; 4 variants |
| 2 | Door | open doorway frame, floor visible inside. Col 0 = wall running top-left → bottom-right (mirrored for the other axis), col 1 = optional other axis |
| 3 | Stairs down | col 0 only; must read instantly as a way down |
| 4 | Stairs up | col 0 only; may use the whole 96 px cell height |
| 5 | Shallow water | 4 frames; floor visible through it |
| 6 | Grass | mostly town; dead, yellowed |
| 7 | Path | mud, ash, cobbles |
| 8 | Shallow lava | 4 frames; glowing cracks over dark crust |
| 9 | Bridge | planks / slab over water, lava or pit |
| 10 | Rubble | walkable debris |
| 11 | Deep water | 4 frames; dark, opaque, clearly not walkable |
| 12 | Deep lava | 4 frames; bright, churning |
| 13 | Chasm | near-black pit with a faint rim |

Rows a theme doesn't use can be left transparent (the generated tile is used).

## 2. Characters and monsters — `assets/sprites/<id>/<anim>.png`

**One file per animation.** `<id>` is the class id, monster id or `npc_<role>` (all listed in ART_LIST.md).

- **Cell: 96 × 96 px** (big monsters and bosses: **192 × 192**; any square cell works, the game reads it from the file height).
- **Feet anchor:** the ground point between the feet at **(48, 84)** in a 96 cell — generally **(cell/2, cell × 7/8)**. Keep
  it identical in every frame or the character jitters.
- **Size:** a normal human is **56–60 px** tall; small creatures 25–40 px; brutes up to 80 px; bosses use the 192 cell.
- **Rows = directions, in this order:** 0 **S** (towards the viewer), 1 **SW**, 2 **W**, 3 **NW**, 4 **N** (back to the
  viewer). The game mirrors SW/W/NW for SE/E/NE, which swaps the weapon hand — fine for most. To avoid that, draw all 8 rows
  (S, SW, W, NW, N, NE, E, SE) and name the file `<anim>_8.png`.
- **Columns = frames**, left to right. Sheet size = frames × cell wide, 5 × cell tall (e.g. walk: 768 × 480).

| File | Minimum | **Smooth (recommended)** | Timing | Notes |
|---|---|---|---|---|
| `idle.png` | 4 | **8** | 1 s loop | breathing; NPCs only need this one |
| `walk.png` | 8 | **12–16** (player 16) | one loop per ~89 px of ground (see below) | two steps: contact, down, pass, up × 2 |
| `attack.png` | 6 | **10–12** (player 12) | 0.27 s, last frame holds | wind-up, strike with the weapon fully out (at the middle), recover |
| `cast.png` | 6 | **10** | 0.33 s | raise, release (arms/staff up), recover |
| `hit.png` | 2 | **3–4** | 0.2 s | recoil |
| `die.png` | 6 | **10–12** | 0.5 s | fall; **the last frame stays on the ground** as the body (paint any blood pool into it) |

- **Any frame count works** — see **Smooth animation** below for how frames map to time. Trailing frames that are empty in *every* direction are ignored.
- **Boss phases:** `<anim>_p2.png` / `<anim>_p3.png` (e.g. `walk_p2.png`, `idle_p3_8.png`) replace the matching animation while the boss is in phase 2 / 3.
- **Missing animations fall back:** cast ↔ attack, everything else → idle. A sprite needs at least `idle.png`.
- Draw the creature's weapon into its sprite. The player is the exception (section 3).
- The old 1× format (`sprites/<id>.png`, 640 × 80, 16 columns × 2 rows of 40 px) still loads.

### Smooth animation (R17)

More frames = smoother, more realistic motion; the game never needs a fixed count. What it does with the frames you give it:

- **Frames = width ÷ cell.** A 16-frame walk at 96 px is 1536 × 480; a 12-frame boss attack at 192 px is 2304 × 960 (keep any sheet ≤ 4096 px wide,
  the iPhone texture limit: ≤ 42 frames at 96, ≤ 21 at 192).
- **Time-based animations** (idle, attack, cast, hit, die) spread **all** their frames evenly over the duration in the table: frame *k* of *n* shows from
  *k/n × duration* to *(k+1)/n × duration*. So a 12-frame attack shows each frame for 22 ms, a 6-frame one for 45 ms — same length, smoother motion.
  Idle loops; attack, cast, hit and die play once and hold the last frame.
- **Your own rate:** list the file as `{ file: 'sprites/goblin/attack.png', fps: 30 }` and it plays at 30 frames a second instead (a 12-frame attack then
  lasts 0.4 s). `loop: false` makes an idle play once and hold. Use this when the action really is slower or faster than the default.
- **Walk is tied to the ground, not the clock.** The walk advances by the distance the character actually moves, so feet never slide: one loop of the
  walk = **~89 px of screen ground** for a 96 cell (the distance the player covers in 0.5 s at base speed), ~178 px for a 192 cell. Paint the loop so the
  planted foot moves back by about that much over two steps (≈ 45 px per step) and it will stay glued to the floor at every speed — slow zombies,
  hasted players, knock-backs. If your cycle covers a different distance, say so: `{ file: 'sprites/brute/walk.png', stride: 120 }` (art px per loop).
  With only `fps` on a walk, the loop length is taken as the distance covered at base speed in *frames ÷ fps* seconds.
- **Attack strike frame:** put the weapon fully out at the **middle** of the attack (frame 6–7 of 12). When the player's swing connects the game freezes that
  pose for a beat (hit-stop) and draws a weapon trail across the strike, so the middle frame is the one people see.
- **Transitions are blended by the game:** after an attack or cast the last frame holds ~50 ms, then cross-fades (~70 ms) into idle/walk; idle ↔ walk
  cross-fades too. No need to paint in-between frames for these.
- **Death:** the body keeps a little of its momentum (it slides up to ~1/3 tile away from the killer) and lands with a small thud near the end of `die`,
  so paint the fall in place around the anchor — don't move the body sideways in the frames.
- **Gear overlays** should have exactly the body's frame count for each animation (they are resampled if not, but then poses drift); they inherit the body's
  `fps` / `stride`.
- **Recommended counts:** walk **12–16**, attack **10–12**, idle **8**, cast **10**, hit **3–4**, die **10–12** (player: 16 / 12 / 8 / 10 / 4 / 12).
  `docs/ART_CATALOG.md` lists every file at these counts.
- **Blender route (recommended for the player, gear, bosses):** render each clip at the chosen count by sampling it evenly over one loop (walk: one full
  two-step cycle, the frame after the last = the first), at 3× the cell, then reduce with Lanczos. For walks, measure how far the root moves in one cycle
  in the render and set `stride` to that many final art px if it is not ~89 (96 cell). Details in ART_CATALOG section 2.

## 3. The player and visible gear — `sprites/player_base/` + `assets/gear/<key>/<anim>.png`

The player is layered: a **base body** plus one overlay per equipped piece, so every item shows on the character.

- **Base body:** `sprites/player_base/<anim>.png` (or per class: `sprites/<classId>_base/<anim>.png`), same format as
  section 2, painted in plain underclothes, **no weapon, no armour**. Use one body template for all classes (same height,
  same pose in every frame) so every overlay fits every class.
- **Overlays: exactly the base's grid** (same anim files, frames, rows, cell, anchor). Paint only the piece, where it covers
  the body in that frame, on transparency. A different frame count than the body is resampled (a 10-frame overlay on a 12-frame body), but keep them equal
  when you can. Two-handed weapons use `<family>_greatsword` / `_greataxe` / `_maul` when present, else the one-hand overlay.
- **Keys:** armour `<family>_<slot>` (slot = helm, chest, gloves, boots); weapons `<family>_<weaponType>` (sword, axe, mace,
  dagger, bow, staff, wand); off-hands `<family>_<kind>` (shield, orb, tome, quiver). Families come from the items' looks
  and are listed in ART_LIST.md with a one-line brief each.
- **Generic overlays (do these first):** `generic_<material>_<slot>` (material = plate, mail, leather, cloth, bone),
  `generic_<weaponType>`, `generic_<kind>`. **Paint them in neutral greys** (value only, little colour): the game recolours
  them with each family's palette, so one generic set dresses every family until its own overlay exists.
- **Draw order** (the game composes it): rows S, SW, W: base → boots → chest → gloves → helm → off-hand → weapon.
  Rows NW, N (back views): off-hand → weapon → base → boots → chest → gloves → helm (held items go behind the body).
- An overlay missing an animation is simply not drawn during that animation — paint all six together.
- The old 1× gear format (`gear/<family>_<slot>.png` on a 640 × 80 base) still loads with a 1× base.

## 4. Props — `assets/props/<type>.png`

- **Cell: 96 × 128 px.** The centre of the floor tile the prop stands on is at **(48, 112)**; the tile diamond spans
  x 16…79, y 96…127. Props may overhang upward and sideways but not above the cell.
- Animated props: frames side by side (width = 96 × frames). 3+ frames loop at 8 fps; 2 frames alternate at ~2.5 fps.
- Frame counts and briefs per prop are in ART_LIST.md. `gate` is drawn for a wall running top-left → bottom-right
  (mirrored automatically); `shrine_used` is the spent shrine.
- Old 48 × 64 props still load.
- **Theme looks:** `props/<type>_<theme>.png` (theme = town, crypt, caves, inferno, abyss) is used instead of `props/<type>.png` on floors of that theme.
  `{ file: 'props/torch.png', fps: 10 }` sets the loop rate of an animated prop (default: 8 fps for 3+ frames, ~2.5 fps for 2).

**Rift looks (R6.5):** the world marks some props with a `look`: `growth`, `vein`, `rift_shrine`, `rift_crystal`, `rift_core`,
`rift_shard`, `capped`. Draw `props/<look>.png` in the same 96 × 128 cell to give each its own art; without it the base prop
(crystal, bones, shrine, well) is drawn recoloured toward the rift's glow.

## 5. Icons — `assets/icons/<shape>.png` and `assets/icons/<group>/<key>.png`

- **64 × 64 px**, object centred, natural colours (the rarity colour comes from the frame and label). Shown at 16–48 px,
  so keep shapes bold. `potion_hp` / `potion_mp` are optional colour variants of `potion`. 16 × 16 and 32 × 32 still load.
- `icons/<shape>.png` replaces **every** icon of that shape (untinted), so use it for the generic look only.
- **Keyed icons** (`icons/items/`, `uniques`, `gems`, `blood`, `materials`, `consumables`, `relics`, `skills`, `perks`, `class`, `status`) replace
  one specific thing: `icons/items/heavy_helm_3.png`, `icons/gems/ruby_5.png` … The engine side is done: `G.engine.getIcon(desc, size, key)` /
  `getIconURL` take the key (`'items/heavy_helm_3'` or just `'heavy_helm_3'`; an array is tried in order; `desc.key` also works) and fall back to the shape
  icon, then the generated one. A keyed icon only shows once the item / skill / perk code passes its key (ART_CATALOG E1). Icons load in the background at start-up.

## 6. Projectiles — `assets/projectiles/<shape>.png`

- **32 × 32 px**, pointing **right**, centred; the game rotates it in 16 steps. Bright and saturated, no outline needed.

## 7. Effects — `assets/fx/<type>.png` (optional; `fx/<type>_<element|rarity>.png` is tried first when the effect carries a damage type or rarity, e.g. `fx/hit_fire.png`, `fx/lootbeam_legendary.png`; list it as `{ file, fps }` to play at a fixed rate instead of once over the effect's length)

- A strip of **square frames** (128 × 128 suggested, any square size), played once over the effect's length and scaled
  to its radius. Glows (hit, explosion, nova, heal, spark, frost, teleport…) are drawn additively: paint them on black-free
  transparency, bright core, soft falloff. Without a file the game keeps its particle effects.

## 8. Portraits — `assets/portraits/<name>.png`

- **96 × 96 px**, head and shoulders, facing slightly right, any frame/background you want. Without one, the game crops
  the head of the idle frame. Names: the classes and `npc_<role>`.

## 9. UI images

- `ui/joystick_base.png` (256 × 256) and `ui/joystick_knob.png` (128 × 128), scaled to the player's stick size. These two are used today.
- Every other UI image goes in the catalogue's folders: `ui/frames/`, `buttons`, `hud`, `inventory`, `map`, `markers`, `perks`, `rarity`, `skills`,
  `splash`, `appicon` (e.g. `ui/frames/panel.png`), or directly in `ui/` (`ui/logo.png`). The loader accepts and lazy-loads them
  (`G.engine._.assets.ui('frames/panel')` returns the image, `.url('ui/frames/panel.png')` the file URL for a CSS `border-image`), but nothing draws them until
  the UI team wires the skin hook (ART_CATALOG E5); `appicon` and `logo` need that too.

## 10. Sound — `assets/sound/[folder/…]<name>.m4a`

The complete catalogue (2,306 files, folder tree, loudness and loop rules, names, variation counts) is `docs/SOUND_DESIGN.md`; this section is only what the loader needs.

- **Formats:** `.m4a` (AAC, the recommended format for iPhone), `.mp3`, `.aac`, `.ogg`, `.wav`.
- **Folders:** a file may sit directly in `sound/` or in any sub-folder of the catalogue tree (`sound/sfx/player/step_stone.m4a`, `sound/ui/click.m4a`,
  `sound/ambience/amb_crypt.m4a`, `sound/music/music_crypt.m4a`, `sound/stingers/sting_death.m4a` …). **A sound's name is its file name without the
  extension and must be unique across all folders** (a second file with the same name is ignored, with a warning); the folder only decides the load bank.
- **Effects:** mono, short (< 2 s), peak around −3 dB, no silence at the start. Add `<sfx>_2.m4a`, `_3` … and the game picks one at random each time
  (never the same one twice running, with ±4 % pitch variation, so repeated hits do not sound mechanical).
- **Ambience beds:** `amb_<bed>`, stereo, 20–60 s, **seamless loop** (the game loops it sample-accurately).
- **Music:** `music_<track>`, stereo, 1–3 min, loopable; tracks crossfade over 2 s. Tracks: title, town, crypt, caves, inferno, abyss, rift (depth 21+), boss,
  echo (falls back to boss); `music_<theme>_b` / `_c` fall back to `music_<theme>`, `music_boss_<id>` to `music_boss`.
- **Banks / memory:** sounds are fetched and decoded lazily by folder, so the full set is never in memory. `sound/` itself, `ui`, `sfx/player`, `sfx/weapons`,
  `sfx/loot`, `sfx/systems` and `sfx/world` load at start (the *core* banks); `sfx/monsters/<theme>`, `sfx/skills/<class>` and `sfx/bosses/<boss>` load when the floor
  needs them and are released about 20 s after; `ambience` and `stingers` load the first time they are asked for (that first request plays the synthesized sound or its
  fallback) and are released when idle. Decoded audio is capped at 128 MB, least recently played first.
- **Fallbacks:** a name with no file and no synth falls back instead of staying silent: `drop_<tier>` → `loot` / `loot_rare` / `loot_legendary`; `mon_*_hurt` / `_die` /
  `_attack` → `hurt` / `die` / `hit`; `skill_*_cast` → `cast`; `skill_*_hit`, `wpn_*_hit` → `hit`; `wpn_*_swing` → `swing`. `G.engine.sfx(name, fallbackName)` also takes an explicit fallback.
- Anything missing stays synthesized (effects, ambience) or silent (music). Player volume settings: `sfxVolume`, `ambienceVolume`, `musicVolume` (0–1).
- A listed file that is missing or cannot be decoded logs one console warning that names it and keeps the synthesized sound.

---

## Suggested order (biggest visual gain first)

| Step | What |
|---|---|
| 1 | `player_base` (idle + walk) and the generic armour/weapon overlays for one material — the hero is on screen all the time |
| 2 | Crypt tileset and the crypt props (chest, barrel, torch, tombstone, bones, corpse, gate) |
| 3 | Crypt monsters + Morgrath, then music_crypt and the core sound effects (hit, swing, loot, loot_rare, loot_legendary) |
| 4 | Item icons |
| 5 | Town tileset, townsfolk (idle only), town props, music_town, amb_wind |
| 6 | Remaining generic overlays, then family overlays for the looks you like most |
| 7 | Caves, inferno, abyss: tilesets, monsters, bosses, music |
