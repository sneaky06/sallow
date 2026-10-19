# assets/sound/sfx/player/

100 entries · 266 files · core 95 / important 125 / polish 46.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `step_stone.m4a` … `step_stone_5.m4a` | 0.25s | mono · one-shot | core | Bare-soled leather boot on cold flagstone: dry tap, tiny grit scrape, a little crypt-tail. The most-heard sound in the game; keep it quiet… |
| `step_dirt.m4a` … `step_dirt_5.m4a` | 0.25s | mono · one-shot | core | Soft thud on packed earth with a crumb of gravel. Caves, cellars, camps. |
| `step_cobble.m4a` … `step_cobble_5.m4a` | 0.25s | mono · one-shot | core | Town cobbles and the dirt PATH tile: harder tap, slight ring, a stone chip skittering. |
| `step_grass.m4a` … `step_grass_4.m4a` | 0.25s | mono · one-shot | important | Town grass and bushes: wet-ish brush and flatten, no crunch (the grass is half dead). |
| `step_wood.m4a` … `step_wood_5.m4a` | 0.25s | mono · one-shot | core | Hollow plank step with a creak on every other variation: bridges, door thresholds, the inn floor, stalls. |
| `step_water.m4a` … `step_water_5.m4a` | 0.35s | mono · one-shot | core | Shallow WATER tile (slowed to 60%): a heavy, resisting slosh, ankle-deep, cold. Slightly longer than other steps. |
| `step_lava.m4a` … `step_lava_4.m4a` | 0.35s | mono · one-shot | core | Shallow LAVA tile (burns 4%/s): a tacky, hissing squelch, a spit of steam. Sounds like a mistake. |
| `step_rubble.m4a` … `step_rubble_4.m4a` | 0.25s | mono · one-shot | important | RUBBLE and collapsed floor: loose stones shifting, a heavier crunch, a rolling pebble tail. |
| `step_bone.m4a` … `step_bone_4.m4a` | 0.25s | mono · one-shot | important | Ossuary and bone gardens: brittle crack and rattle, small bones snapping underfoot. Never gentle. |
| `step_ash.m4a` … `step_ash_4.m4a` | 0.25s | mono · one-shot | important | Inferno ash wastes and cinder floors: a muffled dusty whump, no ring at all, a faint ember tick. |
| `step_metal.m4a` … `step_metal_4.m4a` | 0.25s | mono · one-shot | important | Forgeworks grating and iron floors: hollow clank with a dull ring. |
| `step_glass.m4a` … `step_glass_4.m4a` | 0.25s | mono · one-shot | polish | Abyss glasswork and shard floors: thin crystalline tick, a faint high ring that decays fast. |
| `step_snow.m4a` … `step_snow_4.m4a` | 0.25s | mono · one-shot | polish | Frost on town roofs-and-streets at warmth 0 and the Pale End: dry squeak and crunch. |
| `step_flesh.m4a` … `step_flesh_5.m4a` | 0.3s | mono · one-shot | important | Hellscape taint floor: a wet, giving slap, sinew stretching, a tiny sucking release. The player should feel the floor is alive. |
| `step_stairs.m4a` … `step_stairs_3.m4a` | 0.9s | mono · one-shot | core | Four quick steps up or down a stair run (used on stair travel; today the synth `stairs`). Stone, a little echo. |
| `gear_step_cloth.m4a` … `gear_step_cloth_3.m4a` | 0.3s | mono · one-shot | important | Robes: a swish of heavy cloth and the faint knock of a belt pouch. Almost silent. |
| `gear_step_light.m4a` … `gear_step_light_4.m4a` | 0.3s | mono · one-shot | important | Leather: creak of straps, a buckle chinks, soft cloth on hide. |
| `gear_step_heavy.m4a` … `gear_step_heavy_4.m4a` | 0.35s | mono · one-shot | important | Plate and mail: a loud metallic clank-and-rattle, plates sliding on plates. Should make a sneaky ranger sound different from a tank. |
| `gear_land_heavy.m4a`, `gear_land_heavy_2.m4a` | 0.5s | mono · one-shot | polish | A heavy-armoured landing after a leap or dash: a deeper clatter than a step. |
| `dash_charge.m4a` … `dash_charge_3.m4a` | 0.5s | mono · one-shot | core | Warrior Shoulder Charge: armoured grunt-less lunge, plate crash and a short gravel skid, rising shove whoosh. Heavy, physical, no magic. |
| `dash_charge_hit.m4a` … `dash_charge_hit_3.m4a` | 0.5s | mono · one-shot | important | Shoulder Charge connecting: a body-on-body thud with a bone crunch and a shield rattle. Plays once per foe struck. |
| `dash_roll.m4a` … `dash_roll_3.m4a` | 0.4s | mono · one-shot | core | Ranger Dash: a tumbling roll, cloth and leather, a gravel scuff, a clipped exhale. |
| `dash_gravestep.m4a` … `dash_gravestep_3.m4a` | 0.5s | mono · one-shot | core | Necromancer Grave Step: a papery whisper, cold draft, a faint bone clack as the body slips through the dark. |
| `blink_out.m4a` … `blink_out_3.m4a` | 0.4s | mono · one-shot | core | Sorcerer Blink, departure: a sharp inward suck of air and a glassy zip, the air folding shut. |
| `blink_in.m4a` … `blink_in_3.m4a` | 0.4s | mono · one-shot | core | Sorcerer Blink, arrival: the matching soft pop and a shimmer tail. Same family as `blink_out`, brighter. |
| `dash_pip.m4a`, `dash_pip_2.m4a` | 0.3s | mono · one-shot | important | A charge recovers: a small, satisfying mechanical tick with a warm ring (like a flint catching). Quiet enough to hear 20 times a floor. |
| `dash_denied.m4a` | 0.2s | mono · one-shot | important | No charge left: a dull thunk, not the full error buzz. |
| `dash_groundslam.m4a`, `dash_groundslam_2.m4a` | 0.9s | mono · one-shot | polish | Ground Slam augment: the dash ends in a stomp, a low boom with cracking stone. |
| `dash_rimestep.m4a`, `dash_rimestep_2.m4a` | 0.8s | mono · one-shot | polish | Rime Step augment: a frost ring blooms where the sorcerer stood: glassy crackle and cold air. |
| `dash_graveswap.m4a`, `dash_graveswap_2.m4a` | 0.8s | mono · one-shot | polish | Grave Swap augment: you and a minion trade places, a double whisper, two quick pops. |
| `dash_tumbleshot.m4a`, `dash_tumbleshot_2.m4a` | 0.4s | mono · one-shot | polish | Tumble Shot augment: a quick bow twang mid-roll, layered over the roll. |
| `dash_brawler.m4a`, `dash_brawler_2.m4a` | 0.5s | mono · one-shot | polish | Perk Brawler's Roll: a sweeping strike at the end of a dash, a snap whoosh with a metal tail. |
| `land_soft.m4a` … `land_soft_3.m4a` | 0.35s | mono · one-shot | important | Ending a short leap or the roll: a clean thump, a little dust. |
| `land_heavy.m4a` … `land_heavy_3.m4a` | 0.7s | mono · one-shot | important | Warrior Leap landing and the Ground Slam finale: a body-weight crunch and gravel spray. (The area impact itself is `skill_leap_land`.) |
| `leap_gap_cross.m4a`, `leap_gap_cross_2.m4a` | 0.8s | mono · one-shot | important | Crossing a 2-tile chasm gap with a dash (The Leap landmark): a whistle of wind from below, then a landing with an echo that falls away.… |
| `vo_warrior_hurt.m4a` … `vo_warrior_hurt_4.m4a` | 0.4s | mono · one-shot | core | Warrior takes a hit. Voice: deep, chesty, gritty; a man or woman who has taken a lot of punches already. Short, 0.25-0.4 s, no reverb. |
| `vo_warrior_hurt_big.m4a`, `vo_warrior_hurt_big_2.m4a` | 0.7s | mono · one-shot | important | Warrior takes a heavy hit (>8% life): a longer, rougher cry of pain, a gasp at the end. |
| `vo_warrior_die.m4a`, `vo_warrior_die_2.m4a` | 1.6s | mono · one-shot | core | Warrior dies: a final cry that cuts to a wet exhale and silence. Plays under the death stinger. Keep it sad, not heroic. |
| `vo_warrior_effort.m4a` … `vo_warrior_effort_5.m4a` | 0.3s | mono · one-shot | important | Warrior swing or cast effort grunt, a short exhale on the strike. Plays on every 2nd-3rd attack only so it does not nag. |
| `vo_warrior_dash.m4a`, `vo_warrior_dash_2.m4a` | 0.3s | mono · one-shot | important | Warrior dash effort: a clipped breath or one-syllable grunt. |
| `vo_warrior_revive.m4a` | 1.2s | mono · one-shot | important | Warrior coming back after death: a ragged first gasp for air, then slow breathing. |
| `vo_warrior_lowlife.m4a` | 2s | stereo · loop | polish | Warrior laboured breathing loop, played at the edge of the mix when below 25% life, with an irregular heartbeat under it. One loop, no… |
| `vo_ranger_hurt.m4a` … `vo_ranger_hurt_4.m4a` | 0.4s | mono · one-shot | core | Ranger takes a hit. Voice: lean, breathy, fast; short sharp intakes, never a roar. Short, 0.25-0.4 s, no reverb. |
| `vo_ranger_hurt_big.m4a`, `vo_ranger_hurt_big_2.m4a` | 0.7s | mono · one-shot | important | Ranger takes a heavy hit (>8% life): a longer, rougher cry of pain, a gasp at the end. |
| `vo_ranger_die.m4a`, `vo_ranger_die_2.m4a` | 1.6s | mono · one-shot | core | Ranger dies: a final cry that cuts to a wet exhale and silence. Plays under the death stinger. Keep it sad, not heroic. |
| `vo_ranger_effort.m4a` … `vo_ranger_effort_5.m4a` | 0.3s | mono · one-shot | important | Ranger swing or cast effort grunt, a short exhale on the strike. Plays on every 2nd-3rd attack only so it does not nag. |
| `vo_ranger_dash.m4a`, `vo_ranger_dash_2.m4a` | 0.3s | mono · one-shot | important | Ranger dash effort: a clipped breath or one-syllable grunt. |
| `vo_ranger_revive.m4a` | 1.2s | mono · one-shot | important | Ranger coming back after death: a ragged first gasp for air, then slow breathing. |
| `vo_ranger_lowlife.m4a` | 2s | stereo · loop | polish | Ranger laboured breathing loop, played at the edge of the mix when below 25% life, with an irregular heartbeat under it. One loop, no… |
| `vo_sorcerer_hurt.m4a` … `vo_sorcerer_hurt_4.m4a` | 0.4s | mono · one-shot | core | Sorcerer takes a hit. Voice: strained, dry, nervous; air through the teeth, a cracked cry. Short, 0.25-0.4 s, no reverb. |
| `vo_sorcerer_hurt_big.m4a`, `vo_sorcerer_hurt_big_2.m4a` | 0.7s | mono · one-shot | important | Sorcerer takes a heavy hit (>8% life): a longer, rougher cry of pain, a gasp at the end. |
| `vo_sorcerer_die.m4a`, `vo_sorcerer_die_2.m4a` | 1.6s | mono · one-shot | core | Sorcerer dies: a final cry that cuts to a wet exhale and silence. Plays under the death stinger. Keep it sad, not heroic. |
| `vo_sorcerer_effort.m4a` … `vo_sorcerer_effort_5.m4a` | 0.3s | mono · one-shot | important | Sorcerer swing or cast effort grunt, a short exhale on the strike. Plays on every 2nd-3rd attack only so it does not nag. |
| `vo_sorcerer_dash.m4a`, `vo_sorcerer_dash_2.m4a` | 0.3s | mono · one-shot | important | Sorcerer dash effort: a clipped breath or one-syllable grunt. |
| `vo_sorcerer_revive.m4a` | 1.2s | mono · one-shot | important | Sorcerer coming back after death: a ragged first gasp for air, then slow breathing. |
| `vo_sorcerer_lowlife.m4a` | 2s | stereo · loop | polish | Sorcerer laboured breathing loop, played at the edge of the mix when below 25% life, with an irregular heartbeat under it. One loop, no… |
| `vo_necromancer_hurt.m4a` … `vo_necromancer_hurt_4.m4a` | 0.4s | mono · one-shot | core | Necromancer takes a hit. Voice: low, rasping, almost a whisper; unbothered until it is not. Short, 0.25-0.4 s, no reverb. |
| `vo_necromancer_hurt_big.m4a`, `vo_necromancer_hurt_big_2.m4a` | 0.7s | mono · one-shot | important | Necromancer takes a heavy hit (>8% life): a longer, rougher cry of pain, a gasp at the end. |
| `vo_necromancer_die.m4a`, `vo_necromancer_die_2.m4a` | 1.6s | mono · one-shot | core | Necromancer dies: a final cry that cuts to a wet exhale and silence. Plays under the death stinger. Keep it sad, not heroic. |
| `vo_necromancer_effort.m4a` … `vo_necromancer_effort_5.m4a` | 0.3s | mono · one-shot | important | Necromancer swing or cast effort grunt, a short exhale on the strike. Plays on every 2nd-3rd attack only so it does not nag. |
| `vo_necromancer_dash.m4a`, `vo_necromancer_dash_2.m4a` | 0.3s | mono · one-shot | important | Necromancer dash effort: a clipped breath or one-syllable grunt. |
| `vo_necromancer_revive.m4a` | 1.2s | mono · one-shot | important | Necromancer coming back after death: a ragged first gasp for air, then slow breathing. |
| `vo_necromancer_lowlife.m4a` | 2s | stereo · loop | polish | Necromancer laboured breathing loop, played at the edge of the mix when below 25% life, with an irregular heartbeat under it. One loop, no… |
| `taken_melee.m4a` … `taken_melee_4.m4a` | 0.3s | mono · one-shot | core | A monster blow lands on the player: dull body thud with cloth/armour shuffle. Layered with the vocal. Not the monster's own sound. |
| `taken_projectile.m4a` … `taken_projectile_4.m4a` | 0.3s | mono · one-shot | core | An arrow, bolt or spit lands on the player: sharper, more of a thwack/zap than a thud. |
| `taken_magic.m4a` … `taken_magic_3.m4a` | 0.5s | mono · one-shot | important | A caster blast or fire/cold zone detonates on the player: a swelling whump with a tail that matches the element only slightly (the element… |
| `taken_armor.m4a` … `taken_armor_3.m4a` | 0.3s | mono · one-shot | important | A hit that armour mostly absorbs (damage < 2% life): a clean metallic glance, no vocal. |
| `block_shield.m4a` … `block_shield_3.m4a` | 0.4s | mono · one-shot | important | Block roll succeeds: wood and iron, a hard thump with a rattle. |
| `dodge_whoosh.m4a` … `dodge_whoosh_3.m4a` | 0.3s | mono · one-shot | important | Dodge roll succeeds: a hushed whoosh of air past the ear, a flicker of cloth. |
| `thorns_reflect.m4a` … `thorns_reflect_3.m4a` | 0.25s | mono · one-shot | polish | Thorns damage returned: a sharp wet prick, like a thorn driven into skin. |
| `lifesteal_pulse.m4a` … `lifesteal_pulse_3.m4a` | 0.3s | mono · one-shot | polish | Life steal heals: a warm, soft red swell, a swallowed gulp; quiet, many per minute. |
| `manasteal_pulse.m4a` … `manasteal_pulse_3.m4a` | 0.3s | mono · one-shot | polish | Mana steal: a cool blue chime swell. |
| `status_burn.m4a`, `status_burn_2.m4a` | 0.8s | mono · one-shot | important | Player ignites: a flame whump and an ongoing crackle tail. |
| `status_chill.m4a`, `status_chill_2.m4a` | 0.6s | mono · one-shot | important | Player chilled: a crisp frost crackle and a shiver of breath. |
| `status_freeze.m4a`, `status_freeze_2.m4a` | 0.7s | mono · one-shot | important | Player frozen solid: an ice-lock crack, the body seizing. |
| `status_freeze_off.m4a`, `status_freeze_off_2.m4a` | 0.6s | mono · one-shot | polish | Ice breaks off the player. |
| `status_shock.m4a`, `status_shock_2.m4a` | 0.5s | mono · one-shot | important | Player shocked: a nasty zap with a muscular twitch. |
| `status_poison.m4a`, `status_poison_2.m4a` | 0.7s | mono · one-shot | important | Poisoned: a wet hiss and a sick, bubbling gulp; quiet. Also a soft tick for every poison damage tick (reuse a short 0.15 s cut of it). |
| `status_bleed.m4a`, `status_bleed_2.m4a` | 0.5s | mono · one-shot | polish | Bleeding: a slow drip-and-ooze. |
| `status_stun.m4a`, `status_stun_2.m4a` | 0.8s | mono · one-shot | important | Player stunned: a bell-in-the-head ring, a low-pass dip that returns in 0.8 s (engine can duck the mix too). |
| `status_slow.m4a`, `status_slow_2.m4a` | 0.6s | mono · one-shot | polish | Player slowed: a dragging, sticky squelch of reality. |
| `status_bleach.m4a`, `status_bleach_2.m4a` | 1.2s | mono · one-shot | important | Pallid hit bleaches the player (no regen, half healing): a drained whine, colours going grey. |
| `status_rooted.m4a`, `status_rooted_2.m4a` | 0.6s | mono · one-shot | important | Root / lock (Foreclosure, Jailer): chains or roots grip: a tight clamp and creak. |
| `status_cleanse.m4a`, `status_cleanse_2.m4a` | 0.6s | mono · one-shot | polish | A status wears off (generic): a soft exhale of relief, a clean chime. |
| `potion.m4a` … `potion_3.m4a` | 0.6s | mono · one-shot | core · plays today | generic drink (health): cork pull, two gulps, a warm exhale. Currently synthesized. |
| `potion_mp.m4a` … `potion_mp_3.m4a` | 0.6s | mono · one-shot | core | Mana potion drink: cork pull, a crystalline fizz, a cool shiver. |
| `potion_empty.m4a`, `potion_empty_2.m4a` | 0.3s | mono · one-shot | important | Belt is empty or cooling down: an empty glass clink, not the full buzz. |
| `potion_ready.m4a` | 0.3s | mono · one-shot | polish | Potion cooldown finished: a tiny glass chime in the HUD. |
| `levelup.m4a`, `levelup_2.m4a` | 2.2s | mono · one-shot | core · plays today | level-up fanfare. Not a stinger: a short rising bell-and-brass flourish, something between a church bell and a smith's anvil, hopeful but… |
| `levelup_milestone.m4a` | 3s | stereo · one-shot | polish | Every 10th level: the same figure but fuller, with a low choir swell. |
| `xp_gain_big.m4a` | 0.8s | mono · one-shot | polish | An XP burst (Clear grade reward, quest reward): a quick climbing glissando. |
| `attr_spend.m4a` … `attr_spend_3.m4a` | 0.3s | mono · one-shot | important | Attribute point spent in the character panel: a firm stamped click with a small metal ring. |
| `death_fall.m4a`, `death_fall_2.m4a` | 1s | mono · one-shot | core | Body falls: armour clatter, the weight of a person hitting stone, a last scrape. Plays with `vo_<class>_die`. |
| `death_corpse_drop.m4a` | 1.2s | mono · one-shot | important | Bag spills on the corpse (the run starts): a rattle of items spilling, a coin scatter. |
| `corpse_reclaim.m4a` | 2s | mono · one-shot | core | Reclaim the corpse bag: bag cloth pulled up, a deep resonant chord as the Echo's grip lets go. A relief sound. |
| `corpse_near.m4a` | 3s | stereo · loop | polish | Faint pulse as you approach your own corpse: a single heartbeat-like thump and a rising whisper, very quiet. |
| `respawn.m4a` | 2s | mono · one-shot | important | Waking up in town after death: a gasp, a hearth crackle swell. |
| `revive_in_dungeon.m4a` | 1.5s | mono · one-shot | polish | If a revive effect triggers (Last Stand perk, Second Wind): a hard heartbeat and a wooden-beam crack. |
| `hurt.m4a` … `hurt_3.m4a` | 0.4s | mono · one-shot | core · plays today | generic player hurt grunt (fallback when a class has no `vo_<class>_hurt`). Today synthesized. |
| `die.m4a`, `die_2.m4a` | 1.5s | mono · one-shot | core · plays today | generic player death cry (fallback). Today synthesized. |
