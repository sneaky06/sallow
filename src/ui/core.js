// G.ui core: DOM helpers, layers, panel manager, modals, toasts. Other ui/*.js files register panels + init hooks here.
(function () {
  'use strict';
  const G = window.G, S = G.state, C = G.C;
  const ui = G.ui = G.ui || {};

  const panels = {};          // name -> { render(view, arg) -> Node | [Node], locked?, cls? }
  const inits = [];           // fn(layers) run by ui.init
  const updaters = [];        // fn(dt) run by ui.update
  let root = null, hudLayer, panelLayer, modalLayer, toastBox;
  let cur = null;             // { name, arg, view, el, def }
  let dirty = false, dirtyT = 0;
  const modals = [];

  // ---------- DOM helpers ----------
  function h(tag, props) {
    const e = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'style') e.style.cssText = v;
        else if (k[0] === 'o' && k[1] === 'n') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { for (const x of c) add(e, x); return; }
    e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }

  function sfx(name) { G.emit('sfx', { name }); }

  function btn(label, fn, cls) {
    return h('button', { class: 'ed-btn' + (cls ? ' ' + cls : ''), type: 'button', onclick: function (e) { sfx('click'); fn(e); } }, label);
  }

  // Icon element from an icon descriptor; coloured square when the engine is absent.
  function icon(desc, size) {
    const e = h('i', { class: 'ed-ico' });
    let url = null;
    if (desc && G.engine && G.engine.getIconURL) {
      try { url = G.engine.getIconURL(desc, size || 32); } catch (err) { url = null; }
    }
    if (url) e.style.backgroundImage = 'url("' + url + '")';
    else { e.className += ' ed-ico-fb'; e.style.backgroundColor = (desc && desc.color) || '#6b6278'; }
    return e;
  }

  function portrait(sprite, size) {
    size = size || 48;
    const cv = h('canvas', { width: size, height: size, class: 'ed-pt' });
    const ctx = cv.getContext('2d');
    let src = null;
    if (sprite && G.engine && G.engine.getPortrait) {
      try { src = G.engine.getPortrait(sprite, size); } catch (err) { src = null; }
    }
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      if (src) ctx.drawImage(src, 0, 0, size, size);
      else {
        const u = size / 8;
        ctx.fillStyle = '#17141c'; ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = (sprite && sprite.color) || '#8f8470';
        ctx.fillRect(u * 3, u, u * 2, u * 2); ctx.fillRect(u * 2, u * 3, u * 4, u * 3);
        ctx.fillStyle = (sprite && sprite.accent) || '#4a4354';
        ctx.fillRect(u * 2, u * 6, u * 4, u);
      }
    }
    return cv;
  }

  // The brazier emblem (same pixels as icons/icon.svg) — title logo + runtime apple-touch-icon.
  const EMBLEM = [
    '................', '.......e........', '......ee...e....', '......eye..e....',
    '.....eeye.ee....', '....eeyyeeee....', '....eyyyyyee....', '...eeywwyyee....',
    '...eeywwwyee....', '...reywwwyer....', '...reeywwyer....', '....reeyyer.....',
    '..ssssssssssss..', '...sddddddddd...', '....sdddddds....', '.....ssssss.....',
  ];
  const EMBLEM_PAL = { '.': '#0b0a0f', e: '#ff8a2b', y: '#ffd94a', w: '#fff6d0', r: '#b3202a', s: '#7a708a', d: '#3a3442' };
  function emblem(size, transparent) {
    const cv = h('canvas', { width: size, height: size });
    const ctx = cv.getContext('2d');
    if (!ctx) return cv;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const ch = EMBLEM[y][x];
        if (ch === '.' && transparent) continue;
        ctx.fillStyle = EMBLEM_PAL[ch];
        const x0 = Math.floor(x * size / 16), y0 = Math.floor(y * size / 16);
        ctx.fillRect(x0, y0, Math.floor((x + 1) * size / 16) - x0, Math.floor((y + 1) * size / 16) - y0);
      }
    }
    return cv;
  }

  // ---------- grime ----------
  // Small tiling textures for frames and backdrops (never used behind body text); exposed to the stylesheet as --tx-*.
  function tile(size, base, paint) {
    const cv = h('canvas', { width: size, height: size });
    const ctx = cv.getContext('2d');
    const r = G.rng.create(size * 7919 + base.charCodeAt(2));
    ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
    const px = function (x, y, c) { ctx.fillStyle = c; ctx.fillRect(((x % size) + size) % size, ((y % size) + size) % size, 1, 1); };
    paint(px, r, size);
    return 'url("' + cv.toDataURL('image/png') + '")';
  }
  function textures() {
    const st = root.style;
    st.setProperty('--tx-stone', tile(64, '#100e12', function (px, r, n) {
      for (let i = 0; i < 260; i++) px(r.int(0, n - 1), r.int(0, n - 1), r.pick(['#17141a', '#0a090c', '#141116']));
      for (let c = 0; c < 4; c++) {           // cracks: a wandering dark line with a lit lower edge
        let x = r.int(0, n - 1), y = r.int(0, n - 1);
        for (let i = r.int(18, 40); i > 0; i--) {
          px(x, y, '#040305'); px(x + 1, y + 1, '#221d25');
          x += r.pick([1, 1, 0, -1]); y += r.pick([1, 0, 1, 1, -1]);
        }
      }
    }));
    st.setProperty('--tx-iron', tile(48, '#2b2724', function (px, r, n) {
      for (let i = 0; i < 170; i++) px(r.int(0, n - 1), r.int(0, n - 1), r.pick(['#332e2a', '#221f1c', '#2f2a26']));
      for (let b = 0; b < 6; b++) {           // rust blooms
        const x = r.int(0, n - 1), y = r.int(0, n - 1);
        for (let i = r.int(7, 16); i > 0; i--) px(x + r.int(-3, 3), y + r.int(-2, 2), r.pick(['#5a2e1a', '#7a3d1c', '#4f2714']));
      }
      for (let i = 0; i < 9; i++) { const x = r.int(0, n - 1), y = r.int(0, n - 1); px(x, y, '#0c0a09'); px(x + 1, y + 1, '#5d554c'); }   // pits
      for (let s = 0; s < 3; s++) {           // scratches
        let x = r.int(0, n - 1), y = r.int(0, n - 1);
        for (let i = r.int(6, 12); i > 0; i--) { px(x, y, '#4a433c'); x++; if (i % 2) y--; }
      }
    }));
    st.setProperty('--tx-parch', tile(48, '#b7a67c', function (px, r, n) {
      for (let b = 0; b < 7; b++) {           // stains
        const x = r.int(0, n - 1), y = r.int(0, n - 1), c = r.pick(['#a08c5e', '#8f7a4c', '#7c5a3a']);
        for (let i = r.int(10, 26); i > 0; i--) px(x + r.int(-4, 4), y + r.int(-3, 3), c);
      }
      for (let i = 0; i < 50; i++) px(r.int(0, n - 1), r.int(0, n - 1), r.pick(['#6b5a3a', '#c9ba92']));
    }));
  }

  // Darken a colour meant for dark backgrounds so it reads as ink on the parchment tooltip (hue is kept).
  const inkCache = {};
  function ink(c) {
    if (!c || typeof c !== 'string') return null;
    if (inkCache[c]) return inkCache[c];
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
    if (!m) return null;
    let hex = m[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const k = lum > 62 ? 62 / lum : 1;
    return (inkCache[c] = 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')');
  }

  function rarityColor(r) { return (C.RARITY[r] && C.RARITY[r].color) || '#c8c8c8'; }
  // Rarity helpers. Never compare against literal order numbers: the table is the lead's and has been re-ordered once already.
  function rarityOrder(r) { return (C.RARITY[r] && C.RARITY[r].order) || 0; }
  function rarityAtLeast(r, key) { return rarityOrder(r) >= rarityOrder(key); }
  // Name of the tier a key belongs to, for lists and filters: legendary + mythic are both "Legendary" (R2.2).
  function tierName(key) {
    const r = C.RARITY[key];
    if (!r) return String(key);
    const t = r.tier || key;
    return r.tier ? t.charAt(0).toUpperCase() + t.slice(1) : r.name;
  }
  // One key per tier, lowest first — the choices a filter offers.
  function tierKeys() {
    const seen = {}, out = [];
    Object.keys(C.RARITY).sort(function (a, b) { return rarityOrder(a) - rarityOrder(b); }).forEach(function (k) {
      const t = C.RARITY[k].tier || k;
      if (!seen[t]) { seen[t] = 1; out.push(k); }
    });
    return out;
  }
  function fmt(n) {
    n = +n || 0;
    return Math.abs(n) >= 100 || n === Math.round(n) ? String(Math.round(n)) : n.toFixed(1);
  }
  function goldEl(n) { return h('span', { class: 'ed-gold' }, fmt(n) + ' g'); }

  // ---------- panels ----------
  // Standard panel chrome. opts: { tabs: [{ id, label, badge }], tab, onTab(id), right: [Node], noClose, foot: [Node], sub: Node }
  function frame(title, opts, body) {
    opts = opts || {};
    const head = h('div', { class: 'ed-head' }, h('div', { class: 'ed-ttl' + (opts.compact ? ' opt' : ''), text: title }));
    if (opts.tabs) {
      head.appendChild(h('div', { class: 'ed-tabs' }, opts.tabs.map(function (t) {
        return h('button', { type: 'button', class: 'ed-tab' + (t.id === opts.tab ? ' on' : ''), onclick: function () { sfx('click'); opts.onTab(t.id); } },
          t.label, t.badge ? h('i', { class: 'ed-badge', text: t.badge }) : null);
      })));
    }
    head.appendChild(h('div', { class: 'ed-sp' }));
    add(head, opts.right);
    if (!opts.noClose) head.appendChild(btn('X', function () { ui.close(); }, 'ed-x'));
    const out = [head];
    if (opts.sub) out.push(opts.sub);
    out.push(body);
    if (opts.foot) out.push(h('div', { class: 'ed-foot' }, opts.foot));
    return out;
  }

  function render() {
    if (!cur) return;
    dirty = false;
    const keep = [];
    cur.el.querySelectorAll('.ed-body,.ed-scroll,.ed-treewrap,.ed-skinfo').forEach(function (n) { keep.push(n.scrollTop); });
    let out;
    try { out = cur.def.render(cur.view, cur.arg); } catch (err) {
      console.error('[ui panel ' + cur.name + ']', err);
      out = frame('Error', null, h('div', { class: 'ed-body', text: 'This screen failed to draw.' }));
    }
    cur.el.className = 'ed-panel' + (cur.def.cls ? ' ' + cur.def.cls : '');
    cur.el.replaceChildren.apply(cur.el, [].concat(out).filter(Boolean));
    cur.el.querySelectorAll('.ed-body,.ed-scroll,.ed-treewrap,.ed-skinfo').forEach(function (n, i) { if (keep[i]) n.scrollTop = keep[i]; });
  }

  function dropPanel() {
    closeModals();
    if (!cur) return;
    cur.el.remove();
    cur = null;
  }

  ui.open = function (panel, arg) {
    const def = panels[panel];
    if (!def || !root) return;
    if (def.alias) { ui.open(def.alias, arg !== undefined ? arg : def.arg); return; }
    dropPanel();
    cur = { name: panel, arg: arg, view: {}, def: def, el: h('div', { class: 'ed-panel' }) };
    panelLayer.appendChild(cur.el);
    S.paused = true;
    G.input.attackHeld = false;
    if (def.locked && toastBox) toastBox.replaceChildren();      // nothing talks over the death screen
    render();
  };

  ui.close = function () {
    const had = !!cur;
    dropPanel();
    S.paused = false;
    if (had && S.player && S.scene !== 'menu' && G.meta && G.meta.save) G.meta.save();
  };

  ui.isOpen = function () { return !!cur; };

  // ---------- modals ----------
  // opts: { dismiss: tap outside closes (default true), pause: freeze the game while shown }
  function modal(content, opts) {
    opts = opts || {};
    const m = { el: null, pause: !!opts.pause, close: null };
    m.close = function () {
      const i = modals.indexOf(m);
      if (i < 0) return;
      modals.splice(i, 1);
      m.el.remove();
      if (!modals.length) root.classList.remove('ed-modal-open');
      if (m.pause && !cur) S.paused = false;
    };
    m.el = h('div', { class: 'ed-modal', onclick: function (e) { if (e.target === m.el && opts.dismiss !== false) m.close(); } }, content);
    modals.push(m);
    modalLayer.appendChild(m.el);
    root.classList.add('ed-modal-open');
    if (m.pause) { S.paused = true; G.input.attackHeld = false; }
    return m.close;
  }
  function closeModals() { while (modals.length) modals[modals.length - 1].close(); }

  function dialog(bodyNodes, actions, cls) {
    return h('div', { class: 'ed-dialog' + (cls ? ' ' + cls : '') }, h('div', { class: 'ed-scroll' }, bodyNodes), actions && actions.length ? h('div', { class: 'ed-acts' }, actions) : null);
  }

  function confirm(text, yesLabel, onYes, opts) {
    opts = opts || {};
    let close = null;
    close = modal(dialog([h('div', { text: text, style: 'line-height:18px' }), opts.note ? h('div', { class: 'ed-note', style: 'margin-top:6px', text: opts.note }) : null], [
      btn(yesLabel || 'Yes', function () { close(); onYes(); }, opts.danger ? 'danger' : 'gold'),
      btn('Cancel', function () { close(); }),
    ]), { pause: opts.pause });
  }

  // ---------- toasts ----------
  // Story banner (boss intro / death lines): bigger than a toast, first in the toast stack, gone after `secs`.
  ui._banner = function (title, text, color, secs) {
    if (!toastBox) return;
    const b = h('div', { class: 'ed-toast ed-banner', style: color ? '--bc:' + color : null },
      h('b', { text: title, style: color ? 'color:' + color : null }), text ? h('span', { text: text }) : null);
    toastBox.insertBefore(b, toastBox.firstChild);
    setTimeout(function () { b.remove(); }, (secs || 5) * 1000);
  };

  ui.toast = function (text, color) {
    if (!toastBox || text == null) return;
    while (toastBox.childNodes.length >= 3) toastBox.firstChild.remove();
    const t = h('div', { class: 'ed-toast', text: String(text), style: color ? 'color:' + color : null });
    toastBox.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  };

  // ---------- lifecycle ----------
  ui.init = function (rootEl) {
    if (root || !rootEl) return;
    root = rootEl;
    if (!document.getElementById('ed-style')) {
      const st = h('style', { id: 'ed-style' });
      st.textContent = ui._css || '';
      document.head.appendChild(st);
    }
    try { textures(); } catch (err) { console.warn('[ui textures]', err); }
    hudLayer = h('div', { class: 'ed-layer' });
    const titleLayer = h('div', { class: 'ed-layer' });
    panelLayer = h('div', { class: 'ed-layer' });
    modalLayer = h('div', { class: 'ed-layer' });
    toastBox = h('div', { class: 'ed-toasts' });
    root.append(hudLayer, titleLayer, panelLayer, modalLayer, toastBox);

    // UI touches must never reach the engine's joystick / tap handlers, and typing a name must not steer the hero.
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'click', 'dblclick', 'wheel', 'contextmenu']
      .forEach(function (t) { root.addEventListener(t, function (e) { e.stopPropagation(); }); });
    ['keydown', 'keyup', 'keypress'].forEach(function (t) {
      root.addEventListener(t, function (e) { if (e.target && e.target.tagName === 'INPUT') e.stopPropagation(); });
    });

    const layers = { root: root, hud: hudLayer, title: titleLayer, panel: panelLayer, modal: modalLayer };
    for (const fn of inits) {
      try { fn(layers); } catch (err) { console.error('[ui.init]', err); }
    }
  };

  ui.update = function (dt) {
    if (!root) return;
    if (dirty && cur) {
      dirtyT -= dt;
      if (dirtyT <= 0) { dirtyT = 0.1; render(); }
    } else dirtyT = 0;
    for (let i = 0; i < updaters.length; i++) updaters[i](dt);
  };

  function markDirty() { dirty = true; }
  ['inventory:changed', 'equipment:changed', 'gold:changed', 'skills:changed', 'player:stats', 'player:levelup', 'quest:updated', 'quest:completed']
    .forEach(function (n) { G.on(n, markDirty); });

  G.on('ui:toast', function (e) { if (e) ui.toast(e.text, e.color); });

  G.on('input:ui', function (e) {
    if (!e || !root || S.scene === 'menu' || !S.player) return;
    if (cur && cur.def.locked) return;
    if (cur && (cur.name === e.panel || e.panel === 'menu')) ui.close();
    else ui.open(e.panel);
  });

  // Core unpauses and saves on every map change; any open panel is stale by then.
  G.on('scene:changed', function () { dropPanel(); });

  // internals shared with the other ui/*.js files
  ui._h = h; ui._btn = btn; ui._icon = icon; ui._portrait = portrait; ui._emblem = emblem; ui._sfx = sfx;
  ui._frame = frame; ui._modal = modal; ui._dialog = dialog; ui._confirm = confirm; ui._closeModals = closeModals;
  ui._register = function (name, def) { panels[name] = def; };
  ui._inits = inits; ui._updaters = updaters;
  ui._refresh = markDirty; ui._refreshNow = render;
  ui._current = function () { return cur; };
  ui._rarityColor = rarityColor; ui._fmt = fmt; ui._goldEl = goldEl; ui._ink = ink;
  ui._rarityOrder = rarityOrder; ui._rarityAtLeast = rarityAtLeast; ui._tierName = tierName; ui._tierKeys = tierKeys;
})();
