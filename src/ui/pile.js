// Loot piles (R5.6): the compact popup the game opens with pile:open { pileId }.
// Also the UI team's R5 pitch: "Review new finds" — walk through everything picked up since the last review, one card
// per item, one tap each (Equip / Sell or Salvage / Keep). state.flags.reviewedAt = newest foundAt already reviewed.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const h = ui._h, fmt = ui._fmt;

  // ---------- pile popup ----------
  function pileList(pileId) {
    let list = null;
    if (G.items && G.items.getPile) { try { list = G.items.getPile(pileId); } catch (err) { list = null; } }
    if (!Array.isArray(list)) list = (S.groundItems || []).filter(function (g) { return g && g.pileId === pileId; });
    return list.filter(function (g) { return g && g.item; }).sort(function (a, b) {
      const ga = a.item.type === 'gold', gb = b.item.type === 'gold';
      if (ga !== gb) return ga ? 1 : -1;                        // gold last: it is auto-picked anyway
      const va = ui._verdict(a.item) === 'up', vb = ui._verdict(b.item) === 'up';
      if (va !== vb) return va ? -1 : 1;                        // upgrades first
      return ui._rarityOrder(b.item.rarity) - ui._rarityOrder(a.item.rarity);
    });
  }

  function take(groundId) {
    if (!G.items || !G.items.pickup) return false;
    let ok = false;
    try { ok = !!G.items.pickup(groundId); } catch (err) { console.error('[ui pickup]', err); }
    if (!ok) ui._sfx('error');
    return ok;
  }

  let pileClose = null;
  function openPile(pileId) {
    if (pileClose) { pileClose(); pileClose = null; }
    if (!S.player || S.scene === 'menu' || ui.isOpen()) return;
    const first = pileList(pileId);
    if (!first.length) return;
    let close = null;
    const box = h('div', { class: 'ed-pile' });
    const fill = function () {
      const list = pileList(pileId);
      if (!list.length) { close(); return; }
      box.replaceChildren.apply(box, [h('div', { class: 'ed-h', text: 'Pile  ·  ' + list.length + ' item' + (list.length === 1 ? '' : 's') })].concat(
        list.map(function (g) {
          const it = g.item, gold = it.type === 'gold';
          const v = gold ? null : ui._verdict(it);
          const row = h('button', { type: 'button', class: 'ed-row', 'aria-label': 'Take ' + (it.name || 'item'), onclick: function () {
            if (take(g.id)) ui._sfx(gold ? 'gold' : 'loot');
            fill();
          } }, ui._icon(it.icon, 32),
            h('span', { class: 'n ' + (gold ? '' : ui._glowText(it.rarity)), style: '--rc:' + ui._rarityColor(it.rarity) + ';color:' + ui._rarityColor(it.rarity) },
              v === 'up' ? h('b', { class: 'ed-good', text: '▲ ' }) : v === 'down' ? h('b', { class: 'ed-bad', text: '▼ ' }) : null,
              !gold && ui._wanted(it) ? h('i', { class: 'bk', 'aria-label': 'Collection Book piece' }) : null,
              gold ? fmt(it.qty || 0) + ' gold' : (it.qty > 1 ? it.qty + ' ' : '') + (it.name || '?'),
              !gold && Array.isArray(it.sockets) && it.sockets.length ? '  ' + it.sockets.map(function (s) { return s ? '◆' : '◇'; }).join('') : null,
              !gold && C.RARITY[it.rarity] ? h('small', { text: C.RARITY[it.rarity].name + (it.setId ? ' · Set' : '') + (it.slot ? ' · ' + it.slot : '') }) : null));
          if (!gold && (it.slot || it.type === 'gem')) {
            // look before taking: the tooltip, with Take as its action
            const info = h('button', { type: 'button', class: 'ed-btn ed-pinfo', 'aria-label': 'Look at ' + it.name, onclick: function (e) {
              e.stopPropagation(); ui._sfx('click');
              ui._showItem(it, [{ label: 'Take', cls: 'gold', fn: function () { if (take(g.id)) ui._sfx('loot'); fill(); } }], { lock: false });
            } }, '?');
            row.appendChild(info);
          }
          return row;
        })));
    };
    fill();
    const takeAll = ui._btn('Take all', function () {
      let r = null;
      if (G.items && G.items.pickupPile) { try { r = G.items.pickupPile(pileId); } catch (err) { console.error('[ui pickupPile]', err); } }
      else pileList(pileId).forEach(function (g) { take(g.id); });
      if (r && r.left > 0 && r.taken > 0) ui.toast('Your bag is full. ' + r.left + ' left on the ground.', '#a89f8f');
      ui._sfx(r && !r.taken ? 'error' : 'loot');
      fill();
      if (!pileList(pileId).length) close();
    }, 'gold');
    close = ui._modal(ui._dialog([box], [takeAll, ui._btn('Leave', function () { close(); })], 'ed-piledlg'), { pause: true });
    pileClose = function () { close(); };
    const c0 = close;
    close = function () { pileClose = null; c0(); };
  }
  ui._openPile = openPile;
  G.on('pile:open', function (e) { if (e && e.pileId != null) openPile(e.pileId); });

  // ---------- review new finds (pitch) ----------
  // Items gain foundAt (state.time) when picked up (R5.7, items team); stamp it here too if a pickup arrives without one.
  G.on('item:picked', function (e) {
    const it = e && e.item;
    if (it && typeof it === 'object' && it.type !== 'gold' && it.foundAt == null && !e.salvaged) it.foundAt = S.time || 0;
  });

  function reviewedAt() { const t = S.flags.reviewedAt; return typeof t === 'number' && isFinite(t) ? t : -1; }
  function newFinds() {
    const p = S.player;
    if (!p) return [];
    const t = reviewedAt();
    return (p.inventory || []).filter(function (it) { return it && it.slot && it.foundAt != null && it.foundAt > t && !it.locked; })
      .sort(function (a, b) { return a.foundAt - b.foundAt; });
  }

  function review() {
    const list = newFinds();
    if (!list.length) return;
    let i = 0;
    // items from one pile share a foundAt, so the mark only moves past a timestamp once every item carrying it is done
    const done = function (it) {
      const after = list[i];
      const t = !after || after.foundAt > it.foundAt ? it.foundAt : null;
      if (t != null && t > reviewedAt()) S.flags.reviewedAt = t;
    };
    const next = function () {
      ui._refreshNow();
      const p = S.player;
      while (i < list.length && (p.inventory || []).indexOf(list[i]) < 0) i++;     // gone meanwhile
      if (i >= list.length) { ui.toast('All new finds reviewed.', '#dfc06a'); return; }
      const it = list[i++];
      const index = function () { return p.inventory.indexOf(it); };
      const town = S.scene === 'town';
      const acts = [];
      if (it.slot) acts.push({ label: 'Equip', cls: ui._verdict(it) === 'up' ? 'gold' : '', fn: function () { done(it); const k = index(); if (k >= 0) ui._itemsCall('equip', k); next(); } });
      if (town && G.items && G.items.sell) {
        acts.push({ label: 'Sell' + (it.value ? ' ' + fmt(it.value * (it.qty || 1)) + 'g' : ''), fn: function () {
          done(it);
          const k = index();
          if (k < 0) { next(); return; }
          ui._gemGuard(k, 'Sell', function () { const g = ui._itemsCall('sell', k); if (g > 0) ui._sfx('sell'); next(); });
        } });
      } else if (G.items && G.items.salvage) {
        acts.push({ label: 'Salvage', fn: function () {
          done(it);
          const k = index();
          if (k < 0) { next(); return; }
          const go = function () { ui._itemsCall('salvage', k); next(); };
          if (ui._gemGuard(k, 'Salvage', go)) return;
          if (ui._rarityAtLeast(it.rarity, 'rare')) ui._confirm('Salvage ' + it.name + '?', 'Salvage', go, { danger: true });
          else go();
        } });
      }
      acts.push({ label: 'Keep ▶', cls: 'gold', fn: function () { done(it); next(); } });
      ui._showItem(it, acts, { info: [{ text: 'New find ' + i + ' of ' + list.length + (town ? '' : '  ·  sell in town') }] });
    };
    next();
  }

  ui._reviewButton = function () {
    const n = newFinds().length;
    const b = ui._btn('New' + (n ? ' ' + n : ''), review, n ? 'gold' : '');
    b.setAttribute('aria-label', 'Review ' + n + ' new finds');
    if (!n) b.disabled = true;
    return b;
  };
  ui._newFinds = newFinds;
})();
