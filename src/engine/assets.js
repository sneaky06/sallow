// Hand-drawn art overrides (CONTRACT R2.9, ART_SPEC.md). At init the engine loads assets/assets.js (G.assetList) and
// then every listed PNG. A file that loads and has the documented size replaces the matching procedural art; anything
// missing, mis-sized or broken is ignored silently and the procedural art stays. Nothing here ever throws.
(function () {
  'use strict';
  const G = window.G, E = G.engine, U = E._;
  // assets/ sits next to src/: derive it from this script's own URL so the harness in tests/ works too
  const self = document.currentScript && document.currentScript.src;
  const BASE = self ? self.replace(/src\/engine\/[^/]*$/, 'assets/') : 'assets/';

  const tiles = Object.create(null), sprites = Object.create(null), props = Object.create(null),
    icons = Object.create(null), projectiles = Object.create(null), portraits = Object.create(null);
  let nSprites = 0, nIcons = 0, started = false;

  // image → readable work canvas + its pixels
  function pixels(img) {
    const c = U.makeCanvas(img.width, img.height), x = U.ctx2d(c, true);
    x.drawImage(img, 0, 0);
    return { c: c, d: x.getImageData(0, 0, c.width, c.height).data, w: c.width };
  }
  function empty(px, x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (px.d[(y * px.w + x) * 4 + 3] > 8) return false;
    return true;
  }
  function crop(src, x, y, w, h) {
    const c = U.makeCanvas(w, h);
    U.ctx2d(c).drawImage(src, x, y, w, h, 0, 0, w, h);
    return c;
  }
  function mirror(src) {
    const c = U.makeCanvas(src.width, src.height), x = U.ctx2d(c);
    x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    return c;
  }

  // ---------------------------------------------------------------- tiles: 128x672, 4 x 14 cells of 32x48
  // Lower wall cut from a full 32x40 block: keep the top face, drop it onto the bottom `h` rows of the side faces.
  function cutWall(full, h) {
    const c = U.makeCanvas(32, 16 + h), x = U.ctx2d(c);
    x.drawImage(full, 0, -(24 - h));
    for (let py = 0; py < 16; py++) {
      const hw = py < 8 ? 2 * (py + 1) : 2 * (16 - py);
      if (py < 8) { x.clearRect(0, py, 16 - hw, 1); x.clearRect(16 + hw, py, 16 - hw, 1); }
      x.clearRect(16 - hw, py, hw * 2, 1);
      x.drawImage(full, 16 - hw, py, hw * 2, 1, 16 - hw, py, hw * 2, 1);
    }
    return c;
  }
  function applyTiles(theme, set) {
    const px = tiles[theme];
    if (!px || !set) return;
    try {
      // the four cells of a row as canvases (y0/h pick the part of the 48px cell); empty cells fall back to column 0
      const row = function (r, y0, h) {
        const out = [];
        for (let v = 0; v < 4; v++) out.push(empty(px, v * 32, r * 48, 32, 48) ? null : crop(px.c, v * 32, r * 48 + y0, 32, h));
        if (!out[0]) return null;
        for (let v = 1; v < 4; v++) if (!out[v]) out[v] = out[0];
        return out;
      };
      const flat = function (r) { return row(r, 32, 16); };
      let a = flat(0);
      if (a) set.floor = [a[0], a[0], a[0], a[1], a[2], a[2], a[3], a[3]];       // matches U.tiles.FLOOR_PICK's variant meanings
      a = row(1, 8, 40);
      if (a) set.wall = [a, a.map(function (c) { return cutWall(c, 16); }), a.map(function (c) { return cutWall(c, 8); })];
      if (!empty(px, 0, 2 * 48, 32, 48)) {
        const d0 = crop(px.c, 0, 2 * 48 + 8, 32, 40);
        set.door = [d0, empty(px, 32, 2 * 48, 32, 48) ? mirror(d0) : crop(px.c, 32, 2 * 48 + 8, 32, 40)];
      }
      if ((a = flat(3))) set.stairsDown = a[0];
      if (!empty(px, 0, 4 * 48, 32, 48)) set.stairsUp = crop(px.c, 0, 4 * 48, 32, 48);
      if ((a = flat(5))) set.water = [a, a];
      if ((a = flat(6))) set.grass = a;
      if ((a = flat(7))) set.path = a;
      if ((a = flat(8))) set.lava = [a, a];
      if ((a = flat(9))) set.bridge = a;
      if ((a = flat(10))) set.rubble = a;
      if ((a = flat(11))) set.deepWater = a;
      if ((a = flat(12))) set.deepLava = a;
      if ((a = flat(13))) set.chasm = a;
    } catch (err) { /* keep whatever is already there */ }
  }

  // ---------------------------------------------------------------- sprites: 16 x 2 cells, cell = width / 16
  function buildSprite(img) {
    const cell = img.width / 16;
    if (cell !== (cell | 0) || cell < 8 || img.height !== cell * 2) return null;
    const px = pixels(img);
    const c = U.makeCanvas(cell * 16, cell * 4), x = U.ctx2d(c);
    const backEmpty = empty(px, 0, cell, cell * 16, cell);
    for (let r = 0; r < 2; r++) {
      const sr = r === 1 && backEmpty ? 0 : r;
      for (let i = 0; i < 16; i++) {
        const si = empty(px, i * cell, sr * cell, cell, cell) ? 0 : i;       // undrawn frame → idle frame 0
        x.drawImage(px.c, si * cell, sr * cell, cell, cell, i * cell, r * 2 * cell, cell, cell);
        x.save(); x.translate((i + 1) * cell, (r * 2 + 1) * cell); x.scale(-1, 1);
        x.drawImage(px.c, si * cell, sr * cell, cell, cell, 0, 0, cell, cell);
        x.restore();
      }
    }
    const oy = Math.round(cell * 0.85);
    let top = Math.round(cell * 0.5);
    scan: for (let y = 0; y < cell; y++) for (let xx = 0; xx < cell; xx++) if (px.d[(y * px.w + xx) * 4 + 3] > 60) { top = oy - y; break scan; }
    return {
      c: c, base: c, cell: cell, ox: cell >> 1, oy: oy, top: top, hover: false, wide: false, _flash: null, _outl: null,
      flash: function () { return this._flash || (this._flash = U.tint(this.c, '#ffffff')); },
      outlined: function (color) {
        if (!this._outl) this._outl = Object.create(null);
        let o = this._outl[color];
        if (o) return o;
        const t = U.tint(this.c, color);
        o = U.makeCanvas(this.c.width, this.c.height);
        const ox = U.ctx2d(o);
        ox.drawImage(t, -1, 0); ox.drawImage(t, 1, 0); ox.drawImage(t, 0, -1); ox.drawImage(t, 0, 1);
        ox.drawImage(this.c, 0, 0);
        return (this._outl[color] = o);
      },
    };
  }

  // ---------------------------------------------------------------- per-kind handlers
  const HANDLERS = {
    tiles: function (name, img) {
      if (img.width !== 128 || img.height !== 672) return;
      tiles[name] = pixels(img);
      applyTiles(name, U.tiles.peek(name));
      U.assets.ver++;                        // variant-tinted copies rebuild
    },
    sprites: function (name, img) {
      const s = buildSprite(img);
      if (s) { if (!sprites[name]) nSprites++; sprites[name] = s; portraitCache.clear(); }
    },
    props: function (name, img) {
      if (img.height !== 64 || img.width % 48 || !img.width) return;
      const frames = [];
      for (let i = 0; i < img.width / 48; i++) frames.push(crop(img, i * 48, 0, 48, 64));
      if (name === 'gate' && frames.length === 1) frames.push(mirror(frames[0]));   // second frame = the other door axis
      props[name] = frames;
    },
    icons: function (name, img) {
      if (img.width !== 16 || img.height !== 16) return;
      if (!icons[name]) nIcons++;
      icons[name] = crop(img, 0, 0, 16, 16);
      iconCache.clear(); urlCache.clear();
    },
    projectiles: function (name, img) {
      if (img.width !== 16 || img.height !== 16) return;
      const out = [];
      for (let i = 0; i < 16; i++) {
        const c = U.makeCanvas(20, 20), x = U.ctx2d(c);
        x.translate(10, 10); x.rotate(i / 16 * 6.2832); x.drawImage(img, -8, -8);
        out.push(c);
      }
      projectiles[name] = out;
    },
    // gear overlays <family>_<slot>.png on the character grid (R5.9); used on top of a hand-drawn <class>_base sheet
    gear: function (name, img) { if (U.gear) U.gear.addOverlay(name, img); },
    portraits: function (name, img) {
      if (img.width !== 48 || img.height !== 48) return;
      portraits[name] = crop(img, 0, 0, 48, 48);
      portraitCache.clear();
    },
  };

  function loadImage(path) {
    const m = /^(tiles|sprites|props|icons|projectiles|portraits|gear)\/([a-z0-9_]+)\.png$/.exec(path);
    if (!m) return;
    const img = new Image();
    img.onload = function () { try { HANDLERS[m[1]](m[2], img); } catch (err) { /* procedural art stays */ } };
    img.onerror = function () {};
    img.src = BASE + path;
  }

  // ---------------------------------------------------------------- lookups used by the renderer
  // icon descriptor → loaded icon name, or null
  function iconName(d) {
    if (!nIcons || !d || typeof d.shape !== 'string') return null;
    const s = d.shape;
    if (s === 'potion' && (icons.potion_hp || icons.potion_mp)) {
      const c = U.rgbOf(d.color);
      if (c[0] > c[2] + 40 && icons.potion_hp) return 'potion_hp';
      if (c[2] > c[0] + 40 && icons.potion_mp) return 'potion_mp';
    }
    return icons[s] ? s : null;
  }
  // sprite descriptor → class / npc name for portraits (the descriptor itself carries no name)
  function portraitName(d) {
    if (!d || typeof d !== 'object') return null;
    if (typeof d.id === 'string' && (portraits[d.id] || sprites[d.id])) return d.id;     // classId, monsterId or npc_<role>
    const same = function (s) { return s && s.body === d.body && s.color === d.color && s.accent === d.accent && s.weapon === d.weapon; };
    const cls = G.game && G.game.CLASSES;
    if (cls) for (const id in cls) if (same(cls[id].sprite)) return id;
    const ents = (G.state && G.state.entities) || [];
    for (let i = 0; i < ents.length; i++) if (ents[i] && ents[i].type === 'npc' && same(ents[i].sprite)) return 'npc_' + ents[i].role;
    return null;
  }

  const iconCache = new Map(), urlCache = new Map(), portraitCache = new Map();
  const scaled = function (src, size) {
    const c = U.makeCanvas(size, size);
    U.ctx2d(c).drawImage(src, 0, 0, src.width, src.height, 0, 0, size, size);
    return c;
  };

  U.assets = {
    ver: 0,
    applyTiles: applyTiles,
    load: function () {
      if (started) return;
      started = true;
      try {
        const s = document.createElement('script');
        const go = function () {
          const list = Array.isArray(G.assetList) ? G.assetList : [];
          for (let i = 0; i < list.length && i < 400; i++) if (typeof list[i] === 'string') loadImage(list[i]);
        };
        s.onload = go; s.onerror = function () {};
        s.src = BASE + 'assets.js';
        document.head.appendChild(s);
      } catch (err) { /* no overrides */ }
    },
    // entity → override sheet (classId, then monsterId, then npc_<role>) or null
    spriteFor: function (e) {
      if (!nSprites) return null;
      return (e.classId && sprites[e.classId]) || (e.monsterId && sprites[e.monsterId]) || (e.type === 'npc' && sprites['npc_' + e.role]) || null;
    },
    hasIcon: function (d) { return !!iconName(d); },
    sprite: function (name) { return (nSprites && sprites[name]) || null; },
  };

  // ---------------------------------------------------------------- wrap the procedural getters
  const procIcon = E.getIcon, procURL = E.getIconURL, procPortrait = E.getPortrait, procProj = U.projectile, procProp = U.props.get;

  E.getIcon = function (iconDesc, size) {
    const name = iconName(iconDesc);
    if (!name) return procIcon(iconDesc, size);
    size = Math.max(4, Math.min(256, (size | 0) || 32));
    const key = name + '|' + size;
    let c = iconCache.get(key);
    if (!c) iconCache.set(key, (c = size === 16 ? icons[name] : scaled(icons[name], size)));
    return c;
  };
  E.getIconURL = function (iconDesc, size) {
    const name = iconName(iconDesc);
    if (!name) return procURL(iconDesc, size);
    size = Math.max(4, Math.min(256, (size | 0) || 32));
    const key = name + '|' + size;
    let u = urlCache.get(key);
    if (u === undefined) {
      try { u = E.getIcon(iconDesc, size).toDataURL('image/png'); } catch (err) { u = procURL(iconDesc, size); }
      urlCache.set(key, u);
    }
    return u;
  };
  E.getPortrait = function (spriteDesc, size) {
    let name = null;
    try { name = portraitName(spriteDesc); } catch (err) { name = null; }
    const img = name && portraits[name], sheet = name && sprites[name];
    if (!img && !sheet) return procPortrait(spriteDesc, size);
    size = Math.max(8, (size | 0) || 48);
    const key = name + '|' + size;
    let c = portraitCache.get(key);
    if (c) return c;
    if (img) c = scaled(img, size);
    else {                                            // no portrait drawn: frame the head of the hand-drawn sprite
      c = U.makeCanvas(size, size);
      const x = U.ctx2d(c), cw = Math.round(sheet.cell * 0.6);
      x.fillStyle = '#120f18'; x.fillRect(0, 0, size, size);
      x.drawImage(sheet.c, sheet.ox - (cw >> 1), Math.max(0, sheet.oy - sheet.top - 2), cw, cw, 0, 0, size, size);
    }
    portraitCache.set(key, c);
    return c;
  };
  U.projectile = function (shape, color) { return projectiles[shape] || procProj(shape, color); };
  const propWrap = Object.create(null);
  U.props.get = function (type) {
    const f = props[type];
    if (!f) return procProp(type);
    let w = propWrap[type];
    if (!w || w.frames !== f) w = propWrap[type] = { frames: f, light: procProp(type).light };
    return w;
  };
})();
