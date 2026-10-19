# assets/sound/sfx/monsters/shared/

126 entries · 324 files · core 127 / important 142 / polish 55.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `mon_body_humanoid_alert.m4a`, `mon_body_humanoid_alert_2.m4a` | 0.8s | mono · one-shot | core | Humanoid notices you (goblin, goblin slinger, the Magpie, Scavenger and the Fallen as men and women). Sound: harsh, quick, wheezy;… |
| `mon_body_humanoid_attack.m4a` … `mon_body_humanoid_attack_3.m4a` | 0.5s | mono · one-shot | core | Humanoid attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_humanoid_hurt.m4a` … `mon_body_humanoid_hurt_3.m4a` | 0.4s | mono · one-shot | core | Humanoid is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_humanoid_die.m4a` … `mon_body_humanoid_die_3.m4a` | 1.2s | mono · one-shot | core | Humanoid dies: the full death sound. Sound: harsh, quick, wheezy; cowardly chatter that rises when many are present (no words). The same… |
| `mon_body_humanoid_idle.m4a`, `mon_body_humanoid_idle_2.m4a` | 1.2s | mono · one-shot | important | Humanoid idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_humanoid_move.m4a` … `mon_body_humanoid_move_4.m4a` | 0.4s | mono · one-shot | important | Humanoid footfall: cloth and leather footfall. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_skeleton_alert.m4a`, `mon_body_skeleton_alert_2.m4a` | 0.8s | mono · one-shot | core | Skeleton notices you (skeleton, skeleton archer, Morgrath, minion skeletons). Sound: no voice: jaw clacks, rattling bones, a dry wooden… |
| `mon_body_skeleton_attack.m4a` … `mon_body_skeleton_attack_3.m4a` | 0.5s | mono · one-shot | core | Skeleton attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_skeleton_hurt.m4a` … `mon_body_skeleton_hurt_3.m4a` | 0.4s | mono · one-shot | core | Skeleton is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_skeleton_die.m4a` … `mon_body_skeleton_die_3.m4a` | 1.2s | mono · one-shot | core | Skeleton dies: the full death sound. Sound: no voice: jaw clacks, rattling bones, a dry wooden knock; death = a collapsing pile of bones.… |
| `mon_body_skeleton_idle.m4a`, `mon_body_skeleton_idle_2.m4a` | 1.2s | mono · one-shot | important | Skeleton idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_skeleton_move.m4a` … `mon_body_skeleton_move_4.m4a` | 0.4s | mono · one-shot | important | Skeleton footfall: bones on stone: a dry click-clack. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_beast_alert.m4a`, `mon_body_beast_alert_2.m4a` | 0.8s | mono · one-shot | core | Beast notices you (grave rat, hellhound). Sound: animal: squeals, snarls, a throaty growl; rat = chittering, hound = a hot dog-growl.… |
| `mon_body_beast_attack.m4a` … `mon_body_beast_attack_3.m4a` | 0.5s | mono · one-shot | core | Beast attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_beast_hurt.m4a` … `mon_body_beast_hurt_3.m4a` | 0.4s | mono · one-shot | core | Beast is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_beast_die.m4a` … `mon_body_beast_die_3.m4a` | 1.2s | mono · one-shot | core | Beast dies: the full death sound. Sound: animal: squeals, snarls, a throaty growl; rat = chittering, hound = a hot dog-growl. The same… |
| `mon_body_beast_idle.m4a`, `mon_body_beast_idle_2.m4a` | 1.2s | mono · one-shot | important | Beast idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_beast_move.m4a` … `mon_body_beast_move_4.m4a` | 0.4s | mono · one-shot | important | Beast footfall: padded paws, claws scratching. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_blob_alert.m4a`, `mon_body_blob_alert_2.m4a` | 0.8s | mono · one-shot | core | Blob notices you (bile slime, shadowling). Sound: wet gurgles, burbling pops; shadowling = a sibilant hiss with a chord of tiny voices.… |
| `mon_body_blob_attack.m4a` … `mon_body_blob_attack_3.m4a` | 0.5s | mono · one-shot | core | Blob attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_blob_hurt.m4a` … `mon_body_blob_hurt_3.m4a` | 0.4s | mono · one-shot | core | Blob is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_blob_die.m4a` … `mon_body_blob_die_3.m4a` | 1.2s | mono · one-shot | core | Blob dies: the full death sound. Sound: wet gurgles, burbling pops; shadowling = a sibilant hiss with a chord of tiny voices. The same… |
| `mon_body_blob_idle.m4a`, `mon_body_blob_idle_2.m4a` | 1.2s | mono · one-shot | important | Blob idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_blob_move.m4a` … `mon_body_blob_move_4.m4a` | 0.4s | mono · one-shot | important | Blob footfall: a sticky squelch and drag. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_flyer_alert.m4a`, `mon_body_flyer_alert_2.m4a` | 0.8s | mono · one-shot | core | Flyer notices you (gloom bat, imp, ember imp, gazer). Sound: bat: high clicks and screeches; imp: cackling chitter; gazer: a wet wheezing… |
| `mon_body_flyer_attack.m4a` … `mon_body_flyer_attack_3.m4a` | 0.5s | mono · one-shot | core | Flyer attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_flyer_hurt.m4a` … `mon_body_flyer_hurt_3.m4a` | 0.4s | mono · one-shot | core | Flyer is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_flyer_die.m4a` … `mon_body_flyer_die_3.m4a` | 1.2s | mono · one-shot | core | Flyer dies: the full death sound. Sound: bat: high clicks and screeches; imp: cackling chitter; gazer: a wet wheezing hum. The same… |
| `mon_body_flyer_idle.m4a`, `mon_body_flyer_idle_2.m4a` | 1.2s | mono · one-shot | important | Flyer idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_flyer_move.m4a` … `mon_body_flyer_move_4.m4a` | 0.4s | mono · one-shot | important | Flyer footfall: a wing flutter (rapid flapping loop-ish, 0.5 s), different for bats (leather) and imps (fire-crackle). Plays while… |
| `mon_body_spider_alert.m4a`, `mon_body_spider_alert_2.m4a` | 0.8s | mono · one-shot | core | Spider notices you (cave spider, abyss stalker, Skarn). Sound: hisses, clicks and a dry chittering; larger = lower pitch. 0.5-0.8 s. |
| `mon_body_spider_attack.m4a` … `mon_body_spider_attack_3.m4a` | 0.5s | mono · one-shot | core | Spider attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_spider_hurt.m4a` … `mon_body_spider_hurt_3.m4a` | 0.4s | mono · one-shot | core | Spider is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_spider_die.m4a` … `mon_body_spider_die_3.m4a` | 1.2s | mono · one-shot | core | Spider dies: the full death sound. Sound: hisses, clicks and a dry chittering; larger = lower pitch. The same body-set sound must also be… |
| `mon_body_spider_idle.m4a`, `mon_body_spider_idle_2.m4a` | 1.2s | mono · one-shot | important | Spider idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_spider_move.m4a` … `mon_body_spider_move_4.m4a` | 0.4s | mono · one-shot | important | Spider footfall: rapid legs skittering (the signature sound of spiders), 0.4 s burst. Plays while walking, throttled and mixed quiet.… |
| `mon_body_caster_alert.m4a`, `mon_body_caster_alert_2.m4a` | 0.8s | mono · one-shot | core | Caster notices you (bone mage, goblin shaman, pyromancer, void caller, skeletal mage minions). Sound: chanting-like mutters without words,… |
| `mon_body_caster_attack.m4a` … `mon_body_caster_attack_3.m4a` | 0.5s | mono · one-shot | core | Caster attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_caster_hurt.m4a` … `mon_body_caster_hurt_3.m4a` | 0.4s | mono · one-shot | core | Caster is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_caster_die.m4a` … `mon_body_caster_die_3.m4a` | 1.2s | mono · one-shot | core | Caster dies: the full death sound. Sound: chanting-like mutters without words, a rasping breath; spells end with a rising ring. The same… |
| `mon_body_caster_idle.m4a`, `mon_body_caster_idle_2.m4a` | 1.2s | mono · one-shot | important | Caster idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_caster_move.m4a` … `mon_body_caster_move_4.m4a` | 0.4s | mono · one-shot | important | Caster footfall: robe swish and a staff tap. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_brute_alert.m4a`, `mon_body_brute_alert_2.m4a` | 0.8s | mono · one-shot | core | Brute notices you (ghoul, cave troll, magma brute, dread knight). Sound: deep growls and wet grunts, heavy breath; the troll grumbles.… |
| `mon_body_brute_attack.m4a` … `mon_body_brute_attack_3.m4a` | 0.5s | mono · one-shot | core | Brute attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_brute_hurt.m4a` … `mon_body_brute_hurt_3.m4a` | 0.4s | mono · one-shot | core | Brute is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_brute_die.m4a` … `mon_body_brute_die_3.m4a` | 1.2s | mono · one-shot | core | Brute dies: the full death sound. Sound: deep growls and wet grunts, heavy breath; the troll grumbles. The same body-set sound must also… |
| `mon_body_brute_idle.m4a`, `mon_body_brute_idle_2.m4a` | 1.2s | mono · one-shot | important | Brute idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_brute_move.m4a` … `mon_body_brute_move_4.m4a` | 0.4s | mono · one-shot | important | Brute footfall: heavy thudding footfalls with a bass hit. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_wraith_alert.m4a`, `mon_body_wraith_alert_2.m4a` | 0.8s | mono · one-shot | core | Wraith notices you (wraith, void wraith, Xal'thuun, ghost adds). Sound: a thin hollow moan, an airy wail with reverb; cold. 0.5-0.8 s. |
| `mon_body_wraith_attack.m4a` … `mon_body_wraith_attack_3.m4a` | 0.5s | mono · one-shot | core | Wraith attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_wraith_hurt.m4a` … `mon_body_wraith_hurt_3.m4a` | 0.4s | mono · one-shot | core | Wraith is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_wraith_die.m4a` … `mon_body_wraith_die_3.m4a` | 1.2s | mono · one-shot | core | Wraith dies: the full death sound. Sound: a thin hollow moan, an airy wail with reverb; cold. The same body-set sound must also be easily… |
| `mon_body_wraith_idle.m4a`, `mon_body_wraith_idle_2.m4a` | 1.2s | mono · one-shot | important | Wraith idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_wraith_move.m4a` … `mon_body_wraith_move_4.m4a` | 0.4s | mono · one-shot | important | Wraith footfall: no footsteps: a drifting whisper-whoosh. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_body_demon_alert.m4a`, `mon_body_demon_alert_2.m4a` | 0.8s | mono · one-shot | core | Demon notices you (pit fiend, dread knight (as demon body), Azgalor). Sound: an angry guttural roar with a hiss, a burning-throat rasp.… |
| `mon_body_demon_attack.m4a` … `mon_body_demon_attack_3.m4a` | 0.5s | mono · one-shot | core | Demon attack windup/swing: a short vocal effort, the weapon or limb moving. Do not include impact (that is `hit*`). |
| `mon_body_demon_hurt.m4a` … `mon_body_demon_hurt_3.m4a` | 0.4s | mono · one-shot | core | Demon is hurt: a clipped pain sound; short enough to play at 5 hits/s. |
| `mon_body_demon_die.m4a` … `mon_body_demon_die_3.m4a` | 1.2s | mono · one-shot | core | Demon dies: the full death sound. Sound: an angry guttural roar with a hiss, a burning-throat rasp. The same body-set sound must also be… |
| `mon_body_demon_idle.m4a`, `mon_body_demon_idle_2.m4a` | 1.2s | mono · one-shot | important | Demon idle noise: a quiet, rare ambient cue that tells the player something is nearby in the dark (6-14 s timer). |
| `mon_body_demon_move.m4a` … `mon_body_demon_move_4.m4a` | 0.4s | mono · one-shot | important | Demon footfall: hoof-and-claw clop with a hot hiss. Plays while walking, throttled and mixed quiet. Fades with distance. |
| `mon_shot_arrow.m4a` … `mon_shot_arrow_3.m4a` | 0.4s | mono · one-shot | core | Enemy arrow launch: thinner and slightly quieter than the player's `arrow`, so the player can tell them apart. |
| `mon_shot_bolt.m4a` … `mon_shot_bolt_3.m4a` | 0.4s | mono · one-shot | core | Enemy lightning bolt: a nasty buzzing zap (shaman, gazer). |
| `mon_shot_orb.m4a` … `mon_shot_orb_3.m4a` | 0.4s | mono · one-shot | important | Sling stone or orb: a leather whirr and a thok (goblin slinger); void orb whine for the abyss. |
| `mon_shot_fireball.m4a` … `mon_shot_fireball_3.m4a` | 0.6s | mono · one-shot | core | Enemy fireball: a sputtering hot whoosh, always a little 'wrong' compared to the player's (a rasp). |
| `mon_shot_shard.m4a` … `mon_shot_shard_3.m4a` | 0.4s | mono · one-shot | important | Bone/ice shard throw: a hard clicking spin. |
| `mon_shot_spit.m4a` … `mon_shot_spit_3.m4a` | 0.4s | mono · one-shot | important | Venom/acid spit: a wet hawk and a sizzling flight. |
| `proj_hit_arrow.m4a` … `proj_hit_arrow_3.m4a` | 0.25s | mono · one-shot | important | Enemy arrow hits the player or a minion: thunk. |
| `proj_hit_bolt.m4a` … `proj_hit_bolt_3.m4a` | 0.3s | mono · one-shot | important | Enemy bolt hits: crackling pop. |
| `proj_hit_fire.m4a` … `proj_hit_fire_3.m4a` | 0.5s | mono · one-shot | important | Enemy fireball hits: a dull fire burst, embers. |
| `proj_hit_shard.m4a` … `proj_hit_shard_3.m4a` | 0.3s | mono · one-shot | important | Shard breaks: a bright glass-like crackle. |
| `proj_hit_spit.m4a` … `proj_hit_spit_3.m4a` | 0.35s | mono · one-shot | important | Spit splats: a venom sizzle. |
| `zone_tele.m4a` … `zone_tele_3.m4a` | 0.9s | mono · one-shot | core | Blast/zone telegraph appears (red ring): a swelling warning tone that ends precisely at detonation (the tele time is 0.5-1.1 s, so produce… |
| `zone_tele_short.m4a` … `zone_tele_short_3.m4a` | 0.5s | mono · one-shot | core | The same family cut to 0.5 s, for fast tells and Collapse rocks. |
| `zone_tele_long.m4a`, `zone_tele_long_2.m4a` | 1.2s | mono · one-shot | important | The same family cut to 1.2 s, for boss circles and Meteor Rain. |
| `zone_blast_fire.m4a` … `zone_blast_fire_3.m4a` | 0.8s | mono · one-shot | important | A telegraphed fire blast detonates (pyromancer, circles): a hot punch with ember spray. |
| `zone_blast_cold.m4a` … `zone_blast_cold_3.m4a` | 0.8s | mono · one-shot | important | Cold zone detonation (void caller): a glassy implosion. |
| `zone_blast_poison.m4a` … `zone_blast_poison_3.m4a` | 0.8s | mono · one-shot | important | Poison zone burst: a sick wet pop and hiss. |
| `zone_blast_phys.m4a` … `zone_blast_phys_3.m4a` | 0.8s | mono · one-shot | important | Plain physical blast (rocks, slams): a dull boom. |
| `zone_linger_loop.m4a`, `zone_linger_loop_2.m4a` | 2s | mono · loop | polish | Lingering ground hazard (bile, void wells, fire pools, molten trails): a low bubbling/fizzing loop with a dtype flavour (3 cuts: fire,… |
| `zone_dodge.m4a` | 0.3s | mono · one-shot | important | Close-call whisper: when you leave a zone before it fires and the tele nearly finished. (Close Call itself has its own sounds: see Events… |
| `mon_death_blast_fire.m4a`, `mon_death_blast_fire_2.m4a` | 0.9s | mono · one-shot | important | Magma Brute / Fire Enchanted death blast: a furnace-door boom, the corpse bursting. |
| `mon_death_blast_cold.m4a`, `mon_death_blast_cold_2.m4a` | 0.7s | mono · one-shot | important | Frozen death burst: a flash-freeze shatter. |
| `corpse_thud.m4a` … `corpse_thud_3.m4a` | 0.4s | mono · one-shot | polish | A body settling after the death sound, tiny: a quiet floor thud. |
| `corpse_decay.m4a`, `corpse_decay_2.m4a` | 1.5s | mono · one-shot | polish | After 6 s the corpse crumbles: a quiet dissolving hiss and dust. Almost inaudible. |
| `alert_champion.m4a`, `alert_champion_2.m4a` | 1.5s | mono · one-shot | important | A champion pack aggros: a layered double-voice growl plus a low brass tone. The player should learn "this is more than normal". |
| `alert_rare.m4a`, `alert_rare_2.m4a` | 1.8s | mono · one-shot | important | A rare (blue-named) monster aggros: a heavier growl with a rising ominous drone and a bell. |
| `alert_legendary.m4a`, `alert_legendary_2.m4a` | 2.5s | mono · one-shot | core | A Legendary monster (orange) aggros: a booming roar stack, a low rumble, a harsh bell. Today it uses `shrine` as a one-off announce. |
| `legendary_spawn_sense.m4a` | 2s | mono · one-shot | polish | You arrive on a floor with a Legendary: a faint, deep tremor like distant bells. |
| `pallid_alert.m4a`, `pallid_alert_2.m4a` | 1.2s | mono · one-shot | important | A Pallid monster aggros (Pallor III+): drained, tuneless whisper and a missing-note shimmer. |
| `mod_fast.m4a`, `mod_fast_2.m4a` | 0.5s | mono · one-shot | polish | Fast: a rapid wind-up flurry that goes by in a rush, whooshing and pushing air. |
| `mod_extra_strong.m4a`, `mod_extra_strong_2.m4a` | 0.6s | mono · one-shot | polish | Extra Strong: a deep growl rumble layered under the attack. |
| `mod_stalwart.m4a`, `mod_stalwart_2.m4a` | 0.5s | mono · one-shot | polish | Stalwart: a metallic ring under hits. |
| `mod_vampiric.m4a`, `mod_vampiric_2.m4a` | 0.5s | mono · one-shot | important | Vampiric heals on hit: a wet red gulp. |
| `mod_teleporter.m4a` … `mod_teleporter_3.m4a` | 0.5s | mono · one-shot | important | Teleporter blinks to you: an inward air suck, a short purple warble. |
| `mod_shielding_on.m4a`, `mod_shielding_on_2.m4a` | 0.5s | mono · one-shot | important | Shielding becomes immune (white ring): a glassy ring, a bell ping that says "do not hit now". |
| `mod_shielding_off.m4a`, `mod_shielding_off_2.m4a` | 0.4s | mono · one-shot | important | Shield drops: a short pop. |
| `mod_thorned.m4a`, `mod_thorned_2.m4a` | 0.3s | mono · one-shot | polish | Thorns hurt you: a prickly snick. |
| `mod_regenerating.m4a`, `mod_regenerating_2.m4a` | 0.5s | mono · one-shot | polish | Regeneration tick: a soft green pulse. |
| `mod_mortar.m4a` … `mod_mortar_3.m4a` | 0.6s | mono · one-shot | important | Mortar lobs a marked blast: a tube thump and whistle. |
| `mod_jailer.m4a` … `mod_jailer_3.m4a` | 0.8s | mono · one-shot | important | Jailer marks the ground, then roots you: chains rattling out of the dark. |
| `mod_molten.m4a`, `mod_molten_2.m4a` | 0.6s | mono · one-shot | polish | Molten trail ignites: a gas whoosh and lingering crackle. |
| `mod_plagued.m4a` | 2s | mono · loop | polish | Plagued aura: a buzzing, bubbling fly-swarm hum (quiet loop on the monster). |
| `mod_aura_might.m4a`, `mod_aura_might_2.m4a` | 0.6s | mono · one-shot | important | Aura of Might red pulse: a low war-drum thump. |
| `mod_aura_haste.m4a`, `mod_aura_haste_2.m4a` | 0.6s | mono · one-shot | important | Aura of Haste yellow pulse: a fast ticking shimmer. |
| `mod_mana_burn.m4a`, `mod_mana_burn_2.m4a` | 0.5s | mono · one-shot | polish | Mana Burn: a blue sizzle as mana drains. |
| `mod_knockback.m4a` … `mod_knockback_3.m4a` | 0.4s | mono · one-shot | polish | Knockback: a big shove, a grunt-less thump. |
| `mod_volley.m4a` … `mod_volley_3.m4a` | 0.6s | mono · one-shot | polish | Volley: a fan of shots, rattling. |
| `mod_frenzied.m4a`, `mod_frenzied_2.m4a` | 0.8s | mono · one-shot | polish | Frenzied below half life: a quick ragged shriek. |
| `mod_evasive.m4a`, `mod_evasive_2.m4a` | 0.4s | mono · one-shot | polish | Evasive dodges: a quick scrape and swish. |
| `mod_armoured.m4a`, `mod_armoured_2.m4a` | 0.4s | mono · one-shot | polish | Armoured: a deflection ping on physical hits. |
| `mod_siege.m4a` … `mod_siege_3.m4a` | 0.6s | mono · one-shot | polish | Siege shells a still target at range: a mortar thump with a descending shell whistle. |
| `mod_splitting.m4a`, `mod_splitting_2.m4a` | 0.9s | mono · one-shot | important | Splitting Legendary dies and splits in two: a wet crack and a double roar. |
| `mod_nova_charge.m4a`, `mod_nova_charge_2.m4a` | 1.3s | mono · one-shot | important | Nova (Legendary): a huge swelling charge, red ring growing: a rising shriek that ends at the blast. |
| `mod_nova_blast.m4a`, `mod_nova_blast_2.m4a` | 1.2s | mono · one-shot | important | The nova detonation: a heavy shockwave boom. |
| `mod_reflecting.m4a`, `mod_reflecting_2.m4a` | 0.8s | mono · one-shot | important | Reflecting shield: a mirror-bright metallic bounce that sends projectiles back. |
| `mod_vortex.m4a`, `mod_vortex_2.m4a` | 1.2s | mono · one-shot | important | Vortex pulls you in: a growing wind-suck. |
| `mod_enraging.m4a`, `mod_enraging_2.m4a` | 1.4s | mono · one-shot | important | Enraging below 30%: a roar that breaks and goes lower; ground rumble. |
| `mod_shadecaller.m4a`, `mod_shadecaller_2.m4a` | 1s | mono · one-shot | important | Shadecaller summons shades: a handful of whispers peel out of the floor. |
| `mod_gravewalker.m4a`, `mod_gravewalker_2.m4a` | 1s | mono · one-shot | polish | Gravewalker (21+): a grave-dirt rustle and a skeleton stirring. |
| `mod_siphoning.m4a`, `mod_siphoning_2.m4a` | 0.8s | mono · one-shot | polish | Siphoning: a hissing draw on your resources. |
| `mod_devouring.m4a`, `mod_devouring_2.m4a` | 1s | mono · one-shot | polish | Devouring: a gnawing, a wet crunch as it eats corpses. |
| `mod_arcing.m4a`, `mod_arcing_2.m4a` | 0.6s | mono · one-shot | polish | Arcing: a crackling jump. |
| `mod_hexing.m4a`, `mod_hexing_2.m4a` | 0.8s | mono · one-shot | polish | Hexing: a curse seal whisper. |
| `mod_duplicating.m4a`, `mod_duplicating_2.m4a` | 0.8s | mono · one-shot | polish | Duplicating: a double-bell copy-pop. |
| `mod_undying_pact.m4a` … `mod_undying_pact_3.m4a` | 1.2s | mono · one-shot | polish | Undying Pact: a shared heartbeat that connects two monsters; a PACT toll when one tries to die. |
| `mod_time_warp.m4a`, `mod_time_warp_2.m4a` | 1.2s | mono · one-shot | polish | Time Warp: a tape-slow-down warble in the world. |
