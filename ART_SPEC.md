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
2. Add the path to `assets/assets.js`, e.g. `'sprites/warrior/walk.png',` or `'sound/hit.mp3',`.
3. Reload the game. A listed file that is missing or the wrong size is ignored and the generated version stays.

## The format in one paragraph

The game renders at about **double the old resolution**: a floor tile is **64 × 32 px**, a character cell **96 × 96 px**
with a normal human about **56–60 px** tall, **8 facing directions** of which you draw **5** (the other 3 are mirrored),
and smooth coloured lighting with soft shadows added by the game. Paint at exactly the sizes given — **1 file pixel = 1
screen pixel on most phones**. Painterly shading, soft edges and anti-aliasing are welcome now (this is not 8-bit any
more); keep a clean silhouette so characters read against dark floors.

## Rules for every image

- **PNG, 32-bit RGBA, transparent background.** Export at 100%, never upscaled. sRGB.
- **No ground shadows, no lighting baked across the scene.** The game adds a soft shadow under every creature and lights the
  world with torches and the player's light. Paint form shading only (light from the **top-left**, like Diablo II).
- **Keep 2 px of empty margin** inside every cell, so nothing touches the cell edge.
- **Value contrast:** keep floors dark and in a narrow value range; characters, loot and props clearly lighter or darker.
  Base colours desaturated (cold stone, bruise purple, bog green, rust, bone, dried blood); saturated colour only as accents.
- Rarity colours are the brightest things on screen; avoid these exact hues elsewhere:
  `#c8c8c8` common, `#5b8cff` magic, `#ffe45b` rare, `#b65bff` epic, `#ff8a2b` legendary, `#3ddc6a` set, `#ff3b4e` mythic
  (the rarity ladder is being renamed in R7.1; the game reads colours from code, so no art changes are needed for that).

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

| File | Frames | Timing | Notes |
|---|---|---|---|
| `idle.png` | 4 | 1 s loop | breathing; NPCs only need this one |
| `walk.png` | 8 | 0.5 s loop (two steps) | contact, down, pass, up × 2 |
| `attack.png` | 6 | 0.27 s, last frame holds | wind-up (1–2), strike with the weapon fully out (3–4), recover |
| `cast.png` | 6 | 0.33 s | raise, release (arms/staff up), recover |
| `hit.png` | 2 | 0.2 s | recoil |
| `die.png` | 6 | 0.5 s | fall; **the last frame stays on the ground** as the body (paint any blood pool into it) |

- **Fewer frames are fine:** trailing empty frames are ignored and the animation is spread over the same time.
- **Missing animations fall back:** cast ↔ attack, everything else → idle. A sprite needs at least `idle.png`.
- Draw the creature's weapon into its sprite. The player is the exception (section 3).
- The old 1× format (`sprites/<id>.png`, 640 × 80, 16 columns × 2 rows of 40 px) still loads.

## 3. The player and visible gear — `sprites/player_base/` + `assets/gear/<key>/<anim>.png`

The player is layered: a **base body** plus one overlay per equipped piece, so every item shows on the character.

- **Base body:** `sprites/player_base/<anim>.png` (or per class: `sprites/<classId>_base/<anim>.png`), same format as
  section 2, painted in plain underclothes, **no weapon, no armour**. Use one body template for all classes (same height,
  same pose in every frame) so every overlay fits every class.
- **Overlays: exactly the base's grid** (same anim files, frames, rows, cell, anchor). Paint only the piece, where it covers
  the body in that frame, on transparency.
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

**Rift looks (R6.5):** the world marks some props with a `look`: `growth`, `vein`, `rift_shrine`, `rift_crystal`, `rift_core`,
`rift_shard`, `capped`. Draw `props/<look>.png` in the same 96 × 128 cell to give each its own art; without it the base prop
(crystal, bones, shrine, well) is drawn recoloured toward the rift's glow.

## 5. Icons — `assets/icons/<shape>.png`

- **64 × 64 px**, object centred, natural colours (the rarity colour comes from the frame and label). Shown at 16–48 px,
  so keep shapes bold. `potion_hp` / `potion_mp` are optional colour variants of `potion`. 16 × 16 and 32 × 32 still load.

## 6. Projectiles — `assets/projectiles/<shape>.png`

- **32 × 32 px**, pointing **right**, centred; the game rotates it in 16 steps. Bright and saturated, no outline needed.

## 7. Effects — `assets/fx/<type>.png` (optional)

- A strip of **square frames** (128 × 128 suggested, any square size), played once over the effect's length and scaled
  to its radius. Glows (hit, explosion, nova, heal, spark, frost, teleport…) are drawn additively: paint them on black-free
  transparency, bright core, soft falloff. Without a file the game keeps its particle effects.

## 8. Portraits — `assets/portraits/<name>.png`

- **96 × 96 px**, head and shoulders, facing slightly right, any frame/background you want. Without one, the game crops
  the head of the idle frame. Names: the classes and `npc_<role>`.

## 9. UI images

- `ui/joystick_base.png` (256 × 256) and `ui/joystick_knob.png` (128 × 128), scaled to the player's stick size.
- `ui/appicon.png` (1024 × 1024, no transparency) and `ui/logo.png` (768 × 256) need the UI team to wire them.

## 10. Sound — `assets/sound/<name>.mp3` (or `.m4a`)

- **Effects:** `sound/<sfx>.mp3`, mono, short (< 2 s), peak around −3 dB, no silence at the start. Add `<sfx>_2.mp3`,
  `_3` … and the game picks one at random each time (variations keep repeated hits from sounding mechanical).
- **Ambience beds:** `sound/amb_<bed>.mp3`, stereo, 20–60 s, **seamless loop** (the game loops it sample-accurately).
- **Music:** `sound/music_<track>.mp3`, stereo, 1–3 min, loopable; tracks crossfade over 2 s. Tracks: title, town, crypt,
  caves, inferno, abyss, rift (depth 21+), boss, echo (falls back to boss).
- Anything missing stays synthesized (effects, ambience) or silent (music). Player volume settings: `sfxVolume`,
  `ambienceVolume`, `musicVolume` (0–1).
- AAC (`.m4a`, 128–192 kbps) is the best choice for iPhone; MP3 works everywhere.

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
