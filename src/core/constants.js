// Shared constants. Owned by the lead — teams read, never edit. See CONTRACT.md.
(function () {
  'use strict';
  const G = window.G;

  G.C = {
    // Isometric projection: screenX = (x - y) * TILE_W/2, screenY = (x + y) * TILE_H/2
    TILE_W: 32,
    TILE_H: 16,

    // WATER / LAVA are shallow: walkable but slow (lava also burns). DEEP_* and CHASM are impassable but see-through.
    TILE: { VOID: 0, FLOOR: 1, WALL: 2, DOOR: 3, STAIRS_DOWN: 4, STAIRS_UP: 5, WATER: 6, GRASS: 7, PATH: 8, LAVA: 9, BRIDGE: 10, RUBBLE: 11,
      DEEP_WATER: 12, DEEP_LAVA: 13, CHASM: 14 },
    WALKABLE: [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],     // indexed by TILE
    OPAQUE:   [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],     // blocks line of sight
    SLOW_TILE_SPEED: 0.6,   // move-speed multiplier while standing in shallow WATER / LAVA
    LAVA_DPS_PCT: 4,        // % of max HP per second while standing in shallow LAVA (fire damage, resistible)

    // Dungeon themes by depth: theme = THEMES[min(floor((depth-1)/5), THEMES.length-1)]
    THEMES: ['crypt', 'caves', 'inferno', 'abyss'],
    BOSS_EVERY: 5,          // boss floor every N depths; clearing it unlocks a waypoint at depth+1

    // R7.1 rarity ladder, most common first. `glow` 0-4 = glow strength on ground items and inventory cells; `pulse` = slow pulsing.
    // Legendary Elite and Mythic share tier 'legendary'. Set pieces are Legendary Elite with item.setId (green "Set" tag); R6 corrupted items are 'unique'.
    RARITY: {
      common:    { order: 0, name: 'Common',    color: '#c8c8c8', glow: 0 },
      uncommon:  { order: 1, name: 'Uncommon',  color: '#4ddc6a', glow: 0 },
      rare:      { order: 2, name: 'Rare',      color: '#5b8cff', glow: 0 },
      magic:     { order: 3, name: 'Magic',     color: '#b65bff', glow: 1 },
      legendary: { order: 4, name: 'Legendary Elite',  color: '#ffe45b', glow: 2, tier: 'legendary', sub: 'Elite' },
      mythic:    { order: 5, name: 'Legendary Mythic', color: '#ff8a2b', glow: 2.5, tier: 'legendary', sub: 'Mythic' },
      unique:    { order: 6, name: 'Unique',    color: '#ff3b3b', glow: 3 },
      rift:      { order: 7, name: 'Rift',      color: '#ff6aa8', glow: 4, pulse: true },
    },

    EQUIP_SLOTS: ['weapon', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2'],
    INV_SIZE: 60,
    STASH_SIZE: 120,
    SKILL_SLOTS: 4,

    // Every stat an item mod / passive / buff may touch. entity.stats holds the computed totals.
    STATS: [
      'str', 'dex', 'int', 'vit',
      'hpMax', 'mpMax', 'hpRegen', 'mpRegen',
      'dmgMin', 'dmgMax', 'dmgPct', 'attackSpeed', 'castSpeed', 'critChance', 'critDmg',
      'fireDmg', 'coldDmg', 'lightningDmg', 'poisonDmg', 'skillDmgPct', 'cdr', 'allSkills',
      'armor', 'dodge', 'block', 'resFire', 'resCold', 'resLightning', 'resPoison', 'resAll', 'thorns',
      'moveSpeed', 'lifeSteal', 'manaSteal', 'lifeOnKill', 'manaOnKill',
      'magicFind', 'goldFind', 'xpGain', 'pickupRadius',
    ],

    // Procedural-art vocabularies (engine draws these from descriptors; unknown values must fall back, never throw)
    BODY_TYPES: ['humanoid', 'skeleton', 'beast', 'blob', 'flyer', 'spider', 'caster', 'brute', 'wraith', 'demon'],
    WEAPON_LOOKS: ['none', 'sword', 'axe', 'mace', 'dagger', 'bow', 'staff', 'wand', 'shield'],
    ICON_SHAPES: ['sword', 'axe', 'mace', 'dagger', 'bow', 'staff', 'wand', 'shield', 'helm', 'armor', 'gloves', 'boots',
      'belt', 'ring', 'amulet', 'potion', 'scroll', 'gem', 'gold', 'key', 'rune', 'orb', 'tome',
      // skill / UI icons
      'slash', 'whirl', 'fire', 'ice', 'bolt', 'poison', 'heal', 'buff', 'arrow', 'multishot', 'trap', 'skull', 'summon', 'leap', 'aura', 'star'],
    PROP_TYPES: ['chest', 'chest_open', 'barrel', 'crate', 'torch', 'shrine', 'pillar', 'bones', 'stash', 'portal',
      'dungeon_entrance', 'waypoint', 'tree', 'bush', 'fountain', 'sign', 'stall', 'well', 'tombstone', 'crystal', 'campfire', 'gate', 'corpse'],
    NPC_ROLES: ['merchant', 'blacksmith', 'mystic', 'healer', 'elder', 'stashkeeper'],
    PROJECTILE_SHAPES: ['arrow', 'bolt', 'orb', 'fireball', 'shard', 'spit'],
    FX_TYPES: ['hit', 'slash', 'explosion', 'nova', 'heal', 'levelup', 'lootbeam', 'spark', 'smoke', 'blood', 'frost', 'poison', 'teleport', 'ring'],
  };

  G.C.themeForDepth = function (depth) {
    return G.C.THEMES[Math.min(Math.floor((depth - 1) / 5), G.C.THEMES.length - 1)];
  };
})();
