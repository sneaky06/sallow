# assets/sound/sfx/skills/shared/

9 entries · 22 files · core 6 / important 12 / polish 4.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/skills/shared/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `fire.m4a` … `fire_3.m4a` | 0.8s | mono · one-shot | core · plays today | generic fire whoosh / burn. Fallback for any fire skill without its own. |
| `ice.m4a` … `ice_3.m4a` | 0.6s | mono · one-shot | core · plays today | generic ice crackle. Fallback for any cold skill. |
| `skill_ready.m4a` | 0.2s | mono · one-shot | important | A skill's cooldown ends: a tiny soft tick, only for skills the player has on the bar. |
| `skill_nomana.m4a`, `skill_nomana_2.m4a` | 0.3s | mono · one-shot | important | Not enough mana: a dull empty "fizz" (blue), quieter and shorter than `error`. |
| `skill_cooldown.m4a` | 0.2s | mono · one-shot | polish | Pressed while cooling down: a thin refusal tick. |
| `buff_on.m4a` … `buff_on_3.m4a` | 0.8s | mono · one-shot | important | Generic timed buff starts (Battle Shout, Shield Wall, Mana Shield, Bone Armor share their own; this is the fallback): a rising warm shimmer. |
| `buff_off.m4a` … `buff_off_3.m4a` | 0.5s | mono · one-shot | polish | Buff expires: a soft falling chime. |
| `zone_cast_ring.m4a` … `zone_cast_ring_3.m4a` | 0.5s | mono · one-shot | important | A skill zone is placed on the floor (Blizzard, curses, traps): a ground-ring pulse. |
| `aoe_ring_pulse.m4a` … `aoe_ring_pulse_3.m4a` | 0.4s | mono · one-shot | important | The faint 2.4-tile ring flash for melee/self AoE skills: a soft "doomm" under the main cast. |
