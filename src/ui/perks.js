// R11 perk trees: a Perks screen beside Skills. Three branches (Craft / Edge / Crossroads), five tiers each, every tier a pair of
// cards to choose between. One branch at a time in portrait (a tab row), all three side by side in landscape. Reads the combat team's
// API (src/game/perks.js): getPerkTree(classId) -> [{ id, name, tiers: [{ tier, cost, keystone, options: [info, info], chosen }] }],
// getPerkInfo(id) -> { name, text, cost, keystone, owned, how ('point'|'mark'|'wager'|'won'), locked, lockedReason, canBuy, canWager },
// getPerkPoints(p) -> { points, marks, wagerAvailable, wagerOpen }, buyPerk(id, { mark | wager }), respecPerks(), getPerkRespecCost().
// Everything is guarded, and the tree is also read tolerantly (plain id pairs) so a stub can drive it.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui;
  const h = ui._h;

  const BRANCH_NAME = { craft: 'Craft', edge: 'Edge', cross: 'Crossroads', crossroads: 'Crossroads' };
  const BRANCH_NOTE = { craft: 'Your class, deeper', edge: 'Dash, Close Call, Flow, Heat', cross: 'Off-class gear and borrowed tricks', crossroads: 'Off-class gear and borrowed tricks' };

  const has = function (fn) { return G.game && typeof G.game[fn] === 'function'; };
  const pretty = function (s) { return String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); };
  // a keystone's price is the last sentence of its text ("... −10% maximum life.")
  function splitKey(text) {
    const m = /^(.*?[.!])\s+([^.!]+[.!])$/.exec(String(text || '').trim());
    return m ? { main: m[1], drawback: m[2] } : { main: text, drawback: '' };
  }

  // ---------- reading the game's data ----------
  function perkInfo(id, base) {
    let i = null;
    if (has('getPerkInfo')) { try { i = G.game.getPerkInfo(id); } catch (err) { i = null; } }
    const def = (G.game && G.game.PERKS && G.game.PERKS[id]) || {};
    const o = Object.assign({ id: id }, typeof base === 'object' ? base : null, def, i || null);
    o.name = o.name || pretty(id);
    o.text = o.text || o.desc || o.description || '';
    o.cost = +o.cost || 1;
    if (o.keystone && !o.drawback) { const k = splitKey(o.text); o.drawback = k.drawback; o.body = k.main; }
    if (S.player && S.player.perks && S.player.perks[id] && !o.owned) { o.owned = true; o.how = S.player.perks[id]; }
    return o;
  }
  function readTree(classId) {
    if (!has('getPerkTree')) return null;
    let t = null;
    try { t = G.game.getPerkTree(classId); } catch (err) { console.error('[ui getPerkTree]', err); }
    if (!t) return null;
    const br = Array.isArray(t) ? t : (Array.isArray(t.branches) ? t.branches : []);
    return br.map(function (b, bi) {
      const id = String(b.id || ['craft', 'edge', 'cross'][bi] || bi).toLowerCase();
      const tiers = (b.tiers || []).map(function (tr, ti) {
        const raw = Array.isArray(tr) ? tr : (tr.options || tr.perks || tr.choices || []);
        return { index: ti, keystone: !!(tr && tr.keystone), perks: raw.map(function (x) { return typeof x === 'string' ? { id: x } : x; }) };
      });
      return { id: id, name: b.name || BRANCH_NAME[id] || pretty(id), note: b.desc || BRANCH_NOTE[id] || '', tiers: tiers };
    });
  }
  function points() {
    let r = null;
    if (has('getPerkPoints')) { try { r = G.game.getPerkPoints(S.player); } catch (err) { r = null; } }
    r = r || {};
    return { points: r.points | 0, marks: r.marks | 0, wagerAvailable: r.wagerAvailable !== false && !(S.player && S.player.wager), wagerOpen: r.wagerOpen || (S.player && S.player.wager) || null };
  }
  ui._perkMarks = function () { return points().marks; };

  // ---------- detail + buy ----------
  const WAGER_TERMS = 'Costs nothing now. If you die before you next reach town, this perk is lost for good. Reach town alive and it becomes permanent. One wager per act.';
  function buy(id, opts) {
    let r = null;
    try { r = G.game.buyPerk(id, opts); } catch (err) { console.error('[ui buyPerk]', err); }
    ui._sfx(r === false ? 'error' : (opts && opts.wager ? 'shrine' : 'quest'));
    ui._refreshNow();
    return r !== false;
  }
  function detail(info, state) {
    const pt = points();
    let close = null;
    const rows = [
      h('div', { class: 'ed-h', text: info.name }),
      info.keystone ? h('div', { class: 'ed-keytag', text: 'KEYSTONE: a rule change, with a price' }) : null,
      h('p', { class: 'ed-perkdesc', text: (info.keystone && info.body) || info.text || 'No description yet.' }),
      info.drawback ? h('p', { class: 'ed-bad ed-perkdesc', text: 'Price: ' + info.drawback }) : null,
      info.licence ? h('p', { class: 'ed-perkdesc ed-gold', text: 'Licence: ' + (Array.isArray(info.licence) ? info.licence.join(', ') : String(info.licence)) }) : null,
      h('div', { class: 'ed-kv' }, h('span', { text: 'Cost' }), h('b', { text: info.cost + (info.cost > 1 ? ' points or Marks' : ' point or Mark') })),
    ];
    const acts = [];
    if (state === 'owned' || state === 'wager') {
      rows.push(h('div', { class: 'ed-gold', text: state === 'wager' ? 'On the line: lost if you die before reaching town.' : 'You have this perk.' }));
    } else if (state === 'open') {
      const bp = ui._btn('Buy · ' + info.cost + ' pt' + (info.cost > 1 ? 's' : ''), function () { close(); buy(info.id, {}); }, 'gold');
      if (pt.points < info.cost) bp.disabled = true;
      acts.push(bp);
      if (pt.marks > 0) { const bm = ui._btn('Spend a Mark', function () { close(); buy(info.id, { mark: true }); }, 'gold'); if (pt.marks < info.cost) bm.disabled = true; acts.push(bm); }
      const bw = ui._btn('Wager', function () { close(); buy(info.id, { wager: true }); });
      if (!pt.wagerAvailable || info.canWager === false) bw.disabled = true;
      acts.push(bw);
      rows.push(h('div', { class: 'ed-wager' }, h('i', { class: 'candle' }), h('div', null, h('b', { text: 'Wager it' }),
        h('span', { text: pt.wagerOpen ? 'A wager is already lit.' : (!pt.wagerAvailable ? 'You already wagered in this act.' : WAGER_TERMS) }))));
    } else rows.push(h('div', { class: 'ed-note', text: state === 'taken' ? 'You chose the other perk of this tier.' : (info.lockedReason || 'Choose a perk in the tier below first.') }));
    acts.push(ui._btn('Close', function () { close(); }));
    close = ui._modal(ui._dialog(rows, acts, 'ed-perkdlg'));
  }

  // ---------- the screen ----------
  function card(info, state, onTap) {
    const cls = 'ed-pcard ' + state + (info.keystone ? ' key' : '');
    const body = info.keystone && info.body ? info.body : info.text;
    return h('button', { type: 'button', class: cls, 'aria-label': info.name + ', ' + state, onclick: function () { ui._sfx('click'); onTap(); } },
      h('div', { class: 'pt' }, ui._icon(info.icon || { shape: info.keystone ? 'star' : 'rune', color: info.keystone ? '#ffb347' : '#9cc2ff', accent: '#ffffff' }, 24),
        h('b', { text: info.name }), h('i', { class: 'cost', text: info.cost })),
      h('small', { text: body }),
      info.keystone && info.drawback ? h('small', { class: 'ed-bad', text: '▼ ' + info.drawback }) : null,
      state === 'owned' ? h('em', { class: 'tag', text: '✓' }) : (state === 'wager' ? h('i', { class: 'candle tag' }) : null));
  }

  function branchEl(br) {
    let chosen = 0;
    const col = h('div', { class: 'ed-pbranch', 'data-b': br.id });
    const tiersEl = [];
    let prevChosen = true;
    br.tiers.forEach(function (t) {
      const infos = t.perks.map(function (x) { return perkInfo(x.id, x); });
      const picked = infos.filter(function (i) { return i.owned; })[0];
      if (picked) chosen++;
      const open = prevChosen;                                    // a tier opens once the one below has a perk
      tiersEl.push(h('div', { class: 'ed-ptier' + (open ? '' : ' shut') },
        h('div', { class: 'ed-ptlabel' }, h('span', { text: 'Tier ' + (t.index + 1) }), h('em', { text: open ? (picked ? 'chosen' : 'choose one') : '🔒 needs tier ' + t.index })),
        h('div', { class: 'ed-ppair' }, infos.map(function (info) {
          let state = 'open';
          if (info.owned) state = (info.how === 'wager' || (S.player && S.player.wager === info.id)) ? 'wager' : 'owned';
          else if (picked || info.locked) state = 'taken';
          else if (!open) state = 'shut';
          return card(info, state, function () { detail(info, state); });
        }))));
      prevChosen = !!picked;
    });
    col.appendChild(h('div', { class: 'ed-pbhead' }, h('b', { text: br.name }), h('span', { text: chosen + ' / ' + br.tiers.length }), h('small', { text: br.note })));
    tiersEl.forEach(function (e) { col.appendChild(e); });
    return col;
  }

  function counters(pt) {
    return h('div', { class: 'ed-pcount' },
      h('span', { class: pt.points > 0 ? 'ed-gold' : 'ed-dim', text: pt.points + ' point' + (pt.points === 1 ? '' : 's') }),
      h('span', { class: 'marks' + (pt.marks > 0 ? ' lit' : ''), 'aria-label': pt.marks + ' Marks' }, h('i', { class: 'mark' }), pt.marks + ' Mark' + (pt.marks === 1 ? '' : 's')),
      pt.wagerOpen ? h('span', { class: 'ed-gold' }, h('i', { class: 'candle' }), ' wager lit') : null);
  }

  function respec(p) {
    let cost = 40 * (p.level || 1), free = false;
    if (has('getPerkRespecCost')) { try { cost = G.game.getPerkRespecCost() | 0; free = cost === 0; } catch (err) { /* keep ours */ } }
    let close = null;
    close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: 'Respec perks' }),
      h('p', { class: 'ed-perkdesc', text: 'Points and Marks come back. ' + (free ? 'This one is free (once per act).' : 'It costs ' + cost + ' gold now (free once per act).') + ' A lit wager cannot be respecced.' }),
      h('p', { class: 'ed-bad ed-perkdesc', text: 'Off-class weapon licences are taken back too: using that gear again brings the damage penalty back.' })],
    [ui._btn('Respec' + (free ? '' : ' · ' + cost + 'g'), function () {
      close();
      let r = null;
      try { r = has('respecPerks') ? G.game.respecPerks() : false; } catch (err) { console.error('[ui respecPerks]', err); }
      ui._sfx(r === false ? 'error' : 'shrine');
      ui._refreshNow();
    }, 'danger'), ui._btn('Cancel', function () { close(); })]));
  }

  ui._register('perks', {
    render: function (view) {
      const p = S.player;
      const tabs = [{ id: 'skills', label: 'Skills' }, { id: 'perks', label: 'Perks', badge: points().marks > 0 ? '★' : null }];
      const head = { compact: true, tabs: tabs, tab: 'perks', onTab: function (id) { if (id === 'skills') ui.open('skills'); } };
      if (!p) return ui._frame('Perks', head, h('div', { class: 'ed-body' }));
      const tree = readTree(p.classId);
      if (!tree || !tree.length) return ui._frame('Perks', head, h('div', { class: 'ed-body' }, h('div', { class: 'ed-box ed-note', text: 'Perks are not available yet.' })));
      if (!view.branch || !tree.some(function (b) { return b.id === view.branch; })) view.branch = tree[0].id;
      if (!view.tipped) { view.tipped = true; if (ui._tip) ui._tip('perks'); }
      const pt = points();
      const sel = h('div', { class: 'ed-pbsel' }, tree.map(function (b) {
        return h('button', { type: 'button', class: 'ed-tab' + (b.id === view.branch ? ' on' : ''), onclick: function () { ui._sfx('click'); view.branch = b.id; ui._refreshNow(); } }, b.name);
      }));
      const cols = h('div', { class: 'ed-pcols' }, tree.map(function (b) { const el = branchEl(b); if (b.id !== view.branch) el.classList.add('off'); return el; }));
      head.right = [ui._btn('Respec', function () { respec(p); })];
      head.sub = h('div', { class: 'ed-psub' }, counters(pt), sel);
      return ui._frame('Perks', head, h('div', { class: 'ed-body' }, cols, h('div', { class: 'ed-note', style: 'margin-top:8px', text: 'Tap a perk for the details. Marks come from skilled play: they buy perks the same as points.' })));
    },
  });

  // the Skills screen gets the same tab row
  ui._perkTabs = function () {
    if (!has('getPerkTree')) return null;
    return [{ id: 'skills', label: 'Skills' }, { id: 'perks', label: 'Perks', badge: points().marks > 0 ? '★' : null }];
  };

  // ---------- events ----------
  G.on('perk:bought', function (e) {
    if (!e) return;
    const wager = e.how === 'wager' || e.wager === true;
    ui.toast((wager ? 'Wagered: ' : 'Perk gained: ') + perkInfo(e.id).name + (wager ? ' (reach town alive)' : ''), wager ? '#ffb347' : '#7fffd4');
    if (wager && ui._tip) ui._tip('wager');
    ui._refresh();
  });
  G.on('perk:mark', function () {          // the game toasts "Mark earned (feat)"; the UI adds the pulse and the first-time tip
    ui._sfx('quest');
    if (ui._tip) ui._tip('marks');
    document.querySelectorAll('#ui .ed-top').forEach(function (t) { if (/Skill/.test(t.textContent)) { t.classList.add('ed-pulse'); setTimeout(function () { t.classList.remove('ed-pulse'); }, 5000); } });
    ui._refresh();
  });
  G.on('perk:lost', function (e) {
    ui._banner('Wager lost: ' + perkInfo(e && e.id).name, 'You died before reaching town. The perk is gone.', '#ff5a50', 5);
    ui._refresh();
  });
  G.on('perk:won', function (e) { ui._banner('Wager won: ' + perkInfo(e && e.id).name, 'You reached town alive. It is yours for good.', '#ffd94a', 4); ui._refresh(); });
  G.on('perk:respec', function () { ui._refresh(); });

  // ---------- HUD candle while a wager is lit ----------
  let candle = null;
  ui._inits.push(function () {
    const area = document.querySelector('#ui .ed-area');
    if (!area) return;
    candle = h('small', { class: 'ed-candle', style: 'display:none' }, h('i', { class: 'candle' }), h('span'));
    area.appendChild(candle);
  });
  ui._updaters.push((function () {
    let t = 0, last = '';
    return function (dt) {
      t -= dt; if (t > 0 || !candle) return; t = 0.5;
      const p = S.player, id = p && S.scene !== 'menu' ? p.wager : null;
      const key = id ? String(id) : '';
      if (key === last) return;
      last = key;
      candle.style.display = key ? 'block' : 'none';
      if (key) candle.lastChild.textContent = ' Wager: ' + perkInfo(key).name;
      if (ui._setTrkTop) ui._setTrkTop();
    };
  })());

  // ---------- first-time tips (pause-style cards, tips.js) ----------
  if (ui._TIPS) {
    ui._TIPS.marks = ['Marks', 'A Mark is earned by skilled play: a top-grade floor, a long Flow chain, a boss beaten without a potion. A Mark buys any perk just like a point. When one is unspent, the Perks tab glows.', { shape: 'star', color: '#ffe45b' }];
    ui._TIPS.wager = ['Wagers', 'A wagered perk costs nothing now, but if you die before you next reach town it is lost. Reach town alive and it is yours for good. One wager per act.', { shape: 'rune', color: '#ffb347' }];
    ui._TIPS.perks = ['Perks', 'Perks change how you play. Each tier is a choice between two: pick one and the other closes. A tier opens once you have a perk in the tier below.', { shape: 'star', color: '#9cc2ff' }];
  }
})();
