// Loot piles (R5.6): the compact popup the game opens with pile:open { pileId }.
// Also the UI team's R5 pitch: "Review new finds" — walk through everything picked up since the last review, one card
// per item, one tap each (Equip / Sell or Salvage / Keep). state.flags.reviewedAt = newest foundAt already reviewed.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui;
  const TX = ui.S;
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

  // R8.3: a compact sheet pinned to the TOP edge (the stick and the action cluster live at the bottom). It is at most ~35% of
  // the short side tall, scrolls inside, can be collapsed to one 44 px bar, and never pauses the game or blocks the play area.
  let sheet = null, sheetLayer = null, sheetPile = null, sheetAt = null, sheetCollapsed = false;
  ui._inits.push(function (layers) { sheetLayer = layers.modal; });
  function closeSheet() { if (sheet) { sheet.remove(); sheet = null; } sheetPile = null; sheetAt = null; }
  ui._closePile = closeSheet;
  ui._updaters.push((function () {
    let t = 0;
    return function (dt) {
      if (!sheet) return;
      t -= dt; if (t > 0) return; t = 0.25;
      const p = S.player;
      if (!p || ui.isOpen() || S.scene === 'menu') { closeSheet(); return; }
      if (sheetAt && (sheetAt.x - p.x) * (sheetAt.x - p.x) + (sheetAt.y - p.y) * (sheetAt.y - p.y) > 25) closeSheet();      // walked away
    };
  })());
  function openPile(pileId) {
    closeSheet();
    if (!S.player || S.scene === 'menu' || ui.isOpen() || !sheetLayer) return;
    const first = pileList(pileId);
    if (!first.length) return;
    const g0 = (S.groundItems || []).filter(function (g) { return g && g.pileId === pileId; })[0];
    sheetAt = g0 ? { x: g0.x, y: g0.y } : null;
    sheetPile = pileId;
    const head = h('div', { class: 'ps-head' }), list = h('div', { class: 'ps-list' });
    sheet = h('div', { class: 'ed-pilesheet' + (sheetCollapsed ? ' collapsed' : '') }, list, head);
    sheetLayer.appendChild(sheet);
    const fill = function () {
      if (!sheet || sheetPile !== pileId) return;
      const items = pileList(pileId);
      if (!items.length) { closeSheet(); return; }
      const takeAll = ui._btn(TX.common.takeAll, function () {
        let r = null;
        if (G.items && G.items.pickupPile) { try { r = G.items.pickupPile(pileId); } catch (err) { console.error('[ui pickupPile]', err); } }
        else pileList(pileId).forEach(function (g) { take(g.id); });
        if (r && r.left > 0 && r.taken > 0) ui.toast(TX.chute.yourBagIsFull + r.left + TX.hud.leftOnTheGround, '#a89f8f');
        ui._sfx(r && !r.taken ? 'error' : 'loot');
        fill();
      }, 'gold ps-take');
      const fold = h('button', { type: 'button', class: 'ps-fold', 'aria-label': sheetCollapsed ? 'Show pile' : 'Hide pile', 'aria-expanded': sheetCollapsed ? 'false' : 'true',
        onclick: function () { ui._sfx('click'); sheetCollapsed = !sheetCollapsed; sheet.classList.toggle('collapsed', sheetCollapsed); fill(); } },
        (sheetCollapsed ? '▸ ' : '▾ ') + 'Pile · ' + items.length);
      head.replaceChildren(fold, ui._btn('X', closeSheet, 'ed-x'), takeAll);          // R8.14: big Take all last = bottom-right, the action-button side
      if (sheetCollapsed) { list.replaceChildren(); return; }
      list.replaceChildren.apply(list, items.map(function (g) {
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
          const info = h('button', { type: 'button', class: 'ed-btn ed-pinfo', 'aria-label': 'Look at ' + it.name, onclick: function (e) {
            e.stopPropagation(); ui._sfx('click');
            ui._showItem(it, [{ label: TX.common.take, cls: 'gold', fn: function () { if (take(g.id)) ui._sfx('loot'); fill(); } }], { lock: false });
          } }, '?');
          row.appendChild(info);
        }
        return row;
      }));
    };
    fill();
  }
  ui._openPile = openPile;
  // R12: a tap on a pile (or the LOOT button) takes everything that fits, best first; the list opens only on a long-press, which the game
  // marks with pile:open { long: true } (or popup / list). Without the flag the pile is simply taken.
  G.on('pile:open', function (e) {
    if (!e || e.pileId == null) return;
    if (e.long || e.popup || e.list) { openPile(e.pileId); return; }
    let r = null;
    if (G.items && G.items.pickupPile) { try { r = G.items.pickupPile(e.pileId); } catch (err) { console.error('[ui pickupPile]', err); } }
    if (r && r.taken > 0) ui._sfx('loot'); else ui._sfx('error');
    if (r && r.left > 0) ui.toast(r.taken > 0 ? TX.chute.yourBagIsFull + r.left + TX.hud.leftOnTheGround : 'Your bag is full.', '#a89f8f');
  });

  // The pile list opens from a hold on the LOOT button (hud.js emits pile:open { long: true }). A playfield long-press is not
  // used: a press on the ground is also an instant tap-to-move, which would walk over and take the pile first.

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
      if (i >= list.length) { ui.toast(TX.pile.allNewFindsReviewed, '#dfc06a'); return; }
      const it = list[i++];
      const index = function () { return p.inventory.indexOf(it); };
      const town = S.scene === 'town';
      const acts = [];
      if (it.slot) acts.push({ label: TX.common.equip, cls: ui._verdict(it) === 'up' ? 'gold' : '', fn: function () { done(it); const k = index(); if (k >= 0) ui._itemsCall('equip', k); next(); } });
      if (town && G.items && G.items.sell) {
        acts.push({ label: 'Sell' + (it.value ? ' ' + fmt(it.value * (it.qty || 1)) + 'g' : ''), fn: function () {
          done(it);
          const k = index();
          if (k < 0) { next(); return; }
          ui._gemGuard(k, 'Sell', function () { const g = ui._itemsCall('sell', k); if (g > 0) ui._sfx('sell'); next(); });
        } });
      }
      acts.push({ label: TX.pile.keep, cls: 'gold', fn: function () { done(it); next(); } });
      ui._showItem(it, acts, { info: [{ text: TX.pile.newFind + i + TX.menus.of + list.length + (town ? '' : '  ·  sell in town') }] });
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
