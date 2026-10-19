# assets/sound/sfx/skills/warrior/

23 entries · 57 files · core 16 / important 32 / polish 9.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `skill_bash_cast.m4a` … `skill_bash_cast_3.m4a` | 0.45s | mono · one-shot | core | Overhead heave with a hard downward whoosh and a grunt-free breath. |
| `skill_bash_hit.m4a` … `skill_bash_hit_3.m4a` | 0.5s | mono · one-shot | core | Bash lands: a skull-rattling smash with a short bell-like stun ring on top. |
| `skill_charge_cast.m4a`, `skill_charge_cast_2.m4a` | 0.6s | mono · one-shot | important | Charge (target skill): a rush of boots and plate, a roar-less shove, ending in the strike. |
| `skill_charge_hit.m4a` … `skill_charge_hit_3.m4a` | 0.5s | mono · one-shot | important | The charge strike plus a dazed ring. |
| `skill_rend_cast.m4a` … `skill_rend_cast_3.m4a` | 0.4s | mono · one-shot | important | Rend: a tearing, dragging slash. |
| `skill_rend_hit.m4a` … `skill_rend_hit_3.m4a` | 0.4s | mono · one-shot | important | A deep wet cut that leaves a lingering drip pattern (bleed). |
| `skill_execute_cast.m4a`, `skill_execute_cast_2.m4a` | 0.8s | mono · one-shot | important | Execute: a slow, deliberate lift of the blade, a held breath. |
| `skill_execute_hit.m4a` … `skill_execute_hit_3.m4a` | 0.8s | mono · one-shot | important | The killing blow: a cleaver-heavy crunch with a sub-bass hit. |
| `skill_execute_finish.m4a`, `skill_execute_finish_2.m4a` | 1s | mono · one-shot | polish | Execute vs a foe below 30% life (doubled damage): the same hit but with a bone-snap and a small silence after. |
| `skill_cleave_cast.m4a` … `skill_cleave_cast_4.m4a` | 0.5s | mono · one-shot | core | Cleave: wide horizontal swing, a long whooshing arc. |
| `skill_cleave_hit.m4a` … `skill_cleave_hit_3.m4a` | 0.4s | mono · one-shot | core | Short, thick slice-through; layered on each foe struck, throttled. |
| `skill_whirlwind_start.m4a`, `skill_whirlwind_start_2.m4a` | 0.5s | mono · one-shot | important | Whirlwind winds up: a boot dig and a rising whir. |
| `skill_whirlwind_loop.m4a` | 1s | mono · loop | important | 1.2 s spin: a steady rotating blade whoosh (4 strikes per spin: the engine pulses the hit layer on each). |
| `skill_whirlwind_end.m4a`, `skill_whirlwind_end_2.m4a` | 0.5s | mono · one-shot | polish | The spin ends, boots skid. |
| `skill_leap_cast.m4a`, `skill_leap_cast_2.m4a` | 0.6s | mono · one-shot | important | Leap launch: a grunt-less push-off, a whoosh up and a breath held. |
| `skill_leap_land.m4a` … `skill_leap_land_3.m4a` | 0.9s | mono · one-shot | core | Leap landing: a ground-shaking crunch with a debris spray and slow reverb; slows foes (a muddy drag tail). |
| `skill_earthquake_cast.m4a`, `skill_earthquake_cast_2.m4a` | 0.8s | mono · one-shot | important | Earthquake windup: the weapon driven into the ground, a low crack. |
| `skill_earthquake_wave.m4a` … `skill_earthquake_wave_3.m4a` | 1s | mono · one-shot | important | One of three shockwaves: a rolling low boom with rubble clatter. Plays 3 times, each slightly deeper. |
| `skill_shout_battle.m4a`, `skill_shout_battle_2.m4a` | 1.2s | mono · one-shot | important | Battle Shout: a long wordless war-roar (no words), then a warm brass swell as the buff lands. |
| `skill_shout_war.m4a`, `skill_shout_war_2.m4a` | 1.2s | mono · one-shot | important | War Cry: a shrieking, terrifying roar that cuts through; stun ring ripple and cowering sounds. |
| `skill_shield_wall_on.m4a`, `skill_shield_wall_on_2.m4a` | 0.8s | mono · one-shot | important | Shield Wall: a shield planted and braced: heavy iron thud, a deep resonant hum that sustains softly. |
| `skill_shield_wall_hit.m4a` … `skill_shield_wall_hit_3.m4a` | 0.4s | mono · one-shot | polish | A blow absorbed under Shield Wall: a muffled clang. |
| `skill_shield_wall_off.m4a`, `skill_shield_wall_off_2.m4a` | 0.5s | mono · one-shot | polish | Shield lowered: a creak and a breath out. |
