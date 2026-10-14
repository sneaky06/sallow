// Loot & Economy — prefix / suffix pools and the rare-name generator.
// R3.9 affix pass: every affix must be something the player can feel on the item it rolls on. Thorns and pickup radius are
// gone from the random pool, attributes only roll on gear of the matching archetype (no Strength on a wizard's robe), and
// regeneration / on-kill / flat-damage ranges were raised so a roll is visible against src/game's life and damage numbers.
(function () {
  'use strict';
  const G = window.G;
  const D = G.items.data;

  // Tags an affix can target: body slot ('helm'…), armour class ('heavy' | 'light' | 'cloth'), base family ('cloth_helm',
  // 'bow', …), weapons also 'weapon' + ('martial' | 'caster'), off-hands 'shield' | 'focus' (orb / tome).
  const ARM = ['helm', 'chest', 'gloves', 'boots', 'belt'];
  const JEW = ['ring', 'amulet'];
  const DEF = ARM.concat(['shield'], JEW, ['focus']);
  const STR_GEAR = ['sword', 'greatsword', 'axe', 'greataxe', 'mace', 'maul', 'heavy', 'shield', 'belt'].concat(JEW);
  const DEX_GEAR = ['bow', 'dagger', 'light', 'belt'].concat(JEW);
  const INT_GEAR = ['caster', 'cloth', 'focus'].concat(JEW);
  const VIT_GEAR = ARM.concat(['shield'], JEW);
  const MANA_GEAR = ['cloth_helm', 'cloth_chest', 'belt', 'amulet', 'ring', 'focus', 'caster'];

  D.AFFIXES = [];
  // range = [min@1, max@1, min@60, max@60]; stats = 'stat' or [[stat, factor], ...]; names = three tiers by ilvl.
  function A(id, kind, stats, range, on, names, w, opts) {
    D.AFFIXES.push(Object.assign({
      id: id, kind: kind, range: range, on: on, names: names, w: w, min: 1,
      stats: typeof stats === 'string' ? [[stats, 1]] : stats,
      grp: typeof stats === 'string' ? stats : stats[0][0],
    }, opts || {}));
  }

  // ---- prefixes ----
  A('p_dmgpct', 'prefix', 'dmgPct', [6, 12, 30, 60], ['weapon'], ['Jagged', 'Vicious', 'Merciless'], 10);
  A('p_dmgpct_j', 'prefix', 'dmgPct', [2, 5, 8, 16], ['ring', 'amulet', 'gloves'], ['Fierce', 'Savage', 'Brutal'], 4);
  A('p_flat', 'prefix', [['dmgMax', 1], ['dmgMin', 0.5]], [1, 3, 30, 60], ['weapon'], ['Sharp', 'Honed', 'Razor'], 8);
  A('p_flat_j', 'prefix', [['dmgMax', 1], ['dmgMin', 0.5]], [1, 2, 10, 22], ['ring', 'amulet', 'gloves'], ['Rough', 'Cruel', "Tyrant's"], 3);
  A('p_fire', 'prefix', 'fireDmg', [1, 4, 30, 65], ['weapon', 'ring', 'amulet', 'gloves'], ['Smoldering', 'Flaming', 'Infernal'], 4);
  A('p_cold', 'prefix', 'coldDmg', [1, 4, 30, 65], ['weapon', 'ring', 'amulet', 'gloves'], ['Chilled', 'Frozen', 'Glacial'], 4);
  A('p_light', 'prefix', 'lightningDmg', [1, 4, 30, 65], ['weapon', 'ring', 'amulet', 'gloves'], ['Static', 'Shocking', 'Tempest'], 4);
  A('p_pois', 'prefix', 'poisonDmg', [1, 4, 30, 65], ['weapon', 'ring', 'amulet', 'gloves'], ['Tainted', 'Venomous', 'Pestilent'], 4);
  A('p_armor', 'prefix', 'armor', [3, 8, 50, 110], ARM.concat(['shield']), ['Sturdy', 'Reinforced', 'Impenetrable'], 10);
  A('p_hp', 'prefix', 'hpMax', [5, 12, 90, 180], ARM.concat(['shield'], JEW), ['Hale', 'Stalwart', "Titan's"], 10);
  A('p_mp', 'prefix', 'mpMax', [4, 10, 40, 90], MANA_GEAR, ['Lucid', "Sage's", "Arcanist's"], 7);
  A('p_skill', 'prefix', 'skillDmgPct', [5, 10, 25, 50], ['caster', 'focus'], ["Apprentice's", "Adept's", "Archmage's"], 10);
  A('p_skill_j', 'prefix', 'skillDmgPct', [2, 4, 7, 14], ['cloth_helm', 'amulet', 'ring'], ['Mystic', 'Occult', 'Eldritch'], 4);
  A('p_allskills', 'prefix', 'allSkills', [1, 1, 1, 2], ['weapon', 'amulet', 'helm', 'focus'], ['Gifted', 'Masterful', 'Exalted'], 1.2, { min: 15, fixed: true });
  A('p_mf', 'prefix', 'magicFind', [4, 8, 12, 25], ['ring', 'amulet', 'helm', 'boots', 'gloves'], ['Lucky', 'Fortunate', 'Blessed'], 4);
  A('p_gf', 'prefix', 'goldFind', [10, 18, 30, 60], ['ring', 'amulet', 'boots', 'belt', 'gloves'], ['Gilded', 'Greedy', "Midas'"], 3);
  A('p_crit', 'prefix', 'critChance', [2, 3, 5, 10], ['weapon', 'gloves', 'ring', 'amulet'], ['Keen', 'Deadly', "Assassin's"], 6);
  A('p_dodge', 'prefix', 'dodge', [2, 3, 4, 8], ['light', 'boots'], ['Nimble', 'Elusive', 'Phantom'], 5);
  A('p_block', 'prefix', 'block', [2, 4, 6, 12], ['shield'], ['Guarding', 'Bulwark', 'Unyielding'], 8);

  // ---- suffixes ----
  A('s_str', 'suffix', 'str', [1, 3, 14, 30], STR_GEAR, ['of the Boar', 'of the Bear', 'of the Titan'], 6);
  A('s_dex', 'suffix', 'dex', [1, 3, 14, 30], DEX_GEAR, ['of the Fox', 'of the Hawk', 'of the Wind'], 6);
  A('s_int', 'suffix', 'int', [1, 3, 14, 30], INT_GEAR, ['of the Owl', 'of the Magus', 'of the Archmage'], 6);
  A('s_vit', 'suffix', 'vit', [1, 3, 14, 30], VIT_GEAR, ['of the Ox', 'of the Mammoth', 'of the Colossus'], 6);
  A('s_as', 'suffix', 'attackSpeed', [3, 6, 10, 20], ['martial', 'heavy_gloves', 'light_gloves', 'ring'], ['of the Wolf', 'of Haste', 'of Frenzy'], 7);
  A('s_cs', 'suffix', 'castSpeed', [3, 6, 10, 20], ['caster', 'focus', 'cloth_gloves', 'ring', 'amulet'], ['of Chanting', 'of Incantation', 'of the Tempest'], 6);
  A('s_critdmg', 'suffix', 'critDmg', [8, 15, 30, 60], ['weapon', 'amulet', 'ring', 'gloves'], ['of Pain', 'of Ruin', 'of Slaughter'], 5);
  A('s_ls', 'suffix', 'lifeSteal', [1, 2, 3, 6], ['weapon', 'ring', 'amulet'], ['of the Leech', 'of the Bat', 'of the Vampire'], 3, { fixed: true });
  A('s_ms', 'suffix', 'manaSteal', [1, 2, 3, 5], ['weapon', 'ring'], ['of the Siphon', 'of Draining', 'of the Void'], 2, { fixed: true });
  A('s_lok', 'suffix', 'lifeOnKill', [2, 4, 25, 55], ['weapon', 'gloves', 'belt', 'ring'], ['of Feasting', 'of the Reaper', 'of Devouring'], 4);
  A('s_mok', 'suffix', 'manaOnKill', [1, 3, 10, 22], ['caster', 'focus', 'cloth_helm', 'ring'], ['of Insight', 'of Clarity', 'of Epiphany'], 3);
  A('s_hpr', 'suffix', 'hpRegen', [1, 2, 10, 24], ['chest', 'belt', 'shield', 'amulet', 'ring'], ['of Mending', 'of Regrowth', 'of the Troll'], 4);
  A('s_mpr', 'suffix', 'mpRegen', [1, 2, 4, 9], MANA_GEAR, ['of Meditation', 'of Focus', 'of the Wellspring'], 4);
  A('s_resf', 'suffix', 'resFire', [8, 14, 18, 32], DEF, ['of Embers', 'of Flame', 'of the Phoenix'], 2.5);
  A('s_resc', 'suffix', 'resCold', [8, 14, 18, 32], DEF, ['of Frost', 'of Winter', 'of the Glacier'], 2.5);
  A('s_resl', 'suffix', 'resLightning', [8, 14, 18, 32], DEF, ['of Sparks', 'of Thunder', 'of the Storm'], 2.5);
  A('s_resp', 'suffix', 'resPoison', [8, 14, 18, 32], DEF, ['of the Adder', 'of the Viper', 'of the Hydra'], 2.5);
  A('s_resall', 'suffix', 'resAll', [3, 5, 8, 15], DEF, ['of Warding', 'of the Prism', 'of the Aegis'], 3, { min: 6 });
  A('s_move', 'suffix', 'moveSpeed', [4, 6, 10, 18], ['boots'], ['of Pacing', 'of Speed', 'of the Gale'], 12, { fixed: true });
  A('s_cdr', 'suffix', 'cdr', [2, 4, 5, 10], ['helm', 'amulet', 'caster', 'focus', 'ring'], ['of Alacrity', 'of Tempo', 'of Timelessness'], 3, { fixed: true });
  A('s_xp', 'suffix', 'xpGain', [3, 5, 6, 12], ['helm', 'amulet', 'ring'], ['of Learning', 'of Wisdom', 'of Enlightenment'], 2);

  D.itemTags = function (item) {
    const def = D.BASES[item.baseId] || {};
    if (item.slot === 'weapon') return ['weapon', (item.weaponType === 'staff' || item.weaponType === 'wand') ? 'caster' : 'martial', def.family];
    if (item.slot === 'offhand') return [def.offhandType === 'shield' ? 'shield' : 'focus'];
    return def.armorClass ? [item.slot, def.armorClass, def.family] : [item.slot];
  };

  const cache = {};
  D.affixesFor = function (item) {
    const tags = D.itemTags(item);
    const key = tags.join('|');
    if (!cache[key]) {
      cache[key] = D.AFFIXES.filter(function (a) {
        for (const t of tags) if (a.on.indexOf(t) >= 0) return true;
        return false;
      });
    }
    return cache[key];
  };

  // ---- rare / epic names: "<Grim word> <slot noun>" ----
  D.RARE_FIRST = ['Doom', 'Grim', 'Blood', 'Storm', 'Ash', 'Dread', 'Bone', 'Soul', 'Rune', 'Shadow', 'Ember', 'Plague', 'Wrath', 'Skull',
    'Havoc', 'Bitter', 'Carrion', 'Death', 'Hollow', 'Iron', 'Raven', 'Vile', 'Woe', 'Ghoul', 'Stone', 'Night', 'Blight', 'Cinder', 'Sorrow', 'Gloom'];
  D.RARE_SECOND = {
    sword: ['Edge', 'Blade', 'Fang', 'Song', 'Razor', 'Oath'], axe: ['Cleaver', 'Hew', 'Bite', 'Reaver', 'Splitter', 'Maw'],
    mace: ['Crusher', 'Knell', 'Breaker', 'Mallet', 'Star', 'Toll'], dagger: ['Fang', 'Needle', 'Sting', 'Whisper', 'Thorn', 'Kiss'],
    bow: ['String', 'Flight', 'Strike', 'Reach', 'Horn', 'Volley'], staff: ['Branch', 'Spire', 'Call', 'Pillar', 'Reach', 'Weaver'],
    wand: ['Whisper', 'Finger', 'Spark', 'Call', 'Thorn', 'Gnarl'], shield: ['Ward', 'Wall', 'Guard', 'Bastion', 'Aegis', 'Bulwark'],
    focus: ['Eye', 'Whisper', 'Lore', 'Heart', 'Gaze', 'Secret'], helm: ['Crown', 'Visage', 'Brow', 'Cowl', 'Mask', 'Horn'],
    chest: ['Shell', 'Hide', 'Shroud', 'Mantle', 'Carapace', 'Coat'], gloves: ['Grasp', 'Clutch', 'Touch', 'Fist', 'Hand', 'Claw'],
    boots: ['Tread', 'Stride', 'Trail', 'Spur', 'March', 'Track'], belt: ['Cord', 'Lash', 'Clasp', 'Girdle', 'Strap', 'Chain'],
    ring: ['Loop', 'Band', 'Coil', 'Circle', 'Knot', 'Spiral'], amulet: ['Heart', 'Eye', 'Torc', 'Talisman', 'Beads', 'Locket'],
  };
  D.rareName = function (item, rng) {
    const tags = D.itemTags(item);
    const key = item.slot === 'weapon' ? item.weaponType : tags[0];
    const second = D.RARE_SECOND[key] || D.RARE_SECOND.amulet;
    return rng.pick(D.RARE_FIRST) + ' ' + rng.pick(second);
  };
})();
