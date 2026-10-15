// Loot & Economy — static tables: base item types, gems, consumables, materials, stat labels, class profiles.
// Everything under G.items.data is read-only lookup data keyed by id; items themselves stay plain JSON.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items = G.items || {};
  const D = I.data = {};

  D.TIER_ILVL = [1, 6, 12, 20, 28, 38, 48, 58];   // min item level of each base tier
  D.MAX_STACK = 99;
  D.POTION_CAP = 20;
  D.MAX_PLUS = 5;                                  // blacksmith upgrade cap
  // R4.6: the game's player-facing name lives here only (core may override with G.C.GAME_NAME). Ids never change.
  D.GAME_NAME = (G.C && G.C.GAME_NAME) || 'Sallow';
  D.ICON_BLOOD = 'bloodstone';      // R12: every bloodstone uses this icon shape (cut gems keep 'gem')
  D.MISC_NAMES = { gold: 'Gold', lorePage: 'Torn Page', setTag: 'Set' };   // player-facing names that are not items in a table (R6.2 naming pass)

  // Scaling curves (level -> budget). Bases keep scaling with ilvl past the last tier for deep floors.
  // weapon DPS budget: the mild exponent keeps pace with src/game monster HP (x1.06 per level) so hits-to-kill stays ~4-7
  D.power = function (l) { return (3 + 1.5 * l + 0.02 * l * l) * Math.pow(1.013, l - 1); };
  D.armorCurve = function (l) { return 4 + 2.2 * l + 0.02 * l * l; };     // chest-piece armor budget
  D.flatScale = function (l) { return (Math.min(l, 120) + 8) / 68; };     // 1.0 at ilvl 60 (unique/set authored values)
  D.lerp60 = function (a, b, l) { return a + (b - a) * (Math.min(l, 60) - 1) / 59; };

  // Stats whose values grow with item level (everything else is a capped percentage).
  D.FLAT = {};
  ['str', 'dex', 'int', 'vit', 'hpMax', 'mpMax', 'hpRegen', 'mpRegen', 'dmgMin', 'dmgMax', 'fireDmg', 'coldDmg',
    'lightningDmg', 'poisonDmg', 'armor', 'thorns', 'lifeOnKill', 'manaOnKill'].forEach(function (s) { D.FLAT[s] = true; });

  D.STAT_INFO = {
    str: ['Strength'], dex: ['Dexterity'], int: ['Intelligence'], vit: ['Vitality'],
    hpMax: ['Life'], mpMax: ['Mana'], hpRegen: ['Life per Second'], mpRegen: ['Mana per Second'],
    dmgMin: ['Minimum Damage'], dmgMax: ['Maximum Damage'], dmgPct: ['Damage', 1],
    attackSpeed: ['Attack Speed', 1], castSpeed: ['Cast Speed', 1], critChance: ['Critical Chance', 1], critDmg: ['Critical Damage', 1],
    fireDmg: ['Fire Damage'], coldDmg: ['Cold Damage'], lightningDmg: ['Lightning Damage'], poisonDmg: ['Poison Damage'],
    skillDmgPct: ['Skill Damage', 1], cdr: ['Cooldown Reduction', 1], allSkills: ['to All Skills'],
    armor: ['Armor'], dodge: ['Dodge', 1], block: ['Block', 1],
    resFire: ['Fire Resistance', 1], resCold: ['Cold Resistance', 1], resLightning: ['Lightning Resistance', 1],
    resPoison: ['Poison Resistance', 1], resAll: ['All Resistances', 1], thorns: ['Thorns'],
    moveSpeed: ['Movement Speed', 1], lifeSteal: ['Life Steal', 1], manaSteal: ['Mana Steal', 1],
    lifeOnKill: ['Life on Kill'], manaOnKill: ['Mana on Kill'],
    magicFind: ['Magic Find', 1], goldFind: ['Gold Find', 1], xpGain: ['Experience Gained', 1], pickupRadius: ['Pickup Radius'],
    dps: ['Weapon DPS'],
  };

  // ---- base item families -------------------------------------------------------------------------------
  D.BASES = {};      // baseId -> def
  D.FAMILIES = {};   // family -> [def per tier]
  D.FAMILY_LIST = [];

  const METAL = ['#8d7b68', '#9aa3ad', '#b9c3cc', '#d5dbe6', '#d9bd6a', '#8fb1e8', '#b98cff', '#ff7a3c'];
  const LEATHER = ['#6e5a44', '#8a6a44', '#9c7648', '#7a5a3a', '#5f7a4a', '#4a4a66', '#8a4a3a', '#3a3350'];
  const CLOTH = ['#8a8474', '#b9b29a', '#7f97b8', '#b58fc9', '#6a78c8', '#8a5fd0', '#d8c070', '#5a2f8a'];

  function family(f, opts, names) {
    const list = [];
    for (let t = 0; t < names.length; t++) {
      const pal = opts.pal || METAL;
      const def = Object.assign({}, opts, {
        id: f + '_' + (t + 1), family: f, tier: t, ilvl: D.TIER_ILVL[t], name: names[t],
        icon: { shape: opts.shape, color: pal[t], accent: opts.accent || '#6b4a2a' },
      });
      delete def.pal; delete def.shape; delete def.accent;
      D.BASES[def.id] = def;
      list.push(def);
    }
    D.FAMILIES[f] = list;
    D.FAMILY_LIST.push(f);
  }

  // Weapons: spd = attacks/second, dps = share of the DPS budget, spread = damage range half-width.
  // imp = implicit mods [stat, value at ilvl 1, value at ilvl 60].
  const W = { type: 'weapon', slot: 'weapon' };
  family('sword', Object.assign({ weaponType: 'sword', shape: 'sword', spd: 1.4, dps: 1.0, spread: 0.25, w: 10 }, W),
    ['Rusty Sword', 'Short Sword', 'Broadsword', 'Longsword', 'Falchion', 'Knight Blade', 'Runed Sabre', 'Emberblade']);
  family('greatsword', Object.assign({ weaponType: 'sword', twoHanded: true, shape: 'sword', accent: '#3a2a22', spd: 1.05, dps: 1.4, spread: 0.3, w: 6 }, W),
    ['Notched Claymore', 'Bastard Sword', 'Claymore', 'Zweihander', 'Flamberge', 'Executioner Blade', 'Runed Greatsword', 'Colossus Blade']);
  family('axe', Object.assign({ weaponType: 'axe', shape: 'axe', spd: 1.2, dps: 1.05, spread: 0.45, w: 8, imp: [['critDmg', 8, 25]] }, W),
    ['Hatchet', 'Hand Axe', 'Bearded Axe', 'War Axe', 'Cleaver', 'Crescent Axe', 'Runed Axe', 'Ember Cleaver']);
  family('greataxe', Object.assign({ weaponType: 'axe', twoHanded: true, shape: 'axe', accent: '#3a2a22', spd: 0.9, dps: 1.5, spread: 0.5, w: 5, imp: [['critDmg', 15, 45]] }, W),
    ['Woodcutter', 'Broad Axe', 'Battle Axe', 'Great Axe', 'Bardiche', 'Headsman Axe', 'Runed Labrys', 'Abyssal Reaver']);
  family('mace', Object.assign({ weaponType: 'mace', shape: 'mace', spd: 1.1, dps: 1.1, spread: 0.12, w: 8 }, W),
    ['Club', 'Cudgel', 'Flanged Mace', 'Morning Star', 'War Hammer', 'Knight Mace', 'Runed Scepter', 'Emberstar']);
  family('maul', Object.assign({ weaponType: 'mace', twoHanded: true, shape: 'mace', accent: '#3a2a22', spd: 0.8, dps: 1.55, spread: 0.15, w: 5 }, W),
    ['Wooden Maul', 'Sledge', 'Great Maul', 'War Maul', 'Earthbreaker', 'Siege Hammer', 'Runed Maul', 'Worldbreaker']);
  family('dagger', Object.assign({ weaponType: 'dagger', shape: 'dagger', spd: 1.9, dps: 0.9, spread: 0.3, w: 9, imp: [['critChance', 3, 8]] }, W),
    ['Shiv', 'Dirk', 'Stiletto', 'Kris', 'Poignard', 'Assassin Blade', 'Runed Fang', 'Abyssal Fang']);
  family('bow', Object.assign({ weaponType: 'bow', twoHanded: true, shape: 'bow', pal: LEATHER, accent: '#d8d0b8', spd: 1.3, dps: 1.25, spread: 0.3, w: 10 }, W),
    ['Short Bow', 'Hunting Bow', 'Long Bow', 'Composite Bow', 'Recurve Bow', 'War Bow', 'Runed Bow', 'Emberstring']);
  family('staff', Object.assign({ weaponType: 'staff', twoHanded: true, shape: 'staff', pal: LEATHER, accent: '#7fd4ff', spd: 1.0, dps: 1.0, spread: 0.3, w: 9,
    imp: [['skillDmgPct', 8, 30], ['mpMax', 10, 80]] }, W),
    ['Gnarled Staff', 'Oak Staff', 'Quarterstaff', 'Battle Staff', 'Rune Staff', 'Archon Staff', 'Elder Staff', 'Abyssal Staff']);
  family('wand', Object.assign({ weaponType: 'wand', shape: 'wand', pal: CLOTH, accent: '#c8ff8a', spd: 1.5, dps: 0.7, spread: 0.3, w: 9,
    imp: [['skillDmgPct', 5, 18]] }, W),
    ['Twig Wand', 'Bone Wand', 'Yew Wand', 'Crystal Wand', 'Grave Wand', 'Lich Wand', 'Runed Wand', 'Abyssal Wand']);

  // Off-hands
  family('shield', { type: 'armor', slot: 'offhand', offhandType: 'shield', shape: 'shield', armorK: 0.9, block: 10, w: 10 },
    ['Wooden Buckler', 'Round Shield', 'Kite Shield', 'Heater Shield', 'Tower Shield', 'Knight Shield', 'Runed Aegis', 'Ember Bulwark']);
  family('orb', { type: 'armor', slot: 'offhand', offhandType: 'orb', shape: 'orb', pal: CLOTH, accent: '#ffffff', w: 6,
    imp: [['mpMax', 12, 110], ['skillDmgPct', 3, 10]] },
    ['Cloudy Orb', 'Glass Orb', 'Crystal Orb', 'Storm Orb', 'Soul Orb', 'Astral Orb', 'Runed Orb', 'Void Orb']);
  family('tome', { type: 'armor', slot: 'offhand', offhandType: 'tome', shape: 'tome', pal: LEATHER, accent: '#d9bd6a', w: 6,
    imp: [['mpRegen', 1, 6], ['int', 2, 18]] },
    ['Tattered Tome', 'Apprentice Tome', 'Grimoire', 'Codex', 'Book of Shades', 'Lexicon', 'Runed Tome', 'Abyssal Codex']);

  // Armour: three weight classes x four body slots, names composed from material + piece.
  const ARMOR_CLASSES = {
    heavy: { k: 1.0, pal: METAL, accent: '#5a4632',
      mats: ['Rusted', 'Iron', 'Steel', 'Blackened', 'Knightly', 'Runeforged', 'Emberforged', 'Abyssal'],
      pieces: { helm: 'Helm', chest: 'Plate', gloves: 'Gauntlets', boots: 'Greaves' } },
    light: { k: 0.7, pal: LEATHER, accent: '#c9a36a', imp: ['dodge', 1, 3],
      mats: ['Ragged', 'Leather', 'Studded', 'Hardened', "Hunter's", 'Shadow', 'Drakehide', 'Nightstalker'],
      pieces: { helm: 'Hood', chest: 'Jerkin', gloves: 'Gloves', boots: 'Boots' } },
    cloth: { k: 0.45, pal: CLOTH, accent: '#d9bd6a', imp: ['mpMax', 4, 40],
      mats: ['Threadbare', 'Linen', 'Woven', 'Silk', "Acolyte's", 'Mystic', 'Archon', 'Voidweave'],
      pieces: { helm: 'Cowl', chest: 'Robe', gloves: 'Wraps', boots: 'Slippers' } },
  };
  const SLOT_K = { chest: 1.0, helm: 0.6, gloves: 0.4, boots: 0.45 };
  const SLOT_SHAPE = { chest: 'armor', helm: 'helm', gloves: 'gloves', boots: 'boots' };
  Object.keys(ARMOR_CLASSES).forEach(function (cls) {
    const ac = ARMOR_CLASSES[cls];
    Object.keys(ac.pieces).forEach(function (slot) {
      const imp = ac.imp ? [[ac.imp[0], ac.imp[1] * (slot === 'chest' ? 2 : 1), ac.imp[2] * (slot === 'chest' ? 2 : 1)]] : undefined;
      const opts = { type: 'armor', slot: slot, armorClass: cls, shape: SLOT_SHAPE[slot], pal: ac.pal, accent: ac.accent, armorK: ac.k * SLOT_K[slot], w: 10 };
      if (imp) opts.imp = imp;
      family(cls + '_' + slot, opts, ac.mats.map(function (m) { return m + ' ' + ac.pieces[slot]; }));
    });
  });
  family('belt', { type: 'armor', slot: 'belt', shape: 'belt', pal: LEATHER, accent: '#b9c3cc', armorK: 0.3, w: 10 },
    ['Rope Belt', 'Leather Belt', 'Studded Belt', 'Heavy Belt', 'War Belt', 'Champion Belt', 'Runed Girdle', 'Ember Girdle']);

  // Jewellery (no base stats — all affixes)
  const JEWEL = ['#b87333', '#c0c0c8', '#e8c84a', '#5fbf8a', '#dfe6f0', '#3a3a48', '#b98cff', '#ff7a3c'];
  family('ring', { type: 'jewelry', slot: 'ring', shape: 'ring', pal: JEWEL, accent: '#7fd4ff', w: 10 },
    ['Copper Ring', 'Silver Ring', 'Gold Ring', 'Jade Ring', 'Platinum Ring', 'Obsidian Ring', 'Runed Band', 'Ember Band']);
  family('amulet', { type: 'jewelry', slot: 'amulet', shape: 'amulet', pal: JEWEL, accent: '#ff5b7a', w: 10 },
    ['Bone Charm', 'Copper Amulet', 'Silver Amulet', 'Gold Amulet', 'Jade Talisman', 'Platinum Amulet', 'Runed Pendant', 'Ember Heart']);

  D.TYPE_NAME = {
    sword: 'Sword', greatsword: 'Two-Handed Sword', axe: 'Axe', greataxe: 'Two-Handed Axe', mace: 'Mace', maul: 'Two-Handed Mace',
    dagger: 'Dagger', bow: 'Bow', staff: 'Staff', wand: 'Wand', shield: 'Shield', orb: 'Orb', tome: 'Tome',
    belt: 'Belt', ring: 'Ring', amulet: 'Amulet',
    heavy_helm: 'Heavy Helm', heavy_chest: 'Heavy Armor', heavy_gloves: 'Heavy Gloves', heavy_boots: 'Heavy Boots',
    light_helm: 'Light Helm', light_chest: 'Light Armor', light_gloves: 'Light Gloves', light_boots: 'Light Boots',
    cloth_helm: 'Cloth Helm', cloth_chest: 'Cloth Armor', cloth_gloves: 'Cloth Gloves', cloth_boots: 'Cloth Boots',
  };

  // Implicit base stats of a base type at a given item level.
  D.baseStats = function (def, lvl) {
    const b = {};
    if (def.type === 'weapon') {
      const avg = D.power(lvl) * def.dps / def.spd;
      b.dmgMin = Math.max(1, Math.round(avg * (1 - def.spread)));
      b.dmgMax = Math.max(b.dmgMin + 1, Math.round(avg * (1 + def.spread)));
      b.attackSpeed = def.spd;
    } else if (def.armorK) {
      b.armor = Math.max(1, Math.round(D.armorCurve(lvl) * def.armorK));
      if (def.block) b.block = def.block + def.tier * 2;
    }
    return b;
  };

  D.scaleBeyond = function (stat, v, lvl) {
    return (lvl > 60 && D.FLAT[stat]) ? v * (1 + (lvl - 60) * 0.015) : v;
  };

  D.implicitMods = function (def, lvl) {
    const out = [];
    (def.imp || []).forEach(function (m) {
      const v = Math.max(1, Math.round(D.scaleBeyond(m[0], D.lerp60(m[1], m[2], lvl), lvl)));
      out.push({ stat: m[0], value: v, implicit: true });
    });
    return out;
  };

  // R7.3: how many sockets an item can ever hold: by slot, growing with item level. Chisel and drops both stop here.
  D.SOCKET_MAX = function (item) {
    if (!item || !item.slot) return 0;
    const l = item.ilvl || 1;
    if (item.slot === 'chest' || (item.slot === 'weapon' && item.twoHanded)) return 2 + (l >= 25 ? 1 : 0) + (l >= 45 ? 1 : 0);
    if (item.slot === 'weapon' || item.slot === 'offhand' || item.slot === 'helm') return 1 + (l >= 30 ? 1 : 0) + (l >= 50 ? 1 : 0);
    return 1 + (l >= 40 ? 1 : 0);
  };

  // ---- gems ---------------------------------------------------------------------------------------------
  // Effect depends on what the gem is socketed into: w = weapon, a = armour / off-hand, j = jewellery.
  D.GEM_TIERS = ['Chipped', 'Flawed', '', 'Flawless', 'Perfect'];
  D.GEM_ILVL = [1, 12, 24, 38, 50];
  D.GEM_VALUE = [8, 25, 70, 180, 450];
  D.GEM_DUST = [1, 3, 8, 20, 50];          // gem dust returned when a socketed cut gem is destroyed with its item (R3.2)
  D.GEM_UP_DUST = [4, 10, 25, 60];         // gem dust to cut a gem one tier higher at the blacksmith
  D.GEM_KINDS = {
    ruby:     { name: 'Ruby',     color: '#ff3b4e', w: ['fireDmg', [3, 7, 13, 22, 36]],      a: ['hpMax', [10, 22, 40, 65, 100]],   j: ['str', [3, 6, 10, 15, 22]] },
    sapphire: { name: 'Sapphire', color: '#4a7dff', w: ['coldDmg', [3, 7, 13, 22, 36]],      a: ['mpMax', [8, 18, 32, 52, 80]],     j: ['int', [3, 6, 10, 15, 22]] },
    emerald:  { name: 'Emerald',  color: '#3ddc6a', w: ['poisonDmg', [3, 7, 13, 22, 36]],    a: ['dodge', [1, 2, 3, 4, 6]],         j: ['dex', [3, 6, 10, 15, 22]] },
    topaz:    { name: 'Topaz',    color: '#ffd94a', w: ['lightningDmg', [3, 7, 13, 22, 36]], a: ['magicFind', [4, 7, 11, 16, 24]],  j: ['goldFind', [8, 14, 22, 32, 45]] },
    amethyst: { name: 'Amethyst', color: '#b65bff', w: ['lifeSteal', [1, 2, 3, 4, 5]],       a: ['vit', [3, 6, 10, 15, 22]],        j: ['hpRegen', [1, 2, 4, 6, 9]] },
    diamond:  { name: 'Diamond',  color: '#e8f4ff', w: ['critDmg', [8, 14, 22, 32, 45]],     a: ['armor', [10, 25, 50, 85, 140]],   j: ['resAll', [3, 5, 7, 10, 14]] },
  };
  // Bloodstones (R2.6): roughly twice a comparable cut gem, plus `x` — a drawback (negative) or secondary stat that applies
  // whatever the host. They fuse permanently: no unsocketing, no combining. Three tiers.
  D.BLOOD_TIERS = ['Lesser', '', 'Greater'];
  D.BLOOD_ILVL = [15, 35, 55];
  D.BLOOD_VALUE = [120, 400, 1200];
  D.BLOOD_DUST = [30, 80, 200];
  D.BLOOD_RARITY = ['rare', 'magic', 'magic'];
  D.BLOOD_KINDS = {
    fury:   { name: 'Bloodstone of Fury',   color: '#c81e2e', w: ['critDmg', [28, 44, 90]],      a: ['str', [12, 20, 44]],       j: ['attackSpeed', [4, 7, 12]], x: ['armor', [-10, -25, -60]] },
    hunger: { name: 'Bloodstone of Hunger', color: '#8a1030', w: ['lifeSteal', [4, 6, 10]],      a: ['hpMax', [44, 80, 200]],    j: ['lifeOnKill', [6, 14, 30]], x: ['mpMax', [-10, -20, -40]] },
    greed:  { name: 'Bloodstone of Greed',  color: '#b8862a', w: ['goldFind', [28, 44, 90]],     a: ['magicFind', [14, 22, 48]], j: ['magicFind', [10, 16, 30]], x: ['resAll', [-3, -5, -8]] },
    storm:  { name: 'Bloodstone of Storms', color: '#7a3ad0', w: ['lightningDmg', [14, 26, 72]], a: ['dodge', [4, 6, 12]],       j: ['castSpeed', [4, 7, 12]],   x: ['moveSpeed', [2, 3, 5]] },
    night:  { name: 'Bloodstone of Night',  color: '#3a1a4a', w: ['poisonDmg', [14, 26, 72]],    a: ['vit', [12, 20, 44]],       j: ['int', [12, 20, 44]],       x: ['xpGain', [2, 3, 5]] },
  };

  D.GEMS = {};   // baseId -> { family: 'cut' | 'blood', kind, tier }
  Object.keys(D.GEM_KINDS).forEach(function (k) {
    for (let t = 0; t < 5; t++) D.GEMS['gem_' + k + '_' + (t + 1)] = { family: 'cut', kind: k, tier: t };
  });
  Object.keys(D.BLOOD_KINDS).forEach(function (k) {
    for (let t = 0; t < 3; t++) D.GEMS['blood_' + k + '_' + (t + 1)] = { family: 'blood', kind: k, tier: t };
  });
  D.gemKind = function (g) { return (g.family === 'blood' ? D.BLOOD_KINDS : D.GEM_KINDS)[g.kind]; };
  D.isPermanentGem = function (gem) { const g = gem && D.GEMS[gem.baseId]; return !!g && g.family === 'blood'; };
  D.gemHost = function (item) { return item.type === 'weapon' ? 'w' : item.type === 'jewelry' ? 'j' : 'a'; };
  // -> [{ stat, value }] for a gem item socketed into host
  D.gemEffects = function (gem, host) {
    const g = D.GEMS[gem.baseId];
    if (!g) return [];
    const k = D.gemKind(g), e = k[D.gemHost(host)];
    const out = [{ stat: e[0], value: e[1][g.tier] }];
    if (k.x) out.push({ stat: k.x[0], value: k.x[1][g.tier] });
    return out;
  };

  // ---- consumables & materials --------------------------------------------------------------------------
  D.CONSUMABLES = {
    potion_hp:   { name: 'Health Potion', icon: { shape: 'potion', color: '#e0303a', accent: '#ffd0d0' }, desc: 'Goes straight to your belt.', value: function (l) { return 3 + l; } },
    potion_mp:   { name: 'Mana Potion',   icon: { shape: 'potion', color: '#3a6ae0', accent: '#d0e0ff' }, desc: 'Goes straight to your belt.', value: function (l) { return 3 + l; } },
    flask_rejuv: { name: 'Rejuvenation Flask', rarity: 'uncommon', icon: { shape: 'potion', color: '#b65bff', accent: '#ffe45b' }, desc: 'Use: fully restores Life and Mana.', value: function (l) { return 15 + l * 3; } },
    tome_xp:     { name: 'Tome of Lessons', rarity: 'uncommon', icon: { shape: 'tome', color: '#3a8a6a', accent: '#ffe45b' }, desc: 'Use: grants a burst of experience.', value: function (l) { return 50 + l * 10; } },
    chisel:      { name: "Jeweler's Chisel", rarity: 'rare', icon: { shape: 'key', color: '#c8d0e0', accent: '#b65bff' }, desc: 'Use: cuts a new socket into an equipped item.', value: function (l) { return 150 + l * 15; } },
    tome_skill:  { name: 'Tome of Insight', rarity: 'legendary', icon: { shape: 'tome', color: '#e8d8a0', accent: '#b65bff' }, desc: 'Use: grants one skill point.', value: function (l) { return 400 + l * 20; } },
    trophy:      { name: "Champion's Trophy", rarity: 'rare', icon: { shape: 'skull', color: '#d9bd6a', accent: '#8a1a22' }, desc: 'A grisly prize. Worth good gold to any merchant.', value: function (l) { return 60 + l * 12; } },
  };
  D.MATERIALS = {
    mat_dust:    { key: 'dust',    name: 'Arcane Dust',   rarity: 'uncommon', icon: { shape: 'rune', color: '#8fb4ff', accent: '#ffffff' }, value: 2 },
    mat_shard:   { key: 'shard',   name: 'Ember Shard',   rarity: 'rare',  icon: { shape: 'rune', color: '#ffe45b', accent: '#ff8a2b' }, value: 12 },
    mat_essence: { key: 'essence', name: 'Abyssal Essence', rarity: 'magic', icon: { shape: 'rune', color: '#ff8a2b', accent: '#b65bff' }, value: 150 },
    mat_cls_warrior:     { key: 'forge_warrior',     name: 'Warbrand Ore',  rarity: 'rare', icon: { shape: 'rune', color: '#c8503a', accent: '#ffd0a0' }, value: 15, cls: 'warrior' },
    mat_cls_ranger:      { key: 'forge_ranger',      name: 'Hawkfeather',   rarity: 'rare', icon: { shape: 'rune', color: '#6ac86a', accent: '#e8ffd0' }, value: 15, cls: 'ranger' },
    mat_cls_sorcerer:    { key: 'forge_sorcerer',    name: 'Star Salt',     rarity: 'rare', icon: { shape: 'rune', color: '#6a8cff', accent: '#e0e8ff' }, value: 15, cls: 'sorcerer' },
    mat_cls_necromancer: { key: 'forge_necromancer', name: 'Grave Ash',     rarity: 'rare', icon: { shape: 'rune', color: '#8a6ac8', accent: '#e0d0ff' }, value: 15, cls: 'necromancer' },
    mat_rift:    { key: 'riftshard', name: 'Rift Shard', rarity: 'magic', icon: { shape: 'rune', color: '#ff6aa8', accent: '#2a0a1a' }, value: 40 },
  };

  // R7.4: the crafting material of each class (weapon upgrades, and armour of the class's weight), and the shared Rift Shard.
  D.CLASS_MATERIAL = { warrior: 'mat_cls_warrior', ranger: 'mat_cls_ranger', sorcerer: 'mat_cls_sorcerer', necromancer: 'mat_cls_necromancer' };
  // ---- class profiles (fallbacks; G.game.CLASSES overrides weaponTypes/primaryStat at runtime) ----------
  const BASE_W = {
    hpMax: 0.5, mpMax: 0.2, armor: 0.4, resAll: 4, resFire: 1, resCold: 1, resLightning: 1, resPoison: 1, dodge: 4, block: 3,
    moveSpeed: 3, hpRegen: 2, mpRegen: 2, magicFind: 1.5, goldFind: 0.4, xpGain: 1.2, pickupRadius: 2, lifeOnKill: 0.6, manaOnKill: 0.4,
    thorns: 0.25, str: 1, dex: 1, int: 1, vit: 2.5, allSkills: 30, cdr: 3, critChance: 5, critDmg: 1, lifeSteal: 6, manaSteal: 3,
    dmgPct: 2, skillDmgPct: 2, attackSpeed: 2, castSpeed: 1, dmgMin: 1.5, dmgMax: 1.5, fireDmg: 1.2, coldDmg: 1.2, lightningDmg: 1.2,
    poisonDmg: 1.2, dps: 4,
  };
  function weights(over) { return Object.assign({}, BASE_W, over); }
  D.CLASS = {
    warrior: { id: 'warrior', weapons: ['sword', 'axe', 'mace'], armor: 'heavy', offhand: ['shield'], primary: 'str', dead: ['int', 'castSpeed'], starter: ['sword_1', 'shield_1', 'heavy_chest_1'],
      weights: weights({ str: 3, dps: 6, dmgPct: 3, attackSpeed: 3, armor: 0.6, hpMax: 0.7, block: 4, int: 0.3, mpMax: 0.1, castSpeed: 0.2, skillDmgPct: 1.5 }) },
    ranger: { id: 'ranger', weapons: ['bow', 'dagger'], armor: 'light', offhand: [], primary: 'dex', dead: ['int', 'str', 'castSpeed'], starter: ['bow_1', 'light_chest_1'],
      weights: weights({ dex: 3, dps: 6, critChance: 7, critDmg: 1.5, attackSpeed: 3.5, dodge: 5, dmgPct: 3, int: 0.3, castSpeed: 0.3 }) },
    sorcerer: { id: 'sorcerer', weapons: ['staff', 'wand'], armor: 'cloth', offhand: ['orb', 'tome'], primary: 'int', dead: ['str', 'attackSpeed'], starter: ['staff_1', 'cloth_chest_1'],
      weights: weights({ int: 3, skillDmgPct: 4, castSpeed: 3, mpMax: 0.5, mpRegen: 4, cdr: 5, dps: 1.5, attackSpeed: 0.5, str: 0.3, dex: 0.3,
        fireDmg: 2, coldDmg: 2, lightningDmg: 2, dmgPct: 1, manaOnKill: 1 }) },
    necromancer: { id: 'necromancer', weapons: ['wand', 'dagger'], armor: 'cloth', offhand: ['tome', 'orb'], primary: 'int', dead: ['str', 'attackSpeed'], starter: ['wand_1', 'cloth_chest_1'],
      weights: weights({ int: 3, vit: 3, skillDmgPct: 3.5, allSkills: 45, castSpeed: 2.5, poisonDmg: 2.5, lifeOnKill: 1, manaOnKill: 1, dps: 2,
        mpRegen: 3, mpMax: 0.4, str: 0.3, dex: 0.5, dmgPct: 1 }) },
  };
  const BY_PRIMARY = { str: 'warrior', dex: 'ranger', int: 'sorcerer', vit: 'warrior' };

  // Resolve the loot profile for a player (never throws; unknown classes fall back sensibly).
  D.classProfile = function (player) {
    const id = String((player && player.classId) || '').toLowerCase();
    const gc = G.game && G.game.CLASSES && player && G.game.CLASSES[player.classId];
    let prof = D.CLASS[id];
    if (!prof) prof = D.CLASS[(gc && BY_PRIMARY[gc.primaryStat]) || 'warrior'];
    if (gc && Array.isArray(gc.weaponTypes) && gc.weaponTypes.length) {
      prof = Object.assign({}, prof, { weapons: gc.weaponTypes });
    }
    return prof;
  };
})();
