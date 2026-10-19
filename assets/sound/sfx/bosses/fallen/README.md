# assets/sound/sfx/bosses/fallen/

40 entries · 95 files · core 14 / important 79 / polish 2.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `fallen_banner.m4a` | 3s | stereo · one-shot | core | A Fallen first spotted (violet banner): a cold, human, wrong sound: a choir of one voice and a rusted bell, the sound of someone who used… |
| `fallen_die.m4a` | 3.5s | stereo · one-shot | core | A Fallen dies: their burden finally set down: a long exhale, a bell, a small warm note. |
| `fallen_relic.m4a` | 3s | stereo · one-shot | core | The relic is granted: a bell-and-ring metal chime, a warm coal glow; unique per Fallen would be nice but one general sound is enough. |
| `fallen_hob_snuff.m4a` … `fallen_hob_snuff_3.m4a` | 0.7s | mono · one-shot | important | Hob Garrow (d3): a brazier snuffed, a damp hiss and a gasp of dark. |
| `fallen_hob_relight.m4a` … `fallen_hob_relight_3.m4a` | 0.6s | mono · one-shot | important | He relights a brazier: a match strike, a fire catching. |
| `fallen_hob_hook.m4a` … `fallen_hob_hook_3.m4a` | 0.9s | mono · one-shot | important | The lamp-hook sweep (1.2 s glow): a long glowing arc, an iron hook whoosh with a lantern chink. |
| `fallen_hob_blind.m4a`, `fallen_hob_blind_2.m4a` | 0.9s | mono · one-shot | important | When all braziers are out he charges blind: a stampede in the dark. |
| `fallen_sefa_glide.m4a`, `fallen_sefa_glide_2.m4a` | 2s | mono · loop | important | Sefa Lind (d6): a creaking rope gliding between anchors: a squeak of hemp and wind. |
| `fallen_sefa_cut.m4a` … `fallen_sefa_cut_3.m4a` | 0.7s | mono · one-shot | core | You cut an anchor: a snapping rope, a crash as she drops, a stun. |
| `fallen_sefa_volley.m4a` … `fallen_sefa_volley_3.m4a` | 0.8s | mono · one-shot | important | Fan volley of arrows: a bowstring flurry. |
| `fallen_sefa_snare.m4a` … `fallen_sefa_snare_3.m4a` | 0.6s | mono · one-shot | important | Knotted snare triggers: a rope tightening, a root-like grip. |
| `fallen_brannoc_block.m4a` … `fallen_brannoc_block_3.m4a` | 0.5s | mono · one-shot | important | Brannoc (d9): your hit is blocked at the front: a hard shield impact (shield fused to his arm). |
| `fallen_brannoc_charge.m4a` … `fallen_brannoc_charge_3.m4a` | 0.9s | mono · one-shot | important | Knockback charge: heavy running armour and a crash. |
| `fallen_brannoc_spikes.m4a`, `fallen_brannoc_spikes_2.m4a` | 0.9s | mono · one-shot | important | The spike ring (below 50%): iron spikes erupting in a ring, a grinding rattle. |
| `fallen_odile_circle.m4a` … `fallen_odile_circle_3.m4a` | 0.9s | mono · one-shot | important | Odile Marr (d13): salt circles appear: grains and crystalline whispers. If you stand still: you crystallise: a stony freeze. |
| `fallen_odile_crystallise.m4a`, `fallen_odile_crystallise_2.m4a` | 0.8s | mono · one-shot | important | You stand still in the circle: your joints crystallise and lock. |
| `fallen_odile_brine.m4a` … `fallen_odile_brine_3.m4a` | 1s | mono · one-shot | important | Brine wave pushes you away: a rolling surf. |
| `fallen_odile_face.m4a` | 1.8s | mono · one-shot | important | Her true face (every 15 s, 3 s, +100% damage taken): a thin, cracking mask and a high, pained note. |
| `fallen_wren_vanish.m4a`, `fallen_wren_vanish_2.m4a` | 0.8s | mono · one-shot | important | Wren Halloway (d16): she vanishes (3 s): a soft paper tear and a small clicking, like a pencil counting. |
| `fallen_wren_glint.m4a` … `fallen_wren_glint_3.m4a` | 0.8s | mono · one-shot | important | Arrows glint from the dark: a visual flash with a thin metallic ping; the ping comes 0.4 s before the arrow so players can react. |
| `fallen_wren_count.m4a`, `fallen_wren_count_2.m4a` | 1.5s | mono · loop | polish | She stops to count: bone beads clicking in a rhythm that repeats; quiet. |
| `fallen_ashby_toll.m4a` … `fallen_ashby_toll_3.m4a` | 2.5s | mono · one-shot | core | Brother Ashby (d19): the toll of a great bell: a massive, ringing hit with a long hum; stuns in 3.5 tiles. Tolls get faster as he weakens… |
| `fallen_ashby_toll_short.m4a` … `fallen_ashby_toll_short_3.m4a` | 1.2s | mono · one-shot | important | The short toll (when tolls < 4 s apart). |
| `fallen_ashby_ghost.m4a` … `fallen_ashby_ghost_3.m4a` | 1s | mono · one-shot | important | Ghosts rise: three pale wails drifting to him. |
| `fallen_ashby_heal.m4a`, `fallen_ashby_heal_2.m4a` | 0.8s | mono · one-shot | important | A ghost reaches him: he heals 6%: a gulp and a bell tone. |
| `fallen_corwin_knock.m4a` … `fallen_corwin_knock_3.m4a` | 0.7s | mono · one-shot | core | Corwin Dask (d21): his hit knocks your gold loose: a coin purse rip and a scatter across the floor. |
| `fallen_corwin_collect.m4a` … `fallen_corwin_collect_3.m4a` | 0.6s | mono · one-shot | important | He collects loose gold (+3% heal): a hungry coin-scoop. |
| `fallen_corwin_coins.m4a` … `fallen_corwin_coins_3.m4a` | 0.8s | mono · one-shot | important | Coin barrage lines: a rain of coins whistling. |
| `fallen_corwin_foreclosure.m4a`, `fallen_corwin_foreclosure_2.m4a` | 1.3s | mono · one-shot | important | Foreclosure: a locking stamp, a heavy ledger slam and a chain-lock; the zone stays hostile 10 s. |
| `fallen_varr_nova.m4a` … `fallen_varr_nova_3.m4a` | 1s | mono · one-shot | important | Magister Varr (d24): a growing nova, a glass bottle humming, a rising hot hiss. |
| `fallen_varr_bottle.m4a` … `fallen_varr_bottle_3.m4a` | 0.8s | mono · one-shot | important | Late-bursting bottles: a cork pop, glass shatter and a boom. |
| `fallen_varr_burn.m4a`, `fallen_varr_burn_2.m4a` | 0.8s | mono · one-shot | important | She burns herself: a pained inhale and flames licking at her robes. |
| `fallen_crane_shovel.m4a` … `fallen_crane_shovel_3.m4a` | 0.7s | mono · one-shot | important | Old Tobiah Crane (d28): a slow shovel line, a long metal scrape and a dirt toss. |
| `fallen_crane_raise.m4a` … `fallen_crane_raise_3.m4a` | 1s | mono · one-shot | important | He raises the corpses you left: clods of earth falling off the dead. |
| `fallen_crane_piled.m4a`, `fallen_crane_piled_2.m4a` | 1s | mono · one-shot | important | Piled Dead shield him (<30%): a heap of bodies, a rustle and thud, shield up. |
| `fallen_ivo_thorn.m4a` … `fallen_ivo_thorn_3.m4a` | 0.9s | mono · one-shot | important | Ivo Marrow (d35-36): thorn walls grow in lanes: a creaking hedge and thorn rattle, 10 s. |
| `fallen_ivo_retreat.m4a`, `fallen_ivo_retreat_2.m4a` | 0.9s | mono · one-shot | important | He retreats through the roots: rustling wood. |
| `fallen_ivo_refusal.m4a` | 6s | stereo · one-shot | core | Refusal (every 15 s, 5 s): he kneels and holds still: a hush and one clear tone, tender, held for 5 s. If you hit him: the tone shatters… |
| `fallen_ivo_enrage.m4a` | 2.5s | mono · one-shot | core | You struck him: the held tone breaks into a roar. A betrayal sound. |
| `fallen_ivo_spared.m4a` | 2.5s | mono · one-shot | important | You waited: the tone resolves, a quiet acceptance; he fights on cleanly. |
