# assets/sound/sfx/world/

59 entries · 105 files · core 31 / important 44 / polish 30.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/world/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `chest.m4a` … `chest_3.m4a` | 1.3s | mono · one-shot | core · plays today | chest open: a heavy lid creak, a thump, a rattle of loot. The player's best-known sound; keep the chest-open creak <0.5 s so the reward… |
| `chest_locked.m4a`, `chest_locked_2.m4a` | 0.6s | mono · one-shot | important | A locked lockdown chest rattles: iron lock and chain rattle. |
| `chest_unlock.m4a` | 1s | mono · one-shot | important | Lockdown cleared, the chest unlocks: a heavy bolt and a click, a warm glow. |
| `chest_open_rare.m4a`, `chest_open_rare_2.m4a` | 1.8s | mono · one-shot | important | Opening a chest with a better roll (rarityFloor rare, vault, gradeFloor): the same, with a golden swell: reward-first. (The contents'… |
| `barrel_break.m4a` … `barrel_break_4.m4a` | 0.7s | mono · one-shot | core | A barrel smashed: wood staves splintering, a metallic hoop ring, liquid slosh. The most common destructible. |
| `crate_break.m4a` … `crate_break_4.m4a` | 0.7s | mono · one-shot | core | A crate smashed: dry wood splinters, a sharp crack. |
| `secret_open.m4a`, `secret_open_2.m4a` | 2s | mono · one-shot | important | Secret crate breaks and the hidden cache closet opens: a stone slide, a hidden mechanism, dust. A discovery sound. |
| `bones_break.m4a` … `bones_break_3.m4a` | 0.5s | mono · one-shot | polish | Kicking a pile of bones: a brittle crunch. |
| `pillar_hit.m4a`, `pillar_hit_2.m4a` | 0.4s | mono · one-shot | polish | Hitting a pillar/tombstone with a wasted swing: a dull stone ding. |
| `vault_open.m4a` | 2s | mono · one-shot | important | The Key Hunt vault opens: a heavy vault door and a trove of coin, a tumbler turn. |
| `vault_seal.m4a` | 2s | mono · one-shot | important | The vault locks when time runs out: a massive bolt slam. |
| `door.m4a` … `door_3.m4a` | 1s | mono · one-shot | core · plays today | heavy door: a deep wood creak and a dull thud. Today bandpass-noise. |
| `door_close.m4a`, `door_close_2.m4a` | 0.8s | mono · one-shot | polish | A door closes: a thud and latch. |
| `door_locked.m4a`, `door_locked_2.m4a` | 0.4s | mono · one-shot | important | A locked door rattles: a chain jangle. |
| `gate_slam.m4a` … `gate_slam_3.m4a` | 1.5s | mono · one-shot | core | Lockdown gates slam shut around the room: a massive iron clank, a bar dropping, a rumble that rolls through the floor. A trap-springing… |
| `gate_open.m4a`, `gate_open_2.m4a` | 1.5s | mono · one-shot | important | Gates rise on clear: iron chains and grinding. |
| `stairs.m4a` … `stairs_3.m4a` | 1s | mono · one-shot | core · plays today | descending: four boot steps on stone with echo. Today synthesized. |
| `stairs_up.m4a` … `stairs_up_3.m4a` | 1s | mono · one-shot | important | Ascending a stair run: boot steps going up, a slight breath. |
| `portal_open.m4a` | 2s | mono · one-shot | core | Town portal opens (`townPortal`): a tearing of blue light, a hum of resonance and a gust of warm air. |
| `portal_loop.m4a` | 3s | stereo · loop | important | A standing portal's hum: a low shimmering warble; plays when within 8 tiles. |
| `portal_enter.m4a`, `portal_enter_2.m4a` | 1.5s | mono · one-shot | core | Stepping through a portal: a loud suck, a bass whoosh and silence; the world fades. |
| `portal_close.m4a` | 1s | mono · one-shot | polish | The portal vanishes: a sucked-in pop. |
| `waypoint_unlock.m4a` | 3s | stereo · one-shot | core | A new waypoint is activated (boss kill, depth): a brass-bell chime and a carved stone humming alive: the sound of progress. |
| `waypoint_use.m4a`, `waypoint_use_2.m4a` | 1.5s | mono · one-shot | important | Waypoint depth picker opens: stone resonance with your footfalls. |
| `waypoint_travel.m4a` | 2s | mono · one-shot | important | Choosing a depth: the world slides: a deep whoosh and a thump. |
| `dungeon_entrance.m4a`, `dungeon_entrance_2.m4a` | 2s | mono · one-shot | core | Town dungeon entrance interact: a cavernous inhale; a cold draft up from below, distant echoes. |
| `ropelift_ride.m4a` | 3s | mono · one-shot | important | Pell's rope-lift at Lamp Camp: ropes creaking and a pulley groan, a cage rattle. |
| `stash_open.m4a`, `stash_open_2.m4a` | 0.8s | mono · one-shot | important | Opening your stash: a heavy iron-bound chest lid. |
| `corpse_found.m4a` | 1.5s | mono · one-shot | important | Walking up to your corpse prop: bones and cloth rustle. |
| `shrine.m4a`, `shrine_2.m4a` | 2s | mono · one-shot | core · plays today | shrine blessing: a sustained warm choir-like triad that rises and fades. Today synthesized. |
| `shrine_bargain_offer.m4a` | 2.5s | mono · one-shot | core | A bargain shrine speaks (the two-button prompt appears): a hushed whisper, a heavy iron drop, a held minor chord. A deal is offered; do… |
| `shrine_bargain_accept.m4a` | 2.5s | mono · one-shot | core | You accept: a seal pressed into hot wax and a heavy handshake of drums; per-bargain tails below. |
| `bargain_blood_tithe.m4a` | 2s | mono · one-shot | important | Blood Tithe: a vein pulling out of the chest: a wet tug and a cold chill. (-25% max life) |
| `bargain_dry_vow.m4a` | 1.5s | mono · one-shot | important | Dry Vow: bottles smashing in a silent room; a cork and a vow. |
| `bargain_the_hunt.m4a` | 2.5s | mono · one-shot | important | The Hunt: a horn in the distance, hooves, a pale thing is sent: a growing dread. |
| `bargain_glass_heart.m4a` | 2s | mono · one-shot | important | Glass Heart: a glass pane cracking in a chest; a fragile ring as though your heart were crystal. |
| `shrine_bargain_decline.m4a` | 1s | mono · one-shot | polish | You decline: the whispers withdraw and the room warms a little. |
| `shrine_corrupt.m4a`, `shrine_corrupt_2.m4a` | 2.5s | mono · one-shot | important | A rift/corrupt shrine (`shrineKind:'corrupt'`): a fleshy pulse, a purple note that curdles. |
| `shrine_idle_loop.m4a` | 3s | mono · loop | polish | An un-used shrine hums softly when you are within 6 tiles. |
| `torch_loop.m4a` | 3s | mono · loop | polish | Wall torch: a quiet flicker/crackle loop, positional (engine fades by distance). One loop, repeated. |
| `brazier_loop.m4a` | 3s | mono · loop | polish | A brazier (Hob's): a larger fire with deeper roar; also the town's braziers. |
| `campfire_loop.m4a` | 4s | stereo · loop | important | A campfire (camps, town square): a dense warm crackle with settling logs. |
| `campfire_ignite.m4a` | 1s | mono · one-shot | polish | A campfire/town hearth lit as warmth increases. |
| `fountain_loop.m4a` | 4s | stereo · loop | polish | Town fountain (when running): water over stone. |
| `well_capped.m4a` | 0.8s | mono · one-shot | polish | The capped old well: a hollow thud when tapped. |
| `rift_crystal_loop.m4a` | 3s | mono · loop | important | Rift crystals and shards around the town fissure and the boss arena: a pitched, pulsing crystal hum, slightly sickly. |
| `town_fissure_loop.m4a` | 6s | stereo · loop | important | The rift fissure in the town plaza: a deep exhale of warmth and stone grinding; slowly deteriorates into a gasp at warmth 0. 5-tile CHASM. |
| `stall_cloth.m4a`, `stall_cloth_2.m4a` | 1s | mono · one-shot | polish | Market stall awning flapping (warmth >= 2): cloth snapping in a draught. |
| `sign_creak.m4a`, `sign_creak_2.m4a` | 1s | mono · one-shot | polish | A creaking hanging sign. |
| `bush_rustle.m4a` … `bush_rustle_3.m4a` | 0.5s | mono · one-shot | polish | Walking through a bush/tree: leaves and twigs. |
| `lava_burn_loop.m4a` | 1s | mono · loop | core | Standing in lava (4% max life/s, fire): a spitting, sizzling hiss at your feet; fades when you leave. |
| `lava_pop.m4a` … `lava_pop_3.m4a` | 0.4s | mono · one-shot | polish | Lava surface bubbles and pops: ambient, positional if lava is within 6 tiles. |
| `water_splash.m4a` … `water_splash_3.m4a` | 0.5s | mono · one-shot | important | Entering shallow water: a bigger splash than a step. |
| `water_exit.m4a`, `water_exit_2.m4a` | 0.5s | mono · one-shot | polish | Leaving the water: a dripping step. |
| `rockfall.m4a` … `rockfall_4.m4a` | 1.2s | mono · one-shot | important | Collapse event (25 s of falling rock): one rock striking the ground: a grinding smash and rubble patter. Plays for each zone detonation; 2… |
| `rockfall_tele.m4a` … `rockfall_tele_3.m4a` | 1s | mono · one-shot | important | The rock about to fall: a tiny creaking and trickle of dust above you. |
| `cavein_rumble.m4a` | 4s | mono · loop | important | The cave-in as a whole: a rumble loop under the event; stops at the end. |
| `fissure_pulse.m4a`, `fissure_pulse_2.m4a` | 2s | mono · one-shot | polish | A corruption fissure on the map pulses: a heart-like thud. |
| `corrupt_growth_loop.m4a` | 4s | mono · loop | polish | Tainted growth and veins (deep floors): a quiet wet creak and gurgle. |
