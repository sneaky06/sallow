# assets/sound/sfx/monsters/minions/

13 entries · 24 files · core 1 / important 22 / polish 1.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `mon_minion_skeleton_attack.m4a` … `mon_minion_skeleton_attack_3.m4a` | 0.4s | mono · one-shot | important | Your skeleton warrior swings: a lighter, cleaner bone-and-blade (it is YOURS, so it should sound less hostile). |
| `mon_minion_skeleton_die.m4a` … `mon_minion_skeleton_die_3.m4a` | 0.8s | mono · one-shot | important | Your skeleton crumbles. |
| `mon_minion_mage_cast.m4a` … `mon_minion_mage_cast_3.m4a` | 0.5s | mono · one-shot | important | Your skeletal mage's frost shard: a cold chime with a bone clack. |
| `mon_minion_golem_attack.m4a` … `mon_minion_golem_attack_3.m4a` | 0.7s | mono · one-shot | important | Bone Golem heavy swing: a creak and a thump. |
| `mon_minion_golem_die.m4a`, `mon_minion_golem_die_2.m4a` | 1.5s | mono · one-shot | important | The golem collapses into a pile of bones. |
| `mon_scavenger_appear.m4a` | 1.2s | mono · one-shot | important | The Scavenger shows up (announce): a leathery rustle, a sack dragging, an unsettling cheerful whistle with no tune. |
| `mon_scavenger_race.m4a` | 1s | mono · one-shot | important | He spots a rare item and runs for it: a boot patter and a coin-purse jingle at 80% speed (loop-like, quiet). |
| `mon_scavenger_grab.m4a` | 1s | mono · one-shot | core | He grabs the loot first: a snatch, a greedy cackle, a satisfied clink. A loss sound; the player should feel it. |
| `mon_scavenger_flee.m4a` | 1s | mono · loop | polish | He runs away with it for 14 s: a faster jingle patter that fades with distance. |
| `mon_scavenger_caught.m4a` | 1.2s | mono · one-shot | important | You killed him and win it back: a clatter of dropped goods, a short sting. |
| `mon_scavenger_escape.m4a` | 1.5s | mono · one-shot | important | He escapes: a distant cackle and a vanishing jingle, a small defeat. |
| `mon_magpie_squeak.m4a` … `mon_magpie_squeak_3.m4a` | 0.5s | mono · one-shot | important | The Magpie (event thief): a squeaking, chittering goblin that sheds coin as it flees: each 0.15 s of coin drop gets a jingle. |
| `mon_magpie_caught.m4a` | 1.2s | mono · one-shot | important | The thief is caught: a puff of smoke, a shower of coins. |
