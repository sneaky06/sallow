# assets/sound/sfx/skills/ranger/

21 entries · 58 files · core 0 / important 51 / polish 7.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/skills/ranger/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `skill_aimed_shot_cast.m4a` … `skill_aimed_shot_cast_3.m4a` | 0.5s | mono · one-shot | important | Aimed Shot: a slow draw and breath, then a sharp whip-crack release with a tiny glint. |
| `skill_aimed_shot_hit.m4a` … `skill_aimed_shot_hit_3.m4a` | 0.3s | mono · one-shot | important | A precise thunk with a crit "tick" layer. |
| `skill_piercing_cast.m4a` … `skill_piercing_cast_3.m4a` | 0.5s | mono · one-shot | important | Piercing Shot: a rising whistle arrow, thin and bright, with a tail that carries on. |
| `skill_piercing_hit.m4a` … `skill_piercing_hit_3.m4a` | 0.3s | mono · one-shot | important | Arrow punches through: meat-and-air pop; plays per foe pierced, throttled. |
| `skill_poison_arrow_cast.m4a` … `skill_poison_arrow_cast_3.m4a` | 0.5s | mono · one-shot | important | Poison Arrow: bowstring and a wet sizzle as the venom drips off the tip. |
| `skill_poison_arrow_hit.m4a` … `skill_poison_arrow_hit_3.m4a` | 0.5s | mono · one-shot | important | A venom splat and slow hiss; green and bubbly. |
| `skill_snipe_cast.m4a`, `skill_snipe_cast_2.m4a` | 1s | mono · one-shot | important | Snipe: a huge, long draw with a creak, then a rifle-like crack with a long, sparse tail that echoes across the room. |
| `skill_snipe_hit.m4a` … `skill_snipe_hit_3.m4a` | 0.6s | mono · one-shot | important | Distant, heavy impact, a body-drop thump with a crit ring. |
| `skill_multishot_cast.m4a` … `skill_multishot_cast_3.m4a` | 0.5s | mono · one-shot | important | Multishot: a fan of arrows released at once, a rattling flutter of strings. |
| `skill_rain_cast.m4a`, `skill_rain_cast_2.m4a` | 0.8s | mono · one-shot | important | Rain of Arrows launch: a volley arcing up with a rushing flutter. |
| `skill_rain_land.m4a` … `skill_rain_land_4.m4a` | 0.8s | mono · one-shot | important | One of 5 volleys landing: a hail of patter and thunks. Plays ~5 times over 2 s, different pitch each time. |
| `skill_explosive_arrow_cast.m4a` … `skill_explosive_arrow_cast_3.m4a` | 0.5s | mono · one-shot | important | Explosive Arrow: a fuse spit and a hot whoosh. |
| `skill_explosive_arrow_hit.m4a` … `skill_explosive_arrow_hit_3.m4a` | 0.9s | mono · one-shot | important | A fiery pop and rolling blast, shrapnel hiss. |
| `skill_arrow_storm_cast.m4a`, `skill_arrow_storm_cast_2.m4a` | 1.5s | mono · one-shot | important | Arrow Storm: a rapid-fire flurry of up to 14 strings, a ripping zipper of twangs. |
| `skill_arrow_storm_hit.m4a` … `skill_arrow_storm_hit_3.m4a` | 0.3s | mono · one-shot | polish | Short, dense patter of hits when it lands (play one burst, not 14). |
| `skill_trap_set.m4a` … `skill_trap_set_3.m4a` | 0.5s | mono · one-shot | important | Spike Trap / Frost Trap placed: metal parts clicking into place, a spring cocked. |
| `skill_spike_trap_burst.m4a` … `skill_spike_trap_burst_3.m4a` | 0.7s | mono · one-shot | important | Spike Trap springs: a hard snap of metal, spikes bursting up, a slowing scrape. |
| `skill_frost_trap_burst.m4a` … `skill_frost_trap_burst_3.m4a` | 0.8s | mono · one-shot | important | Frost Trap springs: a freezing crack and a cold exhale, ice rapidly forming. |
| `skill_camouflage_on.m4a`, `skill_camouflage_on_2.m4a` | 1s | mono · one-shot | important | Camouflage: leaves and cloth rustle, then a hush that takes the room's air. |
| `skill_camouflage_off.m4a`, `skill_camouflage_off_2.m4a` | 0.6s | mono · one-shot | polish | Cover broken: a soft cloth snap. |
| `perk_trap_arm.m4a`, `perk_trap_arm_2.m4a` | 0.3s | mono · one-shot | polish | Armed trap ready pip (when enemies approach). |
