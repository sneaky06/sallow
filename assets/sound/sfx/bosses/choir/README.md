# assets/sound/sfx/bosses/choir/

15 entries · 24 files · core 9 / important 12 / polish 3.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/bosses/choir/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `boss_choir_alert.m4a` | 4s | stereo · one-shot | core | The Choir wakes: a vast wordless chord of swallowed voices, a pillar of mouths opening one at a time; each a breath. |
| `boss_choir_note_low.m4a` | 1.2s | mono · one-shot | core | The Hymn ring at 2.5 tiles: a low sung note, safe (pale) variant and harmful (red) variant share the pitch but the harmful one has a harsh… |
| `boss_choir_note_mid.m4a` | 1.2s | mono · one-shot | core | The ring at 4.5 tiles: the mid note (A2/D3). |
| `boss_choir_note_high.m4a` | 1.2s | mono · one-shot | core | The ring at 6.5 tiles: the high note (F3/A3). |
| `boss_choir_harm.m4a` … `boss_choir_harm_3.m4a` | 0.8s | mono · one-shot | important | A harmful ring lands: a tearing dissonance, voice flayed. |
| `boss_choir_safe.m4a`, `boss_choir_safe_2.m4a` | 0.8s | mono · one-shot | important | A safe ring passes harmlessly: a soft consonant chime, a reward. |
| `boss_choir_wrong.m4a` | 3s | mono · loop | core | Discord (50%): the wrong-note singer pulses with a sour out-of-key tone, circling; the two true singers hold the right note. Players… |
| `boss_choir_wrong_move.m4a`, `boss_choir_wrong_move_2.m4a` | 0.6s | mono · one-shot | important | The wrong note jumps to another singer: a slide and a click. |
| `boss_choir_singer_hurt.m4a` … `boss_choir_singer_hurt_3.m4a` | 0.5s | mono · one-shot | important | Damage to the wrong singer: a flat, pitched crack. |
| `boss_choir_singer_immune.m4a`, `boss_choir_singer_immune_2.m4a` | 0.4s | mono · one-shot | important | You hit a true singer: a "no" tone, a ringing deflection. |
| `boss_choir_inhale.m4a` | 1.5s | mono · one-shot | core | Last Verse: a 1.5 s inhale: a huge rising breath of thousands. Hit it to silence it. Ends at the instant the blast would fire. |
| `boss_choir_silenced.m4a` | 1.5s | mono · one-shot | core | You interrupt the inhale: the sound cuts off dead, a hard break, then 3 s of silence (the engine mutes the music bed 3 s). |
| `boss_choir_blast.m4a` | 1.5s | mono · one-shot | core | Uninterrupted inhale: a 5.5-tile stunning blast: a gigantic chord that hits like a wall; a ringing in the ears (low-pass duck). |
| `boss_choir_note_tick.m4a` … `boss_choir_note_tick_3.m4a` | 0.4s | mono · one-shot | polish | The last verse's notes at 1.0 s intervals use a faster plucked variant. |
| `boss_choir_die.m4a` | 6s | stereo · one-shot | core | The pillar collapses: its mouths close one by one into silence, a final single human note holds and stops: the voice of the one swallowed… |
