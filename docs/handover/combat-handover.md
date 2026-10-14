# Combat & Classes (src/game) — hand-over (Revision 2)

Status: Revision 2 items implemented. tests/combat.html → 291/291 assertions, 0 console errors.
Integration: tests/combat.html?real=1 loads the REAL world + items modules; `runProgression({ classes, mode, maxDepth })` plays
auto-build characters floor by floor on real loot (results in window.__prog).

Things other teams should know
- Entities carry extra fields: `faction`, `summon`, `summonOf`, `ai`, `dmgMin/dmgMax`, `speed`, `xp`, `noLoot`, `bossAdd`, `lockdown`,
  `fly` (flyer/wraith bodies: ignore water + lava), `lavaProof` (inferno natives).
- Dead monsters stay in state.entities ~8 s (`dead: true`, `anim: 'die'`) as corpses for Corpse Explosion.
- `G.game.zones` = plain data { x, y, r, delay, t, faction, color, trap }; also announced via `fx:spawn` type 'ring' (radius + duration).
- `player:damaged.source` is the attacking entity (null for DoTs / lava).
- `player:died { noRetrieve }` — true while any boss is awake and alive, or `state.flags.sealed`.

Lockdown rooms (R2.5)
- Trigger: player tile inside the room rect, not a DOOR tile, and > 1.3 tiles from every door.
- Progress is on the room object: `room.locked`, `room.wave` (1-based, current), `room.waves`, `room.cleared`. `G.game.getLockdown()` →
  `{ room, wave, waves } | null` for the UI wave counter (I also toast "Wave n / m").
- Gates are `{ type: 'gate', x, y, solid: true }` props; removed again with G.world.invalidate(map).
- Reward chest: prop gets `locked = false`, `lockReward = true`. I call dropLoot(source 'chest') twice, passing `rarityFloor: 'rare'` in opts
  (ignored today), and additionally drop one guaranteed rare-or-better via rollItem + dropItemAt.
- Fail-safe: if the player is outside the sealed room for 3 s the lockdown lifts unrewarded (re-entering restarts it).
- Blink/leap/teleport cannot leave a sealed room.

Mythic effects (R2.2): all 12 implemented, read from `G.items.getActiveEffects(player)` in recomputeStats → `player.bonus.fx`.
- legion's "+2 maximum summons" applies to Raise Skeleton (not mages/golem).
- executioner checks life AFTER the hit lands.
- second_wind cooldown is the effect `second_wind_cd` in player.effects (120 s; cleared by death/revive).
- midas is hooked where the game module calls G.items.pickup (auto-pickup + tap pickup), so vendor gold does not trigger it.

Weapons (R2.3): every skill works with every weapon. Arrow skills without a bow fire 'shard' projectiles; melee skills with a
ranged weapon walk in and strike. No weapon-based lockedReason exists.

Balance notes
- Casters' spell damage = weapon damage × attacks/sec × 0.75; warrior/ranger skills use per-hit weapon damage.
- Bosses: base life ×2.4 vs. revision 1, +3 % life per depth, damage growth softened past level 7, one hit per volley per target.
- Elite spawns are champions on depths 1–3 and rares from depth 4.

## Revision 3 additions (combat)
- Monster rarity 'legendary': 4–5 modifiers incl. one from G.game.LEGEND_AFFIXES, name "Name, Title", sprite.accent '#ff8a2b',
  announced once via ui:toast + sfx 'shrine' (e.seen = true). Loot source 'legendary'. Last lockdown wave from depth 8.
- G.game.AFFIXES[name] = { color, tell, legendary? } — `tell` is a short readable phrase the UI can show next to the modifier name.
- Champions spawn as packs of 2–4 sharing one modifier; rares get 2–3 modifiers and 3 minions.
- map.mods = [modId] rolled in spawnMapEntities (deterministic from map.seed). G.game.FLOOR_MODS[id] = { name, desc, reward:{magicFind,goldFind,xpGain}, min }.
  Rewards are applied to kills (XP multiplier, magicFind/goldFind added to dropLoot opts). Arrival toasts come from the game module.
- G.state.targetId = id of the current auto-target (null when none), refreshed every 0.15 s.
- SKILLS[id].synergies = [{ from, desc, key?, pct?, combo? }]; getSkillInfo(id).synergies = [{ from, name, desc, active, combo }].
- Lockdown reward chest uses dropLoot opts.floor = 'rare' (both rolls).

## Revision 4 additions (combat)
- G.game.getClassAction() → { id:'dash', name, desc, icon, cooldown, cdRemaining } for the Ranger, null otherwise; G.game.useClassAction()
  is what `input:classaction` calls. Base: 3 tiles, 0.35 s invulnerable, 3 s cooldown; the Acrobatics passive (id `dodge_roll`, formerly the
  Dodge Roll active) improves all three. `dodge_roll` is now `kind: 'passive'` — UI skill bars should no longer show it.
- Bosses take half damage from player summons; drain-skill healing (Life Drain) is 40% as strong against bosses; Bone Armor cooldown 30→26 s by rank.
