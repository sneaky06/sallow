// Optional play log (Settings > "Record play log"). Off by default: while off nothing is listening except one flag check per scene change.
// On, it aggregates per floor from game events (counters only, no per-frame work) and keeps the last ~100 floors in its own localStorage key.
// Export = a code-fenced text summary (tables first, then a short numeric data block) meant to be pasted into a chat message.
// Hooks (no side effects on the game): scene:changed, player:dealt, player:damaged, player:died, monster:killed, potion:used,
// closecall:ui, flow:chain, floor:graded, item:picked.
(function () {
  'use strict';
  const G = window.G;
  const ui = G.ui;
  const S = G.state;
  const TX = ui.S.playlog;

  const KEY = 'sallow.playlog.v1';
  const MAX_FLOORS = 100;
  const KILL_TIERS = ['normal', 'champion', 'rare', 'legendary', 'boss'];
  const RARITIES = ['common', 'uncommon', 'rare', 'magic', 'legendary', 'mythic', 'unique', 'rift'];

  let data = null;            // { v, sessions: [session] }; loaded on first use
  let session = null, cur = null, last = null;          // the open session, the floor being played, the floor just left
  let fights = null;          // active boss / Fallen fights on this floor: id -> { n, s }
  let on = false, offs = [];

  // ---------- storage ----------
  function load() {
    if (data) return data;
    data = { v: 1, sessions: [] };
    try {
      const raw = localStorage.getItem(KEY);
      const d = raw && JSON.parse(raw);
      if (d && d.v === 1 && Array.isArray(d.sessions)) data = d;
    } catch (err) { /* unreadable log: start fresh */ }
    return data;
  }
  function trim() {
    const d = load();
    let n = 0;
    for (const s of d.sessions) n += s.floors.length;
    while (n > MAX_FLOORS && d.sessions.length) {
      const s = d.sessions[0];
      if (s.floors.length) { s.floors.shift(); n--; }
      if (!s.floors.length && s !== session) d.sessions.shift();
      else if (!s.floors.length) break;
    }
    d.sessions = d.sessions.filter(function (s) { return s === session || s.floors.length; });
  }
  function persist() {
    try { trim(); localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { /* quota / private mode: keep it in memory */ }
  }

  // ---------- session / floor ----------
  function gearPower(p) {
    let sum = 0;
    try {
      if (G.items && G.items.power && p.equipment) for (const k in p.equipment) if (p.equipment[k]) sum += G.items.power(p.equipment[k]) || 0;
    } catch (err) { /* ignore */ }
    return Math.round(sum);
  }
  function snapshot(s, p) {
    s.l1 = p.level | 0; s.pw1 = gearPower(p);
    s.perks = Object.keys(p.perks || {});
    s.build = p.autoBuild || 'manual';
    s.t1 = Math.round(S.time || 0);
  }
  function startSession(p) {
    session = { t: Date.now(), cls: p.classId, name: p.name || '', l0: p.level | 0, pw0: gearPower(p), t0: Math.round(S.time || 0), floors: [] };
    snapshot(session, p);
    load().sessions.push(session);
  }
  function newFloor(depth) {
    const m = S.map, p = S.player;
    let act = 0;
    try { act = G.world && G.world.actForDepth ? G.world.actForDepth(depth) : 0; } catch (err) { act = 0; }
    return { d: depth, a: act, m: (m && m.mods ? m.mods.slice() : []), s: S.time || 0, t: 0, ex: null, g: '',
      k: [0, 0, 0, 0, 0], dd: 0, dt: 0, pot: [0, 0], cc: 0, fl: 0, ht: 0, dth: [], bs: [], au: 0, it: [0, 0, 0, 0, 0, 0, 0, 0], l: p ? p.level | 0 : 0, hit: 0 };
  }
  function endFloor() {
    if (!cur) return;
    const f = cur;
    cur = null;
    f.t = Math.max(0, Math.round((S.time || 0) - f.s));
    if (fights) for (const id in fights) { const b = fights[id]; f.bs.push([b.n, Math.round((S.time || 0) - b.s), 'F']); }          // left the fight (stairs / portal)
    fights = null;
    delete f.s; delete f.hit;
    if (f.t < 3 && !f.dth.length) return;          // a stray arrival
    session.floors.push(f);
    last = f;
    if (session) snapshot(session, S.player || { level: session.l1, equipment: null });
    persist();
  }
  function peakHeat() { try { const h = G.game.heatStacks(); if (h > cur.ht) cur.ht = h; } catch (err) { /* ignore */ } }

  // ---------- event handlers ----------
  function onScene(e) {
    if (!on) return;
    if (cur) endFloor();
    const p = S.player;
    if (!e || e.scene !== 'dungeon' || !p) return;
    if (!session || session.cls !== p.classId || session.name !== (p.name || '')) { session = null; startSession(p); }
    cur = newFloor(e.depth | 0);
    fights = {};
  }
  function bossOf(t) { return t && (t.rarity === 'boss' || t.fallen) ? t : null; }
  function onDealt(e) {
    if (!cur || !e) return;
    const a = e.amount || 0;
    cur.dd += a;
    if (!e.dot && (++cur.hit & 7) === 0) peakHeat();
    const b = bossOf(e.target);
    if (b && fights && !fights[b.id]) fights[b.id] = { n: b.name || String(b.monsterId || 'boss'), s: S.time || 0 };
  }
  function onHurt(e) { if (cur && e && e.amount > 0) cur.dt += e.amount; }
  function onDied(e) {
    if (!cur) return;
    const c = (e && e.cause) || {};
    cur.dth.push([c.kind || 'unknown', c.name || c.id || '', Math.round((S.time || 0) - cur.s)]);
    if (fights) for (const id in fights) { const b = fights[id]; cur.bs.push([b.n, Math.round((S.time || 0) - b.s), 'L']); delete fights[id]; }
    try { const g = G.game.getClearGrade(); if (g && g.explored != null) cur.ex = Math.round(g.explored); } catch (err) { /* ignore */ }
    persist();
  }
  function onKill(e) {
    if (!cur || !e || !e.monster) return;
    const t = e.monster;
    let i = KILL_TIERS.indexOf(t.rarity);
    if (i < 0) i = 0;
    cur.k[i]++;
    const b = bossOf(t);
    if (b && fights && fights[b.id]) { cur.bs.push([fights[b.id].n, Math.round((S.time || 0) - fights[b.id].s), 'W']); delete fights[b.id]; }
  }
  function onPotion(e) { if (cur && e) cur.pot[e.kind === 'mp' ? 1 : 0]++; }
  function onCloseCall() { if (!cur) return; cur.au++; const fx = G.game.getEffect && G.game.getEffect(S.player, 'close_call'); const n = fx ? fx.stacks | 0 : 0; if (n > cur.cc) cur.cc = n; }
  function onFlow(e) { if (cur && e) { const n = (e.count || e.chain) | 0; if (n > cur.fl) cur.fl = n; peakHeat(); } }
  function onGraded(gr) {
    if (!gr) return;
    const f = [cur, last].filter(function (x) { return x && x.d === gr.depth && !x.g; })[0];          // graded as the next floor loads, so usually `last`
    if (!f) return;
    f.g = String(gr.grade || ''); f.ex = Math.round(gr.explored != null ? gr.explored : (f.ex || 0));
    persist();
  }
  function onPicked(e) {
    const it = e && e.item;
    if (!cur || !it) return;
    if (it.type === 'gold') { cur.gold = (cur.gold || 0) + (it.qty | 0); return; }
    const i = RARITIES.indexOf(it.rarity);
    if (i >= 0) cur.it[i]++;
  }
  function onHide() { if (document.visibilityState === 'hidden' && cur && session) { saveOpen(); } }
  // iOS can kill a hidden page: write the floor in progress (without ending it)
  function saveOpen() {
    const f = Object.assign({}, cur, { t: Math.round((S.time || 0) - cur.s), open: 1 });
    delete f.s; delete f.hit;
    session.floors.push(f);
    persist();
    session.floors.pop();
  }

  // ---------- on / off ----------
  const HOOKS = [['player:dealt', onDealt], ['player:damaged', onHurt], ['player:died', onDied], ['monster:killed', onKill], ['potion:used', onPotion],
    ['closecall:ui', onCloseCall], ['flow:chain', onFlow], ['floor:graded', onGraded], ['item:picked', onPicked]];
  function start() {
    if (on) return;
    on = true;
    load();
    HOOKS.forEach(function (h) { offs.push(G.on(h[0], h[1])); });
    document.addEventListener('visibilitychange', onHide);
    // already standing on a floor (switched on from the pause menu, or a loaded save)
    if (S.player && S.scene === 'dungeon') {
      if (!session) startSession(S.player);
      cur = newFloor(S.depth | 0); fights = {};
    }
  }
  function stop() {
    if (!on) return;
    endFloor();
    on = false;
    offs.forEach(function (f) { f(); }); offs = [];
    document.removeEventListener('visibilitychange', onHide);
    session = null; cur = null; last = null; fights = null;
  }
  function sync() { const want = !!(S.settings && S.settings.playLog); if (want) start(); else stop(); }
  G.on('scene:changed', function (e) { if (!on && S.settings && S.settings.playLog) start(); else if (on && !(S.settings && S.settings.playLog)) stop(); onScene(e); });
  G.on('settings:changed', function (e) { if (e && e.key === 'playLog') sync(); });

  // ---------- export ----------
  function pad(s, n, left) { s = String(s); while (s.length < n) s = left ? ' ' + s : s + ' '; return s.length > n ? s.slice(0, n) : s; }
  function mmss(t) { return Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60); }
  function rate(total, t) { return t > 0 ? Math.round(total / t * 60) : 0; }
  function ab(s) { return String(s).replace(/_/g, '').slice(0, 4); }
  function short(n) { return n >= 10000 ? Math.round(n / 1000) + 'k' : String(Math.round(n)); }
  function outcome(b) { return b[2]; }

  function floorRow(f) {
    const deaths = f.dth.length ? f.dth.map(function (d) { return ab(d[1] || d[0]) + '@' + mmss(d[2]); }).join(',') : '-';
    const bosses = f.bs.length ? f.bs.map(function (b) { return ab(b[0].split(/[ ,]/)[0]) + ' ' + b[1] + 's' + outcome(b); }).join(',') : '-';
    return pad(f.d, 3, true) + ' ' + pad(String(f.a).slice(0, 4), 4) + ' ' + pad(f.m.map(ab).join('+') || '-', 9) + pad(mmss(f.t), 5, true) + pad(f.ex == null ? '?' : f.ex, 4, true) + ' ' + pad(f.g || '-', 2)
      + pad(f.k.join('/'), 11, true) + pad(short(f.dd), 7, true) + pad(rate(f.dd, f.t), 6, true) + pad(rate(f.dt, f.t), 6, true)
      + pad(f.pot[0] + '/' + f.pot[1], 5, true) + pad(f.cc + "/" + f.fl + "/" + f.ht, 9, true) + ' ' + pad(deaths, 10) + ' ' + pad(bosses, 14) + pad(short(f.gold || 0), 6, true) + ' ' + f.it.join('.');
  }
  function headerRow() {
    const c = TX.cols, w = [3, 5, 10, 5, 4, 3, 11, 7, 6, 6, 5, 9, 11, 15, 6, 6], r = [1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0];
    return c.map(function (s, i) { return r[i] ? pad(s, w[i], true) : pad(" " + s, w[i] || 0); }).join("");
  }
  // numeric data block: one line per floor, base-36 fields (see the header line for the order)
  function dataRow(f) {
    const b36 = function (n) { return Math.max(0, Math.round(n || 0)).toString(36); };
    return [f.d, f.a, f.t, f.ex == null ? 0 : f.ex, f.g || '-', f.k.map(b36).join(''), b36(f.dd), b36(f.dt), f.pot.join(''), f.cc, f.fl, f.ht, f.dth.length, f.bs.length, b36(f.gold || 0), f.it.map(b36).join(''), f.l, f.m.join('+') || '-'].join(',');
  }

  function buildExport() {
    const d = load();
    const sess = d.sessions.filter(function (s) { return s.floors.length; });
    const nFloors = sess.reduce(function (n, s) { return n + s.floors.length; }, 0);
    const out = [];
    const date = new Date();
    out.push(TX.title + ' v1 | ' + (ui._VERSION || '') + ' | ' + date.toISOString().slice(0, 16).replace('T', ' ') + ' | ' + sess.length + TX.sessions + ' | ' + nFloors + TX.floors);
    if (!nFloors) { out.push(TX.empty); return out.join('\n'); }
    out.push('```');
    sess.forEach(function (s, i) {
      const tot = s.floors.reduce(function (a, f) { a.t += f.t; a.dd += f.dd; a.dt += f.dt; a.d += f.dth.length; a.k += f.k.reduce(function (x, y) { return x + y; }, 0); a.p += f.pot[0] + f.pot[1]; return a; }, { t: 0, dd: 0, dt: 0, d: 0, k: 0, p: 0 });
      out.push('S' + (i + 1) + ' ' + s.cls + ' L' + s.l0 + '>' + s.l1 + ' ' + TX.power + s.pw0 + '>' + s.pw1 + ' ' + TX.build + s.build + ' ' + new Date(s.t).toISOString().slice(5, 16).replace('T', ' ')
        + ' | ' + Math.round(tot.t / 60) + 'min ' + s.floors.length + 'fl ' + tot.k + TX.kills + ' ' + tot.d + TX.deaths + ' ' + tot.p + TX.potions + ' ' + short(rate(tot.dd, tot.t)) + '/' + short(rate(tot.dt, tot.t)) + TX.perMin);
      out.push('  ' + TX.perks + (s.perks.length ? s.perks.join(',') : '-'));
      out.push(headerRow());
      s.floors.forEach(function (f) { out.push(floorRow(f)); });
      out.push('');
    });
    out.push(TX.legend);
    out.push('```');
    out.push(TX.dataHeader);
    sess.forEach(function (s, i) {
      out.push('S' + (i + 1) + ',' + s.cls + ',' + s.l0 + ',' + s.l1 + ',' + s.pw0 + ',' + s.pw1 + ',' + s.build);
      s.floors.forEach(function (f) { out.push(dataRow(f)); });
    });
    return out.join('\n');
  }

  function clear() {
    data = { v: 1, sessions: [] };
    if (session) { session.floors = []; data.sessions.push(session); }
    last = null;
    try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
  }
  function count() { return load().sessions.reduce(function (n, s) { return n + s.floors.length; }, 0); }

  function copy() {
    const text = buildExport();
    const fallback = function () {
      let done = false;
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
      document.body.appendChild(ta);
      try { ta.focus(); ta.select(); ta.setSelectionRange(0, text.length); done = document.execCommand('copy'); } catch (err) { done = false; }
      document.body.removeChild(ta);
      if (done) ui.toast(TX.copied, '#7fd4c8'); else showText(text);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { ui.toast(TX.copied, '#7fd4c8'); }, fallback);
    else fallback();
    return text;
  }
  // last resort (clipboard blocked): a box to press-and-hold copy from
  function showText(text) {
    const h = ui._h;
    const ta = h('textarea', { class: 'ed-code', readonly: true, rows: '8', spellcheck: 'false', 'aria-label': TX.title });
    ta.value = text;
    let close = null;
    close = ui._modal(ui._dialog([h('div', { class: 'ed-h', text: TX.title }), h('div', { class: 'ed-note', text: TX.holdToCopy }), ta], [ui._btn(TX.copy, copy, 'gold'), ui._btn(ui.S.common.close, function () { close(); })]));
    setTimeout(function () { try { ta.focus(); ta.select(); } catch (err) { /* ignore */ } }, 50);
  }

  ui._playLog = { enabled: function () { return on; }, export: buildExport, copy: copy, clear: clear, count: count, key: KEY, start: start, stop: stop, MAX_FLOORS: MAX_FLOORS };
})();
