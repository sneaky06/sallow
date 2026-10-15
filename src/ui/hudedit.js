// Player-controlled HUD layout (R5.1): joystick mode, button size, HUD opacity and an "Edit HUD" mode that drags the
// stick anchor, attack, skills, potions, dash, portal, minimap and quest tracker. One layout per orientation.
//
// state.settings.hud = {
//   size: 'S'|'M'|'L', opacity: 0.4..1,
//   layouts: { portrait: { [id]: { x, y } }, landscape: { ... } },   // piece centre as a fraction of the safe-area box;
//                                                                    // id 'joy' is a fraction of the window (engine units)
//   joystick: { mode: 'floating'|'fixed', x, y, size },             // engine reads this; mirrored from the current orientation;
//                                                                    // size = stick diameter / short screen side (src/engine/input.js)
// }
// A piece with no entry keeps its stylesheet position, so "Reset" just deletes entries.
(function () {
  'use strict';
  const G = window.G, S = G.state;
  const ui = G.ui;
  const TX = ui.S;
  const h = ui._h;

  const GRID = 16;                                  // snap step in CSS px (the editor draws the same grid)
  const SIZES = { S: 0.85, M: 1, L: 1.2 };
  const OPACITY = [1, 0.85, 0.7, 0.55, 0.4];
  const JOY_R = 46;                                 // engine's stick radius at size M, CSS px
  const JOY_DEF = { portrait: { x: 0.2, y: 0.8 }, landscape: { x: 0.14, y: 0.72 } };
  const MARGIN = 4;

  let hud = null, joyEl = null, applied = '', pollT = 0;
  let ed = null;                                    // { bg, bar, grabs: [{ id, el, node }], o }

  function orient() { return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'; }

  function settings() {
    let s = S.settings.hud;
    if (!s || typeof s !== 'object') s = S.settings.hud = {};
    if (!SIZES[s.size]) s.size = 'M';
    if (!(s.opacity >= 0.3 && s.opacity <= 1)) s.opacity = 1;
    if (!s.layouts || typeof s.layouts !== 'object') s.layouts = {};
    for (const o of ['portrait', 'landscape']) if (!s.layouts[o] || typeof s.layouts[o] !== 'object') s.layouts[o] = {};
    if (!s.joystick || typeof s.joystick !== 'object') s.joystick = {};
    if (s.joystick.mode !== 'fixed') s.joystick.mode = 'floating';
    return s;
  }
  ui._hudSettings = settings;

  function validPos(p) { return p && typeof p === 'object' && isFinite(p.x) && isFinite(p.y); }

  // Keep the engine's view of the stick in step with the orientation we are in.
  function syncJoystick(s, o) {
    const p = validPos(s.layouts[o].joy) ? s.layouts[o].joy : JOY_DEF[o];
    s.joystick.x = +p.x.toFixed(4);
    s.joystick.y = +p.y.toFixed(4);
    s.joystick.size = +(JOY_R * 2 / 375 * SIZES[s.size]).toFixed(4);     // stick diameter / short screen side (engine input.js)
  }

  function box() { return { w: hud.clientWidth, h: hud.clientHeight, r: hud.getBoundingClientRect() }; }
  function clamp(v, lo, hi) { return hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)); }

  // Put a piece's centre at (cx, cy) inside the safe-area box, kept fully on screen.
  function placeAt(el, cx, cy, b) {
    const hw = el.offsetWidth / 2, hh = el.offsetHeight / 2;
    if (hw > 0) { cx = clamp(cx, hw + MARGIN, b.w - hw - MARGIN); cy = clamp(cy, hh + MARGIN, b.h - hh - MARGIN); }
    el.classList.add('ed-cust');
    el.style.left = Math.round(cx) + 'px';
    el.style.top = Math.round(cy) + 'px';
    return { x: cx, y: cy };
  }
  function clearPos(el) {
    el.classList.remove('ed-cust');
    el.style.left = ''; el.style.top = '';
  }

  function joyCentre(s, o, b) {
    const p = validPos(s.layouts[o].joy) ? s.layouts[o].joy : JOY_DEF[o];
    return { x: p.x * window.innerWidth - b.r.left, y: p.y * window.innerHeight - b.r.top };
  }

  function apply() {
    const M = ui._hudMovables;
    if (!hud || !M) return;
    const s = settings(), o = orient(), L = s.layouts[o];
    hud.style.setProperty('--bs', SIZES[s.size]);
    hud.style.setProperty('--hop', s.opacity);
    const b = box();
    if (b.w > 0) {
      for (const id in M) {
        if (validPos(L[id])) placeAt(M[id].el, L[id].x * b.w, L[id].y * b.h, b);
        else clearPos(M[id].el);
      }
      const d = Math.round(JOY_R * 2 * SIZES[s.size]);
      joyEl.style.width = joyEl.style.height = d + 'px';
      const c = joyCentre(s, o, b);
      joyEl.style.left = Math.round(c.x - d / 2) + 'px';
      joyEl.style.top = Math.round(c.y - d / 2) + 'px';
    }
    syncJoystick(s, o);
    if (ed) syncGrabs();
  }
  ui._applyHud = function () { applied = ''; };

  // ---------- editor ----------
  function startEdit() {
    if (ed || !hud || !S.player || S.scene === 'menu') return;
    if (ui.isOpen()) ui.close();
    ui._closeModals();
    S.paused = true;
    G.input.attackHeld = false;
    G.input.move.x = 0; G.input.move.y = 0;
    hud.classList.add('ed-editing');
    ed = { bg: h('div', { class: 'ed-editbg' }), bar: h('div', { class: 'ed-editbar' }), grabs: [], o: orient() };
    hud.insertBefore(ed.bg, hud.firstChild);
    const pieces = [{ id: 'joy', el: joyEl, label: TX.hudedit.stick }];
    const M = ui._hudMovables || {};
    for (const id in M) pieces.push({ id: id, el: M[id].el, label: M[id].label });
    for (const p of pieces) {
      const node = h('div', { class: 'ed-grab', role: 'button', 'aria-label': 'Move ' + p.label }, h('span', { text: p.label }));
      drag(node, p);
      hud.appendChild(node);
      ed.grabs.push({ id: p.id, el: p.el, node: node });
    }
    hud.appendChild(ed.bar);
    fillBar();
    barDrag();
    applied = '';
    apply();
  }
  ui._editHud = startEdit;

  function endEdit(save) {
    if (!ed) return;
    ed.bg.remove(); ed.bar.remove();
    for (const g of ed.grabs) g.node.remove();
    ed = null;
    hud.classList.remove('ed-editing');
    if (!ui.isOpen()) S.paused = false;
    if (save !== false) {
      if (G.meta && G.meta.save) G.meta.save();
      ui.toast(TX.hudedit.hudLayoutSaved, '#dfc06a');
    }
  }
  ui._isEditingHud = function () { return !!ed; };

  function syncGrabs() {
    const hr = hud.getBoundingClientRect();
    for (const g of ed.grabs) {
      const r = g.el.getBoundingClientRect();
      // keep every grab at least 44 px so small pieces are easy to pick up
      const w = Math.max(44, r.width), hh = Math.max(44, r.height);
      g.node.style.left = Math.round(r.left - hr.left + r.width / 2 - w / 2) + 'px';
      g.node.style.top = Math.round(r.top - hr.top + r.height / 2 - hh / 2) + 'px';
      g.node.style.width = Math.round(w) + 'px';
      g.node.style.height = Math.round(hh) + 'px';
    }
  }

  function drag(node, p) {
    let d = null;
    node.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { node.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      const r = p.el.getBoundingClientRect(), b = box();
      d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: r.left + r.width / 2 - b.r.left, cy: r.top + r.height / 2 - b.r.top, b: b };
      node.classList.add('drag');
    });
    node.addEventListener('pointermove', function (e) {
      if (!d || e.pointerId !== d.id) return;
      move(p, d, e.clientX, e.clientY, false);
    });
    const up = function (e) {
      if (!d || e.pointerId !== d.id) return;
      move(p, d, e.clientX, e.clientY, true);
      d = null;
      node.classList.remove('drag');
    };
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
  }

  function move(p, d, x, y, commit) {
    const b = d.b;
    let cx = Math.round((d.cx + x - d.sx) / GRID) * GRID;
    let cy = Math.round((d.cy + y - d.sy) / GRID) * GRID;
    const s = settings(), L = s.layouts[orient()];
    if (p.id === 'joy') {
      const r = joyEl.offsetWidth / 2;
      cx = clamp(cx, r + MARGIN, b.w - r - MARGIN); cy = clamp(cy, r + MARGIN, b.h - r - MARGIN);
      joyEl.style.left = Math.round(cx - r) + 'px'; joyEl.style.top = Math.round(cy - r) + 'px';
      if (commit) {
        L.joy = { x: +((cx + b.r.left) / window.innerWidth).toFixed(4), y: +((cy + b.r.top) / window.innerHeight).toFixed(4) };
        syncJoystick(s, orient());
      }
    } else {
      const c = placeAt(p.el, cx, cy, b);
      if (commit) L[p.id] = { x: +(c.x / b.w).toFixed(4), y: +(c.y / b.h).toFixed(4) };
    }
    syncGrabs();
  }

  function fillBar() {
    if (!ed) return;
    const s = settings(), o = orient();
    const opt = function (label, on, fn) {
      const b = ui._btn(label, function () { fn(); applied = ''; apply(); fillBar(); }, on ? 'on' : '');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      return b;
    };
    const pct = Math.round(s.opacity * 100);
    ed.bar.replaceChildren(
      h('div', { class: 'ed-grip' }, h('span', { text: TX.hudedit.editHud }), h('small', { text: (o === 'portrait' ? 'Portrait' : 'Landscape') + TX.hudedit.dragToMove })),
      // one wrapping row: 3 lines in portrait, 2 in landscape (wide buttons carry class w2)
      h('div', { class: 'ed-editrow' },
        w2(opt('Floating stick', s.joystick.mode === 'floating', function () { s.joystick.mode = 'floating'; })),
        w2(opt('Fixed stick', s.joystick.mode === 'fixed', function () { s.joystick.mode = 'fixed'; })),
        ['S', 'M', 'L'].map(function (k) { return opt('Size ' + k, s.size === k, function () { s.size = k; }); }),
        opt('Fade ' + pct + '%', false, function () { s.opacity = OPACITY[(OPACITY.indexOf(s.opacity) + 1) % OPACITY.length]; }),
        w2(ui._btn(TX.hudedit.reset, function () {
          ui._confirm(TX.hudedit.putEveryButtonBack + (o === 'portrait' ? 'portrait' : 'landscape') + TX.hudedit.layoutSizeMNo, 'Reset', function () {
            s.layouts[o] = {}; s.size = 'M'; s.opacity = 1;
            applied = ''; apply(); fillBar();
          }, { danger: true });
        }, 'danger')),
        w2(ui._btn(TX.common.done, function () { endEdit(true); }, 'gold'))));
  }
  function w2(b) { b.classList.add('w2'); return b; }

  // The bar itself can be dragged out of the way by its title strip (not saved).
  function barDrag() {
    const grip = ed.bar.firstChild;
    let d = null;
    ed.bar.addEventListener('pointerdown', function (e) {
      if (!e.target.closest || !e.target.closest('.ed-grip')) return;
      e.preventDefault();
      try { ed.bar.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
      const r = ed.bar.getBoundingClientRect(), hr = hud.getBoundingClientRect();
      d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: r.left - hr.left, y: r.top - hr.top, w: r.width, h: r.height, bw: hr.width, bh: hr.height };
    });
    ed.bar.addEventListener('pointermove', function (e) {
      if (!d || e.pointerId !== d.id) return;
      const x = clamp(d.x + e.clientX - d.sx, 0, d.bw - d.w), y = clamp(d.y + e.clientY - d.sy, 0, d.bh - d.h);
      ed.bar.style.transform = 'none';
      ed.bar.style.left = x + 'px'; ed.bar.style.top = y + 'px';
    });
    const up = function (e) { if (d && e.pointerId === d.id) d = null; };
    ed.bar.addEventListener('pointerup', up);
    ed.bar.addEventListener('pointercancel', up);
    return grip;
  }

  // ---------- wiring ----------
  ui._inits.push(function () {
    hud = ui._hudEl;
    if (!hud) return;
    joyEl = h('div', { class: 'ed-joy ed-mv', 'aria-hidden': 'true' });
    hud.appendChild(joyEl);
    window.addEventListener('resize', function () { applied = ''; });
    window.addEventListener('orientationchange', function () { applied = ''; });
  });

  // Re-place only when something that matters changed (orientation, size, visibility, a loaded save) — idle frames touch nothing.
  ui._updaters.push(function (dt) {
    if (!hud) return;
    pollT -= dt;
    if (pollT > 0) return;
    pollT = 0.25;
    const vis = hud.style.display !== 'none';
    if (!vis) { if (ed) endEdit(false); return; }
    const s = S.settings.hud;
    const key = window.innerWidth + 'x' + window.innerHeight + '|' + (s ? JSON.stringify(s.layouts) + s.size + s.opacity + (s.joystick && s.joystick.mode) : '');
    if (key === applied) return;
    applied = key;
    apply();
    if (ed && ed.o !== orient()) { ed.o = orient(); fillBar(); }
  });

  // any panel opening ends the editor (it would otherwise sit under the panel with the game paused)
  const open = ui.open;
  ui.open = function () { if (ed) endEdit(true); return open.apply(ui, arguments); };
  G.on('scene:changed', function () { if (ed) endEdit(true); applied = ''; });
})();
