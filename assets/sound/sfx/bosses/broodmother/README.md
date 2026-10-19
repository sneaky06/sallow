# assets/sound/sfx/bosses/broodmother/

12 entries · 27 files · core 7 / important 20 / polish 0.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `boss_broodmother_alert.m4a` | 2.5s | mono · one-shot | core | Skarn drops from the roof into the lantern light: skittering overhead, a groan of beams, a lantern chain rattling. |
| `boss_broodmother_roof_skitter.m4a`, `boss_broodmother_roof_skitter_2.m4a` | 2s | mono · loop | important | While on the roof she is invulnerable: a ceiling-height skitter that pans around the room. |
| `boss_broodmother_sac_pulse.m4a`, `boss_broodmother_sac_pulse_2.m4a` | 1s | mono · one-shot | important | An egg sac pulses with warmth: a slow wet heartbeat. 10 s fuse = pulses faster. |
| `boss_broodmother_sac_pop.m4a` … `boss_broodmother_sac_pop_3.m4a` | 0.8s | mono · one-shot | core | You pop an egg sac: a satisfying wet burst, a squeal of unhatched things; costs her 10%: a cry from above. |
| `boss_broodmother_hatch.m4a` … `boss_broodmother_hatch_3.m4a` | 1s | mono · one-shot | important | The sac hatches 3 spiders: a thick split and a scrabble of legs. |
| `boss_broodmother_drop.m4a` | 3s | mono · one-shot | important | She falls from the roof at 60% (or after 45 s): beams crack, a monstrous thud, the lantern swings. |
| `boss_broodmother_web_spit.m4a` … `boss_broodmother_web_spit_3.m4a` | 0.6s | mono · one-shot | important | Venom web spit: a hawk-and-hiss. |
| `boss_broodmother_pounce.m4a` … `boss_broodmother_pounce_3.m4a` | 1s | mono · one-shot | important | Pounce: a leaping click and a heavy body slam. |
| `boss_broodmother_charge.m4a` … `boss_broodmother_charge_3.m4a` | 1s | mono · one-shot | important | Hungry (60%): she charges the nearest minion, then you: a skitter that builds into a stampede; poison pools sizzle behind her. |
| `boss_broodmother_eat.m4a` … `boss_broodmother_eat_3.m4a` | 1.5s | mono · one-shot | important | Mother (25%): she walks to her brood and eats: a wet crunch and snap, heartbreakingly ugly. |
| `boss_broodmother_shriek.m4a`, `boss_broodmother_shriek_2.m4a` | 2s | mono · one-shot | core | Skarn shrieks in fury (<30%): a pained arachnid scream. |
| `boss_broodmother_die.m4a` | 4s | stereo · one-shot | core | Her lantern shatters, the light goes out, and she curls: a huge sigh, a rattle of legs drawn in, the lantern glass falling. |
