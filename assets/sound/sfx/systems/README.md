# assets/sound/sfx/systems/

92 entries · 146 files · core 55 / important 73 / polish 18.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/systems/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `close_call.m4a` … `close_call_3.m4a` | 0.9s | mono · one-shot | core | CLOSE CALL: standing in a telegraph and slipping out as it lands: a bright, razor-quick whoosh with a time-slowing "thud-ping"; a hit of… |
| `close_call_stack.m4a` … `close_call_stack_3.m4a` | 0.5s | mono · one-shot | important | A Close Call stack added, 1-3 (pitch rising): a rising ping over the whoosh. |
| `flow_chain_two.m4a`, `flow_chain_two_2.m4a` | 0.7s | mono · one-shot | core | Flow chain of 2 within 8 s: a rising tone, with more lift each step; pre-trigger. |
| `flow_chain_three.m4a`, `flow_chain_three_2.m4a` | 1.2s | mono · one-shot | core | Flow chain 3 TRIGGERS slow-motion (timeScale 0.35 for 0.45 s game time = ~1.3 s real): a massive time-warp whoosh: low-pass sweep down, a… |
| `flow_chain_four.m4a`, `flow_chain_four_2.m4a` | 1.2s | mono · one-shot | important | Chain 4: the same plus a sparkling refill of dash charges (a bright chime). |
| `flow_chain_five.m4a`, `flow_chain_five_2.m4a` | 1.5s | mono · one-shot | core | Chain 5+: the same plus cooldown refill (a rapid-fire ticking and a big sub-bass bloom). The best skill reward sound in the game, not a nag. |
| `flow_slow_loop.m4a` | 1.5s | mono · loop | important | While time is slowed: a thick low drone, a dilated heartbeat; the engine low-passes the sfx bus briefly. |
| `flow_end.m4a`, `flow_end_2.m4a` | 0.8s | mono · one-shot | important | Time snaps back: a snap, a high whoosh, a recovering tinnitus ring. |
| `flow_crit_ready.m4a` | 0.5s | mono · one-shot | important | `flow_crit` effect is ready (next hit guaranteed crit): a bright charged shimmer; the crit hit itself then uses `crit_big`. |
| `ember_spawn.m4a` … `ember_spawn_3.m4a` | 0.3s | mono · one-shot | important | An ember drops from a kill (35% chance): a tiny flicker pop with a soft glow. |
| `heat_gain.m4a` … `heat_gain_4.m4a` | 0.4s | mono · one-shot | core | You sweep an ember: a warm ignition tick; pitch rises for each stack 1-10 (use 3 cuts: low/mid/high, the engine picks by stack count). |
| `heat_loss.m4a`, `heat_loss_2.m4a` | 0.5s | mono · one-shot | polish | Heat drops by 1 (6 s without a pickup): a soft fire-cooling hiss. |
| `heat_knock.m4a`, `heat_knock_2.m4a` | 0.8s | mono · one-shot | important | A big hit knocks out half your Heat: an ember-scattering crash. |
| `heat_max.m4a` | 2s | mono · one-shot | important | Heat 10 reached: a rush of flames, a roar of warmth; a Mark feat can come from holding this for 20 s. |
| `heat_loop.m4a` | 3s | stereo · loop | polish | At Heat 6+: a quiet warm crackle at the edge of the mix (positional to you), amplitude by stack. |
| `perk_buy.m4a` … `perk_buy_3.m4a` | 0.8s | mono · one-shot | core | A perk bought with a point: a pen stamping a ledger, a chord settles in. |
| `perk_keystone.m4a`, `perk_keystone_2.m4a` | 2s | mono · one-shot | core | Keystone (tier 5, cost 3): a heavy stone seal with a drawn-out bell, a long reverberating chord; this is a rule-changing decision. |
| `perk_mark_earned.m4a`, `perk_mark_earned_2.m4a` | 2.5s | mono · one-shot | core | A Mark feat earned (S-grades, Flow ×5, Heat 10 hold...): a bright, ceremonial chime and a flame glinting; worth showing off. |
| `perk_mark_spent.m4a`, `perk_mark_spent_2.m4a` | 1.2s | mono · one-shot | important | A Mark spent on a perk: the mark burns into the tree. |
| `perk_wager_open.m4a`, `perk_wager_open_2.m4a` | 2.5s | mono · one-shot | core | The Wager: a candle lit; your life as the stake: a tense, quiet flame, a heartbeat, a coin flipped in a dark room. The HUD shows a candle. |
| `perk_wager_won.m4a` | 3s | stereo · one-shot | core | Reach town alive: the candle burns strongly; the perk is yours permanently: a warm bell, chimes and the heartbeat resolves. |
| `perk_wager_lost.m4a` | 3s | stereo · one-shot | core | You die with the wager open: the candle gutters and goes out: a hollow whoosh and a lone cold note. |
| `perk_respec.m4a`, `perk_respec_2.m4a` | 1.5s | mono · one-shot | important | Respec the perk tree: pages unstitched and burned. |
| `perk_locked.m4a` | 0.3s | mono · one-shot | important | Tapping a locked perk: a soft thud. |
| `classgoal_done.m4a`, `classgoal_done_2.m4a` | 2.5s | mono · one-shot | important | A class goal completed (reward Mark/title): a drawn bell and a weighty chime: a stamp. |
| `title_earned.m4a` | 3s | mono · one-shot | important | A title earned (Bearer of the Ember, Heir of the Fallen, class goal titles): a ceremonial brass-and-bell note. |
| `milestone_tier_one.m4a` | 1s | mono · one-shot | important | Lifetime milestone tier 1 (of 5): a small, honest chime. Milestones: Butcher's Tally, Returned, Hair's Breadth... |
| `milestone_tier_two.m4a` | 1.2s | mono · one-shot | important | Tier 2. |
| `milestone_tier_three.m4a` | 1.5s | mono · one-shot | important | Tier 3. |
| `milestone_tier_four.m4a` | 1.8s | mono · one-shot | important | Tier 4. |
| `milestone_tier_five.m4a` | 3s | stereo · one-shot | important | Tier 5: the full version: a tall bell with a brass swell. |
| `event_start.m4a`, `event_start_2.m4a` | 1.5s | mono · one-shot | core | A timed event begins (toast): a war-horn-like single note and a clock tick under it: urgency. Each event has its own pitch variant below. |
| `event_gauntlet_beacon.m4a` | 2s | mono · loop | important | The gauntlet beacon (16-26 tiles away, pulsing ring): a pulsing mint tone, positional so you hear which direction it is. Gets faster as… |
| `event_gauntlet_spawn.m4a` … `event_gauntlet_spawn_3.m4a` | 0.6s | mono · one-shot | important | A wave of monsters spawn near you every 3.5 s: smoke puffs and growls. |
| `event_keyhunt_start.m4a` | 1.2s | mono · one-shot | important | Key Hunt: a clanking lock; the five crates are marked. |
| `event_key_found.m4a` | 1.5s | mono · one-shot | core | You find the key: a heavy iron key chime, a lock mechanism turning; "the vault opens". |
| `event_collapse_start.m4a` | 2s | mono · one-shot | important | The roof starts to come down: a rumble swelling, dust trickle. |
| `event_thief_start.m4a` | 1.2s | mono · one-shot | important | The Magpie appears: a squeak, flapping wings, a coin spill. |
| `event_win.m4a` | 2s | mono · one-shot | core | Event success: a bright triumphant sting (a few notes); reward chest sparkle follows. |
| `event_fail.m4a` | 1.5s | mono · one-shot | important | Event failure: a droning descending tone, a coin purse stolen sound. |
| `timer_tick.m4a`, `timer_tick_2.m4a` | 0.3s | mono · one-shot | important | The last 10 s of any event timer: a ticking clock, one per second, with the last 3 louder. |
| `timer_expire.m4a` | 1s | mono · one-shot | important | The timer expires: a dull gong. |
| `lockdown_wave.m4a` … `lockdown_wave_3.m4a` | 1.5s | mono · one-shot | core | A lockdown wave spawns: a horn and a stir of voices; each wave heavier; the last (legendary wave) adds a rumble. |
| `lockdown_clear.m4a` | 3s | stereo · one-shot | core | The room is cleared: a relieved resolution of the battle, a chord, a lock tumbling; the chests unlock. |
| `lockdown_failsafe.m4a` | 1.5s | mono · one-shot | polish | Failsafe lifts the lockdown unrewarded: a quiet gate chain. |
| `grade_s.m4a` | 2.5s | mono · one-shot | core | Clear grade S: a victorious, golden bell and a rising flourish; the fastest and cleanest floors are rewarded. |
| `grade_a.m4a` | 2s | mono · one-shot | important | Grade A: a golden chime and a short flourish. |
| `grade_b.m4a` | 1.5s | mono · one-shot | important | Grade B: a pleasant chime. |
| `grade_c.m4a` | 1s | mono · one-shot | polish | Grade C: a dull ding. |
| `grade_d.m4a` | 0.8s | mono · one-shot | polish | Grade D: a flat, unimpressed tap. |
| `grade_chest.m4a` | 1s | mono · one-shot | important | The grade chest appears beside you on arrival: a glint and a drop. |
| `floor_enter.m4a` … `floor_enter_3.m4a` | 2.5s | mono · one-shot | core | Arriving on a new floor: a heavy moment: the dungeon takes your measure; a long breath out as the stairs recede. One per theme feels… |
| `floor_banner.m4a`, `floor_banner_2.m4a` | 2s | mono · one-shot | important | The floor-name banner slides in ("Act . depth . floor name"): a soft stone-scrape and a held note. |
| `floor_mod_toast.m4a` … `floor_mod_toast_3.m4a` | 1.5s | mono · one-shot | important | A floor modifier toast (Blood Moon, Restless Dead, Warded, Thin Veil...): an ominous knock and a low whisper. |
| `floor_mod_reward.m4a`, `floor_mod_reward_2.m4a` | 1s | mono · one-shot | polish | A floor mod with MF/gold reward: a purse clink beneath the ominous knock. |
| `explored_full.m4a` | 1s | mono · one-shot | polish | Floor 100% explored (depths 1-3): a soft tick. |
| `depth_record.m4a` | 2s | mono · one-shot | polish | A new maxDepth is reached: a lone horn. |
| `deeper_prompt.m4a` | 2s | mono · one-shot | core | The "Go deeper?" prompt appears: a held cold breath, a faint pale hum; Pallor eats the colour of the sound. Do not make it a button click. |
| `deeper_confirm.m4a`, `deeper_confirm_2.m4a` | 2.5s | mono · one-shot | core | You choose to go deeper with Pallor rising: a stair-step descent with a pale whisper laid over it, an inhaled chord. |
| `deeper_cancel.m4a` | 0.5s | mono · one-shot | polish | You step back: a softer scuff. |
| `pallor_tier_i.m4a` | 2.5s | mono · one-shot | core | Pallor tier I (10): a single faint high whine appears at the edge of hearing. |
| `pallor_tier_ii.m4a` | 2.5s | mono · one-shot | core | Pallor tier II (30): the whine beats with a second one; hairs rise. |
| `pallor_tier_iii.m4a` | 3s | stereo · one-shot | core | Pallor tier III (60): pallid things stir: a low, distant chord forms. |
| `pallor_tier_iv.m4a` | 3.5s | stereo · one-shot | core | Pallor tier IV (90): the world is almost grey: a hard silence cut into by a single high note. |
| `pallor_reset.m4a` | 2s | mono · one-shot | important | Pallor resets in town: warmth floods in; a warm exhale and a hearth crackle. |
| `pallor_unlock.m4a` | 4s | stereo · one-shot | core | After the finale, Pallor is on: the sound of the Ember settling and starting to hunger. |
| `tip_card.m4a`, `tip_card_2.m4a` | 0.5s | mono · one-shot | important | A first-time tip card pops: a soft, friendly page flip (not alarming). |
| `tip_dismiss.m4a` | 0.3s | mono · one-shot | polish | Card fades: a small card tuck. |
| `bargain_active_loop.m4a` | 3s | mono · loop | polish | While a bargain is active: a low, unresolved drone under the ambience, per bargain pitch. |
| `hunt_pale_alert.m4a` | 2.5s | mono · one-shot | important | The Hunt: the pale hunter appears: a far-off horn and a bright hateful whisper. |
| `town_warmed_one.m4a` | 4s | stereo · one-shot | core | Warmth 1 (after Act I): a chimney catches: a whoosh of draft, a crackle, a faint sung note from somewhere in town (the story says "someone… |
| `town_warmed_two.m4a` | 4s | stereo · one-shot | core | Warmth 2 (after Act II): the market opens: a bell, the sound of three stalls waking. |
| `town_warmed_three.m4a` | 5s | stereo · one-shot | core | Warmth 3 (the finale): the town is warm: a long, full bell, a crowd's soft cheer (non-verbal), the hearth roaring. |
| `town_arrive.m4a`, `town_arrive_2.m4a` | 3s | mono · one-shot | important | Arriving in Emberdeep by stairs: a slow exhale and the thump of the cold. |
| `opening_ash.m4a` | 10s | stereo · one-shot | core | The opening (first arrival, `storySeen premise`): a burned village in ashes: a wind through cinders, a lone cough, the weight of a… |
| `finale_ember.m4a` | 10s | stereo · one-shot | core | The finale text sequence (rift_core_touch follows): a sweeping, soft, strained sound of an enormous heart settling into your chest; the… |
| `npc_greet_merchant.m4a`, `npc_greet_merchant_2.m4a` | 0.8s | mono · one-shot | important | Open Orlen's shop (merchant): a bell on a door and coin pouches shaken. |
| `npc_greet_blacksmith.m4a`, `npc_greet_blacksmith_2.m4a` | 0.8s | mono · one-shot | important | Brakka's forge: a short hammer-ring and a bellows breath. |
| `npc_greet_mystic.m4a`, `npc_greet_mystic_2.m4a` | 0.9s | mono · one-shot | important | Seer Ysolde: cards shuffling and a faint chime. |
| `npc_greet_healer.m4a`, `npc_greet_healer_2.m4a` | 0.8s | mono · one-shot | important | Sister Maren: a glass bottle and bandage cloth, a quiet hymn note. |
| `npc_greet_elder.m4a`, `npc_greet_elder_2.m4a` | 0.9s | mono · one-shot | important | The Elder at the hearth: a log settling and an old chair creak. |
| `npc_greet_stashkeeper.m4a`, `npc_greet_stashkeeper_2.m4a` | 0.8s | mono · one-shot | important | Old Wick (stash): heavy keys on a ring. |
| `npc_greet_curator.m4a`, `npc_greet_curator_2.m4a` | 1s | mono · one-shot | important | Isra Vell: a page turn and thread pulled taut. |
| `npc_greet_refugee.m4a`, `npc_greet_refugee_2.m4a` | 0.8s | mono · one-shot | polish | A camp refugee: a muffled cough and blanket rustle. |
| `npc_greet_camp_merchant.m4a`, `npc_greet_camp_merchant_2.m4a` | 0.8s | mono · one-shot | polish | Camp merchant: a cloth pack unfolded, clinking goods. |
| `npc_heal.m4a`, `npc_heal_2.m4a` | 1.5s | mono · one-shot | important | Healer restores you: a warm glow, a bandage wrap and a cleansing chime. |
| `quest_accept.m4a`, `quest_accept_2.m4a` | 1s | mono · one-shot | core | A quest accepted: a pen scratch and a wax seal. |
| `quest_progress.m4a` … `quest_progress_3.m4a` | 0.6s | mono · one-shot | important | Quest progress step (e.g. 3/10 kills): a soft, brief tick on the tracker. |
| `quest.m4a`, `quest_2.m4a` | 1.2s | mono · one-shot | core · plays today | quest completion / update: three rising notes with a ringing sparkle. Today synthesized. |
| `quest_turnin.m4a`, `quest_turnin_2.m4a` | 1.5s | mono · one-shot | core | Turn in and receive the reward: a coin pouch, a stamp and a short fanfare. |
| `quest_main_step.m4a` | 3s | stereo · one-shot | important | A main chain step is done (boss steps and depth): a deeper, more important fanfare. |
| `quest_loyalty.m4a` | 2s | mono · one-shot | polish | A loyalty reward raises the surface crate rate / size: a latch and a heavier crate thunk. |
