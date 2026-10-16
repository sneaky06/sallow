// R12 milestones: lifetime counters (state.flags.stats), tiers per counter, a reward per tier (gold, materials, a Mark at the big tiers and
// a small permanent bonus), a toast when one is reached, and a Milestones page in the Journal. The table below is data; the story team may
// rename / re-describe entries through meta.STORY.MILESTONES (matched by id: name, desc, names[] per tier) without touching this file.
// API: G.meta.getMilestones(), G.meta.getMilestoneMods() -> { stat: value } (combat adds it in recomputeStats), G.meta.addStat(key, n),
// event 'milestone:reached' { id, tier, reward }.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui, meta = G.meta = G.meta || {};
  const TX = ui.S;
  const h = ui._h, fmt = ui._fmt;

  // id, name, description, counter, tier thresholds, permanent bonus per tier [stat, value]
  const DEFS = [
    { id: 'kills', name: 'Gravedigger', desc: TX.common.foesSlain, stat: 'kills', tiers: [10, 50, 250, 1000, 5000, 20000], mod: ['dmgPct', 1] },
    { id: 'elites', name: 'Giant Killer', desc: TX.milestones.championsRaresAndLegendaries, stat: 'elites', tiers: [2, 5, 25, 100, 400, 1500], mod: ['critDmg', 2] },
    { id: 'bosses', name: 'Oathbreaker', desc: TX.milestones.bossesSlain, stat: 'bosses', tiers: [1, 3, 8, 15, 40], mod: ['hpMax', 20] },
    { id: 'chests', name: 'Grave Robber', desc: TX.milestones.chestsOpened, stat: 'chests', tiers: [5, 10, 50, 200, 800], mod: ['magicFind', 2] },
    { id: 'goldEarned', name: 'Hoard', desc: TX.milestones.goldEarned, stat: 'goldEarned', tiers: [200, 1000, 10000, 100000, 1000000, 10000000], mod: ['goldFind', 1] },
    { id: 'goldSpent', name: 'Big Spender', desc: TX.milestones.goldSpent, stat: 'goldSpent', tiers: [500, 1000, 10000, 100000, 1000000], mod: null },
    { id: 'itemsSold', name: 'Peddler', desc: TX.milestones.itemsSold, stat: 'itemsSold', tiers: [5, 10, 100, 500, 2000], mod: ['goldFind', 1] },
    { id: 'itemsSalvaged', name: 'Scrapper', desc: TX.milestones.itemsSalvaged, stat: 'itemsSalvaged', tiers: [5, 10, 100, 500, 2000], mod: ['xpGain', 1] },
    { id: 'itemsSent', name: 'Chute Runner', desc: TX.milestones.itemsSentUpThe, stat: 'itemsSent', tiers: [5, 10, 100, 500, 2000], mod: null },
    { id: 'floors', name: 'Delver', desc: TX.milestones.floorsCleared, stat: 'floors', tiers: [1, 3, 10, 30, 100, 300], mod: ['moveSpeed', 0.5] },
    { id: 'sGrades', name: 'Perfectionist', desc: TX.milestones.floorsClearedWithGrade, stat: 'sGrades', tiers: [1, 5, 15, 40], mod: ['critChance', 0.5] },
    { id: 'closeCalls', name: 'Hair\'s Breadth', desc: TX.milestones.closeCalls, stat: 'closeCalls', tiers: [3, 10, 50, 200, 1000, 5000], mod: ['dodge', 0.5] },
    { id: 'flows', name: 'In the Flow', desc: TX.milestones.flowChainsTriggered, stat: 'flows', tiers: [1, 5, 20, 60], mod: ['critChance', 0.5] },
    { id: 'deaths', name: 'Stubborn', desc: TX.milestones.timesYouHaveDied, stat: 'deaths', tiers: [1, 3, 8, 20, 50], mod: ['hpRegen', 0.5] },
    { id: 'depth', name: 'Deep Diver', desc: TX.milestones.deepestFloorReached, stat: 'depth', tiers: [3, 5, 10, 20, 30, 50], mod: ['hpMax', 15], max: true },
  ];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  // the story's table is { counterKey: { name, flavour, tiers: [titles low to high] } }; its keys differ from ours for four counters
  const ALIAS = { sold: 'itemsSold', salvaged: 'itemsSalvaged', chute: 'itemsSent', flowChains: 'flows' };
  let defsFor = null, defsCache = null;
  function defs() {
    const raw = (meta.STORY && meta.STORY.MILESTONES) || null;
    if (defsCache && defsFor === raw) return defsCache;       // recomputeStats asks on every call: merge the story table once per table
    defsFor = raw; defsCache = build(raw);
    return defsCache;
  }
  function build(raw) {
    const over = Array.isArray(raw) ? raw : (raw ? Object.keys(raw).map(function (k) { const o = raw[k]; return o && typeof o === 'object' ? { id: ALIAS[k] || k, name: o.name, flavour: o.flavour, names: Array.isArray(o.tiers) && typeof o.tiers[0] === 'string' ? o.tiers : null } : null; }).filter(Boolean) : []);
    const byId = {};
    over.forEach(function (o) { if (o && o.id) byId[o.id] = o; });
    const out = DEFS.map(function (d) { const o = byId[d.id]; delete byId[d.id]; return o ? Object.assign({}, d, { name: o.name || d.name, desc: o.desc || d.desc, flavour: o.flavour, names: o.names, tiers: Array.isArray(o.tiers) && o.tiers.length ? o.tiers : d.tiers }) : d; });
    Object.keys(byId).forEach(function (k) { const o = byId[k]; if (o.stat && Array.isArray(o.tiers)) out.push(o); });     // entries the story adds on its own
    return out;
  }

  // ---------- counters ----------
  function stats() { const f = S.flags; if (!f.stats || typeof f.stats !== 'object') f.stats = {}; return f.stats; }
  let dirty = false;
  meta.addStat = function (key, n) { if (!S.player) return; const s = stats(); s[key] = (s[key] || 0) + (n == null ? 1 : n); dirty = true; };
  ui._stat = meta.addStat;
  const value = function (d) { return d.stat === 'depth' ? (S.flags.maxDepth | 0) : (d.stat === 'relics' ? (G.items && G.items.relicCount ? G.items.relicCount() : 0) : (stats()[d.stat] || 0)); };

  G.on('monster:killed', function (e) {
    const m = e && e.monster;
    if (!m || (m.faction && m.faction !== 'enemy')) return;
    meta.addStat('kills');
    if (m.rarity === 'champion' || m.rarity === 'rare' || m.rarity === 'legendary' || m.rarity === 'boss') meta.addStat('elites');
    if (m.rarity === 'boss') meta.addStat('bosses');
  });
  // Hoard counts gold found on the ground (and quest rewards, from quests.js) — not sales, corpse reclaims or the milestone rewards themselves.
  // Big Spender counts what the traders were paid (items emits gold:spent), not the death-penalty loss or perk costs.
  G.on('item:picked', function (e) { const it = e && e.item; if (it && it.type === 'gold' && it.qty > 0) meta.addStat('goldEarned', it.qty | 0); });
  G.on('gold:spent', function (e) { if (e && e.amount > 0) meta.addStat('goldSpent', e.amount | 0); });
  G.on('object:interact', function (e) { if (e && e.type === 'chest') meta.addStat('chests'); });
  G.on('floor:graded', function (e) { meta.addStat('floors'); if (e && String(e.grade).toUpperCase().charAt(0) === 'S') meta.addStat('sGrades'); });
  G.on('flow:trigger', function () { meta.addStat('flows'); });
  G.on('player:died', function () { meta.addStat('deaths'); });
  G.on('item:sold', function (e) { meta.addStat('itemsSold', (e && e.count) || 1); });
  G.on('item:salvaged', function (e) { meta.addStat('itemsSalvaged', (e && e.count) || 1); });
  // sales and salvages are counted from the items module's item:sold / item:salvaged events (R13); only the chute has no event yet
  (function wrap() {
    const I = G.items;
    if (!I) return;
    const w = function (name, count) {
      const fn = I[name];
      if (typeof fn !== 'function' || fn._ms) return;
      I[name] = function () { const r = fn.apply(this, arguments); try { count(r, arguments); } catch (err) { /* never break a sale */ } return r; };
      I[name]._ms = true;
    };
    w('chuteSend', function (r) { if (typeof r === 'number' && r > 0) meta.addStat('itemsSent', r); });
  })();

  // ---------- tiers + rewards ----------
  function reward(d, t) {
    const r = { gold: Math.round(100 * Math.pow(2.2, t)) };
    const m = {};
    if (t === 0) m.dust = 10; else if (t === 1) { m.dust = 20; m.shard = 3; } else if (t === 2) m.shard = 8; else if (t === 3) { m.shard = 15; m.essence = 1; } else m.essence = 3;
    r.mats = m;
    if (t >= 3) r.mark = 1;
    if (d.mod) r.mod = [d.mod[0], d.mod[1]];
    return r;
  }
  function rewardText(r) {
    const parts = [];
    if (r.gold) parts.push(fmt(r.gold) + TX.filter.gold2);
    if (r.mats) parts.push(ui._matsText ? ui._matsText(r.mats) : '');
    if (r.mark) parts.push('1 Mark');
    if (r.mod) parts.push((G.items && G.items.formatStat ? G.items.formatStat(r.mod[0], r.mod[1]) : '+' + r.mod[1] + ' ' + r.mod[0]) + TX.milestones.forGood);
    return parts.filter(Boolean).join(', ');
  }
  const reached = function () { const f = S.flags; if (!f.milestones || typeof f.milestones !== 'object') f.milestones = {}; return f.milestones; };
  const tierName = function (d, t) {
    if (d.names && d.names.length) return d.names[t] || d.names[d.names.length - 1] + ' ' + (ROMAN[t - d.names.length + 1] || (t + 1));     // extra thresholds reuse the last title + a numeral
    return d.name + ' ' + (ROMAN[t] || (t + 1));
  };

  function grant(d, t) {
    const p = S.player, r = reward(d, t);
    if (r.gold) { p.gold = (p.gold || 0) + r.gold; G.emit('gold:changed', { gold: p.gold, delta: r.gold, quiet: true }); }
    p.materials = p.materials || {};
    for (const k in (r.mats || {})) p.materials[k] = (p.materials[k] || 0) + r.mats[k];
    if (r.mark) {
      if (G.game && typeof G.game.grantMark === 'function') { try { G.game.grantMark('milestone_' + d.id + '_' + t); } catch (err) { console.error('[milestone mark]', err); } }
    }
    ui.toast(TX.milestones.milestone + tierName(d, t) + ' — ' + rewardText(r), '#ffe45b');
    ui._sfx('quest');
    G.emit('milestone:reached', { id: d.id, tier: t + 1, reward: r });
    return r;
  }
  function check() {
    dirty = false;
    if (!S.player || S.scene === 'menu') return;
    const got = reached();
    let mods = false;
    defs().forEach(function (d) {
      const v = value(d);
      let t = got[d.id] | 0;
      while (t < d.tiers.length && v >= d.tiers[t]) { const r = grant(d, t); if (r.mod) mods = true; t++; got[d.id] = t; }
    });
    if (mods && G.game && G.game.recomputeStats) { try { G.game.recomputeStats(S.player); } catch (err) { console.error('[ui milestones recompute]', err); } G.emit('player:stats', {}); }
  }
  ui._updaters.push((function () { let t = 0; return function (dt) { t -= dt; if (t > 0) return; t = 0.7; if (dirty) check(); }; })());
  G.on('scene:changed', function () { dirty = true; });          // the depth counter reads flags.maxDepth: look again on every arrival

  meta.getMilestoneMods = function () {
    const out = {}, got = (S.flags && S.flags.milestones) || {};
    defs().forEach(function (d) { if (d.mod && got[d.id]) out[d.mod[0]] = (out[d.mod[0]] || 0) + d.mod[1] * got[d.id]; });
    return out;
  };
  meta.getMilestones = function () {
    const got = reached();
    return defs().map(function (d) {
      const v = value(d), t = got[d.id] | 0;
      return { id: d.id, name: d.name, desc: d.desc, flavour: d.flavour || '', value: v, tier: t, tiers: d.tiers.map(function (at, i) { return { at: at, reached: i < t, reward: reward(d, i), name: tierName(d, i) }; }),
        next: t < d.tiers.length ? d.tiers[t] : null };
    });
  };

  // ---------- the page ----------
  ui._register('milestones', {
    render: function () {
      const list = meta.getMilestones();
      const body = h('div', { class: 'ed-body' }, h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.milestones.everythingYouDoCounts }),
        list.map(function (m) {
          const nextR = m.next != null ? m.tiers[m.tier].reward : null;
          return h('div', { class: 'ed-ms' },
            h('div', { class: 't' }, h('b', { text: m.name + (m.tier ? ' ' + (ROMAN[m.tier - 1] || m.tier) : '') }), h('span', { class: m.next == null ? 'ed-gold' : 'ed-dim', text: m.next == null ? 'Complete' : fmt(m.value) + ' / ' + fmt(m.next) })),
            h('small', { text: m.desc + (m.flavour ? '. ' + m.flavour : '') }),
            h('div', { class: 'pips' }, m.tiers.map(function (t) { return h('i', { class: t.reached ? 'on' : null }); })),
            nextR ? h('small', { text: TX.milestones.next + rewardText(nextR) }) : null);
        }));
      return ui._frame(TX.common.milestones, null, body);
    },
  });
})();
