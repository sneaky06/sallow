# assets/ui/hud/

Drop the files below here, then add each path to `assets/assets.js`. Full specs: [`docs/ART_CATALOG.md`](../../../docs/ART_CATALOG.md); formats: `ART_SPEC.md`.

Rules: PNG, RGBA, transparent, 100% export, lower-case file names, 2 px margin in every cell, light from the top-left, no baked ground shadow.

## ui/hud/orb_frame.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/orb_frame.png` · **Canvas:** 160 × 160 · **Cell:** single, transparent centre · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Health/mana orb frame: iron ring with a glass rim. Centre must be transparent so the fill shows.

## ui/hud/orb_glass.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/orb_glass.png` · **Canvas:** 160 × 160 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Glass highlight laid over the fill (top-left specular, soft dark lower-right).

## ui/hud/orb_fill_{hp,mp}.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/orb_fill_{hp,mp}.png` · **Canvas:** 2 × (160 × 320) · **Cell:** tall, 2:1 so the surface can wave · **Frames:** 2 images · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Liquid art: dark blood red (hp) and deep blue (mp), with a bright surface line; cropped by the game to the current %.

## ui/hud/bar_frame.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/bar_frame.png` · **Canvas:** 256 × 24 · **Cell:** 3-slice horizontal (caps 12 px) · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Generic bar frame for XP, boss, pallor, explored, event timers.

## ui/hud/bar_fill_{xp,boss,echo,pallor,explored,event}.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/bar_fill_{xp,boss,echo,pallor,explored,event}.png` · **Canvas:** 6 × (256 × 24) · **Cell:** stretches horizontally · **Frames:** 6 images · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Fills: xp gold, boss red, echo ice-blue, pallor bone-white, explored teal, event amber.

## ui/hud/skill_slot.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/skill_slot.png` · **Canvas:** 72 × 72 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Round/square skill button base (4 slots); the icon, key tag and the cooldown sweep go on top.

## ui/hud/attack_button.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/attack_button.png` · **Canvas:** 112 × 112 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- The big Attack button base (loot mode and attack mode share it).

## ui/hud/dash_button.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/dash_button.png` · **Canvas:** 72 × 72 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Dash button base with 2-charge pips area.

## ui/hud/potion_slot_{hp,mp}.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/potion_slot_{hp,mp}.png` · **Canvas:** 2 × (64 × 64) · **Cell:** single · **Frames:** 2 images · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Potion buttons: flask holders with a count tag.

## ui/hud/minimap_frame.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/minimap_frame.png` · **Canvas:** 160 × 160 · **Cell:** single, transparent centre · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Minimap frame (80×80 live canvas inside, 2× here) with compass ticks.

## ui/hud/map_button.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/map_button.png` · **Canvas:** 48 × 48 · **Cell:** single · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Open-map button.

## ui/hud/pips.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/pips.png` · **Canvas:** 4 × (16 × 16) · **Cell:** sheet 64 × 16 · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Pips: dash charge full/empty, Heat stack full/empty.

## ui/hud/flow_vignette.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/flow_vignette.png` · **Canvas:** 1170 × 2532 · **Cell:** stretches to screen · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Full-screen Flow slow-motion tint: teal edge vignette, transparent centre (portrait; landscape stretches).

## ui/hud/hit_vignette.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/hit_vignette.png` · **Canvas:** 1170 × 2532 · **Cell:** stretches to screen · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Red low-life / damage edge vignette (transparent centre).

## ui/hud/tracker_plate.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/tracker_plate.png` · **Canvas:** 192 × 64 · **Cell:** 9-slice, corners 12 px · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Quest tracker / area name / floor plate.

## ui/hud/event_banner.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/event_banner.png` · **Canvas:** 256 × 64 · **Cell:** 9-slice horizontal · **Frames:** 1 image · **Anchor:** -
- **Priority:** polish · **Loader:** ENGINE E5 · **Paint over:** -
- Event banner (Gauntlet, Key Hunt, Cave-in, Magpie).

## ui/hud/boss_frame.png

- **Group:** K. UI art — K3 HUD
- **File(s):** `ui/hud/boss_frame.png` · **Canvas:** 320 × 48 · **Cell:** 3-slice horizontal · **Frames:** 1 image · **Anchor:** -
- **Priority:** important · **Loader:** ENGINE E5 · **Paint over:** -
- Boss bar frame with a skull-and-horns centre piece at the top.
