# Engine R5 — data shapes the engine reads (all optional, all guarded)

Written by the R5 engine session. Anything missing or malformed falls back silently; nothing here throws.

## item.look (items team, R5.9)
`item.look = { family: 'rusted_mail', palette }`
- `family`: any snake_case id. The engine guesses the material/decoration from words in the id, so pick
  descriptive words: plate/iron/steel/knight → plate; mail/chain/ring/scale → mail; leather/hide/hunter/stalker → leather;
  cloth/robe/silk/shroud/wrap/cowl/hood → cloth; bone/grave/skull/ossuary/marrow → bone; crown/king/regal; horn/demon/fiend → horns;
  spike/thorn/barb → spikes; ash/ember/cinder/flame → glowing embers; void/abyss/eye → violet glow; frost/rime → icy.
  Unknown words → generic look for the slot.
- `palette`: either a name (`iron rust bone ash blood gold bronze void moss frost ember shadow ivory verdigris crimson`
  — unknown names hash to a stable hue), an array `['#main', '#trim', '#glow?']`, or `{ main, trim, glow }` (hex).
- Weapon look uses `item.weaponType` (sword/axe/mace/dagger/bow/staff/wand) + its look palette.
  Off-hand: `item.icon.shape` 'shield' → shield, 'orb' → orb, 'tome' → book, 'arrow'/'quiver' → quiver; anything else → shield.
- Optional extra: `item.look.glow: '#hex'` adds a small glowing accent (good for uniques / mythics).

## map.variant (world team, R5.10)
`map.variant = { id, name, palette, light, ambient, layout }` — the engine reads palette / light / ambient:
- `palette`: `{ tint: '#hex', amount: 0..1 }` (hue shift of the whole tileset; 0.25–0.45 reads well) — optional
  `bg: '#hex'` (void colour). A plain '#hex' string = tint at 0.35. A name string also works (same list as item palettes).
- `light`: `{ color: '#hex', radius: tiles (player light, default 7), ambient: '#hex' (ambient darkness colour, darker = gloomier) }`.
  A number = radius only.
- `ambient`: `{ particles: 'mist'|'ash'|'ember'|'spore'|'drip'|'snow'|'motes'|'void'|'none', density: 0..2 (1 default),
  color: '#hex', fog: 0..1 (how dark explored-but-unseen ground gets; 0.5 default), sound: 'wind'|'drone'|'drip'|'fire'|'heart'|'choir'|'water'|'none' }`.
  A string = particles kind.

## state.settings.hud.joystick (UI team, R5.1)
`{ mode: 'floating'|'fixed', x, y, size }`
- `x, y`: centre of the stick as fractions of the viewport width / height (0..1).
- `size`: stick DIAMETER as a fraction of the screen's short side (default 0.25 ≈ 94 px on a 375 px phone).
- `fixed`: always drawn there; a touch starting within ~1.6 stick radii of it grabs it. Other touches = taps.
- `floating`: x < 0.5 → zone is the left 40% of the screen, x ≥ 0.5 → right 40%.
- Also honoured if present: `hud.opacity` (0..1) dims the drawn stick; `hud.portrait.joystick` / `hud.landscape.joystick`
  override `hud.joystick` in that orientation.

## Engine API added
- `G.engine.getPlayerPreview(player, size = 96) → canvas` — paper-doll figure wearing current equipment (cached per gear combo).
- `G.engine.gearKey(player) → string` (debug).
- Piles: groups `state.groundItems` by `pileId`.
- Pallor: reads `G.game.getPallor().tier` if present, else `state.flags.pallor` (0–100 → tier = min(4, floor(v / 20))).
