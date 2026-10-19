# assets/sound/sfx/bosses/shared/

17 entries · 40 files · core 9 / important 27 / polish 4.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `boss_banner.m4a` | 3s | stereo · one-shot | core | A boss name banner appears (`ui` story banner): a huge slow bell and a sub drop, a held dissonant chord. 3 s tail. |
| `boss_arena_seal.m4a`, `boss_arena_seal_2.m4a` | 2s | mono · one-shot | core | Boss arena door seals behind you: a massive iron slam, rolling echo, a lock bar dropping. |
| `boss_arena_open.m4a` | 2s | mono · one-shot | important | The exit room opens after the kill: stones grinding apart. |
| `boss_phase.m4a` … `boss_phase_3.m4a` | 1.5s | mono · one-shot | core | Any boss phase threshold (60% / 25% etc.): a booming roar with a hard sub-bass hit; screen-shake sound. |
| `boss_enrage.m4a`, `boss_enrage_2.m4a` | 1.8s | mono · one-shot | core | Enrage phase: a harsher, distorted roar, with tinnitus-like overtones. |
| `boss_telegraph.m4a` … `boss_telegraph_3.m4a` | 0.9s | mono · one-shot | important | A boss move's tele marker (when not a zone): a metallic scrape and charge-up swell, longer than normal enemies. |
| `boss_hit_taken.m4a` … `boss_hit_taken_4.m4a` | 0.4s | mono · one-shot | polish | A heavier, slower layer when a boss is hit (stone/giant): makes each hit feel like it matters. |
| `boss_die_generic.m4a` | 3.5s | mono · one-shot | core | Generic boss death: a drawn, wrenching collapse, a bass rumble and a long reverb tail. |
| `boss_kill_hush.m4a` | 3s | stereo · one-shot | important | After the kill the room goes briefly quiet: a ringing low note settling to silence; ambience fades back in over 3 s. |
| `boss_loot_burst.m4a` | 2s | mono · one-shot | important | The boss's loot explodes out: a multi-coin cascade and a rarity-colour glint. |
| `boss_add_spawn.m4a` … `boss_add_spawn_3.m4a` | 0.7s | mono · one-shot | important | Boss summons adds: a swell of voices and a rumble, bones/eggs hatching, etc. |
| `boss_slam.m4a` … `boss_slam_3.m4a` | 1s | mono · one-shot | important | Generic boss slam: a gigantic thump; used by any boss `slam` kind (Fire Nova, Grave Slam). |
| `boss_charge.m4a` … `boss_charge_3.m4a` | 1s | mono · one-shot | important | Generic boss charge: a run-up of stomps, a crash. Used by Pounce, Founder's lunges. |
| `boss_blink.m4a` … `boss_blink_3.m4a` | 0.8s | mono · one-shot | important | Boss teleport-strike (Grave Step, Infernal Leap, Rift Step): an inward suck, a drop, a heavy thud at arrival. |
| `boss_fan.m4a` … `boss_fan_3.m4a` | 0.8s | mono · one-shot | important | Boss projectile fan: a multi-shot spray. |
| `boss_ring.m4a` … `boss_ring_3.m4a` | 1s | mono · one-shot | important | Boss projectile ring: a radial outward release, ringing. |
| `boss_circles.m4a` … `boss_circles_3.m4a` | 1s | mono · one-shot | important | Boss ground circles detonate: an array of dull booms staggered 0.1 s. |
