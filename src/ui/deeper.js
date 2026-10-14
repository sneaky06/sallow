// R6.1 "Go deeper?" — once Pallor is unlocked the game emits 'stairs:confirm' instead of descending; this asks first.
// Shows the Pallor now and after the stair (G.game.getPallor / previewPallor), what the next tier adds and the loot boost.
// Descend -> G.game.confirmDescend(). "Don't ask again this run" = state.flags.deeperNoAsk, cleared on reaching town.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui;
  const h = ui._h;

  const TEXT = {
    title: 'Go deeper?',
    stay: 'Stay', go: 'Descend',
    noAsk: 'Don\'t ask again this run',
    nextTier: 'Pallor {tier} brings',
    sameTier: 'Pallor rises to {value}. Next tier at {min}.',
    maxed: 'Pallor is as deep as it goes.',
    home: 'Go home and the colour comes back.',
    reward: 'Loot',
  };
  const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'];
  const LOOT_RX = /loot|drop|item|rarity|magic find/i;

  function call(name, arg) {
    const fn = G.game && G.game[name];
    if (typeof fn !== 'function') return null;
    try { return fn(arg); } catch (err) { console.error('[ui deeper] ' + name, err); return null; }
  }
  function tierMins() {
    const T = G.game && G.game.PALLOR_TIERS;
    return Array.isArray(T) && T.length ? T.map(function (t) { return +t.min || 0; }) : [0, 25, 50, 75];
  }
  function norm(p, fallbackValue) {
    const value = Math.max(0, Math.min(100, Math.round(p && p.value != null ? +p.value : fallbackValue)));
    const mins = tierMins();
    let tier = 0;
    for (let i = 1; i < mins.length; i++) if (value >= mins[i]) tier = i;
    return { value: value, tier: p && p.tier != null ? p.tier | 0 : tier, effects: (p && Array.isArray(p.effects)) ? p.effects : [],
      loot: p ? (p.loot || p.reward || p.rewards || null) : null };
  }
  function lootText(p) {
    const l = p.loot;
    if (typeof l === 'string') return l;
    if (typeof l === 'number') return '+' + Math.round(l) + '%';
    if (l && typeof l === 'object') {
      const parts = [];
      if (l.quantity != null || l.qty != null) parts.push('+' + Math.round(l.quantity != null ? l.quantity : l.qty) + '% items');
      if (l.rarity != null || l.magicFind != null) parts.push('+' + Math.round(l.rarity != null ? l.rarity : l.magicFind) + '% rarity');
      if (l.text) parts.push(String(l.text));
      return parts.join(', ');
    }
    return '';
  }

  // One bar: what you carry now, the slice this stair adds (hatched) and the tier marks.
  function bar(now, next) {
    const marks = tierMins().slice(1).map(function (m) { return h('b', { style: 'left:' + m + '%' }); });
    return h('div', { class: 'ed-dpbar' },
      h('i', { class: 'now', style: 'width:' + now.value + '%' }),
      h('i', { class: 'add', style: 'left:' + now.value + '%;width:' + Math.max(0, next.value - now.value) + '%' }),
      marks);
  }

  let open = null;
  function prompt(e) {
    if (open && open.el.isConnected) return;
    if (S.flags.deeperNoAsk) { descend(); return; }
    const raw = call('getPallor');
    const now = norm(raw, +S.flags.pallor || 0);
    let nextV = e && (e.nextValue != null ? +e.nextValue : (e.next != null && typeof e.next !== 'object' ? +e.next : NaN));
    if (!(nextV >= 0)) {
      const gain = call('pallorGain', (S.depth | 0) + 1);
      nextV = now.value + (gain != null ? +gain : 10);
    }
    nextV = Math.min(100, nextV);
    const next = norm(call('previewPallor', nextV), nextV);
    const mins = tierMins();
    const toD = e && e.depth != null ? e.depth | 0 : (S.depth | 0) + 1;

    // what changes: new effect lines when the tier goes up, else how far the next tier is
    const lines = [];
    if (next.tier > now.tier) {
      lines.push(h('div', { class: 'ed-h', text: TEXT.nextTier.replace('{tier}', ROMAN[next.tier] || next.tier) }));
      const fresh = next.effects.filter(function (x) { return now.effects.indexOf(x) < 0; });
      (fresh.length ? fresh : next.effects).forEach(function (x) {
        lines.push(h('div', { class: 'ed-dpfx' + (LOOT_RX.test(x) ? ' gold' : ''), text: x }));
      });
    } else {
      const nm = mins[now.tier + 1];
      lines.push(h('div', { class: 'ed-note', text: nm != null ? TEXT.sameTier.replace('{value}', next.value).replace('{min}', nm) : TEXT.maxed }));
      now.effects.forEach(function (x) { lines.push(h('div', { class: 'ed-dpfx dim' + (LOOT_RX.test(x) ? ' gold' : ''), text: x })); });
    }
    const loot = lootText(next);
    if (loot) lines.push(h('div', { class: 'ed-kv' }, h('span', { text: TEXT.reward }), h('b', { class: 'ed-gold', text: loot })));

    let noAsk = false;
    const tick = h('button', { type: 'button', class: 'ed-btn ed-dptick', 'aria-pressed': 'false', onclick: function () {
      ui._sfx('click'); noAsk = !noAsk; tick.setAttribute('aria-pressed', noAsk ? 'true' : 'false');
    } }, h('i'), TEXT.noAsk);

    const body = [
      h('div', { class: 'ed-dptitle', text: TEXT.title }),
      h('div', { class: 'ed-dpdepth', text: 'Depth ' + (S.depth | 0) + '  ▶  ' + toD + (ui._themeName ? '  ·  ' + ui._themeName(toD) : '') }),
      h('div', { class: 'ed-dprow' },
        h('span', { class: 'ed-dpt t' + Math.min(4, now.tier), text: 'Pallor ' + now.value + (now.tier ? ' ' + (ROMAN[now.tier] || '') : '') }),
        h('span', { class: 'ed-dpt t' + Math.min(4, next.tier), text: '▶ ' + next.value + (next.tier ? ' ' + (ROMAN[next.tier] || '') : '') })),
      bar(now, next),
      lines,
      h('div', { class: 'ed-note', style: 'margin-top:6px', text: TEXT.home }),
      tick,
    ];
    let close = null;
    const done = function (go) {
      if (!close) return;
      close(); close = null; open = null;
      if (go) {
        if (noAsk) S.flags.deeperNoAsk = true;
        descend();
      } else call('cancelDescend');
    };
    const dlg = ui._dialog(body, [ui._btn(TEXT.stay, function () { done(false); }, 'big'),
      ui._btn(TEXT.go, function () { ui._sfx('stairs'); done(true); }, 'big gold')], 'ed-deeper');
    close = ui._modal(dlg, { dismiss: false, pause: true });
    open = { el: dlg, close: close };
  }
  function descend() {
    if (G.game && typeof G.game.confirmDescend === 'function') call('confirmDescend');
    else if (G.scenes && G.scenes.descend) G.scenes.descend();
  }
  ui._deeperPrompt = prompt;

  G.on('stairs:confirm', function (e) {
    if (!S.player || S.scene !== 'dungeon' || S.player.dead) return;
    prompt(e || {});
  });
  G.on('scene:changed', function (e) {
    if (open) { open.close(); open = null; }
    if (e && e.scene === 'town' && S.flags.deeperNoAsk) S.flags.deeperNoAsk = false;
  });
})();
