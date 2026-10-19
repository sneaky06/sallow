# assets/sound/sfx/bosses/gravelord/

11 entries · 24 files · core 5 / important 19 / polish 0.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `boss_gravelord_alert.m4a` | 2.5s | mono · one-shot | core | Morgrath wakes: a ring of tolling funeral bell, a cavernous groan, a crown of bones clinking. |
| `boss_gravelord_sermon.m4a` … `boss_gravelord_sermon_3.m4a` | 0.9s | mono · one-shot | important | Sermon sweep: a slow heavy axe whoomp, a gravelly intake. |
| `boss_gravelord_name.m4a` … `boss_gravelord_name_3.m4a` | 1.4s | mono · one-shot | core | He reads a name and lights a grave: a deep single bell, a breath of whisper, a pulsing ring light: the pulse is a quiet ostinato of ~4 s… |
| `boss_gravelord_grave_rise.m4a` … `boss_gravelord_grave_rise_3.m4a` | 1s | mono · one-shot | important | The grave erupts: a skeleton claws up from the dirt. |
| `boss_gravelord_grave_safe.m4a`, `boss_gravelord_grave_safe_2.m4a` | 0.8s | mono · one-shot | important | You stood on the grave: a soft bell and a hush, the grave "accepts" it. |
| `boss_gravelord_count_loop.m4a` | 3s | stereo · loop | important | The Count (<50%): the ring of names orbits at 4.5 tiles: a slow chant of murmurs, a swirling chorus (no words). |
| `boss_gravelord_named_stack.m4a` … `boss_gravelord_named_stack_3.m4a` | 0.5s | mono · one-shot | important | You gain a Named stack: a cold stamp, the sound of a name written in ink, pitch rising per stack to 10. |
| `boss_gravelord_lunge.m4a` … `boss_gravelord_lunge_3.m4a` | 0.8s | mono · one-shot | important | A Last Rites lunge: three in a row, increasingly heavy; a lunge swoosh, a heavy thump. |
| `boss_gravelord_raise_court.m4a`, `boss_gravelord_raise_court_2.m4a` | 1.8s | mono · one-shot | important | Raise my court!: a deep rumble and a crowd of dead rising. |
| `boss_gravelord_bone_storm.m4a`, `boss_gravelord_bone_storm_2.m4a` | 1.2s | mono · one-shot | important | Ring of bone shards in an enraged spray. |
| `boss_gravelord_die.m4a` | 4s | stereo · one-shot | core | He falls: his crown breaks, a final funeral bell and a long exhale, then the bells go out one by one. |
