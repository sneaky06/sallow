# assets/sound/ui/

73 entries · 141 files · core 32 / important 73 / polish 36.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/ui/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `click.m4a` … `click_5.m4a` | 0.1s | mono · one-shot | core · plays today | generic button tap: a short, dry stamped click, as if pressing a worn bone button. Must be so unobtrusive it can be pressed 40 times a… |
| `ui_tap_big.m4a` … `ui_tap_big_3.m4a` | 0.25s | mono · one-shot | important | Big, primary gold buttons ("Go", "Accept"): a firmer, deeper stamp with a tiny metallic ring. |
| `ui_confirm.m4a` … `ui_confirm_3.m4a` | 0.4s | mono · one-shot | core | A confirmation dialog accepted: a firm, two-note "thunk-ring". |
| `ui_confirm_permanent.m4a`, `ui_confirm_permanent_2.m4a` | 1.2s | mono · one-shot | core | The permanent-action confirm (bloodstone, relic combining, respec): heavier, a final, solemn weight. |
| `ui_cancel.m4a` … `ui_cancel_3.m4a` | 0.2s | mono · one-shot | important | Cancel / back: a soft, lower, cloth-dry tap. |
| `ui_toggle_on.m4a`, `ui_toggle_on_2.m4a` | 0.2s | mono · one-shot | important | A settings toggle on: a click with an upward tick. |
| `ui_toggle_off.m4a`, `ui_toggle_off_2.m4a` | 0.2s | mono · one-shot | important | Toggle off: a click with a downward tick. |
| `ui_tab.m4a` … `ui_tab_4.m4a` | 0.15s | mono · one-shot | core | Tab switching (inventory tabs, vendor tabs): a papery slide and tick. |
| `ui_slider_tick.m4a`, `ui_slider_tick_2.m4a` | 0.1s | mono · one-shot | polish | Slider steps (volume, HUD size): a small notch tick. The volume sliders sample a sound at the new level (`menus.js` line 121). |
| `ui_select.m4a` … `ui_select_3.m4a` | 0.15s | mono · one-shot | important | Select an item/skill row: a subtle wooden tap. |
| `error.m4a` … `error_3.m4a` | 0.3s | mono · one-shot | core · plays today | error: a dull, flat double knock, never a loud buzz. Used in 34 places today. Plays for not enough gold, bag full, refused actions,… |
| `error_gold.m4a`, `error_gold_2.m4a` | 0.4s | mono · one-shot | important | Not enough gold: a dull coin-purse tap. |
| `error_full.m4a`, `error_full_2.m4a` | 0.4s | mono · one-shot | important | Bag/stash/crate full: a stuffed, thumping refusal. |
| `error_locked.m4a`, `error_locked_2.m4a` | 0.3s | mono · one-shot | important | Locked/disabled item: a padlock rattle. |
| `error_townonly.m4a`, `error_townonly_2.m4a` | 0.4s | mono · one-shot | important | "Sell works only in town" red toast: a hollow thump and a faint echo. |
| `toast_info.m4a`, `toast_info_2.m4a` | 0.4s | mono · one-shot | important | A neutral toast: a small paper-slide chime. (Toasts are the main feedback; keep very quiet.) |
| `toast_good.m4a`, `toast_good_2.m4a` | 0.5s | mono · one-shot | important | A positive toast (green/gold): a warm chime. |
| `toast_bad.m4a`, `toast_bad_2.m4a` | 0.5s | mono · one-shot | important | A negative toast (red): a low knock. |
| `toast_legendary.m4a`, `toast_legendary_2.m4a` | 1.5s | mono · one-shot | core | The legendary monster announce toast (orange): a deep ominous bell. Today `shrine`. |
| `pickup_feed_tap.m4a` | 0.2s | mono · one-shot | polish | Tap the ▲ verdict line in the pickup feed. |
| `ui_open_inventory.m4a` … `ui_open_inventory_3.m4a` | 0.5s | mono · one-shot | core | Inventory and paper-doll panel opens: a leather bag unlatched, buckles, a rattle of loose kit. The most-opened panel: 3 variations, short. |
| `ui_close_inventory.m4a`, `ui_close_inventory_2.m4a` | 0.4s | mono · one-shot | core | Inventory closes: a bag shut with a flap and buckle. |
| `ui_open_character.m4a`, `ui_open_character_2.m4a` | 0.5s | mono · one-shot | important | Character/stats panel: a ledger opened and a metal tick. |
| `ui_open_skills.m4a`, `ui_open_skills_2.m4a` | 0.6s | mono · one-shot | important | Skill panel: a heavy spell book cover and a faint arcane whisper. |
| `ui_open_perks.m4a`, `ui_open_perks_2.m4a` | 0.8s | mono · one-shot | important | Perk panel: a candle flame and a cracking of stone; the tree appears. |
| `ui_open_map.m4a`, `ui_open_map_2.m4a` | 0.5s | mono · one-shot | important | Map panel: a map unrolled, parchment crackle. |
| `ui_open_journal.m4a`, `ui_open_journal_2.m4a` | 0.6s | mono · one-shot | important | Journal/lore: pages riffled, a quill set down. |
| `ui_open_quests.m4a`, `ui_open_quests_2.m4a` | 0.5s | mono · one-shot | important | Quest log: a notice board and a pinned paper. |
| `ui_open_menu.m4a`, `ui_open_menu_2.m4a` | 0.5s | mono · one-shot | important | Pause menu: a stone door half-closed; the game's volume ducks 50%. |
| `ui_close_menu.m4a`, `ui_close_menu_2.m4a` | 0.4s | mono · one-shot | important | Resume: a short release. |
| `ui_open_settings.m4a` | 0.4s | mono · one-shot | polish | Settings: a mechanical clasp. |
| `ui_open_depth.m4a`, `ui_open_depth_2.m4a` | 0.8s | mono · one-shot | important | Depth picker (waypoint list): a deep stone resonance. |
| `ui_open_shop.m4a` … `ui_open_shop_3.m4a` | 0.6s | mono · one-shot | core | Vendor panel (Buy/Sell tabs): a shop bell and a counter thump; per-role variants are in `npc_greet_*`. |
| `ui_open_stash.m4a`, `ui_open_stash_2.m4a` | 0.6s | mono · one-shot | important | Stash panel: a heavy chest. |
| `ui_open_chute.m4a`, `ui_open_chute_2.m4a` | 0.6s | mono · one-shot | important | Chute panel: a hatch and a long metal tube sound. |
| `ui_open_surface.m4a`, `ui_open_surface_2.m4a` | 0.6s | mono · one-shot | important | Surface crate panel (town): a crate lid. |
| `ui_open_collection.m4a`, `ui_open_collection_2.m4a` | 0.8s | mono · one-shot | important | Curator book: the heavy cover of a ledger, a thread. |
| `ui_open_relics.m4a` | 0.8s | mono · one-shot | polish | Relics panel. |
| `ui_open_milestones.m4a` | 0.6s | mono · one-shot | polish | Milestones / stats book: a quill scratch. |
| `ui_open_classgoals.m4a` | 0.6s | mono · one-shot | polish | Class goals: a ledger tick. |
| `ui_open_death.m4a` | 3s | mono · one-shot | core | The death screen: the sound drains to a deep low-pass hum; a single heartbeat and a stone lid; this is the moment after you die. Keep… |
| `ui_open_finale.m4a` | 2s | mono · one-shot | polish | The finale panel. |
| `ui_open_tips.m4a` | 0.4s | mono · one-shot | polish | Opening a tip's full text: a page flip. |
| `ui_title_start.m4a` | 2.5s | mono · one-shot | core | "Continue/New game" confirmed: a heavy door and a boot on stone, a cold breath. |
| `ui_class_pick_warrior.m4a` | 1s | mono · one-shot | important | Class select - warrior: a sword half-drawn and slammed back. |
| `ui_class_pick_ranger.m4a` | 1s | mono · one-shot | important | Class select - ranger: bow string pulled and a leather glove. |
| `ui_class_pick_sorcerer.m4a` | 1s | mono · one-shot | important | Class select - sorcerer: a spark of three elements fizzling. |
| `ui_class_pick_necromancer.m4a` | 1s | mono · one-shot | important | Class select - necromancer: a whisper and a bone knock. |
| `ui_name_key.m4a` … `ui_name_key_3.m4a` | 0.08s | mono · one-shot | polish | Typing the hero name: a typewriter-like tick. |
| `ui_item_pick.m4a` … `ui_item_pick_3.m4a` | 0.2s | mono · one-shot | important | Pick up an item in the bag UI: a short grab. |
| `ui_item_drop.m4a` … `ui_item_drop_3.m4a` | 0.25s | mono · one-shot | important | Put an item into a slot: a soft slot-in thump. |
| `ui_item_swap.m4a`, `ui_item_swap_2.m4a` | 0.3s | mono · one-shot | polish | Swap two items. |
| `ui_tooltip_open.m4a`, `ui_tooltip_open_2.m4a` | 0.1s | mono · one-shot | polish | Item tooltip appears: the faintest shimmer, rarity-coloured: use a higher pitch for rarer tiers (the engine pitch-shifts). |
| `ui_tooltip_details.m4a` | 0.15s | mono · one-shot | polish | Details toggle in tooltips. |
| `ui_compare.m4a` | 0.15s | mono · one-shot | polish | Compare toggle. |
| `skill_learn.m4a` … `skill_learn_3.m4a` | 0.8s | mono · one-shot | core | A skill point spent (rank up): a glowing rune carved and a pitch that rises with rank (ranks 1-5; pitch by engine). |
| `skill_learn_max.m4a` | 1.5s | mono · one-shot | important | Rank 5 reached: a chime of completion. |
| `skillbar_set.m4a` … `skillbar_set_3.m4a` | 0.3s | mono · one-shot | important | Skill assigned to a bar slot: a hard stamp. |
| `autobuild_pick.m4a` … `autobuild_pick_3.m4a` | 0.8s | mono · one-shot | important | One of the three auto-build buttons: a glowing gear clicks into place. |
| `skill_respec.m4a`, `skill_respec_2.m4a` | 1.5s | mono · one-shot | important | Respec skills: a sweeping unstitching sound. |
| `menu_save.m4a` | 0.6s | mono · one-shot | polish | A save written: a stamp. |
| `menu_save_code.m4a`, `menu_save_code_2.m4a` | 0.8s | mono · one-shot | polish | Save-code copy/import: a short data blip. |
| `menu_restore.m4a` | 1s | mono · one-shot | important | Restoring a backup: a time-rewind whoosh. |
| `hud_skill_tap.m4a` … `hud_skill_tap_3.m4a` | 0.1s | mono · one-shot | polish | The skill button itself: a tiny tactile tap before the skill's own cast sound (optional). |
| `hud_potion_tap.m4a`, `hud_potion_tap_2.m4a` | 0.1s | mono · one-shot | polish | Potion button: a glass tap. |
| `hud_attack_loot.m4a`, `hud_attack_loot_2.m4a` | 0.2s | mono · one-shot | polish | The action button switches to LOOT mode: a tiny alert tick. |
| `hud_portal_tap.m4a` | 0.3s | mono · one-shot | polish | Town portal button: a faint chime. |
| `hud_minimap.m4a` | 0.15s | mono · one-shot | polish | Minimap toggle. |
| `hud_edit_snap.m4a`, `hud_edit_snap_2.m4a` | 0.1s | mono · one-shot | polish | HUD editor drag snap (16 px): a soft detent. |
| `hud_edit_reset.m4a` | 0.4s | mono · one-shot | polish | Reset layout: a whoosh. |
| `pwa_update.m4a` | 0.8s | mono · one-shot | polish | An update is ready / applied: a chime. |
| `pause_on.m4a` | 0.4s | mono · one-shot | polish | Game pause (pause button): a hush as the sound field low-passes. |
| `pause_off.m4a` | 0.4s | mono · one-shot | polish | Resume: the field re-opens. |
