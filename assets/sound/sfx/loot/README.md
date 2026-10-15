# assets/sound/sfx/loot/

107 entries · 254 files · core 61 / important 150 / polish 43.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/loot/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `loot.m4a` … `loot_3.m4a` | 0.5s | mono · one-shot | core · plays today | plain drop (common/uncommon): a modest clink and thud of a few bits of kit on the floor. Quiet; the player will hear it hundreds of times… |
| `drop_uncommon.m4a` … `drop_uncommon_3.m4a` | 0.5s | mono · one-shot | important | Uncommon (green): the plain drop plus a tiny bright green tinkle on top. |
| `loot_rare.m4a` … `loot_rare_3.m4a` | 0.9s | mono · one-shot | core · plays today | good item (rare blue / magic purple): a bright clear chime rising in two notes, with a slight shimmer. |
| `drop_magic.m4a` … `drop_magic_3.m4a` | 1s | mono · one-shot | important | Magic (purple, slight glow): the rare chime with a deeper, glowing purple pad and a sparkle tail. |
| `loot_legendary.m4a`, `loot_legendary_2.m4a` | 2.5s | mono · one-shot | core · plays today | Legendary Elite (yellow): the best sound in the game. A rising golden fanfare: a big resonant bell strike, a swell, a sparkle cascade. The… |
| `drop_set.m4a`, `drop_set_2.m4a` | 2s | mono · one-shot | important | Set piece (legendary + green tag): the legendary sound but with a distinct chain-link / interlocking chime to say "part of a set". |
| `drop_mythic.m4a`, `drop_mythic_2.m4a` | 3.5s | stereo · one-shot | core | Legendary Mythic (orange): rarer and bigger than Elite: a low sub drop, a golden bell, a rising choir swell, a flame crackle, bell-like… |
| `drop_unique.m4a`, `drop_unique_2.m4a` | 3s | stereo · one-shot | core | Unique / Corrupted-promoted (red): dark, forbidden: a deep tolling bell, a descending minor motif, a lick of fire, a heartbeat; a bargain… |
| `drop_rift.m4a`, `drop_rift_2.m4a` | 3.5s | stereo · one-shot | core | Rift tier (pink, pulsing): alien and shimmering: a glassy glissando, a pitch-bent pulsing tone matching the pulsing glow; an otherworldly… |
| `lootbeam_glint.m4a`, `lootbeam_glint_2.m4a` | 0.8s | mono · one-shot | important | Screen-edge glint for a legendary-tier drop beam (double beam): a quick shimmering whoosh at the edge; pans toward the item's side. |
| `loot_corrupt_drop.m4a`, `loot_corrupt_drop_2.m4a` | 1.5s | mono · one-shot | important | Item is corrupted (tainted modifier): a low whispered hum and a subtle wrongness added to the drop sound. |
| `loot_bleached_drop.m4a`, `loot_bleached_drop_2.m4a` | 1.2s | mono · one-shot | important | Bleached item (Pallor II+ has hidden affix): a missing-note, whitened sound, a hiss of pale air. |
| `loot_bloodstone_drop.m4a`, `loot_bloodstone_drop_2.m4a` | 1.8s | mono · one-shot | important | Bloodstone drop: a thick wet heartbeat and a resonant, beautiful red chime. |
| `pile_merge.m4a`, `pile_merge_2.m4a` | 0.3s | mono · one-shot | polish | Piles merge on the floor (within 0.75 tiles): a small settle of loot sliding together. |
| `drop_land_weapon.m4a` … `drop_land_weapon_3.m4a` | 0.5s | mono · one-shot | important | A weapon lands: an iron clatter, a dull scrape. |
| `drop_land_armor.m4a` … `drop_land_armor_3.m4a` | 0.5s | mono · one-shot | important | Armour lands: a heavy flat clank, strap rattle (plate), a soft thump (cloth). |
| `drop_land_jewelry.m4a` … `drop_land_jewelry_3.m4a` | 0.4s | mono · one-shot | important | A ring or amulet lands: a tiny tinkle and bounce. |
| `drop_land_potion.m4a`, `drop_land_potion_2.m4a` | 0.4s | mono · one-shot | polish | A potion lands: a glass thud. |
| `drop_land_gem.m4a` … `drop_land_gem_3.m4a` | 0.4s | mono · one-shot | important | A gem lands: a bright little tick, bouncing. |
| `drop_land_misc.m4a`, `drop_land_misc_2.m4a` | 0.4s | mono · one-shot | polish | Material, key, trophy, lore: a quiet thud. |
| `pickup_weapon.m4a` … `pickup_weapon_3.m4a` | 0.35s | mono · one-shot | core | Weapon picked up: a metal scrape and a hide wrap. |
| `pickup_armor_cloth.m4a` … `pickup_armor_cloth_3.m4a` | 0.35s | mono · one-shot | important | Cloth/robes picked up: a soft folding sound. |
| `pickup_armor_light.m4a` … `pickup_armor_light_3.m4a` | 0.35s | mono · one-shot | important | Leather: a creak and a pat. |
| `pickup_armor_heavy.m4a` … `pickup_armor_heavy_3.m4a` | 0.4s | mono · one-shot | important | Plate/mail: a metal clunk and rattle. |
| `pickup_jewelry.m4a` … `pickup_jewelry_3.m4a` | 0.35s | mono · one-shot | core | Ring/amulet: a clean chain jingle and a ring tick. |
| `pickup_shield.m4a` … `pickup_shield_3.m4a` | 0.4s | mono · one-shot | polish | Shield: a flat thump on wood. |
| `pickup_potion.m4a` … `pickup_potion_3.m4a` | 0.3s | mono · one-shot | important | Potion to belt: a quick glass clink and a cork squeak. (Belt, not bag.) |
| `pickup_gem.m4a` … `pickup_gem_3.m4a` | 0.3s | mono · one-shot | core | Gem: a pure ting with sparkle; the six gem kinds also have a flavour chime (below). |
| `pickup_bloodstone.m4a`, `pickup_bloodstone_2.m4a` | 1s | mono · one-shot | important | Bloodstone: a heartbeat thud and a deep red tone. |
| `pickup_tome.m4a`, `pickup_tome_2.m4a` | 1.2s | mono · one-shot | important | Tome of Insight / XP tome: pages riffling and a faint choir note. A skill point arrives. |
| `pickup_lore.m4a`, `pickup_lore_2.m4a` | 1.5s | mono · one-shot | important | A lore page (notes, journal): parchment crumple, a quiet hearth hum. |
| `pickup_key.m4a`, `pickup_key_2.m4a` | 0.8s | mono · one-shot | important | Key: a heavy iron clink. |
| `pickup_trophy.m4a`, `pickup_trophy_2.m4a` | 0.5s | mono · one-shot | polish | Trophy: a bony clunk. |
| `pickup_material.m4a` … `pickup_material_3.m4a` | 0.4s | mono · one-shot | important | Generic crafting mat in bag counter: a soft shuffle. |
| `mat_dust.m4a` … `mat_dust_3.m4a` | 0.4s | mono · one-shot | important | Dust: a puff of fine powder, a tiny shimmer. |
| `mat_shard.m4a` … `mat_shard_3.m4a` | 0.4s | mono · one-shot | important | Shard: a glassy tick. |
| `mat_essence.m4a` … `mat_essence_3.m4a` | 0.5s | mono · one-shot | important | Essence: a liquid drop with a ghostly sigh. |
| `mat_gemdust.m4a` … `mat_gemdust_3.m4a` | 0.4s | mono · one-shot | polish | Gem dust: sparkling sand. |
| `mat_riftshard.m4a` … `mat_riftshard_3.m4a` | 0.7s | mono · one-shot | important | Rift shard: a pulsing pink crystal hum and a deep glass note. |
| `mat_class.m4a` … `mat_class_3.m4a` | 0.5s | mono · one-shot | polish | Class forge material: an ingot of metal ringing. |
| `gold.m4a` … `gold_4.m4a` | 0.3s | mono · one-shot | core · plays today | single gold pickup. Today two sine notes. Small-coin clink: bright, short; plays at most 6 times per second. |
| `gold_small.m4a` … `gold_small_4.m4a` | 0.4s | mono · one-shot | important | A few coins: a light handful. |
| `gold_medium.m4a` … `gold_medium_3.m4a` | 0.6s | mono · one-shot | important | A bigger handful: a cascade of coins clinking. |
| `gold_large.m4a` … `gold_large_3.m4a` | 0.9s | mono · one-shot | important | A purse of gold: a heavier jingle with a cloth thud. |
| `gold_hoard.m4a`, `gold_hoard_2.m4a` | 1.5s | mono · one-shot | important | A chest-sized hoard (5,000+): a heavy gold crash. |
| `gold_spend.m4a` … `gold_spend_3.m4a` | 0.5s | mono · one-shot | important | Gold paid (not at vendors): coins leaving the hand, a single purse thunk. |
| `pile_open.m4a`, `pile_open_2.m4a` | 0.4s | mono · one-shot | important | A pile sheet opens (tap on a pile): items shuffling. |
| `pile_take_all.m4a`, `pile_take_all_2.m4a` | 0.8s | mono · one-shot | core | Take-all: a sweep of everything into the bag in one fast run of clinks and rustles, one sound not N. |
| `pickup_full.m4a`, `pickup_full_2.m4a` | 0.3s | mono · one-shot | important | The bag is full: a dull stuffed-bag thud. (Not an error buzz.) |
| `gem_chime_ruby.m4a` | 0.7s | mono · one-shot | polish | Ruby: a warm, resonant, red-brass chime (pitch D). |
| `gem_chime_sapphire.m4a` | 0.7s | mono · one-shot | polish | Sapphire: a cool, glassy chime (pitch E). |
| `gem_chime_emerald.m4a` | 0.7s | mono · one-shot | polish | Emerald: a green, woody chime, a hint of leaf (pitch F#). |
| `gem_chime_topaz.m4a` | 0.7s | mono · one-shot | polish | Topaz: a bright golden bell (pitch G). |
| `gem_chime_amethyst.m4a` | 0.7s | mono · one-shot | polish | Amethyst: a mystical, purple pad chime (pitch A). |
| `gem_chime_diamond.m4a` | 0.9s | mono · one-shot | polish | Diamond: a pure, crystalline high bell with long decay (pitch B). |
| `equip.m4a` … `equip_3.m4a` | 0.4s | mono · one-shot | core · plays today | equip: a satisfying buckling-on of gear: strap and metal click. Generic fallback. |
| `equip_weapon.m4a` … `equip_weapon_3.m4a` | 0.4s | mono · one-shot | important | Weapon equipped: a sheath-and-draw, a grip tightened. |
| `equip_armor_cloth.m4a` … `equip_armor_cloth_3.m4a` | 0.4s | mono · one-shot | important | Robe/cloth: a swish. |
| `equip_armor_light.m4a` … `equip_armor_light_3.m4a` | 0.4s | mono · one-shot | important | Leather: strap pull and creak. |
| `equip_armor_heavy.m4a` … `equip_armor_heavy_3.m4a` | 0.5s | mono · one-shot | important | Plate: a heavy clank and latch. |
| `equip_shield.m4a` … `equip_shield_3.m4a` | 0.4s | mono · one-shot | polish | Shield onto the arm: a strap clunk. |
| `equip_jewelry.m4a` … `equip_jewelry_3.m4a` | 0.4s | mono · one-shot | important | Ring/amulet: a clasp click and fine chain. |
| `equip_belt.m4a` … `equip_belt_3.m4a` | 0.4s | mono · one-shot | polish | Belt buckle. |
| `unequip.m4a` … `unequip_3.m4a` | 0.35s | mono · one-shot | important | Removing gear: a lighter rustle of straps. |
| `equip_upgrade_arrow.m4a` | 0.2s | mono · one-shot | polish | The item you tapped is better than yours (▲ verdict): a tiny upward tick. |
| `equip_matched.m4a`, `equip_matched_2.m4a` | 1s | mono · one-shot | important | Matched bonus 2 or 4 pieces: a matching click as the pieces "lock" into a set look, a warm chime. |
| `set_bonus.m4a`, `set_bonus_2.m4a` | 1.5s | mono · one-shot | important | A set bonus tier reached: a ringing chain. |
| `socket_add.m4a`, `socket_add_2.m4a` | 1.2s | mono · one-shot | important | Blacksmith adds a socket: a drill-and-hammer, a crunch and a small ring of sparks. Today `equip`. |
| `socket_gem.m4a` … `socket_gem_3.m4a` | 0.8s | mono · one-shot | core | A cut gem set into a socket: a precise click of a stone into metal and a sparkle. |
| `socket_blood.m4a`, `socket_blood_2.m4a` | 1.5s | mono · one-shot | important | A bloodstone is set (permanent!): a wet, heavy press and a heartbeat; a gravity-heavy confirm. The confirm dialog gets… |
| `unsocket_gem.m4a`, `unsocket_gem_2.m4a` | 0.7s | mono · one-shot | important | Gem removed: a pry and pop. |
| `gem_combine.m4a`, `gem_combine_2.m4a` | 1.5s | mono · one-shot | important | Three gems fuse into the next tier: three notes converging into a higher chord. |
| `gem_upgrade.m4a`, `gem_upgrade_2.m4a` | 1.5s | mono · one-shot | important | Blacksmith cuts a gem to a higher tier: a grinding wheel and a final shine. |
| `forge_hammer.m4a` … `forge_hammer_4.m4a` | 0.5s | mono · one-shot | core | An anvil hit: iron hammer on steel, the town's backbone sound. Used for any blacksmith action. |
| `forge_upgrade.m4a` … `forge_upgrade_3.m4a` | 1.5s | mono · one-shot | core | Item +1 to +5: hammer strikes, a sizzle in water, a tone rising with each plus level (5 pitches; combine with `forge_hammer`). |
| `forge_upgrade_max.m4a` | 2.5s | mono · one-shot | important | +5 reached: the glow of the metal, a double-chime. |
| `salvage.m4a` … `salvage_3.m4a` | 0.8s | mono · one-shot | core | Salvage into mats: a metal crush, scraps falling into a bin. Today `click`. |
| `cleanse.m4a`, `cleanse_2.m4a` | 2s | mono · one-shot | important | Blacksmith cleanses a corrupted item: a hissing purge, a black fluid draining away, a quiet clean ring. |
| `item_cleansed.m4a` | 1.5s | mono · one-shot | important | Event: the cleansed item rings clean. The corruption whisper stops. |
| `gamble_roll.m4a` … `gamble_roll_3.m4a` | 1s | mono · one-shot | important | Mystic gamble: cards shuffling, bones rattled in a cup. |
| `gamble_reveal.m4a` … `gamble_reveal_4.m4a` | 1.2s | mono · one-shot | important | The gamble reveals: a tarot card flip; the rarity result is represented by the drop sound (use `drop_*`). |
| `reroll_affix.m4a` … `reroll_affix_3.m4a` | 1.2s | mono · one-shot | important | Reroll an affix (mystic): arcane fire and a cracking glass sound. |
| `reroll_lock.m4a` | 0.4s | mono · one-shot | polish | A corrupted mod / unique mod cannot be rerolled: a "no" chink. |
| `item_lock.m4a`, `item_lock_2.m4a` | 0.3s | mono · one-shot | important | Lock toggled on: a small padlock click. |
| `item_unlock.m4a`, `item_unlock_2.m4a` | 0.3s | mono · one-shot | polish | Lock toggled off: a lighter padlock click. |
| `item_sort.m4a` | 0.6s | mono · one-shot | polish | The bag sorts itself: a quick riffle of items. |
| `item_reveal_bleached.m4a`, `item_reveal_bleached_2.m4a` | 2s | mono · one-shot | important | A bleached item is revealed in town (its "???" affix shows): a drawn breath, a pale hiss resolving into colour. |
| `item_awaken.m4a` … `item_awaken_3.m4a` | 2.5s | mono · one-shot | core | An item awakens a themed affix at 250/1000/5000 kills: three escalating versions (a soft whisper, a bell, a surge). Awakening is a… |
| `item_stash.m4a`, `item_stash_2.m4a` | 0.4s | mono · one-shot | important | Item to the stash: a quick chest-lid thump. |
| `item_stash_take.m4a`, `item_stash_take_2.m4a` | 0.4s | mono · one-shot | important | Item out of the stash. |
| `chute_send.m4a` … `chute_send_3.m4a` | 1.2s | mono · one-shot | core | The chute: an item slides down a long wooden tube and thuds into the crate far above: whoosh, a hollow thump with a long echo. It is… |
| `chute_full.m4a` | 0.6s | mono · one-shot | important | The crate up top is full: a dull stuffed thump, a rattle of the chute. |
| `chute_open.m4a` | 0.8s | mono · one-shot | important | Opening the chute prop: a hatch creak. |
| `surface_open.m4a` | 0.8s | mono · one-shot | important | Opening the surface crate in town: a heavy wooden lid, a rattle of piled loot. |
| `surface_take.m4a` … `surface_take_3.m4a` | 0.4s | mono · one-shot | polish | Taking an item from the crate. |
| `buy.m4a` … `buy_3.m4a` | 0.6s | mono · one-shot | core · plays today | purchase: a coin handover, a satisfied pouch clink, a cloth wrap. |
| `sell.m4a` … `sell_3.m4a` | 0.6s | mono · one-shot | core · plays today | sale: coins counted into a palm, falling pitches. |
| `buy_potion.m4a`, `buy_potion_2.m4a` | 0.6s | mono · one-shot | polish | Buy a potion: coins and a glass clink. |
| `buyback.m4a`, `buyback_2.m4a` | 0.8s | mono · one-shot | polish | Buy back a sold item: coins at a premium: a slightly regretful clink. |
| `sell_all.m4a`, `sell_all_2.m4a` | 1.5s | mono · one-shot | important | "Sell all <= rarity": a long cascade of coins pouring, ~1.5 s. |
| `purchase_denied.m4a`, `purchase_denied_2.m4a` | 0.4s | mono · one-shot | important | Not enough gold: a coin purse dull thunk with a thin ring. |
| `junk_send.m4a`, `junk_send_2.m4a` | 0.8s | mono · one-shot | important | Send junk (auto): items rattling down a short slope. |
| `relic_combine.m4a` | 8s | stereo · one-shot | core | At the Elder's hearth, all ten relics combined: ten different notes (one per Fallen) layering into a hearth chord, the founding hearth… |
| `relic_view.m4a`, `relic_view_2.m4a` | 1s | mono · one-shot | polish | Opening the relics panel: a case lid and a faint chime. |
| `curator_stitch.m4a` … `curator_stitch_3.m4a` | 0.9s | mono · one-shot | core | The Curator registers a piece: needle, black thread pulled through mail rings, a ledger tick. Isra's sound. |
| `collection_page.m4a`, `collection_page_2.m4a` | 2s | mono · one-shot | important | A Collection Book page completes: a page turn and a soft chord. |
| `collection_tier.m4a` … `collection_tier_3.m4a` | 3s | stereo · one-shot | important | Collection tier 5/15/all: warmer layered chords; the largest has a quiet prayer-like choir. |
