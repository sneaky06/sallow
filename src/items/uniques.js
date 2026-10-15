// Loot & Economy — hand-authored Elite uniques (rarity key 'legendary'), Mythics (one effect each) and item sets.
// Mod values are authored for item level 60: [stat, min, max]. Flat stats (see data.FLAT) scale with the drop's
// item level, percentages do not. `rand` = extra random affixes rolled on top.
(function () {
  'use strict';
  const G = window.G;
  const D = G.items.data;

  D.UNIQUES = {};
  D.UNIQUE_LIST = [];
  function U(id, name, rarity, family, cls, min, mods, flavor, extra) {
    const u = Object.assign({ id: id, name: name, rarity: rarity, family: family, cls: cls, min: min, mods: mods, flavor: flavor }, extra || {});
    D.UNIQUES[id] = u;
    D.UNIQUE_LIST.push(u);
  }
  const L = 'legendary', M = 'mythic';

  // ---- Warrior ----
  U('oathkeeper', 'Oathkeeper', L, 'sword', 'warrior', 8,
    [['dmgPct', 60, 90], ['str', 25, 40], ['block', 8, 12], ['lifeSteal', 3, 5]],
    'Sworn on the ashes of Emberfall. It remembers.', { color: '#e8e0c8', accent: '#ff8a2b' });
  U('gorehowl', 'Gorehowl', L, 'greataxe', 'warrior', 18,
    [['dmgPct', 90, 140], ['critDmg', 60, 100], ['lifeOnKill', 30, 50], ['moveSpeed', 8, 12]],
    'It screams when it is hungry. It is always hungry.', { color: '#a82a2a', accent: '#2a1a1a' });
  U('anvils_verdict', "The Anvil's Verdict", L, 'maul', 'warrior', 26,
    [['dmgPct', 100, 150], ['armor', 80, 140], ['lifeOnKill', 40, 70], ['vit', 25, 40]],
    'Judgement is heavy.', { color: '#6a6a78', accent: '#ffb347' });
  U('last_gate', 'Bulwark of the Last Gate', L, 'shield', 'warrior', 14,
    [['armor', 120, 200], ['block', 12, 18], ['resAll', 12, 20], ['hpRegen', 14, 24], ['hpMax', 100, 160]],
    'Held by the last man standing. Still held.', { color: '#8a8fa0', accent: '#ffe45b' });
  U('juggernaut', 'Juggernaut Plate', L, 'heavy_chest', 'warrior', 30,
    [['armor', 200, 300], ['hpMax', 180, 260], ['vit', 30, 45], ['hpRegen', 12, 20], ['resAll', 10, 16]],
    'The wall that walks.', { color: '#4a4a58', accent: '#ff5b2b' });
  U('warlords_grip', "Warlord's Grip", L, 'heavy_gloves', 'warrior', 12,
    [['attackSpeed', 18, 28], ['str', 20, 32], ['dmgPct', 15, 25], ['critChance', 5, 8]],
    'A thousand banners fell to these hands.', { color: '#8a2a2a', accent: '#d9bd6a' });

  // ---- Ranger ----
  U('widowmaker', 'Widowmaker', L, 'bow', 'ranger', 10,
    [['dmgPct', 60, 90], ['critChance', 10, 16], ['critDmg', 60, 100], ['dex', 25, 40]],
    'One arrow. One widow.', { color: '#2a2a32', accent: '#ff3b4e' });
  U('stormstring', 'Stormstring', L, 'bow', 'ranger', 28,
    [['lightningDmg', 50, 90], ['attackSpeed', 20, 32], ['dmgPct', 50, 80], ['manaOnKill', 10, 18]],
    'The sky leans closer when it is drawn.', { color: '#5b8cff', accent: '#ffffff' });
  U('vipers_kiss', "Viper's Kiss", L, 'dagger', 'ranger', 16,
    [['poisonDmg', 50, 90], ['attackSpeed', 20, 30], ['critChance', 8, 12], ['lifeSteal', 3, 5]],
    'You will not feel it. Then you will feel nothing.', { color: '#3ddc6a', accent: '#1a3a22' });
  U('windrunners', 'Windrunner Boots', L, 'light_boots', 'ranger', 8,
    [['moveSpeed', 22, 30], ['dodge', 8, 12], ['dex', 20, 32], ['pickupRadius', 1.5, 2.5]],
    'The ground barely notices.', { color: '#9ad0c8', accent: '#ffffff' });
  U('hawkeye', 'Hawkeye Hood', L, 'light_helm', 'ranger', 20,
    [['critChance', 8, 12], ['critDmg', 40, 70], ['dex', 20, 35], ['magicFind', 15, 25]],
    'Nothing escapes. Nothing is missed.', { color: '#7a5a3a', accent: '#ffd94a' });
  U('shadowstep', 'Shadowstep Jerkin', L, 'light_chest', 'ranger', 34,
    [['dodge', 12, 18], ['moveSpeed', 8, 12], ['hpMax', 120, 180], ['attackSpeed', 10, 16], ['resAll', 8, 14]],
    'Where you were is where they strike.', { color: '#2a2a3a', accent: '#8a5fd0' });

  // ---- Sorcerer ----
  U('first_flame', 'Pyre of the First Flame', L, 'staff', 'sorcerer', 12,
    [['fireDmg', 60, 110], ['skillDmgPct', 60, 90], ['castSpeed', 15, 25], ['int', 30, 45]],
    'Every fire since has been its echo.', { color: '#ff5b2b', accent: '#ffe45b' });
  U('wintersbite', 'Wintersbite', L, 'wand', 'sorcerer', 18,
    [['coldDmg', 45, 80], ['skillDmgPct', 40, 60], ['cdr', 8, 12], ['mpMax', 80, 130]],
    'Cut from a glacier that never learned to melt.', { color: '#9adfff', accent: '#ffffff' });
  U('eye_tempest', 'Eye of the Tempest', L, 'orb', 'sorcerer', 24,
    [['lightningDmg', 40, 75], ['skillDmgPct', 25, 40], ['castSpeed', 15, 22], ['critChance', 6, 10], ['mpRegen', 6, 10]],
    'Calm at the centre. Ruin everywhere else.', { color: '#5b6cff', accent: '#ffe45b' });
  U('archmagi', 'Crown of the Archmagi', L, 'cloth_helm', 'sorcerer', 30,
    [['allSkills', 2, 3], ['int', 28, 42], ['cdr', 10, 15], ['mpMax', 100, 160]],
    'Seven wore it. Seven went mad. Worth it.', { color: '#d9bd6a', accent: '#5b8cff' });
  U('infinite_robe', 'Robe of the Infinite', L, 'cloth_chest', 'sorcerer', 36,
    [['mpMax', 180, 260], ['mpRegen', 12, 18], ['skillDmgPct', 25, 40], ['resAll', 12, 18]],
    'Its pockets are deeper than the dungeon.', { color: '#2a2a6a', accent: '#c8d0ff' });

  // ---- Necromancer ----
  U('marrowgrinder', 'Marrowgrinder', L, 'wand', 'necromancer', 10,
    [['allSkills', 1, 2], ['poisonDmg', 35, 65], ['lifeOnKill', 30, 50], ['skillDmgPct', 35, 55]],
    'Ground from the bones of its last master.', { color: '#e8e0c8', accent: '#3ddc6a' });
  U('unburied', 'Tome of the Unburied', L, 'tome', 'necromancer', 16,
    [['allSkills', 2, 2], ['int', 22, 35], ['manaOnKill', 14, 22], ['cdr', 8, 12]],
    'The names in it are not yet dead.', { color: '#3a2a3a', accent: '#3ddc6a' });
  U('deathwhisper', 'Deathwhisper', L, 'dagger', 'necromancer', 22,
    [['lifeSteal', 5, 8], ['manaSteal', 4, 6], ['poisonDmg', 40, 70], ['critDmg', 50, 80], ['int', 20, 30]],
    'It tells you who is next.', { color: '#5a2f8a', accent: '#c8ff8a' });
  U('pale_king', 'Shroud of the Pale King', L, 'cloth_chest', 'necromancer', 32,
    [['vit', 30, 45], ['hpMax', 150, 220], ['allSkills', 1, 2], ['resPoison', 30, 45], ['hpRegen', 14, 24]],
    'He was buried in it. Twice.', { color: '#c8c8d8', accent: '#5a2f8a' });
  U('gravedigger', "Gravedigger's Mitts", L, 'cloth_gloves', 'necromancer', 8,
    [['lifeOnKill', 30, 50], ['manaOnKill', 12, 20], ['castSpeed', 14, 22], ['vit', 18, 28]],
    'Honest work. Mostly.', { color: '#5a4a3a', accent: '#8a8474' });

  // ---- Any class ----
  U('hoarder', 'Ring of the Hoarder', L, 'ring', null, 6,
    [['magicFind', 25, 40], ['goldFind', 60, 100], ['pickupRadius', 1.5, 2.5]],
    'Mine. Mine. Mine.', { color: '#ffd94a', accent: '#3ddc6a' });
  U('bloodstone', 'Bloodstone Band', L, 'ring', null, 20,
    [['lifeSteal', 4, 6], ['hpMax', 100, 160], ['dmgPct', 15, 25], ['hpRegen', 10, 16]],
    'Warm to the touch. Do not ask why.', { color: '#8a1a22', accent: '#ff3b4e' });
  U('compass', "Wanderer's Compass", L, 'amulet', null, 10,
    [['xpGain', 12, 20], ['moveSpeed', 8, 12], ['magicFind', 12, 20], ['resAll', 8, 14]],
    'It points down.', { color: '#b87333', accent: '#7fd4ff' });
  U('mountain_heart', 'Heart of the Mountain', L, 'amulet', null, 30,
    [['hpMax', 180, 260], ['armor', 100, 160], ['vit', 25, 40], ['resAll', 12, 18]],
    'Stone does not bleed. Neither will you.', { color: '#6a6a78', accent: '#ff8a2b' });
  U('giants_girdle', 'Girdle of Giants', L, 'belt', null, 22,
    [['str', 30, 45], ['vit', 30, 45], ['hpMax', 120, 180], ['dmgPct', 12, 20]],
    'One size fits none.', { color: '#7a5a3a', accent: '#d9bd6a' });
  U('emberwalkers', 'Emberwalkers', L, 'heavy_boots', null, 16,
    [['moveSpeed', 14, 20], ['resFire', 35, 50], ['fireDmg', 25, 45], ['armor', 70, 120]],
    'Leave footprints that smoulder.', { color: '#3a2a2a', accent: '#ff5b2b' });

  // ---- Mythic effects (R2.2). Behaviour lives in src/game keyed by id; this is the tooltip text. ----
  G.items.EFFECTS = {
    split_shot:   { name: 'Split Shot',   desc: 'Your projectiles split into 2 extra projectiles (50% damage) on their first hit.' },
    corpse_blast: { name: 'Corpse Blast', desc: 'Enemies you kill explode for 25% of their max life as fire within 2.5 tiles. Chains.' },
    chain_spark:  { name: 'Chain Spark',  desc: 'Hits have a 25% chance to arc lightning to 3 nearby enemies for 40% of the hit.' },
    second_wind:  { name: 'Second Wind',  desc: 'Fatal damage instead heals you to 50% life and stuns nearby enemies. 120 s cooldown.' },
    echo_cast:    { name: 'Echo Cast',    desc: 'Active skills have a 25% chance to fire a second time for free.' },
    blood_price:  { name: 'Blood Price',  desc: 'Skills cost life instead of mana and deal 40% more damage.' },
    midas:        { name: 'Midas Touch',  desc: 'Picking up gold heals 2% life and grants +5% damage for 6 s, stacking to 10.' },
    frozen_wake:  { name: 'Frozen Wake',  desc: 'Moving leaves a frost trail for 3 s that chills and damages enemies standing in it.' },
    legion:       { name: 'Legion',       desc: '+2 maximum summons. Without summons, a spectral double repeats your basic attacks for 50% damage.' },
    thunderstep:  { name: 'Thunderstep',  desc: 'Every 4th basic attack calls a lightning bolt on the target for 200% weapon damage within 1.5 tiles.' },
    executioner:  { name: 'Executioner',  desc: 'Enemies below 15% life (5% for bosses) die instantly when you hit them.' },
    hoarder:      { name: 'Dragon Hoard', desc: '+1% damage per 100 gold carried, up to +60%. The gold is at risk on death like any other.' },
  };

  // ---- Mythics: exactly one effect each, every effect used once. Elites above are stats only. ----
  U('worldsplitter', 'Worldsplitter', M, 'greatsword', 'warrior', 40,
    [['dmgPct', 180, 250], ['critDmg', 100, 150], ['attackSpeed', 20, 30], ['lifeSteal', 6, 9], ['str', 50, 70], ['allSkills', 2, 3]],
    'There was one world, once.', { effect: 'executioner', rand: 2, sockets: 2, color: '#ffe8c8', accent: '#ff3b4e' });
  U('skyhammer', 'Skyhammer', M, 'mace', 'warrior', 35,
    [['dmgPct', 150, 210], ['lightningDmg', 70, 120], ['attackSpeed', 22, 32], ['str', 45, 65], ['block', 8, 12], ['resLightning', 40, 60]],
    'It does not fall. The sky comes down to meet it.', { effect: 'thunderstep', rand: 2, sockets: 1, color: '#c8d8ff', accent: '#ff3b4e' });
  U('aeris', 'Last Breath of Aeris', M, 'bow', 'ranger', 40,
    [['dmgPct', 150, 210], ['critChance', 18, 25], ['critDmg', 120, 170], ['attackSpeed', 25, 35], ['dex', 50, 70], ['moveSpeed', 10, 15]],
    'She loosed it at a god. The god is gone.', { effect: 'split_shot', rand: 2, sockets: 2, color: '#c8fff0', accent: '#ff3b4e' });
  U('rimewalkers', 'Rimewalkers', M, 'light_boots', 'ranger', 35,
    [['moveSpeed', 26, 34], ['coldDmg', 50, 90], ['dodge', 12, 18], ['dex', 40, 60], ['resCold', 40, 60], ['hpMax', 150, 220]],
    'Winter follows. It has no choice.', { effect: 'frozen_wake', rand: 2, sockets: 1, color: '#d8f4ff', accent: '#ff3b4e' });
  U('stormfang', 'Stormfang', M, 'dagger', 'ranger', 40,
    [['dmgPct', 140, 190], ['lightningDmg', 60, 110], ['attackSpeed', 28, 38], ['critChance', 14, 20], ['dex', 40, 60], ['manaSteal', 5, 8]],
    'One bite. The thunder does the rest.', { effect: 'chain_spark', rand: 2, sockets: 1, color: '#fff06a', accent: '#ff3b4e' });
  U('ashen_covenant', 'Ashen Covenant', M, 'staff', 'sorcerer', 40,
    [['skillDmgPct', 120, 170], ['fireDmg', 80, 130], ['coldDmg', 80, 130], ['lightningDmg', 80, 130], ['castSpeed', 25, 35], ['allSkills', 3, 4], ['cdr', 12, 18]],
    'Three elements signed. The fourth was burned.', { effect: 'echo_cast', rand: 2, sockets: 2, color: '#3a3a48', accent: '#ff3b4e' });
  U('cinderlord', "Cinderlord's Mantle", M, 'cloth_chest', 'sorcerer', 40,
    [['skillDmgPct', 50, 75], ['fireDmg', 70, 120], ['int', 45, 65], ['mpMax', 200, 300], ['hpMax', 180, 260], ['resFire', 40, 60]],
    'Everything he touched became kindling. Then everything near it.', { effect: 'corpse_blast', rand: 2, sockets: 2, color: '#ff5b2b', accent: '#ff3b4e' });
  U('lich_emperor', 'Crown of the Lich Emperor', M, 'cloth_helm', 'necromancer', 40,
    [['allSkills', 4, 5], ['int', 45, 65], ['vit', 45, 65], ['lifeOnKill', 60, 90], ['manaOnKill', 30, 45], ['cdr', 12, 18], ['skillDmgPct', 40, 60]],
    'He abdicated nothing. He is merely waiting.', { effect: 'legion', rand: 2, sockets: 1, color: '#e8e0c8', accent: '#ff3b4e' });
  U('sanguine_pact', 'The Sanguine Pact', M, 'wand', 'necromancer', 35,
    [['skillDmgPct', 90, 130], ['lifeSteal', 7, 10], ['vit', 50, 70], ['hpMax', 220, 320], ['hpRegen', 20, 30], ['allSkills', 2, 3]],
    'Signed in the only ink that matters.', { effect: 'blood_price', rand: 2, sockets: 1, color: '#8a1030', accent: '#ff3b4e' });
  U('emberdeep_heart', 'Heart of ' + D.GAME_NAME, M, 'amulet', null, 40,       // id kept for old saves
    [['allSkills', 3, 4], ['dmgPct', 40, 60], ['skillDmgPct', 40, 60], ['resAll', 20, 30], ['hpMax', 200, 300], ['hpRegen', 15, 25]],
    'The mountain has a pulse. You are wearing it.', { effect: 'second_wind', rand: 2, sockets: 1, color: '#ff5b2b', accent: '#ffe45b' });
  U('fortunes_fool', "Fortune's Fool", M, 'ring', null, 30,
    [['magicFind', 60, 90], ['goldFind', 120, 180], ['xpGain', 15, 25], ['critChance', 8, 12]],
    'Luck is a debt. It always collects.', { effect: 'midas', rand: 2, sockets: 1, color: '#ffd94a', accent: '#ff3b4e' });
  U('wyrmhoard', 'Wyrmhoard Cinch', M, 'belt', null, 35,
    [['goldFind', 100, 150], ['dmgPct', 30, 45], ['str', 30, 45], ['dex', 30, 45], ['int', 30, 45], ['hpMax', 180, 260], ['armor', 120, 180]],
    'A dragon sleeps on its gold for a reason.', { effect: 'hoarder', rand: 2, sockets: 1, color: '#b8862a', accent: '#ff3b4e' });

  // ---- Rift items (R7.1): the rarest drops, item level 21+, stats only, one per archetype. Names are placeholders for the story team. ----
  const R = 'rift';
  U('rift_maw', 'Maw of the Rift', R, 'greatsword', 'warrior', 21,
    [['dmgPct', 220, 300], ['critDmg', 120, 180], ['attackSpeed', 24, 34], ['lifeSteal', 7, 10], ['str', 60, 85], ['allSkills', 3, 4]],
    'It has been chewing since before the town.', { rand: 2, sockets: 2, color: '#ff6aa8', accent: '#2a0a1a' });
  U('rift_thread', 'Thread of the Deep', R, 'bow', 'ranger', 21,
    [['dmgPct', 190, 260], ['critChance', 20, 28], ['critDmg', 140, 200], ['attackSpeed', 28, 38], ['dex', 60, 85], ['moveSpeed', 12, 18]],
    'Drawn tight across a mile of nothing.', { rand: 2, sockets: 2, color: '#ff6aa8', accent: '#2a0a1a' });
  U('rift_lantern', 'Lantern of the Hollow Star', R, 'staff', 'sorcerer', 21,
    [['skillDmgPct', 150, 210], ['fireDmg', 100, 160], ['coldDmg', 100, 160], ['lightningDmg', 100, 160], ['castSpeed', 28, 38], ['allSkills', 4, 5], ['cdr', 14, 20]],
    'It does not give light. It gives sight.', { rand: 2, sockets: 2, color: '#ff6aa8', accent: '#2a0a1a' });
  U('rift_vestment', 'Vestment of the Ninth Hour', R, 'cloth_chest', 'necromancer', 21,
    [['skillDmgPct', 70, 100], ['poisonDmg', 90, 140], ['int', 60, 85], ['mpMax', 260, 380], ['hpMax', 240, 340], ['resAll', 18, 26]],
    'Worn by the last gravedigger, and by what he dug up.', { rand: 2, sockets: 2, color: '#ff6aa8', accent: '#2a0a1a' });
  U('rift_bulwark', 'Bulwark of Nothing', R, 'shield', 'warrior', 21,
    [['armor', 260, 380], ['block', 16, 22], ['resAll', 22, 32], ['hpRegen', 24, 38], ['hpMax', 220, 320], ['vit', 40, 60]],
    'It stops everything, including light.', { rand: 2, sockets: 2, color: '#ff6aa8', accent: '#2a0a1a' });
  U('rift_signet', 'Signet of the Heartbeat', R, 'ring', null, 21,
    [['dmgPct', 40, 60], ['critChance', 8, 12], ['lifeOnKill', 60, 90], ['magicFind', 40, 60], ['allSkills', 2, 3], ['resAll', 12, 18]],
    'You hear it before you see it.', { rand: 2, sockets: 1, color: '#ff6aa8', accent: '#2a0a1a' });

  // ---- Sets: five pieces each, bonuses at 2 / 3 / 4 equipped (cumulative) ----
  D.SETS = {};
  D.SET_MIN_ILVL = 12;
  function S(id, name, cls, color, pieces, bonuses) {
    D.SETS[id] = { id: id, name: name, cls: cls, pieces: pieces.map(function (p) { return p[0]; }), bonuses: bonuses };
    pieces.forEach(function (p) {
      U(p[0], p[1], 'set', p[2], cls, D.SET_MIN_ILVL, p[3], null, { setId: id, rand: 1, color: color, accent: '#3ddc6a' });
    });
  }

  S('ironbound', 'Ironbound Oath', 'warrior', '#7a8494', [
    ['ironbound_helm', 'Ironbound Visage', 'heavy_helm', [['armor', 80, 130], ['str', 18, 28], ['hpMax', 80, 120]]],
    ['ironbound_chest', 'Ironbound Cuirass', 'heavy_chest', [['armor', 150, 220], ['vit', 22, 34], ['hpMax', 120, 170]]],
    ['ironbound_gloves', 'Ironbound Fists', 'heavy_gloves', [['str', 18, 28], ['attackSpeed', 10, 16], ['armor', 50, 80]]],
    ['ironbound_boots', 'Ironbound March', 'heavy_boots', [['moveSpeed', 10, 15], ['vit', 16, 26], ['armor', 60, 90]]],
    ['ironbound_shield', 'Ironbound Rampart', 'shield', [['block', 8, 12], ['armor', 90, 140], ['resAll', 8, 12]]],
  ], {
    2: [['block', 8], ['resAll', 10]],
    3: [['dmgPct', 30], ['lifeSteal', 3]],
    4: [['allSkills', 2], ['attackSpeed', 20], ['critDmg', 50]],
  });

  S('nightstalker', "Nightstalker's Guise", 'ranger', '#3a3350', [
    ['nightstalker_hood', "Nightstalker's Gaze", 'light_helm', [['dex', 18, 28], ['critChance', 5, 8]]],
    ['nightstalker_jerkin', "Nightstalker's Shade", 'light_chest', [['dex', 22, 34], ['dodge', 6, 10], ['hpMax', 90, 140]]],
    ['nightstalker_gloves', "Nightstalker's Draw", 'light_gloves', [['attackSpeed', 12, 18], ['critDmg', 30, 50]]],
    ['nightstalker_boots', "Nightstalker's Prowl", 'light_boots', [['moveSpeed', 14, 20], ['dodge', 5, 8]]],
    ['nightstalker_bow', "Nightstalker's Whisper", 'bow', [['dmgPct', 60, 90], ['dex', 20, 30], ['critChance', 6, 10]]],
  ], {
    2: [['dodge', 8], ['moveSpeed', 10]],
    3: [['critChance', 10], ['attackSpeed', 15]],
    4: [['allSkills', 2], ['critDmg', 80], ['dmgPct', 25]],
  });

  S('cinderweave', 'Cinderweave Regalia', 'sorcerer', '#c84a2a', [
    ['cinderweave_cowl', 'Cinderweave Cowl', 'cloth_helm', [['int', 18, 28], ['mpMax', 80, 120]]],
    ['cinderweave_robe', 'Cinderweave Robe', 'cloth_chest', [['int', 22, 34], ['mpMax', 110, 160], ['hpMax', 80, 120]]],
    ['cinderweave_wraps', 'Cinderweave Wraps', 'cloth_gloves', [['castSpeed', 12, 18], ['fireDmg', 20, 35]]],
    ['cinderweave_orb', 'Cinderweave Ember', 'orb', [['skillDmgPct', 25, 40], ['mpRegen', 5, 8]]],
    ['cinderweave_amulet', 'Cinderweave Sigil', 'amulet', [['skillDmgPct', 15, 25], ['int', 16, 26], ['resAll', 8, 12]]],
  ], {
    2: [['castSpeed', 12], ['resAll', 8]],
    3: [['skillDmgPct', 35], ['cdr', 8]],
    4: [['allSkills', 2], ['skillDmgPct', 25], ['critChance', 8]],
  });

  S('gravecaller', "Gravecaller's Vestments", 'necromancer', '#4a5a4a', [
    ['gravecaller_helm', "Gravecaller's Skullcap", 'cloth_helm', [['int', 16, 26], ['vit', 16, 26]]],
    ['gravecaller_chest', "Gravecaller's Shroud", 'cloth_chest', [['vit', 22, 34], ['hpMax', 110, 160], ['resPoison', 25, 40]]],
    ['gravecaller_boots', "Gravecaller's Tread", 'cloth_boots', [['moveSpeed', 10, 15], ['lifeOnKill', 20, 35]]],
    ['gravecaller_tome', "Gravecaller's Ledger", 'tome', [['skillDmgPct', 20, 35], ['manaOnKill', 10, 16], ['int', 16, 26]]],
    ['gravecaller_ring', "Gravecaller's Knuckle", 'ring', [['poisonDmg', 20, 35], ['cdr', 5, 8], ['mpMax', 50, 80]]],
  ], {
    2: [['allSkills', 1], ['resPoison', 30]],
    3: [['skillDmgPct', 25], ['lifeSteal', 3], ['cdr', 6]],
    4: [['allSkills', 2], ['castSpeed', 20], ['xpGain', 10]],
  });

  S('heirlooms', 'Emberfall Heirlooms', null, '#d9bd6a', [
    ['heirloom_amulet', 'Heirloom Locket', 'amulet', [['magicFind', 12, 20], ['hpMax', 80, 120]]],
    ['heirloom_signet', 'Heirloom Signet', 'ring', [['goldFind', 30, 50], ['critChance', 4, 7]]],
    ['heirloom_seal', 'Heirloom Seal', 'ring', [['magicFind', 10, 16], ['resAll', 8, 12]]],
    ['heirloom_belt', 'Heirloom Sash', 'belt', [['hpMax', 90, 140], ['goldFind', 30, 50], ['vit', 14, 22]]],
  ], {
    2: [['magicFind', 20], ['goldFind', 40]],
    3: [['xpGain', 10], ['resAll', 10]],
    4: [['allSkills', 1], ['magicFind', 30], ['moveSpeed', 10]],
  });
})();
