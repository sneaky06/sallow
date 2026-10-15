# Sallow — road to release

Status on 2026-10-15: a playable prototype with the full campaign loop (3 acts, world boss, endgame Pallor), 4 classes with skill
and perk trees, the loot economy, events, Fallen, Echo, town revival and save protection. Everything is generated art and
synthesized sound. This file lists what is still missing before a full release and what each team owns long term.

## Big pieces not built yet

| Area | What's missing | Owner |
|---|---|---|
| **Art** | All final art: tilesets, 42+ character sheets in 8 directions, gear layers, props, icons, portraits, UI frames, app icon, logo. The pipeline and templates are ready. | Lead dev (drawing) + Engine (integration, animation) |
| **Sound and music** | Every sound effect, ambient bed and music track (all synthesized placeholders now). Loader and volume settings are ready. | Lead dev (producing) + Engine (mixing, music system) |
| **Classes** | 6 more classes to reach 10 (melee / ranged / magic hybrids), each with 3 skill trees, a dash, perk trees, auto-build plans, starter gear and class-specific loot. | Combat + Loot + Story |
| **Endgame** | A loop after the Hearthking that lasts: rift-shard crafting, endgame-only floors and bosses, repeatable hunts, personal speed records per floor, Pallor depth rewards beyond depth 50. | Combat + World + Loot |
| **Full balance** | Levels 1–60 and depths 1–60+ with every system on, by real play as well as the bot; economy sinks and gold flow over a full playthrough. | Combat + Loot |
| **Real-device quality** | Performance and battery on older iPhones, touch tuning, notch/safe areas, orientation, low-power mode. | Engine + UI (lead dev testing) |
| **Accessibility** | Text size, colour-blind-safe rarity cues (shapes/patterns, not just colour), reduced motion / no screen shake, left-handed layout preset. | UI + Engine |
| **Naming pass** | Final names for items, sets, uniques, families, NPCs and places to match the story (all in data tables). | Lead dev + Story + Loot |
| **Story presentation** | Full script polish, act transitions, the finale and endgame narrative, NPC personalities across all quests. | Story |
| **Native app** | App Store build (Capacitor wrapper — needs a Mac and an Apple developer account), iCloud save backup, app icon/screenshots/store text, privacy policy. | UI/Meta + lead dev |
| **QA** | One regression run covering every team's harness plus a scripted full-campaign playthrough, run before every push. | Lead (tech) |

## Long-term goals per team

- **Engine:** integrate the hand-drawn art and 8-direction animation; lighting and atmosphere polish per act; music system and
  mixing; performance budget on old devices; accessibility visuals.
- **World:** more layouts and landmark rooms per act; truly abstract Hellscape geometry; endgame floor types; town visibly growing
  with warmth; set-piece floors for the Fallen and act transitions.
- **Combat & classes:** 6 new classes with trees, dashes and perks; bigger monster roster per act; endgame bosses; full 1–60 balance;
  more pillar-driven mechanics (speed, precision, push-your-luck).
- **Loot & economy:** class-specific gear and uniques for the new classes; rift-shard crafting; more sets and Curator pages; economy
  tuning over a full playthrough; the naming pass.
- **UI & meta:** onboarding for the first 10 minutes; accessibility and settings; save backup/cloud; App Store wrapper; keep every
  screen fast and readable on a 375-wide phone.
- **Story:** full campaign script, endgame narrative, more side quest lines, lore, and the naming pass with the lead dev.

## Decisions the lead dev still has to make
1. Business model: paid up front, free with cosmetics, or free?
2. Target release date / first public test.
3. App Store: get a Mac (or a cloud Mac) and the $99/year Apple developer account when ready.
4. Difficulty options: one difficulty, or an optional hardcore (permadeath) mode?
5. Which 6 new classes (concepts first, then the order to build them).
