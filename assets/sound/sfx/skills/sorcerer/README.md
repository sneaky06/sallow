# assets/sound/sfx/skills/sorcerer/

27 entries · 67 files · core 19 / important 41 / polish 7.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/skills/sorcerer/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `skill_fire_bolt_cast.m4a` … `skill_fire_bolt_cast_3.m4a` | 0.4s | mono · one-shot | important | Fire Bolt: a quick flame spit, a hiss of gas igniting. |
| `skill_fire_bolt_hit.m4a` … `skill_fire_bolt_hit_3.m4a` | 0.4s | mono · one-shot | important | A small blast and sizzle; burns on. |
| `skill_fireball_cast.m4a` … `skill_fireball_cast_3.m4a` | 0.7s | mono · one-shot | core | Fireball: a deep whoomp of gas catching, a growing roar as it leaves the hand. |
| `skill_fireball_travel.m4a` | 0.8s | mono · loop | polish | A lit comet crackle that follows the projectile (loop, stops at impact). |
| `skill_fireball_hit.m4a` … `skill_fireball_hit_3.m4a` | 1s | mono · one-shot | core | An exploding fireball: a boom with a fire-spreading whoosh and falling embers. |
| `skill_incinerate_start.m4a`, `skill_incinerate_start_2.m4a` | 0.5s | mono · one-shot | important | Incinerate: a roaring flame jet ignites. |
| `skill_incinerate_loop.m4a` | 0.9s | mono · loop | important | A sustained flame stream roar, ~0.85 s while channelled; ends with a puff. |
| `skill_meteor_cast.m4a`, `skill_meteor_cast_2.m4a` | 0.9s | mono · one-shot | important | Meteor call: a rising, descending whistle and a rumble; 0.9 s delay in-game, so the sound IS the telegraph: it should end exactly at impact. |
| `skill_meteor_hit.m4a` … `skill_meteor_hit_3.m4a` | 1.6s | mono · one-shot | core | Meteor impact: a gut-shaking boom, ground splitting, a shower of debris, burning aftermath. One of the loudest player sounds (but not the… |
| `skill_ice_shard_cast.m4a` … `skill_ice_shard_cast_3.m4a` | 0.4s | mono · one-shot | important | Ice Shard: a crystalline slick, like a knife drawn from ice. |
| `skill_ice_shard_hit.m4a` … `skill_ice_shard_hit_3.m4a` | 0.4s | mono · one-shot | important | A glassy shatter and a chilling tinkle. |
| `skill_frost_nova_cast.m4a`, `skill_frost_nova_cast_2.m4a` | 0.9s | mono · one-shot | important | Frost Nova: a deep whoosh outward, then freezing crackle spreading to the ring edge. |
| `skill_frost_nova_freeze.m4a` … `skill_frost_nova_freeze_3.m4a` | 0.7s | mono · one-shot | important | Foes frozen: ice forming on bodies, a squeaking crackle. Throttled. |
| `skill_shatter.m4a` … `skill_shatter_3.m4a` | 0.7s | mono · one-shot | polish | A frozen foe shatters (Shatter passive): a glass-bell explosion. Today `ice` + text 'SHATTER'. |
| `skill_blizzard_cast.m4a`, `skill_blizzard_cast_2.m4a` | 0.8s | mono · one-shot | important | Blizzard: the sky closes, wind and ice swirl in. |
| `skill_blizzard_loop.m4a` | 3s | mono · loop | important | 5 s storm zone: a roaring ice-wind loop with ice pellets ticking; the 0.5 s tick sound is a tiny ice patter. |
| `skill_glacial_spike_cast.m4a`, `skill_glacial_spike_cast_2.m4a` | 0.9s | mono · one-shot | important | Glacial Spike: a massive crystal growing, a pressure crack, the spike fired with a heavy whump. |
| `skill_glacial_spike_hit.m4a` … `skill_glacial_spike_hit_3.m4a` | 1.1s | mono · one-shot | important | A giant ice stab: a deep ice-shattering crash, frost crackle outward. |
| `skill_chain_cast.m4a` … `skill_chain_cast_3.m4a` | 0.5s | mono · one-shot | core | Chain Lightning: a violent crackle as the bolt leaves the hand. |
| `skill_chain_arc.m4a` … `skill_chain_arc_4.m4a` | 0.3s | mono · one-shot | core | The arc jumps between foes: a snap-snap zap each jump, rising pitch with each hop. |
| `skill_teleport.m4a` … `skill_teleport_3.m4a` | 0.6s | mono · one-shot | core | Teleport: a swallowed zip; shares the `blink_out`/`blink_in` feel but louder, with an arcane resonance. |
| `skill_mana_shield_on.m4a`, `skill_mana_shield_on_2.m4a` | 0.8s | mono · one-shot | important | Mana Shield: a shimmering bubble of blue energy forming, a resonant hum. |
| `skill_mana_shield_hit.m4a` … `skill_mana_shield_hit_3.m4a` | 0.4s | mono · one-shot | important | A hit drains mana instead of life: a glassy "bong" and a drip of mana. |
| `skill_mana_shield_off.m4a`, `skill_mana_shield_off_2.m4a` | 0.5s | mono · one-shot | polish | The bubble pops. |
| `skill_thunderstorm_start.m4a`, `skill_thunderstorm_start_2.m4a` | 1s | mono · one-shot | important | Thunderstorm: clouds roll in over your head, a deep rumble and wind gather. |
| `skill_thunderstorm_loop.m4a` | 3s | mono · loop | polish | 10 s: a storm hum that follows the player, patter of rain. |
| `skill_thunderstorm_strike.m4a` … `skill_thunderstorm_strike_4.m4a` | 1s | mono · one-shot | important | A lightning strike on a nearby foe: a crack followed by a rolling thunder; rate 1 per 0.6 s so tails must be short and overlap well. |
