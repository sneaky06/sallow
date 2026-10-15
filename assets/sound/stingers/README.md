# assets/sound/stingers/

30 entries · 32 files · core 10 / important 16 / polish 6.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/stingers/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `sting_death.m4a` | 4s | stereo · one-shot | core | You die: a low brass chord drops and a bell tolls once, a long exhale; understated, tragic, no triumph. Pairs with `death_fall`,… |
| `sting_death_boss.m4a` | 5s | stereo · one-shot | important | You die during a boss fight (noRetrieve): heavier, with a hollow drum. |
| `sting_revive.m4a` | 3s | stereo · one-shot | important | You wake in town: a warm hearth chord. |
| `sting_corpse_reclaimed.m4a` | 3s | stereo · one-shot | important | You reclaim your corpse run: a lifting resolution. |
| `sting_boss_slain.m4a` | 6s | stereo · one-shot | core | Any act boss falls: a triumphant but weary brass-and-bell sting that resolves into silence: you took something from the dark. The default… |
| `sting_boss_hearthking.m4a` | 8s | stereo · one-shot | core | The Hearthking falls: no triumph: a long hymn for a tired man, the Ember's pulse. |
| `sting_fallen_slain.m4a` | 5s | stereo · one-shot | core | A Fallen laid to rest: a tender violet chord, a lone voice, a bell; a death that finishes a sad story. |
| `sting_relic.m4a` | 4s | stereo · one-shot | core | A relic of the Fallen granted: a warm metallic chord with a vocal sigh. |
| `sting_echo_slain.m4a` | 4s | stereo · one-shot | important | The Echo slain: a quiet "released" chord. |
| `sting_levelup_big.m4a` | 4s | stereo · one-shot | important | Level 10/20/30/40/50/60: a bigger levelup fanfare: brass and bells. |
| `sting_level_cap.m4a` | 6s | stereo · one-shot | polish | Level 60: a full ceremonial ending. |
| `sting_legendary.m4a` | 4s | stereo · one-shot | important | A Legendary Elite drops (the music bed stinger, layered after `loot_legendary`): a golden brass lift; may be skipped if the sound alone is… |
| `sting_mythic.m4a` | 5s | stereo · one-shot | core | A Mythic drops: a massive resolve: choir, brass, fire; a once-a-month sound. |
| `sting_unique.m4a` | 4s | stereo · one-shot | important | A Unique drops: a dark, forbidden chord. |
| `sting_rift.m4a` | 4.5s | stereo · one-shot | important | A Rift-tier item drops: a shimmering pink-tinged dissonance. |
| `sting_act_one_end.m4a` | 6s | stereo · one-shot | core | Act I complete (Mother killed): a chimney smoking; a sung line in the distance; the town's first warmth: warm, quiet, relieved. |
| `sting_act_two_end.m4a` | 6s | stereo · one-shot | core | Act II complete (Hollow Star): the market opens; a warm bell chime; a grey note's ominous coda: "Further". |
| `sting_act_three_end.m4a` | 8s | stereo · one-shot | core | Act III complete (Hearthking): handled by `music_finale` + `finale_ember`; this stinger is the short version if the finale is skipped. |
| `sting_act_enter.m4a` … `sting_act_enter_3.m4a` | 4s | stereo · one-shot | important | Entering a new act's first floor (11 / 21 / 31): a dark horn and a bell; three cuts: Deep, Hellscape, Roots. |
| `sting_main_step.m4a` | 3s | stereo · one-shot | important | A main quest step complete (boss steps and depth steps). |
| `sting_waypoint.m4a` | 3s | stereo · one-shot | important | New waypoint: bright, brass. |
| `sting_grade_s.m4a` | 3s | stereo · one-shot | important | S-grade clear: a golden flourish; layered over `grade_s`. |
| `sting_event_win.m4a` | 3s | stereo · one-shot | polish | Timed event success: a quick triumphant brass. |
| `sting_lockdown_clear.m4a` | 3s | stereo · one-shot | important | Lockdown cleared: relief after the fight. |
| `sting_pallor_unlock.m4a` | 5s | stereo · one-shot | important | The Ember begins to feed (Pallor unlocked). |
| `sting_wager_won.m4a` | 3s | stereo · one-shot | polish | A won wager. |
| `sting_heirs.m4a` | 8s | stereo · one-shot | core | All ten relics combined: Heir of the Fallen: a choir of ten voices together. |
| `sting_collection.m4a` | 4s | stereo · one-shot | polish | Curator tier reached. |
| `sting_class_goal.m4a` | 3s | stereo · one-shot | polish | A class goal complete. |
| `sting_first_clear.m4a` | 3s | stereo · one-shot | polish | First time reaching a new max depth. |
