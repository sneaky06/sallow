// R9 "push your luck" UI: the shrine bargain prompt (+ the active bargain under the depth label), the Close Call / flow chain
// counter, and the Scavenger banners. Everything is guarded: the game side (shrine:offer, acceptBargain, scavenger entities) is
// built in parallel, so each piece listens for its event AND falls back to reading state where that is cheap.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h;

  const text = function (v) { return typeof v === 'string' ? v : (v && (v.text || v.desc || v.label || v.name)) || ''; };

  // ---------- shrine bargain ----------
  // shrine:offer { id, name, cost, reward } -> pause, two big buttons with the exact terms. Accept -> game.acceptBargain(id),
  // Decline -> game.declineBargain(id). The accepted terms stay under the depth label until the floor ends.
  let strip = null, active = null;
  ui._inits.push(function () {
    const area = document.querySelector('#ui .ed-area');
    if (!area) return;
    strip = h('small', { class: 'ed-bargain-strip', style: 'display:none' });
    area.appendChild(strip);
  });
  function paintStrip() {
    if (!strip) return;
    let b = active;
    if (!b && G.game && typeof G.game.getBargain === 'function') { try { const g = G.game.getBargain(); if (g) b = { name: g.name || 'Bargain', cost: g.cost, reward: g.reward }; } catch (err) { /* ignore */ } }
    const want = b ? '⚖ ' + (b.name || 'Bargain') + ': ' + text(b.cost) + ' → ' + text(b.reward) : '';
    if (strip.textContent !== want) {
      strip.textContent = want;
      strip.style.display = want ? 'block' : 'none';
      const hud = ui._hudEl, area = strip.parentNode;
      if (hud && area && ui._setTrkTop) ui._setTrkTop();
    }
  }
  ui._updaters.push((function () { let t = 0; return function (dt) { t -= dt; if (t <= 0) { t = 0.5; paintStrip(); } }; })());

  G.on('shrine:offer', function (e) {
    if (!e || !S.player) return;
    const id = e.id;
    let close = null;
    const done = function (accept) {
      close();
      const fn = G.game && G.game[accept ? 'acceptBargain' : 'declineBargain'];
      if (typeof fn === 'function') { try { fn.call(G.game, id); } catch (err) { console.error('[ui bargain]', err); } }
      if (accept) {
        active = { name: e.name, cost: e.cost, reward: e.reward };
        ui._sfx('shrine');
        ui.toast(TX.risk.bargainStruck + text(e.reward), '#7fffd4');
      } else ui._sfx('click');
      paintStrip();
    };
    const accept = ui._btn(TX.common.accept, function () { done(true); }, 'big gold');
    const decline = ui._btn(TX.risk.decline, function () { done(false); }, 'big');
    close = ui._modal(ui._dialog([
      h('div', { class: 'ed-h', text: e.name || 'A bargain' }),
      h('div', { class: 'ed-bg-row ed-bad' }, h('b', { text: TX.risk.youPay }), h('span', { text: text(e.cost) || '?' })),
      h('div', { class: 'ed-bg-row ed-good' }, h('b', { text: TX.risk.youGet }), h('span', { text: text(e.reward) || '?' })),
      h('div', { class: 'ed-note', style: 'margin-top:6px', text: TX.risk.lastsUntilYouLeave }),
    ], [accept, decline], 'ed-bargain'), { pause: true, dismiss: false });
    if (ui._tip) ui._tip('bargain');
  });
  G.on('scene:changed', function () { active = null; paintStrip(); });

  // ---------- Close Call chain counter ----------
  // The game stacks the 'close_call' effect (×1..3). A small pill pops every time the stack grows; events 'flow:chain' { count }
  // and 'flow:trigger' are honoured when combat sends them (the bigger chain / slow-motion moment).
  let pill = null, pillN = 0, pillT = 0, lastStacks = 0;
  ui._inits.push(function (layers) {
    pill = h('div', { class: 'ed-chain', style: 'display:none', 'aria-live': 'polite' });
    layers.hud.appendChild(pill);
  });
  function pop(label, n, color) {
    if (!pill) return;
    pill.textContent = label;
    pill.style.color = color || '#7fffd4';
    pill.style.display = 'block';
    pill.classList.remove('pop'); void pill.offsetWidth; pill.classList.add('pop');
    pill.dataset.n = String(n || '');
    pillT = 1.6;
  }
  G.on('flow:chain', function (e) { const n = (e && (e.count || e.chain)) | 0; if (n > 0) pop('FLOW CHAIN ×' + n, n, '#ffe45b'); });
  G.on('flow:trigger', function () { pop('FLOW!', 9, '#ffe45b'); ui._sfx('shrine'); });
  ui._updaters.push(function (dt) {
    if (!S.player || S.scene !== 'dungeon') { if (pill && pill.style.display !== 'none') pill.style.display = 'none'; lastStacks = 0; return; }
    let st = 0;
    if (G.game && typeof G.game.getEffect === 'function') { try { const fx = G.game.getEffect(S.player, 'close_call'); st = fx ? fx.stacks | 0 : 0; } catch (err) { st = 0; } }
    if (st > lastStacks) { pop('CLOSE CALL' + (st > 1 ? ' ×' + st : ''), st); if (ui._stat) ui._stat('closeCalls'); G.emit('closecall:ui', {}); }
    lastStacks = st;
    if (pillT > 0) { pillT -= dt; if (pillT <= 0 && pill) pill.style.display = 'none'; }
  });

  // ---------- the Scavenger ----------
  // A rival looter. Seen once per floor -> banner. When he takes an item ('scavenger:grab' { item }, or his entity starts carrying
  // one) -> banner naming the item. Entity is recognised by monsterId / flags; field names are read defensively.
  const isScav = function (e) { return !!e && !e.dead && (e.scavenger || /scavenger/i.test(String(e.monsterId || e.id2 || '')) || /scavenger/i.test(String(e.name || ''))); };
  let seenScav = false, carrying = null;
  const grab = function (it) {
    const nm = it && (it.name || (typeof it === 'string' ? it : ''));
    ui._banner(TX.risk.theScavengerTook + (nm || 'your loot') + '!', 'Run him down and kill him to get it back.', '#ff8a2b', 5);
    ui._sfx('error');
    if (ui._tip) ui._tip('scavenger');
  };
  G.on('scavenger:grab', function (e) { grab(e && e.item); });
  G.on('scavenger:appear', function () { seenScav = true; ui._banner(TX.risk.theScavenger, 'A rival looter is on this floor. Get to the best drop first.', '#ffb347', 4); if (ui._tip) ui._tip('scavenger'); });
  ui._updaters.push((function () {
    let t = 0;
    return function (dt) {
      t -= dt; if (t > 0) return; t = 0.3;
      if (!S.player || S.scene !== 'dungeon') return;
      let sc = null;
      for (const e of (S.entities || [])) if (isScav(e)) { sc = e; break; }
      if (sc && !seenScav) { seenScav = true; ui._banner(TX.risk.theScavenger, 'A rival looter is on this floor. Get to the best drop first.', '#ffb347', 4); if (ui._tip) ui._tip('scavenger'); }
      const c = sc && (sc.carrying || sc.carry || sc.loot || sc.stolen);
      if (c && !carrying) grab(typeof c === 'object' ? (c.item || c) : null);
      carrying = c || null;
    };
  })());
  G.on('scene:changed', function () { seenScav = false; carrying = null; lastStacks = 0; if (pill) pill.style.display = 'none'; });

  // tips for the new things (table lives in tips.js)
  if (ui._TIPS) {
    ui._TIPS.bargain = [TX.tipcards.bargainTitle, TX.tipcards.bargainText, { shape: 'rune', color: '#7fffd4' }];
    ui._TIPS.scavenger = [TX.tipcards.scavengerTitle, TX.tipcards.scavengerText, { shape: 'skull', color: '#ffb347' }];
  }
})();
