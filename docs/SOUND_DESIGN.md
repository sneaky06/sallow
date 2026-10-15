# Sallow — sound design guide and catalog

Production guide for **every sound and every music track** in the game, for the lead dev to produce from. Dialogue and
voiced lines are **excluded** (they come with the story rewrite); non-verbal creature and player vocalisations (grunts, screams, growls,
breath) are included. Written against the code as of R17 (2026-10-15). Facts are from `src/` and `docs/DESIGN.md`; where the code and
this guide differ, the code is what the game does today and this guide is what it should do.

**What is in the box.** 1068 sound entries = **2306 files** once variations are counted (650 core, 1275 important, 381 polish),
about **176 minutes** of audio and roughly **124 MB** encoded. Of the entries, **43** are names the game already plays today
(synthesised by `src/engine/audio.js`: 25 sfx, 9 beds, 9 music tracks); **1025** are new and need engine wiring (last section).
Sections are ordered the way the game is played; the last sections hold the totals and a production order.

Folder tree to drop files into: `assets/sound/` (see [Folder tree](#folder-tree)); every folder has a `README.md` listing the files that belong in it.

## Contents
1. [Reading this guide](#1-reading-this-guide) · 2. [Technical specification](#2-global-technical-specification) · 3. [Naming, folders and variations](#3-naming-folders-and-variations)
4. [Catalog](#4-catalog): Player · Weapons and skills · Monsters · Bosses and Fallen · Loot and items · World and props · Events and systems · UI · Ambience beds · Music · Stingers
5. [Totals](#5-totals) · 6. [Suggested production order](#6-suggested-production-order) · 7. [For the engine team](#7-for-the-engine-team) · 8. [Open questions](#8-open-questions)

## 1. Reading this guide

- **Priority.** `core` = the game feels broken or silent without it, do first. `important` = a clear improvement the player will notice. `polish` = nice, can ship without.
- **Today.** `✔ plays today` = the name is already played by the game (as a synthesised sound). Anything else is new and needs the engine team to wire it (section 7) — until it is wired
  and the file exists, nothing changes. The existing 25 effect names stay as the generic fallbacks forever.
- **Vars** = number of variations, each a separate file: `name.m4a`, `name_2.m4a`, `name_3.m4a`… The loader already picks one at random.
- **Length** is a ceiling for each file (trim tails, never pad). **Fmt** = channels and loop mode. A loop **must** loop seamlessly (section 2).
- **Descriptions** say how the sound should feel in this world: grim, cold, brutal, dry; warm only where warmth is the story (the hearth, the Ember). They are direction, not a recipe. `SOUND_LIST.md` (auto-generated, 43 files) is superseded by this guide.
- What matters most, in order: *loot* (the best sounds in the game), *combat feel* (hits, crits, Close Call), *the world being hostile* (monsters, ambience), *the UI staying out of the way*, then *music*.
  Rarity is communicated first by sound: the player should know "legendary" from across the room with the screen off.

## 2. Global technical specification

| Item | Spec |
|---|---|
| **Container / codec** | `.m4a` (AAC-LC) for everything. AAC decodes natively in iOS Safari (`decodeAudioData` and `<audio>`); MP3 also works but loops with a gap. Do not use `.wav`/`.ogg` (size / no iOS support). One format everywhere keeps `assets/assets.js` simple. |
| **Sample rate** | Master at 48 kHz (the iPhone hardware rate) and 24-bit. Export 48 kHz so Safari never resamples. Never mix 44.1 and 48 in the project. |
| **Channels** | **SFX: mono** (the engine can pan and attenuate by distance later; mono also halves RAM). **Stereo:** music, stingers, ambience beds, and the few big "world" one-shots flagged `stereo` in the tables (boss deaths, drops of the highest tiers, finale). Ambience *one-shots* are mono. |
| **Bitrate** | SFX mono 96 kbps (about 12 KB/s). Stereo (beds, stingers, music) 96 kbps (also about 12 KB/s). Title, Town warmth 3, the Hearthking tracks and the finale may go to 128 kbps (adds ~5 MB in total). Do not go below 64 kbps mono: AAC smears transients (hits and clicks) at low rates. |
| **Loudness (integrated)** | Music **−16 LUFS** (every track, so the volume slider means the same everywhere; boss tracks may sit at −15). Ambience beds **−28 LUFS** (they are under everything). Stingers −18 LUFS short-term. SFX are normalised by *peak* and *reference class*, below. |
| **True peak** | ≤ −1.0 dBTP on everything (AAC overshoots; leave 1 dB). No clipping, ever. |
| **SFX levels (relative)** | Reference 0 dB = a normal weapon hit peak at −3 dBFS. Footsteps −18 dB, UI click −14 dB, gold/pickups −10 dB, monster voices −6 dB, skill casts −4 dB, boss moves −2 dB, drops by rarity: common −10, rare −5, legendary −2, mythic/unique/rift 0 dB. The engine master gain (0.42) and the `sfxVolume`/`ambienceVolume`/`musicVolume` sliders apply on top, so keep headroom and do not pre-compress to loudness. |
| **Dynamics / EQ** | Leave 3–4 dB of headroom between the loudest sound (boss deaths, Meteor, finale) and a normal hit. Roll off everything below 40 Hz (phone speakers) and keep the important energy at 200 Hz–4 kHz; phone speakers and earbuds are the target. Test on an iPhone speaker, not studio monitors. |
| **Max lengths** | UI 0.1–0.4 s; footsteps ≤ 0.35 s; hits 0.2–0.5 s; casts ≤ 0.9 s; monster vocals ≤ 1.5 s; drops 0.5 s (common) to 3.5 s (mythic/rift); boss/Fallen moves ≤ 1.5 s; stingers 3–8 s; the finale ≤ 10 s. Tails (reverb) count towards the cap: print short tails and let the engine do any space. |
| **Layering** | The engine plays several sounds at once (cap: 7 sfx per 120 ms; identical names throttle at 50 ms). So: *short, dry, readable*. Put the reverb into the ambience, not into every sfx. Deliver **dry** sounds with at most 0.3 s of tail. Boss and loot sounds may be wet. |
| **Silence at both ends** | Start the waveform within 5 ms of the file start (no leading silence: lag matters). End on a fade-out ≥ 10 ms or a natural decay below −60 dB. AAC adds a short encoder delay; Safari normally trims it from .m4a, but check one file by ear (a click or late start) before exporting the lot. |
| **Variations** | See section 3. Variations of one sound must be *similar in level, length and character* (pitch within ±3 semitones) so any one can play in any place; they should be recorded as separate performances, not pitch-shifted copies (the engine can add a small random pitch itself). |
| **Seamless loops** | (1) Make the loop length an exact multiple of the bar for music; for beds use 30 s. (2) Cross-fade the tail into the head *inside the file* (equal-power, 1.5–3 s overlap): the last 2 s fade out while the first 2 s of the file, repeated, fade in, then trim so the join is the middle of the overlap. (3) Start and end at a zero crossing and at the same phase of any LFO or pulse. (4) Nothing identifiable (a bird, a single clang) should happen once per loop: beds are *texture*, and events go in the `amb_ev_*` one-shots. (5) Render with the reverb tail wrapped (pre-roll the reverb, or render two loops and cut the second). (6) Test by looping the exported .m4a in Safari for 5 minutes, not in your DAW: AAC priming can add a click. |
| **Music loops** | Provide the file as the loop only (no separate intro) unless a row says one-shot. Where a track has an intro, make it part of the first pass but make the *whole* file loop acceptably (a musical rest at the join). Tempo markings (bpm) are fixed: bosses with rhythmic mechanics (the Choir at 120 bpm, the Hearthking pulses) depend on it. |
| **Delivery** | One .m4a per file at the exact name in the table. Keep the project sources (DAW sessions, stems, unmastered 48 kHz/24-bit WAVs) outside the repo (they are large and not shipped); only the .m4a goes in `assets/sound/`. |
| **Size budget** | About **124 MB** for everything as specified, of which music is 82 MB. `sw.js` is cache-first and precaches the listed assets, and Safari may evict a PWA's storage under pressure: **do not precache music** (cache each track on first play, runtime cache) and consider per-act banks (section 7). |
| **Memory budget** | SFX are decoded to float32 at 48 kHz (`decodeAudioData`), about 190 KB per second of mono audio: the full sfx set decodes to roughly 374 MB in RAM, too much for older iPhones (the **core-priority** sfx alone are 147 MB, the right size for the always-loaded bank). The engine team should decode lazily by bank (core at boot, each act's monsters on entering the act): the *priority* and *folder* columns are the bank definitions (section 7). Beds are 30 s × stereo × 48 kHz = 11 MB each decoded, so only the current bed and the incoming one may be in memory; music is streamed. |
| **Loudness check** | Run the final export through a loudness meter (ffmpeg `loudnorm` in measure mode or any LUFS meter): music files report −16 ± 1 LUFS, beds −28 ± 2 LUFS, true peak ≤ −1. SFX are judged by ear against the reference table. |

### Why these numbers
- **Mono SFX** halve memory and bandwidth and allow positional audio (pan by screen position, volume by distance) later; stereo SFX would fight that. Only sounds that are *the* world, not *in* the world, are stereo.
- **AAC .m4a at 48 kHz** is the one format iOS decodes without resampling or a second codec; the loader already accepts `.mp3|.m4a`. The existing `SOUND_LIST.md` said `mp3`; use `.m4a` — beds and music loop with fewer gaps, and the files are about 30% smaller at the same quality.
- **−16 LUFS music, −28 LUFS beds** puts music at conversation level on a phone speaker and leaves the beds as a bed; the SFX sit between and on top. The existing synth beds run at 0.11 gain, music at 0.8 × the music slider; the loudness spec above is calibrated so the defaults sound right with those engine values.
- **Variation counts** (section 3) follow how often a sound plays.

## 3. Naming, folders and variations

**Names.** Lowercase snake_case, ASCII only, `<domain>_<subject>_<event>` with the existing prefixes `amb_` (looping beds), `music_` (streamed tracks), `sting_` (stingers).
No spaces, no uppercase, no trailing `_<digit>` except as a variation suffix: variation 1 is `name.m4a`, then `name_2.m4a`, `name_3.m4a`… The loader parses a trailing `_<number>` as a variation; that is why counters in names use words
(`flow_chain_three`, `milestone_tier_five`). **Every name must be globally unique across all folders** (the loader keys on the file name, not the path: the folder is for humans).

| Prefix | Meaning | Folder |
|---|---|---|
| `step_*`, `gear_*`, `dash_*`, `vo_<class>_*`, `taken_*`, `status_*`, `potion*`, `death_*` | Player | `sfx/player` |
| `wpn_*`, `hitmat_*`, `crit_*`, `arrow*`, `fx_*` | Weapons, impacts | `sfx/weapons` |
| `skill_*` | Skills (cast / travel / hit / loop / end), by class | `sfx/skills/<class>` and `sfx/skills/shared` |
| `mon_*`, `proj_*`, `zone_*`, `mod_*`, `alert_*` | Monsters, enemy projectiles, telegraphs, modifiers | `sfx/monsters/<group>` |
| `boss_*`, `fallen_*`, `echo_*`, `rift_core_*` | Bosses, Fallen, Echo | `sfx/bosses/<boss>` |
| `drop_*`, `pickup_*`, `gold_*`, `gem_*`, `mat_*`, `equip_*`, `forge_*` … | Loot and items | `sfx/loot` |
| `chest_*`, `door_*`, `gate_*`, `portal_*`, `shrine_*` … | World and props | `sfx/world` |
| `close_call`, `flow_*`, `heat_*`, `perk_*`, `event_*`, `grade_*`, `pallor_*`, `town_warmed_*`, `npc_*`, `quest*` | Systems | `sfx/systems` |
| `ui_*`, `click`, `error*`, `toast_*`, `skill_learn*`, `menu_*`, `hud_*` | UI | `ui` |
| `amb_*` | Looping beds and ambience one-shots | `ambience` |
| `music_*` | Music | `music` |
| `sting_*` | Stingers | `stingers` |

**Variation counts, and why.** A sound the player hears many times a minute needs enough variations that no pair is obvious: **4–6** for footsteps, swings, hits, clicks, drips. Voices that fire on every strike (monster hurt/attack) get **3–4**.
Sounds heard a few times per floor (skills, doors, chests, drops of normal tiers, shrines) get **2–3**. One-time or truly rare moments (boss deaths, drops of Mythic/Unique/Rift,
the finale, stingers, music, beds) get **1** — a single perfect take; repeating is fine because it is rare, and the effort is better spent elsewhere. The engine also adds ±4% random pitch, so three good variations feel like eight.
Never produce variations of a loop; for beds, loop-length variety comes from `amb_ev_*` one-shots.

**Class and weapon expansion.** Six more classes are planned (docs/ROADMAP.md). Voices (`vo_<class>_*`), class actions (`dash_*`) and skill folders (`sfx/skills/<class>`) are per class; each new class adds
about 16 voice files, 3–5 dash files and ~2.5 files per active skill. Weapon sets are per weapon *type* (`wpn_<type>_*`), so a new weapon type adds 2 rows.

### Folder tree

```
assets/sound/
├── ambience/   (143 files)
├── music/   (45 files)
├── sfx/
│   ├── bosses/
│   │   ├── broodmother/   (27 files)
│   │   ├── choir/   (24 files)
│   │   ├── echo/   (12 files)
│   │   ├── fallen/   (95 files)
│   │   ├── gravelord/   (24 files)
│   │   ├── hearthking/   (29 files)
│   │   ├── hollow/   (23 files)
│   │   ├── shared/   (40 files)
│   │   └── tyrant/   (23 files)
│   ├── loot/   (254 files)
│   ├── monsters/
│   │   ├── abyss/   (35 files)
│   │   ├── caves/   (35 files)
│   │   ├── crypt/   (25 files)
│   │   ├── inferno/   (30 files)
│   │   ├── minions/   (24 files)
│   │   └── shared/   (324 files)
│   ├── player/   (266 files)
│   ├── skills/
│   │   ├── necromancer/   (55 files)
│   │   ├── ranger/   (58 files)
│   │   ├── shared/   (22 files)
│   │   ├── sorcerer/   (67 files)
│   │   └── warrior/   (57 files)
│   ├── systems/   (146 files)
│   ├── weapons/   (145 files)
│   └── world/   (105 files)
├── stingers/   (32 files)
└── ui/   (141 files)
```

Each folder carries a `README.md` listing the files that belong in it; `assets/sound/README.md` is the index. **The current loader (`audio.js addFile`) only accepts `sound/<name>.<ext>` with no sub-folder; see section 7 (item 1): this tree needs a one-line regex change before files can live in sub-folders.**

## 4. Catalog

Columns: **File** (add `.m4a`; variations `_2`, `_3`…) · **Vars** · **Length** (max per file) · **Fmt** · **Prio** · **Today** · **Description**.

### 4.1 Player

*100 entries · 266 files · core 95 / important 125 / polish 46 · ≈ 1.7 MB encoded*

#### Footsteps by surface

`assets/sound/sfx/player/` · 15 entries · 65 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `step_stone` | 5 | 0.25s | mono · one-shot | core |  | Bare-soled leather boot on cold flagstone: dry tap, tiny grit scrape, a little crypt-tail. The most-heard sound in the game; keep it quiet and un-musical. |
| `step_dirt` | 5 | 0.25s | mono · one-shot | core |  | Soft thud on packed earth with a crumb of gravel. Caves, cellars, camps. |
| `step_cobble` | 5 | 0.25s | mono · one-shot | core |  | Town cobbles and the dirt PATH tile: harder tap, slight ring, a stone chip skittering. |
| `step_grass` | 4 | 0.25s | mono · one-shot | important |  | Town grass and bushes: wet-ish brush and flatten, no crunch (the grass is half dead). |
| `step_wood` | 5 | 0.25s | mono · one-shot | core |  | Hollow plank step with a creak on every other variation: bridges, door thresholds, the inn floor, stalls. |
| `step_water` | 5 | 0.35s | mono · one-shot | core |  | Shallow WATER tile (slowed to 60%): a heavy, resisting slosh, ankle-deep, cold. Slightly longer than other steps. |
| `step_lava` | 4 | 0.35s | mono · one-shot | core |  | Shallow LAVA tile (burns 4%/s): a tacky, hissing squelch, a spit of steam. Sounds like a mistake. |
| `step_rubble` | 4 | 0.25s | mono · one-shot | important |  | RUBBLE and collapsed floor: loose stones shifting, a heavier crunch, a rolling pebble tail. |
| `step_bone` | 4 | 0.25s | mono · one-shot | important |  | Ossuary and bone gardens: brittle crack and rattle, small bones snapping underfoot. Never gentle. |
| `step_ash` | 4 | 0.25s | mono · one-shot | important |  | Inferno ash wastes and cinder floors: a muffled dusty whump, no ring at all, a faint ember tick. |
| `step_metal` | 4 | 0.25s | mono · one-shot | important |  | Forgeworks grating and iron floors: hollow clank with a dull ring. |
| `step_glass` | 4 | 0.25s | mono · one-shot | polish |  | Abyss glasswork and shard floors: thin crystalline tick, a faint high ring that decays fast. |
| `step_snow` | 4 | 0.25s | mono · one-shot | polish |  | Frost on town roofs-and-streets at warmth 0 and the Pale End: dry squeak and crunch. |
| `step_flesh` | 5 | 0.3s | mono · one-shot | important |  | Hellscape taint floor: a wet, giving slap, sinew stretching, a tiny sucking release. The player should feel the floor is alive. |
| `step_stairs` | 3 | 0.9s | mono · one-shot | core |  | Four quick steps up or down a stair run (used on stair travel; today the synth `stairs`). Stone, a little echo. |

#### Armour-weight overlays (layered under every step)

`assets/sound/sfx/player/` · 4 entries · 13 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `gear_step_cloth` | 3 | 0.3s | mono · one-shot | important |  | Robes: a swish of heavy cloth and the faint knock of a belt pouch. Almost silent. |
| `gear_step_light` | 4 | 0.3s | mono · one-shot | important |  | Leather: creak of straps, a buckle chinks, soft cloth on hide. |
| `gear_step_heavy` | 4 | 0.35s | mono · one-shot | important |  | Plate and mail: a loud metallic clank-and-rattle, plates sliding on plates. Should make a sneaky ranger sound different from a tank. |
| `gear_land_heavy` | 2 | 0.5s | mono · one-shot | polish |  | A heavy-armoured landing after a leap or dash: a deeper clatter than a step. |

#### Dash, class action and landings

`assets/sound/sfx/player/` · 16 entries · 39 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `dash_charge` | 3 | 0.5s | mono · one-shot | core |  | Warrior Shoulder Charge: armoured grunt-less lunge, plate crash and a short gravel skid, rising shove whoosh. Heavy, physical, no magic. |
| `dash_charge_hit` | 3 | 0.5s | mono · one-shot | important |  | Shoulder Charge connecting: a body-on-body thud with a bone crunch and a shield rattle. Plays once per foe struck. |
| `dash_roll` | 3 | 0.4s | mono · one-shot | core |  | Ranger Dash: a tumbling roll, cloth and leather, a gravel scuff, a clipped exhale. |
| `dash_gravestep` | 3 | 0.5s | mono · one-shot | core |  | Necromancer Grave Step: a papery whisper, cold draft, a faint bone clack as the body slips through the dark. |
| `blink_out` | 3 | 0.4s | mono · one-shot | core |  | Sorcerer Blink, departure: a sharp inward suck of air and a glassy zip, the air folding shut. |
| `blink_in` | 3 | 0.4s | mono · one-shot | core |  | Sorcerer Blink, arrival: the matching soft pop and a shimmer tail. Same family as `blink_out`, brighter. |
| `dash_pip` | 2 | 0.3s | mono · one-shot | important |  | A charge recovers: a small, satisfying mechanical tick with a warm ring (like a flint catching). Quiet enough to hear 20 times a floor. |
| `dash_denied` | 1 | 0.2s | mono · one-shot | important |  | No charge left: a dull thunk, not the full error buzz. |
| `dash_groundslam` | 2 | 0.9s | mono · one-shot | polish |  | Ground Slam augment: the dash ends in a stomp, a low boom with cracking stone. |
| `dash_rimestep` | 2 | 0.8s | mono · one-shot | polish |  | Rime Step augment: a frost ring blooms where the sorcerer stood: glassy crackle and cold air. |
| `dash_graveswap` | 2 | 0.8s | mono · one-shot | polish |  | Grave Swap augment: you and a minion trade places, a double whisper, two quick pops. |
| `dash_tumbleshot` | 2 | 0.4s | mono · one-shot | polish |  | Tumble Shot augment: a quick bow twang mid-roll, layered over the roll. |
| `dash_brawler` | 2 | 0.5s | mono · one-shot | polish |  | Perk Brawler's Roll: a sweeping strike at the end of a dash, a snap whoosh with a metal tail. |
| `land_soft` | 3 | 0.35s | mono · one-shot | important |  | Ending a short leap or the roll: a clean thump, a little dust. |
| `land_heavy` | 3 | 0.7s | mono · one-shot | important |  | Warrior Leap landing and the Ground Slam finale: a body-weight crunch and gravel spray. (The area impact itself is `skill_leap_land`.) |
| `leap_gap_cross` | 2 | 0.8s | mono · one-shot | important |  | Crossing a 2-tile chasm gap with a dash (The Leap landmark): a whistle of wind from below, then a landing with an echo that falls away. Reward moment for good play. |

#### Voice: non-verbal vocalisations per class

`assets/sound/sfx/player/` · 28 entries · 68 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `vo_warrior_hurt` | 4 | 0.4s | mono · one-shot | core |  | Warrior takes a hit. Voice: deep, chesty, gritty; a man or woman who has taken a lot of punches already. Short, 0.25-0.4 s, no reverb. |
| `vo_warrior_hurt_big` | 2 | 0.7s | mono · one-shot | important |  | Warrior takes a heavy hit (>8% life): a longer, rougher cry of pain, a gasp at the end. |
| `vo_warrior_die` | 2 | 1.6s | mono · one-shot | core |  | Warrior dies: a final cry that cuts to a wet exhale and silence. Plays under the death stinger. Keep it sad, not heroic. |
| `vo_warrior_effort` | 5 | 0.3s | mono · one-shot | important |  | Warrior swing or cast effort grunt, a short exhale on the strike. Plays on every 2nd-3rd attack only so it does not nag. |
| `vo_warrior_dash` | 2 | 0.3s | mono · one-shot | important |  | Warrior dash effort: a clipped breath or one-syllable grunt. |
| `vo_warrior_revive` | 1 | 1.2s | mono · one-shot | important |  | Warrior coming back after death: a ragged first gasp for air, then slow breathing. |
| `vo_warrior_lowlife` | 1 | 2s | stereo · loop | polish |  | Warrior laboured breathing loop, played at the edge of the mix when below 25% life, with an irregular heartbeat under it. One loop, no vocal words. |
| `vo_ranger_hurt` | 4 | 0.4s | mono · one-shot | core |  | Ranger takes a hit. Voice: lean, breathy, fast; short sharp intakes, never a roar. Short, 0.25-0.4 s, no reverb. |
| `vo_ranger_hurt_big` | 2 | 0.7s | mono · one-shot | important |  | Ranger takes a heavy hit (>8% life): a longer, rougher cry of pain, a gasp at the end. |
| `vo_ranger_die` | 2 | 1.6s | mono · one-shot | core |  | Ranger dies: a final cry that cuts to a wet exhale and silence. Plays under the death stinger. Keep it sad, not heroic. |
| `vo_ranger_effort` | 5 | 0.3s | mono · one-shot | important |  | Ranger swing or cast effort grunt, a short exhale on the strike. Plays on every 2nd-3rd attack only so it does not nag. |
| `vo_ranger_dash` | 2 | 0.3s | mono · one-shot | important |  | Ranger dash effort: a clipped breath or one-syllable grunt. |
| `vo_ranger_revive` | 1 | 1.2s | mono · one-shot | important |  | Ranger coming back after death: a ragged first gasp for air, then slow breathing. |
| `vo_ranger_lowlife` | 1 | 2s | stereo · loop | polish |  | Ranger laboured breathing loop, played at the edge of the mix when below 25% life, with an irregular heartbeat under it. One loop, no vocal words. |
| `vo_sorcerer_hurt` | 4 | 0.4s | mono · one-shot | core |  | Sorcerer takes a hit. Voice: strained, dry, nervous; air through the teeth, a cracked cry. Short, 0.25-0.4 s, no reverb. |
| `vo_sorcerer_hurt_big` | 2 | 0.7s | mono · one-shot | important |  | Sorcerer takes a heavy hit (>8% life): a longer, rougher cry of pain, a gasp at the end. |
| `vo_sorcerer_die` | 2 | 1.6s | mono · one-shot | core |  | Sorcerer dies: a final cry that cuts to a wet exhale and silence. Plays under the death stinger. Keep it sad, not heroic. |
| `vo_sorcerer_effort` | 5 | 0.3s | mono · one-shot | important |  | Sorcerer swing or cast effort grunt, a short exhale on the strike. Plays on every 2nd-3rd attack only so it does not nag. |
| `vo_sorcerer_dash` | 2 | 0.3s | mono · one-shot | important |  | Sorcerer dash effort: a clipped breath or one-syllable grunt. |
| `vo_sorcerer_revive` | 1 | 1.2s | mono · one-shot | important |  | Sorcerer coming back after death: a ragged first gasp for air, then slow breathing. |
| `vo_sorcerer_lowlife` | 1 | 2s | stereo · loop | polish |  | Sorcerer laboured breathing loop, played at the edge of the mix when below 25% life, with an irregular heartbeat under it. One loop, no vocal words. |
| `vo_necromancer_hurt` | 4 | 0.4s | mono · one-shot | core |  | Necromancer takes a hit. Voice: low, rasping, almost a whisper; unbothered until it is not. Short, 0.25-0.4 s, no reverb. |
| `vo_necromancer_hurt_big` | 2 | 0.7s | mono · one-shot | important |  | Necromancer takes a heavy hit (>8% life): a longer, rougher cry of pain, a gasp at the end. |
| `vo_necromancer_die` | 2 | 1.6s | mono · one-shot | core |  | Necromancer dies: a final cry that cuts to a wet exhale and silence. Plays under the death stinger. Keep it sad, not heroic. |
| `vo_necromancer_effort` | 5 | 0.3s | mono · one-shot | important |  | Necromancer swing or cast effort grunt, a short exhale on the strike. Plays on every 2nd-3rd attack only so it does not nag. |
| `vo_necromancer_dash` | 2 | 0.3s | mono · one-shot | important |  | Necromancer dash effort: a clipped breath or one-syllable grunt. |
| `vo_necromancer_revive` | 1 | 1.2s | mono · one-shot | important |  | Necromancer coming back after death: a ragged first gasp for air, then slow breathing. |
| `vo_necromancer_lowlife` | 1 | 2s | stereo · loop | polish |  | Necromancer laboured breathing loop, played at the edge of the mix when below 25% life, with an irregular heartbeat under it. One loop, no vocal words. |

#### Damage taken, defence, status effects

`assets/sound/sfx/player/` · 21 entries · 53 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `taken_melee` | 4 | 0.3s | mono · one-shot | core |  | A monster blow lands on the player: dull body thud with cloth/armour shuffle. Layered with the vocal. Not the monster's own sound. |
| `taken_projectile` | 4 | 0.3s | mono · one-shot | core |  | An arrow, bolt or spit lands on the player: sharper, more of a thwack/zap than a thud. |
| `taken_magic` | 3 | 0.5s | mono · one-shot | important |  | A caster blast or fire/cold zone detonates on the player: a swelling whump with a tail that matches the element only slightly (the element tail is a status sound). |
| `taken_armor` | 3 | 0.3s | mono · one-shot | important |  | A hit that armour mostly absorbs (damage < 2% life): a clean metallic glance, no vocal. |
| `block_shield` | 3 | 0.4s | mono · one-shot | important |  | Block roll succeeds: wood and iron, a hard thump with a rattle. |
| `dodge_whoosh` | 3 | 0.3s | mono · one-shot | important |  | Dodge roll succeeds: a hushed whoosh of air past the ear, a flicker of cloth. |
| `thorns_reflect` | 3 | 0.25s | mono · one-shot | polish |  | Thorns damage returned: a sharp wet prick, like a thorn driven into skin. |
| `lifesteal_pulse` | 3 | 0.3s | mono · one-shot | polish |  | Life steal heals: a warm, soft red swell, a swallowed gulp; quiet, many per minute. |
| `manasteal_pulse` | 3 | 0.3s | mono · one-shot | polish |  | Mana steal: a cool blue chime swell. |
| `status_burn` | 2 | 0.8s | mono · one-shot | important |  | Player ignites: a flame whump and an ongoing crackle tail. |
| `status_chill` | 2 | 0.6s | mono · one-shot | important |  | Player chilled: a crisp frost crackle and a shiver of breath. |
| `status_freeze` | 2 | 0.7s | mono · one-shot | important |  | Player frozen solid: an ice-lock crack, the body seizing. |
| `status_freeze_off` | 2 | 0.6s | mono · one-shot | polish |  | Ice breaks off the player. |
| `status_shock` | 2 | 0.5s | mono · one-shot | important |  | Player shocked: a nasty zap with a muscular twitch. |
| `status_poison` | 2 | 0.7s | mono · one-shot | important |  | Poisoned: a wet hiss and a sick, bubbling gulp; quiet. Also a soft tick for every poison damage tick (reuse a short 0.15 s cut of it). |
| `status_bleed` | 2 | 0.5s | mono · one-shot | polish |  | Bleeding: a slow drip-and-ooze. |
| `status_stun` | 2 | 0.8s | mono · one-shot | important |  | Player stunned: a bell-in-the-head ring, a low-pass dip that returns in 0.8 s (engine can duck the mix too). |
| `status_slow` | 2 | 0.6s | mono · one-shot | polish |  | Player slowed: a dragging, sticky squelch of reality. |
| `status_bleach` | 2 | 1.2s | mono · one-shot | important |  | Pallid hit bleaches the player (no regen, half healing): a drained whine, colours going grey. |
| `status_rooted` | 2 | 0.6s | mono · one-shot | important |  | Root / lock (Foreclosure, Jailer): chains or roots grip: a tight clamp and creak. |
| `status_cleanse` | 2 | 0.6s | mono · one-shot | polish |  | A status wears off (generic): a soft exhale of relief, a clean chime. |

#### Potions, regen, level and attributes

`assets/sound/sfx/player/` · 8 entries · 16 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `potion` | 3 | 0.6s | mono · one-shot | core | ✔ | (plays today, synthesised) generic drink (health): cork pull, two gulps, a warm exhale. Currently synthesized. |
| `potion_mp` | 3 | 0.6s | mono · one-shot | core |  | Mana potion drink: cork pull, a crystalline fizz, a cool shiver. |
| `potion_empty` | 2 | 0.3s | mono · one-shot | important |  | Belt is empty or cooling down: an empty glass clink, not the full buzz. |
| `potion_ready` | 1 | 0.3s | mono · one-shot | polish |  | Potion cooldown finished: a tiny glass chime in the HUD. |
| `levelup` | 2 | 2.2s | mono · one-shot | core | ✔ | (plays today, synthesised) level-up fanfare. Not a stinger: a short rising bell-and-brass flourish, something between a church bell and a smith's anvil, hopeful but brief. |
| `levelup_milestone` | 1 | 3s | stereo · one-shot | polish |  | Every 10th level: the same figure but fuller, with a low choir swell. |
| `xp_gain_big` | 1 | 0.8s | mono · one-shot | polish |  | An XP burst (Clear grade reward, quest reward): a quick climbing glissando. |
| `attr_spend` | 3 | 0.3s | mono · one-shot | important |  | Attribute point spent in the character panel: a firm stamped click with a small metal ring. |

#### Death, corpse run and Echo moments (player side)

`assets/sound/sfx/player/` · 6 entries · 7 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `death_fall` | 2 | 1s | mono · one-shot | core |  | Body falls: armour clatter, the weight of a person hitting stone, a last scrape. Plays with `vo_<class>_die`. |
| `death_corpse_drop` | 1 | 1.2s | mono · one-shot | important |  | Bag spills on the corpse (the run starts): a rattle of items spilling, a coin scatter. |
| `corpse_reclaim` | 1 | 2s | mono · one-shot | core |  | Reclaim the corpse bag: bag cloth pulled up, a deep resonant chord as the Echo's grip lets go. A relief sound. |
| `corpse_near` | 1 | 3s | stereo · loop | polish |  | Faint pulse as you approach your own corpse: a single heartbeat-like thump and a rising whisper, very quiet. |
| `respawn` | 1 | 2s | mono · one-shot | important |  | Waking up in town after death: a gasp, a hearth crackle swell. |
| `revive_in_dungeon` | 1 | 1.5s | mono · one-shot | polish |  | If a revive effect triggers (Last Stand perk, Second Wind): a hard heartbeat and a wooden-beam crack. |

#### Generic fallbacks for the player voice

`assets/sound/sfx/player/` · 2 entries · 5 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `hurt` | 3 | 0.4s | mono · one-shot | core | ✔ | (plays today, synthesised) generic player hurt grunt (fallback when a class has no `vo_<class>_hurt`). Today synthesized. |
| `die` | 2 | 1.5s | mono · one-shot | core | ✔ | (plays today, synthesised) generic player death cry (fallback). Today synthesized. |

### 4.2 Weapons and skills

*154 entries · 404 files · core 118 / important 211 / polish 75 · ≈ 2.8 MB encoded*

#### Basic attacks: swings by weapon type

`assets/sound/sfx/weapons/` · 8 entries · 29 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `swing` | 4 | 0.4s | mono · one-shot | core | ✔ | (plays today, synthesised) generic whoosh. Keep as the fallback for any weapon type without its own set. |
| `wpn_sword_swing` | 4 | 0.35s | mono · one-shot | core |  | Steel through air: a clean singing slash, quick, a tiny metallic edge ring. |
| `wpn_axe_swing` | 4 | 0.45s | mono · one-shot | core |  | Heavier, lopsided whoosh, a low "chuff" at the end, haft creaks. |
| `wpn_mace_swing` | 4 | 0.5s | mono · one-shot | core |  | Big dull whoomp, leather-wrapped haft, the head dragging air. |
| `wpn_dagger_swing` | 4 | 0.25s | mono · one-shot | core |  | Tiny, fast slice, almost a hiss. |
| `wpn_heavy_swing` | 3 | 0.7s | mono · one-shot | important |  | Two-handed weapon swing: a slower, huge, ugly whoosh with a creak of effort. |
| `wpn_unarmed_swing` | 3 | 0.3s | mono · one-shot | important |  | Fist and forearm: a soft cloth whip. |
| `wpn_shield_bash` | 3 | 0.45s | mono · one-shot | polish |  | Shield bash/shove (Shoulder Charge shove, Point Blank perk): wood and iron plant on flesh. |

#### Basic attacks: ranged and casters

`assets/sound/sfx/weapons/` · 7 entries · 24 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `arrow` | 4 | 0.4s | mono · one-shot | core | ✔ | (plays today, synthesised) bow release: bowstring twang, a short feather whistle. Today synthesized. |
| `bow_draw` | 2 | 0.5s | mono · one-shot | polish |  | The pull of the bowstring: leather and wood creak. Plays on windup for long-draw skills (Snipe, Aimed Shot). |
| `arrow_whiz` | 3 | 0.4s | mono · one-shot | polish |  | An enemy arrow flies past your head: a thin whine, Doppler up and gone. |
| `wand_zap` | 4 | 0.35s | mono · one-shot | core |  | Wand basic: a crackle with a bright high-frequency snap, tiny sparks. |
| `staff_cast` | 4 | 0.5s | mono · one-shot | core |  | Staff basic: lower, a rising hum then a whump, wooden thrum. |
| `bolt` | 3 | 0.4s | mono · one-shot | core | ✔ | (plays today, synthesised) lightning crack, used for the caster's basic bolt. Today synthesized. |
| `cast` | 4 | 0.5s | mono · one-shot | core | ✔ | (plays today, synthesised) generic spell release (rising sine glide). The fallback for any cast without its own sound. |

#### Impacts: weapon flavour and target material

`assets/sound/sfx/weapons/` · 22 entries · 69 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `hit` | 4 | 0.3s | mono · one-shot | core | ✔ | (plays today, synthesised) generic weapon impact. Fallback for anything unmatched. |
| `wpn_sword_hit` | 3 | 0.3s | mono · one-shot | core |  | Sharp slice through meat, bright edge ring: the "cut" top layer. |
| `wpn_axe_hit` | 3 | 0.35s | mono · one-shot | core |  | A chop with weight: cleaving thud, wood-splitting crunch. |
| `wpn_mace_hit` | 3 | 0.35s | mono · one-shot | core |  | A blunt crush: low boom, bone-cracking undertone. |
| `wpn_dagger_hit` | 3 | 0.25s | mono · one-shot | core |  | A quick stab: wet prick and tear. |
| `wpn_heavy_hit` | 3 | 0.5s | mono · one-shot | important |  | Two-handed impact, bigger and lower: ground shakes slightly. |
| `wpn_unarmed_hit` | 3 | 0.25s | mono · one-shot | polish |  | A fist on flesh, the lightest layer. |
| `hitmat_flesh` | 4 | 0.3s | mono · one-shot | core |  | Wet meaty thud: the body of the hit on flesh monsters (ghoul, goblin, hound, imp). |
| `hitmat_bone` | 4 | 0.3s | mono · one-shot | core |  | Dry crack and rattle of bones shifting: skeletons and bone mages. |
| `hitmat_metal` | 3 | 0.3s | mono · one-shot | important |  | Hard clang, a spark: armoured knights and shielded foes. |
| `hitmat_ghost` | 3 | 0.4s | mono · one-shot | important |  | Muted, airy puff with a thin whine, like hitting smoke that hits back. |
| `hitmat_slime` | 3 | 0.35s | mono · one-shot | important |  | Wet squelch and slop. |
| `hitmat_chitin` | 3 | 0.3s | mono · one-shot | important |  | A crisp crunch of shell and a pop of ichor: spiders. |
| `hitmat_stone` | 3 | 0.35s | mono · one-shot | important |  | Dull stone thud with dust: bosses and golems. |
| `hitmat_molten` | 2 | 0.4s | mono · one-shot | polish |  | Hiss of steel on hot slag: magma brute. |
| `crit_hit` | 4 | 0.5s | mono · one-shot | core |  | Critical hit layer: a bright metallic ring over a deep thud and a quick rising "ting". Must be instantly recognisable among 20 other hits. |
| `crit_big` | 2 | 0.8s | mono · one-shot | important |  | Huge critical (>25% of the target's life) or execute-type: bass drop and a broken-glass ring. |
| `kill_blow` | 3 | 0.4s | mono · one-shot | polish |  | The hit that kills: the final heavy thud before the death vocal. |
| `arrow_hit_flesh` | 4 | 0.25s | mono · one-shot | core |  | Arrow in meat: thud-and-thwip. |
| `arrow_hit_bone` | 3 | 0.25s | mono · one-shot | important |  | Arrow clacks into bone. |
| `arrow_hit_wall` | 3 | 0.25s | mono · one-shot | polish |  | Arrow strikes stone or a wall: a bright tick, skitter. |
| `bolt_hit` | 3 | 0.3s | mono · one-shot | important |  | Caster basic bolt impact: a small electric pop with a crackle tail. |

#### Mythic and perk procs on weapons

`assets/sound/sfx/weapons/` · 12 entries · 23 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `fx_split_shot` | 2 | 0.3s | mono · one-shot | polish |  | Mythic split_shot: one arrow forks, a crisp double twang. |
| `fx_corpse_blast` | 2 | 0.5s | mono · one-shot | polish |  | Mythic corpse_blast: a wet burst from a corpse, a red flash of sound. |
| `fx_chain_spark` | 2 | 0.4s | mono · one-shot | polish |  | Mythic chain_spark: a skittering spark that jumps three times. |
| `fx_second_wind` | 1 | 1s | mono · one-shot | polish |  | Mythic second_wind: a deep inhale, heart thump, glow. |
| `fx_echo_cast` | 2 | 0.5s | mono · one-shot | polish |  | Mythic echo_cast: the spell repeats as a delayed ghostly copy. |
| `fx_blood_price` | 2 | 0.5s | mono · one-shot | polish |  | Mythic blood_price: a wet cut and a hungry swallow. |
| `fx_midas` | 2 | 0.6s | mono · one-shot | polish |  | Mythic midas: coins turning to gold, a metallic shimmer. |
| `fx_frozen_wake` | 2 | 0.6s | mono · one-shot | polish |  | Mythic frozen_wake: ice growing behind the player's feet, a trail of tiny cracks. |
| `fx_legion` | 2 | 0.8s | mono · one-shot | polish |  | Mythic legion: a rattle of many bones standing at once. |
| `fx_thunderstep` | 2 | 0.5s | mono · one-shot | polish |  | Mythic thunderstep: a boot-stomp of thunder. |
| `fx_executioner` | 2 | 0.6s | mono · one-shot | polish |  | Mythic executioner: a chopping-block thud and a rising edge. |
| `fx_hoarder` | 2 | 0.5s | mono · one-shot | polish |  | Mythic hoarder: a leather purse stuffed closed. |

#### Skill system shared sounds

`assets/sound/sfx/skills/shared/` · 9 entries · 22 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `fire` | 3 | 0.8s | mono · one-shot | core | ✔ | (plays today, synthesised) generic fire whoosh / burn. Fallback for any fire skill without its own. |
| `ice` | 3 | 0.6s | mono · one-shot | core | ✔ | (plays today, synthesised) generic ice crackle. Fallback for any cold skill. |
| `skill_ready` | 1 | 0.2s | mono · one-shot | important |  | A skill's cooldown ends: a tiny soft tick, only for skills the player has on the bar. |
| `skill_nomana` | 2 | 0.3s | mono · one-shot | important |  | Not enough mana: a dull empty "fizz" (blue), quieter and shorter than `error`. |
| `skill_cooldown` | 1 | 0.2s | mono · one-shot | polish |  | Pressed while cooling down: a thin refusal tick. |
| `buff_on` | 3 | 0.8s | mono · one-shot | important |  | Generic timed buff starts (Battle Shout, Shield Wall, Mana Shield, Bone Armor share their own; this is the fallback): a rising warm shimmer. |
| `buff_off` | 3 | 0.5s | mono · one-shot | polish |  | Buff expires: a soft falling chime. |
| `zone_cast_ring` | 3 | 0.5s | mono · one-shot | important |  | A skill zone is placed on the floor (Blizzard, curses, traps): a ground-ring pulse. |
| `aoe_ring_pulse` | 3 | 0.4s | mono · one-shot | important |  | The faint 2.4-tile ring flash for melee/self AoE skills: a soft "doomm" under the main cast. |

#### Warrior skills

`assets/sound/sfx/skills/warrior/` · 23 entries · 57 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `skill_bash_cast` | 3 | 0.45s | mono · one-shot | core |  | Overhead heave with a hard downward whoosh and a grunt-free breath. |
| `skill_bash_hit` | 3 | 0.5s | mono · one-shot | core |  | Bash lands: a skull-rattling smash with a short bell-like stun ring on top. |
| `skill_charge_cast` | 2 | 0.6s | mono · one-shot | important |  | Charge (target skill): a rush of boots and plate, a roar-less shove, ending in the strike. |
| `skill_charge_hit` | 3 | 0.5s | mono · one-shot | important |  | The charge strike plus a dazed ring. |
| `skill_rend_cast` | 3 | 0.4s | mono · one-shot | important |  | Rend: a tearing, dragging slash. |
| `skill_rend_hit` | 3 | 0.4s | mono · one-shot | important |  | A deep wet cut that leaves a lingering drip pattern (bleed). |
| `skill_execute_cast` | 2 | 0.8s | mono · one-shot | important |  | Execute: a slow, deliberate lift of the blade, a held breath. |
| `skill_execute_hit` | 3 | 0.8s | mono · one-shot | important |  | The killing blow: a cleaver-heavy crunch with a sub-bass hit. |
| `skill_execute_finish` | 2 | 1s | mono · one-shot | polish |  | Execute vs a foe below 30% life (doubled damage): the same hit but with a bone-snap and a small silence after. |
| `skill_cleave_cast` | 4 | 0.5s | mono · one-shot | core |  | Cleave: wide horizontal swing, a long whooshing arc. |
| `skill_cleave_hit` | 3 | 0.4s | mono · one-shot | core |  | Short, thick slice-through; layered on each foe struck, throttled. |
| `skill_whirlwind_start` | 2 | 0.5s | mono · one-shot | important |  | Whirlwind winds up: a boot dig and a rising whir. |
| `skill_whirlwind_loop` | 1 | 1s | mono · loop | important |  | 1.2 s spin: a steady rotating blade whoosh (4 strikes per spin: the engine pulses the hit layer on each). |
| `skill_whirlwind_end` | 2 | 0.5s | mono · one-shot | polish |  | The spin ends, boots skid. |
| `skill_leap_cast` | 2 | 0.6s | mono · one-shot | important |  | Leap launch: a grunt-less push-off, a whoosh up and a breath held. |
| `skill_leap_land` | 3 | 0.9s | mono · one-shot | core |  | Leap landing: a ground-shaking crunch with a debris spray and slow reverb; slows foes (a muddy drag tail). |
| `skill_earthquake_cast` | 2 | 0.8s | mono · one-shot | important |  | Earthquake windup: the weapon driven into the ground, a low crack. |
| `skill_earthquake_wave` | 3 | 1s | mono · one-shot | important |  | One of three shockwaves: a rolling low boom with rubble clatter. Plays 3 times, each slightly deeper. |
| `skill_shout_battle` | 2 | 1.2s | mono · one-shot | important |  | Battle Shout: a long wordless war-roar (no words), then a warm brass swell as the buff lands. |
| `skill_shout_war` | 2 | 1.2s | mono · one-shot | important |  | War Cry: a shrieking, terrifying roar that cuts through; stun ring ripple and cowering sounds. |
| `skill_shield_wall_on` | 2 | 0.8s | mono · one-shot | important |  | Shield Wall: a shield planted and braced: heavy iron thud, a deep resonant hum that sustains softly. |
| `skill_shield_wall_hit` | 3 | 0.4s | mono · one-shot | polish |  | A blow absorbed under Shield Wall: a muffled clang. |
| `skill_shield_wall_off` | 2 | 0.5s | mono · one-shot | polish |  | Shield lowered: a creak and a breath out. |

#### Ranger skills

`assets/sound/sfx/skills/ranger/` · 21 entries · 58 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `skill_aimed_shot_cast` | 3 | 0.5s | mono · one-shot | important |  | Aimed Shot: a slow draw and breath, then a sharp whip-crack release with a tiny glint. |
| `skill_aimed_shot_hit` | 3 | 0.3s | mono · one-shot | important |  | A precise thunk with a crit "tick" layer. |
| `skill_piercing_cast` | 3 | 0.5s | mono · one-shot | important |  | Piercing Shot: a rising whistle arrow, thin and bright, with a tail that carries on. |
| `skill_piercing_hit` | 3 | 0.3s | mono · one-shot | important |  | Arrow punches through: meat-and-air pop; plays per foe pierced, throttled. |
| `skill_poison_arrow_cast` | 3 | 0.5s | mono · one-shot | important |  | Poison Arrow: bowstring and a wet sizzle as the venom drips off the tip. |
| `skill_poison_arrow_hit` | 3 | 0.5s | mono · one-shot | important |  | A venom splat and slow hiss; green and bubbly. |
| `skill_snipe_cast` | 2 | 1s | mono · one-shot | important |  | Snipe: a huge, long draw with a creak, then a rifle-like crack with a long, sparse tail that echoes across the room. |
| `skill_snipe_hit` | 3 | 0.6s | mono · one-shot | important |  | Distant, heavy impact, a body-drop thump with a crit ring. |
| `skill_multishot_cast` | 3 | 0.5s | mono · one-shot | important |  | Multishot: a fan of arrows released at once, a rattling flutter of strings. |
| `skill_rain_cast` | 2 | 0.8s | mono · one-shot | important |  | Rain of Arrows launch: a volley arcing up with a rushing flutter. |
| `skill_rain_land` | 4 | 0.8s | mono · one-shot | important |  | One of 5 volleys landing: a hail of patter and thunks. Plays ~5 times over 2 s, different pitch each time. |
| `skill_explosive_arrow_cast` | 3 | 0.5s | mono · one-shot | important |  | Explosive Arrow: a fuse spit and a hot whoosh. |
| `skill_explosive_arrow_hit` | 3 | 0.9s | mono · one-shot | important |  | A fiery pop and rolling blast, shrapnel hiss. |
| `skill_arrow_storm_cast` | 2 | 1.5s | mono · one-shot | important |  | Arrow Storm: a rapid-fire flurry of up to 14 strings, a ripping zipper of twangs. |
| `skill_arrow_storm_hit` | 3 | 0.3s | mono · one-shot | polish |  | Short, dense patter of hits when it lands (play one burst, not 14). |
| `skill_trap_set` | 3 | 0.5s | mono · one-shot | important |  | Spike Trap / Frost Trap placed: metal parts clicking into place, a spring cocked. |
| `skill_spike_trap_burst` | 3 | 0.7s | mono · one-shot | important |  | Spike Trap springs: a hard snap of metal, spikes bursting up, a slowing scrape. |
| `skill_frost_trap_burst` | 3 | 0.8s | mono · one-shot | important |  | Frost Trap springs: a freezing crack and a cold exhale, ice rapidly forming. |
| `skill_camouflage_on` | 2 | 1s | mono · one-shot | important |  | Camouflage: leaves and cloth rustle, then a hush that takes the room's air. |
| `skill_camouflage_off` | 2 | 0.6s | mono · one-shot | polish |  | Cover broken: a soft cloth snap. |
| `perk_trap_arm` | 2 | 0.3s | mono · one-shot | polish |  | Armed trap ready pip (when enemies approach). |

#### Sorcerer skills

`assets/sound/sfx/skills/sorcerer/` · 27 entries · 67 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `skill_fire_bolt_cast` | 3 | 0.4s | mono · one-shot | important |  | Fire Bolt: a quick flame spit, a hiss of gas igniting. |
| `skill_fire_bolt_hit` | 3 | 0.4s | mono · one-shot | important |  | A small blast and sizzle; burns on. |
| `skill_fireball_cast` | 3 | 0.7s | mono · one-shot | core |  | Fireball: a deep whoomp of gas catching, a growing roar as it leaves the hand. |
| `skill_fireball_travel` | 1 | 0.8s | mono · loop | polish |  | A lit comet crackle that follows the projectile (loop, stops at impact). |
| `skill_fireball_hit` | 3 | 1s | mono · one-shot | core |  | An exploding fireball: a boom with a fire-spreading whoosh and falling embers. |
| `skill_incinerate_start` | 2 | 0.5s | mono · one-shot | important |  | Incinerate: a roaring flame jet ignites. |
| `skill_incinerate_loop` | 1 | 0.9s | mono · loop | important |  | A sustained flame stream roar, ~0.85 s while channelled; ends with a puff. |
| `skill_meteor_cast` | 2 | 0.9s | mono · one-shot | important |  | Meteor call: a rising, descending whistle and a rumble; 0.9 s delay in-game, so the sound IS the telegraph: it should end exactly at impact. |
| `skill_meteor_hit` | 3 | 1.6s | mono · one-shot | core |  | Meteor impact: a gut-shaking boom, ground splitting, a shower of debris, burning aftermath. One of the loudest player sounds (but not the loudest in the game). |
| `skill_ice_shard_cast` | 3 | 0.4s | mono · one-shot | important |  | Ice Shard: a crystalline slick, like a knife drawn from ice. |
| `skill_ice_shard_hit` | 3 | 0.4s | mono · one-shot | important |  | A glassy shatter and a chilling tinkle. |
| `skill_frost_nova_cast` | 2 | 0.9s | mono · one-shot | important |  | Frost Nova: a deep whoosh outward, then freezing crackle spreading to the ring edge. |
| `skill_frost_nova_freeze` | 3 | 0.7s | mono · one-shot | important |  | Foes frozen: ice forming on bodies, a squeaking crackle. Throttled. |
| `skill_shatter` | 3 | 0.7s | mono · one-shot | polish |  | A frozen foe shatters (Shatter passive): a glass-bell explosion. Today `ice` + text 'SHATTER'. |
| `skill_blizzard_cast` | 2 | 0.8s | mono · one-shot | important |  | Blizzard: the sky closes, wind and ice swirl in. |
| `skill_blizzard_loop` | 1 | 3s | mono · loop | important |  | 5 s storm zone: a roaring ice-wind loop with ice pellets ticking; the 0.5 s tick sound is a tiny ice patter. |
| `skill_glacial_spike_cast` | 2 | 0.9s | mono · one-shot | important |  | Glacial Spike: a massive crystal growing, a pressure crack, the spike fired with a heavy whump. |
| `skill_glacial_spike_hit` | 3 | 1.1s | mono · one-shot | important |  | A giant ice stab: a deep ice-shattering crash, frost crackle outward. |
| `skill_chain_cast` | 3 | 0.5s | mono · one-shot | core |  | Chain Lightning: a violent crackle as the bolt leaves the hand. |
| `skill_chain_arc` | 4 | 0.3s | mono · one-shot | core |  | The arc jumps between foes: a snap-snap zap each jump, rising pitch with each hop. |
| `skill_teleport` | 3 | 0.6s | mono · one-shot | core |  | Teleport: a swallowed zip; shares the `blink_out`/`blink_in` feel but louder, with an arcane resonance. |
| `skill_mana_shield_on` | 2 | 0.8s | mono · one-shot | important |  | Mana Shield: a shimmering bubble of blue energy forming, a resonant hum. |
| `skill_mana_shield_hit` | 3 | 0.4s | mono · one-shot | important |  | A hit drains mana instead of life: a glassy "bong" and a drip of mana. |
| `skill_mana_shield_off` | 2 | 0.5s | mono · one-shot | polish |  | The bubble pops. |
| `skill_thunderstorm_start` | 2 | 1s | mono · one-shot | important |  | Thunderstorm: clouds roll in over your head, a deep rumble and wind gather. |
| `skill_thunderstorm_loop` | 1 | 3s | mono · loop | polish |  | 10 s: a storm hum that follows the player, patter of rain. |
| `skill_thunderstorm_strike` | 4 | 1s | mono · one-shot | important |  | A lightning strike on a nearby foe: a crack followed by a rolling thunder; rate 1 per 0.6 s so tails must be short and overlap well. |

#### Necromancer skills and minions

`assets/sound/sfx/skills/necromancer/` · 25 entries · 55 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `skill_raise_cast` | 2 | 1s | mono · one-shot | core |  | Raise Skeleton: the ground splits, a rattle of bone as the dead assemble, cold green whisper. Max squad = ~4 pops spaced 0.1 s apart. |
| `skill_raise_spawn` | 4 | 0.6s | mono · one-shot | important |  | One skeleton warrior stands: bones clicking together and an eye-socket flare. |
| `skill_corpse_explosion_cast` | 2 | 0.5s | mono · one-shot | important |  | Corpse Explosion: a dark swelling gurgle, a heartbeat of bile. |
| `skill_corpse_explosion_hit` | 3 | 1s | mono · one-shot | core |  | A wet, fiery burst: bone and meat bursting with a blast of heat. Gross and satisfying. |
| `skill_skeletal_mage_cast` | 2 | 1s | mono · one-shot | important |  | Skeletal Mage: bones assemble with a cold, chiming overtone. |
| `skill_golem_cast` | 2 | 1.8s | mono · one-shot | important |  | Bone Golem: a big pile of bones grinding, slowly pulling themselves into a giant; a long, creaking build with a final deep boom. |
| `skill_bone_spear_cast` | 3 | 0.5s | mono · one-shot | important |  | Bone Spear: a spear of bone shoots out with a splintering hiss. |
| `skill_bone_spear_hit` | 3 | 0.4s | mono · one-shot | important |  | A heavy pierce, a bone crack with meat. |
| `skill_bone_armor_on` | 2 | 1s | mono · one-shot | important |  | Bone Armor: bones fly up and clatter into a shell around you; a hollow clatter. |
| `skill_bone_armor_hit` | 3 | 0.4s | mono · one-shot | important |  | Damage absorbed by the shell: a bone-on-bone clack. |
| `skill_bone_armor_break` | 2 | 0.8s | mono · one-shot | important |  | The shell breaks: a cascade of bones falling. |
| `skill_bone_nova_cast` | 3 | 0.7s | mono · one-shot | important |  | Bone Nova: an outward burst of N shards: a rattling blast with whistling shrapnel. |
| `skill_life_drain_start` | 2 | 0.6s | mono · one-shot | important |  | Life Drain: a wet, leech-like hook; a thin sucking tone begins. |
| `skill_life_drain_loop` | 1 | 0.9s | mono · loop | important |  | The siphon: a rhythmic wet pull, with a warm heal pulse on each of the 4 ticks. |
| `skill_bone_spirit_cast` | 2 | 0.8s | mono · one-shot | important |  | Bone Spirit: a high wail that rushes out of the staff, ghostly and angry. |
| `skill_bone_spirit_travel` | 1 | 0.8s | mono · loop | polish |  | A wailing, screeching tail that homes onto a foe. |
| `skill_bone_spirit_hit` | 3 | 0.7s | mono · one-shot | important |  | The spirit slams into the foe with a scream and cuts off. |
| `skill_amplify_cast` | 2 | 1s | mono · one-shot | important |  | Amplify Damage: a red curse glyph blooms under the foes, a growling whisper; the foes' voices go sharp. |
| `skill_decrepify_cast` | 2 | 1s | mono · one-shot | important |  | Decrepify: a heavy, draining curse, a groaning decay: foes feel slow. |
| `skill_poison_nova_cast` | 2 | 1s | mono · one-shot | important |  | Poison Nova: a hiss ring of venom spreading, then bubbling. |
| `skill_lich_start` | 1 | 2.5s | stereo · one-shot | core |  | Lich Form: the transformation. Bones crack, a hard cold exhale, a bass note drops in: you are death for 15+ s. |
| `skill_lich_loop` | 1 | 3s | stereo · loop | polish |  | While lich: a low, icy hum under everything, a faint breath of cold. |
| `skill_lich_end` | 1 | 1s | mono · one-shot | polish |  | Lich ends: the cold leaves with a long sigh. |
| `minion_summon_pop` | 3 | 0.4s | mono · one-shot | important |  | A summoned minion appears (Grave Swap, Army of Flow, Bone Arrows perks): a short bone-and-whisper pop. |
| `minion_golem_stomp` | 3 | 0.8s | mono · one-shot | polish |  | Your Bone Golem's footstep: a big bone-and-gravel thud. |

### 4.3 Monsters

*187 entries · 473 files · core 131 / important 275 / polish 67 · ≈ 4.3 MB encoded*

#### Body-type sets (core: every monster falls back to its body type)

`assets/sound/sfx/monsters/shared/` · 60 entries · 170 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `mon_body_humanoid_alert` | 2 | 0.8s | mono · one-shot | core |  | Humanoid notices you (goblin, goblin slinger, the Magpie, Scavenger and the Fallen as men and women). Sound: harsh, quick, wheezy; cowardly chatter that rises when many are present (no words). 0.5-0.8 s. |
| `mon_body_humanoid_attack` | 3 | 0.5s | mono · one-shot | core |  | Humanoid attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_humanoid_hurt` | 3 | 0.4s | mono · one-shot | core |  | Humanoid is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_humanoid_die` | 3 | 1.2s | mono · one-shot | core |  | Humanoid dies: the full death sound. Sound: harsh, quick, wheezy; cowardly chatter that rises when many are present (no words). The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_humanoid_idle` | 2 | 1.2s | mono · one-shot | important |  | Humanoid idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_humanoid_move` | 4 | 0.4s | mono · one-shot | important |  | Humanoid footfall: cloth and leather footfall. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_skeleton_alert` | 2 | 0.8s | mono · one-shot | core |  | Skeleton notices you (skeleton, skeleton archer, Morgrath, minion skeletons). Sound: no voice: jaw clacks, rattling bones, a dry wooden knock; death = a collapsing pile of bones. 0.5-0.8 s. |
| `mon_body_skeleton_attack` | 3 | 0.5s | mono · one-shot | core |  | Skeleton attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_skeleton_hurt` | 3 | 0.4s | mono · one-shot | core |  | Skeleton is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_skeleton_die` | 3 | 1.2s | mono · one-shot | core |  | Skeleton dies: the full death sound. Sound: no voice: jaw clacks, rattling bones, a dry wooden knock; death = a collapsing pile of bones. The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_skeleton_idle` | 2 | 1.2s | mono · one-shot | important |  | Skeleton idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_skeleton_move` | 4 | 0.4s | mono · one-shot | important |  | Skeleton footfall: bones on stone: a dry click-clack. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_beast_alert` | 2 | 0.8s | mono · one-shot | core |  | Beast notices you (grave rat, hellhound). Sound: animal: squeals, snarls, a throaty growl; rat = chittering, hound = a hot dog-growl. 0.5-0.8 s. |
| `mon_body_beast_attack` | 3 | 0.5s | mono · one-shot | core |  | Beast attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_beast_hurt` | 3 | 0.4s | mono · one-shot | core |  | Beast is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_beast_die` | 3 | 1.2s | mono · one-shot | core |  | Beast dies: the full death sound. Sound: animal: squeals, snarls, a throaty growl; rat = chittering, hound = a hot dog-growl. The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_beast_idle` | 2 | 1.2s | mono · one-shot | important |  | Beast idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_beast_move` | 4 | 0.4s | mono · one-shot | important |  | Beast footfall: padded paws, claws scratching. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_blob_alert` | 2 | 0.8s | mono · one-shot | core |  | Blob notices you (bile slime, shadowling). Sound: wet gurgles, burbling pops; shadowling = a sibilant hiss with a chord of tiny voices. 0.5-0.8 s. |
| `mon_body_blob_attack` | 3 | 0.5s | mono · one-shot | core |  | Blob attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_blob_hurt` | 3 | 0.4s | mono · one-shot | core |  | Blob is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_blob_die` | 3 | 1.2s | mono · one-shot | core |  | Blob dies: the full death sound. Sound: wet gurgles, burbling pops; shadowling = a sibilant hiss with a chord of tiny voices. The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_blob_idle` | 2 | 1.2s | mono · one-shot | important |  | Blob idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_blob_move` | 4 | 0.4s | mono · one-shot | important |  | Blob footfall: a sticky squelch and drag. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_flyer_alert` | 2 | 0.8s | mono · one-shot | core |  | Flyer notices you (gloom bat, imp, ember imp, gazer). Sound: bat: high clicks and screeches; imp: cackling chitter; gazer: a wet wheezing hum. 0.5-0.8 s. |
| `mon_body_flyer_attack` | 3 | 0.5s | mono · one-shot | core |  | Flyer attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_flyer_hurt` | 3 | 0.4s | mono · one-shot | core |  | Flyer is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_flyer_die` | 3 | 1.2s | mono · one-shot | core |  | Flyer dies: the full death sound. Sound: bat: high clicks and screeches; imp: cackling chitter; gazer: a wet wheezing hum. The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_flyer_idle` | 2 | 1.2s | mono · one-shot | important |  | Flyer idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_flyer_move` | 4 | 0.4s | mono · one-shot | important |  | Flyer footfall: a wing flutter (rapid flapping loop-ish, 0.5 s), different for bats (leather) and imps (fire-crackle). Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_spider_alert` | 2 | 0.8s | mono · one-shot | core |  | Spider notices you (cave spider, abyss stalker, Skarn). Sound: hisses, clicks and a dry chittering; larger = lower pitch. 0.5-0.8 s. |
| `mon_body_spider_attack` | 3 | 0.5s | mono · one-shot | core |  | Spider attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_spider_hurt` | 3 | 0.4s | mono · one-shot | core |  | Spider is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_spider_die` | 3 | 1.2s | mono · one-shot | core |  | Spider dies: the full death sound. Sound: hisses, clicks and a dry chittering; larger = lower pitch. The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_spider_idle` | 2 | 1.2s | mono · one-shot | important |  | Spider idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_spider_move` | 4 | 0.4s | mono · one-shot | important |  | Spider footfall: rapid legs skittering (the signature sound of spiders), 0.4 s burst. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_caster_alert` | 2 | 0.8s | mono · one-shot | core |  | Caster notices you (bone mage, goblin shaman, pyromancer, void caller, skeletal mage minions). Sound: chanting-like mutters without words, a rasping breath; spells end with a rising ring. 0.5-0.8 s. |
| `mon_body_caster_attack` | 3 | 0.5s | mono · one-shot | core |  | Caster attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_caster_hurt` | 3 | 0.4s | mono · one-shot | core |  | Caster is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_caster_die` | 3 | 1.2s | mono · one-shot | core |  | Caster dies: the full death sound. Sound: chanting-like mutters without words, a rasping breath; spells end with a rising ring. The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_caster_idle` | 2 | 1.2s | mono · one-shot | important |  | Caster idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_caster_move` | 4 | 0.4s | mono · one-shot | important |  | Caster footfall: robe swish and a staff tap. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_brute_alert` | 2 | 0.8s | mono · one-shot | core |  | Brute notices you (ghoul, cave troll, magma brute, dread knight). Sound: deep growls and wet grunts, heavy breath; the troll grumbles. 0.5-0.8 s. |
| `mon_body_brute_attack` | 3 | 0.5s | mono · one-shot | core |  | Brute attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_brute_hurt` | 3 | 0.4s | mono · one-shot | core |  | Brute is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_brute_die` | 3 | 1.2s | mono · one-shot | core |  | Brute dies: the full death sound. Sound: deep growls and wet grunts, heavy breath; the troll grumbles. The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_brute_idle` | 2 | 1.2s | mono · one-shot | important |  | Brute idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_brute_move` | 4 | 0.4s | mono · one-shot | important |  | Brute footfall: heavy thudding footfalls with a bass hit. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_wraith_alert` | 2 | 0.8s | mono · one-shot | core |  | Wraith notices you (wraith, void wraith, Xal'thuun, ghost adds). Sound: a thin hollow moan, an airy wail with reverb; cold. 0.5-0.8 s. |
| `mon_body_wraith_attack` | 3 | 0.5s | mono · one-shot | core |  | Wraith attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_wraith_hurt` | 3 | 0.4s | mono · one-shot | core |  | Wraith is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_wraith_die` | 3 | 1.2s | mono · one-shot | core |  | Wraith dies: the full death sound. Sound: a thin hollow moan, an airy wail with reverb; cold. The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_wraith_idle` | 2 | 1.2s | mono · one-shot | important |  | Wraith idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_wraith_move` | 4 | 0.4s | mono · one-shot | important |  | Wraith footfall: no footsteps: a drifting whisper-whoosh. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_demon_alert` | 2 | 0.8s | mono · one-shot | core |  | Demon notices you (pit fiend, dread knight (as demon body), Azgalor). Sound: an angry guttural roar with a hiss, a burning-throat rasp. 0.5-0.8 s. |
| `mon_body_demon_attack` | 3 | 0.5s | mono · one-shot | core |  | Demon attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_demon_hurt` | 3 | 0.4s | mono · one-shot | core |  | Demon is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_demon_die` | 3 | 1.2s | mono · one-shot | core |  | Demon dies: the full death sound. Sound: an angry guttural roar with a hiss, a burning-throat rasp. The same body-set sound must also be easily recognisable as a death under 20 other sounds. |
| `mon_body_demon_idle` | 2 | 1.2s | mono · one-shot | important |  | Demon idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_demon_move` | 4 | 0.4s | mono · one-shot | important |  | Demon footfall: hoof-and-claw clop with a hot hiss. Plays while walking, throttled and mixed quiet. Fades with distance. |

#### Attack projectiles, telegraphs and zones (monsters)

`assets/sound/sfx/monsters/shared/` · 22 entries · 60 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `mon_shot_arrow` | 3 | 0.4s | mono · one-shot | core |  | Enemy arrow launch: thinner and slightly quieter than the player's `arrow`, so the player can tell them apart. |
| `mon_shot_bolt` | 3 | 0.4s | mono · one-shot | core |  | Enemy lightning bolt: a nasty buzzing zap (shaman, gazer). |
| `mon_shot_orb` | 3 | 0.4s | mono · one-shot | important |  | Sling stone or orb: a leather whirr and a thok (goblin slinger); void orb whine for the abyss. |
| `mon_shot_fireball` | 3 | 0.6s | mono · one-shot | core |  | Enemy fireball: a sputtering hot whoosh, always a little 'wrong' compared to the player's (a rasp). |
| `mon_shot_shard` | 3 | 0.4s | mono · one-shot | important |  | Bone/ice shard throw: a hard clicking spin. |
| `mon_shot_spit` | 3 | 0.4s | mono · one-shot | important |  | Venom/acid spit: a wet hawk and a sizzling flight. |
| `proj_hit_arrow` | 3 | 0.25s | mono · one-shot | important |  | Enemy arrow hits the player or a minion: thunk. |
| `proj_hit_bolt` | 3 | 0.3s | mono · one-shot | important |  | Enemy bolt hits: crackling pop. |
| `proj_hit_fire` | 3 | 0.5s | mono · one-shot | important |  | Enemy fireball hits: a dull fire burst, embers. |
| `proj_hit_shard` | 3 | 0.3s | mono · one-shot | important |  | Shard breaks: a bright glass-like crackle. |
| `proj_hit_spit` | 3 | 0.35s | mono · one-shot | important |  | Spit splats: a venom sizzle. |
| `zone_tele` | 3 | 0.9s | mono · one-shot | core |  | Blast/zone telegraph appears (red ring): a swelling warning tone that ends precisely at detonation (the tele time is 0.5-1.1 s, so produce 3 lengths: 0.6/0.9/1.1 s as separate cuts). A rising shimmer is more readable than a siren. THE key readability sound. |
| `zone_tele_short` | 3 | 0.5s | mono · one-shot | core |  | The same family cut to 0.5 s, for fast tells and Collapse rocks. |
| `zone_tele_long` | 2 | 1.2s | mono · one-shot | important |  | The same family cut to 1.2 s, for boss circles and Meteor Rain. |
| `zone_blast_fire` | 3 | 0.8s | mono · one-shot | important |  | A telegraphed fire blast detonates (pyromancer, circles): a hot punch with ember spray. |
| `zone_blast_cold` | 3 | 0.8s | mono · one-shot | important |  | Cold zone detonation (void caller): a glassy implosion. |
| `zone_blast_poison` | 3 | 0.8s | mono · one-shot | important |  | Poison zone burst: a sick wet pop and hiss. |
| `zone_blast_phys` | 3 | 0.8s | mono · one-shot | important |  | Plain physical blast (rocks, slams): a dull boom. |
| `zone_linger_loop` | 2 | 2s | mono · loop | polish |  | Lingering ground hazard (bile, void wells, fire pools, molten trails): a low bubbling/fizzing loop with a dtype flavour (3 cuts: fire, poison, void). |
| `zone_dodge` | 1 | 0.3s | mono · one-shot | important |  | Close-call whisper: when you leave a zone before it fires and the tele nearly finished. (Close Call itself has its own sounds: see Events and systems.) |
| `mon_death_blast_fire` | 2 | 0.9s | mono · one-shot | important |  | Magma Brute / Fire Enchanted death blast: a furnace-door boom, the corpse bursting. |
| `mon_death_blast_cold` | 2 | 0.7s | mono · one-shot | important |  | Frozen death burst: a flash-freeze shatter. |

#### Corpses, tiers and rarity cues

`assets/sound/sfx/monsters/shared/` · 7 entries · 14 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `corpse_thud` | 3 | 0.4s | mono · one-shot | polish |  | A body settling after the death sound, tiny: a quiet floor thud. |
| `corpse_decay` | 2 | 1.5s | mono · one-shot | polish |  | After 6 s the corpse crumbles: a quiet dissolving hiss and dust. Almost inaudible. |
| `alert_champion` | 2 | 1.5s | mono · one-shot | important |  | A champion pack aggros: a layered double-voice growl plus a low brass tone. The player should learn "this is more than normal". |
| `alert_rare` | 2 | 1.8s | mono · one-shot | important |  | A rare (blue-named) monster aggros: a heavier growl with a rising ominous drone and a bell. |
| `alert_legendary` | 2 | 2.5s | mono · one-shot | core |  | A Legendary monster (orange) aggros: a booming roar stack, a low rumble, a harsh bell. Today it uses `shrine` as a one-off announce. |
| `legendary_spawn_sense` | 1 | 2s | mono · one-shot | polish |  | You arrive on a floor with a Legendary: a faint, deep tremor like distant bells. |
| `pallid_alert` | 2 | 1.2s | mono · one-shot | important |  | A Pallid monster aggros (Pallor III+): drained, tuneless whisper and a missing-note shimmer. |

#### Crypt monsters (depths 1-5)

`assets/sound/sfx/monsters/crypt/` · 10 entries · 25 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `mon_skeleton_alert` | 2 | 0.8s | mono · one-shot | polish |  | Skeleton wakes: a jaw clack, rusty joints, a sword scrape from its sheath. |
| `mon_skeleton_die` | 3 | 1.3s | mono · one-shot | important |  | Skeleton collapses: skull rolls, a ribcage drop; bones scatter with a long rattle tail. |
| `mon_skeleton_archer_draw` | 2 | 0.6s | mono · one-shot | important |  | Skeleton Archer nocks and draws: dry bowstring creak, an arrow shaft clicking. |
| `mon_grave_rat_chitter` | 3 | 0.8s | mono · one-shot | important |  | Grave rats appear in a swarm: overlapping squeals and scurrying, loop-friendly; a pack of 5 should not be 5 loud sounds. |
| `mon_grave_rat_die` | 3 | 0.4s | mono · one-shot | important |  | A tiny wet squeak and snap. |
| `mon_ghoul_alert` | 2 | 1.2s | mono · one-shot | important |  | Ghoul growls: a gurgling, rotten rasp, a lower pitch than the beast set. |
| `mon_ghoul_attack` | 3 | 0.6s | mono · one-shot | important |  | Ghoul claw-swipe with a clack of bad teeth. Poison on-hit gets a wet hiss. |
| `mon_bone_mage_chant` | 2 | 1s | mono · one-shot | important |  | Bone Mage prepares a fireball: a muttering of old language, a fire flicker in the voice. No intelligible words. |
| `mon_wraith_alert` | 2 | 1.5s | mono · one-shot | important |  | Wraith: a cold exhale and a thin moan that drifts through the room; chill air. |
| `mon_wraith_die` | 3 | 1.6s | mono · one-shot | important |  | A long fading wail; a clear tone dropping into a hiss. |

#### Cave monsters (depths 6-10)

`assets/sound/sfx/monsters/caves/` · 13 entries · 35 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `mon_goblin_alert` | 3 | 0.7s | mono · one-shot | important |  | Cave Goblin spots you: a shrill cackle and a cheeky jabber, quick staccato (non-verbal). |
| `mon_goblin_die` | 3 | 0.9s | mono · one-shot | important |  | A goblin's death squeal and crumpling. |
| `mon_goblin_slinger_whirl` | 2 | 0.7s | mono · one-shot | important |  | Slinger whirls the sling: a rotating leather whirr. |
| `mon_cave_spider_skitter` | 3 | 0.8s | mono · one-shot | core |  | The signature spider: a scurry of eight legs, a click with each footfall. The player must be able to recognise it from off-screen. |
| `mon_cave_spider_hiss` | 3 | 0.5s | mono · one-shot | important |  | Spider hisses before biting. |
| `mon_cave_bat_screech` | 3 | 0.7s | mono · one-shot | important |  | Bat screech, a high-pitch bat chirp that pans across the mix. |
| `mon_cave_bat_flutter` | 3 | 0.6s | mono · one-shot | important |  | Leathery wings fluttering, erratic. Plays while bats are within 6 tiles. |
| `mon_troll_alert` | 2 | 1.5s | mono · one-shot | important |  | Cave Troll: a bass grumble and a stone-grinding throat. |
| `mon_troll_stomp` | 3 | 0.8s | mono · one-shot | important |  | Troll footstep: one big thud with a grit shake. |
| `mon_troll_regen` | 2 | 0.7s | mono · one-shot | polish |  | The troll heals (regen tick): a wet knitting sound. |
| `mon_shaman_chant` | 2 | 1s | mono · one-shot | important |  | Goblin Shaman calls the storm: a rising sing-song chant and a crackle of static in the voice. |
| `mon_slime_squelch` | 3 | 0.5s | mono · one-shot | important |  | Slime moves: a thick, bubbling slurp as it slides. |
| `mon_slime_die` | 3 | 0.9s | mono · one-shot | important |  | Slime bursts: a big wet splat and slow drip. |

#### Inferno monsters (depths 11-15)

`assets/sound/sfx/monsters/inferno/` · 12 entries · 30 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `mon_imp_cackle` | 3 | 0.8s | mono · one-shot | important |  | Imp: a high, rapid cackle and a fire-pop; a flurry of crackling; one cackle per pack. |
| `mon_imp_flutter` | 3 | 0.5s | mono · one-shot | polish |  | Imp wingbeats: a flapping-flame whip, fire-hot. |
| `mon_imp_die` | 3 | 0.6s | mono · one-shot | important |  | The imp pops in a puff of fire and ash. |
| `mon_fire_imp_spit` | 3 | 0.6s | mono · one-shot | important |  | Ember Imp spits coals: a hawking spit and an ignition. |
| `mon_hellhound_howl` | 2 | 1.4s | mono · one-shot | important |  | Hellhound howl: a low, fiery howl, a hot rasp; one per pack. |
| `mon_hellhound_pant` | 2 | 1s | mono · one-shot | polish |  | A hot, panting breath while it hunts. |
| `mon_hellhound_leap` | 2 | 0.6s | mono · one-shot | important |  | Lunge: a snarl and claws on stone. |
| `mon_magma_brute_stomp` | 3 | 0.8s | mono · one-shot | important |  | Magma Brute footfall: molten stone cracking and hissing with each heavy step. |
| `mon_magma_brute_alert` | 2 | 1.4s | mono · one-shot | important |  | A furnace roar: a bellows-like rumble with cracking rock. |
| `mon_pyromancer_chant` | 2 | 1s | mono · one-shot | important |  | Cult Pyromancer: a rapid-fire murmur, a fire-lit chant, sparks. It marks the ground before a blast; chant ends at the zone tele start. |
| `mon_demon_warrior_roar` | 2 | 1.2s | mono · one-shot | important |  | Pit Fiend: a heavy guttural roar with an iron axe drag. |
| `mon_demon_warrior_axe` | 3 | 0.6s | mono · one-shot | important |  | Pit Fiend axe swing: an iron-chain whoosh. |

#### Abyss monsters (depths 16+)

`assets/sound/sfx/monsters/abyss/` · 13 entries · 35 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `mon_void_wraith_blink` | 3 | 0.6s | mono · one-shot | important |  | Void Wraith teleports behind you: a swallow of air and a high whisper. Must come BEFORE it appears, ~0.2 s warning, a fair-play tell ("is behind you"). |
| `mon_void_wraith_alert` | 2 | 1.5s | mono · one-shot | important |  | A hollow moan, a more broken tone than the Crypt wraith. |
| `mon_abyss_stalker_skitter` | 3 | 0.8s | mono · one-shot | important |  | A deeper, wetter skitter than the cave spider: too many legs, a rhythm that does not quite line up. |
| `mon_abyss_stalker_alert` | 2 | 0.8s | mono · one-shot | important |  | A click-click-click and a rasp. |
| `mon_gazer_charge` | 3 | 0.6s | mono · one-shot | important |  | Gazer charging its eye: a rising static whine and a blinking click. |
| `mon_gazer_hum` | 2 | 1.5s | mono · one-shot | polish |  | A low wheezing hum while hovering. |
| `mon_gazer_die` | 3 | 0.9s | mono · one-shot | important |  | The eye bursts: a wet pop followed by a descending electronic fade. |
| `mon_void_caller_open` | 3 | 0.9s | mono · one-shot | important |  | Void Caller opens a small cold hole: a spatial *pop* inward, then an echoing hum. This is the zone tele start. |
| `mon_dread_knight_step` | 3 | 0.7s | mono · one-shot | important |  | Dread Knight: an armoured step with a creak, a chain slither. |
| `mon_dread_knight_alert` | 2 | 1.4s | mono · one-shot | important |  | A deep voice-less hollow groan from inside the armour, and a drawn sword. |
| `mon_dread_knight_die` | 3 | 1.4s | mono · one-shot | important |  | An armoured collapse: plate falling, then silence; something leaves it. |
| `mon_shadowling_hiss` | 3 | 0.7s | mono · one-shot | important |  | Shadowling: a whisper chord of many tiny voices, thin hisses. |
| `mon_shadowling_die` | 3 | 0.5s | mono · one-shot | important |  | Dissipates with a sigh. |

#### Minions, summons and neutral creatures

`assets/sound/sfx/monsters/minions/` · 13 entries · 24 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `mon_minion_skeleton_attack` | 3 | 0.4s | mono · one-shot | important |  | Your skeleton warrior swings: a lighter, cleaner bone-and-blade (it is YOURS, so it should sound less hostile). |
| `mon_minion_skeleton_die` | 3 | 0.8s | mono · one-shot | important |  | Your skeleton crumbles. |
| `mon_minion_mage_cast` | 3 | 0.5s | mono · one-shot | important |  | Your skeletal mage's frost shard: a cold chime with a bone clack. |
| `mon_minion_golem_attack` | 3 | 0.7s | mono · one-shot | important |  | Bone Golem heavy swing: a creak and a thump. |
| `mon_minion_golem_die` | 2 | 1.5s | mono · one-shot | important |  | The golem collapses into a pile of bones. |
| `mon_scavenger_appear` | 1 | 1.2s | mono · one-shot | important |  | The Scavenger shows up (announce): a leathery rustle, a sack dragging, an unsettling cheerful whistle with no tune. |
| `mon_scavenger_race` | 1 | 1s | mono · one-shot | important |  | He spots a rare item and runs for it: a boot patter and a coin-purse jingle at 80% speed (loop-like, quiet). |
| `mon_scavenger_grab` | 1 | 1s | mono · one-shot | core |  | He grabs the loot first: a snatch, a greedy cackle, a satisfied clink. A loss sound; the player should feel it. |
| `mon_scavenger_flee` | 1 | 1s | mono · loop | polish |  | He runs away with it for 14 s: a faster jingle patter that fades with distance. |
| `mon_scavenger_caught` | 1 | 1.2s | mono · one-shot | important |  | You killed him and win it back: a clatter of dropped goods, a short sting. |
| `mon_scavenger_escape` | 1 | 1.5s | mono · one-shot | important |  | He escapes: a distant cackle and a vanishing jingle, a small defeat. |
| `mon_magpie_squeak` | 3 | 0.5s | mono · one-shot | important |  | The Magpie (event thief): a squeaking, chittering goblin that sheds coin as it flees: each 0.15 s of coin drop gets a jingle. |
| `mon_magpie_caught` | 1 | 1.2s | mono · one-shot | important |  | The thief is caught: a puff of smoke, a shower of coins. |

#### Elite modifier (affix) cues

`assets/sound/sfx/monsters/shared/` · 37 entries · 80 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `mod_fast` | 2 | 0.5s | mono · one-shot | polish |  | Fast: a rapid wind-up flurry that goes by in a rush, whooshing and pushing air. |
| `mod_extra_strong` | 2 | 0.6s | mono · one-shot | polish |  | Extra Strong: a deep growl rumble layered under the attack. |
| `mod_stalwart` | 2 | 0.5s | mono · one-shot | polish |  | Stalwart: a metallic ring under hits. |
| `mod_vampiric` | 2 | 0.5s | mono · one-shot | important |  | Vampiric heals on hit: a wet red gulp. |
| `mod_teleporter` | 3 | 0.5s | mono · one-shot | important |  | Teleporter blinks to you: an inward air suck, a short purple warble. |
| `mod_shielding_on` | 2 | 0.5s | mono · one-shot | important |  | Shielding becomes immune (white ring): a glassy ring, a bell ping that says "do not hit now". |
| `mod_shielding_off` | 2 | 0.4s | mono · one-shot | important |  | Shield drops: a short pop. |
| `mod_thorned` | 2 | 0.3s | mono · one-shot | polish |  | Thorns hurt you: a prickly snick. |
| `mod_regenerating` | 2 | 0.5s | mono · one-shot | polish |  | Regeneration tick: a soft green pulse. |
| `mod_mortar` | 3 | 0.6s | mono · one-shot | important |  | Mortar lobs a marked blast: a tube thump and whistle. |
| `mod_jailer` | 3 | 0.8s | mono · one-shot | important |  | Jailer marks the ground, then roots you: chains rattling out of the dark. |
| `mod_molten` | 2 | 0.6s | mono · one-shot | polish |  | Molten trail ignites: a gas whoosh and lingering crackle. |
| `mod_plagued` | 1 | 2s | mono · loop | polish |  | Plagued aura: a buzzing, bubbling fly-swarm hum (quiet loop on the monster). |
| `mod_aura_might` | 2 | 0.6s | mono · one-shot | important |  | Aura of Might red pulse: a low war-drum thump. |
| `mod_aura_haste` | 2 | 0.6s | mono · one-shot | important |  | Aura of Haste yellow pulse: a fast ticking shimmer. |
| `mod_mana_burn` | 2 | 0.5s | mono · one-shot | polish |  | Mana Burn: a blue sizzle as mana drains. |
| `mod_knockback` | 3 | 0.4s | mono · one-shot | polish |  | Knockback: a big shove, a grunt-less thump. |
| `mod_volley` | 3 | 0.6s | mono · one-shot | polish |  | Volley: a fan of shots, rattling. |
| `mod_frenzied` | 2 | 0.8s | mono · one-shot | polish |  | Frenzied below half life: a quick ragged shriek. |
| `mod_evasive` | 2 | 0.4s | mono · one-shot | polish |  | Evasive dodges: a quick scrape and swish. |
| `mod_armoured` | 2 | 0.4s | mono · one-shot | polish |  | Armoured: a deflection ping on physical hits. |
| `mod_siege` | 3 | 0.6s | mono · one-shot | polish |  | Siege shells a still target at range: a mortar thump with a descending shell whistle. |
| `mod_splitting` | 2 | 0.9s | mono · one-shot | important |  | Splitting Legendary dies and splits in two: a wet crack and a double roar. |
| `mod_nova_charge` | 2 | 1.3s | mono · one-shot | important |  | Nova (Legendary): a huge swelling charge, red ring growing: a rising shriek that ends at the blast. |
| `mod_nova_blast` | 2 | 1.2s | mono · one-shot | important |  | The nova detonation: a heavy shockwave boom. |
| `mod_reflecting` | 2 | 0.8s | mono · one-shot | important |  | Reflecting shield: a mirror-bright metallic bounce that sends projectiles back. |
| `mod_vortex` | 2 | 1.2s | mono · one-shot | important |  | Vortex pulls you in: a growing wind-suck. |
| `mod_enraging` | 2 | 1.4s | mono · one-shot | important |  | Enraging below 30%: a roar that breaks and goes lower; ground rumble. |
| `mod_shadecaller` | 2 | 1s | mono · one-shot | important |  | Shadecaller summons shades: a handful of whispers peel out of the floor. |
| `mod_gravewalker` | 2 | 1s | mono · one-shot | polish |  | Gravewalker (21+): a grave-dirt rustle and a skeleton stirring. |
| `mod_siphoning` | 2 | 0.8s | mono · one-shot | polish |  | Siphoning: a hissing draw on your resources. |
| `mod_devouring` | 2 | 1s | mono · one-shot | polish |  | Devouring: a gnawing, a wet crunch as it eats corpses. |
| `mod_arcing` | 2 | 0.6s | mono · one-shot | polish |  | Arcing: a crackling jump. |
| `mod_hexing` | 2 | 0.8s | mono · one-shot | polish |  | Hexing: a curse seal whisper. |
| `mod_duplicating` | 2 | 0.8s | mono · one-shot | polish |  | Duplicating: a double-bell copy-pop. |
| `mod_undying_pact` | 3 | 1.2s | mono · one-shot | polish |  | Undying Pact: a shared heartbeat that connects two monsters; a PACT toll when one tries to die. |
| `mod_time_warp` | 2 | 1.2s | mono · one-shot | polish |  | Time Warp: a tape-slow-down warble in the world. |

### 4.4 Bosses and Fallen

*142 entries · 297 files · core 75 / important 208 / polish 14 · ≈ 4.5 MB encoded*

#### Shared boss sounds

`assets/sound/sfx/bosses/shared/` · 17 entries · 40 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `boss_banner` | 1 | 3s | stereo · one-shot | core |  | A boss name banner appears (`ui` story banner): a huge slow bell and a sub drop, a held dissonant chord. 3 s tail. |
| `boss_arena_seal` | 2 | 2s | mono · one-shot | core |  | Boss arena door seals behind you: a massive iron slam, rolling echo, a lock bar dropping. |
| `boss_arena_open` | 1 | 2s | mono · one-shot | important |  | The exit room opens after the kill: stones grinding apart. |
| `boss_phase` | 3 | 1.5s | mono · one-shot | core |  | Any boss phase threshold (60% / 25% etc.): a booming roar with a hard sub-bass hit; screen-shake sound. |
| `boss_enrage` | 2 | 1.8s | mono · one-shot | core |  | Enrage phase: a harsher, distorted roar, with tinnitus-like overtones. |
| `boss_telegraph` | 3 | 0.9s | mono · one-shot | important |  | A boss move's tele marker (when not a zone): a metallic scrape and charge-up swell, longer than normal enemies. |
| `boss_hit_taken` | 4 | 0.4s | mono · one-shot | polish |  | A heavier, slower layer when a boss is hit (stone/giant): makes each hit feel like it matters. |
| `boss_die_generic` | 1 | 3.5s | mono · one-shot | core |  | Generic boss death: a drawn, wrenching collapse, a bass rumble and a long reverb tail. |
| `boss_kill_hush` | 1 | 3s | stereo · one-shot | important |  | After the kill the room goes briefly quiet: a ringing low note settling to silence; ambience fades back in over 3 s. |
| `boss_loot_burst` | 1 | 2s | mono · one-shot | important |  | The boss's loot explodes out: a multi-coin cascade and a rarity-colour glint. |
| `boss_add_spawn` | 3 | 0.7s | mono · one-shot | important |  | Boss summons adds: a swell of voices and a rumble, bones/eggs hatching, etc. |
| `boss_slam` | 3 | 1s | mono · one-shot | important |  | Generic boss slam: a gigantic thump; used by any boss `slam` kind (Fire Nova, Grave Slam). |
| `boss_charge` | 3 | 1s | mono · one-shot | important |  | Generic boss charge: a run-up of stomps, a crash. Used by Pounce, Founder's lunges. |
| `boss_blink` | 3 | 0.8s | mono · one-shot | important |  | Boss teleport-strike (Grave Step, Infernal Leap, Rift Step): an inward suck, a drop, a heavy thud at arrival. |
| `boss_fan` | 3 | 0.8s | mono · one-shot | important |  | Boss projectile fan: a multi-shot spray. |
| `boss_ring` | 3 | 1s | mono · one-shot | important |  | Boss projectile ring: a radial outward release, ringing. |
| `boss_circles` | 3 | 1s | mono · one-shot | important |  | Boss ground circles detonate: an array of dull booms staggered 0.1 s. |

#### Morgrath the Gravelord (depth 5)

`assets/sound/sfx/bosses/gravelord/` · 11 entries · 24 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `boss_gravelord_alert` | 1 | 2.5s | mono · one-shot | core |  | Morgrath wakes: a ring of tolling funeral bell, a cavernous groan, a crown of bones clinking. |
| `boss_gravelord_sermon` | 3 | 0.9s | mono · one-shot | important |  | Sermon sweep: a slow heavy axe whoomp, a gravelly intake. |
| `boss_gravelord_name` | 3 | 1.4s | mono · one-shot | core |  | He reads a name and lights a grave: a deep single bell, a breath of whisper, a pulsing ring light: the pulse is a quiet ostinato of ~4 s that ends with a skeleton rising. Must be recognisable and time the 4 s. |
| `boss_gravelord_grave_rise` | 3 | 1s | mono · one-shot | important |  | The grave erupts: a skeleton claws up from the dirt. |
| `boss_gravelord_grave_safe` | 2 | 0.8s | mono · one-shot | important |  | You stood on the grave: a soft bell and a hush, the grave "accepts" it. |
| `boss_gravelord_count_loop` | 1 | 3s | stereo · loop | important |  | The Count (<50%): the ring of names orbits at 4.5 tiles: a slow chant of murmurs, a swirling chorus (no words). |
| `boss_gravelord_named_stack` | 3 | 0.5s | mono · one-shot | important |  | You gain a Named stack: a cold stamp, the sound of a name written in ink, pitch rising per stack to 10. |
| `boss_gravelord_lunge` | 3 | 0.8s | mono · one-shot | important |  | A Last Rites lunge: three in a row, increasingly heavy; a lunge swoosh, a heavy thump. |
| `boss_gravelord_raise_court` | 2 | 1.8s | mono · one-shot | important |  | Raise my court!: a deep rumble and a crowd of dead rising. |
| `boss_gravelord_bone_storm` | 2 | 1.2s | mono · one-shot | important |  | Ring of bone shards in an enraged spray. |
| `boss_gravelord_die` | 1 | 4s | stereo · one-shot | core |  | He falls: his crown breaks, a final funeral bell and a long exhale, then the bells go out one by one. |

#### Skarn "Mother" the Broodmother (depth 10)

`assets/sound/sfx/bosses/broodmother/` · 12 entries · 27 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `boss_broodmother_alert` | 1 | 2.5s | mono · one-shot | core |  | Skarn drops from the roof into the lantern light: skittering overhead, a groan of beams, a lantern chain rattling. |
| `boss_broodmother_roof_skitter` | 2 | 2s | mono · loop | important |  | While on the roof she is invulnerable: a ceiling-height skitter that pans around the room. |
| `boss_broodmother_sac_pulse` | 2 | 1s | mono · one-shot | important |  | An egg sac pulses with warmth: a slow wet heartbeat. 10 s fuse = pulses faster. |
| `boss_broodmother_sac_pop` | 3 | 0.8s | mono · one-shot | core |  | You pop an egg sac: a satisfying wet burst, a squeal of unhatched things; costs her 10%: a cry from above. |
| `boss_broodmother_hatch` | 3 | 1s | mono · one-shot | important |  | The sac hatches 3 spiders: a thick split and a scrabble of legs. |
| `boss_broodmother_drop` | 1 | 3s | mono · one-shot | important |  | She falls from the roof at 60% (or after 45 s): beams crack, a monstrous thud, the lantern swings. |
| `boss_broodmother_web_spit` | 3 | 0.6s | mono · one-shot | important |  | Venom web spit: a hawk-and-hiss. |
| `boss_broodmother_pounce` | 3 | 1s | mono · one-shot | important |  | Pounce: a leaping click and a heavy body slam. |
| `boss_broodmother_charge` | 3 | 1s | mono · one-shot | important |  | Hungry (60%): she charges the nearest minion, then you: a skitter that builds into a stampede; poison pools sizzle behind her. |
| `boss_broodmother_eat` | 3 | 1.5s | mono · one-shot | important |  | Mother (25%): she walks to her brood and eats: a wet crunch and snap, heartbreakingly ugly. |
| `boss_broodmother_shriek` | 2 | 2s | mono · one-shot | core |  | Skarn shrieks in fury (<30%): a pained arachnid scream. |
| `boss_broodmother_die` | 1 | 4s | stereo · one-shot | core |  | Her lantern shatters, the light goes out, and she curls: a huge sigh, a rattle of legs drawn in, the lantern glass falling. |

#### Azgalor, the Ember Tyrant (depth 15)

`assets/sound/sfx/bosses/tyrant/` · 11 entries · 23 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `boss_tyrant_alert` | 1 | 3s | mono · one-shot | core |  | Azgalor rises from his slag throne: molten metal pouring, a bellows-roar, chains. |
| `boss_tyrant_hoard_loop` | 1 | 2s | mono · loop | important |  | He heals on the fire vein (+2%/s): a greedy furnace hum, white rings pulsing; pulls out of it with a tearing sound. |
| `boss_tyrant_nova` | 3 | 1s | mono · one-shot | important |  | Fire Nova slam. |
| `boss_tyrant_leap` | 3 | 1s | mono · one-shot | important |  | Infernal Leap: a rocket whoosh and a landing crash. |
| `boss_tyrant_grid_line` | 3 | 0.8s | mono · one-shot | important |  | Molten phase: a line of fire erupting (rows then columns): a hissing geyser-roar. Plays on each line as it ignites; 4 per set. |
| `boss_tyrant_grid_tele` | 2 | 1s | mono · one-shot | important |  | The lines about to ignite: a rising hot crackle. |
| `boss_tyrant_meteor` | 3 | 1.4s | mono · one-shot | important |  | Meteor on the player's spot (phase 3, every second): a whistle with a thump; keep short because it repeats every second. |
| `boss_tyrant_roar` | 2 | 3s | mono · one-shot | core |  | The Promise: he roars the names of those who forgot him: a roar with a rhythmic pattern and heat shimmer (no intelligible words). |
| `boss_tyrant_imps` | 2 | 1.2s | mono · one-shot | important |  | He calls imps: a gust of cackles and sparks. |
| `boss_tyrant_cinders` | 2 | 1s | mono · one-shot | important |  | Ring of Cinders: a pulse of burning rings. |
| `boss_tyrant_die` | 1 | 4.5s | stereo · one-shot | core |  | The Tyrant burns out: a roar that fades to a groan, the embers going out one by one, a long cooling tick and hiss. |

#### Xal'thuun, the Hollow Star (depth 20)

`assets/sound/sfx/bosses/hollow/` · 13 entries · 23 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `boss_hollow_alert` | 1 | 3.5s | stereo · one-shot | core |  | The Hollow Star opens: a vast eyelid of dark, a sub-bass drone and an impossibly cold bell; a long breath that is air going the wrong way. |
| `boss_hollow_gaze_loop` | 1 | 2s | mono · loop | core |  | The sweeping gaze beam: a thin, rising whine with a constant scan like radar; it is a spark line, 0.45 rad/s. Louder when it points at you (engine can pan/gain by angle). |
| `boss_hollow_gaze_hit` | 3 | 0.4s | mono · one-shot | important |  | You are in the beam with line of sight: a cold stinging tick that repeats per damage tick. |
| `boss_hollow_pull_loop` | 1 | 2s | mono · loop | important |  | Hollow (55%): it pulls you in within 10 tiles: a vacuum of air, a rising pressure whine; a dash breaks free with a pop. |
| `boss_hollow_pull_break` | 2 | 0.5s | mono · one-shot | important |  | You dash free of the pull. |
| `boss_hollow_shards_loop` | 1 | 2s | mono · loop | polish |  | Shard rings orbiting: quiet glass chimes revolving. |
| `boss_hollow_blackout_warn` | 1 | 1.6s | mono · one-shot | core |  | The audio warning for the blackout (the story spec asks for one): a rising, clearly audible wail followed by a hard silence 0.2 s before it vanishes. A cue for the player to turn around. |
| `boss_hollow_blackout_loop` | 1 | 2s | mono · loop | important |  | While the room is dark: a sub-bass pulse and the unmistakable absence of the ambience (engine ducks beds to 20%). |
| `boss_hollow_reopen` | 2 | 1.2s | mono · one-shot | core |  | It reopens behind you, 2 tiles away: a heavy pop and a blast; a loud, short, cathartic hit. |
| `boss_hollow_voidbolts` | 3 | 0.6s | mono · one-shot | important |  | Void Bolts fan. |
| `boss_hollow_well` | 3 | 0.9s | mono · one-shot | important |  | Void Wells open: low spatial pops. |
| `boss_hollow_starfall` | 3 | 1s | mono · one-shot | important |  | Starfall: a double ring of 14 orbs raining outward: bright chimes, a descending whistle. |
| `boss_hollow_die` | 1 | 5s | stereo · one-shot | core |  | It collapses inward: a monstrous inward pull, a pitch drop, a final bell, then a quiet bright sky: the sound of a held breath finally released. |

#### The Choir (depth 25)

`assets/sound/sfx/bosses/choir/` · 15 entries · 24 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `boss_choir_alert` | 1 | 4s | stereo · one-shot | core |  | The Choir wakes: a vast wordless chord of swallowed voices, a pillar of mouths opening one at a time; each a breath. |
| `boss_choir_note_low` | 1 | 1.2s | mono · one-shot | core |  | The Hymn ring at 2.5 tiles: a low sung note, safe (pale) variant and harmful (red) variant share the pitch but the harmful one has a harsh beating edge. Pitch D2. |
| `boss_choir_note_mid` | 1 | 1.2s | mono · one-shot | core |  | The ring at 4.5 tiles: the mid note (A2/D3). |
| `boss_choir_note_high` | 1 | 1.2s | mono · one-shot | core |  | The ring at 6.5 tiles: the high note (F3/A3). |
| `boss_choir_harm` | 3 | 0.8s | mono · one-shot | important |  | A harmful ring lands: a tearing dissonance, voice flayed. |
| `boss_choir_safe` | 2 | 0.8s | mono · one-shot | important |  | A safe ring passes harmlessly: a soft consonant chime, a reward. |
| `boss_choir_wrong` | 1 | 3s | mono · loop | core |  | Discord (50%): the wrong-note singer pulses with a sour out-of-key tone, circling; the two true singers hold the right note. Players listen for the odd one out. |
| `boss_choir_wrong_move` | 2 | 0.6s | mono · one-shot | important |  | The wrong note jumps to another singer: a slide and a click. |
| `boss_choir_singer_hurt` | 3 | 0.5s | mono · one-shot | important |  | Damage to the wrong singer: a flat, pitched crack. |
| `boss_choir_singer_immune` | 2 | 0.4s | mono · one-shot | important |  | You hit a true singer: a "no" tone, a ringing deflection. |
| `boss_choir_inhale` | 1 | 1.5s | mono · one-shot | core |  | Last Verse: a 1.5 s inhale: a huge rising breath of thousands. Hit it to silence it. Ends at the instant the blast would fire. |
| `boss_choir_silenced` | 1 | 1.5s | mono · one-shot | core |  | You interrupt the inhale: the sound cuts off dead, a hard break, then 3 s of silence (the engine mutes the music bed 3 s). |
| `boss_choir_blast` | 1 | 1.5s | mono · one-shot | core |  | Uninterrupted inhale: a 5.5-tile stunning blast: a gigantic chord that hits like a wall; a ringing in the ears (low-pass duck). |
| `boss_choir_note_tick` | 3 | 0.4s | mono · one-shot | polish |  | The last verse's notes at 1.0 s intervals use a faster plucked variant. |
| `boss_choir_die` | 1 | 6s | stereo · one-shot | core |  | The pillar collapses: its mouths close one by one into silence, a final single human note holds and stops: the voice of the one swallowed first. |

#### Oswin Marrow, the Hearthking (depth 30)

`assets/sound/sfx/bosses/hearthking/` · 15 entries · 29 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `boss_hearthking_alert` | 1 | 5s | stereo · one-shot | core |  | He stands from his throne in the founding hearth: a heavy sigh, a sword drawn, a warm hearth-fire roar that does not belong in this place. Tired, not cruel. |
| `boss_hearthking_swing` | 4 | 0.6s | mono · one-shot | important |  | Phase I swordsman: a clean, heavy blade swing, a ring-bright metal singing. |
| `boss_hearthking_combo` | 3 | 1.4s | mono · one-shot | core |  | The Founder's three-hit combo (glowing landing circles): three distinct strokes of rising weight: swing, swing, crash; the final one with a ground hit. |
| `boss_hearthking_roots` | 1 | 3s | mono · one-shot | core |  | Phase II (60%): roots tear him open: wood and flesh tearing apart, a huge crack, then the first pulse of the Ember (see below). |
| `boss_hearthking_ember_pulse` | 3 | 1s | mono · one-shot | core |  | Ember pulses: a deep heartbeat with a hot swell, the ember glowing; this is the damage-window cue. |
| `boss_hearthking_ember_exposed` | 1 | 1.5s | mono · one-shot | core |  | THE EMBER IS EXPOSED: the heart is out in the open: a bell-bright tone, a clear window; the sound rewards a quick alert reaction. |
| `boss_hearthking_ember_close` | 1 | 1s | mono · one-shot | important |  | The window closes: the heart is hidden again, a heavy thud. |
| `boss_hearthking_giant_rise` | 1 | 4s | stereo · one-shot | core |  | Phase III (25%): the giant's body; the floor heaves. A colossal groan of a body grown too big to move: a rock-slide and wet flesh. |
| `boss_hearthking_pulse_in` | 3 | 1s | mono · one-shot | core |  | The floor inverts on each heartbeat: an INWARD pulse (the danger is the middle), a suck and thump; low, long. |
| `boss_hearthking_pulse_out` | 3 | 1s | mono · one-shot | core |  | An OUTWARD pulse (the danger is on the rim): a bass swell and a shock-ring that expands; clearly different in shape from the inward one. |
| `boss_hearthking_factor_tick` | 2 | 0.4s | mono · one-shot | important |  | The man in grey counting dashes: a dry pencil tick on a wooden desk. (His voice lines belong to the later dialogue pass.) |
| `boss_hearthking_hurt` | 3 | 0.7s | mono · one-shot | polish |  | He is struck: a deep, labouring grunt of an old man that was a king. |
| `boss_hearthking_die` | 1 | 8s | stereo · one-shot | core |  | He falls: the sword hits the floor, the giant's body shudders and goes still, a last ember sigh. The room's warmth collapses to a hush. Leaves space for the stinger and the finale. |
| `rift_core_loop` | 1 | 4s | stereo · loop | important |  | The `rift_core` heart prop (2 tiles from the exit stairs on depth 30): a huge slow heartbeat with a warm pulse; the finale begins when you touch it. |
| `rift_core_touch` | 1 | 6s | stereo · one-shot | core |  | You take the Ember: a heartbeat, a rushing in, the world's warmth moves into your chest; the man in grey bows (cloth only). The sound of a story turning. |

#### The Fallen and shared Fallen sounds

`assets/sound/sfx/bosses/fallen/` · 40 entries · 95 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `fallen_banner` | 1 | 3s | stereo · one-shot | core |  | A Fallen first spotted (violet banner): a cold, human, wrong sound: a choir of one voice and a rusted bell, the sound of someone who used to be somebody. |
| `fallen_die` | 1 | 3.5s | stereo · one-shot | core |  | A Fallen dies: their burden finally set down: a long exhale, a bell, a small warm note. |
| `fallen_relic` | 1 | 3s | stereo · one-shot | core |  | The relic is granted: a bell-and-ring metal chime, a warm coal glow; unique per Fallen would be nice but one general sound is enough. |
| `fallen_hob_snuff` | 3 | 0.7s | mono · one-shot | important |  | Hob Garrow (d3): a brazier snuffed, a damp hiss and a gasp of dark. |
| `fallen_hob_relight` | 3 | 0.6s | mono · one-shot | important |  | He relights a brazier: a match strike, a fire catching. |
| `fallen_hob_hook` | 3 | 0.9s | mono · one-shot | important |  | The lamp-hook sweep (1.2 s glow): a long glowing arc, an iron hook whoosh with a lantern chink. |
| `fallen_hob_blind` | 2 | 0.9s | mono · one-shot | important |  | When all braziers are out he charges blind: a stampede in the dark. |
| `fallen_sefa_glide` | 2 | 2s | mono · loop | important |  | Sefa Lind (d6): a creaking rope gliding between anchors: a squeak of hemp and wind. |
| `fallen_sefa_cut` | 3 | 0.7s | mono · one-shot | core |  | You cut an anchor: a snapping rope, a crash as she drops, a stun. |
| `fallen_sefa_volley` | 3 | 0.8s | mono · one-shot | important |  | Fan volley of arrows: a bowstring flurry. |
| `fallen_sefa_snare` | 3 | 0.6s | mono · one-shot | important |  | Knotted snare triggers: a rope tightening, a root-like grip. |
| `fallen_brannoc_block` | 3 | 0.5s | mono · one-shot | important |  | Brannoc (d9): your hit is blocked at the front: a hard shield impact (shield fused to his arm). |
| `fallen_brannoc_charge` | 3 | 0.9s | mono · one-shot | important |  | Knockback charge: heavy running armour and a crash. |
| `fallen_brannoc_spikes` | 2 | 0.9s | mono · one-shot | important |  | The spike ring (below 50%): iron spikes erupting in a ring, a grinding rattle. |
| `fallen_odile_circle` | 3 | 0.9s | mono · one-shot | important |  | Odile Marr (d13): salt circles appear: grains and crystalline whispers. If you stand still: you crystallise: a stony freeze. |
| `fallen_odile_crystallise` | 2 | 0.8s | mono · one-shot | important |  | You stand still in the circle: your joints crystallise and lock. |
| `fallen_odile_brine` | 3 | 1s | mono · one-shot | important |  | Brine wave pushes you away: a rolling surf. |
| `fallen_odile_face` | 1 | 1.8s | mono · one-shot | important |  | Her true face (every 15 s, 3 s, +100% damage taken): a thin, cracking mask and a high, pained note. |
| `fallen_wren_vanish` | 2 | 0.8s | mono · one-shot | important |  | Wren Halloway (d16): she vanishes (3 s): a soft paper tear and a small clicking, like a pencil counting. |
| `fallen_wren_glint` | 3 | 0.8s | mono · one-shot | important |  | Arrows glint from the dark: a visual flash with a thin metallic ping; the ping comes 0.4 s before the arrow so players can react. |
| `fallen_wren_count` | 2 | 1.5s | mono · loop | polish |  | She stops to count: bone beads clicking in a rhythm that repeats; quiet. |
| `fallen_ashby_toll` | 3 | 2.5s | mono · one-shot | core |  | Brother Ashby (d19): the toll of a great bell: a massive, ringing hit with a long hum; stuns in 3.5 tiles. Tolls get faster as he weakens (play with a shorter tail at high speed: provide a 1.2 s tail cut too). |
| `fallen_ashby_toll_short` | 3 | 1.2s | mono · one-shot | important |  | The short toll (when tolls < 4 s apart). |
| `fallen_ashby_ghost` | 3 | 1s | mono · one-shot | important |  | Ghosts rise: three pale wails drifting to him. |
| `fallen_ashby_heal` | 2 | 0.8s | mono · one-shot | important |  | A ghost reaches him: he heals 6%: a gulp and a bell tone. |
| `fallen_corwin_knock` | 3 | 0.7s | mono · one-shot | core |  | Corwin Dask (d21): his hit knocks your gold loose: a coin purse rip and a scatter across the floor. |
| `fallen_corwin_collect` | 3 | 0.6s | mono · one-shot | important |  | He collects loose gold (+3% heal): a hungry coin-scoop. |
| `fallen_corwin_coins` | 3 | 0.8s | mono · one-shot | important |  | Coin barrage lines: a rain of coins whistling. |
| `fallen_corwin_foreclosure` | 2 | 1.3s | mono · one-shot | important |  | Foreclosure: a locking stamp, a heavy ledger slam and a chain-lock; the zone stays hostile 10 s. |
| `fallen_varr_nova` | 3 | 1s | mono · one-shot | important |  | Magister Varr (d24): a growing nova, a glass bottle humming, a rising hot hiss. |
| `fallen_varr_bottle` | 3 | 0.8s | mono · one-shot | important |  | Late-bursting bottles: a cork pop, glass shatter and a boom. |
| `fallen_varr_burn` | 2 | 0.8s | mono · one-shot | important |  | She burns herself: a pained inhale and flames licking at her robes. |
| `fallen_crane_shovel` | 3 | 0.7s | mono · one-shot | important |  | Old Tobiah Crane (d28): a slow shovel line, a long metal scrape and a dirt toss. |
| `fallen_crane_raise` | 3 | 1s | mono · one-shot | important |  | He raises the corpses you left: clods of earth falling off the dead. |
| `fallen_crane_piled` | 2 | 1s | mono · one-shot | important |  | Piled Dead shield him (<30%): a heap of bodies, a rustle and thud, shield up. |
| `fallen_ivo_thorn` | 3 | 0.9s | mono · one-shot | important |  | Ivo Marrow (d35-36): thorn walls grow in lanes: a creaking hedge and thorn rattle, 10 s. |
| `fallen_ivo_retreat` | 2 | 0.9s | mono · one-shot | important |  | He retreats through the roots: rustling wood. |
| `fallen_ivo_refusal` | 1 | 6s | stereo · one-shot | core |  | Refusal (every 15 s, 5 s): he kneels and holds still: a hush and one clear tone, tender, held for 5 s. If you hit him: the tone shatters (see `fallen_ivo_enrage`). If you spare him: it resolves warmly. |
| `fallen_ivo_enrage` | 1 | 2.5s | mono · one-shot | core |  | You struck him: the held tone breaks into a roar. A betrayal sound. |
| `fallen_ivo_spared` | 1 | 2.5s | mono · one-shot | important |  | You waited: the tone resolves, a quiet acceptance; he fights on cleanly. |

#### The Echo (your own ghost) and Corrupted adventurers

`assets/sound/sfx/bosses/echo/` · 8 entries · 12 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `echo_banner` | 1 | 3s | stereo · one-shot | core |  | The Echo of you is shown (banner): your own heartbeat played back with a ghostly tail, cold and reversed. |
| `echo_rise` | 1 | 2.5s | mono · one-shot | core |  | It rises from your corpse within 7 tiles: a ghostly inhale, armour rattling, your own voice breath reversed. |
| `echo_idle_loop` | 1 | 3s | stereo · loop | important |  | While it lies at the corpse: a faint breathing-and-heartbeat loop at the edge of the mix; lure sound. |
| `echo_attack` | 3 | 0.5s | mono · one-shot | important |  | Echo basic attack, played as the player's weapon sound with a ghostly low-pass and a reverb tail. |
| `echo_potion` | 1 | 0.6s | mono · one-shot | polish |  | Echo drinks a potion: the same drink but hollow (today `potion`). |
| `echo_hurt` | 3 | 0.5s | mono · one-shot | important |  | Echo is hurt: a hollow, whispery version of your class voice. |
| `echo_die` | 1 | 4s | stereo · one-shot | core |  | Echo slain: the ghost lets go of your things: a long exhale, a fall of faint bells; the bag stays on the corpse. A cathartic release. |
| `echo_loot` | 1 | 2s | mono · one-shot | important |  | The Echo's rare drop: a soft shimmer and a coin. |

### 4.5 Loot and items

*107 entries · 254 files · core 61 / important 150 / polish 43 · ≈ 2.6 MB encoded*

#### Drop sounds by rarity tier

`assets/sound/sfx/loot/` · 20 entries · 48 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `loot` | 3 | 0.5s | mono · one-shot | core | ✔ | (plays today, synthesised) plain drop (common/uncommon): a modest clink and thud of a few bits of kit on the floor. Quiet; the player will hear it hundreds of times an hour. |
| `drop_uncommon` | 3 | 0.5s | mono · one-shot | important |  | Uncommon (green): the plain drop plus a tiny bright green tinkle on top. |
| `loot_rare` | 3 | 0.9s | mono · one-shot | core | ✔ | (plays today, synthesised) good item (rare blue / magic purple): a bright clear chime rising in two notes, with a slight shimmer. |
| `drop_magic` | 3 | 1s | mono · one-shot | important |  | Magic (purple, slight glow): the rare chime with a deeper, glowing purple pad and a sparkle tail. |
| `loot_legendary` | 2 | 2.5s | mono · one-shot | core | ✔ | (plays today, synthesised) Legendary Elite (yellow): the best sound in the game. A rising golden fanfare: a big resonant bell strike, a swell, a sparkle cascade. The player's pulse should jump. Today synthesized arpeggio. |
| `drop_set` | 2 | 2s | mono · one-shot | important |  | Set piece (legendary + green tag): the legendary sound but with a distinct chain-link / interlocking chime to say "part of a set". |
| `drop_mythic` | 2 | 3.5s | stereo · one-shot | core |  | Legendary Mythic (orange): rarer and bigger than Elite: a low sub drop, a golden bell, a rising choir swell, a flame crackle, bell-like harmonics. A "rarest sound the player hears all week" moment, bridging into the stinger. |
| `drop_unique` | 2 | 3s | stereo · one-shot | core |  | Unique / Corrupted-promoted (red): dark, forbidden: a deep tolling bell, a descending minor motif, a lick of fire, a heartbeat; a bargain that is gladly taken. |
| `drop_rift` | 2 | 3.5s | stereo · one-shot | core |  | Rift tier (pink, pulsing): alien and shimmering: a glassy glissando, a pitch-bent pulsing tone matching the pulsing glow; an otherworldly heartbeat. |
| `lootbeam_glint` | 2 | 0.8s | mono · one-shot | important |  | Screen-edge glint for a legendary-tier drop beam (double beam): a quick shimmering whoosh at the edge; pans toward the item's side. |
| `loot_corrupt_drop` | 2 | 1.5s | mono · one-shot | important |  | Item is corrupted (tainted modifier): a low whispered hum and a subtle wrongness added to the drop sound. |
| `loot_bleached_drop` | 2 | 1.2s | mono · one-shot | important |  | Bleached item (Pallor II+ has hidden affix): a missing-note, whitened sound, a hiss of pale air. |
| `loot_bloodstone_drop` | 2 | 1.8s | mono · one-shot | important |  | Bloodstone drop: a thick wet heartbeat and a resonant, beautiful red chime. |
| `pile_merge` | 2 | 0.3s | mono · one-shot | polish |  | Piles merge on the floor (within 0.75 tiles): a small settle of loot sliding together. |
| `drop_land_weapon` | 3 | 0.5s | mono · one-shot | important |  | A weapon lands: an iron clatter, a dull scrape. |
| `drop_land_armor` | 3 | 0.5s | mono · one-shot | important |  | Armour lands: a heavy flat clank, strap rattle (plate), a soft thump (cloth). |
| `drop_land_jewelry` | 3 | 0.4s | mono · one-shot | important |  | A ring or amulet lands: a tiny tinkle and bounce. |
| `drop_land_potion` | 2 | 0.4s | mono · one-shot | polish |  | A potion lands: a glass thud. |
| `drop_land_gem` | 3 | 0.4s | mono · one-shot | important |  | A gem lands: a bright little tick, bouncing. |
| `drop_land_misc` | 2 | 0.4s | mono · one-shot | polish |  | Material, key, trophy, lore: a quiet thud. |

#### Pickup by item type, gold, materials

`assets/sound/sfx/loot/` · 35 entries · 86 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `pickup_weapon` | 3 | 0.35s | mono · one-shot | core |  | Weapon picked up: a metal scrape and a hide wrap. |
| `pickup_armor_cloth` | 3 | 0.35s | mono · one-shot | important |  | Cloth/robes picked up: a soft folding sound. |
| `pickup_armor_light` | 3 | 0.35s | mono · one-shot | important |  | Leather: a creak and a pat. |
| `pickup_armor_heavy` | 3 | 0.4s | mono · one-shot | important |  | Plate/mail: a metal clunk and rattle. |
| `pickup_jewelry` | 3 | 0.35s | mono · one-shot | core |  | Ring/amulet: a clean chain jingle and a ring tick. |
| `pickup_shield` | 3 | 0.4s | mono · one-shot | polish |  | Shield: a flat thump on wood. |
| `pickup_potion` | 3 | 0.3s | mono · one-shot | important |  | Potion to belt: a quick glass clink and a cork squeak. (Belt, not bag.) |
| `pickup_gem` | 3 | 0.3s | mono · one-shot | core |  | Gem: a pure ting with sparkle; the six gem kinds also have a flavour chime (below). |
| `pickup_bloodstone` | 2 | 1s | mono · one-shot | important |  | Bloodstone: a heartbeat thud and a deep red tone. |
| `pickup_tome` | 2 | 1.2s | mono · one-shot | important |  | Tome of Insight / XP tome: pages riffling and a faint choir note. A skill point arrives. |
| `pickup_lore` | 2 | 1.5s | mono · one-shot | important |  | A lore page (notes, journal): parchment crumple, a quiet hearth hum. |
| `pickup_key` | 2 | 0.8s | mono · one-shot | important |  | Key: a heavy iron clink. |
| `pickup_trophy` | 2 | 0.5s | mono · one-shot | polish |  | Trophy: a bony clunk. |
| `pickup_material` | 3 | 0.4s | mono · one-shot | important |  | Generic crafting mat in bag counter: a soft shuffle. |
| `mat_dust` | 3 | 0.4s | mono · one-shot | important |  | Dust: a puff of fine powder, a tiny shimmer. |
| `mat_shard` | 3 | 0.4s | mono · one-shot | important |  | Shard: a glassy tick. |
| `mat_essence` | 3 | 0.5s | mono · one-shot | important |  | Essence: a liquid drop with a ghostly sigh. |
| `mat_gemdust` | 3 | 0.4s | mono · one-shot | polish |  | Gem dust: sparkling sand. |
| `mat_riftshard` | 3 | 0.7s | mono · one-shot | important |  | Rift shard: a pulsing pink crystal hum and a deep glass note. |
| `mat_class` | 3 | 0.5s | mono · one-shot | polish |  | Class forge material: an ingot of metal ringing. |
| `gold` | 4 | 0.3s | mono · one-shot | core | ✔ | (plays today, synthesised) single gold pickup. Today two sine notes. Small-coin clink: bright, short; plays at most 6 times per second. |
| `gold_small` | 4 | 0.4s | mono · one-shot | important |  | A few coins: a light handful. |
| `gold_medium` | 3 | 0.6s | mono · one-shot | important |  | A bigger handful: a cascade of coins clinking. |
| `gold_large` | 3 | 0.9s | mono · one-shot | important |  | A purse of gold: a heavier jingle with a cloth thud. |
| `gold_hoard` | 2 | 1.5s | mono · one-shot | important |  | A chest-sized hoard (5,000+): a heavy gold crash. |
| `gold_spend` | 3 | 0.5s | mono · one-shot | important |  | Gold paid (not at vendors): coins leaving the hand, a single purse thunk. |
| `pile_open` | 2 | 0.4s | mono · one-shot | important |  | A pile sheet opens (tap on a pile): items shuffling. |
| `pile_take_all` | 2 | 0.8s | mono · one-shot | core |  | Take-all: a sweep of everything into the bag in one fast run of clinks and rustles, one sound not N. |
| `pickup_full` | 2 | 0.3s | mono · one-shot | important |  | The bag is full: a dull stuffed-bag thud. (Not an error buzz.) |
| `gem_chime_ruby` | 1 | 0.7s | mono · one-shot | polish |  | Ruby: a warm, resonant, red-brass chime (pitch D). |
| `gem_chime_sapphire` | 1 | 0.7s | mono · one-shot | polish |  | Sapphire: a cool, glassy chime (pitch E). |
| `gem_chime_emerald` | 1 | 0.7s | mono · one-shot | polish |  | Emerald: a green, woody chime, a hint of leaf (pitch F#). |
| `gem_chime_topaz` | 1 | 0.7s | mono · one-shot | polish |  | Topaz: a bright golden bell (pitch G). |
| `gem_chime_amethyst` | 1 | 0.7s | mono · one-shot | polish |  | Amethyst: a mystical, purple pad chime (pitch A). |
| `gem_chime_diamond` | 1 | 0.9s | mono · one-shot | polish |  | Diamond: a pure, crystalline high bell with long decay (pitch B). |

#### Equipment: equip, sockets, gems, upgrades, forge and mystic

`assets/sound/sfx/loot/` · 40 entries · 93 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `equip` | 3 | 0.4s | mono · one-shot | core | ✔ | (plays today, synthesised) equip: a satisfying buckling-on of gear: strap and metal click. Generic fallback. |
| `equip_weapon` | 3 | 0.4s | mono · one-shot | important |  | Weapon equipped: a sheath-and-draw, a grip tightened. |
| `equip_armor_cloth` | 3 | 0.4s | mono · one-shot | important |  | Robe/cloth: a swish. |
| `equip_armor_light` | 3 | 0.4s | mono · one-shot | important |  | Leather: strap pull and creak. |
| `equip_armor_heavy` | 3 | 0.5s | mono · one-shot | important |  | Plate: a heavy clank and latch. |
| `equip_shield` | 3 | 0.4s | mono · one-shot | polish |  | Shield onto the arm: a strap clunk. |
| `equip_jewelry` | 3 | 0.4s | mono · one-shot | important |  | Ring/amulet: a clasp click and fine chain. |
| `equip_belt` | 3 | 0.4s | mono · one-shot | polish |  | Belt buckle. |
| `unequip` | 3 | 0.35s | mono · one-shot | important |  | Removing gear: a lighter rustle of straps. |
| `equip_upgrade_arrow` | 1 | 0.2s | mono · one-shot | polish |  | The item you tapped is better than yours (▲ verdict): a tiny upward tick. |
| `equip_matched` | 2 | 1s | mono · one-shot | important |  | Matched bonus 2 or 4 pieces: a matching click as the pieces "lock" into a set look, a warm chime. |
| `set_bonus` | 2 | 1.5s | mono · one-shot | important |  | A set bonus tier reached: a ringing chain. |
| `socket_add` | 2 | 1.2s | mono · one-shot | important |  | Blacksmith adds a socket: a drill-and-hammer, a crunch and a small ring of sparks. Today `equip`. |
| `socket_gem` | 3 | 0.8s | mono · one-shot | core |  | A cut gem set into a socket: a precise click of a stone into metal and a sparkle. |
| `socket_blood` | 2 | 1.5s | mono · one-shot | important |  | A bloodstone is set (permanent!): a wet, heavy press and a heartbeat; a gravity-heavy confirm. The confirm dialog gets `ui_confirm_permanent`. |
| `unsocket_gem` | 2 | 0.7s | mono · one-shot | important |  | Gem removed: a pry and pop. |
| `gem_combine` | 2 | 1.5s | mono · one-shot | important |  | Three gems fuse into the next tier: three notes converging into a higher chord. |
| `gem_upgrade` | 2 | 1.5s | mono · one-shot | important |  | Blacksmith cuts a gem to a higher tier: a grinding wheel and a final shine. |
| `forge_hammer` | 4 | 0.5s | mono · one-shot | core |  | An anvil hit: iron hammer on steel, the town's backbone sound. Used for any blacksmith action. |
| `forge_upgrade` | 3 | 1.5s | mono · one-shot | core |  | Item +1 to +5: hammer strikes, a sizzle in water, a tone rising with each plus level (5 pitches; combine with `forge_hammer`). |
| `forge_upgrade_max` | 1 | 2.5s | mono · one-shot | important |  | +5 reached: the glow of the metal, a double-chime. |
| `salvage` | 3 | 0.8s | mono · one-shot | core |  | Salvage into mats: a metal crush, scraps falling into a bin. Today `click`. |
| `cleanse` | 2 | 2s | mono · one-shot | important |  | Blacksmith cleanses a corrupted item: a hissing purge, a black fluid draining away, a quiet clean ring. |
| `item_cleansed` | 1 | 1.5s | mono · one-shot | important |  | Event: the cleansed item rings clean. The corruption whisper stops. |
| `gamble_roll` | 3 | 1s | mono · one-shot | important |  | Mystic gamble: cards shuffling, bones rattled in a cup. |
| `gamble_reveal` | 4 | 1.2s | mono · one-shot | important |  | The gamble reveals: a tarot card flip; the rarity result is represented by the drop sound (use `drop_*`). |
| `reroll_affix` | 3 | 1.2s | mono · one-shot | important |  | Reroll an affix (mystic): arcane fire and a cracking glass sound. |
| `reroll_lock` | 1 | 0.4s | mono · one-shot | polish |  | A corrupted mod / unique mod cannot be rerolled: a "no" chink. |
| `item_lock` | 2 | 0.3s | mono · one-shot | important |  | Lock toggled on: a small padlock click. |
| `item_unlock` | 2 | 0.3s | mono · one-shot | polish |  | Lock toggled off: a lighter padlock click. |
| `item_sort` | 1 | 0.6s | mono · one-shot | polish |  | The bag sorts itself: a quick riffle of items. |
| `item_reveal_bleached` | 2 | 2s | mono · one-shot | important |  | A bleached item is revealed in town (its "???" affix shows): a drawn breath, a pale hiss resolving into colour. |
| `item_awaken` | 3 | 2.5s | mono · one-shot | core |  | An item awakens a themed affix at 250/1000/5000 kills: three escalating versions (a soft whisper, a bell, a surge). Awakening is a long-term reward. |
| `item_stash` | 2 | 0.4s | mono · one-shot | important |  | Item to the stash: a quick chest-lid thump. |
| `item_stash_take` | 2 | 0.4s | mono · one-shot | important |  | Item out of the stash. |
| `chute_send` | 3 | 1.2s | mono · one-shot | core |  | The chute: an item slides down a long wooden tube and thuds into the crate far above: whoosh, a hollow thump with a long echo. It is "sending" loot topside. |
| `chute_full` | 1 | 0.6s | mono · one-shot | important |  | The crate up top is full: a dull stuffed thump, a rattle of the chute. |
| `chute_open` | 1 | 0.8s | mono · one-shot | important |  | Opening the chute prop: a hatch creak. |
| `surface_open` | 1 | 0.8s | mono · one-shot | important |  | Opening the surface crate in town: a heavy wooden lid, a rattle of piled loot. |
| `surface_take` | 3 | 0.4s | mono · one-shot | polish |  | Taking an item from the crate. |

#### Economy and the Curator

`assets/sound/sfx/loot/` · 12 entries · 27 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `buy` | 3 | 0.6s | mono · one-shot | core | ✔ | (plays today, synthesised) purchase: a coin handover, a satisfied pouch clink, a cloth wrap. |
| `sell` | 3 | 0.6s | mono · one-shot | core | ✔ | (plays today, synthesised) sale: coins counted into a palm, falling pitches. |
| `buy_potion` | 2 | 0.6s | mono · one-shot | polish |  | Buy a potion: coins and a glass clink. |
| `buyback` | 2 | 0.8s | mono · one-shot | polish |  | Buy back a sold item: coins at a premium: a slightly regretful clink. |
| `sell_all` | 2 | 1.5s | mono · one-shot | important |  | "Sell all <= rarity": a long cascade of coins pouring, ~1.5 s. |
| `purchase_denied` | 2 | 0.4s | mono · one-shot | important |  | Not enough gold: a coin purse dull thunk with a thin ring. |
| `junk_send` | 2 | 0.8s | mono · one-shot | important |  | Send junk (auto): items rattling down a short slope. |
| `relic_combine` | 1 | 8s | stereo · one-shot | core |  | At the Elder's hearth, all ten relics combined: ten different notes (one per Fallen) layering into a hearth chord, the founding hearth flaring. The emotional peak of the Fallen arc. |
| `relic_view` | 2 | 1s | mono · one-shot | polish |  | Opening the relics panel: a case lid and a faint chime. |
| `curator_stitch` | 3 | 0.9s | mono · one-shot | core |  | The Curator registers a piece: needle, black thread pulled through mail rings, a ledger tick. Isra's sound. |
| `collection_page` | 2 | 2s | mono · one-shot | important |  | A Collection Book page completes: a page turn and a soft chord. |
| `collection_tier` | 3 | 3s | stereo · one-shot | important |  | Collection tier 5/15/all: warmer layered chords; the largest has a quiet prayer-like choir. |

### 4.6 World and props

*59 entries · 105 files · core 31 / important 44 / polish 30 · ≈ 1.8 MB encoded*

#### Chests, containers and breakables

`assets/sound/sfx/world/` · 11 entries · 25 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `chest` | 3 | 1.3s | mono · one-shot | core | ✔ | (plays today, synthesised) chest open: a heavy lid creak, a thump, a rattle of loot. The player's best-known sound; keep the chest-open creak <0.5 s so the reward sparkle can follow. |
| `chest_locked` | 2 | 0.6s | mono · one-shot | important |  | A locked lockdown chest rattles: iron lock and chain rattle. |
| `chest_unlock` | 1 | 1s | mono · one-shot | important |  | Lockdown cleared, the chest unlocks: a heavy bolt and a click, a warm glow. |
| `chest_open_rare` | 2 | 1.8s | mono · one-shot | important |  | Opening a chest with a better roll (rarityFloor rare, vault, gradeFloor): the same, with a golden swell: reward-first. (The contents' `drop_*` sound follows.) |
| `barrel_break` | 4 | 0.7s | mono · one-shot | core |  | A barrel smashed: wood staves splintering, a metallic hoop ring, liquid slosh. The most common destructible. |
| `crate_break` | 4 | 0.7s | mono · one-shot | core |  | A crate smashed: dry wood splinters, a sharp crack. |
| `secret_open` | 2 | 2s | mono · one-shot | important |  | Secret crate breaks and the hidden cache closet opens: a stone slide, a hidden mechanism, dust. A discovery sound. |
| `bones_break` | 3 | 0.5s | mono · one-shot | polish |  | Kicking a pile of bones: a brittle crunch. |
| `pillar_hit` | 2 | 0.4s | mono · one-shot | polish |  | Hitting a pillar/tombstone with a wasted swing: a dull stone ding. |
| `vault_open` | 1 | 2s | mono · one-shot | important |  | The Key Hunt vault opens: a heavy vault door and a trove of coin, a tumbler turn. |
| `vault_seal` | 1 | 2s | mono · one-shot | important |  | The vault locks when time runs out: a massive bolt slam. |

#### Doors, gates, stairs, portals, waypoints

`assets/sound/sfx/world/` · 18 entries · 33 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `door` | 3 | 1s | mono · one-shot | core | ✔ | (plays today, synthesised) heavy door: a deep wood creak and a dull thud. Today bandpass-noise. |
| `door_close` | 2 | 0.8s | mono · one-shot | polish |  | A door closes: a thud and latch. |
| `door_locked` | 2 | 0.4s | mono · one-shot | important |  | A locked door rattles: a chain jangle. |
| `gate_slam` | 3 | 1.5s | mono · one-shot | core |  | Lockdown gates slam shut around the room: a massive iron clank, a bar dropping, a rumble that rolls through the floor. A trap-springing sound. |
| `gate_open` | 2 | 1.5s | mono · one-shot | important |  | Gates rise on clear: iron chains and grinding. |
| `stairs` | 3 | 1s | mono · one-shot | core | ✔ | (plays today, synthesised) descending: four boot steps on stone with echo. Today synthesized. |
| `stairs_up` | 3 | 1s | mono · one-shot | important |  | Ascending a stair run: boot steps going up, a slight breath. |
| `portal_open` | 1 | 2s | mono · one-shot | core |  | Town portal opens (`townPortal`): a tearing of blue light, a hum of resonance and a gust of warm air. |
| `portal_loop` | 1 | 3s | stereo · loop | important |  | A standing portal's hum: a low shimmering warble; plays when within 8 tiles. |
| `portal_enter` | 2 | 1.5s | mono · one-shot | core |  | Stepping through a portal: a loud suck, a bass whoosh and silence; the world fades. |
| `portal_close` | 1 | 1s | mono · one-shot | polish |  | The portal vanishes: a sucked-in pop. |
| `waypoint_unlock` | 1 | 3s | stereo · one-shot | core |  | A new waypoint is activated (boss kill, depth): a brass-bell chime and a carved stone humming alive: the sound of progress. |
| `waypoint_use` | 2 | 1.5s | mono · one-shot | important |  | Waypoint depth picker opens: stone resonance with your footfalls. |
| `waypoint_travel` | 1 | 2s | mono · one-shot | important |  | Choosing a depth: the world slides: a deep whoosh and a thump. |
| `dungeon_entrance` | 2 | 2s | mono · one-shot | core |  | Town dungeon entrance interact: a cavernous inhale; a cold draft up from below, distant echoes. |
| `ropelift_ride` | 1 | 3s | mono · one-shot | important |  | Pell's rope-lift at Lamp Camp: ropes creaking and a pulley groan, a cage rattle. |
| `stash_open` | 2 | 0.8s | mono · one-shot | important |  | Opening your stash: a heavy iron-bound chest lid. |
| `corpse_found` | 1 | 1.5s | mono · one-shot | important |  | Walking up to your corpse prop: bones and cloth rustle. |

#### Shrines, bargains, fires and town props

`assets/sound/sfx/world/` · 21 entries · 27 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `shrine` | 2 | 2s | mono · one-shot | core | ✔ | (plays today, synthesised) shrine blessing: a sustained warm choir-like triad that rises and fades. Today synthesized. |
| `shrine_bargain_offer` | 1 | 2.5s | mono · one-shot | core |  | A bargain shrine speaks (the two-button prompt appears): a hushed whisper, a heavy iron drop, a held minor chord. A deal is offered; do not make it sound friendly. |
| `shrine_bargain_accept` | 1 | 2.5s | mono · one-shot | core |  | You accept: a seal pressed into hot wax and a heavy handshake of drums; per-bargain tails below. |
| `bargain_blood_tithe` | 1 | 2s | mono · one-shot | important |  | Blood Tithe: a vein pulling out of the chest: a wet tug and a cold chill. (-25% max life) |
| `bargain_dry_vow` | 1 | 1.5s | mono · one-shot | important |  | Dry Vow: bottles smashing in a silent room; a cork and a vow. |
| `bargain_the_hunt` | 1 | 2.5s | mono · one-shot | important |  | The Hunt: a horn in the distance, hooves, a pale thing is sent: a growing dread. |
| `bargain_glass_heart` | 1 | 2s | mono · one-shot | important |  | Glass Heart: a glass pane cracking in a chest; a fragile ring as though your heart were crystal. |
| `shrine_bargain_decline` | 1 | 1s | mono · one-shot | polish |  | You decline: the whispers withdraw and the room warms a little. |
| `shrine_corrupt` | 2 | 2.5s | mono · one-shot | important |  | A rift/corrupt shrine (`shrineKind:'corrupt'`): a fleshy pulse, a purple note that curdles. |
| `shrine_idle_loop` | 1 | 3s | mono · loop | polish |  | An un-used shrine hums softly when you are within 6 tiles. |
| `torch_loop` | 1 | 3s | mono · loop | polish |  | Wall torch: a quiet flicker/crackle loop, positional (engine fades by distance). One loop, repeated. |
| `brazier_loop` | 1 | 3s | mono · loop | polish |  | A brazier (Hob's): a larger fire with deeper roar; also the town's braziers. |
| `campfire_loop` | 1 | 4s | stereo · loop | important |  | A campfire (camps, town square): a dense warm crackle with settling logs. |
| `campfire_ignite` | 1 | 1s | mono · one-shot | polish |  | A campfire/town hearth lit as warmth increases. |
| `fountain_loop` | 1 | 4s | stereo · loop | polish |  | Town fountain (when running): water over stone. |
| `well_capped` | 1 | 0.8s | mono · one-shot | polish |  | The capped old well: a hollow thud when tapped. |
| `rift_crystal_loop` | 1 | 3s | mono · loop | important |  | Rift crystals and shards around the town fissure and the boss arena: a pitched, pulsing crystal hum, slightly sickly. |
| `town_fissure_loop` | 1 | 6s | stereo · loop | important |  | The rift fissure in the town plaza: a deep exhale of warmth and stone grinding; slowly deteriorates into a gasp at warmth 0. 5-tile CHASM. |
| `stall_cloth` | 2 | 1s | mono · one-shot | polish |  | Market stall awning flapping (warmth >= 2): cloth snapping in a draught. |
| `sign_creak` | 2 | 1s | mono · one-shot | polish |  | A creaking hanging sign. |
| `bush_rustle` | 3 | 0.5s | mono · one-shot | polish |  | Walking through a bush/tree: leaves and twigs. |

#### Terrain hazards and floor events

`assets/sound/sfx/world/` · 9 entries · 20 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `lava_burn_loop` | 1 | 1s | mono · loop | core |  | Standing in lava (4% max life/s, fire): a spitting, sizzling hiss at your feet; fades when you leave. |
| `lava_pop` | 3 | 0.4s | mono · one-shot | polish |  | Lava surface bubbles and pops: ambient, positional if lava is within 6 tiles. |
| `water_splash` | 3 | 0.5s | mono · one-shot | important |  | Entering shallow water: a bigger splash than a step. |
| `water_exit` | 2 | 0.5s | mono · one-shot | polish |  | Leaving the water: a dripping step. |
| `rockfall` | 4 | 1.2s | mono · one-shot | important |  | Collapse event (25 s of falling rock): one rock striking the ground: a grinding smash and rubble patter. Plays for each zone detonation; 2 per 0.5-0.95 s. |
| `rockfall_tele` | 3 | 1s | mono · one-shot | important |  | The rock about to fall: a tiny creaking and trickle of dust above you. |
| `cavein_rumble` | 1 | 4s | mono · loop | important |  | The cave-in as a whole: a rumble loop under the event; stops at the end. |
| `fissure_pulse` | 2 | 2s | mono · one-shot | polish |  | A corruption fissure on the map pulses: a heart-like thud. |
| `corrupt_growth_loop` | 1 | 4s | mono · loop | polish |  | Tainted growth and veins (deep floors): a quiet wet creak and gurgle. |

### 4.7 Events and systems

*92 entries · 146 files · core 55 / important 73 / polish 18 · ≈ 2.7 MB encoded*

#### Flow, Close Call and Heat (the skill-reward loops)

`assets/sound/sfx/systems/` · 15 entries · 31 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `close_call` | 3 | 0.9s | mono · one-shot | core |  | CLOSE CALL: standing in a telegraph and slipping out as it lands: a bright, razor-quick whoosh with a time-slowing "thud-ping"; a hit of silence then a ring; gets a quiet doubling for each stack (+15% x3). The signature skill sound of the game. |
| `close_call_stack` | 3 | 0.5s | mono · one-shot | important |  | A Close Call stack added, 1-3 (pitch rising): a rising ping over the whoosh. |
| `flow_chain_two` | 2 | 0.7s | mono · one-shot | core |  | Flow chain of 2 within 8 s: a rising tone, with more lift each step; pre-trigger. |
| `flow_chain_three` | 2 | 1.2s | mono · one-shot | core |  | Flow chain 3 TRIGGERS slow-motion (timeScale 0.35 for 0.45 s game time = ~1.3 s real): a massive time-warp whoosh: low-pass sweep down, a heartbeat, the world drops in pitch; then `flow_end`. Pair with `flow_slow_loop`. |
| `flow_chain_four` | 2 | 1.2s | mono · one-shot | important |  | Chain 4: the same plus a sparkling refill of dash charges (a bright chime). |
| `flow_chain_five` | 2 | 1.5s | mono · one-shot | core |  | Chain 5+: the same plus cooldown refill (a rapid-fire ticking and a big sub-bass bloom). The best skill reward sound in the game, not a nag. |
| `flow_slow_loop` | 1 | 1.5s | mono · loop | important |  | While time is slowed: a thick low drone, a dilated heartbeat; the engine low-passes the sfx bus briefly. |
| `flow_end` | 2 | 0.8s | mono · one-shot | important |  | Time snaps back: a snap, a high whoosh, a recovering tinnitus ring. |
| `flow_crit_ready` | 1 | 0.5s | mono · one-shot | important |  | `flow_crit` effect is ready (next hit guaranteed crit): a bright charged shimmer; the crit hit itself then uses `crit_big`. |
| `ember_spawn` | 3 | 0.3s | mono · one-shot | important |  | An ember drops from a kill (35% chance): a tiny flicker pop with a soft glow. |
| `heat_gain` | 4 | 0.4s | mono · one-shot | core |  | You sweep an ember: a warm ignition tick; pitch rises for each stack 1-10 (use 3 cuts: low/mid/high, the engine picks by stack count). |
| `heat_loss` | 2 | 0.5s | mono · one-shot | polish |  | Heat drops by 1 (6 s without a pickup): a soft fire-cooling hiss. |
| `heat_knock` | 2 | 0.8s | mono · one-shot | important |  | A big hit knocks out half your Heat: an ember-scattering crash. |
| `heat_max` | 1 | 2s | mono · one-shot | important |  | Heat 10 reached: a rush of flames, a roar of warmth; a Mark feat can come from holding this for 20 s. |
| `heat_loop` | 1 | 3s | stereo · loop | polish |  | At Heat 6+: a quiet warm crackle at the edge of the mix (positional to you), amplitude by stack. |

#### Marks, perks, wagers

`assets/sound/sfx/systems/` · 16 entries · 24 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `perk_buy` | 3 | 0.8s | mono · one-shot | core |  | A perk bought with a point: a pen stamping a ledger, a chord settles in. |
| `perk_keystone` | 2 | 2s | mono · one-shot | core |  | Keystone (tier 5, cost 3): a heavy stone seal with a drawn-out bell, a long reverberating chord; this is a rule-changing decision. |
| `perk_mark_earned` | 2 | 2.5s | mono · one-shot | core |  | A Mark feat earned (S-grades, Flow ×5, Heat 10 hold...): a bright, ceremonial chime and a flame glinting; worth showing off. |
| `perk_mark_spent` | 2 | 1.2s | mono · one-shot | important |  | A Mark spent on a perk: the mark burns into the tree. |
| `perk_wager_open` | 2 | 2.5s | mono · one-shot | core |  | The Wager: a candle lit; your life as the stake: a tense, quiet flame, a heartbeat, a coin flipped in a dark room. The HUD shows a candle. |
| `perk_wager_won` | 1 | 3s | stereo · one-shot | core |  | Reach town alive: the candle burns strongly; the perk is yours permanently: a warm bell, chimes and the heartbeat resolves. |
| `perk_wager_lost` | 1 | 3s | stereo · one-shot | core |  | You die with the wager open: the candle gutters and goes out: a hollow whoosh and a lone cold note. |
| `perk_respec` | 2 | 1.5s | mono · one-shot | important |  | Respec the perk tree: pages unstitched and burned. |
| `perk_locked` | 1 | 0.3s | mono · one-shot | important |  | Tapping a locked perk: a soft thud. |
| `classgoal_done` | 2 | 2.5s | mono · one-shot | important |  | A class goal completed (reward Mark/title): a drawn bell and a weighty chime: a stamp. |
| `title_earned` | 1 | 3s | mono · one-shot | important |  | A title earned (Bearer of the Ember, Heir of the Fallen, class goal titles): a ceremonial brass-and-bell note. |
| `milestone_tier_one` | 1 | 1s | mono · one-shot | important |  | Lifetime milestone tier 1 (of 5): a small, honest chime. Milestones: Butcher's Tally, Returned, Hair's Breadth... |
| `milestone_tier_two` | 1 | 1.2s | mono · one-shot | important |  | Tier 2. |
| `milestone_tier_three` | 1 | 1.5s | mono · one-shot | important |  | Tier 3. |
| `milestone_tier_four` | 1 | 1.8s | mono · one-shot | important |  | Tier 4. |
| `milestone_tier_five` | 1 | 3s | stereo · one-shot | important |  | Tier 5: the full version: a tall bell with a brass swell. |

#### Timed events, lockdowns, floor flow and grades

`assets/sound/sfx/systems/` · 26 entries · 38 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `event_start` | 2 | 1.5s | mono · one-shot | core |  | A timed event begins (toast): a war-horn-like single note and a clock tick under it: urgency. Each event has its own pitch variant below. |
| `event_gauntlet_beacon` | 1 | 2s | mono · loop | important |  | The gauntlet beacon (16-26 tiles away, pulsing ring): a pulsing mint tone, positional so you hear which direction it is. Gets faster as you get closer. |
| `event_gauntlet_spawn` | 3 | 0.6s | mono · one-shot | important |  | A wave of monsters spawn near you every 3.5 s: smoke puffs and growls. |
| `event_keyhunt_start` | 1 | 1.2s | mono · one-shot | important |  | Key Hunt: a clanking lock; the five crates are marked. |
| `event_key_found` | 1 | 1.5s | mono · one-shot | core |  | You find the key: a heavy iron key chime, a lock mechanism turning; "the vault opens". |
| `event_collapse_start` | 1 | 2s | mono · one-shot | important |  | The roof starts to come down: a rumble swelling, dust trickle. |
| `event_thief_start` | 1 | 1.2s | mono · one-shot | important |  | The Magpie appears: a squeak, flapping wings, a coin spill. |
| `event_win` | 1 | 2s | mono · one-shot | core |  | Event success: a bright triumphant sting (a few notes); reward chest sparkle follows. |
| `event_fail` | 1 | 1.5s | mono · one-shot | important |  | Event failure: a droning descending tone, a coin purse stolen sound. |
| `timer_tick` | 2 | 0.3s | mono · one-shot | important |  | The last 10 s of any event timer: a ticking clock, one per second, with the last 3 louder. |
| `timer_expire` | 1 | 1s | mono · one-shot | important |  | The timer expires: a dull gong. |
| `lockdown_wave` | 3 | 1.5s | mono · one-shot | core |  | A lockdown wave spawns: a horn and a stir of voices; each wave heavier; the last (legendary wave) adds a rumble. |
| `lockdown_clear` | 1 | 3s | stereo · one-shot | core |  | The room is cleared: a relieved resolution of the battle, a chord, a lock tumbling; the chests unlock. |
| `lockdown_failsafe` | 1 | 1.5s | mono · one-shot | polish |  | Failsafe lifts the lockdown unrewarded: a quiet gate chain. |
| `grade_s` | 1 | 2.5s | mono · one-shot | core |  | Clear grade S: a victorious, golden bell and a rising flourish; the fastest and cleanest floors are rewarded. |
| `grade_a` | 1 | 2s | mono · one-shot | important |  | Grade A: a golden chime and a short flourish. |
| `grade_b` | 1 | 1.5s | mono · one-shot | important |  | Grade B: a pleasant chime. |
| `grade_c` | 1 | 1s | mono · one-shot | polish |  | Grade C: a dull ding. |
| `grade_d` | 1 | 0.8s | mono · one-shot | polish |  | Grade D: a flat, unimpressed tap. |
| `grade_chest` | 1 | 1s | mono · one-shot | important |  | The grade chest appears beside you on arrival: a glint and a drop. |
| `floor_enter` | 3 | 2.5s | mono · one-shot | core |  | Arriving on a new floor: a heavy moment: the dungeon takes your measure; a long breath out as the stairs recede. One per theme feels better: provide 3 cuts (crypt stone / caves earth / abyss void). |
| `floor_banner` | 2 | 2s | mono · one-shot | important |  | The floor-name banner slides in ("Act . depth . floor name"): a soft stone-scrape and a held note. |
| `floor_mod_toast` | 3 | 1.5s | mono · one-shot | important |  | A floor modifier toast (Blood Moon, Restless Dead, Warded, Thin Veil...): an ominous knock and a low whisper. |
| `floor_mod_reward` | 2 | 1s | mono · one-shot | polish |  | A floor mod with MF/gold reward: a purse clink beneath the ominous knock. |
| `explored_full` | 1 | 1s | mono · one-shot | polish |  | Floor 100% explored (depths 1-3): a soft tick. |
| `depth_record` | 1 | 2s | mono · one-shot | polish |  | A new maxDepth is reached: a lone horn. |

#### Pallor, Go deeper, Scavenger, Echo, bargains and Pallor tiers

`assets/sound/sfx/systems/` · 13 entries · 15 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `deeper_prompt` | 1 | 2s | mono · one-shot | core |  | The "Go deeper?" prompt appears: a held cold breath, a faint pale hum; Pallor eats the colour of the sound. Do not make it a button click. |
| `deeper_confirm` | 2 | 2.5s | mono · one-shot | core |  | You choose to go deeper with Pallor rising: a stair-step descent with a pale whisper laid over it, an inhaled chord. |
| `deeper_cancel` | 1 | 0.5s | mono · one-shot | polish |  | You step back: a softer scuff. |
| `pallor_tier_i` | 1 | 2.5s | mono · one-shot | core |  | Pallor tier I (10): a single faint high whine appears at the edge of hearing. |
| `pallor_tier_ii` | 1 | 2.5s | mono · one-shot | core |  | Pallor tier II (30): the whine beats with a second one; hairs rise. |
| `pallor_tier_iii` | 1 | 3s | stereo · one-shot | core |  | Pallor tier III (60): pallid things stir: a low, distant chord forms. |
| `pallor_tier_iv` | 1 | 3.5s | stereo · one-shot | core |  | Pallor tier IV (90): the world is almost grey: a hard silence cut into by a single high note. |
| `pallor_reset` | 1 | 2s | mono · one-shot | important |  | Pallor resets in town: warmth floods in; a warm exhale and a hearth crackle. |
| `pallor_unlock` | 1 | 4s | stereo · one-shot | core |  | After the finale, Pallor is on: the sound of the Ember settling and starting to hunger. |
| `tip_card` | 2 | 0.5s | mono · one-shot | important |  | A first-time tip card pops: a soft, friendly page flip (not alarming). |
| `tip_dismiss` | 1 | 0.3s | mono · one-shot | polish |  | Card fades: a small card tuck. |
| `bargain_active_loop` | 1 | 3s | mono · loop | polish |  | While a bargain is active: a low, unresolved drone under the ambience, per bargain pitch. |
| `hunt_pale_alert` | 1 | 2.5s | mono · one-shot | important |  | The Hunt: the pale hunter appears: a far-off horn and a bright hateful whisper. |

#### Town, camps and story moments

`assets/sound/sfx/systems/` · 22 entries · 38 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `town_warmed_one` | 1 | 4s | stereo · one-shot | core |  | Warmth 1 (after Act I): a chimney catches: a whoosh of draft, a crackle, a faint sung note from somewhere in town (the story says "someone sings"). |
| `town_warmed_two` | 1 | 4s | stereo · one-shot | core |  | Warmth 2 (after Act II): the market opens: a bell, the sound of three stalls waking. |
| `town_warmed_three` | 1 | 5s | stereo · one-shot | core |  | Warmth 3 (the finale): the town is warm: a long, full bell, a crowd's soft cheer (non-verbal), the hearth roaring. |
| `town_arrive` | 2 | 3s | mono · one-shot | important |  | Arriving in Emberdeep by stairs: a slow exhale and the thump of the cold. |
| `opening_ash` | 1 | 10s | stereo · one-shot | core |  | The opening (first arrival, `storySeen premise`): a burned village in ashes: a wind through cinders, a lone cough, the weight of a grey-hooded man's footsteps and a note being pressed into your hand: paper on leather glove. 10 s, a score-like sound design with no music. |
| `finale_ember` | 1 | 10s | stereo · one-shot | core |  | The finale text sequence (rift_core_touch follows): a sweeping, soft, strained sound of an enormous heart settling into your chest; the man in grey bowing: cloth only. |
| `npc_greet_merchant` | 2 | 0.8s | mono · one-shot | important |  | Open Orlen's shop (merchant): a bell on a door and coin pouches shaken. |
| `npc_greet_blacksmith` | 2 | 0.8s | mono · one-shot | important |  | Brakka's forge: a short hammer-ring and a bellows breath. |
| `npc_greet_mystic` | 2 | 0.9s | mono · one-shot | important |  | Seer Ysolde: cards shuffling and a faint chime. |
| `npc_greet_healer` | 2 | 0.8s | mono · one-shot | important |  | Sister Maren: a glass bottle and bandage cloth, a quiet hymn note. |
| `npc_greet_elder` | 2 | 0.9s | mono · one-shot | important |  | The Elder at the hearth: a log settling and an old chair creak. |
| `npc_greet_stashkeeper` | 2 | 0.8s | mono · one-shot | important |  | Old Wick (stash): heavy keys on a ring. |
| `npc_greet_curator` | 2 | 1s | mono · one-shot | important |  | Isra Vell: a page turn and thread pulled taut. |
| `npc_greet_refugee` | 2 | 0.8s | mono · one-shot | polish |  | A camp refugee: a muffled cough and blanket rustle. |
| `npc_greet_camp_merchant` | 2 | 0.8s | mono · one-shot | polish |  | Camp merchant: a cloth pack unfolded, clinking goods. |
| `npc_heal` | 2 | 1.5s | mono · one-shot | important |  | Healer restores you: a warm glow, a bandage wrap and a cleansing chime. |
| `quest_accept` | 2 | 1s | mono · one-shot | core |  | A quest accepted: a pen scratch and a wax seal. |
| `quest_progress` | 3 | 0.6s | mono · one-shot | important |  | Quest progress step (e.g. 3/10 kills): a soft, brief tick on the tracker. |
| `quest` | 2 | 1.2s | mono · one-shot | core | ✔ | (plays today, synthesised) quest completion / update: three rising notes with a ringing sparkle. Today synthesized. |
| `quest_turnin` | 2 | 1.5s | mono · one-shot | core |  | Turn in and receive the reward: a coin pouch, a stamp and a short fanfare. |
| `quest_main_step` | 1 | 3s | stereo · one-shot | important |  | A main chain step is done (boss steps and depth): a deeper, more important fanfare. |
| `quest_loyalty` | 1 | 2s | mono · one-shot | polish |  | A loyalty reward raises the surface crate rate / size: a latch and a heavier crate thunk. |

### 4.8 UI

*73 entries · 141 files · core 32 / important 73 / polish 36 · ≈ 0.8 MB encoded*

#### Buttons, taps and toggles

`assets/sound/ui/` · 20 entries · 49 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `click` | 5 | 0.1s | mono · one-shot | core | ✔ | (plays today, synthesised) generic button tap: a short, dry stamped click, as if pressing a worn bone button. Must be so unobtrusive it can be pressed 40 times a minute (it is used in 39 places today). |
| `ui_tap_big` | 3 | 0.25s | mono · one-shot | important |  | Big, primary gold buttons ("Go", "Accept"): a firmer, deeper stamp with a tiny metallic ring. |
| `ui_confirm` | 3 | 0.4s | mono · one-shot | core |  | A confirmation dialog accepted: a firm, two-note "thunk-ring". |
| `ui_confirm_permanent` | 2 | 1.2s | mono · one-shot | core |  | The permanent-action confirm (bloodstone, relic combining, respec): heavier, a final, solemn weight. |
| `ui_cancel` | 3 | 0.2s | mono · one-shot | important |  | Cancel / back: a soft, lower, cloth-dry tap. |
| `ui_toggle_on` | 2 | 0.2s | mono · one-shot | important |  | A settings toggle on: a click with an upward tick. |
| `ui_toggle_off` | 2 | 0.2s | mono · one-shot | important |  | Toggle off: a click with a downward tick. |
| `ui_tab` | 4 | 0.15s | mono · one-shot | core |  | Tab switching (inventory tabs, vendor tabs): a papery slide and tick. |
| `ui_slider_tick` | 2 | 0.1s | mono · one-shot | polish |  | Slider steps (volume, HUD size): a small notch tick. The volume sliders sample a sound at the new level (`menus.js` line 121). |
| `ui_select` | 3 | 0.15s | mono · one-shot | important |  | Select an item/skill row: a subtle wooden tap. |
| `error` | 3 | 0.3s | mono · one-shot | core | ✔ | (plays today, synthesised) error: a dull, flat double knock, never a loud buzz. Used in 34 places today. Plays for not enough gold, bag full, refused actions, town-only action in the dungeon, etc. |
| `error_gold` | 2 | 0.4s | mono · one-shot | important |  | Not enough gold: a dull coin-purse tap. |
| `error_full` | 2 | 0.4s | mono · one-shot | important |  | Bag/stash/crate full: a stuffed, thumping refusal. |
| `error_locked` | 2 | 0.3s | mono · one-shot | important |  | Locked/disabled item: a padlock rattle. |
| `error_townonly` | 2 | 0.4s | mono · one-shot | important |  | "Sell works only in town" red toast: a hollow thump and a faint echo. |
| `toast_info` | 2 | 0.4s | mono · one-shot | important |  | A neutral toast: a small paper-slide chime. (Toasts are the main feedback; keep very quiet.) |
| `toast_good` | 2 | 0.5s | mono · one-shot | important |  | A positive toast (green/gold): a warm chime. |
| `toast_bad` | 2 | 0.5s | mono · one-shot | important |  | A negative toast (red): a low knock. |
| `toast_legendary` | 2 | 1.5s | mono · one-shot | core |  | The legendary monster announce toast (orange): a deep ominous bell. Today `shrine`. |
| `pickup_feed_tap` | 1 | 0.2s | mono · one-shot | polish |  | Tap the ▲ verdict line in the pickup feed. |

#### Panels: open and close

`assets/sound/ui/` · 29 entries · 49 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `ui_open_inventory` | 3 | 0.5s | mono · one-shot | core |  | Inventory and paper-doll panel opens: a leather bag unlatched, buckles, a rattle of loose kit. The most-opened panel: 3 variations, short. |
| `ui_close_inventory` | 2 | 0.4s | mono · one-shot | core |  | Inventory closes: a bag shut with a flap and buckle. |
| `ui_open_character` | 2 | 0.5s | mono · one-shot | important |  | Character/stats panel: a ledger opened and a metal tick. |
| `ui_open_skills` | 2 | 0.6s | mono · one-shot | important |  | Skill panel: a heavy spell book cover and a faint arcane whisper. |
| `ui_open_perks` | 2 | 0.8s | mono · one-shot | important |  | Perk panel: a candle flame and a cracking of stone; the tree appears. |
| `ui_open_map` | 2 | 0.5s | mono · one-shot | important |  | Map panel: a map unrolled, parchment crackle. |
| `ui_open_journal` | 2 | 0.6s | mono · one-shot | important |  | Journal/lore: pages riffled, a quill set down. |
| `ui_open_quests` | 2 | 0.5s | mono · one-shot | important |  | Quest log: a notice board and a pinned paper. |
| `ui_open_menu` | 2 | 0.5s | mono · one-shot | important |  | Pause menu: a stone door half-closed; the game's volume ducks 50%. |
| `ui_close_menu` | 2 | 0.4s | mono · one-shot | important |  | Resume: a short release. |
| `ui_open_settings` | 1 | 0.4s | mono · one-shot | polish |  | Settings: a mechanical clasp. |
| `ui_open_depth` | 2 | 0.8s | mono · one-shot | important |  | Depth picker (waypoint list): a deep stone resonance. |
| `ui_open_shop` | 3 | 0.6s | mono · one-shot | core |  | Vendor panel (Buy/Sell tabs): a shop bell and a counter thump; per-role variants are in `npc_greet_*`. |
| `ui_open_stash` | 2 | 0.6s | mono · one-shot | important |  | Stash panel: a heavy chest. |
| `ui_open_chute` | 2 | 0.6s | mono · one-shot | important |  | Chute panel: a hatch and a long metal tube sound. |
| `ui_open_surface` | 2 | 0.6s | mono · one-shot | important |  | Surface crate panel (town): a crate lid. |
| `ui_open_collection` | 2 | 0.8s | mono · one-shot | important |  | Curator book: the heavy cover of a ledger, a thread. |
| `ui_open_relics` | 1 | 0.8s | mono · one-shot | polish |  | Relics panel. |
| `ui_open_milestones` | 1 | 0.6s | mono · one-shot | polish |  | Milestones / stats book: a quill scratch. |
| `ui_open_classgoals` | 1 | 0.6s | mono · one-shot | polish |  | Class goals: a ledger tick. |
| `ui_open_death` | 1 | 3s | mono · one-shot | core |  | The death screen: the sound drains to a deep low-pass hum; a single heartbeat and a stone lid; this is the moment after you die. Keep under 3 s; the death stinger already played. |
| `ui_open_finale` | 1 | 2s | mono · one-shot | polish |  | The finale panel. |
| `ui_open_tips` | 1 | 0.4s | mono · one-shot | polish |  | Opening a tip's full text: a page flip. |
| `ui_title_start` | 1 | 2.5s | mono · one-shot | core |  | "Continue/New game" confirmed: a heavy door and a boot on stone, a cold breath. |
| `ui_class_pick_warrior` | 1 | 1s | mono · one-shot | important |  | Class select - warrior: a sword half-drawn and slammed back. |
| `ui_class_pick_ranger` | 1 | 1s | mono · one-shot | important |  | Class select - ranger: bow string pulled and a leather glove. |
| `ui_class_pick_sorcerer` | 1 | 1s | mono · one-shot | important |  | Class select - sorcerer: a spark of three elements fizzling. |
| `ui_class_pick_necromancer` | 1 | 1s | mono · one-shot | important |  | Class select - necromancer: a whisper and a bone knock. |
| `ui_name_key` | 3 | 0.08s | mono · one-shot | polish |  | Typing the hero name: a typewriter-like tick. |

#### HUD, inventory and meta actions

`assets/sound/ui/` · 24 entries · 43 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `ui_item_pick` | 3 | 0.2s | mono · one-shot | important |  | Pick up an item in the bag UI: a short grab. |
| `ui_item_drop` | 3 | 0.25s | mono · one-shot | important |  | Put an item into a slot: a soft slot-in thump. |
| `ui_item_swap` | 2 | 0.3s | mono · one-shot | polish |  | Swap two items. |
| `ui_tooltip_open` | 2 | 0.1s | mono · one-shot | polish |  | Item tooltip appears: the faintest shimmer, rarity-coloured: use a higher pitch for rarer tiers (the engine pitch-shifts). |
| `ui_tooltip_details` | 1 | 0.15s | mono · one-shot | polish |  | Details toggle in tooltips. |
| `ui_compare` | 1 | 0.15s | mono · one-shot | polish |  | Compare toggle. |
| `skill_learn` | 3 | 0.8s | mono · one-shot | core |  | A skill point spent (rank up): a glowing rune carved and a pitch that rises with rank (ranks 1-5; pitch by engine). |
| `skill_learn_max` | 1 | 1.5s | mono · one-shot | important |  | Rank 5 reached: a chime of completion. |
| `skillbar_set` | 3 | 0.3s | mono · one-shot | important |  | Skill assigned to a bar slot: a hard stamp. |
| `autobuild_pick` | 3 | 0.8s | mono · one-shot | important |  | One of the three auto-build buttons: a glowing gear clicks into place. |
| `skill_respec` | 2 | 1.5s | mono · one-shot | important |  | Respec skills: a sweeping unstitching sound. |
| `menu_save` | 1 | 0.6s | mono · one-shot | polish |  | A save written: a stamp. |
| `menu_save_code` | 2 | 0.8s | mono · one-shot | polish |  | Save-code copy/import: a short data blip. |
| `menu_restore` | 1 | 1s | mono · one-shot | important |  | Restoring a backup: a time-rewind whoosh. |
| `hud_skill_tap` | 3 | 0.1s | mono · one-shot | polish |  | The skill button itself: a tiny tactile tap before the skill's own cast sound (optional). |
| `hud_potion_tap` | 2 | 0.1s | mono · one-shot | polish |  | Potion button: a glass tap. |
| `hud_attack_loot` | 2 | 0.2s | mono · one-shot | polish |  | The action button switches to LOOT mode: a tiny alert tick. |
| `hud_portal_tap` | 1 | 0.3s | mono · one-shot | polish |  | Town portal button: a faint chime. |
| `hud_minimap` | 1 | 0.15s | mono · one-shot | polish |  | Minimap toggle. |
| `hud_edit_snap` | 2 | 0.1s | mono · one-shot | polish |  | HUD editor drag snap (16 px): a soft detent. |
| `hud_edit_reset` | 1 | 0.4s | mono · one-shot | polish |  | Reset layout: a whoosh. |
| `pwa_update` | 1 | 0.8s | mono · one-shot | polish |  | An update is ready / applied: a chime. |
| `pause_on` | 1 | 0.4s | mono · one-shot | polish |  | Game pause (pause button): a hush as the sound field low-passes. |
| `pause_off` | 1 | 0.4s | mono · one-shot | polish |  | Resume: the field re-opens. |

### 4.9 Ambience beds

*79 entries · 143 files · core 18 / important 84 / polish 41 · ≈ 18.7 MB encoded*

#### Base beds (existing names, the fallback layer)

`assets/sound/ambience/` · 9 entries · 9 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `amb_wind` | 1 | 30s | stereo · loop | core | ✔ | (plays today, synthesised) Base bed "wind" (variant sound `wind`): a low cold draft through stone, with slow swelling gusts. Crypt, ash wastes, amber hollows. 30 s seamless. |
| `amb_drone` | 1 | 30s | stereo · loop | core | ✔ | (plays today, synthesised) Base bed "drone" (variant `hum`): a low, unresolved tonal hum, like pipes of a dead organ; Gravelord approach, spire, cathedral. |
| `amb_drip` | 1 | 30s | stereo · loop | core | ✔ | (plays today, synthesised) Base bed "drip" (variant `drip`): a damp, resonant room tone with gaps for dripping (the drips themselves are one-shots below; this is the wet air). |
| `amb_water` | 1 | 30s | stereo · loop | important | ✔ | (plays today, synthesised) Base bed "water" (variant `chime`): a lap of water, hollow, with faint crystalline ringing: crystal lake, glasswork drift. |
| `amb_fire` | 1 | 30s | stereo · loop | core | ✔ | (plays today, synthesised) Base bed "fire" (variant `crackle`): a low furnace rumble with intermittent cracking of coals: inferno. |
| `amb_heart` | 1 | 30s | stereo · loop | core | ✔ | (plays today, synthesised) Base bed "heart" (variant `rumble`): a slow, distant giant heartbeat under a tectonic rumble: magma flows, the wound, rift core. |
| `amb_choir` | 1 | 30s | stereo · loop | core | ✔ | (plays today, synthesised) Base bed "choir" (variant `whisper`): a distant, wordless choral drone and wet whisper layer. |
| `amb_flesh` | 1 | 30s | stereo · loop | core | ✔ | (plays today, synthesised) Hellscape bed, all variants 21-30 (F.hell): a sour semitone drone, wet breathing, a heart with a bad rhythm: never resolves. Pallor-compatible. |
| `amb_hearth` | 1 | 30s | stereo · loop | core | ✔ | (plays today, synthesised) warm town bed (warmth >= 2, replaces wind): a soft hearth fire with a faint wind outside and the murmur of a quiet town. |

#### Theme beds (new, one per act theme)

`assets/sound/ambience/` · 6 entries · 6 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `amb_crypt` | 1 | 30s | stereo · loop | important |  | Crypt theme (depths 1-5): cold stone room tone, faraway echoing drips and the dry creak of old iron: the tomb breathing. Quieter than the cave bed. |
| `amb_caves` | 1 | 30s | stereo · loop | important |  | Caves (6-10): a lower, bigger room tone, trickling water in the distance, an occasional hollow gust, no mechanical sound. |
| `amb_inferno` | 1 | 30s | stereo · loop | important |  | Inferno (11-15): a furnace tone, distant hammering, metal heat-ticking. |
| `amb_abyss` | 1 | 30s | stereo · loop | important |  | Abyss (16+): a vast open void: sub-bass, thin glassy chimes, no echo: stranger than the others. |
| `amb_roots` | 1 | 30s | stereo · loop | important |  | Act IV, The Roots (31+): wood-and-flesh, creaking roots under pressure, a distant massive heartbeat; the giant is below. |
| `amb_pale_end` | 1 | 30s | stereo · loop | polish |  | The Pale End (41+, variant `silence`): near silence: a faint high tone and the sound of paper-thin ash. |

#### Variant beds (new, one per floor variant)

`assets/sound/ambience/` · 23 entries · 23 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `amb_var_restless_graves` | 1 | 30s | stereo · loop | important |  | Restless Graves (1-4): cold wind over a graveyard through a broken crypt gate; cloth flapping on a rotten banner; a far bell tolling once in a minute. |
| `amb_var_forgotten_cellars` | 1 | 30s | stereo · loop | important |  | Forgotten Cellars (1-3): damp, hollow, barrels creaking; a slow drip into a puddle; rats in the walls. |
| `amb_var_ossuary` | 1 | 30s | stereo · loop | important |  | Ossuary (2-5): whispering voices of the dead in an echoing bone hall; clicking of bones settling; a choir-like hush. |
| `amb_var_drowned_vaults` | 1 | 30s | stereo · loop | important |  | Drowned Vaults (3-5): water lapping in a flooded vault, bubbles rising, a deep gurgle. |
| `amb_var_gravelord_approach` | 1 | 30s | stereo · loop | important |  | Gravelord's Approach (5): a funeral drone, a slow far-off processional bell and a rising purple hum; foreboding, the boss is near. |
| `amb_var_mossy_caverns` | 1 | 30s | stereo · loop | important |  | Mossy Caverns (6-10): water trickling over moss, a bat or two, a soft wet cave tone. |
| `amb_var_fungal_warrens` | 1 | 30s | stereo · loop | important |  | Fungal Warrens (6-9): soft puffing spores, a squishy, breathing cave and a whispering, chittering layer. |
| `amb_var_crystal_lake` | 1 | 30s | stereo · loop | important |  | Crystal Lake (7-10): still water with faint crystalline chimes and a lapping edge; a calm uncanny beauty. |
| `amb_var_amber_hollows` | 1 | 30s | stereo · loop | important |  | Amber Hollows (6-8): dry warm wind through hive-like tunnels and a faint drone of insects. |
| `amb_var_smouldering_halls` | 1 | 30s | stereo · loop | important |  | Smouldering Halls (11-14): smouldering embers crackling, a fire that has burned for a long time, heat shimmer. |
| `amb_var_magma_flows` | 1 | 30s | stereo · loop | important |  | Magma Flows (12-15): a slow river of lava bubbling, the earth rumbling, a distant heartbeat of rock. |
| `amb_var_ash_wastes` | 1 | 30s | stereo · loop | important |  | Ash Wastes (11-15): a dry hot wind carrying ash, fine hissing, hollow gusts. |
| `amb_var_forgeworks` | 1 | 30s | stereo · loop | important |  | Forgeworks (13-15): distant hammer on anvil with no one there, bellows breathing, steam hissing. |
| `amb_var_starless_isles` | 1 | 30s | stereo · loop | important |  | Starless Isles (16-20): sub-bass void, whispers from nowhere, a very thin wind with no source. |
| `amb_var_shattered_spire` | 1 | 30s | stereo · loop | important |  | Shattered Spire (16-20): a vertical hum like a tower in the wind, broken-glass chimes swinging. |
| `amb_var_glasswork_drift` | 1 | 30s | stereo · loop | important |  | Glasswork Drift (16-20): glass shards ticking against each other in a gentle current, a crystalline shimmer. |
| `amb_var_fallen_cathedral` | 1 | 30s | stereo · loop | important |  | Fallen Cathedral (21-30): a broken organ droning one dying chord, pigeon-less rafters creaking, flesh-wet echoes. Plays instead of `amb_flesh` on Hellscape floors if present. |
| `amb_var_cinder_drift` | 1 | 30s | stereo · loop | important |  | Cinder Drift (21-30): falling embers and ash with a heartbeat thump and furnace breath, hell-hot and wrong. Plays instead of `amb_flesh` on Hellscape floors if present. |
| `amb_var_overgrown_dark` | 1 | 30s | stereo · loop | important |  | Overgrown Dark (21-30): slick tendrils creaking, spores popping, a wet insect chorus; the dark is alive. Plays instead of `amb_flesh` on Hellscape floors if present. |
| `amb_var_unmaking` | 1 | 30s | stereo · loop | important |  | The Unmaking (21+): the world coming apart: grinding, whispering, tape-reverse textures. Plays instead of `amb_flesh` on Hellscape floors if present. |
| `amb_var_the_wound` | 1 | 30s | stereo · loop | important |  | The Wound (24+): a deep gaping heartbeat, a wet breath of a huge wound, a high wail under. Plays instead of `amb_flesh` on Hellscape floors if present. |
| `amb_var_rift_core` | 1 | 30s | stereo · loop | important |  | The Rift Core (30): the giant's heart as a room: a vast, slow, warm heartbeat, ember crackle, and the groaning of a body too big to hold still. Plays instead of `amb_flesh` on Hellscape floors if present. |
| `amb_var_pale_end` | 1 | 30s | stereo · loop | important |  | The Pale End (31+... see also amb_pale_end): a hollow wind of nothing, faint piano-wire hum; a floor with no sound at all. |

#### Pallor, Heat, Danger layers

`assets/sound/ambience/` · 5 entries · 5 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `amb_pallor_one` | 1 | 20s | mono · loop | important |  | Pallor tier I: a very faint, high drained whine; the lightest layer; mostly felt. |
| `amb_pallor_two` | 1 | 20s | mono · loop | important |  | Pallor tier II: the whine beats with a detune; colours of sound thin out (reduce highs of the bed). |
| `amb_pallor_three` | 1 | 20s | mono · loop | important |  | Pallor tier III: a low pallid chord, distant white noise and whispers. |
| `amb_pallor_four` | 1 | 20s | mono · loop | important |  | Pallor tier IV: the world is nearly muted: a tight high note, dry silence around it. |
| `amb_pallor_heart` | 1 | 10s | mono · loop | polish |  | Optional: a pale heartbeat layer for Pallor III/IV bargain floors. |

#### Ambience one-shots (random events layered on beds)

`assets/sound/ambience/` · 20 entries · 71 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `amb_ev_drip` | 6 | 0.5s | mono · one-shot | core |  | A single water drip into a puddle with room reverb. Six pitches/positions. Today the synth `drip`/`water` bed events. |
| `amb_ev_gust` | 3 | 2s | mono · one-shot | important |  | A short gust of wind through a crack. |
| `amb_ev_creak` | 4 | 1.2s | mono · one-shot | important |  | Old wood or iron creaking in the distance. |
| `amb_ev_bones` | 4 | 1s | mono · one-shot | important |  | Bones settling, a faint rattle, a skull rolling. |
| `amb_ev_rats` | 3 | 1.5s | mono · one-shot | polish |  | Rats skittering off a wall. |
| `amb_ev_chains` | 3 | 1.5s | mono · one-shot | polish |  | A chain rattling far away. |
| `amb_ev_bat` | 3 | 1.2s | mono · one-shot | polish |  | Distant bat wings. |
| `amb_ev_rock` | 3 | 1.2s | mono · one-shot | important |  | A pebble falling and a roll in the dark. |
| `amb_ev_crack` | 4 | 0.4s | mono · one-shot | important |  | A coal crackle or fire pop. Today `fire` bed event. |
| `amb_ev_lava` | 3 | 1.5s | mono · one-shot | polish |  | A lava bubble burst. |
| `amb_ev_hammer` | 2 | 2s | mono · one-shot | polish |  | A distant hammer hit. |
| `amb_ev_steam` | 3 | 1.5s | mono · one-shot | polish |  | A steam vent hiss. |
| `amb_ev_glass` | 4 | 1.5s | mono · one-shot | important |  | A glass shard chiming. |
| `amb_ev_whisper` | 6 | 2s | mono · one-shot | important |  | A whisper without words: a breathy human voice behind the walls. Today `choir`/`flesh` noise events. |
| `amb_ev_heart` | 3 | 1.2s | mono · one-shot | important |  | A heartbeat with a bad rhythm (the Hellscape): thump-thump... thump. Today the `flesh`/`heart` synth. |
| `amb_ev_wail` | 3 | 3s | mono · one-shot | important |  | Far off, something wails: a thin, long, sad howl, falling in pitch. Today the `flesh` synth. |
| `amb_ev_wet` | 4 | 1s | mono · one-shot | important |  | A wet sound: a squelch or slap in the flesh. |
| `amb_ev_void` | 4 | 2s | mono · one-shot | polish |  | A single, empty ping from nowhere. |
| `amb_ev_rumble` | 3 | 3s | mono · one-shot | important |  | A tremor: a low rumble. |
| `amb_ev_eyes` | 3 | 1.2s | mono · one-shot | polish |  | Hellscape: eyes in the dark blink open: a barely audible wet tick (visual synced). |

#### Town: warmth stages, inn, camps and the NPCs of the hearth

`assets/sound/ambience/` · 16 entries · 29 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `amb_town_cold` | 1 | 30s | stereo · loop | core |  | Warmth 0 (frozen, before Act I): a bitter wind across dead rooftops, no chimney smoke, a loose shutter, a long gust; very far and faint, a woman crying with relief (non-verbal, rare). |
| `amb_town_thaw` | 1 | 30s | stereo · loop | core |  | Warmth 1 (after Act I, chimneys smoke): wind softening, one chimney crackling, a distant hummed tune, the tick of ice melting. |
| `amb_town_market` | 1 | 30s | stereo · loop | core |  | Warmth 2 (after Act II, the market opens): the hearth bed plus the murmur of a small market: stalls, a cart, a tapping hammer, a few footsteps, no intelligible speech. |
| `amb_town_warm` | 1 | 30s | stereo · loop | core |  | Warmth 3 (the town is warm after the finale): a full fire-lit evening: a lively murmur, children's laughter far off (non-verbal), bells, a glow in the sound. |
| `town_ev_cry` | 3 | 3s | mono · one-shot | polish |  | Warmth 0 only: a woman cries; relief, not grief. |
| `town_ev_hammer` | 3 | 2s | mono · one-shot | important |  | A blacksmith hammer from Brakka's forge: used in warmth >= 1 (the anvil is mostly cold at 0). |
| `town_ev_sing` | 2 | 6s | mono · one-shot | important |  | Someone sings: a wordless hum, a lullaby; warmth 1+. |
| `town_ev_bell` | 2 | 4s | mono · one-shot | polish |  | A town bell: warmth 2+. |
| `town_ev_door` | 3 | 0.8s | mono · one-shot | polish |  | A door opening and shutting somewhere in the town. |
| `amb_inn` | 1 | 30s | stereo · loop | important |  | The Banked Hearth inn: a roaring hearth, a low murmur of drinkers (no intelligible words), mugs thunking on wood, a poker on iron, a loud woman's laugh. Warmth 1+; at 0 the inn is nearly empty. |
| `inn_door` | 2 | 1.2s | mono · one-shot | important |  | Entering the inn: a door swing, a swell of warmth and noise. |
| `inn_poker` | 3 | 0.6s | mono · one-shot | polish |  | Dory's poker on the hearth. |
| `inn_mug` | 3 | 0.5s | mono · one-shot | polish |  | A mug on wood. |
| `amb_camp_lamp` | 1 | 30s | stereo · loop | important |  | Lamp Camp (cleansed, depths 3-9): a small, brave settlement under rock: lanterns creaking, a pot simmering (rat broth), soft murmurs, a distant spider click. Cautious warmth. |
| `amb_camp_fever` | 1 | 30s | stereo · loop | important |  | Fever Camp (cleansed, depths 12-19): hot, feverish: coughs, whispering, a bell, muffled wailing; still more safe than the floor outside. |
| `camp_campfire` | 1 | 10s | stereo · loop | polish |  | Camp fire detail: a deeper fire layer within 4 tiles. |

### 4.10 Music

*45 entries · 45 files · core 24 / important 16 / polish 5 · ≈ 82.3 MB encoded*

#### Title, town and camps

`assets/sound/music/` · 11 entries · 11 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `music_title` | 1 | 2:00 | stereo · loop | core | ✔ | (plays today, synthesised) track `title`. The title screen: slow, haunted, a single warm voice lost in a cold hall; piano low on one note, a muted horn, a bowed saw; something of a lullaby remembered. 60 bpm. Reference instruments: solo cello, detuned music box, soft choir pad. Mood: grief with a spark. |
| `music_title_ember` | 1 | 2:00 | stereo · loop | polish |  | Post-finale title screen: the same melody played by a warmer ensemble; hope with a cost. |
| `music_town` | 1 | 2:30 | stereo · loop | core | ✔ | (plays today, synthesised) track `town` = warmth stage 0: bare, frozen Emberdeep. Wind-bleached strings, a lonely bell, sparse piano, long silences. 52 bpm. D minor. The same theme as the next three stages stripped to a skeleton. |
| `music_town_thaw` | 1 | 2:45 | stereo · loop | core |  | Town warmth 1: the same theme with a hearth: a hand-drum, a low whistle, a warm cello; hope appears. 60 bpm. |
| `music_town_market` | 1 | 3:00 | stereo · loop | core |  | Town warmth 2: the market opens: fiddle, guitar-like lute, a small chorus humming, a soft frame drum. The town is alive. 72 bpm. |
| `music_town_warm` | 1 | 3:00 | stereo · loop | core |  | Town warmth 3: the full theme, major resolution within a minor frame; strings, horn, a choir of the whole town; bittersweet because of what the player now carries. |
| `music_inn` | 1 | 2:00 | stereo · loop | important |  | The Banked Hearth inn: a lively but tired tavern tune: fiddle, bodhran, a mandolin, with foot-stomping; Dory loves it loud. 108 bpm. |
| `music_camp_lamp` | 1 | 2:00 | stereo · loop | important |  | Lamp Camp: a small, frightened lullaby: a lone fiddle, a wooden flute, a cautiously warm drone. 56 bpm. |
| `music_camp_fever` | 1 | 2:00 | stereo · loop | important |  | Fever Camp: feverish and uneasy: a hand-pumped harmonium, bowed strings, whispery percussion. 64 bpm. |
| `music_opening` | 1 | 2:30 | stereo · one-shot | important |  | The opening (one-shot): ash, a hooded man; bleak, slow, ending on a single held note that leads into the town theme; not looped. 48 bpm. |
| `music_finale` | 1 | 3:30 | stereo · one-shot | core |  | The finale (one-shot): the Ember taken: the town theme in full over a heartbeat, the giant's slow rhythm, rising to a quiet fade; no triumph, only weight. 60 bpm. |

#### Exploration: per theme/act, 2-3 tracks each (rotate)

`assets/sound/music/` · 20 entries · 20 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `music_crypt` | 1 | 2:45 | stereo · loop | core | ✔ | (plays today, synthesised) `crypt` (Act I, depths 1-5), track A: sparse and cold; low strings on a held drone, a distant bell, a slow bone-chime ostinato; sounds like a tomb waking. 66 bpm, C minor. Reference: low cello, glass harmonica, prepared piano. |
| `music_crypt_b` | 1 | 3:00 | stereo · loop | important |  | Crypt B: a processional: slow timpani, a church organ one note at a time, muted trumpet. 72 bpm. |
| `music_crypt_c` | 1 | 2:30 | stereo · loop | important |  | Crypt C: a quiet, tension-building piece with a sub-bass pulse and a nervous string tremolo; the stalking track. |
| `music_caves` | 1 | 3:00 | stereo · loop | core | ✔ | (plays today, synthesised) `caves` (Act I, depths 6-10), track A: wet, claustrophobic, rhythmic: a hand-struck frame drum, hollow wooden percussion, a droning didgeridoo-like low synth and cave-flutes; natural but dangerous. 78 bpm. |
| `music_caves_b` | 1 | 2:45 | stereo · loop | important |  | Caves B: mostly silent, with a slow tick-and-drip percussion and a sustained string note rising and falling. |
| `music_caves_c` | 1 | 3:00 | stereo · loop | important |  | Caves C: a spider-crawl: pizzicato, quick rattling percussion, tension. |
| `music_inferno` | 1 | 3:00 | stereo · loop | core | ✔ | (plays today, synthesised) `inferno` (Act II, depths 11-15), track A: heavy, industrial heat: anvil-like percussion, a brass drone, a pounding low drum on every beat, rasping strings; the forge of a god. 84 bpm, E phrygian. |
| `music_inferno_b` | 1 | 3:00 | stereo · loop | important |  | Inferno B: slow and smouldering: a deep taiko and a detuned church bell; heat-haze. |
| `music_inferno_c` | 1 | 2:45 | stereo · loop | important |  | Inferno C: more urgent: 96 bpm, tin-whistle-free; driving low strings and metal percussion. |
| `music_abyss` | 1 | 3:00 | stereo · loop | core | ✔ | (plays today, synthesised) `abyss` (Act II end, depths 16-20): vast and strange: glass harmonica, wordless choir clusters, a sub drone; nearly no rhythm, floating. 50 bpm. |
| `music_abyss_b` | 1 | 3:00 | stereo · loop | important |  | Abyss B: icy bowed vibraphone and a slowly sliding string cluster; sparse. |
| `music_rift` | 1 | 3:00 | stereo · loop | core | ✔ | (plays today, synthesised) `rift` (Act III, Hellscape, 21-30), track A: wrong and fleshy: detuned strings, ratcheting wooden percussion like ribs, a semitone-clash choir, a pulsating heartbeat; the harmony never resolves. Aligns with `amb_flesh`. 70 bpm. |
| `music_rift_b` | 1 | 3:00 | stereo · loop | important |  | Hellscape B: low brass pushing against a wailing high string; slow-building dread. |
| `music_rift_c` | 1 | 3:00 | stereo · loop | important |  | Hellscape C: near-silence: a bass heart, whispered breath-percussion. |
| `music_roots` | 1 | 3:00 | stereo · loop | core |  | The Roots (31+), track A: the endgame: the town theme twisted by the Ember inside you: warm brass buried in cold roots, a pulsing 'hunger' under it. 76 bpm. |
| `music_roots_b` | 1 | 3:00 | stereo · loop | important |  | Roots B: harsher, root-creak percussion and a ritual choir. |
| `music_pale_end` | 1 | 3:00 | stereo · loop | polish |  | The Pale End (41+): almost no music: a bare pitch and a slow grey harmony; the lack of sound is the scare. |
| `music_event_tension` | 1 | 1:30 | stereo · loop | core |  | Event tension layer (gauntlet, keyhunt, collapse, thief): a ticking, urgent 140 bpm layer: pulsing strings, a snare roll, a rising pad. This is a loopable overlay mixed on top of the exploration track (the exploration track drops 6 dB); also used for lockdown waves. |
| `music_lockdown` | 1 | 2:00 | stereo · loop | important |  | Lockdown fight (`room:locked`): rhythmic and trapped: a ritual drum, a slow low brass, rising energy; each wave a bar longer. 100 bpm. |
| `music_pallor` | 1 | 2:00 | stereo · loop | polish |  | Pallor III/IV overlay: a pale, bright, bad chord layer on top of everything. |

#### Bosses, Fallen and Echo

`assets/sound/music/` · 14 entries · 14 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `music_boss` | 1 | 2:30 | stereo · loop | core | ✔ | (plays today, synthesised) generic `boss` (also the fallback for any named boss and repeats from depth 35 with a tier): dark ritual war-music: taiko, low brass, tolling bell, minor-key choir stabs. 96 bpm. |
| `music_boss_gravelord` | 1 | 2:30 | stereo · loop | core |  | Morgrath (d5), phase 1-3 in one: a funeral march: tolling bell, slow drums, a church organ, a rising dies-irae-like motif in the low strings (no sung words). 76 bpm; third phase quickens. |
| `music_boss_broodmother` | 1 | 2:30 | stereo · loop | core |  | Skarn (d10): scraping, skittering: high string tremolo, rattling, a wet low drone, a primal drum for the roof phase; a lantern bell motif. 90 bpm. |
| `music_boss_tyrant` | 1 | 2:45 | stereo · loop | core |  | Azgalor (d15): industrial fire: anvil strikes, trombone choir, a furnace pulse; a rising theme in the Promise phase. 100 bpm. |
| `music_boss_hollow` | 1 | 3:00 | stereo · loop | core |  | Xal'thuun (d20): cosmic horror: a vast low drone, glass harmonica, reversed cymbals, a slow sub pulse; the blackout needs a quiet middle section (a hollow 8 bar section where the music nearly disappears). 60 bpm. |
| `music_boss_choir` | 1 | 3:00 | stereo · loop | core |  | The Choir (d25): a rhythm fight: strict 120 bpm in D minor, a steady pulse; the sung notes (`boss_choir_note_*`) must be in the same key and tempo grid: ring notes every 3 beats and in the Last Verse every 2 beats. Mostly choir-less strings and drums; the choir is its own SFX. Provide a "stem" with a quiet breakdown for the inhale. |
| `music_boss_hearthking_swordsman` | 1 | 3:00 | stereo · loop | core |  | Hearthking phase 1 (to 60%): a tired man in the hearth: a solo cello, a distant horn, a soft snare in march time; dignified, wounded. 80 bpm. |
| `music_boss_hearthking_ember` | 1 | 3:00 | stereo · loop | core |  | Hearthking phase 2 (60%-25%): roots tearing, the Ember pulses: a heartbeat bass drum with a heavy brass response; every pulse of the Ember lands on a drum; the windows are musically clear. 84 bpm. |
| `music_boss_hearthking_giant` | 1 | 3:30 | stereo · loop | core |  | Hearthking phase 3 (25%-0): the giant's body: a colossal slow organic pulse, brass and choir swelling to the inversion; the inward/outward pulses fall on the beat grid (use 60 bpm, one pulse per 2 beats). The climax of the game. |
| `music_fallen` | 1 | 2:30 | stereo · loop | core |  | The Fallen (generic): a sad, violet fight: a solo voice (wordless) and a detuned music box with taut strings; each Fallen was a person. 88 bpm. Fades to silence at death. |
| `music_fallen_ivo` | 1 | 2:30 | stereo · loop | important |  | Ivo Marrow: tender and tragic; includes a bare moment in the Refusal (5 s of near silence with a sustained note). |
| `music_echo` | 1 | 2:30 | stereo · loop | core | ✔ | (plays today, synthesised) `echo`: your own ghost: a hollow, whispering, reversed-sounding arrangement of a simple four-note theme over a cold choir pad and a heartbeat. 66 bpm. |
| `music_victory` | 1 | 20s | stereo · one-shot | polish |  | After a boss: a short coda that bridges the stinger into the ambience (optional). |
| `music_death` | 1 | 1:00 | stereo · loop | polish |  | The death screen bed: a low drone with a faint far-away lullaby. |

### 4.11 Stingers

*30 entries · 32 files · core 10 / important 16 / polish 6 · ≈ 1.7 MB encoded*

#### Stingers

`assets/sound/stingers/` · 30 entries · 32 files

| File | Vars | Length | Fmt | Prio | Today | Description |
|---|---:|---:|---|---|---|---|
| `sting_death` | 1 | 4s | stereo · one-shot | core |  | You die: a low brass chord drops and a bell tolls once, a long exhale; understated, tragic, no triumph. Pairs with `death_fall`, `ui_open_death`. |
| `sting_death_boss` | 1 | 5s | stereo · one-shot | important |  | You die during a boss fight (noRetrieve): heavier, with a hollow drum. |
| `sting_revive` | 1 | 3s | stereo · one-shot | important |  | You wake in town: a warm hearth chord. |
| `sting_corpse_reclaimed` | 1 | 3s | stereo · one-shot | important |  | You reclaim your corpse run: a lifting resolution. |
| `sting_boss_slain` | 1 | 6s | stereo · one-shot | core |  | Any act boss falls: a triumphant but weary brass-and-bell sting that resolves into silence: you took something from the dark. The default for all bosses. |
| `sting_boss_hearthking` | 1 | 8s | stereo · one-shot | core |  | The Hearthking falls: no triumph: a long hymn for a tired man, the Ember's pulse. |
| `sting_fallen_slain` | 1 | 5s | stereo · one-shot | core |  | A Fallen laid to rest: a tender violet chord, a lone voice, a bell; a death that finishes a sad story. |
| `sting_relic` | 1 | 4s | stereo · one-shot | core |  | A relic of the Fallen granted: a warm metallic chord with a vocal sigh. |
| `sting_echo_slain` | 1 | 4s | stereo · one-shot | important |  | The Echo slain: a quiet "released" chord. |
| `sting_levelup_big` | 1 | 4s | stereo · one-shot | important |  | Level 10/20/30/40/50/60: a bigger levelup fanfare: brass and bells. |
| `sting_level_cap` | 1 | 6s | stereo · one-shot | polish |  | Level 60: a full ceremonial ending. |
| `sting_legendary` | 1 | 4s | stereo · one-shot | important |  | A Legendary Elite drops (the music bed stinger, layered after `loot_legendary`): a golden brass lift; may be skipped if the sound alone is enough. |
| `sting_mythic` | 1 | 5s | stereo · one-shot | core |  | A Mythic drops: a massive resolve: choir, brass, fire; a once-a-month sound. |
| `sting_unique` | 1 | 4s | stereo · one-shot | important |  | A Unique drops: a dark, forbidden chord. |
| `sting_rift` | 1 | 4.5s | stereo · one-shot | important |  | A Rift-tier item drops: a shimmering pink-tinged dissonance. |
| `sting_act_one_end` | 1 | 6s | stereo · one-shot | core |  | Act I complete (Mother killed): a chimney smoking; a sung line in the distance; the town's first warmth: warm, quiet, relieved. |
| `sting_act_two_end` | 1 | 6s | stereo · one-shot | core |  | Act II complete (Hollow Star): the market opens; a warm bell chime; a grey note's ominous coda: "Further". |
| `sting_act_three_end` | 1 | 8s | stereo · one-shot | core |  | Act III complete (Hearthking): handled by `music_finale` + `finale_ember`; this stinger is the short version if the finale is skipped. |
| `sting_act_enter` | 3 | 4s | stereo · one-shot | important |  | Entering a new act's first floor (11 / 21 / 31): a dark horn and a bell; three cuts: Deep, Hellscape, Roots. |
| `sting_main_step` | 1 | 3s | stereo · one-shot | important |  | A main quest step complete (boss steps and depth steps). |
| `sting_waypoint` | 1 | 3s | stereo · one-shot | important |  | New waypoint: bright, brass. |
| `sting_grade_s` | 1 | 3s | stereo · one-shot | important |  | S-grade clear: a golden flourish; layered over `grade_s`. |
| `sting_event_win` | 1 | 3s | stereo · one-shot | polish |  | Timed event success: a quick triumphant brass. |
| `sting_lockdown_clear` | 1 | 3s | stereo · one-shot | important |  | Lockdown cleared: relief after the fight. |
| `sting_pallor_unlock` | 1 | 5s | stereo · one-shot | important |  | The Ember begins to feed (Pallor unlocked). |
| `sting_wager_won` | 1 | 3s | stereo · one-shot | polish |  | A won wager. |
| `sting_heirs` | 1 | 8s | stereo · one-shot | core |  | All ten relics combined: Heir of the Fallen: a choir of ten voices together. |
| `sting_collection` | 1 | 4s | stereo · one-shot | polish |  | Curator tier reached. |
| `sting_class_goal` | 1 | 3s | stereo · one-shot | polish |  | A class goal complete. |
| `sting_first_clear` | 1 | 3s | stereo · one-shot | polish |  | First time reaching a new max depth. |

## 5. Totals

| Section | Entries | Files | Core | Important | Polish | Plays today | New | Encoded (MB) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Player | 100 | 266 | 95 | 125 | 46 | 4 | 96 | 1.7 |
| Weapons and skills | 154 | 404 | 118 | 211 | 75 | 7 | 147 | 2.8 |
| Monsters | 187 | 473 | 131 | 275 | 67 | 0 | 187 | 4.3 |
| Bosses and Fallen | 142 | 297 | 75 | 208 | 14 | 0 | 142 | 4.5 |
| Loot and items | 107 | 254 | 61 | 150 | 43 | 7 | 100 | 2.6 |
| World and props | 59 | 105 | 31 | 44 | 30 | 4 | 55 | 1.8 |
| Events and systems | 92 | 146 | 55 | 73 | 18 | 1 | 91 | 2.7 |
| UI | 73 | 141 | 32 | 73 | 36 | 2 | 71 | 0.8 |
| Ambience beds | 79 | 143 | 18 | 84 | 41 | 9 | 70 | 18.7 |
| Music | 45 | 45 | 24 | 16 | 5 | 9 | 36 | 82.3 |
| Stingers | 30 | 32 | 10 | 16 | 6 | 0 | 30 | 1.7 |
| **Total** | **1068** | **2306** | **650** | **1275** | **381** | **43** | **1025** | **124** |

*Files = entries × variations (core/important/polish count files). "Plays today" counts entries whose name the game already plays (25 sfx, 9 beds, 9 music).*

Quick counts by kind: sfx (all one-shots) 2108 files; ambience beds 50 files, ambience one-shots 71 files; music 45 tracks (117 minutes); stingers 32 files.

## 6. Suggested production order

The goal of the order is that **the game sounds like itself as early as possible**, and each step replaces the synthesised placeholders where the player hears them most. Counts are files.

| Step | What | Files | Why first |
|---|---|---:|---|
| **0. The 43 existing names** | Replace every sound the game already plays with a real one: the 25 sfx (`hit swing cast fire ice bolt arrow hurt die loot loot_rare loot_legendary gold levelup equip potion click error door stairs quest buy sell chest shrine`), the 9 beds (`amb_wind … amb_hearth`) and the 9 music tracks (`music_title … music_echo`). Zero engine work: drop the files in. | 95 | Instantly changes the whole feel; it is the placeholder layer and also the permanent fallback for everything below. |
| **1. Loot** | `drop_*` by rarity, `pickup_*`, `gold_*`, `loot_*` variants, `lootbeam_glint`. | 61 core | Loot is the game: the five or six rarity sounds do more for the game than any 100 others. Produce the legendary/mythic drops *first of all*. |
| **2. Combat feel** | Weapon swings and impacts (`wpn_*`, `hitmat_*`, `crit_*`), `vo_<class>_*` hurt/die, `taken_*`, the four class dashes, `close_call`, `flow_chain_*`, `heat_gain`. | 166 core (player + weapons folders, incl. step 3) | What the player hears every second. |
| **3. Footsteps and doors** | `step_*` for the six core surfaces, `gear_step_*`, stairs, `chest`, barrels/crates, `gate_slam`. | (in step 2's count) | The most-heard sounds in the game; short and cheap to make. |
| **4. Monsters** | The ten body-type sets (`mon_body_<body>_*`: alert/attack/hurt/die/idle/move), the six `mon_shot_*`, `zone_tele*` family, `alert_legendary`. | 127 core | Covers all 27 monsters at 60–80% quality with 10 sound families. |
| **5. Act I music + ambience** | `amb_crypt`, `amb_caves`, `music_crypt`, `music_caves`, `music_town`, `music_boss_gravelord`, `music_boss_broodmother`, `amb_town_cold`, the first two bosses' sfx. | | Players spend the first 10 hours in the first 10 floors. |
| **6. UI** | `click`, `error`, panel opens (`ui_open_*`), `skill_learn`, `buy/sell`, toasts. | 32 core | Cheap, quick, makes the interface feel built. |
| **7. Skills** | Per class, the core skills first: Warrior bash/cleave/whirlwind/leap, Ranger multishot/aimed shot, Sorcerer fire bolt/fireball/chain lightning/frost nova/meteor, Necromancer raise skeleton/bone spear/corpse explosion. | 47 core | Each skill gets its own identity. |
| **8. Act II and III** | `music_inferno*`, `music_abyss*`, `music_rift*`, matching beds, all five remaining bosses' signature sounds, `boss_banner`, Hearthking phases. | | The campaign beyond depth 10. |
| **9. Town warmth, stingers, events and Pallor** | `music_town_thaw/market/warm`, `amb_town_*`, `sting_*`, events, lockdown, Pallor tiers. | | The reward layer and the story moments. |
| **10. Important, then polish** | Everything marked important, then polish. | 1275 + 381 | |

A realistic pace: step 0–3 is the bulk of what makes the game sound finished; steps 4–7 make the world hostile; 8–10 are depth. Stopping after step 7 already leaves a complete, coherent soundscape for the first act and every core mechanic.
Per-section core file counts above (and the table in section 5) define each sound bank for the engine's lazy loading.

## 7. For the engine team

Everything here is *new wiring*. The engine currently only knows the 25 sfx names, 9 beds and 9 music tracks (`src/engine/audio.js`). Nothing in this guide is required for the game to run: a missing file keeps the synth sound, and a missing new name plays its fallback (below).

### 7.1 Infrastructure (requested changes to `audio.js` and `assets.js`)
1. **Sub-folders.** `addFile` accepts only `^sound\/([a-z0-9_]+)\.[a-z0-9]+$` (no sub-folder). The catalog uses `sound/<folder>/<name>.m4a`. Change the regex to `^sound\/(?:[a-z0-9_]+\/)*([a-z0-9_]+)\.(?:m4a|mp3)$`; the name stays the basename (names are globally unique). `tests/assets.html` (which writes `SOUND_LIST.md`) should read the generated list from the new catalog instead; SOUND_LIST.md is now superseded by this file.
2. **Fallback chain.** New names must fall back, never fail silently: `mon_<id>_<ev>` → `mon_body_<body>_<ev>` → existing generic (`hurt`/`die`/`hit`); `skill_<id>_cast` → class-generic `cast`/`fire`/`ice`/`bolt`/`arrow`/`swing`; `drop_<tier>` → `loot`/`loot_rare`/`loot_legendary`; `amb_var_<id>` → `amb_<theme>` → `amb_<kind>` → synth; `music_<boss>` → `music_boss`; `music_<theme>_b/_c` → `music_<theme>`. Implement once in `E.sfx(name)` with an optional `fallback` argument or a static table.
3. **Banks (memory).** All sfx are fetched and decoded at unlock (`decodeAll`). At ~2306 files this is too much RAM for old iPhones. Suggested banks: `core` (UI, player, weapons, loot, close call/flow/heat: everything marked core outside monsters/bosses/skills), then per-theme banks for `mon_*` of that theme and per-class bank for the player's own class's `skill_*` and `vo_*`; bosses load when the arena is entered. Unload previous act banks on town entry. The `folder` column defines the banks.
4. **Rate limits.** Existing: 50 ms same-name throttle, 7 sounds per 120 ms. Needed: per-name limits for the high-frequency sounds (footsteps 0.3 s stride, `skill_cleave_hit` 80 ms across targets, `gold`, `heat_gain`, `monster hurt` 350 ms per monster) and priority so a boss moves, `close_call`, `drop_*` and `crit_*` are never dropped by the burst cap.
5. **Loops with start/stop.** Add `E.loop(name, id)` / `E.stopLoop(id, fade)` for `*_loop` entries (Whirlwind, Blizzard, Incinerate, Heat, lava burn, portal, gaze beam, boss loops, low-life, flow slow-motion). A loop is a looping buffer source with a gain that crossfades 0.15 s in/out.
6. **Positional sound (optional but cheap).** `E.sfxAt(name, x, y)` that sets gain by screen distance and `StereoPanner` by screen x; worth it for monsters, torches, campfires, portals, boss loops.
7. **Music.** `<audio loop>` plays a gap at the loop point on iOS. Either play music as decoded `AudioBufferSource` with `loop = true` (and `loopStart/End`), or double-buffer two `<audio>` elements and start the second ~50 ms before the first ends. Add: **rotation** of `_b/_c` tracks per floor, **phase crossfade** for the Hearthking tracks (`phase` events), `music_event_tension` as an *overlay* that raises while an event/lockdown is active and drops the exploration music 6 dB, **music ducking** under stingers and `boss_banner`, and music selection for `boss_<id>`, `fallen_*`, `town` by `flags.warmth`, `inn`, camps.
8. **Stinger bus.** Stingers (`sting_*`) play on the music bus (or their own) and duck music 6 dB for their length; not subject to the 7-sound cap.
9. **Beds.** Per-variant file lookup (`amb_var_<variant.id>`), theme beds, Pallor overlay beds (`amb_pallor_*` per tier instead of the synth whine), town warmth beds (`amb_town_*`, `hearth` today for warmth ≥ 2), and replace the synthesised random events in `tickBed` with random `amb_ev_*` one-shots when files exist. Decode only the current + next bed.
10. **Mix states.** Short ducks driven by events: Flow slow-motion (low-pass sfx), `boss:blackout` (beds to 20%), Choir silenced (music mute 3 s), death screen, pause (50%). The `ui_open_*` sound for pause.
11. **Footsteps** need a stride timer in `player.js` and a surface lookup (tile type + `map.variant.id`/theme: stone default; `dirt` caves/camps; `cobble`/`grass` town; `ash`/`metal` inferno variants; `bone` ossuary; `glass` glasswork/shards; `flesh` Hellscape taint; `water`/`lava`; `rubble`; `snow` town warmth 0).
12. **Hit material.** A function mapping a monster to a hit-material (`monsters.js def.body`): skeleton→bone, spider→chitin, wraith/blob→ghost/slime, armoured→metal, boss/golem→stone, magma→molten, default flesh; plus the weapon type of the attacker. Plays `wpn_<type>_hit` + `hitmat_<mat>` (+ `crit_hit`).
13. **Pitch variation.** ±4% random playbackRate on every one-shot; rising pitch by stack for `heat_gain`, `close_call_stack`, `skill_learn` (rank), `forge_upgrade` (plus level), `ui_tooltip_open` (rarity).
14. **Dialogue is out of scope**; leave a `voice` bus (volume setting) for later.

### 7.2 Events to hook
Tables list **new** entries only (those that play today are marked ✔ in section 4). *Hook* = the gameplay moment and where it is in code or events. Rows whose hook is the group default show only the group line.

#### 7.2.1 Player

**Footsteps by surface** (`assets/sound/sfx/player/`): Player movement: one step sound every ~0.32 s of walking (needs a new stride timer in player.js), picked by the tile under the feet (`G.world.tileAt`) and the variant/theme; never the same variation twice in a row.


Use the group hook for: `step_stone`, `step_dirt`, `step_cobble`, `step_grass`, `step_wood`, `step_water`, `step_lava`, `step_rubble`, `step_bone`, `step_ash`, `step_metal`, `step_glass`, `step_snow`, `step_flesh`, `step_stairs`.

**Armour-weight overlays (layered under every step)** (`assets/sound/sfx/player/`): Played together with the surface step, chosen from the equipped chest piece `armorClass` (cloth / light / heavy). Replaces a full surface x weight matrix (see the spec section).

| File | Hook |
|---|---|
| `gear_step_cloth` | Layer on every step when chest.armorClass is cloth or none |
| `gear_step_light` | Layer when chest.armorClass is light |
| `gear_step_heavy` | Layer when chest.armorClass is heavy |
| `gear_land_heavy` | Layer on `land_*` when armorClass is heavy |

**Dash, class action and landings** (`assets/sound/sfx/player/`): Class action (`getClassAction` / `useClassAction`, `input:classaction`) and the Leap-the-gap crossing; charge pip refill is in the HUD loop (`getClassAction().recharge`).

| File | Hook |
|---|---|
| `dash_charge` | Warrior dash start (kind charge) |
| `dash_charge_hit` | Per foe struck by the charge (60% dmg + stun) |
| `dash_roll` | Ranger dash start (kind roll) |
| `dash_gravestep` | Necromancer dash start (kind roll with teleport fx) |
| `blink_out` | Sorcerer dash / Teleport start, at the origin tile |
| `blink_in` | Same event, at the destination tile |
| `dash_pip` | HUD, when `getClassAction().charges` goes up |
| `dash_denied` | Dash pressed with 0 charges (today `error`) |
| `dash_groundslam` | Dash augment `dash_groundslam` landing |
| `dash_rimestep` | Dash augment `rime_step` at origin tile |
| `dash_graveswap` | Dash augment `grave_swap` swap |
| `dash_tumbleshot` | Dash augment `tumble_shot` |
| `dash_brawler` | Perk `Brawler's Roll` sweep |
| `land_soft` | After Leap-the-gap crossing / roll ends on ground |
| `land_heavy` | After `blink`/leap-type movement ends |
| `leap_gap_cross` | Dash passes over a CHASM tile and lands (R10 leap crossing) |

**Voice: non-verbal vocalisations per class** (`assets/sound/sfx/player/`): Player hurt / death / effort. Voices are non-verbal only (no words). One voice per class so the player always hears which class they are. Hurt picks `_big` when one hit takes more than 8% max life.

| File | Hook |
|---|---|
| `vo_warrior_hurt` | `player:damaged` (today `hurt`) |
| `vo_warrior_hurt_big` | `player:damaged` when amount > 8% hpMax |
| `vo_warrior_die` | `player:died` (today `die`) |
| `vo_warrior_effort` | Basic attack / skill cast, rate-limited |
| `vo_warrior_dash` | Class action use |
| `vo_warrior_revive` | Respawn in town / `revivePlayer` |
| `vo_warrior_lowlife` | Player life < 25% (loop, fade by life %) |
| `vo_ranger_hurt` | `player:damaged` (today `hurt`) |
| `vo_ranger_hurt_big` | `player:damaged` when amount > 8% hpMax |
| `vo_ranger_die` | `player:died` (today `die`) |
| `vo_ranger_effort` | Basic attack / skill cast, rate-limited |
| `vo_ranger_dash` | Class action use |
| `vo_ranger_revive` | Respawn in town / `revivePlayer` |
| `vo_ranger_lowlife` | Player life < 25% (loop, fade by life %) |
| `vo_sorcerer_hurt` | `player:damaged` (today `hurt`) |
| `vo_sorcerer_hurt_big` | `player:damaged` when amount > 8% hpMax |
| `vo_sorcerer_die` | `player:died` (today `die`) |
| `vo_sorcerer_effort` | Basic attack / skill cast, rate-limited |
| `vo_sorcerer_dash` | Class action use |
| `vo_sorcerer_revive` | Respawn in town / `revivePlayer` |
| `vo_sorcerer_lowlife` | Player life < 25% (loop, fade by life %) |
| `vo_necromancer_hurt` | `player:damaged` (today `hurt`) |
| `vo_necromancer_hurt_big` | `player:damaged` when amount > 8% hpMax |
| `vo_necromancer_die` | `player:died` (today `die`) |
| `vo_necromancer_effort` | Basic attack / skill cast, rate-limited |
| `vo_necromancer_dash` | Class action use |
| `vo_necromancer_revive` | Respawn in town / `revivePlayer` |
| `vo_necromancer_lowlife` | Player life < 25% (loop, fade by life %) |

**Damage taken, defence, status effects** (`assets/sound/sfx/player/`): Player combat feedback not tied to a skill: `player:damaged`, block/dodge rolls, thorns/steal procs, status effects on the player (`effects`), Close-Call-style defence.

| File | Hook |
|---|---|
| `taken_melee` | `player:damaged` where source is a melee attack |
| `taken_projectile` | `player:damaged` where source is a projectile |
| `taken_magic` | `player:damaged` where source is a zone/blast |
| `taken_armor` | `player:damaged` low amount while heavy armour is worn |
| `block_shield` | Block stat proc (offhand shield) |
| `dodge_whoosh` | Dodge stat proc |
| `thorns_reflect` | Thorns proc on the player |
| `lifesteal_pulse` | Life steal heal tick |
| `manasteal_pulse` | Mana steal tick |
| `status_burn` | Effect `burn` applied to player |
| `status_chill` | Effect `chill` |
| `status_freeze` | Effect `freeze` on / `status_freeze_off` below |
| `status_freeze_off` | Effect `freeze` removed |
| `status_shock` | Effect `shock` |
| `status_poison` | Effect `poison` |
| `status_bleed` | Effect `bleed` |
| `status_stun` | Effect `stun` |
| `status_slow` | Effect `slow` |
| `status_bleach` | Effect `bleach` |
| `status_rooted` | Root effect applied |
| `status_cleanse` | Any harmful effect expiring |

**Potions, regen, level and attributes** (`assets/sound/sfx/player/`): Belt potions (`usePotion`), XP and attribute actions.

| File | Hook |
|---|---|
| `potion_mp` | `usePotion('mp')` (today `potion`) |
| `potion_empty` | `usePotion` when none left / on cooldown (today `error`) |
| `potion_ready` | HUD cooldown ready |
| `levelup_milestone` | `player:levelup` at level % 10 == 0 |
| `xp_gain_big` | `player:xp` with gained > 5% of level |
| `attr_spend` | `spendAttr` |

**Death, corpse run and Echo moments (player side)** (`assets/sound/sfx/player/`): Death and revival flow.

| File | Hook |
|---|---|
| `death_fall` | `player:died` |
| `death_corpse_drop` | `player:died` when a corpse is created |
| `corpse_reclaim` | `object:interact { type:'corpse' }` / `reclaimCorpse` |
| `corpse_near` | Corpse within ~6 tiles |
| `respawn` | `respawn()` |
| `revive_in_dungeon` | Perk Last Stand / mythic `second_wind` |

#### 7.2.2 Weapons and skills

**Basic attacks: swings by weapon type** (`assets/sound/sfx/weapons/`): Basic melee attack animation start (`player.js`, today `swing`). Twohanded flag picks the heavy set; unarmed when no weapon.

| File | Hook |
|---|---|
| `wpn_sword_swing` | Sword basic swing |
| `wpn_axe_swing` | Axe basic swing |
| `wpn_mace_swing` | Mace basic swing |
| `wpn_dagger_swing` | Dagger basic swing |
| `wpn_heavy_swing` | `twoHanded` weapon swing |
| `wpn_unarmed_swing` | No weapon equipped |
| `wpn_shield_bash` | Perks that shove |

**Basic attacks: ranged and casters** (`assets/sound/sfx/weapons/`): Ranged basic attack (`player.js`: `arrow` for bows, `bolt` for caster basics).

| File | Hook |
|---|---|
| `bow_draw` | Windup of `snipe` / `aimed_shot` |
| `arrow_whiz` | Enemy arrow passes within ~1.2 tiles |
| `wand_zap` | Wand/staff basic |
| `staff_cast` | Staff basic |

**Impacts: weapon flavour and target material** (`assets/sound/sfx/weapons/`): Basic hit and skill hits: layer one weapon-flavour impact and one target-material impact (monster body type to material: skeleton -> bone, spider/crab -> chitin, wraith/shadowling -> ghost, slime -> slime, dread knight/demon w/ armour -> metal, boss/stone -> stone, magma -> molten, others -> flesh). Today `hit` plays for all.

| File | Hook |
|---|---|
| `wpn_sword_hit` | Hit with sword |
| `wpn_axe_hit` | Hit with axe |
| `wpn_mace_hit` | Hit with mace |
| `wpn_dagger_hit` | Hit with dagger |
| `wpn_heavy_hit` | Hit with `twoHanded` weapon |
| `wpn_unarmed_hit` | Hit unarmed |
| `hitmat_flesh` | Target body humanoid/beast/brute/demon/flyer |
| `hitmat_bone` | Target body skeleton |
| `hitmat_metal` | Target armour > 20 or Shielding/Armoured affix up |
| `hitmat_ghost` | Target body wraith/shadowling |
| `hitmat_slime` | Target body blob |
| `hitmat_chitin` | Target body spider |
| `hitmat_stone` | Target is a boss/golem/statue |
| `hitmat_molten` | Target magma brute |
| `crit_hit` | `combat.js` hit with crit = true |
| `crit_big` | Hit with crit and damage > 25% target life |
| `kill_blow` | `monster:killed` slightly before die sound |
| `arrow_hit_flesh` | Arrow projectile hit, flesh |
| `arrow_hit_bone` | Arrow projectile hit, skeleton |
| `arrow_hit_wall` | Arrow projectile expires in terrain |
| `bolt_hit` | Basic caster bolt hit |

**Mythic and perk procs on weapons** (`assets/sound/sfx/weapons/`): The 12 Legendary Mythic effects (`getActiveEffects`) and a few perks; all short layered cues that say "something special just happened".

| File | Hook |
|---|---|
| `fx_split_shot` | Mythic effect proc |
| `fx_corpse_blast` | Mythic effect proc |
| `fx_chain_spark` | Mythic effect proc |
| `fx_second_wind` | Mythic effect proc |
| `fx_echo_cast` | Mythic effect proc |
| `fx_blood_price` | Mythic effect proc |
| `fx_midas` | Mythic effect proc |
| `fx_frozen_wake` | Mythic effect proc |
| `fx_legion` | Mythic effect proc |
| `fx_thunderstep` | Mythic effect proc |
| `fx_executioner` | Mythic effect proc |
| `fx_hoarder` | Mythic effect proc |

**Skill system shared sounds** (`assets/sound/sfx/skills/shared/`): Skill bar and cooldown feedback, buffs, and generic fallbacks (cast/fire/ice/bolt already exist).

| File | Hook |
|---|---|
| `skill_ready` | HUD cooldown complete |
| `skill_nomana` | `useSkill` refused for mana (today `error`) |
| `skill_cooldown` | `useSkill` refused for cooldown |
| `buff_on` | Buff effect applied to the player |
| `buff_off` | Buff effect expired |
| `zone_cast_ring` | `K().zone()` creation |
| `aoe_ring_pulse` | Melee/self AoE ring fx |

**Warrior skills** (`assets/sound/sfx/skills/warrior/`): Warrior skills (data_skills.js): hooks per row; impact rows play on damage.

| File | Hook |
|---|---|
| `skill_bash_cast` | Active skill `bash`: play at `cast()` (data_skills.js; today the skill plays generic `swing/hit`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_bash_hit` | Hit by Bash |
| `skill_charge_cast` | Active skill `charge`: play at `cast()` (data_skills.js; today the skill plays generic `swing`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_charge_hit` | Hit by Charge |
| `skill_rend_cast` | Active skill `rend`: play at `cast()` (data_skills.js; today the skill plays generic `swing`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_rend_hit` | Hit by Rend |
| `skill_execute_cast` | Active skill `execute`: play at `cast()` (data_skills.js; today the skill plays generic `swing`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_execute_hit` | Hit by Execute |
| `skill_execute_finish` | Execute below 30% target life |
| `skill_cleave_cast` | Active skill `cleave`: play at `cast()` (data_skills.js; today the skill plays generic `swing`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_cleave_hit` | Each target of Cleave |
| `skill_whirlwind_start` | Active skill `whirlwind`: play at `cast()` (data_skills.js; today the skill plays generic `swing`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_whirlwind_loop` | Whirlwind buff active (loop while `whirlwind` buff lasts) |
| `skill_whirlwind_end` | Whirlwind buff ends |
| `skill_leap_cast` | Active skill `leap`: play at `cast()` (data_skills.js; today the skill plays generic `hit`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_leap_land` | `K().blink` in Leap, at landing |
| `skill_earthquake_cast` | Active skill `earthquake`: play at `cast()` (data_skills.js; today the skill plays generic `hit`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_earthquake_wave` | Each Earthquake wave |
| `skill_shout_battle` | Active skill `battle_shout`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_shout_war` | Active skill `war_cry`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_shield_wall_on` | Active skill `shield_wall`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_shield_wall_hit` | Damage taken while Shield Wall active |
| `skill_shield_wall_off` | Shield Wall ends |

**Ranger skills** (`assets/sound/sfx/skills/ranger/`): Ranger skills (data_skills.js).

| File | Hook |
|---|---|
| `skill_aimed_shot_cast` | Active skill `aimed_shot`: play at `cast()` (data_skills.js; today the skill plays generic `arrow`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_aimed_shot_hit` | Hit by Aimed Shot |
| `skill_piercing_cast` | Active skill `piercing_shot`: play at `cast()` (data_skills.js; today the skill plays generic `arrow`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_piercing_hit` | Each foe pierced |
| `skill_poison_arrow_cast` | Active skill `poison_arrow`: play at `cast()` (data_skills.js; today the skill plays generic `arrow`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_poison_arrow_hit` | Hit by Poison Arrow |
| `skill_snipe_cast` | Active skill `snipe`: play at `cast()` (data_skills.js; today the skill plays generic `arrow`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_snipe_hit` | Hit by Snipe |
| `skill_multishot_cast` | Active skill `multishot`: play at `cast()` (data_skills.js; today the skill plays generic `arrow`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_rain_cast` | Active skill `rain_of_arrows`: play at `cast()` (data_skills.js; today the skill plays generic `arrow`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_rain_land` | Each Rain of Arrows volley (zone tick) |
| `skill_explosive_arrow_cast` | Active skill `explosive_arrow`: play at `cast()` (data_skills.js; today the skill plays generic `arrow`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_explosive_arrow_hit` | Explosion on impact |
| `skill_arrow_storm_cast` | Active skill `arrow_storm`: play at `cast()` (data_skills.js; today the skill plays generic `arrow`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_arrow_storm_hit` | On Arrow Storm completion |
| `skill_trap_set` | Active skill `spike_trap / frost_trap`: play at `cast()` (data_skills.js; today the skill plays generic `arrow`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_spike_trap_burst` | Trap detonation (`zone` spring) |
| `skill_frost_trap_burst` | Trap detonation (`zone` spring) |
| `skill_camouflage_on` | Active skill `camouflage`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_camouflage_off` | Camouflage ends |
| `perk_trap_arm` | Trap armed |

**Sorcerer skills** (`assets/sound/sfx/skills/sorcerer/`): Sorcerer skills (data_skills.js).

| File | Hook |
|---|---|
| `skill_fire_bolt_cast` | Active skill `fire_bolt`: play at `cast()` (data_skills.js; today the skill plays generic `fire`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_fire_bolt_hit` | Hit by Fire Bolt |
| `skill_fireball_cast` | Active skill `fireball`: play at `cast()` (data_skills.js; today the skill plays generic `fire`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_fireball_travel` | Fireball projectile alive |
| `skill_fireball_hit` | Fireball explosion |
| `skill_incinerate_start` | Active skill `incinerate`: play at `cast()` (data_skills.js; today the skill plays generic `fire`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_incinerate_loop` | Incinerate buff active |
| `skill_meteor_cast` | Active skill `meteor`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_meteor_hit` | Meteor zone detonation |
| `skill_ice_shard_cast` | Active skill `ice_shard`: play at `cast()` (data_skills.js; today the skill plays generic `ice`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_ice_shard_hit` | Hit by Ice Shard |
| `skill_frost_nova_cast` | Active skill `frost_nova`: play at `cast()` (data_skills.js; today the skill plays generic `ice`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_frost_nova_freeze` | Each foe frozen by Frost Nova |
| `skill_shatter` | `combat.js` shatter (line ~225) |
| `skill_blizzard_cast` | Active skill `blizzard`: play at `cast()` (data_skills.js; today the skill plays generic `ice`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_blizzard_loop` | Blizzard zone alive (loop, fade at end) |
| `skill_glacial_spike_cast` | Active skill `glacial_spike`: play at `cast()` (data_skills.js; today the skill plays generic `ice`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_glacial_spike_hit` | Hit by Glacial Spike |
| `skill_chain_cast` | Active skill `chain_lightning`: play at `cast()` (data_skills.js; today the skill plays generic `bolt`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_chain_arc` | Each chain jump |
| `skill_teleport` | Active skill `teleport`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_mana_shield_on` | Active skill `mana_shield`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_mana_shield_hit` | Damage taken while Mana Shield active |
| `skill_mana_shield_off` | Mana Shield ends |
| `skill_thunderstorm_start` | Active skill `thunderstorm`: play at `cast()` (data_skills.js; today the skill plays generic `bolt`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_thunderstorm_loop` | Thunderstorm buff active |
| `skill_thunderstorm_strike` | Each Thunderstorm strike |

**Necromancer skills and minions** (`assets/sound/sfx/skills/necromancer/`): Necromancer skills (data_skills.js).

| File | Hook |
|---|---|
| `skill_raise_cast` | Active skill `raise_skeleton`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_raise_spawn` | Each minion created |
| `skill_corpse_explosion_cast` | Active skill `corpse_explosion`: play at `cast()` (data_skills.js; today the skill plays generic `fire`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_corpse_explosion_hit` | Corpse explosion blast |
| `skill_skeletal_mage_cast` | Active skill `skeletal_mage`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_golem_cast` | Active skill `golem`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_bone_spear_cast` | Active skill `bone_spear`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_bone_spear_hit` | Hit by Bone Spear (per foe pierced, throttled) |
| `skill_bone_armor_on` | Active skill `bone_armor`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_bone_armor_hit` | Damage absorbed by Bone Armor |
| `skill_bone_armor_break` | Bone Armor absorb depleted |
| `skill_bone_nova_cast` | Active skill `bone_nova`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_life_drain_start` | Active skill `life_drain`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_life_drain_loop` | Life Drain buff active |
| `skill_bone_spirit_cast` | Active skill `bone_spirit`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_bone_spirit_travel` | Spirit projectile alive |
| `skill_bone_spirit_hit` | Hit by Bone Spirit |
| `skill_amplify_cast` | Active skill `amplify_damage`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_decrepify_cast` | Active skill `decrepify`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_poison_nova_cast` | Active skill `poison_nova`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_lich_start` | Active skill `lich_form`: play at `cast()` (data_skills.js; today the skill plays generic `cast`). Impact sound on the first damage tick per target (throttled to 1 per 80 ms across all targets so a Cleave on 8 foes is not 8 sounds). |
| `skill_lich_loop` | Lich buff active |
| `skill_lich_end` | Lich buff ends |
| `minion_summon_pop` | Perk-created minions |
| `minion_golem_stomp` | Golem walk cycle, throttled |

#### 7.2.3 Monsters

**Body-type sets (core: every monster falls back to its body type)** (`assets/sound/sfx/monsters/shared/`): Monster events (`monsters.js` AI state changes): alert = first aggro (once per monster, rate-limited to 1 per 0.5 s globally), attack = start of the swing/shot windup, hurt = damage taken (rate-limited per monster to 1 per 0.35 s), die = death (the same frame as `monster:killed`), idle = random 6-14 s timer while idle/near but not aggro, move = footfall/wingbeat while walking. Falls back from `mon_<id>_*` to `mon_body_<body>_*` to the existing generics `hurt`/`die`/`hit`.


Use the group hook for: `mon_body_humanoid_alert`, `mon_body_humanoid_attack`, `mon_body_humanoid_hurt`, `mon_body_humanoid_die`, `mon_body_humanoid_idle`, `mon_body_humanoid_move`, `mon_body_skeleton_alert`, `mon_body_skeleton_attack`, `mon_body_skeleton_hurt`, `mon_body_skeleton_die`, `mon_body_skeleton_idle`, `mon_body_skeleton_move`, `mon_body_beast_alert`, `mon_body_beast_attack`, `mon_body_beast_hurt`, `mon_body_beast_die`, `mon_body_beast_idle`, `mon_body_beast_move`, `mon_body_blob_alert`, `mon_body_blob_attack`, `mon_body_blob_hurt`, `mon_body_blob_die`, `mon_body_blob_idle`, `mon_body_blob_move`, `mon_body_flyer_alert`, `mon_body_flyer_attack`, `mon_body_flyer_hurt`, `mon_body_flyer_die`, `mon_body_flyer_idle`, `mon_body_flyer_move`, `mon_body_spider_alert`, `mon_body_spider_attack`, `mon_body_spider_hurt`, `mon_body_spider_die`, `mon_body_spider_idle`, `mon_body_spider_move`, `mon_body_caster_alert`, `mon_body_caster_attack`, `mon_body_caster_hurt`, `mon_body_caster_die`, `mon_body_caster_idle`, `mon_body_caster_move`, `mon_body_brute_alert`, `mon_body_brute_attack`, `mon_body_brute_hurt`, `mon_body_brute_die`, `mon_body_brute_idle`, `mon_body_brute_move`, `mon_body_wraith_alert`, `mon_body_wraith_attack`, `mon_body_wraith_hurt`, `mon_body_wraith_die`, `mon_body_wraith_idle`, `mon_body_wraith_move`, `mon_body_demon_alert`, `mon_body_demon_attack`, `mon_body_demon_hurt`, `mon_body_demon_die`, `mon_body_demon_idle`, `mon_body_demon_move`.

**Attack projectiles, telegraphs and zones (monsters)** (`assets/sound/sfx/monsters/shared/`): Enemy ranged attacks (`monsters.js` shoot/blast/zone): one launch sound per `proj.shape` and one impact per shape; telegraph sound when a zone/blast marker appears.

| File | Hook |
|---|---|
| `mon_shot_arrow` | Monster shoots `proj.shape arrow` (skeleton archer, Fallen) |
| `mon_shot_bolt` | `proj.shape bolt` |
| `mon_shot_orb` | `proj.shape orb` |
| `mon_shot_fireball` | `proj.shape fireball` (bone mage, ember imp, boss) |
| `mon_shot_shard` | `proj.shape shard` |
| `mon_shot_spit` | `proj.shape spit` (spiders, Skarn) |
| `proj_hit_arrow` | Enemy projectile hits |
| `proj_hit_bolt` | Enemy projectile hits |
| `proj_hit_fire` | Enemy projectile hits |
| `proj_hit_shard` | Enemy projectile hits |
| `proj_hit_spit` | Enemy projectile hits |
| `zone_tele` | Zone created with a `tele` (`combat.js` zones / blast moves) |
| `zone_tele_short` | Zone with tele <= 0.6 s |
| `zone_tele_long` | Zone with tele >= 1.0 s |
| `zone_blast_fire` | Zone detonation, `dtype fire` |
| `zone_blast_cold` | Zone detonation, `dtype cold` |
| `zone_blast_poison` | Zone detonation, `dtype poison` |
| `zone_blast_phys` | Zone detonation, `dtype phys` |
| `zone_linger_loop` | Zone with `linger` |
| `zone_dodge` | Zone triggers with player out of range after being inside |
| `mon_death_blast_fire` | Monster dies with `deathBlast`/Fire Enchanted |
| `mon_death_blast_cold` | Monster dies with Frozen |

**Corpses, tiers and rarity cues** (`assets/sound/sfx/monsters/shared/`): Monster tier announcements and corpse handling.

| File | Hook |
|---|---|
| `corpse_thud` | ~0.4 s after death for brute/humanoid |
| `corpse_decay` | Corpse removal |
| `alert_champion` | Champion pack first aggro (once per pack) |
| `alert_rare` | Rare first aggro |
| `alert_legendary` | Legendary announce `ui:toast` + first aggro (today `shrine`) |
| `legendary_spawn_sense` | Legendary announce on floor arrival |
| `pallid_alert` | Pallid first aggro |

**Crypt monsters (depths 1-5)** (`assets/sound/sfx/monsters/crypt/`): Per-monster signature (monsters.js / data_monsters.js): plays at the named event; the body-type set still plays alongside (these replace only the voice layer).

| File | Hook |
|---|---|
| `mon_skeleton_archer_draw` | Archer windup |
| `mon_grave_rat_chitter` | Pack alert (once per pack) |
| `mon_bone_mage_chant` | Bone mage windup |

Use the group hook for: `mon_skeleton_alert`, `mon_skeleton_die`, `mon_grave_rat_die`, `mon_ghoul_alert`, `mon_ghoul_attack`, `mon_wraith_alert`, `mon_wraith_die`.

**Cave monsters (depths 6-10)** (`assets/sound/sfx/monsters/caves/`): Per-monster signature (monsters.js / data_monsters.js): plays at the named event; the body-type set still plays alongside (these replace only the voice layer).

| File | Hook |
|---|---|
| `mon_goblin_slinger_whirl` | Slinger windup |
| `mon_cave_spider_skitter` | Spiders in aggro |
| `mon_cave_bat_flutter` | Bat movement |
| `mon_troll_regen` | Regen tick (rate-limited) |
| `mon_shaman_chant` | Shaman windup |

Use the group hook for: `mon_goblin_alert`, `mon_goblin_die`, `mon_cave_spider_hiss`, `mon_cave_bat_screech`, `mon_troll_alert`, `mon_troll_stomp`, `mon_slime_squelch`, `mon_slime_die`.

**Inferno monsters (depths 11-15)** (`assets/sound/sfx/monsters/inferno/`): Per-monster signature (monsters.js / data_monsters.js): plays at the named event; the body-type set still plays alongside (these replace only the voice layer).

| File | Hook |
|---|---|
| `mon_fire_imp_spit` | Windup |

Use the group hook for: `mon_imp_cackle`, `mon_imp_flutter`, `mon_imp_die`, `mon_hellhound_howl`, `mon_hellhound_pant`, `mon_hellhound_leap`, `mon_magma_brute_stomp`, `mon_magma_brute_alert`, `mon_pyromancer_chant`, `mon_demon_warrior_roar`, `mon_demon_warrior_axe`.

**Abyss monsters (depths 16+)** (`assets/sound/sfx/monsters/abyss/`): Per-monster signature (monsters.js / data_monsters.js): plays at the named event; the body-type set still plays alongside (these replace only the voice layer).

| File | Hook |
|---|---|
| `mon_void_wraith_blink` | Void Wraith `blink` |
| `mon_gazer_charge` | Gazer windup |
| `mon_void_caller_open` | Void Caller blast tele |

Use the group hook for: `mon_void_wraith_alert`, `mon_abyss_stalker_skitter`, `mon_abyss_stalker_alert`, `mon_gazer_hum`, `mon_gazer_die`, `mon_dread_knight_step`, `mon_dread_knight_alert`, `mon_dread_knight_die`, `mon_shadowling_hiss`, `mon_shadowling_die`.

**Minions, summons and neutral creatures** (`assets/sound/sfx/monsters/minions/`): Per-monster signature (monsters.js / data_monsters.js): plays at the named event; the body-type set still plays alongside (these replace only the voice layer).

| File | Hook |
|---|---|
| `mon_minion_skeleton_attack` | Minion attack |
| `mon_minion_skeleton_die` | Minion death |
| `mon_minion_mage_cast` | Minion cast |
| `mon_scavenger_appear` | `scavenger:appear` |
| `mon_scavenger_race` | `scavenger:race` |
| `mon_scavenger_grab` | `scavenger:grab` |
| `mon_scavenger_flee` | Scavenger flee state |
| `mon_scavenger_caught` | Scavenger killed (stash drop) |
| `mon_scavenger_escape` | Scavenger escapes the floor |
| `mon_magpie_squeak` | `thief` event |
| `mon_magpie_caught` | Event `thief` success |

Use the group hook for: `mon_minion_golem_attack`, `mon_minion_golem_die`.

**Elite modifier (affix) cues** (`assets/sound/sfx/monsters/shared/`): Each elite modifier gets one short signature cue so the player learns it by ear (`G.game.AFFIXES`, `mods.js`, `deep.js`): played when its power activates, not constantly.

| File | Hook |
|---|---|
| `mod_fast` | Affix visible effect (first aggro) |
| `mod_extra_strong` | Attack of an Extra Strong monster |
| `mod_stalwart` | Hit on a Stalwart monster |
| `mod_vampiric` | Vampiric heal |
| `mod_teleporter` | Affix `blinkT` fires |
| `mod_shielding_on` | Affix `shieldT` up |
| `mod_shielding_off` | Shield ends |
| `mod_thorned` | Thorns damage to player |
| `mod_regenerating` | Regen tick (rate-limited) |
| `mod_mortar` | Affix `mortar` |
| `mod_jailer` | Affix `jail` |
| `mod_molten` | Affix `molten` drop |
| `mod_plagued` | Monster with `plague` alive near player |
| `mod_aura_might` | Aura pulse (every 0.5 s: throttle to 3 s) |
| `mod_aura_haste` | Aura pulse (throttle) |
| `mod_mana_burn` | Hit by Mana Burn |
| `mod_knockback` | Knockback hit |
| `mod_volley` | Affix `volley` |
| `mod_frenzied` | Affix triggers |
| `mod_evasive` | Evasive miss |
| `mod_armoured` | Hit on Armoured (replaces `hitmat`) |
| `mod_siege` | Affix `siege` |
| `mod_splitting` | Legendary Splitting death |
| `mod_nova_charge` | Affix `nova` tele (at spawn of ring) |
| `mod_nova_blast` | Nova detonation |
| `mod_reflecting` | Projectile reflected |
| `mod_vortex` | Affix `vortex` |
| `mod_enraging` | Affix triggers |
| `mod_shadecaller` | Affix `shades` |
| `mod_gravewalker` | Deep affix |
| `mod_siphoning` | Deep affix |
| `mod_devouring` | Deep affix `Devours` |
| `mod_arcing` | Deep affix (31+) |
| `mod_hexing` | Deep affix (31+) |
| `mod_duplicating` | Deep affix (41+) |
| `mod_undying_pact` | Deep affix (41+) |
| `mod_time_warp` | Deep affix (41+) |

#### 7.2.4 Bosses and Fallen

**Shared boss sounds** (`assets/sound/sfx/bosses/shared/`): Boss and Fallen events (campaign.js / bosses.js / fallen.js / monsters.js): moves are named as in the data tables; tele-sounds end where the damage lands (`zone_tele*` family is the fallback). Phase changes run `bossPhase`. Today only generic `bolt/cast/fire/hit/shrine/arrow/swing/ice/gold` are played.

| File | Hook |
|---|---|
| `boss_banner` | Boss banner shown (UI story boss intro) |
| `boss_arena_seal` | Entering the boss arena / `flags.sealed` for boss |
| `boss_arena_open` | Boss killed; arena opens |
| `boss_phase` | Boss `phases[i].at` |
| `boss_enrage` | Phase with `enrage` |
| `boss_telegraph` | Boss move tele |
| `boss_hit_taken` | Hit on a boss (layer) |
| `boss_die_generic` | Boss dies (fallback for named bosses) |
| `boss_kill_hush` | Boss killed (ducks music, silence before the stinger) |
| `boss_loot_burst` | Boss `dropLoot` |
| `boss_add_spawn` | `summon` kind moves |
| `boss_slam` | `slam` kind moves |
| `boss_charge` | `charge` kind moves |
| `boss_blink` | `blink` kind moves |
| `boss_fan` | `fan` kind moves |
| `boss_ring` | `ring` kind moves |
| `boss_circles` | `circles` kind moves |

**Morgrath the Gravelord (depth 5)** (`assets/sound/sfx/bosses/gravelord/`): Boss and Fallen events (campaign.js / bosses.js / fallen.js / monsters.js): moves are named as in the data tables; tele-sounds end where the damage lands (`zone_tele*` family is the fallback). Phase changes run `bossPhase`. Today only generic `bolt/cast/fire/hit/shrine/arrow/swing/ice/gold` are played.

| File | Hook |
|---|---|
| `boss_gravelord_alert` | Boss aggro |
| `boss_gravelord_sermon` | Sweep attack |
| `boss_gravelord_name` | Name read (every 6 s) |
| `boss_gravelord_grave_rise` | Skeleton rises from the named grave |
| `boss_gravelord_grave_safe` | Player stands on the grave when the timer ends |
| `boss_gravelord_count_loop` | Phase 2 loop |
| `boss_gravelord_named_stack` | Effect `named` stack |
| `boss_gravelord_lunge` | Phase 3 lunges (3) |
| `boss_gravelord_raise_court` | Phase move `Raise Court` |
| `boss_gravelord_bone_storm` | Phase move `Bone Storm` |
| `boss_gravelord_die` | Boss death |

**Skarn "Mother" the Broodmother (depth 10)** (`assets/sound/sfx/bosses/broodmother/`): Boss and Fallen events (campaign.js / bosses.js / fallen.js / monsters.js): moves are named as in the data tables; tele-sounds end where the damage lands (`zone_tele*` family is the fallback). Phase changes run `bossPhase`. Today only generic `bolt/cast/fire/hit/shrine/arrow/swing/ice/gold` are played.

| File | Hook |
|---|---|
| `boss_broodmother_alert` | Boss aggro |
| `boss_broodmother_roof_skitter` | Phase 1 roof loop |
| `boss_broodmother_sac_pulse` | Egg sac alive |
| `boss_broodmother_sac_pop` | `sacOf` popped |
| `boss_broodmother_hatch` | Sac timer end |
| `boss_broodmother_drop` | Phase 2 start |
| `boss_broodmother_web_spit` | `Venom Spit` |
| `boss_broodmother_pounce` | `Pounce` |
| `boss_broodmother_charge` | Move |
| `boss_broodmother_eat` | Eats a spider (each +5%) |
| `boss_broodmother_shriek` | Enrage |
| `boss_broodmother_die` | Boss death |

**Azgalor, the Ember Tyrant (depth 15)** (`assets/sound/sfx/bosses/tyrant/`): Boss and Fallen events (campaign.js / bosses.js / fallen.js / monsters.js): moves are named as in the data tables; tele-sounds end where the damage lands (`zone_tele*` family is the fallback). Phase changes run `bossPhase`. Today only generic `bolt/cast/fire/hit/shrine/arrow/swing/ice/gold` are played.

| File | Hook |
|---|---|
| `boss_tyrant_alert` | Boss aggro |
| `boss_tyrant_hoard_loop` | On the fire vein |
| `boss_tyrant_nova` | `Fire Nova` |
| `boss_tyrant_leap` | `Infernal Leap` |
| `boss_tyrant_grid_line` | `Molten` grid |
| `boss_tyrant_grid_tele` | Grid tele |
| `boss_tyrant_meteor` | `The Promise` |
| `boss_tyrant_roar` | Phase 3 start |
| `boss_tyrant_imps` | `Call Imps` |
| `boss_tyrant_cinders` | `Ring of Cinders` |
| `boss_tyrant_die` | Boss death |

**Xal'thuun, the Hollow Star (depth 20)** (`assets/sound/sfx/bosses/hollow/`): Boss and Fallen events (campaign.js / bosses.js / fallen.js / monsters.js): moves are named as in the data tables; tele-sounds end where the damage lands (`zone_tele*` family is the fallback). Phase changes run `bossPhase`. Today only generic `bolt/cast/fire/hit/shrine/arrow/swing/ice/gold` are played.

| File | Hook |
|---|---|
| `boss_hollow_alert` | Boss aggro |
| `boss_hollow_gaze_loop` | Phase 1 gaze active |
| `boss_hollow_gaze_hit` | Gaze damage tick |
| `boss_hollow_pull_loop` | Phase 2 pull active |
| `boss_hollow_pull_break` | Dash away during pull |
| `boss_hollow_shards_loop` | Phase 2 orbiting shards |
| `boss_hollow_blackout_warn` | `boss:blackout` start (t seconds before reopening) |
| `boss_hollow_blackout_loop` | `boss:blackout` active |
| `boss_hollow_reopen` | Blackout ends, blast |
| `boss_hollow_voidbolts` | `Void Bolts` |
| `boss_hollow_well` | `Void Wells` |
| `boss_hollow_starfall` | `Starfall` |
| `boss_hollow_die` | Boss death |

**The Choir (depth 25)** (`assets/sound/sfx/bosses/choir/`): Boss and Fallen events (campaign.js / bosses.js / fallen.js / monsters.js): moves are named as in the data tables; tele-sounds end where the damage lands (`zone_tele*` family is the fallback). Phase changes run `bossPhase`. Today only generic `bolt/cast/fire/hit/shrine/arrow/swing/ice/gold` are played. The Choir is a rhythm fight: produce its sounds as pitched notes in one key (suggested D minor) and keep `music_boss_choir` at 120 bpm (a note every 1.5 s = 3 beats, every 1.0 s = 2 beats).

| File | Hook |
|---|---|
| `boss_choir_alert` | Boss aggro |
| `boss_choir_note_low` | Hymn ring spawn (distinct rows by safe/harm below) |
| `boss_choir_note_mid` | Hymn ring spawn |
| `boss_choir_note_high` | Hymn ring spawn |
| `boss_choir_harm` | Hymn ring hits (damage zone) |
| `boss_choir_safe` | Player in a safe ring (audio confirmation) |
| `boss_choir_wrong` | Wrong singer alive (pulse ring); moves every 6 s |
| `boss_choir_wrong_move` | `ai.wrong` changes (every 6 s) |
| `boss_choir_singer_hurt` | Damage to wrong singer |
| `boss_choir_singer_immune` | Damage to a non-wrong singer |
| `boss_choir_inhale` | Every 8 s (inhale tele) |
| `boss_choir_silenced` | Inhale interrupted ("Silenced") |
| `boss_choir_blast` | Inhale completes |
| `boss_choir_note_tick` | Last Verse note |
| `boss_choir_die` | Boss death |

**Oswin Marrow, the Hearthking (depth 30)** (`assets/sound/sfx/bosses/hearthking/`): Boss and Fallen events (campaign.js / bosses.js / fallen.js / monsters.js): moves are named as in the data tables; tele-sounds end where the damage lands (`zone_tele*` family is the fallback). Phase changes run `bossPhase`. Today only generic `bolt/cast/fire/hit/shrine/arrow/swing/ice/gold` are played.

| File | Hook |
|---|---|
| `boss_hearthking_alert` | Boss aggro |
| `boss_hearthking_swing` | Basic swings |
| `boss_hearthking_combo` | Combo with 3 circles |
| `boss_hearthking_roots` | Phase 2 start |
| `boss_hearthking_ember_pulse` | Ember pulses (burst windows) |
| `boss_hearthking_ember_exposed` | `The Ember` exposed text |
| `boss_hearthking_ember_close` | Window ends |
| `boss_hearthking_giant_rise` | Phase 3 start |
| `boss_hearthking_pulse_in` | Inward pulse (floor pulse R) |
| `boss_hearthking_pulse_out` | Outward pulse (9 tiles) |
| `boss_hearthking_factor_tick` | The Factor counts a dash |
| `boss_hearthking_hurt` | Boss hurt |
| `boss_hearthking_die` | Boss death |
| `rift_core_loop` | Prop `rift_core` within 8 tiles |
| `rift_core_touch` | `object:interact { type:'rift_core' }` / finale panel |

**The Fallen and shared Fallen sounds** (`assets/sound/sfx/bosses/fallen/`): Fallen fights (fallen.js, campaign.js): each has a named mechanic; the Fallen banner plays when one is first seen. Today they use generic `arrow/shrine/ice/gold/swing`.

| File | Hook |
|---|---|
| `fallen_banner` | Fallen banner |
| `fallen_die` | Fallen killed (relic granted next) |
| `fallen_relic` | `relic:granted` |
| `fallen_hob_snuff` | Player walks through a brazier |
| `fallen_hob_relight` | Relight every 8 s |
| `fallen_hob_hook` | Hook sweep |
| `fallen_hob_blind` | Blind charge |
| `fallen_sefa_glide` | While untargetable |
| `fallen_sefa_cut` | Anchor destroyed |
| `fallen_sefa_volley` | Fan volley |
| `fallen_sefa_snare` | Snare |
| `fallen_brannoc_block` | Front block |
| `fallen_brannoc_charge` | Charge |
| `fallen_brannoc_spikes` | Spike ring |
| `fallen_odile_circle` | Salt circle placed |
| `fallen_odile_crystallise` | Stun by circle |
| `fallen_odile_brine` | Brine push |
| `fallen_odile_face` | Effect `true_face` |
| `fallen_wren_vanish` | Cloak start |
| `fallen_wren_glint` | Glint arrow tele |
| `fallen_wren_count` | Counting state |
| `fallen_ashby_toll` | Bell toll (every 3-8 s) |
| `fallen_ashby_toll_short` | Fast tolls |
| `fallen_ashby_ghost` | `ashby_ghost` spawn |
| `fallen_ashby_heal` | Ghost arrives |
| `fallen_corwin_knock` | Gold knocked loose |
| `fallen_corwin_collect` | He collects gold (today `gold`) |
| `fallen_corwin_coins` | Barrage |
| `fallen_corwin_foreclosure` | Foreclosure zone locks (1.5 s tele) |
| `fallen_varr_nova` | Nova growing |
| `fallen_varr_bottle` | Bottle bursts |
| `fallen_varr_burn` | Self burn |
| `fallen_crane_shovel` | Shovel line |
| `fallen_crane_raise` | Corpse raise |
| `fallen_crane_piled` | Piled Dead up |
| `fallen_ivo_thorn` | Thorn wall |
| `fallen_ivo_retreat` | Retreat |
| `fallen_ivo_refusal` | `Refusal` state start |
| `fallen_ivo_enrage` | Refusal broken by player |
| `fallen_ivo_spared` | Refusal ends unbroken |

**The Echo (your own ghost) and Corrupted adventurers** (`assets/sound/sfx/bosses/echo/`): Echo (echo.js, `echo:rise`): it plays YOUR class sounds, filtered. These are the extras.

| File | Hook |
|---|---|
| `echo_banner` | Echo banner |
| `echo_rise` | `echo:rise` |
| `echo_idle_loop` | Echo guarding corpse (distance < 12) |
| `echo_attack` | Echo attack (use the player's wpn sound through the ghost filter, or this) |
| `echo_potion` | Echo potion |
| `echo_hurt` | Echo hurt |
| `echo_die` | `corpse.echoSlain` |
| `echo_loot` | Echo `dropLoot` (today `loot_rare`) |

#### 7.2.5 Loot and items

**Drop sounds by rarity tier** (`assets/sound/sfx/loot/`): Loot drop event: `loot:dropped { ground }` / `dropLoot` plays ONE sound for the best rarity in the pile (R8.1; today `loot`, `loot_rare`, `loot_legendary`). Rarity ladder: common < uncommon < rare < magic < legendary (Elite) < mythic < unique < rift. Sets are legendary + green tag. Add the beam/glint sounds for rare+ (lootbeam).

| File | Hook |
|---|---|
| `drop_uncommon` | Best rarity in the drop = uncommon (today `loot`) |
| `drop_magic` | Best rarity = magic (today `loot_rare`) |
| `drop_set` | Item has `setId` |
| `drop_mythic` | Best rarity = mythic |
| `drop_unique` | Best rarity = unique |
| `drop_rift` | Best rarity = rift |
| `lootbeam_glint` | Legendary-tier beam (render.js glint) |
| `loot_corrupt_drop` | Item `corrupted` appears (layer) |
| `loot_bleached_drop` | Item `bleached` drop |
| `loot_bloodstone_drop` | Item is a `blood_` gem |
| `pile_merge` | Two piles merge |
| `drop_land_weapon` | Item drop lands; weapon type |
| `drop_land_armor` | Item drop lands; armor type |
| `drop_land_jewelry` | Item drop lands; jewelry |
| `drop_land_potion` | Item drop lands; consumable |
| `drop_land_gem` | Item drop lands; gem |
| `drop_land_misc` | Other drop |

**Pickup by item type, gold, materials** (`assets/sound/sfx/loot/`): Pickup (`pickup(groundId)` / `pickupPile`, `item:picked`): one short sound per pickup, never more than 3 per 200 ms in a pile take-all (use `pile_take_all` instead).

| File | Hook |
|---|---|
| `pickup_weapon` | `item:picked` weapon |
| `pickup_armor_cloth` | `item:picked` armor, cloth |
| `pickup_armor_light` | `item:picked` armor, light |
| `pickup_armor_heavy` | `item:picked` armor, heavy |
| `pickup_jewelry` | `item:picked` jewelry |
| `pickup_shield` | `item:picked` shield/offhand |
| `pickup_potion` | `item:picked` potion |
| `pickup_gem` | `item:picked` gem |
| `pickup_bloodstone` | `item:picked` blood_ gem |
| `pickup_tome` | `item:picked` tome |
| `pickup_lore` | `lore:found` |
| `pickup_key` | `item:picked` key (Key Hunt event) |
| `pickup_trophy` | `item:picked` trophy |
| `pickup_material` | `item:picked` with `materials` |
| `mat_dust` | Material dust |
| `mat_shard` | Material shard |
| `mat_essence` | Material essence |
| `mat_gemdust` | Material gem dust |
| `mat_riftshard` | Material riftshard |
| `mat_class` | Material `forge_<class>` |
| `gold_small` | Gold < 50 or minor |
| `gold_medium` | Gold 50-500 |
| `gold_large` | Gold 500-5,000 |
| `gold_hoard` | Gold > 5,000 (Midas, bosses) |
| `gold_spend` | `gold:spent` |
| `pile_open` | `pile:open` |
| `pile_take_all` | `pickupPile` |
| `pickup_full` | Pickup refused (today `error`) |
| `gem_chime_ruby` | Gem pickup (kind ruby) |
| `gem_chime_sapphire` | Gem pickup (kind sapphire) |
| `gem_chime_emerald` | Gem pickup (kind emerald) |
| `gem_chime_topaz` | Gem pickup (kind topaz) |
| `gem_chime_amethyst` | Gem pickup (kind amethyst) |
| `gem_chime_diamond` | Gem pickup (kind diamond) |

**Equipment: equip, sockets, gems, upgrades, forge and mystic** (`assets/sound/sfx/loot/`): Inventory and NPC actions that change items (`equip`, `unequip`, blacksmith, mystic, curator). Today: `equip` for equip and socketing, `click`/`quest`/`error` for the rest.

| File | Hook |
|---|---|
| `equip_weapon` | Equip slot weapon |
| `equip_armor_cloth` | Equip armor, cloth |
| `equip_armor_light` | Equip armor, light |
| `equip_armor_heavy` | Equip armor, heavy |
| `equip_shield` | Equip offhand |
| `equip_jewelry` | Equip ring/amulet |
| `equip_belt` | Equip belt |
| `unequip` | `unequip()` |
| `equip_upgrade_arrow` | Verdict tap |
| `equip_matched` | `getMatched` count increases |
| `set_bonus` | Set bonus |
| `socket_add` | `addSocket` success |
| `socket_gem` | `socketGem` (cut gem) |
| `socket_blood` | `socketGem` with bloodstone |
| `unsocket_gem` | `unsocketGem` |
| `gem_combine` | `combineGems` |
| `gem_upgrade` | `upgradeGem` |
| `forge_hammer` | Blacksmith `upgrade`, cleanse, etc. |
| `forge_upgrade` | `upgrade(item)` |
| `forge_upgrade_max` | `upgrade` at plus 5 |
| `salvage` | `salvage` / `surfaceSalvage` / `sendJunk` salvage |
| `cleanse` | `cleanse` |
| `item_cleansed` | `item:cleansed` |
| `gamble_roll` | `gamble(slot)` start |
| `gamble_reveal` | `gamble` result |
| `reroll_affix` | `rerollAffix` |
| `reroll_lock` | Reroll refused |
| `item_lock` | `toggleLock` on |
| `item_unlock` | `toggleLock` off |
| `item_sort` | `sortInventory` |
| `item_reveal_bleached` | `revealBleached()` |
| `item_awaken` | Awakening (`recordKill` hit threshold) (today a toast) |
| `item_stash` | `stashDeposit` |
| `item_stash_take` | `stashWithdraw` |
| `chute_send` | `chuteSend` (UI `chute.js` today `click`) |
| `chute_full` | Refusal when `surface` is at capacity |
| `chute_open` | `object:interact { type:'chute' }` |
| `surface_open` | `object:interact { type:'surface_crate' }` |
| `surface_take` | `surfaceTake` |

**Economy and the Curator** (`assets/sound/sfx/loot/`): Vendor, buyback, bulk sell, relics, collection.

| File | Hook |
|---|---|
| `buy_potion` | `buyPotion` |
| `buyback` | `buyback` |
| `sell_all` | `sellAtOrBelow`, `surfaceSell` bulk |
| `purchase_denied` | Refusal (today `error`) |
| `junk_send` | `sendJunk` |
| `relic_combine` | `relic:combined` |
| `relic_view` | `ui.open('relics')` |
| `curator_stitch` | `collection:registered` |
| `collection_page` | `collection:page` |
| `collection_tier` | `collection:tier` |

#### 7.2.6 World and props

**Chests, containers and breakables** (`assets/sound/sfx/world/`): Props (`props.js`, `object:interact`).

| File | Hook |
|---|---|
| `chest_locked` | Interact with locked chest |
| `chest_unlock` | `room:cleared` |
| `chest_open_rare` | Chest with `lockReward` / `gradeFloor` |
| `barrel_break` | `barrel` interact (today `hit`) |
| `crate_break` | `crate` interact (today `hit`) |
| `secret_open` | `secret` prop |
| `bones_break` | `bones` prop interact |
| `pillar_hit` | Breakable prop |
| `vault_open` | Event `keyhunt` vault used |
| `vault_seal` | Event `keyhunt` fails |

**Doors, gates, stairs, portals, waypoints** (`assets/sound/sfx/world/`): Structures.

| File | Hook |
|---|---|
| `door_close` | Door closed (lockdown) |
| `door_locked` | Interact with sealed door |
| `gate_slam` | `room:locked` / `gate` props pushed (today `door`) |
| `gate_open` | `room:cleared` (today `quest`+`door`) |
| `stairs_up` | `scenes.ascend()` |
| `portal_open` | `G.scenes.townPortal()` |
| `portal_loop` | Portal prop near player |
| `portal_enter` | `usePortal()` / `scene:changed` |
| `portal_close` | Portal consumed |
| `waypoint_unlock` | `unlockWaypoint(depth)` |
| `waypoint_use` | `object:interact { type:'waypoint' }` |
| `waypoint_travel` | `enterDungeon(d)` via the picker |
| `dungeon_entrance` | `object:interact { type:'dungeon_entrance' }` |
| `ropelift_ride` | Camp waypoint use |
| `stash_open` | `object:interact { type:'stash' }` |
| `corpse_found` | `object:interact { type:'corpse' }` |

**Shrines, bargains, fires and town props** (`assets/sound/sfx/world/`): Shrines (buff and bargain), braziers, torches, campfires, well, fountain, stalls.

| File | Hook |
|---|---|
| `shrine_bargain_offer` | `shrine:offer` |
| `shrine_bargain_accept` | `shrine:accepted` |
| `bargain_blood_tithe` | Bargain `blood_tithe` active |
| `bargain_dry_vow` | Bargain `dry_vow` active |
| `bargain_the_hunt` | Bargain `the_hunt` active (a legendary hunts you) |
| `bargain_glass_heart` | Bargain `glass_heart` active |
| `shrine_bargain_decline` | `declineBargain` |
| `shrine_corrupt` | Shrine `shrineKind corrupt` used |
| `shrine_idle_loop` | Shrine prop (unused) within 6 tiles |
| `torch_loop` | Torch props within 6 tiles |
| `brazier_loop` | Brazier within 6 tiles |
| `campfire_loop` | Campfire prop within 10 tiles |
| `campfire_ignite` | `town:warmed` (chimneys light) |
| `fountain_loop` | Town warmth >= 2 |
| `well_capped` | `well` prop interaction |
| `rift_crystal_loop` | `rift_crystal`/`rift_shard` props within 8 tiles |
| `town_fissure_loop` | Town plaza within 10 tiles |
| `stall_cloth` | Stall prop |
| `sign_creak` | Sign prop |
| `bush_rustle` | Walking over `bush` / `tree` prop tile |

**Terrain hazards and floor events** (`assets/sound/sfx/world/`): Lava, water, collapse, corruption.

| File | Hook |
|---|---|
| `lava_burn_loop` | Player on LAVA tile |
| `lava_pop` | Lava tile nearby |
| `water_splash` | Player moves onto WATER tile |
| `water_exit` | Leaving WATER tile |
| `rockfall` | `collapse` event zone detonates (`rock:true`) |
| `rockfall_tele` | `collapse` zone tele |
| `cavein_rumble` | `collapse` event active |
| `fissure_pulse` | `map.fissures` within 8 tiles |
| `corrupt_growth_loop` | `map.taint` within a few tiles |

#### 7.2.7 Events and systems

**Flow, Close Call and Heat (the skill-reward loops)** (`assets/sound/sfx/systems/`): Risk/reward systems (`risk.js`, `pillars.js`, `combat.js`): `closecall:ui`, `flow:chain`, `flow:trigger`, `flow:start`, ember pickups (`game.embers`). These are the "I did something skilful" sounds: loud and satisfying but never nagging.

| File | Hook |
|---|---|
| `close_call` | `game.closeCall` (today only `fx:text`) |
| `close_call_stack` | Effect `close_call` stack |
| `flow_chain_two` | `flow:chain { count 2 }` |
| `flow_chain_three` | `flow:trigger { chain 3 }` (today none) |
| `flow_chain_four` | `flow:trigger { chain 4 }` |
| `flow_chain_five` | `flow:trigger { chain >=5 }` |
| `flow_slow_loop` | While `timeScale < 1` from Flow |
| `flow_end` | `endFlow()` / timeScale reset |
| `flow_crit_ready` | Effect `flow_crit` applied |
| `ember_spawn` | `game.embers` created |
| `heat_gain` | Heat +1 (`heatStacks`) |
| `heat_loss` | Heat -1 |
| `heat_knock` | Heat knock-out |
| `heat_max` | Heat reaches max |
| `heat_loop` | Heat >= 6 |

**Marks, perks, wagers** (`assets/sound/sfx/systems/`): Perks (`perk:bought { id, how }`, `perk:mark`, `perk:won`, `perk:lost`).

| File | Hook |
|---|---|
| `perk_buy` | `perk:bought` how=point (today `quest`) |
| `perk_keystone` | `perk:bought` for a keystone |
| `perk_mark_earned` | `perk:mark` |
| `perk_mark_spent` | `perk:bought` how=mark |
| `perk_wager_open` | `perk:bought` how=wager (today `shrine`) |
| `perk_wager_won` | `perk:won` |
| `perk_wager_lost` | `perk:lost` |
| `perk_respec` | `perk:respec` |
| `perk_locked` | `buyPerk` false (today `error`) |
| `classgoal_done` | `classgoal:done` (today `quest`) |
| `title_earned` | Titles list change |
| `milestone_tier_one` | `milestone:reached` tier 1 |
| `milestone_tier_two` | `milestone:reached` tier 2 |
| `milestone_tier_three` | `milestone:reached` tier 3 |
| `milestone_tier_four` | `milestone:reached` tier 4 |
| `milestone_tier_five` | `milestone:reached` tier 5 |

**Timed events, lockdowns, floor flow and grades** (`assets/sound/sfx/systems/`): Events (`events.js`: gauntlet, keyhunt, collapse, thief), lockdown (`lockdown.js`), clear grade (`floor:graded`), floor mods and arrival.

| File | Hook |
|---|---|
| `event_start` | `event:start` (today `quest`) |
| `event_gauntlet_beacon` | Event `gauntlet` active |
| `event_gauntlet_spawn` | Gauntlet spawn |
| `event_keyhunt_start` | Event `keyhunt` |
| `event_key_found` | Event key found (today `loot_rare`) |
| `event_collapse_start` | Event `collapse` |
| `event_thief_start` | Event `thief` |
| `event_win` | `event:end { success true }` (today `quest`) |
| `event_fail` | `event:end { success false }` (today `error`) |
| `timer_tick` | Event timer < 10 s |
| `timer_expire` | Event timer 0 |
| `lockdown_wave` | `room:wave` / spawn waves (today none) |
| `lockdown_clear` | `room:cleared` (today `quest`+`door`) |
| `lockdown_failsafe` | Failsafe |
| `grade_s` | `floor:graded` S (today `quest`) |
| `grade_a` | `floor:graded` A |
| `grade_b` | `floor:graded` B (today `click`) |
| `grade_c` | `floor:graded` C |
| `grade_d` | `floor:graded` D |
| `grade_chest` | `floor:graded` chest |
| `floor_enter` | `scene:changed` to dungeon (by stairs) |
| `floor_banner` | HUD depth label banner |
| `floor_mod_toast` | Floor mods toast |
| `floor_mod_reward` | Floor mod with positive rewards |
| `explored_full` | `getExplored().value == 100` |
| `depth_record` | `flags.maxDepth` increases |

**Pallor, Go deeper, Scavenger, Echo, bargains and Pallor tiers** (`assets/sound/sfx/systems/`): Pallor (`getPallor`, `stairs:confirm`), plus remaining signature mechanics. The Scavenger and Echo creature sounds are in Monsters / Bosses.

| File | Hook |
|---|---|
| `deeper_prompt` | `stairs:confirm { depth, nextValue }` (today `door`) |
| `deeper_confirm` | `confirmDescend()` (today `stairs`) |
| `deeper_cancel` | `cancelDescend()` |
| `pallor_tier_i` | `getPallor().tierUp` |
| `pallor_tier_ii` | Tier up |
| `pallor_tier_iii` | Tier up |
| `pallor_tier_iv` | Tier up |
| `pallor_reset` | `scene:changed` to town with pallor > 0 |
| `pallor_unlock` | `flags.pallorUnlocked` |
| `tip_card` | `tips.js` card shown |
| `tip_dismiss` | Tip dismissed |
| `bargain_active_loop` | `game.bargain` active |
| `hunt_pale_alert` | Bargain `the_hunt` monster spawns |

**Town, camps and story moments** (`assets/sound/sfx/systems/`): Town revival (`town:warmed { act, warmth }`), the opening, camp NPCs, quests and the NPC interaction sounds.

| File | Hook |
|---|---|
| `town_warmed_one` | `town:warmed { warmth 1 }` |
| `town_warmed_two` | `town:warmed { warmth 2 }` |
| `town_warmed_three` | `town:warmed { warmth 3 }` |
| `town_arrive` | `scene:changed` to town |
| `opening_ash` | Story opening panel |
| `finale_ember` | `ui.open('finale')` |
| `npc_greet_merchant` | `npc:interact { role:'merchant' }` |
| `npc_greet_blacksmith` | `npc:interact { role:'blacksmith' }` |
| `npc_greet_mystic` | `npc:interact { role:'mystic' }` |
| `npc_greet_healer` | `npc:interact { role:'healer' }` |
| `npc_greet_elder` | `npc:interact { role:'elder' }` |
| `npc_greet_stashkeeper` | `npc:interact { role:'stashkeeper' }` |
| `npc_greet_curator` | `npc:interact { role:'curator' }` |
| `npc_greet_refugee` | `npc:interact { role:'refugee' }` |
| `npc_greet_camp_merchant` | `npc:interact { role:'camp_merchant' }` |
| `npc_heal` | Healer service (today `potion`) |
| `quest_accept` | `acceptQuest` (today `quest`) |
| `quest_progress` | `quest:updated` |
| `quest_turnin` | `turnInQuest` |
| `quest_main_step` | Main chain step complete |
| `quest_loyalty` | Loyalty/crate quest reward |

#### 7.2.8 UI

**Buttons, taps and toggles** (`assets/sound/ui/`): UI sounds (`ui._sfx(name)` in src/ui/*.js, which emits `sfx { name }`). Played from the panel open/close code in `core.js` (`open(panel)` / `close()`), the HUD in `hud.js`, and each action in the panel files.

| File | Hook |
|---|---|
| `ui_tap_big` | Buttons with class `big` / `gold` |
| `ui_confirm` | `ui._confirm` accepted |
| `ui_confirm_permanent` | `ui._confirm` with permanent text |
| `ui_cancel` | Cancel buttons, back, X |
| `ui_toggle_on` | Toggle on |
| `ui_toggle_off` | Toggle off |
| `ui_tab` | Tab buttons |
| `ui_slider_tick` | Slider value change |
| `ui_select` | List selection |
| `error_gold` | Buy refused (today `error`) |
| `error_full` | Full (today `error`) |
| `error_locked` | Locked item (today `error`) |
| `error_townonly` | Town-only refusal toast |
| `toast_info` | `ui:toast` |
| `toast_good` | `ui:toast` with positive colour |
| `toast_bad` | `ui:toast` with red colour |
| `toast_legendary` | Legendary monster announced |
| `pickup_feed_tap` | Feed tap |

**Panels: open and close** (`assets/sound/ui/`): UI sounds (`ui._sfx(name)` in src/ui/*.js, which emits `sfx { name }`). Played from the panel open/close code in `core.js` (`open(panel)` / `close()`), the HUD in `hud.js`, and each action in the panel files.

| File | Hook |
|---|---|
| `ui_open_inventory` | `ui.open('inventory')` |
| `ui_close_inventory` | `ui.close()` |
| `ui_open_character` | `ui.open('character')` |
| `ui_open_skills` | `ui.open('skills')` |
| `ui_open_perks` | `ui.open('perks')` |
| `ui_open_map` | `ui.open('map')` |
| `ui_open_journal` | `ui.open('journal')` |
| `ui_open_quests` | `ui.open('quests')` |
| `ui_open_menu` | `ui.open('menu')` pause |
| `ui_close_menu` | `ui.close()` from menu |
| `ui_open_settings` | `ui.open('settings')` |
| `ui_open_depth` | `ui.open('depth')` |
| `ui_open_shop` | `ui.open('npc')` |
| `ui_open_stash` | `ui.open('stash')` |
| `ui_open_chute` | `ui.open('chute')` |
| `ui_open_surface` | `ui.open('surface')` |
| `ui_open_collection` | `ui.open('collection')` |
| `ui_open_relics` | `ui.open('relics')` |
| `ui_open_milestones` | `ui.open('milestones')` / `statsbook` |
| `ui_open_classgoals` | `ui.open('classgoals')` |
| `ui_open_death` | `ui.open('death')` |
| `ui_open_finale` | `ui.open('finale')` |
| `ui_open_tips` | Tip card tapped |
| `ui_title_start` | `startNewGame` / `continueGame` |
| `ui_class_pick_warrior` | Title screen class card |
| `ui_class_pick_ranger` | Title screen class card |
| `ui_class_pick_sorcerer` | Title screen class card |
| `ui_class_pick_necromancer` | Title screen class card |
| `ui_name_key` | Name entry |

**HUD, inventory and meta actions** (`assets/sound/ui/`): UI sounds (`ui._sfx(name)` in src/ui/*.js, which emits `sfx { name }`). Played from the panel open/close code in `core.js` (`open(panel)` / `close()`), the HUD in `hud.js`, and each action in the panel files.

| File | Hook |
|---|---|
| `ui_item_pick` | Inventory item drag start |
| `ui_item_drop` | Slot drop |
| `ui_item_swap` | Slot swap |
| `ui_tooltip_open` | Tooltip shown |
| `ui_tooltip_details` | Toggle |
| `ui_compare` | Toggle |
| `skill_learn` | `learnSkill` (today `click`/`quest`) |
| `skill_learn_max` | `learnSkill` at maxRank |
| `skillbar_set` | `setSkillSlot` |
| `autobuild_pick` | `setAutoBuild` |
| `skill_respec` | `respec` |
| `menu_save` | `meta.save()` |
| `menu_save_code` | `savecode.js` export/import |
| `menu_restore` | `restoreBackup` |
| `hud_skill_tap` | Skill button press |
| `hud_potion_tap` | Potion button press |
| `hud_attack_loot` | `getActionMode()` change to loot |
| `hud_portal_tap` | Portal button |
| `hud_minimap` | Minimap tap |
| `hud_edit_snap` | HUD editor |
| `hud_edit_reset` | HUD editor reset |
| `pwa_update` | `pwa.js` |
| `pause_on` | `state.paused` |
| `pause_off` | Resume |

#### 7.2.9 Ambience beds

**Theme beds (new, one per act theme)** (`assets/sound/ambience/`): Ambience (`U.audio.setBed(kind, pallorTier)` from `render.js`; `amb_<kind>.m4a`). Today 9 base beds exist: wind, drone, drip, water, fire, heart, choir, flesh, hearth, synthesized. New beds below use new names; the engine should pick the most specific existing file and fall back to the base bed: `amb_var_<variantId>` -> `amb_<theme>` -> `amb_<kind>` -> synth.

| File | Hook |
|---|---|
| `amb_crypt` | Theme crypt |
| `amb_caves` | Theme caves |
| `amb_inferno` | Theme inferno |
| `amb_abyss` | Theme abyss |
| `amb_roots` | Depth 31+ |
| `amb_pale_end` | Variant `pale_end` |

**Variant beds (new, one per floor variant)** (`assets/sound/ambience/`): Ambience (`U.audio.setBed(kind, pallorTier)` from `render.js`; `amb_<kind>.m4a`). Today 9 base beds exist: wind, drone, drip, water, fire, heart, choir, flesh, hearth, synthesized. New beds below use new names; the engine should pick the most specific existing file and fall back to the base bed: `amb_var_<variantId>` -> `amb_<theme>` -> `amb_<kind>` -> synth.

| File | Hook |
|---|---|
| `amb_var_restless_graves` | Variant `restless_graves` (map.variant.id) |
| `amb_var_forgotten_cellars` | Variant `forgotten_cellars` (map.variant.id) |
| `amb_var_ossuary` | Variant `ossuary` (map.variant.id) |
| `amb_var_drowned_vaults` | Variant `drowned_vaults` (map.variant.id) |
| `amb_var_gravelord_approach` | Variant `gravelord_approach` (map.variant.id) |
| `amb_var_mossy_caverns` | Variant `mossy_caverns` (map.variant.id) |
| `amb_var_fungal_warrens` | Variant `fungal_warrens` (map.variant.id) |
| `amb_var_crystal_lake` | Variant `crystal_lake` (map.variant.id) |
| `amb_var_amber_hollows` | Variant `amber_hollows` (map.variant.id) |
| `amb_var_smouldering_halls` | Variant `smouldering_halls` (map.variant.id) |
| `amb_var_magma_flows` | Variant `magma_flows` (map.variant.id) |
| `amb_var_ash_wastes` | Variant `ash_wastes` (map.variant.id) |
| `amb_var_forgeworks` | Variant `forgeworks` (map.variant.id) |
| `amb_var_starless_isles` | Variant `starless_isles` (map.variant.id) |
| `amb_var_shattered_spire` | Variant `shattered_spire` (map.variant.id) |
| `amb_var_glasswork_drift` | Variant `glasswork_drift` (map.variant.id) |
| `amb_var_fallen_cathedral` | Variant `fallen_cathedral` (map.variant.id) |
| `amb_var_cinder_drift` | Variant `cinder_drift` (map.variant.id) |
| `amb_var_overgrown_dark` | Variant `overgrown_dark` (map.variant.id) |
| `amb_var_unmaking` | Variant `unmaking` (map.variant.id) |
| `amb_var_the_wound` | Variant `the_wound` (map.variant.id) |
| `amb_var_rift_core` | Variant `rift_core` (map.variant.id) |
| `amb_var_pale_end` | Variant `pale_end` (map.variant.id) |

**Pallor, Heat, Danger layers** (`assets/sound/ambience/`): Overlay layers on top of the bed (today synthesised: a high, beating 1661 Hz pair at tier >= 3).

| File | Hook |
|---|---|
| `amb_pallor_one` | Pallor tier 1 (value >= 10) |
| `amb_pallor_two` | Pallor tier 2 (>= 30) |
| `amb_pallor_three` | Pallor tier 3 (>= 60) |
| `amb_pallor_four` | Pallor tier 4 (>= 90) |
| `amb_pallor_heart` | Pallor >= 3 and a bargain active |

**Ambience one-shots (random events layered on beds)** (`assets/sound/ambience/`): Random one-shots scheduled by `tickBed` (today synthesised: drip, heartbeat, whisper, wail, crackle). With files, `tickBed` should pick randomly from these by bed kind with a 4-14 s gap.

| File | Hook |
|---|---|
| `amb_ev_drip` | `tickBed` kind drip/water |
| `amb_ev_gust` | `wind` |
| `amb_ev_creak` | Crypt/caves/inferno |
| `amb_ev_bones` | Crypt, ossuary |
| `amb_ev_rats` | Crypt/cellars |
| `amb_ev_chains` | Crypt/forgeworks |
| `amb_ev_bat` | Caves |
| `amb_ev_rock` | Caves |
| `amb_ev_crack` | `crackle` |
| `amb_ev_lava` | Magma flows |
| `amb_ev_hammer` | Forgeworks |
| `amb_ev_steam` | Inferno |
| `amb_ev_glass` | Glasswork/shattered spire/crystal lake |
| `amb_ev_whisper` | `whisper` |
| `amb_ev_heart` | `flesh`/`heart`/rumble |
| `amb_ev_wail` | `flesh` (the 15% roll) |
| `amb_ev_wet` | Hellscape |
| `amb_ev_void` | Abyss |
| `amb_ev_rumble` | Deep floors |
| `amb_ev_eyes` | Hellscape eyes (render) |

**Town: warmth stages, inn, camps and the NPCs of the hearth** (`assets/sound/ambience/`): Town ambience (`G.engine` rift.bed: town warmth 0-1 = the town variant bed (wind), >= 2 = `hearth`). New town beds per warmth stage `flags.warmth` 0-3. `town:warmed` crossfades 4 s.

| File | Hook |
|---|---|
| `amb_town_cold` | Town, warmth 0 (replaces wind) |
| `amb_town_thaw` | Town, warmth 1 |
| `amb_town_market` | Town, warmth 2 (replaces `amb_hearth` when present) |
| `amb_town_warm` | Town, warmth 3 |
| `town_ev_cry` | Town ambience event (warmth 0) |
| `town_ev_hammer` | Town ambience event |
| `town_ev_sing` | Town ambience event (act I outro) |
| `town_ev_bell` | Town ambience event |
| `town_ev_door` | Town ambience event |
| `amb_inn` | Inside the inn building (warmth stage selects an intensity) |
| `inn_door` | Enter inn |
| `inn_poker` | Fireside interaction |
| `inn_mug` | Fireside |
| `amb_camp_lamp` | Camp prop on cleansed floors 3-9 |
| `amb_camp_fever` | Camp prop on cleansed floors 12-19 |
| `camp_campfire` | Camp near fire |

#### 7.2.10 Music

**Title, town and camps** (`assets/sound/music/`): Music (`U.audio.setMusic(track)` from `render.js musicTrack()`; today picks: title / town / boss / echo / theme / `rift` for depth > 20). Music tracks load as `music_<track>.m4a`. All tracks: stereo AAC, seamless loop unless stated; no vocals with words.

| File | Hook |
|---|---|
| `music_title_ember` | Menu after `worldBossKilled` |
| `music_town_thaw` | Town, warmth 1 |
| `music_town_market` | Town, warmth 2 |
| `music_town_warm` | Town, warmth 3 |
| `music_inn` | Inside the inn |
| `music_camp_lamp` | Camp on floors 3-9 |
| `music_camp_fever` | Camp on floors 12-19 |
| `music_opening` | Story opening (first arrival) |
| `music_finale` | `ui.open('finale')` |

**Exploration: per theme/act, 2-3 tracks each (rotate)** (`assets/sound/music/`): Music (`U.audio.setMusic(track)` from `render.js musicTrack()`; today picks: title / town / boss / echo / theme / `rift` for depth > 20). Music tracks load as `music_<track>.m4a`. All tracks: stereo AAC, seamless loop unless stated; no vocals with words. Exploration tracks rotate (the engine chooses a different track each floor from the set); tracks are under-scored: they ebb in and out of silence so the ambience carries the mood. 3 tracks per act give variety without exhausting the budget.

| File | Hook |
|---|---|
| `music_crypt_b` | Theme crypt (rotation) |
| `music_crypt_c` | Theme crypt (rotation) |
| `music_caves_b` | Theme caves (rotation) |
| `music_caves_c` | Theme caves (rotation) |
| `music_inferno_b` | Theme inferno (rotation) |
| `music_inferno_c` | Theme inferno (rotation) |
| `music_abyss_b` | Theme abyss (rotation) |
| `music_rift_b` | Depth 21-30 (rotation) |
| `music_rift_c` | Depth 21-30 (rotation) |
| `music_roots` | Depth 31+ |
| `music_roots_b` | Depth 31+ (rotation) |
| `music_pale_end` | Variant `pale_end` |
| `music_event_tension` | Event active (`event:start`) / lockdown wave |
| `music_lockdown` | `room:locked` to `room:cleared` |
| `music_pallor` | Pallor tier >= 3 |

**Bosses, Fallen and Echo** (`assets/sound/music/`): Music (`U.audio.setMusic(track)` from `render.js musicTrack()`; today picks: title / town / boss / echo / theme / `rift` for depth > 20). Music tracks load as `music_<track>.m4a`. All tracks: stereo AAC, seamless loop unless stated; no vocals with words. Boss tracks start when the player gets within 16 tiles of the boss (`musicTrack`) and crossfade ~2 s; phases crossfade at the phase change. Today every boss shares `music_boss`.

| File | Hook |
|---|---|
| `music_boss_gravelord` | `boss_gravelord` |
| `music_boss_broodmother` | `boss_broodmother` |
| `music_boss_tyrant` | `boss_tyrant` |
| `music_boss_hollow` | `boss_hollow` |
| `music_boss_choir` | `boss_choir` |
| `music_boss_hearthking_swordsman` | `boss_world`, phase 1 |
| `music_boss_hearthking_ember` | `boss_world`, phase 2 |
| `music_boss_hearthking_giant` | `boss_world`, phase 3 |
| `music_fallen` | Fallen within 16 tiles (today theme track) |
| `music_fallen_ivo` | `fallen_10` |
| `music_victory` | Boss killed |
| `music_death` | `ui.open('death')` |

#### 7.2.11 Stingers

**Stingers** (`assets/sound/stingers/`): Stingers (one-shot, 2-8 s, stereo; played on the music bus with the music ducked 6 dB for their length). Today the closest equivalents are `levelup`, `loot_legendary`, `quest` and `shrine`.

| File | Hook |
|---|---|
| `sting_death` | `player:died` |
| `sting_death_boss` | `player:died { noRetrieve }` |
| `sting_revive` | `respawn()` |
| `sting_corpse_reclaimed` | `reclaimCorpse` |
| `sting_boss_slain` | `monster:killed` boss |
| `sting_boss_hearthking` | `boss_world` killed |
| `sting_fallen_slain` | Fallen killed |
| `sting_relic` | `relic:granted` |
| `sting_echo_slain` | `corpse.echoSlain` |
| `sting_levelup_big` | `player:levelup` level % 10 |
| `sting_level_cap` | Level 60 |
| `sting_legendary` | Elite drop (optional) |
| `sting_mythic` | Mythic drop |
| `sting_unique` | Unique drop |
| `sting_rift` | Rift item drop |
| `sting_act_one_end` | `town:warmed` act 2 / quest `main_4` complete |
| `sting_act_two_end` | `main_8` complete |
| `sting_act_three_end` | `main_12` complete |
| `sting_act_enter` | Floor 11, 21 and 31 first entry |
| `sting_main_step` | Main chain step |
| `sting_waypoint` | `unlockWaypoint` |
| `sting_grade_s` | S grade |
| `sting_event_win` | `event:end` success |
| `sting_lockdown_clear` | `room:cleared` |
| `sting_pallor_unlock` | `pallorUnlocked` |
| `sting_wager_won` | `perk:won` |
| `sting_heirs` | `relic:combined` |
| `sting_collection` | `collection:tier` |
| `sting_class_goal` | `classgoal:done` |
| `sting_first_clear` | `maxDepth` increases |

## 8. Open questions

1. **Sub-folder loader.** The folder tree needs the loader regex change (7.1 item 1). If the lead prefers a flat `assets/sound/` instead, every folder README can be dropped and the names are already unique: say so and the files move up one level.
2. **Memory vs completeness.** The catalog is complete by design; the *bank* strategy (7.1 item 3) is what keeps it playable on old phones. If lazy banks are not wanted, cut the polish tier and the variations to 2 (about −55% files).
3. **Music loops on iOS.** The current streamed `<audio loop>` implementation will gap at the loop point; the specification (cross-faded tails) reduces it but the engine fix (7.1 item 7) is recommended before the music is finished.
4. **Hellscape music.** The code picks `music_rift` for every floor deeper than 20 (Act III and the Roots); the catalog adds `music_roots*` for 31+ and `music_pale_end` for 41+. Needs `render.js musicTrack()` to select by depth band (and the world's variant) rather than only the theme.
5. **Boss-music range.** `musicTrack()` switches to boss music at < 16 tiles from *any* boss, including Fallen (rarity legendary, not boss) which today use the theme track; the catalog assumes a Fallen track.
6. **Choir tempo.** Setting `music_boss_choir` to 120 bpm is a design request: the fight's 1.5 s / 1.0 s note intervals and 8 s inhale are multiples of the beat only at 120 bpm.
7. **Voice style.** Non-verbal class voices need a decision on gender/age per class (the game has no gendered hero); the catalog describes timbre only.
8. **Echo audio.** Whether the Echo plays the player's own sounds filtered (cheap, thematic) or the `echo_*` set (this guide supports both).
9. **Names that read as numbers.** Counters in names use words (`flow_chain_three`), since a trailing `_3` would be taken as a variation.
10. **New classes (roadmap: +6).** Each adds ≈ 16 voice files, 3–5 dash files and ~2.5 files per active skill; not in these totals.

