# assets/sound/sfx/weapons/

49 entries · 145 files · core 71 / important 32 / polish 42.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `swing.m4a` … `swing_4.m4a` | 0.4s | mono · one-shot | core · plays today | generic whoosh. Keep as the fallback for any weapon type without its own set. |
| `wpn_sword_swing.m4a` … `wpn_sword_swing_4.m4a` | 0.35s | mono · one-shot | core | Steel through air: a clean singing slash, quick, a tiny metallic edge ring. |
| `wpn_axe_swing.m4a` … `wpn_axe_swing_4.m4a` | 0.45s | mono · one-shot | core | Heavier, lopsided whoosh, a low "chuff" at the end, haft creaks. |
| `wpn_mace_swing.m4a` … `wpn_mace_swing_4.m4a` | 0.5s | mono · one-shot | core | Big dull whoomp, leather-wrapped haft, the head dragging air. |
| `wpn_dagger_swing.m4a` … `wpn_dagger_swing_4.m4a` | 0.25s | mono · one-shot | core | Tiny, fast slice, almost a hiss. |
| `wpn_heavy_swing.m4a` … `wpn_heavy_swing_3.m4a` | 0.7s | mono · one-shot | important | Two-handed weapon swing: a slower, huge, ugly whoosh with a creak of effort. |
| `wpn_unarmed_swing.m4a` … `wpn_unarmed_swing_3.m4a` | 0.3s | mono · one-shot | important | Fist and forearm: a soft cloth whip. |
| `wpn_shield_bash.m4a` … `wpn_shield_bash_3.m4a` | 0.45s | mono · one-shot | polish | Shield bash/shove (Shoulder Charge shove, Point Blank perk): wood and iron plant on flesh. |
| `arrow.m4a` … `arrow_4.m4a` | 0.4s | mono · one-shot | core · plays today | bow release: bowstring twang, a short feather whistle. Today synthesized. |
| `bow_draw.m4a`, `bow_draw_2.m4a` | 0.5s | mono · one-shot | polish | The pull of the bowstring: leather and wood creak. Plays on windup for long-draw skills (Snipe, Aimed Shot). |
| `arrow_whiz.m4a` … `arrow_whiz_3.m4a` | 0.4s | mono · one-shot | polish | An enemy arrow flies past your head: a thin whine, Doppler up and gone. |
| `wand_zap.m4a` … `wand_zap_4.m4a` | 0.35s | mono · one-shot | core | Wand basic: a crackle with a bright high-frequency snap, tiny sparks. |
| `staff_cast.m4a` … `staff_cast_4.m4a` | 0.5s | mono · one-shot | core | Staff basic: lower, a rising hum then a whump, wooden thrum. |
| `bolt.m4a` … `bolt_3.m4a` | 0.4s | mono · one-shot | core · plays today | lightning crack, used for the caster's basic bolt. Today synthesized. |
| `cast.m4a` … `cast_4.m4a` | 0.5s | mono · one-shot | core · plays today | generic spell release (rising sine glide). The fallback for any cast without its own sound. |
| `hit.m4a` … `hit_4.m4a` | 0.3s | mono · one-shot | core · plays today | generic weapon impact. Fallback for anything unmatched. |
| `wpn_sword_hit.m4a` … `wpn_sword_hit_3.m4a` | 0.3s | mono · one-shot | core | Sharp slice through meat, bright edge ring: the "cut" top layer. |
| `wpn_axe_hit.m4a` … `wpn_axe_hit_3.m4a` | 0.35s | mono · one-shot | core | A chop with weight: cleaving thud, wood-splitting crunch. |
| `wpn_mace_hit.m4a` … `wpn_mace_hit_3.m4a` | 0.35s | mono · one-shot | core | A blunt crush: low boom, bone-cracking undertone. |
| `wpn_dagger_hit.m4a` … `wpn_dagger_hit_3.m4a` | 0.25s | mono · one-shot | core | A quick stab: wet prick and tear. |
| `wpn_heavy_hit.m4a` … `wpn_heavy_hit_3.m4a` | 0.5s | mono · one-shot | important | Two-handed impact, bigger and lower: ground shakes slightly. |
| `wpn_unarmed_hit.m4a` … `wpn_unarmed_hit_3.m4a` | 0.25s | mono · one-shot | polish | A fist on flesh, the lightest layer. |
| `hitmat_flesh.m4a` … `hitmat_flesh_4.m4a` | 0.3s | mono · one-shot | core | Wet meaty thud: the body of the hit on flesh monsters (ghoul, goblin, hound, imp). |
| `hitmat_bone.m4a` … `hitmat_bone_4.m4a` | 0.3s | mono · one-shot | core | Dry crack and rattle of bones shifting: skeletons and bone mages. |
| `hitmat_metal.m4a` … `hitmat_metal_3.m4a` | 0.3s | mono · one-shot | important | Hard clang, a spark: armoured knights and shielded foes. |
| `hitmat_ghost.m4a` … `hitmat_ghost_3.m4a` | 0.4s | mono · one-shot | important | Muted, airy puff with a thin whine, like hitting smoke that hits back. |
| `hitmat_slime.m4a` … `hitmat_slime_3.m4a` | 0.35s | mono · one-shot | important | Wet squelch and slop. |
| `hitmat_chitin.m4a` … `hitmat_chitin_3.m4a` | 0.3s | mono · one-shot | important | A crisp crunch of shell and a pop of ichor: spiders. |
| `hitmat_stone.m4a` … `hitmat_stone_3.m4a` | 0.35s | mono · one-shot | important | Dull stone thud with dust: bosses and golems. |
| `hitmat_molten.m4a`, `hitmat_molten_2.m4a` | 0.4s | mono · one-shot | polish | Hiss of steel on hot slag: magma brute. |
| `crit_hit.m4a` … `crit_hit_4.m4a` | 0.5s | mono · one-shot | core | Critical hit layer: a bright metallic ring over a deep thud and a quick rising "ting". Must be instantly recognisable among 20 other hits. |
| `crit_big.m4a`, `crit_big_2.m4a` | 0.8s | mono · one-shot | important | Huge critical (>25% of the target's life) or execute-type: bass drop and a broken-glass ring. |
| `kill_blow.m4a` … `kill_blow_3.m4a` | 0.4s | mono · one-shot | polish | The hit that kills: the final heavy thud before the death vocal. |
| `arrow_hit_flesh.m4a` … `arrow_hit_flesh_4.m4a` | 0.25s | mono · one-shot | core | Arrow in meat: thud-and-thwip. |
| `arrow_hit_bone.m4a` … `arrow_hit_bone_3.m4a` | 0.25s | mono · one-shot | important | Arrow clacks into bone. |
| `arrow_hit_wall.m4a` … `arrow_hit_wall_3.m4a` | 0.25s | mono · one-shot | polish | Arrow strikes stone or a wall: a bright tick, skitter. |
| `bolt_hit.m4a` … `bolt_hit_3.m4a` | 0.3s | mono · one-shot | important | Caster basic bolt impact: a small electric pop with a crackle tail. |
| `fx_split_shot.m4a`, `fx_split_shot_2.m4a` | 0.3s | mono · one-shot | polish | Mythic split_shot: one arrow forks, a crisp double twang. |
| `fx_corpse_blast.m4a`, `fx_corpse_blast_2.m4a` | 0.5s | mono · one-shot | polish | Mythic corpse_blast: a wet burst from a corpse, a red flash of sound. |
| `fx_chain_spark.m4a`, `fx_chain_spark_2.m4a` | 0.4s | mono · one-shot | polish | Mythic chain_spark: a skittering spark that jumps three times. |
| `fx_second_wind.m4a` | 1s | mono · one-shot | polish | Mythic second_wind: a deep inhale, heart thump, glow. |
| `fx_echo_cast.m4a`, `fx_echo_cast_2.m4a` | 0.5s | mono · one-shot | polish | Mythic echo_cast: the spell repeats as a delayed ghostly copy. |
| `fx_blood_price.m4a`, `fx_blood_price_2.m4a` | 0.5s | mono · one-shot | polish | Mythic blood_price: a wet cut and a hungry swallow. |
| `fx_midas.m4a`, `fx_midas_2.m4a` | 0.6s | mono · one-shot | polish | Mythic midas: coins turning to gold, a metallic shimmer. |
| `fx_frozen_wake.m4a`, `fx_frozen_wake_2.m4a` | 0.6s | mono · one-shot | polish | Mythic frozen_wake: ice growing behind the player's feet, a trail of tiny cracks. |
| `fx_legion.m4a`, `fx_legion_2.m4a` | 0.8s | mono · one-shot | polish | Mythic legion: a rattle of many bones standing at once. |
| `fx_thunderstep.m4a`, `fx_thunderstep_2.m4a` | 0.5s | mono · one-shot | polish | Mythic thunderstep: a boot-stomp of thunder. |
| `fx_executioner.m4a`, `fx_executioner_2.m4a` | 0.6s | mono · one-shot | polish | Mythic executioner: a chopping-block thud and a rising edge. |
| `fx_hoarder.m4a`, `fx_hoarder_2.m4a` | 0.5s | mono · one-shot | polish | Mythic hoarder: a leather purse stuffed closed. |
