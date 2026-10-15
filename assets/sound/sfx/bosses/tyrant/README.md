# assets/sound/sfx/bosses/tyrant/

11 entries · 23 files · core 4 / important 19 / polish 0.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/bosses/tyrant/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `boss_tyrant_alert.m4a` | 3s | mono · one-shot | core | Azgalor rises from his slag throne: molten metal pouring, a bellows-roar, chains. |
| `boss_tyrant_hoard_loop.m4a` | 2s | mono · loop | important | He heals on the fire vein (+2%/s): a greedy furnace hum, white rings pulsing; pulls out of it with a tearing sound. |
| `boss_tyrant_nova.m4a` … `boss_tyrant_nova_3.m4a` | 1s | mono · one-shot | important | Fire Nova slam. |
| `boss_tyrant_leap.m4a` … `boss_tyrant_leap_3.m4a` | 1s | mono · one-shot | important | Infernal Leap: a rocket whoosh and a landing crash. |
| `boss_tyrant_grid_line.m4a` … `boss_tyrant_grid_line_3.m4a` | 0.8s | mono · one-shot | important | Molten phase: a line of fire erupting (rows then columns): a hissing geyser-roar. Plays on each line as it ignites; 4 per set. |
| `boss_tyrant_grid_tele.m4a`, `boss_tyrant_grid_tele_2.m4a` | 1s | mono · one-shot | important | The lines about to ignite: a rising hot crackle. |
| `boss_tyrant_meteor.m4a` … `boss_tyrant_meteor_3.m4a` | 1.4s | mono · one-shot | important | Meteor on the player's spot (phase 3, every second): a whistle with a thump; keep short because it repeats every second. |
| `boss_tyrant_roar.m4a`, `boss_tyrant_roar_2.m4a` | 3s | mono · one-shot | core | The Promise: he roars the names of those who forgot him: a roar with a rhythmic pattern and heat shimmer (no intelligible words). |
| `boss_tyrant_imps.m4a`, `boss_tyrant_imps_2.m4a` | 1.2s | mono · one-shot | important | He calls imps: a gust of cackles and sparks. |
| `boss_tyrant_cinders.m4a`, `boss_tyrant_cinders_2.m4a` | 1s | mono · one-shot | important | Ring of Cinders: a pulse of burning rings. |
| `boss_tyrant_die.m4a` | 4.5s | stereo · one-shot | core | The Tyrant burns out: a roar that fades to a groan, the embers going out one by one, a long cooling tick and hiss. |
