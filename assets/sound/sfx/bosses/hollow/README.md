# assets/sound/sfx/bosses/hollow/

13 entries · 23 files · core 6 / important 16 / polish 1.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/bosses/hollow/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `boss_hollow_alert.m4a` | 3.5s | stereo · one-shot | core | The Hollow Star opens: a vast eyelid of dark, a sub-bass drone and an impossibly cold bell; a long breath that is air going the wrong way. |
| `boss_hollow_gaze_loop.m4a` | 2s | mono · loop | core | The sweeping gaze beam: a thin, rising whine with a constant scan like radar; it is a spark line, 0.45 rad/s. Louder when it points at you… |
| `boss_hollow_gaze_hit.m4a` … `boss_hollow_gaze_hit_3.m4a` | 0.4s | mono · one-shot | important | You are in the beam with line of sight: a cold stinging tick that repeats per damage tick. |
| `boss_hollow_pull_loop.m4a` | 2s | mono · loop | important | Hollow (55%): it pulls you in within 10 tiles: a vacuum of air, a rising pressure whine; a dash breaks free with a pop. |
| `boss_hollow_pull_break.m4a`, `boss_hollow_pull_break_2.m4a` | 0.5s | mono · one-shot | important | You dash free of the pull. |
| `boss_hollow_shards_loop.m4a` | 2s | mono · loop | polish | Shard rings orbiting: quiet glass chimes revolving. |
| `boss_hollow_blackout_warn.m4a` | 1.6s | mono · one-shot | core | The audio warning for the blackout (the story spec asks for one): a rising, clearly audible wail followed by a hard silence 0.2 s before… |
| `boss_hollow_blackout_loop.m4a` | 2s | mono · loop | important | While the room is dark: a sub-bass pulse and the unmistakable absence of the ambience (engine ducks beds to 20%). |
| `boss_hollow_reopen.m4a`, `boss_hollow_reopen_2.m4a` | 1.2s | mono · one-shot | core | It reopens behind you, 2 tiles away: a heavy pop and a blast; a loud, short, cathartic hit. |
| `boss_hollow_voidbolts.m4a` … `boss_hollow_voidbolts_3.m4a` | 0.6s | mono · one-shot | important | Void Bolts fan. |
| `boss_hollow_well.m4a` … `boss_hollow_well_3.m4a` | 0.9s | mono · one-shot | important | Void Wells open: low spatial pops. |
| `boss_hollow_starfall.m4a` … `boss_hollow_starfall_3.m4a` | 1s | mono · one-shot | important | Starfall: a double ring of 14 orbs raining outward: bright chimes, a descending whistle. |
| `boss_hollow_die.m4a` | 5s | stereo · one-shot | core | It collapses inward: a monstrous inward pull, a pitch drop, a final bell, then a quiet bright sky: the sound of a held breath finally… |
