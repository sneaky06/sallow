# assets/sound/sfx/bosses/echo/

8 entries · 12 files · core 3 / important 8 / polish 1.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `echo_banner.m4a` | 3s | stereo · one-shot | core | The Echo of you is shown (banner): your own heartbeat played back with a ghostly tail, cold and reversed. |
| `echo_rise.m4a` | 2.5s | mono · one-shot | core | It rises from your corpse within 7 tiles: a ghostly inhale, armour rattling, your own voice breath reversed. |
| `echo_idle_loop.m4a` | 3s | stereo · loop | important | While it lies at the corpse: a faint breathing-and-heartbeat loop at the edge of the mix; lure sound. |
| `echo_attack.m4a` … `echo_attack_3.m4a` | 0.5s | mono · one-shot | important | Echo basic attack, played as the player's weapon sound with a ghostly low-pass and a reverb tail. |
| `echo_potion.m4a` | 0.6s | mono · one-shot | polish | Echo drinks a potion: the same drink but hollow (today `potion`). |
| `echo_hurt.m4a` … `echo_hurt_3.m4a` | 0.5s | mono · one-shot | important | Echo is hurt: a hollow, whispery version of your class voice. |
| `echo_die.m4a` | 4s | stereo · one-shot | core | Echo slain: the ghost lets go of your things: a long exhale, a fall of faint bells; the bag stays on the corpse. A cathartic release. |
| `echo_loot.m4a` | 2s | mono · one-shot | important | The Echo's rare drop: a soft shimmer and a coin. |
