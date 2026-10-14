# R5 UI team — interface facts other teams rely on

- state.settings.hud.joystick = { mode, x, y, size }. x and y are window fractions; size is the stick diameter as a fraction of the short screen side (the same definition engine input.js uses). The UI mirrors the current orientation into this object. The UI never writes hud.portrait or hud.landscape.
- The UI reads the floor name in this order: map.floorName, map.variant.floorName, map.name, map.variant.name. For the banner colour it reads map.variant.palette.accent or .light (hex).
- Pile popup on pile:open { pileId }. It uses items.getPile, items.pickup(groundId) and items.pickupPile(pileId). The game stays paused while it is open.
- Locking goes through items.setLocked(item, bool). Mass selling uses previewSellAtOrBelow(r) → { count, gold, gems } and then sellAtOrBelow(r).
- On item:picked, the UI stamps item.foundAt only when the field is missing. Items already sets it in addToInventory.
- After the ending scene, the UI sets flags.pallorUnlocked = true, flags.titles = ['Warden of the Well'] and flags.title.
- Full details are in docs/handover/ui-meta-handover.md under "Revision 5".
