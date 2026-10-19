# assets/sound/ambience/

79 entries · 143 files · core 18 / important 84 / polish 41.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `amb_wind.m4a` | 30s | stereo · loop | core · plays today | Base bed "wind" (variant sound `wind`): a low cold draft through stone, with slow swelling gusts. Crypt, ash wastes, amber hollows. 30 s… |
| `amb_drone.m4a` | 30s | stereo · loop | core · plays today | Base bed "drone" (variant `hum`): a low, unresolved tonal hum, like pipes of a dead organ; Gravelord approach, spire, cathedral. |
| `amb_drip.m4a` | 30s | stereo · loop | core · plays today | Base bed "drip" (variant `drip`): a damp, resonant room tone with gaps for dripping (the drips themselves are one-shots below; this is the… |
| `amb_water.m4a` | 30s | stereo · loop | important · plays today | Base bed "water" (variant `chime`): a lap of water, hollow, with faint crystalline ringing: crystal lake, glasswork drift. |
| `amb_fire.m4a` | 30s | stereo · loop | core · plays today | Base bed "fire" (variant `crackle`): a low furnace rumble with intermittent cracking of coals: inferno. |
| `amb_heart.m4a` | 30s | stereo · loop | core · plays today | Base bed "heart" (variant `rumble`): a slow, distant giant heartbeat under a tectonic rumble: magma flows, the wound, rift core. |
| `amb_choir.m4a` | 30s | stereo · loop | core · plays today | Base bed "choir" (variant `whisper`): a distant, wordless choral drone and wet whisper layer. |
| `amb_flesh.m4a` | 30s | stereo · loop | core · plays today | Hellscape bed, all variants 21-30 (F.hell): a sour semitone drone, wet breathing, a heart with a bad rhythm: never resolves.… |
| `amb_hearth.m4a` | 30s | stereo · loop | core · plays today | warm town bed (warmth >= 2, replaces wind): a soft hearth fire with a faint wind outside and the murmur of a quiet town. |
| `amb_crypt.m4a` | 30s | stereo · loop | important | Crypt theme (depths 1-5): cold stone room tone, faraway echoing drips and the dry creak of old iron: the tomb breathing. Quieter than the… |
| `amb_caves.m4a` | 30s | stereo · loop | important | Caves (6-10): a lower, bigger room tone, trickling water in the distance, an occasional hollow gust, no mechanical sound. |
| `amb_inferno.m4a` | 30s | stereo · loop | important | Inferno (11-15): a furnace tone, distant hammering, metal heat-ticking. |
| `amb_abyss.m4a` | 30s | stereo · loop | important | Abyss (16+): a vast open void: sub-bass, thin glassy chimes, no echo: stranger than the others. |
| `amb_roots.m4a` | 30s | stereo · loop | important | Act IV, The Roots (31+): wood-and-flesh, creaking roots under pressure, a distant massive heartbeat; the giant is below. |
| `amb_pale_end.m4a` | 30s | stereo · loop | polish | The Pale End (41+, variant `silence`): near silence: a faint high tone and the sound of paper-thin ash. |
| `amb_var_restless_graves.m4a` | 30s | stereo · loop | important | Restless Graves (1-4): cold wind over a graveyard through a broken crypt gate; cloth flapping on a rotten banner; a far bell tolling once… |
| `amb_var_forgotten_cellars.m4a` | 30s | stereo · loop | important | Forgotten Cellars (1-3): damp, hollow, barrels creaking; a slow drip into a puddle; rats in the walls. |
| `amb_var_ossuary.m4a` | 30s | stereo · loop | important | Ossuary (2-5): whispering voices of the dead in an echoing bone hall; clicking of bones settling; a choir-like hush. |
| `amb_var_drowned_vaults.m4a` | 30s | stereo · loop | important | Drowned Vaults (3-5): water lapping in a flooded vault, bubbles rising, a deep gurgle. |
| `amb_var_gravelord_approach.m4a` | 30s | stereo · loop | important | Gravelord's Approach (5): a funeral drone, a slow far-off processional bell and a rising purple hum; foreboding, the boss is near. |
| `amb_var_mossy_caverns.m4a` | 30s | stereo · loop | important | Mossy Caverns (6-10): water trickling over moss, a bat or two, a soft wet cave tone. |
| `amb_var_fungal_warrens.m4a` | 30s | stereo · loop | important | Fungal Warrens (6-9): soft puffing spores, a squishy, breathing cave and a whispering, chittering layer. |
| `amb_var_crystal_lake.m4a` | 30s | stereo · loop | important | Crystal Lake (7-10): still water with faint crystalline chimes and a lapping edge; a calm uncanny beauty. |
| `amb_var_amber_hollows.m4a` | 30s | stereo · loop | important | Amber Hollows (6-8): dry warm wind through hive-like tunnels and a faint drone of insects. |
| `amb_var_smouldering_halls.m4a` | 30s | stereo · loop | important | Smouldering Halls (11-14): smouldering embers crackling, a fire that has burned for a long time, heat shimmer. |
| `amb_var_magma_flows.m4a` | 30s | stereo · loop | important | Magma Flows (12-15): a slow river of lava bubbling, the earth rumbling, a distant heartbeat of rock. |
| `amb_var_ash_wastes.m4a` | 30s | stereo · loop | important | Ash Wastes (11-15): a dry hot wind carrying ash, fine hissing, hollow gusts. |
| `amb_var_forgeworks.m4a` | 30s | stereo · loop | important | Forgeworks (13-15): distant hammer on anvil with no one there, bellows breathing, steam hissing. |
| `amb_var_starless_isles.m4a` | 30s | stereo · loop | important | Starless Isles (16-20): sub-bass void, whispers from nowhere, a very thin wind with no source. |
| `amb_var_shattered_spire.m4a` | 30s | stereo · loop | important | Shattered Spire (16-20): a vertical hum like a tower in the wind, broken-glass chimes swinging. |
| `amb_var_glasswork_drift.m4a` | 30s | stereo · loop | important | Glasswork Drift (16-20): glass shards ticking against each other in a gentle current, a crystalline shimmer. |
| `amb_var_fallen_cathedral.m4a` | 30s | stereo · loop | important | Fallen Cathedral (21-30): a broken organ droning one dying chord, pigeon-less rafters creaking, flesh-wet echoes. Plays instead of… |
| `amb_var_cinder_drift.m4a` | 30s | stereo · loop | important | Cinder Drift (21-30): falling embers and ash with a heartbeat thump and furnace breath, hell-hot and wrong. Plays instead of `amb_flesh`… |
| `amb_var_overgrown_dark.m4a` | 30s | stereo · loop | important | Overgrown Dark (21-30): slick tendrils creaking, spores popping, a wet insect chorus; the dark is alive. Plays instead of `amb_flesh` on… |
| `amb_var_unmaking.m4a` | 30s | stereo · loop | important | The Unmaking (21+): the world coming apart: grinding, whispering, tape-reverse textures. Plays instead of `amb_flesh` on Hellscape floors… |
| `amb_var_the_wound.m4a` | 30s | stereo · loop | important | The Wound (24+): a deep gaping heartbeat, a wet breath of a huge wound, a high wail under. Plays instead of `amb_flesh` on Hellscape… |
| `amb_var_rift_core.m4a` | 30s | stereo · loop | important | The Rift Core (30): the giant's heart as a room: a vast, slow, warm heartbeat, ember crackle, and the groaning of a body too big to hold… |
| `amb_var_pale_end.m4a` | 30s | stereo · loop | important | The Pale End (31+... see also amb_pale_end): a hollow wind of nothing, faint piano-wire hum; a floor with no sound at all. |
| `amb_pallor_one.m4a` | 20s | mono · loop | important | Pallor tier I: a very faint, high drained whine; the lightest layer; mostly felt. |
| `amb_pallor_two.m4a` | 20s | mono · loop | important | Pallor tier II: the whine beats with a detune; colours of sound thin out (reduce highs of the bed). |
| `amb_pallor_three.m4a` | 20s | mono · loop | important | Pallor tier III: a low pallid chord, distant white noise and whispers. |
| `amb_pallor_four.m4a` | 20s | mono · loop | important | Pallor tier IV: the world is nearly muted: a tight high note, dry silence around it. |
| `amb_pallor_heart.m4a` | 10s | mono · loop | polish | Optional: a pale heartbeat layer for Pallor III/IV bargain floors. |
| `amb_ev_drip.m4a` … `amb_ev_drip_6.m4a` | 0.5s | mono · one-shot | core | A single water drip into a puddle with room reverb. Six pitches/positions. Today the synth `drip`/`water` bed events. |
| `amb_ev_gust.m4a` … `amb_ev_gust_3.m4a` | 2s | mono · one-shot | important | A short gust of wind through a crack. |
| `amb_ev_creak.m4a` … `amb_ev_creak_4.m4a` | 1.2s | mono · one-shot | important | Old wood or iron creaking in the distance. |
| `amb_ev_bones.m4a` … `amb_ev_bones_4.m4a` | 1s | mono · one-shot | important | Bones settling, a faint rattle, a skull rolling. |
| `amb_ev_rats.m4a` … `amb_ev_rats_3.m4a` | 1.5s | mono · one-shot | polish | Rats skittering off a wall. |
| `amb_ev_chains.m4a` … `amb_ev_chains_3.m4a` | 1.5s | mono · one-shot | polish | A chain rattling far away. |
| `amb_ev_bat.m4a` … `amb_ev_bat_3.m4a` | 1.2s | mono · one-shot | polish | Distant bat wings. |
| `amb_ev_rock.m4a` … `amb_ev_rock_3.m4a` | 1.2s | mono · one-shot | important | A pebble falling and a roll in the dark. |
| `amb_ev_crack.m4a` … `amb_ev_crack_4.m4a` | 0.4s | mono · one-shot | important | A coal crackle or fire pop. Today `fire` bed event. |
| `amb_ev_lava.m4a` … `amb_ev_lava_3.m4a` | 1.5s | mono · one-shot | polish | A lava bubble burst. |
| `amb_ev_hammer.m4a`, `amb_ev_hammer_2.m4a` | 2s | mono · one-shot | polish | A distant hammer hit. |
| `amb_ev_steam.m4a` … `amb_ev_steam_3.m4a` | 1.5s | mono · one-shot | polish | A steam vent hiss. |
| `amb_ev_glass.m4a` … `amb_ev_glass_4.m4a` | 1.5s | mono · one-shot | important | A glass shard chiming. |
| `amb_ev_whisper.m4a` … `amb_ev_whisper_6.m4a` | 2s | mono · one-shot | important | A whisper without words: a breathy human voice behind the walls. Today `choir`/`flesh` noise events. |
| `amb_ev_heart.m4a` … `amb_ev_heart_3.m4a` | 1.2s | mono · one-shot | important | A heartbeat with a bad rhythm (the Hellscape): thump-thump... thump. Today the `flesh`/`heart` synth. |
| `amb_ev_wail.m4a` … `amb_ev_wail_3.m4a` | 3s | mono · one-shot | important | Far off, something wails: a thin, long, sad howl, falling in pitch. Today the `flesh` synth. |
| `amb_ev_wet.m4a` … `amb_ev_wet_4.m4a` | 1s | mono · one-shot | important | A wet sound: a squelch or slap in the flesh. |
| `amb_ev_void.m4a` … `amb_ev_void_4.m4a` | 2s | mono · one-shot | polish | A single, empty ping from nowhere. |
| `amb_ev_rumble.m4a` … `amb_ev_rumble_3.m4a` | 3s | mono · one-shot | important | A tremor: a low rumble. |
| `amb_ev_eyes.m4a` … `amb_ev_eyes_3.m4a` | 1.2s | mono · one-shot | polish | Hellscape: eyes in the dark blink open: a barely audible wet tick (visual synced). |
| `amb_town_cold.m4a` | 30s | stereo · loop | core | Warmth 0 (frozen, before Act I): a bitter wind across dead rooftops, no chimney smoke, a loose shutter, a long gust; very far and faint, a… |
| `amb_town_thaw.m4a` | 30s | stereo · loop | core | Warmth 1 (after Act I, chimneys smoke): wind softening, one chimney crackling, a distant hummed tune, the tick of ice melting. |
| `amb_town_market.m4a` | 30s | stereo · loop | core | Warmth 2 (after Act II, the market opens): the hearth bed plus the murmur of a small market: stalls, a cart, a tapping hammer, a few… |
| `amb_town_warm.m4a` | 30s | stereo · loop | core | Warmth 3 (the town is warm after the finale): a full fire-lit evening: a lively murmur, children's laughter far off (non-verbal), bells, a… |
| `town_ev_cry.m4a` … `town_ev_cry_3.m4a` | 3s | mono · one-shot | polish | Warmth 0 only: a woman cries; relief, not grief. |
| `town_ev_hammer.m4a` … `town_ev_hammer_3.m4a` | 2s | mono · one-shot | important | A blacksmith hammer from Brakka's forge: used in warmth >= 1 (the anvil is mostly cold at 0). |
| `town_ev_sing.m4a`, `town_ev_sing_2.m4a` | 6s | mono · one-shot | important | Someone sings: a wordless hum, a lullaby; warmth 1+. |
| `town_ev_bell.m4a`, `town_ev_bell_2.m4a` | 4s | mono · one-shot | polish | A town bell: warmth 2+. |
| `town_ev_door.m4a` … `town_ev_door_3.m4a` | 0.8s | mono · one-shot | polish | A door opening and shutting somewhere in the town. |
| `amb_inn.m4a` | 30s | stereo · loop | important | The Banked Hearth inn: a roaring hearth, a low murmur of drinkers (no intelligible words), mugs thunking on wood, a poker on iron, a loud… |
| `inn_door.m4a`, `inn_door_2.m4a` | 1.2s | mono · one-shot | important | Entering the inn: a door swing, a swell of warmth and noise. |
| `inn_poker.m4a` … `inn_poker_3.m4a` | 0.6s | mono · one-shot | polish | Dory's poker on the hearth. |
| `inn_mug.m4a` … `inn_mug_3.m4a` | 0.5s | mono · one-shot | polish | A mug on wood. |
| `amb_camp_lamp.m4a` | 30s | stereo · loop | important | Lamp Camp (cleansed, depths 3-9): a small, brave settlement under rock: lanterns creaking, a pot simmering (rat broth), soft murmurs, a… |
| `amb_camp_fever.m4a` | 30s | stereo · loop | important | Fever Camp (cleansed, depths 12-19): hot, feverish: coughs, whispering, a bell, muffled wailing; still more safe than the floor outside. |
| `camp_campfire.m4a` | 10s | stereo · loop | polish | Camp fire detail: a deeper fire layer within 4 tiles. |
