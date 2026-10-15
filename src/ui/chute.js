// R8.1 the chute (dungeon: send bag items up to the surface) and the surface crate (town: sell / salvage / Curator / stash).
// Items API used, all guarded: G.items.chuteSend(index | [indices]), surfaceTake(i), plus the ordinary bag actions
// (sell / salvage / stashDeposit / collection.register) once an item has been taken into the bag. state.surface = [item].
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const h = ui._h, fmt = ui._fmt;

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
      if (!has('chuteSend')) { ui.toast('The chute is not working yet.', '#a89f8f'); return; }
      let r = null;
      try { r = G.items.chuteSend(list.length === 1 ? list[0] : list); } catch (err) { console.error('[ui chuteSend]', err); }
      if (r === false) { ui._sfx('error'); return; }
      ui._sfx('loot');
      ui.toast(list.length + ' item' + (list.length === 1 ? '' : 's') + ' sent up to the surface.', '#7fd4c8');
      view.marked = {};
      ui._refreshNow();
    };
    // R8.13: the crate up top holds a fixed number of items; a full one refuses everything
    const size = (G.items && G.items.SURFACE_SIZE) || C.SURFACE_SIZE || 20;
    const used = surface().filter(Boolean).length;
    let space = size - used;
    if (G.items && typeof G.items.surfaceSpace === 'function') { try { space = G.items.surfaceSpace() | 0; } catch (err) { /* keep ours */ } }
    const full = space <= 0;
    const send = ui._btn('Send' + (marked.length ? ' (' + Math.min(marked.length, Math.max(space, 0)) + ')' : ''), function () { doSend(marked.slice(0, Math.max(space, 0))); }, marked.length && !full ? 'gold' : '');
    if (!marked.length || full) send.disabled = true;
    const sj = ui._btn('Send junk' + (junk.length && !full ? ' (' + Math.min(junk.length, space) + ')' : ''), function () { doSend(junk); }, junk.length && !full ? 'gold' : '');
    if (!junk.length || full) sj.disabled = true;
    return { body: h('div', { class: 'ed-body' },
      h('div', { class: 'ed-kv', style: 'margin-bottom:4px' }, h('span', { text: 'Crate up top' }), h('b', { class: full ? 'ed-bad' : (space <= 3 ? 'ed-gold' : null), text: used + ' / ' + size + (full ? '  FULL' : '') })),
      h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: full ? 'The crate is full. Sell or salvage things up top, or drop what is not worth keeping.' : (marked.length > space ? 'Only ' + space + ' more fit.' : view.look ? 'Looking: tap an item to inspect it.' : 'Tap items to mark them, then Send. They arrive at the surface crate in town, instantly.') }),
      grid), foot: [send, sj, ui._btn(view.look ? 'Mark' : 'Look', function () { view.look = !view.look; ui._refreshNow(); }, view.look ? 'on' : ''),
      ui._btn('Clear', function () { view.marked = {}; ui._refreshNow(); })] };
  }
  ui._register('chute', {
    render: function (view) {
      if (!S.player) return ui._frame('Chute', null, h('div', { class: 'ed-body' }));
      const c = chuteBody(view);
      return ui._frame('Chute', { foot: c.foot }, c.body);
    },
  });

  // ---------- the surface crate (town) ----------
  // Run fn(bagIndex) on a surface item: take it into the bag first (surfaceTake) and act on it there.
  function viaBag(i, fn) {
    const it = surface()[i];
    if (!it) return false;
    if (!has('surfaceTake')) { ui.toast('The crate is not ready yet.', '#a89f8f'); return false; }
    let taken = false;
    try { taken = G.items.surfaceTake(i) !== false; } catch (err) { console.error('[ui surfaceTake]', err); }
    const idx = taken ? S.player.inventory.indexOf(it) : -1;
    if (idx < 0) { ui._sfx('error'); if (taken) ui.toast('Your bag is full.', '#a89f8f'); return false; }
    if (fn) fn(idx, it);
    return true;
  }
  function junkRule() { return (S.settings.junk && S.settings.junk.action) === 'salvage' ? 'salvage' : 'sell'; }

  function actionsFor(i, it) {
    const a = [];
    const wantedHere = ui._wanted(it);
    if (wantedHere) a.push({ label: 'Curator', cls: 'gold', fn: function () { viaBag(i, function (idx) { ui._sendToCurator(idx); }); } });
    if (it.slot && has('sell')) a.push({ label: 'Sell' + (it.value ? ' ' + fmt(it.value) + 'g' : ''), cls: wantedHere ? '' : 'gold', fn: function () {
      viaBag(i, function (idx) { ui._gemGuard(idx, 'Sell', function () { const g = ui._itemsCall('sell', idx); if (g > 0) ui._sfx('sell'); ui._refreshNow(); }); });
    } });
    if (it.slot && has('salvage')) a.push({ label: 'Salvage', fn: function () {
      viaBag(i, function (idx) {
        const go = function () { ui._itemsCall('salvage', idx); ui._refreshNow(); };
        if (!ui._gemGuard(idx, 'Salvage', go)) go();
      });
    } });
    if (has('stashDeposit')) a.push({ label: 'Stash', fn: function () { viaBag(i, function (idx) { if (ui._itemsCall('stashDeposit', idx) === false) ui._sfx('error'); }); } });
    a.push({ label: 'Take', fn: function () { viaBag(i); } });
    return a;
  }

  function surfaceBody(view) {
    const list = surface();
    const body = h('div', { class: 'ed-body' });
    const items = [];
    list.forEach(function (it, i) { if (it) items.push({ it: it, i: i }); });
    if (!items.length) { body.appendChild(h('div', { class: 'ed-box ed-note', text: 'Nothing has come up yet. Items you send down a chute in the rift arrive here, instantly.' })); return { body: body, foot: null }; }
    const wantedN = items.filter(function (x) { return ui._wanted(x.it); }).length;
    const junkN = items.filter(function (x) { return x.it.slot && !x.it.locked && !ui._wanted(x.it) && ui._isJunk(x.it); }).length;
    const rule = junkRule();
    body.appendChild(h('div', { class: 'ed-note', style: 'margin-bottom:6px', text: items.length + ' item' + (items.length === 1 ? '' : 's') + ' up here. Tap one to sell it, salvage it, hand it in or stash it.' }));
    items.forEach(function (x) {
      const it = x.it, v = ui._verdict(it), want = ui._wanted(it);
      body.appendChild(h('button', { type: 'button', class: 'ed-row', 'aria-label': (it.name || 'item'), onclick: function () {
        ui._sfx('click');
        ui._showItem(it, actionsFor(x.i, it), { lock: false });
      } }, ui._icon(it.icon, 32),
        h('span', { class: 'n ' + ui._glowText(it.rarity), style: '--rc:' + ui._rarityColor(it.rarity) + ';color:' + ui._rarityColor(it.rarity) },
          v === 'up' ? h('b', { class: 'ed-good', text: '▲ ' }) : v === 'down' ? h('b', { class: 'ed-bad', text: '▼ ' }) : null,
          want ? h('i', { class: 'bk' }) : null, (it.qty > 1 ? it.qty + ' ' : '') + (it.name || '?'),
          h('small', { text: (C.RARITY[it.rarity] ? C.RARITY[it.rarity].name : '') + (it.slot ? ' · ' + it.slot : '') + (it.value ? ' · ' + fmt(it.value * (it.qty || 1)) + 'g' : '') }))));
    });
    // bulk: one tap each; every one moves the items through the bag one by one, stopping if the bag fills
    const each = function (filter, fn) {
      let n = 0;
      for (let k = surface().length - 1; k >= 0; k--) {
        const it = surface()[k];
        if (it && filter(it) && !viaBag(k, function (idx) { if (fn) fn(idx); n++; })) break;
      }
      ui._refreshNow();
      return n;
    };
    const foot = [];
    const curBtn = ui._btn('Curator' + (wantedN ? ' (' + wantedN + ')' : ''), function () {
      const n = each(function (it) { return ui._wanted(it); }, function (idx) { ui._sendToCurator(idx); });
      if (!n) ui._sfx('error');
    }, wantedN ? 'gold' : '');
    if (!wantedN) curBtn.disabled = true;
    const jb = ui._btn((rule === 'salvage' ? 'Salvage junk' : 'Sell junk') + (junkN ? ' (' + junkN + ')' : ''), function () {
      const n = each(function (it) { return it.slot && !it.locked && !ui._wanted(it) && ui._isJunk(it); },
        function (idx) { if (rule === 'salvage') ui._itemsCall('salvage', idx); else if (ui._itemsCall('sell', idx) > 0) ui._sfx('sell'); });
      if (!n) ui._sfx('error');
    }, junkN ? 'gold' : '');
    if (!junkN) jb.disabled = true;
    foot.push(curBtn, jb, ui._btn('Take all', function () { each(function () { return true; }, null); }));
    return { body: body, foot: foot };
  }
  ui._register('surface', {
    render: function (view) {
      if (!S.player) return ui._frame('Surface crate', null, h('div', { class: 'ed-body' }));
      const c = surfaceBody(view);
      return ui._frame('Surface crate', { foot: c.foot }, c.body);
    },
  });

  G.on('object:interact', function (e) {
    if (!e || !S.player || S.scene === 'menu') return;
    if (e.type === 'chute') {
      if (S.scene === 'dungeon') ui.open('chute'); else ui.toast('The chute only works down in the rift.', '#a89f8f');
    } else if (e.type === 'surface_crate') ui.open('surface');
  });
  ['inventory:changed', 'surface:changed'].forEach(function (n) { G.on(n, ui._refresh); });
})();
