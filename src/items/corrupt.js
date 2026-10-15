// Loot & Economy — R6.5 the corrupted rift: corrupted drops and cleansing.
// Below depth ~8 nothing is corrupted; the chance climbs with depth. A corrupted piece of equipment (rare / magic) carries
//   * one STRONG upside affix (mod.corrupt = 'up', rolled at the top of its range and boosted),
//   * one DRAWBACK (mod.corrupt = 'down', a negative stat), and
//   * one LATENT affix kept hidden in item.latent (not counted, shown as ??? in the tooltip).
// Cleansing in town (blacksmith, I.cleanse) pays gem dust + Rift Shards + gold: the drawback goes, the latent affix is revealed
// and the upside settles to its normal strength. Worn uncleansed it is the raw-power gamble. Every player-facing word is in D.CORRUPT.
(function () {
  'use strict';
  const G = window.G;
  const I = G.items;
  const D = I.data;
  const C = G.C;

  // ---- data tables (rename freely; ids never change) ----
  D.CORRUPT = {
    prefix: 'Corrupted',            // item.name = prefix + ' ' + name while corrupt
    cleansedPrefix: 'Cleansed',     // ... and this once cleansed
    tag: 'Corrupted',               // tooltip tag lines
    cleansedTag: 'Cleansed',
    latentLine: '??? — a hidden strength, revealed by cleansing',
    drawbackTag: '  (corruption)',
    upsideTag: '  (corrupted power)',
    latentTag: '  (cleansed)',
    startDepth: 8,                  // first item level at which anything corrupts
    perLevel: 0.012,                // +1.2% per level past startDepth
    maxChance: 0.35,
    upsideBoost: 1.5,               // corrupted upside = boost x a top-quality roll; cleansing settles it to 1.0x
    source: { monster: 0.6, champion: 1, rare: 1.2, boss: 1.5, legendary: 1.5, chest: 1, barrel: 0.2, quest: 1, echo: 1.5 },
    cost: { gemdust: [8, 5], riftshard: [1, 25], goldMult: 2 },   // gemdust = 8 + ilvl/5, Rift Shards (mat_rift) = 1 + ilvl/25
    uniqueP: 0.00003,               // chance a corrupted drop is promoted to the Unique tier (overall stays below the Mythic rate, 0.002%)
    verb: 'Cleanse',
  };
  // Drawbacks: [min@1, max@1, min@60, max@60] — negative values.
  D.CORRUPT_DRAWBACKS = [
    { id: 'c_res',   stat: 'resAll',    range: [-3, -5, -8, -12] },
    { id: 'c_hp',    stat: 'hpMax',     range: [-8, -12, -45, -80] },
    { id: 'c_armor', stat: 'armor',     range: [-6, -10, -40, -80] },
    { id: 'c_move',  stat: 'moveSpeed', range: [-2, -3, -5, -8] },
    { id: 'c_mp',    stat: 'mpMax',     range: [-5, -8, -30, -55] },
    { id: 'c_gold',  stat: 'goldFind',  range: [-8, -12, -15, -25] },
    { id: 'c_mf',    stat: 'magicFind', range: [-3, -5, -8, -12] },
    { id: 'c_regen', stat: 'hpRegen',   range: [-1, -2, -6, -12] },
  ];

  const Q_TOP = function (u) { return 0.85 + 0.15 * u; };
  const Q_LATENT = function (u) { return 0.5 + 0.5 * u; };

  D.isCorrupt = function (item) { return !!item && item.corrupted === true && !item.cleansed; };

  // Chance that one piece of equipment drops corrupted. `source` scales it; `override` (0..1) replaces the depth curve.
  D.corruptChance = function (level, source, override) {
    const mult = D.CORRUPT.source[source] != null ? D.CORRUPT.source[source] : 1;
    if (typeof override === 'number') return Math.max(0, Math.min(1, override)) * mult;
    return Math.min(D.CORRUPT.maxChance, Math.max(0, (level - D.CORRUPT.startDepth) * D.CORRUPT.perLevel)) * mult;
  };

  function roundTo(v, step) { const x = Math.round(v / step) * step; return x === 0 ? (v < 0 ? -step : step) : x; }
  function stepOf(stat) {
    for (const a of D.AFFIXES) if (a.stats.some(function (s) { return s[0] === stat; })) return a.step || 1;
    return 1;
  }
  function tmpOf(item) {
    return { baseId: item.baseId, slot: item.slot, weaponType: item.weaponType, twoHanded: item.twoHanded, ilvl: item.ilvl, mods: [] };
  }

  // Corrupt a rare / epic piece of equipment in place. -> bool
  D.corrupt = function (item, rng) {
    rng = rng || G.rng.global;
    if (!D.isEquip(item) || item.corrupted || item.uniqueId || (item.rarity !== 'rare' && item.rarity !== 'magic')) return false;
    const used = {};
    for (const m of item.mods) used[m.stat] = true;
    const up = tmpOf(item);
    D.rollAffixes(up, 1, 9, rng, Q_TOP, used);
    if (!up.mods.length) return false;
    const lat = tmpOf(item);
    D.rollAffixes(lat, 1, 9, rng, Q_LATENT, used);
    const pool = D.CORRUPT_DRAWBACKS.filter(function (d) { return !used[d.stat]; });
    if (!pool.length) return false;
    const d = rng.pick(pool);
    const lo = D.lerp60(d.range[0], d.range[2], item.ilvl), hi = D.lerp60(d.range[1], d.range[3], item.ilvl);

    for (const m of up.mods) {
      item.mods.push({ stat: m.stat, value: roundTo(m.value * D.CORRUPT.upsideBoost, stepOf(m.stat)), corrupt: 'up', pure: m.value });
    }
    item.mods.push({ stat: d.stat, value: roundTo(lo + (hi - lo) * rng.next(), 1), corrupt: 'down' });
    if (lat.mods.length) item.latent = lat.mods.map(function (m) { return { stat: m.stat, value: m.value }; });
    item.corrupted = true;
    if (rng.chance(D.CORRUPT.uniqueP)) item.rarity = 'unique';     // R7.1: only a vanishingly rare corrupted piece reaches the red Unique tier
    item.name = D.CORRUPT.prefix + ' ' + item.name;
    item.value = D.itemValue(item);
    return true;
  };

  // corrupted gear sells for a little more
  const baseValue = D.itemValue;
  D.itemValue = function (item) {
    const v = baseValue(item);
    return D.isCorrupt(item) ? Math.round(v * 1.25) : v;
  };

  // ---- cleansing ----
  function P() { return D.ensure(G.state.player); }
  function hostOf(p, target) {
    if (target && typeof target === 'object') return target;
    return typeof target === 'number' ? p.inventory[target] : p.equipment[target];
  }

  // -> { gemdust, riftshard, gold } or null if the item is not corrupted. target = item, bag index or equipment slot.
  I.cleanseCost = function (target) {
    const p = G.state.player;
    const item = p && hostOf(p, target);
    if (!D.isCorrupt(item)) return null;
    const c = D.CORRUPT.cost;
    return { gemdust: c.gemdust[0] + Math.floor(item.ilvl / c.gemdust[1]), riftshard: c.riftshard[0] + Math.floor(item.ilvl / c.riftshard[1]),
      gold: Math.round((item.value || 1) * c.goldMult) };
  };

  I.cleanse = function (target) {
    const p = P();
    const item = p && hostOf(p, target);
    const cost = item ? I.cleanseCost(item) : null;
    if (!cost) return D.fail('That item is not corrupted');
    if ((p.materials.gemdust || 0) < cost.gemdust) return D.fail('Not enough gem dust');
    if ((p.materials.riftshard || 0) < cost.riftshard) return D.fail('Not enough ' + D.MATERIALS.mat_rift.name);
    if (p.gold < cost.gold) return D.fail('Not enough gold');
    p.materials.gemdust -= cost.gemdust;
    p.materials.riftshard -= cost.riftshard;
    D.addGold(p, -cost.gold, 'buy');
    item.mods = item.mods.filter(function (m) { return m.corrupt !== 'down'; });
    for (const m of item.mods) if (m.corrupt === 'up') { m.value = m.pure; delete m.pure; m.corrupt = 'pure'; }
    for (const m of item.latent || []) item.mods.push({ stat: m.stat, value: m.value, cleansed: true });
    delete item.latent;
    item.cleansed = true;
    if (item.name.indexOf(D.CORRUPT.prefix + ' ') === 0) item.name = D.CORRUPT.cleansedPrefix + ' ' + item.name.slice(D.CORRUPT.prefix.length + 1);
    item.value = D.itemValue(item);
    G.emit('sfx', { name: 'loot_rare' });
    D.toast(item.name + ' is cleansed', '#b98cff');
    G.emit('inventory:changed', {});
    for (const s of C.EQUIP_SLOTS) if (p.equipment[s] === item) D.equipChanged(p);
    return true;
  };
})();
