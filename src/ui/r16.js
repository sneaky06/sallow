// R16: the Class Goals page (Journal), the inn's stats book and the lifetime stat counters behind it. Counters live in
// state.flags.stats (the same bag the milestones read: G.meta.addStat(key, n)); everything here only listens, so a missing event costs
// nothing. Labels are in strings.js (TX.stats.*).
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui, meta = G.meta = G.meta || {};
  const TX = ui.S;
  const h = ui._h, fmt = ui._fmt;

  const add = function (k, n) { if (meta.addStat) meta.addStat(k, n); };
  const stats = function () { const f = S.flags; if (!f.stats || typeof f.stats !== 'object') f.stats = {}; return f.stats; };

  // ---------- more lifetime counters ----------
  G.on('monster:killed', function (e) {
    const m = e && e.monster;
    if (!m || (m.faction && m.faction !== 'enemy')) return;
    add('kills_' + (m.rarity || 'normal'));
    const body = (m.sprite && m.sprite.body) || m.body;
    if (body) add('killsBody_' + body);
  });
  G.on('player:damaged', function (e) { add('hitsTaken'); if (e && e.amount > 0) add('damageTaken', Math.round(e.amount)); });
  // combat sends { cause } on player:died; a key is made of the cause words only, and the book keeps at most 40 different ones
  G.on('player:died', function (e) {
    const raw = e && (e.cause || e.by || e.source);
    let c = (typeof raw === 'string' ? raw : (e && e.noRetrieve ? 'boss' : 'unknown')).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'unknown';
    const st = stats();
    if (!(('deathsBy_' + c) in st) && Object.keys(st).filter(function (k) { return k.indexOf('deathsBy_') === 0; }).length >= 40) c = 'other';
    add('deathsBy_' + c);
  });
  G.on('input:potion', function (e) { const p = S.player, k = e && e.kind; if (p && p.potions && p.potions[k] > 0) add('potions_' + k); });
  G.on('input:classaction', function () { add('dashes'); });
  G.on('input:skill', function () { add('skillsCast'); });
  G.on('item:picked', function (e) {
    const it = e && e.item;
    if (!it || it.type === 'gold') return;
    add('found'); if (it.rarity) add('found_' + it.rarity);
    if (it.type === 'gem') add('gemsFound');
  });
  G.on('object:interact', function (e) {
    if (!e) return;
    if (e.type === 'shrine') add('shrines');
    else if (e.type === 'stash') add('stashVisits');
  });
  G.on('room:cleared', function () { add('lockdownsCleared'); });
  G.on('event:end', function (e) { if (e && e.success) add('eventsWon'); });
  G.on('relic:granted', function () { add('relics'); });
  G.on('shrine:accepted', function () { add('bargains'); });
  G.on('scavenger:grab', function () { add('scavengerGrabs'); });
  G.on('quest:completed', function () { add('questsDone'); });
  G.on('perk:bought', function () { add('perksBought'); });
  G.on('lore:found', function () { add('lore'); });
  G.on('player:levelup', function () { add('levelUps'); });
  G.on('scene:changed', function (e) { if (e && e.scene === 'dungeon') add('floorsEntered'); else if (e && e.scene === 'town') add('townVisits'); });
  // distance walked (in tiles, counted once a second from where you stand now vs a second ago)
  ui._updaters.push((function () {
    let t = 0, lx = null, ly = null;
    return function (dt) {
      t += dt; if (t < 1) return; t = 0;
      const p = S.player;
      if (!p || S.scene === 'menu') { lx = null; return; }
      if (lx != null) { const d = Math.hypot(p.x - lx, p.y - ly); if (d > 0 && d < 12) add('distance', Math.round(d * 10) / 10); }
      lx = p.x; ly = p.y;
    };
  })());

  // ---------- the stats book ----------
  const clock = function (s) { s = Math.floor(s || 0); const hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60); return (hh ? hh + 'h ' : '') + mm + 'm'; };
  const BOOK = [
    ['combat', [['kills', 'kills_normal', 'kills_champion', 'kills_rare', 'kills_legendary', 'kills_boss', 'elites', 'bosses', 'damageTaken', 'hitsTaken', 'closeCalls', 'flows', 'dashes', 'skillsCast', 'potions_hp', 'potions_mp']]],
    ['journey', [['depth', 'floorsEntered', 'floors', 'sGrades', 'distance', 'townVisits', 'shrines', 'lockdownsCleared', 'eventsWon', 'bargains', 'scavengerGrabs', 'lore', 'relics']]],
    ['loot', [['found', 'found_uncommon', 'found_rare', 'found_magic', 'found_legendary', 'found_mythic', 'found_unique', 'found_rift', 'gemsFound', 'chests', 'itemsSent']]],
    ['economy', [['goldEarned', 'goldSpent', 'itemsSold', 'itemsSalvaged']]],
    ['you', [['deaths', 'levelUps', 'perksBought', 'questsDone']]],
  ];
  function statValue(k) {
    if (k === 'depth') return S.flags.maxDepth | 0;
    return stats()[k] || 0;
  }
  function label(k) {
    if (TX.stats && TX.stats[k]) return TX.stats[k];
    return String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (c) { return c.toUpperCase(); });
  }
  ui._register('statsbook', {
    render: function () {
      const p = S.player;
      const body = h('div', { class: 'ed-body' },
        h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.stats.byTheFireAllThat }),
        h('div', { class: 'ed-box' },
          h('div', { class: 'ed-kv' }, h('span', { text: TX.stats.timePlayed }), h('b', { text: clock(S.time) })),
          h('div', { class: 'ed-kv' }, h('span', { text: TX.stats.level }), h('b', { text: String((p && p.level) || 1) }))));
      BOOK.forEach(function (sec) {
        const keys = sec[1][0];
        const rows = keys.map(function (k) {
          const v = statValue(k);
          return h('div', { class: 'ed-kv' }, h('span', { text: label(k) }), h('b', { class: v ? null : 'ed-dim', text: k === 'distance' ? fmt(Math.round(v)) + TX.stats.tiles : fmt(v) }));
        });
        // deaths by cause, only the ones that happened
        if (sec[0] === 'you') {
          const st = stats();
          Object.keys(st).filter(function (k) { return /^deathsBy_/.test(k) && st[k] > 0; }).forEach(function (k) {
            rows.push(h('div', { class: 'ed-kv' }, h('span', { text: TX.stats.diedTo + k.slice(8).replace(/_/g, ' ') }), h('b', { text: fmt(st[k]) })));
          });
        }
        body.appendChild(h('div', { class: 'ed-h', text: TX.stats['sec_' + sec[0]] }));
        body.appendChild(h('div', { class: 'ed-box' }, rows));
      });
      return ui._frame(TX.stats.statsBook, { right: [ui._btn(TX.common.milestones, function () { ui.open('milestones'); })] }, body);
    },
  });
  // the inn's seat by the fire (world places the prop with interact: 'inn')
  G.on('object:interact', function (e) { if (e && e.type === 'inn' && S.player) ui.open('statsbook'); });
  if (ui._TIPS) ui._TIPS.inn = [TX.tipcards ? TX.tipcards.innTitle : 'The inn', TX.tipcards ? TX.tipcards.innText : 'Sit by the fire and the whole story of your run is written out for you.', { shape: 'scroll', color: '#d8c9a3' }];
  G.on('object:interact', function (e) { if (e && e.type === 'inn' && ui._tip) ui._tip('inn'); });

  // ---------- class goals ----------
  const rewardOf = function (r) {
    const parts = [];
    if (r && r.mark) parts.push(r.mark + TX.goals.mark + (r.mark > 1 ? 's' : ''));
    if (r && r.title) parts.push(TX.goals.title + r.title);
    if (r && r.cosmetic) parts.push(TX.goals.cosmetic + (typeof r.cosmetic === 'string' ? r.cosmetic : ''));
    return parts.join(' · ');
  };
  // the game owns the goals (ids, rules, counters, rewards); the story table adds the name and a line of flavour, keyed by those ids
  function goalList() {
    let list = [];
    if (G.game && typeof G.game.getClassGoals === 'function') { try { list = G.game.getClassGoals() || []; } catch (err) { list = []; } }
    const T = (meta.STORY && meta.STORY.CLASS_GOALS) || {};
    return list.map(function (g) {
      const part = /_(branch|tree20|flow8|depth30)$/.exec(g.id), s = T[g.id] || (part && T.common && T.common[part[1]]) || null;
      return s ? Object.assign({}, g, { name: s.name || g.name, flavour: s.flavour || '' }) : g;
    });
  }
  ui._register('classgoals', {
    render: function () {
      const list = goalList();
      const done = list.filter(function (g) { return g.done; }).length;
      const body = h('div', { class: 'ed-body' },
        h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: TX.goals.classFeatsThatPay }),
        list.length ? h('div', { class: 'ed-kv', style: 'margin-bottom:6px' }, h('b', { class: 'ed-gold', text: TX.goals.completed }), h('b', { text: done + ' / ' + list.length })) : null,
        list.length ? list.map(function (g) {
          const n = g.n != null ? g.n : (g.progress | 0), goal = g.goal || 1;
          return h('div', { class: 'ed-ms' },
            h('div', { class: 't' }, h('b', { class: g.done ? 'ed-gold' : null, text: (g.done ? '✓ ' : '') + g.name }), h('span', { class: g.done ? 'ed-gold' : 'ed-dim', text: goal > 1 ? fmt(n) + ' / ' + fmt(goal) : (g.done ? TX.goals.done : TX.goals.open) })),
            h('small', { text: g.desc || '' }),
            g.flavour ? h('small', { class: 'ed-dim', text: g.flavour }) : null,
            goal > 1 ? h('div', { class: 'ed-prog' + (g.done ? ' done' : '') }, h('i', { style: 'width:' + Math.round(Math.min(1, n / goal) * 100) + '%' })) : null,
            g.reward ? h('small', { class: g.done ? 'ed-gold' : null, text: (g.done ? TX.goals.earned : TX.goals.reward) + rewardOf(g.reward) }) : null);
        }) : h('div', { class: 'ed-box ed-note', text: TX.goals.noGoalsYet }));
      return ui._frame(TX.goals.classGoals, null, body);
    },
  });
  G.on('classgoal:done', function (e) {
    ui._sfx('quest');
    let nm = e && e.id;
    const g = goalList().filter(function (x) { return x.id === (e && e.id); })[0];
    if (g) nm = g.name;
    ui._banner(TX.goals.classGoalComplete, nm + (e && e.reward ? ' · ' + rewardOf(e.reward) : ''), '#ffe45b', 5);
    ui._refresh();
  });
})();
