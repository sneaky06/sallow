# assets/sound/sfx/monsters/inferno/

12 entries · 30 files · core 0 / important 25 / polish 5.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/monsters/inferno/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `mon_imp_cackle.m4a` … `mon_imp_cackle_3.m4a` | 0.8s | mono · one-shot | important | Imp: a high, rapid cackle and a fire-pop; a flurry of crackling; one cackle per pack. |
| `mon_imp_flutter.m4a` … `mon_imp_flutter_3.m4a` | 0.5s | mono · one-shot | polish | Imp wingbeats: a flapping-flame whip, fire-hot. |
| `mon_imp_die.m4a` … `mon_imp_die_3.m4a` | 0.6s | mono · one-shot | important | The imp pops in a puff of fire and ash. |
| `mon_fire_imp_spit.m4a` … `mon_fire_imp_spit_3.m4a` | 0.6s | mono · one-shot | important | Ember Imp spits coals: a hawking spit and an ignition. |
| `mon_hellhound_howl.m4a`, `mon_hellhound_howl_2.m4a` | 1.4s | mono · one-shot | important | Hellhound howl: a low, fiery howl, a hot rasp; one per pack. |
| `mon_hellhound_pant.m4a`, `mon_hellhound_pant_2.m4a` | 1s | mono · one-shot | polish | A hot, panting breath while it hunts. |
| `mon_hellhound_leap.m4a`, `mon_hellhound_leap_2.m4a` | 0.6s | mono · one-shot | important | Lunge: a snarl and claws on stone. |
| `mon_magma_brute_stomp.m4a` … `mon_magma_brute_stomp_3.m4a` | 0.8s | mono · one-shot | important | Magma Brute footfall: molten stone cracking and hissing with each heavy step. |
| `mon_magma_brute_alert.m4a`, `mon_magma_brute_alert_2.m4a` | 1.4s | mono · one-shot | important | A furnace roar: a bellows-like rumble with cracking rock. |
| `mon_pyromancer_chant.m4a`, `mon_pyromancer_chant_2.m4a` | 1s | mono · one-shot | important | Cult Pyromancer: a rapid-fire murmur, a fire-lit chant, sparks. It marks the ground before a blast; chant ends at the zone tele start. |
| `mon_demon_warrior_roar.m4a`, `mon_demon_warrior_roar_2.m4a` | 1.2s | mono · one-shot | important | Pit Fiend: a heavy guttural roar with an iron axe drag. |
| `mon_demon_warrior_axe.m4a` … `mon_demon_warrior_axe_3.m4a` | 0.6s | mono · one-shot | important | Pit Fiend axe swing: an iron-chain whoosh. |
