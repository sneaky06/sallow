# assets/sound/music/

45 entries · 45 files · core 24 / important 16 / polish 5.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/music/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `music_title.m4a` | 2:00 | stereo · loop | core · plays today | track `title`. The title screen: slow, haunted, a single warm voice lost in a cold hall; piano low on one note, a muted horn, a bowed saw;… |
| `music_title_ember.m4a` | 2:00 | stereo · loop | polish | Post-finale title screen: the same melody played by a warmer ensemble; hope with a cost. |
| `music_town.m4a` | 2:30 | stereo · loop | core · plays today | track `town` = warmth stage 0: bare, frozen Emberdeep. Wind-bleached strings, a lonely bell, sparse piano, long silences. 52 bpm. D minor.… |
| `music_town_thaw.m4a` | 2:45 | stereo · loop | core | Town warmth 1: the same theme with a hearth: a hand-drum, a low whistle, a warm cello; hope appears. 60 bpm. |
| `music_town_market.m4a` | 3:00 | stereo · loop | core | Town warmth 2: the market opens: fiddle, guitar-like lute, a small chorus humming, a soft frame drum. The town is alive. 72 bpm. |
| `music_town_warm.m4a` | 3:00 | stereo · loop | core | Town warmth 3: the full theme, major resolution within a minor frame; strings, horn, a choir of the whole town; bittersweet because of… |
| `music_inn.m4a` | 2:00 | stereo · loop | important | The Banked Hearth inn: a lively but tired tavern tune: fiddle, bodhran, a mandolin, with foot-stomping; Dory loves it loud. 108 bpm. |
| `music_camp_lamp.m4a` | 2:00 | stereo · loop | important | Lamp Camp: a small, frightened lullaby: a lone fiddle, a wooden flute, a cautiously warm drone. 56 bpm. |
| `music_camp_fever.m4a` | 2:00 | stereo · loop | important | Fever Camp: feverish and uneasy: a hand-pumped harmonium, bowed strings, whispery percussion. 64 bpm. |
| `music_opening.m4a` | 2:30 | stereo · one-shot | important | The opening (one-shot): ash, a hooded man; bleak, slow, ending on a single held note that leads into the town theme; not looped. 48 bpm. |
| `music_finale.m4a` | 3:30 | stereo · one-shot | core | The finale (one-shot): the Ember taken: the town theme in full over a heartbeat, the giant's slow rhythm, rising to a quiet fade; no… |
| `music_crypt.m4a` | 2:45 | stereo · loop | core · plays today | `crypt` (Act I, depths 1-5), track A: sparse and cold; low strings on a held drone, a distant bell, a slow bone-chime ostinato; sounds… |
| `music_crypt_b.m4a` | 3:00 | stereo · loop | important | Crypt B: a processional: slow timpani, a church organ one note at a time, muted trumpet. 72 bpm. |
| `music_crypt_c.m4a` | 2:30 | stereo · loop | important | Crypt C: a quiet, tension-building piece with a sub-bass pulse and a nervous string tremolo; the stalking track. |
| `music_caves.m4a` | 3:00 | stereo · loop | core · plays today | `caves` (Act I, depths 6-10), track A: wet, claustrophobic, rhythmic: a hand-struck frame drum, hollow wooden percussion, a droning… |
| `music_caves_b.m4a` | 2:45 | stereo · loop | important | Caves B: mostly silent, with a slow tick-and-drip percussion and a sustained string note rising and falling. |
| `music_caves_c.m4a` | 3:00 | stereo · loop | important | Caves C: a spider-crawl: pizzicato, quick rattling percussion, tension. |
| `music_inferno.m4a` | 3:00 | stereo · loop | core · plays today | `inferno` (Act II, depths 11-15), track A: heavy, industrial heat: anvil-like percussion, a brass drone, a pounding low drum on every… |
| `music_inferno_b.m4a` | 3:00 | stereo · loop | important | Inferno B: slow and smouldering: a deep taiko and a detuned church bell; heat-haze. |
| `music_inferno_c.m4a` | 2:45 | stereo · loop | important | Inferno C: more urgent: 96 bpm, tin-whistle-free; driving low strings and metal percussion. |
| `music_abyss.m4a` | 3:00 | stereo · loop | core · plays today | `abyss` (Act II end, depths 16-20): vast and strange: glass harmonica, wordless choir clusters, a sub drone; nearly no rhythm, floating.… |
| `music_abyss_b.m4a` | 3:00 | stereo · loop | important | Abyss B: icy bowed vibraphone and a slowly sliding string cluster; sparse. |
| `music_rift.m4a` | 3:00 | stereo · loop | core · plays today | `rift` (Act III, Hellscape, 21-30), track A: wrong and fleshy: detuned strings, ratcheting wooden percussion like ribs, a semitone-clash… |
| `music_rift_b.m4a` | 3:00 | stereo · loop | important | Hellscape B: low brass pushing against a wailing high string; slow-building dread. |
| `music_rift_c.m4a` | 3:00 | stereo · loop | important | Hellscape C: near-silence: a bass heart, whispered breath-percussion. |
| `music_roots.m4a` | 3:00 | stereo · loop | core | The Roots (31+), track A: the endgame: the town theme twisted by the Ember inside you: warm brass buried in cold roots, a pulsing 'hunger'… |
| `music_roots_b.m4a` | 3:00 | stereo · loop | important | Roots B: harsher, root-creak percussion and a ritual choir. |
| `music_pale_end.m4a` | 3:00 | stereo · loop | polish | The Pale End (41+): almost no music: a bare pitch and a slow grey harmony; the lack of sound is the scare. |
| `music_event_tension.m4a` | 1:30 | stereo · loop | core | Event tension layer (gauntlet, keyhunt, collapse, thief): a ticking, urgent 140 bpm layer: pulsing strings, a snare roll, a rising pad.… |
| `music_lockdown.m4a` | 2:00 | stereo · loop | important | Lockdown fight (`room:locked`): rhythmic and trapped: a ritual drum, a slow low brass, rising energy; each wave a bar longer. 100 bpm. |
| `music_pallor.m4a` | 2:00 | stereo · loop | polish | Pallor III/IV overlay: a pale, bright, bad chord layer on top of everything. |
| `music_boss.m4a` | 2:30 | stereo · loop | core · plays today | generic `boss` (also the fallback for any named boss and repeats from depth 35 with a tier): dark ritual war-music: taiko, low brass,… |
| `music_boss_gravelord.m4a` | 2:30 | stereo · loop | core | Morgrath (d5), phase 1-3 in one: a funeral march: tolling bell, slow drums, a church organ, a rising dies-irae-like motif in the low… |
| `music_boss_broodmother.m4a` | 2:30 | stereo · loop | core | Skarn (d10): scraping, skittering: high string tremolo, rattling, a wet low drone, a primal drum for the roof phase; a lantern bell motif.… |
| `music_boss_tyrant.m4a` | 2:45 | stereo · loop | core | Azgalor (d15): industrial fire: anvil strikes, trombone choir, a furnace pulse; a rising theme in the Promise phase. 100 bpm. |
| `music_boss_hollow.m4a` | 3:00 | stereo · loop | core | Xal'thuun (d20): cosmic horror: a vast low drone, glass harmonica, reversed cymbals, a slow sub pulse; the blackout needs a quiet middle… |
| `music_boss_choir.m4a` | 3:00 | stereo · loop | core | The Choir (d25): a rhythm fight: strict 120 bpm in D minor, a steady pulse; the sung notes (`boss_choir_note_*`) must be in the same key… |
| `music_boss_hearthking_swordsman.m4a` | 3:00 | stereo · loop | core | Hearthking phase 1 (to 60%): a tired man in the hearth: a solo cello, a distant horn, a soft snare in march time; dignified, wounded. 80… |
| `music_boss_hearthking_ember.m4a` | 3:00 | stereo · loop | core | Hearthking phase 2 (60%-25%): roots tearing, the Ember pulses: a heartbeat bass drum with a heavy brass response; every pulse of the Ember… |
| `music_boss_hearthking_giant.m4a` | 3:30 | stereo · loop | core | Hearthking phase 3 (25%-0): the giant's body: a colossal slow organic pulse, brass and choir swelling to the inversion; the inward/outward… |
| `music_fallen.m4a` | 2:30 | stereo · loop | core | The Fallen (generic): a sad, violet fight: a solo voice (wordless) and a detuned music box with taut strings; each Fallen was a person. 88… |
| `music_fallen_ivo.m4a` | 2:30 | stereo · loop | important | Ivo Marrow: tender and tragic; includes a bare moment in the Refusal (5 s of near silence with a sustained note). |
| `music_echo.m4a` | 2:30 | stereo · loop | core · plays today | `echo`: your own ghost: a hollow, whispering, reversed-sounding arrangement of a simple four-note theme over a cold choir pad and a… |
| `music_victory.m4a` | 20s | stereo · one-shot | polish | After a boss: a short coda that bridges the stinger into the ambience (optional). |
| `music_death.m4a` | 1:00 | stereo · loop | polish | The death screen bed: a low drone with a faint far-away lullaby. |
