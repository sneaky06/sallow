// R8.1 the chute (dungeon: send bag items up to the surface) and the surface crate (town: sell / salvage / Curator / stash).
// Items API used, all guarded: G.items.chuteSend(index | [indices]), surfaceTake(i), plus the ordinary bag actions
// (sell / salvage / stashDeposit / collection.register) once an item has been taken into the bag. state.surface = [item].
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h, fmt = ui._fmt;

  // R16: the crate starts small and grows with challenge quests: G.items.surfaceSize() = 25 + flags.crateBonus
  function crateSize() {
    if (G.items && typeof G.items.surfaceSize === 'function') { try { const n = +G.items.surfaceSize(); if (n > 0) return n; } catch (err) { /* fall through */ } }
    return (G.items && G.items.SURFACE_SIZE) || 25 + ((S.flags && S.flags.crateBonus) | 0);
  }
  ui._crateSize = crateSize;
  function surface() { if (!Array.isArray(S.surface)) S.surface = []; return S.surface; }
  ui._surfaceCount = function () { return Array.isArray(S.surface) ? S.surface.filter(Boolean).length : 0; };
  const has = function (fn) { return G.items && typeof G.items[fn] === 'function'; };

  // ---------- the chute (dungeon) ----------
  function sendable(it) { return !!it && !it.locked && it.type !== 'gold'; }

  function chuteBody(view) {
    const p = S.player, inv = p.inventory || [];
    if (!view.marked) view.marked = {};
    const marked = Object.keys(view.marked).filter(function (k) { return view.marked[k] && sendable(inv[k]); }).map(Number);
    const junk = [];
    inv.forEach(function (it, i) { if (sendable(it) && it.slot && ui._isJunk(it)) junk.push(i); });
    const grid = h('div', { class: 'ed-grid' });
    for (let i = 0; i < C.INV_SIZE; i++) {
      const it = inv[i] || null;
      const c = ui._cell(it, { arrow: true, junk: true, onTap: function (item) {
        if (view.look) { ui._showItem(item, [], { lock: false }); return; }
        if (!sendable(item)) { ui._sfx('error'); ui.toast(item.locked ? 'Locked items stay with you.' : 'That cannot be sent.', '#a89f8f'); return; }
        view.marked[i] = !view.marked[i];
        ui._refreshNow();
      } });
      if (it && view.marked[i] && sendable(it)) { c.className += ' mk'; c.appendChild(h('b', { class: 'mkx', text: '✓' })); }
      grid.appendChild(c);
    }
    const doSend = function (list) {
      if (!list.length) { ui._sfx('error'); return; }
      if (!has('chuteSend')) { ui.toast(TX.chute.theChuteIsNot, '#a89f8f'); return; }
      let r = null;
      try { r = G.items.chuteSend(list.length === 1 ? list[0] : list); } catch (err) { console.error('[ui chuteSend]', err); }
      if (r === false) { ui._sfx('error'); return; }
      ui._sfx('loot');
      ui.toast(list.length + TX.chute.item + (list.length === 1 ? '' : 's') + TX.chute.sentUpToThe, '#7fd4c8');
      view.marked = {};
      ui._refreshNow();
    };
    // R8.13: the crate up top holds a fixed number of items; a full one refuses everything
    const size = crateSize();
    const used = surface().filter(Boolean).length;
    let space = size - used;
    if (G.items && typeof G.items.surfaceSpace === 'function') { try { space = G.items.surfaceSpace() | 0; } catch (err) { /* keep ours */ } }
    const full = space <= 0;
    const send = ui._btn('Send' + (marked.length ? ' (' + Math.min(marked.length, Math.max(space, 0)) + ')' : ''), function () { doSend(marked.slice(0, Math.max(space, 0))); }, marked.length && !full ? 'gold' : '');
    if (!marked.length || full) send.disabled = true;
    const sj = ui._btn(TX.chute.sendJunk + (junk.length && !full ? ' (' + Math.min(junk.length, space) + ')' : ''), function () { doSend(junk); }, junk.length && !full ? 'gold' : '');
    if (!junk.length || full) sj.disabled = true;
    return { body: h('div', { class: 'ed-body' },
      h('div', { class: 'ed-kv', style: 'margin-bottom:4px' }, h('span', { text: TX.chute.crateUpTop }), h('b', { class: full ? 'ed-bad' : (space <= 3 ? 'ed-gold' : null), text: used + ' / ' + size + (full ? '  FULL' : '') })),
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: full ? 'The crate is full. Sell or salvage things up top, or drop what is not worth keeping.' : (marked.length > space ? TX.chute.only + space + TX.chute.moreFit : view.look ? 'Looking: tap an item to inspect it.' : 'Tap items to mark them, then Send. They arrive at the surface crate in town, instantly.') }),
      grid), foot: [send, sj, ui._btn(view.look ? 'Mark' : 'Look', function () { view.look = !view.look; ui._refreshNow(); }, view.look ? 'on' : ''),
      ui._btn(TX.chute.clear, function () { view.marked = {}; ui._refreshNow(); })] };
  }
  ui._register('chute', {
    render: function (view) {
      if (!S.player) return ui._frame(TX.chute.chute, null, h('div', { class: 'ed-body' }));
      const c = chuteBody(view);
      return ui._frame(TX.chute.chute, { foot: c.foot }, c.body);
    },
  });

  // ---------- the surface crate (town) ----------
  // Holds up to G.items.SURFACE_SIZE (300) items, so it is a scrolling grid that is UPDATED, not rebuilt: every item keeps its own cell
  // element (cache: item -> element); after a sale only that cell disappears and the cells after it slide up.
  const item = function (name) { return G.items && typeof G.items[name] === 'function' ? G.items[name] : null; };
  const SORT_SLOT = function (it) { const s = it.slot === 'ring' ? 'ring1' : it.slot; const i = C.EQUIP_SLOTS.indexOf(s); return i < 0 ? 99 : i; };

  // Sort S.surface in place (modes of the bag sort: rarity | level | slot | value | upgrades | newest).
  ui._sortSurface = function (mode) {
    const list = surface();
    const ord = list.map(function (it, i) { return { it: it, i: i }; });
    const rar = function (x) { return ui._rarityOrder(x.it.rarity); };
    const lvl = function (x) { return x.it.ilvl || x.it.level || 0; };
    const key = {
      rarity: function (a, b) { return rar(b) - rar(a); },
      level: function (a, b) { return lvl(b) - lvl(a); },
      slot: function (a, b) { return SORT_SLOT(a.it) - SORT_SLOT(b.it); },
      value: function (a, b) { return (b.it.value || 0) * (b.it.qty || 1) - (a.it.value || 0) * (a.it.qty || 1); },
      upgrades: function (a, b) { const r = { up: 0, same: 1, down: 2 }; const va = a.it.slot ? (r[ui._verdict(a.it)] != null ? r[ui._verdict(a.it)] : 3) : 4, vb = b.it.slot ? (r[ui._verdict(b.it)] != null ? r[ui._verdict(b.it)] : 3) : 4; return va - vb; },
      newest: function (a, b) { return (b.it.foundAt || 0) - (a.it.foundAt || 0); },
    }[mode] || function () { return 0; };
    ord.sort(function (a, b) { return key(a, b) || rar(b) - rar(a) || lvl(b) - lvl(a) || a.i - b.i; });
    for (let i = 0; i < ord.length; i++) list[i] = ord[i].it;
    ui._refresh();
  };
  // auto-sort when something arrives (same rule as the bag: settings.autoSort, default on)
  (function () {
    let n = -1;
    G.on('surface:changed', function () {
      const len = surface().length;
      const grew = n >= 0 && len > n;
      n = len;
      if (grew && S.settings.autoSort !== false) ui._sortSurface(ui._sortMode ? ui._sortMode() : 'rarity');
    });
    G.on('scene:changed', function () { n = -1; });
  })();

  // what the mass-sell buttons may touch: gear that is not locked, a set piece, Legendary+, unrevealed-bleached or wanted by the book
  function sellable(it) {
    return !!it && !!it.slot && !it.locked && !it.setId && !(it.bleached && !it.revealed) && !ui._wanted(it) &&
      ui._rarityOrder(it.rarity) < ui._rarityOrder('legendary');
  }
  const bulkRate = function () { return ui._bulkRate ? ui._bulkRate('sell') : 0.5; };
  const goldOf = function (it) { return Math.round((it.value || 0) * (it.qty || 1)); };
  const MASS = ['common', 'uncommon', 'rare'];

  function surfaceView(view) {
    if (!view.built) {
      view.cache = new Map();
      view.head = h('div', { class: 'ed-kv', style: 'margin-bottom:4px' });
      view.mass = h('div', { class: 'ed-mass' });
      view.note = h('div', { class: 'ed-note', style: 'margin:6px 0' });
      view.grid = h('div', { class: 'ed-grid ed-bigcrate' });
      view.body = h('div', { class: 'ed-body' }, view.head, view.mass, view.note, view.grid);
      view.built = true;
    }
    return view;
  }

  function actionsFor(it) {
    const idx = function () { return surface().indexOf(it); };
    const a = [];
    const run = function (fn) { return function () { const i = idx(); if (i >= 0) fn(i); }; };
    if (ui._wanted(it) && item('surfaceRegister')) a.push({ label: TX.common.curator, cls: 'gold', fn: run(function (i) { const r = G.items.surfaceRegister(i); if (r && r.ok) { ui._sfx('quest'); } else ui._sfx('error'); }) });
    if (it.slot && item('surfaceSell')) a.push({ label: 'Sell' + (it.value ? ' ' + fmt(Math.round(goldOf(it) * bulkRate())) + 'g' : ''), cls: ui._wanted(it) ? '' : 'gold', fn: run(function (i) {
      const g = G.items.surfaceSell(i, { bulk: true }); ui._sfx(g > 0 ? 'sell' : 'error');
    }) });
    if (it.slot && item('surfaceSalvage')) a.push({ label: TX.common.salvage, fn: run(function (i) {
      const sal = function () { ui._sfx(G.items.surfaceSalvage(i, { bulk: true }) ? 'click' : 'error'); };
      const gems = (it.sockets || []).filter(Boolean).length;
      if (gems) ui._confirm(gems + TX.chute.socketedGem + (gems === 1 ? '' : 's') + TX.chute.willBeGroundTo, 'Salvage anyway', sal, { danger: true }); else sal();
    }) });
    if (item('surfaceStash')) a.push({ label: TX.common.stash, fn: run(function (i) { if (!G.items.surfaceStash(i)) ui._sfx('error'); }) });
    if (item('surfaceTake')) a.push({ label: TX.common.take, fn: run(function (i) { if (!G.items.surfaceTake(i)) ui._sfx('error'); }) });
    return a;
  }

  function cellFor(view, it) {
    let el = view.cache.get(it);
    if (el && el._lk === !!it.locked) return el;
    el = ui._cell(it, { arrow: true, junk: true, onTap: function (x) { ui._showItem(x, actionsFor(x)); } });
    el._lk = !!it.locked;
    view.cache.set(it, el);
    return el;
  }

  // bring the grid in line with state.surface touching only what changed
  function syncGrid(view) {
    const list = surface().filter(Boolean);
    const live = new Set(list);
    view.cache.forEach(function (el, it) { if (!live.has(it)) view.cache.delete(it); });
    const grid = view.grid;
    for (let i = 0; i < list.length; i++) {
      const el = cellFor(view, list[i]);
      const cur = grid.children[i];
      if (cur !== el) { if (cur && !live.has(cur._it) && cur._it && cur._it !== list[i]) { /* stale node is replaced below */ } grid.insertBefore(el, cur || null); }
      el._it = list[i];
    }
    while (grid.children.length > list.length) grid.lastChild.remove();
    return list;
  }

  function surfaceRender(view) {
    surfaceView(view);
    const size = crateSize();
    const list = syncGrid(view);
    // one pass: junk / wanted counts and the three mass-sell tiers
    let wantedN = 0, junkN = 0;
    const tier = MASS.map(function () { return { n: 0, g: 0 }; });
    const lim = MASS.map(function (k) { return ui._rarityOrder(k); });
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (ui._wanted(it)) { wantedN++; continue; }
      if (!sellable(it)) continue;
      const o = ui._rarityOrder(it.rarity);
      for (let t = 0; t < MASS.length; t++) if (o <= lim[t]) { tier[t].n++; tier[t].g += goldOf(it); }
      if (ui._isJunk(it)) junkN++;
    }
    view.head.replaceChildren(h('span', { text: TX.chute.surfaceCrate }), h('b', { class: list.length >= size ? 'ed-bad' : (list.length > size * 0.9 ? 'ed-gold' : null), text: list.length + ' / ' + size }));
    view.note.textContent = list.length ? 'Tap an item to sell, salvage, hand in or stash it. Lock it in its tooltip to keep it safe.' : 'Nothing has come up yet. Items you send down a chute in the rift arrive here, instantly.';
    // R12: the custom sell / salvage filter replaces the three fixed buttons
    view.mass.className = '';
    view.mass.replaceChildren(ui._filterBox ? ui._filterBox('surface') : '');
    if (!view.tipped) { view.tipped = true; if (ui._tip) ui._tip('crateRate'); }
    const rule = junkRule();
    const cur = ui._btn('Curator' + (wantedN ? ' (' + wantedN + ')' : ''), function () {
      let n = 0;
      for (let i = surface().length - 1; i >= 0; i--) {
        const it = surface()[i];
        if (it && !it.locked && ui._wanted(it) && item('surfaceRegister')) { const r = G.items.surfaceRegister(i); if (r && r.ok) n++; }
      }
      ui._sfx(n ? 'quest' : 'error');
    }, wantedN ? 'gold' : '');
    if (!wantedN || !item('surfaceRegister')) cur.disabled = true;
    const jb = ui._btn((rule === 'salvage' ? 'Salvage junk' : 'Sell junk') + (junkN ? ' (' + junkN + ')' : ''), function () {
      let n = 0;
      for (let i = surface().length - 1; i >= 0; i--) {
        const it = surface()[i];
        if (!sellable(it) || !ui._isJunk(it)) continue;
        if (rule === 'salvage' ? (item('surfaceSalvage') && G.items.surfaceSalvage(i, { bulk: true })) : (item('surfaceSell') && G.items.surfaceSell(i, { bulk: true }) > 0)) n++;
      }
      ui._sfx(n ? (rule === 'salvage' ? 'click' : 'sell') : 'error');
    }, junkN ? 'gold' : '');
    if (!junkN) jb.disabled = true;
    const takeAll = ui._btn(TX.common.takeAll, function () {
      let n = 0;
      while (surface().length && n < 400 && item('surfaceTake') && G.items.surfaceTake(0) !== false) n++;
      ui._sfx(n ? 'loot' : 'error');
      if (surface().length && n) ui.toast(TX.chute.yourBagIsFull + surface().length + TX.chute.leftUpHere, '#a89f8f');
      ui._refreshNow();
    });
    if (!list.length) takeAll.disabled = true;
    return { body: view.body, foot: [cur, jb, takeAll, ui._sortButton('surface')] };
  }
  ui._register('surface', {
    render: function (view) {
      if (!S.player) return ui._frame(TX.chute.surfaceCrate, null, h('div', { class: 'ed-body' }));
      const c = surfaceRender(view);
      return ui._frame(TX.chute.surfaceCrate, { foot: c.foot }, c.body);
    },
  });
  // the arrows on cached cells depend on what is worn: start over when that changes
  G.on('equipment:changed', function () { const c = ui._current && ui._current(); if (c && c.name === 'surface' && c.view.cache) c.view.cache.clear(); });
  function junkRule() { return (S.settings.junk && S.settings.junk.action) === 'salvage' ? 'salvage' : 'sell'; }

  G.on('object:interact', function (e) {
    if (!e || !S.player || S.scene === 'menu') return;
    if (e.type === 'chute') {
      if (S.scene === 'dungeon') ui.open('chute'); else ui.toast(TX.chute.theChuteOnlyWorks, '#a89f8f');
    } else if (e.type === 'surface_crate') ui.open('surface');
  });
  ['inventory:changed', 'surface:changed'].forEach(function (n) { G.on(n, ui._refresh); });
})();
