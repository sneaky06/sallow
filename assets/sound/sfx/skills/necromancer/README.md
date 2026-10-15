# assets/sound/sfx/skills/necromancer/

25 entries · 55 files · core 6 / important 43 / polish 6.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/skills/necromancer/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `skill_raise_cast.m4a`, `skill_raise_cast_2.m4a` | 1s | mono · one-shot | core | Raise Skeleton: the ground splits, a rattle of bone as the dead assemble, cold green whisper. Max squad = ~4 pops spaced 0.1 s apart. |
| `skill_raise_spawn.m4a` … `skill_raise_spawn_4.m4a` | 0.6s | mono · one-shot | important | One skeleton warrior stands: bones clicking together and an eye-socket flare. |
| `skill_corpse_explosion_cast.m4a`, `skill_corpse_explosion_cast_2.m4a` | 0.5s | mono · one-shot | important | Corpse Explosion: a dark swelling gurgle, a heartbeat of bile. |
| `skill_corpse_explosion_hit.m4a` … `skill_corpse_explosion_hit_3.m4a` | 1s | mono · one-shot | core | A wet, fiery burst: bone and meat bursting with a blast of heat. Gross and satisfying. |
| `skill_skeletal_mage_cast.m4a`, `skill_skeletal_mage_cast_2.m4a` | 1s | mono · one-shot | important | Skeletal Mage: bones assemble with a cold, chiming overtone. |
| `skill_golem_cast.m4a`, `skill_golem_cast_2.m4a` | 1.8s | mono · one-shot | important | Bone Golem: a big pile of bones grinding, slowly pulling themselves into a giant; a long, creaking build with a final deep boom. |
| `skill_bone_spear_cast.m4a` … `skill_bone_spear_cast_3.m4a` | 0.5s | mono · one-shot | important | Bone Spear: a spear of bone shoots out with a splintering hiss. |
| `skill_bone_spear_hit.m4a` … `skill_bone_spear_hit_3.m4a` | 0.4s | mono · one-shot | important | A heavy pierce, a bone crack with meat. |
| `skill_bone_armor_on.m4a`, `skill_bone_armor_on_2.m4a` | 1s | mono · one-shot | important | Bone Armor: bones fly up and clatter into a shell around you; a hollow clatter. |
| `skill_bone_armor_hit.m4a` … `skill_bone_armor_hit_3.m4a` | 0.4s | mono · one-shot | important | Damage absorbed by the shell: a bone-on-bone clack. |
| `skill_bone_armor_break.m4a`, `skill_bone_armor_break_2.m4a` | 0.8s | mono · one-shot | important | The shell breaks: a cascade of bones falling. |
| `skill_bone_nova_cast.m4a` … `skill_bone_nova_cast_3.m4a` | 0.7s | mono · one-shot | important | Bone Nova: an outward burst of N shards: a rattling blast with whistling shrapnel. |
| `skill_life_drain_start.m4a`, `skill_life_drain_start_2.m4a` | 0.6s | mono · one-shot | important | Life Drain: a wet, leech-like hook; a thin sucking tone begins. |
| `skill_life_drain_loop.m4a` | 0.9s | mono · loop | important | The siphon: a rhythmic wet pull, with a warm heal pulse on each of the 4 ticks. |
| `skill_bone_spirit_cast.m4a`, `skill_bone_spirit_cast_2.m4a` | 0.8s | mono · one-shot | important | Bone Spirit: a high wail that rushes out of the staff, ghostly and angry. |
| `skill_bone_spirit_travel.m4a` | 0.8s | mono · loop | polish | A wailing, screeching tail that homes onto a foe. |
| `skill_bone_spirit_hit.m4a` … `skill_bone_spirit_hit_3.m4a` | 0.7s | mono · one-shot | important | The spirit slams into the foe with a scream and cuts off. |
| `skill_amplify_cast.m4a`, `skill_amplify_cast_2.m4a` | 1s | mono · one-shot | important | Amplify Damage: a red curse glyph blooms under the foes, a growling whisper; the foes' voices go sharp. |
| `skill_decrepify_cast.m4a`, `skill_decrepify_cast_2.m4a` | 1s | mono · one-shot | important | Decrepify: a heavy, draining curse, a groaning decay: foes feel slow. |
| `skill_poison_nova_cast.m4a`, `skill_poison_nova_cast_2.m4a` | 1s | mono · one-shot | important | Poison Nova: a hiss ring of venom spreading, then bubbling. |
| `skill_lich_start.m4a` | 2.5s | stereo · one-shot | core | Lich Form: the transformation. Bones crack, a hard cold exhale, a bass note drops in: you are death for 15+ s. |
| `skill_lich_loop.m4a` | 3s | stereo · loop | polish | While lich: a low, icy hum under everything, a faint breath of cold. |
| `skill_lich_end.m4a` | 1s | mono · one-shot | polish | Lich ends: the cold leaves with a long sigh. |
| `minion_summon_pop.m4a` … `minion_summon_pop_3.m4a` | 0.4s | mono · one-shot | important | A summoned minion appears (Grave Swap, Army of Flow, Bone Arrows perks): a short bone-and-whisper pop. |
| `minion_golem_stomp.m4a` … `minion_golem_stomp_3.m4a` | 0.8s | mono · one-shot | polish | Your Bone Golem's footstep: a big bone-and-gravel thud. |
