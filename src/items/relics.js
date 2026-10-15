// Loot & Economy — R7.10 the Fallen: relics of the ten corrupted adventurers. A relic is a permanent power, never an item: state.flags.relics
// is the array of relic ids claimed so far. Stat bonuses are added to G.items.getEquipmentMods automatically; the named combat
// `effect` ids are for the combat team (read them with G.items.getRelicEffects()). Holding all ten and combining them at the Elder
// (G.items.combineRelics()) pays a far larger one-off reward; partial sets give nothing extra.
// Names, texts and numbers are all data (D.RELICS_DATA); the story team renames the ids' people in docs/STORY.md / story_data.js.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;

  // id, name, class, depth, one-line story, permanent stats, combat effect id (null = stats only), effect text
  const LIST = [
    ['fallen_1', 'The First Lamplighter', 'warrior', 3, 'He lit the stair and never came back up it.', [['hpRegen', 3]], null, ''],
    ['fallen_2', 'Brannoc the Unbent', 'warrior', 9, 'Held the stair for forty days; his shield fused to his arm.', [['armor', 40], ['block', 3]], 'dash_shield_bash', 'Your dash ends in a shield bash that staggers enemies.'],
    ['fallen_3', 'The Ropewalker', 'ranger', 6, 'Descended on a rope and counted the knots wrong.', [['moveSpeed', 3]], null, ''],
    ['fallen_4', 'Wren Halloway, the Cartographer', 'ranger', 16, 'Maps the Deep by counting steps; her arrows are her own bone.', [['dex', 12], ['magicFind', 5]], 'dash_reload', 'Dashing reloads a free shot and the floor map opens on arrival.'],
    ['fallen_5', 'The Salt Witch', 'sorcerer', 13, 'Paid for passage with her name; it was not enough.', [['mpMax', 40], ['mpRegen', 2]], null, ''],
    ['fallen_6', 'The Penitent Sexton', 'necromancer', 19, 'Rang the bell for the dead until the dead rang back.', [['resPoison', 12], ['vit', 10]], null, ''],
    ['fallen_7', 'The Debt Collector', 'warrior', 21, 'Came to collect from the rift. The rift pays in kind.', [['goldFind', 15], ['critDmg', 10]], null, ''],
    ['fallen_8', 'Magister Ilse Varr', 'sorcerer', 24, 'Bottled rift heat to sell it; drank the first bottle.', [['fireDmg', 25], ['int', 12]], 'ramping_fire', 'Fire damage ramps up the longer a fight lasts.'],
    ['fallen_9', 'Old Tobiah Crane', 'necromancer', 28, 'The gravedigger who fetched the dead and stayed to lead them.', [['int', 10], ['hpMax', 60]], 'extra_minion', '+1 minion; your kills cannot be raised against you.'],
    ['fallen_10', 'The Last Candidate', 'ranger', 35, 'The Factor picked him last. He went furthest.', [['dmgPct', 8], ['xpGain', 5]], null, ''],
  ];
  D.RELICS_DATA = LIST;
  I.RELICS = {};
  LIST.forEach(function (r) {
    I.RELICS[r[0]] = { id: r[0], name: r[1], classId: r[2], depth: r[3], story: r[4], stats: r[5], effect: r[6], effectText: r[7] };
  });
  I.RELIC_IDS = LIST.map(function (r) { return r[0]; });

  // The combined reward at the Elder: a far bigger permanent power.
  I.RELICS_COMBINED = {
    name: 'Ember-Heir',
    title: 'Heir of the Fallen',
    story: 'Ten lives, carried by one.',
    stats: [['allSkills', 2], ['dmgPct', 25], ['hpMax', 300], ['resAll', 15], ['moveSpeed', 8], ['critChance', 5], ['xpGain', 10]],
    effect: 'ember_heir',
    effectText: 'The fallen fight beside you: a free burst of every relic power at the start of each fight.',
  };

  function flags() { return G.state.flags || (G.state.flags = {}); }
  function held() {
    const f = flags();
    if (!Array.isArray(f.relics)) f.relics = [];
    return f.relics;
  }

  I.hasRelic = function (id) { return held().indexOf(id) >= 0; };
  I.getRelics = function () { return held().slice(); };
  I.relicCount = function () { return held().length; };

  // Claim a relic (the combat team calls this when a fallen adventurer dies). -> bool (false if unknown or already held)
  I.grantRelic = function (id) {
    const r = I.RELICS[id];
    if (!r || I.hasRelic(id)) return false;
    held().push(id);
    G.emit('ui:toast', { text: 'Relic claimed: ' + r.name, color: '#ffe45b' });
    G.emit('sfx', { name: 'loot_legendary' });
    G.emit('relic:granted', { id: id, relic: r });
    recompute();
    return true;
  };

  I.canCombineRelics = function () { return !flags().relicsCombined && held().length >= I.RELIC_IDS.length && I.RELIC_IDS.every(I.hasRelic); };
  I.relicsCombined = function () { return !!flags().relicsCombined; };

  // At the Elder / shrine: fuse all ten. -> bool
  I.combineRelics = function () {
    if (!I.canCombineRelics()) return false;
    flags().relicsCombined = true;
    const t = I.RELICS_COMBINED;
    G.emit('ui:toast', { text: t.name + ': ' + t.title, color: '#ffe45b' });
    G.emit('sfx', { name: 'loot_legendary' });
    G.emit('relic:combined', { reward: t });
    recompute();
    return true;
  };

  function recompute() {
    const p = G.state.player;
    if (G.game && G.game.recomputeStats && p) { try { G.game.recomputeStats(p); } catch (err) { console.error('[items] recomputeStats', err); } }
    G.emit('player:stats', {});
  }

  // Permanent stat bonuses -> { stat: value }
  I.getRelicMods = function () {
    const out = {};
    function add(list) { for (const s of list || []) out[s[0]] = (out[s[0]] || 0) + s[1]; }
    held().forEach(function (id) { if (I.RELICS[id]) add(I.RELICS[id].stats); });
    if (flags().relicsCombined) add(I.RELICS_COMBINED.stats);
    return out;
  };

  // Combat effect ids from held relics -> { effectId: true } (same shape as G.items.getActiveEffects)
  I.getRelicEffects = function () {
    const out = {};
    held().forEach(function (id) { const r = I.RELICS[id]; if (r && r.effect) out[r.effect] = true; });
    if (flags().relicsCombined) out[I.RELICS_COMBINED.effect] = true;
    return out;
  };

  D.PERM_MODS.push(function () { return I.getRelicMods(); });
})();
