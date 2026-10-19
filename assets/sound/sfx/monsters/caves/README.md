# assets/sound/sfx/monsters/caves/

13 entries · 35 files · core 3 / important 30 / polish 2.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `mon_goblin_alert.m4a` … `mon_goblin_alert_3.m4a` | 0.7s | mono · one-shot | important | Cave Goblin spots you: a shrill cackle and a cheeky jabber, quick staccato (non-verbal). |
| `mon_goblin_die.m4a` … `mon_goblin_die_3.m4a` | 0.9s | mono · one-shot | important | A goblin's death squeal and crumpling. |
| `mon_goblin_slinger_whirl.m4a`, `mon_goblin_slinger_whirl_2.m4a` | 0.7s | mono · one-shot | important | Slinger whirls the sling: a rotating leather whirr. |
| `mon_cave_spider_skitter.m4a` … `mon_cave_spider_skitter_3.m4a` | 0.8s | mono · one-shot | core | The signature spider: a scurry of eight legs, a click with each footfall. The player must be able to recognise it from off-screen. |
| `mon_cave_spider_hiss.m4a` … `mon_cave_spider_hiss_3.m4a` | 0.5s | mono · one-shot | important | Spider hisses before biting. |
| `mon_cave_bat_screech.m4a` … `mon_cave_bat_screech_3.m4a` | 0.7s | mono · one-shot | important | Bat screech, a high-pitch bat chirp that pans across the mix. |
| `mon_cave_bat_flutter.m4a` … `mon_cave_bat_flutter_3.m4a` | 0.6s | mono · one-shot | important | Leathery wings fluttering, erratic. Plays while bats are within 6 tiles. |
| `mon_troll_alert.m4a`, `mon_troll_alert_2.m4a` | 1.5s | mono · one-shot | important | Cave Troll: a bass grumble and a stone-grinding throat. |
| `mon_troll_stomp.m4a` … `mon_troll_stomp_3.m4a` | 0.8s | mono · one-shot | important | Troll footstep: one big thud with a grit shake. |
| `mon_troll_regen.m4a`, `mon_troll_regen_2.m4a` | 0.7s | mono · one-shot | polish | The troll heals (regen tick): a wet knitting sound. |
| `mon_shaman_chant.m4a`, `mon_shaman_chant_2.m4a` | 1s | mono · one-shot | important | Goblin Shaman calls the storm: a rising sing-song chant and a crackle of static in the voice. |
| `mon_slime_squelch.m4a` … `mon_slime_squelch_3.m4a` | 0.5s | mono · one-shot | important | Slime moves: a thick, bubbling slurp as it slides. |
| `mon_slime_die.m4a` … `mon_slime_die_3.m4a` | 0.9s | mono · one-shot | important | Slime bursts: a big wet splat and slow drip. |
