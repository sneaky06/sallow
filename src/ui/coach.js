// R-FTE coach: a new hero's first ten minutes, taught in place instead of in text walls. Only for heroes that carry
// state.flags.fte (game/firstrun.js; older saves never do). Two pieces, neither pauses the game:
//  - hints: a short line beside one HUD button (which pulses) at the moment it matters, each once (flags.coachSeen),
//    one at a time and a few seconds apart; they leave when the player does the thing or after a few seconds;
//  - the guide: one arrow on the ground (or at the screen edge) toward the next place to go — the stair on arrival,
//    the trader and then the healer on the first trip back up, your corpse on a corpse run, the stair down once most of the
//    first floor is seen — with a matching tracker line in town.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h;

  const GAP = 5, SHOW = 6;          // seconds of play between two hints · how long one stays up
  let layer = null, bub = null, arrow = null, arrowTxt = null, cur = null, curAt = 0, nextAt = 0, pulsed = null;
  let lastMove = { x: 0, y: 0, t: 0, steps: 0 }, lastHit = -99, guideKey = '', scanT = 0, arrowXY = '';

  const fte = function () { const f = S.flags && S.flags.fte; return f && typeof f === 'object' ? f : null; };
  function seen() { return Array.isArray(S.flags.coachSeen) ? S.flags.coachSeen : (S.flags.coachSeen = []); }
  const was = function (id) { return seen().indexOf(id) >= 0; };
  ui._coachState = function () { return { hint: cur ? cur.id : null, guide: guideKey || null }; };

  const hud = function (sel) { return ui._hudEl ? ui._hudEl.querySelector(sel) : null; };
  const firstSkill = function () { const b = ui._hudEl ? ui._hudEl.querySelectorAll('.ed-skill') : []; for (let i = 0; i < b.length; i++) if (!b[i].classList.contains('empty')) return b[i]; return null; };
  function foeNear(r) {
    const p = S.player, ents = S.entities || [];
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (e.type === 'monster' && !e.dead && (!e.faction || e.faction === 'enemy') && Math.hypot(e.x - p.x, e.y - p.y) < r) return e;
    }
    return null;
  }
  const busy = function () { return ui.isOpen() || !!document.querySelector('#ui .ed-modal'); };
  const hpFrac = function () { const p = S.player; return p.stats && p.stats.hpMax ? p.hp / p.stats.hpMax : 1; };
  function bagUpgrade() {
    const inv = S.player.inventory || [];
    for (let i = 0; i < inv.length; i++) { const it = inv[i]; if (it && it.slot && ui._verdict && ui._verdict(it) === 'up') return true; }
    return false;
  }
  function dashReady() { try { const a = G.game.getClassAction && G.game.getClassAction(); return !!(a && a.ready); } catch (err) { return false; } }

  // ---------- the hints, in priority order. when(): show now? done(): the player did it ----------
  const HINTS = [
    { id: 'potion', text: TX.fte.potion, at: function () { return hud('.ed-pot'); },
      when: function () { return S.scene === 'dungeon' && hpFrac() < 0.4 && (S.player.potions.hp | 0) > 0; } },
    { id: 'dash', text: TX.fte.dash, at: function () { return hud('.ed-dash'); },
      when: function () { return S.scene === 'dungeon' && hpFrac() < 0.65 && foeNear(3) && dashReady(); } },
    { id: 'attack', text: TX.fte.attack, at: function () { return hud('.ed-atk'); },
      when: function () { return S.scene === 'dungeon' && !!foeNear(7) && !(S.flags.kills > 0); },
      done: function () { return S.flags.kills > 0; } },
    { id: 'skill', text: TX.fte.skill, at: firstSkill,
      when: function () { return S.scene === 'dungeon' && was('attack') && !!foeNear(7) && !!firstSkill(); } },
    { id: 'loot', text: TX.fte.loot, at: function () { return hud('.ed-atk'); },
      when: function () { return S.scene === 'dungeon' && G.game.getActionMode && G.game.getActionMode() === 'loot' && !foeNear(5); } },
    { id: 'upgrade', text: TX.fte.upgrade, at: function () { return hud('.ed-topbtns .ed-top'); },
      when: function () { return !foeNear(8) && S.time - lastHit > 3 && bagUpgrade(); },
      done: function () { const c = ui._current && ui._current(); return !!(c && c.name === 'inventory'); } },
    { id: 'portal', text: TX.fte.portal, at: function () { return hud('.ed-portal'); },
      // down to the last flask with loot in the bag: the trip home (sell, buy flasks, come back by the portal) is the lesson
      when: function () { const n = S.player.potions.hp | 0; return S.scene === 'dungeon' && (n === 0 || (n === 1 && S.player.inventory.filter(Boolean).length >= 3)) && !foeNear(8) && S.time - lastHit > 4; } },
    { id: 'move', text: TX.fte.move, at: null,
      when: function () { return S.time - lastMove.t > 5 && !foeNear(8); },
      done: function () { return S.time - lastMove.t < 0.5; } },
  ];
  // the one hint that may show over a panel: inside the Bag, which piece to tap
  const EQUIP = { id: 'equip', text: TX.fte.equipHint, at: null };

  function place(el, anchor) {
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = vw / 2, y = vh * 0.62, below = false;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top - 8;
      if (r.top < vh / 2) { y = r.bottom + 8; below = true; }          // top buttons: the hint hangs below them, clear of the depth label
    }
    el.classList.toggle('below', below);
    const w = el.offsetWidth || 160, left = Math.round(Math.max(8, Math.min(vw - w - 8, x - w / 2)));
    el.style.left = left + 'px';
    el.style.setProperty('--ax', Math.round(Math.max(12, Math.min(w - 12, x - left))) + 'px');          // the pointer stays over the button
    el.style.top = Math.round(below ? y : y - (el.offsetHeight || 28)) + 'px';
  }
  function hide() {
    if (pulsed) { pulsed.classList.remove('ed-pulse'); pulsed = null; }
    if (bub) bub.style.display = 'none';
    if (cur) nextAt = S.time + GAP;
    cur = null;
  }
  function show(hint) {
    if (!bub) return;
    cur = hint; curAt = S.time;
    if (seen().indexOf(hint.id) < 0) seen().push(hint.id);
    if (hint.id === 'dash' && Array.isArray(S.flags.tipsSeen) && S.flags.tipsSeen.indexOf('dash') < 0) S.flags.tipsSeen.push('dash');
    bub.textContent = hint.text;
    bub.style.display = 'block';
    const a = hint.at ? hint.at() : null;
    if (a && a.closest('.ed-hud')) { a.classList.add('ed-pulse'); pulsed = a; }
    place(bub, a);
  }

  // ---------- the guide: where to go next ----------
  function flaskPrice() { let v = 0; try { v = G.items.potionPrice ? +G.items.potionPrice('hp') : 0; } catch (err) { v = 0; } return v > 0 ? v : 25; }
  function npc(role) { return (S.entities || []).find(function (e) { return e.type === 'npc' && e.role === role; }) || null; }
  function guide() {
    const f = fte(), p = S.player;
    if (!f || !p || !S.map) return null;
    if (S.scene === 'town') {
      if (!(S.flags.visits > 0) && !was('wentDown')) {
        const ent = (S.map.props || []).find(function (pr) { return pr.type === 'dungeon_entrance'; });
        if (ent) return { key: 'stairs', x: ent.x + 0.5, y: ent.y + 0.5, text: TX.fte.stairs, row: TX.fte.goDown };
      }
      if (!f.town && !was('sold') && S.player.inventory.some(Boolean)) {
        const m = npc('merchant');
        if (m) return { key: 'sell', x: m.x, y: m.y, text: m.name, row: ui.fmt(TX.fte.sell, { name: m.name }) };
      }
      // then, short of flasks with gold to spend: the healer sells them
      if (was('sold') && !was('healer') && (p.potions.hp | 0) < 3 && p.gold >= flaskPrice()) {
        const hl = npc('healer');
        if (hl) return { key: 'healer', x: hl.x, y: hl.y, text: hl.name, row: ui.fmt(TX.fte.flaskRow, { name: hl.name }) };
      }
      return null;
    }
    if (S.scene !== 'dungeon') return null;
    const c = S.flags.corpse;
    if (c && c.depth === S.depth) return { key: 'corpse', x: c.x, y: c.y, text: TX.fte.corpse };
    // the first floor: once most of it is seen (or a while has passed) and the stair is known, point at it
    if (f.floor && S.depth === 1) {
      const m = S.map, T = G.C.TILE.STAIRS_DOWN;
      let ex = 0;
      try { const e = G.game.getExplored && G.game.getExplored(); ex = e && e.value != null ? e.value : 0; } catch (err) { ex = 0; }
      if (ex >= 55 || S.time - lastMove.arrive > 100) {
        for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === T && m.explored[i]) return { key: 'down', x: i % m.w + 0.5, y: ((i / m.w) | 0) + 0.5, text: TX.fte.stairs };
      }
    }
    return null;
  }
  function drawGuide(g) {
    if (!arrow) return;
    if (!g || busy() || !G.engine || !G.engine.worldToScreen) { if (arrowXY) { arrow.style.display = 'none'; arrowXY = ''; } return; }
    const p = S.player, d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d < 1.6) { if (arrowXY) { arrow.style.display = 'none'; arrowXY = ''; } return; }
    // the safe box keeps clear of the top buttons and the thumb cluster at the bottom
    const s = G.engine.worldToScreen(g.x, g.y), vw = window.innerWidth, vh = window.innerHeight, L = 30, R = vw - 30, T = 160, B = vh - 300;
    let x = s.x, y = s.y - 30, edge = false;
    if (x < L || x > R || y < T || y > B) {          // off screen: a chevron on the edge of the safe box, pointing the way
      const ps = G.engine.worldToScreen(p.x, p.y), ox = Math.max(L, Math.min(R, ps.x)), oy = Math.max(T, Math.min(B, ps.y));
      const dx = s.x - ox, dy = s.y - oy;
      const k = Math.min(Math.abs((dx > 0 ? R - ox : L - ox) / (dx || 1e-6)), Math.abs((dy > 0 ? B - oy : T - oy) / (dy || 1e-6)));
      x = ox + dx * k; y = oy + dy * k; edge = true;
    }
    const ang = edge ? Math.atan2(s.y - y, s.x - x) * 180 / Math.PI : 0;          // the edge chevron points right at 0°
    const key = Math.round(x) + ',' + Math.round(y) + ',' + Math.round(ang) + g.key;
    if (key === arrowXY) return;
    if (!arrowXY) arrow.style.display = 'block';
    arrowXY = key;
    arrow.classList.toggle('edge', edge);
    arrow.style.transform = 'translate(' + Math.round(x - 14) + 'px,' + Math.round(y - 14) + 'px)';
    arrow.firstChild.style.transform = 'rotate(' + Math.round(edge ? ang : 0) + 'deg)';
    const label = edge ? '' : (g.text || '');
    if (arrowTxt.textContent !== label) arrowTxt.textContent = label;
  }
  // tracker rows (hud.js calls this when it redraws the tracker)
  ui._coachRows = function (rows) {
    const g = fte() ? guide() : null;
    if (g && g.row) rows.push(h('div', { style: 'color:#ffd94a', text: g.row }));
  };

  ui._inits.push(function (layers) {
    layer = h('div', { class: 'ed-coach' });
    bub = h('div', { class: 'ed-hint', style: 'display:none' });
    arrowTxt = h('span');
    arrow = h('div', { class: 'ed-guide', style: 'display:none' }, h('i', { text: '▼' }), arrowTxt);
    layer.append(arrow, bub);
    layers.root.appendChild(layer);
  });

  ui._updaters.push(function (dt) {
    const p = S.player;
    if (!p || S.scene === 'menu' || !fte()) { if (cur) hide(); if (arrowXY && arrow) { arrow.style.display = 'none'; arrowXY = ''; } return; }
    if (Math.hypot(p.x - lastMove.x, p.y - lastMove.y) > 0.3) {
      lastMove.x = p.x; lastMove.y = p.y; lastMove.t = S.time;
      if (!was('move') && cur !== HINTS[HINTS.length - 1] && ++lastMove.steps > 12) seen().push('move');     // walked on their own: no "how to walk" hint
    }
    scanT -= dt;
    if (scanT <= 0) {
      scanT = 0.2;
      const g = guide();
      const k = g ? g.key : '';
      if (k !== guideKey) { guideKey = k; if (ui._questDirty) ui._questDirty(); }
      drawGuide.g = g;
      // hints: none while dead or a panel/dialog is up (the Bag's own hint excepted)
      const c = ui._current && ui._current();
      if (cur === EQUIP) { if (!(c && c.name === 'inventory') || !bagUpgrade()) hide(); }
      else if (cur) {
        if (busy() || p.dead || (cur.done && cur.done()) || S.time - curAt > SHOW) hide();
      } else if (c && c.name === 'inventory' && was('upgrade') && !was('equip') && bagUpgrade()) show(EQUIP);
      else if (!busy() && !p.dead && S.time >= nextAt) {
        for (let i = 0; i < HINTS.length; i++) {
          const x = HINTS[i];
          if (was(x.id)) continue;
          let ok = false;
          try { ok = x.when(); } catch (err) { ok = false; }
          if (ok) { show(x); break; }
        }
      }
    }
    drawGuide(drawGuide.g);
  });

  G.on('player:damaged', function () { lastHit = S.time; });
  G.on('scene:changed', function (e) {
    hide(); nextAt = (S.time || 0) + 2; guideKey = ''; drawGuide.g = null;
    if (S.player) { lastMove.x = S.player.x; lastMove.y = S.player.y; lastMove.t = S.time; lastMove.arrive = S.time; }
    if (e && e.scene === 'dungeon' && fte() && !was('wentDown')) seen().push('wentDown');
  });
  G.on('npc:interact', function (e) {
    if (!e || !fte()) return;
    const id = e.role === 'merchant' ? 'sold' : e.role === 'healer' ? 'healer' : null;
    if (id && !was(id)) { seen().push(id); if (ui._questDirty) ui._questDirty(); }
  });
  G.on('inventory:changed', function () { if (fte() && ui._questDirty) ui._questDirty(); });
  G.on('input:skill', function () { if (cur && cur.id === 'skill') hide(); });
  G.on('input:classaction', function () { if (cur && cur.id === 'dash') hide(); });
  G.on('input:potion', function () { if (cur && cur.id === 'potion') hide(); });
  G.on('item:picked', function () { if (cur && cur.id === 'loot') hide(); });
  G.on('equipment:changed', function () { if (cur === EQUIP) { if (!was('equip')) seen().push('equip'); hide(); } });
  G.on('story:opening', function () { nextAt = (S.time || 0) + 1; if (S.player) lastMove.t = S.time; });
  // a new hero who rises in town after an early death gets two flasks (game/firstrun.js)
  G.on('fte:flasks', function (e) { setTimeout(function () { ui.toast(ui.fmt(TX.fte.flasks, { n: (e && e.count) || 2 }), '#ff8a8a'); }, 900); });
})();
