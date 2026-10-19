# assets/sound/sfx/monsters/crypt/

10 entries · 25 files · core 0 / important 23 / polish 2.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `mon_skeleton_alert.m4a`, `mon_skeleton_alert_2.m4a` | 0.8s | mono · one-shot | polish | Skeleton wakes: a jaw clack, rusty joints, a sword scrape from its sheath. |
| `mon_skeleton_die.m4a` … `mon_skeleton_die_3.m4a` | 1.3s | mono · one-shot | important | Skeleton collapses: skull rolls, a ribcage drop; bones scatter with a long rattle tail. |
| `mon_skeleton_archer_draw.m4a`, `mon_skeleton_archer_draw_2.m4a` | 0.6s | mono · one-shot | important | Skeleton Archer nocks and draws: dry bowstring creak, an arrow shaft clicking. |
| `mon_grave_rat_chitter.m4a` … `mon_grave_rat_chitter_3.m4a` | 0.8s | mono · one-shot | important | Grave rats appear in a swarm: overlapping squeals and scurrying, loop-friendly; a pack of 5 should not be 5 loud sounds. |
| `mon_grave_rat_die.m4a` … `mon_grave_rat_die_3.m4a` | 0.4s | mono · one-shot | important | A tiny wet squeak and snap. |
| `mon_ghoul_alert.m4a`, `mon_ghoul_alert_2.m4a` | 1.2s | mono · one-shot | important | Ghoul growls: a gurgling, rotten rasp, a lower pitch than the beast set. |
| `mon_ghoul_attack.m4a` … `mon_ghoul_attack_3.m4a` | 0.6s | mono · one-shot | important | Ghoul claw-swipe with a clack of bad teeth. Poison on-hit gets a wet hiss. |
| `mon_bone_mage_chant.m4a`, `mon_bone_mage_chant_2.m4a` | 1s | mono · one-shot | important | Bone Mage prepares a fireball: a muttering of old language, a fire flicker in the voice. No intelligible words. |
| `mon_wraith_alert.m4a`, `mon_wraith_alert_2.m4a` | 1.5s | mono · one-shot | important | Wraith: a cold exhale and a thin moan that drifts through the room; chill air. |
| `mon_wraith_die.m4a` … `mon_wraith_die_3.m4a` | 1.6s | mono · one-shot | important | A long fading wail; a clear tone dropping into a hiss. |
